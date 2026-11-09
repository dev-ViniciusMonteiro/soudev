'use client'

// "Carrinho" de orçamento: a pessoa junta serviços, conta o que precisa e envia.
// O pedido vai para o painel /admin pelo mesmo caminho do balão de ideias (worker soudev-ideias, /ideias).

import { useEffect, useState } from 'react'
import { getServico } from '@/lib/servicos'

const CHAVE = 'orcamento-v1'
const EVENTO = 'orcamento-mudou'
const API = (process.env.NEXT_PUBLIC_IDEIAS_API || '').replace(/\/$/, '')
const EMAIL = 'dev.viniciusmonteiro@gmail.com'

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]') } catch { return [] }
}
function gravar(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)) } catch {}
  window.dispatchEvent(new Event(EVENTO))
}
function useCarrinho() {
  const [lista, setLista] = useState([])
  useEffect(() => {
    const at = () => setLista(ler())
    at()
    window.addEventListener(EVENTO, at)
    window.addEventListener('storage', at)
    return () => { window.removeEventListener(EVENTO, at); window.removeEventListener('storage', at) }
  }, [])
  return lista
}
const abrir = () => window.dispatchEvent(new Event('orcamento-abrir'))

/** Botão "Adicionar ao orçamento" de um item. */
export function BotaoAdicionar({ servico, item }) {
  const lista = useCarrinho()
  const tem = lista.some((x) => x.servico === servico && x.item === item)
  return (
    <button
      type="button"
      className={`sv-add${tem ? ' tem' : ''}`}
      aria-pressed={tem}
      onClick={() => gravar(tem ? lista.filter((x) => !(x.servico === servico && x.item === item)) : [...lista, { servico, item }])}
    >
      {tem ? '✓ No orçamento' : '+ Adicionar ao orçamento'}
    </button>
  )
}

/** Botão grande "Pedir orçamento" (abre o carrinho; se vazio, abre só com o formulário). */
export function BotaoPedir({ children = 'Pedir orçamento grátis', className = 'btn btn-primary btn-lg' }) {
  return <button type="button" className={className} onClick={abrir}>{children}</button>
}

/** Carrinho flutuante + gaveta com o formulário. Vai uma vez por página. */
export function Carrinho() {
  const lista = useCarrinho()
  const [aberto, setAberto] = useState(false)
  const [f, setF] = useState({ nome: '', contato: '', empresa: '', modalidade: 'Online', prazo: 'Sem pressa', verba: 'Ainda não sei', mensagem: '', website: '' })
  const [estado, setEstado] = useState('') // '' | enviando | ok | erro
  const [erro, setErro] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    const ab = () => setAberto(true)
    window.addEventListener('orcamento-abrir', ab)
    return () => window.removeEventListener('orcamento-abrir', ab)
  }, [])
  useEffect(() => {
    if (!aberto) return
    const esc = (e) => e.key === 'Escape' && setAberto(false)
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [aberto])

  const itens = lista.map((x) => {
    const s = getServico(x.servico)
    const it = s?.itens.find((i) => i.id === x.item)
    return s && it ? { ...x, servicoNome: s.nome, icone: s.icone, nome: it.nome } : null
  }).filter(Boolean)

  const texto = () => [
    '[ORÇAMENTO]',
    `Nome: ${f.nome}`,
    `Contato: ${f.contato}`,
    f.empresa ? `Empresa: ${f.empresa}` : null,
    `Atendimento: ${f.modalidade} · Prazo: ${f.prazo} · Verba: ${f.verba}`,
    '',
    itens.length ? 'Serviços:' : 'Serviços: (não escolheu, só descreveu)',
    ...itens.map((i) => `- ${i.servicoNome}: ${i.nome}`),
    '',
    'O que precisa:',
    f.mensagem,
  ].filter((l) => l !== null).join('\n').slice(0, 1990)

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    if (!f.nome.trim() || f.contato.trim().length < 6) { setErro('Preencha seu nome e um WhatsApp ou e-mail para eu responder.'); return }
    if (!itens.length && f.mensagem.trim().length < 10) { setErro('Escolha um serviço ou conte em poucas palavras o que você precisa.'); return }
    setEstado('enviando')
    try {
      if (!API) throw new Error('sem api')
      const r = await fetch(`${API}/ideias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto(), nome: f.nome.slice(0, 120), pagina: window.location.pathname, website: f.website }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'falhou')
      setEstado('ok')
      gravar([])
      try { window.gtag?.('event', 'generate_lead', { form: 'orcamento', itens: itens.length }) } catch {}
    } catch {
      setEstado('erro')
    }
  }
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent('Pedido de orçamento')}&body=${encodeURIComponent(texto())}`

  return (
    <>
      <button type="button" className={`sv-flutuante${itens.length ? ' cheio' : ''}`} onClick={() => setAberto(true)} aria-label={`Abrir orçamento (${itens.length} itens)`}>
        🧾 Orçamento{itens.length > 0 && <b>{itens.length}</b>}
      </button>

      {aberto && (
        <div className="sv-fundo" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
          <aside className="sv-gaveta" role="dialog" aria-modal="true" aria-labelledby="sv-gaveta-titulo">
            <header>
              <h2 id="sv-gaveta-titulo">Seu pedido de orçamento</h2>
              <button type="button" className="sv-fechar" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
            </header>

            {estado === 'ok' ? (
              <div className="sv-ok">
                <p className="sv-ok-icone">✅</p>
                <h3>Pedido enviado!</h3>
                <p>Recebi seu pedido e respondo no contato que você deixou com valores e prazos. Obrigado pela confiança!</p>
                <button type="button" className="btn" onClick={() => { setEstado(''); setAberto(false) }}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={enviar} className="sv-form">
                {itens.length ? (
                  <ul className="sv-itens">
                    {itens.map((i) => (
                      <li key={i.servico + i.item}>
                        <span>{i.icone}</span>
                        <div><b>{i.nome}</b><small>{i.servicoNome}</small></div>
                        <button type="button" onClick={() => gravar(lista.filter((x) => !(x.servico === i.servico && x.item === i.item)))} aria-label={`Tirar ${i.nome}`}>✕</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="sv-vazio">Nenhum serviço escolhido ainda. Tudo bem: conte abaixo o que você precisa, ou <a href="/servicos#catalogo" onClick={() => setAberto(false)}>escolha no catálogo</a>.</p>
                )}

                <label>Seu nome<input value={f.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" required /></label>
                <label>WhatsApp ou e-mail<input value={f.contato} onChange={(e) => set('contato', e.target.value)} autoComplete="email" placeholder="(19) 9 9999-9999 ou voce@email.com" required /></label>
                <label>Empresa <small>(opcional)</small><input value={f.empresa} onChange={(e) => set('empresa', e.target.value)} autoComplete="organization" /></label>
                <div className="sv-tres">
                  <label>Atendimento<select value={f.modalidade} onChange={(e) => set('modalidade', e.target.value)}><option>Online</option><option>Presencial (Mogi Guaçu e região)</option><option>Tanto faz</option></select></label>
                  <label>Prazo<select value={f.prazo} onChange={(e) => set('prazo', e.target.value)}><option>Sem pressa</option><option>Este mês</option><option>Urgente (esta semana)</option></select></label>
                  <label>Verba<select value={f.verba} onChange={(e) => set('verba', e.target.value)}><option>Ainda não sei</option><option>Até R$ 500</option><option>R$ 500 a R$ 2.000</option><option>R$ 2.000 a R$ 10.000</option><option>Acima de R$ 10.000</option></select></label>
                </div>
                <label>Conte sua ideia ou o que precisa<textarea rows={5} value={f.mensagem} onChange={(e) => set('mensagem', e.target.value)} placeholder="Ex.: quero um sistema de agendamento para minha clínica, com lembrete no WhatsApp." /></label>
                {/* campo invisível contra robôs */}
                <input className="sv-mel" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} aria-hidden="true" />
                {erro && <p className="sv-erro">{erro}</p>}
                {estado === 'erro' && <p className="sv-erro">Não consegui enviar agora. <a href={mailto}>Mande por e-mail</a> que o pedido já vai preenchido.</p>}
                <button className="btn btn-primary btn-lg" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar pedido de orçamento'}</button>
                <p className="sv-nota">Sem compromisso. Seus dados são usados só para responder este pedido (<a href="/privacidade">privacidade</a>).</p>
              </form>
            )}
          </aside>
        </div>
      )}
    </>
  )
}
