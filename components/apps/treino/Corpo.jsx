'use client'

// Mapa do corpo em SVG (frente e costas). Cada região é um músculo da base de exercícios.

import { MUSCULOS } from '@/lib/treino/logica'

const E = (cx, cy, rx, ry) => ({ t: 'e', cx, cy, rx, ry })
const R = (x, y, w, h) => ({ t: 'r', x, y, w, h })
const par = (f, cx, ...r) => [f(100 - cx, ...r), f(100 + cx, ...r)]

const FRENTE = {
  neck: [R(92, 50, 16, 12)],
  shoulders: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 38, 76, 14, 12)],
  chest: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 18, 92, 18, 13)],
  biceps: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 48, 112, 8, 18)],
  forearms: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 54, 152, 7, 20)],
  abdominals: [R(86, 108, 28, 60)],
  abductors: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 26, 186, 6, 14)],
  adductors: [E(100, 206, 5, 22)],
  quadriceps: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 13, 222, 11, 36)],
  calves: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 13, 300, 7, 24)],
}

const COSTAS = {
  neck: [R(92, 50, 16, 10)],
  traps: [E(100, 66, 24, 13)],
  shoulders: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 38, 76, 14, 12)],
  'middle back': [R(90, 80, 20, 38)],
  lats: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 20, 110, 13, 26)],
  triceps: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 48, 112, 8, 18)],
  forearms: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 54, 152, 7, 20)],
  'lower back': [R(87, 128, 26, 30)],
  glutes: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 13, 178, 14, 15)],
  hamstrings: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 13, 228, 11, 32)],
  calves: [...par((cx, cy, rx, ry) => E(cx, cy, rx, ry), 13, 298, 10, 25)],
}

function Silhueta() {
  return (
    <g className="tr-corpo-silhueta" aria-hidden="true">
      <circle cx="100" cy="30" r="18" />
      <path d="M70 62 Q100 54 130 62 L150 70 Q160 80 158 100 L166 170 Q168 182 160 184 L150 120 L140 100 L136 168 Q138 190 128 196 L124 270 L122 330 L108 334 L104 260 L100 214 L96 260 L92 334 L78 330 L76 270 L72 196 Q62 190 64 168 L60 100 L50 120 L40 184 Q32 182 34 170 L42 100 Q40 80 50 70 Z" />
    </g>
  )
}

/**
 * valores: { musculo: 0..1 } define a intensidade da cor. destaque: lista de músculos com contorno.
 * dicas: { musculo: texto } aparece ao passar o mouse.
 */
export default function Corpo({ valores = {}, selecionado = null, onEscolher = null, destaque = [], dicas = {}, cor = 'var(--accent)' }) {
  const desenhar = (mapa, lado) =>
    Object.entries(mapa).flatMap(([m, formas]) =>
      formas.map((f, i) => {
        const v = valores[m] || 0
        const props = {
          key: `${lado}-${m}-${i}`,
          className: `tr-corpo-musculo ${selecionado === m ? 'sel' : ''} ${destaque.includes(m) ? 'destaque' : ''} ${onEscolher ? 'clicavel' : ''}`,
          style: { fill: v ? `color-mix(in srgb, ${cor} ${Math.round(15 + v * 85)}%, var(--panel-2))` : undefined },
          onClick: onEscolher ? () => onEscolher(selecionado === m ? null : m) : undefined,
          role: onEscolher ? 'button' : undefined,
          'aria-label': onEscolher ? MUSCULOS[m] : undefined,
          tabIndex: onEscolher ? 0 : undefined,
          onKeyDown: onEscolher ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onEscolher(selecionado === m ? null : m)) : undefined,
        }
        const titulo = <title>{`${MUSCULOS[m]}${dicas[m] ? `: ${dicas[m]}` : ''}`}</title>
        return f.t === 'e' ? (
          <ellipse {...props} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry}>
            {titulo}
          </ellipse>
        ) : (
          <rect {...props} x={f.x} y={f.y} width={f.w} height={f.h} rx="6">
            {titulo}
          </rect>
        )
      }),
    )
  return (
    <div className="tr-corpo">
      <figure>
        <svg viewBox="20 0 160 345">
          <Silhueta />
          {desenhar(FRENTE, 'f')}
        </svg>
        <figcaption>Frente</figcaption>
      </figure>
      <figure>
        <svg viewBox="20 0 160 345">
          <Silhueta />
          {desenhar(COSTAS, 'c')}
        </svg>
        <figcaption>Costas</figcaption>
      </figure>
    </div>
  )
}
