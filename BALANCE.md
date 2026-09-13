# Balance-Bericht

Stand: 2026-09-13 · Weltgröße: 1600 × 800 · Laufzeit des Harness: 5.9 s

## Methode

- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.
- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall 1.2 s / 1.5 s / 2 s; der Kartenseed ist fest.
- Simulation: `step(state, 1/30)` bis Spielende oder 900 s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.
- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).
- Zeit ist der Median der gewonnenen Läufe.

## Kampagne (Normal)

| Level | Name                  | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | --------------------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| 1     | Erstes Leuchten       | 1      | 80 s     | S S S             | 186 s         | 1/1/1  | 57 %        | 57 %         |
| 2     | Brutgrund             | 1      | 90 s     | S S S             | 134 s         | 2/2/1  | 67 %        | 85 %         |
| 3     | Ausbau                | 1      | 100 s    | S S S             | 210 s         | 1/1/1  | 63 %        | 77 %         |
| 4     | Riffkante             | 1      | 110 s    | S S Z             | 600 s         | 1/1/0  | 37 %        | 37 %         |
| 5     | Kalte Strömung        | 1      | 120 s    | S S Z             | 330 s         | 1/1/0  | 48 %        | 61 %         |
| 6     | Zwei Fronten          | 2      | 150 s    | N N N             | –             | 0/0/0  | 17 %        | 8 %          |
| 7     | Wachtposten           | 2      | 150 s    | S S N             | 257 s         | 1/2/0  | 39 %        | 61 %         |
| 8     | Die Quelle            | 2      | 120 s    | N N N             | –             | 0/0/0  | 26 %        | 21 %         |
| 9     | Umbau                 | 2      | 127 s    | S N Z             | 275 s         | 1/0/0  | 38 %        | 54 %         |
| 10    | Schwarzes Riff        | 2      | 135 s    | N N N             | –             | 0/0/0  | 38 %        | 29 %         |
| 11    | Enge Gassen           | 2      | 142 s    | S S S             | 181 s         | 2/2/1  | 36 %        | 60 %         |
| 12    | Gegenstrom            | 2      | 150 s    | N S S             | 338 s         | 0/2/1  | 36 %        | 47 %         |
| 13    | Dreifront             | 3      | 165 s    | N N N             | –             | 0/0/0  | 40 %        | 48 %         |
| 14    | Tiefe Gräben          | 3      | 172 s    | N N N             | –             | 0/0/0  | 41 %        | 22 %         |
| 15    | Stille Wasser         | 3      | 180 s    | Z N S             | 356 s         | 0/0/1  | 31 %        | 53 %         |
| 16    | Das Leuchten erlischt | 3      | 187 s    | S Z S             | 264 s         | 1/0/2  | 30 %        | 65 %         |
| 17    | Abgrund               | 3      | 195 s    | N N N             | –             | 0/0/0  | 28 %        | 15 %         |
| 18    | Der Grund             | 3      | 225 s    | N N N             | –             | 0/0/0  | 13 %        | 7 %          |

## Endlos, Wellen 1–6 (Normal)

| Level | Name    | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | ------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| E1    | Welle 1 | 2      | 210 s    | S S S             | 160 s         | 3/3/3  | 44 %        | 74 %         |
| E2    | Welle 2 | 2      | 220 s    | S N S             | 420 s         | 1/0/1  | 45 %        | 52 %         |
| E3    | Welle 3 | 3      | 230 s    | N S N             | 144 s         | 0/3/0  | 42 %        | 51 %         |
| E4    | Welle 4 | 3      | 240 s    | N N N             | –             | 0/0/0  | 42 %        | 35 %         |
| E5    | Welle 5 | 3      | 250 s    | S S S             | 309 s         | 2/3/2  | 51 %        | 63 %         |
| E6    | Welle 6 | 3      | 260 s    | N N N             | –             | 0/0/0  | 13 %        | 6 %          |

## Schwer

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 80 s     | S S S             | 261 s         | 1/1/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 165 s         | 1/1/1  |
| 3     | Ausbau                | 100 s    | S N S             | 271 s         | 1/0/1  |
| 4     | Riffkante             | 110 s    | N N Z             | –             | 0/0/0  |
| 5     | Kalte Strömung        | 120 s    | N N N             | –             | 0/0/0  |
| 6     | Zwei Fronten          | 150 s    | N N N             | –             | 0/0/0  |
| 7     | Wachtposten           | 150 s    | S N N             | 292 s         | 1/0/0  |
| 8     | Die Quelle            | 120 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 127 s    | S N N             | 148 s         | 2/0/0  |
| 10    | Schwarzes Riff        | 135 s    | N N N             | –             | 0/0/0  |
| 11    | Enge Gassen           | 142 s    | S S S             | 330 s         | 1/1/1  |
| 12    | Gegenstrom            | 150 s    | S N N             | 233 s         | 2/0/0  |
| 13    | Dreifront             | 165 s    | N N N             | –             | 0/0/0  |
| 14    | Tiefe Gräben          | 172 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 180 s    | N N N             | –             | 0/0/0  |
| 16    | Das Leuchten erlischt | 187 s    | N S Z             | 275 s         | 0/2/0  |
| 17    | Abgrund               | 195 s    | N N N             | –             | 0/0/0  |
| 18    | Der Grund             | 225 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 210 s    | N S N             | 127 s         | 0/3/0  |
| E2    | Welle 2               | 220 s    | N N N             | –             | 0/0/0  |
| E3    | Welle 3               | 230 s    | N N N             | –             | 0/0/0  |
| E4    | Welle 4               | 240 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 250 s    | S S S             | 291 s         | 2/2/1  |
| E6    | Welle 6               | 260 s    | N S N             | 405 s         | 0/2/0  |

## Leicht

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 80 s     | S S S             | 148 s         | 2/1/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 136 s         | 1/2/2  |
| 3     | Ausbau                | 100 s    | S S S             | 116 s         | 1/3/2  |
| 4     | Riffkante             | 110 s    | S S Z             | 537 s         | 1/1/0  |
| 5     | Kalte Strömung        | 120 s    | S S S             | 315 s         | 2/1/1  |
| 6     | Zwei Fronten          | 150 s    | S S Z             | 362 s         | 1/1/0  |
| 7     | Wachtposten           | 150 s    | S S S             | 267 s         | 2/1/1  |
| 8     | Die Quelle            | 120 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 127 s    | S S S             | 241 s         | 1/2/1  |
| 10    | Schwarzes Riff        | 135 s    | Z S N             | 508 s         | 0/1/0  |
| 11    | Enge Gassen           | 142 s    | S S S             | 305 s         | 1/2/1  |
| 12    | Gegenstrom            | 150 s    | S S S             | 337 s         | 1/1/1  |
| 13    | Dreifront             | 165 s    | S S Z             | 275 s         | 1/3/0  |
| 14    | Tiefe Gräben          | 172 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 180 s    | S Z S             | 186 s         | 3/0/2  |
| 16    | Das Leuchten erlischt | 187 s    | S S S             | 217 s         | 2/3/2  |
| 17    | Abgrund               | 195 s    | S S Z             | 629 s         | 1/1/0  |
| 18    | Der Grund             | 225 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 210 s    | S S S             | 195 s         | 3/3/1  |
| E2    | Welle 2               | 220 s    | S S S             | 283 s         | 2/1/2  |
| E3    | Welle 3               | 230 s    | S S S             | 209 s         | 3/3/2  |
| E4    | Welle 4               | 240 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 250 s    | S S S             | 149 s         | 3/3/3  |
| E6    | Welle 6               | 260 s    | S S S             | 349 s         | 2/1/3  |

## Zusammenfassung

- Nie gewonnen (normal): 6 „Zwei Fronten“, 8 „Die Quelle“, 10 „Schwarzes Riff“, 13 „Dreifront“, 14 „Tiefe Gräben“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“, E6 „Welle 6“.
- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): 4 „Riffkante“, 5 „Kalte Strömung“, 7 „Wachtposten“, 9 „Umbau“, 12 „Gegenstrom“, 15 „Stille Wasser“, 16 „Das Leuchten erlischt“, E2 „Welle 2“, E3 „Welle 3“.
- In jedem Lauf unter Zielzeit (normal): E1 „Welle 1“.
- Verdächtig leicht (jeder Lauf unter halber Zielzeit): keines.
- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): 1 „Erstes Leuchten“, 3 „Ausbau“.
- Auf „Leicht“ nicht sicher gewonnen: 4 „Riffkante“, 6 „Zwei Fronten“, 8 „Die Quelle“, 10 „Schwarzes Riff“, 13 „Dreifront“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“.
- Auf „Schwer“ in jedem Lauf unter Zielzeit: keines.
