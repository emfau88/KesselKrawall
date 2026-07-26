export const ART_FILES = {
  "cauldron-player": "cauldron-player.png",
  "cauldron-enemy": "cauldron-enemy.png",
  "cauldron-boss": "cauldron-boss.png",
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
  "opponent-zischbert": "opponent-zischbert.png",
  "opponent-moor-martha": "opponent-moor-martha.png",
  "opponent-schild-siggi": "opponent-schild-siggi.png",
  "opponent-knister-klara": "opponent-knister-klara.png",
  "opponent-tox-toni": "opponent-tox-toni.png",
  "opponent-broesel-berta": "opponent-broesel-berta.png",
  "opponent-meisterin-mirea": "opponent-meisterin-mirea.png",
  "opponent-grosskessel": "opponent-grosskessel.png",
  "vfx-fire": "vfx-fire.png",
  "vfx-poison": "vfx-poison.png",
  "vfx-shield": "vfx-shield.png",
  "vfx-impact": "vfx-impact.png",
} as const;

export type ArtAsset = keyof typeof ART_FILES;

export const UI_FILES = {
  battle: "battle.png",
  coin: "coin.png",
  elite: "elite.png",
  "family-fire": "family-fire.png",
  "family-guard": "family-guard.png",
  "family-poison": "family-poison.png",
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
