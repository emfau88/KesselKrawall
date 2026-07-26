import assert from "node:assert/strict";
import test from "node:test";
import {
  createCombatBeats,
  getBeatHoldMs,
  getBeatVisibleMs,
} from "../app/game/combatPresentation";
import { CAMPAIGN_OPPONENTS, ITEM_BY_ID } from "../app/game/data";
import { getItemCooldownMs, simulateBattle } from "../app/game/simulation";
import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  getFamilyWeights,
  getPowerBreakdown,
  getPowerValue,
  getSellValue,
  isSynergyActive,
} from "../app/game/state";
import type { GameState, ItemInstance } from "../app/game/types";

function item(
  uid: string,
  itemId: string,
  level: 1 | 2 | 3 = 1,
): ItemInstance {
  return { uid, itemId, level };
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
  assert.equal(getItemCooldownMs(board, 0), 2640);
  assert.equal(getItemCooldownMs(board, 2), 0);
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

test("a defeat consumes one run seal but advances the round", () => {
  const state = createInitialState(42);
  const next = advanceAfterBattle(state, false);
  assert.equal(next.seals, 2);
  assert.equal(next.round, 2);
  assert.equal(next.phase, "shop");
});

test("campaign contains seven opponents and one final boss", () => {
  assert.equal(CAMPAIGN_OPPONENTS.length, 8);
  assert.equal(
    CAMPAIGN_OPPONENTS.filter((opponent) => opponent.rank === "elite").length,
    1,
  );
  assert.equal(CAMPAIGN_OPPONENTS[7].rank, "boss");
  assert.equal(CAMPAIGN_OPPONENTS[7].bossRule, "rageAtHalf");
});

test("winning the eighth fight completes the campaign", () => {
  const state = {
    ...createInitialState(43),
    round: 8,
    victories: 7,
  };
  const completed = advanceAfterBattle(state, true);
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
  const completed = advanceAfterBattle(state, false);
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

test("combat director keeps dense playback within a bounded visual budget", () => {
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

  for (const beat of beats) {
    const hold = getBeatHoldMs(beat, 1);
    playbackEnd = Math.max(playbackEnd, beat.time) + hold;
    visibleTime += getBeatVisibleMs(beat, hold);
  }

  assert.ok(playbackEnd < 20_000);
  assert.ok(visibleTime / playbackEnd < 0.65);
});
