# Testes E2E (Playwright) — prints e evidências

Testes de ponta a ponta que abrem um **navegador real**, executam cada app e sistema,
tiram **print em cada passo** e geram um **relatório HTML** com as evidências e a
explicação de cada cenário (o que faz, o que verificou).

## Rodar
```bash
npm run test:e2e          # roda tudo (sobe o site em localhost:3100 e testa)
npm run test:e2e:report   # abre o relatório HTML com os prints
```
Rodar um só:
```bash
npx playwright test -g "Mercadinho"
npx playwright test -g "Treino"
```

> Precisa do site buildado uma vez (`npm run build`) — o Playwright serve com `next start`.
> Na primeira vez, baixe o navegador: `npx playwright install chromium`.

## O que cobre
- **8 sistemas** (`e2e/sistemas.spec.js`): abre a demonstração, confirma o painel e os
  módulos, abre alguns e tira print de cada, e checa que não há tela de erro.
- **6 apps** (`e2e/apps.spec.js`): abre o app, confirma que renderizou e que não houve
  erro de JavaScript derrubando a página.

O relatório (`playwright-report/`) e os resultados (`test-results/`) não vão para o git.
