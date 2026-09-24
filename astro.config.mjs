import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Financing Bot, financingbot.com. Server output with one catch all route
// (src/pages/[...slug].astro, prerender false) so Webflow Cloud never serves a
// directory style static page and never enters the trailing slash redirect loop.
// Webflow Cloud reads the Astro version, installs the matching Cloudflare
// adapter at build and sets base and assetsPrefix from the app's mount path,
// so neither is set here (their documentation says a committed value is
// overwritten). The local adapter is the same one so npm run build validates
// the worker in the sandbox.
export default defineConfig({
  site: 'https://financingbot.com',
  output: 'server',
  adapter: cloudflare(),
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  security: { checkOrigin: false },
  vite: {
    build: { assetsInlineLimit: 0 }
  }
});
