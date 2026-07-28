import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCombatBeats,
  getCombatBeatTiming,
} from "../app/game/combatPresentation";
import { ITEM_BY_ID, ITEMS } from "../app/game/data";
import {
  DEFAULT_COMBAT_LIMIT_MS,
  simulateBattle,
} from "../app/game/simulation";
import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  getCurrentOpponent,
  getFamilyWeights,
  getPowerValue,
  getSellValue,
  rerollShop,
  sellSlot,
} from "../app/game/state";
import type {
  BattleOutcome,
  Board,
  CombatResult,
  Family,
  GameState,
  ItemInstance,
  OpponentDefinition,
} from "../app/game/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_JSON = resolve(ROOT, "reports", "balance-results.json");
const REPORT_MARKDOWN = resolve(ROOT, "reports", "balance-summary.md");
const DEFAULT_SEED_COUNT = 64;
const BASE_SEED = 0x4b4b0000;
const SEED_STRIDE = 0x9e3779b9;
const ROUND_COUNT = 8;
const COMBAT_LIMITS = [25_000, 35_000, 45_000] as const;
const MEANINGFUL_MARGIN_SHIFT = 0.15;

type StrategyMode = "power" | "merge" | "family" | "lookahead";

interface StrategyDefinition {
  id: string;
  label: string;
  description: string;
  mode: StrategyMode;
  family?: Family;
  mayReplace: boolean;
}

const STRATEGIES: readonly StrategyDefinition[] = [
  {
    id: "power-greedy",
    label: "Buildstärke",
    description:
      "Kauft den größten Zuwachs der groben Buildstärke pro Gold.",
    mode: "power",
    mayReplace: false,
  },
  {
    id: "merge-first",
    label: "Merge-Fokus",
    description:
      "Priorisiert sofortige Merges, vorhandene Zutaten und danach Buildstärke.",
    mode: "merge",
    mayReplace: false,
  },
  {
    id: "fire-focus",
    label: "Feuer-Fokus",
    description:
      "Bevorzugt Feuerzutaten und Merges, kauft aber bezahlbare Ergänzungen.",
    mode: "family",
    family: "fire",
    mayReplace: false,
  },
  {
    id: "poison-focus",
    label: "Gift-Fokus",
    description:
      "Bevorzugt Giftzutaten und Merges, kauft aber bezahlbare Ergänzungen.",
    mode: "family",
    family: "poison",
    mayReplace: false,
  },
  {
    id: "guard-focus",
    label: "Schutz-Fokus",
    description:
      "Bevorzugt Schutzzutaten und Merges, kauft aber bezahlbare Ergänzungen.",
    mode: "family",
    family: "guard",
    mayReplace: false,
  },
  {
    id: "matchup-lookahead",
    label: "Matchup-Suche",
    description:
      "Bewertet Käufe mit der echten Simulation des nächsten Gegners und darf legal verkaufen/ersetzen.",
    mode: "lookahead",
    mayReplace: true,
  },
];

interface PowerSample {
  predictedMargin: number;
  actualMargin: number;
  outcome: BattleOutcome;
}

interface RoundAccumulator {
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  timeouts: number;
  durations: number[];
  playback1x: number[];
  startGold: number;
  endGold: number;
  purchaseGold: number;
  saleGold: number;
  purchases: number;
  replacementPurchases: number;
  merges: number;
  shops: number;
  boardFullAtStart: number;
  offersSeen: number;
  affordableOffers: number;
  directPurchasableOffers: number;
  directMergeOffers: number;
  immediateImprovementOffers: number;
  blockedFullOffers: number;
  blockedOwnedOffers: number;
  blockedLevelTwoOffers: number;
  replacementImprovementOffers: number;
  shopsWithoutDirectPurchase: number;
  shopsWithoutImmediateImprovement: number;
  shopsWithReplacementImprovement: number;
}

interface StrategyAccumulator {
  definition: StrategyDefinition;
  rounds: RoundAccumulator[];
  powerSamples: PowerSample[];
  lateCampaigns: number;
  lateCampaignsWithRepeatedBlockedItem: number;
  lateRepeatedBlockedPairs: number;
}

interface ScenarioAccumulator {
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  timeouts: number;
  durations: number[];
  playback1x: number[];
  playback2x: number[];
  playback4x: number[];
}

interface ItemAccumulator {
  offered: number;
  affordable: number;
  directPurchasable: number;
  directMergeOffer: number;
  immediateImprovementOffer: number;
  blockedFull: number;
  blockedOwned: number;
  blockedLevelTwo: number;
  replacementImprovementOffer: number;
  purchased: number;
  purchaseMerges: number;
  battleAppearances: number;
  winningAppearances: number;
  losingAppearances: number;
  drawAppearances: number;
  representedCopies: number;
  triggers: number;
  hpDamage: number;
  shieldDamage: number;
  totalDamage: number;
  healing: number;
  shield: number;
  poisonApplied: number;
}

interface PositionSlice {
  matchups: number;
  arrangements: number;
  anyOutcomeChange: number;
  directWinnerFlip: number;
  meaningfulMarginShift: number;
  totalMarginRange: number;
}

interface PositionAccumulator {
  all: PositionSlice;
  relevant: PositionSlice;
}

interface BuildAccumulator {
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  timeouts: number;
  durations: number[];
}

interface PurchaseCandidate {
  offerUid: string;
  itemId: string;
  nextState: GameState;
  cost: number;
  saleGold: number;
  merges: number;
  soldSlot: number | null;
  powerGain: number;
  combatGain: number;
}

interface ShopSessionSignals {
  sawDirectPurchase: boolean;
  sawImmediateImprovement: boolean;
  sawReplacementImprovement: boolean;
}

function seedCountFromArgs(): number {
  const entry = process.argv.find((arg) => arg.startsWith("--seeds="));
  if (!entry) return DEFAULT_SEED_COUNT;
  const parsed = Number(entry.slice("--seeds=".length));
  return Number.isSafeInteger(parsed) && parsed >= 8 && parsed <= 1_000
    ? parsed
    : DEFAULT_SEED_COUNT;
}

function emptyRound(): RoundAccumulator {
  return {
    battles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    timeouts: 0,
    durations: [],
    playback1x: [],
    startGold: 0,
    endGold: 0,
    purchaseGold: 0,
    saleGold: 0,
    purchases: 0,
    replacementPurchases: 0,
    merges: 0,
    shops: 0,
    boardFullAtStart: 0,
    offersSeen: 0,
    affordableOffers: 0,
    directPurchasableOffers: 0,
    directMergeOffers: 0,
    immediateImprovementOffers: 0,
    blockedFullOffers: 0,
    blockedOwnedOffers: 0,
    blockedLevelTwoOffers: 0,
    replacementImprovementOffers: 0,
    shopsWithoutDirectPurchase: 0,
    shopsWithoutImmediateImprovement: 0,
    shopsWithReplacementImprovement: 0,
  };
}

function emptyScenario(): ScenarioAccumulator {
  return {
    battles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    timeouts: 0,
    durations: [],
    playback1x: [],
    playback2x: [],
    playback4x: [],
  };
}

function emptyPositionSlice(): PositionSlice {
  return {
    matchups: 0,
    arrangements: 0,
    anyOutcomeChange: 0,
    directWinnerFlip: 0,
    meaningfulMarginShift: 0,
    totalMarginRange: 0,
  };
}

function emptyItem(): ItemAccumulator {
  return {
    offered: 0,
    affordable: 0,
    directPurchasable: 0,
    directMergeOffer: 0,
    immediateImprovementOffer: 0,
    blockedFull: 0,
    blockedOwned: 0,
    blockedLevelTwo: 0,
    replacementImprovementOffer: 0,
    purchased: 0,
    purchaseMerges: 0,
    battleAppearances: 0,
    winningAppearances: 0,
    losingAppearances: 0,
    drawAppearances: 0,
    representedCopies: 0,
    triggers: 0,
    hpDamage: 0,
    shieldDamage: 0,
    totalDamage: 0,
    healing: 0,
    shield: 0,
    poisonApplied: 0,
  };
}

function emptyBuild(): BuildAccumulator {
  return {
    battles: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    timeouts: 0,
    durations: [],
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: readonly number[]): number {
  return values.length > 0 ? sum(values) / values.length : 0;
}

function quantile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction)),
  );
  return sorted[index];
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function percent(value: number): number {
  return Math.round(value * 10_000) / 100;
}

function wilson(successes: number, total: number): {
  lowPercent: number;
  highPercent: number;
} {
  if (total === 0) return { lowPercent: 0, highPercent: 0 };
  const z = 1.96;
  const observed = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (observed + (z * z) / (2 * total)) / denominator;
  const spread =
    (z *
      Math.sqrt(
        (observed * (1 - observed)) / total +
          (z * z) / (4 * total * total),
      )) /
    denominator;
  return {
    lowPercent: percent(Math.max(0, center - spread)),
    highPercent: percent(Math.min(1, center + spread)),
  };
}

function representedCopies(instance: ItemInstance): number {
  return 2 ** (instance.level - 1);
}

function boardSignature(board: Board): string {
  return board
    .map((entry) => (entry ? `${entry.itemId}:${entry.level}` : "-"))
    .join("|");
}

function opponentSignature(opponent: OpponentDefinition): string {
  return [
    opponent.id,
    opponent.baseHp,
    opponent.bossRule ?? "-",
    boardSignature(opponent.board),
  ].join(":");
}

function uniqueArrangements(board: Board): Board[] {
  const arrangements = new Map<string, Board>();
  const used = Array.from({ length: board.length }, () => false);
  const current: Board = [];

  function visit(): void {
    if (current.length === board.length) {
      const candidate = current.map((entry) =>
        entry ? { ...entry } : null,
      );
      arrangements.set(boardSignature(candidate), candidate);
      return;
    }
    const seenAtDepth = new Set<string>();
    for (let index = 0; index < board.length; index += 1) {
      if (used[index]) continue;
      const entry = board[index];
      const signature = entry ? `${entry.itemId}:${entry.level}` : "-";
      if (seenAtDepth.has(signature)) continue;
      seenAtDepth.add(signature);
      used[index] = true;
      current.push(entry);
      visit();
      current.pop();
      used[index] = false;
    }
  }

  visit();
  return [...arrangements.values()];
}

const battleCache = new Map<string, CombatResult>();

function simulateCached(
  board: Board,
  opponent: OpponentDefinition,
  combatLimitMs = DEFAULT_COMBAT_LIMIT_MS,
): CombatResult {
  const key = `${combatLimitMs}:${boardSignature(board)}:${opponentSignature(opponent)}`;
  const cached = battleCache.get(key);
  if (cached) return cached;
  const result = simulateBattle(board, opponent, { combatLimitMs });
  battleCache.set(key, result);
  return result;
}

function battleMargin(result: CombatResult): number {
  return (
    result.finalPlayerHp / result.playerMaxHp -
    result.finalEnemyHp / result.enemyMaxHp
  );
}

function outcomeRank(outcome: BattleOutcome): number {
  return outcome === "player" ? 2 : outcome === "draw" ? 1 : 0;
}

function combatUtility(result: CombatResult): number {
  const durationTiebreak =
    result.winner === "player"
      ? (DEFAULT_COMBAT_LIMIT_MS - result.duration) /
        DEFAULT_COMBAT_LIMIT_MS /
        20
      : result.winner === "enemy"
        ? result.duration / DEFAULT_COMBAT_LIMIT_MS / 40
        : 0;
  return outcomeRank(result.winner) * 10 + battleMargin(result) + durationTiebreak;
}

function isImmediateImprovement(
  before: CombatResult,
  after: CombatResult,
): boolean {
  const beforeRank = outcomeRank(before.winner);
  const afterRank = outcomeRank(after.winner);
  if (afterRank !== beforeRank) return afterRank > beforeRank;
  if (battleMargin(after) - battleMargin(before) >= 0.02) return true;
  if (
    after.winner === "player" &&
    before.duration - after.duration >= 1_000
  ) {
    return true;
  }
  return (
    after.winner === "enemy" &&
    after.duration - before.duration >= 1_000
  );
}

function estimatedPlaybackMs(result: CombatResult, speed: number): number {
  let nextBeatAllowedAt = 0;
  let previousBeatTime = 0;
  for (const beat of createCombatBeats(result.events)) {
    const releaseAt = beat.time / speed;
    const startsAt = Math.max(releaseAt, nextBeatAllowedAt);
    nextBeatAllowedAt =
      startsAt +
      getCombatBeatTiming(beat, previousBeatTime, speed).holdMs;
    previousBeatTime = beat.time;
  }
  const finishDelay = result.reason === "timeout" ? 1_250 : 850;
  return (
    Math.max(result.duration / speed, nextBeatAllowedAt) + finishDelay
  );
}

function pearson(samples: readonly PowerSample[]): number {
  if (samples.length < 2) return 0;
  const meanX =
    samples.reduce((total, sample) => total + sample.predictedMargin, 0) /
    samples.length;
  const meanY =
    samples.reduce((total, sample) => total + sample.actualMargin, 0) /
    samples.length;
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  for (const sample of samples) {
    const x = sample.predictedMargin - meanX;
    const y = sample.actualMargin - meanY;
    numerator += x * y;
    denominatorX += x * x;
    denominatorY += y * y;
  }
  const denominator = Math.sqrt(denominatorX * denominatorY);
  return denominator === 0 ? 0 : numerator / denominator;
}

function powerError(samples: readonly PowerSample[]): {
  decisiveSamples: number;
  errorPercent: number;
} {
  const decisive = samples.filter((sample) => sample.outcome !== "draw");
  const errors = decisive.filter((sample) => {
    const predicted =
      sample.predictedMargin > 0
        ? "player"
        : sample.predictedMargin < 0
          ? "enemy"
          : "draw";
    return predicted !== sample.outcome;
  }).length;
  return {
    decisiveSamples: decisive.length,
    errorPercent: percent(ratio(errors, decisive.length)),
  };
}

function directCandidates(
  state: GameState,
  opponent: OpponentDefinition,
): PurchaseCandidate[] {
  const currentPower = getPowerValue(state.board);
  const beforeBattle = simulateCached(state.board, opponent);
  return state.offers.flatMap((offer) => {
    if (offer.bought) return [];
    const definition = ITEM_BY_ID[offer.itemId];
    if (definition.cost > state.gold) return [];
    const result = buyOffer(state, offer.uid);
    if (result.error) return [];
    const afterBattle = simulateCached(result.state.board, opponent);
    return [
      {
        offerUid: offer.uid,
        itemId: offer.itemId,
        nextState: result.state,
        cost: definition.cost,
        saleGold: 0,
        merges: result.merges?.length ?? 0,
        soldSlot: null,
        powerGain: getPowerValue(result.state.board) - currentPower,
        combatGain: combatUtility(afterBattle) - combatUtility(beforeBattle),
      },
    ];
  });
}

function replacementCandidates(
  state: GameState,
  opponent: OpponentDefinition,
): PurchaseCandidate[] {
  if (state.board.some((entry) => entry === null)) return [];
  const currentPower = getPowerValue(state.board);
  const beforeBattle = simulateCached(state.board, opponent);
  const candidates: PurchaseCandidate[] = [];

  for (const offer of state.offers) {
    if (offer.bought) continue;
    for (let slot = 0; slot < state.board.length; slot += 1) {
      const soldItem = state.board[slot];
      if (!soldItem) continue;
      const sold = sellSlot(state, slot);
      const bought = buyOffer(sold.state, offer.uid);
      if (bought.error) continue;
      const afterBattle = simulateCached(bought.state.board, opponent);
      candidates.push({
        offerUid: offer.uid,
        itemId: offer.itemId,
        nextState: bought.state,
        cost: ITEM_BY_ID[offer.itemId].cost,
        saleGold: getSellValue(soldItem),
        merges: bought.merges?.length ?? 0,
        soldSlot: slot,
        powerGain: getPowerValue(bought.state.board) - currentPower,
        combatGain: combatUtility(afterBattle) - combatUtility(beforeBattle),
      });
    }
  }

  return candidates;
}

function candidateScore(
  candidate: PurchaseCandidate,
  strategy: StrategyDefinition,
  state: GameState,
): number {
  const owned = state.board.some(
    (entry) => entry?.itemId === candidate.itemId,
  );
  const definition = ITEM_BY_ID[candidate.itemId];
  if (strategy.mode === "lookahead") {
    return candidate.combatGain * 1_000 + candidate.merges * 2;
  }
  if (strategy.mode === "merge") {
    return (
      candidate.merges * 1_000 +
      (owned ? 100 : 0) +
      candidate.powerGain / candidate.cost
    );
  }
  if (strategy.mode === "family") {
    return (
      (definition.family === strategy.family ? 1_000 : 0) +
      candidate.merges * 100 +
      (owned ? 10 : 0) +
      candidate.powerGain / candidate.cost
    );
  }
  return candidate.powerGain / candidate.cost + candidate.merges / 100;
}

function choosePurchase(
  state: GameState,
  opponent: OpponentDefinition,
  strategy: StrategyDefinition,
): PurchaseCandidate | null {
  const candidates = directCandidates(state, opponent);
  if (strategy.mayReplace) {
    candidates.push(...replacementCandidates(state, opponent));
  }
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: candidateScore(candidate, strategy, state),
    }))
    .filter(
      (entry) =>
        strategy.mode !== "lookahead" ||
        entry.candidate.combatGain > 0.001,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.merges - a.candidate.merges ||
        a.candidate.cost - b.candidate.cost ||
        a.candidate.itemId.localeCompare(b.candidate.itemId) ||
        (a.candidate.soldSlot ?? -1) - (b.candidate.soldSlot ?? -1),
    );
  return ranked[0]?.candidate ?? null;
}

function inspectOffers(
  state: GameState,
  opponent: OpponentDefinition,
  round: RoundAccumulator,
  itemAccumulators: Record<string, ItemAccumulator>,
  seenOfferUids: Set<string>,
  signals: ShopSessionSignals,
  lateBlockedItems: Map<string, number>,
): void {
  const beforeBattle = simulateCached(state.board, opponent);
  const boardFull = state.board.every(Boolean);

  for (const offer of state.offers) {
    if (offer.bought || seenOfferUids.has(offer.uid)) continue;
    seenOfferUids.add(offer.uid);
    const definition = ITEM_BY_ID[offer.itemId];
    const item = itemAccumulators[offer.itemId];
    round.offersSeen += 1;
    item.offered += 1;

    if (definition.cost > state.gold) continue;
    round.affordableOffers += 1;
    item.affordable += 1;
    const direct = buyOffer(state, offer.uid);
    if (!direct.error) {
      signals.sawDirectPurchase = true;
      round.directPurchasableOffers += 1;
      item.directPurchasable += 1;
      if ((direct.merges?.length ?? 0) > 0) {
        round.directMergeOffers += 1;
        item.directMergeOffer += 1;
      }
      const afterBattle = simulateCached(direct.state.board, opponent);
      if (isImmediateImprovement(beforeBattle, afterBattle)) {
        signals.sawImmediateImprovement = true;
        round.immediateImprovementOffers += 1;
        item.immediateImprovementOffer += 1;
      }
      continue;
    }

    if (!boardFull) continue;
    round.blockedFullOffers += 1;
    item.blockedFull += 1;
    const owned = state.board.filter(
      (entry): entry is ItemInstance =>
        Boolean(entry && entry.itemId === offer.itemId),
    );
    if (owned.length > 0) {
      round.blockedOwnedOffers += 1;
      item.blockedOwned += 1;
    }
    if (owned.some((entry) => entry.level === 2)) {
      round.blockedLevelTwoOffers += 1;
      item.blockedLevelTwo += 1;
    }
    if (state.round >= 6) {
      lateBlockedItems.set(
        offer.itemId,
        (lateBlockedItems.get(offer.itemId) ?? 0) + 1,
      );
    }

    let replacementImproves = false;
    for (let slot = 0; slot < state.board.length; slot += 1) {
      if (!state.board[slot]) continue;
      const sold = sellSlot(state, slot);
      const bought = buyOffer(sold.state, offer.uid);
      if (bought.error) continue;
      const replacementBattle = simulateCached(
        bought.state.board,
        opponent,
      );
      if (isImmediateImprovement(beforeBattle, replacementBattle)) {
        replacementImproves = true;
        break;
      }
    }
    if (replacementImproves) {
      signals.sawReplacementImprovement = true;
      round.replacementImprovementOffers += 1;
      item.replacementImprovementOffer += 1;
    }
  }
}

function runShop(
  input: GameState,
  strategy: StrategyDefinition,
  round: RoundAccumulator,
  itemAccumulators: Record<string, ItemAccumulator>,
  lateBlockedItems: Map<string, number>,
): GameState {
  let state = input;
  const opponent = getCurrentOpponent(state);
  const seenOfferUids = new Set<string>();
  const signals: ShopSessionSignals = {
    sawDirectPurchase: false,
    sawImmediateImprovement: false,
    sawReplacementImprovement: false,
  };
  let freeRerollUsed = false;

  round.shops += 1;
  if (state.board.every(Boolean)) round.boardFullAtStart += 1;

  while (true) {
    inspectOffers(
      state,
      opponent,
      round,
      itemAccumulators,
      seenOfferUids,
      signals,
      lateBlockedItems,
    );
    const candidate = choosePurchase(state, opponent, strategy);
    if (candidate) {
      state = candidate.nextState;
      round.purchases += 1;
      round.purchaseGold += candidate.cost;
      round.saleGold += candidate.saleGold;
      round.merges += candidate.merges;
      if (candidate.soldSlot !== null) {
        round.replacementPurchases += 1;
      }
      const item = itemAccumulators[candidate.itemId];
      item.purchased += 1;
      item.purchaseMerges += candidate.merges;
      continue;
    }

    if (!freeRerollUsed && state.rerollsUsed === 0) {
      const rerolled = rerollShop(state);
      freeRerollUsed = true;
      if (!rerolled.error) {
        state = rerolled.state;
        continue;
      }
    }
    break;
  }

  if (!signals.sawDirectPurchase) round.shopsWithoutDirectPurchase += 1;
  if (!signals.sawImmediateImprovement) {
    round.shopsWithoutImmediateImprovement += 1;
  }
  if (signals.sawReplacementImprovement) {
    round.shopsWithReplacementImprovement += 1;
  }
  return state;
}

function recordOutcome(
  result: CombatResult,
  target: {
    battles: number;
    wins: number;
    losses: number;
    draws: number;
    timeouts: number;
    durations: number[];
  },
): void {
  target.battles += 1;
  if (result.winner === "player") target.wins += 1;
  else if (result.winner === "enemy") target.losses += 1;
  else target.draws += 1;
  if (result.reason === "timeout") target.timeouts += 1;
  target.durations.push(result.duration);
}

function recordScenario(
  result: CombatResult,
  target: ScenarioAccumulator,
): void {
  recordOutcome(result, target);
  target.playback1x.push(estimatedPlaybackMs(result, 1));
  target.playback2x.push(estimatedPlaybackMs(result, 2));
  target.playback4x.push(estimatedPlaybackMs(result, 4));
}

function classifyBuild(board: Board): Family | "hybrid" | "empty" {
  const weights = getFamilyWeights(board);
  const values = Object.entries(weights) as Array<[Family, number]>;
  const maximum = Math.max(...values.map(([, value]) => value));
  if (maximum <= 0) return "empty";
  const leaders = values.filter(([, value]) => value === maximum);
  return leaders.length === 1 ? leaders[0][0] : "hybrid";
}

function recordBuild(
  board: Board,
  result: CombatResult,
  builds: Record<string, BuildAccumulator>,
): void {
  recordOutcome(result, builds[classifyBuild(board)]);
}

function recordItems(
  board: Board,
  result: CombatResult,
  items: Record<string, ItemAccumulator>,
): void {
  const representedByItem = new Map<string, number>();
  for (const entry of board) {
    if (!entry) continue;
    representedByItem.set(
      entry.itemId,
      (representedByItem.get(entry.itemId) ?? 0) +
        representedCopies(entry),
    );
  }

  for (const [itemId, copies] of representedByItem) {
    const item = items[itemId];
    item.battleAppearances += 1;
    item.representedCopies += copies;
    if (result.winner === "player") item.winningAppearances += 1;
    else if (result.winner === "enemy") item.losingAppearances += 1;
    else item.drawAppearances += 1;
  }

  for (const stat of result.playerStats) {
    const item = items[stat.itemId];
    item.triggers += stat.triggers;
    item.hpDamage += stat.hpDamage;
    item.shieldDamage += stat.shieldDamage;
    item.totalDamage += stat.totalDamage;
    item.healing += stat.healing;
    item.shield += stat.shield;
    item.poisonApplied += stat.poisonApplied;
  }
}

function hasPositionalEffect(board: Board): boolean {
  return board.some((entry) => {
    if (!entry) return false;
    const passive = ITEM_BY_ID[entry.itemId].passive;
    return (
      passive?.type === "hasteAdjacent" ||
      passive?.type === "powerAdjacent"
    );
  });
}

function addPositionResult(
  slice: PositionSlice,
  arrangementCount: number,
  outcomes: Set<BattleOutcome>,
  marginRange: number,
): void {
  slice.matchups += 1;
  slice.arrangements += arrangementCount;
  slice.totalMarginRange += marginRange;
  if (outcomes.size > 1) slice.anyOutcomeChange += 1;
  if (outcomes.has("player") && outcomes.has("enemy")) {
    slice.directWinnerFlip += 1;
  }
  if (marginRange >= MEANINGFUL_MARGIN_SHIFT) {
    slice.meaningfulMarginShift += 1;
  }
}

function recordPosition(
  board: Board,
  opponent: OpponentDefinition,
  positions: PositionAccumulator,
  seen: Set<string>,
): void {
  const key = `${boardSignature(board)}:${opponentSignature(opponent)}`;
  if (seen.has(key)) return;
  seen.add(key);
  const arrangements = uniqueArrangements(board);
  const outcomes = new Set<BattleOutcome>();
  const margins: number[] = [];
  for (const arrangement of arrangements) {
    const result = simulateCached(arrangement, opponent);
    outcomes.add(result.winner);
    margins.push(battleMargin(result));
  }
  const marginRange =
    margins.length > 0 ? Math.max(...margins) - Math.min(...margins) : 0;
  addPositionResult(
    positions.all,
    arrangements.length,
    outcomes,
    marginRange,
  );
  if (hasPositionalEffect(board)) {
    addPositionResult(
      positions.relevant,
      arrangements.length,
      outcomes,
      marginRange,
    );
  }
}

function mergeRound(
  target: RoundAccumulator,
  source: RoundAccumulator,
): void {
  for (const key of [
    "battles",
    "wins",
    "losses",
    "draws",
    "timeouts",
    "startGold",
    "endGold",
    "purchaseGold",
    "saleGold",
    "purchases",
    "replacementPurchases",
    "merges",
    "shops",
    "boardFullAtStart",
    "offersSeen",
    "affordableOffers",
    "directPurchasableOffers",
    "directMergeOffers",
    "immediateImprovementOffers",
    "blockedFullOffers",
    "blockedOwnedOffers",
    "blockedLevelTwoOffers",
    "replacementImprovementOffers",
    "shopsWithoutDirectPurchase",
    "shopsWithoutImmediateImprovement",
    "shopsWithReplacementImprovement",
  ] as const) {
    target[key] += source[key];
  }
  target.durations.push(...source.durations);
  target.playback1x.push(...source.playback1x);
}

function summarizeRound(round: RoundAccumulator, index: number) {
  return {
    round: index + 1,
    battles: round.battles,
    winPercent: percent(ratio(round.wins, round.battles)),
    lossPercent: percent(ratio(round.losses, round.battles)),
    drawPercent: percent(ratio(round.draws, round.battles)),
    timeoutPercent: percent(ratio(round.timeouts, round.battles)),
    averageSimulationSeconds: average(round.durations) / 1_000,
    medianSimulationSeconds: quantile(round.durations, 0.5) / 1_000,
    averagePlayback1xSeconds: average(round.playback1x) / 1_000,
    averageStartGold: ratio(round.startGold, round.shops),
    averagePurchaseGold: ratio(round.purchaseGold, round.shops),
    averageSaleGold: ratio(round.saleGold, round.shops),
    averageEndGold: ratio(round.endGold, round.shops),
    averagePurchases: ratio(round.purchases, round.shops),
    averageMerges: ratio(round.merges, round.shops),
    boardFullAtStartPercent: percent(
      ratio(round.boardFullAtStart, round.shops),
    ),
    blockedFullOffersPerShop: ratio(round.blockedFullOffers, round.shops),
    blockedLevelTwoOffersPerShop: ratio(
      round.blockedLevelTwoOffers,
      round.shops,
    ),
    shopsWithoutDirectPurchasePercent: percent(
      ratio(round.shopsWithoutDirectPurchase, round.shops),
    ),
    shopsWithoutImmediateImprovementPercent: percent(
      ratio(round.shopsWithoutImmediateImprovement, round.shops),
    ),
    shopsWithReplacementImprovementPercent: percent(
      ratio(round.shopsWithReplacementImprovement, round.shops),
    ),
  };
}

function summarizeScenario(
  limitMs: number,
  scenario: ScenarioAccumulator,
) {
  const timeoutInterval = wilson(scenario.timeouts, scenario.battles);
  return {
    combatLimitMs: limitMs,
    battles: scenario.battles,
    winPercent: percent(ratio(scenario.wins, scenario.battles)),
    lossPercent: percent(ratio(scenario.losses, scenario.battles)),
    drawPercent: percent(ratio(scenario.draws, scenario.battles)),
    timeoutPercent: percent(ratio(scenario.timeouts, scenario.battles)),
    timeout95PercentInterval: timeoutInterval,
    simulationSeconds: {
      average: average(scenario.durations) / 1_000,
      median: quantile(scenario.durations, 0.5) / 1_000,
      p90: quantile(scenario.durations, 0.9) / 1_000,
    },
    playback1xSeconds: {
      average: average(scenario.playback1x) / 1_000,
      median: quantile(scenario.playback1x, 0.5) / 1_000,
      p90: quantile(scenario.playback1x, 0.9) / 1_000,
    },
    playback2xSeconds: {
      average: average(scenario.playback2x) / 1_000,
      median: quantile(scenario.playback2x, 0.5) / 1_000,
      p90: quantile(scenario.playback2x, 0.9) / 1_000,
    },
    playback4xSeconds: {
      average: average(scenario.playback4x) / 1_000,
      median: quantile(scenario.playback4x, 0.5) / 1_000,
      p90: quantile(scenario.playback4x, 0.9) / 1_000,
    },
  };
}

function summarizePosition(slice: PositionSlice) {
  return {
    sampledMatchups: slice.matchups,
    allUniqueArrangements: slice.arrangements,
    anyOutcomeChangePercent: percent(
      ratio(slice.anyOutcomeChange, slice.matchups),
    ),
    directWinnerFlipPercent: percent(
      ratio(slice.directWinnerFlip, slice.matchups),
    ),
    meaningfulMarginShiftPercent: percent(
      ratio(slice.meaningfulMarginShift, slice.matchups),
    ),
    averageMarginRangePercent:
      ratio(slice.totalMarginRange, slice.matchups) * 100,
  };
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)} %`;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)} s`;
}

async function main(): Promise<void> {
  const seedCount = seedCountFromArgs();
  const itemAccumulators = Object.fromEntries(
    ITEMS.map((item) => [item.id, emptyItem()]),
  ) as Record<string, ItemAccumulator>;
  const positions: PositionAccumulator = {
    all: emptyPositionSlice(),
    relevant: emptyPositionSlice(),
  };
  const positionSeen = new Set<string>();
  const builds: Record<string, BuildAccumulator> = {
    fire: emptyBuild(),
    poison: emptyBuild(),
    guard: emptyBuild(),
    hybrid: emptyBuild(),
    empty: emptyBuild(),
  };
  const scenarios = Object.fromEntries(
    COMBAT_LIMITS.map((limit) => [limit, emptyScenario()]),
  ) as Record<number, ScenarioAccumulator>;
  const scenarioRounds = Object.fromEntries(
    COMBAT_LIMITS.map((limit) => [
      limit,
      Array.from({ length: ROUND_COUNT }, emptyScenario),
    ]),
  ) as Record<number, ScenarioAccumulator[]>;
  const strategyAccumulators: StrategyAccumulator[] = STRATEGIES.map(
    (definition) => ({
      definition,
      rounds: Array.from({ length: ROUND_COUNT }, emptyRound),
      powerSamples: [],
      lateCampaigns: 0,
      lateCampaignsWithRepeatedBlockedItem: 0,
      lateRepeatedBlockedPairs: 0,
    }),
  );

  for (const strategy of strategyAccumulators) {
    for (let seedOffset = 0; seedOffset < seedCount; seedOffset += 1) {
      const runSeed =
        (BASE_SEED + Math.imul(seedOffset, SEED_STRIDE)) >>> 0;
      let state = {
        ...createInitialState(runSeed),
        seals: 99,
      };
      const lateBlockedItems = new Map<string, number>();

      for (let roundIndex = 0; roundIndex < ROUND_COUNT; roundIndex += 1) {
        const round = strategy.rounds[roundIndex];
        round.startGold += state.gold;
        state = runShop(
          { ...state, phase: "shop", seals: 99 },
          strategy.definition,
          round,
          itemAccumulators,
          lateBlockedItems,
        );
        round.endGold += state.gold;
        const opponent = getCurrentOpponent(state);
        const currentResult = simulateCached(state.board, opponent);
        recordOutcome(currentResult, round);
        const playback1x = estimatedPlaybackMs(currentResult, 1);
        round.playback1x.push(playback1x);
        recordItems(state.board, currentResult, itemAccumulators);
        recordBuild(state.board, currentResult, builds);
        recordPosition(
          state.board,
          opponent,
          positions,
          positionSeen,
        );

        const playerRatio =
          currentResult.finalPlayerHp / currentResult.playerMaxHp;
        const enemyRatio =
          currentResult.finalEnemyHp / currentResult.enemyMaxHp;
        strategy.powerSamples.push({
          predictedMargin:
            getPowerValue(state.board) -
            getPowerValue(opponent.board),
          actualMargin: playerRatio - enemyRatio,
          outcome: currentResult.winner,
        });

        for (const limit of COMBAT_LIMITS) {
          const result =
            limit === DEFAULT_COMBAT_LIMIT_MS
              ? currentResult
              : simulateCached(state.board, opponent, limit);
          recordScenario(result, scenarios[limit]);
          recordScenario(result, scenarioRounds[limit][roundIndex]);
        }

        if (roundIndex < ROUND_COUNT - 1) {
          state = {
            ...advanceAfterBattle(state, currentResult.winner),
            seals: 99,
          };
        }
      }

      strategy.lateCampaigns += 1;
      const repeatedCounts = [...lateBlockedItems.values()].filter(
        (count) => count >= 2,
      );
      if (repeatedCounts.length > 0) {
        strategy.lateCampaignsWithRepeatedBlockedItem += 1;
      }
      strategy.lateRepeatedBlockedPairs += repeatedCounts.reduce(
        (total, count) => total + Math.floor(count / 2),
        0,
      );
    }
  }

  const aggregateRounds = Array.from(
    { length: ROUND_COUNT },
    emptyRound,
  );
  for (const strategy of strategyAccumulators) {
    strategy.rounds.forEach((round, index) => {
      mergeRound(aggregateRounds[index], round);
    });
  }

  const strategyResults = strategyAccumulators.map((strategy) => {
    const total = emptyRound();
    for (const round of strategy.rounds) mergeRound(total, round);
    const errors = powerError(strategy.powerSamples);
    return {
      id: strategy.definition.id,
      label: strategy.definition.label,
      description: strategy.definition.description,
      mayReplace: strategy.definition.mayReplace,
      battles: total.battles,
      winPercent: percent(ratio(total.wins, total.battles)),
      lossPercent: percent(ratio(total.losses, total.battles)),
      drawPercent: percent(ratio(total.draws, total.battles)),
      timeoutPercent: percent(ratio(total.timeouts, total.battles)),
      averageSimulationSeconds: average(total.durations) / 1_000,
      averagePlayback1xSeconds: average(total.playback1x) / 1_000,
      averagePurchasesPerShop: ratio(total.purchases, total.shops),
      averagePurchaseGoldPerShop: ratio(
        total.purchaseGold,
        total.shops,
      ),
      averageReplacementPurchasesPerShop: ratio(
        total.replacementPurchases,
        total.shops,
      ),
      roundEightAverageRemainingGold: ratio(
        strategy.rounds[7].endGold,
        strategy.rounds[7].shops,
      ),
      powerEstimate: {
        pearsonCorrelation: pearson(strategy.powerSamples),
        decisiveSamples: errors.decisiveSamples,
        predictionErrorPercent: errors.errorPercent,
      },
      lateParkingSignal: {
        campaigns: strategy.lateCampaigns,
        campaignsWithRepeatedBlockedItem:
          strategy.lateCampaignsWithRepeatedBlockedItem,
        campaignsWithRepeatedBlockedItemPercent: percent(
          ratio(
            strategy.lateCampaignsWithRepeatedBlockedItem,
            strategy.lateCampaigns,
          ),
        ),
        repeatedBlockedPairs: strategy.lateRepeatedBlockedPairs,
      },
      rounds: strategy.rounds.map(summarizeRound),
    };
  });

  const aggregateRoundResults = aggregateRounds.map((round, index) => {
    const summary = summarizeRound(round, index);
    const winRates = strategyAccumulators.map((strategy) =>
      percent(
        ratio(
          strategy.rounds[index].wins,
          strategy.rounds[index].battles,
        ),
      ),
    );
    return {
      ...summary,
      strategyWinPercentRange: {
        min: Math.min(...winRates),
        max: Math.max(...winRates),
      },
      timeoutAt35SecondsPercent: percent(
        ratio(
          scenarioRounds[35_000][index].timeouts,
          scenarioRounds[35_000][index].battles,
        ),
      ),
      timeoutAt45SecondsPercent: percent(
        ratio(
          scenarioRounds[45_000][index].timeouts,
          scenarioRounds[45_000][index].battles,
        ),
      ),
    };
  });

  const totalWinningBattles = aggregateRounds.reduce(
    (total, round) => total + round.wins,
    0,
  );
  const itemDiagnostics = ITEMS.map((definition) => {
    const item = itemAccumulators[definition.id];
    return {
      itemId: definition.id,
      name: definition.name,
      family: definition.family,
      offered: item.offered,
      affordable: item.affordable,
      directPurchasable: item.directPurchasable,
      conditionalPurchasePercent: percent(
        ratio(item.purchased, item.directPurchasable),
      ),
      immediateImprovementOfferPercent: percent(
        ratio(item.immediateImprovementOffer, item.directPurchasable),
      ),
      mergeOfferPercent: percent(
        ratio(item.directMergeOffer, item.directPurchasable),
      ),
      blockedFull: item.blockedFull,
      blockedOwned: item.blockedOwned,
      blockedLevelTwo: item.blockedLevelTwo,
      replacementImprovementOffer: item.replacementImprovementOffer,
      purchased: item.purchased,
      purchaseMerges: item.purchaseMerges,
      battleAppearances: item.battleAppearances,
      winningBuildPresencePercent: percent(
        ratio(item.winningAppearances, totalWinningBattles),
      ),
      winPercentWhenPresent: percent(
        ratio(item.winningAppearances, item.battleAppearances),
      ),
      averageRepresentedCopiesWhenPresent: ratio(
        item.representedCopies,
        item.battleAppearances,
      ),
      averageTriggers: ratio(item.triggers, item.battleAppearances),
      averageHpDamage: ratio(item.hpDamage, item.battleAppearances),
      averageShieldDamage: ratio(
        item.shieldDamage,
        item.battleAppearances,
      ),
      averageHealing: ratio(item.healing, item.battleAppearances),
      averageShield: ratio(item.shield, item.battleAppearances),
      averagePoisonApplied: ratio(
        item.poisonApplied,
        item.battleAppearances,
      ),
    };
  });

  const buildResults = Object.entries(builds)
    .filter(([, build]) => build.battles > 0)
    .map(([build, value]) => ({
      build,
      battles: value.battles,
      winPercent: percent(ratio(value.wins, value.battles)),
      lossPercent: percent(ratio(value.losses, value.battles)),
      drawPercent: percent(ratio(value.draws, value.battles)),
      timeoutPercent: percent(ratio(value.timeouts, value.battles)),
      averageSimulationSeconds: average(value.durations) / 1_000,
    }));

  const results = {
    schemaVersion: 2,
    reproducibility: {
      baseSeed: BASE_SEED,
      seedStride: SEED_STRIDE,
      seedFormula:
        "(baseSeed + Math.imul(index, seedStride)) >>> 0",
      seedCount,
      strategyCount: STRATEGIES.length,
      primaryBattles:
        seedCount * STRATEGIES.length * ROUND_COUNT,
      durationScenarioBattles:
        seedCount *
        STRATEGIES.length *
        ROUND_COUNT *
        COMBAT_LIMITS.length,
      command: `npm run balance:analysis -- --seeds=${seedCount}`,
    },
    methodology: {
      strategies: STRATEGIES,
      paidRerolls: false,
      positionRelevantDefinition:
        "Spielerboard enthält mindestens einen hasteAdjacent- oder powerAdjacent-Effekt.",
      meaningfulPositionMargin:
        MEANINGFUL_MARGIN_SHIFT,
      immediateImprovementDefinition:
        "Besseres Ergebnis; oder bei gleichem Ergebnis mindestens 2 Prozentpunkte besserer relativer LP-Abstand; oder mindestens 1 Sekunde besserer KO-/Überlebenszeitpunkt.",
      durationScenarioNote:
        "35/45 Sekunden werden auf denselben Boards und Gegnern gegengerechnet. Die Kampagnenprogression bleibt für Vergleichbarkeit auf dem unveränderten 25-Sekunden-Ergebnis.",
      parkingSignalNote:
        "Zwei blockierte, bezahlbare Angebote derselben Zutat ab Runde 6 sind nur ein Indiz, dass ein Parkslot späteres Mergen ermöglichen könnte; es ist noch kein simulierter Rucksack.",
    },
    strategies: strategyResults,
    aggregateRounds: aggregateRoundResults,
    durationScenarios: COMBAT_LIMITS.map((limit) =>
      summarizeScenario(limit, scenarios[limit]),
    ),
    positionInfluence: {
      allBoards: summarizePosition(positions.all),
      relevantBoards: summarizePosition(positions.relevant),
    },
    itemDiagnostics,
    buildFamilies: buildResults,
    parkingSignals: {
      byStrategy: strategyResults.map((strategy) => ({
        strategyId: strategy.id,
        strategy: strategy.label,
        ...strategy.lateParkingSignal,
      })),
      lateRoundBlockedFullOffers: aggregateRounds
        .slice(5)
        .reduce(
          (total, round) => total + round.blockedFullOffers,
          0,
        ),
      lateRoundBlockedLevelTwoOffers: aggregateRounds
        .slice(5)
        .reduce(
          (total, round) => total + round.blockedLevelTwoOffers,
          0,
        ),
    },
  };

  const strategyTable = strategyResults.map(
    (strategy) =>
      `| ${strategy.label} | ${formatPercent(strategy.winPercent)} | ${formatPercent(strategy.timeoutPercent)} | ${formatSeconds(strategy.averageSimulationSeconds)} | ${formatSeconds(strategy.averagePlayback1xSeconds)} | ${strategy.averagePurchasesPerShop.toFixed(2)} | ${strategy.roundEightAverageRemainingGold.toFixed(2)} | ${strategy.averageReplacementPurchasesPerShop.toFixed(2)} |`,
  );
  const scenarioTable = results.durationScenarios.map(
    (scenario) =>
      `| ${(scenario.combatLimitMs / 1_000).toFixed(0)} s | ${formatPercent(scenario.winPercent)} | ${formatPercent(scenario.lossPercent)} | ${formatPercent(scenario.drawPercent)} | ${formatPercent(scenario.timeoutPercent)} (${scenario.timeout95PercentInterval.lowPercent.toFixed(2)}–${scenario.timeout95PercentInterval.highPercent.toFixed(2)} %) | ${formatSeconds(scenario.simulationSeconds.median)} / ${formatSeconds(scenario.simulationSeconds.p90)} | ${formatSeconds(scenario.playback1xSeconds.median)} / ${formatSeconds(scenario.playback1xSeconds.p90)} | ${formatSeconds(scenario.playback2xSeconds.median)} |`,
  );
  const difficultyTable = aggregateRoundResults.map(
    (round) =>
      `| ${round.round} | ${formatPercent(round.winPercent)} | ${formatPercent(round.lossPercent)} | ${formatPercent(round.drawPercent)} | ${formatPercent(round.timeoutPercent)} | ${formatPercent(round.timeoutAt35SecondsPercent)} | ${formatPercent(round.timeoutAt45SecondsPercent)} | ${round.strategyWinPercentRange.min.toFixed(2)}–${round.strategyWinPercentRange.max.toFixed(2)} % |`,
  );
  const economyTable = aggregateRoundResults.map(
    (round) =>
      `| ${round.round} | ${formatPercent(round.boardFullAtStartPercent)} | ${round.averagePurchases.toFixed(2)} | ${round.averagePurchaseGold.toFixed(2)} | ${round.averageEndGold.toFixed(2)} | ${round.blockedFullOffersPerShop.toFixed(2)} | ${formatPercent(round.shopsWithoutDirectPurchasePercent)} | ${formatPercent(round.shopsWithReplacementImprovementPercent)} |`,
  );
  const attractionTable = itemDiagnostics.map(
    (item) =>
      `| ${item.name} | ${item.offered} | ${formatPercent(item.conditionalPurchasePercent)} | ${formatPercent(item.immediateImprovementOfferPercent)} | ${item.blockedFull} | ${item.blockedLevelTwo} | ${formatPercent(item.winPercentWhenPresent)} |`,
  );
  const contributionTable = itemDiagnostics.map(
    (item) =>
      `| ${item.name} | ${item.battleAppearances} | ${item.averageTriggers.toFixed(2)} | ${item.averageHpDamage.toFixed(2)} | ${item.averageShieldDamage.toFixed(2)} | ${item.averageHealing.toFixed(2)} | ${item.averageShield.toFixed(2)} | ${item.averagePoisonApplied.toFixed(2)} |`,
  );
  const parkingTable = results.parkingSignals.byStrategy.map(
    (entry) =>
      `| ${entry.strategy} | ${formatPercent(entry.campaignsWithRepeatedBlockedItemPercent)} | ${entry.repeatedBlockedPairs} |`,
  );
  const powerTable = strategyResults.map(
    (strategy) =>
      `| ${strategy.label} | ${strategy.powerEstimate.pearsonCorrelation.toFixed(3)} | ${formatPercent(strategy.powerEstimate.predictionErrorPercent)} |`,
  );
  const buildTable = buildResults.map(
    (build) =>
      `| ${build.build} | ${build.battles} | ${formatPercent(build.winPercent)} | ${formatPercent(build.timeoutPercent)} | ${formatSeconds(build.averageSimulationSeconds)} |`,
  );

  const markdown = [
    "# Kessel-Krawall – Balance-Diagnose",
    "",
    `Feste Seedfolge mit ${seedCount} Kampagnen pro Strategie, ${STRATEGIES.length} Strategien und ${results.reproducibility.primaryBattles} primären Kämpfen. Zusätzlich wurden ${results.reproducibility.durationScenarioBattles} Kampfzeit-Szenarien gerechnet.`,
    "",
    "## Methodik",
    "",
    ...STRATEGIES.map(
      (strategy) => `- **${strategy.label}:** ${strategy.description}`,
    ),
    "",
    "Alle Strategien verwenden genau den kostenlosen Reroll und keine bezahlten Rerolls. Nur die Matchup-Suche darf die bereits vorhandene Verkaufsfunktion nutzen.",
    "",
    "## Strategievergleich",
    "",
    "| Strategie | Sieg | Timeout | Ø Simulation | Ø sichtbare 1×-Dauer | Käufe/Shop | Gold vor R8 übrig | Ersetzungen/Shop |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...strategyTable,
    "",
    "## Kampfzeit-Gegenprobe",
    "",
    "Die 35/45-Sekunden-Werte verändern das Live-Spiel nicht. Sie simulieren dieselben Boards isoliert mit einer längeren Kampfgrenze.",
    "",
    "| Grenze | Sieg | Niederlage | Remis | Timeout (95-%-Intervall) | Simulation Median/P90 | 1× Median/P90 | 2× Median |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...scenarioTable,
    "",
    "## Rundenschwierigkeit",
    "",
    "| Runde | Sieg | Niederlage | Remis | Timeout 25 s | Timeout 35 s | Timeout 45 s | Siegspanne Strategien |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...difficultyTable,
    "",
    "## Economy und volle Boards",
    "",
    "| Runde | Board schon voll | Käufe | Kaufgold | Restgold | blockierte Angebote/Shop | kein direkter Kauf | Ersatz hätte verbessert |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...economyTable,
    "",
    "## Positionseinfluss",
    "",
    `Als positionsrelevant gelten nur Boards mit Nachbar-Tempo oder Nachbar-Kraft. Eine deutliche LP-Verschiebung bedeutet mindestens ${(MEANINGFUL_MARGIN_SHIFT * 100).toFixed(0)} Prozentpunkte Unterschied zwischen bester und schlechtester Anordnung.`,
    "",
    "| Stichprobe | Matchups | Anordnungen | Ergebnis ändert sich | direkter Siegerwechsel | deutliche LP-Verschiebung | Ø LP-Spanne |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| alle Boards | ${results.positionInfluence.allBoards.sampledMatchups} | ${results.positionInfluence.allBoards.allUniqueArrangements} | ${formatPercent(results.positionInfluence.allBoards.anyOutcomeChangePercent)} | ${formatPercent(results.positionInfluence.allBoards.directWinnerFlipPercent)} | ${formatPercent(results.positionInfluence.allBoards.meaningfulMarginShiftPercent)} | ${formatPercent(results.positionInfluence.allBoards.averageMarginRangePercent)} |`,
    `| nur positionsrelevante Boards | ${results.positionInfluence.relevantBoards.sampledMatchups} | ${results.positionInfluence.relevantBoards.allUniqueArrangements} | ${formatPercent(results.positionInfluence.relevantBoards.anyOutcomeChangePercent)} | ${formatPercent(results.positionInfluence.relevantBoards.directWinnerFlipPercent)} | ${formatPercent(results.positionInfluence.relevantBoards.meaningfulMarginShiftPercent)} | ${formatPercent(results.positionInfluence.relevantBoards.averageMarginRangePercent)} |`,
    "",
    "## Angebots- und Kaufdiagnose",
    "",
    "Kaufquote wird nur gegen direkt kaufbare Angebote gerechnet. „Verbessert“ bedeutet eine unmittelbar messbare Verbesserung gegen den angekündigten Gegner.",
    "",
    "| Zutat | angeboten | Kaufquote | sofort verbessert | voll blockiert | davon vorhandenes L2 | Siegquote bei Präsenz |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...attractionTable,
    "",
    "## Tatsächliche Kampfbeiträge",
    "",
    "| Zutat | Kämpfe | Trigger | LP-Schaden | Schildschaden | Heilung | Schild | Gift |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...contributionTable,
    "",
    "## Buildfamilien",
    "",
    "| Schwerpunkt | Kämpfe | Sieg | Timeout | Ø Simulation |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...buildTable,
    "",
    "## Parkslot-Signal ab Runde 6",
    "",
    "Gezählt werden Kampagnen, in denen bei vollem Board mindestens zweimal dieselbe bezahlbare Zutat blockiert wurde. Das zeigt Mergepotenzial, simuliert aber noch keinen Rucksack.",
    "",
    "| Strategie | Kampagnen mit Wiederholung | blockierte Paare |",
    "| --- | ---: | ---: |",
    ...parkingTable,
    "",
    `Blockierte bezahlbare Angebote in Runde 6–8: **${results.parkingSignals.lateRoundBlockedFullOffers}**, davon passend zu einem vorhandenen Level-II-Item: **${results.parkingSignals.lateRoundBlockedLevelTwoOffers}**.`,
    "",
    "## Grobe Buildstärke",
    "",
    "| Strategie | Pearson-Korrelation | Fehlerrate entscheidender Kämpfe |",
    "| --- | ---: | ---: |",
    ...powerTable,
    "",
    "## Reproduktion",
    "",
    "```bash",
    results.reproducibility.command,
    "```",
    "",
  ].join("\n");

  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await writeFile(
    REPORT_JSON,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
  await writeFile(REPORT_MARKDOWN, markdown, "utf8");
  process.stdout.write(
    `Balanceanalyse abgeschlossen: ${results.reproducibility.primaryBattles} Hauptkämpfe, ${results.reproducibility.durationScenarioBattles} Zeitvarianten, ${positions.all.arrangements} Positionssimulationen.\n`,
  );
}

await main();
