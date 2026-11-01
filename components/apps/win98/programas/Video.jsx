'use client'

// Propriedades de Vídeo: Plano de fundo, Proteção de tela, Aparência e Configurações, com a prévia no
// monitorzinho, e OK / Cancelar / Aplicar (Aplicar só acende quando algo mudou, como no original).

import { useEffect, useRef, useState } from 'react'
import { Abas, Botao } from '../Dialogos'
import { useJanela, useSistema } from '../sistema'
import { ESQUEMAS, FUNDOS, PROTETORES } from '../temas'

/** Proteção de tela desenhada num canvas: "Voo espacial" (estrelas) ou "Linhas mágicas". */
export function Protetor({ tipo, pequeno = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c || tipo === 'nenhum') return
    const g = c.getContext('2d')
    let w = (c.width = c.clientWidth || 300)
    let h = (c.height = c.clientHeight || 200)
    let quadro
    const estrelas = Array.from({ length: pequeno ? 60 : 260 }, () => ({ x: (Math.random() - 0.5) * w, y: (Math.random() - 0.5) * h, z: Math.random() * w }))
    const pontos = Array.from({ length: 4 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1), vy: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1) }))
    const rastro = []
    let matiz = 0
    const passo = () => {
      if (tipo === 'estrelas') {
        g.fillStyle = '#000'
        g.fillRect(0, 0, w, h)
        for (const s of estrelas) {
          s.z -= pequeno ? 2 : 6
          if (s.z <= 1) {
            s.x = (Math.random() - 0.5) * w
            s.y = (Math.random() - 0.5) * h
            s.z = w
          }
          const k = (pequeno ? 60 : 200) / s.z
          const x = s.x * k + w / 2
          const y = s.y * k + h / 2
          const t = Math.max(1, (1 - s.z / w) * (pequeno ? 2 : 3.5))
          g.fillStyle = `rgba(255,255,255,${Math.min(1, 1.2 - s.z / w)})`
          g.fillRect(x, y, t, t)
        }
      } else {
        g.fillStyle = 'rgba(0,0,0,0.08)'
        g.fillRect(0, 0, w, h)
        for (const p of pontos) {
          p.x += p.vx * (pequeno ? 0.5 : 1.6)
          p.y += p.vy * (pequeno ? 0.5 : 1.6)
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        }
        rastro.push(pontos.map((p) => ({ ...p })))
        if (rastro.length > 14) rastro.shift()
        matiz = (matiz + 0.6) % 360
        g.strokeStyle = `hsl(${matiz},100%,55%)`
        g.lineWidth = 1
        const ult = rastro.at(-1)
        g.beginPath()
        ult.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
        g.closePath()
        g.stroke()
      }
      quadro = requestAnimationFrame(passo)
    }
    const redim = () => {
      w = c.width = c.clientWidth
      h = c.height = c.clientHeight
    }
    window.addEventListener('resize', redim)
    passo()
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', redim)
    }
  }, [tipo, pequeno])
  if (tipo === 'nenhum') return <div style={{ width: '100%', height: '100%', background: '#000' }} />
  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} data-testid={pequeno ? undefined : 'w98-protetor'} />
}

export const estiloFundo = (fundo, esquema) => {
  const f = FUNDOS[fundo]
  const cor = ESQUEMAS[esquema]?.vars['--w-mesa'] || '#008080'
  if (!f?.css) return { background: cor }
  return { background: f.css, backgroundSize: f.tamanho }
}

function Monitor({ children, style }) {
  return (
    <div className="w98-monitor" aria-hidden="true">
      <div className="w98-monitor-moldura">
        <div className="w98-monitor-tela" style={style}>
          {children}
        </div>
      </div>
      <div className="w98-monitor-pe" />
      <div className="w98-monitor-base" />
    </div>
  )
}

export default function Video({ aba: abaInicial = 0 }) {
  const sis = useSistema()
  const jan = useJanela()
  const original = sis.config
  const [rascunho, setRascunho] = useState({ fundo: original.fundo, esquema: original.esquema, protetor: original.protetor, minutosProtetor: original.minutosProtetor })
  const [aplicado, setAplicado] = useState(rascunho)
  const mudou = JSON.stringify(rascunho) !== JSON.stringify(aplicado)
  const muda = (k, v) => setRascunho((r) => ({ ...r, [k]: v }))
  const aplicar = () => {
    sis.mudarConfig((c) => ({ ...c, ...rascunho }))
    setAplicado(rascunho)
  }
  const esq = ESQUEMAS[rascunho.esquema]?.vars || ESQUEMAS.padrao.vars

  return (
    <Abas
      largura={404}
      inicial={abaInicial}
      abas={['Plano de fundo', 'Proteção de tela', 'Aparência', 'Configurações']}
      rodape={
        <>
          <Botao
            padrao
            data-botao="OK"
            onClick={() => {
              if (mudou) aplicar()
              jan.fecharJa()
            }}
          >
            OK
          </Botao>
          <Botao onClick={() => jan.fecharJa()} data-botao="Cancelar">
            Cancelar
          </Botao>
          <Botao disabled={!mudou} onClick={aplicar} data-botao="Aplicar">
            &Aplicar
          </Botao>
        </>
      }
    >
      {(aba) =>
        aba === 0 ? (
          <div>
            <Monitor style={estiloFundo(rascunho.fundo, rascunho.esquema)} />
            <div>Plano de fundo:</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <div className="w98-lista" style={{ flex: 1, height: 110 }} data-testid="w98-lista-fundos">
                {Object.entries(FUNDOS).map(([k, f]) => (
                  <button key={k} type="button" className={rascunho.fundo === k ? 'sel' : ''} onClick={() => muda('fundo', k)}>
                    {f.nome}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Botao disabled>&Procurar...</Botao>
                <Botao disabled>&Padrão...</Botao>
              </div>
            </div>
          </div>
        ) : aba === 1 ? (
          <div>
            <Monitor>
              <Protetor tipo={rascunho.protetor} pequeno />
            </Monitor>
            <fieldset className="w98-fieldset">
              <legend>Proteção de tela</legend>
              <div className="w98-linha" style={{ marginBottom: 8 }}>
                <select className="w98-campo" style={{ flex: 1, height: 22, padding: 1 }} value={rascunho.protetor} onChange={(e) => muda('protetor', e.target.value)} aria-label="Proteção de tela">
                  {Object.entries(PROTETORES).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </select>
                <Botao disabled>Con&figurações...</Botao>
                <Botao disabled={rascunho.protetor === 'nenhum'} onClick={() => sis.visualizarProtetor(rascunho.protetor)} data-botao="Visualizar">
                  &Visualizar
                </Botao>
              </div>
              <label className="w98-linha">
                <span>Aguardar:</span>
                <input className="w98-campo" style={{ width: 44 }} type="number" min="1" max="60" value={rascunho.minutosProtetor} onChange={(e) => muda('minutosProtetor', Math.max(1, Math.min(60, Number(e.target.value) || 1)))} aria-label="Minutos" />
                <span>minutos</span>
              </label>
            </fieldset>
          </div>
        ) : aba === 2 ? (
          <div>
            <div className="w98-previa-esquema" style={{ ...esq, background: esq['--w-mesa'] }}>
              <div className="w98-janela" style={{ position: 'relative', width: '86%', ...esq }}>
                <div className="w98-titulo" style={{ background: `linear-gradient(90deg, ${esq['--w-titulo-inativo1']}, ${esq['--w-titulo-inativo2']})`, color: esq['--w-titulo-texto-inativo'] }}>
                  <span className="w98-titulo-texto">Janela inativa</span>
                </div>
              </div>
              <div className="w98-janela ativa" style={{ position: 'relative', width: '86%', marginLeft: '8%', marginTop: -6, ...esq }}>
                <div className="w98-titulo">
                  <span className="w98-titulo-texto">Janela ativa</span>
                </div>
                <div style={{ padding: '4px 6px', color: esq['--w-texto'] }}>
                  Normal <span style={{ color: esq['--w-desabilitado'] || '#808080' }}>Desativado</span> <span style={{ background: esq['--w-selecao'], color: '#fff' }}>Selecionado</span>
                </div>
                <div style={{ margin: '0 6px 6px', padding: 4, background: esq['--w-janela'], color: esq['--w-texto'], boxShadow: 'var(--w-campo)' }}>Texto da janela</div>
              </div>
            </div>
            <label className="w98-linha" style={{ marginTop: 10 }}>
              <span>Esquema:</span>
              <select className="w98-campo" style={{ flex: 1, height: 22, padding: 1 }} value={rascunho.esquema} onChange={(e) => muda('esquema', e.target.value)} aria-label="Esquema">
                {Object.entries(ESQUEMAS).map(([k, e]) => (
                  <option key={k} value={k}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div>
            <Monitor style={estiloFundo(aplicado.fundo, aplicado.esquema)} />
            <div className="w98-linha" style={{ gap: 12 }}>
              <fieldset className="w98-fieldset" style={{ flex: 1 }}>
                <legend>Cores</legend>
                <span className="w98-campo" style={{ display: 'block' }}>
                  True Color (32 bits)
                </span>
              </fieldset>
              <fieldset className="w98-fieldset" style={{ flex: 1 }}>
                <legend>Área da tela</legend>
                <div style={{ textAlign: 'center' }}>
                  {typeof window !== 'undefined' ? `${window.screen.width} por ${window.screen.height} pixels` : ''}
                </div>
              </fieldset>
            </div>
          </div>
        )
      }
    </Abas>
  )
}
