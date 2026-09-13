# Balance-Bericht

Stand: 2026-09-13 · Weltgröße: 1600 × 800 · Laufzeit des Harness: 13.1 s

## Methode

- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.
- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall 1.2 s / 1.5 s / 2 s; der Kartenseed ist fest.
- Simulation: `step(state, 1/30)` bis Spielende oder 900 s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.
- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).
- Zeit ist der Median der gewonnenen Läufe.

## Kampagne (Normal)

| Level | Name                  | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | --------------------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| 1     | Erstes Leuchten       | 1      | 95 s     | S S S             | 133 s         | 3/2/2  | 67 %        | 71 %         |
| 2     | Brutgrund             | 1      | 90 s     | S S S             | 138 s         | 2/2/1  | 59 %        | 74 %         |
| 3     | Ausbau                | 1      | 95 s     | S S S             | 188 s         | 1/1/1  | 63 %        | 77 %         |
| 4     | Riffkante             | 1      | 90 s     | S S S             | 134 s         | 2/2/1  | 50 %        | 73 %         |
| 5     | Kalte Strömung        | 1      | 155 s    | S S S             | 191 s         | 3/2/1  | 61 %        | 76 %         |
| 6     | Zwei Fronten          | 2      | 190 s    | S S S             | 187 s         | 2/3/3  | 42 %        | 67 %         |
| 7     | Wachtposten           | 2      | 145 s    | S N N             | 141 s         | 3/0/0  | 33 %        | 53 %         |
| 8     | Die Quelle            | 2      | 155 s    | N S N             | 202 s         | 0/2/0  | 41 %        | 46 %         |
| 9     | Umbau                 | 2      | 155 s    | S N N             | 307 s         | 1/0/0  | 38 %        | 36 %         |
| 10    | Schwarzes Riff        | 2      | 195 s    | S N S             | 215 s         | 3/0/2  | 38 %        | 55 %         |
| 11    | Enge Gassen           | 2      | 195 s    | N S N             | 303 s         | 0/2/0  | 33 %        | 42 %         |
| 12    | Gegenstrom            | 2      | 230 s    | S N N             | 850 s         | 1/0/0  | 40 %        | 53 %         |
| 13    | Dreifront             | 3      | 240 s    | S S N             | 173 s         | 3/3/0  | 31 %        | 54 %         |
| 14    | Tiefe Gräben          | 3      | 250 s    | S N N             | 288 s         | 2/0/0  | 25 %        | 29 %         |
| 15    | Stille Wasser         | 3      | 265 s    | N S N             | 154 s         | 0/3/0  | 33 %        | 57 %         |
| 16    | Das Leuchten erlischt | 3      | 280 s    | S Z S             | 243 s         | 3/0/3  | 35 %        | 50 %         |
| 17    | Abgrund               | 3      | 290 s    | S S N             | 365 s         | 2/2/0  | 31 %        | 26 %         |
| 18    | Der Grund             | 3      | 300 s    | N N N             | –             | 0/0/0  | 27 %        | 20 %         |

## Endlos, Wellen 1–6 (Normal)

| Level | Name    | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | ------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| E1    | Welle 1 | 2      | 185 s    | S Z S             | 396 s         | 1/0/1  | 33 %        | 41 %         |
| E2    | Welle 2 | 2      | 200 s    | N S S             | 224 s         | 0/2/2  | 48 %        | 57 %         |
| E3    | Welle 3 | 3      | 215 s    | S S S             | 174 s         | 1/3/3  | 31 %        | 60 %         |
| E4    | Welle 4 | 3      | 230 s    | N N N             | –             | 0/0/0  | 23 %        | 17 %         |
| E5    | Welle 5 | 3      | 245 s    | N N S             | 176 s         | 0/0/3  | 33 %        | 22 %         |
| E6    | Welle 6 | 3      | 260 s    | N N N             | –             | 0/0/0  | 26 %        | 26 %         |

## Schwer

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 95 s     | S S S             | 192 s         | 2/1/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 150 s         | 1/1/1  |
| 3     | Ausbau                | 95 s     | S S S             | 281 s         | 1/1/1  |
| 4     | Riffkante             | 90 s     | S S S             | 284 s         | 1/1/1  |
| 5     | Kalte Strömung        | 155 s    | S S S             | 131 s         | 3/3/1  |
| 6     | Zwei Fronten          | 190 s    | S S S             | 223 s         | 2/2/3  |
| 7     | Wachtposten           | 145 s    | N N N             | –             | 0/0/0  |
| 8     | Die Quelle            | 155 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 155 s    | N N N             | –             | 0/0/0  |
| 10    | Schwarzes Riff        | 195 s    | N S Z             | 258 s         | 0/2/0  |
| 11    | Enge Gassen           | 195 s    | N N N             | –             | 0/0/0  |
| 12    | Gegenstrom            | 230 s    | N S N             | 789 s         | 0/1/0  |
| 13    | Dreifront             | 240 s    | Z N N             | –             | 0/0/0  |
| 14    | Tiefe Gräben          | 250 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 265 s    | N N N             | –             | 0/0/0  |
| 16    | Das Leuchten erlischt | 280 s    | N S S             | 240 s         | 0/3/2  |
| 17    | Abgrund               | 290 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 300 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 185 s    | S N N             | 660 s         | 1/0/0  |
| E2    | Welle 2               | 200 s    | S N N             | 291 s         | 2/0/0  |
| E3    | Welle 3               | 215 s    | Z S S             | 223 s         | 0/3/2  |
| E4    | Welle 4               | 230 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 245 s    | N N N             | –             | 0/0/0  |
| E6    | Welle 6               | 260 s    | N N N             | –             | 0/0/0  |

## Leicht

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 95 s     | S S S             | 119 s         | 2/1/3  |
| 2     | Brutgrund             | 90 s     | S S S             | 88 s          | 1/3/3  |
| 3     | Ausbau                | 95 s     | S S S             | 100 s         | 2/2/3  |
| 4     | Riffkante             | 90 s     | S S S             | 109 s         | 2/2/2  |
| 5     | Kalte Strömung        | 155 s    | S S S             | 93 s          | 3/3/2  |
| 6     | Zwei Fronten          | 190 s    | S S S             | 113 s         | 3/3/3  |
| 7     | Wachtposten           | 145 s    | S S Z             | 152 s         | 2/3/0  |
| 8     | Die Quelle            | 155 s    | S S S             | 170 s         | 3/2/2  |
| 9     | Umbau                 | 155 s    | S S S             | 167 s         | 2/2/1  |
| 10    | Schwarzes Riff        | 195 s    | S Z S             | 201 s         | 3/0/2  |
| 11    | Enge Gassen           | 195 s    | S S Z             | 268 s         | 2/2/0  |
| 12    | Gegenstrom            | 230 s    | S S S             | 232 s         | 2/1/3  |
| 13    | Dreifront             | 240 s    | S S S             | 360 s         | 2/2/1  |
| 14    | Tiefe Gräben          | 250 s    | S S N             | 191 s         | 3/3/0  |
| 15    | Stille Wasser         | 265 s    | S N N             | 169 s         | 3/0/0  |
| 16    | Das Leuchten erlischt | 280 s    | S S S             | 194 s         | 3/3/2  |
| 17    | Abgrund               | 290 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 300 s    | N N S             | 426 s         | 0/0/2  |
| E1    | Welle 1               | 185 s    | S S S             | 387 s         | 1/3/1  |
| E2    | Welle 2               | 200 s    | S S S             | 152 s         | 3/3/3  |
| E3    | Welle 3               | 215 s    | S S S             | 200 s         | 3/3/3  |
| E4    | Welle 4               | 230 s    | N S N             | 251 s         | 0/2/0  |
| E5    | Welle 5               | 245 s    | N S N             | 276 s         | 0/2/0  |
| E6    | Welle 6               | 260 s    | S S S             | 293 s         | 2/3/2  |

## Zusammenfassung

- Nie gewonnen (normal): 18 „Der Grund“, E4 „Welle 4“, E6 „Welle 6“.
- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): 7 „Wachtposten“, 8 „Die Quelle“, 9 „Umbau“, 10 „Schwarzes Riff“, 11 „Enge Gassen“, 12 „Gegenstrom“, 13 „Dreifront“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 16 „Das Leuchten erlischt“, 17 „Abgrund“, E1 „Welle 1“, E2 „Welle 2“, E5 „Welle 5“.
- In jedem Lauf unter Zielzeit (normal): keines.
- Verdächtig leicht (jeder Lauf unter halber Zielzeit): keines.
- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): 3 „Ausbau“.
- Auf „Leicht“ nicht sicher gewonnen: 7 „Wachtposten“, 10 „Schwarzes Riff“, 11 „Enge Gassen“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“, E5 „Welle 5“.
- Auf „Schwer“ in jedem Lauf unter Zielzeit: keines.
