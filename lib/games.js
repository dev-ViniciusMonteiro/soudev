// Catálogo de jogos. Cada jogo fica em games/<slug> e é publicado em /jogar/<slug>/.

export const games = [
  {
    slug: 'cidade-neon',
    name: 'Cidade Neon',
    title: 'Cidade Neon: Jogo de Mundo Aberto 3D Grátis',
    description:
      'Jogo de mundo aberto 3D grátis no navegador: dirija por uma cidade neon, roube carros, faça entregas por dinheiro e fuja da polícia. Sem baixar nada.',
    short: 'Mundo aberto 3D: dirija, faça entregas por dinheiro e fuja da polícia.',
    badge: '3D',
    genre: ['Mundo aberto', 'Corrida', 'Ação'],
    playUrl: '/jogar/cidade-neon/index.html',
    keywords: ['jogo de mundo aberto', 'jogo de carro online', 'jogo 3d no navegador', 'jogo de dirigir grátis', 'jogo de polícia'],
    intro:
      'Explore uma cidade neon gerada por computador: entre em qualquer carro, faça entregas contra o relógio para ganhar dinheiro e escape da polícia quando o nível de procurado subir. Roda direto no navegador, no PC ou no celular.',
    controls: [
      ['Acelerar, frear e virar', 'W A S D ou setas'],
      ['Freio de mão (drift)', 'Espaço'],
      ['Entrar e sair do carro', 'F'],
      ['Correr (a pé)', 'Shift'],
      ['Desvirar o carro', 'R'],
      ['Pausar e opções', 'Esc'],
      ['Celular', 'Joystick na tela e botões de ação'],
      ['Controle (gamepad)', 'RT/LT aceleram, analógico vira, A entra no carro'],
    ],
    about: [
      'Cidade Neon é um jogo de mundo aberto em 3D feito para rodar no navegador, sem instalar nada. A cidade é criada por computador a partir de uma "semente": cada número gera um mapa diferente, com prédios, ruas iluminadas, trânsito e pedestres. Você pode andar a pé, pegar qualquer carro estacionado ou do trânsito e sair dirigindo, com física arcade e drift no freio de mão.',
      'O objetivo é fazer entregas: siga a seta até o ponto verde para pegar a encomenda e leve até o ponto amarelo antes do tempo acabar. Quanto mais longe e mais rápido, mais você ganha, e o dinheiro fica salvo no seu navegador. Bater em pedestres aumenta o nível de procurado e a polícia sai em perseguição. Se for pego, paga multa.',
    ],
    faq: [
      ['Preciso baixar alguma coisa?', 'Não. O jogo roda direto no navegador usando WebGL. Funciona no Chrome, Edge, Firefox e Safari atualizados.'],
      ['Funciona no celular?', 'Sim. No celular aparecem um joystick e botões na tela, e a qualidade gráfica é ajustada automaticamente. Para a melhor experiência, use o modo tela cheia e o celular na horizontal.'],
      ['Meu progresso fica salvo?', 'O dinheiro das entregas fica salvo no seu navegador. Se limpar os dados do site ou usar aba anônima, ele recomeça do zero.'],
      ['O jogo é gratuito?', 'Sim, totalmente gratuito e sem cadastro.'],
    ],
    credits: {
      text: 'Baseado no projeto open source gta7, de Chris Sparks, sob licença MIT. Tradução, identidade visual, sistema de entregas e integração por Vinicius Monteiro Orlandi.',
      url: 'https://github.com/depixeled-chris/gta7',
      license: 'MIT',
    },
  },
]

export const getGame = (slug) => games.find((game) => game.slug === slug)
