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
| Buildstärke | 91.41 % | 44.14 % | 19.6 s | 38.6 s | 1.77 | 18.33 | 0.00 |
| Merge-Fokus | 92.77 % | 41.80 % | 19.0 s | 38.2 s | 1.81 | 17.44 | 0.00 |
| Feuer-Fokus | 92.97 % | 33.01 % | 17.3 s | 35.8 s | 1.78 | 17.38 | 0.00 |
| Gift-Fokus | 75.59 % | 58.01 % | 21.5 s | 44.2 s | 1.79 | 14.84 | 0.00 |
| Schutz-Fokus | 86.33 % | 58.40 % | 21.3 s | 40.4 s | 1.80 | 16.58 | 0.00 |
| Matchup-Suche | 94.92 % | 22.66 % | 16.0 s | 35.0 s | 1.96 | 18.38 | 0.53 |

## Kampfzeit-Gegenprobe

Die 35/45-Sekunden-Werte verändern das Live-Spiel nicht. Sie simulieren dieselben Boards isoliert mit einer längeren Kampfgrenze.

| Grenze | Sieg | Niederlage | Remis | Timeout (95-%-Intervall) | Simulation Median/P90 | 1× Median/P90 | 2× Median |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 25 s | 89.00 % | 7.52 % | 3.48 % | 43.00 % (41.26–44.76 %) | 21.0 s / 25.0 s | 37.0 s / 53.0 s | 23.0 s |
| 35 s | 85.42 % | 12.04 % | 2.54 % | 31.15 % (29.54–32.81 %) | 21.0 s / 35.0 s | 40.8 s / 60.2 s | 25.4 s |
| 45 s | 85.42 % | 12.08 % | 2.51 % | 15.89 % (14.64–17.22 %) | 21.0 s / 45.0 s | 44.4 s / 65.9 s | 27.1 s |

## Rundenschwierigkeit

| Runde | Sieg | Niederlage | Remis | Timeout 25 s | Timeout 35 s | Timeout 45 s | Siegspanne Strategien |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 94.01 % | 5.99 % | 0.00 % | 100.00 % | 100.00 % | 10.68 % | 64.06–100.00 % |
| 2 | 100.00 % | 0.00 % | 0.00 % | 68.49 % | 32.55 % | 24.48 % | 100.00–100.00 % |
| 3 | 86.98 % | 0.00 % | 13.02 % | 73.96 % | 57.55 % | 49.74 % | 75.00–98.44 % |
| 4 | 100.00 % | 0.00 % | 0.00 % | 17.19 % | 5.99 % | 4.17 % | 100.00–100.00 % |
| 5 | 99.48 % | 0.52 % | 0.00 % | 12.50 % | 5.73 % | 2.08 % | 96.88–100.00 % |
| 6 | 90.36 % | 0.78 % | 8.85 % | 43.23 % | 32.55 % | 26.82 % | 75.00–100.00 % |
| 7 | 79.95 % | 18.23 % | 1.82 % | 4.43 % | 0.00 % | 0.00 % | 50.00–90.63 % |
| 8 | 61.20 % | 34.64 % | 4.17 % | 24.22 % | 14.84 % | 9.11 % | 26.56–71.88 % |

## Economy und volle Boards

| Runde | Board schon voll | Käufe | Kaufgold | Restgold | blockierte Angebote/Shop | kein direkter Kauf | Ersatz hätte verbessert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.00 % | 2.00 | 6.00 | 1.00 | 0.00 | 0.00 % | 0.00 % |
| 2 | 0.00 % | 1.99 | 6.21 | 0.73 | 0.00 | 0.00 % | 0.00 % |
| 3 | 0.00 % | 2.02 | 6.42 | 1.38 | 0.01 | 0.00 % | 0.26 % |
| 4 | 14.84 % | 2.18 | 6.99 | 1.43 | 0.98 | 0.26 % | 39.32 % |
| 5 | 73.44 % | 2.31 | 7.42 | 2.19 | 0.66 | 0.00 % | 28.91 % |
| 6 | 88.80 % | 1.72 | 5.58 | 4.88 | 2.71 | 11.46 % | 61.20 % |
| 7 | 94.53 % | 1.45 | 4.70 | 9.33 | 3.71 | 23.44 % | 72.40 % |
| 8 | 98.44 % | 0.87 | 2.87 | 17.16 | 4.42 | 42.45 % | 78.39 % |

## Positionseinfluss

Als positionsrelevant gelten nur Boards mit Nachbar-Tempo oder Nachbar-Kraft. Eine deutliche LP-Verschiebung bedeutet mindestens 15 Prozentpunkte Unterschied zwischen bester und schlechtester Anordnung.

| Stichprobe | Matchups | Anordnungen | Ergebnis ändert sich | direkter Siegerwechsel | deutliche LP-Verschiebung | Ø LP-Spanne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| alle Boards | 2030 | 229240 | 2.91 % | 2.36 % | 13.84 % | 5.69 % |
| nur positionsrelevante Boards | 982 | 115140 | 6.01 % | 4.89 % | 28.21 % | 11.59 % |

## Angebots- und Kaufdiagnose

Kaufquote wird nur gegen direkt kaufbare Angebote gerechnet. „Verbessert“ bedeutet eine unmittelbar messbare Verbesserung gegen den angekündigten Gegner.

| Zutat | angeboten | Kaufquote | sofort verbessert | voll blockiert | davon vorhandenes L2 | Siegquote bei Präsenz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2490 | 78.78 % | 80.98 % | 386 | 226 | 91.42 % |
| Drachenzahn | 1333 | 64.10 % | 65.81 % | 394 | 75 | 94.27 % |
| Glutkern | 1328 | 51.98 % | 54.68 % | 456 | 68 | 93.52 % |
| Rußbeere | 1362 | 67.24 % | 54.86 % | 394 | 149 | 87.15 % |
| Schleimpilz | 1643 | 42.52 % | 68.42 % | 329 | 71 | 80.45 % |
| Nachtflügel | 1030 | 35.75 % | 49.52 % | 324 | 16 | 80.75 % |
| Hexenauge | 1095 | 56.83 % | 55.31 % | 365 | 75 | 84.10 % |
| Vipernknolle | 1079 | 37.83 % | 54.14 % | 332 | 38 | 80.41 % |
| Eierschale | 2899 | 83.85 % | 50.71 % | 496 | 302 | 89.12 % |
| Heilknolle | 1369 | 60.71 % | 7.25 % | 410 | 113 | 78.97 % |
| Goldlöffel | 1450 | 53.62 % | 37.39 % | 464 | 73 | 89.25 % |
| Mondsalz | 1354 | 68.32 % | 30.86 % | 444 | 146 | 83.39 % |

## Tatsächliche Kampfbeiträge

| Zutat | Kämpfe | Trigger | LP-Schaden | Schildschaden | Heilung | Schild | Gift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2551 | 6.77 | 56.82 | 18.60 | 0.00 | 0.00 | 0.00 |
| Drachenzahn | 715 | 3.15 | 67.02 | 10.05 | 0.00 | 0.00 | 0.00 |
| Glutkern | 494 | 3.51 | 19.14 | 6.08 | 0.00 | 0.00 | 0.00 |
| Rußbeere | 825 | 4.56 | 29.18 | 9.35 | 0.00 | 0.00 | 0.00 |
| Schleimpilz | 762 | 6.88 | 23.08 | 11.21 | 0.00 | 0.00 | 22.70 |
| Nachtflügel | 213 | 4.54 | 14.74 | 5.95 | 0.00 | 0.00 | 0.00 |
| Hexenauge | 566 | 5.69 | 31.63 | 12.46 | 0.00 | 0.00 | 0.00 |
| Vipernknolle | 296 | 5.19 | 27.49 | 12.86 | 0.00 | 0.00 | 11.66 |
| Eierschale | 2995 | 5.80 | 0.00 | 0.00 | 0.00 | 67.20 | 0.00 |
| Heilknolle | 661 | 0.23 | 0.00 | 0.00 | 7.51 | 0.00 | 0.00 |
| Goldlöffel | 614 | 3.79 | 0.00 | 0.00 | 8.31 | 25.51 | 0.00 |
| Mondsalz | 825 | 1.31 | 5.57 | 1.17 | 0.00 | 15.60 | 0.00 |

## Buildfamilien

| Schwerpunkt | Kämpfe | Sieg | Timeout | Ø Simulation |
| --- | ---: | ---: | ---: | ---: |
| fire | 942 | 95.97 % | 7.43 % | 13.6 s |
| poison | 296 | 76.35 % | 36.49 % | 19.2 s |
| guard | 1001 | 81.62 % | 53.75 % | 21.6 s |
| hybrid | 833 | 94.48 % | 72.63 % | 22.4 s |

## Restlicher Inventardruck ab Runde 6

Gezählt werden Kampagnen, in denen trotz der einzelnen Ablage mindestens zweimal dieselbe bezahlbare Zutat blockiert wurde. Die Ablage wird dabei durch die echte Spiellogik simuliert.

| Strategie | Kampagnen mit Wiederholung | blockierte Paare |
| --- | ---: | ---: |
| Buildstärke | 98.44 % | 270 |
| Merge-Fokus | 98.44 % | 256 |
| Feuer-Fokus | 96.88 % | 261 |
| Gift-Fokus | 96.88 % | 236 |
| Schutz-Fokus | 100.00 % | 256 |
| Matchup-Suche | 0.00 % | 0 |

Blockierte bezahlbare Angebote in Runde 6–8: **4160**, davon passend zu einem vorhandenen Level-II-Item: **1248**.

## Grobe Buildstärke

| Strategie | Pearson-Korrelation | Fehlerrate entscheidender Kämpfe |
| --- | ---: | ---: |
| Buildstärke | 0.472 | 10.24 % |
| Merge-Fokus | 0.458 | 9.02 % |
| Feuer-Fokus | 0.408 | 9.36 % |
| Gift-Fokus | 0.417 | 24.49 % |
| Schutz-Fokus | 0.413 | 11.18 % |
| Matchup-Suche | 0.572 | 7.17 % |

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
