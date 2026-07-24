import { defineConfig } from 'vite';

/**
 * Builds the one small script the prerendered SEO pages carry.
 *
 * Kept separate from the app build on purpose: these pages must stay JS-light,
 * so the widget code is bundled alone (no React, no router) into a single ES
 * module that `scripts/prerender-seo.mjs` inlines into the tool pages.
 */
export default defineConfig({
  build: {
    outDir: 'dist-islands',
    emptyOutDir: true,
    target: 'es2020',
    lib: {
      entry: 'src/seo/islands.ts',
      formats: ['es'],
      fileName: () => 'islands.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
