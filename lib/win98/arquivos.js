// Disco C: de mentira, guardado no navegador. Pastas e arquivos como no Windows 98: nomes sem diferenciar
// maiúsculas, caracteres proibidos, "Nova pasta (2)" quando o nome já existe e Lixeira com restaurar.

export const CHAVE = 'win98.disco.v1'
export const MESA = 'C:\\Windows\\Desktop'
export const PROIBIDOS = /[\\/:*?"<>|]/
export const ERRO_NOME = 'O nome de arquivo não pode conter nenhum dos seguintes caracteres:\n\\ / : * ? " < > |'

const pasta = (filhos = {}) => ({ tipo: 'pasta', filhos })
const arquivo = (conteudo, extra = {}) => ({ tipo: 'arquivo', conteudo, modificado: new Date(1998, 5, 25, 12).getTime(), ...extra })

export function discoInicial() {
  return {
    raiz: pasta({
      'Meus documentos': pasta({
        'Leia-me.txt': arquivo(
          'Bem-vindo ao Windows 98 do soudev!\r\n\r\nEsta é uma recriação feita do zero para o navegador: nada aqui é o sistema da Microsoft.\r\n\r\nExperimente:\r\n- Campo Minado em Iniciar > Programas > Acessórios > Jogos\r\n- O Paint e o Bloco de notas (o que você salvar fica neste computador)\r\n- O Prompt do MS-DOS (digite AJUDA)\r\n- Botão direito na área de trabalho\r\n',
        ),
        'Minhas imagens': pasta({}),
      }),
      'Arquivos de programas': pasta({
        Acessórios: pasta({ 'WORDPAD.EXE': arquivo('', { sistema: true }) }),
        'Internet Explorer': pasta({ 'IEXPLORE.EXE': arquivo('', { sistema: true }) }),
      }),
      Windows: pasta({
        'NOTEPAD.EXE': arquivo('', { sistema: true }),
        'CALC.EXE': arquivo('', { sistema: true }),
        'WINMINE.EXE': arquivo('', { sistema: true }),
        'MSPAINT.EXE': arquivo('', { sistema: true }),
        'COMMAND.COM': arquivo('', { sistema: true }),
        'WIN.INI': arquivo('[windows]\r\nload=\r\nrun=\r\n\r\n[Desktop]\r\nWallpaper=(nenhum)\r\nTileWallpaper=0\r\n', { sistema: true }),
        Temp: pasta({}),
        Desktop: pasta({}),
      }),
      'AUTOEXEC.BAT': arquivo('@ECHO OFF\r\nPROMPT $p$g\r\nPATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND\r\n', { sistema: true }),
      'CONFIG.SYS': arquivo('DEVICE=C:\\WINDOWS\\HIMEM.SYS\r\nFILES=40\r\n', { sistema: true }),
    }),
    lixeira: [],
  }
}

export function carregarDisco() {
  try {
    const d = JSON.parse(localStorage.getItem(CHAVE) || 'null')
    if (d?.raiz?.tipo === 'pasta' && Array.isArray(d.lixeira)) {
      // A pasta da área de trabalho sempre existe, mesmo num disco salvo antes dela.
      const win = d.raiz.filhos[chaveDe(d.raiz, 'Windows')]
      if (win && chaveDe(win, 'Desktop') === undefined) win.filhos.Desktop = pasta({})
      return d
    }
  } catch {
    /* sem armazenamento ou dado corrompido */
  }
  return discoInicial()
}

export function salvarDisco(disco) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(disco))
  } catch {
    /* sem armazenamento (janela anônima) */
  }
}

/** 'C:\\Meus documentos\\a.txt' → ['Meus documentos', 'a.txt'] */
export function partes(caminho) {
  return String(caminho)
    .replace(/^[cC]:/, '')
    .split(/[\\/]+/)
    .filter(Boolean)
}

export const juntar = (...ps) => 'C:\\' + ps.flatMap((p) => partes(p)).join('\\')
export const pai = (caminho) => juntar(...partes(caminho).slice(0, -1))
export const nomeDe = (caminho) => partes(caminho).at(-1) || 'C:'

/** Chave real do filho, sem diferenciar maiúsculas (o Windows não diferencia). */
export function chaveDe(no, nome) {
  if (!no || no.tipo !== 'pasta') return undefined
  const alvo = nome.toLowerCase()
  return Object.keys(no.filhos).find((k) => k.toLowerCase() === alvo)
}

export function achar(disco, caminho) {
  let no = disco.raiz
  for (const p of partes(caminho)) {
    const k = chaveDe(no, p)
    if (k === undefined) return null
    no = no.filhos[k]
  }
  return no
}

/** Caminho com as maiúsculas/minúsculas como estão gravadas. */
export function caminhoReal(disco, caminho) {
  let no = disco.raiz
  const r = []
  for (const p of partes(caminho)) {
    const k = chaveDe(no, p)
    if (k === undefined) return null
    r.push(k)
    no = no.filhos[k]
  }
  return juntar(...r)
}

const ordenar = (a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) : a.tipo === 'pasta' ? -1 : 1)

/** Lista uma pasta: pastas primeiro, depois arquivos, em ordem alfabética. */
export function listar(disco, caminho) {
  const no = achar(disco, caminho)
  if (!no || no.tipo !== 'pasta') return null
  return Object.entries(no.filhos)
    .map(([nome, n]) => ({ nome, tipo: n.tipo, tamanho: n.tipo === 'arquivo' ? tamanhoBytes(n) : 0, modificado: n.modificado, sistema: !!n.sistema }))
    .sort(ordenar)
}

export const tamanhoBytes = (n) => (n.tipo === 'arquivo' ? (n.tamanho ?? new Blob([n.conteudo || '']).size) : 0)

/** "1 KB" como no Windows Explorer (arredonda para cima; arquivo vazio = 0 KB). */
export const tamanhoKB = (bytes) => `${Math.ceil(bytes / 1024).toLocaleString('pt-BR')} KB`

export const extensao = (nome) => (nome.includes('.') ? nome.split('.').pop().toLowerCase() : '')

/** Tipo de arquivo exibido no Explorer. */
export function tipoDeArquivo(nome, tipo) {
  if (tipo === 'pasta') return 'Pasta de arquivos'
  const e = extensao(nome)
  return { txt: 'Documento de texto', bmp: 'Imagem de bitmap', png: 'Imagem de bitmap', exe: 'Aplicativo', com: 'Aplicativo MS-DOS', bat: 'Arquivo em lotes do MS-DOS', ini: 'Configurações', sys: 'Arquivo de sistema' }[e] || `Arquivo ${e.toUpperCase()}`
}

export function validarNome(nome) {
  const n = String(nome).trim()
  if (!n) return 'Você precisa digitar um nome de arquivo.'
  if (PROIBIDOS.test(n)) return ERRO_NOME
  return null
}

/** Nome livre na pasta: "Nova pasta", "Nova pasta (2)", "Nova pasta (3)"… */
export function nomeLivre(disco, caminhoPasta, base, ext = '') {
  const no = achar(disco, caminhoPasta)
  const existe = (n) => chaveDe(no, n) !== undefined
  if (!existe(base + ext)) return base + ext
  for (let i = 2; ; i++) if (!existe(`${base} (${i})${ext}`)) return `${base} (${i})${ext}`
}

function erro(msg) {
  const e = new Error(msg)
  e.win98 = true
  throw e
}

/** Todas as operações devolvem um disco novo (não mexem no original). */
const copia = (disco) => structuredClone(disco)

export function criarPasta(disco, caminhoPasta, nome) {
  const msg = validarNome(nome)
  if (msg) erro(msg)
  const d = copia(disco)
  const destino = achar(d, caminhoPasta)
  if (!destino || destino.tipo !== 'pasta') erro(`Não é possível encontrar a pasta '${caminhoPasta}'.`)
  if (chaveDe(destino, nome) !== undefined) erro(`Não é possível criar a pasta '${nome}': já existe uma pasta ou arquivo com esse nome.`)
  destino.filhos[nome.trim()] = pasta({})
  return d
}

export function gravarArquivo(disco, caminho, conteudo, extra = {}) {
  const nome = nomeDe(caminho)
  const msg = validarNome(nome)
  if (msg) erro(msg)
  const d = copia(disco)
  const destino = achar(d, pai(caminho))
  if (!destino || destino.tipo !== 'pasta') erro(`O caminho '${pai(caminho)}' não existe.`)
  const k = chaveDe(destino, nome)
  if (k !== undefined && destino.filhos[k].tipo === 'pasta') erro(`'${nome}' é uma pasta.`)
  destino.filhos[k ?? nome] = { tipo: 'arquivo', conteudo, modificado: Date.now(), ...extra }
  return d
}

export function lerArquivo(disco, caminho) {
  const no = achar(disco, caminho)
  return no && no.tipo === 'arquivo' ? no.conteudo : null
}

export function renomear(disco, caminho, novoNome) {
  const msg = validarNome(novoNome)
  if (msg) erro(msg)
  const d = copia(disco)
  const dono = achar(d, pai(caminho))
  const k = chaveDe(dono, nomeDe(caminho))
  if (k === undefined) erro(`Não é possível encontrar '${nomeDe(caminho)}'.`)
  const novo = novoNome.trim()
  const outro = chaveDe(dono, novo)
  if (outro !== undefined && outro !== k) erro(`Não é possível renomear ${k}: já existe um arquivo com o nome que você especificou. Especifique um nome diferente.`)
  const no = dono.filhos[k]
  delete dono.filhos[k]
  dono.filhos[novo] = no
  return d
}

/** Excluir manda para a Lixeira (guardando de onde veio). Arquivos de sistema não podem ser excluídos. */
export function excluir(disco, caminho, agora = Date.now()) {
  const d = copia(disco)
  const dono = achar(d, pai(caminho))
  const k = chaveDe(dono, nomeDe(caminho))
  if (k === undefined) erro(`Não é possível encontrar '${nomeDe(caminho)}'.`)
  const no = dono.filhos[k]
  if (no.sistema || (partes(caminho).length === 1 && ['windows', 'arquivos de programas'].includes(k.toLowerCase())))
    erro(`Não é possível excluir ${k}: o arquivo é usado pelo Windows.`)
  delete dono.filhos[k]
  d.lixeira.push({ id: `${agora}-${Math.random().toString(36).slice(2, 7)}`, nome: k, origem: pai(caminho), excluido: agora, no })
  return d
}

/** Restaura um item da Lixeira para a pasta de origem (recria a pasta se ela sumiu; troca o nome se já existe). */
export function restaurar(disco, id) {
  const d = copia(disco)
  const i = d.lixeira.findIndex((x) => x.id === id)
  if (i < 0) return d
  const [item] = d.lixeira.splice(i, 1)
  let destino = d.raiz
  for (const p of partes(item.origem)) {
    let k = chaveDe(destino, p)
    if (k === undefined) {
      destino.filhos[p] = pasta({})
      k = p
    }
    destino = destino.filhos[k]
  }
  let nome = item.nome
  if (chaveDe(destino, nome) !== undefined) {
    const ext = item.no.tipo === 'arquivo' && nome.includes('.') ? '.' + nome.split('.').pop() : ''
    const base = ext ? nome.slice(0, -ext.length) : nome
    for (let n = 2; chaveDe(destino, nome) !== undefined; n++) nome = `${base} (${n})${ext}`
  }
  destino.filhos[nome] = item.no
  return d
}

export function esvaziarLixeira(disco) {
  return { ...copia(disco), lixeira: [] }
}

/** Itens da pasta (recursivo), para "Propriedades" de pasta. */
export function contarItens(no) {
  if (!no || no.tipo !== 'pasta') return { arquivos: 0, pastas: 0, bytes: 0 }
  return Object.values(no.filhos).reduce(
    (t, f) => {
      if (f.tipo === 'pasta') {
        const c = contarItens(f)
        return { arquivos: t.arquivos + c.arquivos, pastas: t.pastas + 1 + c.pastas, bytes: t.bytes + c.bytes }
      }
      return { ...t, arquivos: t.arquivos + 1, bytes: t.bytes + tamanhoBytes(f) }
    },
    { arquivos: 0, pastas: 0, bytes: 0 },
  )
}
