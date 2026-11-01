import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Catálogo digital. A parte pública (apresentação, formulário de criar, modelos e o "Já tenho")
// roda sempre. O fluxo do lojista (criar loja, produtos, arrastar blocos, pedido no WhatsApp)
// roda quando CT_SLUG e CT_SENHA de uma loja de teste são passados por variável de ambiente.
//   CT_SLUG=minha-loja-teste CT_SENHA=... npm run test:e2e -- -g Catálogo
const SLUG = process.env.CT_SLUG || ''
const SENHA = process.env.CT_SENHA || ''

test('App · Catálogo digital', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Abre o Catálogo digital, confere a apresentação, o formulário de criar com os 6 modelos e o login; com uma loja de teste, entra no editor, arrasta um bloco e abre a página pública com o pedido pelo WhatsApp.' })
  const ev = novaEvidencia('apps', 'catalogo', 'Catálogo digital')
  let ok = false
  try {
    await test.step('1. Abrir a apresentação', async () => {
      await page.goto('/catalogo')
      await expect(page.locator('.cl-hero h1')).toContainText('catálogo')
      await ev.print(page, info, 'Apresentação', 'Proposta, benefícios e um celular de exemplo com o botão de pedido no WhatsApp.')
    })

    await test.step('2. Formulário de criar com os modelos', async () => {
      await expect(page.locator('.cl-modelos .ce-modelo')).toHaveCount(6)
      await page.getByPlaceholder('Ex.: Doces da Ana').fill('Loja Exemplo Teste')
      await expect(page.locator('.cl-link input')).toHaveValue('loja-exemplo-teste')
      await page.locator('.cl-modelos .ce-modelo', { hasText: 'Noite' }).click()
      await expect(page.locator('.cl-modelos .ce-modelo', { hasText: 'Noite' })).toHaveAttribute('aria-pressed', 'true')
      await page.locator('#criar').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'Criar catálogo', 'O link é gerado do nome da loja e o modelo escolhido fica marcado.')
    })

    await test.step('3. Aba "Já tenho" (login)', async () => {
      await page.locator('.cl-tabs button', { hasText: 'Já tenho' }).click()
      await expect(page.getByPlaceholder('doces-da-ana')).toBeVisible()
      await ev.print(page, info, 'Entrar', 'Login com o link da loja e a senha (sem e-mail).')
    })

    await test.step('4. Loja inexistente dá 404', async () => {
      const r = await page.goto('/c/loja-que-nao-existe-xyz')
      expect(r.status()).toBe(404)
    })

    if (!SLUG || !SENHA) {
      ev.nota('Fluxo do lojista não executado', 'Rode com CT_SLUG e CT_SENHA para testar editor, arrastar blocos e a página pública.')
    } else {
      await test.step('5. Entrar no editor', async () => {
        await page.goto('/catalogo')
        await page.locator('.cl-tabs button', { hasText: 'Já tenho' }).click()
        await page.getByPlaceholder('doces-da-ana').fill(SLUG)
        await page.locator('input[type="password"]').fill(SENHA)
        await page.getByRole('button', { name: 'Entrar' }).click()
        await expect(page.locator('.ce-topo')).toBeVisible({ timeout: 20000 })
        await ev.print(page, info, 'Editor', 'Abas Página, Produtos, Visual, Loja e Conta, com a prévia ao vivo no celular.')
      })

      await test.step('6. Arrastar um bloco', async () => {
        const nomes = () => page.locator('.ce-blocos .ce-bloco-nome > span:last-child').evaluateAll((els) => els.map((e) => e.firstChild.textContent))
        const antes = await nomes()
        const alca = page.locator('.ce-blocos .ce-alca').nth(1)
        const b = await alca.boundingBox()
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
        await page.mouse.down()
        for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 8 * i)
        await page.mouse.up()
        const depois = await nomes()
        expect(depois[0]).toBe(antes[1])
        await ev.print(page, info, 'Bloco arrastado', 'O segundo bloco foi para o topo arrastando a alça ⠿.')
        // devolve a ordem
        await page.locator('.ce-blocos li').first().getByRole('button', { name: 'Descer' }).click()
      })

      await test.step('7. Página pública e pedido', async () => {
        await page.goto(`/c/${SLUG}`)
        await expect(page.locator('.ct-v')).toBeVisible()
        const mais = page.locator('.ct-mais').first()
        if (await mais.count()) {
          await mais.click()
          await page.locator('.ct-barra-pedido').click()
          await expect(page.locator('.ct-sacola a.ct-btn-zap')).toHaveAttribute('href', /wa\.me\/\d+\?text=/)
        }
        await ev.print(page, info, 'Pedido pelo WhatsApp', 'O carrinho monta a mensagem com itens e total e abre o WhatsApp da loja.')
      })
    }
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
