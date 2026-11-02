import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Apps para profissões: o profissional usa o app e o cliente recebe por link (outro navegador).
// Nada vai para servidor: os dados viajam dentro do link (#d=...).

const limpar = (page) => page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
async function abrir(page, url) {
  await page.goto(url)
  await expect(page.locator('.dm-topo')).toBeVisible({ timeout: 30000 })
  await limpar(page)
  await page.waitForTimeout(500)
}
// guarda o endereço que o app tentaria abrir no WhatsApp
async function pegarZap(page, acao) {
  await page.evaluate(() => {
    window.__aberto = null
    window.open = (u) => {
      window.__aberto = u
      return null
    }
  })
  await acao()
  await page.waitForTimeout(300)
  return page.evaluate(() => window.__aberto)
}
const linkDentro = (zap) => decodeURIComponent(zap).match(/https?:\/\/\S+#d=[\w-]+/)?.[0]
const lerCopiado = (page) => page.evaluate(() => navigator.clipboard.readText())

function cenario(slug, nome, descricao, corpo) {
  test(`App · ${nome}`, async ({ browser }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: descricao })
    const ev = novaEvidencia('app', slug, nome)
    const erros = []
    const novo = async (viewport = { width: 1280, height: 860 }) => {
      const ctx = await browser.newContext({ viewport, baseURL: info.project.use.baseURL })
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
      const p = await ctx.newPage()
      p.on('pageerror', (e) => erros.push(String(e)))
      p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Teste' : undefined))
      return p
    }
    let ok = false
    try {
      await corpo({ novo, ev, info })
      await test.step('Sem erro de JavaScript', async () => {
        expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}

cenario('checklist-de-limpeza', 'Checklist de Limpeza', 'A diarista marca as tarefas por ambiente, anota um aviso, conclui e o cliente abre o relatório pelo link.', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  await test.step('1. Checklist da limpeza em andamento', async () => {
    await abrir(page, '/apps/checklist-de-limpeza/app')
    await page.locator('.pr-tarefa:not([data-feito])').first().click()
    await page.locator('textarea').fill('Acabou o desinfetante')
    await ev.print(page, info, 'Checklist por ambiente', 'Tarefas marcadas por cômodo, cronômetro e aviso para o cliente.')
  })
  await test.step('2. Concluir e gerar o relatório', async () => {
    await page.getByRole('button', { name: '✔ Concluir e gerar relatório' }).click()
    await page.getByRole('button', { name: 'Copiar link' }).click()
    link = await lerCopiado(page)
    expect(link).toContain('#d=')
    await ev.print(page, info, 'Relatório pronto', 'Link e resumo para o WhatsApp do cliente.')
  })
  await test.step('3. O cliente abre o relatório (outro navegador)', async () => {
    const cli = await novo({ width: 390, height: 844 })
    await cli.goto(link)
    await limpar(cli)
    await expect(cli.locator('.pr-rel')).toBeVisible()
    await expect(cli.locator('.dm-pro')).toContainText('desinfetante')
    await ev.print(cli, info, 'Relatório no celular do cliente', 'O cliente vê o checklist completo, o tempo e os avisos.')
  })
})

cenario('pet-relatorio', 'Pet Relatório', 'O cuidador registra passeio e humor do pet e o tutor abre o relatório do dia pelo link.', async ({ novo, ev, info }) => {
  const page = await novo()
  let zap = ''
  await test.step('1. Registrar o dia do pet', async () => {
    await abrir(page, '/apps/pet-relatorio/app')
    await page.getByRole('button', { name: '＋ Agora' }).nth(1).click()
    await page.locator('.dm-chip', { hasText: 'Tranquilo' }).click()
    await ev.print(page, info, 'Dia do pet', 'Refeições, passeios (xixi e cocô), remédios, humor e recado.')
  })
  await test.step('2. Enviar ao tutor', async () => {
    zap = await pegarZap(page, () => page.getByRole('button', { name: '📤 Enviar relatório ao tutor' }).click())
    expect(decodeURIComponent(zap)).toContain('Dia de Pipoca')
    ev.nota('Mensagem do WhatsApp', decodeURIComponent(zap).replace(/^.*text=/, '').split('\n').slice(0, 4).join(' · '))
  })
  await test.step('3. O tutor abre o relatório (outro navegador)', async () => {
    const tutor = await novo({ width: 390, height: 844 })
    await tutor.goto(linkDentro(zap))
    await limpar(tutor)
    await expect(tutor.locator('.pr-rel-cab h2')).toHaveText('Dia de Pipoca')
    await ev.print(tutor, info, 'Relatório no celular do tutor', 'Cartão do dia com humor, alimentação, passeios e recado.')
  })
})

cenario('aprova-foto', 'Aprova Foto', 'O fotógrafo manda a galeria, a cliente escolhe 3 fotos e comenta uma, e a escolha volta para o fotógrafo pelo link.', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  let zap = ''
  await test.step('1. Galeria e link para a cliente', async () => {
    await abrir(page, '/apps/aprova-foto/app')
    await page.locator('.dm-chip', { hasText: 'Família Souza' }).click()
    await page.getByRole('button', { name: '🔗 Link para o cliente' }).click()
    await page.getByRole('button', { name: 'Copiar link' }).click()
    link = await lerCopiado(page)
    await ev.print(page, info, 'Galeria do fotógrafo', 'Limite de fotos, prazo e link para a cliente.')
  })
  await test.step('2. A cliente escolhe e comenta (outro navegador)', async () => {
    const cli = await novo({ width: 390, height: 844 })
    await cli.goto(link)
    await limpar(cli)
    for (const i of [0, 2, 4]) await cli.locator('.af-coracao').nth(i).click()
    await cli.locator('.af-abrir').nth(2).click()
    await cli.getByPlaceholder(/Comentário para a edição/).fill('Clarear o rosto')
    await ev.print(cli, info, 'Foto ampliada com comentário', 'A cliente amplia, escolhe e deixa um pedido para a edição.')
    await cli.locator('.dm-x').click()
    await cli.getByPlaceholder('Seu nome').fill('Carla Souza')
    await expect(cli.locator('.af-barra-fixa b')).toHaveText('3 de 12 escolhidas')
    await ev.print(cli, info, 'Escolha da cliente', '3 de 12 fotos marcadas com ❤.')
    zap = await pegarZap(cli, () => cli.getByRole('button', { name: 'Enviar para o fotógrafo pelo WhatsApp' }).click())
    expect(decodeURIComponent(zap)).toContain('IMG_0001, IMG_0003, IMG_0005')
  })
  await test.step('3. O fotógrafo recebe a escolha', async () => {
    const aba = await page.context().newPage()
    await aba.goto(linkDentro(zap))
    await limpar(aba)
    await expect(aba.locator('text=Escolha de Carla Souza recebida')).toBeVisible()
    await expect(aba.locator('.af-com')).toHaveCount(1)
    await ev.print(aba, info, 'Escolha recebida', 'As fotos escolhidas e o comentário aparecem para o fotógrafo, prontas para o Lightroom.')
  })
})

cenario('aprova-projeto', 'Aprova Projeto', 'A designer manda as versões, o cliente compara, aprova a versão 3 e o retorno entra no histórico.', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  let zap = ''
  await test.step('1. Projeto com versões', async () => {
    await abrir(page, '/apps/aprova-projeto/app')
    await page.getByRole('button', { name: '🔗 Link para o cliente' }).click()
    await page.getByRole('button', { name: 'Copiar link' }).click()
    link = await lerCopiado(page)
    await ev.print(page, info, 'Versões do projeto', 'Cada versão com prévia, explicação e retornos do cliente.')
  })
  await test.step('2. O cliente compara e aprova (outro navegador)', async () => {
    const cli = await novo()
    cli.removeAllListeners('dialog')
    cli.on('dialog', (d) => d.dismiss())
    await cli.goto(link)
    await limpar(cli)
    await cli.locator('.dm-chip', { hasText: 'Comparar' }).click()
    await ev.print(cli, info, 'Comparando versões', 'Versão 3 ao lado da versão 1.')
    await cli.locator('textarea').fill('Ficou ótimo, pode seguir com essa')
    await cli.getByRole('button', { name: /Aprovar v3/ }).click()
    zap = await pegarZap(cli, () => cli.getByRole('button', { name: /Enviar 1 retorno/ }).click())
  })
  await test.step('3. A designer recebe a aprovação', async () => {
    const aba = await page.context().newPage()
    await aba.goto(linkDentro(zap))
    await limpar(aba)
    await expect(aba.locator('.dm-titulo .dm-tag')).toHaveText('Aprovado')
    await ev.print(aba, info, 'Projeto aprovado', 'O retorno entrou no histórico e o projeto ficou como aprovado.')
  })
})
