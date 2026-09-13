# Changelog

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
