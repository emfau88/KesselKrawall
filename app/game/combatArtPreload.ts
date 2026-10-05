import { ITEM_PROJECTILE_ART, OPPONENT_CAULDRON_ART, type ArtAsset } from "./ArtSprite";
import { ITEM_BY_ID } from "./data";
import { getFamilyWeights } from "./state";
import type { Board, Family, OpponentDefinition } from "./types";

const FAMILY_EFFECT_ART: Record<Family, readonly ArtAsset[]> = {
  fire: ["vfx-fire"],
  poison: ["vfx-poison", "vfx-poison-projectile"],
  guard: ["vfx-shield"],
  frost: ["vfx-frost-stasis"],
  echo: ["vfx-echo-afterimage"],
};

/** Prepare this matchup, including neutral hits and shared defensive effects. */
export function getCombatPreloadAssets(
  player: Board,
  opponent: Pick<OpponentDefinition, "id" | "board">,
): ArtAsset[] {
  const assets = new Set<ArtAsset>([
    "cauldron-player", OPPONENT_CAULDRON_ART[opponent.id] ?? "cauldron-enemy",
    "vfx-impact", "vfx-fire-projectile", "vfx-ward-bloom",
  ]);
  for (const board of [player, opponent.board]) {
    const weights = getFamilyWeights(board);
    for (const item of board) {
      if (!item) continue;
      const definition = ITEM_BY_ID[item.itemId];
      if (!definition) continue;
      FAMILY_EFFECT_ART[definition.family].forEach((asset) => assets.add(asset));
      const projectile = ITEM_PROJECTILE_ART[item.itemId];
      if (projectile) assets.add(projectile);
      if (weights[definition.family] >= 3) {
        assets.add(`family-${definition.family}-atlas`);
      }
    }
  }
  return [...assets];
}
