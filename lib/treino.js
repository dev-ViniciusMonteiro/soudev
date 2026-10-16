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

/**
 * Corpo em linha reta (ombro-quadril-ponto final) e se o quadril está acima ou abaixo da linha, na imagem.
 * O ponto final é o tornozelo (prancha, flexão) ou o joelho (ponte de glúteo).
 */
function linhaDoCorpo(p, final = 'tornozelo', s = p.lado) {
  const ang = angulo(p.w('ombro', s), p.w('quadril', s), p.w(final, s))
  const o = p.px(P.ombro[s])
  const q = p.px(P.quadril[s])
  const t = p.px(P[final][s])
  const yLinha = o.y + ((t.y - o.y) * (q.x - o.x)) / (t.x - o.x || 1)
  const comprimento = Math.hypot(t.x - o.x, t.y - o.y) || 1
  return { ang, quadrilAbaixo: q.y > yLinha, desvio: (yLinha - q.y) / comprimento, horizontal: Math.abs(t.y - o.y) < Math.abs(t.x - o.x) }
}

const troncoDe = (p) => inclinacao(media(p.w('ombro', 0), p.w('ombro', 1)), media(p.w('quadril', 0), p.w('quadril', 1)))
// Ângulo do quadril (ombro-quadril-joelho): 180 em pé, menor quando o joelho sobe ou o tronco desce.
const quadrilDe = (p, s) => p.ang('ombro', 'quadril', 'joelho', s)

// ---------- Exercícios ----------
// medir(p) devolve o valor principal (ângulo) e dados extras para as checagens.
// rep: { sentido, inicio, contar, fim } — o valor sai do "inicio", passa do "contar" e volta ao "fim".
// quadro(m, p): erros vistos neste quadro. repeticao(r): erros da repetição inteira (r.extremo = pico do movimento).

const lados = (nome) => [...P[nome]]

export const GRUPOS = [
  ['pernas', 'Pernas e glúteos'],
  ['superiores', 'Braços, peito e costas'],
  ['core', 'Abdômen e core'],
  ['cardio', 'Cardio'],
]

export const EXERCICIOS = [
  {
    id: 'agachamento',
    grupo: 'pernas',
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
    grupo: 'superiores',
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
    grupo: 'superiores',
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
    grupo: 'superiores',
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
    grupo: 'superiores',
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
    grupo: 'pernas',
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
    grupo: 'core',
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
  {
    id: 'ponte',
    grupo: 'pernas',
    nome: 'Ponte de glúteo',
    camera: ['lateral', 'diagonal'],
    posicao: 'Deite de barriga para cima com os joelhos dobrados. Coloque o celular no chão, de lado para você, a uns 2 metros.',
    dicaInicial: 'Pés no chão perto do glúteo. Suba o quadril até alinhar ombros, quadril e joelhos.',
    pontos: (p) => [P.ombro[p.lado], P.quadril[p.lado], P.joelho[p.lado], P.tornozelo[p.lado]],
    medir(p) {
      // Acima de 180 quando o quadril passa da linha ombro-joelho (lombar arqueada).
      const linha = linhaDoCorpo(p, 'joelho')
      const valor = linha.desvio > 0 ? 360 - linha.ang : linha.ang
      return { valor, joelho: p.ang('quadril', 'joelho', 'tornozelo'), deitado: linhaDoCorpo(p).horizontal }
    },
    posicaoValida: (m) => m.deitado,
    avisoPosicao: 'Deite de barriga para cima, de lado para a câmera, com os joelhos dobrados.',
    rep: { sentido: 'sobe', inicio: 163, contar: 168, fim: 160 },
    quadro(m) {
      const erros = []
      if (m.valor > 192) erros.push('lombar')
      if (m.valor > 160 && m.joelho > 120) erros.push('pes')
      return erros
    },
    repeticao(r) {
      return r.extremo < 173 ? ['amplitude'] : []
    },
    erros: {
      amplitude: ['Suba mais o quadril, até alinhar ombros, quadril e joelhos.', 'Suba o quadril', ['quadril']],
      lombar: ['Não arqueie a lombar: suba contraindo o glúteo, não as costas.', 'Contraia o glúteo', ['quadril']],
      pes: ['Aproxime os pés do glúteo: lá em cima o joelho deve ficar perto de 90°.', 'Pés mais perto', ['joelho', 'tornozelo']],
    },
  },
  {
    id: 'stiff',
    grupo: 'pernas',
    nome: 'Stiff (terra romeno)',
    camera: ['lateral', 'diagonal'],
    posicao: 'Coloque o celular de lado para você, a uns 2 a 3 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Joelhos levemente dobrados. Leve o quadril para trás e desça o peso rente às pernas.',
    pontos: (p) => [P.ombro[p.lado], P.quadril[p.lado], P.joelho[p.lado], P.tornozelo[p.lado]],
    medir(p) {
      return { valor: quadrilDe(p, p.lado), joelho: p.ang('quadril', 'joelho', 'tornozelo') }
    },
    rep: { sentido: 'desce', inicio: 150, contar: 125, fim: 160 },
    quadro(m) {
      return m.valor < 150 && m.joelho < 135 ? ['joelho'] : []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 110) erros.push('amplitude')
      if (r.duracao < 1.2) erros.push('rapido')
      return erros
    },
    erros: {
      amplitude: ['Desça mais levando o quadril para trás, até alongar a parte de trás da coxa.', 'Quadril para trás', ['quadril']],
      joelho: ['Joelhos quase retos: quem dobra é o quadril, não o joelho.', 'Joelhos quase retos', ['joelho']],
      rapido: ['Mais devagar: desça com controle, sem dar tranco.', 'Mais devagar', ['quadril']],
    },
  },
  {
    id: 'cadeirinha',
    grupo: 'pernas',
    nome: 'Cadeirinha na parede',
    camera: ['lateral', 'diagonal'],
    posicao: 'Encoste as costas na parede e coloque o celular de lado para você, a uns 2 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Costas apoiadas na parede, desça até as coxas ficarem paralelas ao chão e segure.',
    isometria: true,
    pontos: (p) => [P.ombro[p.lado], P.quadril[p.lado], P.joelho[p.lado], P.tornozelo[p.lado]],
    medir(p) {
      return { valor: p.ang('quadril', 'joelho', 'tornozelo'), tronco: troncoDe(p) }
    },
    posicaoValida: (m) => m.valor < 135,
    avisoPosicao: 'Encoste na parede e desça até os joelhos ficarem perto de 90°.',
    quadro(m) {
      const erros = []
      if (m.valor > 110) erros.push('alto')
      if (m.valor < 70) erros.push('baixo')
      if (m.tronco > 20) erros.push('tronco')
      return erros
    },
    erros: {
      alto: ['Desça mais: as coxas devem ficar paralelas ao chão.', 'Desça mais', ['quadril', 'joelho']],
      baixo: ['Suba um pouco: os joelhos devem ficar perto de 90°.', 'Suba um pouco', ['joelho']],
      tronco: ['Costas apoiadas na parede, tronco reto.', 'Costas na parede', ['ombro', 'quadril']],
    },
  },
  {
    id: 'remada',
    grupo: 'superiores',
    nome: 'Remada curvada',
    camera: ['lateral', 'diagonal'],
    posicao: 'Coloque o celular de lado para você, a uns 2 a 3 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Incline o tronco à frente com as costas retas e puxe o peso até a barriga.',
    pontos: (p) => [P.ombro[p.lado], P.cotovelo[p.lado], P.punho[p.lado], P.quadril[p.lado], P.joelho[p.lado]],
    medir(p) {
      return { valor: p.ang('ombro', 'cotovelo', 'punho'), tronco: troncoDe(p) }
    },
    posicaoValida: (m) => m.tronco > 20,
    avisoPosicao: 'Incline o tronco à frente, uns 45°, com os joelhos levemente dobrados.',
    rep: { sentido: 'desce', inicio: 140, contar: 110, fim: 150 },
    faixas: ['tronco'],
    quadro(m) {
      return m.tronco < 25 ? ['tronco_alto'] : []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 95) erros.push('amplitude')
      if (r.faixas.tronco && r.faixas.tronco[1] - r.faixas.tronco[0] > 18) erros.push('balanco')
      if (r.duracao < 1) erros.push('rapido')
      return erros
    },
    erros: {
      amplitude: ['Puxe mais: leve o cotovelo para trás até passar da linha das costas.', 'Puxe mais', ['cotovelo']],
      tronco_alto: ['Incline mais o tronco à frente, com as costas retas.', 'Incline o tronco', ['ombro', 'quadril']],
      balanco: ['Não suba o tronco para puxar: só os braços se movem.', 'Tronco parado', ['ombro', 'quadril']],
      rapido: ['Mais devagar, principalmente na volta.', 'Mais devagar', ['cotovelo']],
    },
  },
  {
    id: 'mergulho',
    grupo: 'superiores',
    nome: 'Mergulho no banco',
    camera: ['lateral', 'diagonal'],
    posicao: 'Apoie as mãos num banco ou cadeira firme atrás de você. Coloque o celular de lado, a uns 2 metros.',
    dicaInicial: 'Costas perto do banco, desça dobrando os cotovelos para trás até 90°.',
    pontos: (p) => [P.ombro[p.lado], P.cotovelo[p.lado], P.punho[p.lado], P.quadril[p.lado]],
    medir(p) {
      return { valor: p.ang('ombro', 'cotovelo', 'punho'), maosAbaixo: p.img[P.punho[p.lado]].y > p.img[P.ombro[p.lado]].y }
    },
    posicaoValida: (m) => m.maosAbaixo,
    avisoPosicao: 'Apoie as mãos no banco atrás de você, com os braços esticados.',
    rep: { sentido: 'desce', inicio: 145, contar: 115, fim: 150 },
    quadro() {
      return []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo > 100) erros.push('amplitude')
      if (r.duracao < 1) erros.push('rapido')
      return erros
    },
    erros: {
      amplitude: ['Desça mais, até os cotovelos formarem 90°.', 'Desça mais', ['cotovelo']],
      rapido: ['Mais devagar: desça com controle para proteger o ombro.', 'Mais devagar', ['ombro', 'cotovelo']],
    },
  },
  {
    id: 'abdominal',
    grupo: 'core',
    nome: 'Abdominal',
    camera: ['lateral', 'diagonal'],
    posicao: 'Deite de barriga para cima com os joelhos dobrados. Coloque o celular no chão, de lado para você, a uns 2 metros.',
    dicaInicial: 'Tire os ombros do chão contraindo o abdômen, olhando para o teto.',
    pontos: (p) => [P.ombro[p.lado], P.quadril[p.lado], P.joelho[p.lado]],
    medir(p) {
      const s = p.lado
      return {
        // Quanto o tronco subiu em relação ao chão (0 = deitado).
        valor: 90 - inclinacao(p.w('ombro', s), p.w('quadril', s)),
        pescoco: p.vis(P.nariz) > 0.5 ? angulo(p.w('quadril', s), p.w('ombro', s), p.mundo[P.nariz]) : 180,
      }
    },
    posicaoValida: (m) => m.valor < 65,
    avisoPosicao: 'Deite de barriga para cima, de lado para a câmera.',
    rep: { sentido: 'sobe', inicio: 14, contar: 22, fim: 10 },
    quadro(m) {
      return m.valor > 12 && m.pescoco < 125 ? ['pescoco'] : []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo < 28) erros.push('amplitude')
      if (r.duracao < 0.8) erros.push('rapido')
      return erros
    },
    erros: {
      amplitude: ['Suba um pouco mais: tire as escápulas do chão.', 'Suba mais', ['ombro']],
      pescoco: ['Não puxe o pescoço: deixe espaço de um punho entre o queixo e o peito.', 'Solte o pescoço', ['ombro']],
      rapido: ['Mais devagar: desça controlando, sem cair.', 'Mais devagar', ['ombro', 'quadril']],
    },
  },
  {
    id: 'escalador',
    grupo: 'core',
    nome: 'Escalador',
    camera: ['lateral', 'diagonal'],
    posicao: 'Fique em posição de prancha com os braços esticados. Coloque o celular no chão, de lado, a uns 2 metros.',
    dicaInicial: 'Corpo reto como prancha, traga um joelho de cada vez em direção ao peito.',
    pontos: (p) => [...lados('ombro'), ...lados('quadril'), ...lados('joelho')],
    medir(p) {
      const a = quadrilDe(p, 0)
      const b = quadrilDe(p, 1)
      // Diferença entre as pernas: não muda se o quadril subir (as duas dobram juntas).
      // A linha do corpo usa a perna que está esticada.
      return { valor: Math.abs(a - b), joelhoNoPeito: Math.min(a, b), linha: linhaDoCorpo(p, 'tornozelo', a > b ? 0 : 1) }
    },
    posicaoValida: (m) => m.linha.horizontal,
    avisoPosicao: 'Fique em posição de prancha (braços esticados), de lado para a câmera.',
    rep: { sentido: 'sobe', inicio: 30, contar: 50, fim: 22 },
    faixas: ['joelhoNoPeito'],
    quadro(m) {
      return m.linha.ang < 150 && !m.linha.quadrilAbaixo ? ['quadril_alto'] : []
    },
    repeticao(r) {
      return r.faixas.joelhoNoPeito?.[0] > 105 ? ['amplitude'] : []
    },
    erros: {
      amplitude: ['Traga o joelho mais perto do peito.', 'Joelho no peito', ['joelho']],
      quadril_alto: ['Abaixe o quadril: mantenha o corpo reto como prancha.', 'Abaixe o quadril', ['quadril']],
    },
  },
  {
    id: 'polichinelo',
    grupo: 'cardio',
    nome: 'Polichinelo',
    camera: ['frontal', 'diagonal'],
    posicao: 'Fique de frente para a câmera, a uns 2 a 3 metros, mostrando o corpo inteiro com os braços para cima.',
    dicaInicial: 'Pule abrindo as pernas e batendo as mãos acima da cabeça.',
    pontos: () => [...lados('ombro'), ...lados('cotovelo'), ...lados('quadril'), ...lados('tornozelo')],
    medir(p) {
      const abre = (s) => p.ang('quadril', 'ombro', 'cotovelo', s)
      const quadril = Math.abs(p.px(23).x - p.px(24).x) || 1
      return { valor: (abre(0) + abre(1)) / 2, pernas: Math.abs(p.px(27).x - p.px(28).x) / quadril }
    },
    rep: { sentido: 'sobe', inicio: 60, contar: 120, fim: 45 },
    faixas: ['pernas'],
    quadro() {
      return []
    },
    repeticao(r) {
      const erros = []
      if (r.extremo < 145) erros.push('bracos')
      if (r.faixas.pernas && r.faixas.pernas[1] < 1.8) erros.push('pernas')
      return erros
    },
    erros: {
      bracos: ['Suba mais os braços: as mãos devem se encontrar acima da cabeça.', 'Braços para cima', ['ombro', 'cotovelo']],
      pernas: ['Abra mais as pernas no salto.', 'Abra as pernas', ['quadril', 'tornozelo']],
    },
  },
  {
    id: 'joelho-alto',
    grupo: 'cardio',
    nome: 'Corrida estacionária',
    camera: ['lateral', 'diagonal', 'frontal'],
    posicao: 'Coloque o celular de lado para você (ou de frente), a uns 2 a 3 metros, mostrando o corpo inteiro.',
    dicaInicial: 'Corra no lugar subindo os joelhos até a altura do quadril.',
    pontos: () => [...lados('ombro'), ...lados('quadril'), ...lados('joelho')],
    medir(p) {
      // Quanto a coxa subiu em relação à vertical (0 = perna esticada, 90 = joelho na altura do quadril).
      const coxa = (s) => 180 - inclinacao(p.w('joelho', s), p.w('quadril', s))
      return { valor: Math.max(coxa(0), coxa(1)), tronco: troncoDe(p) }
    },
    rep: { sentido: 'sobe', inicio: 30, contar: 55, fim: 22 },
    quadro(m) {
      return m.tronco > 20 ? ['tronco'] : []
    },
    repeticao(r) {
      return r.extremo < 75 ? ['amplitude'] : []
    },
    erros: {
      amplitude: ['Suba mais o joelho, até a altura do quadril.', 'Joelho mais alto', ['joelho']],
      tronco: ['Tronco reto: não incline para trás nem para a frente.', 'Tronco reto', ['ombro', 'quadril']],
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

  const novaRep = (ts, valor) => ({ inicio: ts, extremo: valor, quadrosErro: {}, marcas: {}, faixas: {} })

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
      // Faixa (mínimo e máximo) de medidas extras durante a repetição, como a inclinação do tronco.
      for (const k of ex.faixas || []) {
        const f = rep.faixas[k] || [m[k], m[k]]
        rep.faixas[k] = [Math.min(f[0], m[k]), Math.max(f[1], m[k])]
      }
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
