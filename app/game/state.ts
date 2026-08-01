import { CAMPAIGN_OPPONENTS, ITEM_BY_ID, ITEMS } from "./data";
import type {
  BattleOutcome,
  Board,
  CombatResult,
  Family,
  GamePhase,
  GameState,
  ItemLocation,
  ItemInstance,
  ItemLevel,
  MergeStep,
  ShopOffer,
} from "./types";

export const BOARD_SIZE = 5;
export const SYNERGY_THRESHOLD = 3;
export const MAX_ROUNDS = CAMPAIGN_OPPONENTS.length;
export const RESERVE_UNLOCK_ROUND = 5;
export const STORAGE_KEY = "kessel-krawall-run-v5";
export const LEGACY_STORAGE_KEYS = [
  "kessel-krawall-run-v4",
  "kessel-krawall-run-v3",
  "kessel-krawall-run-v2",
] as const;
export const DEFEAT_RECOVERY_GOLD = 3;
const OPENING_ITEM_IDS = ["chili", "slime-shroom", "egg-shell"] as const;

export interface ActionResult {
  state: GameState;
  error?: string;
  merges?: MergeStep[];
  goldDelta?: number;
  purchaseLocation?: ItemLocation;
}

export interface PurchaseMergePreview {
  target: ItemLocation;
  resultLevel: ItemLevel;
  mergeCount: number;
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

function opponentVariantCount(round: number): number {
  const opponent =
    CAMPAIGN_OPPONENTS[
      Math.min(Math.max(0, round - 1), CAMPAIGN_OPPONENTS.length - 1)
    ];
  return 1 + (opponent.boardVariants?.length ?? 0);
}

function rollOpponentVariant(state: GameState, round: number): GameState {
  const [random, rngState] = nextRandom(state.rngState);
  return {
    ...state,
    rngState,
    opponentVariant: Math.min(
      opponentVariantCount(round) - 1,
      Math.floor(random * opponentVariantCount(round)),
    ),
  };
}

function chooseWeightedItem(
  state: GameState,
  random: number,
  duplicateCounts: Record<string, number>,
): string {
  const inventoryItems = [...state.board, state.reserve].filter(
    (item): item is ItemInstance => item !== null,
  );
  const familyWeights = getFamilyWeights(state.board);
  const ownedIds = new Set(inventoryItems.map((item) => item.itemId));
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
  const owned = state.board.filter(
    (item): item is ItemInstance => item !== null,
  );

  for (let index = 0; index < 3; index += 1) {
    let itemId: string;
    const [random, nextSeed] = nextRandom(state.rngState);
    state = { ...state, rngState: nextSeed };

    if (opening) {
      itemId = OPENING_ITEM_IDS[index];
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
    version: 5,
    phase: "intro",
    round: 1,
    gold: 7,
    seals: 3,
    victories: 0,
    board: Array.from({ length: BOARD_SIZE }, () => null),
    reserve: null,
    offers: [],
    rerollsUsed: 0,
    selectedSlot: null,
    rngState: seed >>> 0,
    idCounter: 1,
    opponentVariant: (seed >>> 0) % opponentVariantCount(1),
    openingProtectionUsed: false,
    pendingBattle: null,
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

export function getPowerBreakdown(board: Board): {
  itemValue: number;
  synergyCount: number;
  synergyBonus: number;
  total: number;
} {
  const weights = getFamilyWeights(board);
  const rawItemValue = board.reduce((sum, instance) => {
    if (!instance) return sum;
    const definition = ITEM_BY_ID[instance.itemId];
    const levelIndex = instance.level - 1;
    const raw =
      definition.values[levelIndex] +
      (definition.secondaryValues?.[levelIndex] ?? 0) * 0.65;
    const tempo = 4 / definition.cooldown[levelIndex];
    return sum + raw * tempo + definition.cost * instance.level;
  }, 0);
  const synergyCount = (Object.keys(weights) as Family[]).filter(
    (family) => weights[family] >= SYNERGY_THRESHOLD,
  ).length;
  const total = Math.round(rawItemValue * 1.12 ** synergyCount);
  const itemValue = Math.round(rawItemValue);

  return {
    itemValue,
    synergyCount,
    synergyBonus: Math.max(0, total - itemValue),
    total,
  };
}

export function getPowerValue(board: Board): number {
  return getPowerBreakdown(board).total;
}

interface MutableInventory {
  board: Board;
  reserve: ItemInstance | null;
}

interface InventoryMergeResult extends MutableInventory {
  merges: MergeStep[];
  location: ItemLocation | null;
}

function itemAt(
  inventory: MutableInventory,
  location: ItemLocation,
): ItemInstance | null {
  return location.area === "board"
    ? inventory.board[location.slot] ?? null
    : inventory.reserve;
}

function setItemAt(
  inventory: MutableInventory,
  location: ItemLocation,
  item: ItemInstance | null,
): void {
  if (location.area === "board") inventory.board[location.slot] = item;
  else inventory.reserve = item;
}

function sameLocation(left: ItemLocation, right: ItemLocation): boolean {
  return (
    left.area === right.area &&
    (left.area === "reserve" ||
      (right.area === "board" && left.slot === right.slot))
  );
}

function matchingLocations(
  inventory: MutableInventory,
  itemId: string,
  level: ItemLevel,
): ItemLocation[] {
  const locations: ItemLocation[] = [];
  inventory.board.forEach((item, slot) => {
    if (item?.itemId === itemId && item.level === level) {
      locations.push({ area: "board", slot });
    }
  });
  if (
    inventory.reserve?.itemId === itemId &&
    inventory.reserve.level === level
  ) {
    locations.push({ area: "reserve" });
  }
  return locations;
}

function chooseMergeSurvivor(
  upgraded: ItemLocation,
  other: ItemLocation,
): [ItemLocation, ItemLocation] {
  if (upgraded.area === "reserve" && other.area === "board") {
    return [other, upgraded];
  }
  return [upgraded, other];
}

function mergePurchasedItem(
  board: Board,
  reserve: ItemInstance | null,
  itemId: string,
  purchasedUid: string,
  allowReserve: boolean,
): InventoryMergeResult {
  const inventory: MutableInventory = {
    board: board.map((item) => (item ? { ...item } : null)),
    reserve: reserve ? { ...reserve } : null,
  };
  const merges: MergeStep[] = [];
  let currentLocation: ItemLocation | null =
    matchingLocations(inventory, itemId, 1)[0] ?? null;

  if (!currentLocation) {
    const emptySlot = inventory.board.findIndex((item) => item === null);
    currentLocation =
      emptySlot >= 0
        ? { area: "board", slot: emptySlot }
        : allowReserve && !inventory.reserve
          ? { area: "reserve" }
          : null;
    if (currentLocation) {
      setItemAt(inventory, currentLocation, {
        uid: purchasedUid,
        itemId,
        level: 1,
      });
    }
    return { ...inventory, merges, location: currentLocation };
  }

  const levelOne = itemAt(inventory, currentLocation)!;
  setItemAt(inventory, currentLocation, { ...levelOne, level: 2 });
  merges.push({
    itemId,
    fromLevel: 1,
    toLevel: 2,
    target: currentLocation,
    consumed: null,
  });

  while (true) {
    const mergeLocation = currentLocation;
    const current = itemAt(inventory, mergeLocation);
    if (!current || current.level >= 3) break;
    const otherLocation = matchingLocations(
      inventory,
      itemId,
      current.level,
    ).find((location) => !sameLocation(location, mergeLocation));
    if (!otherLocation) break;

    const [survivor, consumed] = chooseMergeSurvivor(
      mergeLocation,
      otherLocation,
    );
    const survivorItem = itemAt(inventory, survivor)!;
    const fromLevel = survivorItem.level;
    const toLevel = (fromLevel + 1) as ItemLevel;
    setItemAt(inventory, survivor, { ...survivorItem, level: toLevel });
    setItemAt(inventory, consumed, null);
    currentLocation = survivor;
    merges.push({
      itemId,
      fromLevel,
      toLevel,
      target: survivor,
      consumed,
    });
  }

  return { ...inventory, merges, location: currentLocation };
}

export function getPurchaseMergePreview(
  board: Board,
  itemId: string,
  reserve: ItemInstance | null = null,
  allowReserve = false,
): PurchaseMergePreview | null {
  const merged = mergePurchasedItem(
    board,
    reserve,
    itemId,
    "preview",
    allowReserve,
  );
  const last = merged.merges.at(-1);
  return last
    ? {
        target: last.target,
        resultLevel: last.toLevel,
        mergeCount: merged.merges.length,
      }
    : null;
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

  let working = { ...state, gold: state.gold - definition.cost };
  const [uid, stateWithId] = nextId(working, "item");
  working = stateWithId;
  const merged = mergePurchasedItem(
    working.board,
    working.reserve,
    offer.itemId,
    uid,
    working.round >= RESERVE_UNLOCK_ROUND,
  );
  if (!merged.location) {
    return {
      state,
      error:
        working.round >= RESERVE_UNLOCK_ROUND
          ? "Kessel und Ablage sind voll – dieser Kauf würde nicht mergen."
          : "Der Kessel ist voll – dieser Kauf würde nicht mergen.",
    };
  }
  working = {
    ...working,
    board: merged.board,
    reserve: merged.reserve,
    offers: working.offers.map((entry) =>
      entry.uid === offerUid ? { ...entry, bought: true } : entry,
    ),
    selectedSlot: null,
  };

  return {
    state: working,
    merges: merged.merges,
    goldDelta: -definition.cost,
    purchaseLocation: merged.location,
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

export function sellReserve(state: GameState): ActionResult {
  if (state.phase !== "shop") {
    return { state, error: "Im Kampf wird nichts verkauft." };
  }
  if (state.round < RESERVE_UNLOCK_ROUND) {
    return { state, error: "Die Ablage ist noch nicht freigeschaltet." };
  }
  if (!state.reserve) return { state, error: "Die Ablage ist leer." };
  const value = getSellValue(state.reserve);
  return {
    state: {
      ...state,
      reserve: null,
      selectedSlot: null,
      gold: state.gold + value,
    },
    goldDelta: value,
  };
}

export function swapSlotWithReserve(
  state: GameState,
  slot: number,
): ActionResult {
  if (state.phase !== "shop") {
    return { state, error: "Im Kampf wird nichts umgestellt." };
  }
  if (state.round < RESERVE_UNLOCK_ROUND) {
    return { state, error: "Die Ablage ist noch nicht freigeschaltet." };
  }
  if (slot < 0 || slot >= BOARD_SIZE) return { state };
  const board = [...state.board];
  const boardItem = board[slot];
  board[slot] = state.reserve;
  return {
    state: {
      ...state,
      board,
      reserve: boardItem,
      selectedSlot: null,
    },
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

export function enterOpeningShop(state: GameState): GameState {
  return state.phase === "intro" ? { ...state, phase: "shop" } : state;
}

export function showBattleResult(state: GameState): GameState {
  return { ...state, phase: "result" };
}

export function advanceAfterBattle(
  state: GameState,
  outcome: BattleOutcome,
): GameState {
  const playerWon = outcome === "player";
  const playerLost = outcome === "enemy";
  const openingLossProtected = isOpeningDefeatProtected(state, outcome);
  const seals =
    playerLost && !openingLossProtected ? state.seals - 1 : state.seals;
  const victories = state.victories + (playerWon ? 1 : 0);
  const openingProtectionUsed =
    state.openingProtectionUsed || openingLossProtected;

  if (playerWon && state.round >= MAX_ROUNDS) {
    return {
      ...state,
      openingProtectionUsed,
      victories,
      phase: "victory",
      pendingBattle: null,
    };
  }
  if (playerLost && seals <= 0) {
    return {
      ...state,
      seals: 0,
      openingProtectionUsed,
      victories,
      phase: "gameover",
      pendingBattle: null,
    };
  }

  const nextRound = playerWon ? state.round + 1 : state.round;
  const income = getBattleReward(state, outcome);
  const base: GameState = {
    ...state,
    phase: "shop",
    round: nextRound,
    seals,
    victories,
    gold: state.gold + income,
    rerollsUsed: 0,
    selectedSlot: null,
    openingProtectionUsed,
    pendingBattle: null,
  };
  const opponentState = playerWon
    ? rollOpponentVariant(base, nextRound)
    : base;
  const rolled = rollOffers(opponentState, false);
  return { ...rolled.state, offers: rolled.offers };
}

export function resetRun(seed = Date.now() >>> 0): GameState {
  return createInitialState(seed);
}

export function getCurrentOpponent(state: GameState) {
  const opponent = CAMPAIGN_OPPONENTS[
    Math.min(Math.max(0, state.round - 1), CAMPAIGN_OPPONENTS.length - 1)
  ];
  const boards = [opponent.board, ...(opponent.boardVariants ?? [])];
  return {
    ...opponent,
    board: boards[Math.min(state.opponentVariant, boards.length - 1)],
  };
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

export function isOpeningDefeatProtected(
  state: GameState,
  outcome: BattleOutcome = "enemy",
): boolean {
  return (
    outcome === "enemy" &&
    state.round === 1 &&
    !state.openingProtectionUsed
  );
}

export function getBattleReward(
  state: GameState,
  outcome: BattleOutcome,
): number {
  if (outcome === "player") {
    return state.round >= MAX_ROUNDS ? 0 : getRoundReward(state, true);
  }
  if (outcome === "enemy") {
    const protectedLoss = isOpeningDefeatProtected(state, outcome);
    const sealsAfterLoss = protectedLoss ? state.seals : state.seals - 1;
    return sealsAfterLoss > 0 ? DEFEAT_RECOVERY_GOLD : 0;
  }
  return 0;
}

export function sanitizeStoredState(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  const version = value.version;
  if (version !== 2 && version !== 3 && version !== 4 && version !== 5) {
    return null;
  }

  const board = sanitizeBoard(value.board);
  const offers = sanitizeOffers(value.offers);
  const phase = sanitizePhase(value.phase);
  if (!board || !offers || !phase) return null;
  const reserve =
    version === 4 || version === 5
      ? value.reserve === null
        ? null
        : sanitizeItemInstance(value.reserve)
      : null;
  if ((version === 4 || version === 5) && value.reserve !== null && !reserve) {
    return null;
  }

  const round = safeInteger(value.round, 1, MAX_ROUNDS);
  const gold = safeInteger(value.gold, 0, 999);
  const seals = safeInteger(value.seals, 0, 3);
  const victories = safeInteger(value.victories ?? 0, 0, MAX_ROUNDS);
  const rerollsUsed = safeInteger(value.rerollsUsed, 0, 99);
  const rngState = safeInteger(value.rngState, 0, 0xffffffff);
  const idCounter = safeInteger(value.idCounter, 1, Number.MAX_SAFE_INTEGER);
  const selectedSlot =
    value.selectedSlot === null
      ? null
      : safeInteger(value.selectedSlot, 0, BOARD_SIZE - 1);
  if (
    round === null ||
    gold === null ||
    seals === null ||
    victories === null ||
    rerollsUsed === null ||
    rngState === null ||
    idCounter === null ||
    (value.selectedSlot !== null && selectedSlot === null)
  ) {
    return null;
  }

  const uids = [
    ...board.flatMap((item) => (item ? [item.uid] : [])),
    ...(reserve ? [reserve.uid] : []),
    ...offers.map((offer) => offer.uid),
  ];
  if (new Set(uids).size !== uids.length) return null;

  if (version === 2) {
    return {
      version: 5,
      phase:
        phase === "battle" || phase === "result" ? "shop" : phase,
      round,
      gold,
      seals,
      victories,
      board,
      reserve: null,
      offers,
      rerollsUsed,
      selectedSlot: null,
      rngState,
      idCounter,
      opponentVariant: 0,
      openingProtectionUsed: round > 1,
      pendingBattle: null,
    };
  }

  const opponentVariant = safeInteger(value.opponentVariant, 0, 2);
  const pendingBattle =
    value.pendingBattle === null
      ? null
      : sanitizeCombatResult(value.pendingBattle);
  if (
    opponentVariant === null ||
    pendingBattle === undefined ||
    ((phase === "battle" || phase === "result") && !pendingBattle)
  ) {
    return null;
  }
  const openingProtectionUsed =
    version === 5
      ? typeof value.openingProtectionUsed === "boolean"
        ? value.openingProtectionUsed
        : null
      : round > 1;
  if (openingProtectionUsed === null) return null;

  return {
    version: 5,
    phase,
    round,
    gold,
    seals,
    victories,
    board,
    reserve,
    offers,
    rerollsUsed,
    selectedSlot,
    rngState,
    idCounter,
    opponentVariant,
    openingProtectionUsed,
    pendingBattle,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
    ? (value as number)
    : null;
}

function safeText(value: unknown, maximum = 160): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum
    ? value
    : null;
}

function sanitizePhase(value: unknown): GamePhase | null {
  return value === "intro" ||
    value === "shop" ||
    value === "battle" ||
    value === "result" ||
    value === "victory" ||
    value === "gameover"
    ? value
    : null;
}

function sanitizeBoard(value: unknown): Board | null {
  if (!Array.isArray(value) || value.length !== BOARD_SIZE) return null;
  const board: Board = [];
  for (const entry of value) {
    if (entry === null) {
      board.push(null);
      continue;
    }
    const item = sanitizeItemInstance(entry);
    if (!item) return null;
    board.push(item);
  }
  return board;
}

function sanitizeItemInstance(value: unknown): ItemInstance | null {
  if (!isRecord(value)) return null;
  const uid = safeText(value.uid, 80);
  const itemId = safeText(value.itemId, 80);
  const level = safeInteger(value.level, 1, 3);
  if (!uid || !itemId || !ITEM_BY_ID[itemId] || level === null) return null;
  return { uid, itemId, level: level as ItemLevel };
}

function sanitizeOffers(value: unknown): ShopOffer[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const offers: ShopOffer[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const uid = safeText(entry.uid, 80);
    const itemId = safeText(entry.itemId, 80);
    if (
      !uid ||
      !itemId ||
      !ITEM_BY_ID[itemId] ||
      typeof entry.bought !== "boolean"
    ) {
      return null;
    }
    offers.push({ uid, itemId, bought: entry.bought });
  }
  return offers;
}

function sanitizeCombatResult(value: unknown): CombatResult | null | undefined {
  if (!isRecord(value)) return undefined;
  const winner =
    value.winner === "player" ||
    value.winner === "enemy" ||
    value.winner === "draw"
      ? value.winner
      : null;
  const reason =
    value.reason === "knockout" || value.reason === "timeout"
      ? value.reason
      : null;
  const duration = safeInteger(value.duration, 0, 30_000);
  const playerMaxHp = safeInteger(value.playerMaxHp, 1, 10_000);
  const enemyMaxHp = safeInteger(value.enemyMaxHp, 1, 10_000);
  const finalPlayerHp = safeInteger(value.finalPlayerHp, 0, 10_000);
  const finalPlayerShield = safeInteger(value.finalPlayerShield, 0, 10_000);
  const finalEnemyHp = safeInteger(value.finalEnemyHp, 0, 10_000);
  const finalEnemyShield = safeInteger(value.finalEnemyShield, 0, 10_000);
  if (
    !winner ||
    !reason ||
    duration === null ||
    playerMaxHp === null ||
    enemyMaxHp === null ||
    finalPlayerHp === null ||
    finalPlayerShield === null ||
    finalEnemyHp === null ||
    finalEnemyShield === null ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.playerStats) ||
    !Array.isArray(value.enemyStats)
  ) {
    return undefined;
  }

  const validSides = new Set(["player", "enemy"]);
  const validKinds = new Set([
    "damage",
    "poison",
    "poisonBurst",
    "burn",
    "heal",
    "shield",
    "cleanse",
    "synergy",
    "boss",
  ]);
  const events = value.events.map((event) => {
    if (!isRecord(event)) return null;
    const time = safeInteger(event.time, 0, 30_000);
    const amount = safeInteger(event.amount, 1, 100_000);
    const playerHp = safeInteger(event.playerHp, 0, 10_000);
    const playerShield = safeInteger(event.playerShield, 0, 10_000);
    const enemyHp = safeInteger(event.enemyHp, 0, 10_000);
    const enemyShield = safeInteger(event.enemyShield, 0, 10_000);
    const sourceUid = safeText(event.sourceUid, 100);
    const label = safeText(event.label, 160);
    if (
      time === null ||
      amount === null ||
      playerHp === null ||
      playerShield === null ||
      enemyHp === null ||
      enemyShield === null ||
      !validKinds.has(String(event.kind)) ||
      !validSides.has(String(event.actor)) ||
      !validSides.has(String(event.target)) ||
      !sourceUid ||
      !label
    ) {
      return null;
    }
    return event as unknown as CombatResult["events"][number];
  });

  const sanitizeStats = (input: unknown[]) =>
    input.map((stat) => {
      if (!isRecord(stat)) return null;
      const uid = safeText(stat.uid, 100);
      const itemId = safeText(stat.itemId, 80);
      const level = safeInteger(stat.level, 1, 3);
      const numericKeys = [
        "triggers",
        "hpDamage",
        "shieldDamage",
        "totalDamage",
        "healing",
        "shield",
        "poisonApplied",
      ] as const;
      if (
        !uid ||
        !itemId ||
        !ITEM_BY_ID[itemId] ||
        level === null ||
        numericKeys.some(
          (key) => safeInteger(stat[key], 0, 1_000_000) === null,
        )
      ) {
        return null;
      }
      return stat as unknown as CombatResult["playerStats"][number];
    });

  const playerStats = sanitizeStats(value.playerStats);
  const enemyStats = sanitizeStats(value.enemyStats);
  if (
    events.some((event) => !event) ||
    playerStats.some((stat) => !stat) ||
    enemyStats.some((stat) => !stat)
  ) {
    return undefined;
  }

  return {
    winner,
    reason,
    duration,
    events: events as CombatResult["events"],
    playerStats: playerStats as CombatResult["playerStats"],
    enemyStats: enemyStats as CombatResult["enemyStats"],
    finalPlayerHp,
    finalPlayerShield,
    finalEnemyHp,
    finalEnemyShield,
    playerMaxHp,
    enemyMaxHp,
  };
}
