import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Build do jogo para a pasta pública do site Next.js: /jogar/cubo-no-ritmo/ (a página com SEO fica em /jogos/cubo-no-ritmo)
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../public/jogar/cubo-no-ritmo', import.meta.url)),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
})
