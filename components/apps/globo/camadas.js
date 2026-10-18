'use client'

// Camadas do globo. Cada uma cria um DataSource do Cesium, busca os dados e se atualiza sozinha.
// Toda entidade leva `meta` (tipo e dados) para o painel de detalhes, a lista de contatos e a detecção.

import { CATEGORIAS_EONET, PERIODOS_SISMO, SQUAWK, camerasOsm, ciclones, estacoesBike, eventosNaturais, lancamentos, radios, redesBike, satelites, terremotos, ventoGrade, voosEmergencia, voosMilitares, voosPerto } from '@/lib/globo/fontes'
import { raioDaVista } from '@/lib/globo/geo'

export const CAMADAS = [
  { id: 'voos', nome: 'Aviões perto da vista', grupo: 'Céu', icone: '✈️', cor: '#38bdf8', fonte: 'adsb.lol (ODbL)' },
  { id: 'militares', nome: 'Aviões militares (mundo)', grupo: 'Céu', icone: '🛩️', cor: '#fb923c', fonte: 'adsb.lol' },
  { id: 'emergencias', nome: 'Aviões em emergência', grupo: 'Céu', icone: '🆘', cor: '#f87171', fonte: 'adsb.lol (squawk 7500/7600/7700)' },
  { id: 'satelites', nome: 'Satélites', grupo: 'Espaço', icone: '🛰️', cor: '#c4b5fd', fonte: 'CelesTrak + SGP4' },
  { id: 'lancamentos', nome: 'Próximos lançamentos', grupo: 'Espaço', icone: '🚀', cor: '#f472b6', fonte: 'Launch Library 2' },
  { id: 'terremotos', nome: 'Terremotos', grupo: 'Terra', icone: '〰️', cor: '#fbbf24', fonte: 'USGS' },
  { id: 'eventos', nome: 'Incêndios, vulcões e tempestades', grupo: 'Terra', icone: '🔥', cor: '#f97316', fonte: 'NASA EONET' },
  { id: 'radar', nome: 'Radar de chuva', grupo: 'Clima', icone: '🌧️', cor: '#22d3ee', fonte: 'RainViewer' },
  { id: 'nuvens', nome: 'Nuvens (infravermelho)', grupo: 'Clima', icone: '☁️', cor: '#e2e8f0', fonte: 'RainViewer' },
  { id: 'vento', nome: 'Vento agora', grupo: 'Clima', icone: '💨', cor: '#a5f3fc', fonte: 'Open-Meteo' },
  { id: 'ciclones', nome: 'Furacões e ciclones', grupo: 'Clima', icone: '🌀', cor: '#a78bfa', fonte: 'NOAA NHC' },
  { id: 'radios', nome: 'Rádios ao vivo', grupo: 'Cidades', icone: '📻', cor: '#4ade80', fonte: 'Radio Browser' },
  { id: 'bikes', nome: 'Bicicletas compartilhadas', grupo: 'Cidades', icone: '🚲', cor: '#34d399', fonte: 'CityBikes (GBFS)' },
  { id: 'cameras', nome: 'Câmeras e radares (OSM)', grupo: 'Cidades', icone: '📹', cor: '#f43f5e', fonte: 'OpenStreetMap via Overpass (aproxime a vista)' },
]

const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
export const ICONE_AVIAO = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#fff" stroke="#000" stroke-width="1" d="M16 1.5c1.3 0 2.2 1.5 2.2 3.4v7.4l11 6.3v3l-11-3.3v6.6l3.4 2.6v2.4L16 28.4l-5.6 1.5v-2.4l3.4-2.6v-6.6l-11 3.3v-3l11-6.3V4.9c0-1.9.9-3.4 2.2-3.4z"/></svg>')
const ICONE_SETA = svgUrl('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#fff" d="M16 2 26 18h-6v12h-8V18H6z"/></svg>')

export const corAltitude = (C, pes) => {
  // azul baixo -> verde -> amarelo -> laranja alto
  const t = Math.max(0, Math.min(1, pes / 40000))
  return C.Color.fromHsl(0.6 - t * 0.5, 0.9, 0.6, 1)
}

const pegarPos = (C, lon, lat, alt = 0) => C.Cartesian3.fromDegrees(lon, lat, alt)

/** Cria a camada. ctx: { C, viewer, sat (satellite.js), relatar(n, erro), aoMudar } */
export function criarCamada(id, ctx, opcoes = {}) {
  const { C, viewer } = ctx
  const ds = new C.CustomDataSource(id)
  viewer.dataSources.add(ds)
  const fabrica = FABRICAS[id]
  const instancia = fabrica ? fabrica({ ...ctx, ds }, opcoes) : {}
  let timer = null
  let vivo = true
  const rodar = async () => {
    if (!vivo || !instancia.atualizar) return
    try {
      const n = await instancia.atualizar()
      if (vivo) ctx.relatar(id, { n, quando: Date.now() })
    } catch (e) {
      if (vivo) ctx.relatar(id, { erro: e.message || String(e) })
    }
  }
  rodar()
  if (instancia.intervalo) timer = setInterval(rodar, instancia.intervalo)
  const aoMover = instancia.aoMover ? viewer.camera.moveEnd.addEventListener(() => instancia.aoMover().then?.((n) => vivo && ctx.relatar(id, { n, quando: Date.now() })).catch?.((e) => vivo && ctx.relatar(id, { erro: e.message }))) : null
  return {
    ds,
    instancia,
    atualizar: rodar,
    parar() {
      vivo = false
      clearInterval(timer)
      aoMover?.()
      instancia.parar?.()
      viewer.dataSources.remove(ds, true)
    },
  }
}

const centroDaVista = (C, viewer) => {
  const canvas = viewer.scene.canvas
  const p = viewer.camera.pickEllipsoid(new C.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2))
  const carto = p ? C.Cartographic.fromCartesian(p) : viewer.camera.positionCartographic
  return { lat: C.Math.toDegrees(carto.latitude), lon: C.Math.toDegrees(carto.longitude) }
}

const retanguloDaVista = (C, viewer) => {
  const r = viewer.camera.computeViewRectangle()
  if (!r) return null
  return { oeste: C.Math.toDegrees(r.west), sul: C.Math.toDegrees(r.south), leste: C.Math.toDegrees(r.east), norte: C.Math.toDegrees(r.north) }
}

/* ---------- Aviões ---------- */

function camadaAvioes(busca, intervalo, estilo) {
  return ({ C, viewer, ds }) => {
    const rastros = new Map()
    const desenhar = (lista) => {
      const vistos = new Set()
      for (const a of lista) {
        vistos.add(a.id)
        const altM = (a.alt || 0) * 0.3048
        const pos = pegarPos(C, a.lon, a.lat, Math.max(altM, 30))
        const r = rastros.get(a.id) || []
        const ultimo = r[r.length - 1]
        if (!ultimo || !C.Cartesian3.equalsEpsilon(ultimo, pos, 0, 1)) r.push(pos)
        if (r.length > 60) r.shift()
        rastros.set(a.id, r)
        const cor = a.emerg || ['7500', '7600', '7700'].includes(a.sq) ? C.Color.fromCssColorString('#f87171') : a.mil || estilo === 'mil' ? C.Color.fromCssColorString('#fb923c') : corAltitude(C, a.alt)
        let e = ds.entities.getById(a.id)
        const meta = { tipo: 'aviao', ...a, titulo: a.voo || a.reg || a.id.toUpperCase(), squawkTexto: SQUAWK[a.sq] || '' }
        if (!e) {
          e = ds.entities.add({
            id: a.id,
            position: pos,
            billboard: { image: ICONE_AVIAO, scale: 0.75, color: cor, rotation: -C.Math.toRadians(a.rumo || 0), alignedAxis: C.Cartesian3.UNIT_Z, disableDepthTestDistance: Number.POSITIVE_INFINITY },
            label: { text: meta.titulo, font: '600 11px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -20), distanceDisplayCondition: new C.DistanceDisplayCondition(0, 600000), disableDepthTestDistance: Number.POSITIVE_INFINITY },
            polyline: { positions: new C.CallbackProperty(() => rastros.get(a.id) || [], false), width: 2, material: cor.withAlpha(0.7), show: false },
          })
        } else {
          e.position = pos
          e.billboard.rotation = -C.Math.toRadians(a.rumo || 0)
          e.billboard.color = cor
          e.label.text = meta.titulo
        }
        e.meta = meta
      }
      for (const e of [...ds.entities.values]) if (!vistos.has(e.id)) {
        ds.entities.remove(e)
        rastros.delete(e.id)
      }
      return lista.length
    }
    const atualizar = async () => desenhar(await busca(C, viewer))
    return { atualizar, intervalo, aoMover: estilo === 'perto' ? atualizar : null }
  }
}

/* ---------- Satélites ---------- */

function camadaSatelites({ C, viewer, ds, sat }, { grupo = 'stations' } = {}) {
  let lista = []
  let timer = null
  const posicao = (s, quando) => {
    const pv = sat.propagate(s.satrec, quando)
    if (!pv.position) return null
    const geo = sat.eciToGeodetic(pv.position, sat.gstime(quando))
    return { lon: C.Math.toDegrees(geo.longitude), lat: C.Math.toDegrees(geo.latitude), alt: geo.height * 1000, vel: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) }
  }
  const mover = () => {
    const agora = new Date()
    for (const s of lista) {
      const p = posicao(s, agora)
      if (!p) continue
      s.ent.position = pegarPos(C, p.lon, p.lat, p.alt)
      s.ent.meta.alt = p.alt
      s.ent.meta.lat = p.lat
      s.ent.meta.lon = p.lon
      s.ent.meta.vel = p.vel
    }
  }
  const poucos = () => lista.length <= 200
  return {
    async atualizar() {
      if (lista.length) return lista.length
      const tles = await satelites(grupo)
      ds.entities.removeAll()
      lista = tles.map((t) => ({ ...t, satrec: sat.twoline2satrec(t.l1, t.l2) }))
      const iss = (n) => /ISS \(ZARYA\)|TIANGONG|CSS \(TIANHE\)/i.test(n)
      for (const s of lista) {
        s.ent = ds.entities.add({
          id: `sat-${s.id}`,
          point: { pixelSize: iss(s.nome) ? 10 : 5, color: iss(s.nome) ? C.Color.fromCssColorString('#fde047') : C.Color.fromCssColorString('#c4b5fd'), outlineColor: C.Color.BLACK, outlineWidth: 1 },
          label: poucos() || iss(s.nome) ? { text: s.nome, font: '600 11px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -14), distanceDisplayCondition: new C.DistanceDisplayCondition(0, 2.5e7) } : undefined,
        })
        s.ent.meta = { tipo: 'satelite', id: s.id, titulo: s.nome, l1: s.l1, l2: s.l2, satrec: s.satrec }
      }
      mover()
      clearInterval(timer)
      timer = setInterval(mover, 1000)
      return lista.length
    },
    parar: () => clearInterval(timer),
    posicao,
  }
}

/** Órbita do satélite selecionado (uma volta). */
export function orbita(C, sat, satrec) {
  const min = (2 * Math.PI) / satrec.no
  const pts = []
  const agora = Date.now()
  for (let m = 0; m <= min; m += min / 180) {
    const t = new Date(agora + m * 60000)
    const pv = sat.propagate(satrec, t)
    if (!pv.position) continue
    const g = sat.eciToGeodetic(pv.position, sat.gstime(t))
    pts.push(C.Cartesian3.fromRadians(g.longitude, g.latitude, g.height * 1000))
  }
  return { pontos: pts, periodo: min }
}

/* ---------- Terremotos ---------- */

function camadaTerremotos({ C, ds }, { periodo = 'all_day' } = {}) {
  return {
    intervalo: 120000,
    async atualizar() {
      const lista = await terremotos(periodo)
      ds.entities.removeAll()
      for (const q of lista) {
        const cor = q.prof < 70 ? '#f87171' : q.prof < 300 ? '#fbbf24' : '#60a5fa'
        const e = ds.entities.add({
          id: `q-${q.id}`,
          position: pegarPos(C, q.lon, q.lat),
          point: { pixelSize: Math.max(4, q.mag * 4), color: C.Color.fromCssColorString(cor).withAlpha(0.75), outlineColor: C.Color.WHITE.withAlpha(0.8), outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: q.mag >= 4.5 ? { text: `M${q.mag.toFixed(1)}`, font: '700 11px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -16), disableDepthTestDistance: Number.POSITIVE_INFINITY } : undefined,
        })
        e.meta = { tipo: 'terremoto', ...q, titulo: `M${q.mag?.toFixed(1)} ${q.lugar}` }
      }
      return lista.length
    },
  }
}

/* ---------- Eventos naturais ---------- */

function camadaEventos({ C, ds }) {
  return {
    intervalo: 30 * 60000,
    async atualizar() {
      const lista = await eventosNaturais(45)
      ds.entities.removeAll()
      for (const ev of lista) {
        const [nome, icone, cor] = CATEGORIAS_EONET[ev.cat] || ['Evento', '•', '#94a3b8']
        const e = ds.entities.add({
          id: `ev-${ev.id}`,
          position: pegarPos(C, ev.lon, ev.lat),
          point: { pixelSize: 9, color: C.Color.fromCssColorString(cor), outlineColor: C.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { text: icone, font: '18px sans-serif', pixelOffset: new C.Cartesian2(0, -16), disableDepthTestDistance: Number.POSITIVE_INFINITY, distanceDisplayCondition: new C.DistanceDisplayCondition(0, 1.2e7) },
          polyline: ev.trilha.length > 1 ? { positions: ev.trilha.map(([lo, la]) => pegarPos(C, lo, la)), width: 2, material: C.Color.fromCssColorString(cor).withAlpha(0.6), clampToGround: false } : undefined,
        })
        e.meta = { tipo: 'evento', ...ev, categoria: nome, titulo: `${icone} ${ev.titulo}` }
      }
      return lista.length
    },
  }
}

/* ---------- Vento (grade na vista) ---------- */

function camadaVento({ C, viewer, ds }) {
  const atualizar = async () => {
    const r = retanguloDaVista(C, viewer)
    if (!r) return 0
    const cols = 8
    const lins = 6
    let { oeste, leste } = r
    if (leste < oeste) leste += 360
    const pontos = []
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < lins; j++) {
        let lon = oeste + ((i + 0.5) / cols) * (leste - oeste)
        if (lon > 180) lon -= 360
        pontos.push({ lat: Math.max(-85, Math.min(85, r.sul + ((j + 0.5) / lins) * (r.norte - r.sul))), lon })
      }
    const dados = await ventoGrade(pontos)
    ds.entities.removeAll()
    for (const [k, p] of dados.entries()) {
      const t = Math.min(1, p.vel / 80)
      const e = ds.entities.add({
        id: `v-${k}`,
        position: pegarPos(C, p.lon, p.lat),
        billboard: { image: ICONE_SETA, scale: 0.4 + t * 0.6, color: C.Color.fromHsl(0.55 - t * 0.55, 0.9, 0.6, 0.95), rotation: -C.Math.toRadians((p.dir + 180) % 360), alignedAxis: C.Cartesian3.UNIT_Z, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { text: `${Math.round(p.vel)} km/h`, font: '600 10px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, 18), disableDepthTestDistance: Number.POSITIVE_INFINITY },
      })
      e.meta = { tipo: 'vento', ...p, titulo: `Vento ${Math.round(p.vel)} km/h` }
    }
    return dados.length
  }
  return { atualizar, intervalo: 10 * 60000, aoMover: atualizar }
}

/* ---------- Pontos simples (ciclones, lançamentos, rádios, bikes) ---------- */

function camadaPontos(buscar, montar, intervalo) {
  return ({ C, ds }) => ({
    intervalo,
    async atualizar() {
      const lista = await buscar()
      ds.entities.removeAll()
      for (const item of lista) {
        const { cor, tamanho = 8, texto, meta, distancia = 1.5e7 } = montar(item)
        const e = ds.entities.add({
          id: meta.id,
          position: pegarPos(C, item.lon, item.lat),
          point: { pixelSize: tamanho, color: C.Color.fromCssColorString(cor), outlineColor: C.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: texto ? { text: texto, font: '600 11px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -16), distanceDisplayCondition: new C.DistanceDisplayCondition(0, distancia), disableDepthTestDistance: Number.POSITIVE_INFINITY } : undefined,
        })
        e.meta = meta
      }
      return lista.length
    },
  })
}

/* ---------- Câmeras do OSM (só com a vista aproximada) ---------- */

function camadaCameras({ C, viewer, ds }) {
  const atualizar = async () => {
    const alt = viewer.camera.positionCartographic.height
    if (alt > 40000) {
      ds.entities.removeAll()
      return 0
    }
    const r = retanguloDaVista(C, viewer)
    if (!r) return 0
    const lista = await camerasOsm(r)
    ds.entities.removeAll()
    for (const c of lista) {
      const e = ds.entities.add({
        id: `cam-${c.id}`,
        position: pegarPos(C, c.lon, c.lat),
        point: { pixelSize: 7, color: C.Color.fromCssColorString(c.especie === 'radar' ? '#fbbf24' : c.especie === 'alpr' ? '#f472b6' : '#f43f5e'), outlineColor: C.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      })
      e.meta = { tipo: 'camera', ...c, titulo: c.especie === 'radar' ? 'Radar de velocidade' : c.especie === 'alpr' ? 'Leitor de placas (ALPR)' : 'Câmera de vigilância' }
    }
    return lista.length
  }
  return { atualizar, aoMover: atualizar }
}

/* ---------- Registro ---------- */

const FABRICAS = {
  voos: camadaAvioes(
    (C, viewer) => {
      const c = centroDaVista(C, viewer)
      return voosPerto(c.lat, c.lon, raioDaVista(viewer.camera.positionCartographic.height))
    },
    10000,
    'perto',
  ),
  militares: camadaAvioes(() => voosMilitares(), 30000, 'mil'),
  emergencias: camadaAvioes(() => voosEmergencia(), 30000, 'emerg'),
  satelites: camadaSatelites,
  terremotos: camadaTerremotos,
  eventos: camadaEventos,
  vento: camadaVento,
  cameras: camadaCameras,
  ciclones: camadaPontos(
    ciclones,
    (s) => ({ cor: '#a78bfa', tamanho: 14, texto: `🌀 ${s.nome}`, meta: { tipo: 'ciclone', ...s, id: `cic-${s.id}`, titulo: `${s.classe || ''} ${s.nome}`.trim() } }),
    30 * 60000,
  ),
  lancamentos: camadaPontos(
    lancamentos,
    (l) => ({ cor: '#f472b6', tamanho: 10, texto: `🚀 ${l.nome.split('|')[0].trim()}`, distancia: 8e6, meta: { tipo: 'lancamento', ...l, id: `lan-${l.id}`, titulo: l.nome } }),
    30 * 60000,
  ),
  radios: camadaPontos(
    radios,
    (r) => ({ cor: '#4ade80', tamanho: 6, texto: r.nome.slice(0, 28), distancia: 4e5, meta: { tipo: 'radio', ...r, id: `rad-${r.id}`, titulo: r.nome } }),
    0,
  ),
  bikes: camadaPontos(
    redesBike,
    (n) => ({ cor: '#34d399', tamanho: 8, texto: `🚲 ${n.nome}`, distancia: 2e6, meta: { tipo: 'bike-rede', ...n, id: `bk-${n.id}`, titulo: `${n.nome} (${n.cidade})` } }),
    0,
  ),
}

/** Estações de uma rede de bicicletas (aparecem ao escolher a rede). */
export async function mostrarEstacoes(C, ds, rede) {
  const lista = await estacoesBike(rede)
  for (const e of ds.entities.values.filter((x) => x.meta?.tipo === 'bike-estacao')) ds.entities.remove(e)
  for (const s of lista) {
    const e = ds.entities.add({
      id: `bks-${s.id}`,
      position: pegarPos(C, s.lon, s.lat),
      point: { pixelSize: 6, color: C.Color.fromCssColorString(s.livres ? '#34d399' : '#64748b'), outlineColor: C.Color.WHITE, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      label: { text: `${s.livres ?? '?'}`, font: '700 10px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(0, -12), distanceDisplayCondition: new C.DistanceDisplayCondition(0, 30000), disableDepthTestDistance: Number.POSITIVE_INFINITY },
    })
    e.meta = { tipo: 'bike-estacao', ...s, titulo: s.nome }
  }
  return lista.length
}

export { PERIODOS_SISMO }
