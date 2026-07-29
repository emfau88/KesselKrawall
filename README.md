# Kessel-Krawall

[![Kessel-Krawall spielen](https://img.shields.io/badge/SPIELEN-GitHub%20Pages-f5c55b?style=for-the-badge&labelColor=21172b)](https://emfau88.github.io/KesselKrawall/)

![Kessel-Krawall – magischer Mobile-Autobattler](public/og.png)

**Kessel-Krawall ist ein zugänglicher Mobile-Autobattler über einen magischen
Kessel, fünf Zutatenplätze und möglichst wirkungsvolle Kettenreaktionen.**

Im Hexenmarkt kaufst du Zutaten, verschmilzt gleiche Exemplare zu stärkeren
Stufen und kombinierst Feuer, Gift und Schutz. Danach kämpft dein Kessel
automatisch – und zeigt unmittelbar, ob dein Aufbau funktioniert.

## Direkt spielen

[**Öffentliche Version auf GitHub Pages öffnen**](https://emfau88.github.io/KesselKrawall/)

Das Spiel läuft ohne Installation im Browser. Der Kampagnenstand wird lokal auf
dem Gerät gespeichert.

## Einblick

<p align="center">
  <img src="docs/readme/startscreen.png" alt="Startscreen von Kessel-Krawall" width="49%">
  <img src="docs/readme/hexenmarkt.png" alt="Hexenmarkt und Aufbauphase" width="49%">
</p>

## Der Spielablauf

1. **Einkaufen:** Wähle im Hexenmarkt aus drei angebotenen Zutaten.
2. **Aufbauen:** Belege fünf Plätze und ordne deinen Kessel per Tap um.
3. **Mergen:** Drei gleiche Zutaten verschmelzen automatisch bis Level III.
4. **Synergien bilden:** Kombiniere Feuer, Gift und Schutz sowie
   Nachbarschaftseffekte.
5. **Kämpfen:** Dein Aufbau tritt automatisch gegen den nächsten Kessel an.
6. **Anpassen:** Nutze Ergebnis und Itemstatistiken für die nächste Runde.

Eine Kampagne führt über sieben Gegner zum Großkessel als finalem Boss. Drei
Schutzsiegel verzeihen Fehler, aber nicht unbegrenzt.

## Drei Familien, unterschiedliche Rhythmen

| Familie | Spielidee |
| --- | --- |
| **Feuer** | Direkter Schaden, Brand und aggressive Kettenreaktionen |
| **Gift** | Stapelbare Vergiftung, anhaltender Druck und Verstärkung gegen vergiftete Ziele |
| **Schutz** | Schilde, Heilung, Konter und kontrollierte Gegenangriffe |

Die zwölf Zutaten sind datengetrieben definiert. Position, Merge-Stufe,
Familiengewicht und gegenseitige Auslöser entscheiden darüber, wie sich ein
Build im Kampf verhält.

## Aktueller spielbarer Stand

- vollständige Kampagne mit acht Kämpfen und Bossregel „Kesselzorn“
- zwölf Zutaten in drei Familien, Merge-Kaskaden bis Level III
- fünf per Tap umsortierbare Zutatenplätze
- Shop, Verkauf, neue Angebote und lokale Spielstand-Speicherung
- Feuer-, Gift- und Schutz-Synergien mit Nachbarschaftseffekten
- deterministische Kampfsimulation mit klarer visueller Präsentation
- lesbare Kampfmeldungen, reaktive Lebensbalken und Itembeiträge nach der Runde
- individuelle Projektilgrafiken, gestaffelte Merge-Inszenierung und
  responsive Layouts
- Fullscreen-Modus, Safe Areas und große Touchziele für moderne Smartphones

## Produktvision

Kessel-Krawall soll kleiner und schneller verständlich sein als große
Synergie-Autobattler, aber denselben befriedigenden Kern besitzen: Ein guter
Kauf verändert nicht nur eine Zahl, sondern kann einen ganzen Build in Bewegung
setzen.

Dabei gelten fünf Leitlinien:

- **Vorbereitung ist das Spiel:** Kaufen, Mergen, Positionieren und Reagieren
  bilden die strategische Ebene.
- **Wenige Systeme, starke Wechselwirkungen:** Tiefe entsteht aus Items statt
  aus zusätzlichen Menüs und Ressourcen.
- **Jede Wirkung bleibt lesbar:** Schaden, Gift, Brand, Heilung, Schild und
  Synergien erhalten eindeutiges Feedback.
- **Mobile zuerst:** Große Touchziele, kurze Texte und kein
  Pflicht-Drag-and-drop.
- **Macht muss fühlbar sein:** Merges und Synergien erzeugen erkennbare Sprünge
  statt kaum sichtbarer Prozentsteigerungen.

## Technik und Architektur

- Next.js, React und TypeScript
- statischer Build für GitHub Pages
- getrennte, deterministische Kampfsimulation und UI-Präsentation
- datengetriebene Zutaten und Gegner
- lokal versionierter Spielstand mit Validierung
- automatisierte Tests für Shop, Kampagne, Simulation und Kampfdarstellung

Die verbindlichen Produkt- und Spielregeln stehen in
[`docs/GAME_SPEC.md`](docs/GAME_SPEC.md).

## Lokale Entwicklung

Voraussetzung ist Node.js 22.13 oder neuer.

```bash
npm install
npm run dev
```

Der Entwicklungsserver läuft anschließend unter `http://localhost:3000`.

```bash
npm run typecheck
npm run lint
npm test
npm run build:pages
```

## Nächste Schwerpunkte

1. festgefahrene Kämpfe durch eine sanfte späte Schadenssteigerung reduzieren
2. Startkessel, Magiekreis und Dekoration als lebendige Idle-Szene ausarbeiten
3. den Einstieg in Spielfeld und Hexenmarkt ohne Erklärungsfenster weiterführen
4. Shop-Druck auf vollen Aufbauten und spätere Inhalts-Erweiterungen prüfen
5. die Kampagnenstruktur für zusätzliche Kampagnen und Gegnerpools vorbereiten

Kessel-Krawall bleibt bewusst fokussiert: keine Figuren, kein Pathfinding,
keine komplizierten Rezepte und kein Echtzeit-PvP – dafür ein verständlicher
Loop mit möglichst viel Entscheidungstiefe pro Zutat.
