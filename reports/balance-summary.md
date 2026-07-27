# Kessel-Krawall – reproduzierbare Balanceanalyse

Feste Seedfolge: Basis `1263206400`, Schritt `2654435769` (64 Läufe, 512 Hauptkämpfe).

## Einkaufsstrategie und Budgets

Pro Shop wird wiederholt das bezahlbare Angebot mit dem höchsten Zuwachs der groben Buildstärke pro Gold gekauft. Danach wird genau der kostenlose Reroll genutzt und erneut gekauft; bezahlte Rerolls werden nicht verwendet.

| Runde | Ø verfügbar | Ø ausgegeben | Ø übrig |
| ---: | ---: | ---: | ---: |
| 1 | 7.00 | 6.00 | 1.00 |
| 2 | 7.00 | 6.17 | 0.83 |
| 3 | 7.83 | 6.31 | 1.52 |
| 4 | 8.38 | 6.80 | 1.58 |
| 5 | 9.58 | 4.73 | 4.84 |
| 6 | 12.84 | 3.27 | 9.58 |
| 7 | 18.50 | 2.09 | 16.41 |
| 8 | 26.80 | 1.67 | 25.13 |

## Kampfergebnisse

Timeoutquote gesamt: **48.44 %**.

| Runde | Sieg | Niederlage | Unentschieden | Timeout |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 100.00 % | 0.00 % | 0.00 % | 100.00 % |
| 2 | 100.00 % | 0.00 % | 0.00 % | 82.81 % |
| 3 | 85.94 % | 0.00 % | 14.06 % | 85.94 % |
| 4 | 100.00 % | 0.00 % | 0.00 % | 17.19 % |
| 5 | 100.00 % | 0.00 % | 0.00 % | 7.81 % |
| 6 | 92.19 % | 0.00 % | 7.81 % | 53.13 % |
| 7 | 79.69 % | 20.31 % | 0.00 % | 4.69 % |
| 8 | 60.94 % | 39.06 % | 0.00 % | 35.94 % |

## Positionseinfluss

Für 512 Boards wurden alle 49940 eindeutigen zulässigen Anordnungen simuliert.

- Irgendeine Ergebnisänderung durch Umordnung: **1.17 %**
- Direkter Siegerwechsel Spieler ↔ Gegner: **0.98 %**

## Häufigkeit der Zutaten

| Zutat | in Siegerboards | in Verliererboards | Kopien Sieger | Kopien Verlierer |
| --- | ---: | ---: | ---: | ---: |
| Chilischote | 100.00 % | 100.00 % | 1047 | 79 |
| Drachenzahn | 25.43 % | 18.42 % | 219 | 13 |
| Glutkern | 11.74 % | 2.63 % | 88 | 2 |
| Rußbeere | 29.57 % | 63.16 % | 226 | 47 |
| Schleimpilz | 8.91 % | 15.79 % | 72 | 14 |
| Nachtflügel | 0.87 % | 2.63 % | 5 | 1 |
| Hexenauge | 18.48 % | 36.84 % | 148 | 31 |
| Vipernknolle | 4.35 % | 5.26 % | 33 | 4 |
| Eierschale | 100.00 % | 100.00 % | 1159 | 105 |
| Heilknolle | 23.91 % | 63.16 % | 200 | 57 |
| Goldlöffel | 17.39 % | 15.79 % | 136 | 12 |
| Mondsalz | 28.70 % | 52.63 % | 232 | 41 |

## Grobe Buildstärke

- Pearson-Korrelation mit dem relativen LP-Ergebnis: **0.492**
- Vorhersage-Fehlerrate bei entscheidenden Kämpfen: **11.85 %**

Die Korrelation vergleicht die Differenz der groben Buildstärke mit der Differenz der verbleibenden relativen LP. Die Fehlerrate vergleicht nur entscheidende Kämpfe.

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
