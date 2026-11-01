'use client'

import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Arrastar e soltar vertical, com mouse e com o dedo (pointer events, sem biblioteca).
 * A lista vai se reordenando enquanto você arrasta; ao soltar chama onFim(listaFinal).
 *
 *   const ord = useOrdenavel(itens, setItens, { onFim })
 *   <li ref={ord.ref(id)} {...ord.item(id)}> <button {...ord.alca(id)}>⠿</button> ... </li>
 */
export function useOrdenavel(itens, setItens, { onFim, chave } = {}) {
  const els = useRef(new Map())
  const estado = useRef(null) // { id, pegaY, desloc, y }
  const ultimo = useRef({})
  ultimo.current = { itens, setItens, onFim, chave: chave || ((x) => x.id) }
  const [arrastando, setArrastando] = useState(null)
  const fns = useRef(null)

  if (!fns.current) {
    const posicionar = () => {
      const e = estado.current
      const el = e && els.current.get(e.id)
      if (!el) return
      const topoNatural = el.getBoundingClientRect().top - e.desloc
      e.desloc = e.y - e.pegaY - topoNatural
      el.style.transform = `translateY(${e.desloc}px)`
    }
    // reordena quando o ponteiro passa do meio do vizinho
    const checar = () => {
      const e = estado.current
      if (!e) return
      const { itens: lista, setItens: set, chave: k } = ultimo.current
      const i = lista.findIndex((x) => k(x) === e.id)
      if (i < 0) return
      const meio = (x) => {
        const r = els.current.get(k(x))?.getBoundingClientRect()
        return r ? r.top + r.height / 2 : null
      }
      let alvo = i
      if (i > 0) {
        const m = meio(lista[i - 1])
        if (m !== null && e.y < m) alvo = i - 1
      }
      if (alvo === i && i < lista.length - 1) {
        const m = meio(lista[i + 1])
        if (m !== null && e.y > m) alvo = i + 1
      }
      if (alvo !== i) {
        const nova = [...lista]
        const [x] = nova.splice(i, 1)
        nova.splice(alvo, 0, x)
        ultimo.current.itens = nova
        set(nova)
      }
    }
    // rolagem automática do container (painel ou tela do celular) perto das bordas
    const rolar = () => {
      const e = estado.current
      if (!e) return
      const alvo = e.rolador
      const r = alvo ? alvo.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
      const borda = 70
      let v = 0
      if (e.y < r.top + borda) v = -Math.ceil(((r.top + borda - e.y) / borda) * 16)
      else if (e.y > r.bottom - borda) v = Math.ceil(((e.y - (r.bottom - borda)) / borda) * 16)
      if (v) {
        if (alvo) alvo.scrollTop += v
        else window.scrollBy(0, v)
        posicionar()
        checar()
      }
      e.raf = requestAnimationFrame(rolar)
    }
    const roladorDe = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
      }
      return null
    }
    const mover = (ev) => {
      const e = estado.current
      if (!e) return
      ev.preventDefault()
      e.y = ev.clientY
      posicionar()
      checar()
    }
    const soltar = () => {
      const e = estado.current
      if (!e) return
      const el = els.current.get(e.id)
      if (el) {
        el.style.transition = 'transform .18s ease'
        el.style.transform = ''
        setTimeout(() => (el.style.transition = ''), 200)
      }
      cancelAnimationFrame(e.raf)
      estado.current = null
      document.body.style.userSelect = ''
      setArrastando(null)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
      ultimo.current.onFim?.(ultimo.current.itens)
    }
    const comecar = (id, ev) => {
      if (ev.button !== undefined && ev.button !== 0) return
      const el = els.current.get(id)
      if (!el) return
      ev.preventDefault()
      ev.stopPropagation()
      const r = el.getBoundingClientRect()
      estado.current = { id, pegaY: ev.clientY - r.top, desloc: 0, y: ev.clientY, rolador: roladorDe(el) }
      estado.current.raf = requestAnimationFrame(rolar)
      document.body.style.userSelect = 'none'
      window.getSelection?.()?.removeAllRanges()
      setArrastando(id)
      window.addEventListener('pointermove', mover, { passive: false })
      window.addEventListener('pointerup', soltar)
      window.addEventListener('pointercancel', soltar)
    }
    fns.current = { posicionar, comecar }
  }

  // depois que a lista reordena, o item muda de lugar no DOM: reposiciona sem "pulo"
  useLayoutEffect(() => {
    fns.current.posicionar()
  }, [itens])

  return {
    arrastando,
    ref: (id) => (el) => {
      if (el) els.current.set(id, el)
      else els.current.delete(id)
    },
    item: (id) => ({ 'data-arrastando': arrastando === id ? '' : undefined }),
    alca: (id) => ({
      onPointerDown: (ev) => fns.current.comecar(id, ev),
      style: { touchAction: 'none', cursor: arrastando === id ? 'grabbing' : 'grab' },
      'aria-label': 'Arraste para mudar de lugar',
      title: 'Arraste para mudar de lugar',
      type: 'button',
    }),
  }
}

export function moverItem(lista, i, delta) {
  const j = i + delta
  if (j < 0 || j >= lista.length) return lista
  const nova = [...lista]
  ;[nova[i], nova[j]] = [nova[j], nova[i]]
  return nova
}
