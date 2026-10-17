// Banco local dos sistemas: tudo fica no IndexedDB do navegador e funciona sem internet.
// Conectado a uma planilha, cada alteração entra numa fila e sobe para o Apps Script; o que outros
// aparelhos gravaram desce na mesma chamada ("sincronizar"). Conflito: vale a alteração mais recente.

import { CONFIGS, lerValor, tabelas } from './schema'
import { chamarPlanilha } from './api'
import { codigoPublico, novoId } from './regras'

const IDB_VERSAO = 1
const LOTE = 150

function abrirIDB(nome) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(nome, IDB_VERSAO)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const store of ['r', 'fila', 'meta']) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const esperar = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

function lerTudo(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const os = tx.objectStore(store)
    const out = []
    const req = os.openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (!cur) return resolve(out)
      out.push([cur.key, cur.value])
      cur.continue()
    }
    req.onerror = () => reject(req.error)
  })
}

/** Converte um registro que veio da planilha (tudo texto) para os tipos do esquema. */
function tipar(tabela, registro) {
  const out = {}
  for (const [k, v] of Object.entries(registro)) out[k] = lerValor(tabela, k, v)
  return out
}

export class Banco {
  constructor(ns, remoto = null) {
    this.ns = ns
    this.remoto = remoto // { url, email, token, papel }
    this.dados = new Map()
    this.fila = new Map()
    this.meta = { cursor: 0 }
    this.listas = new Map()
    this.ouvintes = new Set()
    this.status = { estado: remoto ? 'pendente' : 'local', pendentes: 0, ultimo: null, erro: '' }
    this.statusOuvintes = new Set()
  }

  async abrir() {
    this.idb = await abrirIDB(`sx-${this.ns}`)
    for (const [chave, valor] of await lerTudo(this.idb, 'r')) this.tabela(valor.t).set(chave.slice(valor.t.length + 1), valor.r)
    for (const [chave, valor] of await lerTudo(this.idb, 'fila')) this.fila.set(chave, valor)
    const meta = await esperar(this.idb.transaction('meta', 'readonly').objectStore('meta').get('meta'))
    if (meta) this.meta = meta
    if (typeof BroadcastChannel !== 'undefined') {
      this.canal = new BroadcastChannel(`sx-${this.ns}`)
      this.canal.onmessage = ({ data }) => {
        for (const { t, r } of data) this.tabela(t).set(r.id, r)
        this.mudou(data.map((d) => d.t))
      }
    }
    this.setStatus({ pendentes: this.fila.size })
    return this
  }

  /** Espera a última gravação chegar ao disco (antes de recarregar a página). */
  esperarGravacao() {
    return this.gravando ?? Promise.resolve()
  }

  fechar() {
    this.canal?.close()
    this.idb?.close()
    clearInterval(this.timer)
    clearTimeout(this.adiar)
  }

  vazio() {
    for (const m of this.dados.values()) if (m.size) return false
    return true
  }

  tabela(t) {
    if (!this.dados.has(t)) this.dados.set(t, new Map())
    return this.dados.get(t)
  }

  /* ---------- Leitura ---------- */

  /** Registros não excluídos, sempre a mesma referência até a tabela mudar (bom para useSyncExternalStore). */
  lista(t) {
    if (!this.listas.has(t)) {
      const arr = [...this.tabela(t).values()].filter((r) => !r.excluido)
      arr.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
      this.listas.set(t, arr)
    }
    return this.listas.get(t)
  }

  get(t, id) {
    const r = id ? this.tabela(t).get(id) : null
    return r && !r.excluido ? r : null
  }

  config() {
    const out = {}
    for (const c of CONFIGS) out[c.id] = c.padrao ?? ''
    for (const r of this.lista('config')) {
      const def = CONFIGS.find((c) => c.id === r.id)
      let v = r.valor
      if (def?.tipo === 'sim') v = v === true || v === '1' || v === 'true'
      else if (['numero', 'dinheiro', 'pct'].includes(def?.tipo)) v = Number(v) || 0
      out[r.id] = v
    }
    return out
  }

  /* ---------- Escrita ---------- */

  preparar(t, dados) {
    if (!tabelas[t]) throw new Error(`Tabela desconhecida: ${t}`)
    const antigo = dados.id ? this.tabela(t).get(dados.id) : null
    const agora = Date.now()
    const r = { ...antigo, ...dados }
    r.id ||= novoId()
    r.criado_em ||= new Date(agora).toISOString()
    // Sempre maior que a versão anterior, mesmo com o relógio do aparelho atrasado.
    r.atualizado_em = Math.max(agora, (antigo?.atualizado_em || 0) + 1)
    r.excluido = Boolean(r.excluido)
    const campos = tabelas[t].campos
    if (!antigo && campos.some((c) => c.id === 'codigo_publico') && !r.codigo_publico) r.codigo_publico = codigoPublico()
    // Sem planilha, o número sequencial é dado aqui; com planilha, quem numera é o servidor.
    if (!this.remoto && campos.some((c) => c.id === 'numero') && !r.numero) {
      r.numero = this.lista(t).reduce((m, x) => Math.max(m, Number(x.numero) || 0), 0) + 1
    }
    return r
  }

  /** Grava vários registros de uma vez (uma transação, um aviso). Recebe [[tabela, dados], ...]. */
  salvarVarios(pares) {
    const gravados = pares.map(([t, dados]) => {
      const r = this.preparar(t, dados)
      this.tabela(t).set(r.id, r)
      return { t, r }
    })
    const tx = this.idb.transaction(['r', 'fila'], 'readwrite')
    this.gravando = new Promise((resolve) => {
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve()
    })
    for (const { t, r } of gravados) {
      tx.objectStore('r').put({ t, r }, `${t}:${r.id}`)
      if (this.remoto) {
        this.fila.set(`${t}:${r.id}`, { t, r })
        tx.objectStore('fila').put({ t, r }, `${t}:${r.id}`)
      }
    }
    this.canal?.postMessage(gravados)
    this.mudou(gravados.map((g) => g.t))
    if (this.remoto) {
      this.setStatus({ pendentes: this.fila.size })
      clearTimeout(this.adiar)
      this.adiar = setTimeout(() => this.sincronizar(), 1200)
    }
    return gravados.map((g) => g.r)
  }

  salvar(t, dados) {
    return this.salvarVarios([[t, dados]])[0]
  }

  excluir(t, id) {
    return this.salvar(t, { id, excluido: true })
  }

  setConfig(valores) {
    this.salvarVarios(Object.entries(valores).map(([id, valor]) => ['config', { id, valor }]))
  }

  /* ---------- Avisos para o React ---------- */

  mudou(ts) {
    for (const t of new Set(ts)) this.listas.delete(t)
    for (const fn of this.ouvintes) fn()
  }

  ouvir = (fn) => {
    this.ouvintes.add(fn)
    return () => this.ouvintes.delete(fn)
  }

  setStatus(parcial) {
    this.status = { ...this.status, ...parcial }
    for (const fn of this.statusOuvintes) fn()
  }

  ouvirStatus = (fn) => {
    this.statusOuvintes.add(fn)
    return () => this.statusOuvintes.delete(fn)
  }

  /* ---------- Sincronização com a planilha ---------- */

  iniciarSync() {
    if (!this.remoto) return
    this.sincronizar()
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.sincronizar()
    }, 20000)
    window.addEventListener('online', () => this.sincronizar())
  }

  async sincronizar() {
    if (!this.remoto?.token) return
    if (this.rodando) {
      this.denovo = true
      return this.rodando
    }
    this.rodando = this.ciclo().finally(() => {
      this.rodando = null
      if (this.denovo) {
        this.denovo = false
        this.sincronizar()
      }
    })
    return this.rodando
  }

  async ciclo() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setStatus({ estado: 'offline' })
      return
    }
    this.setStatus({ estado: 'enviando', erro: '' })
    try {
      for (let volta = 0; volta < 20; volta++) {
        const envio = [...this.fila.values()].slice(0, LOTE)
        const resp = await chamarPlanilha(this.remoto.url, {
          acao: 'sincronizar',
          authorization: `Bearer ${this.remoto.token}`,
          desde: this.meta.cursor || 0,
          mudancas: envio.map(({ t, r }) => ({ tabela: t, registro: r })),
        })
        const tx = this.idb.transaction(['r', 'fila', 'meta'], 'readwrite')
        // Sai da fila só o que não mudou de novo enquanto a chamada estava no ar.
        for (const { t, r } of envio) {
          const chave = `${t}:${r.id}`
          if (this.fila.get(chave)?.r.atualizado_em === r.atualizado_em) {
            this.fila.delete(chave)
            tx.objectStore('fila').delete(chave)
          }
        }
        const tocadas = []
        for (const { tabela, registro } of resp.mudancas || []) {
          if (!tabelas[tabela] || !registro?.id) continue
          const r = tipar(tabela, registro)
          const chave = `${tabela}:${r.id}`
          const pendente = this.fila.get(chave)
          let final = r
          if (pendente && pendente.r.atualizado_em > r.atualizado_em) {
            // A versão local é mais nova: mantém, mas aproveita o número dado pelo servidor.
            final = { ...pendente.r, numero: pendente.r.numero || r.numero, codigo_publico: pendente.r.codigo_publico || r.codigo_publico }
            this.fila.set(chave, { t: tabela, r: final })
            tx.objectStore('fila').put({ t: tabela, r: final }, chave)
          }
          this.tabela(tabela).set(r.id, final)
          tx.objectStore('r').put({ t: tabela, r: final }, chave)
          tocadas.push(tabela)
        }
        this.meta.cursor = resp.cursor ?? this.meta.cursor
        this.meta.papel = resp.papel ?? this.meta.papel
        tx.objectStore('meta').put(this.meta, 'meta')
        if (resp.token) this.remoto.token = resp.token
        if (tocadas.length) this.mudou(tocadas)
        if (!resp.mais && this.fila.size === 0) break
        if (!resp.mais && envio.length === 0) break
      }
      this.setStatus({ estado: 'sincronizado', pendentes: this.fila.size, ultimo: Date.now() })
    } catch (e) {
      const sessao = e.codigo === 'sessao'
      this.setStatus({ estado: sessao ? 'sessao' : 'erro', erro: e.message, pendentes: this.fila.size })
    }
  }

  async apagarTudo() {
    this.fechar()
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(`sx-${this.ns}`)
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  }
}

const abertos = new Map()

/** Um banco por namespace, compartilhado entre telas da mesma aba. */
export function abrirBanco(ns, remoto = null) {
  if (!abertos.has(ns)) {
    const banco = new Banco(ns, remoto)
    abertos.set(
      ns,
      banco.abrir().catch((e) => {
        abertos.delete(ns)
        throw e
      }),
    )
  }
  return abertos.get(ns)
}

export function esquecerBanco(ns) {
  abertos.delete(ns)
}
