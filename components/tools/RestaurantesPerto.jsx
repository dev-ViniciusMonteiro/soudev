'use client'

// Buscador de restaurantes e comida por região, com dados abertos do OpenStreetMap (Overpass),
// geocodificação por Nominatim e geolocalização do navegador. Grátis e sem chave de API.

import { useMemo, useState } from 'react'
import { Field, Notice } from '../ui'
import { distanciaKm, fetchJson, formatKm, minhaPosicao } from '@/lib/apis'

// amenity/shop -> [rótulo, grupo, emoji]
const CATS = {
  restaurant: ['Restaurante', 'rest', '🍽️'],
  food_court: ['Praça de alimentação', 'rest', '🍴'],
  fast_food: ['Lanchonete', 'lanche', '🍔'],
  cafe: ['Café', 'cafe', '☕'],
  bar: ['Bar', 'bar', '🍺'],
  pub: ['Bar', 'bar', '🍻'],
  ice_cream: ['Sorveteria', 'sorvete', '🍦'],
  bakery: ['Padaria', 'padaria', '🥐'],
}
const GRUPOS = [['tudo', 'Tudo'], ['rest', 'Restaurantes'], ['lanche', 'Lanches'], ['cafe', 'Cafés'], ['bar', 'Bares'], ['padaria', 'Padarias'], ['sorvete', 'Sorvetes']]

// tradução de alguns tipos de cozinha do OSM (tag cuisine)
const CUISINE = {
  pizza: 'Pizza', burger: 'Hambúrguer', regional: 'Regional', brazilian: 'Brasileira', japanese: 'Japonesa', sushi: 'Sushi',
  italian: 'Italiana', chinese: 'Chinesa', mexican: 'Mexicana', arab: 'Árabe', american: 'Americana', french: 'Francesa',
  coffee_shop: 'Cafeteria', ice_cream: 'Sorvete', bakery: 'Padaria', barbecue: 'Churrasco', steak_house: 'Steakhouse',
  seafood: 'Frutos do mar', vegetarian: 'Vegetariana', vegan: 'Vegana', pasta: 'Massas', chicken: 'Frango', sandwich: 'Sanduíche',
  dessert: 'Sobremesas', asian: 'Asiática', portuguese: 'Portuguesa', spanish: 'Espanhola', german: 'Alemã', thai: 'Tailandesa',
  indian: 'Indiana', korean: 'Coreana', fish_and_chips: 'Peixe frito', kebab: 'Kebab', juice: 'Sucos', breakfast: 'Café da manhã',
}
const traduzCuisine = (c) => CUISINE[c] || (c ? c.replace(/_/g, ' ').replace(/^\w/, (m) => m.toUpperCase()) : '')

function catDe(tags) {
  if (tags.amenity && CATS[tags.amenity]) return tags.amenity
  if (tags.shop === 'bakery') return 'bakery'
  return null
}

function lugar(el, origem) {
  const tags = el.tags || {}
  const cat = catDe(tags)
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (!cat || lat == null || !tags.name) return null
  const endereco = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ')
  const cuisines = (tags.cuisine || '').split(';').map((c) => c.trim()).filter(Boolean)
  return {
    id: `${el.type}${el.id}`,
    cat, grupo: CATS[cat][1],
    nome: tags.name,
    lat, lon,
    km: distanciaKm(origem.lat, origem.lon, lat, lon),
    endereco: endereco || tags['addr:full'] || '',
    bairro: tags['addr:suburb'] || tags['addr:neighbourhood'] || '',
    telefone: tags.phone || tags['contact:phone'] || '',
    site: tags.website || tags['contact:website'] || '',
    horario: tags.opening_hours === '24/7' ? '' : (tags.opening_hours || ''),
    h24: tags.opening_hours === '24/7',
    cuisines,
    veg: tags['diet:vegetarian'] === 'yes' || tags['diet:vegetarian'] === 'only',
    vegan: tags['diet:vegan'] === 'yes' || tags['diet:vegan'] === 'only',
    delivery: tags.delivery === 'yes',
    cuisineTxt: cuisines.map(traduzCuisine).join(', '),
  }
}

async function buscarOverpass(origem, raio) {
  const resp = await fetchJson(`/api/lugares?action=overpass&lat=${origem.lat}&lon=${origem.lon}&raio=${raio}`, { timeout: 30000, retries: 0 })
  return (resp.elements || []).map((el) => lugar(el, origem)).filter(Boolean)
}

const mapaRota = (l) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`
const site = (s) => (s.startsWith('http') ? s : 'https://' + s)

export default function RestaurantesPerto() {
  const [endereco, setEndereco] = useState('')
  const [origem, setOrigem] = useState(null)
  const [lugares, setLugares] = useState(null)
  const [grupo, setGrupo] = useState('tudo')
  const [cuisineSel, setCuisineSel] = useState('')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const buscar = async (o) => {
    setOrigem(o); setLugares(null); setAviso(''); setErro(''); setGrupo('tudo'); setCuisineSel(''); setQ('')
    setBusy('Procurando lugares para comer por perto…')
    let lista = []
    try {
      lista = await buscarOverpass(o, 1500)
      if (lista.length < 8) lista = await buscarOverpass(o, 4000)
      if (lista.length < 8) lista = await buscarOverpass(o, 8000)
    } catch {
      setBusy(''); setErro('Não foi possível buscar agora. Tente de novo em instantes ou veja no Google Maps.'); return
    }
    const vistos = new Set()
    lista = lista.sort((a, b) => a.km - b.km).filter((l) => {
      const k = `${l.nome}|${l.lat.toFixed(3)}|${l.lon.toFixed(3)}`
      if (vistos.has(k)) return false; vistos.add(k); return true
    })
    if (!lista.length) setAviso('Não encontramos lugares cadastrados no mapa aberto por aqui. Em cidades pequenas a cobertura é menor — tente ampliar a busca pelo Google Maps.')
    setLugares(lista); setBusy('')
  }

  const usarLocalizacao = async () => {
    setErro(''); setBusy('Pegando sua localização…')
    try { await buscar(await minhaPosicao()) } catch (e) { setBusy(''); setErro(e.message) }
  }
  const buscarEndereco = async (e) => {
    e.preventDefault(); setErro('')
    if (endereco.trim().length < 3) return setErro('Digite um bairro, cidade ou endereço.')
    setBusy('Procurando a região…')
    try {
      const r = await fetchJson(`/api/lugares?action=geocode&q=${encodeURIComponent(endereco)}`)
      if (!Array.isArray(r) || !r.length) { setBusy(''); return setErro('Região não encontrada. Tente “bairro, cidade”.') }
      await buscar({ lat: Number(r[0].lat), lon: Number(r[0].lon), nome: r[0].display_name })
    } catch { setBusy(''); setErro('Não foi possível procurar a região agora.') }
  }

  // tipos de cozinha presentes (para o seletor), ordenados por frequência
  const cuisinesDisp = useMemo(() => {
    if (!lugares) return []
    const cont = {}
    lugares.forEach((l) => l.cuisines.forEach((c) => { cont[c] = (cont[c] || 0) + 1 }))
    return Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([c]) => c)
  }, [lugares])

  const visiveis = useMemo(() => {
    let l = lugares || []
    if (grupo !== 'tudo') l = l.filter((x) => x.grupo === grupo)
    if (cuisineSel) l = l.filter((x) => x.cuisines.includes(cuisineSel))
    const t = q.trim().toLowerCase()
    if (t) l = l.filter((x) => x.nome.toLowerCase().includes(t) || x.cuisineTxt.toLowerCase().includes(t))
    return l.slice(0, 50)
  }, [lugares, grupo, cuisineSel, q])

  return (
    <div className="tool-stack rp">
      <style>{CSS}</style>
      <Notice kind="info">
        Ache restaurantes, lanchonetes, cafés, bares, padarias e sorveterias perto de você ou de uma região, com os dados abertos do OpenStreetMap. Grátis, sem cadastro e sem enviar sua localização para servidores.
      </Notice>

      <div className="grid-2">
        <button type="button" className="btn btn-primary btn-lg" onClick={usarLocalizacao} disabled={!!busy}>📍 Usar minha localização</button>
        <form className="input-group" onSubmit={buscarEndereco}>
          <Field label="Ou digite a região">
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Bairro, cidade (ex.: Moema, São Paulo)" />
          </Field>
          <button type="submit" className="btn btn-ghost" disabled={!!busy}>Buscar</button>
        </form>
      </div>

      {busy && <p className="muted"><span className="spinner" aria-hidden="true" /> {busy}</p>}
      <Notice kind="error">{erro}</Notice>

      {origem && lugares && (
        <>
          <div className="chips">
            {GRUPOS.map(([id, nome]) => {
              const n = id === 'tudo' ? lugares.length : lugares.filter((l) => l.grupo === id).length
              if (id !== 'tudo' && n === 0) return null
              return <button key={id} type="button" className={grupo === id ? 'chip active' : 'chip'} onClick={() => setGrupo(id)}>{nome} ({n})</button>
            })}
          </div>

          <div className="rp-filtros">
            {cuisinesDisp.length > 0 && (
              <label className="rp-campo">Tipo de comida
                <select value={cuisineSel} onChange={(e) => setCuisineSel(e.target.value)}>
                  <option value="">Qualquer</option>
                  {cuisinesDisp.map((c) => <option key={c} value={c}>{traduzCuisine(c)}</option>)}
                </select>
              </label>
            )}
            <label className="rp-campo rp-busca">Buscar pelo nome
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: pizzaria, café, nome do lugar" />
            </label>
          </div>

          <Notice kind="warn">{aviso}</Notice>

          {visiveis.length === 0 && !aviso && <p className="muted">Nada com esse filtro. Afrouxe os filtros acima.</p>}

          <ol className="place-list">
            {visiveis.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{CATS[l.cat][2]} {l.nome}</strong>
                  <span className="muted">
                    {CATS[l.cat][0]}{l.cuisineTxt ? ` • ${l.cuisineTxt}` : ''} • {formatKm(l.km)}
                    {l.h24 && <b className="tag ok">24 horas</b>}
                    {l.vegan ? <b className="tag ok">Vegano</b> : l.veg && <b className="tag ok">Vegetariano</b>}
                    {l.delivery && <b className="tag">Delivery</b>}
                  </span>
                  {(l.endereco || l.bairro) && <small>{[l.endereco, l.bairro].filter(Boolean).join(' — ')}</small>}
                  {l.horario && <small>Horário: {l.horario}</small>}
                </div>
                <div className="place-actions">
                  {l.site && <a className="btn btn-ghost" href={site(l.site)} target="_blank" rel="noopener noreferrer">Site</a>}
                  {l.telefone && <a className="btn btn-ghost" href={`tel:${l.telefone.replace(/\s/g, '')}`}>Ligar</a>}
                  <a className="btn btn-ghost" href={mapaRota(l)} target="_blank" rel="noopener noreferrer">Rota</a>
                </div>
              </li>
            ))}
          </ol>
          <p className="muted small">Dados do OpenStreetMap, mantidos por voluntários. Horários e telefones podem estar desatualizados — confirme antes de ir.</p>
        </>
      )}
    </div>
  )
}

const CSS = `
.rp .rp-filtros{display:flex;flex-wrap:wrap;gap:12px;margin:12px 0}
.rp .rp-campo{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1;min-width:160px}
.rp .rp-busca{flex:2}
.rp .rp-campo select,.rp .rp-campo input{padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit;font-weight:400}
`
