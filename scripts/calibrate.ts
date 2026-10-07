// Finds, for every generated level, the first layout the simple bot beats often enough and writes
// src/game/calibration.json. Run after changing level generation, AI or rules: npm run calibrate
import { writeFileSync } from 'node:fs';
import { BOT_SPEEDS, botGame, requiredWins } from '../src/game/bot';
import { generateAttempt } from '../src/game/levels';

const LAST = Number(process.argv[2] ?? 150);
const out: Record<string, number> = {};
for (let n = 4; n <= LAST; n++) {
  let chosen = -1,
    fallback = 0,
    best = -1;
  const budget = n % 10 === 0 ? 80 : 40;
  for (let attempt = 0, tried = 0; attempt < 600 && tried < budget; attempt++) {
    const def = generateAttempt(n, attempt);
    if (!def) continue;
    tried++;
    const wins = BOT_SPEEDS.filter((e) => botGame(def, e).win).length;
    if (wins > best) {
      best = wins;
      fallback = attempt;
    }
    if (wins >= requiredWins(n)) {
      chosen = attempt;
      break;
    }
  }
  out[String(n)] = chosen >= 0 ? chosen : fallback;
  console.log(`level ${n}: attempt ${out[String(n)]}${chosen < 0 ? ` (best ${best} wins)` : ''}`);
}
writeFileSync(new URL('../src/game/calibration.json', import.meta.url), JSON.stringify(out, null, 0) + '\n');
