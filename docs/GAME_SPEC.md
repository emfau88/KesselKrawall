# Kessel-Krawall – verbindliche Kernspezifikation

Stand: Phase 1–5 des vollständigen Neubaus.

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
- ab Runde 5 ein passiver Ablageplatz außerhalb des aktiven Aufbaus
- drei Merge-Stufen
- eine Synergieschwelle bei drei Familienpunkten
- drei Schutzsiegel; ab Runde 2 verbraucht eine Niederlage ein Siegel
- Hochformat ist vollständig unterstützt; mobiles Querformat fordert zum
  Drehen auf, Desktop-Querformat bleibt funktional
- keine Meta-Progression, vierte Familie oder Online-Funktion

Die Phasen 1–5 implementieren die vollständigen Kernregeln, die mobile
Benutzeroberfläche und eine
abgeschlossene Acht-Runden-Kampagne.

## Kampagnendramaturgie

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

## Economy

- Eine neue Kampagne beginnt mit 7 Gold und 3 Schutzsiegeln.
- Der Shop zeigt drei Angebote.
- Ein gekauftes Angebot bleibt bis zum nächsten Reroll als gekauft markiert.
- Der erste Reroll jeder Runde ist kostenlos, weitere kosten je 1 Gold.
- Nach einem Kampf erhält der Spieler 5 Gold plus 1 Gold alle zwei Runden.
- Ein Sieg gewährt zusätzlich 1 Gold.
- Nicht ausgegebenes Gold bleibt erhalten.
- Verkaufswert: 50 % der investierten Basiskosten, abgerundet, mindestens
  1 Gold. Level I/II/III gelten als 1/2/4 investierte Kopien.
- Ein Kauf bei vollem Kessel ist erlaubt, wenn das neue Level-I-Item sofort
  verschmilzt oder die ab Runde 5 verfügbare Ablage frei ist.

Die ersten Angebote sind verlässlich Chilischote, Schleimpilz und Eierschale
und decken damit alle drei Familien ab. In den ersten Runden enthält
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
  maximal auf 125 %. Heilung, Schild und Cooldowns bleiben unverändert.
- Nach 25 Sekunden gewinnt die höhere relative Lebensenergie. Bei Gleichstand
  entscheidet der tatsächlich verursachte LP-Schaden. Danach ist der Kampf
  unentschieden; Schild ist kein Siegkriterium.
- Runde 1 startet zur Lesbarkeit mit 1× Wiedergabe. Ab Runde 2 ist 2× der
  Standard; 1×, 2× und 4× bleiben jederzeit frei wählbar.
- Gleichzeitiger K. O. ist ein Unentschieden.
- Drachenzahn wächst mit jeder eigenen Aktivierung. Mondsalz kontert
  abgefangene oder ungeschützte Treffer nur gemäß seiner Abklingzeit.
  Heilknolle heilt einmalig unter 50 % LP mit einem kleineren Multiplikator,
  damit sie häufiger sichtbar wird, ohne Kämpfe unnötig zu verlängern.

## Synergien

- **Feuer 3:** 22 % mehr Direktschaden.
- **Gift 3:** Jede Giftanwendung erzeugt einen zusätzlichen Stapel und
  Giftitems laden 5 % schneller.
- **Schutz 3:** 12 Startschild sowie 15 % mehr Heilung und Schild.

## Niederlage und Fortschritt

- Ab Runde 2 verbraucht eine Niederlage ein Schutzsiegel.
- Die nächste Runde beginnt trotzdem; es gibt keine Wiederholung desselben
  Gegners.
- Bei null Siegeln endet die Kampagne.
- Ein Unentschieden kostet kein Siegel und gewährt keinen Siegbonus.
- Nach dem Bosskampf endet der Vertical Slice mit Sieg oder Niederlage.
- Kampf-Lebenspunkte und Schutzsiegel sind getrennte Ressourcen.

## Technische Leitplanken

- React/TypeScript mit datengetriebenen Item- und Gegnerdefinitionen
- reine Funktionen für Shop, Merges, Synergien und Kampfsimulation
- Simulation erzeugt Ereignisse; die UI spielt diese lediglich ab
- lokaler Speicher für stabilen Kampagnenzustand und Einstellungen; ein
  laufender oder abgeschlossener Kampf wird atomar mitgespeichert
- keine globale Sonderfalllogik pro Item; Sonderwirkungen werden über
  deklarative Effekttypen und zentrale Handler abgebildet
- Touchziele mindestens 44 CSS-Pixel
- funktional ab 320 CSS-Pixel Breite
- `100dvh`, Safe Areas und reduzierte Bewegung werden berücksichtigt
- Fullscreen-Toggle über die Browser-API; auf nicht unterstützten iPhones wird
  der Home-Bildschirm-Weg verständlich erklärt
- Kaufaktionen bleiben von der scrollbaren Detail- und Angebotsfläche getrennt

## Abnahme Phase 1–5

- Shop kaufen, verkaufen und neu würfeln
- fünf Slots per Tap umsortieren
- automatische Merge-Kaskaden bis Level III
- Kauf-Merge bei vollem Board
- drei funktionierende Familien-Synergien
- zwölf vollständig datengetriebene Zutaten
- deterministische Kampfauflösung mit Schaden, Gift, Brand, Heilung und Schild
- Kampfstatistik pro Spieleritem
- Ergebnis-, Weiter- und Neustartzustand
- sieben individuelle Gegner und ein finaler Boss
- Elite-Belohnung und sichtbare Bossregel
- Kampagnenfortschritt, Gesamtsieg und endgültige Niederlage
- Kampagnenzustand wird lokal gespeichert
- eigenständige Kauf-, Kampf- und Ergebnisdarstellung im Hochformat
- keine abgeschnittenen oder überlagerten Bedienelemente ab 320 × 568 Pixeln
- Fullscreen kann aktiviert und wieder verlassen werden
- Produktions-Build und automatisierte Kernregeltests laufen fehlerfrei
