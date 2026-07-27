# Kessel-Krawall – reproduzierbare Balanceanalyse

Feste Seedfolge: Basis `1263206400`, Schritt `2654435769` (64 Läufe, 512 Hauptkämpfe).

## Einkaufsstrategie und Budgets

Pro Shop wird wiederholt das bezahlbare Angebot mit dem höchsten Zuwachs der groben Buildstärke pro Gold gekauft. Danach wird genau der kostenlose Reroll genutzt und erneut gekauft; bezahlte Rerolls werden nicht verwendet.

| Runde | Ø verfügbar | Ø ausgegeben | Ø übrig |
| ---: | ---: | ---: | ---: |
| 1 | 7.00 | 6.00 | 1.00 |
| 2 | 6.67 | 6.11 | 0.56 |
| 3 | 7.56 | 6.28 | 1.28 |
| 4 | 8.16 | 6.59 | 1.56 |
| 5 | 9.56 | 5.02 | 4.55 |
| 6 | 12.55 | 3.25 | 9.30 |
| 7 | 18.22 | 2.06 | 16.16 |
| 8 | 26.55 | 1.59 | 24.95 |

## Kampfergebnisse

Timeoutquote gesamt: **48.83 %**.

| Runde | Sieg | Niederlage | Unentschieden | Timeout |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 67.19 % | 32.81 % | 0.00 % | 100.00 % |
| 2 | 100.00 % | 0.00 % | 0.00 % | 82.81 % |
| 3 | 87.50 % | 0.00 % | 12.50 % | 87.50 % |
| 4 | 100.00 % | 0.00 % | 0.00 % | 17.19 % |
| 5 | 100.00 % | 0.00 % | 0.00 % | 7.81 % |
| 6 | 92.19 % | 0.00 % | 7.81 % | 54.69 % |
| 7 | 79.69 % | 20.31 % | 0.00 % | 4.69 % |
| 8 | 62.50 % | 37.50 % | 0.00 % | 35.94 % |

## Positionseinfluss

Für 512 Boards wurden alle 49880 eindeutigen zulässigen Anordnungen simuliert.

- Irgendeine Ergebnisänderung durch Umordnung: **1.17 %**
- Direkter Siegerwechsel Spieler ↔ Gegner: **0.98 %**

## Häufigkeit der Zutaten

| Zutat | in Siegerboards | in Verliererboards | Kopien Sieger | Kopien Verlierer |
| --- | ---: | ---: | ---: | ---: |
| Chilischote | 100.00 % | 100.00 % | 1043 | 97 |
| Drachenzahn | 23.36 % | 12.07 % | 189 | 12 |
| Glutkern | 14.74 % | 6.90 % | 108 | 8 |
| Rußbeere | 30.84 % | 39.66 % | 221 | 44 |
| Schleimpilz | 9.98 % | 12.07 % | 78 | 16 |
| Nachtflügel | 0.91 % | 1.72 % | 5 | 1 |
| Hexenauge | 18.14 % | 22.41 % | 140 | 30 |
| Vipernknolle | 4.99 % | 0.00 % | 37 | 0 |
| Eierschale | 100.00 % | 100.00 % | 1144 | 126 |
| Heilknolle | 24.94 % | 41.38 % | 200 | 57 |
| Goldlöffel | 16.10 % | 3.45 % | 125 | 4 |
| Mondsalz | 32.43 % | 36.21 % | 249 | 45 |

## Grobe Buildstärke

- Pearson-Korrelation mit dem relativen LP-Ergebnis: **0.537**
- Vorhersage-Fehlerrate bei entscheidenden Kämpfen: **7.41 %**

Die Korrelation vergleicht die Differenz der groben Buildstärke mit der Differenz der verbleibenden relativen LP. Die Fehlerrate vergleicht nur entscheidende Kämpfe.

## Reproduktion

```bash
npm run balance:analysis -- --seeds=64
```
