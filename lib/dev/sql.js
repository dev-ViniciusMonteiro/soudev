// SQL Toolkit: tokenizador próprio + formatar, minificar, explicar, converter dialeto e gerar INSERT.

const KW = new Set(
  `SELECT FROM WHERE AND OR NOT IN IS NULL LIKE ILIKE BETWEEN EXISTS AS ON JOIN LEFT RIGHT INNER OUTER FULL CROSS NATURAL USING
  GROUP BY ORDER HAVING LIMIT OFFSET FETCH NEXT FIRST ROWS ROW ONLY TOP DISTINCT ALL UNION INTERSECT EXCEPT INSERT INTO VALUES UPDATE SET
  DELETE CREATE TABLE ALTER DROP ADD COLUMN INDEX VIEW PRIMARY KEY FOREIGN REFERENCES UNIQUE DEFAULT CHECK CONSTRAINT IF CASCADE
  CASE WHEN THEN ELSE END ASC DESC WITH RECURSIVE RETURNING CONFLICT DO NOTHING OVER PARTITION WINDOW TRUE FALSE
  COUNT SUM AVG MIN MAX COALESCE CAST NOW INT INTEGER BIGINT SMALLINT VARCHAR CHAR TEXT BOOLEAN DATE TIMESTAMP DECIMAL NUMERIC FLOAT REAL SERIAL
  AUTO_INCREMENT AUTOINCREMENT IDENTITY TRUNCATE BEGIN COMMIT ROLLBACK TRANSACTION GRANT REVOKE REPLACE IGNORE DUPLICATE`.split(/\s+/),
)
const COMPOSTOS = [
  ['LEFT', 'OUTER', 'JOIN'], ['RIGHT', 'OUTER', 'JOIN'], ['FULL', 'OUTER', 'JOIN'],
  ['LEFT', 'JOIN'], ['RIGHT', 'JOIN'], ['INNER', 'JOIN'], ['FULL', 'JOIN'], ['CROSS', 'JOIN'], ['NATURAL', 'JOIN'],
  ['GROUP', 'BY'], ['ORDER', 'BY'], ['PARTITION', 'BY'], ['INSERT', 'INTO'], ['DELETE', 'FROM'], ['UNION', 'ALL'], ['ON', 'CONFLICT'],
  ['PRIMARY', 'KEY'], ['FOREIGN', 'KEY'], ['CREATE', 'TABLE'], ['ALTER', 'TABLE'], ['DROP', 'TABLE'], ['IS', 'NOT', 'NULL'], ['NOT', 'IN'], ['NOT', 'LIKE'], ['NOT', 'EXISTS'],
]
const BLOCO = new Set(['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'SET', 'VALUES', 'RETURNING', 'WITH', 'WINDOW'])
const LINHA = new Set(['LIMIT', 'OFFSET', 'FETCH', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'ON CONFLICT', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'NATURAL JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'JOIN'])
const LISTA = new Set(['SELECT', 'GROUP BY', 'ORDER BY', 'SET', 'RETURNING', 'VALUES', 'WITH', 'FROM'])

/* ------------------------------ tokenizar ------------------------------ */
// t: w (palavra) | id (identificador entre aspas) | s (string) | n (número) | c (comentário) | p (pontuação/operador) | ws
export function tokenizar(sql) {
  const s = String(sql)
  const out = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    const resto = s.slice(i)
    let m
    if ((m = /^\s+/.exec(resto))) out.push({ t: 'ws', v: m[0] })
    else if ((m = /^--[^\n]*/.exec(resto)) || (m = /^#[^\n]*/.exec(resto))) out.push({ t: 'c', v: m[0] })
    else if (resto.startsWith('/*')) {
      const f = s.indexOf('*/', i + 2)
      out.push({ t: 'c', v: s.slice(i, f < 0 ? s.length : f + 2) })
    } else if (c === "'" || (c.toUpperCase() === 'N' && s[i + 1] === "'") || (c.toUpperCase() === 'E' && s[i + 1] === "'")) {
      let j = s.indexOf("'", i) + 1
      while (j < s.length) {
        if (s[j] === "'" && s[j + 1] === "'") j += 2
        else if (s[j] === '\\' && s[j + 1]) j += 2
        else if (s[j] === "'") break
        else j++
      }
      out.push({ t: 's', v: s.slice(i, j + 1) })
    } else if (c === '"' || c === '`') {
      const f = s.indexOf(c, i + 1)
      out.push({ t: 'id', v: s.slice(i, f < 0 ? s.length : f + 1) })
    } else if (c === '[') {
      const f = s.indexOf(']', i + 1)
      out.push({ t: 'id', v: s.slice(i, f < 0 ? s.length : f + 1) })
    } else if ((m = /^\$(\w*)\$[\s\S]*?\$\1\$/.exec(resto))) out.push({ t: 's', v: m[0] })
    else if ((m = /^(\d+\.?\d*(e[+-]?\d+)?|\.\d+)/i.exec(resto))) out.push({ t: 'n', v: m[0] })
    else if ((m = /^[A-Za-z_À-ɏ][\w$À-ɏ]*/.exec(resto))) out.push({ t: 'w', v: m[0] })
    else if ((m = /^[@:$?][\w]+/.exec(resto))) out.push({ t: 'w', v: m[0], param: true })
    else if ((m = /^(<>|<=|>=|!=|::|\|\||->>|->|=>|:=|[(),;.*+\-/%=<>|&^~!?])/.exec(resto))) out.push({ t: 'p', v: m[0] })
    else out.push({ t: 'p', v: c })
    i += out[out.length - 1].v.length
  }
  return out
}

// junta palavras compostas (GROUP BY, LEFT JOIN…) num token só; tira espaços.
export function significativos(toks) {
  const sig = toks.filter((t) => t.t !== 'ws')
  const out = []
  for (let i = 0; i < sig.length; i++) {
    const t = sig[i]
    if (t.t === 'w') {
      const ach = COMPOSTOS.find((c) => c.every((p, k) => sig[i + k]?.t === 'w' && sig[i + k].v.toUpperCase() === p))
      if (ach) {
        out.push({ t: 'w', v: sig.slice(i, i + ach.length).map((x) => x.v).join(' '), U: ach.join(' ') })
        i += ach.length - 1
        continue
      }
    }
    out.push(t.t === 'w' ? { ...t, U: t.v.toUpperCase() } : t)
  }
  return out
}

const ehKw = (t) => t?.t === 'w' && (KW.has(t.U) || BLOCO.has(t.U) || LINHA.has(t.U) || t.U.includes(' '))

/* ------------------------------ formatar ------------------------------ */
export function formatar(sql, { caixa = 'maiusculas', indent = '  ' } = {}) {
  const toks = significativos(tokenizar(sql))
  const linhas = []
  let linha = ''
  let ind = 0
  const nl = (n) => {
    if (linha.trim()) linhas.push(indent.repeat(ind) + linha.trim())
    linha = ''
    ind = n
  }
  const frames = [{ base: 0, cl: null }]
  const parens = []
  const f = () => frames[frames.length - 1]
  const emFuncao = () => parens.length > 0 && parens[parens.length - 1] === 'f'
  let ant = null
  let between = false
  const esp = (t) => {
    if (!linha) return ''
    if (ant && (ant.v === '(' || ant.v === '.' || ant.v === '::')) return ''
    if ([')', ',', '.', ';', '::'].includes(t.v)) return ''
    if (t.v === '(' && ant && (ant.t === 'id' || (ant.t === 'w' && !ehKw(ant)) || ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'CAST', 'NOW', 'VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC', 'IDENTITY'].includes(ant.U)) && f().cl !== 'INSERT INTO') return ''
    return ' '
  }
  const put = (t, txt) => {
    linha += esp(t) + txt
    ant = t
  }
  const caso = (t) => (t.t === 'w' && ehKw(t) && !t.param ? (caixa === 'maiusculas' ? t.U : caixa === 'minusculas' ? t.U.toLowerCase() : t.v) : t.v)

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    const V = t.U
    if (t.t === 'c') {
      if (t.v.startsWith('--') || t.v.startsWith('#')) {
        put(t, t.v)
        nl(ind)
      } else put(t, t.v)
      continue
    }
    if (t.t === 'w' && BLOCO.has(V) && !emFuncao()) {
      const F = f()
      nl(F.base)
      put(t, caso(t))
      // SELECT DISTINCT / TOP n ficam na mesma linha
      while (toks[i + 1]?.t === 'w' && ['DISTINCT', 'ALL', 'TOP', 'RECURSIVE'].includes(toks[i + 1].U)) {
        i++
        put(toks[i], caso(toks[i]))
        if (toks[i].U === 'TOP' && toks[i + 1]) put(toks[++i], toks[i].v)
      }
      F.cl = V
      nl(F.base + 1)
      between = false
      continue
    }
    if (t.t === 'w' && LINHA.has(V) && !emFuncao()) {
      const F = f()
      nl(F.base)
      put(t, caso(t))
      F.cl = V
      continue
    }
    if (V === 'ON' && t.t === 'w' && !emFuncao() && /JOIN/.test(f().cl || '')) {
      nl(f().base + 1)
      put(t, caso(t))
      f().cl = 'ON'
      continue
    }
    if (V === 'BETWEEN') between = true
    if ((V === 'AND' || V === 'OR') && t.t === 'w' && !emFuncao()) {
      if (V === 'AND' && between) {
        between = false
        put(t, caso(t))
        continue
      }
      if (['WHERE', 'HAVING', 'ON'].includes(f().cl)) {
        nl(f().base + 1)
        put(t, caso(t))
        continue
      }
    }
    if (t.v === '(') {
      const prox = toks[i + 1]
      if (prox && prox.t === 'w' && (prox.U === 'SELECT' || prox.U === 'WITH')) {
        put(t, '(')
        frames.push({ base: ind + 1, cl: null })
        parens.push('s')
        continue
      }
      put(t, '(')
      parens.push('f')
      continue
    }
    if (t.v === ')') {
      const p = parens.pop()
      if (p === 's') {
        const fr = frames.pop()
        nl(fr.base - 1)
        put(t, ')')
        continue
      }
      put(t, ')')
      continue
    }
    if (t.v === ',') {
      put(t, ',')
      if (!emFuncao() && LISTA.has(f().cl)) nl(f().base + 1)
      continue
    }
    if (t.v === ';') {
      put(t, ';')
      nl(0)
      linhas.push('')
      frames.length = 1
      frames[0].cl = null
      parens.length = 0
      continue
    }
    put(t, caso(t))
  }
  nl(0)
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function minificar(sql) {
  const toks = significativos(tokenizar(sql)).filter((t) => t.t !== 'c')
  let out = ''
  let ant = null
  for (const t of toks) {
    const colado = !ant || ((ant.t === 'p' || t.t === 'p') && !(ant.v === ')' && t.t !== 'p'))
    out += (colado && !(ant?.t === 'p' && ['AND', 'OR'].includes(t.U)) ? '' : ' ') + t.v
    ant = t
  }
  return out.replace(/\s+/g, ' ').trim()
}

/* ------------------------------ explicar ------------------------------ */
const texto = (toks) => minificar(toks.filter((t) => t.v !== ';').map((t) => t.v).join(' '))

function segmentos(toks) {
  const segs = []
  let d = 0
  let atual = { kw: null, toks: [] }
  for (const t of toks) {
    if (t.v === '(') d++
    if (t.v === ')') d--
    if (d === 0 && t.t === 'w' && (BLOCO.has(t.U) || LINHA.has(t.U) || t.U === 'ON' || t.U === 'USING')) {
      if (atual.kw || atual.toks.length) segs.push(atual)
      atual = { kw: t.U, toks: [] }
      continue
    }
    atual.toks.push(t)
  }
  segs.push(atual)
  return segs
}

// divide por vírgulas no nível 0
function porVirgula(toks) {
  const partes = [[]]
  let d = 0
  for (const t of toks) {
    if (t.v === '(') d++
    if (t.v === ')') d--
    if (d === 0 && t.v === ',') partes.push([])
    else partes[partes.length - 1].push(t)
  }
  return partes.filter((p) => p.length).map(texto)
}
function porAndOr(toks) {
  const partes = [{ op: '', toks: [] }]
  let d = 0
  let between = false
  for (const t of toks) {
    if (t.v === '(') d++
    if (t.v === ')') d--
    if (t.U === 'BETWEEN') between = true
    if (d === 0 && (t.U === 'AND' || t.U === 'OR')) {
      if (t.U === 'AND' && between) {
        between = false
        partes[partes.length - 1].toks.push(t)
        continue
      }
      partes.push({ op: t.U, toks: [] })
    } else partes[partes.length - 1].toks.push(t)
  }
  return partes.map((p) => ({ op: p.op, txt: texto(p.toks) }))
}

const JUNCAO = {
  JOIN: 'só as linhas que têm par nas duas tabelas',
  'INNER JOIN': 'só as linhas que têm par nas duas tabelas',
  'LEFT JOIN': 'todas as linhas da esquerda, mesmo sem par (as colunas da direita vêm NULL)',
  'LEFT OUTER JOIN': 'todas as linhas da esquerda, mesmo sem par (as colunas da direita vêm NULL)',
  'RIGHT JOIN': 'todas as linhas da direita, mesmo sem par na esquerda',
  'RIGHT OUTER JOIN': 'todas as linhas da direita, mesmo sem par na esquerda',
  'FULL JOIN': 'as linhas das duas tabelas, com ou sem par',
  'FULL OUTER JOIN': 'as linhas das duas tabelas, com ou sem par',
  'CROSS JOIN': 'todas as combinações possíveis (produto cartesiano)',
  'NATURAL JOIN': 'juntando pelas colunas de mesmo nome',
}

export function explicarSql(sql) {
  const toks = significativos(tokenizar(sql)).filter((t) => t.t !== 'c')
  const passos = []
  const alertas = []
  if (!toks.length) return { passos, alertas, tipo: null }
  const U = toks.map((t) => t.U || t.v.toUpperCase())
  const tem = (x) => U.includes(x)
  const tipo = U[0] === 'WITH' ? 'SELECT' : U[0]
  const segs = segmentos(toks)
  const seg = (k) => segs.filter((s) => s.kw === k)
  const sub = toks.filter((t, i) => t.v === '(' && toks[i + 1]?.U === 'SELECT').length

  if (U[0] === 'WITH') passos.push({ t: 'Prepara consultas temporárias (CTE)', d: porVirgula(seg('WITH')[0]?.toks || []).map((x) => x.split(/\s+AS\s*\(/i)[0]).join(', ') })

  if (tipo === 'SELECT') {
    for (const s of seg('SELECT')) {
      let cols = s.toks
      let distinct = false
      if (cols[0]?.U === 'DISTINCT') {
        distinct = true
        cols = cols.slice(1)
      }
      if (cols[0]?.U === 'TOP') cols = cols.slice(2)
      const lista = porVirgula(cols)
      const agreg = lista.filter((c) => /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(c))
      passos.push({
        t: lista.length === 1 && lista[0] === '*' ? 'Busca todas as colunas' : `Busca ${lista.length} coluna(s)${distinct ? ' sem repetir linhas (DISTINCT)' : ''}`,
        d: lista.join(' · '),
      })
      if (agreg.length) passos.push({ t: 'Calcula agregações', d: agreg.join(' · ') })
      if (lista.some((c) => c === '*' || /\.\*$/.test(c))) alertas.push({ n: 'aviso', t: 'SELECT * traz todas as colunas: mais dados na rede e quebra se a tabela mudar. Liste só as que precisa.' })
    }
    const from = seg('FROM')[0]
    if (from) {
      const tabs = porVirgula(from.toks)
      passos.push({ t: `Da${tabs.length > 1 ? 's tabelas' : ' tabela'}`, d: tabs.join(' · ') })
      if (tabs.length > 1 && !tem('WHERE')) alertas.push({ n: 'perigo', t: 'Várias tabelas no FROM sem WHERE nem JOIN: vira produto cartesiano (todas as combinações).' })
      else if (tabs.length > 1) alertas.push({ n: 'info', t: 'Junção implícita (FROM a, b). Prefira JOIN … ON para deixar a condição clara.' })
    }
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      if (s.kw && /JOIN/.test(s.kw)) {
        const on = segs[i + 1]?.kw === 'ON' || segs[i + 1]?.kw === 'USING' ? texto(segs[i + 1].toks) : ''
        passos.push({ t: `Junta com ${texto(s.toks)} (${s.kw})`, d: `${JUNCAO[s.kw] || ''}${on ? ` · quando ${on}` : ''}` })
        if (s.kw !== 'CROSS JOIN' && s.kw !== 'NATURAL JOIN' && !on) alertas.push({ n: 'perigo', t: `${s.kw} sem ON: pode virar produto cartesiano.` })
      }
    }
  }
  if (tipo === 'INSERT') {
    const s = seg('INSERT INTO')[0]
    passos.push({ t: 'Insere linhas', d: `na tabela ${texto((s?.toks || []).filter((t, i, a) => i < a.findIndex((x) => x.v === '(') || a.findIndex((x) => x.v === '(') < 0))}` })
    const v = seg('VALUES')[0]
    if (v) passos.push({ t: `${porVirgula(v.toks).length} linha(s) de valores`, d: '' })
    if (tem('SELECT')) passos.push({ t: 'Os valores vêm de uma consulta (INSERT … SELECT)', d: '' })
    if (tem('ON CONFLICT') || tem('DUPLICATE')) passos.push({ t: 'Se a linha já existir, trata o conflito (upsert)', d: '' })
  }
  if (tipo === 'UPDATE') {
    passos.push({ t: 'Atualiza a tabela', d: texto(seg('UPDATE')[0]?.toks || []) })
    const s = seg('SET')[0]
    if (s) passos.push({ t: 'Mudando', d: porVirgula(s.toks).join(' · ') })
    if (!tem('WHERE')) alertas.push({ n: 'perigo', t: 'UPDATE sem WHERE altera TODAS as linhas da tabela.' })
  }
  if (tipo === 'DELETE' || U[0] === 'DELETE FROM') {
    passos.push({ t: 'Apaga linhas da tabela', d: texto(seg('DELETE FROM')[0]?.toks || []) })
    if (!tem('WHERE')) alertas.push({ n: 'perigo', t: 'DELETE sem WHERE apaga TODAS as linhas da tabela.' })
  }
  if (tipo === 'TRUNCATE') alertas.push({ n: 'perigo', t: 'TRUNCATE apaga todas as linhas e normalmente não dá para desfazer.' })
  if (tipo === 'DROP' || U[0] === 'DROP TABLE') alertas.push({ n: 'perigo', t: 'DROP apaga a estrutura e os dados.' })
  if (U[0] === 'CREATE TABLE') {
    const corpo = toks.slice(toks.findIndex((t) => t.v === '(') + 1, toks.length - (toks[toks.length - 1].v === ';' ? 2 : 1))
    const cols = porVirgula(corpo)
    passos.push({ t: `Cria a tabela ${toks[1]?.v || ''} com ${cols.length} definição(ões)`, d: cols.join(' · ') })
    if (!/PRIMARY KEY/i.test(sql)) alertas.push({ n: 'aviso', t: 'A tabela não tem PRIMARY KEY.' })
  }

  const where = seg('WHERE')[0]
  if (where) {
    const conds = porAndOr(where.toks)
    passos.push({ t: 'Filtra as linhas onde', d: conds.map((c) => `${c.op ? `${c.op} ` : ''}${c.txt}`).join('\n') })
    for (const c of conds) {
      if (/LIKE\s+N?'%/i.test(c.txt)) alertas.push({ n: 'aviso', t: `“${c.txt}”: LIKE começando com % não usa índice (varre a tabela toda).` })
      if (/\b(LOWER|UPPER|YEAR|MONTH|DATE|TRIM|SUBSTRING|CAST|CONVERT|DATE_FORMAT|TO_CHAR)\s*\(\s*[\w."`[\]]+\s*\)?\s*(=|<|>|LIKE|IN|BETWEEN)/i.test(c.txt))
        alertas.push({ n: 'aviso', t: `“${c.txt}”: função aplicada na coluna impede o uso de índice. Compare a coluna pura (ex.: col >= '2026-01-01').` })
      if (/(=|<>|!=)\s*NULL\b/i.test(c.txt)) alertas.push({ n: 'perigo', t: `“${c.txt}”: comparar com = NULL nunca é verdadeiro. Use IS NULL / IS NOT NULL.` })
      if (/NOT IN\s*\(\s*SELECT/i.test(c.txt)) alertas.push({ n: 'aviso', t: 'NOT IN (SELECT …) retorna vazio se a subconsulta tiver algum NULL. Prefira NOT EXISTS.' })
      if (/\$\{|'\s*\+\s*\w|"\s*\+\s*\w/.test(c.txt)) alertas.push({ n: 'perigo', t: 'Parece concatenação de valores na query: risco de SQL injection. Use parâmetros (?, $1, :nome).' })
    }
    if (conds.some((c) => c.op === 'OR') && conds.some((c) => c.op === 'AND')) alertas.push({ n: 'info', t: 'AND tem prioridade sobre OR. Use parênteses para deixar a intenção clara.' })
  }
  const gb = seg('GROUP BY')[0]
  if (gb) passos.push({ t: 'Agrupa por', d: porVirgula(gb.toks).join(' · ') })
  const hv = seg('HAVING')[0]
  if (hv) passos.push({ t: 'Mantém só os grupos onde', d: texto(hv.toks) })
  const ob = seg('ORDER BY')[0]
  if (ob) {
    const itens = porVirgula(ob.toks).map((x) => (/\sDESC$/i.test(x) ? `${x.replace(/\s+DESC$/i, '')} (maior → menor)` : `${x.replace(/\s+ASC$/i, '')} (menor → maior)`))
    passos.push({ t: 'Ordena por', d: itens.join(' · ') })
    if (/RAND\(\)|RANDOM\(\)|NEWID\(\)/i.test(texto(ob.toks))) alertas.push({ n: 'aviso', t: 'Ordenar por aleatório lê e ordena a tabela inteira; fica lento em tabelas grandes.' })
  }
  const lim = seg('LIMIT')[0]
  const top = toks.findIndex((t) => t.U === 'TOP')
  const fetch = seg('FETCH')[0]
  const off = seg('OFFSET')[0]
  if (lim || top >= 0 || fetch) passos.push({ t: 'Limita o resultado', d: lim ? `${texto(lim.toks)} linha(s)` : top >= 0 ? `${toks[top + 1]?.v} linha(s) (TOP)` : texto(fetch.toks) })
  if (off) {
    passos.push({ t: 'Pula as primeiras', d: `${texto(off.toks)}` })
    if (Number(off.toks[0]?.v) > 10000) alertas.push({ n: 'aviso', t: 'OFFSET grande fica lento (o banco lê e descarta as linhas). Considere paginação por chave (WHERE id > último).' })
  }
  if ((lim || top >= 0 || fetch) && !ob && tipo === 'SELECT') alertas.push({ n: 'aviso', t: 'LIMIT/TOP sem ORDER BY: quais linhas voltam não é garantido.' })
  for (const k of ['UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT']) if (seg(k).length) passos.push({ t: k === 'UNION' ? 'Junta com outra consulta, tirando repetidos (UNION)' : k === 'UNION ALL' ? 'Junta com outra consulta, mantendo repetidos (UNION ALL)' : `Combina com outra consulta (${k})`, d: '' })
  if (seg('UNION').length) alertas.push({ n: 'info', t: 'UNION remove duplicados (custa uma ordenação). Se não precisa, UNION ALL é mais rápido.' })
  if (sub) passos.push({ t: `Usa ${sub} subconsulta(s)`, d: '' })
  if (tem('DISTINCT') && toks.some((t) => /JOIN/.test(t.U || ''))) alertas.push({ n: 'info', t: 'DISTINCT junto com JOIN às vezes esconde um JOIN que está duplicando linhas.' })
  return { passos, alertas, tipo }
}

/* ------------------------------ converter dialeto ------------------------------ */
export const DIALETOS = [
  ['mysql', 'MySQL / MariaDB'],
  ['postgres', 'PostgreSQL'],
  ['sqlserver', 'SQL Server'],
  ['sqlite', 'SQLite'],
]
const aspas = { mysql: ['`', '`'], postgres: ['"', '"'], sqlite: ['"', '"'], sqlserver: ['[', ']'] }
export const citar = (nome, d) => `${aspas[d][0]}${nome}${aspas[d][1]}`

export function converter(sql, destino) {
  let toks = tokenizar(sql)
  const notas = new Set()
  // identificadores entre aspas
  toks = toks.map((t) => (t.t === 'id' ? { ...t, v: citar(t.v.slice(1, -1), destino) } : t))
  const W = (i) => (toks[i]?.t === 'w' ? toks[i].v.toUpperCase() : null)
  const prox = (i) => {
    let j = i + 1
    while (toks[j]?.t === 'ws') j++
    return j
  }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.t !== 'w' && t.t !== 'p') continue
    const U = t.v.toUpperCase()
    // funções de data
    if (['NOW', 'GETDATE', 'SYSDATE'].includes(U) && toks[prox(i)]?.v === '(') {
      const fecha = prox(prox(i))
      if (toks[fecha]?.v === ')') {
        const novo = { mysql: 'NOW()', postgres: 'NOW()', sqlserver: 'GETDATE()', sqlite: "datetime('now')" }[destino]
        toks.splice(i, fecha - i + 1, { t: 'w', v: novo })
        continue
      }
    }
    if (['IFNULL', 'ISNULL', 'NVL'].includes(U) && toks[prox(i)]?.v === '(') t.v = destino === 'sqlserver' && U === 'ISNULL' ? 'ISNULL' : 'COALESCE'
    if (U === 'LEN' && destino !== 'sqlserver') t.v = 'LENGTH'
    if (U === 'LENGTH' && destino === 'sqlserver') t.v = 'LEN'
    if (U === 'ILIKE' && destino !== 'postgres') {
      t.v = 'LIKE'
      notas.add('ILIKE virou LIKE: no MySQL/SQL Server a comparação costuma ignorar maiúsculas pela collation; no SQLite use LOWER().')
    }
    if ((U === 'TRUE' || U === 'FALSE') && destino === 'sqlserver') t.v = U === 'TRUE' ? '1' : '0'
    if (U === '||' && destino === 'sqlserver') t.v = '+'
    if (U === '||' && destino === 'mysql') notas.add('No MySQL, || é OU lógico (a não ser no modo PIPES_AS_CONCAT). Troque a || b por CONCAT(a, b).')
    if (U === '::') notas.add('Cast com :: é do PostgreSQL; nos outros use CAST(x AS tipo).')
    // auto incremento
    if (U === 'AUTO_INCREMENT' || U === 'AUTOINCREMENT' || U === 'SERIAL' || U === 'IDENTITY') {
      if (destino === 'mysql') t.v = U === 'SERIAL' ? 'INT AUTO_INCREMENT' : 'AUTO_INCREMENT'
      if (destino === 'postgres') t.v = U === 'SERIAL' ? 'SERIAL' : 'GENERATED ALWAYS AS IDENTITY'
      if (destino === 'sqlserver') t.v = U === 'SERIAL' ? 'INT IDENTITY(1,1)' : U === 'IDENTITY' ? 'IDENTITY' : 'IDENTITY(1,1)'
      if (destino === 'sqlite') {
        t.v = U === 'SERIAL' ? 'INTEGER' : 'AUTOINCREMENT'
        notas.add('No SQLite o auto incremento é: id INTEGER PRIMARY KEY AUTOINCREMENT (nessa ordem).')
      }
      if (U === 'IDENTITY' && toks[prox(i)]?.v === '(') {
        // remove (1,1)
        let j = prox(i)
        const ini = j
        while (j < toks.length && toks[j].v !== ')') j++
        if (destino !== 'sqlserver') toks.splice(ini, j - ini + 1)
      }
    }
    if (U === 'TOP' && destino !== 'sqlserver') {
      const n = prox(i)
      const qtd = toks[n]?.v
      toks.splice(i, n - i + 1)
      // põe LIMIT antes do ; final (ou no fim)
      let fim = toks.length
      for (let j = i; j < toks.length; j++)
        if (toks[j].v === ';') {
          fim = j
          break
        }
      toks.splice(fim, 0, { t: 'ws', v: ' ' }, { t: 'w', v: `LIMIT ${qtd}` })
      continue
    }
    if (U === 'LIMIT' && destino === 'sqlserver') {
      const n = prox(i)
      const qtd = toks[n]?.v
      let tem = false
      // OFFSET m depois?
      let k = prox(n)
      let off = null
      if (W(k) === 'OFFSET') {
        off = toks[prox(k)]?.v
        toks.splice(i, prox(k) - i + 1, { t: 'w', v: `OFFSET ${off} ROWS FETCH NEXT ${qtd} ROWS ONLY` })
        tem = true
        notas.add('No SQL Server, OFFSET/FETCH exige ORDER BY.')
      }
      if (!tem) {
        toks.splice(i, n - i + 1)
        while (toks[i]?.t === 'ws') toks.splice(i, 1)
        // SELECT → SELECT TOP n (o SELECT mais próximo antes)
        for (let j = i - 1; j >= 0; j--)
          if (W(j) === 'SELECT') {
            let k2 = prox(j)
            if (W(k2) === 'DISTINCT') {
              toks.splice(k2 + 1, 0, { t: 'ws', v: ' ' }, { t: 'w', v: `TOP ${qtd}` })
            } else toks.splice(j + 1, 0, { t: 'ws', v: ' ' }, { t: 'w', v: `TOP ${qtd}` })
            break
          }
      }
      continue
    }
    if (U === 'FETCH' && destino !== 'sqlserver') {
      // OFFSET m ROWS FETCH NEXT n ROWS ONLY → LIMIT n OFFSET m
      const linha = toks.slice(i).map((x) => x.v).join('')
      const m = /^FETCH\s+(NEXT|FIRST)\s+(\d+)\s+ROWS?\s+ONLY/i.exec(linha)
      if (m) {
        let j = i
        let lido = ''
        while (lido.length < m[0].length) lido += toks[j++].v
        toks.splice(i, j - i, { t: 'w', v: `LIMIT ${m[2]}` })
        // procura OFFSET m ROWS antes
        for (let k = i - 1; k >= 0; k--)
          if (W(k) === 'OFFSET') {
            const num = toks[prox(k)]?.v
            const rows = prox(prox(k))
            if (/^ROWS?$/i.test(toks[rows]?.v)) toks.splice(k, rows - k + 1, { t: 'w', v: '' })
            toks.splice(i, 1, { t: 'w', v: `LIMIT ${m[2]} OFFSET ${num}` })
            break
          }
      }
    }
  }
  if (destino === 'mysql' && /\bRETURNING\b/i.test(sql)) notas.add('MySQL não tem RETURNING (MariaDB 10.5+ tem).')
  if (destino !== 'postgres' && /ON\s+CONFLICT/i.test(sql)) notas.add(destino === 'mysql' ? 'ON CONFLICT do Postgres vira ON DUPLICATE KEY UPDATE no MySQL.' : destino === 'sqlserver' ? 'No SQL Server use MERGE no lugar de ON CONFLICT.' : '')
  return { sql: toks.map((t) => t.v).join('').replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' '), notas: [...notas].filter(Boolean) }
}

/* ------------------------------ gerar INSERT ------------------------------ */
const literal = (v, d) => {
  if (v === null || v === undefined || v === '') return 'NULL'
  if (typeof v === 'boolean') return d === 'sqlserver' || d === 'sqlite' || d === 'mysql' ? (v ? '1' : '0') : v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
  return `'${String(v).replace(/'/g, "''")}'`
}
function tipoColuna(vals, d) {
  const vs = vals.filter((v) => v !== null && v !== undefined && v !== '')
  if (!vs.length) return d === 'sqlserver' ? 'NVARCHAR(255)' : 'TEXT'
  if (vs.every((v) => typeof v === 'boolean')) return d === 'sqlserver' ? 'BIT' : d === 'sqlite' ? 'INTEGER' : 'BOOLEAN'
  if (vs.every((v) => typeof v === 'number' && Number.isInteger(v))) return vs.some((v) => Math.abs(v) > 2147483647) ? 'BIGINT' : 'INTEGER'
  if (vs.every((v) => typeof v === 'number')) return d === 'sqlite' ? 'REAL' : 'DECIMAL(12,2)'
  if (vs.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'DATE'
  if (vs.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v))) return d === 'sqlserver' ? 'DATETIME2' : 'TIMESTAMP'
  const max = Math.max(...vs.map((v) => String(typeof v === 'object' ? JSON.stringify(v) : v).length))
  if (d === 'sqlite') return 'TEXT'
  return max > 255 ? (d === 'sqlserver' ? 'NVARCHAR(MAX)' : 'TEXT') : `${d === 'sqlserver' ? 'NVARCHAR' : 'VARCHAR'}(${Math.max(50, Math.ceil(max / 50) * 50)})`
}
export function gerarInsert(linhas, { tabela = 'tabela', dialeto = 'postgres', criar = true, porInsert = 100 } = {}) {
  if (!linhas.length) return ''
  const cols = [...new Set(linhas.flatMap((l) => Object.keys(l)))]
  const nomeT = citar(tabela, dialeto)
  const out = []
  if (criar) out.push(`CREATE TABLE ${nomeT} (\n${cols.map((c) => `  ${citar(c, dialeto)} ${tipoColuna(linhas.map((l) => l[c]), dialeto)}`).join(',\n')}\n);`)
  for (let i = 0; i < linhas.length; i += porInsert) {
    const bloco = linhas.slice(i, i + porInsert)
    out.push(`INSERT INTO ${nomeT} (${cols.map((c) => citar(c, dialeto)).join(', ')}) VALUES\n${bloco.map((l) => `  (${cols.map((c) => literal(l[c], dialeto)).join(', ')})`).join(',\n')};`)
  }
  return out.join('\n\n')
}
