import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Build do jogo para a pasta pública do site Next.js: /jogar/cidade-neon/ (a página com SEO fica em /jogos/cidade-neon)
// Rodado por `npm run build:game` (antes do `next build`).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2020',
    outDir: fileURLToPath(new URL('../../public/jogar/cidade-neon', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
})
