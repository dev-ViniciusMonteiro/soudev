// Google Analytics 4. Eventos de uso das ferramentas e dos jogos.
// Nunca enviamos conteúdo digitado nem nome de arquivo: só o tipo de ação.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-RGXMM91N6C'

// Snippet do Google com: página vista manual (para mandar o grupo de conteúdo certo em cada navegação),
// GA desligado em localhost e modo de depuração com ?ga_debug=1 (aparece no DebugView do GA).
export const gaInitScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var gaDebug = /[?&]ga_debug=1/.test(location.search);
if (!gaDebug && /^(localhost|127\\.|192\\.168\\.|10\\.)/.test(location.hostname)) window['ga-disable-${GA_ID}'] = true;
gtag('js', new Date());
gtag('set', 'user_properties', {
  display_mode: matchMedia('(display-mode: standalone)').matches ? 'app_instalado' : 'navegador'
});
gtag('config', '${GA_ID}', Object.assign({ send_page_view: false }, gaDebug ? { debug_mode: true } : {}));
`

// Ferramenta ou jogo da página atual, lidos dos atributos data-* da página.
function pageContext() {
  if (typeof document === 'undefined') return {}
  const tool = document.querySelector('[data-tool-slug]')
  if (tool) return { tool_slug: tool.dataset.toolSlug, tool_category: tool.dataset.toolCategory }
  const game = document.querySelector('[data-game-slug]')
  if (game) return { game_slug: game.dataset.gameSlug }
  return {}
}

export function contentGroup(pathname) {
  const ctx = pageContext()
  if (ctx.tool_slug) return `ferramenta/${ctx.tool_category}`
  if (ctx.game_slug) return 'jogo'
  if (pathname === '/') return 'inicio'
  if (pathname === '/ferramentas') return 'catalogo-ferramentas'
  if (pathname === '/jogos') return 'catalogo-jogos'
  return 'outras'
}

export function track(name, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, { ...pageContext(), ...params })
}

export const clip = (text, max = 100) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
