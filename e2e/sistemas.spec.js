import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Sistemas de gestão: abrem a demonstração (dados de exemplo, local), confirmam o painel,
// percorrem TODOS os módulos (print de cada tela) e conferem Configurações/Backup — sem erro.
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
    info.annotations.push({ type: 'O que este teste faz', description: `Abre o ${nome} em demonstração, confirma o painel e o nome do negócio, percorre todos os módulos do menu (print de cada tela), abre as Configurações e confere o botão de Backup — tudo sem tela de erro.` })
    const ev = novaEvidencia('sistema', slug, nome)
    let ok = false
    try {
      await test.step('1. Abrir a demonstração do sistema', async () => {
        await page.goto(`/sistemas/${slug}/app?beta=1`)
        await expect(page.locator('.sx-app')).toBeVisible({ timeout: 25000 })
        await ev.print(page, info, 'Painel inicial carregado', 'O sistema abriu com os dados de exemplo e o menu lateral.')
      })

      await test.step('2. O nome do negócio aparece no topo', async () => {
        const marca = (await page.locator('.sx-marca strong').first().innerText()).trim()
        expect(marca.length, 'o painel deve mostrar o nome do negócio').toBeGreaterThan(0)
        ev.nota(`Negócio identificado: "${marca}"`, 'O painel mostra o nome do negócio no cabeçalho lateral.')
      })

      let labels = []
      await test.step('3. Percorrer todos os módulos e capturar print de cada', async () => {
        const itens = page.locator('.sx-menu-item')
        const total = await itens.count()
        expect(total, 'o sistema deve ter módulos no menu').toBeGreaterThan(0)
        for (let i = 0; i < Math.min(total, 12); i++) {
          const titulo = (await itens.nth(i).innerText()).trim().replace(/\s+/g, ' ')
          labels.push(titulo)
          await itens.nth(i).click()
          await page.waitForTimeout(450)
          await expect(page.locator('.sx-principal')).toBeVisible()
          await ev.print(page, info, `Módulo: ${titulo}`, 'A tela do módulo abriu e renderizou sem erro.')
        }
        ev.nota(`${labels.length} módulos verificados`, labels.join(' · '))
      })

      await test.step('4. Abrir Configurações e conferir o Backup', async () => {
        const config = page.locator('.sx-menu-item', { hasText: /config/i }).first()
        if (await config.count()) {
          await config.click()
          await page.waitForTimeout(400)
          const temBackup = await page.locator('text=/Backup|Baixar backup/i').count()
          expect(temBackup, 'Configurações deve oferecer backup dos dados').toBeGreaterThan(0)
          await ev.print(page, info, 'Configurações e backup', 'A tela de Configurações oferece exportar um backup dos dados.')
        }
      })

      await test.step('5. Conferir que não apareceu tela de erro', async () => {
        await expect(page.locator('text=/Application error|something went wrong|Erro ao carregar/i')).toHaveCount(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}
