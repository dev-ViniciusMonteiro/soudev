'use client'

// Prompt do MS-DOS: tela preta com cursor piscando, histórico com as setas e os comandos de lib/win98/dos.
// Também serve para "Reiniciar em modo MS-DOS" (tela cheia; EXIT ou WIN voltam ao Windows).

import { useEffect, useRef, useState } from 'react'
import { useJanela, useSistema } from '../sistema'
import { VERSAO, executar } from '@/lib/win98/dos'

const prompt = (cwd) => `${cwd.toUpperCase()}>`

export default function Dos({ telaCheia = false, aoSair }) {
  const sis = useSistema()
  const jan = useJanela()
  const [linhas, setLinhas] = useState(() => ['', VERSAO, '   Recriação do soudev para navegador.', '   Digite AJUDA para ver os comandos.', ''])
  const [cwd, setCwd] = useState('C:\\Windows')
  const [entrada, setEntrada] = useState('')
  const historico = useRef([])
  const posHist = useRef(-1)
  const campo = useRef(null)
  const tela = useRef(null)

  useEffect(() => {
    campo.current?.focus()
  }, [])

  useEffect(() => {
    if (jan?.ativa || telaCheia) campo.current?.focus()
  }, [jan?.ativa, telaCheia])

  useEffect(() => {
    tela.current?.scrollTo(0, tela.current.scrollHeight)
  }, [linhas, entrada])

  const rodar = () => {
    const linha = entrada
    setEntrada('')
    if (linha.trim()) historico.current = [linha, ...historico.current].slice(0, 30)
    posHist.current = -1
    if (telaCheia && /^\s*win\s*$/i.test(linha)) {
      aoSair?.()
      return
    }
    const r = executar(sis.disco, cwd, linha)
    if (r.disco) sis.mudarDisco(r.disco)
    if (r.sair) {
      if (telaCheia) aoSair?.()
      else jan.fechar()
      return
    }
    if (r.abrir) {
      if (telaCheia) r.saida = ['Este programa não pode ser executado no modo MS-DOS.']
      else sis.abrir(r.abrir)
    }
    setCwd(r.cwd)
    setLinhas((ls) => (r.limpar ? [] : [...ls, prompt(cwd) + linha, ...r.saida, ...(r.saida.length ? [''] : [])]))
  }

  return (
    <div className={`w98-dos ${telaCheia ? 'tela-cheia' : ''}`} ref={tela} onClick={() => campo.current?.focus()} data-testid="w98-dos">
      {linhas.join('\n')}
      {linhas.length ? '\n' : ''}
      {prompt(cwd)}
      {entrada}
      <span className="w98-dos-cursor" />
      <input
        ref={campo}
        className="w98-dos-entrada"
        value={entrada}
        aria-label="Linha de comando"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setEntrada(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            rodar()
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const p = Math.min(historico.current.length - 1, posHist.current + 1)
            if (p >= 0) {
              posHist.current = p
              setEntrada(historico.current[p])
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const p = posHist.current - 1
            posHist.current = Math.max(-1, p)
            setEntrada(p >= 0 ? historico.current[p] : '')
          } else if (e.key === 'Escape') setEntrada('')
        }}
      />
    </div>
  )
}
