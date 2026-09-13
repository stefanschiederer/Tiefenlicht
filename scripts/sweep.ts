// Seed/prod sweep for one campaign level: `npx tsx scripts/sweep.ts <levelIndex> [seed,seed,...] [prod]`
import { createPlayerBot } from '@/ai/playerBot';
import { CAMPAIGN, emptyPerks, endlessDef, type LevelDef } from '@/data';
import { buildLevel } from '@/sim/level';
import { step } from '@/sim/update';

const DT = 1 / 30,
  MAX_TIME = 900;
function play(def: LevelDef, interval: number): string {
  const s = buildLevel(def, { perks: emptyPerks(), difficulty: 'normal' });
  const bot = createPlayerBot({ interval });
  while (!s.over && s.time < MAX_TIME) {
    bot.update(s, DT);
    step(s, DT);
    s.events.length = 0;
  }
  return s.over === 'won' ? `S${Math.round(s.time)}` : s.over === 'lost' ? `N${Math.round(s.time)}` : 'Z';
}
const arg = process.argv[2] ?? '0';
const base: LevelDef = arg.startsWith('E') ? endlessDef(+arg.slice(1)) : (CAMPAIGN[+arg] as LevelDef);
const seeds = (process.argv[3] ?? String(base.seed)).split(',').map(Number);
const prod = process.argv[4] ? +process.argv[4] : base.prod;
const gar = process.argv[5] ? +process.argv[5] : base.gar;
for (const seed of seeds) {
  const def = { ...base, seed, prod, gar };
  const rs = [1.2, 1.5, 2.0].map((iv) => play(def, iv));
  console.log(`${base.name} seed ${seed} prod ${prod} gar ${gar}: ${rs.join(' ')}`);
}
