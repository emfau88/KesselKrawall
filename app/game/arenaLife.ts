/** Coordinates refer to the painted background, before CSS object-fit: cover. */
export const ARENA_PLATE = { width: 1672, height: 941 };
export const ARENA_FIRES = [
  { x: 661, y: 357, height: 43, phase: .1 },
  { x: 756, y: 319, height: 29, phase: .37 },
  { x: 896, y: 320, height: 30, phase: .72 },
  { x: 991, y: 357, height: 44, phase: .93 },
] as const;

export const ARENA_CANDLES = [
  { x: 196, y: 438, height: 14 }, { x: 388, y: 434, height: 12 },
  { x: 478, y: 245, height: 8 }, { x: 496, y: 301, height: 9 },
  { x: 511, y: 314, height: 7 }, { x: 574, y: 351, height: 8 },
  { x: 588, y: 344, height: 10 }, { x: 92, y: 559, height: 15 },
  { x: 1080, y: 350, height: 10 }, { x: 1096, y: 355, height: 8 },
  { x: 1157, y: 312, height: 9 }, { x: 1173, y: 303, height: 12 },
  { x: 1184, y: 315, height: 9 }, { x: 1281, y: 429, height: 14 },
  { x: 1288, y: 442, height: 9 }, { x: 1399, y: 350, height: 14 },
  { x: 1387, y: 362, height: 7 }, { x: 1526, y: 336, height: 14 },
  { x: 1543, y: 348, height: 9 }, { x: 1588, y: 326, height: 13 },
  { x: 1580, y: 561, height: 18 },
] as const;

export const ARENA_VAPOR = [
  { x: 80, y: 725, height: 168, phase: .2, mirror: false },
  { x: 1600, y: 725, height: 168, phase: 3.6, mirror: true },
] as const;

export const ARENA_BANNERS = [
  { x: 644, y: 166, width: 83.2, phase: .1, alpha: .64 },
  { x: 944, y: 166, width: 83.2, phase: 1.8, alpha: .60 },
] as const;

/** Keep the vapor source fixed while small continuous waves travel upward. */
export function vaporVertex(x: number, y: number, time: number): [number, number] {
  const freedom = Math.max(0, (237 - y) / 237);
  return [x - 128 + freedom * (Math.sin(time * .85 - freedom * 5) * 2.4
    + Math.sin(time * 1.3 - freedom * 8 + x / 80) * 1.1),
  y - 237 + freedom * Math.sin(time * .9 - freedom * 4 + x / 120) * 1.4];
}

/** Separate source times keep the candles from blinking in unison. */
export function candleMotion(time: number, index: number) {
  return {
    lean: Math.sin(time * (2.1 + index % 3 * .17) + index * 1.7) * .055,
    stretch: 1 + Math.sin(time * 4.2 + index * 2.3) * .045,
    alpha: .72 + Math.sin(time * 3.1 + index * 1.3) * .045,
  };
}

export const ARENA_LIGHTS = [
  ...ARENA_FIRES.map((fire) => ({ ...fire, width: 130, lightHeight: 105, tint: 0xffa846, strength: .34 })),
  { x: 546, y: 159, width: 115, lightHeight: 155, phase: .2, tint: 0xffb65c, strength: .29 },
  { x: 1126, y: 161, width: 115, lightHeight: 155, phase: .8, tint: 0xffb65c, strength: .29 },
  { x: 1593, y: 193, width: 250, lightHeight: 280, phase: 1.2, tint: 0xff973d, strength: .20 },
  { x: 84, y: 718, width: 210, lightHeight: 175, phase: .6, tint: 0xb7dc35, strength: .13 },
  { x: 1600, y: 717, width: 210, lightHeight: 175, phase: 1.4, tint: 0xb7dc35, strength: .13 },
  ...ARENA_CANDLES.map((candle, index) => ({ ...candle, width: candle.height * 5,
    lightHeight: candle.height * 6, phase: index * .53, tint: 0xffbc62, strength: .20 })),
] as const;

export function fitArenaPlate(width: number, height: number) {
  const scale = Math.max(width / ARENA_PLATE.width, height / ARENA_PLATE.height);
  return { scale, x: (width - ARENA_PLATE.width * scale) / 2, y: (height - ARENA_PLATE.height * scale) / 2 };
}

/** Small, continuous fluctuations: never a strobe or an on/off blink. */
export function lightStrength(time: number, phase: number) {
  return 1 + Math.sin(time * 1.7 + phase * 9) * .075 + Math.sin(time * 4.3 + phase * 13) * .035;
}

/** Six to eight sparse sparks on desktop, four on a narrow arena. No particles cross the floor. */
export function emberAt(time: number, index: number) {
  const lifetime = 2.4 + index % 3 * .37;
  const cycle = lifetime + 1.9 + index % 2 * .6;
  const age = ((time + index * .73) % cycle + cycle) % cycle;
  const progress = Math.min(age / lifetime, 1);
  return {
    x: Math.sin(age * 2 + index) * (2 + age * 1.1) + (index % 2 ? 1 : -1) * age * 3,
    y: -4 - age * (15 + index % 3 * 2),
    alpha: age >= lifetime ? 0 : Math.min(1, age / .18) * Math.pow(1 - progress, .7) * .52,
  };
}
