# Balance-Bericht

Stand: 2026-09-13 · Weltgröße: 1600 × 800 · Laufzeit des Harness: 17.3 s

## Methode

- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.
- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall 1.2 s / 1.5 s / 2 s; der Kartenseed ist fest.
- Simulation: `step(state, 1/30)` bis Spielende oder 900 s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.
- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).
- Zeit ist der Median der gewonnenen Läufe.

## Kampagne (Normal)

| Level | Name                  | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | --------------------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| 1     | Erstes Leuchten       | 1      | 85 s     | S S S             | 118 s         | 3/2/2  | 62 %        | 81 %         |
| 2     | Brutgrund             | 1      | 95 s     | S S S             | 140 s         | 1/2/2  | 59 %        | 78 %         |
| 3     | Ausbau                | 1      | 100 s    | S S S             | 138 s         | 2/1/2  | 60 %        | 77 %         |
| 4     | Riffkante             | 1      | 110 s    | S S S             | 156 s         | 2/2/2  | 47 %        | 63 %         |
| 5     | Kalte Strömung        | 1      | 120 s    | S S S             | 169 s         | 2/3/2  | 67 %        | 79 %         |
| 6     | Zwei Fronten          | 2      | 130 s    | S S S             | 154 s         | 2/3/2  | 39 %        | 72 %         |
| 7     | Wachtposten           | 2      | 145 s    | S N N             | 208 s         | 2/0/0  | 39 %        | 47 %         |
| 8     | Die Quelle            | 2      | 150 s    | N S N             | 214 s         | 0/2/0  | 46 %        | 38 %         |
| 9     | Umbau                 | 2      | 170 s    | S N N             | 287 s         | 1/0/0  | 46 %        | 41 %         |
| 10    | Schwarzes Riff        | 2      | 175 s    | N S N             | 575 s         | 0/1/0  | 33 %        | 38 %         |
| 11    | Enge Gassen           | 2      | 180 s    | N Z S             | 319 s         | 0/0/1  | 33 %        | 40 %         |
| 12    | Gegenstrom            | 2      | 185 s    | N N S             | 188 s         | 0/0/2  | 38 %        | 40 %         |
| 13    | Dreifront             | 3      | 200 s    | Z S N             | 161 s         | 0/3/0  | 31 %        | 40 %         |
| 14    | Tiefe Gräben          | 3      | 220 s    | Z S N             | 517 s         | 0/1/0  | 53 %        | 53 %         |
| 15    | Stille Wasser         | 3      | 230 s    | S N Z             | 154 s         | 3/0/0  | 33 %        | 51 %         |
| 16    | Das Leuchten erlischt | 3      | 240 s    | S S N             | 279 s         | 2/3/0  | 35 %        | 56 %         |
| 17    | Abgrund               | 3      | 260 s    | N N S             | 690 s         | 0/0/1  | 35 %        | 41 %         |
| 18    | Der Grund             | 3      | 280 s    | Z S Z             | 213 s         | 0/3/0  | 25 %        | 38 %         |

## Endlos, Wellen 1–6 (Normal)

| Level | Name    | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | ------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| E1    | Welle 1 | 1      | 185 s    | Z Z Z             | –             | 0/0/0  | 36 %        | 38 %         |
| E2    | Welle 2 | 2      | 200 s    | S S S             | 176 s         | 1/3/3  | 43 %        | 71 %         |
| E3    | Welle 3 | 2      | 215 s    | Z N N             | –             | 0/0/0  | 11 %        | 11 %         |
| E4    | Welle 4 | 3      | 230 s    | N N S             | 273 s         | 0/0/2  | 33 %        | 33 %         |
| E5    | Welle 5 | 3      | 245 s    | N N N             | –             | 0/0/0  | 6 %         | 0 %          |
| E6    | Welle 6 | 3      | 260 s    | S N N             | 224 s         | 3/0/0  | 35 %        | 30 %         |

## Schwer

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 85 s     | S S S             | 142 s         | 1/1/1  |
| 2     | Brutgrund             | 95 s     | S S S             | 147 s         | 2/2/1  |
| 3     | Ausbau                | 100 s    | S S S             | 170 s         | 1/1/2  |
| 4     | Riffkante             | 110 s    | Z S S             | 198 s         | 0/2/1  |
| 5     | Kalte Strömung        | 120 s    | S S Z             | 148 s         | 2/2/0  |
| 6     | Zwei Fronten          | 130 s    | S N S             | 145 s         | 2/0/2  |
| 7     | Wachtposten           | 145 s    | N N N             | –             | 0/0/0  |
| 8     | Die Quelle            | 150 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 170 s    | N N N             | –             | 0/0/0  |
| 10    | Schwarzes Riff        | 175 s    | N N N             | –             | 0/0/0  |
| 11    | Enge Gassen           | 180 s    | S S N             | 306 s         | 1/3/0  |
| 12    | Gegenstrom            | 185 s    | N N N             | –             | 0/0/0  |
| 13    | Dreifront             | 200 s    | N N N             | –             | 0/0/0  |
| 14    | Tiefe Gräben          | 220 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 230 s    | N N N             | –             | 0/0/0  |
| 16    | Das Leuchten erlischt | 240 s    | N N N             | –             | 0/0/0  |
| 17    | Abgrund               | 260 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 280 s    | Z Z N             | –             | 0/0/0  |
| E1    | Welle 1               | 185 s    | N N Z             | –             | 0/0/0  |
| E2    | Welle 2               | 200 s    | S Z S             | 466 s         | 1/0/1  |
| E3    | Welle 3               | 215 s    | N N N             | –             | 0/0/0  |
| E4    | Welle 4               | 230 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 245 s    | N N N             | –             | 0/0/0  |
| E6    | Welle 6               | 260 s    | N N N             | –             | 0/0/0  |

## Leicht

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 85 s     | S S S             | 121 s         | 2/1/3  |
| 2     | Brutgrund             | 95 s     | S S S             | 88 s          | 2/3/3  |
| 3     | Ausbau                | 100 s    | S S S             | 125 s         | 2/3/1  |
| 4     | Riffkante             | 110 s    | S S S             | 107 s         | 3/3/2  |
| 5     | Kalte Strömung        | 120 s    | S S S             | 108 s         | 3/3/2  |
| 6     | Zwei Fronten          | 130 s    | S S S             | 119 s         | 3/2/3  |
| 7     | Wachtposten           | 145 s    | S S N             | 118 s         | 3/3/0  |
| 8     | Die Quelle            | 150 s    | S S S             | 131 s         | 3/1/3  |
| 9     | Umbau                 | 170 s    | S S N             | 204 s         | 1/3/0  |
| 10    | Schwarzes Riff        | 175 s    | S S S             | 194 s         | 1/2/3  |
| 11    | Enge Gassen           | 180 s    | S N N             | 185 s         | 2/0/0  |
| 12    | Gegenstrom            | 185 s    | Z N N             | –             | 0/0/0  |
| 13    | Dreifront             | 200 s    | Z S Z             | 256 s         | 0/2/0  |
| 14    | Tiefe Gräben          | 220 s    | S Z Z             | 426 s         | 1/0/0  |
| 15    | Stille Wasser         | 230 s    | S S S             | 142 s         | 3/3/2  |
| 16    | Das Leuchten erlischt | 240 s    | S S S             | 201 s         | 2/3/3  |
| 17    | Abgrund               | 260 s    | S S S             | 273 s         | 3/2/1  |
| 18    | Der Grund             | 280 s    | S S Z             | 182 s         | 3/3/0  |
| E1    | Welle 1               | 185 s    | S Z Z             | 214 s         | 2/0/0  |
| E2    | Welle 2               | 200 s    | Z S S             | 160 s         | 0/3/3  |
| E3    | Welle 3               | 215 s    | N N N             | –             | 0/0/0  |
| E4    | Welle 4               | 230 s    | N S S             | 215 s         | 0/2/3  |
| E5    | Welle 5               | 245 s    | N N N             | –             | 0/0/0  |
| E6    | Welle 6               | 260 s    | S S S             | 229 s         | 3/3/3  |

## Zusammenfassung

- Nie gewonnen (normal): E1 „Welle 1“, E3 „Welle 3“, E5 „Welle 5“.
- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): 7 „Wachtposten“, 8 „Die Quelle“, 9 „Umbau“, 10 „Schwarzes Riff“, 11 „Enge Gassen“, 12 „Gegenstrom“, 13 „Dreifront“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 16 „Das Leuchten erlischt“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“, E6 „Welle 6“.
- In jedem Lauf unter Zielzeit (normal): keines.
- Verdächtig leicht (jeder Lauf unter halber Zielzeit): keines.
- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): keines.
- Auf „Leicht“ nicht sicher gewonnen: 7 „Wachtposten“, 9 „Umbau“, 11 „Enge Gassen“, 12 „Gegenstrom“, 13 „Dreifront“, 14 „Tiefe Gräben“, 18 „Der Grund“, E1 „Welle 1“, E2 „Welle 2“, E3 „Welle 3“, E4 „Welle 4“, E5 „Welle 5“.
- Auf „Schwer“ in jedem Lauf unter Zielzeit: keines.
