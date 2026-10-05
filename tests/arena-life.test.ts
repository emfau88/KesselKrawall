import assert from "node:assert/strict";
import test from "node:test";
import { ARENA_PLATE, ARENA_FIRES, fitArenaPlate, isArenaBoundsVisible, emberAt, lightStrength, candleMotion, vaporVertex } from "../app/game/arenaLife";

test("cropped corner effects are skipped, and become visible in a wide arena", () => {
  const corners = [
    { left: -27, right: 187, top: 532, bottom: 743 },
    { left: 1493, right: 1707, top: 532, bottom: 743 },
    { left: 1548, right: 1646, top: 118, bottom: 256 },
  ];
  for (const [width, height] of [[1020, 824], [390, 709]]) {
    for (const bounds of corners) assert.equal(isArenaBoundsVisible(bounds, fitArenaPlate(width, height), width, height), false);
  }
  for (const bounds of corners) assert.equal(isArenaBoundsVisible(bounds, fitArenaPlate(1672, 941), 1672, 941), true);
});

test("partially visible effects keep rendering until their entire bounds leave the view", () => {
  const fit = fitArenaPlate(1672, 941);
  assert.ok(isArenaBoundsVisible({ left: -50, right: 1, top: 100, bottom: 150 }, fit, 1672, 941));
  assert.equal(isArenaBoundsVisible({ left: -50, right: -1, top: 100, bottom: 150 }, fit, 1672, 941), false);
});

test("fire anchors follow the same centered cover crop as the background on desktop, mobile and portal", () => {
  for (const [width, height] of [[1020, 825], [390, 711], [521, 401], [1600, 900]]) {
    const fit = fitArenaPlate(width, height);
    assert.ok(ARENA_PLATE.width * fit.scale >= width);
    assert.ok(ARENA_PLATE.height * fit.scale >= height);
    assert.equal(fit.x + ARENA_PLATE.width * fit.scale / 2, width / 2);
    assert.equal(fit.y + ARENA_PLATE.height * fit.scale / 2, height / 2);
    for (const fire of ARENA_FIRES) {
      const x = fit.x + fire.x * fit.scale;
      const y = fit.y + fire.y * fit.scale;
      assert.ok(x > 0 && x < width && y > 0 && y < height);
    }
  }
});

test("sparks stay close to their source, fade out and have actual quiet gaps", () => {
  for (let index = 0; index < 8; index++) {
    let quiet = false;
    let visible = false;
    for (let time = 0; time < 12; time += .03) {
      const spark = emberAt(time, index);
      assert.ok(Number.isFinite(spark.x) && Number.isFinite(spark.y));
      assert.ok(spark.alpha >= 0 && spark.alpha <= .52);
      if (spark.alpha) {
        visible = true;
        assert.ok(spark.y < 0 && spark.y > -70 && Math.abs(spark.x) < 22);
      } else quiet = true;
    }
    assert.ok(quiet && visible);
  }
});

test("lamp fluctuations remain soft and continuous, with different phases", () => {
  let differs = false;
  for (let time = 0; time < 20; time += .03) {
    const value = lightStrength(time, .2);
    assert.ok(value >= .89 && value <= 1.11);
    assert.ok(Math.abs(value - lightStrength(time + .016, .2)) < .006);
    if (Math.abs(value - lightStrength(time, .8)) > .01) differs = true;
  }
  assert.ok(differs);
});

test("candle motion stays upright, lit and steady at the wick through different phases", () => {
  for (let index = 0; index < 21; index++) {
    for (let time = 0; time < 15; time += .04) {
      const motion = candleMotion(time, index);
      assert.ok(Math.abs(motion.lean) <= .055);
      assert.ok(motion.stretch >= .955 && motion.stretch <= 1.045);
      assert.ok(motion.alpha >= .675 && motion.alpha <= .765);
      const next = candleMotion(time + 1 / 30, index);
      assert.ok(Math.abs(next.alpha - motion.alpha) < .005);
    }
  }
});

test("vapor deformation keeps the bowl source fixed and has small continuous motion", () => {
  for (let time = 0; time < 10; time += .03) {
    assert.deepEqual(vaporVertex(128, 237, time), [0, 0]);
    for (const [x, y] of [[20, 30], [128, 100], [230, 190]]) {
      const now = vaporVertex(x, y, time);
      const next = vaporVertex(x, y, time + 1 / 30);
      assert.ok(Math.abs(now[0] - (x - 128)) < 3.5);
      assert.ok(Math.abs(now[1] - (y - 237)) < 1.4);
      assert.ok(Math.abs(next[0] - now[0]) < .12);
      assert.ok(Math.abs(next[1] - now[1]) < .06);
    }
  }
});
