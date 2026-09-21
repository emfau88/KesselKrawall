# Kongregate upload package

This folder contains the source metadata and submission media for the isolated
Kongregate build of **Cauldron Rumble**. Generated game files are not committed.

Run from the repository root on Windows:

```powershell
npm.cmd run build:kongregate
```

The command creates and validates:

- `dist/kongregate/game/` — unpacked game for local QA
- `dist/kongregate/cauldron-rumble-kongregate.zip` — HTML5 upload ZIP
- `dist/kongregate/submission/` — portal copy, icon, screenshots and checklist

The ZIP contains `index.html` at its root and all runtime assets locally. The
build starts in English, keeps the German language option, uses local browser
storage for progress, and hides the in-game fullscreen control because the game
runs inside Kongregate's player frame.

The Kongregate SDK is not required for the initial upload. Statistics and Kreds
can be integrated later without forking the game source.
