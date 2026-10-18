// Apps completos que rodam no navegador (/apps). Cada um tem página de apresentação e o app em /apps/<slug>/app.
export const apps = [
  {
    slug: 'treino',
    nome: 'Treino',
    titulo: 'Treino: diário de academia com progressão automática',
    curto: 'Rotinas, séries, descanso, recordes, progressão automática e evolução do corpo. Funciona offline.',
    icone: '🏋️',
    cor: '#4ade80',
    descricao:
      'App de treino de musculação grátis: monte rotinas ou use planos prontos (PPL, Superior/Inferior, Corpo inteiro, 5×5), registre séries com cronômetro de descanso, bata recordes e veja a evolução. Funciona offline.',
    recursos: [
      ['Rotinas do seu jeito', 'Dias fixos da semana ou rotação A/B/C. Planos prontos: Push/Pull/Legs, Superior/Inferior, Corpo inteiro e 5×5.'],
      ['876 exercícios', 'Biblioteca pública com fotos de cada movimento, filtro por músculo no mapa do corpo, equipamento e nível. Crie os seus com foto ou vídeo.'],
      ['Treino guiado', 'Cargas já preenchidas, descanso com som, vibração e tela piscando, recorde na hora, cronômetro para prancha e tela sempre acesa.'],
      ['Séries de todo tipo', 'Aquecimento, drop set, rest-pause, até a falha, pirâmide e supersérie. Unilateral (esquerda/direita) e peso do corpo com cinto.'],
      ['Progressão automática', 'Linear, Greyskull, dupla e tripla progressão ou por tempo, com explicação de cada sugestão e deload quando estagnar.'],
      ['Evolução', 'Curva de 1RM, equilíbrio entre levantamentos, mapa de calor do ano, mapa muscular de volume e recuperação, peso e fotos antes e depois.'],
      ['Calculadora de anilhas', 'Diz quais anilhas pôr em cada lado da barra, respeitando as que a sua academia tem.'],
      ['Seus dados são seus', 'Tudo fica no aparelho. Importa do Strong, Hevy, FitNotes e Apple Saúde; exporta backup e planilha.'],
    ],
    faq: [
      ['Precisa criar conta?', 'Não. Os dados ficam no seu navegador (IndexedDB). Para trocar de aparelho, baixe o backup em Ajustes e importe no outro.'],
      ['Funciona sem internet?', 'Sim. Depois de abrir uma vez com internet, dá para instalar na tela inicial e usar na academia sem sinal.'],
      ['Como a carga é sugerida?', 'Pela regra de progressão de cada exercício e pelo que você fez no último treino. A sugestão vem com o motivo, e você pode mudar à vontade.'],
      ['De onde vêm os exercícios?', 'Do Free Exercise DB, uma base pública (domínio público) com mais de 800 exercícios e fotos. Os nomes mais comuns foram traduzidos.'],
    ],
  },
]

export const getApp = (slug) => apps.find((a) => a.slug === slug)
