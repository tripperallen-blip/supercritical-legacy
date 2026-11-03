// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://supercritical.one',
  trailingSlash: 'always',

  redirects: {
    '/news/': '/newsroom/',
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [sitemap()],
});
