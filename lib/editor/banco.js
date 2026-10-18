// Projetos e mídias do editor ficam no IndexedDB do navegador. Nenhum vídeo sai do aparelho.
import { uid } from './modelo'

let conexao = null
function abrir() {
  conexao ??= new Promise((ok, erro) => {
    const req = indexedDB.open('soudev-editor', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projetos')) db.createObjectStore('projetos', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('midias')) db.createObjectStore('midias', { keyPath: 'id' }).createIndex('projeto', 'projeto')
    }
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })
  return conexao
}

const tx = async (loja, modo, fn) => {
  const db = await abrir()
  return new Promise((ok, erro) => {
    const t = db.transaction(loja, modo)
    const r = fn(t.objectStore(loja))
    t.oncomplete = () => ok(r?.result)
    t.onerror = () => erro(t.error)
  })
}

export const listarProjetos = async () => (await tx('projetos', 'readonly', (s) => s.getAll())).sort((a, b) => b.alterado.localeCompare(a.alterado))
export const lerProjeto = (id) => tx('projetos', 'readonly', (s) => s.get(id))
export const salvarProjeto = (p) => tx('projetos', 'readwrite', (s) => s.put({ ...p, alterado: new Date().toISOString() }))
export const midiasDo = (projeto) => tx('midias', 'readonly', (s) => s.index('projeto').getAll(projeto))
export const salvarMidia = (m) => tx('midias', 'readwrite', (s) => s.put(m))
export const apagarMidia = (id) => tx('midias', 'readwrite', (s) => s.delete(id))

export async function apagarProjeto(id) {
  const ms = await midiasDo(id)
  await tx('midias', 'readwrite', (s) => ms.forEach((m) => s.delete(m.id)))
  await tx('projetos', 'readwrite', (s) => s.delete(id))
}

export async function duplicarProjeto(p) {
  const novo = { ...structuredClone(p), id: uid(), nome: `${p.nome} (cópia)`, criado: new Date().toISOString() }
  const ms = await midiasDo(p.id)
  const mapa = new Map()
  for (const m of ms) {
    const id = uid()
    mapa.set(m.id, id)
    await salvarMidia({ ...m, id, projeto: novo.id })
  }
  novo.trilhas = novo.trilhas.map((t) => ({ ...t, itens: t.itens.map((c) => (c.midia ? { ...c, midia: mapa.get(c.midia) || c.midia } : c)) }))
  await salvarProjeto(novo)
  return novo
}

/** Espaço usado e disponível (quando o navegador informa). */
export async function espaco() {
  try {
    const e = await navigator.storage?.estimate?.()
    return e ? { usado: e.usage, total: e.quota } : null
  } catch {
    return null
  }
}
