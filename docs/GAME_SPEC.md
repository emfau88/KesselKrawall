# Kessel-Krawall – verbindliche Kernspezifikation

Stand: Phase 1–3 des vollständigen Neubaus.

## Produktziel

Kessel-Krawall ist ein Mobile-First-HTML5-Autobattler im Hochformat. Der
Spieler trifft seine Entscheidungen in einer kurzen Kaufphase, bestückt fünf
Kesselplätze und beobachtet anschließend einen deterministischen Kampf. Tiefe
entsteht aus Merges, Platzierung, Familiengewicht und wenigen gut lesbaren
Wechselwirkungen.

Oaken Tower dient als Qualitätsreferenz für Entscheidungsdichte und
skalierende Kombinationen, nicht als Vorlage für Inhalte, Darstellung oder
Online-Systeme.

## Verbindlicher Scope des Vertical Slice

- acht Kämpfe: sieben reguläre Gegner und ein Boss
- zwölf Zutaten: je vier aus Feuer, Gift und Schutz
- maximal fünf belegte Kesselplätze
- drei Merge-Stufen
- eine Synergieschwelle bei drei Familienpunkten
- drei Run-Siegel; eine Niederlage verbraucht ein Siegel
- Hochformat ist vollständig unterstützt; Querformat bleibt zunächst
  funktional
- keine Meta-Progression, vierte Familie oder Online-Funktion

Die aktuelle Phase 1–3 implementiert die vollständigen Kernregeln und einen
spielbaren, wiederholbaren Testlauf mit drei Gegnerarchetypen. Die finale
Acht-Runden-Dramaturgie gehört zu Phase 4.

## Economy

- Ein neuer Run beginnt mit 7 Gold und 3 Run-Siegeln.
- Der Shop zeigt drei Angebote.
- Ein gekauftes Angebot bleibt bis zum nächsten Reroll als gekauft markiert.
- Der erste Reroll jeder Runde ist kostenlos, weitere kosten je 1 Gold.
- Nach einem Kampf erhält der Spieler 5 Gold plus 1 Gold alle zwei Runden.
- Ein Sieg gewährt zusätzlich 1 Gold.
- Nicht ausgegebenes Gold bleibt erhalten.
- Verkaufswert: 50 % der investierten Basiskosten, abgerundet, mindestens
  1 Gold. Level I/II/III gelten als 1/2/4 investierte Kopien.
- Ein Kauf bei vollem Board ist erlaubt, wenn das neue Level-I-Item sofort mit
  einer vorhandenen Level-I-Kopie verschmilzt.

Die ersten Angebote decken alle drei Familien ab. In den ersten Runden enthält
der erste Reroll beziehungsweise Folgeshop bevorzugt eine vorhandene Zutat,
damit ein schlechter Zufallsstart den Run nicht entscheidet.

## Board, Platzierung und Merge

- Die fünf Slots bilden eine geordnete Reihe entlang des sichtbaren Halbkreises.
- Direkte Nachbarn sind ausschließlich Slot `n-1` und `n+1`.
- In der Kaufphase wird ein Item angetippt und anschließend durch Tap auf einen
  zweiten Slot kostenlos getauscht.
- Im Kampf ist die Anordnung gesperrt.
- Zwei gleiche Items derselben Stufe verschmelzen automatisch.
- Bei einer Kaskade bleibt der Slot mit dem kleineren Index belegt.
- Level III ist die Maximalstufe.
- Familiengewicht: Level I = 1, Level II = 2, Level III = 4.
- Ein Level-III-Item kann daher allein die 3er-Synergie aktivieren. Das ist
  beabsichtigt: Gewertet wird die Investition, nicht die Anzahl belegter Slots.
- Die Anzeige wird bei aktiver Synergie auf `3/3` gedeckelt.

## Kampfregeln

- Die Simulation ist von der Darstellung getrennt und erzeugt ein Ereignislog.
- Kämpfe sind bei identischem Build und Gegner reproduzierbar.
- Items starten mit ihrem vollständigen Cooldown.
- Direkte Nachbarschaftseffekte werden vor Kampfbeginn berechnet.
- Aktionen mit identischem Zeitstempel dürfen noch auslösen, wenn ihr Besitzer
  zu Beginn dieses Zeitstempels lebte.
- Schild absorbiert Schaden vor Lebenspunkten.
- Heilung ist auf die maximalen Lebenspunkte begrenzt; nur ausdrücklich
  bezeichnete Items verwandeln Überheilung in Schild.
- Gift tickt alle 2 Sekunden. Jede Quelle verursacht Schaden in Höhe ihrer
  verbleibenden Stapel und verliert danach einen Stapel.
- Brand tickt jede Sekunde nach demselben Prinzip.
- Nach 25 Sekunden gewinnt die höhere relative Lebensenergie. Bei Gleichstand
  entscheidet der höhere Schildwert; bleibt auch dieser gleich, gewinnt der
  verteidigende Gegner.

## Synergien

- **Feuer 3:** 22 % mehr Direktschaden.
- **Gift 3:** Jede Giftanwendung erzeugt einen zusätzlichen Stapel und
  Giftitems laden 5 % schneller.
- **Schutz 3:** 12 Startschild sowie 15 % mehr Heilung und Schild.

## Niederlage und Fortschritt

- Eine Niederlage verbraucht ein Run-Siegel.
- Die nächste Runde beginnt trotzdem; es gibt keine Wiederholung desselben
  Gegners.
- Bei null Siegeln endet der Run.
- Nach dem Bosskampf endet der Vertical Slice mit Sieg oder Niederlage.
- Kampf-Lebenspunkte und Run-Siegel sind getrennte Ressourcen.

## Technische Leitplanken

- React/TypeScript mit datengetriebenen Item- und Gegnerdefinitionen
- reine Funktionen für Shop, Merges, Synergien und Kampfsimulation
- Simulation erzeugt Ereignisse; die UI spielt diese lediglich ab
- lokaler Speicher für stabilen Runzustand und Einstellungen
- keine globale Sonderfalllogik pro Item; Sonderwirkungen werden über
  deklarative Effekttypen und zentrale Handler abgebildet
- Touchziele mindestens 44 CSS-Pixel
- funktional ab 320 CSS-Pixel Breite
- `100dvh`, Safe Areas und reduzierte Bewegung werden berücksichtigt

## Abnahme Phase 1–3

- Shop kaufen, verkaufen und neu würfeln
- fünf Slots per Tap umsortieren
- automatische Merge-Kaskaden bis Level III
- Kauf-Merge bei vollem Board
- drei funktionierende Familien-Synergien
- zwölf vollständig datengetriebene Zutaten
- deterministische Kampfauflösung mit Schaden, Gift, Brand, Heilung und Schild
- Kampfstatistik pro Spieleritem
- Ergebnis-, Weiter- und Neustartzustand
- Runzustand wird lokal gespeichert
- Produktions-Build und automatisierte Kernregeltests laufen fehlerfrei
