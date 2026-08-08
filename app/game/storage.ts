import {
  LEGACY_STORAGE_KEYS,
  sanitizeStoredState,
  STORAGE_KEY,
} from "./state";
import type {
  CampaignId,
  CampaignProgress,
  GameState,
  PlayerProgress,
} from "./types";

export const PROFILE_STORAGE_KEY = "kessel-krawall-profile-v1";

export function createEmptyProgress(): PlayerProgress {
  return { version: 1, campaigns: {} };
}

export function loadStoredGame(storage: Storage): GameState | null {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    const saved = storage.getItem(key);
    if (!saved) continue;
    const parsed = sanitizeStoredState(JSON.parse(saved));
    if (!parsed) continue;
    if (key !== STORAGE_KEY) {
      storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      storage.removeItem(key);
    }
    return parsed;
  }
  return null;
}

export function persistGame(storage: Storage, game: GameState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(game));
    return true;
  } catch {
    return false;
  }
}

export function loadPlayerProgress(storage: Storage): PlayerProgress {
  try {
    const saved = storage.getItem(PROFILE_STORAGE_KEY);
    if (!saved) return createEmptyProgress();
    return sanitizePlayerProgress(JSON.parse(saved)) ?? createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function persistPlayerProgress(
  storage: Storage,
  progress: PlayerProgress,
): boolean {
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function recordCampaignVictory(
  progress: PlayerProgress,
  campaignId: CampaignId,
  seals: number,
  power: number,
): PlayerProgress {
  const previous = progress.campaigns[campaignId];
  return {
    version: 1,
    campaigns: {
      ...progress.campaigns,
      [campaignId]: {
        wins: (previous?.wins ?? 0) + 1,
        bestSeals: Math.max(previous?.bestSeals ?? 0, seals),
        bestPower: Math.max(previous?.bestPower ?? 0, power),
      },
    },
  };
}

export function hasCompletedCampaign(
  progress: PlayerProgress,
  campaignId: CampaignId,
): boolean {
  return (progress.campaigns[campaignId]?.wins ?? 0) > 0;
}

function sanitizePlayerProgress(value: unknown): PlayerProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !record.campaigns) return null;
  if (typeof record.campaigns !== "object" || Array.isArray(record.campaigns)) {
    return null;
  }
  const campaigns: PlayerProgress["campaigns"] = {};
  for (const campaignId of [
    "grand-tournament",
    "frostbound-vault",
  ] as const satisfies readonly CampaignId[]) {
    const entry = (record.campaigns as Record<string, unknown>)[campaignId];
    if (entry === undefined) continue;
    const sanitized = sanitizeCampaignProgress(entry);
    if (!sanitized) return null;
    campaigns[campaignId] = sanitized;
  }
  return { version: 1, campaigns };
}

function sanitizeCampaignProgress(value: unknown): CampaignProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const wins = safeProgressInteger(record.wins, 0, 9999);
  const bestSeals = safeProgressInteger(record.bestSeals, 0, 3);
  const bestPower = safeProgressInteger(record.bestPower, 0, 100000);
  if (wins === null || bestSeals === null || bestPower === null) return null;
  return { wins, bestSeals, bestPower };
}

function safeProgressInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum
    ? (value as number)
    : null;
}
