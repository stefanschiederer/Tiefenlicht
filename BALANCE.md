# Balance-Bericht

Stand: 2026-09-13 · Weltgröße: 1600 × 800 · Laufzeit des Harness: 9.8 s

## Methode

- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.
- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall 1.2 s / 1.5 s / 2 s; der Kartenseed ist fest.
- Simulation: `step(state, 1/30)` bis Spielende oder 900 s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.
- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).
- Zeit ist der Median der gewonnenen Läufe.

## Kampagne (Normal)

| Level | Name                  | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | --------------------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| 1     | Erstes Leuchten       | 1      | 80 s     | S S S             | 218 s         | 1/1/1  | 48 %        | 57 %         |
| 2     | Brutgrund             | 1      | 90 s     | S S S             | 138 s         | 2/2/1  | 59 %        | 78 %         |
| 3     | Ausbau                | 1      | 100 s    | S S S             | 109 s         | 1/2/2  | 67 %        | 97 %         |
| 4     | Riffkante             | 1      | 110 s    | S N Z             | 475 s         | 1/0/0  | 33 %        | 23 %         |
| 5     | Kalte Strömung        | 1      | 120 s    | S N S             | 724 s         | 1/0/1  | 52 %        | 55 %         |
| 6     | Zwei Fronten          | 2      | 150 s    | N N N             | –             | 0/0/0  | 17 %        | 6 %          |
| 7     | Wachtposten           | 2      | 150 s    | S N N             | 141 s         | 3/0/0  | 33 %        | 53 %         |
| 8     | Die Quelle            | 2      | 120 s    | N N N             | –             | 0/0/0  | 26 %        | 13 %         |
| 9     | Umbau                 | 2      | 127 s    | N N S             | 601 s         | 0/0/1  | 41 %        | 44 %         |
| 10    | Schwarzes Riff        | 2      | 135 s    | N N N             | –             | 0/0/0  | 38 %        | 36 %         |
| 11    | Enge Gassen           | 2      | 142 s    | S S S             | 381 s         | 1/1/1  | 36 %        | 49 %         |
| 12    | Gegenstrom            | 2      | 150 s    | S N N             | 850 s         | 1/0/0  | 40 %        | 53 %         |
| 13    | Dreifront             | 3      | 165 s    | Z N Z             | –             | 0/0/0  | 40 %        | 50 %         |
| 14    | Tiefe Gräben          | 3      | 172 s    | N N N             | –             | 0/0/0  | 35 %        | 29 %         |
| 15    | Stille Wasser         | 3      | 180 s    | N N Z             | –             | 0/0/0  | 37 %        | 49 %         |
| 16    | Das Leuchten erlischt | 3      | 187 s    | S S S             | 200 s         | 3/2/2  | 35 %        | 63 %         |
| 17    | Abgrund               | 3      | 195 s    | N N N             | –             | 0/0/0  | 31 %        | 19 %         |
| 18    | Der Grund             | 3      | 225 s    | N N N             | –             | 0/0/0  | 12 %        | 5 %          |

## Endlos, Wellen 1–6 (Normal)

| Level | Name    | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | ------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| E1    | Welle 1 | 2      | 210 s    | S S S             | 258 s         | 2/1/2  | 44 %        | 56 %         |
| E2    | Welle 2 | 2      | 220 s    | N S Z             | 177 s         | 0/3/0  | 50 %        | 57 %         |
| E3    | Welle 3 | 3      | 230 s    | N S N             | 132 s         | 0/3/0  | 38 %        | 44 %         |
| E4    | Welle 4 | 3      | 240 s    | N N N             | –             | 0/0/0  | 46 %        | 29 %         |
| E5    | Welle 5 | 3      | 250 s    | S S S             | 192 s         | 3/3/3  | 53 %        | 78 %         |
| E6    | Welle 6 | 3      | 260 s    | S N S             | 342 s         | 2/0/2  | 19 %        | 24 %         |

## Schwer

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 80 s     | S S S             | 194 s         | 1/1/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 165 s         | 1/1/1  |
| 3     | Ausbau                | 100 s    | S N S             | 229 s         | 1/0/1  |
| 4     | Riffkante             | 110 s    | S N Z             | 784 s         | 1/0/0  |
| 5     | Kalte Strömung        | 120 s    | N S Z             | 573 s         | 0/1/0  |
| 6     | Zwei Fronten          | 150 s    | N N N             | –             | 0/0/0  |
| 7     | Wachtposten           | 150 s    | N N N             | –             | 0/0/0  |
| 8     | Die Quelle            | 120 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 127 s    | N S N             | 237 s         | 0/1/0  |
| 10    | Schwarzes Riff        | 135 s    | N N N             | –             | 0/0/0  |
| 11    | Enge Gassen           | 142 s    | S N S             | 439 s         | 1/0/1  |
| 12    | Gegenstrom            | 150 s    | N S N             | 789 s         | 0/1/0  |
| 13    | Dreifront             | 165 s    | N Z N             | –             | 0/0/0  |
| 14    | Tiefe Gräben          | 172 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 180 s    | N N Z             | –             | 0/0/0  |
| 16    | Das Leuchten erlischt | 187 s    | S N N             | 198 s         | 2/0/0  |
| 17    | Abgrund               | 195 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 225 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 210 s    | S S S             | 333 s         | 2/1/2  |
| E2    | Welle 2               | 220 s    | N N N             | –             | 0/0/0  |
| E3    | Welle 3               | 230 s    | N N N             | –             | 0/0/0  |
| E4    | Welle 4               | 240 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 250 s    | S S S             | 246 s         | 3/3/3  |
| E6    | Welle 6               | 260 s    | N N N             | –             | 0/0/0  |

## Leicht

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 80 s     | S S S             | 150 s         | 1/1/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 106 s         | 1/2/2  |
| 3     | Ausbau                | 100 s    | S S S             | 186 s         | 2/1/1  |
| 4     | Riffkante             | 110 s    | S S S             | 676 s         | 1/1/1  |
| 5     | Kalte Strömung        | 120 s    | S S S             | 335 s         | 1/1/1  |
| 6     | Zwei Fronten          | 150 s    | N N S             | 712 s         | 0/0/1  |
| 7     | Wachtposten           | 150 s    | S S Z             | 152 s         | 2/3/0  |
| 8     | Die Quelle            | 120 s    | N N S             | 185 s         | 0/0/2  |
| 9     | Umbau                 | 127 s    | S S S             | 180 s         | 2/2/1  |
| 10    | Schwarzes Riff        | 135 s    | N N N             | –             | 0/0/0  |
| 11    | Enge Gassen           | 142 s    | S S S             | 209 s         | 2/1/3  |
| 12    | Gegenstrom            | 150 s    | S S S             | 232 s         | 2/1/2  |
| 13    | Dreifront             | 165 s    | S S N             | 207 s         | 1/3/0  |
| 14    | Tiefe Gräben          | 172 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 180 s    | S S S             | 371 s         | 2/1/1  |
| 16    | Das Leuchten erlischt | 187 s    | S S S             | 310 s         | 1/1/2  |
| 17    | Abgrund               | 195 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 225 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 210 s    | S S S             | 154 s         | 3/3/3  |
| E2    | Welle 2               | 220 s    | S S Z             | 200 s         | 3/2/0  |
| E3    | Welle 3               | 230 s    | S S S             | 207 s         | 2/3/3  |
| E4    | Welle 4               | 240 s    | N S S             | 260 s         | 0/3/2  |
| E5    | Welle 5               | 250 s    | S S S             | 141 s         | 3/3/3  |
| E6    | Welle 6               | 260 s    | S S S             | 301 s         | 2/2/2  |

## Zusammenfassung

- Nie gewonnen (normal): 6 „Zwei Fronten“, 8 „Die Quelle“, 10 „Schwarzes Riff“, 13 „Dreifront“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“.
- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): 4 „Riffkante“, 5 „Kalte Strömung“, 7 „Wachtposten“, 9 „Umbau“, 12 „Gegenstrom“, E2 „Welle 2“, E3 „Welle 3“, E6 „Welle 6“.
- In jedem Lauf unter Zielzeit (normal): E5 „Welle 5“.
- Verdächtig leicht (jeder Lauf unter halber Zielzeit): keines.
- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): 1 „Erstes Leuchten“, 11 „Enge Gassen“.
- Auf „Leicht“ nicht sicher gewonnen: 6 „Zwei Fronten“, 7 „Wachtposten“, 8 „Die Quelle“, 10 „Schwarzes Riff“, 13 „Dreifront“, 14 „Tiefe Gräben“, 17 „Abgrund“, 18 „Der Grund“, E2 „Welle 2“, E4 „Welle 4“.
- Auf „Schwer“ in jedem Lauf unter Zielzeit: E5 „Welle 5“.
