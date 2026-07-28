# Parkslot-Gegenversuch

Je 20 gepaarte Kampagnen mit einem und zwei Parkslots. Der vorhandene 64-Seed-Merge-Fokus dient als Referenz und wurde nicht erneut gerechnet.

## Regeln des Analysemodells

- Freischaltung ab Runde 6
- weiterhin genau fünf aktive Boardplätze
- geparkte Zutaten haben keinerlei Kampfeffekt
- Merges funktionieren über Board und Parkplätze hinweg
- ein Parkkauf erfolgt nur als Fortschritt für eine bereits vorhandene Zutat
- keine Verkäufe, keine zweite Währung, keine bezahlten Rerolls

## Vorhandene Referenz

Merge-Fokus, 64 Kampagnen: 91.02 % Siege, 45.70 % Timeouts, 1.53 Käufe/Shop, 4.78 Kaufgold/Shop und 24.09 Gold vor Runde 8 übrig.

## Ergebnis

| Parkslots | Sieg 25 s | Timeout 25 s | Timeout 35 s | Käufe/Shop | Kaufgold/Shop | Merges/Shop | Gold vor R8 | blockierte Angebote |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 91.88 % | 43.75 % | 33.75 % | 1.87 | 5.77 | 1.13 | 16.25 | 284 |
| 2 | 93.13 % | 43.75 % | 33.75 % | 2.17 | 6.70 | 1.35 | 8.80 | 182 |

## Runde 6–8

| Parkslots | Runde | Käufe | Kaufgold | Restgold | Merges | belegte Parkplätze | blockiert/Shop |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 2.55 | 7.80 | 4.80 | 1.70 | 0.75 | 1.05 |
| 1 | 7 | 1.45 | 4.50 | 9.20 | 1.40 | 0.80 | 3.70 |
| 1 | 8 | 1.15 | 3.65 | 16.25 | 1.05 | 0.90 | 4.65 |
| 2 | 6 | 2.95 | 9.05 | 3.55 | 1.85 | 1.00 | 0.35 |
| 2 | 7 | 2.35 | 7.20 | 5.25 | 2.05 | 1.30 | 1.55 |
| 2 | 8 | 2.30 | 7.15 | 8.80 | 2.00 | 1.65 | 2.40 |

Die zwei Varianten verwenden dieselben 20 Seeds. Unterschiede zwischen einem und zwei Slots sind daher direkt vergleichbar; die 64-Seed-Referenz dient nur als Richtungsanker.

## Reproduktion

```bash
npm run balance:parking
```
