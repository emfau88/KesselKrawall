# Kessel-Krawall

Ein konsequent Mobile-First entwickelter HTML5-Autobattler. Spieler kaufen
magische Zutaten, verschmelzen gleiche Zutaten, bauen Synergien auf und lassen
ihren Kessel automatisch gegen charakteristische Gegner antreten.

## Aktueller Stand

Die Neubauphasen 1–3 sind umgesetzt:

- verbindliche Kernspezifikation
- datengetriebene Architektur
- zwölf Zutaten und drei Familien
- Shop, Verkauf, Rerolls und lokale Speicherung
- fünf frei umsortierbare Kesselplätze
- automatische Merge-Kaskaden bis Level III
- deterministische Kampfsimulation
- Schaden, Gift, Brand, Schild und Heilung
- Kampfstatistik und wiederholbarer Kernloop

Die finale Acht-Runden-Kampagne, individuellen Bossregeln, produzierte Assets,
Audio und finales Balancing folgen in den nächsten Projektphasen.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Der Entwicklungsserver läuft anschließend standardmäßig unter
`http://localhost:3000`.

## Qualitätssicherung

```bash
npm run typecheck
npm test
```

Die verbindlichen Produkt- und Spielregeln stehen in
[`docs/GAME_SPEC.md`](docs/GAME_SPEC.md).
