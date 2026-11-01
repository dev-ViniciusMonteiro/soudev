// Campo Minado com as regras do Windows 98: o primeiro clique nunca é mina (a mina muda de lugar),
// casa vazia abre as vizinhas em cascata, botão direito alterna bandeira → interrogação → nada,
// e o "acorde" (clique nos dois botões num número) abre as vizinhas quando as bandeiras batem.

export const NIVEIS = {
  iniciante: { nome: 'Iniciante', linhas: 9, colunas: 9, minas: 10 },
  intermediario: { nome: 'Intermediário', linhas: 16, colunas: 16, minas: 40 },
  avancado: { nome: 'Avançado', linhas: 16, colunas: 30, minas: 99 },
}

/** Gerador pseudoaleatório com semente (mulberry32), para os testes repetirem o mesmo tabuleiro. */
export function aleatorio(semente = Date.now()) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function novoJogo(nivel = 'iniciante', opcoes = {}) {
  const n = typeof nivel === 'string' ? NIVEIS[nivel] : nivel
  const { linhas, colunas, minas } = n
  const casas = Array.from({ length: linhas * colunas }, () => ({ mina: false, vizinhas: 0, aberta: false, marca: null }))
  const sorteio = opcoes.sorteio || aleatorio(opcoes.semente)
  const posicoes = opcoes.minas // posições fixas (índices), usadas nos testes
  if (posicoes) for (const i of posicoes) casas[i].mina = true
  else {
    let postas = 0
    while (postas < minas) {
      const i = Math.floor(sorteio() * casas.length)
      if (!casas[i].mina) {
        casas[i].mina = true
        postas++
      }
    }
  }
  const jogo = { linhas, colunas, minas: posicoes ? posicoes.length : minas, casas, estado: 'novo', explodiu: null, abertas: 0, inicio: null, fim: null }
  contar(jogo)
  return jogo
}

export function vizinhas(jogo, i) {
  const l = Math.floor(i / jogo.colunas)
  const c = i % jogo.colunas
  const r = []
  for (let dl = -1; dl <= 1; dl++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dl && !dc) continue
      const nl = l + dl
      const nc = c + dc
      if (nl >= 0 && nl < jogo.linhas && nc >= 0 && nc < jogo.colunas) r.push(nl * jogo.colunas + nc)
    }
  return r
}

function contar(jogo) {
  jogo.casas.forEach((casa, i) => {
    casa.vizinhas = vizinhas(jogo, i).filter((v) => jogo.casas[v].mina).length
  })
}

const clonar = (jogo) => ({ ...jogo, casas: jogo.casas.map((c) => ({ ...c })) })

/** Abre uma casa. No primeiro clique a mina (se houver) vai para o primeiro canto livre, como no original. */
export function revelar(jogoOriginal, i, agora = Date.now()) {
  const casa0 = jogoOriginal.casas[i]
  if (jogoOriginal.estado === 'ganhou' || jogoOriginal.estado === 'perdeu' || casa0.aberta || casa0.marca === 'bandeira') return jogoOriginal
  const jogo = clonar(jogoOriginal)
  if (jogo.estado === 'novo') {
    jogo.estado = 'jogando'
    jogo.inicio = agora
    if (jogo.casas[i].mina) {
      const livre = jogo.casas.findIndex((c, k) => !c.mina && k !== i)
      jogo.casas[i].mina = false
      jogo.casas[livre].mina = true
      contar(jogo)
    }
  }
  const casa = jogo.casas[i]
  if (casa.mina) return explodir(jogo, i, agora)
  abrirCascata(jogo, i)
  return conferirVitoria(jogo, agora)
}

function abrirCascata(jogo, inicio) {
  const fila = [inicio]
  while (fila.length) {
    const k = fila.pop()
    const c = jogo.casas[k]
    if (c.aberta || c.marca === 'bandeira' || c.mina) continue
    c.aberta = true
    c.marca = null
    jogo.abertas++
    if (c.vizinhas === 0) fila.push(...vizinhas(jogo, k))
  }
}

function explodir(jogo, i, agora) {
  jogo.estado = 'perdeu'
  jogo.explodiu = i
  jogo.fim = agora
  jogo.casas.forEach((c) => {
    if (c.mina && c.marca !== 'bandeira') c.aberta = true
  })
  return jogo
}

function conferirVitoria(jogo, agora) {
  if (jogo.abertas === jogo.casas.length - jogo.minas) {
    jogo.estado = 'ganhou'
    jogo.fim = agora
    // Ao ganhar, o Windows põe bandeira em todas as minas.
    jogo.casas.forEach((c) => {
      if (c.mina) c.marca = 'bandeira'
    })
  }
  return jogo
}

/** Botão direito: nada → bandeira → interrogação (se ativada) → nada. */
export function marcar(jogoOriginal, i, interrogacao = true) {
  const c0 = jogoOriginal.casas[i]
  if (jogoOriginal.estado === 'ganhou' || jogoOriginal.estado === 'perdeu' || c0.aberta) return jogoOriginal
  const jogo = clonar(jogoOriginal)
  const c = jogo.casas[i]
  c.marca = c.marca === null ? 'bandeira' : c.marca === 'bandeira' && interrogacao ? 'interrogacao' : null
  return jogo
}

/** Acorde: num número aberto com a mesma quantidade de bandeiras em volta, abre as outras vizinhas. */
export function acorde(jogoOriginal, i, agora = Date.now()) {
  const c = jogoOriginal.casas[i]
  if (jogoOriginal.estado !== 'jogando' || !c.aberta || c.vizinhas === 0) return jogoOriginal
  const viz = vizinhas(jogoOriginal, i)
  const bandeiras = viz.filter((v) => jogoOriginal.casas[v].marca === 'bandeira').length
  if (bandeiras !== c.vizinhas) return jogoOriginal
  let jogo = jogoOriginal
  for (const v of viz) {
    const cv = jogo.casas[v]
    if (!cv.aberta && cv.marca !== 'bandeira') {
      jogo = revelar(jogo, v, agora)
      if (jogo.estado === 'perdeu') break
    }
  }
  return jogo
}

/** Contador de minas do painel: minas − bandeiras (pode ficar negativo, como no original). */
export const minasRestantes = (jogo) => jogo.minas - jogo.casas.filter((c) => c.marca === 'bandeira').length

/** Relógio do painel: segundos desde o primeiro clique, limitado a 999. */
export function segundosDeJogo(jogo, agora = Date.now()) {
  if (!jogo.inicio) return 0
  return Math.min(999, Math.floor(((jogo.fim ?? agora) - jogo.inicio) / 1000) + 1)
}
