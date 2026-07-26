import { CAMPAIGN_OPPONENTS, ITEM_BY_ID, ITEMS } from "./data";
import type {
  Board,
  Family,
  GameState,
  ItemInstance,
  ItemLevel,
  MergeStep,
  ShopOffer,
} from "./types";

export const BOARD_SIZE = 5;
export const SYNERGY_THRESHOLD = 3;
export const MAX_ROUNDS = CAMPAIGN_OPPONENTS.length;
export const STORAGE_KEY = "kessel-krawall-run-v2";

export interface ActionResult {
  state: GameState;
  error?: string;
  merges?: MergeStep[];
  goldDelta?: number;
}

function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

function nextId(state: GameState, prefix: string): [string, GameState] {
  const id = `${prefix}-${state.idCounter}`;
  return [id, { ...state, idCounter: state.idCounter + 1 }];
}

function pick<T>(items: readonly T[], random: number): T {
  return items[Math.min(items.length - 1, Math.floor(random * items.length))];
}

function chooseWeightedItem(
  state: GameState,
  random: number,
  duplicateCounts: Record<string, number>,
): string {
  const boardItems = state.board.filter(
    (item): item is ItemInstance => item !== null,
  );
  const familyWeights = getFamilyWeights(state.board);
  const ownedIds = new Set(boardItems.map((item) => item.itemId));
  const weighted = ITEMS.map((item) => {
    let weight = 1;
    weight += familyWeights[item.family] * 0.16;
    if (ownedIds.has(item.id)) weight += 0.42;
    if ((duplicateCounts[item.id] ?? 0) >= 2) weight = 0;
    return { id: item.id, weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = random * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.id;
  }
  return weighted[weighted.length - 1].id;
}

function rollOffers(
  input: GameState,
  opening: boolean,
): { state: GameState; offers: ShopOffer[] } {
  let state = input;
  const offers: ShopOffer[] = [];
  const duplicateCounts: Record<string, number> = {};
  const families: readonly Family[] = ["fire", "poison", "guard"];
  const owned = state.board.filter(
    (item): item is ItemInstance => item !== null,
  );

  for (let index = 0; index < 3; index += 1) {
    let itemId: string;
    const [random, nextSeed] = nextRandom(state.rngState);
    state = { ...state, rngState: nextSeed };

    if (opening) {
      const familyItems = ITEMS.filter(
        (item) => item.family === families[index],
      );
      itemId = pick(familyItems, random).id;
    } else if (index === 0 && state.round <= 3 && owned.length > 0) {
      itemId = pick(owned, random).itemId;
    } else {
      itemId = chooseWeightedItem(state, random, duplicateCounts);
    }

    duplicateCounts[itemId] = (duplicateCounts[itemId] ?? 0) + 1;
    let uid: string;
    [uid, state] = nextId(state, "offer");
    offers.push({ uid, itemId, bought: false });
  }

  return { state, offers };
}

export function createInitialState(seed = 0x4b4b2026): GameState {
  const base: GameState = {
    version: 2,
    phase: "shop",
    round: 1,
    gold: 7,
    seals: 3,
    victories: 0,
    board: Array.from({ length: BOARD_SIZE }, () => null),
    offers: [],
    rerollsUsed: 0,
    selectedSlot: null,
    rngState: seed >>> 0,
    idCounter: 1,
  };
  const rolled = rollOffers(base, true);
  return { ...rolled.state, offers: rolled.offers };
}

export function getFamilyWeights(board: Board): Record<Family, number> {
  const weights: Record<Family, number> = { fire: 0, poison: 0, guard: 0 };
  for (const instance of board) {
    if (!instance) continue;
    weights[ITEM_BY_ID[instance.itemId].family] += 2 ** (instance.level - 1);
  }
  return weights;
}

export function isSynergyActive(board: Board, family: Family): boolean {
  return getFamilyWeights(board)[family] >= SYNERGY_THRESHOLD;
}

export function getPowerValue(board: Board): number {
  const weights = getFamilyWeights(board);
  let power = board.reduce((sum, instance) => {
    if (!instance) return sum;
    const definition = ITEM_BY_ID[instance.itemId];
    const levelIndex = instance.level - 1;
    const raw =
      definition.values[levelIndex] +
      (definition.secondaryValues?.[levelIndex] ?? 0) * 0.65;
    const tempo = 4 / definition.cooldown[levelIndex];
    return sum + raw * tempo + definition.cost * instance.level;
  }, 0);
  for (const family of Object.keys(weights) as Family[]) {
    if (weights[family] >= SYNERGY_THRESHOLD) power *= 1.12;
  }
  return Math.round(power);
}

function mergeBoard(board: Board): { board: Board; merges: MergeStep[] } {
  const next = board.map((item) => (item ? { ...item } : null));
  const merges: MergeStep[] = [];
  let merged = true;

  while (merged) {
    merged = false;
    for (let left = 0; left < next.length; left += 1) {
      const first = next[left];
      if (!first || first.level >= 3) continue;
      const right = next.findIndex(
        (candidate, index) =>
          index > left &&
          candidate?.itemId === first.itemId &&
          candidate.level === first.level,
      );
      if (right < 0) continue;

      const fromLevel = first.level;
      const toLevel = (fromLevel + 1) as ItemLevel;
      next[left] = { ...first, level: toLevel };
      next[right] = null;
      merges.push({
        itemId: first.itemId,
        fromLevel,
        toLevel,
        slot: left,
      });
      merged = true;
      break;
    }
  }

  return { board: next, merges };
}

export function buyOffer(state: GameState, offerUid: string): ActionResult {
  if (state.phase !== "shop") return { state, error: "Der Shop ist geschlossen." };
  const offer = state.offers.find((entry) => entry.uid === offerUid);
  if (!offer || offer.bought) {
    return { state, error: "Dieses Angebot ist nicht mehr verfügbar." };
  }
  const definition = ITEM_BY_ID[offer.itemId];
  if (state.gold < definition.cost) {
    return { state, error: "Nicht genug Gold." };
  }

  const emptySlot = state.board.findIndex((item) => item === null);
  const immediateMatch = state.board.findIndex(
    (item) => item?.itemId === offer.itemId && item.level === 1,
  );
  if (emptySlot < 0 && immediateMatch < 0) {
    return {
      state,
      error: "Der Kessel ist voll – dieser Kauf würde nicht mergen.",
    };
  }

  let working = { ...state, gold: state.gold - definition.cost };
  const [uid, stateWithId] = nextId(working, "item");
  working = stateWithId;
  const board = working.board.map((item) => (item ? { ...item } : null));
  const preMerges: MergeStep[] = [];

  if (emptySlot >= 0) {
    board[emptySlot] = { uid, itemId: offer.itemId, level: 1 };
  } else {
    const existing = board[immediateMatch]!;
    board[immediateMatch] = { ...existing, level: 2 };
    preMerges.push({
      itemId: existing.itemId,
      fromLevel: 1,
      toLevel: 2,
      slot: immediateMatch,
    });
  }

  const merged = mergeBoard(board);
  working = {
    ...working,
    board: merged.board,
    offers: working.offers.map((entry) =>
      entry.uid === offerUid ? { ...entry, bought: true } : entry,
    ),
    selectedSlot: null,
  };

  return {
    state: working,
    merges: [...preMerges, ...merged.merges],
    goldDelta: -definition.cost,
  };
}

export function getSellValue(instance: ItemInstance): number {
  const definition = ITEM_BY_ID[instance.itemId];
  const investedCopies = 2 ** (instance.level - 1);
  return Math.max(1, Math.floor((definition.cost * investedCopies) / 2));
}

export function sellSlot(state: GameState, slot: number): ActionResult {
  if (state.phase !== "shop") return { state, error: "Im Kampf wird nichts verkauft." };
  const instance = state.board[slot];
  if (!instance) return { state, error: "Dieser Platz ist leer." };
  const value = getSellValue(instance);
  const board = [...state.board];
  board[slot] = null;
  return {
    state: {
      ...state,
      board,
      gold: state.gold + value,
      selectedSlot: null,
    },
    goldDelta: value,
  };
}

export function selectOrSwapSlot(
  state: GameState,
  slot: number,
): ActionResult {
  if (state.phase !== "shop") return { state };
  if (state.selectedSlot === null) {
    if (!state.board[slot]) return { state };
    return { state: { ...state, selectedSlot: slot } };
  }
  if (state.selectedSlot === slot) {
    return { state: { ...state, selectedSlot: null } };
  }
  const board = [...state.board];
  [board[state.selectedSlot], board[slot]] = [
    board[slot],
    board[state.selectedSlot],
  ];
  return {
    state: { ...state, board, selectedSlot: null },
  };
}

export function rerollShop(state: GameState): ActionResult {
  if (state.phase !== "shop") return { state, error: "Der Shop ist geschlossen." };
  const cost = state.rerollsUsed === 0 ? 0 : 1;
  if (state.gold < cost) return { state, error: "Nicht genug Gold für einen Reroll." };
  const charged = {
    ...state,
    gold: state.gold - cost,
    rerollsUsed: state.rerollsUsed + 1,
  };
  const rolled = rollOffers(charged, false);
  return {
    state: { ...rolled.state, offers: rolled.offers },
    goldDelta: -cost,
  };
}

export function beginBattle(state: GameState): ActionResult {
  if (state.phase !== "shop") return { state };
  if (!state.board.some(Boolean)) {
    return { state, error: "Lege zuerst mindestens eine Zutat in den Kessel." };
  }
  return {
    state: { ...state, phase: "battle", selectedSlot: null },
  };
}

export function showBattleResult(state: GameState): GameState {
  return { ...state, phase: "result" };
}

export function advanceAfterBattle(
  state: GameState,
  playerWon: boolean,
): GameState {
  const seals = playerWon ? state.seals : state.seals - 1;
  const victories = state.victories + (playerWon ? 1 : 0);
  if (state.round >= MAX_ROUNDS) {
    return {
      ...state,
      seals: Math.max(0, seals),
      victories,
      phase: playerWon ? "victory" : "gameover",
    };
  }
  if (seals <= 0) {
    return { ...state, seals: 0, victories, phase: "gameover" };
  }

  const nextRound = state.round + 1;
  const income = getRoundReward(state, playerWon);
  const base: GameState = {
    ...state,
    phase: "shop",
    round: nextRound,
    seals,
    victories,
    gold: state.gold + income,
    rerollsUsed: 0,
    selectedSlot: null,
  };
  const rolled = rollOffers(base, false);
  return { ...rolled.state, offers: rolled.offers };
}

export function resetRun(seed = Date.now() >>> 0): GameState {
  return createInitialState(seed);
}

export function getCurrentOpponent(state: GameState) {
  return CAMPAIGN_OPPONENTS[
    Math.min(Math.max(0, state.round - 1), CAMPAIGN_OPPONENTS.length - 1)
  ];
}

export function getRoundReward(
  state: GameState,
  playerWon: boolean,
): number {
  const opponent = getCurrentOpponent(state);
  return (
    5 +
    Math.floor(state.round / 2) +
    (playerWon ? 1 : 0) +
    (playerWon ? (opponent.rewardBonus ?? 0) : 0)
  );
}

export function sanitizeStoredState(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<GameState>;
  if (
    candidate.version !== 2 ||
    !Array.isArray(candidate.board) ||
    candidate.board.length !== BOARD_SIZE ||
    !Array.isArray(candidate.offers) ||
    typeof candidate.gold !== "number" ||
    typeof candidate.round !== "number" ||
    typeof candidate.seals !== "number"
  ) {
    return null;
  }
  const safePhase =
    candidate.phase === "battle" || candidate.phase === "result"
      ? "shop"
      : (candidate.phase ?? "shop");
  return {
    ...(candidate as GameState),
    victories:
      typeof candidate.victories === "number" ? candidate.victories : 0,
    phase: safePhase,
    selectedSlot: null,
  };
}
