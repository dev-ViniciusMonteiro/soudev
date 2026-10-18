// Service worker do Treino: abre sem internet.
// Páginas: rede primeiro, cache se offline. Arquivos do Next, lista de exercícios e fotos: cache primeiro.
const CACHE = 'treino-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/apps/treino/app', '/apps/treino/exercicios.json'])).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('treino-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const estatico = url.pathname.startsWith('/_next/static/') || url.pathname === '/apps/treino/exercicios.json' || url.hostname === 'cdn.jsdelivr.net'
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone()
          caches.open(CACHE).then((c) => c.put(req, copia))
          return r
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/apps/treino/app'))),
    )
    return
  }
  if (estatico) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((resp) => {
            if (resp.ok || resp.type === 'opaque') {
              const copia = resp.clone()
              caches.open(CACHE).then((c) => c.put(req, copia))
            }
            return resp
          }),
      ),
    )
  }
})
