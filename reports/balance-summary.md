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
| Buildstärke | 89.65 % | 48.83 % | 19.8 s | 41.1 s | 1.48 | 25.11 | 0.00 |
| Merge-Fokus | 91.02 % | 45.70 % | 19.3 s | 40.9 s | 1.53 | 24.09 | 0.00 |
| Feuer-Fokus | 93.36 % | 36.13 % | 17.5 s | 38.4 s | 1.48 | 25.31 | 0.00 |
| Gift-Fokus | 74.80 % | 59.77 % | 21.4 s | 47.0 s | 1.52 | 22.48 | 0.00 |
| Schutz-Fokus | 85.74 % | 61.72 % | 21.5 s | 42.9 s | 1.52 | 23.48 | 0.00 |
| Matchup-Suche | 96.09 % | 27.15 % | 16.2 s | 37.6 s | 1.97 | 18.44 | 0.55 |

## Kampfzeit-Gegenprobe

Die 35/45-Sekunden-Werte verändern das Live-Spiel nicht. Sie simulieren dieselben Boards isoliert mit einer längeren Kampfgrenze.

| Grenze | Sieg | Niederlage | Remis | Timeout (95-%-Intervall) | Simulation Median/P90 | 1× Median/P90 | 2× Median |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 25 s | 88.44 % | 8.07 % | 3.48 % | 46.55 % (44.79–48.32 %) | 22.0 s / 25.0 s | 39.6 s / 57.2 s | 24.7 s |
| 35 s | 84.18 % | 12.57 % | 3.26 % | 34.90 % (33.23–36.60 %) | 22.0 s / 35.0 s | 44.1 s / 66.3 s | 27.4 s |
| 45 s | 84.54 % | 12.66 % | 2.80 % | 25.46 % (23.95–27.03 %) | 22.0 s / 45.0 s | 47.7 s / 73.6 s | 29.3 s |

## Rundenschwierigkeit

| Runde | Sieg | Niederlage | Remis | Timeout 25 s | Timeout 35 s | Timeout 45 s | Siegspanne Strategien |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 94.01 % | 5.99 % | 0.00 % | 100.00 % | 100.00 % | 64.06 % | 64.06–100.00 % |
| 2 | 100.00 % | 0.00 % | 0.00 % | 76.82 % | 38.54 % | 28.91 % | 100.00–100.00 % |
| 3 | 84.90 % | 0.26 % | 14.84 % | 78.65 % | 63.80 % | 54.95 % | 71.88–98.44 % |
| 4 | 100.00 % | 0.00 % | 0.00 % | 19.27 % | 12.24 % | 4.69 % | 100.00–100.00 % |
| 5 | 99.48 % | 0.26 % | 0.26 % | 12.24 % | 6.25 % | 1.56 % | 96.88–100.00 % |
| 6 | 90.63 % | 1.30 % | 8.07 % | 49.74 % | 40.10 % | 33.59 % | 75.00–100.00 % |
| 7 | 79.95 % | 19.53 % | 0.52 % | 4.69 % | 0.26 % | 0.00 % | 53.13–95.31 % |
| 8 | 58.59 % | 37.24 % | 4.17 % | 30.99 % | 17.97 % | 15.89 % | 21.88–75.00 % |

## Economy und volle Boards

| Runde | Board schon voll | Käufe | Kaufgold | Restgold | blockierte Angebote/Shop | kein direkter Kauf | Ersatz hätte verbessert |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 0.00 % | 2.00 | 6.00 | 1.00 | 0.00 | 0.00 % | 0.00 % |
| 2 | 0.00 % | 1.99 | 6.21 | 0.73 | 0.00 | 0.00 % | 0.00 % |
| 3 | 0.00 % | 2.02 | 6.41 | 1.38 | 0.01 | 0.00 % | 0.26 % |
| 4 | 15.36 % | 2.17 | 6.98 | 1.42 | 0.99 | 0.26 % | 39.58 % |
| 5 | 73.44 % | 1.74 | 5.60 | 4.02 | 3.43 | 13.02 % | 83.33 % |
| 6 | 91.41 % | 1.23 | 4.03 | 8.31 | 4.64 | 34.90 % | 85.94 % |
| 7 | 97.92 % | 0.90 | 2.92 | 14.54 | 5.18 | 47.66 % | 88.80 % |
| 8 | 99.22 % | 0.63 | 2.08 | 23.15 | 5.51 | 63.80 % | 93.23 % |

## Positionseinfluss

Als positionsrelevant gelten nur Boards mit Nachbar-Tempo oder Nachbar-Kraft. Eine deutliche LP-Verschiebung bedeutet mindestens 15 Prozentpunkte Unterschied zwischen bester und schlechtester Anordnung.

| Stichprobe | Matchups | Anordnungen | Ergebnis ändert sich | direkter Siegerwechsel | deutliche LP-Verschiebung | Ø LP-Spanne |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| alle Boards | 2012 | 227440 | 3.68 % | 2.93 % | 14.71 % | 5.98 % |
| nur positionsrelevante Boards | 983 | 115260 | 7.53 % | 6.00 % | 29.50 % | 11.96 % |

## Angebots- und Kaufdiagnose

Kaufquote wird nur gegen direkt kaufbare Angebote gerechnet. „Verbessert“ bedeutet eine unmittelbar messbare Verbesserung gegen den angekündigten Gegner.

| Zutat | angeboten | Kaufquote | sofort verbessert | voll blockiert | davon vorhandenes L2 | Siegquote bei Präsenz |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2489 | 85.68 % | 92.51 % | 641 | 380 | 90.95 % |
| Drachenzahn | 1310 | 84.14 % | 96.68 % | 611 | 149 | 94.71 % |
| Glutkern | 1323 | 62.32 % | 83.85 % | 701 | 121 | 91.79 % |
| Rußbeere | 1372 | 85.43 % | 83.70 % | 691 | 242 | 86.37 % |
| Schleimpilz | 1642 | 43.82 % | 83.18 % | 548 | 124 | 79.03 % |
| Nachtflügel | 1055 | 45.60 % | 81.60 % | 540 | 48 | 81.66 % |
| Hexenauge | 1095 | 73.40 % | 86.22 % | 554 | 97 | 84.45 % |
| Vipernknolle | 1054 | 47.91 % | 80.99 % | 520 | 78 | 79.80 % |
| Eierschale | 2906 | 89.95 % | 56.61 % | 779 | 516 | 88.43 % |
| Heilknolle | 1362 | 71.05 % | 10.77 % | 639 | 154 | 77.44 % |
| Goldlöffel | 1466 | 67.15 % | 47.45 % | 709 | 160 | 87.90 % |
| Mondsalz | 1358 | 84.21 % | 44.39 % | 655 | 196 | 82.96 % |

## Tatsächliche Kampfbeiträge

| Zutat | Kämpfe | Trigger | LP-Schaden | Schildschaden | Heilung | Schild | Gift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chilischote | 2542 | 6.84 | 53.87 | 18.52 | 0.00 | 0.00 | 0.00 |
| Drachenzahn | 718 | 3.17 | 67.22 | 10.11 | 0.00 | 0.00 | 0.00 |
| Glutkern | 487 | 3.55 | 18.98 | 6.25 | 0.00 | 0.00 | 0.00 |
| Rußbeere | 822 | 4.60 | 28.83 | 10.00 | 0.00 | 0.00 | 0.00 |
| Schleimpilz | 763 | 6.95 | 22.13 | 10.83 | 0.00 | 0.00 | 22.96 |
| Nachtflügel | 229 | 4.55 | 13.71 | 5.56 | 0.00 | 0.00 | 0.00 |
| Hexenauge | 566 | 5.76 | 30.93 | 12.66 | 0.00 | 0.00 | 0.00 |
| Vipernknolle | 297 | 5.08 | 26.20 | 11.57 | 0.00 | 0.00 | 11.44 |
| Eierschale | 2991 | 5.84 | 0.00 | 0.00 | 0.00 | 66.15 | 0.00 |
| Heilknolle | 656 | 0.24 | 0.00 | 0.00 | 7.36 | 0.00 | 0.00 |
| Goldlöffel | 628 | 3.83 | 0.00 | 0.00 | 8.89 | 25.53 | 0.00 |
| Mondsalz | 845 | 1.39 | 5.77 | 1.35 | 0.00 | 16.88 | 0.00 |

## Buildfamilien

| Schwerpunkt | Kämpfe | Sieg | Timeout | Ø Simulation |
| --- | ---: | ---: | ---: | ---: |
| fire | 943 | 96.71 % | 13.15 % | 13.8 s |
| poison | 301 | 76.08 % | 39.20 % | 19.2 s |
| guard | 982 | 80.75 % | 57.64 % | 22.0 s |
| hybrid | 846 | 92.55 % | 73.52 % | 22.3 s |

## Parkslot-Signal ab Runde 6

Gezählt werden Kampagnen, in denen bei vollem Board mindestens zweimal dieselbe bezahlbare Zutat blockiert wurde. Das zeigt Mergepotenzial, simuliert aber noch keinen Rucksack.

| Strategie | Kampagnen mit Wiederholung | blockierte Paare |
| --- | ---: | ---: |
| Buildstärke | 100.00 % | 330 |
| Merge-Fokus | 100.00 % | 325 |
| Feuer-Fokus | 100.00 % | 331 |
| Gift-Fokus | 100.00 % | 322 |
| Schutz-Fokus | 100.00 % | 333 |
| Matchup-Suche | 100.00 % | 256 |

Blockierte bezahlbare Angebote in Runde 6–8: **5886**, davon passend zu einem vorhandenen Level-II-Item: **1908**.

## Grobe Buildstärke

| Strategie | Pearson-Korrelation | Fehlerrate entscheidender Kämpfe |
| --- | ---: | ---: |
| Buildstärke | 0.492 | 12.05 % |
| Merge-Fokus | 0.462 | 10.64 % |
| Feuer-Fokus | 0.445 | 9.33 % |
| Gift-Fokus | 0.458 | 24.49 % |
| Schutz-Fokus | 0.458 | 11.44 % |
| Matchup-Suche | 0.592 | 6.90 % |

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
