'use client'

import { useMemo, useState } from 'react'
import { Field, Notice } from '../ui'
import { distanciaKm, fetchJson, formatKm, minhaPosicao } from '@/lib/apis'

const NUMEROS = [
  ['192', 'SAMU', 'Emergência médica, mal súbito, acidente com feridos'],
  ['193', 'Bombeiros', 'Incêndio, resgate, afogamento, desabamento'],
  ['190', 'Polícia Militar', 'Crime acontecendo, violência, ameaça'],
  ['199', 'Defesa Civil', 'Enchente, deslizamento, risco de desabamento'],
  ['188', 'CVV', 'Apoio emocional e prevenção do suicídio, 24h e grátis'],
  ['180', 'Central da Mulher', 'Violência contra a mulher, 24h'],
  ['191', 'PRF', 'Acidente ou emergência em rodovia federal'],
  ['100', 'Direitos Humanos', 'Violência contra criança, idoso, pessoa com deficiência'],
  ['08007226001', 'Disque-Intoxicação', 'Envenenamento, remédio ou produto ingerido por engano'],
]

const TIPOS = {
  hospital: ['Hospital / Pronto-socorro', 'saude'],
  clinic: ['UPA / Posto de saúde / Clínica', 'saude'],
  pharmacy: ['Farmácia', 'farmacia'],
  police: ['Polícia', 'policia'],
  fire_station: ['Bombeiros', 'bombeiros'],
}
const FILTROS = [
  ['saude', 'Hospitais e UPAs'],
  ['farmacia', 'Farmácias'],
  ['policia', 'Polícia'],
  ['bombeiros', 'Bombeiros'],
]
const OVERPASS = ['https://overpass-api.de/api/interpreter']

function tipoDe(tags) {
  if (tags.amenity && TIPOS[tags.amenity]) return tags.amenity
  if (tags.healthcare === 'hospital') return 'hospital'
  if (tags.healthcare) return 'clinic'
  return null
}

function lugar(el, origem) {
  const tags = el.tags ?? {}
  const tipo = tipoDe(tags)
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (!tipo || lat == null) return null
  const endereco = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ')
  return {
    id: `${el.type}${el.id}`,
    tipo,
    nome: tags.name || tags.operator || TIPOS[tipo][0],
    lat,
    lon,
    km: distanciaKm(origem.lat, origem.lon, lat, lon),
    endereco: endereco || tags['addr:full'] || '',
    telefone: tags.phone || tags['contact:phone'] || '',
    h24: tags.opening_hours === '24/7',
    horario: tags.opening_hours && tags.opening_hours !== '24/7' ? tags.opening_hours : '',
    prontoSocorro: tags.emergency === 'yes',
  }
}

async function buscarOverpass(origem, raio) {
  const q = `[out:json][timeout:20];(nwr(around:${raio},${origem.lat},${origem.lon})[amenity~"^(hospital|clinic|pharmacy|police|fire_station)$"];nwr(around:${raio},${origem.lat},${origem.lon})[healthcare~"^(hospital|centre|clinic)$"];);out center tags 300;`
  let ultimo
  for (const url of OVERPASS) {
    try {
      const r = await fetchJson(url, { timeout: 14000, retries: 0, init: { method: 'POST', body: new URLSearchParams({ data: q }) } })
      return r.elements.map((el) => lugar(el, origem)).filter(Boolean)
    } catch (e) {
      ultimo = e
    }
  }
  throw ultimo
}

/** Plano B: busca do OpenStreetMap (Nominatim), uma categoria por vez (limite de 1 pedido por segundo). */
async function buscarNominatim(origem, raio) {
  const d = raio / 111000
  const box = [origem.lon - d, origem.lat + d, origem.lon + d, origem.lat - d].join(',')
  const out = []
  for (const amenity of Object.keys(TIPOS)) {
    const r = await fetchJson(`https://nominatim.openstreetmap.org/search?amenity=${amenity}&format=jsonv2&limit=25&bounded=1&viewbox=${box}&extratags=1&addressdetails=1`, { timeout: 12000 })
    for (const x of r) {
      const tags = { ...(x.extratags ?? {}), amenity, name: x.name, 'addr:street': x.address?.road, 'addr:housenumber': x.address?.house_number }
      const l = lugar({ type: x.osm_type, id: x.osm_id, lat: Number(x.lat), lon: Number(x.lon), tags }, origem)
      if (l) out.push(l)
    }
    await new Promise((res) => setTimeout(res, 1100))
  }
  return out
}

const mapaRota = (l) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`
const mapaBusca = (termo, o) => `https://www.google.com/maps/search/${encodeURIComponent(termo)}/@${o.lat},${o.lon},14z`

export default function SocorroPerto() {
  const [endereco, setEndereco] = useState('')
  const [origem, setOrigem] = useState(null)
  const [lugares, setLugares] = useState(null)
  const [filtro, setFiltro] = useState('saude')
  const [busy, setBusy] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const buscar = async (o) => {
    setOrigem(o)
    setLugares(null)
    setAviso('')
    setBusy('Procurando lugares por perto…')
    let lista = []
    try {
      lista = await buscarOverpass(o, 5000)
      if (lista.filter((l) => TIPOS[l.tipo][1] === 'saude').length < 3) lista = await buscarOverpass(o, 15000)
    } catch {
      setBusy('O mapa principal está ocupado. Usando a busca alternativa…')
      try {
        lista = await buscarNominatim(o, 8000)
      } catch {
        setErro('Não foi possível buscar os lugares agora. Use os botões de mapa abaixo ou ligue para os números de emergência.')
      }
    }
    const vistos = new Set()
    lista = lista
      .sort((a, b) => a.km - b.km)
      .filter((l) => {
        const k = `${l.nome}|${l.lat.toFixed(3)}|${l.lon.toFixed(3)}`
        if (vistos.has(k)) return false
        vistos.add(k)
        return true
      })
    if (!lista.length) setAviso('Não encontramos lugares cadastrados no mapa aberto perto daqui. Use os botões do Google Maps abaixo.')
    setLugares(lista)
    setBusy('')
  }

  const usarLocalizacao = async () => {
    setErro('')
    setBusy('Pegando sua localização…')
    try {
      await buscar(await minhaPosicao())
    } catch (e) {
      setBusy('')
      setErro(e.message)
    }
  }

  const buscarEndereco = async (event) => {
    event.preventDefault()
    setErro('')
    if (endereco.trim().length < 3) return setErro('Digite um endereço, bairro ou cidade.')
    setBusy('Procurando o endereço…')
    try {
      const r = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=jsonv2&limit=1&countrycodes=br`)
      if (!r.length) {
        setBusy('')
        return setErro('Endereço não encontrado. Tente com rua, número e cidade, ou só o bairro e a cidade.')
      }
      await buscar({ lat: Number(r[0].lat), lon: Number(r[0].lon), nome: r[0].display_name })
    } catch {
      setBusy('')
      setErro('Não foi possível procurar o endereço agora.')
    }
  }

  const visiveis = useMemo(() => (lugares ?? []).filter((l) => TIPOS[l.tipo][1] === filtro).slice(0, 15), [lugares, filtro])

  return (
    <div className="tool-stack">
      <div className="sos-grid">
        {NUMEROS.map(([num, nome, quando]) => (
          <a key={num} className="sos-card" href={`tel:${num}`}>
            <strong>{num.length > 4 ? '0800 722 6001' : num}</strong>
            <span>{nome}</span>
            <small>{quando}</small>
          </a>
        ))}
      </div>

      <h2 className="tool-subtitle">O que tem perto de você</h2>
      <div className="grid-2">
        <button type="button" className="btn btn-primary btn-lg" onClick={usarLocalizacao} disabled={!!busy}>📍 Usar minha localização</button>
        <form className="input-group" onSubmit={buscarEndereco}>
          <Field label="Ou digite o endereço">
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </Field>
          <button type="submit" className="btn btn-ghost" disabled={!!busy}>Buscar</button>
        </form>
      </div>
      {busy && (
        <p className="muted">
          <span className="spinner" aria-hidden="true" /> {busy}
        </p>
      )}
      <Notice kind="error">{erro}</Notice>
      {origem && lugares && (
        <>
          <div className="chips">
            {FILTROS.map(([id, nome]) => (
              <button key={id} type="button" className={filtro === id ? 'chip active' : 'chip'} onClick={() => setFiltro(id)}>
                {nome} ({lugares.filter((l) => TIPOS[l.tipo][1] === id).length})
              </button>
            ))}
          </div>
          <Notice kind="warn">{aviso}</Notice>
          <ol className="place-list">
            {visiveis.map((l) => (
              <li key={l.id}>
                <div>
                  <strong>{l.nome}</strong>
                  <span className="muted">
                    {TIPOS[l.tipo][0]} • {formatKm(l.km)}
                    {l.h24 && <b className="tag ok">24 horas</b>}
                    {l.prontoSocorro && <b className="tag danger">Pronto-socorro</b>}
                  </span>
                  {l.endereco && <small>{l.endereco}</small>}
                  {l.horario && <small>Horário: {l.horario}</small>}
                </div>
                <div className="place-actions">
                  <a className="btn btn-ghost" href={mapaRota(l)} target="_blank" rel="noopener noreferrer">Rota</a>
                  {l.telefone && <a className="btn btn-ghost" href={`tel:${l.telefone.replace(/[^\d+]/g, '')}`}>Ligar</a>}
                </div>
              </li>
            ))}
          </ol>
          {visiveis.length === 0 && <p className="muted">Nenhum lugar desse tipo no mapa aberto perto daqui.</p>}
          <div className="actions">
            <a className="btn btn-ghost" href={mapaBusca('hospital', origem)} target="_blank" rel="noopener noreferrer">Hospitais no Google Maps</a>
            <a className="btn btn-ghost" href={mapaBusca('UPA pronto atendimento', origem)} target="_blank" rel="noopener noreferrer">UPAs no Google Maps</a>
            <a className="btn btn-ghost" href={mapaBusca('farmácia 24 horas', origem)} target="_blank" rel="noopener noreferrer">Farmácias 24h no Google Maps</a>
          </div>
          <p className="muted small">Lugares do OpenStreetMap (mapa colaborativo). Pode faltar algum ou o horário estar desatualizado: em emergência grave, ligue 192 ou 193.</p>
        </>
      )}
    </div>
  )
}
