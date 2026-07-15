import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

const deploymentUrl = process.env.SITE_URL ?? 'https://fusang.arsvine.com';

export default defineConfig({
  site: deploymentUrl,
  output: 'static',
  devToolbar: {
    enabled: false,
  },
  integrations: [react(), mdx(), sitemap()],
  vite: {
    build: {
      target: 'es2022',
    },
  },
});
