// Banners 1920x768 (WebP) de cada jogo, app e sistema, em public/banners/<tipo>/<slug>.webp.
// Praça, Corte Neon e Correção de exercícios foram feitos à mão; os outros saem de scripts/banners/gerar.mjs.

import { apps } from './apps'
import { games } from './games'
import { nichos } from './sistemas/nichos'

export const LARGURA_BANNER = 1920
export const ALTURA_BANNER = 768

export const bannerDoJogo = (slug) => `/banners/jogos/${slug}.webp`
export const bannerDoApp = (slug) => `/banners/apps/${slug}.webp`
export const bannerDoSistema = (slug) => `/banners/sistemas/${slug}.webp`

const slide = (href, titulo, imagem, alt) => ({ href, titulo, imagem, alt, largura: LARGURA_BANNER, altura: ALTURA_BANNER })

/** Carrossel da home: o banner pessoal, os destaques feitos à mão e depois todos os jogos, apps e sistemas. */
export function bannersDaHome() {
  const pessoal = {
    href: '/curriculo',
    titulo: 'Vinicius Monteiro Orlandi',
    imagem: '/banner-vinicius.jpg',
    largura: 1983,
    altura: 793,
    alt: 'Vinicius Monteiro Orlandi: “Nós só podemos ver um pouco do futuro, mas o suficiente para perceber que há muito a fazer.”',
  }
  const primeiros = ['praca', 'corte-neon']
  const jogo = (g) => slide(`/jogos/${g.slug}`, g.name, bannerDoJogo(g.slug), `${g.name}: ${g.short}`)
  const jogos = [...primeiros.map((s) => games.find((g) => g.slug === s)).filter(Boolean), ...games.filter((g) => !primeiros.includes(g.slug))].map(jogo)
  const correcao = slide(
    '/ferramentas/correcao-exercicios-camera',
    'Correção de exercícios pela câmera',
    '/banners/ferramentas/correcao-exercicios-camera.webp',
    'Correção de exercícios pela câmera: a câmera acompanha seus movimentos, conta as repetições e corrige a sua postura em tempo real.',
  )
  return [
    pessoal,
    jogos[0],
    jogos[1],
    correcao,
    ...jogos.slice(2),
    ...apps.map((a) => slide(`/apps/${a.slug}`, a.nome, bannerDoApp(a.slug), `${a.nome}: ${a.curto}`)),
    ...nichos.map((n) => slide(`/sistemas/${n.slug}`, n.nome, bannerDoSistema(n.slug), `${n.nome}: ${n.curto}`)),
  ]
}
