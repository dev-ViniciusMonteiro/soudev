import { Old_Standard_TT, Playfair_Display, UnifrakturMaguntia } from 'next/font/google'

// Fontes de jornal antigo (só carregam nas páginas do jornal).
const gotico = UnifrakturMaguntia({ subsets: ['latin'], weight: '400', variable: '--jn-gotico', display: 'swap' })
const titulo = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'], style: ['normal', 'italic'], variable: '--jn-titulo', display: 'swap' })
const texto = Old_Standard_TT({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], variable: '--jn-texto', display: 'swap' })

export const classeFontesJornal = [gotico.variable, titulo.variable, texto.variable].join(' ')
