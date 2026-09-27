export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { nome, mensagem } = req.body || {}

  if (!nome || !mensagem) {
    return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' })
  }

  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbxwZyl4owjKNj0yck249o0K71T2gKHHGB85rmcmA0lWo1Zed6-Y6zERNgykeRFgmq9cCg/exec', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ nome, mensagem }),
    })

    const text = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro ao enviar para o Google Script',
        details: text,
      })
    }

    return res.status(200).json({ ok: true, data: text })
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao processar a requisição.', details: String(error) })
  }
}
