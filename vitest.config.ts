import { defineConfig } from 'vitest/config';

// Plain Vite/Vitest config on purpose: the data layer is runtime-agnostic and
// must be testable without loading the Astro/Cloudflare plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
