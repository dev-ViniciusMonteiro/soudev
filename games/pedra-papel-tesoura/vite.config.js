import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Build do jogo para a pasta pública do site Next.js: /jogar/pedra-papel-tesoura/ (a página com SEO fica em /jogos/pedra-papel-tesoura).
// Câmera, detector e interface vêm de games/comum, compartilhados com os outros jogos de câmera.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../public/jogar/pedra-papel-tesoura', import.meta.url)),
    emptyOutDir: true,
  },
})
