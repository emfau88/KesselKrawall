# Kessel-Krawall – Balance-Diagnose

Feste Seedfolge mit 64 Kampagnen pro Strategie, 6 Strategien und 3072 primären Kämpfen. Zusätzlich wurden 9216 Kampfzeit-Szenarien gerechnet.

## Methodik

- **Buildstärke:** Kauft den größten Zuwachs der groben Buildstärke pro Gold.
- **Merge-Fokus:** Priorisiert sofortige Merges, vorhandene Zutaten und danach Buildstärke.
- **Feuer-Fokus:** Bevorzugt Feuerzutaten und Merges, kauft aber bezahlbare Ergänzungen.
- **Gift-Fokus:** Bevorzugt Giftzutaten und Merges, kauft aber bezahlbare Ergänzungen.
- **Schutz-Fokus:** Bevorzugt Schutzzutaten und Merges, kauft aber bezahlbare Ergänzungen.
- **Matchup-Suche:** Bewertet Käufe mit der echten Simulation des nächsten Gegners und darf legal verkaufen/ersetzen.

Alle Strategien verwenden genau den kostenlosen Reroll und keine bezahlten Rerolls. Nur die Matchup-Suche darf die bereits vorhandene Verkaufsfunktion nutzen.

## Strategievergleich

| Strategie | Sieg | Timeout | Ø Simulation | Ø sichtbare 1×-Dauer | Käufe/Shop | Gold vor R8 übrig | Ersetzungen/Shop |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Buildstärke | 86.33 % | 37.89 % | 18.7 s | 38.7 s | 1.78 | 17.69 | 0.00 |
| Merge-Fokus | 88.09 % | 35.35 % | 18.1 s | 38.1 s | 1.83 | 16.44 | 0.00 |
| Feuer-Fokus | 88.67 % | 28.32 % | 16.5 s | 35.6 s | 1.77 | 17.36 | 0.00 |
| Gift-Fokus | 71.29 % | 36.72 % | 19.1 s | 40.9 s | 1.79 | 14.81 | 0.00 |
| Schutz-Fokus | 85.74 % | 49.22 % | 20.4 s | 41.0 s | 1.82 | 16.06 | 0.00 |
| Matchup-Suche | 92.77 % | 27.15 % | 16.8 s | 36.1 s | 1.94 | 17.89 | 0.48 |

## Kampfzeit-Gegenprobe

Die 35/45-Sekunden-Werte verändern das Live-Spiel nicht. Sie simulieren dieselben Boards isoliert mit einer längeren Kampfgrenze.

| Grenze | Sieg | Niederlage | Remis | Timeout (95-%-Intervall) | Simulation Median/P90 | 1× Median/P90 | 2× Median |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 25 s | 85.48 % | 11.78 % | 2.73 % | 35.77 % (34.10–37.49 %) | 18.6 s / 25.0 s | 37.5 s / 51.3 s | 23.3 s |
| 35 s | 80.27 % | 17.19 % | 2.54 % | 25.36 % (23.85–26.93 %) | 18.6 s / 35.0 s | 39.4 s / 56.6 s | 24.5 s |
| 45 s | 80.18 % | 17.42 % | 2.41 % | 10.42 % (9.39–11.55 %) | 18.6 s / 45.0 s | 42.1 s / 62.5 s | 25.8 s |

## Rundenschwierigkeit

| Runde | Sieg | Niederlage | Remis | Timeout 25 s | Timeout 35 s | Timeout 45 s | Siegspanne Strategien |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 94.01 % | 5.99 % | 0.00 % | 100.00 % | 100.00 % | 10.68 % | 64.06–100.00 % |
| 2 | 92.19 % | 7.81 % | 0.00 % | 62.50 % | 33.85 % | 19.53 % | 89.06–95.31 % |
| 3 | 87.24 % | 0.52 % | 12.24 % | 60.42 % | 45.05 % | 38.28 % | 82.81–90.63 % |
| 4 | 89.58 % | 8.85 % | 1.56 % | 9.38 % | 2.34 % | 2.08 % | 84.38–100.00 % |
| 5 | 87.24 % | 11.20 % | 1.56 % | 4.69 % | 2.34 % | 1.30 % | 70.31–95.31 % |
| 6 | 82.29 % | 16.93 % | 0.78 % | 26.56 % | 9.11 % | 5.47 % | 70.31–98.44 % |
| 7 | 83.07 % | 13.54 % | 3.39 % | 2.34 % | 0.00 % | 0.00 % | 64.06–90.63 % |
| 8 | 68.23 % | 29.43 % | 2.34 % | 20.31 % | 10.16 % | 5.99 % | 39.06–76.56 % |

## Economy und volle Boards

| Runde | Board schon voll | Käufe | Kaufgold | Restgold | blockierte Angebote/Shop | kein direkter Kauf | Ersatz hätte verbessert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.00 % | 2.00 | 6.00 | 1.00 | 0.00 | 0.00 % | 0.00 % |
| 2 | 0.00 % | 1.99 | 6.21 | 0.73 | 0.00 | 0.00 % | 0.00 % |
| 3 | 0.00 % | 1.98 | 6.27 | 1.41 | 0.00 | 0.00 % | 0.00 % |
| 4 | 13.54 % | 2.22 | 7.10 | 1.33 | 0.96 | 0.78 % | 34.64 % |
| 5 | 72.92 % | 2.31 | 7.43 | 1.97 | 0.62 | 0.00 % | 25.26 % |
| 6 | 89.06 % | 1.73 | 5.60 | 4.46 | 2.63 | 10.94 % | 63.02 % |
| 7 | 94.27 % | 1.39 | 4.55 | 8.95 | 3.67 | 22.40 % | 70.83 % |
| 8 | 97.92 % | 0.92 | 3.06 | 16.71 | 4.37 | 40.63 % | 77.34 % |

## Positionseinfluss

Als positionsrelevant gelten nur Boards mit Nachbar-Tempo oder Nachbar-Kraft. Eine deutliche LP-Verschiebung bedeutet mindestens 15 Prozentpunkte Unterschied zwischen bester und schlechtester Anordnung.

| Stichprobe | Matchups | Anordnungen | Ergebnis ändert sich | direkter Siegerwechsel | deutliche LP-Verschiebung | Ø LP-Spanne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| alle Boards | 2024 | 228500 | 5.34 % | 4.50 % | 20.75 % | 8.28 % |
| nur positionsrelevante Boards | 969 | 113280 | 10.94 % | 9.18 % | 42.72 % | 17.05 % |

## Angebots- und Kaufdiagnose

Kaufquote wird nur gegen direkt kaufbare Angebote gerechnet. „Verbessert“ bedeutet eine unmittelbar messbare Verbesserung gegen den angekündigten Gegner.

| Zutat | angeboten | Kaufquote | sofort verbessert | voll blockiert | davon vorhandenes L2 | Siegquote bei Präsenz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2480 | 79.34 % | 81.92 % | 370 | 219 | 87.80 % |
| Drachenzahn | 1323 | 62.85 % | 62.33 % | 377 | 72 | 92.62 % |
| Glutkern | 1324 | 49.82 % | 54.35 % | 452 | 67 | 90.97 % |
| Rußbeere | 1342 | 67.26 % | 54.41 % | 390 | 141 | 80.65 % |
| Schleimpilz | 1618 | 42.60 % | 74.55 % | 329 | 71 | 75.41 % |
| Nachtflügel | 1031 | 35.12 % | 50.98 % | 330 | 17 | 74.36 % |
| Hexenauge | 1070 | 60.05 % | 58.24 % | 350 | 76 | 72.07 % |
| Vipernknolle | 1064 | 33.96 % | 54.01 % | 320 | 38 | 81.72 % |
| Eierschale | 2898 | 85.81 % | 78.65 % | 487 | 294 | 85.49 % |
| Heilknolle | 1430 | 60.85 % | 31.41 % | 410 | 131 | 71.31 % |
| Goldlöffel | 1488 | 53.48 % | 58.02 % | 441 | 74 | 88.37 % |
| Mondsalz | 1364 | 67.87 % | 64.74 % | 445 | 129 | 84.95 % |

## Tatsächliche Kampfbeiträge

| Zutat | Kämpfe | Trigger | LP-Schaden | Schildschaden | Heilung | Schild | Gift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2549 | 6.53 | 53.63 | 15.71 | 0.00 | 0.00 | 0.00 |
| Drachenzahn | 691 | 2.98 | 61.20 | 8.46 | 0.00 | 0.00 | 0.00 |
| Glutkern | 443 | 3.27 | 18.44 | 5.05 | 0.00 | 0.00 | 0.00 |
| Rußbeere | 796 | 4.25 | 25.94 | 7.07 | 0.00 | 0.00 | 0.00 |
| Schleimpilz | 740 | 6.13 | 41.36 | 12.30 | 0.00 | 0.00 | 38.52 |
| Nachtflügel | 195 | 4.10 | 12.59 | 4.94 | 0.00 | 0.00 | 0.00 |
| Hexenauge | 555 | 5.28 | 20.97 | 9.01 | 0.00 | 0.00 | 0.00 |
| Vipernknolle | 279 | 4.38 | 33.51 | 7.80 | 0.00 | 0.00 | 16.67 |
| Eierschale | 3012 | 5.55 | 0.00 | 0.00 | 0.00 | 77.23 | 0.00 |
| Heilknolle | 711 | 0.58 | 0.00 | 0.00 | 13.15 | 0.00 | 0.00 |
| Goldlöffel | 662 | 3.73 | 0.00 | 0.00 | 14.67 | 28.38 | 0.00 |
| Mondsalz | 824 | 4.09 | 19.09 | 8.84 | 0.00 | 34.32 | 0.00 |

## Buildfamilien

| Schwerpunkt | Kämpfe | Sieg | Timeout | Ø Simulation |
| --- | ---: | ---: | ---: | ---: |
| fire | 817 | 92.53 % | 3.18 % | 12.6 s |
| poison | 267 | 68.54 % | 9.36 % | 15.7 s |
| guard | 1115 | 80.18 % | 42.69 % | 20.3 s |
| hybrid | 873 | 90.84 % | 65.52 % | 21.8 s |

## Restlicher Inventardruck ab Runde 6

Gezählt werden Kampagnen, in denen trotz der einzelnen Ablage mindestens zweimal dieselbe bezahlbare Zutat blockiert wurde. Die Ablage wird dabei durch die echte Spiellogik simuliert.

| Strategie | Kampagnen mit Wiederholung | blockierte Paare |
| --- | ---: | ---: |
| Buildstärke | 98.44 % | 266 |
| Merge-Fokus | 96.88 % | 238 |
| Feuer-Fokus | 96.88 % | 264 |
| Gift-Fokus | 96.88 % | 232 |
| Schutz-Fokus | 100.00 % | 250 |
| Matchup-Suche | 0.00 % | 0 |

Blockierte bezahlbare Angebote in Runde 6–8: **4096**, davon passend zu einem vorhandenen Level-II-Item: **1228**.

## Grobe Buildstärke

| Strategie | Pearson-Korrelation | Fehlerrate entscheidender Kämpfe |
| --- | ---: | ---: |
| Buildstärke | 0.412 | 15.46 % |
| Merge-Fokus | 0.418 | 13.83 % |
| Feuer-Fokus | 0.396 | 13.55 % |
| Gift-Fokus | 0.420 | 28.77 % |
| Schutz-Fokus | 0.423 | 15.38 % |
| Matchup-Suche | 0.622 | 9.04 % |

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
