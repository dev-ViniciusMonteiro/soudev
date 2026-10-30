import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Apps: abrem a tela principal, fazem uma interação segura (abas que não pedem câmera/arquivo)
// e confirmam que renderiza sem erro — guardando prints de evidência.
const APPS = [
  ['treino', 'Treino', ['Rotinas', 'Biblioteca', 'Progresso']],
  ['globo', 'Globo ao vivo', []],
  ['documentador', 'Documentador', []],
  ['imoveis', 'Radar de Imóveis', []],
  ['ppfd', 'Medidor PPFD', ['Guia']],
  ['editor-de-video', 'Editor de vídeo', []],
]

for (const [slug, nome, abas] of APPS) {
  test(`App · ${nome}`, async ({ page }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: `Abre o app ${nome}, confirma que a interface carrega sem erro de JavaScript, faz interações seguras e guarda prints de evidência.` })
    const ev = novaEvidencia('app', slug, nome)
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    let ok = false
    try {
      await test.step('1. Abrir o app', async () => {
        await page.goto(`/apps/${slug}/app`)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(2200)
        await ev.print(page, info, 'App aberto', 'A interface principal do app carregou no navegador.')
      })

      if (slug === 'globo') {
        await test.step('2. Aguardar o globo 3D renderizar', async () => {
          await page.waitForTimeout(4000)
          await ev.print(page, info, 'Globo 3D renderizado', 'O mapa 3D (WebGL) desenhou na tela.')
        })
      }

      for (const aba of abas) {
        await test.step(`2. Abrir "${aba}"`, async () => {
          const alvo = page.getByText(aba, { exact: false }).first()
          if (await alvo.count()) {
            await alvo.click().catch(() => {})
            await page.waitForTimeout(700)
            await ev.print(page, info, `Aba "${aba}"`, `A seção "${aba}" abriu sem erro.`)
          }
        })
      }

      await test.step('3. A interface renderizou conteúdo', async () => {
        const texto = (await page.locator('main, body').first().innerText().catch(() => '')) || ''
        ev.nota('Conteúdo renderizado', `A tela mostrou ${texto.length} caracteres de conteúdo.`)
        expect(texto.trim().length, 'o app deve renderizar conteúdo visível').toBeGreaterThan(5)
      })

      await test.step('4. Sem erro de JavaScript derrubando a página', async () => {
        await expect(page.locator('text=/Application error|something went wrong/i')).toHaveCount(0)
        expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}
