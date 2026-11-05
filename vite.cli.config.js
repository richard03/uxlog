/**
 * Sestavení CLI pro Claude Code do jednoho souboru (src/generated/uxlog-cli.mjs).
 * Aplikace soubor přibalí (`?raw`) a zapíše do složky dat jako .uxlog/bin/uxlog.mjs.
 * Spouští se automaticky před dev/build/test (`npm run build:cli`).
 */
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    ssr: 'src/cli/uxlog.js',
    outDir: 'src/generated',
    emptyOutDir: false,
    target: 'node18',
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'uxlog-cli.mjs', format: 'es', inlineDynamicImports: true },
    },
  },
  ssr: { noExternal: true, target: 'node' },
})
