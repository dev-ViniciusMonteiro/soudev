import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Ferramentas de família, festas e grupos (/ferramentas). Árvore, Mesas e Experiências não usam
// servidor (link compactado). Decida por Nós, Lista de Presentes e Divisão de Tarefas gravam no
// worker: esses passos só rodam com E2E_COMPARTILHADO=1 (para não criar dados de teste em produção).
const COMPARTILHADO = process.env.E2E_COMPARTILHADO === '1'

const limpar = (page) => page.addStyleTag({ content: '.cookie-banner,nextjs-portal{display:none!important}' }).catch(() => {})
async function abrir(page, slug, hash = '') {
  await page.goto(`/ferramentas/${slug}${hash}`)
  await limpar(page)
  await page.locator('.tool-card-main').scrollIntoViewIfNeeded()
  await expect(page.locator('.tool-card-main .gp')).toBeVisible({ timeout: 30000 })
  await page.waitForTimeout(500)
}
const verFerramenta = (page) => page.locator('.tool-card-main').scrollIntoViewIfNeeded()

function cenario(slug, nome, descricao, corpo, { servidor = false } = {}) {
  test(`Ferramenta · ${nome}`, async ({ browser }, info) => {
    info.annotations.push({ type: 'O que este teste faz', description: descricao })
    const ev = novaEvidencia('ferramenta', slug, nome)
    const erros = []
    const novo = async (viewport = { width: 1280, height: 900 }) => {
      const ctx = await browser.newContext({ viewport, baseURL: info.project.use.baseURL })
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {})
      const p = await ctx.newPage()
      p.on('pageerror', (e) => erros.push(String(e)))
      p.on('dialog', (d) => d.accept())
      return p
    }
    let ok = false
    try {
      if (servidor && !COMPARTILHADO) {
        const page = await novo()
        await abrir(page, slug)
        await ev.print(page, info, 'Tela inicial', 'A ferramenta abre com o formulário para criar.')
        ev.nota('Fluxo com servidor não executado', 'Rode com E2E_COMPARTILHADO=1 (de preferência contra o worker local) para testar criar, compartilhar e participar.')
      } else {
        await corpo({ novo, ev, info })
      }
      await test.step('Sem erro de JavaScript', async () => {
        expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
      })
      ok = true
    } finally {
      ev.salvar(ok)
    }
  })
}

cenario('arvore-genealogica', 'Árvore da família', 'Abre a árvore de exemplo, acrescenta um filho, compartilha e abre o link em outro navegador (somente leitura).', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  await test.step('1. Árvore de exemplo com ligações', async () => {
    await abrir(page, 'arvore-genealogica')
    await expect(page.locator('.av-svg path').first()).toBeAttached()
    await ev.print(page, info, 'Árvore por gerações', 'Avós, pais e netos com casais lado a lado e linhas de parentesco.')
  })
  await test.step('2. Acrescentar um filho', async () => {
    const antes = await page.locator('.av-pessoa').count()
    await page.locator('.av-pessoa', { hasText: 'Juliana Souza' }).click()
    await page.getByRole('button', { name: '＋ Filho(a)' }).click()
    await page.locator('.av-ficha input').first().fill('Bento Souza')
    await expect(page.locator('.av-pessoa')).toHaveCount(antes + 1)
    await ev.print(page, info, 'Filho acrescentado', 'A pessoa nova entra na geração certa, ligada à mãe.')
  })
  await test.step('3. Compartilhar e abrir em outro navegador', async () => {
    await page.getByRole('button', { name: 'Compartilhar', exact: true }).click()
    link = await page.locator('.gp-link input').inputValue()
    const outro = await novo()
    await outro.goto(link)
    await limpar(outro)
    await verFerramenta(outro)
    await expect(outro.locator('.gp-aviso', { hasText: 'somente leitura' })).toBeVisible()
    await ev.print(outro, info, 'Árvore aberta pelo link', 'Quem recebe vê a árvore e pode copiar para completar.')
  })
})

cenario('organizador-de-mesas', 'Organizador de mesas', 'Coloca convidados nas mesas, usa a organização automática e procura o lugar de um convidado.', async ({ novo, ev, info }) => {
  const page = await novo()
  await test.step('1. Mapa de mesas', async () => {
    await abrir(page, 'organizador-de-mesas')
    await ev.print(page, info, 'Mesas e convidados sem lugar', 'Cada mesa com os lugares em volta, coloridos pelo grupo.')
  })
  await test.step('2. Tocar no convidado e depois na mesa', async () => {
    const antes = await page.locator('.ms-livres .ms-chip').count()
    await page.locator('.ms-livres .ms-chip').first().click()
    await page.locator('.ms-mesa').nth(5).click({ position: { x: 20, y: 120 } })
    await expect(page.locator('.ms-livres .ms-chip')).toHaveCount(antes - 1)
  })
  await test.step('3. Organização automática e busca', async () => {
    await page.getByRole('button', { name: '✨ Organizar automático' }).click()
    await expect(page.locator('.ms-livres .ms-chip')).toHaveCount(0)
    await page.getByPlaceholder('Digite o seu nome').fill('Bianca')
    await expect(page.locator('.ms-busca-res').first()).toContainText('Mesa')
    await page.locator('.ms-busca-res').first().scrollIntoViewIfNeeded()
    await ev.print(page, info, 'Onde vou sentar?', 'Todos com lugar e a busca mostrando a mesa da convidada.')
  })
})

cenario('lista-de-experiencias', 'Lista de experiências', 'Acrescenta uma ideia, marca uma experiência como vivida com comentário e confere o progresso.', async ({ novo, ev, info }) => {
  const page = await novo()
  await test.step('1. Lista com progresso', async () => {
    await abrir(page, 'lista-de-experiencias')
    await ev.print(page, info, 'Lista de experiências', 'Anel de progresso, categorias e ideias prontas.')
  })
  await test.step('2. Marcar como vivida', async () => {
    await page.locator('.ex-item:not([data-feito]) .ex-check').first().click()
    await page.getByPlaceholder('Como foi? (opcional)').fill('Inesquecível')
    await page.getByRole('button', { name: '🎉 Vivi!' }).click()
    await expect(page.locator('.ex-nota', { hasText: 'Inesquecível' })).toBeVisible()
    await ev.print(page, info, 'Experiência vivida', 'Entra com a data e o comentário, e o progresso sobe.')
  })
})

cenario('decida-por-nos', 'Decida por Nós', 'Cria uma votação, vota, outra pessoa vota pelo link em outro navegador e o criador vê o resultado ao vivo e encerra.', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  await test.step('1. Criar a votação', async () => {
    await abrir(page, 'decida-por-nos')
    await page.getByRole('button', { name: '🍕 Restaurante' }).click()
    await ev.print(page, info, 'Criando a votação', 'Pergunta, opções e regras (múltipla, anônima, sugestões, prazo).')
    await page.getByRole('button', { name: 'Criar votação e pegar o link' }).click()
    await expect(page.locator('.vt-opcao').first()).toBeVisible()
    link = await page.locator('.gp-link input').inputValue()
  })
  await test.step('2. Votar', async () => {
    await page.locator('.vt-opcao', { hasText: 'Japonês' }).click()
    await page.getByPlaceholder('Seu nome (aparece para o grupo)').fill('Vinícius')
    await page.getByRole('button', { name: 'Votar' }).click()
    await expect(page.locator('.vt-cartao-resultado')).toBeVisible()
  })
  await test.step('3. Outra pessoa vota pelo link', async () => {
    const outra = await novo({ width: 390, height: 844 })
    await outra.goto(link)
    await limpar(outra)
    await verFerramenta(outra)
    await expect(outra.locator('.vt-pct')).toHaveCount(0)
    await outra.locator('.vt-opcao', { hasText: 'Pizzaria' }).click()
    await outra.getByPlaceholder('Seu nome (aparece para o grupo)').fill('Ana')
    await outra.getByRole('button', { name: 'Votar' }).click()
    await expect(outra.locator('.vt-cartao-resultado')).toBeVisible()
    await ev.print(outra, info, 'Voto pelo celular', 'Sem cadastro: o resultado só aparece depois de votar.')
  })
  await test.step('4. Resultado ao vivo e encerrar', async () => {
    await expect(page.locator('.gp-sub', { hasText: '2 voto' })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: '🔒 Encerrar votação' }).click()
    await expect(page.locator('.vt-cartao-resultado')).toContainText('Resultado final')
    await verFerramenta(page)
    await ev.print(page, info, 'Votação encerrada', 'Resultado final, quem votou e o link para compartilhar.')
  })
}, { servidor: true })

cenario('lista-de-presentes', 'Lista de presentes', 'Cria a lista do chá de bebê, um convidado reserva um presente e ele aparece como já escolhido para os outros.', async ({ novo, ev, info }) => {
  const page = await novo()
  let link = ''
  await test.step('1. Criar a lista', async () => {
    await abrir(page, 'lista-de-presentes')
    await page.getByPlaceholder('Ex.: Chá de bebê da Lara').fill('Chá de bebê da Lara')
    await ev.print(page, info, 'Lista sugerida', 'Presentes sugeridos para a ocasião, com valor, quantidade e link.')
    await page.getByRole('button', { name: 'Criar lista e pegar o link' }).click()
    await expect(page.locator('.lp-item').first()).toBeVisible()
    link = await page.locator('.gp-link input').inputValue()
  })
  await test.step('2. Convidado reserva um presente', async () => {
    const conv = await novo({ width: 390, height: 844 })
    await conv.goto(link)
    await limpar(conv)
    await conv.getByPlaceholder('Ex.: Tia Rosa').fill('Tia Rosa')
    await conv.locator('.lp-item', { hasText: 'Carrinho de bebê' }).getByRole('button', { name: 'Vou dar este' }).click()
    await expect(conv.locator('.lp-item[data-meu]')).toBeVisible()
    await conv.locator('.lp-item[data-meu]').scrollIntoViewIfNeeded()
    await ev.print(conv, info, 'Presente reservado', 'O convidado escolheu o carrinho e pode desistir se precisar.')
  })
  await test.step('3. Outro convidado vê como já escolhido', async () => {
    const outro = await novo()
    await outro.goto(link)
    await limpar(outro)
    await expect(outro.locator('.lp-item', { hasText: 'Carrinho de bebê' }).locator('button')).toHaveText('Já escolhido')
    await outro.locator('.lp-item', { hasText: 'Carrinho de bebê' }).scrollIntoViewIfNeeded()
    await ev.print(outro, info, 'Sem presente repetido', 'Para os outros convidados o carrinho já aparece como escolhido.')
  })
}, { servidor: true })

cenario('divisao-de-tarefas', 'Divisão de tarefas', 'Cria a casa com três pessoas, marca tarefas feitas e confere o placar.', async ({ novo, ev, info }) => {
  const page = await novo()
  await test.step('1. Criar a casa', async () => {
    await abrir(page, 'divisao-de-tarefas')
    await page.getByPlaceholder('Ex.: Apê 302, Família Lima, República Toca').fill('República Toca')
    const ins = page.locator('form .gp-linha input')
    await ins.nth(0).fill('Ana')
    await ins.nth(1).fill('Beto')
    await ins.nth(2).fill('Caio')
    await page.getByRole('button', { name: 'Criar e dividir as tarefas' }).click()
    await expect(page.locator('.dt-tarefa').first()).toBeVisible()
  })
  await test.step('2. Marcar tarefas feitas', async () => {
    await page.locator('select[aria-label="Quem é você"]').selectOption({ label: '🐼 Beto' })
    await page.locator('.dt-tarefa .dt-check').first().click()
    await page.locator('.dt-tarefa .dt-check').nth(2).click()
    await expect(page.locator('.dt-tarefa[data-feita]')).toHaveCount(2)
    await verFerramenta(page)
    await ev.print(page, info, 'Tarefas da semana', 'Diárias, semanais e mensais com responsável e pontos.')
  })
  await test.step('3. Placar', async () => {
    await page.locator('.gp-chip', { hasText: 'Placar' }).click()
    await expect(page.locator('.dt-membro[data-lider]')).toContainText('Beto')
    await ev.print(page, info, 'Placar da semana', 'Quem fez mais tarefas aparece com a coroa.')
  })
}, { servidor: true })
