# Prompt für Claude Code – Tiefenlicht

Kopiere ab der nächsten Zeile alles in Claude Code.

---

Du bist mein Lead-Entwickler und Technical Artist für **Tiefenlicht**, ein Echtzeit-Strategiespiel im Stil von Mushroom Wars 2 / Galcon / Bug War: leuchtende Knoten in der Tiefsee, die man über Verbindungen erobert. Ziel ist ein **fertiges, veröffentlichungsreifes Browser- und Mobile-Spiel (PWA)**, das sich mit einem Studio-Titel messen kann. Wir arbeiten in diesem Ordner in VS Code, versionieren mit Git und veröffentlichen auf GitHub Pages, damit ich es auf dem iPhone über Safari zum Home-Bildschirm hinzufügen kann.

## Ausgangslage

Im Ordner liegt `tiefenlicht.html`: ein lauffähiger Prototyp in einer Datei (Canvas 2D, ~1.200 Zeilen, deutschsprachige UI). Lies ihn zuerst vollständig. Er enthält bereits die Spielregeln, die erhalten bleiben müssen:

- Knoten sind über Kanten verbunden (Graph, Gabriel-Graph mit Ausdünnung), Felsen blockieren Verbindungen. Karten werden deterministisch aus Seeds erzeugt.
- Sechs Knotenarten mit je drei Ausbaustufen und eigenen Truppentypen: Nest (Sporen), Brutnest (Drohnen: schnell, schwach), Bastion (Panzer: stark, langsam; doppelte Verteidigung), Strömung (Pfeile; verdoppelt Tempo), Wächter (Stachel; Turm mit Reichweite und Feuerrate), Quelle (Lichtkugeln; verstärkt Nachbarn).
- Senden per Ziehen über beliebig viele Knoten (kürzester Pfad wird automatisch ergänzt). Standard: 50 % der verfügbaren Einheiten; Sendeleiste 25/50/75/100 % oder Dauerroute. Dauerrouten (max. drei pro Knoten) leiten den Überschuss über einer einstellbaren Reserve dauerhaft weiter und teilen ihn auf.
- Kampf: Angriffsstärke (Anzahl × Truppenstärke) gegen Einheiten × Verteidigung des Knotens; Rest wechselt die Seite. Kolonnen, die sich auf einer Kante begegnen, kämpfen.
- Ausbau (Stufe 1–3) und Umbau in andere Knotenarten kosten Einheiten. Die KI baut ebenfalls aus, verstärkt bedrohte Knoten, wählt Ziele über mehrere Stationen.
- Energie entsteht aus gefallenen Einheiten; Fähigkeiten: Lichtstoß, Frostwelle, Schild.
- Kampagne: 18 Level in drei Kapiteln mit Sternen nach Zielzeit, Endlosmodus, Skill-Baum (vier Zweige, 15 Skills), Schwierigkeitsgrade, synthetischer Sound, Spielstand-Code.

Diese Mechanik ist die Basis. Erhalte sie beim Refactoring 1:1 und ändere Balance nur begründet und messbar.

## Arbeitsweise

1. Erstelle zuerst `PLAN.md` mit den Phasen unten, konkretisiert nach dem Lesen des Codes, und lass mich den Plan kurz absegnen. Danach arbeitest du Phase für Phase eigenständig.
2. Nach jeder Phase: Build und Tests grün, `git commit` mit aussagekräftiger Nachricht, Deployment auf GitHub Pages, kurzer Bericht mit dem Link und Screenshots (Playwright, Desktop 1280×800 und Mobil 390×844). Frag nur bei echten Entscheidungen, nicht bei Kleinigkeiten.
3. Jeder Commit muss lauffähig sein. Nichts halbfertig liegen lassen.
4. Prüfe deine Arbeit selbst: Unit-Tests für die Simulation, ein Headless-Balance-Test, der jedes Kampagnenlevel mit einem Heuristik-Bot durchspielt, und visuelle Prüfung der Screenshots. Bei Rendering-Änderungen vergleichst du Vorher/Nachher-Screenshots.
5. Sprache: UI und Texte Deutsch, Code und Commits Englisch.
6. Assets: nichts Fremdes, nichts aus anderen Spielen. Alles selbst erzeugt (prozedural, SVG, Canvas-generierte Spritesheets) oder eindeutig CC0-lizenziert mit Quellenangabe in `CREDITS.md`. Schriften nur mit offener Lizenz (z. B. über Fontsource), lokal gebündelt.

## Phase 0 – Projekt, Git, Deployment

- Vite + TypeScript, ESLint + Prettier, Vitest, Playwright. Struktur: `src/sim` (reine Spiellogik, ohne DOM), `src/ai`, `src/render`, `src/ui`, `src/audio`, `src/data` (Level, Typen, Skills), `src/app` (Screens, Zustand, Speicherstand), `public/` (Manifest, Icons).
- PWA: Web-App-Manifest mit `display: fullscreen`, `orientation: landscape`, Icons in allen Größen (generiere sie aus einem SVG-Logo), Service Worker für Offline-Betrieb, `apple-mobile-web-app-*`-Metatags, Safe-Area-Insets, kein Doppeltipp-Zoom, Fullscreen-API mit Querformat-Sperre.
- Speicherstand in `localStorage` (mit Versionierung und Migration) plus Export/Import-Code.
- Git: `git init`, sinnvolle `.gitignore`, erster Commit. Prüfe `gh auth status`; wenn nicht angemeldet, sag mir genau, was ich ausführen soll (`gh auth login`). Lege dann das Repository `tiefenlicht` auf GitHub an, pushe, richte einen GitHub-Actions-Workflow ein, der bei jedem Push auf `main` baut und auf GitHub Pages veröffentlicht (Vite `base` korrekt setzen). Gib mir die fertige URL.

## Phase 1 – Refactoring ohne Verhaltensänderung

- Zerlege die Monolith-Datei in Module. Die Simulation muss deterministisch und ohne DOM laufen (seedbarer Zufall), damit Tests und Balance-Läufe möglich sind.
- Tests: Kampfrechnung, Routenfluss und Aufteilung, Kartengenerator (Zusammenhang, Mindestabstände, Hop-Distanzen, Startbedingungen), KI-Entscheidungen, Speicherstand-Migration.
- Balance-Harness: `npm run balance` spielt alle Level mit dem Bot durch und schreibt eine Tabelle (Ausgang, Zeit, Sterne). Ergebnis in `BALANCE.md`.

## Phase 2 – Grafik auf Studio-Niveau

Art Direction: bioluminiszente Tiefsee, dunkel und atmosphärisch, warmes Gold für den Spieler, kalte Farben für Gegner, hoher Kontrast für Lesbarkeit. Referenzen als Stimmung, nicht zum Kopieren: Auralux (Klarheit), Eufloria (Organik), Mushroom Wars 2 (Lesbarkeit der Gebäude).

- Renderer: PixiJS v8 (WebGL, Fallback Canvas) mit Bloom/Glow-Filtern, Spritebatching, Kamera mit Zoom und Pan für größere Karten.
- Türme: pro Knotenart und Stufe echte Sprites mit Animation (Atmen, rotierende Geschütze, Brutkapseln, Strömungswirbel), gerendert als generierte Spritesheets aus SVG/Canvas; Besitzerfarbe per Tint-Maske; Eroberungs-, Ausbau-, Frost- und Schildanimationen.
- Truppen: eigene Silhouetten je Typ, Schwarmverhalten (Boids light), Spuren, Aufprall-Effekte, Wächter-Blitze mit Ästen.
- Welt: Parallaxe in mehreren Tiefenebenen (Plankton, Lichtsäulen, Kaustik als Shader), Felsformationen mit Tiefe, Pflanzen und Korallen am Kartenrand, Nebel in unerkundeten Bereichen optional.
- UI: eigenes Icon-Set (SVG), neu gestaltete HUD, Knotenmenü als radiales Menü am Knoten, Sendeleiste, Fähigkeiten-Leiste, Levelkarte als Kartenansicht mit Pfad zwischen den Leveln, Skill-Baum mit Verbindungslinien, Übergänge und Mikroanimationen.
- Performance-Ziel: stabile 60 fps auf einem Mittelklasse-Smartphone, Grafikstufen (niedrig/mittel/hoch), Reduced-Motion respektieren.

## Phase 3 – Audio

- Adaptive Musik aus geschichteten Loops (ruhig → Kampf → Sieg), entweder prozedural per WebAudio oder CC0. SFX für alle Aktionen, räumlich leicht gepannt, Lautstärkeregler für Musik und Effekte, Haptik auf Mobilgeräten (Vibration API) für Eroberung und Verlust.

## Phase 4 – Inhalt und Systeme

- Karten-Editor (Knoten setzen, Kanten, Felsen, Start, Typen; JSON-Export) und damit handgebaute Kampagnenkarten statt reiner Seeds. Jedes Level mit Vorstellungstext, optionalem Sonderziel (z. B. Knoten X 60 s halten) und Kurzintro pro Kapitel.
- Erfolge, Statistiken, Levelwiederholung mit Bestzeiten, Tages-Herausforderung mit Datums-Seed.
- Tutorial als geführte erste Level mit Hinweispfeilen.

## Phase 5 – Feinschliff und Release

- Lighthouse (PWA, Performance, Barrierefreiheit) über 90, iOS-Safari- und Android-Chrome-Test, Installationsfluss dokumentiert in `README.md` (Screenshots, „Zum Home-Bildschirm"), Fehlerberichte per `window.onerror` in eine Anzeige, Versionsnummer im Menü, Changelog.

## Definition of Done pro Phase

Build und Tests grün, Balance-Harness ohne Regression, Deployment erreichbar, Screenshots geprüft, Bericht an mich mit dem, was sich geändert hat, und was als Nächstes kommt.

Beginne jetzt: Lies `tiefenlicht.html`, erstelle `PLAN.md`, und starte mit Phase 0.
