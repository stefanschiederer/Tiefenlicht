# Balance-Bericht

Stand: 2026-09-13 · Weltgröße: 1600 × 800 · Laufzeit des Harness: 8.4 s

## Methode

- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.
- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall 1.2 s / 1.5 s / 2 s; der Kartenseed ist fest.
- Simulation: `step(state, 1/30)` bis Spielende oder 900 s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.
- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).
- Zeit ist der Median der gewonnenen Läufe.

## Kampagne (Normal)

| Level | Name                  | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | --------------------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| 1     | Erstes Leuchten       | 1      | 95 s     | S S S             | 138 s         | 2/2/2  | 57 %        | 71 %         |
| 2     | Brutgrund             | 1      | 90 s     | S S S             | 125 s         | 2/2/2  | 67 %        | 81 %         |
| 3     | Ausbau                | 1      | 95 s     | S S S             | 135 s         | 2/1/2  | 63 %        | 87 %         |
| 4     | Riffkante             | 1      | 90 s     | S S S             | 130 s         | 2/1/2  | 47 %        | 87 %         |
| 5     | Kalte Strömung        | 1      | 155 s    | S S S             | 224 s         | 2/2/2  | 64 %        | 73 %         |
| 6     | Zwei Fronten          | 2      | 190 s    | S S S             | 269 s         | 2/2/1  | 42 %        | 58 %         |
| 7     | Wachtposten           | 2      | 145 s    | S S N             | 205 s         | 1/2/0  | 39 %        | 61 %         |
| 8     | Die Quelle            | 2      | 155 s    | S S N             | 256 s         | 1/2/0  | 51 %        | 56 %         |
| 9     | Umbau                 | 2      | 155 s    | S S N             | 177 s         | 2/2/0  | 49 %        | 54 %         |
| 10    | Schwarzes Riff        | 2      | 195 s    | S S N             | 382 s         | 1/1/0  | 38 %        | 50 %         |
| 11    | Enge Gassen           | 2      | 195 s    | N S S             | 180 s         | 0/3/3  | 33 %        | 53 %         |
| 12    | Gegenstrom            | 2      | 230 s    | N S S             | 332 s         | 0/3/1  | 36 %        | 47 %         |
| 13    | Dreifront             | 3      | 240 s    | N S N             | 168 s         | 0/3/0  | 33 %        | 52 %         |
| 14    | Tiefe Gräben          | 3      | 250 s    | N S N             | 209 s         | 0/3/0  | 24 %        | 35 %         |
| 15    | Stille Wasser         | 3      | 265 s    | N S N             | 332 s         | 0/2/0  | 29 %        | 41 %         |
| 16    | Das Leuchten erlischt | 3      | 280 s    | S N N             | 156 s         | 3/0/0  | 31 %        | 57 %         |
| 17    | Abgrund               | 3      | 290 s    | N S N             | 258 s         | 0/3/0  | 33 %        | 20 %         |
| 18    | Der Grund             | 3      | 300 s    | N N S             | 367 s         | 0/0/2  | 27 %        | 23 %         |

## Endlos, Wellen 1–6 (Normal)

| Level | Name    | Gegner | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne | Anteil 60 s | Anteil 120 s |
| ----- | ------- | ------ | -------- | ----------------- | ------------- | ------ | ----------- | ------------ |
| E1    | Welle 1 | 2      | 185 s    | S S S             | 248 s         | 2/1/2  | 38 %        | 54 %         |
| E2    | Welle 2 | 2      | 200 s    | S N S             | 246 s         | 2/0/2  | 43 %        | 52 %         |
| E3    | Welle 3 | 3      | 215 s    | S S S             | 346 s         | 1/1/3  | 33 %        | 62 %         |
| E4    | Welle 4 | 3      | 230 s    | S N N             | 678 s         | 1/0/0  | 23 %        | 23 %         |
| E5    | Welle 5 | 3      | 245 s    | N N N             | –             | 0/0/0  | 27 %        | 6 %          |
| E6    | Welle 6 | 3      | 260 s    | N N N             | –             | 0/0/0  | 26 %        | 22 %         |

## Schwer

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 95 s     | S S S             | 168 s         | 1/2/1  |
| 2     | Brutgrund             | 90 s     | S S S             | 164 s         | 1/1/1  |
| 3     | Ausbau                | 95 s     | S S S             | 302 s         | 1/1/1  |
| 4     | Riffkante             | 90 s     | S S S             | 252 s         | 1/1/1  |
| 5     | Kalte Strömung        | 155 s    | S S S             | 272 s         | 2/1/1  |
| 6     | Zwei Fronten          | 190 s    | S N S             | 127 s         | 3/0/3  |
| 7     | Wachtposten           | 145 s    | S N N             | 187 s         | 2/0/0  |
| 8     | Die Quelle            | 155 s    | N N N             | –             | 0/0/0  |
| 9     | Umbau                 | 155 s    | N N N             | –             | 0/0/0  |
| 10    | Schwarzes Riff        | 195 s    | S N N             | 434 s         | 1/0/0  |
| 11    | Enge Gassen           | 195 s    | N N S             | 235 s         | 0/0/2  |
| 12    | Gegenstrom            | 230 s    | S N N             | 196 s         | 3/0/0  |
| 13    | Dreifront             | 240 s    | N Z N             | –             | 0/0/0  |
| 14    | Tiefe Gräben          | 250 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 265 s    | N N N             | –             | 0/0/0  |
| 16    | Das Leuchten erlischt | 280 s    | S S S             | 301 s         | 2/2/2  |
| 17    | Abgrund               | 290 s    | S N N             | 395 s         | 2/0/0  |
| 18    | Der Grund             | 300 s    | N N N             | –             | 0/0/0  |
| E1    | Welle 1               | 185 s    | S S N             | 564 s         | 1/1/0  |
| E2    | Welle 2               | 200 s    | S S N             | 411 s         | 1/1/0  |
| E3    | Welle 3               | 215 s    | S Z S             | 364 s         | 2/0/1  |
| E4    | Welle 4               | 230 s    | N N N             | –             | 0/0/0  |
| E5    | Welle 5               | 245 s    | N N N             | –             | 0/0/0  |
| E6    | Welle 6               | 260 s    | N N N             | –             | 0/0/0  |

## Leicht

| Level | Name                  | Zielzeit | Ausgang (3 Läufe) | Zeit (Median) | Sterne |
| ----- | --------------------- | -------- | ----------------- | ------------- | ------ |
| 1     | Erstes Leuchten       | 95 s     | S S S             | 59 s          | 3/3/3  |
| 2     | Brutgrund             | 90 s     | S S S             | 136 s         | 1/2/2  |
| 3     | Ausbau                | 95 s     | S S S             | 161 s         | 1/2/1  |
| 4     | Riffkante             | 90 s     | S S S             | 136 s         | 2/2/1  |
| 5     | Kalte Strömung        | 155 s    | S S S             | 110 s         | 3/3/2  |
| 6     | Zwei Fronten          | 190 s    | S S S             | 111 s         | 3/3/3  |
| 7     | Wachtposten           | 145 s    | S S S             | 222 s         | 2/1/2  |
| 8     | Die Quelle            | 155 s    | S S S             | 127 s         | 2/3/3  |
| 9     | Umbau                 | 155 s    | S S S             | 143 s         | 3/3/1  |
| 10    | Schwarzes Riff        | 195 s    | S S S             | 276 s         | 3/2/1  |
| 11    | Enge Gassen           | 195 s    | S S N             | 334 s         | 1/3/0  |
| 12    | Gegenstrom            | 230 s    | S S S             | 337 s         | 1/3/2  |
| 13    | Dreifront             | 240 s    | S S S             | 233 s         | 3/2/3  |
| 14    | Tiefe Gräben          | 250 s    | N N N             | –             | 0/0/0  |
| 15    | Stille Wasser         | 265 s    | S N N             | 175 s         | 3/0/0  |
| 16    | Das Leuchten erlischt | 280 s    | S S S             | 215 s         | 3/3/3  |
| 17    | Abgrund               | 290 s    | S N S             | 301 s         | 2/0/2  |
| 18    | Der Grund             | 300 s    | N N S             | 299 s         | 0/0/3  |
| E1    | Welle 1               | 185 s    | S S S             | 214 s         | 2/3/2  |
| E2    | Welle 2               | 200 s    | S S S             | 184 s         | 3/3/3  |
| E3    | Welle 3               | 215 s    | S S S             | 156 s         | 3/3/2  |
| E4    | Welle 4               | 230 s    | S N N             | 413 s         | 1/0/0  |
| E5    | Welle 5               | 245 s    | S N N             | 358 s         | 2/0/0  |
| E6    | Welle 6               | 260 s    | S S S             | 293 s         | 2/1/2  |

## Zusammenfassung

- Nie gewonnen (normal): E5 „Welle 5“, E6 „Welle 6“.
- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): 7 „Wachtposten“, 8 „Die Quelle“, 9 „Umbau“, 10 „Schwarzes Riff“, 11 „Enge Gassen“, 12 „Gegenstrom“, 13 „Dreifront“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 16 „Das Leuchten erlischt“, 17 „Abgrund“, 18 „Der Grund“, E2 „Welle 2“, E4 „Welle 4“.
- In jedem Lauf unter Zielzeit (normal): keines.
- Verdächtig leicht (jeder Lauf unter halber Zielzeit): keines.
- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): keines.
- Auf „Leicht“ nicht sicher gewonnen: 11 „Enge Gassen“, 14 „Tiefe Gräben“, 15 „Stille Wasser“, 17 „Abgrund“, 18 „Der Grund“, E4 „Welle 4“, E5 „Welle 5“.
- Auf „Schwer“ in jedem Lauf unter Zielzeit: keines.

## Abstimmung 2026-09-13

Ziel war eine monotone Schwierigkeitskurve für den Bot auf „Normal“ (Level 1–6 alle drei Läufe gewonnen, Level 7–12 ein bis zwei Läufe, Level 13–18 höchstens ein Lauf, Endlos-Wellen 1–3 meist gewonnen, 4–6 selten). Vorgehen: Für jedes Level wurden viele Kartenseeds mit dem Bot durchgespielt; Kandidaten wurden zusätzlich mit drei KI-Intervall-Varianten (× 0,93 / 1 / 1,07) je dreimal geprüft (9 Läufe), damit das Ergebnis nicht an einer Kante hängt. Der Seed war fast immer der entscheidende Hebel: Startpositionen und Nachbarschaft entscheiden stärker über Sieg und Niederlage als `gar`, `prod` oder `ai`, deren Wirkung im Rauschen der drei Läufe kaum zu trennen war. Darum blieben `gar` und `ai` überall unverändert; `prod` wurde nur in zwei Fällen angehoben. Kein Level brauchte `obst`-Änderungen.

Änderungen je Level (Zielzeit alt → neu; Zielzeit = 0,7 × Median der Bot-Siegzeiten, auf 5 s gerundet):

- 1 „Erstes Leuchten“: Seed 11 → 21. Vorher gewonnen, aber mit großer Streuung (129–186 s); der neue Seed liefert drei enge Siege um 138 s. Zielzeit 80 → 95 s.
- 2 „Brutgrund“: unverändert (Seed 23, 9/9 robuste Siege). Zielzeit 90 → 90 s.
- 3 „Ausbau“: Seed 29 → 5. Alter Seed streute 64–480 s, neuer 103–172 s. Zielzeit 100 → 95 s.
- 4 „Riffkante“: Seed 37 → 34. Vorher ein Zeitüberschreitungs-Lauf und Siege erst nach 550–650 s (Patt gegen Bastionen); jetzt drei Siege um 130 s. Zielzeit 110 → 90 s.
- 5 „Kalte Strömung“: Seed 41 → 62. Vorher ein Zeitüberschreitungs-Lauf; jetzt 9/9 robuste Siege (190–246 s). Zielzeit 120 → 155 s.
- 6 „Zwei Fronten“: Seed 47 → 61. Vorher 0/3 (der Spieler saß zwischen beiden Gegnern); jetzt 9/9 robust, 249–306 s. Zielzeit 150 → 190 s.
- 7 „Wachtposten“: unverändert (Seed 59, 2/3 bzw. 6/9). Zielzeit 150 → 145 s.
- 8 „Die Quelle“: Seed 67 → 83. Vorher 0/3, jetzt 2/3 (5/9 robust). Zielzeit 120 → 155 s.
- 9 „Umbau“: Seed 71 → 73. Vorher ein Sieg plus Zeitüberschreitung; jetzt 2/3 ohne Patt (4/9 robust). Zielzeit 127 → 155 s.
- 10 „Schwarzes Riff“: Seed 73 → 58. Vorher 0/3, jetzt 2/3 (6/9 robust). Zielzeit 135 → 195 s.
- 11 „Enge Gassen“: Seed 79 → 70. Vorher 3/3 (zu leicht für Kapitel 2), jetzt 2/3 (6/9 robust). Zielzeit 142 → 195 s.
- 12 „Gegenstrom“: unverändert (Seed 83, 2/3 bzw. 6/9). Zielzeit 150 → 230 s.
- 13 „Dreifront“: Seed 89 → 86, `prod` 1,18 → 1,22. Alter Seed 0/9; Seed 86 allein wäre mit 5/9 zu leicht für Kapitel 3, mit leicht höherer Produktion 3/9 (1/3). Zielzeit 165 → 240 s.
- 14 „Tiefe Gräben“: Seed 97 → 113. Vorher 0/9, jetzt 3/9 (1/3) ohne Zeitüberschreitungen. Zielzeit 172 → 250 s.
- 15 „Stille Wasser“: Seed 101 → 87. Vorher ein Sieg, aber ein Patt bis 900 s; jetzt 2/9 (1/3), alle Läufe enden. Zielzeit 180 → 265 s.
- 16 „Das Leuchten erlischt“ (Boss): Seed bleibt 103 (faire Karte), `prod` 1,22 → 1,34. Vorher 8/9 Siege (zu leicht); Seeds mit weniger Siegen verloren teils in unter 60 s (Gegner-Boss direkt vor der Tür), daher lieber über die Produktion. Jetzt 4/9 (1/3). Zielzeit 187 → 280 s.
- 17 „Abgrund“: Seed 113 → 146. Vorher 0/9 mit Niederlagen nach 80–160 s; jetzt 2/9 (1/3). Zielzeit 195 → 290 s.
- 18 „Der Grund“ (Boss): Seed 127 → 138. Alter Seed war entartet (Niederlage in jedem Lauf nach 64–157 s, auch mit weniger Produktion); neuer Seed 1/9 (1/3, Sieg erst nach 367 s). Zielzeit 225 → 300 s.
- Endlos: Seed-Formel `500 + n · 37` → `500 + n · 31`. Vorher war Welle 5 mit 9/9 Siegen ein Ausreißer und Welle 3 wurde nur 1/3 gewonnen; jetzt Welle 1–3: 3/3, 2/3, 3/3 (6/9, 6/9, 8/9 robust), Welle 4: 1/3, Welle 5–6: 0/3. Zielzeit `200 + 10 n` → `170 + 15 n` (≈ 0,7 × Median der Wellen 1–3).

Zielzeiten: In Kapitel 1 direkt 0,7 × Median. In Kapitel 2 sind die Mediane aus nur zwei Siegen sehr verrauscht (z. B. Level 12: 156 s und 508 s), deshalb wurden die Rohwerte (145/180/125/265/125/230) isotonisch geglättet, sodass die Zielzeit im Kapitel nicht fällt (145/155/155/195/195/230). In Kapitel 3 gewinnt der Bot nur je einmal, meist durch einen frühen Schneeball; die Zielzeiten wurden daher aus dem Trend der Level 1–12 (≈ +12 s pro Level ab 230 s) extrapoliert: 240/250/265/280/290/300 s.

Nicht erreicht: nichts. Anmerkungen: Level 7–12 liegen alle bei genau 2/3, eine feinere Staffelung innerhalb des Kapitels ließ sich mit drei Läufen nicht belastbar messen (Änderungen von `prod` um ±0,04 kippten Ergebnisse in beide Richtungen). Level 18 wird 1/3 gewonnen (erlaubt: 0–1); der einzige Seed mit 0/9 war die entartete alte Karte.
