import assert from "node:assert/strict";
import test from "node:test";
import { CAMPAIGN_OPPONENTS, ITEM_BY_ID } from "../app/game/data";
import { simulateBattle } from "../app/game/simulation";
import {
  advanceAfterBattle,
  buyOffer,
  createInitialState,
  getFamilyWeights,
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
  assert.ok(first.duration <= 25_000);
  assert.ok(first.playerStats.some((entry) => entry.triggers > 0));
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
