import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Central do Wi-Fi: cola a lista do roteador, identifica fabricantes, guarda apelidos, destaca o aparelho novo,
// mostra o guia por roteador e faz o check-up de segurança.

test('Ferramenta · Central do Wi-Fi', async ({ page }, info) => {
  info.annotations.push({ type: 'O que este teste faz', description: 'Cola uma lista de 7 aparelhos, confere fabricante e tipo, marca conhecidos e um para bloquear, cola de novo com um aparelho a mais (aparece como novo), abre o guia da Vivo e responde o check-up.' })
  const ev = novaEvidencia('ferramenta', 'quem-esta-no-meu-wifi', 'Central do Wi-Fi')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  let ok = false
  try {
    await test.step('1. Lista colada e aparelhos identificados', async () => {
      await page.goto('/ferramentas/quem-esta-no-meu-wifi')
      await page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
      await page.getByRole('button', { name: 'Ver um exemplo' }).click()
      await expect(page.locator('.cw-ap')).toHaveCount(7)
      await expect(page.locator('.cw-ap').nth(0)).toContainText('Samsung')
      await expect(page.locator('.cw-ap').nth(1)).toContainText('Apple')
      await expect(page.locator('.cw-ap').nth(5)).toContainText('privado')
      await page.locator('.cw-lista').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'Sete aparelhos: fabricante pelo MAC e tipo provável (celular, TV, computador, lâmpada, Alexa)')
    })
    await test.step('2. Apelidos, situação e aparelho novo', async () => {
      await page.locator('.cw-ap').nth(0).getByRole('button', { name: /Conhecido/ }).click()
      await page.locator('.cw-ap').nth(5).getByRole('button', { name: /Bloquear/ }).click()
      await page.locator('.cw-apelido').nth(0).fill('Celular do Vinicius')
      await page.fill('.cw-texto', (await page.inputValue('.cw-texto')) + '\nNotebook-Visita\t192.168.0.160\tF0:D5:BF:AA:BB:CC')
      await page.getByRole('button', { name: 'Identificar aparelhos' }).click()
      await expect(page.locator('.cw-ap.novo')).toHaveCount(1)
      await expect(page.locator('.cw-apelido').nth(0)).toHaveValue('Celular do Vinicius')
      await page.locator('.cw-resumo').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'Na segunda leitura, o notebook que chegou aparece como NOVO; apelidos e marcações ficaram guardados')
    })
    await test.step('3. Guia do roteador', async () => {
      await page.getByRole('tab', { name: /Como ver/ }).click()
      await page.getByRole('button', { name: 'Modem da Vivo' }).click()
      await expect(page.locator('.cw-rot')).toContainText('192.168.15.1')
      await ev.print(page, info, 'Guia: como achar o endereço do roteador e onde ver e bloquear no modem da Vivo')
    })
    await test.step('4. Check-up de segurança', async () => {
      await page.getByRole('tab', { name: /Check-up/ }).click()
      const q = page.locator('.cw-perguntas li')
      const resp = ['Sim', 'Não', 'Sim', 'Sim', 'Não', 'Não', 'Não sei', 'Não', 'Sim']
      for (let i = 0; i < resp.length; i++) await q.nth(i).getByRole('button', { name: resp[i], exact: true }).click()
      await page.fill('.cw-senha', 'casa1234')
      await expect(page.locator('.cw-forca')).toContainText('Fraca')
      await expect(page.locator('.cw-nota')).toBeVisible()
      await page.locator('.cw-nota').scrollIntoViewIfNeeded()
      await ev.print(page, info, 'Nota do Wi-Fi, o que arrumar e a força da senha (fica só no aparelho)')
    })
    await test.step('Sem erro de JavaScript', async () => {
      expect(erros, erros.join(' | ')).toHaveLength(0)
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
