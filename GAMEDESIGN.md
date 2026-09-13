# Tiefenlicht – Gamedesign-Befund und Maßnahmen

Stand: 2026-09-13. Vergleichsmaßstab: Mushroom Wars 2, Galcon 2, Auralux, State.io, Tentacle Wars, Eufloria.

## Was das Spiel heute gut macht

- Klare Regel: Zahl × Stärke gegen Zahl × Verteidigung. Jeder versteht sofort, warum ein Angriff scheitert.
- Sechs Knotenarten mit eigenen Truppen geben echte Entscheidungen (Wächter an Kreuzungen, Strömung als Autobahn, Quelle als Wirtschaft).
- Kurze Runden mit Zielzeit und Sternen. Das ist der richtige Rahmen für Mobile.
- Mehrere Gegner, die sich gegenseitig bekämpfen, erzeugen Dynamik ohne Skript.

## Was zwingend besser werden muss

Nach Wichtigkeit sortiert. „Sofort“ = in diesem Schritt umgesetzt, „Phase“ = eingeplant.

1. **Schwierigkeitskurve (sofort, laufend messbar).** Der Balance-Harness zeigt keine Kurve, sondern Zufall: Level 4, 6, 8, 10 sind für den Bot unschaffbar, Level 7, 11, 16 dagegen leicht. Süchtig macht ein Spiel nur, wenn jede Niederlage knapp und jede nächste Stufe erreichbar wirkt („noch ein Versuch“). Maßnahme: Startbesatzung, Gegnerproduktion, KI-Tempo und Kartenseed pro Level so einstellen, dass der Bot die ersten sechs Level sicher gewinnt, die mittleren in etwa der Hälfte der Läufe und die letzten selten. Zielzeiten aus den gemessenen Bot-Zeiten ableiten (drei Sterne ≈ 0,7 × Bot-Median).
2. **Angriffsvorschau beim Ziehen (sofort).** Beste Spiele des Genres zeigen vor dem Loslassen, ob ein Angriff gelingt. Beim Ziehen steht am Zeiger: gesendete Einheiten, Verteidigung des Ziels, Haken oder Kreuz. Das nimmt Frust aus Fehlangriffen und macht das Rechnen zum Spielgefühl.
3. **Mehrfachauswahl (sofort).** Galcon und Mushroom Wars leben davon, aus mehreren Knoten gleichzeitig zu schicken. Tippen auf eigene Knoten sammelt eine Auswahl, Ziehen von einem gewählten Knoten sendet von allen über ihre jeweils kürzesten Wege. Doppeltipp auf einen eigenen Knoten wählt alle eigenen Knoten.
4. **Kein zähes Aufräumen (sofort).** Wenn ein Gegner nur noch einen Knoten hält und der Spieler klar dominiert, kapituliert er nach kurzer Frist. Das letzte Drittel eines gewonnenen Levels ist heute reines Abklappern.
5. **Bestzeiten und „Neuer Rekord“ (sofort).** Pro Level wird die beste Zeit gespeichert und im Siegbildschirm hervorgehoben. Sterne allein reichen nicht; der eigene Rekord ist der stärkste Wiederholungsanreiz.
6. **Haptik (sofort).** Vibration bei Eroberung und Verlust auf Android; iOS-Safari unterstützt die Vibration-API nicht, dort bleibt es beim Ton.
7. **Grafik und Juice (Phase 2).** Eroberungen, Aufprall, Blitze und Bloom müssen sich befriedigend anfühlen. Kamera mit Zoom löst das Problem kleiner Knoten auf dem Handy.
8. **Adaptive Musik und Sounddesign (Phase 3).** Bedrohung hörbar machen, Sieg als Motiv.
9. **Handgebaute Karten mit Dramaturgie (Phase 4).** Zufallskarten sind für Endlos gut, die Kampagne braucht Karten mit Engstellen, Namen und Sonderzielen. Dazu Tutorial, Tages-Herausforderung mit Datums-Seed und Streak, Erfolge, Statistiken.
10. **Onboarding (Phase 4).** Erste drei Level als geführtes Tutorial mit Hinweispfeilen, jedes neue System bekommt ein eigenes Level.

## Leitbild: Tower War (SayGames)

Vom Spieler als Referenz gewünscht. Was Tower War richtig macht und wie Tiefenlicht es übernimmt:

- **Linien statt Befehle.** Verbindungen sind sichtbare, dauerhafte Ströme; man denkt in Versorgungslinien. Tiefenlicht: Ziehen legt eine Route an, Routen sind sichtbar, Wischen kappt sie.
- **Kontinuierlicher Strom.** Truppen laufen als Kette, nicht als Salven. Tiefenlicht: Routen liefern einen stetigen Strom (Paketgröße 1, Darstellung als Kette kleiner Einheiten).
- **Sichtbare Angriffslinien des Gegners.** Man sieht, woher der Druck kommt, und kann gegenhalten. Tiefenlicht: umgesetzt, die KI führt ihren Angriff als sichtbare Versorgungslinie (ab Level 3).
- **Kurze, dichte Level** mit wenigen Türmen und klarer Lösung. Tiefenlicht: Handkarten-Format und Editor vorhanden, Level 1 und 7 handgebaut; weitere Level können nach und nach aus dem Editor übernommen werden. Kampagne 18 Level, Endlos, Tages-Herausforderung.
- **Linien pro Turmstufe und Hindernisse.** Tower War gibt mit höherer Stufe mehr Linien und stellt Barrieren, Minen und Sperren in den Weg. Tiefenlicht: 1/2/3 Routen je Ausbaustufe, Riffbarrieren und Minen ab Kapitel 2, Felsen als feste Sperren.
- **Typspezifischer Ausbau.** Brutnest → Produktion, Bastion → Verteidigung, Wächter → Reichweite/Feuerrate, Strömung → Tempo, Quelle → Verstärkung, Nest → Vorrat und Routen.
- **Ausbau als sichtbarer Sprung** (Turm wächst). Tiefenlicht: Ausbaustufen mit Ringen und größerem Sprite; Umbau in andere Arten als zusätzliche Tiefe, die Tower War nicht hat.

## Stand 2026-09-14: Lagune und Linien

Auf Wunsch des Besitzers komplett auf Tower War umgestellt: Linien statt Sende-Anteile, fester Strom, Kappen per Wischen, Gegner mit Linien. Art Direction „Sonnige Lagune“ (siehe Design-Canvas): helles Wasser, Korallen und Muscheln als Gebäude, Meerestiere als Truppen. Skill-Baum auf 32 Fähigkeiten erweitert.

## Regeln, die bewusst bleiben

- Eine Linie ist die Verbindung; Einheiten strömen mit fester Rate (1,6/s je Linie), Produktion läuft weiter. Linien pro Gebäude: 1/2/3 nach Stufe.
- Linien kappt man mit einer Wisch-Geste quer über die Linie, alternativ im Gebäudemenü.
- Ausbau (typspezifisch), Umbau, Energie und Fähigkeiten bleiben.

## Messbarkeit

Jede Balance-Änderung wird mit `npm run balance` geprüft (`BALANCE.md`). Ziel-Kurve für den Bot auf „Normal“: Level 1–6 ≥ 90 % Siege, Level 7–12 40–70 %, Level 13–18 10–40 %; Endlos ab Welle 5 unter 30 %.
