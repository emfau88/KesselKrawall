# Stoffbanner und Zuschauer: Animationsprobe

Stand: 5. Oktober 2026. Prüfansicht unter `/animationsprobe`. Der Stoffbanner ist außerdem in die Kampfarena eingebunden. Der Zuschauer bleibt auf Wunsch in der Prüfansicht und wird im Spiel nicht eingeblendet oder geladen.

## Umsetzung

Ein gemalter Banner auf einem 15 × 29 Bildraster mit festem oberen Bereich. Zwei überlagerte Stoffwellen laufen nach unten; ein auslösbarer Windstoß verstärkt die Verformung kurz. Die Bildpunkte werden tatsächlich verschoben, während die Stange stillsteht.

Ein Zuschauer aus sechs gemalten Bildteilen. Ein kleines Gelenkskelett verbindet Oberarme und Unterarme. Kopf und Körper bewegen sich getrennt. Der vier Sekunden lange Jubel hat eine vorbereitende Bewegung, versetzte Armbewegungen, Nachschwingen und einen Übergang zurück zur Ruhe. Ein erneuter Jubel startet aus der aktuellen Pose.

Zeichnen über PixiJS 8.22.0/WebGL; gemeinsame Pose-, Übergangs- und Stoffsteuerung in `app/game/arenaMotion.ts` und `app/game/arenaSceneParts.ts`. Kein Spine-Editor und keine Spine-Runtime. PixiJS wird in der Prüfansicht und bei der Bannerdekoration im Kampf nachgeladen. Pause und reduzierte Bewegung halten die Animationszeit an; ausgeblendete Browserseiten pausieren den Zeichentakt. Auflösung ist auf höchstens zweifache Pixeldichte begrenzt.

Die Nahansicht zeigt Details; die Arenaansicht erprobt beide Assets vor dem ursprünglichen Hintergrund. Im echten Kampf wird eine bereinigte Hintergrundplatte ohne fest gemalte Banner verwendet. Desktop und Handy haben unterschiedliche Kompositionen. Ein sichtbarer Spielersieg löst einmal einen kurzen Windstoß aus. Kampfpause und die geöffneten Audioeinstellungen halten die Dekoration an. Bei fehlender WebGL-Unterstützung bleibt das Spiel ohne diese Dekoration bedienbar.

## Gespeicherte Assets

Prüfung: vier Bewegungstests bestanden, Typprüfung und ESLint ohne Fehler. Browserprüfung bei 1440 × 1000 und 390 × 844: keine horizontalen Überläufe oder Konsolenfehler; alle Ansichten und Auslöser funktionieren. Die Animationszeit bleibt während Pause und reduzierter Bewegung stehen. Dies ist eine Prüfung in Desktop-/Handy-Ansichtsgrößen, keine Messung auf einem physischen Handy.

- `public/assets/animation/tournament-cloth-banner-v1.webp`
- `public/assets/animation/spectator-rig-atlas-v1.webp`
- `public/assets/animation/spectator-hood-v1.webp`
- `public/assets/animation/spectator-torso-v2.webp`: endgültige geschlossene Stoffschultern.
- `public/assets/animation/spectator-upper-left-v1.webp`
- `public/assets/animation/spectator-upper-right-v1.webp`
- `public/assets/animation/spectator-forearm-left-v1.webp`
- `public/assets/animation/spectator-forearm-right-v1.webp`
- `public/assets/animation/spectator-parts-v1.json`: nachvollziehbare Ausschnitte aus dem Atlas.

Die Bilder wurden mit dem eingebauten ImageGen-Werkzeug erstellt. Die Original-PNGs bleiben im ImageGen-Ausgabeordner. WebP-Kodierung und Heraustrennen der Atlaszellen erhalten die Transparenz; die Bewegung ist separat programmiert.

Originaldateien:

- Banner: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-a7dad4fa-33a4-4814-927f-ee44adc6e6a4.png`
- Erstes Zuschauerset: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-c9202875-3485-404b-ab6a-027e29955616.png`
- Verwendetes überarbeitetes Zuschauerset: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-9e250ad2-cefe-4e43-9e08-4cc8be9f2a5f.png`
- Verwendeter Torso: `C:/Users/madde/.codex/generated_images/01a10c11-357f-7c53-9550-86ef135c0a96/exec-a4b38318-54e1-4568-9296-538bf658edb5.png`

## Finales Promptset

### Banner

```text
Use case: stylized-concept.
Asset type: transparent painted 2D game prop for a real deformable cloth mesh.
Primary request: a single beautiful vertical tournament cloth banner, for the warm dark alchemist arena in Kessel Krawall.
Subject: deep plum-purple woven velvet cloth with an antique gold embroidered cauldron emblem, elegant restrained gold edge piping, a shallow swallowtail hem. A slim antique brass horizontal hanging bar at the very top, attached by two small loops. The banner hangs straight down, frontal view, nearly flat with gentle painted vertical folds. No perspective foreshortening, no dramatic wind baked into the shape. Top bar fits fully inside the image and stays in the top 12 percent; cloth fills most of the width below it. No side ropes or separate loose objects.
Style: premium hand-painted fantasy game art, tactile fabric and thread, warm amber edge light, grounded rather than cartoon flat vector.
Composition: one tall narrow object centered, transparent surrounding padding 8 percent, all edges visible, roughly 1:2 portrait image.
Constraints: genuinely transparent background, no scenery, no cast shadow outside the object, no text, no letters, no watermark, no frame. This exact prop will be animated by deforming its image; keep its resting silhouette clean and symmetrical.
```

### Zuschauer: Ausgangsset

```text
Use case: stylized-concept.
Asset type: transparent 2D character rig parts atlas, exactly TWO columns by THREE rows of equal cells, intended for independent joint animation, NOT an animation strip.
Primary request: six disassembled pieces of ONE hooded fantasy tournament spectator seen from behind, a dark charcoal-plum silhouette with subtle warm gold edge lighting. Rounded friendly alchemist fan with a slightly pointed floppy hood and chunky robe sleeves. No visible face, no eyes, no hands holding objects. Cohesive premium painterly game art with very restrained internal detail; strong silhouette for a distant spectator.
Atlas layout mandatory, each cell one isolated part centered, generous transparent gaps:
top-left: HEAD AND HOOD ONLY, front-facing back of hood with rounded head and slightly bent pointed hood tip, short neck at bottom, no torso.
top-right: TORSO ONLY, shoulders and sleeveless robe chest down to waist, rounded shoulder attachment areas, no head, no arms, no legs.
middle-left: LEFT UPPER ARM ONLY, thick robe sleeve straight vertically downward, round shoulder at top and round elbow at bottom, no hand.
middle-right: RIGHT UPPER ARM ONLY, same mirrored shape straight vertically downward.
bottom-left: LEFT FOREARM WITH MITTEN HAND ONLY, elbow cuff at top and rounded closed fist at bottom, straight vertically downward.
bottom-right: RIGHT FOREARM WITH MITTEN HAND ONLY, same mirrored shape straight vertically downward.
All six pieces belong to the same single character with consistent lighting and scale. Upper arms and forearms have broad overlapping round joint ends for seam-free articulation. The whole upper body will be rigged later in code and cropped at the waist behind a railing.
Composition: exact equal 2-column 3-row grid with no drawn grid lines. Each part completely contained in its own cell with at least 12 percent transparent margin, no touching between cells, no duplicate assembled character. Portrait atlas.
Constraints: actual transparent background, no labels, no text, no scenery, no shadows around the pieces, no additional pieces, no full assembled figure.
```

### Zuschauer: verwendete Korrektur

```text
Use case: precise-object-edit.
Edit target: the six-part transparent spectator rig atlas.
Keep exactly the existing TWO columns by THREE rows atlas, the same six piece positions, the same dark plum hooded alchemist seen from behind, the same warm fine edge light and painterly material. Preserve actual transparency in every gap. Do not add any background or glow.
Change only the joint ends and make the character read more like a restrained distant silhouette: REMOVE the visible black circular socket plates, open holes and exposed round balls at neck, shoulders, and elbows. The robe neck and shoulder ends should be plain overlapping dark cloth, no gold circular shoulder rims. Both upper arm ends and forearm upper ends should be rounded CLOSED cloth sleeve ends, slightly padded, so they overlap invisibly when rigged. Preserve gold edge piping on robe hems, reduce internal contrast and decorative detail overall by about one third. The mitten fists stay unchanged. Hood shape, torso silhouette and six-cell layout stay unchanged. No text, no scenery. The result is a genuinely transparent disassembled character sprite atlas, not a character on a painted background.
```

### Torso: endgültige geschlossene Schultern

```text
Use case: precise-object-edit.
Edit target: this isolated torso sprite for a hooded alchemist spectator viewed from behind.
Keep its exact frontal back-view silhouette, dimensions, dark plum painterly robe, warm fine edge lighting, central gold trim, waist hem and transparent background. There is NO head and NO arms in this sprite.
Change only both shoulder attachment areas: remove the two oval dark socket plates and ALL gold piping rings around them. Paint over those areas with continuous plain dark robe cloth that smoothly joins the torso, like a closed cloak draped over both shoulders. No oval outlines, no sockets, no holes, no separate joint balls. The left and right top shoulders must be softly rounded solid fabric, with continuous cloth folds and only subtle warm outer-edge light. Keep the neck collar unchanged. Do not add arms, head, props, background, labels or text. Actual transparency outside the same torso silhouette.
```
