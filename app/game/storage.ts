import {
  LEGACY_STORAGE_KEY,
  sanitizeStoredState,
  STORAGE_KEY,
} from "./state";
import type { GameState } from "./types";

export function loadStoredGame(storage: Storage): GameState | null {
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    const saved = storage.getItem(key);
    if (!saved) continue;
    const parsed = sanitizeStoredState(JSON.parse(saved));
    if (!parsed) continue;
    if (key === LEGACY_STORAGE_KEY) {
      storage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      storage.removeItem(LEGACY_STORAGE_KEY);
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
