import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Racha Conta: pessoas, divisão igual / porcentagem / por item, 10% do garçom, quem pagou e comparação de cenários.

test('App · Racha Conta', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Cadastra 4 pessoas, divide R$ 250 igual com 10% (e tira os 10% de uma pessoa), duplica o cenário por porcentagem, monta outro por item com quem pagou tudo, compara os três e confere que fica salvo.' })
  const ev = novaEvidencia('app', 'racha-conta', 'Racha Conta')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  const parte = (nome) => page.locator('.rc-partes li').filter({ hasText: nome }).locator('strong')
  let ok = false
  try {
    await test.step('1. Pessoas e divisão igual com 10%', async () => {
      await page.goto('/apps/racha-conta/app')
      await expect(page.locator('.rc-cenarios')).toBeVisible({ timeout: 30000 })
      await page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
      await page.getByLabel('Nome da pessoa').fill('Ana, Bruno, Caio, Duda')
      await page.getByRole('button', { name: 'Adicionar' }).click()
      await expect(page.locator('.rc-pessoas li')).toHaveCount(4)
      await page.getByPlaceholder('R$ 0,00').first().fill('250,00')
      await expect(page.locator('.rc-total strong')).toHaveText(/275,00/)
      await expect(parte('Ana')).toHaveText(/68,75/)
      await page.getByRole('group', { name: 'Quem paga a taxa' }).getByRole('button', { name: 'Duda' }).click()
      await expect(parte('Duda')).toHaveText(/62,50/)
      await ev.print(page, info, 'R$ 250 para 4 com 10%: R$ 68,75 cada; Duda sem os 10% paga R$ 62,50')
    })
    await test.step('2. Cenário por porcentagem', async () => {
      await page.getByRole('button', { name: 'Duplicar' }).click()
      await page.getByRole('radio', { name: 'Por porcentagem' }).click()
      const pcts = page.locator('.rc-pcts input')
      for (const [i, v] of ['40', '30', '20', '10'].entries()) await pcts.nth(i).fill(v)
      await expect(page.locator('.rc-ok')).toContainText('100%')
      await expect(parte('Ana')).toHaveText(/110,00/)
      await ev.print(page, info, 'Cópia do cenário dividida 40/30/20/10%')
    })
    await test.step('3. Cenário por item e quem pagou', async () => {
      await page.getByRole('button', { name: '+ Novo' }).click()
      await page.getByRole('radio', { name: 'Por item consumido' }).click()
      await page.getByRole('button', { name: '+ Item' }).click()
      await page.getByLabel('Item', { exact: true }).nth(0).fill('Pizza')
      await page.getByLabel('Valor unitário').nth(0).fill('120')
      await page.getByRole('button', { name: '+ Item' }).click()
      await page.getByLabel('Item', { exact: true }).nth(1).fill('Cerveja')
      await page.getByLabel('Valor unitário').nth(1).fill('14')
      await page.getByLabel('Quantidade').nth(1).fill('6')
      const quem = page.locator('.rc-item').nth(1).getByRole('group', { name: 'Quem consumiu' })
      await quem.getByRole('button', { name: 'Caio' }).click()
      await quem.getByRole('button', { name: 'Duda' }).click()
      await expect(parte('Ana')).toHaveText(/79,20/)
      await expect(parte('Caio')).toHaveText(/33,00/)
      await page.getByLabel('Quem pagou', { exact: true }).selectOption('um')
      await page.getByLabel('Quem pagou tudo').selectOption({ label: 'Ana' })
      await expect(page.locator('.rc-acertos li')).toHaveCount(3)
      await expect(page.locator('.rc-acertos')).toContainText('Bruno paga R$ 79,20 para Ana')
      await ev.print(page, info, 'Pizza para todos, cerveja só para Ana e Bruno; Ana pagou e o app mostra quem deve quanto')
    })
    await test.step('4. Comparar cenários', async () => {
      await page.getByRole('button', { name: '⇆ Comparar' }).click()
      await expect(page.locator('.rc-tabela tbody tr')).toHaveCount(4)
      await expect(page.locator('.rc-tabela tfoot')).toContainText('224,40')
      await ev.print(page, info, 'Os três cenários lado a lado')
    })
    await test.step('5. Fica salvo no aparelho', async () => {
      await page.reload()
      await expect(page.locator('.rc-cenarios button', { hasText: 'Conta 3' })).toBeVisible({ timeout: 30000 })
    })
    await test.step('Sem erro de JavaScript', async () => {
      expect(erros, erros.join(' | ')).toHaveLength(0)
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
