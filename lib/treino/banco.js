'use client'

// Armazenamento do Treino no IndexedDB do aparelho (funciona offline). Coleções simples de objetos com id.

import { useEffect, useState } from 'react'

const NOME = 'soudev-treino'
const COLECOES = ['rotinas', 'sessoes', 'pesos', 'fotos', 'exercicios', 'config']
let conexao = null
const ouvintes = new Set()

function abrir() {
  if (conexao) return conexao
  conexao = new Promise((ok, erro) => {
    const req = indexedDB.open(NOME, 1)
    req.onupgradeneeded = () => {
      for (const c of COLECOES) if (!req.result.objectStoreNames.contains(c)) req.result.createObjectStore(c, { keyPath: 'id' })
    }
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
  return conexao
}

const tx = async (colecao, modo, fn) => {
  const db = await abrir()
  return new Promise((ok, erro) => {
    const t = db.transaction(colecao, modo)
    const r = fn(t.objectStore(colecao))
    t.oncomplete = () => ok(r?.result)
    t.onerror = () => erro(t.error)
  })
}

const avisar = (colecao) => ouvintes.forEach((f) => f(colecao))

export const lista = (colecao) => tx(colecao, 'readonly', (s) => s.getAll())
export const pegar = (colecao, id) => tx(colecao, 'readonly', (s) => s.get(id))

export async function salvar(colecao, obj) {
  await tx(colecao, 'readwrite', (s) => s.put(obj))
  avisar(colecao)
  return obj
}

export async function salvarVarios(colecao, objs) {
  await tx(colecao, 'readwrite', (s) => objs.forEach((o) => s.put(o)))
  avisar(colecao)
}

export async function excluir(colecao, id) {
  await tx(colecao, 'readwrite', (s) => s.delete(id))
  avisar(colecao)
}

export async function limpar(colecao) {
  await tx(colecao, 'readwrite', (s) => s.clear())
  avisar(colecao)
}

/** Lê a coleção e atualiza sozinho quando alguém grava nela. */
export function useColecao(colecao) {
  const [dados, setDados] = useState(null)
  useEffect(() => {
    let vivo = true
    const ler = () => lista(colecao).then((d) => vivo && setDados(d))
    ler()
    const f = (c) => c === colecao && ler()
    ouvintes.add(f)
    return () => {
      vivo = false
      ouvintes.delete(f)
    }
  }, [colecao])
  return dados
}

export const CONFIG_PADRAO = {
  id: 'geral',
  modo: 'semana',
  inicioSemana: 1,
  esforco: 'rir',
  descansoPadrao: 90,
  som: true,
  vibrar: true,
  pesoCorporal: 0,
  metaPeso: 0,
  barra: 20,
  anilhas: null,
  deloadAte: '',
  deloadPct: 10,
  deloadCada: 0,
  troca: null,
  unidade: 'kg',
}

export function useConfig() {
  const lista = useColecao('config')
  const cfg = { ...CONFIG_PADRAO, ...(lista?.find((c) => c.id === 'geral') || {}) }
  const mudar = (patch) => salvar('config', { ...cfg, ...patch })
  return [cfg, mudar, lista !== null]
}

/** Backup completo em JSON (fotos e mídias viram data URL). */
export async function exportarTudo() {
  const out = { app: 'soudev-treino', versao: 1, exportado: new Date().toISOString() }
  for (const c of COLECOES) {
    const itens = await lista(c)
    out[c] = await Promise.all(itens.map(async (x) => (x.blob instanceof Blob ? { ...x, blob: await blobParaDataUrl(x.blob) } : x)))
  }
  return out
}

export async function importarTudo(json, { substituir = false } = {}) {
  if (json?.app !== 'soudev-treino') throw new Error('Este arquivo não é um backup do Treino.')
  for (const c of COLECOES) {
    if (!Array.isArray(json[c])) continue
    if (substituir) await limpar(c)
    const itens = await Promise.all(json[c].map(async (x) => (typeof x.blob === 'string' && x.blob.startsWith('data:') ? { ...x, blob: await (await fetch(x.blob)).blob() } : x)))
    await salvarVarios(c, itens)
  }
}

export const blobParaDataUrl = (blob) =>
  new Promise((ok) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.readAsDataURL(blob)
  })
