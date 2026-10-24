// Banners 1920x768 (WebP) de cada jogo, app, sistema e ferramenta, em public/banners/<tipo>/<slug>.webp.
// Praça, Corte Neon e Correção de exercícios foram feitos à mão; os outros saem de scripts/banners/gerar.mjs.

export const LARGURA_BANNER = 1920
export const ALTURA_BANNER = 768

export const bannerDoJogo = (slug) => `/banners/jogos/${slug}.webp`
export const bannerDoApp = (slug) => `/banners/apps/${slug}.webp`
export const bannerDoSistema = (slug) => `/banners/sistemas/${slug}.webp`
export const bannerDaFerramenta = (slug) => `/banners/ferramentas/${slug}.webp`

/** O banner do topo da home. */
export const bannerPessoal = {
  href: '/curriculo',
  imagem: '/banner-vinicius.jpg',
  largura: 1983,
  altura: 793,
  alt: 'Vinicius Monteiro Orlandi: “Nós só podemos ver um pouco do futuro, mas o suficiente para perceber que há muito a fazer.”',
}

/** Os projetos que mais impressionam num site: o primeiro aparece grande na home. */
export const DESTAQUES = [
  { tipo: 'jogos', slug: 'praca', selo: '3D online com amigos' },
  { tipo: 'jogos', slug: 'corte-neon', selo: 'Jogue com o corpo' },
  { tipo: 'apps', slug: 'globo', selo: 'Dados ao vivo em 3D' },
  { tipo: 'ferramentas', slug: 'correcao-exercicios-camera', selo: 'IA pela câmera' },
  { tipo: 'apps', slug: 'editor-de-video', selo: 'Edição no navegador' },
  { tipo: 'sistemas', slug: 'mei-na-mao', selo: 'Comandos por voz' },
]
