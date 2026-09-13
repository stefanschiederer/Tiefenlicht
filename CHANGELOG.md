# Changelog

## 0.3.0 – Gamedesign-Paket (2026-09-13)

- Angriffsvorschau beim Ziehen: Einheiten, Verteidigung des Ziels und ✓/✗, grün oder rot.
- Mehrfachauswahl: eigene Knoten antippen sammelt sie, Doppeltipp wählt alle; Ziehen schickt von allen über ihre kürzesten Wege und legt Routen an.
- Kapitulation: Ein Gegner mit nur noch einem Knoten gibt nach 10 s auf, wenn der Spieler mindestens 60 % der Knoten hält. Kein zähes Aufräumen mehr.
- Bestzeiten pro Level (Spielstand v2), „Neue Bestzeit!“ im Siegbildschirm, Bestzeit in der Levelliste.
- Haptik bei Eroberung, Verlust, Sieg und Niederlage (Android).
- Knotenmenü ist rechts angedockt statt neben dem Knoten, damit es keine Nachbarknoten verdeckt.
- Schwierigkeitskurve der Kampagne neu abgestimmt (siehe `BALANCE.md`).
- Designbefund in `GAMEDESIGN.md`.
- Handy im Querformat: kompakte einzeilige HUD, das Spielfeld wird darunter eingepasst; Sende- und Fähigkeitenleiste sind außer ihren Buttons berührungsdurchlässig. Kein Knoten liegt mehr unter Anzeigen.

## 0.2.1 (2026-09-13)

- Routen löschen per Wisch-Geste: quer über eine Route wischen kappt sie (zusätzlich zum Knotenmenü und Rechtsklick).
- Routen-Nachschub kommt in Paketen von mindestens drei Einheiten statt als einzelne Nachzügler.
- Updates werden automatisch übernommen, kein „Neu laden“-Hinweis mehr nötig.

## 0.2.0 – Phase 1 (2026-09-13)

- Prototyp in Module zerlegt: `src/data` (Spieldaten), `src/sim` (Simulation ohne DOM), `src/ai` (Gegner-KI, Spieler-Bot), `src/render/canvas2d`, `src/ui`, `src/app`, `src/audio`.
- Simulation deterministisch: feste Weltkoordinaten 1600 × 800 (Karten sind auf allen Geräten identisch), seedbarer Zufall auch für die KI.
- Routen senden jetzt einen langsamen Strom: 40 % der Produktion (60 % mit „Stetiger Fluss“), ein voller Knoten schickt alles weiter. Der Knoten wächst also weiter und kann ausgebaut werden. Ziehen schickt weiterhin sofort den eingestellten Anteil.
- Unit-Tests für Zufall, Graph, Kartengenerator, Kampf, Routen, KI, Determinismus, Perks und Spielstand.
- Balance-Harness `npm run balance` mit Bericht in `BALANCE.md`.
- Versionsnummer im Hauptmenü.
- Handy: Die Level- und Energieanzeige oben links fängt keine Berührungen mehr ab, Ziehen funktioniert auch darunter.

## 0.1.1 (2026-09-13)

- Senden neu: Jede gezogene Verbindung schickt sofort den eingestellten Anteil (Standard 50 %) und bleibt als Dauerroute bestehen. Erneutes Ziehen schickt wieder den Anteil. Der separate Modus „Dauerroute“ entfällt.

## 0.1.0 – Phase 0 (2026-09-13)

- Projekt auf Vite + TypeScript umgestellt; ESLint, Prettier, Vitest und Playwright eingerichtet.
- Prototyp läuft unverändert als Legacy-Modul weiter.
- PWA: Manifest (Vollbild, Querformat), Icons aus eigenem SVG-Logo, Service Worker mit Offline-Cache und Update-Hinweis.
- Spielstand jetzt in `localStorage` mit Versionierung und Migration; Export/Import-Code bleibt kompatibel.
- Fehleranzeige im Spiel bei unbehandelten Fehlern.
- GitHub-Actions-Workflow für GitHub Pages.
