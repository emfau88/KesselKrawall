# Kessel-Krawall – verbindliche Kernspezifikation

Stand: Kampagnenausbau mit Kesselkabinett und Frostarchiv.

## Produktziel

Kessel-Krawall ist ein Mobile-First-HTML5-Autobattler im Hochformat. Der
Spieler trifft seine Entscheidungen in einer kurzen Kaufphase, bestückt fünf
Kesselplätze und beobachtet anschließend einen deterministischen Kampf. Tiefe
entsteht aus Merges, Platzierung, Familiengewicht und wenigen gut lesbaren
Wechselwirkungen.

Oaken Tower dient als Qualitätsreferenz für Entscheidungsdichte und
skalierende Kombinationen, nicht als Vorlage für Inhalte, Darstellung oder
Online-Systeme.

## Verbindlicher spielbarer Scope

- zwei Kampagnen mit je acht Kämpfen: sechs reguläre Gegner, eine Elite und
  ein Boss
- zwanzig Zutaten: je vier aus Feuer, Gift, Schutz, Frost und Echo
- maximal fünf belegte Kesselplätze
- ab Runde 5 ein passiver Ablageplatz außerhalb des aktiven Aufbaus
- drei Merge-Stufen
- eine Synergieschwelle bei drei Familienpunkten
- pro Kampagne genau drei aktive Familien; Kampagne II setzt Frost und Echo
  fest und ergänzt eine gewählte Familie aus Feuer, Gift oder Schutz
- drei Schutzsiegel; nur die erste Niederlage in Runde 1 ist geschützt
- Hochformat ist vollständig unterstützt; mobiles Querformat fordert zum
  Drehen auf, Desktop-Querformat bleibt funktional
- Im Desktop-Querformat nutzt der Hexenmarkt eine inszenierte, interaktive
  Kesselwerkbank und kompakte Aktionsbuttons; die mobile Aufbauansicht bleibt
  davon unberührt.
- Meta-Fortschritt schaltet Inhalte und Trophäen frei, gewährt aber keine
  dauerhaften Kampfkraft-Boni; keine Online-Funktion

Die Kernregeln und die mobile Benutzeroberfläche gelten unverändert für beide
Kampagnen. Jeder Run beginnt mit einem frischen Kessel, 7 Gold und 3 Siegeln.

## Kampagnendramaturgie

Eine neue Kampagne zeigt vor dem ersten Einkauf einmalig die Kampfarena mit
Gegner- und Spielerkessel. Erst danach führt ein klarer Einstieg zum Hexenmarkt.

### Kampagne I – Der große Kessel-Wettstreit

1. **Zischbert:** verständlicher Feuerstart ohne Schutz
2. **Moor-Martha:** erster sichtbarer Giftaufbau
3. **Schild-Siggi:** Schutz und niedriger Gegenschaden
4. **Knister-Klara:** erste familienübergreifende Kombination
5. **Tox-Toni:** aktive Gift-Synergie
6. **Brösel-Berta:** Schutz-Synergie mit Feuerdruck
7. **Meisterin Mirea:** Elite-Feuerbuild und zwei Bonusgold
8. **Der Großkessel:** Boss mit Kesselzorn

Der Großkessel verstärkt unter 50 % Lebensenergie alle eigenen Wirkungen um
25 %. Dies ist seine einzige exklusive Regel und wird im Kampf sichtbar
angekündigt.

### Kampagne II – Das frostgebundene Archiv

1. **Reif-Rudi:** Einstieg in Frosttreffer und Eisschild
2. **Hall-Hanne:** erste aktive Echo-Synergie
3. **Eis-Elsa:** Frost-Rhythmus mit Heilung und Schutz
4. **Takt-Tilda:** Nachbarschaftsbuffs aus Frost und Echo
5. **Splitter-Sven:** aktive Frost-Synergie und Tempokontrolle
6. **Resonanz-Rosa:** aktive Echo-Synergie mit Doppelwirkungen
7. **Archivarin Aeva:** Elite-Build aus Frost und Echo, zwei Bonusgold
8. **Der Chronokessel:** Boss mit Zeitbruch

Der Chronokessel verstärkt unter 50 % Lebensenergie seine Wirkungen um 15 %
und verschiebt einmalig den nächsten normalen Aktivierungszeitpunkt aller
Spieleritems um 0,9 Sekunden. Die Regel wird im Kampf sichtbar angekündigt.

## Economy

- Eine neue Kampagne beginnt mit 7 Gold und 3 Schutzsiegeln.
- Der Shop zeigt drei Angebote.
- Ein gekauftes Angebot bleibt bis zum nächsten Reroll als gekauft markiert.
- Der erste Reroll jeder Runde ist kostenlos, weitere kosten je 1 Gold.
- Nach einem Sieg erhält der Spieler 5 Gold plus 1 Gold alle zwei Runden.
- Ein Sieg gewährt zusätzlich 1 Gold; Elite-Bonusgold kommt darauf.
- Eine Niederlage mit verbleibender Kampagne gewährt 3 Trostgold.
- Ein Unentschieden gewährt kein Gold, damit Wiederholungen nicht farmbar sind.
- Nicht ausgegebenes Gold bleibt erhalten.
- Verkaufswert: 50 % der investierten Basiskosten, abgerundet, mindestens
  1 Gold. Level I/II/III gelten als 1/2/4 investierte Kopien.
- Ein Kauf bei vollem Kessel ist erlaubt, wenn das neue Level-I-Item sofort
  verschmilzt oder die ab Runde 5 verfügbare Ablage frei ist.

Die ersten Angebote decken verlässlich die drei aktiven Familien ab: in
Kampagne I Chilischote, Schleimpilz und Eierschale; in Kampagne II
Frostsplitter, Spiegelscherbe und das Startitem der gewählten gemeisterten
Familie. In den ersten Runden enthält
der erste Reroll beziehungsweise Folgeshop bevorzugt eine vorhandene Zutat,
damit ein schlechter Zufallsstart die Kampagne nicht entscheidet.

## Board, Platzierung und Merge

- Die fünf Slots bilden eine geordnete Reihe entlang des sichtbaren Halbkreises.
- Direkte Nachbarn sind ausschließlich Slot `n-1` und `n+1`.
- In der Kaufphase wird ein Item angetippt und anschließend durch Tap auf einen
  zweiten Slot kostenlos getauscht.
- Im Kampf ist die Anordnung gesperrt.
- Ab Runde 5 steht eine einzelne Ablage zur Verfügung. Das dort geparkte Item
  kämpft nicht, zählt nicht für Synergien oder Macht und kann in der Kaufphase
  mit einem Kesselplatz getauscht oder verkauft werden.
- Zwei gleiche Items derselben Stufe verschmelzen automatisch.
- Merges berücksichtigen Kessel und Ablage gemeinsam. Wenn eine Kaskade ein
  passendes Item im Kessel erreicht, bleibt das Ergebnis im aktiven Kessel.
- Bei einer Kauf-Kaskade bleibt immer die bereits vorhandene, durch den Kauf
  aufgewertete Zutat an ihrem Slot. Das Merge-Ziel wird vor dem Kauf angezeigt.
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
- Schild ist auf 50 % der maximalen Lebenspunkte begrenzt.
- Heilung ist auf die maximalen Lebenspunkte begrenzt; nur ausdrücklich
  bezeichnete Items verwandeln Überheilung in Schild. Ein Kessel mit null
  Lebenspunkten kann nicht mehr geheilt werden.
- Gift ist ein gemeinsamer Status mit maximal 12 Stapeln. Es tickt alle
  2 Sekunden, verursacht die aufgerundete Hälfte der aktuellen Stapel als
  Schaden und verliert danach zwei Stapel. Erreicht eine Giftanwendung
  mindestens 10 Stapel, verbraucht ein klar benannter **Toxinschock** alle
  Stapel und verursacht sofort 150 % ihrer Menge als Schaden.
- Brand tickt jede Sekunde pro Quelle in Höhe der verbleibenden Brandstapel
  und verliert danach einen Stapel.
- Ab 15 Sekunden steigt der Schaden beider Kessel alle 2 Sekunden um 5 %,
  zunächst maximal auf 125 %. Ab Sekunde 25 beschleunigt die Schlussphase
  den Bonus alle 2 Sekunden um weitere 15 %, maximal auf 170 %. Heilung,
  Schild und Cooldowns bleiben unverändert.
- Nach 30 Sekunden gewinnt die höhere relative Lebensenergie. Bei Gleichstand
  entscheidet der tatsächlich verursachte LP-Schaden. Danach ist der Kampf
  unentschieden; Schild ist kein Siegkriterium.
- Runde 1 startet zur Lesbarkeit mit 1× Wiedergabe. Ab Runde 2 ist 2× der
  Standard; 1×, 2× und 4× bleiben jederzeit frei wählbar.
- Gleichzeitiger K. O. ist ein Unentschieden.
- Bei einem eindeutigen K. O. kollabiert der besiegte Kessel kurz sichtbar und
  dunkelt vor der Ergebnisansicht ab. Dieser Effekt ist reine Präsentation und
  verändert weder Ereignislog noch Kampfzeitpunkt oder Ergebnis.
- Drachenzahn wächst mit jeder eigenen Aktivierung. Mondsalz kontert
  abgefangene oder ungeschützte Treffer nur gemäß seiner Abklingzeit.
  Heilknolle heilt einmalig unter 50 % LP mit einem kleineren Multiplikator,
  damit sie häufiger sichtbar wird, ohne Kämpfe unnötig zu verlängern.

## Synergien

- **Feuer 3:** 22 % mehr Direktschaden.
- **Gift 3:** Jede Giftanwendung erzeugt einen zusätzlichen Stapel und
  Giftitems laden 5 % schneller.
- **Schutz 3:** 12 Startschild sowie 15 % mehr Heilung und Schild.
- **Frost 3:** Jede dritte Frost-Aktivierung verschiebt die nächsten normalen
  Aktivierungen des Gegners um 0,65 Sekunden.
- **Echo 3:** Jede dritte Echo-Aktivierung wiederholt ihre Wirkung sofort mit
  55 % Stärke. Der Nachhall zählt nicht als neue Aktivierung und kann sich
  nicht selbst erneut auslösen.

## Niederlage und Fortschritt

- Die erste Niederlage in Runde 1 verbraucht kein Schutzsiegel. Jede weitere
  Niederlage verbraucht eines.
- Nur ein Sieg schaltet den nächsten Gegner frei. Nach Niederlage oder
  Unentschieden bleibt derselbe Gegner samt Kesselvariante bestehen und der
  Spieler bereitet eine Revanche mit neuen Angeboten vor.
- Bei null Siegeln endet die Kampagne.
- Ein Unentschieden kostet kein Siegel und gewährt kein Gold.
- Der Boss kann erneut herausgefordert werden, solange noch ein Siegel bleibt.
- Kampf-Lebenspunkte und Schutzsiegel sind getrennte Ressourcen.
- Der Sieg in Kampagne I schaltet Kampagne II im Kesselkabinett frei.
- Trophäen speichern Siege, bestes Siegel-Ergebnis und finale Buildstärke.
  Gold, Zutaten, Siegel und Kampfkraft werden nie zwischen Runs übertragen.

## Technische Leitplanken

- React/TypeScript mit datengetriebenen Item- und Gegnerdefinitionen
- reine Funktionen für Shop, Merges, Synergien und Kampfsimulation
- Simulation erzeugt Ereignisse; die UI spielt diese lediglich ab
- lokaler Speicher für stabilen Kampagnenzustand, Profilfortschritt und
  Einstellungen; ein
  laufender oder abgeschlossener Kampf wird atomar mitgespeichert
- keine globale Sonderfalllogik pro Item; Sonderwirkungen werden über
  deklarative Effekttypen und zentrale Handler abgebildet
- Touchziele mindestens 44 CSS-Pixel
- funktional ab 320 CSS-Pixel Breite
- `100dvh`, Safe Areas und reduzierte Bewegung werden berücksichtigt
- Fullscreen-Toggle über die Browser-API; auf nicht unterstützten iPhones wird
  der Home-Bildschirm-Weg verständlich erklärt
- Kaufaktionen bleiben von der scrollbaren Detail- und Angebotsfläche getrennt

## Abnahme des spielbaren Stands

- Shop kaufen, verkaufen und neu würfeln
- fünf Slots per Tap umsortieren
- automatische Merge-Kaskaden bis Level III
- Kauf-Merge bei vollem Board
- fünf funktionierende Familien-Synergien
- zwanzig vollständig datengetriebene Zutaten
- deterministische Kampfauflösung mit Schaden, Gift, Brand, Heilung und Schild
- Kampfstatistik pro Spieleritem
- Ergebnis-, Weiter- und Neustartzustand
- vierzehn individuelle Gegner, zwei Eliten und zwei finale Bosse
- Elite-Belohnungen und zwei sichtbare Bossregeln
- Kampagnenfortschritt, Freischaltung, Trophäen, Gesamtsieg und endgültige
  Niederlage
- Kampagnenzustand wird lokal gespeichert
- eigenständige Kauf-, Kampf- und Ergebnisdarstellung im Hochformat
- keine abgeschnittenen oder überlagerten Bedienelemente ab 320 × 568 Pixeln
- Fullscreen kann aktiviert und wieder verlassen werden
- Produktions-Build und automatisierte Kernregeltests laufen fehlerfrei
