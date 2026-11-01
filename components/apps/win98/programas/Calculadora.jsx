'use client'

// Calculadora (modo Padrão) com o layout do Windows 98: memória à esquerda (vermelho), números em azul,
// operações em vermelho, e teclado: números, + - * /, Enter (=), Esc (C), Del (CE), Backspace, F9 (+/-), R (1/x), @ (raiz).

import { useEffect, useState } from 'react'
import { MenuBarra } from '../Menu'
import { useJanela, useSistema } from '../sistema'
import { inicial, tecla, textoVisor } from '@/lib/win98/calculadora'

const GRADE = [
  ['MC', '7', '8', '9', '/', 'sqrt'],
  ['MR', '4', '5', '6', '*', '%'],
  ['MS', '1', '2', '3', '-', '1/x'],
  ['M+', '0', '+/-', ',', '+', '='],
]

const ROTULO = { Back: 'Backspace' }
const cor = (t) => (/^[0-9]$|^\+\/-$|^,$/.test(t) ? 'w98-azul' : 'w98-vermelho')

const TECLADO = { Enter: '=', '=': '=', Escape: 'C', Delete: 'CE', Backspace: 'Back', F9: '+/-', r: '1/x', R: '1/x', '@': 'sqrt', '.': ',', ',': ',', '%': '%', '+': '+', '-': '-', '*': '*', '/': '/' }

export default function Calculadora() {
  const sis = useSistema()
  const jan = useJanela()
  const [e, setE] = useState(inicial)
  const [apertada, setApertada] = useState(null)

  const apertar = (t) => setE((atual) => tecla(atual, t))

  useEffect(() => {
    if (!jan.ativa) return
    const f = (ev) => {
      if (ev.ctrlKey || ev.altKey || ev.metaKey) {
        if (ev.ctrlKey && ev.key.toLowerCase() === 'c') navigator.clipboard?.writeText(textoVisor(e).replace(/,$/, '')).catch(() => {})
        return
      }
      const t = /^[0-9]$/.test(ev.key) ? ev.key : TECLADO[ev.key]
      if (!t) return
      ev.preventDefault()
      apertar(t)
      setApertada(t)
      setTimeout(() => setApertada(null), 90)
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [jan.ativa, e])

  const menus = [
    {
      rotulo: '&Editar',
      itens: [
        { rotulo: '&Copiar', atalho: 'Ctrl+C', acao: () => navigator.clipboard?.writeText(textoVisor(e).replace(/,$/, '')).catch(() => {}) },
        {
          rotulo: 'C&olar',
          atalho: 'Ctrl+V',
          acao: () =>
            navigator.clipboard
              ?.readText()
              .then((t) => {
                for (const ch of t.replace('.', ',')) if (/[0-9,]/.test(ch)) apertar(ch)
              })
              .catch(() => {}),
        },
      ],
    },
    {
      rotulo: '&Exibir',
      itens: [
        { rotulo: '&Científica', desabilitado: true },
        { rotulo: '&Padrão', marcado: 'ponto' },
        { sep: true },
        { rotulo: '&Agrupamento de dígitos', desabilitado: true },
      ],
    },
    { rotulo: 'Aj&uda', itens: [{ rotulo: '&Tópicos da Ajuda', acao: () => sis.abrir('ajuda') }, { sep: true }, { rotulo: '&Sobre a Calculadora', acao: () => sis.abrir('sobre', { programa: 'Calculadora', icone: 'calculadora' }) }] },
  ]

  const botao = (t, extra = '') => (
    <button key={t} type="button" className={`w98-botao ${cor(t)} ${extra} ${apertada === t ? 'apertado' : ''}`} data-tecla={t} onClick={() => apertar(t)}>
      <span>{ROTULO[t] ?? t}</span>
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <MenuBarra menus={menus} />
      <div className="w98-calc" style={{ width: 252 }}>
        <div className="w98-calc-visor" data-testid="w98-visor">
          {textoVisor(e)}
        </div>
        <div className="w98-calc-topo">
          <div className="w98-calc-memoria" data-testid="w98-memoria">{e.memoria !== 0 ? 'M' : ''}</div>
          {botao('Back')}
          {botao('CE')}
          {botao('C')}
        </div>
        <div className="w98-calc-grade">{GRADE.flatMap((linha) => linha.map((t, i) => botao(t, i === 0 ? 'col-mem' : '')))}</div>
      </div>
    </div>
  )
}
