import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Lente Certa: a pessoa digita a receita e compara espessura, tipo de lente e tratamentos. Tudo no navegador.

test('App · Lente Certa', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Digita uma receita com astigmatismo e adição, compara os índices, troca o tipo de lente no simulador, marca tratamentos e confere o resumo para levar à ótica.' })
  const ev = novaEvidencia('app', 'lente-certa', 'Lente Certa')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  let ok = false
  try {
    await test.step('1. Receita digitada e explicada', async () => {
      await page.goto('/apps/lente-certa/app')
      await expect(page.getByRole('heading', { name: 'Sua receita' })).toBeVisible({ timeout: 30000 })
      await page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
      await page.getByRole('button', { name: 'Usar uma receita de exemplo' }).click()
      await expect(page.getByText('Miopia moderada')).toBeVisible()
      await expect(page.getByText('Presbiopia (vista cansada)')).toBeVisible()
      await ev.print(page, info, 'Receita digitada: o app explica miopia, astigmatismo e vista cansada')
    })
    await test.step('2. Espessura por índice, em escala', async () => {
      await page.getByRole('button', { name: 'Continuar', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Espessura e índice da lente' })).toBeVisible()
      await expect(page.locator('.ln-mat')).toHaveCount(6)
      await expect(page.locator('.ln-selo')).toHaveText('Sugerida')
      await ev.print(page, info, 'Seis materiais com borda, centro e peso; a 1.60 é sugerida para este grau')
    })
    await test.step('3. Simulador: monofocal x multifocal', async () => {
      await page.getByRole('button', { name: /^Continuar com/ }).click()
      await expect(page.locator('.ln-sim-tela')).toBeVisible()
      await page.getByRole('radio', { name: /^Monofocal para longe/ }).click()
      await page.waitForTimeout(800)
      await page.locator('.ln-sim').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await ev.print(page, info, 'Monofocal para longe: rua nítida, monitor e celular embaçados aos 48 anos')
      await page.getByRole('radio', { name: /^Multifocal básica/ }).click()
      await page.waitForTimeout(800)
      await page.locator('.ln-sim').evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      await ev.print(page, info, 'Multifocal básica: corredor nítido e laterais distorcidas')
    })
    await test.step('4. Tratamentos e resumo', async () => {
      await page.getByRole('button', { name: /^Continuar com/ }).click()
      await expect(page.getByRole('heading', { name: 'Tratamentos' })).toBeVisible()
      await page.locator('.ln-trat').filter({ hasText: 'Fotossensível' }).getByRole('checkbox', { name: 'Quero' }).check()
      await ev.print(page, info, 'Antes e depois de cada tratamento; fotossensível marcado')
      await page.getByRole('button', { name: 'Ver minha escolha' }).click()
      await expect(page.locator('.ln-texto')).toContainText('Multifocal básica')
      await expect(page.locator('.ln-texto')).toContainText('Fotossensível')
      await ev.print(page, info, 'Resumo pronto para levar à ótica')
    })
    await test.step('5. A escolha fica salva no aparelho', async () => {
      await page.reload()
      await expect(page.locator('.ln-texto')).toContainText('Multifocal básica', { timeout: 30000 })
    })
    await test.step('Sem erro de JavaScript', async () => {
      expect(erros, erros.join(' | ')).toHaveLength(0)
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
