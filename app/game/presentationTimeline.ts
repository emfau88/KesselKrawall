export const MAX_SIMULATION_FRAME_MS = 100;
export const CLOCK_PAINT_INTERVAL_MS = 33;

export interface PresentationFrame {
  presentationTimeMs: number;
  presentationDeltaMs: number;
  simulationDeltaMs: number;
  wallTimeMs: number;
}

interface ScheduledPresentationTask {
  id: number;
  deadlineMs: number;
  run: () => void;
}

export class PresentationScheduler {
  private nextId = 0;
  private tasks: ScheduledPresentationTask[] = [];

  schedule(deadlineMs: number, run: () => void): number {
    const task = {
      id: this.nextId,
      deadlineMs: Math.max(0, deadlineMs),
      run,
    };
    this.nextId += 1;
    this.tasks.push(task);
    this.tasks.sort(
      (left, right) =>
        left.deadlineMs - right.deadlineMs || left.id - right.id,
    );
    return task.id;
  }

  flush(presentationTimeMs: number): number {
    let completed = 0;
    while (
      this.tasks[0] &&
      this.tasks[0].deadlineMs <= presentationTimeMs
    ) {
      const task = this.tasks.shift();
      task?.run();
      completed += 1;
    }
    return completed;
  }

  clear(): void {
    this.tasks = [];
  }

  get size(): number {
    return this.tasks.length;
  }
}

export function advancePresentationFrame(
  presentationTimeMs: number,
  previousWallTimeMs: number,
  wallTimeMs: number,
  paused: boolean,
): PresentationFrame {
  const wallDeltaMs = Math.max(0, wallTimeMs - previousWallTimeMs);
  const presentationDeltaMs = paused ? 0 : wallDeltaMs;
  const simulationDeltaMs = paused
    ? 0
    : Math.min(MAX_SIMULATION_FRAME_MS, wallDeltaMs);

  return {
    presentationTimeMs: presentationTimeMs + presentationDeltaMs,
    presentationDeltaMs,
    simulationDeltaMs,
    wallTimeMs,
  };
}

export function interpolateVisibleBattleTime({
  currentTimeMs,
  targetTimeMs,
  nextBeatTimeMs,
  presentationTimeMs,
  nextBeatAllowedAtMs,
  frameDeltaMs,
  speed,
  durationMs,
}: {
  currentTimeMs: number;
  targetTimeMs: number;
  nextBeatTimeMs: number | null;
  presentationTimeMs: number;
  nextBeatAllowedAtMs: number;
  frameDeltaMs: number;
  speed: number;
  durationMs: number;
}): number {
  const current = Math.max(0, Math.min(durationMs, currentTimeMs));
  if (frameDeltaMs <= 0) return current;
  if (nextBeatTimeMs === null) {
    return Math.max(current, Math.min(durationMs, targetTimeMs));
  }

  const endpoint = Math.max(
    current,
    Math.min(durationMs, nextBeatTimeMs),
  );
  if (endpoint <= current) return current;

  const simulationRemainingMs = Math.max(
    0,
    endpoint - targetTimeMs,
  );
  const targetReadyAtMs =
    presentationTimeMs +
    simulationRemainingMs / Math.max(0.01, speed);
  const visibleReadyAtMs = Math.max(
    nextBeatAllowedAtMs,
    targetReadyAtMs,
  );
  const remainingWindowMs = Math.max(
    frameDeltaMs,
    visibleReadyAtMs - presentationTimeMs + frameDeltaMs,
  );
  const progress = Math.min(1, frameDeltaMs / remainingWindowMs);

  return Math.min(
    endpoint,
    Math.max(current, current + (endpoint - current) * progress),
  );
}
