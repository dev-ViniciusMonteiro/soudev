const SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxwZyl4owjKNj0yck249o0K71T2gKHHGB85rmcmA0lWo1Zed6-Y6zERNgykeRFgmq9cCg/exec'

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const nome = String(body?.nome ?? '').trim().slice(0, 200)
  const mensagem = String(body?.mensagem ?? '').trim().slice(0, 5000)
  if (!nome || !mensagem) {
    return Response.json({ error: 'Nome e mensagem são obrigatórios.' }, { status: 400 })
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ nome, mensagem }),
    })
    const text = await response.text()
    if (!response.ok) {
      return Response.json({ error: 'Erro ao enviar para o Google Script', details: text }, { status: response.status })
    }
    return Response.json({ ok: true, data: text })
  } catch (error) {
    return Response.json({ error: 'Falha ao processar a requisição.', details: String(error) }, { status: 500 })
  }
}
