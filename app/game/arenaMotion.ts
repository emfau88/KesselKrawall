export type SpectatorPose = {
  lean: number;
  rise: number;
  head: number;
  leftArm: number;
  leftElbow: number;
  rightArm: number;
  rightElbow: number;
  stretch: number;
};

export const CHEER_DURATION = 4.2;
const REST: SpectatorPose = {
  lean: 0, rise: 0, head: 0,
  leftArm: .14, leftElbow: -.22, rightArm: -.14, rightElbow: .22, stretch: 1,
};
const KEYS: readonly { time: number; pose: SpectatorPose }[] = [
  { time: 0, pose: REST },
  { time: .3, pose: { ...REST, rise: 8, lean: -.025, head: .045, stretch: .96 } },
  { time: .78, pose: { lean: -.035, rise: -15, head: -.065, leftArm: 2.45, leftElbow: .4, rightArm: -2.7, rightElbow: -.12, stretch: 1.04 } },
  { time: 1.12, pose: { lean: .025, rise: -8, head: .05, leftArm: 2.7, leftElbow: -.1, rightArm: -2.35, rightElbow: -.5, stretch: 1.02 } },
  { time: 1.52, pose: { lean: -.03, rise: -16, head: -.05, leftArm: 2.38, leftElbow: .44, rightArm: -2.75, rightElbow: .08, stretch: 1.045 } },
  { time: 1.94, pose: { lean: .025, rise: -7, head: .045, leftArm: 2.72, leftElbow: -.12, rightArm: -2.4, rightElbow: -.38, stretch: 1.015 } },
  { time: 2.36, pose: { lean: -.02, rise: -12, head: -.035, leftArm: 2.48, leftElbow: .27, rightArm: -2.67, rightElbow: -.14, stretch: 1.03 } },
  { time: 2.85, pose: { ...REST, rise: -3, head: .045, leftArm: .65, leftElbow: -.32, rightArm: -.48, rightElbow: .2, stretch: 1.012 } },
  { time: 3.4, pose: { ...REST, rise: 3, head: -.025, leftArm: .08, rightArm: -.09, stretch: .99 } },
  { time: CHEER_DURATION, pose: REST },
];

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function blendPoses(a: SpectatorPose, b: SpectatorPose, weight: number): SpectatorPose {
  const t = Math.max(0, Math.min(1, weight));
  return Object.fromEntries(Object.keys(a).map((key) => {
    const field = key as keyof SpectatorPose;
    return [field, a[field] + (b[field] - a[field]) * t];
  })) as SpectatorPose;
}

/** Curated poses, with a small phase offset between the two elbows. */
export function cheerPose(time: number): SpectatorPose {
  if (time <= 0 || time >= CHEER_DURATION) return { ...REST };
  const next = KEYS.findIndex((key) => key.time >= time);
  const a = KEYS[next - 1];
  const b = KEYS[next];
  return blendPoses(a.pose, b.pose, smooth((time - a.time) / (b.time - a.time)));
}

export function idlePose(time: number): SpectatorPose {
  return {
    ...REST,
    lean: Math.sin(time * .8) * .015,
    rise: Math.sin(time * 1.45) * 1.5,
    head: Math.sin(time * .66 + .7) * .035,
    leftArm: REST.leftArm + Math.sin(time * .93) * .018,
    rightArm: REST.rightArm + Math.sin(time * .93 + .9) * .018,
    stretch: 1 + Math.sin(time * 1.45) * .009,
  };
}

/** The hanging bar and attachment loops are pinned; the hem lags behind. */
export function clothVertex(
  x: number, y: number, width: number, height: number, time: number, gust: number,
): [number, number] {
  const depth = Math.max(0, (y / height - .15) / .85);
  const freedom = depth * depth;
  const cross = x / width;
  const slowWave = Math.sin(time * 1.65 - depth * 4.8);
  const fold = Math.sin(cross * 7.5 + time * 1.2 - depth * 3.5);
  const strength = 1 + Math.max(0, gust) * 1.2;
  return [
    x + freedom * strength * (slowWave * width * .065 + fold * width * .018)
      + (cross - .5) * width * depth * -.02 * Math.sin(time * 1.65 - depth * 4),
    y + freedom * strength * Math.sin(cross * 6.2 - depth * 2.8 + time * 1.65) * height * .012,
  ];
}

export function windGust(timeSinceTrigger: number): number {
  if (timeSinceTrigger < 0 || timeSinceTrigger > 3.5) return 0;
  return Math.sin(Math.min(1, timeSinceTrigger / .45) * Math.PI / 2)
    * Math.exp(-timeSinceTrigger * .9);
}
