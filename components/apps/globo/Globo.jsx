'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GRUPOS_SAT, buscarLugar, radarQuadros, rota } from '@/lib/globo/fontes'
import { area, comprimento, fmtArea, fmtCoord, fmtDistancia, fmtDuracao, lerCoordenadas } from '@/lib/globo/geo'
import { MODOS } from '@/lib/globo/shaders'
import { CAMADAS, PERIODOS_SISMO, criarCamada, mostrarEstacoes, orbita } from './camadas'
import { Contatos, InfoSelecionado } from './Paineis'

const CESIUM = 'https://cdn.jsdelivr.net/npm/cesium@1.122.0/Build/Cesium/'
const SATJS = 'https://cdn.jsdelivr.net/npm/satellite.js@5.0.0/dist/satellite.min.js'

function carregarScript(src, global) {
  if (window[global]) return Promise.resolve(window[global])
  return new Promise((ok, erro) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => ok(window[global])
    s.onerror = () => erro(new Error(`Não consegui carregar ${new URL(src).pathname.split('/')[2]}.`))
    document.head.appendChild(s)
  })
}

export const MAPAS = [
  ['satelite', 'Satélite', 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imagens © Esri, Maxar, Earthstar Geographics', 19],
  ['satelite-nomes', 'Satélite com nomes', 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imagens © Esri, Maxar, Earthstar Geographics', 19],
  ['mapa', 'Mapa (OpenStreetMap)', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© Colaboradores do OpenStreetMap', 19],
  ['escuro', 'Escuro', 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', '© OpenStreetMap © CARTO', 19],
  ['terra', 'Terra (NASA Blue Marble)', 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', 'NASA GIBS (domínio público)', 8],
  ['noite', 'Luzes da noite (NASA)', 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png', 'NASA Black Marble (domínio público)', 8],
  ['google3d', 'Cidades em 3D (Google, sua chave)', '', '', 0],
]

const TOURS = [
  {
    nome: 'Volta ao mundo',
    paradas: [
      ['Rio de Janeiro', -43.2096, -22.9519, 9000, 160, -28],
      ['Nova York', -74.0134, 40.7055, 6000, 20, -30],
      ['Paris', 2.2945, 48.8584, 4000, 300, -30],
      ['Cairo', 31.1342, 29.9792, 6000, 250, -30],
      ['Tóquio', 139.7671, 35.6812, 9000, 200, -30],
      ['Sydney', 151.2153, -33.8568, 5000, 240, -28],
    ],
  },
  {
    nome: 'Aeroportos mais movimentados',
    camadas: ['voos'],
    paradas: [
      ['Guarulhos (GRU)', -46.4731, -23.4356, 60000, 0, -50],
      ['Atlanta (ATL)', -84.4277, 33.6407, 60000, 0, -50],
      ['Dubai (DXB)', 55.3644, 25.2532, 60000, 0, -50],
      ['Londres Heathrow (LHR)', -0.4543, 51.47, 60000, 0, -50],
      ['Tóquio Haneda (HND)', 139.7798, 35.5494, 60000, 0, -50],
    ],
  },
  {
    nome: 'Círculo de Fogo do Pacífico',
    camadas: ['terremotos', 'eventos'],
    paradas: [
      ['Andes chilenos', -70.5, -30, 2500000, 0, -70],
      ['Alasca e Aleutas', -165, 55, 3500000, 0, -70],
      ['Japão', 140, 36, 2500000, 0, -70],
      ['Indonésia', 115, -4, 3500000, 0, -70],
      ['Nova Zelândia', 174, -40, 2500000, 0, -70],
    ],
  },
  {
    nome: 'Planeta visto do espaço',
    camadas: ['satelites', 'nuvens'],
    paradas: [
      ['América do Sul', -58, -15, 14000000, 0, -90],
      ['África e Europa', 15, 15, 16000000, 0, -90],
      ['Ásia e Oceania', 115, 5, 16000000, 0, -90],
      ['Polo Norte', 0, 85, 12000000, 0, -90],
    ],
  },
]

const CAMADAS_PADRAO = ['voos', 'terremotos', 'eventos']

/* ---------- Link compartilhável (#v=lon,lat,alt,rumo,incl&c=camadas&m=modo&b=mapa) ---------- */

function lerHash() {
  const h = new URLSearchParams(location.hash.slice(1))
  const v = (h.get('v') || '').split(',').map(Number)
  return {
    vista: v.length >= 3 && v.every(Number.isFinite) ? { lon: v[0], lat: v[1], alt: v[2], rumo: v[3] || 0, incl: v[4] ?? -90 } : null,
    camadas: h.has('c') ? h.get('c').split(',').filter((c) => CAMADAS.some((x) => x.id === c)) : null,
    modo: MODOS.some((m) => m.id === h.get('m')) ? h.get('m') : null,
    mapa: MAPAS.some((m) => m[0] === h.get('b')) ? h.get('b') : null,
  }
}

export default function Globo() {
  const caixa = useRef(null)
  const creditos = useRef(null)
  const telaDeteccao = useRef(null)
  const viewerRef = useRef(null)
  const CRef = useRef(null)
  const satRef = useRef(null)
  const camadasVivas = useRef(new Map())
  const estagio = useRef(null)
  const selecaoDs = useRef(null)
  const desenhoDs = useRef(null)
  const radarCamadas = useRef([])
  const nuvemCamada = useRef(null)
  const tourAtivo = useRef(null)
  const cabine = useRef(null)
  const pontosDesenho = useRef([])

  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)
  const [ativas, setAtivas] = useState(CAMADAS_PADRAO)
  const [status, setStatus] = useState({})
  const [opcoes, setOpcoes] = useState({ satelites: { grupo: 'stations' }, terremotos: { periodo: 'all_day' } })
  const [modo, setModo] = useState('normal')
  const [mapa, setMapa] = useState('satelite')
  const [luz, setLuz] = useState(true)
  const [hud, setHud] = useState(true)
  const [deteccao, setDeteccao] = useState(false)
  const [sel, setSel] = useState(null)
  const [rastreando, setRastreando] = useState(false)
  const [modoCabine, setModoCabine] = useState(false)
  const [painel, setPainel] = useState(typeof window !== 'undefined' && window.innerWidth > 900 ? 'camadas' : null)
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [ferramenta, setFerramenta] = useState(null)
  const [desenhos, setDesenhos] = useState([])
  const [medida, setMedida] = useState('')
  const [radar, setRadar] = useState(null)
  const [tour, setTour] = useState(null)
  const [aviso, setAviso] = useState('')
  const [info, setInfo] = useState({ lat: 0, lon: 0, alt: 0, rumo: 0, incl: 0, cursor: null, utc: '' })
  const [ouvindo, setOuvindo] = useState(false)
  const [radio, setRadio] = useState(null)
  const audio = useRef(null)

  const avisar = useCallback((t) => {
    setAviso(t)
    clearTimeout(avisar.t)
    avisar.t = setTimeout(() => setAviso(''), 4000)
  }, [])

  /* ---------- Inicialização ---------- */

  useEffect(() => {
    document.documentElement.classList.add('ap-tela-cheia')
    const h = lerHash()
    if (h.camadas) setAtivas(h.camadas)
    if (h.modo) setModo(h.modo)
    if (h.mapa) setMapa(h.mapa)
    let viewer
    window.CESIUM_BASE_URL = CESIUM
    if (!document.querySelector('link[data-cesium]')) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = `${CESIUM}Widgets/widgets.css`
      l.dataset.cesium = '1'
      document.head.appendChild(l)
    }
    Promise.all([carregarScript(`${CESIUM}Cesium.js`, 'Cesium'), carregarScript(SATJS, 'satellite')])
      .then(([C, sat]) => {
        if (!caixa.current) return
        CRef.current = C
        satRef.current = sat
        viewer = new C.Viewer(caixa.current, {
          baseLayer: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: creditos.current,
          contextOptions: { webgl: { preserveDrawingBuffer: true } },
        })
        viewer.scene.globe.enableLighting = true
        viewer.scene.globe.showGroundAtmosphere = true
        viewer.scene.skyAtmosphere.show = true
        viewer.scene.fog.enabled = true
        viewer.clock.shouldAnimate = true
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = false
        selecaoDs.current = new C.CustomDataSource('selecao')
        desenhoDs.current = new C.CustomDataSource('desenhos')
        viewer.dataSources.add(selecaoDs.current)
        viewer.dataSources.add(desenhoDs.current)
        const v = h.vista || { lon: -47.9, lat: -15.8, alt: 18000000, rumo: 0, incl: -90 }
        viewer.camera.setView({ destination: C.Cartesian3.fromDegrees(v.lon, v.lat, v.alt), orientation: { heading: C.Math.toRadians(v.rumo), pitch: C.Math.toRadians(v.incl), roll: 0 } })
        viewerRef.current = viewer
        setPronto(true)
      })
      .catch((e) => setErro(e.message))
    return () => {
      document.documentElement.classList.remove('ap-tela-cheia')
      camadasVivas.current.forEach((c) => c.parar())
      camadasVivas.current.clear()
      viewer?.destroy()
      viewerRef.current = null
    }
  }, [])

  /* ---------- Mapa-base ---------- */

  useEffect(() => {
    const viewer = viewerRef.current
    const C = CRef.current
    if (!pronto) return
    let tileset = null
    let vivo = true
    const camadas = viewer.imageryLayers
    // mantém radar e nuvens por cima
    for (let i = camadas.length - 1; i >= 0; i--) {
      const l = camadas.get(i)
      if (l._base) camadas.remove(l, true)
    }
    viewer.scene.globe.show = true
    const [, , url, credito, max] = MAPAS.find((m) => m[0] === mapa)
    if (mapa === 'google3d') {
      let chave = ''
      try {
        chave = localStorage.getItem('globo.google') || ''
      } catch {}
      chave = chave || prompt('Cole sua chave da API Map Tiles do Google (fica só neste navegador):') || ''
      if (!chave) {
        setMapa('satelite')
        return
      }
      try {
        localStorage.setItem('globo.google', chave)
      } catch {}
      C.GoogleMaps.defaultApiKey = chave
      C.createGooglePhotorealistic3DTileset()
        .then((t) => {
          if (!vivo) return
          tileset = viewer.scene.primitives.add(t)
          viewer.scene.globe.show = false
        })
        .catch(() => {
          avisar('A chave do Google não funcionou. Voltando ao satélite.')
          try {
            localStorage.removeItem('globo.google')
          } catch {}
          setMapa('satelite')
        })
    } else {
      const base = camadas.addImageryProvider(new C.UrlTemplateImageryProvider({ url, credit: credito, maximumLevel: max }), 0)
      base._base = true
      if (mapa === 'satelite-nomes') {
        const nomes = camadas.addImageryProvider(new C.UrlTemplateImageryProvider({ url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', credit: 'Esri', maximumLevel: 19 }), 1)
        nomes._base = true
      }
    }
    return () => {
      vivo = false
      if (tileset) viewer.scene.primitives.remove(tileset)
    }
  }, [mapa, pronto, avisar])

  useEffect(() => {
    if (pronto) viewerRef.current.scene.globe.enableLighting = luz
  }, [luz, pronto])

  /* ---------- Filtros de visão ---------- */

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    if (estagio.current) {
      viewer.scene.postProcessStages.remove(estagio.current)
      estagio.current = null
    }
    const m = MODOS.find((x) => x.id === modo)
    if (m?.shader) estagio.current = viewer.scene.postProcessStages.add(new C.PostProcessStage({ fragmentShader: m.shader }))
  }, [modo, pronto])

  /* ---------- Camadas ---------- */

  const relatar = useCallback((id, s) => setStatus((x) => ({ ...x, [id]: { ...x[id], carregando: false, ...s, ...(s.n !== undefined ? { erro: '' } : {}) } })), [])

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const ctx = { C: CRef.current, viewer, sat: satRef.current, relatar }
    const vivas = camadasVivas.current
    for (const [id, c] of vivas)
      if (!ativas.includes(id)) {
        c.parar()
        vivas.delete(id)
      }
    for (const id of ativas) {
      if (vivas.has(id) || id === 'radar' || id === 'nuvens') continue
      setStatus((x) => ({ ...x, [id]: { ...x[id], carregando: true, erro: '' } }))
      vivas.set(id, criarCamada(id, ctx, opcoes[id]))
    }
  }, [ativas, pronto, opcoes, relatar])

  // trocar o grupo de satélites ou o período dos terremotos recria a camada
  const mudarOpcao = (id, patch) => {
    camadasVivas.current.get(id)?.parar()
    camadasVivas.current.delete(id)
    setOpcoes((o) => ({ ...o, [id]: { ...o[id], ...patch } }))
  }

  const alternar = (id, ligar) => setAtivas((a) => (ligar ?? !a.includes(id) ? [...new Set([...a, id])] : a.filter((x) => x !== id)))

  /* ---------- Radar e nuvens (camadas de imagem com linha do tempo) ---------- */

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    const querRadar = ativas.includes('radar')
    const querNuvens = ativas.includes('nuvens')
    let vivo = true
    const limparRadar = () => {
      radarCamadas.current.forEach((l) => viewer.imageryLayers.remove(l, true))
      radarCamadas.current = []
    }
    const limparNuvens = () => {
      if (nuvemCamada.current) viewer.imageryLayers.remove(nuvemCamada.current, true)
      nuvemCamada.current = null
    }
    if (!querRadar) {
      limparRadar()
      setRadar(null)
    }
    if (!querNuvens) limparNuvens()
    if (!querRadar && !querNuvens) return
    radarQuadros()
      .then((q) => {
        if (!vivo) return
        if (querNuvens && !nuvemCamada.current && q.nuvens.length) {
          const f = q.nuvens[q.nuvens.length - 1]
          nuvemCamada.current = viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({ url: `${q.host}${f.path}/256/{z}/{x}/{y}/0/0_0.png`, maximumLevel: 7, credit: 'RainViewer' }))
          nuvemCamada.current.alpha = 0.75
          relatar('nuvens', { n: 1, quando: f.time * 1000 })
        }
        if (querRadar && !radarCamadas.current.length) {
          radarCamadas.current = q.radar.map((f, i) => {
            const l = viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({ url: `${q.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, maximumLevel: 7, credit: 'RainViewer' }))
            l.alpha = 0
            l.show = Math.abs(i - (q.radar.length - 1 - q.radar.filter((x) => x.previsao).length)) < 2
            return l
          })
          const atual = q.radar.length - 1 - q.radar.filter((x) => x.previsao).length
          setRadar({ quadros: q.radar, i: atual, tocando: false })
          relatar('radar', { n: q.radar.length, quando: Date.now() })
        }
      })
      .catch((e) => {
        if (querRadar) relatar('radar', { erro: e.message })
        if (querNuvens) relatar('nuvens', { erro: e.message })
      })
    return () => {
      vivo = false
    }
  }, [ativas, pronto, relatar])

  useEffect(() => {
    if (!radar) return
    radarCamadas.current.forEach((l, i) => {
      l.show = Math.abs(i - radar.i) <= 1
      l.alpha = i === radar.i ? 0.7 : 0
    })
    if (!radar.tocando) return
    const t = setTimeout(() => setRadar((r) => r && { ...r, i: (r.i + 1) % r.quadros.length }), 700)
    return () => clearTimeout(t)
  }, [radar])

  /* ---------- Seleção, rastreio e cabine ---------- */

  const entidadePorId = useCallback((id) => {
    const viewer = viewerRef.current
    for (let i = 0; i < viewer.dataSources.length; i++) {
      const e = viewer.dataSources.get(i).entities.getById(id)
      if (e) return e
    }
    return null
  }, [])

  const selecionar = useCallback(
    (e) => {
      const viewer = viewerRef.current
      const C = CRef.current
      selecaoDs.current.entities.removeAll()
      for (let i = 0; i < viewer.dataSources.length; i++) for (const x of viewer.dataSources.get(i).entities.values) if (x.polyline && x.meta?.tipo === 'aviao') x.polyline.show = false
      if (!e?.meta) {
        setSel(null)
        return
      }
      const m = e.meta
      if (m.tipo === 'aviao' && e.polyline) e.polyline.show = true
      if (m.tipo === 'satelite') {
        const { pontos, periodo } = orbita(C, satRef.current, m.satrec)
        selecaoDs.current.entities.add({ polyline: { positions: pontos, width: 2, material: new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString('#fde047') }) } })
        m.periodo = periodo
      }
      selecaoDs.current.entities.add({ position: new C.CallbackProperty((t) => e.position?.getValue(t), false), ellipse: undefined, point: { pixelSize: 22, color: C.Color.TRANSPARENT, outlineColor: C.Color.fromCssColorString('#fde047'), outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY } })
      setSel({ id: e.id, meta: m })
    },
    [],
  )

  const voarPara = useCallback((lon, lat, alt = 20000, rumo = 0, incl = -45, duracao = 2.5) => {
    const C = CRef.current
    return new Promise((ok) =>
      viewerRef.current.camera.flyTo({ destination: C.Cartesian3.fromDegrees(lon, lat, alt), orientation: { heading: C.Math.toRadians(rumo), pitch: C.Math.toRadians(incl), roll: 0 }, duration: duracao, complete: ok, cancel: ok }),
    )
  }, [])

  const rastrear = (ligar) => {
    const viewer = viewerRef.current
    const e = sel && entidadePorId(sel.id)
    if (!ligar || !e) {
      viewer.trackedEntity = undefined
      setRastreando(false)
      return
    }
    e.viewFrom = new CRef.current.Cartesian3(-30000, -30000, 25000)
    viewer.trackedEntity = e
    setRastreando(true)
  }

  // visão de cabine: a câmera vai junto do avião, olhando para a frente
  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    if (!modoCabine || !sel || sel.meta.tipo !== 'aviao') {
      if (cabine.current) {
        cabine.current()
        cabine.current = null
        viewer.camera.lookAtTransform(C.Matrix4.IDENTITY)
      }
      return
    }
    viewer.trackedEntity = undefined
    setRastreando(false)
    cabine.current = viewer.scene.preRender.addEventListener(() => {
      const e = entidadePorId(sel.id)
      const p = e?.position?.getValue(viewer.clock.currentTime)
      if (!p) return
      viewer.camera.setView({ destination: p, orientation: { heading: C.Math.toRadians(e.meta.rumo || 0), pitch: C.Math.toRadians(-4), roll: 0 } })
    })
    return () => {
      cabine.current?.()
      cabine.current = null
    }
  }, [modoCabine, sel, pronto, entidadePorId])

  /* ---------- Cliques: selecionar ou desenhar ---------- */

  const atualizarDesenho = useCallback(() => {
    const C = CRef.current
    const ds = desenhoDs.current
    const pts = pontosDesenho.current
    for (const e of ds.entities.values.filter((x) => x.rascunho)) ds.entities.remove(e)
    if (!pts.length) return setMedida('')
    const cart = pts.map((p) => C.Cartesian3.fromDegrees(p.lon, p.lat))
    pts.forEach((p, i) => {
      const e = ds.entities.add({ position: cart[i], point: { pixelSize: 8, color: C.Color.fromCssColorString('#fde047'), outlineColor: C.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY } })
      e.rascunho = true
    })
    if (pts.length > 1) {
      const e = ds.entities.add({ polyline: { positions: ferramenta === 'area' ? [...cart, cart[0]] : cart, width: 3, material: C.Color.fromCssColorString('#fde047'), clampToGround: false, arcType: C.ArcType.GEODESIC } })
      e.rascunho = true
    }
    if (ferramenta === 'area' && pts.length > 2) {
      const e = ds.entities.add({ polygon: { hierarchy: cart, material: C.Color.fromCssColorString('#fde047').withAlpha(0.25), perPositionHeight: false } })
      e.rascunho = true
    }
    setMedida(ferramenta === 'area' ? (pts.length > 2 ? `Área: ${fmtArea(area(pts))} · perímetro ${fmtDistancia(comprimento([...pts, pts[0]]))}` : 'Clique mais pontos') : ferramenta === 'linha' ? `Distância: ${fmtDistancia(comprimento(pts))}` : '')
  }, [ferramenta])

  const concluirDesenho = useCallback(async () => {
    const C = CRef.current
    const pts = pontosDesenho.current
    const ds = desenhoDs.current
    if (!ferramenta || !pts.length) return
    for (const e of ds.entities.values.filter((x) => x.rascunho)) ds.entities.remove(e)
    const id = `d-${Date.now()}`
    let rotulo = ''
    const cart = pts.map((p) => C.Cartesian3.fromDegrees(p.lon, p.lat))
    const amarelo = C.Color.fromCssColorString('#fde047')
    const etiqueta = (pos, texto) => ({ position: pos, label: { text: texto, font: '700 12px system-ui', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK, outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, showBackground: true, backgroundColor: C.Color.BLACK.withAlpha(0.6), pixelOffset: new C.Cartesian2(0, -18), disableDepthTestDistance: Number.POSITIVE_INFINITY } })
    if (ferramenta === 'pino') {
      const p = pts[0]
      const nome = prompt('Nome do pino:', fmtCoord(p.lat, p.lon)) ?? fmtCoord(p.lat, p.lon)
      rotulo = `📍 ${nome}`
      ds.entities.add({ id, ...etiqueta(cart[0], rotulo), point: { pixelSize: 10, color: amarelo, outlineColor: C.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY } })
    } else if (ferramenta === 'linha' && pts.length > 1) {
      rotulo = `📏 ${fmtDistancia(comprimento(pts))}`
      ds.entities.add({ id, polyline: { positions: cart, width: 3, material: amarelo, arcType: C.ArcType.GEODESIC } })
      ds.entities.add({ id: `${id}-r`, ...etiqueta(cart[cart.length - 1], rotulo) })
    } else if (ferramenta === 'area' && pts.length > 2) {
      rotulo = `⬠ ${fmtArea(area(pts))}`
      ds.entities.add({ id, polygon: { hierarchy: cart, material: amarelo.withAlpha(0.25), outline: true, outlineColor: amarelo } })
      ds.entities.add({ id: `${id}-r`, ...etiqueta(C.BoundingSphere.fromPoints(cart).center, rotulo) })
    } else if (ferramenta === 'rota' && pts.length === 2) {
      try {
        const r = await rota(pts[0], pts[1])
        rotulo = `🚗 ${fmtDistancia(r.distancia)} · ${fmtDuracao(r.duracao)}`
        ds.entities.add({ id, polyline: { positions: r.pontos.map(([lo, la]) => C.Cartesian3.fromDegrees(lo, la)), width: 5, material: C.Color.fromCssColorString('#22d3ee'), clampToGround: true } })
        ds.entities.add({ id: `${id}-r`, ...etiqueta(cart[1], rotulo) })
      } catch (e) {
        avisar(e.message)
      }
    }
    if (rotulo) setDesenhos((d) => [...d, { id, rotulo, tipo: ferramenta, pontos: pts }])
    pontosDesenho.current = []
    setMedida('')
    if (ferramenta === 'pino' || ferramenta === 'rota') setFerramenta(null)
  }, [ferramenta, avisar])

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    const h = new C.ScreenSpaceEventHandler(viewer.scene.canvas)
    const pontoNoChao = (pos) => {
      const c = viewer.camera.pickEllipsoid(pos)
      if (!c) return null
      const g = C.Cartographic.fromCartesian(c)
      return { lat: C.Math.toDegrees(g.latitude), lon: C.Math.toDegrees(g.longitude) }
    }
    h.setInputAction((clique) => {
      if (ferramenta) {
        const p = pontoNoChao(clique.position)
        if (!p) return
        pontosDesenho.current.push(p)
        if (ferramenta === 'pino' || (ferramenta === 'rota' && pontosDesenho.current.length === 2)) concluirDesenho()
        else atualizarDesenho()
        return
      }
      const alvo = viewer.scene.pick(clique.position)
      const e = alvo?.id
      selecionar(e?.meta ? e : null)
    }, C.ScreenSpaceEventType.LEFT_CLICK)
    h.setInputAction(() => ferramenta && concluirDesenho(), C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    h.setInputAction((m) => {
      const p = pontoNoChao(m.endPosition)
      setInfo((x) => ({ ...x, cursor: p }))
      viewer.scene.canvas.style.cursor = ferramenta ? 'crosshair' : viewer.scene.pick(m.endPosition)?.id?.meta ? 'pointer' : ''
    }, C.ScreenSpaceEventType.MOUSE_MOVE)
    return () => h.destroy()
  }, [pronto, ferramenta, selecionar, concluirDesenho, atualizarDesenho])

  /* ---------- HUD: posição da câmera e relógio ---------- */

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    const t = setInterval(() => {
      const c = viewer.camera
      const g = c.positionCartographic
      setInfo((x) => ({ ...x, lat: C.Math.toDegrees(g.latitude), lon: C.Math.toDegrees(g.longitude), alt: g.height, rumo: (C.Math.toDegrees(c.heading) + 360) % 360, incl: C.Math.toDegrees(c.pitch), utc: new Date().toISOString().slice(11, 19) }))
    }, 250)
    return () => clearInterval(t)
  }, [pronto])

  /* ---------- Detecção: caixas sobre os objetos ---------- */

  useEffect(() => {
    if (!pronto) return
    const viewer = viewerRef.current
    const C = CRef.current
    const cv = telaDeteccao.current
    const ctx = cv.getContext('2d')
    if (!deteccao) {
      ctx.clearRect(0, 0, cv.width, cv.height)
      return
    }
    const paraTela = C.SceneTransforms.worldToWindowCoordinates || C.SceneTransforms.wgs84ToWindowCoordinates
    const desenhar = () => {
      const w = viewer.scene.canvas.clientWidth
      const hgt = viewer.scene.canvas.clientHeight
      if (cv.width !== w || cv.height !== hgt) {
        cv.width = w
        cv.height = hgt
      }
      ctx.clearRect(0, 0, w, hgt)
      const oclusor = new C.EllipsoidalOccluder(C.Ellipsoid.WGS84, viewer.camera.positionWC)
      const tempo = viewer.clock.currentTime
      const alvos = []
      for (let i = 0; i < viewer.dataSources.length; i++)
        for (const e of viewer.dataSources.get(i).entities.values) {
          const m = e.meta
          if (!m || !['aviao', 'satelite', 'terremoto', 'evento', 'ciclone', 'lancamento', 'camera'].includes(m.tipo)) continue
          const p = e.position?.getValue(tempo)
          if (!p || !oclusor.isPointVisible(p)) continue
          const s = paraTela(viewer.scene, p)
          if (!s || s.x < 0 || s.y < 0 || s.x > w || s.y > hgt) continue
          alvos.push({ s, m, d: Math.hypot(s.x - w / 2, s.y - hgt / 2) })
        }
      alvos.sort((a, b) => a.d - b.d)
      ctx.font = '600 11px ui-monospace, monospace'
      ctx.lineWidth = 1.5
      for (const { s, m } of alvos.slice(0, 80)) {
        const cor = m.tipo === 'aviao' ? (m.emerg ? '#f87171' : m.mil ? '#fb923c' : '#4ade80') : m.tipo === 'satelite' ? '#c4b5fd' : '#fbbf24'
        const r = 14
        ctx.strokeStyle = cor
        ctx.beginPath()
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          ctx.moveTo(s.x + dx * r, s.y + dy * (r - 6))
          ctx.lineTo(s.x + dx * r, s.y + dy * r)
          ctx.lineTo(s.x + dx * (r - 6), s.y + dy * r)
        }
        ctx.stroke()
        const linha2 = m.tipo === 'aviao' ? `${Math.round(m.alt || 0).toLocaleString('pt-BR')} ft ${m.vel ? `${Math.round(m.vel)} kt` : ''}` : m.tipo === 'satelite' ? `${Math.round((m.alt || 0) / 1000)} km` : m.tipo === 'terremoto' ? `${Math.round(m.prof)} km prof.` : ''
        ctx.fillStyle = 'rgba(0,0,0,.55)'
        const tx = s.x + r + 4
        const larg = Math.max(ctx.measureText(m.titulo.slice(0, 22)).width, ctx.measureText(linha2).width) + 6
        ctx.fillRect(tx - 3, s.y - r, larg, linha2 ? 28 : 16)
        ctx.fillStyle = cor
        ctx.fillText(m.titulo.slice(0, 22), tx, s.y - r + 11)
        if (linha2) {
          ctx.fillStyle = '#e2e8f0'
          ctx.fillText(linha2, tx, s.y - r + 24)
        }
      }
    }
    const remover = viewer.scene.postRender.addEventListener(desenhar)
    return () => {
      remover()
      ctx.clearRect(0, 0, cv.width, cv.height)
    }
  }, [deteccao, pronto])

  /* ---------- Tours ---------- */

  const rodarTour = async (t) => {
    const id = Date.now()
    tourAtivo.current = id
    for (const c of t.camadas || []) alternar(c, true)
    for (const [nome, lon, lat, alt, rumo, incl] of t.paradas) {
      if (tourAtivo.current !== id) return
      setTour({ nome: t.nome, parada: nome })
      await voarPara(lon, lat, alt, rumo, incl, 5)
      if (tourAtivo.current !== id) return
      await new Promise((ok) => setTimeout(ok, 3500))
    }
    if (tourAtivo.current === id) setTour(null)
  }
  const pararTour = () => {
    tourAtivo.current = null
    setTour(null)
    viewerRef.current?.camera.cancelFlight()
  }

  /* ---------- Busca ---------- */

  const procurar = async (e) => {
    e?.preventDefault()
    const coord = lerCoordenadas(busca)
    if (coord) {
      setResultados([])
      return voarPara(coord.lon, coord.lat, 15000, 0, -60)
    }
    if (busca.trim().length < 2) return
    try {
      setResultados(await buscarLugar(busca))
    } catch (err) {
      avisar(err.message)
    }
  }

  const irParaResultado = (r) => {
    setResultados([])
    setBusca(r.nome)
    voarPara(r.lon, r.lat, r.alt || 20000, 0, r.alt > 500000 ? -90 : -55)
  }

  /* ---------- Compartilhar ---------- */

  const compartilhar = async () => {
    const c = viewerRef.current.camera
    const C = CRef.current
    const g = c.positionCartographic
    const v = [C.Math.toDegrees(g.longitude).toFixed(4), C.Math.toDegrees(g.latitude).toFixed(4), Math.round(g.height), Math.round(C.Math.toDegrees(c.heading)), Math.round(C.Math.toDegrees(c.pitch))].join(',')
    const link = `${location.origin}${location.pathname}#v=${v}&c=${ativas.join(',')}&m=${modo}&b=${mapa}`
    history.replaceState(null, '', link)
    try {
      await navigator.clipboard.writeText(link)
      avisar('Link desta vista copiado.')
    } catch {
      prompt('Copie o link desta vista:', link)
    }
  }

  /* ---------- Voz ---------- */

  const NOMES_CAMADA = { avioes: 'voos', aviões: 'voos', voos: 'voos', militares: 'militares', emergencia: 'emergencias', emergência: 'emergencias', satelites: 'satelites', satélites: 'satelites', terremotos: 'terremotos', sismos: 'terremotos', incendios: 'eventos', incêndios: 'eventos', vulcoes: 'eventos', vulcões: 'eventos', radar: 'radar', chuva: 'radar', nuvens: 'nuvens', vento: 'vento', furacoes: 'ciclones', furacões: 'ciclones', ciclones: 'ciclones', lancamentos: 'lancamentos', lançamentos: 'lancamentos', foguetes: 'lancamentos', radios: 'radios', rádios: 'radios', bicicletas: 'bikes', cameras: 'cameras', câmeras: 'cameras' }
  const comandoDeVoz = async (texto) => {
    const t = texto.toLowerCase().trim()
    avisar(`🎤 “${texto}”`)
    let m
    if ((m = t.match(/^(?:ir para|vai para|voar para|me leva para|mostrar a cidade de|onde fica)\s+(.+)/))) {
      const r = await buscarLugar(m[1]).catch(() => [])
      if (r[0]) irParaResultado(r[0])
      else avisar(`Não achei “${m[1]}”.`)
      return
    }
    if ((m = t.match(/^(mostrar|mostra|ligar|liga|ativar|exibir)\s+(.+)/)) || (m = t.match(/^(esconder|esconde|desligar|desliga|tirar|ocultar)\s+(.+)/))) {
      const ligar = /^(mostr|lig|ativ|exib)/.test(m[1])
      const chave = Object.keys(NOMES_CAMADA).find((k) => m[2].includes(k))
      if (chave) return alternar(NOMES_CAMADA[chave], ligar)
    }
    const modoDito = MODOS.find((x) => t.includes(x.nome.toLowerCase().split(' (')[0]) || (x.id === 'nvg' && t.includes('noturna')) || (x.id === 'flir' && t.includes('flir')))
    if (modoDito) return setModo(modoDito.id)
    if (/parar|cancelar/.test(t)) return pararTour()
    if (/norte/.test(t)) return norte()
    avisar('Diga, por exemplo: “ir para Tóquio”, “mostrar aviões”, “visão noturna”.')
  }

  const ouvir = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return avisar('Este navegador não reconhece voz. Use o Chrome ou o Edge.')
    const r = new SR()
    r.lang = 'pt-BR'
    r.onresult = (e) => comandoDeVoz(e.results[0][0].transcript)
    r.onerror = (e) => avisar(e.error === 'not-allowed' ? 'Permita o microfone para usar a voz.' : 'Não entendi. Tente de novo.')
    r.onend = () => setOuvindo(false)
    setOuvindo(true)
    r.start()
  }

  /* ---------- Câmera: norte e inclinação ---------- */

  const norte = () => {
    const c = viewerRef.current.camera
    const C = CRef.current
    const g = c.positionCartographic
    c.flyTo({ destination: C.Cartesian3.fromRadians(g.longitude, g.latitude, g.height), orientation: { heading: 0, pitch: c.pitch, roll: 0 }, duration: 0.8 })
  }
  const inclinar = () => {
    const viewer = viewerRef.current
    const C = CRef.current
    const c = viewer.camera
    const centro = viewer.scene.globe.pick(c.getPickRay(new C.Cartesian2(viewer.scene.canvas.clientWidth / 2, viewer.scene.canvas.clientHeight / 2)), viewer.scene)
    const deitado = C.Math.toDegrees(c.pitch) > -60
    if (!centro) return
    const alcance = C.Cartesian3.distance(c.positionWC, centro)
    c.flyToBoundingSphere(new C.BoundingSphere(centro, 0), { offset: new C.HeadingPitchRange(c.heading, C.Math.toRadians(deitado ? -89.9 : -35), alcance), duration: 1 })
  }

  /* ---------- Rádio ---------- */

  const tocarRadio = (r) => {
    audio.current ??= new Audio()
    if (!r) {
      audio.current.pause()
      setRadio(null)
      return
    }
    audio.current.src = r.url
    audio.current.play().then(() => setRadio(r)).catch(() => avisar('Esta rádio não abriu no navegador. Tente outra.'))
  }
  useEffect(() => () => audio.current?.pause(), [])

  /* ---------- Teclado ---------- */

  useEffect(() => {
    const tecla = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      const m = MODOS.find((x) => x.tecla === k)
      if (m) return setModo(m.id)
      if (k === 'h') return setHud((x) => !x)
      if (k === 'd') return setDeteccao((x) => !x)
      if (k === 'n') return norte()
      if (k === 't') return inclinar()
      if (k === 'l') return setLuz((x) => !x)
      if (k === 'c' && sel?.meta.tipo === 'aviao') return setModoCabine((x) => !x)
      if (k === '/') {
        e.preventDefault()
        document.querySelector('.gl-busca input')?.focus()
      }
      if (k === 'escape') {
        if (ferramenta) {
          pontosDesenho.current = []
          atualizarDesenho()
          return setFerramenta(null)
        }
        if (tour) return pararTour()
        setModoCabine(false)
        rastrear(false)
        selecionar(null)
      }
      if (k === 'enter' && ferramenta) concluirDesenho()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  /* ---------- Tela ---------- */

  const grupos = [...new Set(CAMADAS.map((c) => c.grupo))]
  const altFmt = info.alt > 100000 ? `${Math.round(info.alt / 1000).toLocaleString('pt-BR')} km` : `${Math.round(info.alt).toLocaleString('pt-BR')} m`

  return (
    <div className={`gl-app gl-modo-${modo}`}>
      <div ref={caixa} className="gl-globo" />
      <canvas ref={telaDeteccao} className="gl-deteccao" aria-hidden="true" />
      {!pronto && (
        <div className="gl-carregando">
          {erro ? (
            <p role="alert">{erro} Verifique a conexão e recarregue.</p>
          ) : (
            <>
              <span className="spinner" aria-hidden="true" /> Montando o globo…
            </>
          )}
        </div>
      )}

      {hud && pronto && (
        <div className="gl-hud" aria-hidden="true">
          <span className="gl-mira" />
          <div className="gl-hud-canto gl-hud-se">
            <strong>{MODOS.find((m) => m.id === modo)?.nome.toUpperCase()}</strong>
            <span>UTC {info.utc}</span>
          </div>
          <div className="gl-hud-canto gl-hud-id">
            <span>
              CAM {fmtCoord(info.lat, info.lon)} · ALT {altFmt}
            </span>
            <span>
              RUMO {Math.round(info.rumo)}° · INCL {Math.round(info.incl)}°{info.cursor ? ` · CURSOR ${fmtCoord(info.cursor.lat, info.cursor.lon)}` : ''}
            </span>
          </div>
          <div className="gl-hud-canto gl-hud-ie">
            {ativas
              .filter((a) => status[a]?.n !== undefined)
              .map((a) => (
                <span key={a}>
                  {CAMADAS.find((c) => c.id === a)?.icone} {status[a].n}
                </span>
              ))}
          </div>
        </div>
      )}

      <form className="gl-busca" onSubmit={procurar} role="search">
        <button type="button" className="gl-btn gl-menu" onClick={() => setPainel((p) => (p === 'camadas' ? null : 'camadas'))} aria-label="Camadas e ajustes" aria-expanded={painel === 'camadas'}>
          ☰
        </button>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cidade, lugar ou coordenadas (/)" aria-label="Buscar lugar ou coordenadas" />
        <button type="submit" className="gl-btn" aria-label="Buscar">
          🔍
        </button>
        {resultados.length > 0 && (
          <ul className="gl-resultados">
            {resultados.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => irParaResultado(r)}>
                  {r.nome}
                  <small>{r.tipo}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {painel === 'camadas' && (
        <aside className="gl-painel gl-painel-esq" aria-label="Camadas">
          <div className="gl-painel-topo">
            <h1>Globo ao vivo</h1>
            <a href="/apps/globo" className="gl-sair">
              Sair
            </a>
          </div>
          {grupos.map((g) => (
            <section key={g}>
              <h2>{g}</h2>
              {CAMADAS.filter((c) => c.grupo === g).map((c) => {
                const s = status[c.id]
                const on = ativas.includes(c.id)
                return (
                  <div key={c.id} className="gl-camada">
                    <label>
                      <input type="checkbox" checked={on} onChange={() => alternar(c.id)} />
                      <span aria-hidden="true">{c.icone}</span> {c.nome}
                      {on && (s?.carregando ? <span className="spinner gl-mini-spinner" aria-label="carregando" /> : s?.erro ? <span className="gl-erro" title={s.erro}>⚠</span> : s?.n !== undefined ? <span className="gl-qtd">{s.n}</span> : null)}
                    </label>
                    {on && c.id === 'satelites' && (
                      <select value={opcoes.satelites.grupo} onChange={(e) => mudarOpcao('satelites', { grupo: e.target.value })} aria-label="Grupo de satélites">
                        {GRUPOS_SAT.map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                    {on && c.id === 'terremotos' && (
                      <select value={opcoes.terremotos.periodo} onChange={(e) => mudarOpcao('terremotos', { periodo: e.target.value })} aria-label="Período dos terremotos">
                        {PERIODOS_SISMO.map(([v, t]) => (
                          <option key={v} value={v}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                    {on && s?.erro && <p className="gl-erro-texto">{s.erro}</p>}
                    {on && <p className="gl-fonte">{c.fonte}</p>}
                  </div>
                )
              })}
            </section>
          ))}
          <section>
            <h2>Mapa</h2>
            <select value={mapa} onChange={(e) => setMapa(e.target.value)} aria-label="Mapa-base" className="gl-largo">
              {MAPAS.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
            <label className="gl-check">
              <input type="checkbox" checked={luz} onChange={(e) => setLuz(e.target.checked)} /> Dia e noite (sol de agora) · L
            </label>
          </section>
          <section>
            <h2>Visão</h2>
            <div className="gl-modos">
              {MODOS.map((m) => (
                <button key={m.id} type="button" className={modo === m.id ? 'ativo' : ''} onClick={() => setModo(m.id)} title={`Tecla ${m.tecla}`}>
                  <kbd>{m.tecla}</kbd> {m.nome}
                </button>
              ))}
            </div>
            <label className="gl-check">
              <input type="checkbox" checked={hud} onChange={(e) => setHud(e.target.checked)} /> HUD · H
            </label>
            <label className="gl-check">
              <input type="checkbox" checked={deteccao} onChange={(e) => setDeteccao(e.target.checked)} /> Caixas de detecção · D
            </label>
          </section>
          <section>
            <h2>Tours</h2>
            <div className="gl-tours">
              {TOURS.map((t) => (
                <button key={t.nome} type="button" onClick={() => rodarTour(t)}>
                  🎬 {t.nome}
                </button>
              ))}
            </div>
          </section>
          {desenhos.length > 0 && (
            <section>
              <h2>Desenhos</h2>
              <ul className="gl-desenhos">
                {desenhos.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => voarPara(d.pontos[0].lon, d.pontos[0].lat, 20000, 0, -60)}>
                      {d.rotulo}
                    </button>
                    <button
                      type="button"
                      aria-label="Apagar desenho"
                      onClick={() => {
                        desenhoDs.current.entities.removeById(d.id)
                        desenhoDs.current.entities.removeById(`${d.id}-r`)
                        setDesenhos((x) => x.filter((y) => y.id !== d.id))
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="gl-fonte">Atalhos: 1–7 visão · H HUD · D detecção · N norte · T inclinar · L dia/noite · C cabine · / buscar · Esc limpar.</p>
        </aside>
      )}

      {painel === 'contatos' && pronto && <Contatos viewer={viewerRef.current} C={CRef.current} ativas={ativas} onEscolher={(e) => (selecionar(e), setPainel(null))} onFechar={() => setPainel(null)} />}

      {sel && (
        <InfoSelecionado
          sel={sel}
          C={CRef.current}
          sat={satRef.current}
          viewer={viewerRef.current}
          rastreando={rastreando}
          cabine={modoCabine}
          radio={radio}
          onRastrear={rastrear}
          onCabine={() => setModoCabine((x) => !x)}
          onTocarRadio={tocarRadio}
          onEstacoes={async (rede) => {
            const ds = camadasVivas.current.get('bikes')?.ds
            if (!ds) return
            const n = await mostrarEstacoes(CRef.current, ds, rede).catch((e) => avisar(e.message))
            if (n) {
              avisar(`${n} estações carregadas.`)
              voarPara(sel.meta.lon, sel.meta.lat, 15000, 0, -60)
            }
          }}
          onFechar={() => {
            setModoCabine(false)
            rastrear(false)
            selecionar(null)
          }}
          voarPara={voarPara}
          avisar={avisar}
        />
      )}

      <nav className="gl-barra" aria-label="Ferramentas">
        <button type="button" className="gl-btn" onClick={norte} title="Apontar para o norte (N)" aria-label="Norte">
          🧭
        </button>
        <button type="button" className="gl-btn" onClick={inclinar} title="Inclinar / olhar de cima (T)" aria-label="Inclinar">
          ⛰️
        </button>
        <button type="button" className={`gl-btn ${deteccao ? 'ativo' : ''}`} onClick={() => setDeteccao((x) => !x)} title="Caixas de detecção (D)" aria-pressed={deteccao} aria-label="Detecção">
          🎯
        </button>
        <button type="button" className={`gl-btn ${painel === 'contatos' ? 'ativo' : ''}`} onClick={() => setPainel((p) => (p === 'contatos' ? null : 'contatos'))} title="Contatos na vista" aria-label="Contatos">
          📋
        </button>
        <span className="gl-sep" />
        {[
          ['pino', '📍', 'Marcar um ponto'],
          ['linha', '📏', 'Medir distância (duplo clique termina)'],
          ['area', '⬠', 'Medir área (duplo clique termina)'],
          ['rota', '🚗', 'Rota de carro entre dois pontos'],
        ].map(([id, ic, t]) => (
          <button
            key={id}
            type="button"
            className={`gl-btn ${ferramenta === id ? 'ativo' : ''}`}
            title={t}
            aria-label={t}
            aria-pressed={ferramenta === id}
            onClick={() => {
              pontosDesenho.current = []
              atualizarDesenho()
              setFerramenta((f) => (f === id ? null : id))
            }}
          >
            {ic}
          </button>
        ))}
        <span className="gl-sep" />
        <button type="button" className="gl-btn" onClick={compartilhar} title="Copiar link desta vista" aria-label="Compartilhar vista">
          🔗
        </button>
        <button type="button" className={`gl-btn ${ouvindo ? 'ativo' : ''}`} onClick={ouvir} title="Comando de voz" aria-label="Comando de voz">
          🎤
        </button>
        <button type="button" className="gl-btn" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())} title="Tela cheia" aria-label="Tela cheia">
          ⛶
        </button>
      </nav>

      {ferramenta && (
        <div className="gl-dica-ferramenta" role="status">
          {ferramenta === 'pino' && 'Clique no globo para marcar um ponto.'}
          {ferramenta === 'linha' && (medida || 'Clique os pontos do caminho. Duplo clique ou Enter termina.')}
          {ferramenta === 'area' && (medida || 'Clique os cantos da área. Duplo clique ou Enter termina.')}
          {ferramenta === 'rota' && `Clique a origem e o destino${pontosDesenho.current.length ? ' (falta o destino)' : ''}.`}
          <button type="button" onClick={() => (pontosDesenho.current = [], atualizarDesenho(), setFerramenta(null))}>
            Cancelar
          </button>
        </div>
      )}

      {radar && (
        <div className="gl-linha-tempo">
          <button type="button" className="gl-btn" onClick={() => setRadar((r) => ({ ...r, tocando: !r.tocando }))} aria-label={radar.tocando ? 'Pausar radar' : 'Animar radar'}>
            {radar.tocando ? '⏸' : '▶'}
          </button>
          <input type="range" min="0" max={radar.quadros.length - 1} value={radar.i} onChange={(e) => setRadar((r) => ({ ...r, i: Number(e.target.value), tocando: false }))} aria-label="Hora do radar" />
          <span>
            {new Date(radar.quadros[radar.i].time * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {radar.quadros[radar.i].previsao ? ' · previsão' : ''}
          </span>
        </div>
      )}

      {tour && (
        <div className="gl-tour" role="status">
          🎬 {tour.nome}: <strong>{tour.parada}</strong>
          <button type="button" onClick={pararTour}>
            Parar
          </button>
        </div>
      )}
      {radio && (
        <div className="gl-radio" role="status">
          📻 {radio.nome}
          <button type="button" onClick={() => tocarRadio(null)}>
            ■ Parar
          </button>
        </div>
      )}
      {aviso && (
        <div className="gl-aviso" role="status">
          {aviso}
        </div>
      )}
      <div ref={creditos} className="gl-creditos" />
    </div>
  )
}
