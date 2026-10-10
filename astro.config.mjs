// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://docs.astro.build/en/guides/integrations-guide/cloudflare/
export default defineConfig({
  output: 'server',
  // The menu uses neither sessions nor Astro image processing. Turning both off
  // stops the adapter from adding SESSION (KV) and IMAGES bindings, so a deploy
  // never needs to provision any extra Cloudflare resource.
  session: false,
  adapter: cloudflare({ imageService: 'passthrough' }),
});
