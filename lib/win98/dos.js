// Prompt do MS-DOS: interpreta os comandos mais usados sobre o disco virtual, com as mensagens do DOS em português.

import { achar, caminhoReal, criarPasta, excluir, juntar, listar, partes, tamanhoBytes } from './arquivos'

export const VERSAO = 'Windows 98 [Versão 4.10.1998]'
export const INVALIDO = 'Comando ou nome de arquivo inválido'

const PROGRAMAS = { notepad: 'bloco', edit: 'bloco', calc: 'calculadora', winmine: 'minado', mspaint: 'paint', pbrush: 'paint', explorer: 'explorer', iexplore: 'ie', winver: 'sobre', control: 'video' }

export const AJUDA = [
  'Comandos disponíveis:',
  '  CD       Mostra ou muda a pasta atual.',
  '  CLS      Limpa a tela.',
  '  DATE     Mostra a data.',
  '  DEL      Exclui um arquivo (vai para a Lixeira).',
  '  DIR      Lista os arquivos e as pastas.',
  '  ECHO     Mostra uma mensagem.',
  '  EXIT     Fecha o Prompt do MS-DOS.',
  '  MD       Cria uma pasta.',
  '  TIME     Mostra a hora.',
  '  TYPE     Mostra o conteúdo de um arquivo de texto.',
  '  VER      Mostra a versão do Windows.',
  'Programas: NOTEPAD, CALC, WINMINE, MSPAINT, EXPLORER, IEXPLORE.',
]

const milhar = (n) => n.toLocaleString('pt-BR')
const data2 = (t) => {
  const d = new Date(t)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}
const hora = (t) => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Nome curto 8.3 do DOS: "Meus documentos" → "MEUSDO~1". */
export function nomeCurto(nome, tipo) {
  const [base, ext = ''] = tipo === 'arquivo' && nome.includes('.') ? [nome.slice(0, nome.lastIndexOf('.')), nome.split('.').pop()] : [nome, '']
  const b = base.normalize('NFD').replace(/[^\w]/g, '').toUpperCase()
  const e = ext.normalize('NFD').replace(/[^\w]/g, '').toUpperCase().slice(0, 3)
  const curto = b.length > 8 || b.length !== base.length ? b.slice(0, 6) + '~1' : b
  return { base: curto, ext: e }
}

/** Resolve um argumento relativo à pasta atual (aceita "..", "\\", "C:\\..."). */
export function resolver(cwd, arg) {
  if (!arg) return cwd
  const absoluto = /^[a-z]:/i.test(arg) || arg.startsWith('\\')
  const pilha = absoluto ? [] : partes(cwd)
  for (const p of partes(arg)) {
    if (p === '.') continue
    if (p === '..') pilha.pop()
    else pilha.push(p)
  }
  return juntar(...pilha)
}

/** Executa uma linha. Devolve { saida: string[], cwd, disco?, limpar?, sair?, abrir? }. */
export function executar(disco, cwd, linha, agora = Date.now()) {
  const texto = linha.trim()
  if (!texto) return { saida: [], cwd }
  const [cmdBruto, ...resto] = texto.split(/\s+/)
  // "CD.." e "CD\\" sem espaço também valem, como no DOS.
  const colado = /^(cd|chdir)(\.\.|\\)/i.exec(cmdBruto)
  const cmd = (colado ? colado[1] : cmdBruto).toLowerCase()
  const arg = colado ? cmdBruto.slice(colado[1].length) : resto.join(' ').replace(/^"|"$/g, '')

  if (/^[a-z]:$/i.test(cmd)) return cmd === 'c:' ? { saida: [], cwd } : { saida: ['Especificação de unidade inválida'], cwd }

  switch (cmd) {
    case 'help':
    case 'ajuda':
      return { saida: AJUDA, cwd }
    case 'cls':
      return { saida: [], cwd, limpar: true }
    case 'ver':
      return { saida: ['', VERSAO, ''], cwd }
    case 'echo':
      return { saida: [arg || 'ECHO está ativado'], cwd }
    case 'exit':
      return { saida: [], cwd, sair: true }
    case 'date':
      return { saida: [`Data atual: ${new Date(agora).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}`], cwd }
    case 'time':
      return { saida: [`Hora atual: ${new Date(agora).toLocaleTimeString('pt-BR')}`], cwd }
    case 'cd':
    case 'chdir': {
      if (!arg) return { saida: [cwd], cwd }
      const alvo = resolver(cwd, arg)
      const no = achar(disco, alvo)
      if (!no || no.tipo !== 'pasta') return { saida: ['Pasta inválida'], cwd }
      return { saida: [], cwd: caminhoReal(disco, alvo) }
    }
    case 'md':
    case 'mkdir': {
      if (!arg) return { saida: ['Número de parâmetros incorreto'], cwd }
      const alvo = resolver(cwd, arg)
      try {
        const nome = partes(alvo).at(-1)
        return { saida: [], cwd, disco: criarPasta(disco, juntar(...partes(alvo).slice(0, -1)), nome) }
      } catch {
        return { saida: ['Não foi possível criar a pasta'], cwd }
      }
    }
    case 'del':
    case 'erase': {
      if (!arg) return { saida: ['Número de parâmetros incorreto'], cwd }
      const alvo = resolver(cwd, arg)
      const no = achar(disco, alvo)
      if (!no || no.tipo !== 'arquivo') return { saida: ['Arquivo não encontrado'], cwd }
      try {
        return { saida: [], cwd, disco: excluir(disco, caminhoReal(disco, alvo), agora) }
      } catch {
        return { saida: ['Acesso negado'], cwd }
      }
    }
    case 'type': {
      if (!arg) return { saida: ['Sintaxe do comando incorreta'], cwd }
      const no = achar(disco, resolver(cwd, arg))
      if (!no || no.tipo !== 'arquivo') return { saida: ['Arquivo não encontrado - ' + arg.toUpperCase()], cwd }
      if (String(no.conteudo).startsWith('data:')) return { saida: ['(arquivo binário)'], cwd }
      return { saida: String(no.conteudo).split(/\r?\n/), cwd }
    }
    case 'dir': {
      const alvo = resolver(cwd, arg)
      const itens = listar(disco, alvo)
      if (!itens) return { saida: ['Arquivo não encontrado'], cwd }
      const raiz = partes(alvo).length === 0
      const linhas = [' O volume na unidade C é SOUDEV98', ' O número de série do volume é 1998-0625', ` Pasta de ${caminhoReal(disco, alvo)}`, '']
      if (!raiz) {
        const t98 = new Date(1998, 5, 25, 12).getTime()
        for (const n of ['.', '..']) linhas.push(`${n.padEnd(8)}      ${'<DIR>'.padEnd(12)} ${data2(t98)}  ${hora(t98)} ${n}`)
      }
      let bytes = 0
      for (const it of itens) {
        const c = nomeCurto(it.nome, it.tipo)
        const no = achar(disco, juntar(alvo, it.nome))
        const quando = no.modificado ?? new Date(1998, 5, 25, 12).getTime()
        const coluna = it.tipo === 'pasta' ? '<DIR>'.padEnd(12) : milhar(tamanhoBytes(no)).padStart(12)
        bytes += it.tipo === 'arquivo' ? tamanhoBytes(no) : 0
        linhas.push(`${c.base.padEnd(8)} ${c.ext.padEnd(3)}  ${coluna} ${data2(quando)}  ${hora(quando)} ${it.nome}`)
      }
      const arqs = itens.filter((i) => i.tipo === 'arquivo').length
      const pastas = itens.length - arqs + (raiz ? 0 : 2)
      linhas.push(`${String(arqs).padStart(9)} arquivo(s)${milhar(bytes).padStart(15)} bytes`)
      linhas.push(`${String(pastas).padStart(9)} pasta(s)  ${milhar(2147155968).padStart(15)} bytes disponíveis`)
      return { saida: linhas, cwd }
    }
    default: {
      const base = cmd.replace(/\.(exe|com)$/, '')
      if (PROGRAMAS[base]) return { saida: [], cwd, abrir: PROGRAMAS[base] }
      return { saida: [INVALIDO], cwd }
    }
  }
}
