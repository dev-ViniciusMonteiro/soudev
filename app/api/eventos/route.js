// Repasse para a Ticketmaster Discovery API (eventos com link de compra). A chave é grátis
// (developer.ticketmaster.com) e fica só no servidor, na variável TICKETMASTER_KEY.
// Sem a chave, o buscador ainda funciona pelos atalhos (Sympla/Eventbrite/Google) no cliente.

const BASE = 'https://app.ticketmaster.com/discovery/v2/events.json'

const CATEGORIAS = {
  musica: 'Music',
  esportes: 'Sports',
  teatro: 'Arts & Theatre',
  familia: 'Family',
  cinema: 'Film',
}

function melhorImagem(imagens) {
  if (!Array.isArray(imagens) || !imagens.length) return null
  // prefere 16:9 com largura razoável; cai para a maior disponível
  const dezeseis = imagens.filter((i) => i.ratio === '16_9' && i.width >= 480).sort((a, b) => a.width - b.width)
  if (dezeseis[0]) return dezeseis[0].url
  return [...imagens].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || null
}

export async function GET(request) {
  const key = process.env.TICKETMASTER_KEY
  if (!key) {
    return Response.json({ erro: 'Busca por API não configurada. Use os atalhos abaixo.', precisaKey: true }, { status: 200 })
  }

  const p = new URL(request.url).searchParams
  const u = new URL(BASE)
  u.searchParams.set('apikey', key)
  u.searchParams.set('size', '48')
  u.searchParams.set('sort', 'date,asc')
  u.searchParams.set('locale', '*')

  const termo = (p.get('termo') || '').trim()
  const cidade = (p.get('cidade') || '').trim()
  const pais = (p.get('pais') || '').trim()
  const categoria = (p.get('categoria') || '').trim()
  const de = (p.get('de') || '').trim()
  const ate = (p.get('ate') || '').trim()

  if (termo) u.searchParams.set('keyword', termo)
  if (cidade) u.searchParams.set('city', cidade)
  if (pais) u.searchParams.set('countryCode', pais)
  if (CATEGORIAS[categoria]) u.searchParams.set('classificationName', CATEGORIAS[categoria])
  if (/^\d{4}-\d{2}-\d{2}$/.test(de)) u.searchParams.set('startDateTime', `${de}T00:00:00Z`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ate)) u.searchParams.set('endDateTime', `${ate}T23:59:59Z`)

  let dados
  try {
    const r = await fetch(u, { headers: { Accept: 'application/json' } })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      return Response.json({ erro: `A Ticketmaster respondeu ${r.status}.`, detalhe: txt.slice(0, 200) }, { status: 200 })
    }
    dados = await r.json()
  } catch (e) {
    return Response.json({ erro: 'Falha ao consultar a Ticketmaster.', detalhe: String(e) }, { status: 200 })
  }

  const eventos = (dados?._embedded?.events || []).map((e) => {
    const v = e._embedded?.venues?.[0] || {}
    return {
      id: e.id,
      nome: e.name,
      url: e.url || null,
      data: e.dates?.start?.localDate || null,
      hora: e.dates?.start?.localTime || null,
      local: v.name || null,
      cidade: v.city?.name || null,
      estado: v.state?.stateCode || v.state?.name || null,
      pais: v.country?.countryCode || null,
      imagem: melhorImagem(e.images),
      categoria: e.classifications?.[0]?.segment?.name || null,
    }
  })

  return Response.json({ eventos })
}
