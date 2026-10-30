import { defineConfig } from '@playwright/test'

// Testes E2E (navegador real) dos apps e sistemas. Geram um relatório HTML com prints
// e os passos de cada cenário. Rode:  npm run test:e2e   e depois  npm run test:e2e:report
export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/gerar-indice.js',
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3100',
    viewport: { width: 1280, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
