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

Merge-Fokus, 64 Kampagnen: 87.50 % Siege, 12.89 % Timeouts, 1.83 Käufe/Shop, 5.71 Kaufgold/Shop und 16.42 Gold vor Runde 8 übrig.

## Ergebnis

| Parkslots | Sieg 30 s | Timeout 30 s | Timeout 35 s | Käufe/Shop | Kaufgold/Shop | Merges/Shop | Gold vor R8 | blockierte Angebote |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 87.50 % | 12.50 % | 11.25 % | 1.89 | 5.84 | 1.16 | 15.30 | 276 |
| 2 | 88.13 % | 12.50 % | 11.25 % | 2.18 | 6.72 | 1.36 | 8.30 | 177 |

## Runde 6–8

| Parkslots | Runde | Käufe | Kaufgold | Restgold | Merges | belegte Parkplätze | blockiert/Shop |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 2.60 | 7.95 | 4.85 | 1.75 | 0.75 | 0.85 |
| 1 | 7 | 1.50 | 4.65 | 9.00 | 1.50 | 0.75 | 3.55 |
| 1 | 8 | 1.40 | 4.40 | 15.30 | 1.25 | 0.90 | 4.35 |
| 2 | 6 | 2.85 | 8.75 | 4.05 | 1.75 | 1.00 | 0.15 |
| 2 | 7 | 2.45 | 7.50 | 5.35 | 2.10 | 1.35 | 1.30 |
| 2 | 8 | 2.50 | 7.75 | 8.30 | 2.25 | 1.60 | 2.35 |

Die zwei Varianten verwenden dieselben 20 Seeds. Unterschiede zwischen einem und zwei Slots sind daher direkt vergleichbar; die 64-Seed-Referenz dient nur als Richtungsanker.

## Reproduktion

```bash
npm run balance:parking
```
