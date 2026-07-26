import type { CombatEvent, Side } from "./types";

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
  actor: Side;
  sourceUid: string;
  event: CombatEvent;
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
  poison: Map<string, number>;
  burn: Map<string, number>;
  rage: boolean;
}

interface AtomicCombatBeat extends CombatBeat {
  firstUse: boolean;
}

const POISON_INTERVAL_MS = 2_000;
const BURN_INTERVAL_MS = 1_000;
const COMPACT_WINDOW_MS = 900;
const MAX_COMPACT_SOURCES = 3;

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

function summarizeEventAmounts(events: CombatEvent[]): string {
  const totals = new Map<
    string,
    { amount: number; format: (amount: number) => string }
  >();

  for (const event of events) {
    const statusDamage = isStatusTick(event);
    let key = "damage";
    let format = (amount: number) => `−${amount} LP`;

    if (event.kind === "heal") {
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

  return [...grouped.values()].map((contributionEvents) => {
    const event = contributionEvents[0];
    const tick = isStatusTick(event);
    return {
      actor: event.actor,
      sourceUid: event.sourceUid,
      event,
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
    const status = event.kind === "poison"
      ? targetStatus.poison
      : targetStatus.burn;
    const current = status.get(event.sourceUid) ?? 0;
    if (current <= 1) status.delete(event.sourceUid);
    else status.set(event.sourceUid, current - 1);
    return;
  }

  if (event.kind === "poison") {
    targetStatus.poison.set(
      event.sourceUid,
      (targetStatus.poison.get(event.sourceUid) ?? 0) + event.amount,
    );
  } else if (event.kind === "burn") {
    targetStatus.burn.set(
      event.sourceUid,
      (targetStatus.burn.get(event.sourceUid) ?? 0) + event.amount,
    );
  } else if (event.kind === "cleanse") {
    targetStatus.poison.clear();
  } else if (event.kind === "boss") {
    statuses[event.actor].rage = true;
  }
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
    poison: timedStatusAt(
      statuses[side].poison,
      time,
      POISON_INTERVAL_MS,
    ),
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
  if (event.kind === "damage") return 5_000 + event.amount;
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
    player: { poison: new Map(), burn: new Map(), rage: false },
    enemy: { poison: new Map(), burn: new Map(), rage: false },
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
    const sources = new Set(first.activeUids);
    let cursor = index + 1;

    while (cursor < beats.length) {
      const candidate = beats[cursor];
      if (candidate.tier === "hero") break;
      if (candidate.time - first.time > COMPACT_WINDOW_MS) break;
      if (candidate.event.actor !== first.event.actor) break;

      const nextSources = new Set([...sources, ...candidate.activeUids]);
      if (nextSources.size > MAX_COMPACT_SOURCES) break;

      group.push(candidate);
      for (const uid of candidate.activeUids) sources.add(uid);
      cursor += 1;
    }

    if (group.length === 1) {
      merged.push(first);
      index += 1;
      continue;
    }

    const groupedEvents = group.flatMap((beat) => beat.events);
    const contributions = createContributions(groupedEvents);
    const last = group[group.length - 1];
    const event = primaryEvent(groupedEvents);
    const tier: CombatBeatTier = group.some((beat) => beat.tier === "standard")
      ? "standard"
      : "ambient";

    merged.push({
      id: `${first.id}:bundle:${last.id}`,
      time: last.time,
      event,
      snapshot: last.snapshot,
      events: groupedEvents,
      contributions,
      activeUids: [...sources],
      label:
        contributions.length > 1
          ? event.actor === "player"
            ? "Deine Zutaten bündeln"
            : "Gegnerische Zutaten bündeln"
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

export function getBeatHoldMs(
  beat: CombatBeat,
  speed: number,
): number {
  const base =
    beat.event.kind === "boss"
      ? 1_180
      : beat.tier === "hero"
        ? 820
        : beat.tier === "standard"
          ? 540
          : 360;
  const speedFactor = speed <= 1 ? 1 : speed <= 2 ? 0.68 : 0.46;
  const minimum =
    beat.tier === "hero"
      ? speed <= 1
        ? 660
        : 360
      : beat.tier === "standard"
        ? speed <= 1
          ? 440
          : 260
        : speed <= 1
          ? 280
          : 180;
  return Math.round(Math.max(minimum, base * speedFactor));
}

export function getBeatVisibleMs(
  beat: CombatBeat,
  holdMs: number,
): number {
  const ratio =
    beat.tier === "hero" ? 0.76 : beat.tier === "standard" ? 0.66 : 0.46;
  return Math.max(150, Math.round(holdMs * ratio));
}
