import { ArtSprite, type ArtAsset } from "./ArtSprite";
import { getFamilyWeights } from "./state";
import type { Board, Family } from "./types";

const FAMILIES: readonly Family[] = ["fire", "poison", "guard", "frost", "echo"];
const LAYERS = ["aura", "aura-right", "brew", "brew-right", "motes", "motes-right", "ground"] as const;
const FAMILY_ATLASES: Record<Family, ArtAsset> = {
  fire: "family-fire-atlas", poison: "family-poison-atlas", guard: "family-guard-atlas",
  frost: "family-frost-atlas", echo: "family-echo-atlas",
};

/** Painted atlas layers follow the same activation rule as the synergy bar. */
export function CauldronFamilyEffects({ board, suppressed = false }: {
  board: Board;
  suppressed?: boolean;
}) {
  if (suppressed) return null;
  const weights = getFamilyWeights(board);
  const active = FAMILIES.filter((family) => weights[family] >= 3);
  if (active.length === 0) return null;

  return (
    <div className="cauldron-family-effects" aria-hidden="true">
      {active.map((family) => (
        <div
          className={`family-brew-fx family-${family}`}
          data-family={family}
          key={family}
        >
          {LAYERS.map((layer) => (
            <span className={`family-art-layer family-art-${layer}`} key={layer}>
              <ArtSprite asset={FAMILY_ATLASES[family]} className="family-atlas-image" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
