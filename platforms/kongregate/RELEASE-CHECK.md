# Local release check — 2026-10-05

No release blocker was observed in the normal flows checked below. This check
covers the exported game, not Kongregate's hosted Preview or physical phones.

## Validation

- All 94 existing tests passed, including gameplay, save handling, English
  translation coverage, animation continuity and the new preload/crop tests.
- TypeScript and ESLint for the changed application and test files passed.
- Both the ordinary vinext production build and Kongregate static export passed.
- Export tested in Chrome at 1100 × 700, DPR 1, and an emulated touch viewport
  at 390 × 844, DPR 2. No artificial CPU throttling or exhaustive device matrix.
- Fresh storage and a German browser locale still start the Kongregate game in
  English with the title `Cauldron Rumble`. Explicit German selection survives
  reload; switching back to English works. The ordinary web build continues to
  follow the browser language unless a language was explicitly saved.
- Both viewports completed menu → introduction → shop → purchases → battle →
  victory → reward → next shop. Pause/resume also stops/resumes arena animation.
- Reload and Continue Campaign restore the board, gold and round correctly.
- No JavaScript/console errors, missing images or HTTP resource errors in the
  completed runs. Music requests cancelled during scene changes are expected.
- No horizontal page overflow in either tested viewport; screenshots inspected.
- Tested under `/game/index.html`, so relative resources also work in a subfolder.

## Performance changes

- 18 runtime cauldron images and the workbench platform were converted from PNG
  to WebP: 7,470,440 → 1,927,020 bytes, a 74.2% reduction. Dimensions and every
  alpha pixel are preserved; RGB is compressed at quality 95. Player/platform
  comparisons were inspected. Original PNG sources remain in commit `067b1bc`.
- The menu no longer preloads an entire campaign's cauldrons and combat effects.
  Preparation now loads the current matchup and relevant family/item effects,
  with duplicate URL requests avoided.
- The exported menu requests 14 images: 985,320 bytes on desktop and 935,448
  bytes on mobile, compared with 4,787,037 image bytes in the earlier audit.
  These figures concern image bodies, not total page traffic or frame rate.
- Entirely cropped arena effects skip animation work. The tested battle layouts
  report zero visible corner-vapor meshes and no visible furnace, avoiding both
  vapor render-to-texture passes each frame. Visible banners/fire keep animating.
  Unit checks also cover partially visible effects and their return in a wide view.
- No frame-rate guarantee is inferred from emulated mobile browser checks.

## Upload artifacts

`npm.cmd run build:kongregate` creates:

- `dist/kongregate/index.html`: main game file.
- `dist/kongregate/cauldron-rumble-kongregate-assets.zip`: additional files;
  excludes index.html, preserves runtime paths, and has no wrapper directory.
- `dist/kongregate/game/`: complete unpacked local test version.
- `dist/kongregate/submission/`: prepared copy, credits, icon and screenshots.

The packager verifies English HTML/title, relative HTML/CSS resource references,
the upload size limit, portable ZIP paths and inclusion/length of every extra
file. Animation study pages, spectator prototypes and superseded arena plates
are excluded from the portal package. The initial verified ZIP was 14.88 MiB;
small bundle-size changes after embedding the final commit hash are possible.

Before submitting for review, run the normal sound/play/save flow once inside
Kongregate Preview to check the platform's actual player frame and storage.
