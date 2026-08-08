export const ART_FILES = {
  "cauldron-player": "cauldron-player-v3.png",
  "cauldron-enemy": "cauldron-enemy.png",
  "cauldron-boss": "cauldron-boss.png",
  "cauldron-zischbert": "cauldron-zischbert.png",
  "cauldron-moor-martha": "cauldron-moor-martha.png",
  "cauldron-schild-siggi": "cauldron-schild-siggi.png",
  "cauldron-knister-klara": "cauldron-knister-klara.png",
  "cauldron-tox-toni": "cauldron-tox-toni.png",
  "cauldron-broesel-berta": "cauldron-broesel-berta.png",
  "cauldron-meisterin-mirea": "cauldron-meisterin-mirea.png",
  "cauldron-reif-rudi": "cauldron-reif-rudi.png",
  "cauldron-hall-hanne": "cauldron-hall-hanne.png",
  "cauldron-eis-elsa": "cauldron-eis-elsa.png",
  "cauldron-takt-tilda": "cauldron-takt-tilda.png",
  "cauldron-splitter-sven": "cauldron-splitter-sven.png",
  "cauldron-resonanz-rosa": "cauldron-resonanz-rosa.png",
  "cauldron-archivarin-aeva": "cauldron-archivarin-aeva.png",
  "cauldron-chronokessel": "cauldron-chronokessel.png",
  "menu-rune-ring-outer": "menu-rune-ring-outer.webp",
  "menu-rune-ring-inner": "menu-rune-ring-inner.webp",
  "result-victory": "result-victory.png",
  "result-defeat": "result-defeat.png",
  "merge-sigil": "merge-sigil.png",
  "item-chili": "item-chili.png",
  "item-dragon-tooth": "item-dragon-tooth.png",
  "item-ember-core": "item-ember-core.png",
  "item-cinder-berry": "item-cinder-berry.png",
  "item-slime-shroom": "item-slime-shroom.png",
  "item-nightwing": "item-nightwing.png",
  "item-witch-eye": "item-witch-eye.png",
  "item-venom-bulb": "item-venom-bulb.png",
  "item-egg-shell": "item-egg-shell.png",
  "item-healing-tuber": "item-healing-tuber.png",
  "item-gold-spoon": "item-gold-spoon.png",
  "item-moon-salt": "item-moon-salt.png",
  "item-frost-shard": "item-frost-shard.png",
  "item-ice-bell": "item-ice-bell.png",
  "item-winter-bloom": "item-winter-bloom.png",
  "item-rime-clock": "item-rime-clock.png",
  "item-mirror-shard": "item-mirror-shard.png",
  "item-echo-bell": "item-echo-bell.png",
  "item-rune-cup": "item-rune-cup.png",
  "item-time-thread": "item-time-thread.png",
  "opponent-zischbert": "opponent-zischbert.png",
  "opponent-moor-martha": "opponent-moor-martha.png",
  "opponent-schild-siggi": "opponent-schild-siggi.png",
  "opponent-knister-klara": "opponent-knister-klara.png",
  "opponent-tox-toni": "opponent-tox-toni.png",
  "opponent-broesel-berta": "opponent-broesel-berta.png",
  "opponent-meisterin-mirea": "opponent-meisterin-mirea.png",
  "opponent-grosskessel": "opponent-grosskessel.png",
  "opponent-reif-rudi": "opponent-reif-rudi.png",
  "opponent-hall-hanne": "opponent-hall-hanne.png",
  "opponent-eis-elsa": "opponent-eis-elsa.png",
  "opponent-takt-tilda": "opponent-takt-tilda.png",
  "opponent-splitter-sven": "opponent-splitter-sven.png",
  "opponent-resonanz-rosa": "opponent-resonanz-rosa.png",
  "opponent-archivarin-aeva": "opponent-archivarin-aeva.png",
  "opponent-chronokessel": "opponent-chronokessel.png",
  "vfx-fire": "vfx-fire.png",
  "vfx-fire-projectile": "vfx-fire-projectile.png",
  "vfx-dragon-tooth-projectile": "vfx-dragon-tooth-projectile.png",
  "vfx-ember-core-projectile": "vfx-ember-core-projectile.png",
  "vfx-cinder-berry-projectile": "vfx-cinder-berry-projectile.png",
  "vfx-poison": "vfx-poison.png",
  "vfx-poison-projectile": "vfx-poison-projectile.png",
  "vfx-nightwing-projectile": "vfx-nightwing-projectile.png",
  "vfx-witch-eye-projectile": "vfx-witch-eye-projectile.png",
  "vfx-venom-bulb-projectile": "vfx-venom-bulb-projectile.png",
  "vfx-shield": "vfx-shield.png",
  "vfx-ward-bloom": "vfx-ward-bloom.png",
  "vfx-gold-spoon-projectile": "vfx-gold-spoon-projectile.png",
  "vfx-moon-salt-projectile": "vfx-moon-salt-projectile.png",
  "vfx-impact": "vfx-impact.png",
} as const;

export type ArtAsset = keyof typeof ART_FILES;

export async function preloadArtAssets(
  assets: readonly ArtAsset[],
): Promise<void> {
  if (typeof window === "undefined") return;

  await Promise.all(
    assets.map(async (asset) => {
      const image = new Image();
      image.src = new URL(
        `assets/art/${ART_FILES[asset]}`,
        document.baseURI,
      ).href;

      if (typeof image.decode === "function") {
        try {
          await image.decode();
        } catch {
          // A failed eager decode must not block the game. The normal image
          // element can still retry through the browser cache when rendered.
        }
        return;
      }

      if (image.complete) return;
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export const UI_FILES = {
  battle: "battle.png",
  coin: "coin.png",
  elite: "elite.png",
  "family-fire": "family-fire.png",
  "family-guard": "family-guard.png",
  "family-poison": "family-poison.png",
  "family-frost": "family-frost.png",
  "family-echo": "family-echo.png",
  health: "health.png",
  power: "power.png",
  reroll: "reroll.png",
  "run-seal": "run-seal.png",
  shield: "shield.png",
  speed: "speed.png",
  "status-burn": "status-burn.png",
  "status-heal": "status-heal.png",
  "status-poison": "status-poison.png",
  "status-rage": "status-rage.png",
} as const;

export type UiAsset = keyof typeof UI_FILES;

export const BACKDROP_FILES = {
  arena: "tournament-arena.webp",
  menu: "main-menu-stage.webp",
  market: "witch-market.webp",
} as const;

export type BackdropAsset = keyof typeof BACKDROP_FILES;

export const ITEM_ART: Record<string, ArtAsset> = {
  chili: "item-chili",
  "dragon-tooth": "item-dragon-tooth",
  "ember-core": "item-ember-core",
  "cinder-berry": "item-cinder-berry",
  "slime-shroom": "item-slime-shroom",
  nightwing: "item-nightwing",
  "witch-eye": "item-witch-eye",
  "venom-bulb": "item-venom-bulb",
  "egg-shell": "item-egg-shell",
  "healing-tuber": "item-healing-tuber",
  "gold-spoon": "item-gold-spoon",
  "moon-salt": "item-moon-salt",
  "frost-shard": "item-frost-shard",
  "ice-bell": "item-ice-bell",
  "winter-bloom": "item-winter-bloom",
  "rime-clock": "item-rime-clock",
  "mirror-shard": "item-mirror-shard",
  "echo-bell": "item-echo-bell",
  "rune-cup": "item-rune-cup",
  "time-thread": "item-time-thread",
};

export const ITEM_PROJECTILE_ART: Partial<Record<string, ArtAsset>> = {
  "dragon-tooth": "vfx-dragon-tooth-projectile",
  "ember-core": "vfx-ember-core-projectile",
  "cinder-berry": "vfx-cinder-berry-projectile",
  nightwing: "vfx-nightwing-projectile",
  "witch-eye": "vfx-witch-eye-projectile",
  "venom-bulb": "vfx-venom-bulb-projectile",
  "gold-spoon": "vfx-gold-spoon-projectile",
  "moon-salt": "vfx-moon-salt-projectile",
  "frost-shard": "vfx-moon-salt-projectile",
  "ice-bell": "vfx-moon-salt-projectile",
  "rime-clock": "vfx-moon-salt-projectile",
  "mirror-shard": "vfx-witch-eye-projectile",
  "echo-bell": "vfx-gold-spoon-projectile",
  "time-thread": "vfx-witch-eye-projectile",
};

export const OPPONENT_ART: Record<string, ArtAsset> = {
  zischbert: "opponent-zischbert",
  "moor-martha": "opponent-moor-martha",
  "schild-siggi": "opponent-schild-siggi",
  "knister-klara": "opponent-knister-klara",
  "tox-toni": "opponent-tox-toni",
  "broesel-berta": "opponent-broesel-berta",
  "meisterin-mirea": "opponent-meisterin-mirea",
  grosskessel: "opponent-grosskessel",
  "reif-rudi": "opponent-reif-rudi",
  "hall-hanne": "opponent-hall-hanne",
  "eis-elsa": "opponent-eis-elsa",
  "takt-tilda": "opponent-takt-tilda",
  "splitter-sven": "opponent-splitter-sven",
  "resonanz-rosa": "opponent-resonanz-rosa",
  "archivarin-aeva": "opponent-archivarin-aeva",
  chronokessel: "opponent-chronokessel",
};

export const OPPONENT_CAULDRON_ART: Partial<Record<string, ArtAsset>> = {
  zischbert: "cauldron-zischbert",
  "moor-martha": "cauldron-moor-martha",
  "schild-siggi": "cauldron-schild-siggi",
  "knister-klara": "cauldron-knister-klara",
  "tox-toni": "cauldron-tox-toni",
  "broesel-berta": "cauldron-broesel-berta",
  "meisterin-mirea": "cauldron-meisterin-mirea",
  grosskessel: "cauldron-boss",
  "reif-rudi": "cauldron-reif-rudi",
  "hall-hanne": "cauldron-hall-hanne",
  "eis-elsa": "cauldron-eis-elsa",
  "takt-tilda": "cauldron-takt-tilda",
  "splitter-sven": "cauldron-splitter-sven",
  "resonanz-rosa": "cauldron-resonanz-rosa",
  "archivarin-aeva": "cauldron-archivarin-aeva",
  chronokessel: "cauldron-chronokessel",
};

export function ArtSprite({
  asset,
  className = "",
}: {
  asset: ArtAsset;
  className?: string;
}) {
  return (
    // A relative URL keeps public assets valid at both / and the GitHub Pages base path.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`art-sprite ${className}`.trim()}
      src={`assets/art/${ART_FILES[asset]}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

export function UiIcon({
  asset,
  className = "",
}: {
  asset: UiAsset;
  className?: string;
}) {
  return (
    // A relative URL keeps public assets valid at both / and the GitHub Pages base path.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`ui-icon ${className}`.trim()}
      src={`assets/ui/${UI_FILES[asset]}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}

export function BackdropImage({
  backdrop,
  className = "",
}: {
  backdrop: BackdropAsset;
  className?: string;
}) {
  return (
    // A relative URL keeps public assets valid at both / and the GitHub Pages base path.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`backdrop-image ${className}`.trim()}
      src={`assets/backgrounds/${BACKDROP_FILES[backdrop]}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
