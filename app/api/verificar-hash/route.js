// Consulta impressões digitais (SHA-256) em bases públicas de arquivos conhecidos.
// Só o hash chega aqui: o arquivo continua no aparelho de quem usa a ferramenta.
// CIRCL hashlookup: grátis e sem chave (arquivos legítimos e maliciosos conhecidos).
// MalwareBazaar (abuse.ch): base de vírus, ativada com a variável ABUSECH_AUTH_KEY (chave grátis em auth.abuse.ch).

const MAX_HASHES = 25
const TIMEOUT = 8000

async function circl(hash) {
  const response = await fetch(`https://hashlookup.circl.lu/lookup/sha256/${hash}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`CIRCL ${response.status}`)
  const data = await response.json()
  const nome = String(data.FileName || '').split('/').pop()
  return {
    nome: data.ProductCode?.ProductName && data.ProductCode.ProductName !== 'TBD' ? `${nome} — ${data.ProductCode.ProductName}` : nome,
    malicioso: data.KnownMalicious ? String(data.KnownMalicious).slice(0, 80) : null,
  }
}

async function bazaar(hash, key) {
  const response = await fetch('https://mb-api.abuse.ch/api/v1/', {
    method: 'POST',
    headers: { 'Auth-Key': key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: 'get_info', hash }),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!response.ok) throw new Error(`MalwareBazaar ${response.status}`)
  const data = await response.json()
  if (data.query_status !== 'ok' || !data.data?.length) return null
  const item = data.data[0]
  return { assinatura: item.signature || null, tags: (item.tags || []).slice(0, 6), visto: item.first_seen || null }
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Requisição inválida.' }, { status: 400 })
  }
  const hashes = [...new Set((Array.isArray(body?.hashes) ? body.hashes : []).map((h) => String(h).toLowerCase()))]
    .filter((h) => /^[a-f0-9]{64}$/.test(h))
    .slice(0, MAX_HASHES)
  if (!hashes.length) return Response.json({ error: 'Envie de 1 a 25 hashes SHA-256.' }, { status: 400 })

  const key = process.env.ABUSECH_AUTH_KEY
  const resultados = {}
  let falhas = 0
  await Promise.all(
    hashes.map(async (hash) => {
      const [c, m] = await Promise.allSettled([circl(hash), key ? bazaar(hash, key) : Promise.resolve(null)])
      if (c.status === 'rejected' || m.status === 'rejected') falhas++
      const circlResult = c.status === 'fulfilled' ? c.value : null
      const bazaarResult = m.status === 'fulfilled' ? m.value : null
      if (circlResult || bazaarResult) resultados[hash] = { circl: circlResult, bazaar: bazaarResult }
    }),
  )

  return Response.json(
    { resultados, fontes: key ? ['CIRCL', 'MalwareBazaar'] : ['CIRCL'], incompleto: falhas > 0 },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
