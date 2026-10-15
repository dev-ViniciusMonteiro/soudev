// Catálogo de jogos. Cada jogo fica em games/<slug> e é publicado em /jogar/<slug>/.

export const games = [
  {
    slug: 'monkepo',
    name: 'MonKePo',
    title: 'MonKePo: Jogo de Capturar Monstros Grátis',
    description:
      'Jogo de capturar monstros grátis no navegador: escolha seu inicial, explore rotas, batalhe por turnos, evolua seu time e dispute o ranking.',
    short: 'Capture monstros, jogue online com amigos e dispute o ranking.',
    badge: 'RPG',
    genre: ['RPG', 'Captura de monstros', 'Estratégia'],
    playUrl: '/jogar/monkepo/index.html',
    keywords: ['jogo de capturar monstros', 'rpg de monstros online', 'jogo de batalha por turnos', 'monster tamer grátis', 'jogo de treinador de monstros'],
    intro:
      'Escolha um entre três iniciais, explore a Vila Raiz, as rotas e o Monte Gélido, capture MonKePos na grama alta, enfrente treinadores e a Líder Gélida. Seus monstros ficam salvos na sua conta e o melhor deles entra no ranking.',
    controls: [
      ['Andar', 'Setas ou W A S D'],
      ['Correr', 'Segurar B (X ou Shift)'],
      ['Confirmar / falar (A)', 'Z, Enter ou Espaço'],
      ['Voltar (B)', 'X ou Esc'],
      ['Menu (START)', 'P ou Tab'],
      ['Sala online e batalha com amigos', 'Menu > SALA ONLINE; de frente para outro jogador, aperte A'],
      ['Celular', 'Botões na tela (direcional, A, B e START)'],
    ],
    about: [
      'MonKePo é um RPG de captura de monstros com as regras dos clássicos de portátil: 17 tipos com vantagens e fraquezas, naturezas, atributos individuais, curvas de experiência, golpes aprendidos por nível, status como queimadura, sono e paralisia, captura com bolas e evolução. Comece na Vila Raiz com um kit de MonBolas e Poções, cure seu time no Centro de Cura, compre itens na Loja e guarde monstros na Caixa.',
      'Para jogar você cria uma conta só com usuário e senha, na hora. Apenas os seus MonKePos ficam salvos na conta; dinheiro, itens e posição ficam na sala do seu navegador, e toda sala nova começa com o mesmo kit. O ranking mostra quem tem o MonKePo mais forte, calculado pelo servidor a partir dos atributos reais.',
      'No menu SALA ONLINE você abre uma sala no seu próprio navegador e passa o código de 6 letras para os amigos. Quem entra aparece andando no seu mapa, e basta ficar de frente para alguém e apertar A para desafiar. A conexão é direta entre os navegadores, sem servidor no meio, e quem hospeda guarda o dinheiro e os itens dos visitantes para a próxima vez.',
    ],
    faq: [
      ['Preciso pagar ou baixar algo?', 'Não. Roda direto no navegador, no PC ou no celular, e é gratuito.'],
      ['O que fica salvo na minha conta?', 'Seus MonKePos (time e Caixa), com nível, golpes e evolução. Dinheiro, itens e posição ficam no navegador da sala e recomeçam com o kit numa sala nova.'],
      ['Minha senha fica segura?', 'A senha é embaralhada no seu navegador antes de ser enviada, e o servidor guarda só um código derivado dela. Mesmo assim, use uma senha que você não usa em outros sites.'],
      ['Como jogar com amigos?', 'Um jogador abre o menu (START), escolhe SALA ONLINE e CRIAR SALA. Os outros escolhem ENTRAR NUMA SALA e digitam o código. A sala fica aberta enquanto o anfitrião estiver com o jogo aberto. Em algumas redes de empresa ou de celular a conexão direta pode ser bloqueada.'],
      ['Como funciona o ranking?', 'O servidor soma os atributos do seu melhor MonKePo e mostra os 20 mais fortes. Treine, evolua e capture monstros com boa natureza para subir.'],
    ],
    credits: {
      text: 'Jogo criado por Vinicius Monteiro Orlandi. As artes das 25 criaturas são do projeto livre Tuxemon, de vários artistas, sob licença CC BY-SA 4.0.',
      url: '/jogar/monkepo/creditos.html',
      linkText: 'Ver o crédito de cada arte',
    },
  },
  {
    slug: 'cidade-neon',
    name: 'Cidade Neon',
    title: 'Cidade Neon: Jogo de Mundo Aberto 3D Grátis',
    description:
      'Jogo de mundo aberto 3D grátis no navegador: dirija por uma cidade neon, faça entregas e corridas por dinheiro, use nitro e fuja da polícia. Sem baixar nada.',
    short: 'Mundo aberto 3D: entregas, corridas, nitro e fuga da polícia.',
    badge: '3D',
    genre: ['Mundo aberto', 'Corrida', 'Ação'],
    playUrl: '/jogar/cidade-neon/index.html',
    keywords: ['jogo de mundo aberto', 'jogo de carro online', 'jogo 3d no navegador', 'jogo de dirigir grátis', 'jogo de polícia'],
    intro:
      'Explore uma cidade neon gerada por computador: entre em qualquer carro, faça entregas e corridas contra o relógio para ganhar dinheiro, use o nitro e escape da polícia ou se esconda numa oficina. Roda direto no navegador, no PC ou no celular.',
    controls: [
      ['Acelerar, frear e virar', 'W A S D ou setas'],
      ['Freio de mão (drift)', 'Espaço'],
      ['Nitro (dirigindo)', 'Shift'],
      ['Mapa da cidade', 'M'],
      ['Entrar e sair do carro', 'F'],
      ['Correr (a pé)', 'Shift'],
      ['Desvirar o carro', 'R'],
      ['Pausar e opções', 'Esc'],
      ['Celular', 'Joystick na tela e botões de ação'],
      ['Controle (gamepad)', 'RT/LT aceleram, analógico vira, A entra no carro'],
    ],
    about: [
      'Cidade Neon é um jogo de mundo aberto em 3D feito para rodar no navegador, sem instalar nada. A cidade é criada por computador a partir de uma "semente": cada número gera um mapa diferente, com prédios, ruas iluminadas, trânsito e pedestres. Você pode andar a pé, pegar qualquer carro estacionado ou do trânsito e sair dirigindo, com física arcade e drift no freio de mão.',
      'Siga a seta até o ponto verde para começar uma missão: nas entregas você leva a encomenda até o ponto amarelo, e nas corridas passa por cinco pontos rosa em sequência, sempre contra o relógio. Quanto mais longe e mais rápido, mais você ganha, e o dinheiro fica salvo no seu navegador. Segure Shift para usar o nitro e aperte M para ver o mapa da cidade.',
      'Atropelar pedestres aumenta o nível de procurado e a polícia sai em perseguição. Para despistar, saia do campo de visão das viaturas por alguns segundos ou entre numa oficina (ponto azul no mapa): por R$ 100 ela conserta o carro e zera o nível de procurado. Se for pego, paga multa.',
    ],
    faq: [
      ['Preciso baixar alguma coisa?', 'Não. O jogo roda direto no navegador usando WebGL. Funciona no Chrome, Edge, Firefox e Safari atualizados.'],
      ['Funciona no celular?', 'Sim. No celular aparecem um joystick e botões na tela, e a qualidade gráfica é ajustada automaticamente. Para a melhor experiência, use o modo tela cheia e o celular na horizontal.'],
      ['Meu progresso fica salvo?', 'O dinheiro das entregas fica salvo no seu navegador. Se limpar os dados do site ou usar aba anônima, ele recomeça do zero.'],
      ['O jogo é gratuito?', 'Sim, totalmente gratuito e sem cadastro.'],
    ],
    credits: {
      text: 'Baseado no projeto open source gta7, de Chris Sparks, sob licença MIT. Texturas CC0 do ambientCG. Tradução, identidade visual, missões de entrega e corrida, nitro, oficinas, mapa e integração por Vinicius Monteiro Orlandi.',
      url: 'https://github.com/depixeled-chris/gta7',
      license: 'MIT',
    },
  },
  {
    slug: 'pesca-no-gelo',
    name: 'Pesca no Gelo',
    title: 'Pesca no Gelo: Jogo de Pescar Online Grátis',
    description:
      'Jogo de pesca no gelo grátis no navegador: fisgue peixes, desvie de águas-vivas, tubarões e caranguejos e pesque a Garoupa Gigante. Funciona no PC e no celular.',
    short: 'Fisgue peixes pelo buraco no gelo e desvie dos perigos do mar.',
    badge: 'PESCA',
    genre: ['Casual', 'Pesca', 'Arcade'],
    playUrl: '/jogar/pesca-no-gelo/index.html',
    keywords: ['jogo de pesca', 'pesca no gelo', 'jogo de pescar online', 'jogo de pesca grátis', 'minigame de pesca'],
    intro:
      'Um ursinho polar, um buraco no gelo e uma minhoca no anzol. Suba e desça a linha para os peixes morderem, desvie dos barris, águas-vivas, tubarões e caranguejos e pesque 60 peixes para enfrentar a Garoupa Gigante.',
    controls: [
      ['Subir e descer a linha', 'Mover o mouse ou arrastar o dedo'],
      ['Teclado', 'Setas ↑ ↓ ou W / S'],
      ['Pausar', 'P ou Esc'],
      ['Som liga/desliga', 'M'],
    ],
    about: [
      'Pesca no Gelo é um jogo casual de pescaria: você controla a linha que desce por um buraco no gelo. Quando um peixe morde a minhoca, é só puxar de volta até o buraco para pescar. Você começa com 3 minhocas e de vez em quando afunda uma lata de iscas que dá uma minhoca extra.',
      'Os perigos aparecem conforme você avança: barris e botas derrubam o peixe do anzol, águas-vivas dão choque e levam a minhoca (a partir de 5 peixes), tubarões comem o peixe e a minhoca (a partir de 20) e caranguejos cortam a linha se ela estiver abaixo deles (a partir de 40). Com 60 peixes surge a Garoupa Gigante: ela só morde se houver um peixe no anzol. O jogo é uma homenagem original aos minigames de pesca no gelo dos jogos online clássicos.',
    ],
    faq: [
      ['É o jogo de pesca do Club Penguin?', 'Não. É um jogo original, com desenhos, sons e personagem próprios, inspirado no estilo dos minigames clássicos de pesca no gelo. Não tem ligação com a Disney nem com o Club Penguin.'],
      ['Como pegar a Garoupa Gigante?', 'Depois de 60 peixes ela aparece e fica rondando até ser pescada. Fisgue um peixe comum e, sem trazê-lo para cima, deixe-o na água: a garoupa vai atrás dele e morde. Depois puxe devagar até tirar do buraco, porque ela é pesada.'],
      ['Dá para tirar a linha da água?', 'Sim. Suba a linha até o topo e ela sai pelo buraco no gelo. Fora da água a minhoca fica a salvo de águas-vivas, tubarões e caranguejos, e o peixe só conta depois de sair do buraco.'],
      ['O que fazer com o caranguejo?', 'Ele corta a linha se ela estiver abaixo dele quando ele passar. Suba a linha acima do caranguejo até ele ir embora.'],
      ['Funciona no celular?', 'Sim. Arraste o dedo para cima e para baixo na tela para mover a linha.'],
    ],
    credits: {
      text: 'Jogo original de Vinicius Monteiro Orlandi, desenhado em código (canvas) com sons sintetizados. Regras inspiradas nos minigames clássicos de pesca no gelo.',
      url: 'https://clubpenguinjourney.fandom.com/wiki/Ice_Fishing',
      linkText: 'Sobre o minigame clássico que inspirou o jogo',
    },
  },
  {
    slug: 'escritorio-ia',
    name: 'Escritório IA',
    title: 'Escritório IA: Monte sua Equipe de Agentes de IA',
    description:
      'Jogo 3D de agentes de IA: contrate até 6 funcionários com a LLM que quiser pelo OpenRouter, dê uma tarefa a cada um e um líder revisa tudo até entregar a solução.',
    short: 'Contrate até 6 agentes de IA, dê tarefas e um líder revisa até aprovar.',
    badge: 'IA',
    genre: ['Simulação', 'Inteligência artificial', 'Estratégia'],
    playUrl: '/jogar/escritorio-ia/index.html',
    keywords: ['agentes de ia', 'multiagente', 'openrouter', 'equipe de ia', 'jogo de inteligência artificial', 'llm grátis'],
    intro:
      'Monte um escritório de agentes de IA em 3D: contrate funcionários na loja, escolha a LLM de cada um (gratuita ou paga) pelo OpenRouter, defina uma tarefa para cada e deixe o líder revisar os relatórios até a missão ficar pronta, com documentação no final.',
    controls: [
      ['Girar a câmera', 'Arrastar com o mouse ou o dedo'],
      ['Zoom', 'Roda do mouse ou pinça'],
      ['Contratar', 'Clicar no balcão verde (loja) ou numa mesa livre'],
      ['Editar funcionário (LLM e tarefa)', 'Clicar na mesa dele'],
      ['Escolher o modelo do líder', 'Clicar na mesa do líder, ao fundo'],
      ['Missão, relatórios e conta', 'Painel lateral'],
    ],
    about: [
      'O Escritório IA é um jogo de simulação em que você é o dono de uma equipe de inteligência artificial. Na loja você contrata até seis funcionários (pesquisador, redator, programador, analista, estrategista, revisor, criativo e marketing). Cada um ocupa uma mesa, mostra a LLM que está usando e o status do trabalho. Você conecta sua conta do OpenRouter e escolhe qualquer modelo: os gratuitos ou os pagos, como GPT, Claude, Gemini, Llama, DeepSeek e Qwen.',
      'A missão funciona em rodadas. Cada funcionário entrega um relatório de trabalho e o líder lê todos. Se a solução estiver boa, ele aprova, consolida o resultado e os contratos terminam com OK. Se não, todos refazem, recebendo o pedido anterior, o que entregaram, a avaliação e um novo prompt. É o padrão orquestrador-trabalhadores com avaliador-otimizador, usado em sistemas multiagente profissionais. No fim sai uma documentação em Markdown com a solução, um tópico por funcionário, o histórico de decisões e o custo estimado.',
    ],
    faq: [
      ['Precisa pagar para jogar?', 'Não. O modo demonstração funciona sem conta. Com o OpenRouter você pode usar só modelos gratuitos (limite de 20 pedidos por minuto e 50 por dia, ou 1.000 por dia se a conta já comprou US$ 10 em créditos). Modelos pagos são cobrados pelo OpenRouter na sua conta.'],
      ['Minha chave do OpenRouter fica segura?', 'A chave fica só no seu navegador e é enviada apenas para o OpenRouter. O site não tem servidor que receba a chave. Mesmo assim, crie uma chave com limite de crédito e não use em computador compartilhado.'],
      ['Quantos agentes posso contratar?', 'Até 6 funcionários ao mesmo tempo, mais o líder. Cada missão tem no máximo 5 rodadas de revisão.'],
      ['O trabalho continua se eu fechar a página?', 'Não. Quem coordena a equipe é o seu navegador, então deixe a aba aberta até a missão terminar. Os relatórios e a documentação ficam salvos no navegador e podem ser baixados.'],
    ],
    credits: {
      text: 'Jogo criado por Vinicius Monteiro Orlandi com Three.js. Fluxo de agentes baseado nos padrões orquestrador-trabalhadores e avaliador-otimizador; modelos e login via OpenRouter (OAuth PKCE).',
      url: 'https://openrouter.ai/docs/guides/overview/auth/oauth',
      linkText: 'Como funciona o login do OpenRouter',
    },
  },
]

export const getGame = (slug) => games.find((game) => game.slug === slug)
