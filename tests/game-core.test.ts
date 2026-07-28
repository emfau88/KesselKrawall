import assert from "node:assert/strict";
import test from "node:test";
import {
  createCombatBeats,
  getCombatBeatTiming,
  isStatusTick,
} from "../app/game/combatPresentation";
import {
  createCombatActivationTimeline,
  getCombatCooldownState,
} from "../app/game/combatCooldownTimeline";
import { CAMPAIGN_OPPONENTS, ITEM_BY_ID } from "../app/game/data";
import {
  getItemCooldownMs,
  POISON_CAP,
  SHIELD_CAP_RATIO,
  simulateBattle,
} from "../app/game/simulation";
import {
  advancePresentationFrame,
  interpolateVisibleBattleTime,
  PresentationScheduler,
} from "../app/game/presentationTimeline";
import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  getFamilyWeights,
  getPowerBreakdown,
  getPowerValue,
  getPurchaseMergePreview,
  getCurrentOpponent,
  getSellValue,
  isSynergyActive,
  sanitizeStoredState,
} from "../app/game/state";
import { loadStoredGame, persistGame } from "../app/game/storage";
import type {
  GameState,
  ItemInstance,
  OpponentDefinition,
} from "../app/game/types";

function item(
  uid: string,
  itemId: string,
  level: 1 | 2 | 3 = 1,
): ItemInstance {
  return { uid, itemId, level };
}

function opponent(
  board: OpponentDefinition["board"],
  baseHp = 100,
): OpponentDefinition {
  return {
    id: "test-opponent",
    name: "Testkessel",
    title: "Prüfkessel",
    icon: "T",
    quote: "Test",
    threat: "Test",
    rank: "regular",
    baseHp,
    board,
  };
}

test("opening shop contains one offer from every family", () => {
  const state = createInitialState(1234);
  const families = new Set(
    state.offers.map((offer) => ITEM_BY_ID[offer.itemId].family),
  );
  assert.deepEqual([...families].sort(), ["fire", "guard", "poison"]);
});

test("full board purchase performs an immediate merge and cascade", () => {
  const base = createInitialState(10);
  const state: GameState = {
    ...base,
    gold: 20,
    board: [
      item("chili-a", "chili", 1),
      item("chili-b", "chili", 2),
      item("guard-a", "egg-shell", 1),
      item("guard-b", "healing-tuber", 1),
      item("poison-a", "slime-shroom", 1),
    ],
    offers: [{ uid: "offer-chili", itemId: "chili", bought: false }],
  };

  const result = buyOffer(state, "offer-chili");
  assert.equal(result.error, undefined);
  assert.equal(result.merges?.length, 2);
  assert.deepEqual(
    result.merges?.map((merge) => merge.consumedSlot),
    [null, 1],
  );
  assert.equal(result.state.board[0]?.itemId, "chili");
  assert.equal(result.state.board[0]?.level, 3);
  assert.equal(result.state.board[1], null);
  assert.equal(result.state.gold, 17);
});

test("purchase merge keeps the existing target slot through a cascade", () => {
  const base = createInitialState(11);
  const state: GameState = {
    ...base,
    gold: 20,
    board: [
      null,
      item("chili-two", "chili", 2),
      item("guard-a", "egg-shell"),
      item("guard-b", "gold-spoon"),
      item("chili-one", "chili"),
    ],
    offers: [{ uid: "offer-chili", itemId: "chili", bought: false }],
  };

  const preview = getPurchaseMergePreview(state.board, "chili");
  assert.deepEqual(preview, {
    targetSlot: 4,
    resultLevel: 3,
    mergeCount: 2,
  });

  const result = buyOffer(state, "offer-chili");
  assert.equal(result.state.board[4]?.uid, "chili-one");
  assert.equal(result.state.board[4]?.level, 3);
  assert.equal(result.state.board[1], null);
  assert.ok(result.merges?.every((merge) => merge.slot === 4));
});

test("family weight preserves invested copies through merges", () => {
  const board = [
    item("fire-3", "chili", 3),
    item("guard-2", "egg-shell", 2),
    null,
    null,
    null,
  ];
  const weights = getFamilyWeights(board);
  assert.equal(weights.fire, 4);
  assert.equal(weights.guard, 2);
  assert.equal(isSynergyActive(board, "fire"), true);
  assert.equal(isSynergyActive(board, "guard"), false);
});

test("power breakdown separates item value from the build-rating synergy bonus", () => {
  const board = [item("fire-3", "chili", 3), null, null, null, null];
  const breakdown = getPowerBreakdown(board);

  assert.equal(breakdown.synergyCount, 1);
  assert.ok(breakdown.synergyBonus > 0);
  assert.equal(breakdown.total, getPowerValue(board));
  assert.equal(
    breakdown.total,
    breakdown.itemValue + breakdown.synergyBonus,
  );
});

test("sell value is exactly half the represented investment", () => {
  assert.equal(getSellValue(item("a", "chili", 1)), 1);
  assert.equal(getSellValue(item("b", "chili", 2)), 3);
  assert.equal(getSellValue(item("c", "chili", 3)), 6);
});

test("battle simulation is deterministic and produces item statistics", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 1),
    item("p3", "slime-shroom", 1),
    null,
    null,
  ];
  const first = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  const second = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  assert.deepEqual(first, second);
  assert.ok(first.events.length > 0);
  assert.ok(first.events.every((event) => event.amount > 0));
  assert.ok(first.duration <= 25_000);
  assert.ok(first.playerStats.some((entry) => entry.triggers > 0));
});

test("combat cooldown exposes the effective slot timing for the UI", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 1),
    null,
    null,
    null,
  ];
  assert.equal(getItemCooldownMs(board, 0), 2460);
  assert.equal(getItemCooldownMs(board, 2), 0);
});

test("combat cooldown timeline follows true hasted activations", () => {
  const board = [
    item("hasted-chili", "chili"),
    item("ember", "ember-core"),
    item("ramp", "dragon-tooth"),
    null,
    null,
  ];
  const battle = simulateBattle(
    board,
    opponent([null, null, null, null, null], 1_000),
  );
  const timeline = createCombatActivationTimeline(
    battle.events,
    board,
    "player",
  );
  const chiliTimes = timeline.get("hasted-chili") ?? [];
  const expectedFirstActivation =
    Math.round(getItemCooldownMs(board, 0) / 100) * 100;

  assert.ok(chiliTimes.length >= 3);
  assert.equal(chiliTimes[0], expectedFirstActivation);
  assert.ok(expectedFirstActivation < ITEM_BY_ID.chili.cooldown[0] * 1_000);
  assert.ok(
    chiliTimes
      .slice(1)
      .every(
        (time, index) =>
          time - chiliTimes[index] === expectedFirstActivation,
      ),
  );
  assert.ok((timeline.get("ramp") ?? []).length >= 2);
});

test("combat cooldown timeline excludes derived status ticks and duplicate effects", () => {
  const board = [
    item("venom", "venom-bulb"),
    null,
    null,
    null,
    null,
  ];
  const battle = simulateBattle(
    board,
    opponent([null, null, null, null, null], 1_000),
  );
  const timeline = createCombatActivationTimeline(
    battle.events,
    board,
    "player",
  );
  const activationTimes = timeline.get("venom") ?? [];
  const directEventTimes = battle.events
    .filter(
      (event) =>
        event.actor === "player" &&
        event.sourceUid === "venom" &&
        !isStatusTick(event),
    )
    .map((event) => event.time);

  assert.ok(directEventTimes.length > activationTimes.length);
  assert.deepEqual(
    activationTimes,
    [...new Set(directEventTimes)].sort((a, b) => a - b),
  );
  assert.ok(
    battle.events.some(
      (event) => event.sourceUid === "venom" && isStatusTick(event),
    ),
  );
});

test("event cooldown progress resets only on true activations", () => {
  const activationTimes = [2_500, 5_300, 8_700];

  assert.equal(
    getCombatCooldownState({
      battleTime: 1_250,
      activationTimes,
      fallbackCooldown: 4_000,
    }).progress,
    0.5,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 2_500,
      activationTimes,
      fallbackCooldown: 4_000,
    }).progress,
    0,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 3_900,
      activationTimes,
      fallbackCooldown: 4_000,
    }).progress,
    0.5,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 10_300,
      activationTimes,
      fallbackCooldown: 4_000,
    }).progress,
    0.4,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 14_000,
      activationTimes,
      fallbackCooldown: 4_000,
    }).progress,
    1,
  );
});

test("reactive cooldown is ready before its first real trigger", () => {
  const activationTimes = [3_000, 8_000];

  assert.equal(
    getCombatCooldownState({
      battleTime: 0,
      activationTimes,
      fallbackCooldown: 4_000,
      startsReady: true,
    }).progress,
    1,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 3_000,
      activationTimes,
      fallbackCooldown: 4_000,
      startsReady: true,
    }).progress,
    0,
  );
  assert.equal(
    getCombatCooldownState({
      battleTime: 5_500,
      activationTimes,
      fallbackCooldown: 4_000,
      startsReady: true,
    }).progress,
    0.5,
  );
});

test("a knockout ends with the defeated health bar at zero", () => {
  const board = [
    item("f1", "chili", 3),
    item("f2", "dragon-tooth", 3),
    item("f3", "ember-core", 3),
    item("f4", "cinder-berry", 3),
    item("p1", "nightwing", 3),
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  assert.equal(battle.reason, "knockout");
  assert.equal(battle.winner, "player");
  assert.equal(battle.finalEnemyHp, 0);
  assert.equal(battle.events.at(-1)?.enemyHp, 0);
});

test("a timeout keeps both health bars and resolves by relative health", () => {
  const board = [item("p1", "chili"), null, null, null, null];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  assert.equal(battle.reason, "timeout");
  assert.ok(battle.finalPlayerHp > 0);
  assert.ok(battle.finalEnemyHp > 0);
  const playerRatio = battle.finalPlayerHp / battle.playerMaxHp;
  const enemyRatio = battle.finalEnemyHp / battle.enemyMaxHp;
  assert.equal(battle.winner, playerRatio > enemyRatio ? "player" : "enemy");
});

test("shared poison is capped, ticks once, and decays by two stacks", () => {
  const single = simulateBattle(
    [item("slime", "slime-shroom"), null, null, null, null],
    opponent([null, null, null, null, null]),
  );
  assert.deepEqual(
    single.events
      .filter(
        (event) =>
          event.kind === "poison" &&
          event.label === "Gift tickt" &&
          event.time < 7_200,
      )
      .map((event) => event.amount),
    [2, 1],
  );

  const multiple = simulateBattle(
    [
      item("slime-a", "slime-shroom", 3),
      item("slime-b", "slime-shroom", 3),
      null,
      null,
      null,
    ],
    opponent([null, null, null, null, null]),
  );
  const firstApplicationTime = multiple.events.find(
    (event) => event.kind === "poison" && event.label !== "Gift tickt",
  )?.time;
  const firstApplications = multiple.events.filter(
    (event) =>
      event.kind === "poison" &&
      event.label !== "Gift tickt" &&
      event.time === firstApplicationTime,
  );
  assert.equal(
    firstApplications.reduce((sum, event) => sum + event.amount, 0),
    POISON_CAP,
  );
  assert.equal(
    multiple.events.find(
      (event) => event.kind === "poison" && event.label === "Gift tickt",
    )?.amount,
    6,
  );
});

test("a poison knockout stops the defeated cauldron before it can act", () => {
  const battle = simulateBattle(
    [item("slime", "slime-shroom"), null, null, null, null],
    opponent(
      [item("enemy-tooth", "dragon-tooth"), null, null, null, null],
      3,
    ),
  );
  assert.equal(battle.winner, "player");
  assert.equal(battle.finalEnemyHp, 0);
  const knockoutTime = battle.events.at(-1)?.time;
  assert.equal(knockoutTime, 6_000);
  assert.equal(
    battle.events.some(
      (event) => event.time === knockoutTime && event.actor === "enemy",
    ),
    false,
  );
});

test("a burn knockout stops the defeated cauldron before it can act", () => {
  const battle = simulateBattle(
    [item("chili", "chili", 3), null, null, null, null],
    opponent(
      [item("enemy-tooth", "dragon-tooth"), null, null, null, null],
      25,
    ),
  );
  assert.equal(battle.winner, "player");
  assert.equal(battle.finalEnemyHp, 0);
  const knockoutTime = battle.events.at(-1)?.time;
  assert.equal(knockoutTime, 3_000);
  assert.equal(
    battle.events.some(
      (event) => event.time === knockoutTime && event.actor === "enemy",
    ),
    false,
  );
});

test("shield is capped and never decides an otherwise tied timeout", () => {
  const board = [
    item("shell", "egg-shell", 3),
    null,
    null,
    null,
    null,
  ];
  const target = opponent([null, null, null, null, null]);
  const battle = simulateBattle(board, target);
  assert.equal(battle.finalPlayerShield, 100 * SHIELD_CAP_RATIO);
  assert.equal(battle.winner, "draw");
  assert.equal(battle.reason, "timeout");
  assert.equal(battle.duration, 25_000);

  const extendedAnalysis = simulateBattle(board, target, {
    combatLimitMs: 35_000,
  });
  assert.equal(extendedAnalysis.duration, 35_000);
  assert.equal(extendedAnalysis.winner, "draw");
});

test("simultaneous knockout is a real draw", () => {
  const board = Array.from({ length: 5 }, (_, index) =>
    item(`player-${index}`, "dragon-tooth", 3),
  );
  const enemyBoard = Array.from({ length: 5 }, (_, index) =>
    item(`enemy-${index}`, "dragon-tooth", 3),
  );
  const battle = simulateBattle(board, opponent(enemyBoard));
  assert.equal(battle.finalPlayerHp, 0);
  assert.equal(battle.finalEnemyHp, 0);
  assert.equal(battle.winner, "draw");
});

test("combat statistics separate hp, shield, and total damage", () => {
  const battle = simulateBattle(
    [item("chili", "chili", 3), null, null, null, null],
    opponent([item("shell", "egg-shell", 3), null, null, null, null]),
  );
  const stats = battle.playerStats.find((entry) => entry.uid === "chili");
  assert.ok(stats);
  assert.equal(stats.totalDamage, stats.hpDamage + stats.shieldDamage);
  assert.ok(stats.hpDamage > 0);
  assert.ok(stats.shieldDamage > 0);
});

test("three trigger items create distinct combat rhythms", () => {
  const rampBattle = simulateBattle(
    [item("tooth", "dragon-tooth"), null, null, null, null],
    opponent([null, null, null, null, null], 1_000),
  );
  const rampDamage = rampBattle.events
    .filter((event) => event.sourceUid === "tooth" && event.kind === "damage")
    .map((event) => event.amount);
  assert.ok(rampDamage.length >= 3);
  assert.ok(rampDamage[1] > rampDamage[0]);
  assert.ok(rampDamage[2] > rampDamage[1]);

  const counterBattle = simulateBattle(
    [item("salt", "moon-salt"), null, null, null, null],
    opponent([item("enemy-chili", "chili"), null, null, null, null]),
  );
  const counterStats = counterBattle.playerStats.find(
    (entry) => entry.uid === "salt",
  );
  assert.ok(counterStats);
  assert.ok(counterStats.triggers > 0);
  assert.equal(
    counterBattle.events.some(
      (event) => event.sourceUid === "salt" && event.time < 3_200,
    ),
    false,
  );

  const emergencyBattle = simulateBattle(
    [item("heal", "healing-tuber", 3), null, null, null, null],
    opponent([
      item("enemy-1", "chili", 3),
      item("enemy-2", "chili", 3),
      item("enemy-3", "chili", 3),
      null,
      null,
    ]),
  );
  assert.equal(
    emergencyBattle.playerStats.find((entry) => entry.uid === "heal")
      ?.triggers,
    1,
  );
  assert.equal(
    emergencyBattle.events.filter(
      (event) => event.sourceUid === "heal" && event.kind === "heal",
    ).length,
    1,
  );
});

test("emergency healing never revives a knocked-out cauldron", () => {
  const battle = simulateBattle(
    [item("heal", "healing-tuber", 3), null, null, null, null],
    opponent(
      Array.from({ length: 5 }, (_, index) =>
        item(`enemy-tooth-${index}`, "dragon-tooth", 3),
      ),
    ),
  );
  assert.equal(battle.finalPlayerHp, 0);
  assert.equal(
    battle.events.some(
      (event) => event.sourceUid === "heal" && event.kind === "heal",
    ),
    false,
  );
});

test("a draw advances without seal loss or victory reward", () => {
  const state = createInitialState(45);
  const next = advanceAfterBattle(state, "draw");
  assert.equal(next.seals, state.seals);
  assert.equal(next.victories, state.victories);
  assert.equal(next.round, 2);
});

test("stored runs validate ids, levels, counters, and pending battles deeply", () => {
  const base = createInitialState(46);
  const battle = simulateBattle(
    [item("chili", "chili"), null, null, null, null],
    CAMPAIGN_OPPONENTS[0],
  );
  const valid = {
    ...base,
    phase: "battle",
    board: [item("chili", "chili"), null, null, null, null],
    pendingBattle: battle,
  };
  assert.ok(sanitizeStoredState(JSON.parse(JSON.stringify(valid))));

  assert.equal(
    sanitizeStoredState({
      ...valid,
      board: [item("bad", "does-not-exist"), null, null, null, null],
    }),
    null,
  );
  assert.equal(sanitizeStoredState({ ...valid, rngState: 1.5 }), null);
  assert.equal(
    sanitizeStoredState({
      ...valid,
      pendingBattle: {
        ...battle,
        playerStats: [{ ...battle.playerStats[0], totalDamage: -1 }],
      },
    }),
    null,
  );
});

test("an active battle round-trips through the atomic save record", () => {
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
    removeItem: (key: string) => {
      records.delete(key);
    },
  } as Storage;
  const base = createInitialState(47);
  const board = [item("chili", "chili"), null, null, null, null];
  const battle = simulateBattle(board, getCurrentOpponent(base));
  const active: GameState = {
    ...base,
    phase: "battle",
    board,
    pendingBattle: battle,
  };

  assert.equal(persistGame(storage, active), true);
  const restored = loadStoredGame(storage);
  assert.equal(restored?.phase, "battle");
  assert.deepEqual(restored?.pendingBattle, battle);
});

test("the first defeat is protected, later defeats consume one seal", () => {
  const state = createInitialState(42);
  const protectedNext = advanceAfterBattle(state, "enemy");
  assert.equal(protectedNext.seals, 3);
  assert.equal(protectedNext.round, 2);
  assert.equal(protectedNext.phase, "shop");

  const next = advanceAfterBattle(protectedNext, "enemy");
  assert.equal(next.seals, 2);
  assert.equal(next.round, 3);
});

test("campaign contains seven opponents and one final boss", () => {
  assert.equal(CAMPAIGN_OPPONENTS.length, 8);
  assert.equal(
    CAMPAIGN_OPPONENTS.filter((opponent) => opponent.rank === "elite").length,
    1,
  );
  assert.equal(CAMPAIGN_OPPONENTS[7].rank, "boss");
  assert.equal(CAMPAIGN_OPPONENTS[7].bossRule, "rageAtHalf");
  assert.ok(
    CAMPAIGN_OPPONENTS.every(
      (opponent) => opponent.boardVariants?.length === 2,
    ),
  );
});

test("winning the eighth fight completes the campaign", () => {
  const state = {
    ...createInitialState(43),
    round: 8,
    victories: 7,
  };
  const completed = advanceAfterBattle(state, "player");
  assert.equal(completed.phase, "victory");
  assert.equal(completed.victories, 8);
  assert.equal(completed.round, 8);
});

test("losing to the boss ends the run even with seals remaining", () => {
  const state = {
    ...createInitialState(44),
    round: 8,
    seals: 3,
    victories: 6,
  };
  const completed = advanceAfterBattle(state, "enemy");
  assert.equal(completed.phase, "gameover");
  assert.equal(completed.seals, 2);
  assert.equal(completed.round, 8);
});

test("the boss visibly triggers Kesselzorn below half health", () => {
  const board = [
    item("f1", "chili", 3),
    item("f2", "dragon-tooth", 3),
    item("f3", "ember-core", 3),
    item("p1", "nightwing", 3),
    item("g1", "moon-salt", 3),
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[7]);
  assert.ok(
    battle.events.some(
      (event) =>
        event.kind === "boss" && event.label === "Kesselzorn entfacht",
    ),
  );
});

test("combat presentation preserves every simulated event and final snapshot", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 1),
    item("p3", "slime-shroom", 2),
    null,
    null,
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[3]);
  const beats = createCombatBeats(battle.events);

  assert.deepEqual(
    beats.flatMap((beat) => beat.events),
    battle.events,
  );
  assert.equal(beats.at(-1)?.snapshot.playerHp, battle.finalPlayerHp);
  assert.equal(beats.at(-1)?.snapshot.enemyHp, battle.finalEnemyHp);
});

test("combat presentation spotlights first item uses and compresses repeats", () => {
  const board = [
    item("p1", "chili", 1),
    item("p2", "ember-core", 1),
    null,
    null,
    null,
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  const beats = createCombatBeats(battle.events);

  for (const sourceUid of ["p1", "p2"]) {
    const firstBeat = beats.find((beat) =>
      beat.activeUids.includes(sourceUid),
    );
    assert.equal(firstBeat?.tier, "hero");
  }
  assert.ok(beats.length < battle.events.length);
  assert.ok(beats.some((beat) => beat.contributions.length > 1));
});

test("combat presentation exposes persistent poison timing at the health bar", () => {
  const board = [
    item("p1", "slime-shroom", 2),
    item("p2", "nightwing", 1),
    null,
    null,
    null,
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[0]);
  const beats = createCombatBeats(battle.events);
  const poisoned = beats.find((beat) => beat.statuses.enemy.poison.stacks > 0);

  assert.ok(poisoned);
  assert.ok(poisoned.statuses.enemy.poison.expiresAt > poisoned.time);
  assert.equal(poisoned.statuses.enemy.poison.interval, 2_000);
  assert.ok(poisoned.statuses.enemy.poison.nextTickAt > poisoned.time);
});

test("combat director gives dense 1x playback a readable visual budget", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 1),
    item("p3", "slime-shroom", 2),
    null,
    null,
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[3]);
  const beats = createCombatBeats(battle.events);
  let playbackEnd = 0;
  let visibleTime = 0;
  let previousBeatTime = 0;

  for (const beat of beats) {
    const timing = getCombatBeatTiming(beat, previousBeatTime, 1);
    playbackEnd = Math.max(playbackEnd, beat.time) + timing.holdMs;
    visibleTime += timing.visibleMs;
    assert.ok(timing.recoveryMs >= 50);
    if (beat.tier === "standard") {
      assert.ok(timing.shotDurationMs >= 1_050);
    }
    if (beat.tier === "hero") {
      assert.ok(timing.shotDurationMs >= 1_400);
    }
    previousBeatTime = beat.time;
  }

  assert.ok(playbackEnd > battle.duration);
  assert.ok(playbackEnd < 60_000);
  assert.ok(visibleTime / playbackEnd < 0.9);
});

test("combat director shortens only dead air after tightly spaced beats", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 2),
    item("p3", "slime-shroom", 2),
    item("p4", "nightwing", 2),
    item("p5", "moon-salt", 2),
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[4]);
  const beat = createCombatBeats(battle.events).find(
    (candidate) => candidate.tier === "standard",
  );

  assert.ok(beat);
  const tightTiming = getCombatBeatTiming(beat, beat.time - 100, 1);
  const relaxedTiming = getCombatBeatTiming(beat, beat.time - 10_000, 1);

  assert.equal(tightTiming.shotDurationMs, relaxedTiming.shotDurationMs);
  assert.equal(tightTiming.shotStaggerMs, relaxedTiming.shotStaggerMs);
  assert.equal(tightTiming.visibleMs, relaxedTiming.visibleMs);
  assert.ok(tightTiming.holdMs < relaxedTiming.holdMs);
  assert.ok(tightTiming.holdMs >= tightTiming.visibleMs + 50);
});

test("presentation time freezes across pauses and discards wall-clock gaps", () => {
  const running = advancePresentationFrame(0, 0, 16, false);
  assert.equal(running.presentationTimeMs, 16);
  assert.equal(running.frameDeltaMs, 16);

  const paused = advancePresentationFrame(
    running.presentationTimeMs,
    running.wallTimeMs,
    5_016,
    true,
  );
  assert.equal(paused.presentationTimeMs, 16);
  assert.equal(paused.frameDeltaMs, 0);

  const resumed = advancePresentationFrame(
    paused.presentationTimeMs,
    paused.wallTimeMs,
    5_032,
    false,
  );
  assert.equal(resumed.presentationTimeMs, 32);
  assert.equal(resumed.frameDeltaMs, 16);

  const backgrounded = advancePresentationFrame(
    resumed.presentationTimeMs,
    resumed.wallTimeMs,
    15_032,
    false,
  );
  assert.equal(backgrounded.presentationTimeMs, 132);
  assert.equal(backgrounded.frameDeltaMs, 100);
});

test("presentation scheduler fires deadlines once and in stable order", () => {
  const scheduler = new PresentationScheduler();
  const calls: string[] = [];
  scheduler.schedule(200, () => calls.push("late"));
  scheduler.schedule(100, () => calls.push("first"));
  scheduler.schedule(100, () => calls.push("second"));

  assert.equal(scheduler.flush(99), 0);
  assert.deepEqual(calls, []);
  assert.equal(scheduler.flush(100), 2);
  assert.deepEqual(calls, ["first", "second"]);
  assert.equal(scheduler.flush(100), 0);
  assert.equal(scheduler.flush(200), 1);
  assert.deepEqual(calls, ["first", "second", "late"]);
  assert.equal(scheduler.size, 0);
});

test("visible battle time interpolates monotonically to the next beat", () => {
  let visibleTimeMs = 0;
  for (let step = 1; step <= 10; step += 1) {
    const previousTimeMs = visibleTimeMs;
    visibleTimeMs = interpolateVisibleBattleTime({
      currentTimeMs: visibleTimeMs,
      targetTimeMs: 1_200,
      nextBeatTimeMs: 1_000,
      presentationTimeMs: step * 100,
      nextBeatAllowedAtMs: 1_000,
      frameDeltaMs: 100,
      speed: step < 5 ? 1 : 4,
      durationMs: 5_000,
    });
    assert.ok(visibleTimeMs >= previousTimeMs);
    assert.ok(visibleTimeMs <= 1_000);
  }

  assert.equal(visibleTimeMs, 1_000);
  assert.equal(
    interpolateVisibleBattleTime({
      currentTimeMs: visibleTimeMs,
      targetTimeMs: 2_000,
      nextBeatTimeMs: 2_500,
      presentationTimeMs: 1_000,
      nextBeatAllowedAtMs: 1_500,
      frameDeltaMs: 0,
      speed: 2,
      durationMs: 5_000,
    }),
    visibleTimeMs,
  );
});

test("combat director keeps volleys causal and status ticks separate", () => {
  const board = [
    item("p1", "chili", 2),
    item("p2", "ember-core", 2),
    item("p3", "slime-shroom", 2),
    item("p4", "nightwing", 2),
    item("p5", "moon-salt", 2),
  ];
  const battle = simulateBattle(board, CAMPAIGN_OPPONENTS[4]);
  const beats = createCombatBeats(battle.events);

  for (const beat of beats) {
    assert.ok(beat.contributions.length <= 5);
    assert.deepEqual(
      beat.contributions.flatMap((contribution) => contribution.events),
      beat.events,
    );
    if (beat.tier === "ambient") {
      assert.ok(beat.events.every(isStatusTick));
    } else if (beat.tier === "standard") {
      assert.ok(beat.events.every((event) => !isStatusTick(event)));
    }
  }
});
