import { isStatusTick } from "./combatPresentation";
import type { Board, CombatEvent, Side } from "./types";

export type CombatActivationTimeline = ReadonlyMap<string, readonly number[]>;

export interface CombatCooldownState {
  progress: number;
  lastActivationAt: number | null;
  nextActivationAt: number | null;
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createCombatActivationTimeline(
  events: readonly CombatEvent[],
  board: Board,
  side: Side,
): CombatActivationTimeline {
  const timesByUid = new Map<string, number[]>();

  for (const instance of board) {
    if (instance) timesByUid.set(instance.uid, []);
  }

  for (const event of events) {
    const times = timesByUid.get(event.sourceUid);
    if (!times || event.actor !== side || isStatusTick(event)) continue;
    times.push(event.time);
  }

  for (const [uid, times] of timesByUid) {
    const sortedUniqueTimes = [...new Set(times)].sort(
      (left, right) => left - right,
    );
    timesByUid.set(uid, sortedUniqueTimes);
  }

  return timesByUid;
}

export function getCombatCooldownState({
  battleTime,
  activationTimes,
  fallbackCooldown,
  startsReady = false,
}: {
  battleTime: number;
  activationTimes: readonly number[];
  fallbackCooldown: number;
  startsReady?: boolean;
}): CombatCooldownState {
  const shownTime = Math.max(0, battleTime);
  let lastActivationAt: number | null = null;
  let nextActivationAt: number | null = null;

  for (const activationTime of activationTimes) {
    if (activationTime <= shownTime) {
      lastActivationAt = activationTime;
      continue;
    }
    nextActivationAt = activationTime;
    break;
  }

  if (lastActivationAt !== null && nextActivationAt !== null) {
    const interval = nextActivationAt - lastActivationAt;
    return {
      progress:
        interval > 0
          ? clampProgress((shownTime - lastActivationAt) / interval)
          : 0,
      lastActivationAt,
      nextActivationAt,
    };
  }

  if (lastActivationAt !== null) {
    return {
      progress:
        fallbackCooldown > 0
          ? clampProgress((shownTime - lastActivationAt) / fallbackCooldown)
          : 0,
      lastActivationAt,
      nextActivationAt: null,
    };
  }

  if (nextActivationAt !== null) {
    return {
      progress: startsReady
        ? 1
        : nextActivationAt > 0
          ? clampProgress(shownTime / nextActivationAt)
          : 0,
      lastActivationAt: null,
      nextActivationAt,
    };
  }

  return {
    progress:
      startsReady
        ? 1
        : fallbackCooldown > 0
          ? clampProgress(shownTime / fallbackCooldown)
          : 0,
    lastActivationAt: null,
    nextActivationAt: null,
  };
}
