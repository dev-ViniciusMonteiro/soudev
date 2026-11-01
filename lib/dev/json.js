// JSON Toolkit: validar com linha/coluna, corrigir, formatar, comparar e converter.

export function posicaoParaLinha(texto, pos) {
  const antes = texto.slice(0, pos)
  const linhas = antes.split('\n')
  return { linha: linhas.length, coluna: linhas[linhas.length - 1].length + 1 }
}

const traduzir = (msg) =>
  msg
    .replace(/^JSON\.parse: /, '')
    .replace(/ in JSON at position \d+.*$/, '')
    .replace(/^Unexpected non-whitespace character after JSON.*$/, 'Tem texto sobrando depois do fim do JSON')
    .replace(/ at line \d+ column \d+ of the JSON data$/, '')
    .replace(/^Unexpected end of JSON input$/, 'O JSON terminou antes da hora (falta fechar } ou ])')
    .replace(/^Unexpected token '?(.)'?,? ?[\s\S]*$/, 'Caractere inesperado: $1')
    .replace(/^Expected ',' or '}' after property value$/, 'Faltou vírgula ou } depois do valor')
    .replace(/^Expected ',' or '\]' after array element$/, 'Faltou vírgula ou ] depois do item da lista')
    .replace(/^Expected double-quoted property name$/, 'Nome de chave precisa estar entre aspas duplas (ou sobrou uma vírgula)')
    .replace(/^Bad control character in string literal$/, 'Quebra de linha ou tab dentro de texto (use \\n)')
    .replace(/^Unterminated string$/, 'Texto sem as aspas de fechamento')

// Acha a posição do primeiro erro (o V8 novo nem sempre diz a posição na mensagem).
export function posicaoDoErro(s) {
  let i = 0
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++
  }
  const falha = () => {
    throw i
  }
  const str = () => {
    i++
    while (i < s.length) {
      const c = s[i]
      if (c === '"') return void i++
      if (c === '\\') {
        i += 2
        continue
      }
      if (c < ' ') falha()
      i++
    }
    falha()
  }
  const val = () => {
    ws()
    const c = s[i]
    if (c === '{') {
      i++
      ws()
      if (s[i] === '}') return void i++
      for (;;) {
        ws()
        if (s[i] !== '"') falha()
        str()
        ws()
        if (s[i] !== ':') falha()
        i++
        val()
        ws()
        if (s[i] === ',') {
          i++
          continue
        }
        if (s[i] === '}') return void i++
        falha()
      }
    }
    if (c === '[') {
      i++
      ws()
      if (s[i] === ']') return void i++
      for (;;) {
        val()
        ws()
        if (s[i] === ',') {
          i++
          continue
        }
        if (s[i] === ']') return void i++
        falha()
      }
    }
    if (c === '"') return str()
    const m = /^(-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(s.slice(i, i + 400))
    if (!m) falha()
    i += m[0].length
  }
  try {
    val()
    ws()
    if (i < s.length) falha()
    return null
  } catch (p) {
    return typeof p === 'number' ? p : null
  }
}

export function analisar(texto) {
  if (!String(texto).trim()) return { ok: false, vazio: true }
  try {
    return { ok: true, valor: JSON.parse(texto) }
  } catch (e) {
    const msg = String(e.message || e)
    let linha = null
    let coluna = null
    const lc = /line (\d+) column (\d+)/.exec(msg)
    const p = /position (\d+)/.exec(msg)
    if (lc) {
      linha = +lc[1]
      coluna = +lc[2]
    } else if (p) ({ linha, coluna } = posicaoParaLinha(texto, +p[1]))
    else {
      const pos = posicaoDoErro(texto)
      if (pos !== null) ({ linha, coluna } = posicaoParaLinha(texto, pos))
    }
    return { ok: false, erro: { msg: traduzir(msg), linha, coluna } }
  }
}

// Tira comentários // e /* */, vírgulas sobrando e troca aspas simples por duplas (fora de strings).
export function corrigir(texto) {
  let out = ''
  let i = 0
  const s = String(texto)
  while (i < s.length) {
    const c = s[i]
    if (c === '"' || c === "'") {
      const q = c
      let j = i + 1
      let corpo = ''
      while (j < s.length && s[j] !== q) {
        if (s[j] === '\\') {
          corpo += s[j] + (s[j + 1] ?? '')
          j += 2
          continue
        }
        corpo += q === "'" && s[j] === '"' ? '\\"' : s[j]
        j++
      }
      out += `"${corpo}"`
      i = j + 1
      continue
    }
    if (c === '/' && s[i + 1] === '/') {
      while (i < s.length && s[i] !== '\n') i++
      continue
    }
    if (c === '/' && s[i + 1] === '*') {
      i = s.indexOf('*/', i + 2)
      i = i < 0 ? s.length : i + 2
      continue
    }
    out += c
    i++
  }
  // vírgula antes de } ou ], e chaves sem aspas
  return out.replace(/,(\s*[}\]])/g, '$1').replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
}

export function ordenarChaves(v) {
  if (Array.isArray(v)) return v.map(ordenarChaves)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, ordenarChaves(v[k])]))
  return v
}

export const tipoDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

export function estatisticas(v) {
  let chaves = 0
  let nos = 0
  let prof = 0
  const andar = (x, d) => {
    nos++
    prof = Math.max(prof, d)
    if (Array.isArray(x)) x.forEach((y) => andar(y, d + 1))
    else if (x && typeof x === 'object')
      for (const k of Object.keys(x)) {
        chaves++
        andar(x[k], d + 1)
      }
  }
  andar(v, 0)
  return { chaves, nos, profundidade: prof }
}

/* ------------------------------ comparar ------------------------------ */
export function diffJson(a, b, caminho = '$', out = []) {
  const ta = tipoDe(a)
  const tb = tipoDe(b)
  if (ta !== tb) {
    out.push({ caminho, tipo: 'tipo', de: a, para: b })
    return out
  }
  if (ta === 'array') {
    const n = Math.max(a.length, b.length)
    for (let i = 0; i < n; i++) {
      const c = `${caminho}[${i}]`
      if (i >= a.length) out.push({ caminho: c, tipo: 'adicionado', para: b[i] })
      else if (i >= b.length) out.push({ caminho: c, tipo: 'removido', de: a[i] })
      else diffJson(a[i], b[i], c, out)
    }
  } else if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const c = /^[A-Za-z_$][\w$]*$/.test(k) ? `${caminho}.${k}` : `${caminho}[${JSON.stringify(k)}]`
      if (!(k in a)) out.push({ caminho: c, tipo: 'adicionado', para: b[k] })
      else if (!(k in b)) out.push({ caminho: c, tipo: 'removido', de: a[k] })
      else diffJson(a[k], b[k], c, out)
    }
  } else if (a !== b) out.push({ caminho, tipo: 'alterado', de: a, para: b })
  return out
}

/* ------------------------------ converter ------------------------------ */
const yamlEscalar = (v) => {
  if (v === null) return 'null'
  if (typeof v !== 'string') return String(v)
  if (v === '' || /^[\s]|[\s]$|[:#\-?{}[\],&*!|>'"%@`]|^(true|false|null|yes|no|~|[\d.+-][\d.e+-]*)$/i.test(v) || v.includes('\n')) return JSON.stringify(v)
  return v
}
export function paraYaml(v, nivel = 0) {
  const pad = '  '.repeat(nivel)
  if (Array.isArray(v)) {
    if (!v.length) return '[]'
    return v
      .map((x) => {
        if (x && typeof x === 'object' && Object.keys(x).length) {
          const sub = paraYaml(x, nivel + 1).replace(/^\s+/, '')
          return `${pad}- ${sub}`
        }
        return `${pad}- ${x && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : yamlEscalar(x)}`
      })
      .join('\n')
  }
  if (v && typeof v === 'object') {
    const ks = Object.keys(v)
    if (!ks.length) return '{}'
    return ks
      .map((k) => {
        const x = v[k]
        const chave = /^[A-Za-z_][\w-]*$/.test(k) ? k : JSON.stringify(k)
        if (x && typeof x === 'object' && (Array.isArray(x) ? x.length : Object.keys(x).length)) return `${pad}${chave}:\n${paraYaml(x, nivel + 1)}`
        return `${pad}${chave}: ${x && typeof x === 'object' ? (Array.isArray(x) ? '[]' : '{}') : yamlEscalar(x)}`
      })
      .join('\n')
  }
  return pad + yamlEscalar(v)
}

// achata objetos aninhados em colunas "a.b.c"
function achatar(o, pre = '', out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const c = pre ? `${pre}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) achatar(v, c, out)
    else out[c] = Array.isArray(v) ? JSON.stringify(v) : v
  }
  return out
}
export function paraCsv(v, sep = ',') {
  const lista = Array.isArray(v) ? v : [v]
  const linhas = lista.map((x) => (x && typeof x === 'object' ? achatar(x) : { valor: x }))
  const cols = [...new Set(linhas.flatMap((l) => Object.keys(l)))]
  const cel = (x) => {
    if (x === null || x === undefined) return ''
    const s = String(x)
    return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.map(cel).join(sep), ...linhas.map((l) => cols.map((c) => cel(l[c])).join(sep))].join('\n')
}

export function lerCsv(texto, sep) {
  const s = String(texto).replace(/\r\n?/g, '\n')
  if (!sep) {
    const primeira = s.split('\n')[0]
    sep = [',', ';', '\t', '|'].sort((a, b) => primeira.split(b).length - primeira.split(a).length)[0]
  }
  const linhas = []
  let linha = []
  let cel = ''
  let aspas = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (aspas) {
      if (c === '"' && s[i + 1] === '"') {
        cel += '"'
        i++
      } else if (c === '"') aspas = false
      else cel += c
    } else if (c === '"') aspas = true
    else if (c === sep) {
      linha.push(cel)
      cel = ''
    } else if (c === '\n') {
      linha.push(cel)
      linhas.push(linha)
      linha = []
      cel = ''
    } else cel += c
  }
  if (cel !== '' || linha.length) {
    linha.push(cel)
    linhas.push(linha)
  }
  return linhas.filter((l) => l.some((x) => x !== ''))
}
const valorCsv = (x) => {
  if (x === '') return null
  if (/^-?\d+(\.\d+)?$/.test(x) && !/^-?0\d/.test(x)) return Number(x)
  if (x === 'true' || x === 'false') return x === 'true'
  return x
}
export function csvParaJson(texto) {
  const [cab, ...resto] = lerCsv(texto)
  if (!cab) return []
  return resto.map((l) => Object.fromEntries(cab.map((c, i) => [c.trim() || `coluna${i + 1}`, valorCsv(l[i] ?? '')])))
}

const pascal = (s) =>
  String(s)
    .replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/^(\d)/, '_$1') || 'Item'
export function paraTypescript(v, raiz = 'Raiz') {
  const interfaces = []
  const nomes = new Set()
  const nomeLivre = (n) => {
    let x = pascal(n)
    let i = 2
    while (nomes.has(x)) x = `${pascal(n)}${i++}`
    nomes.add(x)
    return x
  }
  const tipo = (x, nome) => {
    if (x === null) return 'null'
    if (Array.isArray(x)) {
      if (!x.length) return 'unknown[]'
      const objs = x.filter((y) => y && typeof y === 'object' && !Array.isArray(y))
      if (objs.length === x.length) {
        // junta as chaves de todos os itens; as que faltam em algum viram opcionais
        const todas = {}
        const conta = {}
        for (const o of objs)
          for (const [k, val] of Object.entries(o)) {
            conta[k] = (conta[k] || 0) + 1
            if (!(k in todas) || todas[k] === null) todas[k] = val
          }
        return `${obj(todas, nome.replace(/s$/, ''), (k) => conta[k] < objs.length)}[]`
      }
      const ts = [...new Set(x.map((y) => tipo(y, nome)))]
      return ts.length === 1 ? `${ts[0]}[]` : `(${ts.join(' | ')})[]`
    }
    if (typeof x === 'object') return obj(x, nome)
    return typeof x
  }
  const obj = (o, nome, opcional = () => false) => {
    const n = nomeLivre(nome)
    const campos = Object.entries(o).map(([k, val]) => {
      const chave = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)
      return `  ${chave}${opcional(k) ? '?' : ''}: ${tipo(val, k)};`
    })
    interfaces.push(`export interface ${n} {\n${campos.join('\n')}\n}`)
    return n
  }
  const t = tipo(v, raiz)
  if (!(v && typeof v === 'object' && !Array.isArray(v))) interfaces.push(`export type ${pascal(raiz)} = ${t};`)
  return interfaces.reverse().join('\n\n')
}

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tag = (k) => (/^[A-Za-z_][\w.-]*$/.test(k) ? k : `item`)
export function paraXml(v, nome = 'raiz', nivel = 0) {
  const pad = '  '.repeat(nivel)
  if (Array.isArray(v)) return v.map((x) => paraXml(x, nome === 'raiz' ? 'item' : nome, nivel)).join('\n')
  if (v && typeof v === 'object') {
    const filhos = Object.entries(v).map(([k, x]) => (Array.isArray(x) ? x.map((y) => paraXml(y, tag(k), nivel + 1)).join('\n') : paraXml(x, tag(k), nivel + 1)))
    return `${pad}<${nome}>\n${filhos.join('\n')}\n${pad}</${nome}>`
  }
  return v === null ? `${pad}<${nome}/>` : `${pad}<${nome}>${xmlEsc(v)}</${nome}>`
}
export const xmlCompleto = (v) => `<?xml version="1.0" encoding="UTF-8"?>\n${Array.isArray(v) ? `<raiz>\n${paraXml(v, 'item', 1)}\n</raiz>` : paraXml(v)}`
