import { test, expect } from '@playwright/test'

// Apps: abrem a tela principal e confirmam que renderiza sem erro, guardando print de evidência.
const APPS = [
  ['treino', 'Treino'],
  ['globo', 'Globo ao vivo'],
  ['documentador', 'Documentador'],
  ['imoveis', 'Radar de Imóveis'],
  ['ppfd', 'Medidor PPFD'],
  ['editor-de-video', 'Editor de vídeo'],
]

for (const [slug, nome] of APPS) {
  test(`App · ${nome}`, async ({ page }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: `Abre o app ${nome} no navegador, espera a interface principal carregar e confirma que renderizou conteúdo sem tela de erro. Guarda um print como evidência.` })
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))

    await test.step('1. Abrir o app', async () => {
      await page.goto(`/apps/${slug}/app`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)
      await info.attach('print — app aberto', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    })

    await test.step('2. A interface renderizou conteúdo', async () => {
      const texto = (await page.locator('main, body').first().innerText().catch(() => '')) || ''
      info.annotations.push({ type: 'Evidência', description: `A tela renderizou ${texto.length} caracteres de conteúdo.` })
      expect(texto.trim().length, 'o app deve renderizar algum conteúdo visível').toBeGreaterThan(5)
    })

    await test.step('3. Sem erro de JavaScript derrubando a página', async () => {
      await expect(page.locator('text=/Application error|something went wrong/i')).toHaveCount(0)
      expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
    })
  })
}
