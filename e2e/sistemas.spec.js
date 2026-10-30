import { test, expect } from '@playwright/test'

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
    info.annotations.push({ type: 'O que este teste faz', description: `Abre o ${nome} em modo demonstração, confirma que o painel carrega com dados de exemplo e abre alguns módulos no menu lateral — tudo sem tela de erro. Cada passo guarda um print como evidência.` })

    await test.step('1. Abrir a demonstração do sistema', async () => {
      await page.goto(`/sistemas/${slug}/app?beta=1`)
      await expect(page.locator('.sx-app')).toBeVisible({ timeout: 25000 })
      await expect(page.locator('.sx-marca')).toBeVisible()
      await info.attach('print — painel inicial', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    })

    let qtdModulos = 0
    await test.step('2. O menu lateral lista os módulos', async () => {
      const itens = page.locator('.sx-menu-item')
      await expect(itens.first()).toBeVisible()
      qtdModulos = await itens.count()
      expect(qtdModulos, 'o sistema deve ter ao menos um módulo no menu').toBeGreaterThan(0)
      info.annotations.push({ type: 'Evidência', description: `${qtdModulos} módulos encontrados no menu lateral.` })
    })

    await test.step('3. Abrir até 3 módulos e capturar print de cada', async () => {
      const itens = page.locator('.sx-menu-item')
      const total = Math.min(qtdModulos, 3)
      for (let i = 0; i < total; i++) {
        const nomeItem = (await itens.nth(i).innerText()).trim().replace(/\s+/g, ' ')
        await itens.nth(i).click()
        await page.waitForTimeout(500)
        await expect(page.locator('.sx-principal')).toBeVisible()
        await info.attach(`print — módulo "${nomeItem}"`, { body: await page.screenshot(), contentType: 'image/png' })
      }
    })

    await test.step('4. Conferir que não apareceu tela de erro', async () => {
      await expect(page.locator('text=/Application error|something went wrong|Erro ao carregar/i')).toHaveCount(0)
    })
  })
}
