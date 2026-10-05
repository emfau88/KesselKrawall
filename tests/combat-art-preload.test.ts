import assert from "node:assert/strict";
import test from "node:test";
import { getCombatPreloadAssets } from "../app/game/combatArtPreload";
import type { Board } from "../app/game/types";

const board = (...ids: string[]): Board => ids.map((itemId, index) => ({ uid: `test-${index}`, itemId, level: 1 }));

test("the next matchup prepares only its cauldron and relevant combat artwork", () => {
  const assets = getCombatPreloadAssets(board("chili", "slime-shroom"), { id: "zischbert", board: board("chili") });
  assert.ok(assets.includes("cauldron-zischbert"));
  assert.ok(assets.includes("vfx-fire") && assets.includes("vfx-poison-projectile"));
  assert.ok(!assets.includes("cauldron-boss") && !assets.includes("cauldron-chronokessel"));
  assert.ok(!assets.includes("vfx-dragon-tooth-projectile") && !assets.includes("family-poison-atlas"));
  assert.equal(new Set(assets).size, assets.length);
});

test("frost and echo matchups also prepare their status and active family layers", () => {
  const assets = getCombatPreloadAssets(board("frost-shard", "ice-bell", "rime-clock"), {
    id: "hall-hanne", board: board("echo-bell", "mirror-shard", "time-thread"),
  });
  for (const asset of ["cauldron-hall-hanne", "vfx-frost-stasis", "vfx-echo-afterimage", "vfx-ice-bell-projectile",
    "vfx-time-thread-projectile", "family-frost-atlas", "family-echo-atlas"] as const) {
    assert.ok(assets.includes(asset), asset);
  }
  assert.ok(!assets.includes("cauldron-eis-elsa") && !assets.includes("vfx-venom-bulb-projectile"));
});
