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
  createdAt: number;
  expiresAt: number;
}

export const FLOATING_NUMBER_LIFETIME_MS = 1_150;

function getFloatingNumberType(
  event: CombatEvent,
): FloatingCombatNumberType | null {
  if (event.kind === "damage") return "damage";
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
      createdAt: presentationTime,
      expiresAt: presentationTime + lifetime,
    });
  });

  return numbers;
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
