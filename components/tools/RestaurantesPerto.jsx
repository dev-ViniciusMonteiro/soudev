'use client'

// Buscador de restaurantes e comida: monta a busca certa e abre no Google Maps, já centrado na sua
// localização (opcional) ou na região digitada. Sem servidor e sem depender de dados incompletos.

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
  ['🍛', 'Comida caseira / marmita', 'marmitaria comida caseira'],
  ['🥗', 'Self-service / por quilo', 'restaurante self service por quilo'],
  ['☕', 'Cafeteria', 'cafeteria'],
  ['🍺', 'Bar', 'bar'],
  ['🥐', 'Padaria', 'padaria'],
  ['🍦', 'Sorveteria', 'sorveteria'],
  ['🫐', 'Açaí', 'açaí'],
  ['🥟', 'Pastelaria', 'pastelaria'],
  ['🌱', 'Vegetariana / vegana', 'restaurante vegetariano'],
  ['🕑', 'Aberto agora', 'restaurante aberto agora'],
]

export default function RestaurantesPerto() {
  const [regiao, setRegiao] = useState('')
  const [origem, setOrigem] = useState(null)
  const [localLabel, setLocalLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [custom, setCustom] = useState('')

  const usarLocalizacao = async () => {
    setErro(''); setBusy(true)
    try {
      const o = await minhaPosicao()
      setOrigem(o); setRegiao(''); setLocalLabel('sua localização atual')
    } catch (e) { setErro(e.message) } finally { setBusy(false) }
  }

  const abrir = (termo) => {
    const t = termo.trim(); if (!t) return
    let url
    if (origem) url = `https://www.google.com/maps/search/${encodeURIComponent(t)}/@${origem.lat},${origem.lon},15z`
    else if (regiao.trim()) url = `https://www.google.com/maps/search/${encodeURIComponent(t + ' em ' + regiao.trim())}`
    else url = `https://www.google.com/maps/search/${encodeURIComponent(t)}`
    window.open(url, '_blank', 'noopener')
    track('comer_maps', { termo: t.slice(0, 40) })
  }

  const ondeLabel = origem ? 'perto da sua localização' : regiao.trim() ? `em ${regiao.trim()}` : 'perto de você (pela sua conexão)'

  return (
    <div className="tool-stack cp">
      <style>{CSS}</style>
      <Notice kind="info">
        Escolha onde procurar e o que quer comer: a busca abre no <b>Google Maps</b>, com as avaliações, fotos, horários e rota de cada lugar. Rápido e sempre atualizado.
      </Notice>

      <h2 className="tool-subtitle">1. Onde você quer procurar?</h2>
      <div className="grid-2">
        <button type="button" className="btn btn-primary btn-lg" onClick={usarLocalizacao} disabled={busy}>
          {busy ? 'Pegando localização…' : '📍 Usar minha localização'}
        </button>
        <Field label="Ou digite a cidade/bairro">
          <input value={regiao} onChange={(e) => { setRegiao(e.target.value); if (e.target.value) { setOrigem(null); setLocalLabel('') } }} placeholder="Ex.: Mogi Guaçu, SP" />
        </Field>
      </div>
      <p className="cp-onde">Buscando <b>{ondeLabel}</b>.{localLabel && ' ✓ Localização obtida.'}</p>
      {erro && <Notice kind="error">{erro}</Notice>}

      <h2 className="tool-subtitle">2. O que você quer comer?</h2>
      <div className="cp-cats">
        {CATEGORIAS.map(([emoji, nome, termo]) => (
          <button key={termo} type="button" className="cp-cat" onClick={() => abrir(termo)}>
            <span className="cp-emoji">{emoji}</span>{nome}
          </button>
        ))}
      </div>

      <form className="input-group cp-custom" onSubmit={(e) => { e.preventDefault(); abrir(custom || 'restaurantes') }}>
        <Field label="Procurar outra coisa">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Ex.: comida mexicana, sorvete, tapiocaria…" />
        </Field>
        <button type="submit" className="btn btn-primary">Buscar no mapa</button>
      </form>

      <p className="muted small">Abre em uma nova aba, no app ou site do Google Maps. Nada é enviado para servidores; sua localização, se você permitir, é usada só para centralizar a busca.</p>
    </div>
  )
}

const CSS = `
.cp .cp-onde{color:var(--muted);font-size:14px;margin:8px 0 4px}
.cp .cp-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:8px}
.cp .cp-cat{display:flex;align-items:center;gap:10px;text-align:left;padding:12px 14px;border:1px solid var(--line-strong);background:var(--panel);color:var(--text);border-radius:var(--radius-lg);cursor:pointer;font:inherit;font-weight:600;font-size:14px;transition:border-color .15s,transform .05s}
.cp .cp-cat:hover{border-color:var(--accent)}
.cp .cp-cat:active{transform:translateY(1px)}
.cp .cp-emoji{font-size:24px;line-height:1}
.cp .cp-custom{margin-top:6px}
`
