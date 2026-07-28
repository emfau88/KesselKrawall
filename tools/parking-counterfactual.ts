import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEM_BY_ID } from "../app/game/data";
import { simulateBattle } from "../app/game/simulation";
import {
  advanceAfterBattle,
  createInitialState,
  getCurrentOpponent,
  getPowerValue,
  rerollShop,
} from "../app/game/state";
import type {
  Board,
  CombatResult,
  GameState,
  ItemInstance,
} from "../app/game/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = resolve(ROOT, "reports", "balance-results.json");
const REPORT_JSON = resolve(
  ROOT,
  "reports",
  "parking-counterfactual.json",
);
const REPORT_MARKDOWN = resolve(
  ROOT,
  "reports",
  "parking-counterfactual.md",
);
const BASE_SEED = 0x4b4b0000;
const SEED_STRIDE = 0x9e3779b9;
const RUNS_PER_VARIANT = 20;
const PARKING_UNLOCK_ROUND = 6;

interface ParkingPurchase {
  state: GameState;
  parking: Array<ItemInstance | null>;
  itemId: string;
  cost: number;
  merges: number;
  parkingTouched: boolean;
  parkingMerge: boolean;
  powerGain: number;
}

interface ShopMetrics {
  purchases: number;
  purchaseGold: number;
  merges: number;
  parkingPurchases: number;
  parkingMerges: number;
  blockedAffordableOffers: number;
}

interface RoundSnapshot extends ShopMetrics {
  result25: CombatResult;
  result35: CombatResult;
  endGold: number;
  occupiedParking: number;
  parkingCapacity: number;
}

interface RoundAccumulator extends ShopMetrics {
  shops: number;
  wins25: number;
  losses25: number;
  draws25: number;
  timeouts25: number;
  wins35: number;
  losses35: number;
  draws35: number;
  timeouts35: number;
  endGold: number;
  occupiedParking: number;
  parkingCapacity: number;
}

interface VariantAccumulator {
  capacity: 1 | 2;
  rounds: RoundAccumulator[];
}

interface PurchaseLocation {
  area: "board" | "parking";
  index: number;
}

function emptyShopMetrics(): ShopMetrics {
  return {
    purchases: 0,
    purchaseGold: 0,
    merges: 0,
    parkingPurchases: 0,
    parkingMerges: 0,
    blockedAffordableOffers: 0,
  };
}

function emptyRound(): RoundAccumulator {
  return {
    ...emptyShopMetrics(),
    shops: 0,
    wins25: 0,
    losses25: 0,
    draws25: 0,
    timeouts25: 0,
    wins35: 0,
    losses35: 0,
    draws35: 0,
    timeouts35: 0,
    endGold: 0,
    occupiedParking: 0,
    parkingCapacity: 0,
  };
}

function boardSignature(board: Board): string {
  return board
    .map((entry) => (entry ? `${entry.itemId}:${entry.level}` : "-"))
    .join("|");
}

function parkingSignature(
  parking: Array<ItemInstance | null>,
): string {
  return boardSignature(parking);
}

function itemAt(
  board: Board,
  parking: Array<ItemInstance | null>,
  location: PurchaseLocation,
): ItemInstance | null {
  return location.area === "board"
    ? board[location.index]
    : parking[location.index];
}

function setItem(
  board: Board,
  parking: Array<ItemInstance | null>,
  location: PurchaseLocation,
  item: ItemInstance | null,
): void {
  if (location.area === "board") board[location.index] = item;
  else parking[location.index] = item;
}

function locationsFor(
  board: Board,
  parking: Array<ItemInstance | null>,
  itemId: string,
  level: 1 | 2 | 3,
): PurchaseLocation[] {
  const result: PurchaseLocation[] = [];
  board.forEach((entry, index) => {
    if (entry?.itemId === itemId && entry.level === level) {
      result.push({ area: "board", index });
    }
  });
  parking.forEach((entry, index) => {
    if (entry?.itemId === itemId && entry.level === level) {
      result.push({ area: "parking", index });
    }
  });
  return result;
}

function chooseMergeSurvivor(
  upgraded: PurchaseLocation,
  other: PurchaseLocation,
): [PurchaseLocation, PurchaseLocation] {
  if (upgraded.area === "parking" && other.area === "board") {
    return [other, upgraded];
  }
  return [upgraded, other];
}

function applyParkingPurchase(
  state: GameState,
  parkingInput: Array<ItemInstance | null>,
  offerUid: string,
): ParkingPurchase | null {
  const offer = state.offers.find(
    (entry) => entry.uid === offerUid && !entry.bought,
  );
  if (!offer) return null;
  const definition = ITEM_BY_ID[offer.itemId];
  if (definition.cost > state.gold) return null;

  const board = state.board.map((entry) =>
    entry ? { ...entry } : null,
  );
  const parking = parkingInput.map((entry) =>
    entry ? { ...entry } : null,
  );
  const beforeParking = parkingSignature(parking);
  const existingLevelOne = locationsFor(
    board,
    parking,
    offer.itemId,
    1,
  )[0];
  let merges = 0;
  let upgradedLocation: PurchaseLocation | null = null;

  if (existingLevelOne) {
    const existing = itemAt(board, parking, existingLevelOne)!;
    setItem(board, parking, existingLevelOne, {
      ...existing,
      level: 2,
    });
    merges = 1;
    upgradedLocation = existingLevelOne;
  } else {
    const boardSlot = board.findIndex((entry) => entry === null);
    const parkingSlot = parking.findIndex((entry) => entry === null);
    const location =
      boardSlot >= 0
        ? { area: "board" as const, index: boardSlot }
        : parkingSlot >= 0
          ? { area: "parking" as const, index: parkingSlot }
          : null;
    if (!location) return null;
    setItem(board, parking, location, {
      uid: `parking-analysis-${state.idCounter}`,
      itemId: offer.itemId,
      level: 1,
    });
  }

  if (upgradedLocation) {
    const otherLevelTwo = locationsFor(
      board,
      parking,
      offer.itemId,
      2,
    ).find(
      (location) =>
        location.area !== upgradedLocation!.area ||
        location.index !== upgradedLocation!.index,
    );
    if (otherLevelTwo) {
      const [survivor, consumed] = chooseMergeSurvivor(
        upgradedLocation,
        otherLevelTwo,
      );
      const survivorItem = itemAt(board, parking, survivor)!;
      setItem(board, parking, survivor, {
        ...survivorItem,
        level: 3,
      });
      setItem(board, parking, consumed, null);
      merges += 1;
    }
  }

  const nextState: GameState = {
    ...state,
    board,
    gold: state.gold - definition.cost,
    idCounter: state.idCounter + 1,
    offers: state.offers.map((entry) =>
      entry.uid === offerUid ? { ...entry, bought: true } : entry,
    ),
  };
  const afterParking = parkingSignature(parking);
  return {
    state: nextState,
    parking,
    itemId: offer.itemId,
    cost: definition.cost,
    merges,
    parkingTouched: afterParking !== beforeParking,
    parkingMerge: merges > 0 && afterParking !== beforeParking,
    powerGain: getPowerValue(board) - getPowerValue(state.board),
  };
}

function choosePurchase(
  state: GameState,
  parking: Array<ItemInstance | null>,
): ParkingPurchase | null {
  const owned = new Set(
    [...state.board, ...parking]
      .filter((entry): entry is ItemInstance => Boolean(entry))
      .map((entry) => entry.itemId),
  );
  const candidates = state.offers
    .filter((offer) => !offer.bought)
    .map((offer) => {
      const result = applyParkingPurchase(
        state,
        parking,
        offer.uid,
      );
      if (!result) return null;
      const boardChanged =
        boardSignature(result.state.board) !==
        boardSignature(state.board);
      if (!boardChanged && !owned.has(result.itemId)) return null;
      const score =
        result.merges * 1_000 +
        (owned.has(result.itemId) ? 100 : 0) +
        result.powerGain / result.cost;
      return { result, score };
    })
    .filter((entry): entry is NonNullable<typeof entry> =>
      Boolean(entry),
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.result.merges - a.result.merges ||
        a.result.cost - b.result.cost ||
        a.result.itemId.localeCompare(b.result.itemId),
    );
  return candidates[0]?.result ?? null;
}

function inspectBlockedOffers(
  state: GameState,
  parking: Array<ItemInstance | null>,
  seen: Set<string>,
): number {
  let blocked = 0;
  for (const offer of state.offers) {
    if (
      offer.bought ||
      seen.has(offer.uid) ||
      ITEM_BY_ID[offer.itemId].cost > state.gold
    ) {
      continue;
    }
    seen.add(offer.uid);
    if (!applyParkingPurchase(state, parking, offer.uid)) {
      blocked += 1;
    }
  }
  return blocked;
}

function runShop(
  input: GameState,
  parkingInput: Array<ItemInstance | null>,
): {
  state: GameState;
  parking: Array<ItemInstance | null>;
  metrics: ShopMetrics;
} {
  let state = input;
  let parking = parkingInput;
  const metrics = emptyShopMetrics();
  const seenOffers = new Set<string>();
  let freeRerollUsed = false;

  while (true) {
    metrics.blockedAffordableOffers += inspectBlockedOffers(
      state,
      parking,
      seenOffers,
    );
    const purchase = choosePurchase(state, parking);
    if (purchase) {
      state = purchase.state;
      parking = purchase.parking;
      metrics.purchases += 1;
      metrics.purchaseGold += purchase.cost;
      metrics.merges += purchase.merges;
      if (purchase.parkingTouched) metrics.parkingPurchases += 1;
      if (purchase.parkingMerge) metrics.parkingMerges += 1;
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
  return { state, parking, metrics };
}

function processRound(
  stateInput: GameState,
  parkingInput: Array<ItemInstance | null>,
  parkingCapacity: number,
): {
  nextState: GameState;
  parking: Array<ItemInstance | null>;
  snapshot: RoundSnapshot;
} {
  const parking =
    stateInput.round >= PARKING_UNLOCK_ROUND
      ? Array.from(
          { length: parkingCapacity },
          (_, index) => parkingInput[index] ?? null,
        )
      : [];
  const shop = runShop(
    { ...stateInput, phase: "shop", seals: 99 },
    parking,
  );
  const opponent = getCurrentOpponent(shop.state);
  const result25 = simulateBattle(shop.state.board, opponent);
  const result35 = simulateBattle(shop.state.board, opponent, {
    combatLimitMs: 35_000,
  });
  const nextState =
    stateInput.round < 8
      ? {
          ...advanceAfterBattle(shop.state, result25.winner),
          seals: 99,
        }
      : shop.state;
  return {
    nextState,
    parking: shop.parking,
    snapshot: {
      ...shop.metrics,
      result25,
      result35,
      endGold: shop.state.gold,
      occupiedParking: shop.parking.filter(Boolean).length,
      parkingCapacity: shop.parking.length,
    },
  };
}

function recordOutcome(
  result: CombatResult,
  round: RoundAccumulator,
  suffix: "25" | "35",
): void {
  if (result.winner === "player") round[`wins${suffix}`] += 1;
  else if (result.winner === "enemy") {
    round[`losses${suffix}`] += 1;
  } else round[`draws${suffix}`] += 1;
  if (result.reason === "timeout") round[`timeouts${suffix}`] += 1;
}

function recordSnapshot(
  target: RoundAccumulator,
  snapshot: RoundSnapshot,
): void {
  target.shops += 1;
  for (const key of [
    "purchases",
    "purchaseGold",
    "merges",
    "parkingPurchases",
    "parkingMerges",
    "blockedAffordableOffers",
    "endGold",
    "occupiedParking",
    "parkingCapacity",
  ] as const) {
    target[key] += snapshot[key];
  }
  recordOutcome(snapshot.result25, target, "25");
  recordOutcome(snapshot.result35, target, "35");
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: state.board.map((entry) =>
      entry ? { ...entry } : null,
    ),
    offers: state.offers.map((offer) => ({ ...offer })),
  };
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function percent(value: number): number {
  return Math.round(value * 10_000) / 100;
}

function summarizeVariant(variant: VariantAccumulator) {
  const total = variant.rounds.reduce(
    (accumulator, round) => {
      for (const key of [
        "shops",
        "wins25",
        "losses25",
        "draws25",
        "timeouts25",
        "wins35",
        "losses35",
        "draws35",
        "timeouts35",
        "purchases",
        "purchaseGold",
        "merges",
        "parkingPurchases",
        "parkingMerges",
        "blockedAffordableOffers",
      ] as const) {
        accumulator[key] += round[key];
      }
      return accumulator;
    },
    {
      shops: 0,
      wins25: 0,
      losses25: 0,
      draws25: 0,
      timeouts25: 0,
      wins35: 0,
      losses35: 0,
      draws35: 0,
      timeouts35: 0,
      purchases: 0,
      purchaseGold: 0,
      merges: 0,
      parkingPurchases: 0,
      parkingMerges: 0,
      blockedAffordableOffers: 0,
    },
  );
  const battles = total.shops;
  return {
    parkingSlots: variant.capacity,
    campaigns: RUNS_PER_VARIANT,
    battles,
    win25Percent: percent(ratio(total.wins25, battles)),
    loss25Percent: percent(ratio(total.losses25, battles)),
    draw25Percent: percent(ratio(total.draws25, battles)),
    timeout25Percent: percent(ratio(total.timeouts25, battles)),
    win35Percent: percent(ratio(total.wins35, battles)),
    loss35Percent: percent(ratio(total.losses35, battles)),
    draw35Percent: percent(ratio(total.draws35, battles)),
    timeout35Percent: percent(ratio(total.timeouts35, battles)),
    averagePurchasesPerShop: ratio(total.purchases, total.shops),
    averagePurchaseGoldPerShop: ratio(
      total.purchaseGold,
      total.shops,
    ),
    averageMergesPerShop: ratio(total.merges, total.shops),
    parkingPurchases: total.parkingPurchases,
    parkingMerges: total.parkingMerges,
    blockedAffordableOffers: total.blockedAffordableOffers,
    roundEightAverageGold: ratio(
      variant.rounds[7].endGold,
      variant.rounds[7].shops,
    ),
    lateRounds: variant.rounds.slice(5).map((round, index) => ({
      round: index + 6,
      averagePurchases: ratio(round.purchases, round.shops),
      averagePurchaseGold: ratio(round.purchaseGold, round.shops),
      averageEndGold: ratio(round.endGold, round.shops),
      averageMerges: ratio(round.merges, round.shops),
      averageOccupiedParking: ratio(
        round.occupiedParking,
        round.shops,
      ),
      blockedAffordableOffersPerShop: ratio(
        round.blockedAffordableOffers,
        round.shops,
      ),
      timeout25Percent: percent(
        ratio(round.timeouts25, round.shops),
      ),
      timeout35Percent: percent(
        ratio(round.timeouts35, round.shops),
      ),
    })),
  };
}

async function main(): Promise<void> {
  const baseline = JSON.parse(
    await readFile(BASELINE_PATH, "utf8"),
  ) as {
    schemaVersion: number;
    strategies: Array<{
      id: string;
      label: string;
      winPercent: number;
      timeoutPercent: number;
      averagePurchasesPerShop: number;
      averagePurchaseGoldPerShop: number;
      roundEightAverageRemainingGold: number;
    }>;
  };
  if (baseline.schemaVersion !== 2) {
    throw new Error(
      "Bitte zuerst die aktuelle Mehrstrategien-Analyse ausführen.",
    );
  }
  const mergeBaseline = baseline.strategies.find(
    (strategy) => strategy.id === "merge-first",
  );
  if (!mergeBaseline) {
    throw new Error("Merge-Fokus fehlt im Baseline-Bericht.");
  }

  const variants: VariantAccumulator[] = [1, 2].map((capacity) => ({
    capacity: capacity as 1 | 2,
    rounds: Array.from({ length: 8 }, emptyRound),
  }));

  for (let seedOffset = 0; seedOffset < RUNS_PER_VARIANT; seedOffset += 1) {
    const runSeed =
      (BASE_SEED + Math.imul(seedOffset, SEED_STRIDE)) >>> 0;
    let sharedState = {
      ...createInitialState(runSeed),
      seals: 99,
    };

    for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
      const processed = processRound(sharedState, [], 0);
      sharedState = processed.nextState;
      for (const variant of variants) {
        recordSnapshot(
          variant.rounds[roundIndex],
          processed.snapshot,
        );
      }
    }

    for (const variant of variants) {
      let state = cloneState(sharedState);
      let parking: Array<ItemInstance | null> = Array.from(
        { length: variant.capacity },
        () => null,
      );
      for (let roundIndex = 5; roundIndex < 8; roundIndex += 1) {
        const processed = processRound(
          state,
          parking,
          variant.capacity,
        );
        state = processed.nextState;
        parking = processed.parking;
        recordSnapshot(
          variant.rounds[roundIndex],
          processed.snapshot,
        );
      }
    }
  }

  const summaries = variants.map(summarizeVariant);
  const results = {
    schemaVersion: 1,
    methodology: {
      runsPerVariant: RUNS_PER_VARIANT,
      pairedSeeds: true,
      currentBaselineReused: true,
      strategy:
        "Merge-Fokus; ein Parkkauf wird nur getätigt, wenn die Zutat bereits auf Board/Parkplatz existiert und damit Mergefortschritt erzeugt.",
      parkingUnlockRound: PARKING_UNLOCK_ROUND,
      parkingHasCombatEffects: false,
      activeBoardSlots: 5,
      durationScenarios: [25_000, 35_000],
      note:
        "Die Referenz stammt aus dem vorhandenen 64-Seed-Lauf. Sie wird nicht erneut simuliert.",
    },
    baseline: {
      source: "reports/balance-results.json",
      strategy: mergeBaseline,
    },
    variants: summaries,
  };

  const variantRows = summaries.map(
    (variant) =>
      `| ${variant.parkingSlots} | ${variant.win25Percent.toFixed(2)} % | ${variant.timeout25Percent.toFixed(2)} % | ${variant.timeout35Percent.toFixed(2)} % | ${variant.averagePurchasesPerShop.toFixed(2)} | ${variant.averagePurchaseGoldPerShop.toFixed(2)} | ${variant.averageMergesPerShop.toFixed(2)} | ${variant.roundEightAverageGold.toFixed(2)} | ${variant.blockedAffordableOffers} |`,
  );
  const lateRows = summaries.flatMap((variant) =>
    variant.lateRounds.map(
      (round) =>
        `| ${variant.parkingSlots} | ${round.round} | ${round.averagePurchases.toFixed(2)} | ${round.averagePurchaseGold.toFixed(2)} | ${round.averageEndGold.toFixed(2)} | ${round.averageMerges.toFixed(2)} | ${round.averageOccupiedParking.toFixed(2)} | ${round.blockedAffordableOffersPerShop.toFixed(2)} |`,
    ),
  );
  const markdown = [
    "# Parkslot-Gegenversuch",
    "",
    `Je ${RUNS_PER_VARIANT} gepaarte Kampagnen mit einem und zwei Parkslots. Der vorhandene 64-Seed-Merge-Fokus dient als Referenz und wurde nicht erneut gerechnet.`,
    "",
    "## Regeln des Analysemodells",
    "",
    `- Freischaltung ab Runde ${PARKING_UNLOCK_ROUND}`,
    "- weiterhin genau fünf aktive Boardplätze",
    "- geparkte Zutaten haben keinerlei Kampfeffekt",
    "- Merges funktionieren über Board und Parkplätze hinweg",
    "- ein Parkkauf erfolgt nur als Fortschritt für eine bereits vorhandene Zutat",
    "- keine Verkäufe, keine zweite Währung, keine bezahlten Rerolls",
    "",
    "## Vorhandene Referenz",
    "",
    `Merge-Fokus, 64 Kampagnen: ${mergeBaseline.winPercent.toFixed(2)} % Siege, ${mergeBaseline.timeoutPercent.toFixed(2)} % Timeouts, ${mergeBaseline.averagePurchasesPerShop.toFixed(2)} Käufe/Shop, ${mergeBaseline.averagePurchaseGoldPerShop.toFixed(2)} Kaufgold/Shop und ${mergeBaseline.roundEightAverageRemainingGold.toFixed(2)} Gold vor Runde 8 übrig.`,
    "",
    "## Ergebnis",
    "",
    "| Parkslots | Sieg 25 s | Timeout 25 s | Timeout 35 s | Käufe/Shop | Kaufgold/Shop | Merges/Shop | Gold vor R8 | blockierte Angebote |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...variantRows,
    "",
    "## Runde 6–8",
    "",
    "| Parkslots | Runde | Käufe | Kaufgold | Restgold | Merges | belegte Parkplätze | blockiert/Shop |",
    "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...lateRows,
    "",
    "Die zwei Varianten verwenden dieselben 20 Seeds. Unterschiede zwischen einem und zwei Slots sind daher direkt vergleichbar; die 64-Seed-Referenz dient nur als Richtungsanker.",
    "",
    "## Reproduktion",
    "",
    "```bash",
    "npm run balance:parking",
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
    `Parkslot-Gegenversuch abgeschlossen: ${RUNS_PER_VARIANT} Kampagnen mit einem und ${RUNS_PER_VARIANT} mit zwei Slots.\n`,
  );
}

await main();
