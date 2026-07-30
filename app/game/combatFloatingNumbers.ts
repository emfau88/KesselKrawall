import { isStatusTick } from "./combatPresentation";
import type { CombatEvent, Side } from "./types";

export type FloatingCombatNumberType =
  | "damage"
  | "heal"
  | "shield"
  | "poison"
  | "burn";

export interface FloatingCombatNumber {
  id: string;
  target: Side;
  type: FloatingCombatNumberType;
  value: number;
  hitCount: number;
  lastHitAt: number;
  createdAt: number;
  expiresAt: number;
}

export const FLOATING_NUMBER_LIFETIME_MS = 1_150;
export const FLOATING_NUMBER_BUNDLE_WINDOW_MS = 300;
export const STATUS_NUMBER_BUNDLE_WINDOW_MS = 450;
export const MAX_ACTIVE_FLOATING_NUMBERS_PER_SIDE = 2;

function getFloatingNumberType(
  event: CombatEvent,
): FloatingCombatNumberType | null {
  if (event.kind === "damage") return "damage";
  if (event.kind === "poisonBurst") return "poison";
  if (event.kind === "heal") return "heal";
  if (event.kind === "shield" || event.kind === "synergy") return "shield";
  if (!isStatusTick(event)) return null;
  if (event.kind === "poison") return "poison";
  if (event.kind === "burn") return "burn";
  return null;
}

export function createFloatingCombatNumbers({
  events,
  idPrefix,
  presentationTime,
  lifetime = FLOATING_NUMBER_LIFETIME_MS,
}: {
  events: readonly CombatEvent[];
  idPrefix: string;
  presentationTime: number;
  lifetime?: number;
}): FloatingCombatNumber[] {
  const numbers: FloatingCombatNumber[] = [];

  events.forEach((event, index) => {
    const type = getFloatingNumberType(event);
    if (!type || event.amount <= 0) return;
    numbers.push({
      id: `${idPrefix}-${index}-${type}`,
      target: event.target,
      type,
      value: event.amount,
      hitCount: 1,
      lastHitAt: presentationTime,
      createdAt: presentationTime,
      expiresAt: presentationTime + lifetime,
    });
  });

  return numbers;
}

function getBundleWindow(type: FloatingCombatNumberType): number {
  return type === "poison" || type === "burn"
    ? STATUS_NUMBER_BUNDLE_WINDOW_MS
    : FLOATING_NUMBER_BUNDLE_WINDOW_MS;
}

function limitNumbersPerSide(
  numbers: readonly FloatingCombatNumber[],
): FloatingCombatNumber[] {
  const keptIds = new Set(
    (["player", "enemy"] as const).flatMap((target) =>
      numbers
        .filter((number) => number.target === target)
        .slice(-MAX_ACTIVE_FLOATING_NUMBERS_PER_SIDE)
        .map((number) => number.id),
    ),
  );
  return numbers.filter((number) => keptIds.has(number.id));
}

export function mergeFloatingCombatNumbers(
  existing: readonly FloatingCombatNumber[],
  incoming: readonly FloatingCombatNumber[],
): FloatingCombatNumber[] {
  let merged = [...existing];

  for (const number of incoming) {
    const bundleWindow = getBundleWindow(number.type);
    const recentMatches = merged.filter(
      (candidate) =>
        candidate.target === number.target &&
        candidate.type === number.type &&
        number.lastHitAt >= candidate.lastHitAt &&
        number.lastHitAt - candidate.lastHitAt <= bundleWindow,
    );
    const existingBundle = recentMatches.find(
      (candidate) => candidate.hitCount >= 3,
    );

    if (existingBundle) {
      merged = merged.filter(
        (candidate) => candidate.id !== existingBundle.id,
      );
      merged.push({
        ...number,
        id: `${number.id}-bundle-${existingBundle.hitCount + 1}`,
        value: existingBundle.value + number.value,
        hitCount: existingBundle.hitCount + 1,
      });
    } else if (recentMatches.length >= 2) {
      const bundledValue =
        recentMatches.reduce(
          (total, candidate) => total + candidate.value,
          0,
        ) + number.value;
      const bundledHits =
        recentMatches.reduce(
          (total, candidate) => total + candidate.hitCount,
          0,
        ) + number.hitCount;
      const matchedIds = new Set(
        recentMatches.map((candidate) => candidate.id),
      );
      merged = merged.filter(
        (candidate) => !matchedIds.has(candidate.id),
      );
      merged.push({
        ...number,
        id: `${number.id}-bundle-${bundledHits}`,
        value: bundledValue,
        hitCount: bundledHits,
      });
    } else {
      merged.push(number);
    }

    merged = limitNumbersPerSide(merged);
  }

  return merged;
}

export function pruneExpiredFloatingNumbers(
  numbers: readonly FloatingCombatNumber[],
  presentationTime: number,
): readonly FloatingCombatNumber[] {
  if (!numbers.some((number) => number.expiresAt <= presentationTime)) {
    return numbers;
  }
  return numbers.filter((number) => number.expiresAt > presentationTime);
}
