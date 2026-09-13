// On machines without root, Chromium's system libraries can be unpacked into ~/.local/chromium-libs
// (see README, "Playwright ohne Root"). This prepends them to LD_LIBRARY_PATH for launched browsers.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.local', 'chromium-libs');
if (process.platform === 'linux' && existsSync(dir)) {
  const extra = [join(dir, 'usr/lib/x86_64-linux-gnu'), join(dir, 'lib/x86_64-linux-gnu')];
  const cur = process.env.LD_LIBRARY_PATH ? [process.env.LD_LIBRARY_PATH] : [];
  process.env.LD_LIBRARY_PATH = [...extra, ...cur].join(':');
}
