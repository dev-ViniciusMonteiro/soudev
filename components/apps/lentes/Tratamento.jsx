'use client'

// Antes e depois de cada tratamento, com um divisor que a pessoa arrasta. Os efeitos seguem a física de cada um:
// antirreflexo (refletância de Fresnel do material), fotossensível (escurece com o UV, em segundos), polarizado
// (corta o brilho refletido na água) e filtro de luz azul (corta parte do azul-violeta).

import { useEffect, useRef, useState } from 'react'
import { brilho, cenaNoite, cenaSol, cenaTela } from './cenas'
import { reflexo } from './optica'

export const TRATAMENTOS = [
  { id: 'ar', nome: 'Antirreflexo', resumo: 'Tira os reflexos da lente: mais nitidez à noite, menos halo nos faróis e os outros veem seus olhos, não o reflexo.', recomendado: true },
  { id: 'azul', nome: 'Filtro de luz azul', resumo: 'Reflete parte da luz azul-violeta das telas. Deixa um leve reflexo arroxeado. Os estudos não mostram que alivia o cansaço visual; o que ajuda mais é piscar e fazer pausas.' },
  { id: 'foto', nome: 'Fotossensível', resumo: 'Escurece ao sol e clareia em ambiente fechado. Dentro do carro escurece pouco, porque o para-brisa barra o UV que ativa a lente.' },
  { id: 'polar', nome: 'Polarizado (óculos de sol)', resumo: 'Corta o brilho que a água, o asfalto molhado e a neve refletem. Bom para dirigir e pescar; pode escurecer algumas telas de celular e do painel.' },
]

export default function Tratamento({ id, material }) {
  const ref = useRef(null)
  const [divisor, setDivisor] = useState(0.5)
  const [sol, setSol] = useState(30) // segundos ao sol (fotossensível)
  const [carro, setCarro] = useState(false)

  useEffect(() => {
    const c = ref.current
    const w = Math.min(720, c.parentElement.clientWidth), h = Math.round(w * 0.5)
    c.width = w; c.height = h
    const g = c.getContext('2d')
    const lado = (com) => {
      const off = document.createElement('canvas'); off.width = w; off.height = h
      const o = off.getContext('2d')
      if (id === 'ar') {
        const luzes = cenaNoite(o, w, h)
        for (const [x, y, s] of luzes) brilho(o, x, y, 26 * s)
        const R = com ? 0.005 : reflexo(material.n) * 2 // fração refletida pelas duas faces
        if (!com) {
          // reflexos-fantasma: cada luz forte aparece de novo, espelhada e fraca
          for (const [x, y, s] of luzes) { brilho(o, w - x + 18, h - y * 0.6, 22 * s, Math.min(1, R * 6)); brilho(o, x + 12, y + 30, 14 * s, Math.min(1, R * 4)) }
        }
        o.fillStyle = `rgba(200,210,230,${(R * 1.6).toFixed(3)})` // véu que baixa o contraste
        o.fillRect(0, 0, w, h)
      } else if (id === 'azul') {
        cenaTela(o, w, h)
        if (com) {
          o.fillStyle = 'rgba(255,214,140,.10)'; o.fillRect(0, 0, w, h) // leve tom amarelado
          const r = o.createLinearGradient(0, 0, w * 0.4, h * 0.4); r.addColorStop(0, 'rgba(130,110,255,.22)'); r.addColorStop(1, 'rgba(130,110,255,0)')
          o.fillStyle = r; o.fillRect(0, 0, w, h) // reflexo arroxeado na lente
        }
      } else if (id === 'foto') {
        cenaSol(o, w, h, false)
        if (com) {
          // escurece de forma exponencial; para-brisa barra a maior parte do UV
          const max = carro ? 0.2 : 0.82
          const escuro = max * (1 - Math.exp(-sol / 22))
          o.fillStyle = `rgba(55,50,45,${escuro.toFixed(3)})`; o.fillRect(0, 0, w, h)
        }
      } else if (id === 'polar') {
        cenaSol(o, w, h, !com)
        if (com) { o.fillStyle = 'rgba(40,45,40,.35)'; o.fillRect(0, 0, w, h) }
      }
      return off
    }
    const sem = lado(false), com = lado(true)
    const x = Math.round(w * divisor)
    g.drawImage(sem, 0, 0, x, h, 0, 0, x, h)
    g.drawImage(com, x, 0, w - x, h, x, 0, w - x, h)
    g.fillStyle = '#fff'; g.fillRect(x - 1.5, 0, 3, h)
    g.font = '700 13px system-ui, sans-serif'; g.textBaseline = 'top'
    const etiqueta = (t, px, alinhar) => { g.textAlign = alinhar; const m = g.measureText(t).width; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(alinhar === 'left' ? px - 6 : px - m - 6, 8, m + 12, 22); g.fillStyle = '#fff'; g.fillText(t, px, 12) }
    etiqueta('Sem', 12, 'left'); etiqueta('Com', w - 12, 'right')
  }, [id, material, divisor, sol, carro])

  return (
    <div className="ln-trat-demo">
      <canvas ref={ref} aria-label={`Antes e depois: ${TRATAMENTOS.find((t) => t.id === id).nome}`} />
      <label className="ln-faixa">
        <span>Arraste para comparar</span>
        <input type="range" min="0.05" max="0.95" step="0.01" value={divisor} onChange={(e) => setDivisor(Number(e.target.value))} />
      </label>
      {id === 'ar' && <p className="ln-nota">Sem antirreflexo, a lente {material.nome} reflete {(reflexo(material.n) * 200).toFixed(1).replace('.', ',')}% da luz (as duas faces). Com antirreflexo, menos de 1%. Quanto maior o índice, mais o antirreflexo faz falta.</p>}
      {id === 'foto' && (
        <div className="ln-controles">
          <label className="ln-faixa"><span>Tempo ao sol: {sol} s</span><input type="range" min="0" max="120" step="5" value={sol} onChange={(e) => setSol(Number(e.target.value))} /></label>
          <label className="ln-check"><input type="checkbox" checked={carro} onChange={(e) => setCarro(e.target.checked)} /> Dentro do carro</label>
          <p className="ln-nota">Escurece quase tudo em cerca de 1 minuto e leva de 2 a 5 minutos para clarear de novo em ambiente fechado.</p>
        </div>
      )}
    </div>
  )
}
