import assert from "node:assert/strict";
import test from "node:test";
import { CHEER_DURATION, cheerPose, clothVertex, idlePose, windGust } from "../app/game/arenaMotion";

test("cloth attachment remains stationary even during a strong gust", () => {
  for (const time of [0, .4, 1.2, 5.7]) {
    for (const x of [0, 70, 220]) {
      assert.deepEqual(clothVertex(x, 35, 228, 456, time, 2), [x, 35]);
    }
  }
});

test("cloth hem moves while every sampled vertex remains finite", () => {
  assert.notDeepEqual(clothVertex(100, 450, 228, 456, 0, 0), clothVertex(100, 450, 228, 456, 1, 0));
  for (let time = 0; time < 8; time += .1) {
    for (let y = 0; y <= 456; y += 24) {
      const [x, vy] = clothVertex(100, y, 228, 456, time, windGust(time));
      assert.ok(Number.isFinite(x) && Number.isFinite(vy));
      assert.ok(Math.abs(x - 100) < 50);
    }
  }
});

test("cheer raises both arms and returns to a resting pose without sharp pose jumps", () => {
  const rest = cheerPose(0);
  const peak = cheerPose(1);
  assert.ok(peak.leftArm > 2 && peak.rightArm < -2);
  assert.deepEqual(cheerPose(CHEER_DURATION), rest);
  let previous = rest;
  for (let t = .005; t <= CHEER_DURATION; t += .005) {
    const current = cheerPose(t);
    for (const key of Object.keys(current) as (keyof typeof current)[]) {
      assert.ok(Number.isFinite(current[key]));
      assert.ok(Math.abs(current[key] - previous[key]) < .8);
    }
    previous = current;
  }
});

test("idle keeps the arms lowered and wind bursts expire", () => {
  assert.ok(Math.abs(idlePose(5).leftArm) < .2);
  assert.ok(Math.abs(idlePose(5).rightArm) < .2);
  assert.equal(windGust(-1), 0);
  assert.equal(windGust(4), 0);
  assert.ok(windGust(.5) > windGust(2));
});
