import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Calculadora de odds de poker: escolhe cartas, jogadores e quem correu; confere chance, outs e sugestão.

test('Ferramenta · Calculadora de odds de poker', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Par de ases contra 1 adversário (≈85%), depois Ás-Rei de copas com flush draw no flop contra 3 adversários (15 outs) e um river que não ajudou com aposta alta (sugere correr).' })
  const ev = novaEvidencia('ferramenta', 'calculadora-de-odds-poker', 'Calculadora de odds de poker')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  const clicar = (nome) => page.getByRole('button', { name: nome, exact: true }).first().click()
  const chance = async () => parseFloat((await page.textContent('.po-equidade strong')).replace('%', ''))
  let ok = false
  try {
    await test.step('1. Par de ases contra 1 adversário', async () => {
      await page.goto('/ferramentas/calculadora-de-odds-poker')
      await page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Menos jogadores' }).click()
      await clicar('A de espadas'); await clicar('A de copas')
      await expect.poll(async () => Number(((await page.textContent('.po-equidade small')) || '').match(/([\d.]+) mãos/)?.[1].replace(/\./g, '') || 0), { timeout: 20000 }).toBeGreaterThanOrEqual(60000)
      const c = await chance()
      expect(c).toBeGreaterThan(83); expect(c).toBeLessThan(87)
      await page.locator('.po-resultado').scrollIntoViewIfNeeded()
      await ev.print(page, info, `Par de ases contra uma mão qualquer: ${c}% (a tabela clássica diz 85%)`)
    })
    await test.step('2. Flush draw no flop, 3 adversários', async () => {
      await page.getByRole('button', { name: 'Nova mão' }).click()
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Mais jogadores' }).click()
      for (const c of ['A de copas', 'K de copas', '2 de copas', '7 de copas', 'Q de paus']) await clicar(c)
      await page.getByRole('button', { name: /^J1/ }).click(); await page.getByRole('button', { name: /^J3/ }).click()
      await page.getByPlaceholder('ex.: 100').fill('100'); await page.getByPlaceholder('ex.: 20').fill('25')
      await expect(page.locator('.po-mini.out')).toHaveCount(15)
      await expect(page.locator('.po-rec strong')).not.toHaveText('Correr', { timeout: 20000 })
      await page.locator('.po-mesa').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'Ás-Rei de copas com 2 copas no flop: 15 outs em verde e a sugestão de continuar')
    })
    await test.step('3. River sem acertar e aposta alta', async () => {
      await clicar('3 de espadas'); await clicar('9 de ouros')
      await page.getByPlaceholder('ex.: 20').fill('150')
      await expect(page.locator('.po-rec strong')).toHaveText('Correr', { timeout: 20000 })
      await page.locator('.po-resultado').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'No river sem acertar, pagar 150 num pote de 100 não compensa: a sugestão é correr')
    })
    await test.step('Sem erro de JavaScript', async () => {
      expect(erros, erros.join(' | ')).toHaveLength(0)
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
