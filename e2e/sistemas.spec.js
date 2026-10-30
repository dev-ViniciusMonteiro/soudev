import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Sistemas de gestão: abrem a demonstração (dados de exemplo, local), confirmam que o
// painel carrega e navegam pelos módulos, guardando um print de cada etapa como evidência.
const SISTEMAS = [
  ['mei-na-mao', 'MEI na Mão'],
  ['restaurante-delivery', 'Restaurante e Delivery'],
  ['mercadinho-pdv', 'Mercadinho, Loja e Varejo'],
  ['barbearia-salao', 'Barbearia e Salão de Beleza'],
  ['assistencia-tecnica', 'Assistência Técnica e Oficina'],
  ['academia-studio', 'Academia, Studio e Escola'],
  ['petshop', 'Pet Shop e Banho e Tosa'],
  ['crm-vendas', 'CRM e Prestadores de Serviço'],
]

for (const [slug, nome] of SISTEMAS) {
  test(`Sistema · ${nome}`, async ({ page }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: `Abre o ${nome} em modo demonstração, confirma que o painel carrega com dados de exemplo e abre módulos do menu — sem tela de erro. Cada etapa guarda um print.` })
    const ev = novaEvidencia('sistema', slug, nome)
    let ok = false
    try {
      await test.step('1. Abrir a demonstração do sistema', async () => {
        await page.goto(`/sistemas/${slug}/app?beta=1`)
        await expect(page.locator('.sx-app')).toBeVisible({ timeout: 25000 })
        await expect(page.locator('.sx-marca')).toBeVisible()
        await ev.print(page, info, 'Painel inicial carregado', 'O sistema abriu com os dados de exemplo e o menu lateral.')
      })

      let qtd = 0
      await test.step('2. O menu lateral lista os módulos', async () => {
        const itens = page.locator('.sx-menu-item')
        await expect(itens.first()).toBeVisible()
        qtd = await itens.count()
        expect(qtd, 'o sistema deve ter ao menos um módulo').toBeGreaterThan(0)
        ev.nota(`Menu com ${qtd} módulos`, 'O sistema expõe seus módulos no menu lateral.')
      })

      await test.step('3. Abrir módulos e capturar print de cada', async () => {
        const itens = page.locator('.sx-menu-item')
        const total = Math.min(qtd, 3)
        for (let i = 0; i < total; i++) {
          const titulo = (await itens.nth(i).innerText()).trim().replace(/\s+/g, ' ')
          await itens.nth(i).click()
          await page.waitForTimeout(500)
          await expect(page.locator('.sx-principal')).toBeVisible()
          await ev.print(page, info, `Módulo "${titulo}"`, 'A tela do módulo abriu sem erro.')
        }
      })

      await test.step('4. Conferir que não apareceu tela de erro', async () => {
        await expect(page.locator('text=/Application error|something went wrong|Erro ao carregar/i')).toHaveCount(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}
