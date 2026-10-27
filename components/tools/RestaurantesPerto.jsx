'use client'

// Buscador de restaurantes e comida: mostra o mapa do Google embutido na página (iframe output=embed,
// sem chave) com os resultados da busca, e também permite abrir no app do Google Maps para rota/detalhes.

import { useState } from 'react'
import { track } from '@/lib/analytics'
import { minhaPosicao } from '@/lib/apis'
import { Field, Notice } from '../ui'

const CATEGORIAS = [
  ['🍽️', 'Restaurantes', 'restaurantes'],
  ['🍔', 'Lanchonetes', 'lanchonete'],
  ['🍕', 'Pizzaria', 'pizzaria'],
  ['🍟', 'Hambúrguer', 'hamburgueria'],
  ['🍣', 'Japonesa / sushi', 'comida japonesa'],
  ['🥩', 'Churrascaria', 'churrascaria'],
  ['🍛', 'Caseira / marmita', 'marmitaria comida caseira'],
  ['🥗', 'Self-service', 'restaurante self service por quilo'],
  ['☕', 'Cafeteria', 'cafeteria'],
  ['🍺', 'Bar', 'bar'],
  ['🥐', 'Padaria', 'padaria'],
  ['🍦', 'Sorveteria', 'sorveteria'],
  ['🫐', 'Açaí', 'açaí'],
  ['🥟', 'Pastelaria', 'pastelaria'],
  ['🌱', 'Vegetariana', 'restaurante vegetariano'],
  ['🕑', 'Aberto agora', 'restaurante aberto agora'],
]

export default function RestaurantesPerto() {
  const [regiao, setRegiao] = useState('')
  const [origem, setOrigem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [custom, setCustom] = useState('')
  const [termo, setTermo] = useState('') // busca ativa

  const usarLocalizacao = async () => {
    setErro(''); setBusy(true)
    try { const o = await minhaPosicao(); setOrigem(o); setRegiao('') } catch (e) { setErro(e.message) } finally { setBusy(false) }
  }

  const queryTexto = (t) => (origem ? t : regiao.trim() ? `${t} em ${regiao.trim()}` : t)
  const embedUrl = (t) => {
    const base = 'https://www.google.com/maps?output=embed&hl=pt-BR'
    if (origem) return `${base}&q=${encodeURIComponent(t)}&ll=${origem.lat},${origem.lon}&z=15`
    return `${base}&q=${encodeURIComponent(queryTexto(t))}`
  }
  const appUrl = (t) => (origem
    ? `https://www.google.com/maps/search/${encodeURIComponent(t)}/@${origem.lat},${origem.lon},15z`
    : `https://www.google.com/maps/search/${encodeURIComponent(queryTexto(t))}`)

  const buscar = (t) => { const v = (t || '').trim(); if (!v) return; setTermo(v); track('comer_mapa', { termo: v.slice(0, 40) }) }

  const ondeLabel = origem ? 'perto da sua localização' : regiao.trim() ? `em ${regiao.trim()}` : 'pela sua conexão (aproximado)'

  return (
    <div className="tool-stack cp">
      <style>{CSS}</style>
      <Notice kind="info">
        Escolha onde procurar e o que quer comer: o mapa do Google aparece aqui na página com os lugares. Para rota e detalhes completos, use “Abrir no Google Maps”.
      </Notice>

      <h2 className="tool-subtitle">1. Onde procurar?</h2>
      <div className="grid-2">
        <button type="button" className="btn btn-primary btn-lg" onClick={usarLocalizacao} disabled={busy}>
          {busy ? 'Pegando localização…' : '📍 Usar minha localização'}
        </button>
        <Field label="Ou digite a cidade/bairro">
          <input value={regiao} onChange={(e) => { setRegiao(e.target.value); if (e.target.value) setOrigem(null) }} placeholder="Ex.: Mogi Guaçu, SP" />
        </Field>
      </div>
      <p className="cp-onde">Buscando <b>{ondeLabel}</b>.{origem && ' ✓ Localização obtida.'}</p>
      {erro && <Notice kind="error">{erro}</Notice>}

      <h2 className="tool-subtitle">2. O que você quer comer?</h2>
      <div className="cp-cats">
        {CATEGORIAS.map(([emoji, nome, t]) => (
          <button key={t} type="button" className={'cp-cat' + (termo === queryTexto(t) || termo === t ? ' sel' : '')} onClick={() => buscar(t)}>
            <span className="cp-emoji">{emoji}</span>{nome}
          </button>
        ))}
      </div>
      <form className="input-group cp-custom" onSubmit={(e) => { e.preventDefault(); buscar(custom) }}>
        <Field label="Procurar outra coisa">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: comida mexicana, tapiocaria, sorvete…" />
        </Field>
        <button type="submit" className="btn btn-primary">Buscar</button>
      </form>

      {termo && (
        <div className="cp-mapa-box">
          <div className="cp-mapa-top">
            <span>Mostrando <b>{termo}</b> {ondeLabel}</span>
            <a className="btn btn-ghost" href={appUrl(termo)} target="_blank" rel="noopener noreferrer">Abrir no Google Maps ↗</a>
          </div>
          <div className="cp-mapa">
            <iframe key={embedUrl(termo)} src={embedUrl(termo)} title={`Mapa: ${termo}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
        </div>
      )}

      <p className="muted small">O mapa é do Google Maps, incorporado aqui. Nada é enviado para servidores; sua localização, se permitida, é usada só para centralizar a busca.</p>
    </div>
  )
}

const CSS = `
.cp .cp-onde{color:var(--muted);font-size:14px;margin:8px 0 4px}
.cp .cp-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:8px}
.cp .cp-cat{display:flex;align-items:center;gap:10px;text-align:left;padding:12px 14px;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);border-radius:var(--radius-lg);cursor:pointer;font:inherit;font-weight:600;font-size:14px;transition:border-color .15s,transform .05s}
.cp .cp-cat:hover{border-color:var(--accent)}
.cp .cp-cat:active{transform:translateY(1px)}
.cp .cp-cat.sel{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
.cp .cp-emoji{font-size:24px;line-height:1}
.cp .cp-custom{margin-top:6px}
.cp .cp-mapa-box{margin-top:16px;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden;background:var(--panel)}
.cp .cp-mapa-top{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px;font-size:14px;border-bottom:1px solid var(--line)}
.cp .cp-mapa{position:relative;width:100%;aspect-ratio:16/11;background:var(--panel-2)}
.cp .cp-mapa iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
@media(max-width:640px){.cp .cp-mapa{aspect-ratio:3/4}}
`
