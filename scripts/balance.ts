/**
 * Headless balance harness: plays every campaign level and the first endless waves with the
 * heuristic player bot and writes BALANCE.md. Run with `npm run balance`.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CAMPAIGN, PLAYER, WORLD_H, WORLD_W, emptyPerks, endlessDef, type LevelDef } from '@/data';
import { buildLevel, step } from '@/sim';
import { createPlayerBot } from '@/ai/playerBot';
import type { Difficulty } from '@/app/save';

const DT = 1 / 30;
const MAX_TIME = 900;
const INTERVALS = [1.2, 1.5, 2.0];
const ENDLESS_WAVES = 6;
const DIFFS: Difficulty[] = ['normal', 'schwer', 'leicht'];

type Outcome = 'won' | 'lost' | 'timeout';

interface Run {
  outcome: Outcome;
  time: number;
  stars: number;
  share60: number;
  share120: number;
  captures: number;
}

interface LevelRow {
  label: string;
  def: LevelDef;
  runs: Record<Difficulty, Run[]>;
}

function stars(def: LevelDef, r: { outcome: Outcome; time: number }): number {
  if (r.outcome !== 'won') return 0;
  return r.time <= def.par ? 3 : r.time <= def.par * 1.6 ? 2 : 1;
}

function share(s: ReturnType<typeof buildLevel>): number {
  return s.nodes.filter((n) => n.owner === PLAYER).length / s.nodes.length;
}

function play(def: LevelDef, difficulty: Difficulty, interval: number): Run {
  const s = buildLevel(def, { perks: emptyPerks(), difficulty });
  const bot = createPlayerBot({ interval });
  let share60 = -1,
    share120 = -1;
  while (!s.over && s.time < MAX_TIME) {
    bot.update(s, DT);
    step(s, DT);
    s.events.length = 0;
    if (share60 < 0 && s.time >= 60) share60 = share(s);
    if (share120 < 0 && s.time >= 120) share120 = share(s);
  }
  const final = share(s);
  if (share60 < 0) share60 = final;
  if (share120 < 0) share120 = final;
  const outcome: Outcome = s.over ?? 'timeout';
  const run = { outcome, time: s.time, stars: 0, share60, share120, captures: s.stats.captured };
  run.stars = stars(def, run);
  return run;
}

function median(xs: number[]): number {
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? (a[m] as number) : ((a[m - 1] as number) + (a[m] as number)) / 2;
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (x: number): string => `${Math.round(x * 100)} %`;
const sec = (x: number): string => `${Math.round(x)} s`;
const OUT: Record<Outcome, string> = { won: 'S', lost: 'N', timeout: 'Z' };
const outcomes = (rs: Run[]): string => rs.map((r) => OUT[r.outcome]).join(' ');
const medianTime = (rs: Run[]): string => {
  const won = rs.filter((r) => r.outcome === 'won');
  return won.length ? sec(median(won.map((r) => r.time))) : '–';
};
const starStr = (rs: Run[]): string => rs.map((r) => String(r.stars)).join('/');

function mdTable(header: string[], rows: string[][]): string {
  const w = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (cells: string[]) => `| ${cells.map((c, i) => c.padEnd(w[i] as number)).join(' | ')} |`;
  return [line(header), `| ${w.map((n) => '-'.repeat(n)).join(' | ')} |`, ...rows.map(line)].join('\n');
}

function detailTable(rows: LevelRow[]): string {
  const header = [
    'Level',
    'Name',
    'Gegner',
    'Zielzeit',
    'Ausgang (3 Läufe)',
    'Zeit (Median)',
    'Sterne',
    'Anteil 60 s',
    'Anteil 120 s',
  ];
  return mdTable(
    header,
    rows.map((r) => {
      const rs = r.runs.normal;
      return [
        r.label,
        r.def.name,
        String(r.def.enemies),
        sec(r.def.par),
        outcomes(rs),
        medianTime(rs),
        starStr(rs),
        pct(mean(rs.map((x) => x.share60))),
        pct(mean(rs.map((x) => x.share120))),
      ];
    }),
  );
}

function briefTable(rows: LevelRow[], diff: Difficulty): string {
  const header = ['Level', 'Name', 'Zielzeit', 'Ausgang (3 Läufe)', 'Zeit (Median)', 'Sterne'];
  return mdTable(
    header,
    rows.map((r) => {
      const rs = r.runs[diff];
      return [r.label, r.def.name, sec(r.def.par), outcomes(rs), medianTime(rs), starStr(rs)];
    }),
  );
}

function summary(rows: LevelRow[]): string[] {
  const lines: string[] = [];
  const name = (r: LevelRow) => `${r.label} „${r.def.name}“`;
  const neverWon = rows.filter((r) => r.runs.normal.every((x) => x.outcome !== 'won'));
  const allUnderPar = rows.filter((r) =>
    r.runs.normal.every((x) => x.outcome === 'won' && x.time <= r.def.par),
  );
  const mixed = rows.filter((r) => {
    const w = r.runs.normal.filter((x) => x.outcome === 'won').length;
    return w > 0 && w < r.runs.normal.length;
  });
  const easy = rows.filter((r) =>
    r.runs.normal.every((x) => x.outcome === 'won' && x.time <= r.def.par * 0.5),
  );
  const hard = rows.filter(
    (r) =>
      r.runs.normal.every((x) => x.outcome === 'won') && r.runs.normal.every((x) => x.time > r.def.par * 1.6),
  );
  const lostEasy = rows.filter((r) => r.runs.leicht.some((x) => x.outcome !== 'won'));
  const wonHard = rows.filter((r) => r.runs.schwer.every((x) => x.outcome === 'won' && x.time <= r.def.par));
  lines.push(`- Nie gewonnen (normal): ${neverWon.length ? neverWon.map(name).join(', ') : 'keines'}.`);
  lines.push(
    `- Wechselhaft (normal, nur ein Teil der Läufe gewonnen): ${mixed.length ? mixed.map(name).join(', ') : 'keines'}.`,
  );
  lines.push(
    `- In jedem Lauf unter Zielzeit (normal): ${allUnderPar.length ? allUnderPar.map(name).join(', ') : 'keines'}.`,
  );
  lines.push(
    `- Verdächtig leicht (jeder Lauf unter halber Zielzeit): ${easy.length ? easy.map(name).join(', ') : 'keines'}.`,
  );
  lines.push(
    `- Verdächtig schwer (gewonnen, aber jeder Lauf über 1,6 × Zielzeit): ${hard.length ? hard.map(name).join(', ') : 'keines'}.`,
  );
  lines.push(
    `- Auf „Leicht“ nicht sicher gewonnen: ${lostEasy.length ? lostEasy.map(name).join(', ') : 'keines'}.`,
  );
  lines.push(
    `- Auf „Schwer“ in jedem Lauf unter Zielzeit: ${wonHard.length ? wonHard.map(name).join(', ') : 'keines'}.`,
  );
  return lines;
}

function main(): void {
  const t0 = performance.now();
  const campaign: LevelRow[] = CAMPAIGN.map((def, i) => ({
    label: String(i + 1),
    def,
    runs: { normal: [], schwer: [], leicht: [] },
  }));
  const endless: LevelRow[] = Array.from({ length: ENDLESS_WAVES }, (_, i) => ({
    label: `E${i + 1}`,
    def: endlessDef(i + 1),
    runs: { normal: [], schwer: [], leicht: [] },
  }));
  const all = [...campaign, ...endless];
  for (const row of all) {
    for (const diff of DIFFS) for (const iv of INTERVALS) row.runs[diff].push(play(row.def, diff, iv));
    const rs = row.runs.normal;
    console.info(
      `${row.label.padStart(3)} ${row.def.name.padEnd(22)} normal: ${outcomes(rs)}  ${medianTime(rs).padStart(6)}  Sterne ${starStr(rs)}` +
        `  schwer: ${outcomes(row.runs.schwer)}  leicht: ${outcomes(row.runs.leicht)}`,
    );
  }
  const runtime = (performance.now() - t0) / 1000;

  console.table(
    all.map((r) => ({
      Level: r.label,
      Name: r.def.name,
      Gegner: r.def.enemies,
      Zielzeit: r.def.par,
      Ausgang: outcomes(r.runs.normal),
      Zeit: medianTime(r.runs.normal),
      Sterne: starStr(r.runs.normal),
      'Anteil 60 s': pct(mean(r.runs.normal.map((x) => x.share60))),
      'Anteil 120 s': pct(mean(r.runs.normal.map((x) => x.share120))),
      Schwer: outcomes(r.runs.schwer),
      Leicht: outcomes(r.runs.leicht),
    })),
  );

  const date = new Date().toISOString().slice(0, 10);
  const md = [
    '# Balance-Bericht',
    '',
    `Stand: ${date} · Weltgröße: ${WORLD_W} × ${WORLD_H} · Laufzeit des Harness: ${runtime.toFixed(1)} s`,
    '',
    '## Methode',
    '',
    '- Bot: Heuristik-Bot, spielt wie die Gegner-KI plus Routen (`src/ai/playerBot.ts`). Er verstärkt bedrohte Knoten, baut reiche sichere Knoten aus, zieht wie ein Spieler Pfade (schickt sofort 50 % und behält die Route), räumt Routen ins Hinterland ab und hält an der Front 25 % Reserve.',
    `- Jedes Level wird ohne Perks (nur Lichtstoß, ungenutzt) je dreimal gespielt, mit Entscheidungsintervall ${INTERVALS.map((x) => `${x} s`).join(' / ')}; der Kartenseed ist fest.`,
    `- Simulation: \`step(state, 1/30)\` bis Spielende oder ${MAX_TIME} s. Ausgang: S = Sieg, N = Niederlage, Z = Zeitüberschreitung.`,
    '- Sterne: 3 bei Zeit ≤ Zielzeit, 2 bei ≤ 1,6 × Zielzeit, sonst 1; 0 ohne Sieg. Anteil = Anteil aller Knoten in Spielerhand nach 60 s bzw. 120 s (Mittel der drei Läufe).',
    '- Zeit ist der Median der gewonnenen Läufe.',
    '',
    '## Kampagne (Normal)',
    '',
    detailTable(campaign),
    '',
    `## Endlos, Wellen 1–${ENDLESS_WAVES} (Normal)`,
    '',
    detailTable(endless),
    '',
    '## Schwer',
    '',
    briefTable(all, 'schwer'),
    '',
    '## Leicht',
    '',
    briefTable(all, 'leicht'),
    '',
    '## Zusammenfassung',
    '',
    ...summary(all),
    '',
  ].join('\n');
  const out = resolve(process.cwd(), 'BALANCE.md');
  writeFileSync(out, md);
  console.info(`\n${summary(all).join('\n')}\n\nGeschrieben: ${out} (${runtime.toFixed(1)} s)`);
}

main();
