# Mehr Leben: konkreter Produktionsvorschlag

Stand: 5. Oktober 2026. Dies ist ein Vorschlag; die folgenden neuen Hintergründe, Figuren und Animationen sind noch nicht umgesetzt.

## Ziel und Arbeitsweise

Eine freundliche Alchemisten-Turnierwelt mit hochwertig gemalten Materialien und bewusst gestalteten Animationen. ImageGen liefert Stilentwürfe, freigestellte Bildteile und überprüfte Posen. Anschließend werden Gelenke, verformbare Bildflächen, Bewegungsabläufe und Übergänge ausgearbeitet. Ein schönes Einzelbild allein ist keine fertige Charakteranimation.

Für Figuren und Stoff ist ein 2D-Rig mit Meshverformung sinnvoll. Ein geeigneter Weg wäre Spine Professional mit einer WebGL-Integration über PixiJS. Das ist eine zusätzliche Animationsproduktion und eine kostenpflichtige Toolentscheidung. Die bestehende HTML-Oberfläche und das Kampfsystem können bleiben; nur die animierte Kulisse bekäme eine eigene Zeichenebene. Alternativ lassen sich fertig produzierte Loops als Sprite-Sequenzen abspielen, wenn interaktive Knochen-/Meshsteuerung nicht benötigt wird. Zunächst würde ich eine einzige vollständige Szene als Qualitätsprobe bauen.

## 1. Arena neu aufbauen

Die bestehende Arena bleibt Stilreferenz. Eine neue Hintergrundplatte bekommt zwei klar beleuchtete Kampfpositionen, eine ruhige Bodenmitte und eine sichtbar räumliche Tribüne. Bewegliche Banner und Zuschauer werden aus der Platte ausgespart und als eigene Assets gebaut.

Bildlagen von hinten nach vorn: Himmel/Licht → Architektur → Tribüne → Zuschauer → Banner/Vordergrunddetails → Kessel/Zutaten → kurze Kampf-/Siegeffekte → vorhandene Oberfläche. Desktop und Handy bekommen eigene Kompositionen mit denselben Materialien und Perspektiven. Große Textflächen und Lebensleisten bleiben frei.

## 2. Zuschauer mit echten Bewegungsabläufen

Drei Charaktertypen reichen: ein Hexenfan, ein Pilzwesen und ein kleiner Kobold mit Fahne. Je Figur werden Körper, Kopf, Ober-/Unterarme und Zubehör getrennt angelegt. Überlappende Gelenke verhindern sichtbare Lücken. Die fertigen Rigs werden in zwei bis drei Gruppen und unterschiedlichen Größen eingesetzt.

Animationszustände: ruhiges Atmen/Blinzeln, gespanntes Vorbeugen, kurzer Jubel und überraschte Reaktion. Jubel hat eine vorbereitende Bewegung, einen klaren Akzent und ein weiches Zurückkehren in die Grundhaltung. Arme, Kopf und Fahne reagieren zeitlich versetzt. Gruppen bewegen sich unabhängig; Siege lösen eine kurze, abgestimmte Reaktion aus.

## 3. Banner als Stoff animieren

Zwei oder drei Bannerdesigns; Stange und Stoff getrennt. Der Stoff bekommt ein verformbares Raster mit festem Aufhängepunkt. Eine Welle läuft von oben nach unten; Saum und Quaste reagieren verzögert. Unterschiedliche Windphasen vermeiden Gleichlauf. Ein kurzer Windstoß beim Sieg kann die Feier unterstützen. Es bewegt sich der Stoff, nicht das ganze Bannerbild um einen starren Mittelpunkt.

## 4. Ein ausgearbeitetes Maskottchen

Ein kleiner Flaschendrache am Rand der Werkbank oder Tribüne. Körper, Kopf, Augenlider, Flügel und Schwanz getrennt. Zustände: dösen, blinzeln, einen Angriff verfolgen, bei einem starken Treffer erschrecken und beim Sieg kurz hüpfen. Schwanz und Flügel schwingen nach. Die Figur bleibt außerhalb der bedienbaren Flächen und wird auf dem Handy nur gezeigt, wenn ausreichend Platz vorhanden ist.

## 5. Kurze Siegfeier

Zwei gemalte Feuerwerkstypen als Sprite-Sequenzen/Partikeltexturen über der Tribüne. Der Jubel beginnt sofort, das Feuerwerk folgt leicht verzögert und klingt nach wenigen Sekunden aus. Keine Daueranimation. Die Kampagne kann beim Abschluss einen etwas größeren goldenen Effekt bekommen. Auf kleinen Geräten weniger Partikel und höchstens zwei Zuschauergruppen.

## Danach: Kesselanimationen

Ein aufgetrennter Spielerkessel mit Körper, Rand/Flüssigkeit, Augen/Mund und Henkeln. Zuerst Idle, Treffer, Sieg und Niederlage ausarbeiten: Atmen/Blinzeln, kurzer Rückstoß, freudiger Sprung und Zusammensacken. Flüssigkeit und Henkel reagieren mit Verzögerung. Das erste Rig muss überzeugend wirken, bevor es auf die Gegner übertragen wird.

## Empfohlene erste Ausbaustufe

Eine neue Arena-Komposition, ein Banner und zwei Zuschauerfiguren inklusive Idle und Jubel. Diese vollständige Probe entscheidet über Stil, Bewegungsqualität, Handy-Lesbarkeit und den zusätzlichen Ladeaufwand. Erst danach werden weitere Gruppen, Maskottchen und Feuerwerk produziert.

Prüfkriterien: keine sichtbaren Gelenknähte, keine bildübergreifenden Detailwechsel, weiche Übergänge, nachvollziehbare Reaktionen, ruhige Grundbewegung, klare Silhouetten, Pause und reduzierte Bewegung sowie stabile Bildrate auf Handy und Desktop.

## Geprüfte technische Quellen

- [Spine: Gewichtete Meshverformung](https://eu.esotericsoftware.com/spine-weights) – Gelenke können Bildflächen weich verformen.
- [Offizielle Spine-PixiJS-Integration](https://en.esotericsoftware.com/spine-pixi) – WebGL-Rendering und AnimationState für Zustände/Übergänge.
- [Spine-Versionen und Lizenz](https://en.esotericsoftware.com/spine-purchase) – Meshfunktionen sind in Professional enthalten; Lizenzkosten sind vor einer Toolentscheidung zu berücksichtigen.
