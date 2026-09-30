# Tiefenlicht – Gamedesign

Stand 2026-09-30: kompletter Neuanfang als möglichst genauer Nachbau von Tower War (SayGames), ohne eigene Extras.

## Kern

- Hochformat-Spielfeld (720 × 1280 Welteinheiten), im Querformat um 90° gedreht.
- Türme mit Soldatenzahl; Blau = Spieler, Rot = Gegner (ab Level 12 gelegentlich Gelb als zweiter Gegner), Grau = neutral.
- Produktion eigener Türme: 1 / 1,3 / 1,6 Soldaten pro Sekunde je Stufe, Wachstum bis 50, Verstärkung bis 99.
- Stufen nach Soldaten: ab 10 Stufe 2, ab 25 Stufe 3; Linien pro Stufe 1 / 2 / 3.
- Linie = gerade Verbindung zu beliebigem Turm ohne Mauer oder Turm dazwischen. Ein Soldat alle 0,5 s je Linie, solange Soldaten da sind.
- Treffen: fremder Turm −1, eigener Turm +1; unter 0 wechselt der Besitzer, seine Linien verschwinden.
- Gegenläufige Linien verschiedener Farben: Soldaten kämpfen 1:1.
- Kappen per Wischen; Rückweg für Soldaten vor dem Schnitt.
- Zurückziehen über die eigene Linie dreht sie um.

## Level

- Level 1–3 handgebaut (Tutorial-Hand, Hinweise zu Stufen und Kappen).
- Ab Level 4 generiert: punktsymmetrische Aufstellung, mehr Türme und stärkere Neutrale mit steigender Nummer, Mauern ab Level 6, schnellere KI.

## Bewusst weggelassen

Skills, Fähigkeiten, Energie, Gebäudetypen, Editor, Tages-Karte, Erfolge, Endlosmodus.
