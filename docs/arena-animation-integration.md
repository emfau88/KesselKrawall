# Arena: Stoff, Feuer und Licht

Stand: 5. Oktober 2026.

Die Kampfarena verwendet `tournament-arena-motion-v2.webp` und zwei kleine unabhängig verformte Stoffbanner im Hintergrund. Vier Feuerstellen haben je zwölf gemalte Flammenbilder mit stabilen Ankerpunkten, versetzten Takten und kurzen Überblendungen. 21 Kerzen-/kleine Feuerquellen verwenden dieselben Bilder mit schmalerer Form, eigener Phase und geringer Neigung und Streckung am feststehenden Docht. Zwei dezente Flammen beleben den rechten unteren Ofenbereich, begrenzt durch eine kleinere elliptische Maske innerhalb des Metallrahmens. Zwei grüne Dampfschalen verwenden acht gemalte Rauchbilder mit stabilen Quellen und unterschiedlicher Phase; rechts ist die Silhouette gespiegelt. Die gewichteten Rauchbilder werden zuerst additiv auf transparente GPU-Texturen gezeichnet und dann gemeinsam eingeblendet. Das verhindert Deckkraftschwankungen während der Überblendung. Ein fein verformtes Bildraster ergänzt kontinuierliche Aufwärtsbewegung bei feststehender Quelle. Lichtmasken und wenige Funken bleiben erhalten.

Alle Dekorationspositionen beziehen sich auf die 1672 × 941 große Kulisse und folgen exakt dem zentrierten `object-fit: cover`-Zuschnitt. Die Banner hängen näher an den beiden Seiten des zentralen Türbereichs: x=644 beziehungsweise 944, y=166, jeweils 83,2 Pixel Bildbreite. Das sind 30 Prozent mehr als in der ersten kleinen Paarfassung; die Deckkraft ist ebenfalls etwas angehoben. Ein sichtbarer Spielersieg löst einmal einen zusätzlichen Windstoß aus. Der Zuschauer bleibt ausschließlich als Studie unter `/animationsprobe`. Die neue Prüfung unter `/arenaprobe` zeigt die eingebundene Arena mit Vorher-Vergleich, Handyansicht, Pause und Windstoß. Die äußeren Dampfschalen und der Ofen werden in schmalen Ansichten zusammen mit der Kulisse beschnitten.

Die Animation pausiert bei Kampfpause, geöffneten Audioeinstellungen, reduzierter Bewegung und verborgenem Browsertab. Die Dekoration nimmt keine Eingaben entgegen. Der Zeichentakt ist auf 60 Bilder pro Sekunde begrenzt, in schmalen Arenen auf 30; die Pixeldichte ist auf das Zweifache begrenzt. Fehler beim Laden oder fehlende WebGL-Unterstützung blockieren das Spiel nicht.

Prüfung: Typprüfung und ESLint bestanden; 13 gezielte Tests für Stoff, Familieneffekte, Bildzuschnitt, Kerzenbewegung, Rauchverformung, Licht und Funken bestanden. Browserprüfung auf Desktop, Handyansicht und in einem kleinen Portal-Fenster: keine horizontalen Überläufe oder Seitenfehler, ein Dekorationscanvas. Pause und reduzierte Bewegung halten Zeit sowie Flammen- und Rauchbilder unverändert. Der Clip zeigt die echte WebGL-Vorschau. Dies ist keine Leistungsmessung auf einem physischen Handy. Es wurde kein CrazyGames-Build erzeugt.

## Neue ImageGen-Assets

- Vorstufe und Vergleichskulisse: `public/assets/backgrounds/tournament-arena-clean-v1.webp`.
- Original: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-22bd3677-fbc3-4c03-b697-9bfabd74c8db.png`.
- Optionales, im Spiel nicht verwendetes Geländer: `public/assets/animation/spectator-balcony-rail-v1.webp`.
- Geländer-Original: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-9289a945-c599-473d-aa2d-984ab309cd58.png`.

Beide Bilder wurden mit dem eingebauten ImageGen-Werkzeug erzeugt. Die Kulisse entstand als präzise Bearbeitung des vorhandenen Arena-Hintergrunds. Das Geländer ist ein neu generiertes transparentes Asset. Anschließend erfolgte nur WebP-Kodierung beziehungsweise Größenanpassung. Banner- und Zuschauerprompts stehen in `animation-probe-assets.md`.

## Kulisse: tatsächlich verwendeter Prompt

```text
Use case: precise-object-edit.
Edit target: this existing tournament-arena background for the game Kessel Krawall.
Keep the EXACT arena viewpoint, wide aspect ratio, central circular stone fighting floor, rear doorway and spectator balconies, all alchemist machinery, amber firelight, purple shadows, green furnace glow, perspective and painterly material quality.
Change only the two large hanging cloth banners: completely REMOVE the purple cloth banner on the left and the green cloth banner on the right, including their hanging bars and decorative tassels. Reconstruct the underlying stone/metal architecture naturally. Keep the nearby columns, pipes, lanterns and top chains. The two resulting areas should be clean dark architectural spaces, with no new decorative banners, no emblems floating in space.
Leave the fighting floor quiet and unobstructed. Do not add people, foreground objects, animals, effects, labels or text. This is a clean background plate; separately animated banners and a spectator will be composited later. Do not change composition or crop.
```

## Optionales Geländer: tatsächlich verwendeter Prompt

```text
Use case: stylized-concept.
Asset type: one transparent foreground railing prop for a premium painterly alchemist tournament arena.
Subject: a short dark stone balcony parapet with an aged brass handrail, seen straight on with very slight view of its top surface. A horizontal thick handrail across the top, three broad dark stone balusters below, and a short stone base. Warm amber highlights along the brass edge, charcoal plum stone in shadow, rich but restrained worn material. Exactly one assembled rectangular railing, wide low silhouette, roughly 4:1 width to height. No viewpoint angled to one side.
Composition: isolated complete object, centered with transparent padding, all ends visible. Designed to sit in front of the lower body of one hooded spectator, so the upper handrail is continuous.
Style: hand-painted detailed fantasy game prop, same copper/brass and purple-shadow visual language as Kessel Krawall's arena; avoid flat vector shapes and overly bright gold.
Constraints: genuinely transparent background, no scene, no person, no separate parts, no text or watermark, no external shadow.
```

## Feueranimation: neue gespeicherte Assets

- `public/assets/backgrounds/tournament-arena-motion-v1.webp`: bereinigte Kulisse mit Glut in den Schalen, ohne die vier starren Flammen.
- `public/assets/animation/brazier-flame-atlas-v1.webp`: zwölf tatsächlich transparente Flammenbilder, vier Spalten × drei Reihen, 1448 × 1086 Pixel, etwa 290 KiB.
- `public/assets/animation/brazier-flame-atlas-v1.json`: Zellmaße und gemessene Ankerpunkte; erhält die stabile Lage der Flammenfüße.
- Kulissenoriginal: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-30110364-fdd1-4ec8-a88a-7d5266742ef1.png`.
- Flammenoriginal: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-01ebf653-fad0-4503-876b-fcbe28d1a2b4.png`.

Erzeugt mit dem eingebauten ImageGen-Werkzeug, keine CLI/API-Erzeugung. Anschließend nur WebP-Kodierung und unverändertes Packen der Zellen sowie Messung der transparenten Ränder. Lichtmasken und einzelne winzige Funken werden zur Laufzeit gezeichnet; die Flammen selbst verwenden die gemalten Bilder. Maschinenbewegung ist eine mögliche spätere Ausbaustufe und derzeit nicht umgesetzt.

## Feuerplatte: tatsächlich verwendeter Prompt

```text
Use case: precise-object-edit.
Edit target: the supplied Kessel Krawall tournament-arena background.
Primary request: produce a clean animation plate by removing ONLY the four orange flame plumes from the four small brass braziers flanking the central stairs. There are two nearer braziers (approximately image x=39.5%, y=38%; x=59.3%, y=38%) and two farther braziers (x=45.2%, y=34%; x=53.6%, y=34%). Restore the dark architecture behind those four flame shapes naturally. Keep the brass bowls and glowing coals in their bowls exactly where they are, with their original size.
Keep EXACT image framing, camera, wide aspect ratio, all stone floors, stairs, pipes, balconies, candle flames, hanging lanterns, the right circular furnace glow, green alchemy glow at both front corners, all existing ambient lighting and colors. No new objects. The four flame plumes will be animated as separate transparent sprites, so the brass bowl rims must stay unobstructed and identifiable.
Do not remove any other flames, do not remove candles or lantern light. No banners, no text, no characters. Preserve the high quality hand-painted fantasy game style and the quiet central floor.
```

## Flammenatlas: tatsächlich verwendeter Prompt

```text
Use case: stylized-concept.
Asset type: professionally painted seamless looping 2D flame animation sprite sheet for a fantasy brass brazier.
Input image: supplied arena is STYLE AND COLOR reference only. Do not reproduce any scenery or props.
Primary request: exactly TWELVE successive animation frames of ONE small warm golden-orange fire plume, in a strict FOUR columns by THREE rows grid of equal square cells, read left-to-right then top-to-bottom. Actual transparent background.
Each cell contains only the FLAME, no bowl, no torch, no ground, no smoke, no individual detached embers, no flare disks. Bright pale yellow core near the base, amber middle and wispy warm orange tips; hand-painted rich subtle brush texture matching the arena. Natural licks separate and curl upward; moderate shape variation between adjacent frames, stable flame volume.
Frame 1 begins upright with a slightly leftward tip; intermediate frames gently curl right, divide into two licks, reform and return left. Frame 12 must smoothly return to frame 1. Not twelve unrelated fires. All frames share identical scale, centered base, light direction and a stable baseline at 82 percent of each cell height. Flame height about 60 percent of cell, width about 30 percent, with ample entirely transparent margins on all sides. The base should taper softly to a short horizontal width, ready to emerge just behind a bowl rim.
Composition: exact 4x3 even grid, no grid drawn, no labels, no numbers, no text, no scenery, no glow panel or baked backdrop, no duplicated props. Flames fully contained in their own equal cells with transparent space between cells. Preserve natural semitransparent wispy edges.
Avoid vector icons, cartoon teardrops, rigid geometric triangles, huge explosions, smoke clouds.
```
