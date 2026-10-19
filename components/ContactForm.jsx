'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'
import { Field } from './ui'

export default function ContactForm({
  hint = 'Sugira uma ferramenta, peça um projeto ou deixe seu WhatsApp/e-mail.',
  origem = 'contato',
}) {
  const [form, setForm] = useState({ nome: '', mensagem: '' })
  const [state, setState] = useState('idle')

  const submit = async (event) => {
    event.preventDefault()
    if (!form.nome.trim() || !form.mensagem.trim() || state === 'sending') return
    setState('sending')
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), mensagem: form.mensagem.trim() }),
      })
      setState(response.ok ? 'sent' : 'error')
      track(response.ok ? 'generate_lead' : 'contact_error', { form: origem })
    } catch {
      setState('error')
      track('contact_error', { form: origem })
    }
  }

  if (state === 'sent') {
    return (
      <div className="contact-card">
        <h3>Mensagem enviada. Obrigado!</h3>
        <p className="muted">Vou responder assim que possível.</p>
      </div>
    )
  }

  return (
    <form className="contact-card" onSubmit={submit}>
      <Field label="Seu nome">
        <input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} required />
      </Field>
      <Field label="Mensagem e forma de contato" hint={hint}>
        <textarea rows={5} value={form.mensagem} onChange={(event) => setForm({ ...form, mensagem: event.target.value })} required />
      </Field>
      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
        {state === 'sending' ? 'Enviando…' : 'Enviar mensagem'}
      </button>
      {state === 'error' && <p className="notice error">Não foi possível enviar agora. Tente novamente em instantes.</p>}
    </form>
  )
}
