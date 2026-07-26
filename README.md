# Kessel-Krawall

[![Kessel-Krawall spielen](https://img.shields.io/badge/SPIELEN-GitHub%20Pages-f5c55b?style=for-the-badge&labelColor=21172b)](https://emfau88.github.io/KesselKrawall/)

![Kessel-Krawall – magischer Mobile-Autobattler](public/og.png)

## Vision

**Kessel-Krawall ist ein zugänglicher Mobile-Autobattler, in dem wenige
Sekunden Vorbereitung zu überraschend mächtigen und gut lesbaren
Kettenreaktionen führen.**

Der Spieler besitzt einen magischen Zauberkessel mit fünf Zutatenplätzen. Im
Hexenmarkt kauft er Zutaten, verschmilzt gleiche Exemplare zu stärkeren Stufen,
ordnet sie für Nachbarschaftseffekte an und baut Synergien aus Feuer, Gift und
Schutz. Danach übernimmt der Kessel: In einem kurzen automatischen Kampf zeigt
er unmittelbar, ob die getroffenen Entscheidungen funktionieren.

Das Spiel soll kleiner und schneller verständlich sein als große
Synergie-Autobattler, aber denselben befriedigenden Kern besitzen: Ein guter
Kauf verändert nicht nur eine Zahl, sondern kann einen ganzen Build in Bewegung
setzen.

## Kernfantasie

Aus zunächst unscheinbaren Zutaten entsteht im Verlauf eines kurzen Runs ein
absurder, hochskalierender Zauberkessel. Der Spieler soll sich auf jeden Merge
freuen, aktive Synergien im Kampf erkennen und nach einer Niederlage verstehen,
welche Entscheidung oder Schwäche entscheidend war.

## Designprinzipien

- **Vorbereitung ist das Spiel:** Kaufen, Mergen, Positionieren und Reagieren
  bilden die strategische Ebene.
- **Wenige Systeme, starke Wechselwirkungen:** Tiefe entsteht aus Items, nicht
  aus zusätzlichen Menüs oder Ressourcen.
- **Jede Wirkung bleibt lesbar:** Schaden, Gift, Brand, Heilung, Schild und
  Synergien besitzen eindeutiges Feedback.
- **Mobile zuerst:** Große Touchziele, kurze Texte, kein Pflicht-Drag-and-drop
  und getrennte Kauf- und Kampflayouts.
- **Macht muss fühlbar sein:** Merges und Synergien erzeugen erkennbare Sprünge
  statt kaum sichtbarer Prozentsteigerungen.
- **Kleine Runs, echte Varianz:** Acht Gegner führen in wenigen Minuten vom
  ersten Einkauf bis zum Boss.

## Spielbarer Stand

Die Neubauphasen 1–4 sind umgesetzt:

- vollständige Kampagne mit sieben Gegnern und einem Boss
- Bossregel „Kesselzorn“ und Elite-Belohnung
- zwölf datengetriebene Zutaten in drei Familien
- Shop, Verkauf, Rerolls und lokale Run-Speicherung
- fünf per Tap umsortierbare Zutatenplätze
- automatische Merge-Kaskaden bis Level III
- Feuer-, Gift- und Schutz-Synergien
- deterministische Kampfsimulation und Itemstatistiken
- drei Run-Siegel, Kampagnenfortschritt sowie Sieg- und Niederlagenende
- responsive Mobile-First-Oberfläche

## Spielen

- [Öffentliche Version auf GitHub Pages](https://emfau88.github.io/KesselKrawall/)
- [Private Entwicklungsveröffentlichung](https://kessel-krawall.maddeanhotmail.chatgpt.site/)

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Der Entwicklungsserver läuft anschließend unter `http://localhost:3000`.

## Qualitätssicherung

```bash
npm run typecheck
npm run lint
npm test
npm run build:pages
```

Die verbindlichen Produkt- und Spielregeln stehen in
[`docs/GAME_SPEC.md`](docs/GAME_SPEC.md).

## Nächste Ausbaustufen

1. finale mobile Komposition und produzierte Kesselassets
2. stärkere Merge-Inszenierung, Audio und haptisches Feedback
3. systematische Balance-Simulationen und Playtests
4. kurzes First-Run-Onboarding
5. zusätzliche Gegnerpools und kleine Meta-Progression

Kessel-Krawall bleibt bewusst fokussiert: Keine Figuren, kein Pathfinding,
keine komplizierten Rezepte und kein Echtzeit-PvP – dafür ein verständlicher
Loop mit möglichst viel Entscheidungstiefe pro Zutat.
