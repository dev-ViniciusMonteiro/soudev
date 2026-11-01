// Papéis de parede (desenhados em CSS) e esquemas de cores da aba "Aparência" das Propriedades de Vídeo.

export const FUNDOS = {
  nenhum: { nome: '(Nenhum)', css: null },
  nuvens: {
    nome: 'Nuvens',
    css: `radial-gradient(ellipse 18% 8% at 20% 25%, rgba(255,255,255,.9), transparent 70%),
      radial-gradient(ellipse 24% 9% at 75% 18%, rgba(255,255,255,.85), transparent 70%),
      radial-gradient(ellipse 26% 10% at 35% 70%, rgba(255,255,255,.8), transparent 70%),
      radial-gradient(ellipse 20% 8% at 85% 62%, rgba(255,255,255,.85), transparent 70%),
      linear-gradient(180deg, #3a78d8, #a9cdf6)`,
    tamanho: 'cover',
  },
  ladrilhos: {
    nome: 'Ladrilhos',
    css: 'conic-gradient(#008080 0 25%, #20a0a0 0 50%, #008080 0 75%, #20a0a0 0) 0 0 / 32px 32px',
  },
  riscaDeGiz: {
    nome: 'Risca de giz',
    css: 'repeating-linear-gradient(90deg, #2c3e66 0 6px, #34497a 6px 7px)',
  },
  circulos: {
    nome: 'Círculos',
    css: 'radial-gradient(circle at 50% 50%, #5f8fbf 0 6px, #3d6d9d 7px 10px, transparent 11px) 0 0 / 24px 24px, #2d5d8d',
  },
  ondas: {
    nome: 'Ondas',
    css: 'radial-gradient(circle at 100% 50%, transparent 20%, #3d7fb5 21% 34%, transparent 35%) 0 0 / 40px 40px, radial-gradient(circle at 0% 50%, transparent 20%, #3d7fb5 21% 34%, transparent 35%) 20px 0 / 40px 40px, #1d5f95',
  },
  triangulos: {
    nome: 'Triângulos',
    css: 'conic-gradient(from 135deg at 50% 0, #806040 0 90deg, transparent 0) 0 0 / 24px 24px, conic-gradient(from -45deg at 50% 100%, #604020 0 90deg, transparent 0) 0 0 / 24px 24px, #a08060',
  },
  tijolos: {
    nome: 'Blocos vermelhos',
    css: 'linear-gradient(#5a1010 2px, transparent 2px) 0 0 / 40px 20px, linear-gradient(90deg, #5a1010 2px, transparent 2px) 0 0 / 40px 40px, linear-gradient(90deg, #5a1010 2px, transparent 2px) 20px 20px / 40px 40px, #a02828',
  },
}

const base = {
  '--w-face': '#c0c0c0',
  '--w-luz': '#ffffff',
  '--w-luz2': '#dfdfdf',
  '--w-sombra': '#808080',
  '--w-escuro': '#0a0a0a',
  '--w-texto': '#000000',
  '--w-janela': '#ffffff',
  '--w-selecao': '#000080',
  '--w-selecao-texto': '#ffffff',
  '--w-titulo1': '#000080',
  '--w-titulo2': '#1084d0',
  '--w-titulo-inativo1': '#808080',
  '--w-titulo-inativo2': '#b5b5b5',
  '--w-titulo-texto': '#ffffff',
  '--w-titulo-texto-inativo': '#c0c0c0',
  '--w-mesa': '#008080',
}

export const ESQUEMAS = {
  padrao: { nome: 'Padrão do Windows', vars: base },
  deserto: {
    nome: 'Deserto',
    vars: { ...base, '--w-face': '#d5ccbb', '--w-luz2': '#ebe5db', '--w-sombra': '#a29276', '--w-titulo1': '#008080', '--w-titulo2': '#5eb5b5', '--w-titulo-inativo1': '#a29276', '--w-titulo-inativo2': '#cdbfa6', '--w-titulo-texto-inativo': '#d5ccbb', '--w-selecao': '#008080', '--w-mesa': '#a28d68' },
  },
  berinjela: {
    nome: 'Berinjela',
    vars: { ...base, '--w-face': '#90b0a8', '--w-luz2': '#c0d4cf', '--w-sombra': '#58807a', '--w-titulo1': '#580058', '--w-titulo2': '#a058a0', '--w-titulo-inativo1': '#58807a', '--w-titulo-inativo2': '#90b0a8', '--w-titulo-texto-inativo': '#000000', '--w-selecao': '#580058', '--w-mesa': '#584070' },
  },
  lilas: {
    nome: 'Lilás',
    vars: { ...base, '--w-face': '#b0a8d8', '--w-luz2': '#d8d4ec', '--w-sombra': '#58508c', '--w-titulo1': '#58508c', '--w-titulo2': '#8c84c0', '--w-titulo-inativo1': '#9890b8', '--w-titulo-inativo2': '#c4c0dc', '--w-titulo-texto-inativo': '#e8e4f8', '--w-selecao': '#58508c', '--w-mesa': '#58508c' },
  },
  ardosia: {
    nome: 'Ardósia',
    vars: { ...base, '--w-face': '#a0b0c0', '--w-luz2': '#cfd8e0', '--w-sombra': '#607080', '--w-titulo1': '#406080', '--w-titulo2': '#80a0c0', '--w-titulo-inativo1': '#607080', '--w-titulo-inativo2': '#a0b0c0', '--w-selecao': '#406080', '--w-mesa': '#3a5068' },
  },
  tempestade: {
    nome: 'Tempestade',
    vars: { ...base, '--w-titulo1': '#800080', '--w-titulo2': '#c060c0', '--w-selecao': '#800080', '--w-mesa': '#000040' },
  },
  altoContraste: {
    nome: 'Alto contraste preto',
    vars: { ...base, '--w-face': '#000000', '--w-luz': '#ffffff', '--w-luz2': '#808080', '--w-sombra': '#808080', '--w-escuro': '#ffffff', '--w-texto': '#ffffff', '--w-janela': '#000000', '--w-selecao': '#800080', '--w-titulo1': '#800080', '--w-titulo2': '#800080', '--w-titulo-inativo1': '#008000', '--w-titulo-inativo2': '#008000', '--w-titulo-texto-inativo': '#ffffff', '--w-mesa': '#000000' },
  },
}

export const PROTETORES = { nenhum: '(Nenhum)', estrelas: 'Voo espacial', linhas: 'Linhas mágicas' }

export const configInicial = () => ({ fundo: 'nenhum', esquema: 'padrao', protetor: 'estrelas', minutosProtetor: 10, posicoes: {}, recentes: [], recordes: {}, nivelMinado: 'iniciante', personalizado: null, marcasMinado: true, coresMinado: true, exibicao: 'icones' })

export const CHAVE_CONFIG = 'win98.config.v1'

export function carregarConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_CONFIG) || 'null')
    if (c && typeof c === 'object') return { ...configInicial(), ...c }
  } catch {
    /* sem armazenamento */
  }
  return configInicial()
}

export function salvarConfig(c) {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(c))
  } catch {
    /* sem armazenamento */
  }
}
