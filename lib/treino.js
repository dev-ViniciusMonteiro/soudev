// Correção de exercícios pela câmera. Recebe os 33 pontos do corpo do MediaPipe Pose
// (landmarks na imagem + worldLandmarks em metros) e devolve contagem, fase e correções.
// Os ângulos usam as coordenadas 3D em metros, que não dependem da distância até a câmera.

export const P = {
  nariz: 0,
  ombro: [11, 12],
  cotovelo: [13, 14],
  punho: [15, 16],
  quadril: [23, 24],
  joelho: [25, 26],
  tornozelo: [27, 28],
  calcanhar: [29, 30],
  pe: [31, 32],
}

// Ligações desenhadas sobre o vídeo.
export const OSSOS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
]

const graus = (rad) => (rad * 180) / Math.PI
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) })
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z
const norma = (a) => Math.hypot(a.x, a.y, a.z)

/** Ângulo em graus no ponto b, formado por a-b-c. */
export function angulo(a, b, c) {
  const u = sub(a, b)
  const v = sub(c, b)
  const n = norma(u) * norma(v)
  return n ? graus(Math.acos(Math.max(-1, Math.min(1, dot(u, v) / n)))) : 0
}

/** Inclinação em graus do segmento de baixo -> cima em relação à vertical (0 = em pé). */
export function inclinacao(cima, baixo) {
  const v = sub(cima, baixo)
  const n = norma(v)
  return n ? graus(Math.acos(Math.max(-1, Math.min(1, -v.y / n)))) : 0
}

const media = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 })

/** Dados do quadro atual com ajudantes para escolher o lado mais visível. */
function montarPose(img, mundo, largura, altura) {
  const vis = (i) => img[i]?.visibility ?? 0
  const px = (i) => ({ x: img[i].x * largura, y: img[i].y * altura })
  const ladoVis = (s) => ['ombro', 'cotovelo', 'punho', 'quadril', 'joelho', 'tornozelo'].reduce((t, k) => t + vis(P[k][s]), 0)
  const lado = ladoVis(0) >= ladoVis(1) ? 0 : 1
  const ombros = Math.abs(px(11).x - px(12).x)
  const tronco = Math.hypot(...Object.values(sub(media(px(11), px(12)), media(px(23), px(24)))).slice(0, 2)) || 1
  const razao = ombros / tronco
  const vista = razao > 0.45 ? 'frontal' : razao < 0.3 ? 'lateral' : 'diagonal'
  return {
    img, mundo, vis, px, lado, vista, largura, altura,
    i: (nome, s = lado) => P[nome][s],
    w: (nome, s = lado) => mundo[P[nome][s]],
    ang: (a, b, c, s = lado) => angulo(mundo[P[a][s]], mundo[P[b][s]], mundo[P[c][s]]),
  }
}

/** Corpo em linha reta (ombro-quadril-tornozelo) e se o quadril está acima ou abaixo da linha, na imagem. */
function linhaDoCorpo(p) {
  const s = p.lado
  const ang = angulo(p.w('ombro'), p.w('quadril'), p.w('tornozelo'))
  const o = p.px(P.ombro[s])
  const q = p.px(P.quadril[s])
  const t = p.px(P.tornozelo[s])
  const yLinha = o.y + ((t.y - o.y) * (q.x - o.x)) / (t.x - o.x || 1)
  return { ang, quadrilAbaixo: q.y > yLinha, horizontal: Math.abs(t.y - o.y) < Math.abs(t.x - o.x) }
}

// ---------- Exercícios ----------
// medir(p) devolve o valor principal (ângulo) e dados extras para as checagens.
// rep: { sentido, inicio, contar, fim } — o valor sai do "inicio", passa do "contar" e volta ao "fim".
// quadro(m, p): erros vistos neste quadro. repeticao(r): erros da repetição inteira (r.extremo = pico do movimento).

const lados = (nome) => [...P[nome]]

export const EXERCICIOS = [
  {
    id: 'agachamento',
    nome: 'Agachamento',
    camera: ['lateral', 'diagonal', 'frontal'],
    posicao: 'Coloque o celular no chão ou numa mesa, de lado para você, a uns 2 a 3 metros, mostrando o corpo inteiro da cabeça aos pés.',
    dicaInicial: 'Pés na largura dos ombros, desça como se fosse sentar numa cadeira.',
    pontos: () => [...lados('ombro'), ...lados('quadril'), ...lados('joelho'), ...lados('tornozelo')],
    medir(p) {
      const joelho = p.vista === 'frontal' ? (p.ang('quadril', 'joelho', 'tornozelo', 0) + p.ang('quadril', 'joelho', 'tornozelo', 1)) / 2 : p.ang('quadril', 'joelho', 'tornozelo')
      return { valor: joelho, tronco: inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1))) }
    },
    rep: { sentido: 'desce', inicio: 150, contar: 130, fim: 160 },
    quadro(m, p) {
      const erros = []
      if (m.valor < 150 && m.tronco > 50) erros.push('tronco')
      if (p.vista === 'frontal' && m.valor < 140) {
        const joelhos = Math.abs(p.px(25).x - p.px(26).x)
        const tornozelos = Math.abs(p.px(27).x - p.px(28).x)
        if (tornozelos > 0 && joelhos < tornozelos * 0.8) erros.push('joelhos')
      }
      if (p.vista !== 'frontal' && m.valor < 140 && p.vis(P.calcanhar[p.lado]) > 0.5 && p.vis(P.pe[p.lado]) > 0.5) {
        const pe = Math.abs(p.px(P.pe[p.lado]).x - p.px(P.calcanhar[p.lado]).x) || 1
        if (p.px(P.pe[p.lado]).y - p.px(P.calcanhar[p.lado]).y > pe * 0.45) erros.push('calcanhar')
      }
      return erros
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 105) erros.push('profundidade')
      if (r.duracao < 1.2) erros.push('rapido')
      return erros
    },
    erros: {
      profundidade: ['Desça mais: tente deixar as coxas paralelas ao chão.', 'Desça mais', ['quadril', 'joelho']],
      tronco: ['Peito aberto: o tronco está inclinando demais para a frente.', 'Peito para cima', ['ombro', 'quadril']],
      joelhos: ['Empurre os joelhos para fora, na direção dos pés.', 'Joelhos para fora', ['joelho']],
      calcanhar: ['Mantenha os calcanhares no chão e o peso no meio do pé.', 'Calcanhar no chão', ['tornozelo', 'calcanhar']],
      rapido: ['Mais devagar: controle a descida por uns 2 segundos.', 'Mais devagar', ['quadril']],
    },
  },
  {
    id: 'flexao',
    nome: 'Flexão de braço',
    camera: ['lateral', 'diagonal'],
    posicao: 'Coloque o celular no chão, de lado para você, a uns 2 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Mãos um pouco mais abertas que os ombros e corpo reto como uma prancha.',
    pontos: (p) => [P.ombro[p.lado], P.cotovelo[p.lado], P.punho[p.lado], P.quadril[p.lado], P.tornozelo[p.lado]],
    medir(p) {
      const linha = linhaDoCorpo(p)
      return { valor: p.ang('ombro', 'cotovelo', 'punho'), linha }
    },
    rep: { sentido: 'desce', inicio: 150, contar: 120, fim: 150 },
    posicaoValida: (m) => m.linha.horizontal,
    avisoPosicao: 'Fique na posição de flexão (corpo deitado, de lado para a câmera).',
    quadro(m) {
      if (m.linha.ang >= 160) return []
      return [m.linha.quadrilAbaixo ? 'quadril_caido' : 'quadril_alto']
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 100) erros.push('profundidade')
      if (r.duracao < 1) erros.push('rapido')
      return erros
    },
    erros: {
      profundidade: ['Desça mais: o peito deve chegar perto do chão (cotovelo a 90°).', 'Desça mais', ['cotovelo']],
      quadril_caido: ['Contraia o abdômen e o glúteo: o quadril está caindo.', 'Quadril caindo', ['quadril']],
      quadril_alto: ['Abaixe o quadril: corpo reto da cabeça aos pés.', 'Abaixe o quadril', ['quadril']],
      rapido: ['Mais devagar: desça com controle.', 'Mais devagar', ['cotovelo']],
    },
  },
  {
    id: 'rosca',
    nome: 'Rosca bíceps',
    camera: ['lateral', 'diagonal', 'frontal'],
    posicao: 'Fique de lado ou de frente para a câmera, a uns 2 metros, mostrando do quadril para cima.',
    dicaInicial: 'Cotovelos colados ao corpo e tronco parado. Só o antebraço se move.',
    pontos: (p) => [P.ombro[p.lado], P.cotovelo[p.lado], P.punho[p.lado], P.quadril[p.lado]],
    medir(p) {
      // De frente, mede o braço que está mais dobrado (o que está fazendo o exercício).
      const s = p.vista === 'frontal' ? (p.ang('ombro', 'cotovelo', 'punho', 0) < p.ang('ombro', 'cotovelo', 'punho', 1) ? 0 : 1) : p.lado
      return {
        valor: p.ang('ombro', 'cotovelo', 'punho', s),
        lado: s,
        cotovelo: 180 - inclinacao(p.w('cotovelo', s), p.w('ombro', s)), // braço apontando para baixo = 0
        tronco: inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1))),
      }
    },
    rep: { sentido: 'desce', inicio: 140, contar: 75, fim: 145 },
    quadro(m) {
      const erros = []
      if (m.cotovelo > 35) erros.push('cotovelo')
      if (m.tronco > 15) erros.push('balanco')
      return erros
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 60) erros.push('amplitude')
      if (r.duracao < 1) erros.push('rapido')
      return erros
    },
    erros: {
      cotovelo: ['Cotovelo colado ao corpo: ele está indo para a frente.', 'Cotovelo parado', ['ombro', 'cotovelo']],
      balanco: ['Não balance o corpo: use um peso que você controle.', 'Sem balançar', ['ombro', 'quadril']],
      amplitude: ['Suba até o fim e aperte o bíceps lá em cima.', 'Suba mais', ['cotovelo', 'punho']],
      rapido: ['Mais devagar, principalmente na descida.', 'Mais devagar', ['cotovelo']],
    },
  },
  {
    id: 'desenvolvimento',
    nome: 'Desenvolvimento de ombros',
    camera: ['frontal', 'diagonal'],
    posicao: 'Fique de frente para a câmera, a uns 2 metros, mostrando do quadril até acima das mãos esticadas.',
    dicaInicial: 'Comece com as mãos na altura dos ombros e empurre para cima, sem arquear as costas.',
    pontos: () => [...lados('ombro'), ...lados('cotovelo'), ...lados('punho'), ...lados('quadril')],
    medir(p) {
      return {
        valor: (p.ang('ombro', 'cotovelo', 'punho', 0) + p.ang('ombro', 'cotovelo', 'punho', 1)) / 2,
        tronco: inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1))),
        maosAcima: p.img[15].y < p.img[0].y && p.img[16].y < p.img[0].y,
        diferenca: Math.abs(p.px(15).y - p.px(16).y) / (Math.abs(p.px(11).x - p.px(12).x) || 1),
      }
    },
    rep: { sentido: 'sobe', inicio: 115, contar: 150, fim: 110 },
    quadro(m) {
      const erros = []
      if (m.tronco > 15) erros.push('lombar')
      if (m.valor > 115 && m.diferenca > 0.35) erros.push('assimetria')
      return erros
    },
    repeticao(r) {
      const erros = []
      if (r.extremo < 160 || !r.marcas.maosAcima) erros.push('amplitude')
      return erros
    },
    marcar: (m) => ({ maosAcima: m.maosAcima }),
    erros: {
      amplitude: ['Estique os braços totalmente acima da cabeça.', 'Estique os braços', ['cotovelo', 'punho']],
      lombar: ['Não jogue o corpo para trás: abdômen firme e costas retas.', 'Costas retas', ['ombro', 'quadril']],
      assimetria: ['Suba os dois braços juntos, na mesma altura.', 'Braços juntos', ['punho']],
    },
  },
  {
    id: 'elevacao-lateral',
    nome: 'Elevação lateral',
    camera: ['frontal', 'diagonal'],
    posicao: 'Fique de frente para a câmera, a uns 2 metros, mostrando do quadril para cima com os braços abertos.',
    dicaInicial: 'Braços quase retos, suba pelos lados até a altura dos ombros.',
    pontos: () => [...lados('ombro'), ...lados('cotovelo'), ...lados('punho'), ...lados('quadril')],
    medir(p) {
      const abre = (s) => p.ang('quadril', 'ombro', 'cotovelo', s)
      return {
        valor: (abre(0) + abre(1)) / 2,
        diferenca: Math.abs(abre(0) - abre(1)),
        cotovelo: Math.min(p.ang('ombro', 'cotovelo', 'punho', 0), p.ang('ombro', 'cotovelo', 'punho', 1)),
        tronco: inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1))),
      }
    },
    rep: { sentido: 'sobe', inicio: 35, contar: 65, fim: 30 },
    quadro(m) {
      const erros = []
      if (m.valor > 40 && m.cotovelo < 135) erros.push('cotovelo')
      if (m.valor > 40 && m.diferenca > 20) erros.push('assimetria')
      if (m.tronco > 12) erros.push('balanco')
      if (m.valor > 110) erros.push('alto')
      return erros
    },
    repeticao(r) {
      return r.extremo < 75 ? ['baixo'] : []
    },
    erros: {
      baixo: ['Suba até os braços ficarem na altura dos ombros.', 'Suba mais', ['ombro', 'cotovelo']],
      alto: ['Pare na altura dos ombros: subir mais sobrecarrega o ombro.', 'Altura dos ombros', ['ombro', 'cotovelo']],
      cotovelo: ['Braços quase retos: só uma leve dobra no cotovelo.', 'Braços retos', ['cotovelo']],
      assimetria: ['Suba os dois braços juntos, na mesma altura.', 'Braços juntos', ['cotovelo', 'punho']],
      balanco: ['Não balance o corpo para subir o peso.', 'Sem balançar', ['ombro', 'quadril']],
    },
  },
  {
    id: 'afundo',
    nome: 'Afundo (avanço)',
    camera: ['lateral', 'diagonal'],
    posicao: 'Coloque o celular de lado para você, a uns 2 a 3 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Dê um passo largo e desça o joelho de trás em direção ao chão, tronco reto.',
    pontos: () => [...lados('ombro'), ...lados('quadril'), ...lados('joelho'), ...lados('tornozelo')],
    medir(p) {
      return {
        valor: Math.min(p.ang('quadril', 'joelho', 'tornozelo', 0), p.ang('quadril', 'joelho', 'tornozelo', 1)),
        tronco: inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1))),
      }
    },
    rep: { sentido: 'desce', inicio: 150, contar: 125, fim: 160 },
    quadro(m) {
      return m.valor < 150 && m.tronco > 25 ? ['tronco'] : []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 105) erros.push('profundidade')
      if (r.duracao < 1) erros.push('rapido')
      return erros
    },
    erros: {
      profundidade: ['Desça mais: os dois joelhos devem chegar perto de 90°.', 'Desça mais', ['joelho']],
      tronco: ['Tronco reto: não incline para a frente.', 'Tronco reto', ['ombro', 'quadril']],
      rapido: ['Mais devagar: desça com controle.', 'Mais devagar', ['joelho']],
    },
  },
  {
    id: 'prancha',
    nome: 'Prancha',
    camera: ['lateral', 'diagonal'],
    posicao: 'Coloque o celular no chão, de lado para você, a uns 2 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Antebraços no chão, cotovelos embaixo dos ombros e corpo reto.',
    isometria: true,
    pontos: (p) => [P.ombro[p.lado], P.cotovelo[p.lado], P.quadril[p.lado], P.tornozelo[p.lado]],
    medir(p) {
      return { valor: 0, linha: linhaDoCorpo(p) }
    },
    posicaoValida: (m) => m.linha.horizontal,
    avisoPosicao: 'Fique na posição de prancha (corpo deitado, de lado para a câmera).',
    quadro(m) {
      if (m.linha.ang >= 165) return []
      return [m.linha.quadrilAbaixo ? 'quadril_caido' : 'quadril_alto']
    },
    erros: {
      quadril_caido: ['Contraia o abdômen e o glúteo: o quadril está caindo.', 'Quadril caindo', ['quadril']],
      quadril_alto: ['Abaixe um pouco o quadril: corpo reto da cabeça aos pés.', 'Abaixe o quadril', ['quadril']],
    },
  },
]

export const getExercicio = (id) => EXERCICIOS.find((e) => e.id === id)

// ---------- Motor ----------

const SUAVE = 0.5 // suavização dos pontos entre quadros (0 = sem, 1 = congelado)
const QUADROS_ERRO = 5 // quadros seguidos para considerar um erro ativo (~0,2 s)

function suavizar(anterior, atual) {
  if (!anterior) return atual.map((p) => ({ ...p }))
  return atual.map((p, i) => ({
    x: anterior[i].x * SUAVE + p.x * (1 - SUAVE),
    y: anterior[i].y * SUAVE + p.y * (1 - SUAVE),
    z: (anterior[i].z ?? 0) * SUAVE + (p.z ?? 0) * (1 - SUAVE),
    visibility: p.visibility,
  }))
}

/**
 * Cria uma sessão de treino para um exercício.
 * processar() recebe o resultado do MediaPipe a cada quadro e devolve o estado para desenhar.
 */
export function criarTreino(exercicio) {
  const ex = typeof exercicio === 'string' ? getExercicio(exercicio) : exercicio
  let img = null
  let mundo = null
  let pronto = false
  let quadrosOk = 0
  let quadrosRuins = 0
  let fase = 'inicio'
  let rep = null
  let reps = 0
  let repsBoas = 0
  let segundos = 0
  let segundosBons = 0
  let ultimoTs = null
  let ultimaRep = null
  const seguidos = {}
  const contagemErros = {}
  const inicio = Date.now()

  const novaRep = (ts, valor) => ({ inicio: ts, extremo: valor, quadrosErro: {}, marcas: {} })

  function processar(resultado, ts, { largura = 1, altura = 1 } = {}) {
    const eventos = []
    const dt = ultimoTs === null ? 0 : Math.min(0.5, (ts - ultimoTs) / 1000)
    ultimoTs = ts
    const lm = resultado?.landmarks?.[0]
    const wl = resultado?.worldLandmarks?.[0]
    if (!lm || !wl) {
      img = mundo = null
      quadrosOk = 0
      if (++quadrosRuins > 15) pronto = false
      return estado({ aviso: 'Não estou vendo você. Fique na frente da câmera com o corpo inteiro aparecendo.', eventos })
    }
    img = suavizar(img, lm)
    mundo = suavizar(mundo, wl)
    const p = montarPose(img, mundo, largura, altura)
    const pontos = ex.pontos(p)
    const visivel = pontos.every((i) => p.vis(i) > 0.5)
    const vistaOk = ex.camera.includes(p.vista)
    const m = ex.medir(p)
    const posicaoOk = !ex.posicaoValida || ex.posicaoValida(m)

    let aviso = null
    if (!visivel) aviso = 'Afaste-se um pouco: preciso ver todas as articulações do exercício.'
    else if (!vistaOk) aviso = ex.camera[0] === 'frontal' ? 'Fique de frente para a câmera.' : 'Vire de lado para a câmera.'
    else if (!posicaoOk) aviso = ex.avisoPosicao

    if (aviso) {
      quadrosOk = 0
      if (++quadrosRuins > 15) pronto = false
    } else {
      quadrosRuins = 0
      if (++quadrosOk > 8) pronto = true
    }
    if (!pronto) return estado({ aviso, eventos, p, m })

    // Erros que aparecem durante o movimento.
    const vistos = new Set(ex.quadro(m, p))
    for (const codigo of Object.keys(ex.erros)) seguidos[codigo] = vistos.has(codigo) ? (seguidos[codigo] || 0) + 1 : 0
    const ativos = Object.keys(seguidos).filter((c) => seguidos[c] >= QUADROS_ERRO)

    if (ex.isometria) {
      segundos += dt
      if (!ativos.length) segundosBons += dt
      for (const c of ativos) contagemErros[c] = (contagemErros[c] || 0) + dt
      return estado({ eventos, p, m, ativos })
    }

    const { sentido, inicio: ini, contar, fim } = ex.rep
    const passou = (v, limite) => (sentido === 'desce' ? v < limite : v > limite)
    const voltou = (v, limite) => (sentido === 'desce' ? v > limite : v < limite)
    if (fase === 'inicio' || fase === 'pronto') {
      if (voltou(m.valor, fim) || fase === 'pronto') fase = 'pronto'
      if (fase === 'pronto' && passou(m.valor, ini)) {
        fase = 'movendo'
        rep = novaRep(ts, m.valor)
      }
    } else if (fase === 'movendo') {
      rep.extremo = sentido === 'desce' ? Math.min(rep.extremo, m.valor) : Math.max(rep.extremo, m.valor)
      if (ex.marcar) for (const [k, v] of Object.entries(ex.marcar(m))) rep.marcas[k] = rep.marcas[k] || v
      for (const c of ativos) rep.quadrosErro[c] = (rep.quadrosErro[c] || 0) + 1
      if (voltou(m.valor, fim)) {
        fase = 'pronto'
        rep.duracao = (ts - rep.inicio) / 1000
        if (passou(rep.extremo, contar)) {
          const erros = [...new Set([...ex.repeticao(rep), ...Object.keys(rep.quadrosErro).filter((c) => rep.quadrosErro[c] >= 4)])]
          reps++
          if (!erros.length) repsBoas++
          for (const c of erros) contagemErros[c] = (contagemErros[c] || 0) + 1
          ultimaRep = { numero: reps, boa: !erros.length, erros, ts }
          eventos.push({ tipo: 'rep', ...ultimaRep })
        } else {
          eventos.push({ tipo: 'incompleta', ts })
        }
        rep = null
      }
    }
    return estado({ eventos, p, m, ativos })
  }

  function estado({ aviso = null, eventos, p = null, m = null, ativos = [] }) {
    const destacar = new Set()
    for (const c of ativos) for (const nome of ex.erros[c][2]) for (const i of P[nome]) destacar.add(i)
    let progresso = 0
    if (m && !ex.isometria) {
      // 0 = posição inicial, 1 = chegou no ponto que conta a repetição.
      const { sentido, fim, contar } = ex.rep
      progresso = Math.max(0, Math.min(1, sentido === 'desce' ? (fim - m.valor) / (fim - contar) : (m.valor - fim) / (contar - fim)))
    }
    return {
      pronto,
      aviso,
      fase,
      reps,
      repsBoas,
      segundos,
      segundosBons,
      valor: m?.valor ?? null,
      vista: p?.vista ?? null,
      progresso,
      ativos: ativos.map((c) => ({ codigo: c, texto: ex.erros[c][0], voz: ex.erros[c][1] })),
      ultimaRep: ultimaRep && ultimaRep.erros ? { ...ultimaRep, textos: ultimaRep.erros.map((c) => ex.erros[c][0]), vozes: ultimaRep.erros.map((c) => ex.erros[c][1]) } : null,
      eventos,
      pontos: img,
      destacar,
    }
  }

  function resumo() {
    return {
      exercicio: ex.nome,
      isometria: Boolean(ex.isometria),
      reps,
      repsBoas,
      segundos: Math.round(segundos),
      segundosBons: Math.round(segundosBons),
      duracao: Math.round((Date.now() - inicio) / 1000),
      erros: Object.entries(contagemErros)
        .sort((a, b) => b[1] - a[1])
        .map(([codigo, vezes]) => ({ codigo, texto: ex.erros[codigo][0], vezes: ex.isometria ? Math.round(vezes) : vezes })),
    }
  }

  return { processar, resumo, exercicio: ex }
}
