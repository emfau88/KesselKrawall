# CrazyGames Basic package

This folder contains the source metadata for the isolated CrazyGames build of
**Cauldron Rumble**. It does not contain generated game files.

Run from the repository root on Windows:

```powershell
npm.cmd run build:crazygames
```

The command creates and validates:

- `dist/crazygames/game/` — unpacked upload contents for local QA
- `dist/crazygames/cauldron-rumble-crazygames-basic.zip` — upload-ready ZIP

The package uses the existing game source with `CRAZYGAMES_BUILD=true`. The
flag selects an English initial render, the English title **Cauldron Rumble**,
relative static asset paths, a compact one-click first run, and hides the
game's own fullscreen controls. Normal Netlify and GitHub Pages builds are not
affected.

This is intentionally a **Basic Launch** package. It contains no ads and does
not yet integrate the CrazyGames SDK. The SDK can be added later for a Full
Launch submission without forking the game source.
