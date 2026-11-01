import { test, expect } from '@playwright/test'
import { novaEvidencia } from './evidencia.js'

// Windows 98 (recriação): percorre os fluxos e confere as regras do original, com print de cada passo.
// Também compara as cores e medidas da interface com os valores do esquema "Padrão do Windows" do 98.
//   npx playwright test -g "Windows 98"

const URL = '/apps/windows-98/app'

// Valores do esquema padrão do Windows 98 (cores do sistema e medidas da barra de tarefas/título).
const REFERENCIA = {
  mesa: ['Área de trabalho (Desktop)', 'rgb(0, 128, 128)', '#008080 (verde-azulado)'],
  face: ['Face dos botões e barras (ButtonFace)', 'rgb(192, 192, 192)', '#C0C0C0'],
  titulo1: ['Título ativo, início do degradê', 'rgb(0, 0, 128)', '#000080'],
  titulo2: ['Título ativo, fim do degradê', 'rgb(16, 132, 208)', '#1084D0'],
  inativo1: ['Título inativo, início do degradê', 'rgb(128, 128, 128)', '#808080'],
  inativo2: ['Título inativo, fim do degradê', 'rgb(181, 181, 181)', '#B5B5B5'],
  selecao: ['Item selecionado no menu (Highlight)', 'rgb(0, 0, 128)', '#000080'],
  barra: ['Altura da barra de tarefas', '28px', '28 px'],
  tituloAltura: ['Altura da barra de título', '18px', '18 px'],
  fonte: ['Tamanho da fonte da interface (8 pt)', '11px', '11 px'],
}

const janela = (page, app) => page.locator(`.w98-janela[data-janela="${app}"]`)
const fecharJanela = (page, app) => janela(page, app).locator('.w98-titulo-botao.fechar').click()
const msg = (page) => page.locator('.w98-janela[data-janela="msg"]').last()

async function abrirPeloIniciar(page, caminho) {
  await page.click('[data-testid=w98-iniciar]')
  for (const item of caminho.slice(0, -1)) {
    await page.hover(`.w98-menu [data-item="${item}"]`)
    await page.waitForTimeout(250)
  }
  await page.click(`.w98-menu [data-item="${caminho.at(-1)}"]`)
}

test('App · Windows 98', async ({ page, browser }, info) => {
  test.setTimeout(300000)
  info.annotations.push({
    type: 'O que este teste faz',
    description:
      'Liga o Windows 98 (BIOS e tela de abertura), compara as cores e medidas com o esquema padrão do 98 e percorre os fluxos: menu Iniciar, Campo Minado, Calculadora, Bloco de notas com salvar, Explorer e Lixeira, área de trabalho, janelas, Executar, MS-DOS, Paint, Internet Explorer, Propriedades de Vídeo, proteção de tela, desligar e celular — com print de cada passo.',
  })
  const ev = novaEvidencia('app', 'windows-98', 'Windows 98')
  const erros = []
  page.on('pageerror', (e) => erros.push(String(e)))
  let ok = false
  try {
    await test.step('1. Ligar o computador: BIOS e tela de abertura', async () => {
      await page.goto(URL)
      await page.evaluate(() => {
        localStorage.removeItem('win98.disco.v1')
        localStorage.removeItem('win98.config.v1')
      })
      await page.reload()
      await expect(page.getByTestId('w98-bios')).toBeVisible({ timeout: 30000 })
      await expect(page.getByTestId('w98-bios')).toContainText('Teste de memória', { timeout: 5000 })
      await ev.print(page, info, 'Inicialização (BIOS)', 'O computador liga mostrando a BIOS: teste de memória, discos IDE e "Iniciando o Windows 98...".')
      await expect(page.getByTestId('w98-abertura')).toBeVisible({ timeout: 8000 })
      await ev.print(page, info, 'Tela de abertura', 'Céu com nuvens e a barra animada embaixo, como na abertura do 98.')
      await expect(page.getByTestId('w98-area-icones')).toBeVisible({ timeout: 8000 })
      await expect(page.locator('[data-icone="Meu computador"]')).toBeVisible()
      await expect(page.locator('[data-icone="Lixeira"]')).toBeVisible()
      await ev.print(page, info, 'Área de trabalho', 'Ícones Meu computador, Meus documentos, Internet Explorer, Ambiente de rede e Lixeira; barra de tarefas com Iniciar, Inicialização rápida e relógio.')
    })

    await test.step('2. Comparar cores e medidas com o Windows 98 original', async () => {
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Calculadora'])
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Bloco de notas'])
      await page.click('[data-testid=w98-iniciar]')
      await page.hover('.w98-menu [data-item="Programas"]')
      await page.waitForTimeout(300)
      const medido = await page.evaluate(() => {
        const cs = (sel) => getComputedStyle(document.querySelector(sel))
        const cores = (bg) => bg.match(/rgb\([^)]+\)/g) || []
        const ativa = cores(cs('.w98-janela.ativa > .w98-titulo').backgroundImage)
        const inativa = cores(cs('.w98-janela:not(.ativa) > .w98-titulo').backgroundImage)
        return {
          mesa: cs('[data-testid=w98-mesa]').backgroundColor,
          face: cs('[data-testid=w98-barra]').backgroundColor,
          titulo1: ativa[0],
          titulo2: ativa[1],
          inativo1: inativa[0],
          inativo2: inativa[1],
          selecao: cs('.w98-menu-item.realce').backgroundColor,
          barra: cs('[data-testid=w98-barra]').height,
          tituloAltura: cs('.w98-janela.ativa > .w98-titulo').height,
          fonte: cs('[data-testid=w98]').fontSize,
        }
      })
      await ev.print(page, info, 'Comparação visual', 'Calculadora inativa (título cinza), Bloco de notas ativo (título azul) e o menu Iniciar aberto com o item realçado, para medir as cores do sistema.')
      const linhas = Object.entries(REFERENCIA).map(([k, [nome, esperado, legivel]]) => `${medido[k] === esperado ? '✓' : '✗'} ${nome}: medido ${medido[k]} · Windows 98 ${legivel}`)
      ev.nota('Fidelidade ao esquema padrão do Windows 98', linhas.join('\n'))
      for (const [k, [nome, esperado]] of Object.entries(REFERENCIA)) expect(medido[k], nome).toBe(esperado)
      await page.keyboard.press('Escape')
      await page.mouse.click(700, 600)
      await fecharJanela(page, 'bloco')
      await fecharJanela(page, 'calculadora')
    })

    await test.step('3. Menu Iniciar › Programas › Acessórios › Jogos', async () => {
      await page.click('[data-testid=w98-iniciar]')
      await expect(page.getByTestId('w98-menu-iniciar')).toBeVisible()
      await expect(page.locator('.w98-iniciar-faixa')).toContainText('Windows98')
      for (const item of ['Programas', 'Acessórios', 'Jogos']) {
        await page.hover(`.w98-menu [data-item="${item}"]`)
        await page.waitForTimeout(250)
      }
      await expect(page.locator('.w98-menu [data-item="Campo minado"]')).toBeVisible()
      await ev.print(page, info, 'Menu Iniciar com submenus', 'A faixa "Windows98" na lateral e os submenus abrindo ao passar o mouse, como no original.')
      await page.click('.w98-menu [data-item="Campo minado"]')
    })

    await test.step('4. Campo Minado: primeiro clique seguro, bandeira, níveis', async () => {
      const campo = page.getByTestId('w98-campo')
      await expect(campo.locator('[data-casa]')).toHaveCount(81)
      const leds = janela(page, 'minado').locator('.w98-led')
      await expect(leds.first()).toHaveAttribute('aria-label', '10')
      await ev.print(page, info, 'Campo Minado (Iniciante)', 'Tabuleiro 9×9 com 10 minas, contadores em LED e a carinha.')
      await campo.locator('[data-casa="40"]').click()
      await expect(campo).not.toHaveAttribute('data-estado', 'perdeu')
      await expect(campo).toHaveAttribute('data-estado', /jogando|ganhou/)
      ev.nota('Regra: primeiro clique nunca é mina', 'O primeiro clique abriu a casa sem explodir, como no Windows 98 (se houvesse mina, ela muda de lugar).')
      const fechada = campo.locator('.w98-casa:not(.aberta)').first()
      await fechada.click({ button: 'right' })
      await expect(leds.first()).toHaveAttribute('aria-label', '9')
      await ev.print(page, info, 'Primeiro clique e bandeira', 'O primeiro clique abriu sem explodir e o botão direito marcou uma bandeira: o contador caiu de 010 para 009 e o relógio começou.')
      await janela(page, 'minado').locator('[data-menu="Jogo"]').click()
      await page.click('.w98-menu [data-item="Intermediário"]')
      await expect(campo.locator('[data-casa]')).toHaveCount(256)
      await expect(leds.first()).toHaveAttribute('aria-label', '40')
      await ev.print(page, info, 'Nível Intermediário', 'Jogo › Intermediário: 16×16 com 40 minas e a janela se ajusta ao tamanho do campo.')
      await janela(page, 'minado').locator('[data-menu="Jogo"]').click()
      await page.click('.w98-menu [data-item="Iniciante"]')
      await fecharJanela(page, 'minado')
    })

    await test.step('5. Calculadora: conta da esquerda para a direita, "=" repetido e divisão por zero', async () => {
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Calculadora'])
      const visor = page.getByTestId('w98-visor')
      for (const t of ['2', '+', '3', '*', '4', '=']) await page.click(`[data-tecla="${t}"]`)
      await expect(visor).toHaveText('20,')
      await ev.print(page, info, 'Calculadora: 2 + 3 × 4 = 20', 'Como no 98, a Calculadora Padrão faz a conta na ordem digitada (não há precedência), e o visor mostra a vírgula: "20,".')
      await page.click('[data-tecla="C"]')
      await page.keyboard.type('200+10%')
      await expect(visor).toHaveText('20,')
      ev.nota('Regra: porcentagem', 'Pelo teclado: 200 + 10 % mostra 20, (10% do primeiro número).')
      await page.click('[data-tecla="C"]')
      for (const t of ['1', '/', '0', '=']) await page.click(`[data-tecla="${t}"]`)
      await expect(visor).toHaveText('Não é possível dividir por zero.')
      await ev.print(page, info, 'Divisão por zero', 'A mensagem do Windows aparece no visor; só C/CE ou um número limpam.')
      await fecharJanela(page, 'calculadora')
    })

    await test.step('6. Bloco de notas: pergunta antes de fechar e salva no disco C:', async () => {
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Bloco de notas'])
      await page.locator('[aria-label="Texto do documento"]').fill('Minha primeira nota no Windows 98.')
      await fecharJanela(page, 'bloco')
      await expect(msg(page)).toContainText('O texto do arquivo Sem título foi alterado.')
      await ev.print(page, info, 'Pergunta ao fechar', '"O texto do arquivo Sem título foi alterado. Deseja salvar as alterações?" com Sim, Não e Cancelar.')
      await msg(page).locator('[data-botao="&Sim"]').click()
      const dialogo = janela(page, 'arquivo')
      await expect(dialogo).toBeVisible()
      await expect(dialogo.locator('[aria-label="Nome do arquivo"]')).toHaveValue('*.txt')
      await dialogo.locator('[aria-label="Nome do arquivo"]').fill('Minha nota')
      await ev.print(page, info, 'Salvar como', 'Caixa "Salvar como" em Meus documentos, com o tipo "Documentos de texto (*.txt)".')
      await dialogo.locator('[aria-label="Nome do arquivo"]').press('Enter')
      await expect(janela(page, 'bloco')).toHaveCount(0)
      ev.nota('Regra: extensão automática', 'Digitado "Minha nota", o arquivo foi salvo como "Minha nota.txt" e o Bloco de notas fechou.')
    })

    await test.step('7. Explorer e Lixeira: excluir e restaurar', async () => {
      await page.dblclick('[data-icone="Meus documentos"]')
      const ex = janela(page, 'explorer')
      await expect(ex.locator('[data-item="Minha nota.txt"]')).toBeVisible()
      await ex.locator('[data-item="Minha nota.txt"]').click()
      await expect(ex.locator('.w98-web')).toContainText('Documento de texto')
      await ev.print(page, info, 'Meus documentos', 'O arquivo salvo aparece na pasta; o painel da esquerda mostra o tipo e a data, como na visualização Web do 98.')
      await ex.locator('[data-acao="excluir"]').click()
      await expect(msg(page)).toContainText("Tem certeza de que deseja enviar 'Minha nota.txt' para a Lixeira?")
      await msg(page).locator('[data-botao="&Sim"]').click()
      await expect(ex.locator('[data-item="Minha nota.txt"]')).toHaveCount(0)
      await expect(page.locator('[data-icone="Lixeira"] [data-icone-nome="lixeiraCheia"]')).toBeVisible()
      await fecharJanela(page, 'explorer')
      await page.dblclick('[data-icone="Lixeira"]')
      await expect(ex.locator('[data-item="Minha nota.txt"]')).toBeVisible()
      await ex.locator('[data-acao="exibicao"]').click()
      await ex.locator('[data-acao="exibicao"]').click()
      await expect(ex.locator('.w98-tabela')).toContainText('C:\\Meus documentos')
      await ev.print(page, info, 'Lixeira (detalhes)', 'O arquivo excluído está na Lixeira com o local original; o ícone da Lixeira na área de trabalho ficou cheio.')
      await ex.locator('[data-item="Minha nota.txt"]').click({ button: 'right' })
      await page.click('.w98-menu [data-item="Restaurar"]')
      await expect(ex.locator('[data-item="Minha nota.txt"]')).toHaveCount(0)
      await expect(page.locator('[data-icone="Lixeira"] [data-icone-nome="lixeira"]')).toBeVisible()
      ev.nota('Regra: restaurar', 'Restaurar devolveu o arquivo para C:\\Meus documentos e a Lixeira voltou a ficar vazia.')
      await ex.locator('[data-acao="exibicao"]').click()
      await fecharJanela(page, 'explorer')
    })

    await test.step('8. Área de trabalho: Novo › Pasta, renomear e arrastar para a Lixeira', async () => {
      await page.getByTestId('w98-area-icones').click({ button: 'right', position: { x: 640, y: 380 } })
      await page.hover('.w98-menu [data-item="Novo"]')
      await page.waitForTimeout(250)
      await ev.print(page, info, 'Menu da área de trabalho', 'Botão direito na área de trabalho: Organizar ícones, Atualizar, Colar, Novo › Pasta / Documento de texto / Imagem de bitmap e Propriedades.')
      await page.click('.w98-menu [data-item="Pasta"]')
      const caixa = page.locator('[data-testid=w98-area-icones] input.w98-renomear')
      await expect(caixa).toHaveValue('Nova pasta')
      await caixa.fill('Projetos')
      await caixa.press('Enter')
      await expect(page.locator('[data-icone="Projetos"]')).toBeVisible()
      await ev.print(page, info, 'Pasta criada e renomeada', 'A "Nova pasta" nasce com o nome em edição (como no 98); renomeada para "Projetos".')
      const pasta = await page.locator('[data-icone="Projetos"]').boundingBox()
      const lixeira = await page.locator('[data-icone="Lixeira"]').boundingBox()
      await page.mouse.move(pasta.x + 37, pasta.y + 18)
      await page.mouse.down()
      await page.mouse.move(lixeira.x + 37, lixeira.y + 18, { steps: 12 })
      await page.mouse.up()
      await expect(msg(page)).toContainText("Tem certeza de que deseja enviar 'Projetos' para a Lixeira?")
      await msg(page).locator('[data-botao="&Sim"]').click()
      await expect(page.locator('[data-icone="Projetos"]')).toHaveCount(0)
      ev.nota('Regra: arrastar para a Lixeira', 'Soltar a pasta sobre a Lixeira pediu confirmação e a mandou para a Lixeira.')
    })

    await test.step('9. Janelas: maximizar, barra de tarefas e arrastar', async () => {
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Bloco de notas'])
      const bloco = janela(page, 'bloco')
      const antes = await bloco.boundingBox()
      await bloco.locator('.w98-titulo').dblclick()
      await expect(bloco).toHaveClass(/maximizada/)
      await ev.print(page, info, 'Janela maximizada', 'Duplo clique na barra de título maximiza; o botão do meio vira "Restaurar".')
      await bloco.locator('.w98-titulo').dblclick()
      const tarefa = page.locator('.w98-tarefa', { hasText: 'Bloco de notas' })
      await expect(tarefa).toHaveClass(/ativa/)
      await tarefa.click()
      await expect(bloco).toBeHidden()
      await tarefa.click()
      await expect(bloco).toBeVisible()
      ev.nota('Regra: botão da barra de tarefas', 'Clicar no botão da janela ativa minimizou; clicar de novo restaurou e ativou.')
      const t = await bloco.locator('.w98-titulo-texto').boundingBox()
      await page.mouse.move(t.x + 40, t.y + 8)
      await page.mouse.down()
      await page.mouse.move(t.x + 240, t.y + 150, { steps: 10 })
      await expect(page.locator('.w98-contorno')).toBeVisible()
      await ev.print(page, info, 'Arrastando com contorno', 'Ao arrastar pela barra de título aparece só o contorno pontilhado; a janela vai para lá ao soltar (padrão do 98).')
      await page.mouse.up()
      const depois = await bloco.boundingBox()
      expect(Math.round(depois.x - antes.x)).toBeGreaterThan(150)
      await fecharJanela(page, 'bloco')
    })

    await test.step('10. Executar: programa inexistente e calc', async () => {
      await abrirPeloIniciar(page, ['Executar...'])
      await page.fill('[aria-label="Abrir"]', 'programa-que-nao-existe')
      await page.keyboard.press('Enter')
      await expect(msg(page)).toContainText("Não é possível encontrar o arquivo 'programa-que-nao-existe'")
      await ev.print(page, info, 'Executar: arquivo não encontrado', 'A mesma mensagem de erro do 98 para um nome que não existe.')
      await msg(page).locator('[data-botao="OK"]').click()
      await abrirPeloIniciar(page, ['Executar...'])
      await page.fill('[aria-label="Abrir"]', 'calc')
      await page.keyboard.press('Enter')
      await expect(janela(page, 'calculadora')).toBeVisible()
      await fecharJanela(page, 'calculadora')
    })

    await test.step('11. Prompt do MS-DOS', async () => {
      await page.dblclick('[data-icone="Prompt do MS-DOS"]')
      const dos = page.getByTestId('w98-dos')
      await page.keyboard.type('ver')
      await page.keyboard.press('Enter')
      await page.keyboard.type('cd ..')
      await page.keyboard.press('Enter')
      await page.keyboard.type('dir')
      await page.keyboard.press('Enter')
      await page.keyboard.type('foo')
      await page.keyboard.press('Enter')
      await expect(dos).toContainText('Windows 98 [Versão 4.10.1998]')
      await expect(dos).toContainText('Pasta de C:\\')
      await expect(dos).toContainText('Comando ou nome de arquivo inválido')
      await ev.print(page, info, 'MS-DOS: VER, CD .., DIR', 'VER mostra a versão, CD .. sobe para C:\\, DIR lista com <DIR>, tamanhos e "bytes disponíveis", e um comando errado dá "Comando ou nome de arquivo inválido".')
      await page.keyboard.type('exit')
      await page.keyboard.press('Enter')
      await expect(janela(page, 'dos')).toHaveCount(0)
    })

    await test.step('12. Paint: desenhar e preencher', async () => {
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Paint'])
      const tela = page.getByTestId('w98-tela-paint')
      const r = await tela.boundingBox()
      await page.click('[data-ferramenta="retangulo"]')
      await page.click('[data-cor="#000080"]')
      await page.mouse.move(r.x + 40, r.y + 40)
      await page.mouse.down()
      await page.mouse.move(r.x + 220, r.y + 160, { steps: 6 })
      await page.mouse.up()
      await page.click('[data-ferramenta="balde"]')
      await page.click('[data-cor="#ffff00"]')
      await page.mouse.click(r.x + 120, r.y + 100)
      await page.click('[data-ferramenta="lapis"]')
      await page.click('[data-cor="#ff0000"]')
      await page.mouse.move(r.x + 260, r.y + 60)
      await page.mouse.down()
      await page.mouse.move(r.x + 380, r.y + 200, { steps: 8 })
      await page.mouse.up()
      const pixel = await tela.evaluate((c) => Array.from(c.getContext('2d').getImageData(120, 100, 1, 1).data.slice(0, 3)))
      expect(pixel).toEqual([255, 255, 0])
      await ev.print(page, info, 'Paint', 'Retângulo azul-marinho preenchido de amarelo com o balde e um traço do lápis vermelho; o pixel do meio do retângulo é amarelo (255, 255, 0).')
      await fecharJanela(page, 'paint')
      await expect(msg(page)).toContainText('Salvar as alterações em sem título?')
      await msg(page).locator('[data-botao="&Não"]').click()
      await expect(janela(page, 'paint')).toHaveCount(0)
    })

    await test.step('13. Internet Explorer: página do site e página de erro', async () => {
      await page.dblclick('[data-icone="Internet Explorer"]')
      const ie = janela(page, 'ie')
      await expect(ie.locator('[data-testid=w98-ie-quadro]')).toBeVisible()
      await expect(ie.locator('.w98-status')).toContainText('Concluído', { timeout: 30000 })
      await ev.print(page, info, 'Internet Explorer', 'O IE abre a página inicial do soudev, com Voltar, Avançar, Parar, Atualizar, Página inicial e o endereço.')
      await ie.getByTestId('w98-ie-endereco').fill('www.exemplo-de-fora.com')
      await ie.getByTestId('w98-ie-endereco').press('Enter')
      await expect(ie.getByTestId('w98-ie-erro')).toContainText('Não é possível exibir a página')
      await ev.print(page, info, 'IE: página de erro', 'Um site de fora não pode ser aberto dentro de outra página: aparece a clássica "Não é possível exibir a página".')
      await ie.locator('[data-acao="Voltar"]').click()
      await expect(ie.locator('[data-testid=w98-ie-quadro]')).toBeVisible()
      await fecharJanela(page, 'ie')
    })

    await test.step('14. Propriedades de Vídeo: plano de fundo, esquema e Aplicar', async () => {
      await page.getByTestId('w98-area-icones').click({ button: 'right', position: { x: 640, y: 380 } })
      await page.click('.w98-menu [data-item="Propriedades"]')
      const video = janela(page, 'video')
      await expect(video.locator('[data-botao="Aplicar"]')).toBeDisabled()
      await video.getByTestId('w98-lista-fundos').locator('button', { hasText: 'Nuvens' }).click()
      await expect(video.locator('[data-botao="Aplicar"]')).toBeEnabled()
      await ev.print(page, info, 'Plano de fundo', 'Escolher "Nuvens" mostra a prévia no monitorzinho e acende o botão Aplicar (que começa desativado).')
      await video.locator('[data-botao="Aplicar"]').click()
      await expect(page.getByTestId('w98-mesa')).toHaveCSS('background-image', /gradient/)
      await expect(video.locator('[data-botao="Aplicar"]')).toBeDisabled()
      await video.locator('.w98-aba', { hasText: 'Aparência' }).click()
      await video.locator('[aria-label="Esquema"]').selectOption('berinjela')
      await video.locator('[data-botao="OK"]').click()
      await expect(page.locator('[data-testid=w98]')).toHaveCSS('--w-titulo1', '#580058')
      await abrirPeloIniciar(page, ['Programas', 'Acessórios', 'Calculadora'])
      await ev.print(page, info, 'Nuvens + esquema Berinjela', 'Depois de OK, a área de trabalho ficou com o papel de parede Nuvens e as janelas com o esquema Berinjela.')
      await fecharJanela(page, 'calculadora')
      await page.evaluate(() => {
        const c = JSON.parse(localStorage.getItem('win98.config.v1'))
        localStorage.setItem('win98.config.v1', JSON.stringify({ ...c, fundo: 'nenhum', esquema: 'padrao' }))
      })
    })

    await test.step('15. Proteção de tela: Voo espacial', async () => {
      await page.reload()
      await page.click('[data-testid=w98-bios]')
      await page.click('[data-testid=w98-abertura]')
      await page.getByTestId('w98-area-icones').click({ button: 'right', position: { x: 640, y: 380 } })
      await page.click('.w98-menu [data-item="Propriedades"]')
      const video = janela(page, 'video')
      await video.locator('.w98-aba', { hasText: 'Proteção de tela' }).click()
      await video.locator('[data-botao="Visualizar"]').click()
      await expect(page.getByTestId('w98-protetor')).toBeVisible()
      await page.waitForTimeout(900)
      await ev.print(page, info, 'Proteção de tela', '"Voo espacial": estrelas vindo na sua direção, em tela cheia. Mexer o mouse volta para o Windows.')
      await page.mouse.move(100, 100)
      await page.mouse.move(300, 300)
      await expect(page.getByTestId('w98-protetor')).toHaveCount(0)
      await video.locator('[data-botao="Cancelar"]').click()
    })

    await test.step('16. Desligar o Windows', async () => {
      await abrirPeloIniciar(page, ['Desligar...'])
      await expect(page.getByTestId('w98-desligar')).toBeVisible()
      await ev.print(page, info, 'Desligar o Windows', 'A tela escurece com pontinhos e aparecem as opções Desligar, Reiniciar e Reiniciar em modo MS-DOS.')
      await page.click('[data-testid=w98-desligar] [data-botao="OK"]')
      await expect(page.getByTestId('w98-desligado')).toContainText('Agora você pode desligar', { timeout: 8000 })
      await ev.print(page, info, 'Pode desligar com segurança', 'A clássica mensagem laranja em fundo preto, com "Ligar o computador" e "Voltar ao soudev".')
      await page.click('[data-botao="Ligar"]')
      await expect(page.getByTestId('w98-bios')).toBeVisible()
    })

    await test.step('17. Persistência: o que foi salvo continua lá', async () => {
      await page.reload()
      await page.click('[data-testid=w98-bios]')
      await page.click('[data-testid=w98-abertura]')
      await page.dblclick('[data-icone="Meus documentos"]')
      await expect(janela(page, 'explorer').locator('[data-item="Minha nota.txt"]')).toBeVisible()
      ev.nota('Regra: o disco C: fica salvo', 'Depois de recarregar a página, "Minha nota.txt" continua em Meus documentos (salvo no navegador).')
    })

    await test.step('18. No celular', async () => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })
      const cel = await ctx.newPage()
      cel.on('pageerror', (e) => erros.push(String(e)))
      await cel.goto(`${URL}?rapido=1`)
      await cel.tap('[data-icone="Meu computador"]')
      const ex = cel.locator('.w98-janela[data-janela="explorer"]')
      await expect(ex).toHaveClass(/maximizada/)
      await ev.print(cel, info, 'Celular', 'No celular um toque abre o ícone e as janelas abrem maximizadas.')
      await ctx.close()
    })

    await test.step('19. Sem erro de JavaScript', async () => {
      expect(erros, `erros de JS: ${erros.join(' | ')}`).toHaveLength(0)
    })
    ok = true
  } finally {
    ev.salvar(ok)
  }
})
