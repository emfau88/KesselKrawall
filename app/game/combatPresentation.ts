import type { CombatEvent, Side } from "./types";
import {
  POISON_CAP,
  POISON_DECAY_PER_TICK,
} from "./simulation";

export type CombatBeatTier = "hero" | "standard" | "ambient";

export interface TimedCombatStatus {
  stacks: number;
  nextTickAt: number;
  expiresAt: number;
  interval: number;
}

export interface CombatSideStatus {
  poison: TimedCombatStatus;
  burn: TimedCombatStatus;
  rage: boolean;
}

export interface CombatStatusSnapshot {
  player: CombatSideStatus;
  enemy: CombatSideStatus;
}

export interface CombatContribution {
  id: string;
  actor: Side;
  sourceUid: string;
  event: CombatEvent;
  snapshot: CombatEvent;
  events: CombatEvent[];
  label: string;
  amountLabel: string;
}

export interface CombatBeat {
  id: string;
  time: number;
  event: CombatEvent;
  snapshot: CombatEvent;
  events: CombatEvent[];
  contributions: CombatContribution[];
  activeUids: string[];
  label: string;
  amountLabel: string;
  tier: CombatBeatTier;
  statuses: CombatStatusSnapshot;
}

interface MutableSideStatus {
  poison: number;
  burn: Map<string, number>;
  rage: boolean;
}

interface AtomicCombatBeat extends CombatBeat {
  firstUse: boolean;
}

export interface CombatBeatTiming {
  holdMs: number;
  shotDurationMs: number;
  shotStaggerMs: number;
  visibleMs: number;
  recoveryMs: number;
}

const POISON_INTERVAL_MS = 2_000;
const BURN_INTERVAL_MS = 1_000;
const ATTACK_VOLLEY_WINDOW_MS = 1_300;
const STATUS_BUNDLE_WINDOW_MS = 1_800;
const MAX_VOLLEY_CONTRIBUTIONS = 5;
const PRESENTATION_ADVANCE_FACTOR = 0.9;
const MINIMUM_RECOVERY_RATIO = 0.5;
const ABSOLUTE_MINIMUM_RECOVERY_MS = 50;

function emptyTimedStatus(): TimedCombatStatus {
  return { stacks: 0, nextTickAt: 0, expiresAt: 0, interval: 0 };
}

function emptySideStatus(): CombatSideStatus {
  return {
    poison: emptyTimedStatus(),
    burn: emptyTimedStatus(),
    rage: false,
  };
}

export function createEmptyCombatStatuses(): CombatStatusSnapshot {
  return {
    player: emptySideStatus(),
    enemy: emptySideStatus(),
  };
}

export function isStatusTick(event: CombatEvent): boolean {
  return (
    (event.kind === "poison" || event.kind === "burn") &&
    event.label.includes("tickt")
  );
}

export interface ImportantCombatMessage {
  event: CombatEvent;
  label: string;
  amountLabel: string;
}

function importantMessagePriority(event: CombatEvent): number {
  if (event.kind === "boss") return 3;
  if (event.kind === "poisonBurst") return 2;
  if (event.kind === "synergy") return 2;
  if (event.kind === "cleanse") return 1;
  return 0;
}

export function getImportantCombatMessage(
  events: readonly CombatEvent[],
): ImportantCombatMessage | null {
  let selected: CombatEvent | null = null;
  let selectedPriority = 0;

  for (const event of events) {
    const priority = importantMessagePriority(event);
    if (priority > selectedPriority) {
      selected = event;
      selectedPriority = priority;
    }
  }

  if (!selected) return null;
  return {
    event: selected,
    label: selected.label,
    amountLabel: summarizeEventAmounts([selected]),
  };
}

function summarizeEventAmounts(events: CombatEvent[]): string {
  const totals = new Map<
    string,
    { amount: number; format: (amount: number) => string }
  >();

  for (const event of events) {
    const statusDamage = isStatusTick(event);
    let key = "damage";
    let format = (amount: number) => `−${amount} LP`;

    if (event.kind === "poisonBurst") {
      key = "poisonBurst";
      format = (amount) => `−${amount} LP`;
    } else if (event.kind === "heal") {
      key = "heal";
      format = (amount) => `+${amount} LP`;
    } else if (event.kind === "shield" || event.kind === "synergy") {
      key = "shield";
      format = (amount) => `+${amount} Schild`;
    } else if (event.kind === "cleanse") {
      key = "cleanse";
      format = (amount) => `−${amount} Gift`;
    } else if (event.kind === "poison" && !statusDamage) {
      key = "poison";
      format = (amount) => `+${amount} Gift`;
    } else if (event.kind === "burn" && !statusDamage) {
      key = "burn";
      format = (amount) => `+${amount} Brand`;
    } else if (event.kind === "boss") {
      key = "boss";
      format = (amount) => `+${amount}%`;
    }

    const current = totals.get(key);
    totals.set(key, {
      amount: (current?.amount ?? 0) + event.amount,
      format,
    });
  }

  return [...totals.values()]
    .map(({ amount, format }) => format(amount))
    .join(" · ");
}

function createContributions(events: CombatEvent[]): CombatContribution[] {
  const grouped = new Map<string, CombatEvent[]>();

  for (const event of events) {
    const key = `${event.actor}:${event.sourceUid}`;
    const current = grouped.get(key);
    if (current) current.push(event);
    else grouped.set(key, [event]);
  }

  return [...grouped.values()].map((contributionEvents, index) => {
    const event = contributionEvents[0];
    const snapshot = contributionEvents[contributionEvents.length - 1];
    const tick = isStatusTick(event);
    return {
      id: `${event.time}:${event.actor}:${event.sourceUid}:${index}`,
      actor: event.actor,
      sourceUid: event.sourceUid,
      event,
      snapshot,
      events: contributionEvents,
      label: tick
        ? event.kind === "poison"
          ? "Gift"
          : "Brand"
        : event.label,
      amountLabel: summarizeEventAmounts(contributionEvents),
    };
  });
}

function applyStatusEvent(
  statuses: Record<Side, MutableSideStatus>,
  event: CombatEvent,
): void {
  const targetStatus = statuses[event.target];

  if (isStatusTick(event)) {
    if (event.kind === "poison") {
      targetStatus.poison = Math.max(
        0,
        targetStatus.poison - POISON_DECAY_PER_TICK,
      );
      return;
    }
    const current = targetStatus.burn.get(event.sourceUid) ?? 0;
    if (current <= 1) targetStatus.burn.delete(event.sourceUid);
    else targetStatus.burn.set(event.sourceUid, current - 1);
    return;
  }

  if (event.kind === "poison") {
    targetStatus.poison = Math.min(
      POISON_CAP,
      targetStatus.poison + event.amount,
    );
  } else if (event.kind === "poisonBurst") {
    targetStatus.poison = 0;
  } else if (event.kind === "burn") {
    targetStatus.burn.set(
      event.sourceUid,
      (targetStatus.burn.get(event.sourceUid) ?? 0) + event.amount,
    );
  } else if (event.kind === "cleanse") {
    targetStatus.poison = 0;
  } else if (event.kind === "boss") {
    statuses[event.actor].rage = true;
  }
}

function timedPoisonAt(
  stacks: number,
  time: number,
): TimedCombatStatus {
  if (stacks <= 0) return emptyTimedStatus();
  const nextTickAt =
    Math.floor(time / POISON_INTERVAL_MS) * POISON_INTERVAL_MS +
    POISON_INTERVAL_MS;
  const remainingTicks = Math.ceil(stacks / POISON_DECAY_PER_TICK);
  return {
    stacks,
    nextTickAt,
    expiresAt: nextTickAt + (remainingTicks - 1) * POISON_INTERVAL_MS,
    interval: POISON_INTERVAL_MS,
  };
}

function timedStatusAt(
  status: Map<string, number>,
  time: number,
  interval: number,
): TimedCombatStatus {
  const values = [...status.values()].filter((value) => value > 0);
  if (values.length === 0) return emptyTimedStatus();

  const stacks = values.reduce((total, value) => total + value, 0);
  const longestSource = Math.max(...values);
  const nextTickAt = Math.floor(time / interval) * interval + interval;

  return {
    stacks,
    nextTickAt,
    expiresAt: nextTickAt + (longestSource - 1) * interval,
    interval,
  };
}

function snapshotStatuses(
  statuses: Record<Side, MutableSideStatus>,
  time: number,
): CombatStatusSnapshot {
  const snapshotSide = (side: Side): CombatSideStatus => ({
    poison: timedPoisonAt(statuses[side].poison, time),
    burn: timedStatusAt(statuses[side].burn, time, BURN_INTERVAL_MS),
    rage: statuses[side].rage,
  });

  return {
    player: snapshotSide("player"),
    enemy: snapshotSide("enemy"),
  };
}

function eventPriority(event: CombatEvent): number {
  if (event.kind === "boss") return 10_000;
  if (event.playerHp <= 0 || event.enemyHp <= 0) return 9_000;
  if (event.kind === "synergy") return 8_000;
  if (event.kind === "damage" || event.kind === "poisonBurst") {
    return 5_000 + event.amount;
  }
  if (event.kind === "heal" || event.kind === "shield") {
    return 4_000 + event.amount;
  }
  if (!isStatusTick(event)) return 3_000 + event.amount;
  return 1_000 + event.amount;
}

function primaryEvent(events: CombatEvent[]): CombatEvent {
  return events.reduce((best, event) =>
    eventPriority(event) > eventPriority(best) ? event : best,
  );
}

function atomicLabel(
  events: CombatEvent[],
  contributions: CombatContribution[],
): string {
  const first = events[0];
  if (isStatusTick(first)) {
    return `${first.kind === "poison" ? "Gift" : "Brand"} tickt${
      contributions.length > 1 ? ` · ${contributions.length} Quellen` : ""
    }`;
  }
  if (events.length > 1) return `${first.label} · ${events.length} Effekte`;
  return first.label;
}

function createAtomicCombatBeats(events: CombatEvent[]): AtomicCombatBeat[] {
  const beats: AtomicCombatBeat[] = [];
  const seenItemSources = new Set<string>();
  const statuses: Record<Side, MutableSideStatus> = {
    player: { poison: 0, burn: new Map(), rage: false },
    enemy: { poison: 0, burn: new Map(), rage: false },
  };

  for (let index = 0; index < events.length; ) {
    const first = events[index];
    const firstIsStatus = isStatusTick(first);
    const grouped = [first];
    let cursor = index + 1;

    while (cursor < events.length) {
      const candidate = events[cursor];
      if (candidate.time !== first.time) break;

      const sameStatusWave =
        firstIsStatus &&
        isStatusTick(candidate) &&
        candidate.kind === first.kind &&
        candidate.target === first.target;
      const sameItemActivation =
        !firstIsStatus &&
        !isStatusTick(candidate) &&
        candidate.actor === first.actor &&
        candidate.sourceUid === first.sourceUid;

      if (!sameStatusWave && !sameItemActivation) break;
      grouped.push(candidate);
      cursor += 1;
    }

    for (const event of grouped) applyStatusEvent(statuses, event);

    const snapshot = grouped[grouped.length - 1];
    const contributions = createContributions(grouped);
    const firstUse =
      !firstIsStatus &&
      first.kind !== "synergy" &&
      first.kind !== "boss" &&
      !seenItemSources.has(first.sourceUid);
    if (firstUse) seenItemSources.add(first.sourceUid);
    const isClimax =
      grouped.some(
        (event) =>
          event.kind === "boss" ||
          event.kind === "synergy" ||
          event.playerHp <= 0 ||
          event.enemyHp <= 0,
      );
    const tier: CombatBeatTier = isClimax || firstUse
      ? "hero"
      : firstIsStatus
        ? "ambient"
        : "standard";

    beats.push({
      id: `${first.time}:${first.actor}:${first.sourceUid}:${index}`,
      time: first.time,
      event: primaryEvent(grouped),
      snapshot,
      events: grouped,
      contributions,
      activeUids: [...new Set(grouped.map((event) => event.sourceUid))],
      label: atomicLabel(grouped, contributions),
      amountLabel: summarizeEventAmounts(grouped),
      tier,
      statuses: snapshotStatuses(statuses, snapshot.time),
      firstUse,
    });
    index = cursor;
  }

  return beats;
}

function mergeCompactBeats(beats: AtomicCombatBeat[]): CombatBeat[] {
  const merged: CombatBeat[] = [];

  for (let index = 0; index < beats.length; ) {
    const first = beats[index];
    if (first.tier === "hero") {
      merged.push(first);
      index += 1;
      continue;
    }

    const group = [first];
    let contributionCount = first.contributions.length;
    const statusBundle = first.tier === "ambient";
    let cursor = index + 1;

    while (cursor < beats.length) {
      const candidate = beats[cursor];
      if (candidate.tier === "hero") break;
      if ((candidate.tier === "ambient") !== statusBundle) break;
      const bundleWindow = statusBundle
        ? STATUS_BUNDLE_WINDOW_MS
        : ATTACK_VOLLEY_WINDOW_MS;
      if (candidate.time - first.time > bundleWindow) break;
      if (
        contributionCount + candidate.contributions.length >
        MAX_VOLLEY_CONTRIBUTIONS
      ) {
        break;
      }

      group.push(candidate);
      contributionCount += candidate.contributions.length;
      cursor += 1;
    }

    if (group.length === 1) {
      merged.push(first);
      index += 1;
      continue;
    }

    const groupedEvents = group.flatMap((beat) => beat.events);
    const contributions = group.flatMap((beat) => beat.contributions);
    const last = group[group.length - 1];
    const event = primaryEvent(groupedEvents);
    const tier: CombatBeatTier = group.some((beat) => beat.tier === "standard")
      ? "standard"
      : "ambient";
    const activeUids = [
      ...new Set(contributions.map((contribution) => contribution.sourceUid)),
    ];
    const actors = new Set(
      contributions.map((contribution) => contribution.actor),
    );

    merged.push({
      id: `${first.id}:bundle:${last.id}`,
      time: last.time,
      event,
      snapshot: last.snapshot,
      events: groupedEvents,
      contributions,
      activeUids,
      label:
        statusBundle
          ? contributions.length > 1
            ? "Statuswirkungen ticken gebündelt"
            : first.label
          : contributions.length > 1
            ? actors.size > 1
              ? `${contributions.length}er-Schlagabtausch`
              : event.actor === "player"
                ? `Deine ${contributions.length}er-Salve`
                : `Gegnerische ${contributions.length}er-Salve`
          : first.label,
      amountLabel: summarizeEventAmounts(groupedEvents),
      tier,
      statuses: last.statuses,
    });
    index = cursor;
  }

  return merged;
}

export function createCombatBeats(events: CombatEvent[]): CombatBeat[] {
  return mergeCompactBeats(createAtomicCombatBeats(events));
}

export function getCombatBeatTiming(
  beat: CombatBeat,
  previousBeatTime: number,
  speed: number,
): CombatBeatTiming {
  const baseTiming =
    beat.event.kind === "boss"
      ? {
          holdMs: 2_400,
          shotDurationMs: 1_900,
          staggerMs: 460,
          recoveryMs: 500,
        }
      : beat.tier === "hero"
        ? {
            holdMs: 1_750,
            shotDurationMs: 1_400,
            staggerMs: 420,
            recoveryMs: 350,
          }
        : beat.tier === "standard"
          ? {
              holdMs: 1_300,
              shotDurationMs: 1_050,
              staggerMs: 360,
              recoveryMs: 250,
            }
          : {
              holdMs: 650,
              shotDurationMs: 500,
              staggerMs: 180,
              recoveryMs: 150,
            };
  const speedFactor = speed <= 1 ? 1 : speed <= 2 ? 0.62 : 0.4;
  const shotCount = Math.max(1, beat.contributions.length);
  const shotStaggerMs = Math.round(baseTiming.staggerMs * speedFactor);
  const shotDurationMs = Math.round(
    baseTiming.shotDurationMs * speedFactor,
  );
  const volleySpanMs = shotStaggerMs * (shotCount - 1);
  const visibleMs = shotDurationMs + volleySpanMs;
  const maximumHoldMs =
    Math.round(baseTiming.holdMs * speedFactor) + volleySpanMs;
  // Dense beats trim only post-impact recovery; their complete VFX window stays intact.
  const minimumRecoveryMs = Math.max(
    ABSOLUTE_MINIMUM_RECOVERY_MS,
    Math.round(
      baseTiming.recoveryMs * MINIMUM_RECOVERY_RATIO * speedFactor,
    ),
  );
  const minimumHoldMs = visibleMs + minimumRecoveryMs;
  const gameAdvanceMs = Math.max(0, beat.time - previousBeatTime);
  const gameAdvanceHoldMs =
    Math.round(
      gameAdvanceMs * PRESENTATION_ADVANCE_FACTOR * speedFactor,
    ) + volleySpanMs;
  const holdMs = Math.max(
    minimumHoldMs,
    Math.min(maximumHoldMs, gameAdvanceHoldMs),
  );

  return {
    holdMs,
    shotDurationMs,
    shotStaggerMs,
    visibleMs,
    recoveryMs: Math.max(0, holdMs - visibleMs),
  };
}
