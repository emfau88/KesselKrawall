# Kerzen, Ofen, Dampf und Banner

Stand: 5. Oktober 2026. Umsetzung und Prüfungen stehen in `arena-animation-integration.md`.

## Gespeicherte neue Assets

- `public/assets/backgrounds/tournament-arena-motion-v2.webp`: bereinigte Kulisse ohne starre Kerzenflammen und Eckdampf, mit ruhigem orangefarbenem Ofeninneren.
- `public/assets/animation/alchemy-vapor-atlas-v1.webp`: acht tatsächlich transparente gemalte Rauchbilder, 1776 × 888 Pixel, etwa 327 KiB.
- `public/assets/animation/alchemy-vapor-atlas-v1.json`: Zellmaße und gemessene Ankerpunkte am Dampffuß.
- Kulissenoriginal: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-6b6809be-ad8e-4308-830b-55f4f680fe63.png`.
- Rauchoriginal: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-48e4b8ad-37d6-449a-b644-1a8b49e6e23a.png`.

Beide Assets entstanden mit dem eingebauten ImageGen-Werkzeug, ohne CLI/API-Erzeugung. Anschließend nur WebP-Kodierung, unverändertes Packen der Atlaszellen und Messung der transparenten Ränder. Kerzen und Ofen verwenden den bereits vorhandenen gemalten Flammenatlas. Der Rauch erhält zur Laufzeit eine gleichmäßige Überblendung auf transparenten GPU-Texturen und eine kleine kontinuierliche Rasterverformung; die Quelle bleibt fest.

## Kulissenbearbeitung: tatsächlich verwendeter Prompt

```text
Use case: precise-object-edit.
Edit target: the supplied existing Kessel Krawall arena animation plate, exactly 1672 by 941 and the SAME fixed camera.
Prepare more independent animation layers by changing ONLY the following:
1. Remove the tiny luminous FLAME TIPS from all visible wax candles, including the clusters on the right copper machinery and along both side railings. Keep every wax candle, wick, candleholder, pipes and architecture at exactly its existing position. Keep the warm ambient lighting; only remove the painted flame tips.
2. In the circular/oval furnace window at the upper-right (center around x=1595,y=193), remove the distinct bright yellow fire licks from INSIDE the glass while retaining a softly illuminated burnt-orange firebox interior. Keep the full exact brass window rim, rivets, metal bars and surrounding copper machinery untouched.
3. Remove ONLY the two rising bright green SMOKE PLUMES directly above the two large FRONT-CORNER brass bowls: left source x=80,y=723 and right source x=1600,y=724. Reconstruct the dark pipes/walls behind those vapor plumes naturally. Keep the bowls, their brass rims and a low luminous green base in each bowl unchanged. Keep all other green light and all green smoke elsewhere in the scene untouched.
Already-clean four small braziers beside the central stairs must remain unchanged, glowing coals and brass bowls with no flame plumes. Leave the central fighting floor, balconies, door, stairs, lanterns, all materials, colors and every other object completely unchanged.
No banners or characters. No new props, no shifted composition, no text. This exact plate will receive individually animated flames and vapor in precisely aligned layers.
```

## Dampf: tatsächlich verwendeter Prompt

```text
Use case: stylized-concept.
Asset type: actual transparent painted fantasy game vapor animation atlas.
Input image: STYLE AND COLOR reference only, the two toxic-green smoke plumes above the FRONT-CORNER brass bowls. Do not reproduce the scenery.
Primary request: EXACTLY EIGHT successive frames of ONE restrained green alchemical vapor plume, in a strict FOUR columns by TWO rows of equal square cells, read left-to-right then top-to-bottom. Not fire: soft curling translucent wisps and thin smoky tendrils, pale yellow-green at the low base, moss/olive green above, with dark gaps between curls. Match the premium painterly material of the reference, subdued and atmospheric, no neon cyan.
Motion: continuous upward flow. Narrow wisps emerge from a stable centered source near the bottom, twist slowly in gentle S curves, spread slightly at the top and dissipate. Adjacent frames change gradually; frame eight flows smoothly back into frame one. The plume volume stays similar, no pulsating large blobs. Same scale and centered base for all frames.
Composition: each vapor shape fills about 40% of its cell width and 65% of cell height. BASE at exactly 85% of cell height in every cell. Entire object contained in its own square cell with generous actual transparent gaps. Thin translucent edges, lower body a little denser but still smoke. No visible round disk or bowl.
Constraints: actual transparent background, NO bowls, NO scenery, no black backdrop, no ground shadow, no large glow disk, no drawn cell boundaries, no labels, no letters, no extra particles, no white smoke, no characters. Only eight ordered green wispy smoke poses of the same source.
```
