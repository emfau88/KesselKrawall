# Werkbank und Familien-Effekte

Stand: 5. Oktober 2026. Umgesetzt sind die freigegebenen Punkte 2 und 3. Neue Kesselanimationen für Sieg/Niederlage sowie weitere Hintergründe sind Vorschläge für den nächsten Schritt.

## Umgesetzt

- Desktop-Werkbank: eigene Brau-Nische mit warmem Licht, dunklem Holz, Bronze und ruhiger Mitte. Kessel, Zutaten und Ritualplattform bleiben unabhängige Elemente.
- Aktive Familien ab drei Familienpunkten: Feuerfunken, Giftblasen, Schutzrunen, Frostkristalle und Echo-Ringe. Item-Level zählen wie in der bestehenden Synergieanzeige.
- Effekte im Shop und im Kampf; Pause hält sie an. Bei reduzierter Bewegung bleiben ruhige Bildlagen. Besiegte Kessel und Ergebnisbilder erhalten diese Effekte nicht.
- Auf dem Handy bleibt der Shop kompakt; die Familien-Effekte erscheinen an den Kesseln im Kampf.
- Fünf transparente ImageGen-Atlanten ersetzen die erste SVG-Symbolfassung. Jeder Atlas enthält vier unabhängig animierte Bildlagen; keine neue Animationsbibliothek und keine JavaScript-Bildtimer.
- Nach visueller Rückmeldung sind Rauchflächen um die Kesselmitte gespiegelt, am ovalen Rand verankert und auf mittlere Stärke eingestellt. Der Bodenring bleibt separat; Rauch an den Beinen wird ausgeblendet.
- Vollständige Prompts und Asset-Herkunft stehen in `family-effects-imagegen.md`.

## Bewertung und nächste Art Direction

Die Werkbank hat jetzt einen klaren Ort und mehr räumliche Tiefe. Der größte verbleibende Hebel ist eine abgestimmte Arena statt vieler unabhängiger Schmuckelemente. Empfehlenswert ist eine freundliche, leicht schräge Alchemisten-Turnierwelt: warmes Gold und Holz, violette Schatten, Magie in den Familienfarben. Vorhandene Zutaten und Kessel passen bereits gut dazu.

Priorität der nächsten Assets:

1. Arena als saubere Hintergrundplatte ohne eingebrannte Kessel, Zuschauer oder Banner. Zwei klar beleuchtete Kampfpositionen und eine ruhige Bodenmitte. Eigene Desktop- und Portrait-Komposition statt bloßem Zuschnitt.
2. Drei bis vier kleine Zuschauergruppen mit transparentem Hintergrund: unterschiedliche Hexen, Pilzwesen oder Mini-Drachen. Jeweils neutraler Körper plus getrennte Arm-/Fahnenebene. Unterschiedliche, langsame Bewegungsphasen erzeugen Leben ohne dauerndes Gewimmel.
3. Zwei bis drei eigenständige Stoffbanner mit klaren Aufhängepunkten. Ruhiges Schwingen; beim Sieg ein kurzer stärkerer Impuls. Bestehende gemalte Banner müssen aus einer neuen Hintergrundplatte ausgespart werden, damit keine Doppelungen entstehen.
4. Ein kleines Maskottchen am Rand, z. B. ein schläfriger Flaschendrache, der bei großen Treffern aufwacht. Erst ein Tier ausarbeiten, bevor viele Figuren hinzukommen.
5. Siegfeier: kurze Feuerwerk-/Funkenemitter hinten über der Tribüne, Jubel vorn. Auf Sieg begrenzt; Lebensleisten, Zutaten und Meldungen bleiben frei.

## Kontrollierter Aufbau in Ebenen

Von hinten nach vorn: Himmel/Licht → Architektur/Tribüne → Zuschauergruppen → getrennte Arme/Fahnen → Kampfplätze/Kessel/Zutaten → kurze Treffer- und Siegeffekte → Oberfläche.

ImageGen liefert die statischen Bildbausteine, transparente Freisteller und gegebenenfalls einzelne Posen. Es erzeugt in diesem Workflow keine fertige, riggbare Animation und garantiert keine identischen Details über eine ganze Bildsequenz. Für reproduzierbare Bewegungen nutzen wir Code: verschieben, drehen, skalieren und gezielt zwischen überprüften Posen wechseln. Banner können für weiche Stoffbewegung ein verformbares Raster erhalten; reine Rotation wirkt eher wie ein Schild. Eine fertige Animationssequenz erfordert zusätzliche Frame-Prüfung und Nacharbeit.

Produktionsreihenfolge: zuerst eine komplette statische Arena-Komposition prüfen; anschließend nur zwei Zuschauergruppen und ein Banner animieren; danach Sieg-Jubel ergänzen. Jede Gruppe bekommt einen eigenen Drehpunkt, Bewegungsbereich und Zeitversatz. Animationen laufen nicht aus dem Spieltakt, pausieren mit dem Kampf und respektieren reduzierte Bewegung. Desktop darf mehr Gruppen zeigen, Mobile nur die stärksten ein bis zwei.

Für die späteren Kesselanimationen ist 2.5D ausreichend: Körper, Rand/Flüssigkeit, Augen/Mund, Henkel und Licht getrennt. Sieg: kurzer Sprung, fröhlicher Gesichtsausdruck, Flüssigkeitswelle. Niederlage: zusammensacken, Augen verändern, Dampf verpufft. Treffer: kurzer Rückstoß mit passendem Gesichtsausdruck. Diese Arbeit ist noch nicht umgesetzt.

## Neues Hintergrundasset und Herkunft

- Projektdatei: `public/assets/backgrounds/market-workbench-alcove-v1.webp` (1024 × 1536, 225.830 Byte).
- Erzeugt mit dem eingebauten ImageGen-Tool; anschließend als WebP für das Spiel kodiert.
- Unverändertes Original: `C:\Users\madde\.codex\generated_images\01a10c11-357f-7c53-9550-86ef135c0a96\exec-e7b38605-f42c-4f60-90aa-697dc4e802e8.png`.
- Stilreferenzen: `cauldron-player-v3.png`, `market-ritual-platform-v1.png`, `witch-market-scene-desktop-v2.webp`.

Finaler Generierungsprompt:

```text
Use case: stylized-concept.
Asset type: production background plate for the left desktop preparation panel of the fantasy autobattler Kessel Krawall.
Input images: image 1 is ONLY a style/material reference for the gold and teal smiling cauldron; image 2 is ONLY a style/perspective reference for the separate existing golden ritual platform; image 3 is ONLY the established environment style reference. Do not copy characters or platform into the new background.
Primary request: create a beautiful, cohesive alchemist's brewing alcove, a premium whimsical fantasy game illustration with dimensional hand-painted 3D-looking materials, closely matching the references.
Composition: portrait 1024x1536. Symmetrical view into a stone-and-dark-wood brewing workshop; softly lit empty central alcove, central 65% clean and low detail to hold live cauldron and ingredient UI. Ornate wooden shelf framing only at far left/right edges, a few potion bottles, brass lanterns and hanging herbs near edges. Warm soft light comes from above the center, gentle teal reflected light near floor. Lower 25% is an empty dark stone work surface/floor with realistic contact-light falloff, so a separate gold platform can be placed there in the game. Top 20% dark and quiet to support headings, lower 12% quiet for synergy labels.
Materials and palette: burnished bronze, dark walnut, muted purple shadows, warm amber, restrained teal. Clear depth and natural lighting, friendly magic workshop, polished painted surfaces consistent with reference cauldron.
Constraints: NO cauldron, NO character, NO platform, NO pedestal, NO circular floor symbol, NO text, letters, logos, border, UI, watermark or interface boxes. No brightly glowing object in the central empty area. This is a complete opaque background, not a screenshot. Avoid overcrowding, neon, photorealism, horror and heavy black crushing; preserve readable mid-tone texture.
```
