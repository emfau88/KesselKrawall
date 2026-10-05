# Kongregate upload package

This folder contains the source metadata and submission media for the isolated
Kongregate build of **Cauldron Rumble**. Generated game files are not committed.

Run from the repository root on Windows:

```powershell
npm.cmd run build:kongregate
```

The command creates and validates:

- `dist/kongregate/game/` — unpacked game for local QA
- `dist/kongregate/index.html` — upload as the main game file
- `dist/kongregate/cauldron-rumble-kongregate-assets.zip` — upload as additional files
- `dist/kongregate/submission/` — portal copy, icon, screenshots and checklist

## Current upload media

Use the three images in [`media/upload-v2/`](media/upload-v2/):

- `cauldron-rumble-icon-v2.png` — 1254 × 1254 promotional illustration, based on
  the actual player/boss cauldrons and ingredients, generated with ImageGen.
- `01-build-your-cauldron-en.png` — 1440 × 900 English screenshot showing a full
  cauldron, an active Fire synergy and ingredient merge offers.
- `02-unleash-your-synergies-en.png` — 1440 × 900 English screenshot of a battle
  against Crackle Klara, with a real Ember Core projectile in flight.

The screenshots are unaltered captures of release build `e41507e`. The icon's
generation prompt is preserved in `media/upload-v2/IMAGEGEN-PROMPT.md`.
Target audience: ages 13+. The tested initial player frame is 1100 × 700 px.
Packaging copies these files to `dist/kongregate/submission/upload-v2/`.

## Runtime package

The ZIP contains the remaining runtime files at their original paths, without
index.html or a wrapper folder. Animation study pages and spectator prototypes
are excluded. The unpacked game directory remains complete for local QA. The
build starts in English, keeps the German language option, uses local browser
storage for progress, and hides the in-game fullscreen control because the game
runs inside Kongregate's player frame.

The Kongregate SDK is not required for the initial upload. Statistics and Kreds
can be integrated later without forking the game source.

The local release validation and performance results are recorded in
[RELEASE-CHECK.md](RELEASE-CHECK.md). Kongregate's upload form supports a main HTML
file plus an additional-files ZIP; see the [official upload instructions](https://blog.kongregate.com/hc/en-us/articles/44404778564109-UPLOAD-How-to-complete-the-game-information-Step-3-Alpha).
