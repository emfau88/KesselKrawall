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
| Buildstärke | 84.77 % | 15.04 % | 18.7 s | 39.7 s | 1.78 | 17.61 | 0.00 |
| Merge-Fokus | 87.50 % | 12.89 % | 17.9 s | 38.8 s | 1.83 | 16.42 | 0.00 |
| Feuer-Fokus | 88.67 % | 9.57 % | 16.0 s | 35.9 s | 1.77 | 17.38 | 0.00 |
| Gift-Fokus | 75.00 % | 13.28 % | 20.0 s | 42.7 s | 1.78 | 15.09 | 0.00 |
| Schutz-Fokus | 83.98 % | 22.07 % | 20.8 s | 42.8 s | 1.82 | 16.06 | 0.00 |
| Matchup-Suche | 92.58 % | 7.23 % | 16.2 s | 36.4 s | 1.97 | 17.34 | 0.48 |

## Kampfzeit-Gegenprobe

Die 35/45-Sekunden-Werte verändern das Live-Spiel nicht. Sie simulieren dieselben Boards isoliert mit einer längeren Kampfgrenze.

| Grenze | Sieg | Niederlage | Remis | Timeout (95-%-Intervall) | Simulation Median/P90 | 1× Median/P90 | 2× Median |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 s | 85.42 % | 11.95 % | 2.64 % | 13.35 % (12.19–14.59 %) | 16.0 s / 30.0 s | 38.3 s / 54.2 s | 23.8 s |
| 35 s | 83.85 % | 13.77 % | 2.38 % | 10.58 % (9.54–11.72 %) | 16.0 s / 35.0 s | 38.4 s / 56.6 s | 23.9 s |
| 45 s | 84.60 % | 13.22 % | 2.18 % | 6.58 % (5.75–7.51 %) | 16.0 s / 35.2 s | 38.5 s / 60.9 s | 24.0 s |

## Rundenschwierigkeit

| Runde | Sieg | Niederlage | Remis | Timeout 30 s | Timeout 35 s | Timeout 45 s | Siegspanne Strategien |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100.00 % | 0.00 % | 0.00 % | 0.00 % | 0.00 % | 0.00 % | 100.00–100.00 % |
| 2 | 92.45 % | 7.55 % | 0.00 % | 34.90 % | 30.73 % | 17.19 % | 90.63–93.75 % |
| 3 | 88.80 % | 0.00 % | 11.20 % | 45.57 % | 39.84 % | 29.69 % | 84.38–92.19 % |
| 4 | 89.58 % | 9.11 % | 1.30 % | 3.13 % | 2.08 % | 0.26 % | 84.38–100.00 % |
| 5 | 87.76 % | 10.94 % | 1.30 % | 2.34 % | 1.30 % | 0.78 % | 70.31–96.88 % |
| 6 | 79.17 % | 20.05 % | 0.78 % | 9.90 % | 5.47 % | 2.34 % | 67.19–93.75 % |
| 7 | 83.07 % | 13.02 % | 3.91 % | 0.00 % | 0.00 % | 0.00 % | 65.63–90.63 % |
| 8 | 62.50 % | 34.90 % | 2.60 % | 10.94 % | 5.21 % | 2.34 % | 29.69–75.00 % |

## Economy und volle Boards

| Runde | Board schon voll | Käufe | Kaufgold | Restgold | blockierte Angebote/Shop | kein direkter Kauf | Ersatz hätte verbessert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.00 % | 2.00 | 6.00 | 1.00 | 0.00 | 0.00 % | 0.00 % |
| 2 | 0.00 % | 2.00 | 6.24 | 0.76 | 0.00 | 0.00 % | 0.00 % |
| 3 | 0.00 % | 1.98 | 6.28 | 1.44 | 0.00 | 0.00 % | 0.00 % |
| 4 | 14.06 % | 2.21 | 7.08 | 1.39 | 0.98 | 0.78 % | 35.68 % |
| 5 | 72.92 % | 2.32 | 7.48 | 1.97 | 0.64 | 0.00 % | 26.56 % |
| 6 | 90.10 % | 1.74 | 5.64 | 4.48 | 2.61 | 10.68 % | 63.54 % |
| 7 | 94.01 % | 1.40 | 4.54 | 8.95 | 3.70 | 22.66 % | 71.09 % |
| 8 | 98.18 % | 0.93 | 3.08 | 16.65 | 4.38 | 40.36 % | 76.30 % |

## Positionseinfluss

Als positionsrelevant gelten nur Boards mit Nachbar-Tempo oder Nachbar-Kraft. Eine deutliche LP-Verschiebung bedeutet mindestens 15 Prozentpunkte Unterschied zwischen bester und schlechtester Anordnung.

| Stichprobe | Matchups | Anordnungen | Ergebnis ändert sich | direkter Siegerwechsel | deutliche LP-Verschiebung | Ø LP-Spanne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| alle Boards | 2022 | 228840 | 5.89 % | 4.75 % | 21.41 % | 8.70 % |
| nur positionsrelevante Boards | 976 | 114420 | 11.78 % | 9.53 % | 43.34 % | 17.68 % |

## Angebots- und Kaufdiagnose

Kaufquote wird nur gegen direkt kaufbare Angebote gerechnet. „Verbessert“ bedeutet eine unmittelbar messbare Verbesserung gegen den angekündigten Gegner.

| Zutat | angeboten | Kaufquote | sofort verbessert | voll blockiert | davon vorhandenes L2 | Siegquote bei Präsenz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2476 | 79.81 % | 82.71 % | 377 | 218 | 87.10 % |
| Drachenzahn | 1312 | 61.26 % | 62.48 % | 372 | 72 | 92.38 % |
| Glutkern | 1327 | 51.45 % | 56.55 % | 459 | 68 | 90.63 % |
| Rußbeere | 1342 | 66.30 % | 55.22 % | 391 | 138 | 80.66 % |
| Schleimpilz | 1621 | 42.75 % | 75.59 % | 332 | 73 | 78.83 % |
| Nachtflügel | 1045 | 35.78 % | 52.13 % | 331 | 20 | 75.60 % |
| Hexenauge | 1071 | 59.33 % | 56.85 % | 353 | 79 | 70.61 % |
| Vipernknolle | 1075 | 36.00 % | 56.47 % | 325 | 41 | 78.79 % |
| Eierschale | 2884 | 86.23 % | 79.16 % | 491 | 299 | 85.53 % |
| Heilknolle | 1426 | 60.15 % | 35.04 % | 399 | 132 | 68.90 % |
| Goldlöffel | 1486 | 54.84 % | 59.61 % | 455 | 74 | 86.21 % |
| Mondsalz | 1367 | 67.81 % | 64.87 % | 444 | 126 | 82.67 % |

## Tatsächliche Kampfbeiträge

| Zutat | Kämpfe | Trigger | LP-Schaden | Schildschaden | Heilung | Schild | Gift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2534 | 6.68 | 55.28 | 17.10 | 0.00 | 0.00 | 0.00 |
| Drachenzahn | 682 | 3.05 | 62.73 | 8.88 | 0.00 | 0.00 | 0.00 |
| Glutkern | 459 | 3.47 | 19.10 | 5.82 | 0.00 | 0.00 | 0.00 |
| Rußbeere | 791 | 4.47 | 27.13 | 7.66 | 0.00 | 0.00 | 0.00 |
| Schleimpilz | 737 | 6.56 | 43.15 | 13.46 | 0.00 | 0.00 | 40.30 |
| Nachtflügel | 209 | 4.27 | 13.46 | 5.13 | 0.00 | 0.00 | 0.00 |
| Hexenauge | 541 | 5.45 | 23.30 | 9.39 | 0.00 | 0.00 | 0.00 |
| Vipernknolle | 297 | 4.56 | 35.54 | 8.72 | 0.00 | 0.00 | 17.23 |
| Eierschale | 3007 | 5.64 | 0.00 | 0.00 | 0.00 | 79.67 | 0.00 |
| Heilknolle | 717 | 0.64 | 0.00 | 0.00 | 14.32 | 0.00 | 0.00 |
| Goldlöffel | 660 | 3.88 | 0.00 | 0.00 | 15.33 | 29.61 | 0.00 |
| Mondsalz | 831 | 4.37 | 20.90 | 10.00 | 0.00 | 37.16 | 0.00 |

## Buildfamilien

| Schwerpunkt | Kämpfe | Sieg | Timeout | Ø Simulation |
| --- | ---: | ---: | ---: | ---: |
| fire | 819 | 92.43 % | 1.22 % | 12.7 s |
| poison | 277 | 71.84 % | 4.33 % | 15.9 s |
| guard | 1107 | 77.60 % | 30.80 % | 22.2 s |
| hybrid | 869 | 93.10 % | 5.41 % | 19.2 s |

## Restlicher Inventardruck ab Runde 6

Gezählt werden Kampagnen, in denen trotz der einzelnen Ablage mindestens zweimal dieselbe bezahlbare Zutat blockiert wurde. Die Ablage wird dabei durch die echte Spiellogik simuliert.

| Strategie | Kampagnen mit Wiederholung | blockierte Paare |
| --- | ---: | ---: |
| Buildstärke | 98.44 % | 266 |
| Merge-Fokus | 96.88 % | 238 |
| Feuer-Fokus | 96.88 % | 264 |
| Gift-Fokus | 98.44 % | 224 |
| Schutz-Fokus | 100.00 % | 254 |
| Matchup-Suche | 0.00 % | 0 |

Blockierte bezahlbare Angebote in Runde 6–8: **4106**, davon passend zu einem vorhandenen Level-II-Item: **1234**.

## Grobe Buildstärke

| Strategie | Pearson-Korrelation | Fehlerrate entscheidender Kämpfe |
| --- | ---: | ---: |
| Buildstärke | 0.071 | 17.07 % |
| Merge-Fokus | 0.082 | 14.60 % |
| Feuer-Fokus | 0.053 | 13.55 % |
| Gift-Fokus | 0.121 | 29.44 % |
| Schutz-Fokus | 0.095 | 17.71 % |
| Matchup-Suche | 0.308 | 9.64 % |

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
