import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Build do jogo para a pasta pública do site Next.js: /jogar/muro-de-poses/ (a página com SEO fica em /jogos/muro-de-poses).
// Câmera, detector e interface vêm de games/comum, compartilhados com os outros jogos de câmera.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../public/jogar/muro-de-poses', import.meta.url)),
    emptyOutDir: true,
  },
})
