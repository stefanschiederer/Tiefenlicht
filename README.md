# Tiefenlicht

Echtzeit-Strategie um leuchtende Knoten in der Tiefsee. Browser- und Mobile-Spiel als PWA.

## Entwicklung

```sh
npm install
npm run dev        # Entwicklungsserver
npm run check      # Lint, Unit-Tests, Build
npm run e2e        # Playwright (Desktop 1280×800, Mobil 390×844 quer)
npm run screenshots
npm run icons      # Icons aus public/logo.svg neu erzeugen
```

```sh
npm run balance    # spielt alle Level headless mit dem Bot durch, schreibt BALANCE.md
```

Struktur:

- `src/data` – Knotenarten, Truppen, Fraktionen, Fähigkeiten, Skills, Kampagne, Regeln (Weltgröße 1600 × 800).
- `src/sim` – reine Simulation ohne DOM: RNG, Graph, Kartengenerator, Levelaufbau, Aktionen, `step()`; gibt Ereignisse aus.
- `src/ai` – Gegner-KI (`bot.ts`) und Heuristik-Bot für den Balance-Harness (`playerBot.ts`).
- `src/render/canvas2d` – Renderer (liest den Zustand, hält nur visuelle Effekte), `src/render/view.ts` bildet Welt auf Bildschirm ab.
- `src/ui` – HUD, Knotenmenü, Bildschirme. `src/app` – Spielsitzung, Eingabe, Spielstand, PWA.
- `src/audio` – synthetische Sounds. `tests/` – Vitest. `e2e/` – Playwright. `scripts/` – Icons, Balance.

Der ursprüngliche Prototyp liegt als Referenz in `tiefenlicht.html`. Designentscheidungen und offene Punkte stehen in `GAMEDESIGN.md`, der Phasenplan in `PLAN.md`.

## Steuerung

- **Senden:** Von einem eigenen Knoten zu einem Ziel ziehen. Sofort geht der eingestellte Anteil (Standard 50 %) los, die Route bleibt und schickt laufend einen Teil der Produktion nach. Erneut ziehen schickt wieder den Anteil.
- **Route kappen:** Quer über die Linie wischen (Start auf leerer Fläche oder einem fremden Knoten). Alternativ im Knotenmenü oder per Rechtsklick.
- **Mehrfachauswahl:** Eigene Knoten antippen sammelt sie, Doppeltipp wählt alle. Ziehen von einem gewählten Knoten sendet von allen.
- **Knotenmenü:** Einzelnen eigenen Knoten antippen: Ausbau, Reserve, Umbau, Routen löschen (radial am Knoten).
- **Kamera:** Mausrad oder Pinch zoomt, Zwei-Finger-Ziehen oder mittlere Maustaste verschiebt.
- **Tasten:** Q/W/E/R Anteil, 1–3 Fähigkeiten, Leertaste Pause, F Tempo, Esc Abbrechen.

## Installation auf dem iPhone

1. Seite in Safari öffnen.
2. Teilen → „Zum Home-Bildschirm“.
3. Über das Home-Bildschirm-Icon starten: Das Spiel läuft bildschirmfüllend im Querformat und offline.

## Playwright ohne Root (Linux)

Fehlen Chromium Systembibliotheken und gibt es kein `sudo`, lassen sie sich lokal entpacken; `scripts/chromium-env.mjs` hängt den Pfad automatisch an `LD_LIBRARY_PATH`:

```sh
mkdir -p /tmp/debs ~/.local/chromium-libs && cd /tmp/debs
apt-get download libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libxkbcommon0 libasound2 libatspi2.0-0 libxrender1 libwayland-server0 libxcb-randr0 \
  libxi6 libx11-xcb1 libxcursor1 libcups2 libpango-1.0-0 libcairo2 libdrm2 libxext6 libxcb1 libdbus-1-3 \
  libexpat1 libharfbuzz0b libpixman-1-0 libthai0 libxcb-render0 libxcb-shm0 libavahi-client3 libavahi-common3 \
  libgraphite2-3 libdatrie1
for d in *.deb; do dpkg -x "$d" ~/.local/chromium-libs; done
```

## Deployment

Jeder Push auf `main` baut und veröffentlicht über GitHub Actions auf GitHub Pages (`.github/workflows/deploy.yml`). In den Repository-Einstellungen muss unter „Pages“ die Quelle „GitHub Actions“ gewählt sein.
