# Tiefenlicht – Umsetzungsplan

Stand: 2026-09-13. Ziel: veröffentlichungsreifes Browser- und Mobile-Spiel (PWA) auf GitHub Pages, iPhone-tauglich über „Zum Home-Bildschirm“.

## Befund nach dem Lesen des Prototyps (`tiefenlicht.html`, 1 208 Zeilen)

Die Spielregeln sind vollständig in einer Datei und gut abgegrenzt (Daten → Hilfsfunktionen → Spielstand → Audio → Zustand → Graph → Kartengenerator → Level → Simulation → KI → Effekte → Rendering → HUD → Eingabe → Bildschirme → Ablauf). Drei Dinge müssen beim Refactoring bewusst angefasst werden, sonst ist die Simulation weder deterministisch noch DOM-frei:

1. **Bildschirmabhängige Simulation.** Kartengenerator, Abstände, Truppentempo und Wächterreichweite rechnen in Pixeln der aktuellen Fenstergröße (`W`, `H`, `S`, `R`). Dieselbe Seed erzeugt heute auf iPhone und Desktop unterschiedliche Karten, und Truppen sind pro Sekunde je nach Fenster unterschiedlich schnell (in Kantenlängen gerechnet gleich, aber Kollisionsradien und Wächterreichweite skalieren anders). Lösung: feste Weltkoordinaten (1280×800 Welteinheiten, `S = 1`), Renderer skaliert per Kamera. Karten werden damit auf allen Geräten identisch; Balance verschiebt sich minimal und wird im Harness gemessen.
2. **`Math.random()` in der Simulation.** KI-Timer, KI-Entscheidungen, Knotenpuls und Partikel nutzen `Math.random`. Lösung: seedbarer RNG (`mulberry32`) im Spielzustand; Effekte bekommen einen eigenen, nicht simulationsrelevanten RNG.
3. **Spielstand über `window.storage`** (Artefakt-API, im Browser nicht vorhanden – Fortschritt geht heute verloren). Lösung: `localStorage` mit Versionsfeld und Migration; Export/Import-Code bleibt.

Sonstiges: Endlos-Level, Skill-Effekte, Fähigkeiten, Sterne und Spielstand-Code sind sauber datengetrieben und lassen sich 1:1 übernehmen. Der Renderer (Canvas 2D) ist eng mit dem Zustand verflochten und wird in Phase 2 komplett ersetzt; bis dahin läuft er als „Legacy-Renderer“ weiter.

## Phase 0 – Projekt, Git, Deployment (erledigt 2026-09-13)

- Vite 8 + TypeScript 7 (strict), ESLint 10 (flat config, typescript-eslint), Prettier, Vitest 5, Playwright 1.63.
- Verzeichnisse: `src/sim`, `src/ai`, `src/render`, `src/ui`, `src/audio`, `src/data`, `src/app`, `public/`, `tests/`, `scripts/`, `e2e/`.
- Der Prototyp läuft in Phase 0 unverändert als `src/legacy/prototype.js` weiter (nur der Spielstand geht schon über das neue `src/app/storage.ts`), damit der erste Commit lauffähig ist und Phase 1 gegen ein funktionierendes Spiel refaktorieren kann.
- PWA: `vite-plugin-pwa` (Service Worker mit Precache, Offline-Fallback), Manifest `display: fullscreen`, `orientation: landscape`, Icons 48–1024 px plus `apple-touch-icon` und maskable, generiert aus `public/logo.svg` per Playwright (kein Fremd-Asset). `apple-mobile-web-app-*`-Metatags, `viewport-fit=cover`, Safe-Area-Insets, `touch-action: manipulation` gegen Doppeltipp-Zoom, Fullscreen-API mit `screen.orientation.lock('landscape')`.
- Spielstand: `localStorage` mit `version`-Feld, Migrationskette, Export/Import-Code (Base64-JSON, kompatibel zum Prototyp).
- Git: `git init`, `.gitignore`, erster Commit. GitHub-Repository `tiefenlicht`, Workflow `.github/workflows/deploy.yml` (Lint, Tests, Build, Pages-Deploy bei Push auf `main`), Vite `base: '/tiefenlicht/'`.
- **Offen:** `gh` ist auf diesem Rechner nicht installiert. Repository-Anlage und Push brauchen `gh auth login` (Anleitung im Bericht).

## Phase 1 – Refactoring ohne Verhaltensänderung (erledigt 2026-09-13)

Umgesetzt wie unten; Weltgröße 1600 × 800 (2:1, passt zu Handy-Querformat). Auf Wunsch geändert: Ziehen schickt sofort den Anteil und legt die Route an; Routen leiten 40 % der Produktion als Strom weiter (voller Knoten: alles). Zielzeiten sind dadurch noch nicht neu abgestimmt (siehe `BALANCE.md`); das gehört in Phase 4.

- `src/sim`: `state.ts` (Typen), `rng.ts`, `graph.ts` (BFS, Zusammenhang, Hop-Distanzen), `mapgen.ts`, `level.ts` (Aufbau), `combat.ts`, `routes.ts`, `abilities.ts`, `update.ts` (ein `step(state, dt)`), `events.ts` (Sim emittiert Ereignisse wie `capture`, `clash`, `zap`; Audio, Partikel und Tipps hängen sich daran, nicht umgekehrt).
- `src/ai/bot.ts`: die Gegner-KI aus `aiAct` mit injiziertem RNG; identische Heuristik.
- `src/data`: Knotenarten, Truppen, Fraktionen, Fähigkeiten, Skills, Kapitel, Kampagne, Endlos-Formel, Schwierigkeiten.
- `src/app`: Screens/Zustandsautomat (Menü, Kampagne, Skills, Einstellungen, Intro, Spiel, Pause, Sieg, Niederlage), Perks, Spielstand.
- `src/render/canvas2d`: der bisherige Renderer, entkoppelt (liest State, schreibt nichts).
- Tests (Vitest): Kampfrechnung (Eroberung, Restwert, Verteidigungsfaktor, Schild), Routenfluss (Reserve, Aufteilung auf 1–3 Routen, Rundung), Kartengenerator (Zusammenhang, Mindestabstand, Hop-Distanz der Startknoten, Startknoten mit ≥ 2 Kanten, Determinismus pro Seed), KI (Verstärkung bedrohter Knoten, Angriffswahl), Spielstand-Migration (v0 → v1, Export/Import-Roundtrip), Determinismus (zwei Läufe gleicher Seed → identischer Zustand).
- Balance-Harness: `npm run balance` spielt alle 18 Level plus Endlos 1–6 mit einem Heuristik-Bot (spielt die Spielerseite mit derselben KI plus Routen-Nutzung) bei Tempo ohne Rendering durch; Ausgabe `BALANCE.md` (Level, Ausgang, Zeit, Sterne, Knotenanteil nach 60 s). Dient als Regressionsreferenz für alle späteren Phasen.

## Phase 2 – Grafik auf Studio-Niveau

- PixiJS 8 (WebGL, Canvas-Fallback), Bloom über `pixi-filters`, Kamera (Zoom/Pan mit Pinch und Wheel, Grenzen, sanftes Nachführen).
- Spritesheets zur Laufzeit aus Canvas/SVG generiert: sechs Knotenarten × drei Stufen × Frames (Atmen, Geschützrotation, Brutkapseln, Wirbel); Besitzerfarbe über Tint-Maske (Graustufen-Layer + Farb-Layer). Animationen für Eroberung, Ausbau, Frost, Schild.
- Truppen: Silhouetten je Typ, Boids-light (Trennung, Ausrichtung entlang Kante), Spuren, Aufprall, Wächter-Blitze mit Verästelung.
- Welt: Parallaxe (Plankton, Lichtsäulen, Kaustik-Shader), Felsen mit Tiefe, Korallen/Pflanzen am Rand.
- UI: SVG-Icon-Set, neue HUD, radiales Knotenmenü, Sendeleiste, Fähigkeiten-Leiste, Levelkarte als Pfad, Skill-Baum mit Linien, Übergänge.
- Grafikstufen niedrig/mittel/hoch, `prefers-reduced-motion`, 60 fps-Ziel mit Frame-Budget-Messung.

## Phase 3 – Audio

- Adaptive Musik aus prozeduralen WebAudio-Layern (Drone, Puls, Kampf-Layer, Sieg-Motiv), Übergänge nach Bedrohungsgrad. SFX pro Ereignis mit Stereo-Panning nach Position, getrennte Lautstärkeregler, Vibration API für Eroberung/Verlust.

## Phase 4 – Inhalt und Systeme

- Karten-Editor (Knoten, Kanten, Felsen, Start, Typen, JSON-Export), handgebaute Kampagnenkarten, Vorstellungstexte, Sonderziele, Kapitel-Intros.
- Erfolge, Statistiken, Bestzeiten, Tages-Herausforderung (Datums-Seed).
- Tutorial mit Hinweispfeilen in den ersten Leveln.

## Phase 5 – Feinschliff und Release

- Lighthouse > 90 (PWA, Performance, Barrierefreiheit), iOS-Safari- und Android-Chrome-Test, README mit Installationsfluss, Fehleranzeige über `window.onerror`, Versionsnummer, Changelog.

## Definition of Done pro Phase

Build, Lint und Tests grün; Balance-Harness ohne Regression; Deployment erreichbar; Screenshots (Playwright, 1280×800 und 390×844) geprüft; Bericht mit Änderungen und nächstem Schritt.
