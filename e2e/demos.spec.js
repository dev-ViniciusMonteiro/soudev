import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Demos de produto (/apps): abrem com dados de exemplo, fazem o fluxo principal de cada uma
// (cadastrar, calcular, simular) e guardam prints. Tudo roda no navegador, sem servidor.

const limpar = (page) => page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
const menu = (page, nome) => page.locator('.dm-menu button', { hasText: nome }).click()

async function abrir(page, slug) {
  await page.goto(`/apps/${slug}/app`)
  await expect(page.locator('.dm-topo')).toBeVisible({ timeout: 30000 })
  await limpar(page)
  await page.waitForTimeout(600)
}

function cenario(slug, nome, descricao, passos) {
  test(`Demo · ${nome}`, async ({ page }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: descricao })
    const ev = novaEvidencia('app', slug, nome)
    const erros = []
    page.on('pageerror', (e) => erros.push(String(e)))
    page.on('dialog', (d) => d.accept())
    let ok = false
    try {
      await test.step('1. Abrir a demonstração', async () => {
        await abrir(page, slug)
        await ev.print(page, info, 'Demonstração aberta', 'O app abriu com os dados de exemplo e o aviso de demonstração.')
      })
      await passos(page, info, ev)
      await test.step('Sem erro de JavaScript', async () => {
        expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}

cenario('obra-organizada', 'Obra Organizada', 'Abre a obra de exemplo, confere o painel previsto x realizado, lança um gasto, vê o cronograma e as fotos.', async (page, info, ev) => {
  await test.step('2. Painel com orçamento e alertas', async () => {
    await expect(page.locator('.dm-kpi').first()).toContainText('Orçamento')
    ev.nota('Indicadores', (await page.locator('.dm-kpi').allInnerTexts()).map((t) => t.replace(/\n/g, ' ')).join(' · '))
  })
  await test.step('3. Lançar um gasto', async () => {
    await menu(page, 'Gastos')
    const antes = await page.locator('.dm-tabela tbody tr').count()
    await page.getByRole('button', { name: '＋ Lançar gasto' }).click()
    await page.getByPlaceholder('Ex.: Cimento CP-II 50 sacos').fill('Cimento CP-II (teste)')
    await page.locator('.dm-janela input[type=number]').first().fill('850')
    await ev.print(page, info, 'Lançando um gasto', 'Formulário com descrição, valor, etapa, categoria e fornecedor.')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.locator('.dm-tabela tbody tr')).toHaveCount(antes + 1)
    await ev.print(page, info, 'Gasto lançado', 'O gasto entrou na lista com a etapa e a situação de pagamento.')
  })
  await test.step('4. Cronograma e fotos', async () => {
    await menu(page, 'Etapas')
    await expect(page.locator('.ob-gantt-linha').first()).toBeVisible()
    await ev.print(page, info, 'Cronograma das etapas', 'Linha do tempo com o andamento de cada etapa e o dia de hoje marcado.')
    await menu(page, 'Fotos')
    await ev.print(page, info, 'Fotos do andamento', 'Galeria por etapa (ilustrações de demonstração).')
  })
})

cenario('meu-carro', 'Meu Carro', 'Confere custo por km e consumo, vê os lembretes de revisão e registra um abastecimento.', async (page, info, ev) => {
  await test.step('2. Painel do veículo', async () => {
    await expect(page.locator('.dm-kpi').first()).toContainText('Custo por km')
    ev.nota('Indicadores', (await page.locator('.dm-kpi').allInnerTexts()).map((t) => t.replace(/\n/g, ' ')).join(' · '))
  })
  await test.step('3. Lembretes de manutenção', async () => {
    await menu(page, 'Lembretes')
    await expect(page.locator('.dm-lista li').first()).toBeVisible()
    await ev.print(page, info, 'Lembretes', 'Próxima troca calculada pelo km ou pelo tempo, o que vier primeiro.')
  })
  await test.step('4. Registrar abastecimento', async () => {
    await menu(page, 'Abastecer')
    const antes = await page.locator('.dm-tabela tbody tr').count()
    await page.getByRole('button', { name: '＋ Abasteci' }).click()
    const nums = page.locator('.dm-janela input[type=number]')
    await nums.nth(1).fill('38')
    await nums.nth(2).fill('225')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.locator('.dm-tabela tbody tr')).toHaveCount(antes + 1)
    await ev.print(page, info, 'Abastecimento registrado', 'Entrou no histórico com preço por litro e consumo.')
  })
})

cenario('garantia-facil', 'Garantia Fácil', 'Mostra os produtos com o prazo de cada garantia e cadastra um produto pela leitura (simulada) da nota fiscal.', async (page, info, ev) => {
  await test.step('2. Cadastrar pela nota fiscal', async () => {
    const antes = await page.locator('.gr-card').count()
    await page.getByRole('button', { name: '📷 Fotografar nota' }).click()
    await page.getByRole('button', { name: 'Usar nota de exemplo' }).click()
    await page.waitForTimeout(300)
    await ev.print(page, info, 'Lendo a nota', 'A leitura da nota é simulada na demonstração.')
    await page.getByRole('button', { name: 'Salvar produto' }).click({ timeout: 8000 })
    await expect(page.locator('.gr-card')).toHaveCount(antes + 1)
    await ev.print(page, info, 'Produto cadastrado', 'O produto entrou na lista com a data de fim da garantia.')
  })
  await test.step('3. Alertas e como acionar', async () => {
    await menu(page, 'Alertas')
    await ev.print(page, info, 'Alertas de vencimento', 'Garantias vencendo e vencidas em ordem.')
    await menu(page, 'Acionar')
    await expect(page.locator('.gr-passos li')).toHaveCount(5)
  })
})

cenario('gestao-de-aluguel', 'Gestão de Aluguel', 'Confere o mês em atraso com multa e juros, a mensagem de cobrança no WhatsApp e aplica o reajuste anual.', async (page, info, ev) => {
  await test.step('2. Atraso com multa e juros', async () => {
    const zap = await page.locator('a', { hasText: 'Cobrar no WhatsApp' }).first().getAttribute('href')
    expect(decodeURIComponent(zap)).toContain('multa')
    ev.nota('Mensagem de cobrança', decodeURIComponent(zap).replace(/^.*text=/, '').slice(0, 200))
    await ev.print(page, info, 'Painel com atraso', 'Mês atrasado com valor atualizado e botão de cobrança.')
  })
  await test.step('3. Reajuste anual', async () => {
    await menu(page, 'Contrato')
    await page.getByRole('button', { name: 'Aplicar reajuste' }).click()
    await expect(page.locator('text=/→/').first()).toBeVisible()
    await ev.print(page, info, 'Reajuste aplicado', 'O novo valor entra no histórico de reajustes e nos próximos meses.')
  })
  await test.step('4. Pagamentos', async () => {
    await menu(page, 'Pagamentos')
    await ev.print(page, info, 'Histórico de pagamentos', 'Pago, pago com atraso, em aberto ou atrasado, mês a mês.')
  })
})

cenario('achei-perdi', 'Achei / Perdi', 'Filtra o mural, abre um anúncio e conversa pelo chat protegido para provar que é o dono.', async (page, info, ev) => {
  await test.step('2. Filtrar achados', async () => {
    await page.locator('.dm-chip', { hasText: 'Achados' }).click()
    await ev.print(page, info, 'Mural filtrado', 'Só os objetos achados, com bairro e data.')
  })
  await test.step('3. Chat protegido', async () => {
    await page.locator('.ap-card').first().click()
    await page.locator('.dm-janela .dm-btn').last().click()
    await page.getByPlaceholder('Escreva sua mensagem…').fill('É um chaveiro do Corinthians')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.locator('.ap-msg[data-de="outro"]').last()).not.toHaveText('digitando…', { timeout: 6000 })
    await ev.print(page, info, 'Conversa com o achador', 'A pergunta de verificação aparece e a outra pessoa (simulada) responde.')
  })
})

cenario('evento-facil', 'Evento Fácil', 'Confirma presença como convidado, recebe o QR Code e faz o check-in na portaria com o código.', async (page, info, ev) => {
  let codigo = ''
  await test.step('2. Confirmar presença como convidado', async () => {
    await page.getByRole('button', { name: 'Ver como convidado' }).click()
    await page.getByRole('button', { name: 'Vou sim!' }).click()
    await expect(page.locator('.ev-qr img')).toBeVisible()
    codigo = (await page.locator('.ev-rsvp small').innerText()).replace('Código ', '').trim()
    await ev.print(page, info, 'Presença confirmada', `O convidado recebe o QR Code de entrada (código ${codigo}).`)
    await page.locator('.dm-x').click()
  })
  await test.step('3. Check-in na portaria', async () => {
    await menu(page, 'Check-in')
    await page.getByPlaceholder('Ou digite o código (ex.: A1B2C3)').fill(codigo)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.locator('.dm-pro b')).toContainText('Bem-vindo')
    await ev.print(page, info, 'Check-in feito', 'A chegada entra na lista e o contador de pessoas atualiza.')
  })
})
