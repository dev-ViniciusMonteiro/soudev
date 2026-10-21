'use client'

// Mapa (Leaflet + OpenStreetMap): sua localização, busca por endereço/CEP, as construções da região desenhadas
// (a partir do zoom 17) e os imóveis da carteira com a cor do status. Clicar num ponto ou numa construção abre a ficha.

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { minhaPosicao } from '@/lib/apis'
import { buscarEndereco, construcoes } from '@/lib/imoveis/fontes'
import { corStatus } from './status'

const INICIO = { lat: -14.2, lon: -51.9, zoom: 4 } // Brasil inteiro até a pessoa escolher

export default function Mapa({ centro, ponto, carteira, aoEscolher, visivel }) {
  const div = useRef(null)
  const mapa = useRef(null)
  const camadas = useRef({})
  const vistas = useRef(new Map()) // construções já carregadas (por id)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [status, setStatus] = useState('')
  const [carregando, setCarregando] = useState(false)

  // Cria o mapa uma vez.
  useEffect(() => {
    const m = L.map(div.current, { zoomControl: true, maxZoom: 20 }).setView([INICIO.lat, INICIO.lon], INICIO.zoom)
    const ruas = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20, maxNativeZoom: 19, attribution: '© OpenStreetMap' })
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, attribution: 'Imagens © Esri' })
    ruas.addTo(m)
    L.control.layers({ Ruas: ruas, Satélite: satelite }, {}, { position: 'topright' }).addTo(m)
    camadas.current = {
      construcoes: L.layerGroup().addTo(m),
      carteira: L.layerGroup().addTo(m),
      eu: L.layerGroup().addTo(m),
      escolhido: L.layerGroup().addTo(m),
    }
    m.on('click', (e) => aoEscolher({ lat: e.latlng.lat, lon: e.latlng.lng }))
    let espera = null
    m.on('moveend', () => {
      clearTimeout(espera)
      espera = setTimeout(() => carregarConstrucoes(), 700)
    })
    mapa.current = m
    return () => m.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O mapa ficou escondido (outra aba): recalcula o tamanho ao voltar.
  useEffect(() => {
    if (visivel) setTimeout(() => mapa.current?.invalidateSize(), 50)
  }, [visivel])

  useEffect(() => {
    if (centro && mapa.current) mapa.current.setView([centro.lat, centro.lon], centro.zoom ?? 18)
  }, [centro])

  // Imóveis da carteira no mapa.
  useEffect(() => {
    const g = camadas.current.carteira
    if (!g) return
    g.clearLayers()
    for (const item of carteira) {
      L.circleMarker([item.lat, item.lon], { radius: 8, color: '#fff', weight: 2, fillColor: corStatus(item.status), fillOpacity: 0.95 })
        .bindTooltip(item.titulo || 'Imóvel salvo')
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          aoEscolher({ lat: item.lat, lon: item.lon, salvoId: item.id })
        })
        .addTo(g)
    }
  }, [carteira, aoEscolher])

  // Ponto escolhido em destaque.
  useEffect(() => {
    const g = camadas.current.escolhido
    if (!g) return
    g.clearLayers()
    if (!ponto) return
    if (ponto.construcao) L.polygon(ponto.construcao.geom.map((p) => [p.lat, p.lon]), { color: '#ef4444', weight: 3, fillOpacity: 0.15 }).addTo(g)
    L.circleMarker([ponto.lat, ponto.lon], { radius: 7, color: '#ef4444', weight: 3, fillColor: '#fff', fillOpacity: 1 }).addTo(g)
  }, [ponto])

  async function carregarConstrucoes() {
    const m = mapa.current
    if (!m || m.getZoom() < 17) {
      setStatus(m && m.getZoom() < 17 ? 'Aproxime o mapa (zoom 17+) para ver as construções.' : '')
      return
    }
    const c = m.getCenter()
    const b = m.getBounds()
    const raio = Math.min(350, Math.round(c.distanceTo(b.getNorthEast())))
    setCarregando(true)
    setStatus('Carregando construções…')
    try {
      const lista = await construcoes(c.lat, c.lng, raio)
      const g = camadas.current.construcoes
      for (const k of lista) {
        if (vistas.current.has(k.id)) continue
        vistas.current.set(k.id, k)
        L.polygon(
          k.geom.map((p) => [p.lat, p.lon]),
          { color: '#f59e0b', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.12 },
        )
          .bindTooltip(`${k.tipo}${k.andares ? ` · ${k.andares} andares` : ''}${k.area ? ` · ~${k.area} m²` : ''}${k.endereco ? ` · ${k.endereco}` : ''}`, { sticky: true })
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            const lat = k.geom.reduce((s, p) => s + p.lat, 0) / k.geom.length
            const lon = k.geom.reduce((s, p) => s + p.lon, 0) / k.geom.length
            aoEscolher({ lat, lon, construcao: k })
          })
          .addTo(g)
      }
      setStatus(lista.length ? `${vistas.current.size} construções no mapa. Toque numa para abrir a ficha.` : 'O OpenStreetMap não tem as construções desenhadas aqui. Toque no ponto do imóvel.')
    } catch {
      setStatus('Não deu para carregar as construções agora (servidor do OpenStreetMap ocupado). Toque no ponto do imóvel.')
    } finally {
      setCarregando(false)
    }
  }

  const irParaMim = async () => {
    setStatus('Pegando sua localização…')
    try {
      const p = await minhaPosicao()
      const g = camadas.current.eu
      g.clearLayers()
      L.circle([p.lat, p.lon], { radius: p.precisao, color: '#3b82f6', weight: 1, fillOpacity: 0.1 }).addTo(g)
      L.circleMarker([p.lat, p.lon], { radius: 8, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }).bindTooltip('Você está aqui').addTo(g)
      mapa.current.setView([p.lat, p.lon], 18)
      aoEscolher({ lat: p.lat, lon: p.lon })
      setStatus(`Localização com precisão de ~${Math.round(p.precisao)} m.`)
    } catch (e) {
      setStatus(e.message)
    }
  }

  const buscar = async (ev) => {
    ev.preventDefault()
    if (!busca.trim()) return
    setStatus('Buscando…')
    try {
      const r = await buscarEndereco(busca)
      setResultados(r)
      setStatus(r.length ? '' : 'Não encontrei esse endereço. Tente rua, número e cidade, ou o CEP.')
      if (r.length === 1) ir(r[0])
    } catch {
      setStatus('A busca falhou. Tente de novo em instantes.')
    }
  }

  const ir = (r) => {
    setResultados([])
    mapa.current.setView([r.lat, r.lon], 18)
    aoEscolher({ lat: r.lat, lon: r.lon })
  }

  return (
    <div className="im-mapa">
      <div ref={div} className="im-mapa-div" />
      <div className="im-mapa-barra">
        <form onSubmit={buscar} className="im-busca">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Endereço, CEP ou bairro" aria-label="Buscar endereço" />
          <button type="submit" className="btn btn-primary">
            Buscar
          </button>
        </form>
        <button type="button" className="btn btn-primary im-gps" onClick={irParaMim}>
          📍 Minha localização
        </button>
        {resultados.length > 1 && (
          <ul className="im-resultados">
            {resultados.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button type="button" onClick={() => ir(r)}>
                  {r.texto}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {status && (
        <p className="im-status" role="status">
          {carregando && <span className="spinner" aria-hidden="true" />} {status}
        </p>
      )}
    </div>
  )
}
