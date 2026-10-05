import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CauldronFamilyEffects } from "../app/game/CauldronFamilyEffects";
import type { Board } from "../app/game/types";

function render(board: Board, suppressed = false) {
  return renderToStaticMarkup(createElement(CauldronFamilyEffects, { board, suppressed }));
}

test("family decoration stays absent below the synergy threshold", () => {
  assert.equal(render([null, { uid: "a", itemId: "chili", level: 2 }]), "");
});

test("merged levels activate their family without activating other families", () => {
  const html = render([
    { uid: "a", itemId: "chili", level: 2 },
    { uid: "b", itemId: "dragon-tooth", level: 1 },
    { uid: "c", itemId: "slime-shroom", level: 2 },
  ]);
  assert.match(html, /data-family="fire"/);
  assert.doesNotMatch(html, /data-family="poison"/);
  assert.match(html, /aria-hidden="true"/);
});

test("all five families have distinct decoration when active", () => {
  for (const [family, itemId] of [
    ["fire", "chili"], ["poison", "slime-shroom"], ["guard", "egg-shell"],
    ["frost", "frost-shard"], ["echo", "mirror-shard"],
  ]) {
    assert.match(render([{ uid: family, itemId, level: 3 }]), new RegExp(`data-family="${family}"`));
  }
});

test("suppressed cauldrons do not emit family decoration", () => {
  assert.equal(render([{ uid: "a", itemId: "chili", level: 3 }], true), "");
});
