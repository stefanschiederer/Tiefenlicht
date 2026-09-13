# Changelog

## 0.9.0 – Sonnige Lagune und Tower-War-Steuerung (2026-09-14)

- Steuerung exakt wie Tower War: Eine gezogene Linie ist die Verbindung, Einheiten strömen mit fester Rate hinüber, bis die Linie gekappt wird. Keine Anteile (25/50/75/Alle), keine Sofortsendung, keine Mehrfachauswahl, keine Reserve. Gegner ziehen ebenfalls Linien.
- Neue Art Direction „Sonnige Lagune“: helles türkises Wasser mit Sonnenstrahlen, Sandboden mit bunten Korallen, Seetang und Schwämmen, dunkle Zahlen auf hellem Grund, helle Glas-Oberfläche mit den Schriften Baloo 2 und Nunito (lokal gebündelt, OFL).
- Sechs neue Gebäude: Korallen-Nest, Quallen-Kolonie, Muschel-Festung, Strudel-Turbine, Leuchtturm-Wächter, Riesenmuschel-Quelle; Besitzerfarbe auf Ring, Kuppel und Licht, Ausbau fügt sichtbar Teile hinzu.
- Truppen als Meerestiere: Fisch, Qualle, Panzerkrebs, Manta, Kugelfisch, Perle.
- Fraktionsfarben: Gold, Koralle, Alge, Tinte; Neutral Perlmutt.
- Neues Hauptmenü: großer „Weiter spielen“-Knopf, Kacheln für Kampagne, Tages-Karte, Endlos und Fähigkeiten, kleine Leiste für Erfolge, Einstellungen, Anleitung, Editor, Vollbild.
- Skill-Baum auf 32 Fähigkeiten in vier Zweigen erweitert (Brut: Wirtschaft, Sturm: Angriff und Strom, Fels: Verteidigung, Licht: Fähigkeiten) mit neuen Effekten: stärkerer Strom, zusätzliche Linie, Startgebäude Stufe 2, Riffbrecher, Minentaucher, schnelleres Turmfeuer, längere Fähigkeiten, Energieregeneration, schnellere Kapitulation.
- Kampagnen-Karte als heller Inselpfad: große Bojen (60 px) als Level, gemeisterter Weg in Gold, Kapitel als Buchten, Namen und Sterne neben den Bojen, Tippfläche ohne Überlagerung.

## 0.8.1 – Phase 5: Feinschliff (2026-09-14)

- Lighthouse: Best Practices 100, SEO 91, Barrierefreiheit-Korrekturen (Viewport erlaubt Zoom wieder, Pinch bleibt auf dem Spielfeld; `robots.txt`).
- README mit Screenshots, Spielprinzip, Steuerung und Installationsanleitung; Plan und Designdokument auf Stand.

## 0.8.0 – Phase 4c: Erfolge, Statistik, Tages-Herausforderung, Tutorial (2026-09-14)

- 16 Erfolge (Eroberungen, Kapitel, Sterne, makelloser Sieg, Sonderziel, gekappte Routen, Endlos, Tages-Serie) mit Freischalt-Hinweis im Siegbildschirm und eigener Übersicht mit Statistik (Level, Siege, Eroberungen, Verluste, Spielzeit).
- Tages-Herausforderung: jeden Tag eine Karte aus dem Datums-Seed, gleich für alle; Serie (Streak), Bestzeit, ein Fähigkeitspunkt pro Tag.
- Tutorial im ersten Level: animierter Pfeil zum ersten Ziel, danach Hinweis auf Ausbau.

## 0.7.0 – Phase 4: Hindernisse, handgebaute Karten, Sonderziele (2026-09-14)

- Handgebaute Karten: Level 1 „Erstes Leuchten“ (sanfter Einstieg) und Level 7 „Wachtposten“ (zwei Gassen mit neutralen Wächtern, Bastion in der Mitte, Barrieren vor den Gegnern) sind jetzt von Hand gebaut. Datenformat `HandMap` für den Editor.
- Sonderziele: Level 7 „Halte die Bastion 45 Sekunden“, Level 8 „Halte eine Quelle 60 Sekunden“ gewinnen das Level vorzeitig; Fortschritt in der HUD.
- Kapitel-Intros: erzählender Einstieg vor dem ersten Level jedes Kapitels.
- Karten-Editor im Hauptmenü: Knoten setzen und verschieben, Kanten ziehen, Felsen, Barrieren, Minen, Besitzer, Art, Einheiten, Löschen; JSON-Export und -Import, Entwurf bleibt gespeichert, Probespiel direkt aus dem Editor.

- Riffbarrieren auf Verbindungen (ab Level 10): Truppen verbrauchen sich beim Durchbrechen, erst dann kommt der Rest hindurch; Lebensbalken über der Barriere, gilt für alle Fraktionen.
- Minen auf Verbindungen (ab Level 11): zerstören bis zu 8 Einheiten des ersten Schwarms, dann verbraucht.
- Kampagne ab Kapitel 2 und Endlos-Wellen enthalten deterministisch gesetzte Barrieren und Minen; Einführungstexte in Level 10 und 11, Anleitung ergänzt.
- Balance nachgezogen (`BALANCE.md`).

## 0.6.0 – Phase 3: Audio (2026-09-13)

- Adaptive Musik, komplett prozedural (WebAudio): Tiefsee-Drone, atmender Pad-Akkord, Kampf-Puls und Spannungs-Schimmer werden je nach Bedrohung ein- und ausgeblendet; Sieg- und Niederlagen-Motiv am Levelende.
- Effekte werden nach Position im Stereobild gepannt.
- Einstellungen: getrennte Regler für Musik und Effekte, Schalter für Vibration.

## 0.4.0 – Phase 2, Schritt 1: neuer Renderer (2026-09-13)

- PixiJS-8-Renderer (WebGL, automatischer Canvas-Fallback): generierte Sprites je Knotenart mit rotierenden Details und Atmen, additive Glows mit Bloom (Stufe „Hoch“), Truppen als Sprites, Partikel, verästelte Wächter-Blitze, Lichtsäulen und treibendes Plankton mit Parallaxe, Felsen mit Tiefe.
- Kamera: Zoom per Mausrad, Pinch-Zoom und Zwei-Finger-Verschieben auf Touch, mittlere Maustaste zum Verschieben.
- Grafikstufe in den Einstellungen (Auto, Hoch, Mittel, Niedrig = Canvas 2D); `prefers-reduced-motion` wird respektiert. Frame-Budget: Bleibt „Hoch“ zwei Sekunden lang über 28 ms pro Bild, schaltet das Spiel selbst auf „Mittel“ und sagt Bescheid.
- Routen als durchgehender Strom einzelner Einheiten (Tower-War-Prinzip) statt Dreierpaketen; Balance geprüft, Kurve hält.
- Randflora (Seetang, Fächerkorallen, Röhrenschwämme) prozedural am Kartenrand, Kaustik-Shader im Hintergrund (Stufe „Hoch“, WebGL), Leuchtspuren hinter Schwärmen, Puls bei Eroberung.
- Handy: Knoten und Truppen werden auf kleinen Bildschirmen 45 % größer dargestellt, Hinweise erscheinen oben statt über der Karte.
- Balance: Kampagnen-Seeds, Gegnerproduktion und Zielzeiten neu abgestimmt zu einer aufsteigenden Kurve (`BALANCE.md`).

## 0.3.0 – Gamedesign-Paket (2026-09-13)

- Angriffsvorschau beim Ziehen: Einheiten, Verteidigung des Ziels und ✓/✗, grün oder rot.
- Mehrfachauswahl: eigene Knoten antippen sammelt sie, Doppeltipp wählt alle; Ziehen schickt von allen über ihre kürzesten Wege und legt Routen an.
- Kapitulation: Ein Gegner mit nur noch einem Knoten gibt nach 10 s auf, wenn der Spieler mindestens 60 % der Knoten hält. Kein zähes Aufräumen mehr.
- Bestzeiten pro Level (Spielstand v2), „Neue Bestzeit!“ im Siegbildschirm, Bestzeit in der Levelliste.
- Haptik bei Eroberung, Verlust, Sieg und Niederlage (Android).
- Knotenmenü ist rechts angedockt statt neben dem Knoten, damit es keine Nachbarknoten verdeckt.
- Schwierigkeitskurve der Kampagne neu abgestimmt (siehe `BALANCE.md`).
- Designbefund in `GAMEDESIGN.md`.
- Wisch-Geste zum Kappen darf auch auf fremden Knoten beginnen und trifft fingerbreit; blockierte Verbindungen (Felsen) werden als unterbrochene rote Linien angedeutet.
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
