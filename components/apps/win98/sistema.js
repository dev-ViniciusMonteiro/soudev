'use client'

// Contextos compartilhados: o "sistema" (disco, abrir programas, caixas de mensagem, configurações)
// e a "janela" em que cada programa está (trocar o título, perguntar antes de fechar).

import { createContext, useContext, useEffect, useRef } from 'react'

export const SistemaCtx = createContext(null)
export const JanelaCtx = createContext(null)

export const useSistema = () => useContext(SistemaCtx)
export const useJanela = () => useContext(JanelaCtx)

/** Registra a função chamada quando o usuário tenta fechar a janela (devolve false/Promise<false> para cancelar). */
export function useAntesDeFechar(fn) {
  const jan = useJanela()
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!jan) return
    jan.registrarFechar(() => ref.current())
    return () => jan.registrarFechar(null)
  }, [jan])
}

/** Data no formato do Windows em português: "25/6/1998". */
export const dataCurta = (t) => new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric' })
export const horaCurta = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
