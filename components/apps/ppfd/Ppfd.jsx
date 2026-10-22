'use client'

// Medidor PPFD: lê a luz pelo sensor do aparelho ou pela câmera (com difusor de papel), converte para PPFD
// conforme o espectro da luminária (ex.: LM301H EVO + 660 nm) e mostra DLI, faixa ideal por fase e mapa da área.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MedidorCamera, abrirSensor, temSensorDeLuz } from '@/lib/ppfd/medidor'
import { PERFIS, fatorDoPerfil } from '@/lib/ppfd/luz'
import Medir from './Medir'
import Mapa from './Mapa'
import Estimar from './Estimar'
import Guia from './Guia'

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave)
    return v === null ? padrao : JSON.parse(v)
  } catch {
    return padrao
  }
}

function guardar(chave, v) {
  try {
    localStorage.setItem(chave, JSON.stringify(v))
  } catch {
    /* sem armazenamento */
  }
}

/** Liga a fonte de luz escolhida e devolve a leitura suavizada (lux e o "relativo" da câmera). */
function useLeitura() {
  const [fonte, setFonte] = useState(null) // 'sensor' | 'camera' | null
  const [frontal, setFrontal] = useState(true)
  const [estado, setEstado] = useState({ lux: null, relativo: null, estouro: 0, manual: false, limite: false, erro: '' })
  const camera = useRef(null)
  const historico = useRef([]) // últimas leituras (para "medir aqui" usar a média de 1,5 s)

  useEffect(() => {
    if (!fonte) return
    let parar = () => {}
    let suave = null
    const registrar = (valor, extra) => {
      // Média móvel exponencial: tira a tremedeira sem atrasar demais (~0,5 s).
      suave = suave === null ? valor : suave + (valor - suave) * 0.15
      historico.current.push({ t: performance.now(), v: valor })
      while (historico.current.length && performance.now() - historico.current[0].t > 1500) historico.current.shift()
      setEstado((e) => ({ ...e, ...extra, erro: '' }))
      return suave
    }
    if (fonte === 'sensor') {
      parar = abrirSensor(
        (lux) => {
          const s = registrar(lux, {})
          setEstado((e) => ({ ...e, lux: s, relativo: null }))
        },
        (erro) => setEstado((e) => ({ ...e, erro })),
      )
    } else {
      const m = new MedidorCamera()
      camera.current = m
      let raf = 0
      let vivo = true
      m.abrir(frontal)
        .then((manual) => {
          if (!vivo) return
          setEstado((e) => ({ ...e, manual, erro: manual ? '' : 'Esta câmera não deixa travar a exposição no navegador: a medida fica só relativa (compare pontos, mas o número não é absoluto).' }))
          const passo = (agora) => {
            raf = requestAnimationFrame(passo)
            const r = m.ler(agora)
            if (!r || r.relativo === null) return
            const s = registrar(r.relativo, { estouro: r.estouro, limite: m.limiteDeLuz, manual: r.manual })
            setEstado((e) => ({ ...e, relativo: s }))
          }
          raf = requestAnimationFrame(passo)
        })
        .catch((e) => setEstado((x) => ({ ...x, erro: e?.name === 'NotAllowedError' ? 'A câmera foi bloqueada. Libere o acesso no cadeado ao lado do endereço.' : 'Não consegui abrir a câmera.' })))
      parar = () => {
        vivo = false
        cancelAnimationFrame(raf)
        m.fechar()
      }
    }
    return () => {
      parar()
      historico.current = []
      setEstado({ lux: null, relativo: null, estouro: 0, manual: false, limite: false, erro: '' })
    }
  }, [fonte, frontal])

  const mediaRecente = useCallback(() => {
    const h = historico.current
    return h.length ? h.reduce((s, x) => s + x.v, 0) / h.length : null
  }, [])

  return { fonte, setFonte, frontal, setFrontal, estado, mediaRecente }
}

const ABAS = [
  ['medir', '💡 Medir'],
  ['mapa', '🗺️ Mapa da área'],
  ['estimar', '🧮 Pela potência'],
  ['guia', '📖 Como medir'],
]

export default function Ppfd() {
  const [aba, setAba] = useState('medir')
  const [pronto, setPronto] = useState(false)
  const [perfilId, setPerfilId] = useState('evo3000r')
  const [vermelho, setVermelho] = useState(0.15)
  const [fatorPersonalizado, setFatorPersonalizado] = useState(0.0145)
  const [fase, setFase] = useState('flor')
  const [horas, setHoras] = useState(12)
  const [calib, setCalib] = useState({}) // { 'camera-frontal': { luxPorRelativo, quando, metodo }, sensor: { multiplicador } }
  const leitura = useLeitura()

  useEffect(() => {
    const c = ler('ppfd.config', {})
    if (c.perfilId) setPerfilId(c.perfilId)
    if (c.vermelho !== undefined) setVermelho(c.vermelho)
    if (c.fatorPersonalizado) setFatorPersonalizado(c.fatorPersonalizado)
    if (c.fase) setFase(c.fase)
    if (c.horas) setHoras(c.horas)
    setCalib(ler('ppfd.calibracao', {}))
    setPronto(true)
  }, [])

  useEffect(() => {
    if (pronto) guardar('ppfd.config', { perfilId, vermelho, fatorPersonalizado, fase, horas })
  }, [pronto, perfilId, vermelho, fatorPersonalizado, fase, horas])

  const perfil = PERFIS.find((p) => p.id === perfilId) ?? PERFIS[0]
  const fator = fatorDoPerfil(perfil, vermelho, fatorPersonalizado)
  const chaveCalib = leitura.fonte === 'camera' ? `camera-${leitura.frontal ? 'frontal' : 'traseira'}` : 'sensor'
  const calibAtual = calib[chaveCalib]

  /** Lux da leitura atual (já com a calibração); null se a câmera ainda não foi calibrada. */
  const luxDe = (valor) => {
    if (valor === null || valor === undefined) return null
    if (leitura.fonte === 'sensor') return valor * (calibAtual?.multiplicador ?? 1)
    return calibAtual?.luxPorRelativo ? valor * calibAtual.luxPorRelativo : null
  }

  const salvarCalib = (dados) => {
    const nova = { ...calib, [chaveCalib]: { ...dados, quando: new Date().toISOString() } }
    setCalib(nova)
    guardar('ppfd.calibracao', nova)
  }

  const comum = { leitura, perfil, fator, luxDe, calibAtual }

  return (
    <div className="pf-app">
      <header className="pf-topo">
        <a href="/apps/ppfd" className="pf-voltar" aria-label="Sobre o Medidor PPFD">
          ←
        </a>
        <strong>Medidor PPFD</strong>
        <nav className="pf-abas">
          {ABAS.map(([id, rotulo]) => (
            <button key={id} type="button" className={aba === id ? 'chip active' : 'chip'} onClick={() => setAba(id)}>
              {rotulo}
            </button>
          ))}
        </nav>
      </header>
      <main className="pf-corpo">
        {aba === 'medir' && (
          <Medir
            {...comum}
            perfis={PERFIS}
            perfilId={perfilId}
            setPerfilId={setPerfilId}
            vermelho={vermelho}
            setVermelho={setVermelho}
            fatorPersonalizado={fatorPersonalizado}
            setFatorPersonalizado={setFatorPersonalizado}
            fase={fase}
            setFase={setFase}
            horas={horas}
            setHoras={setHoras}
            temSensor={temSensorDeLuz()}
            salvarCalib={salvarCalib}
          />
        )}
        {aba === 'mapa' && <Mapa {...comum} fase={fase} />}
        {aba === 'estimar' && <Estimar fase={fase} horas={horas} />}
        {aba === 'guia' && <Guia />}
      </main>
    </div>
  )
}
