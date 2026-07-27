import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEM_BY_ID, ITEMS } from "../app/game/data";
import { simulateBattle } from "../app/game/simulation";
import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  getCurrentOpponent,
  getPowerValue,
  rerollShop,
} from "../app/game/state";
import type {
  BattleOutcome,
  Board,
  GameState,
  ItemInstance,
} from "../app/game/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_JSON = resolve(ROOT, "reports", "balance-results.json");
const REPORT_MARKDOWN = resolve(ROOT, "reports", "balance-summary.md");
const DEFAULT_SEED_COUNT = 64;
const BASE_SEED = 0x4b4b0000;
const SEED_STRIDE = 0x9e3779b9;

interface RoundAccumulator {
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  timeouts: number;
  startGold: number;
  spentGold: number;
  endGold: number;
}

interface ItemFrequency {
  winningBoards: number;
  losingBoards: number;
  winningCopies: number;
  losingCopies: number;
}

interface PositionAccumulator {
  boards: number;
  arrangements: number;
  boardsWithAnyOutcomeChange: number;
  boardsWithWinnerFlip: number;
}

interface PowerSample {
  predictedMargin: number;
  actualMargin: number;
  outcome: BattleOutcome;
}

const STRATEGY =
  "Pro Shop wird wiederholt das bezahlbare Angebot mit dem höchsten Zuwachs der groben Buildstärke pro Gold gekauft. Danach wird genau der kostenlose Reroll genutzt und erneut gekauft; bezahlte Rerolls werden nicht verwendet.";

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
    startGold: 0,
    spentGold: 0,
    endGold: 0,
  };
}

function chooseBestOffer(state: GameState): string | null {
  const currentPower = getPowerValue(state.board);
  const candidates = state.offers
    .filter((offer) => {
      const definition = ITEM_BY_ID[offer.itemId];
      return !offer.bought && definition.cost <= state.gold;
    })
    .map((offer) => {
      const result = buyOffer(state, offer.uid);
      if (result.error) return null;
      const cost = ITEM_BY_ID[offer.itemId].cost;
      const gain = getPowerValue(result.state.board) - currentPower;
      return {
        uid: offer.uid,
        score: gain / cost,
        gain,
        cost,
        itemId: offer.itemId,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.gain - a.gain ||
        a.cost - b.cost ||
        a.itemId.localeCompare(b.itemId),
    );
  return candidates[0]?.uid ?? null;
}

function buyGreedily(input: GameState): GameState {
  let state = input;
  while (true) {
    const offerUid = chooseBestOffer(state);
    if (!offerUid) return state;
    const result = buyOffer(state, offerUid);
    if (result.error) return state;
    state = result.state;
  }
}

function applyShoppingStrategy(input: GameState): GameState {
  let state = buyGreedily(input);
  if (state.rerollsUsed === 0) {
    const rerolled = rerollShop(state);
    if (!rerolled.error) state = buyGreedily(rerolled.state);
  }
  return state;
}

function boardSignature(board: Board): string {
  return board
    .map((entry) => (entry ? `${entry.itemId}:${entry.level}` : "-"))
    .join("|");
}

function uniqueArrangements(board: Board): Board[] {
  const arrangements = new Map<string, Board>();
  const used = Array.from({ length: board.length }, () => false);
  const current: Board = [];

  function visit() {
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

function representedCopies(instance: ItemInstance): number {
  return 2 ** (instance.level - 1);
}

function addItemFrequency(
  frequencies: Record<string, ItemFrequency>,
  board: Board,
  winner: boolean,
): void {
  const seen = new Set<string>();
  for (const instance of board) {
    if (!instance) continue;
    const frequency = frequencies[instance.itemId];
    if (winner) frequency.winningCopies += representedCopies(instance);
    else frequency.losingCopies += representedCopies(instance);
    if (seen.has(instance.itemId)) continue;
    seen.add(instance.itemId);
    if (winner) frequency.winningBoards += 1;
    else frequency.losingBoards += 1;
  }
}

function pearson(samples: PowerSample[]): number {
  if (samples.length < 2) return 0;
  const meanX =
    samples.reduce((sum, sample) => sum + sample.predictedMargin, 0) /
    samples.length;
  const meanY =
    samples.reduce((sum, sample) => sum + sample.actualMargin, 0) /
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

function percent(value: number): number {
  return Math.round(value * 10_000) / 100;
}

async function main() {
  const seedCount = seedCountFromArgs();
  const rounds = Array.from({ length: 8 }, emptyRound);
  const frequencies = Object.fromEntries(
    ITEMS.map((item) => [
      item.id,
      {
        winningBoards: 0,
        losingBoards: 0,
        winningCopies: 0,
        losingCopies: 0,
      },
    ]),
  ) as Record<string, ItemFrequency>;
  const positions: PositionAccumulator = {
    boards: 0,
    arrangements: 0,
    boardsWithAnyOutcomeChange: 0,
    boardsWithWinnerFlip: 0,
  };
  const powerSamples: PowerSample[] = [];
  let totalBattles = 0;
  let totalTimeouts = 0;
  let winningBoards = 0;
  let losingBoards = 0;

  for (let seedOffset = 0; seedOffset < seedCount; seedOffset += 1) {
    const runSeed =
      (BASE_SEED + Math.imul(seedOffset, SEED_STRIDE)) >>> 0;
    let state = {
      ...createInitialState(runSeed),
      seals: 99,
    };

    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      const round = rounds[roundIndex];
      const startGold = state.gold;
      state = applyShoppingStrategy({ ...state, phase: "shop", seals: 99 });
      const spentGold = startGold - state.gold;
      const currentOpponent = getCurrentOpponent(state);
      const battle = simulateBattle(state.board, currentOpponent);

      round.battles += 1;
      round.startGold += startGold;
      round.spentGold += spentGold;
      round.endGold += state.gold;
      if (battle.winner === "player") round.wins += 1;
      else if (battle.winner === "enemy") round.losses += 1;
      else round.draws += 1;
      if (battle.reason === "timeout") {
        round.timeouts += 1;
        totalTimeouts += 1;
      }
      totalBattles += 1;

      if (battle.winner === "player") {
        winningBoards += 1;
        addItemFrequency(frequencies, state.board, true);
      } else if (battle.winner === "enemy") {
        losingBoards += 1;
        addItemFrequency(frequencies, state.board, false);
      }

      const playerRatio = battle.finalPlayerHp / battle.playerMaxHp;
      const enemyRatio = battle.finalEnemyHp / battle.enemyMaxHp;
      powerSamples.push({
        predictedMargin:
          getPowerValue(state.board) - getPowerValue(currentOpponent.board),
        actualMargin: playerRatio - enemyRatio,
        outcome: battle.winner,
      });

      const arrangements = uniqueArrangements(state.board);
      const arrangementOutcomes = new Set<BattleOutcome>();
      for (const arrangement of arrangements) {
        arrangementOutcomes.add(
          simulateBattle(arrangement, currentOpponent).winner,
        );
      }
      positions.boards += 1;
      positions.arrangements += arrangements.length;
      if (arrangementOutcomes.size > 1) {
        positions.boardsWithAnyOutcomeChange += 1;
      }
      if (
        arrangementOutcomes.has("player") &&
        arrangementOutcomes.has("enemy")
      ) {
        positions.boardsWithWinnerFlip += 1;
      }

      if (roundIndex < rounds.length - 1) {
        state = {
          ...advanceAfterBattle(state, battle.winner),
          seals: 99,
        };
      }
    }
  }

  const decisivePowerSamples = powerSamples.filter(
    (sample) => sample.outcome !== "draw",
  );
  const predictionErrors = decisivePowerSamples.filter((sample) => {
    const predicted =
      sample.predictedMargin > 0
        ? "player"
        : sample.predictedMargin < 0
          ? "enemy"
          : "draw";
    return predicted !== sample.outcome;
  }).length;

  const results = {
    schemaVersion: 1,
    reproducibility: {
      baseSeed: BASE_SEED,
      seedStride: SEED_STRIDE,
      seedFormula:
        "(baseSeed + Math.imul(index, seedStride)) >>> 0",
      seedCount,
      combatLimitMs: 25_000,
      command: `npm run balance:analysis -- --seeds=${seedCount}`,
    },
    strategy: {
      description: STRATEGY,
      paidRerolls: false,
      initialGold: 7,
      roundGoldBudgets: rounds.map((round, index) => ({
        round: index + 1,
        averageAvailable: round.startGold / round.battles,
        averageSpent: round.spentGold / round.battles,
        averageRemaining: round.endGold / round.battles,
      })),
    },
    timeoutRate: totalTimeouts / totalBattles,
    timeoutPercent: percent(totalTimeouts / totalBattles),
    roundResults: rounds.map((round, index) => ({
      round: index + 1,
      battles: round.battles,
      winRate: round.wins / round.battles,
      winPercent: percent(round.wins / round.battles),
      lossRate: round.losses / round.battles,
      lossPercent: percent(round.losses / round.battles),
      drawRate: round.draws / round.battles,
      drawPercent: percent(round.draws / round.battles),
      timeoutRate: round.timeouts / round.battles,
      timeoutPercent: percent(round.timeouts / round.battles),
    })),
    positionInfluence: {
      sampledBoards: positions.boards,
      allUniqueArrangements: positions.arrangements,
      boardsWithAnyOutcomeChange:
        positions.boardsWithAnyOutcomeChange,
      boardsWithAnyOutcomeChangeRate:
        positions.boardsWithAnyOutcomeChange / positions.boards,
      boardsWithAnyOutcomeChangePercent: percent(
        positions.boardsWithAnyOutcomeChange / positions.boards,
      ),
      winnerFlipMatchups: positions.boardsWithWinnerFlip,
      winnerFlipRate: positions.boardsWithWinnerFlip / positions.boards,
      winnerFlipPercent: percent(
        positions.boardsWithWinnerFlip / positions.boards,
      ),
    },
    itemFrequency: ITEMS.map((item) => {
      const frequency = frequencies[item.id];
      return {
        itemId: item.id,
        name: item.name,
        winningBoardsContainingRate:
          winningBoards > 0 ? frequency.winningBoards / winningBoards : 0,
        winningBoardsContainingPercent:
          winningBoards > 0
            ? percent(frequency.winningBoards / winningBoards)
            : 0,
        losingBoardsContainingRate:
          losingBoards > 0 ? frequency.losingBoards / losingBoards : 0,
        losingBoardsContainingPercent:
          losingBoards > 0
            ? percent(frequency.losingBoards / losingBoards)
            : 0,
        winningRepresentedCopies: frequency.winningCopies,
        losingRepresentedCopies: frequency.losingCopies,
      };
    }),
    powerEstimate: {
      sampleCount: powerSamples.length,
      pearsonCorrelation: pearson(powerSamples),
      decisiveSampleCount: decisivePowerSamples.length,
      predictionErrorRate:
        decisivePowerSamples.length > 0
          ? predictionErrors / decisivePowerSamples.length
          : 0,
      predictionErrorPercent:
        decisivePowerSamples.length > 0
          ? percent(predictionErrors / decisivePowerSamples.length)
          : 0,
      note:
        "Die Korrelation vergleicht die Differenz der groben Buildstärke mit der Differenz der verbleibenden relativen LP. Die Fehlerrate vergleicht nur entscheidende Kämpfe.",
    },
  };

  const markdown = [
    "# Kessel-Krawall – reproduzierbare Balanceanalyse",
    "",
    `Feste Seedfolge: Basis \`${BASE_SEED}\`, Schritt \`${SEED_STRIDE}\` (${seedCount} Läufe, ${totalBattles} Hauptkämpfe).`,
    "",
    "## Einkaufsstrategie und Budgets",
    "",
    STRATEGY,
    "",
    "| Runde | Ø verfügbar | Ø ausgegeben | Ø übrig |",
    "| ---: | ---: | ---: | ---: |",
    ...results.strategy.roundGoldBudgets.map(
      (entry) =>
        `| ${entry.round} | ${entry.averageAvailable.toFixed(2)} | ${entry.averageSpent.toFixed(2)} | ${entry.averageRemaining.toFixed(2)} |`,
    ),
    "",
    "## Kampfergebnisse",
    "",
    `Timeoutquote gesamt: **${results.timeoutPercent.toFixed(2)} %**.`,
    "",
    "| Runde | Sieg | Niederlage | Unentschieden | Timeout |",
    "| ---: | ---: | ---: | ---: | ---: |",
    ...results.roundResults.map(
      (entry) =>
        `| ${entry.round} | ${entry.winPercent.toFixed(2)} % | ${entry.lossPercent.toFixed(2)} % | ${entry.drawPercent.toFixed(2)} % | ${entry.timeoutPercent.toFixed(2)} % |`,
    ),
    "",
    "## Positionseinfluss",
    "",
    `Für ${positions.boards} Boards wurden alle ${positions.arrangements} eindeutigen zulässigen Anordnungen simuliert.`,
    "",
    `- Irgendeine Ergebnisänderung durch Umordnung: **${results.positionInfluence.boardsWithAnyOutcomeChangePercent.toFixed(2)} %**`,
    `- Direkter Siegerwechsel Spieler ↔ Gegner: **${results.positionInfluence.winnerFlipPercent.toFixed(2)} %**`,
    "",
    "## Häufigkeit der Zutaten",
    "",
    "| Zutat | in Siegerboards | in Verliererboards | Kopien Sieger | Kopien Verlierer |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...results.itemFrequency.map(
      (entry) =>
        `| ${entry.name} | ${entry.winningBoardsContainingPercent.toFixed(2)} % | ${entry.losingBoardsContainingPercent.toFixed(2)} % | ${entry.winningRepresentedCopies} | ${entry.losingRepresentedCopies} |`,
    ),
    "",
    "## Grobe Buildstärke",
    "",
    `- Pearson-Korrelation mit dem relativen LP-Ergebnis: **${results.powerEstimate.pearsonCorrelation.toFixed(3)}**`,
    `- Vorhersage-Fehlerrate bei entscheidenden Kämpfen: **${results.powerEstimate.predictionErrorPercent.toFixed(2)} %**`,
    "",
    results.powerEstimate.note,
    "",
    "## Reproduktion",
    "",
    "```bash",
    results.reproducibility.command,
    "```",
    "",
  ].join("\n");

  await mkdir(dirname(REPORT_JSON), { recursive: true });
  await writeFile(REPORT_JSON, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await writeFile(REPORT_MARKDOWN, markdown, "utf8");
  process.stdout.write(
    `Balanceanalyse abgeschlossen: ${totalBattles} Kämpfe, ${positions.arrangements} Anordnungen.\n`,
  );
}

await main();
