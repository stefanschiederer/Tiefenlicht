import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __APP_VERSION__: '"test"' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: { provider: 'v8', include: ['src/sim/**', 'src/ai/**', 'src/app/**', 'src/data/**'] },
  },
});
