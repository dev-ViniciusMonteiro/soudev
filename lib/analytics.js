// Google Analytics 4. Eventos de uso das ferramentas e dos jogos.
// Nunca enviamos conteúdo digitado nem nome de arquivo: só o tipo de ação.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-RGXMM91N6C'

// Escolha de cookies (LGPD). Vale por 12 meses; depois o aviso aparece de novo.
export const CONSENT_KEY = 'soudev-consent'
const CONSENT_VERSION = 1
const CONSENT_MAX_AGE = 365 * 24 * 60 * 60 * 1000

// Snippet do Google com: Consent Mode v2 (tudo negado até a pessoa aceitar, inclusive para o AdSense),
// página vista manual (para mandar o grupo de conteúdo certo em cada navegação),
// GA desligado em localhost e modo de depuração com ?ga_debug=1 (aparece no DebugView do GA).
export const gaInitScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var consent = null;
try { consent = JSON.parse(localStorage.getItem('${CONSENT_KEY}')); } catch (e) {}
if (!consent || consent.v !== ${CONSENT_VERSION} || Date.now() - consent.t > ${CONSENT_MAX_AGE}) consent = {};
var ads = consent.ads ? 'granted' : 'denied';
gtag('consent', 'default', {
  analytics_storage: consent.analytics ? 'granted' : 'denied',
  ad_storage: ads, ad_user_data: ads, ad_personalization: ads,
  functionality_storage: 'granted', security_storage: 'granted'
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
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

// Escolha salva e ainda válida, ou null se a pessoa ainda não escolheu.
export function readConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSENT_KEY))
    if (saved?.v === CONSENT_VERSION && Date.now() - saved.t <= CONSENT_MAX_AGE) return saved
  } catch {
    // Navegação anônima ou armazenamento bloqueado: o aviso aparece de novo.
  }
  return null
}

export function saveConsent({ analytics, ads }) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, t: Date.now(), analytics, ads }))
  } catch {
    // Sem armazenamento a escolha vale só para esta visita.
  }
  if (typeof window.gtag !== 'function') return
  const adsState = ads ? 'granted' : 'denied'
  window.gtag('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: adsState,
    ad_user_data: adsState,
    ad_personalization: adsState,
  })
  track('consent_update', { consent_analytics: analytics ? 'sim' : 'nao', consent_ads: ads ? 'sim' : 'nao' })
}

// O link "Preferências de cookies" do rodapé abre o aviso de novo.
export const OPEN_CONSENT_EVENT = 'soudev:cookies'

export const clip =(text, max = 100) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
