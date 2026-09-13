# Changelog

## 0.1.1 (2026-09-13)

- Senden neu: Jede gezogene Verbindung schickt sofort den eingestellten Anteil (Standard 50 %) und bleibt als Dauerroute bestehen. Erneutes Ziehen schickt wieder den Anteil. Der separate Modus „Dauerroute“ entfällt.

## 0.1.0 – Phase 0 (2026-09-13)

- Projekt auf Vite + TypeScript umgestellt; ESLint, Prettier, Vitest und Playwright eingerichtet.
- Prototyp läuft unverändert als Legacy-Modul weiter.
- PWA: Manifest (Vollbild, Querformat), Icons aus eigenem SVG-Logo, Service Worker mit Offline-Cache und Update-Hinweis.
- Spielstand jetzt in `localStorage` mit Versionierung und Migration; Export/Import-Code bleibt kompatibel.
- Fehleranzeige im Spiel bei unbehandelten Fehlern.
- GitHub-Actions-Workflow für GitHub Pages.
