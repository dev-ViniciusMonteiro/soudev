// Ótica do Lente Certa: funções puras, sem tela. Os modelos são os usados em ótica oftálmica, simplificados
// onde a tela não permite mais (ver o comentário de cada função).

/* ---------------- receita ---------------- */

export const OLHOS = ['od', 'oe']
export const NOME_OLHO = { od: 'Olho direito (OD)', oe: 'Olho esquerdo (OE)' }

export const receitaVazia = () => ({
  od: { esf: '', cil: '', eixo: '' },
  oe: { esf: '', cil: '', eixo: '' },
  adicao: '',
  dnp: '', // distância naso-pupilar total (mm); se tiver por olho, soma
  idade: '',
})

/** Receita de exemplo (miopia com astigmatismo e início de presbiopia), para quem quer só explorar. */
export const receitaExemplo = () => ({
  od: { esf: '-2.75', cil: '-0.75', eixo: '180' },
  oe: { esf: '-2.50', cil: '-1.00', eixo: '170' },
  adicao: '1.75',
  dnp: '63',
  idade: '48',
})

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Lê e confere a receita. Aceita cilindro positivo (transpõe para negativo, a convenção mais usada no Brasil).
 * Devolve { ok, erros, olhos: { od: {esf, cil, eixo}, oe }, adicao, dnp, idade, transposta }.
 */
export function lerReceita(r) {
  const erros = []
  const olhos = {}
  let transposta = false
  for (const o of OLHOS) {
    const esf = num(r[o].esf)
    let cil = num(r[o].cil) ?? 0
    let eixo = num(r[o].eixo)
    if (esf === null) { erros.push(`${NOME_OLHO[o]}: preencha o esférico (use 0 se a receita diz "plano").`); continue }
    if (Number.isNaN(esf) || esf < -20 || esf > 20) erros.push(`${NOME_OLHO[o]}: o esférico precisa estar entre -20,00 e +20,00.`)
    if (Number.isNaN(cil) || Math.abs(cil) > 8) erros.push(`${NOME_OLHO[o]}: o cilíndrico precisa estar entre -8,00 e +8,00.`)
    if (cil !== 0 && (eixo === null || Number.isNaN(eixo) || eixo < 0 || eixo > 180)) erros.push(`${NOME_OLHO[o]}: com cilíndrico, o eixo vai de 0 a 180°.`)
    if (!Number.isNaN(esf) && !Number.isNaN(cil)) {
      if (Math.abs(esf * 4 - Math.round(esf * 4)) > 1e-6 || Math.abs(cil * 4 - Math.round(cil * 4)) > 1e-6) erros.push(`${NOME_OLHO[o]}: os graus andam de 0,25 em 0,25.`)
    }
    let e = esf
    if (cil > 0) { // transposição: esf' = esf + cil, cil' = -cil, eixo' = eixo ± 90
      e = esf + cil; cil = -cil; eixo = ((eixo ?? 0) + 90) % 180; transposta = true
    }
    olhos[o] = { esf: e, cil, eixo: cil === 0 ? null : (eixo === 0 ? 180 : eixo) }
  }
  const adicao = num(r.adicao) ?? 0
  if (Number.isNaN(adicao) || adicao < 0 || adicao > 4) erros.push('A adição vai de +0,75 a +3,50 (deixe em branco se a receita não tem).')
  else if (adicao > 0 && adicao < 0.75) erros.push('Adição menor que +0,75 é rara: confira a receita.')
  const dnp = num(r.dnp)
  if (dnp !== null && (Number.isNaN(dnp) || dnp < 45 || dnp > 80)) erros.push('A DNP total costuma ficar entre 50 e 75 mm.')
  const idade = num(r.idade)
  if (idade === null) erros.push('Informe a idade: ela muda quanto o olho ainda consegue focar de perto.')
  else if (Number.isNaN(idade) || idade < 5 || idade > 100) erros.push('Idade entre 5 e 100 anos.')
  return { ok: erros.length === 0, erros, olhos, adicao: Number.isNaN(adicao) ? 0 : adicao, dnp: dnp && !Number.isNaN(dnp) ? dnp : 63, idade: idade && !Number.isNaN(idade) ? idade : 40, transposta }
}

/** Equivalente esférico: o "grau médio" de um olho (esf + cil/2). */
export const equivalente = (o) => o.esf + o.cil / 2

/** Meridianos principais de um olho (cilíndrico negativo): o de maior e o de menor poder. */
export const meridianos = (o) => ({ a: o.esf, b: o.esf + o.cil })

export const fmt = (d) => (d === 0 ? '0,00' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2).replace('.', ',')}`)

/** O que a receita mostra, em português comum. */
export function diagnostico(R) {
  const itens = []
  const eqs = OLHOS.map((o) => equivalente(R.olhos[o]))
  const maior = Math.max(...eqs.map(Math.abs))
  const miope = eqs.some((e) => e < -0.25), hiper = eqs.some((e) => e > 0.25)
  const nivel = (v) => (v <= 3 ? 'leve' : v <= 6 ? 'moderada' : 'alta')
  if (miope) itens.push({ t: `Miopia ${nivel(Math.max(...eqs.filter((e) => e < 0).map(Math.abs)))}`, d: 'Vê bem de perto e embaçado de longe. A lente é mais grossa na borda.' })
  if (hiper) itens.push({ t: `Hipermetropia ${nivel(Math.max(...eqs.filter((e) => e > 0)))}`, d: 'O olho faz esforço para focar, principalmente de perto. A lente é mais grossa no centro.' })
  const cil = Math.max(...OLHOS.map((o) => Math.abs(R.olhos[o].cil)))
  if (cil >= 0.25) itens.push({ t: `Astigmatismo ${cil <= 1 ? 'leve' : cil <= 2 ? 'moderado' : 'alto'}`, d: 'A imagem fica esticada ou com sombra em uma direção. O eixo diz qual direção.' })
  if (R.adicao > 0) itens.push({ t: 'Presbiopia (vista cansada)', d: `A adição de ${fmt(R.adicao)} é o reforço para perto. Com ela entram as lentes bifocais, multifocais e ocupacionais.` })
  if (!itens.length) itens.push({ t: 'Grau muito baixo', d: 'Diferença pequena entre os olhos e o normal; confirme com o oftalmologista se precisa de óculos.' })
  const aniso = Math.abs(eqs[0] - eqs[1])
  if (aniso >= 2) itens.push({ t: 'Diferença grande entre os olhos', d: `São ${aniso.toFixed(2).replace('.', ',')} dioptrias de diferença. Vale usar o mesmo índice nos dois lados e conversar sobre adaptação na ótica.` })
  return { itens, maior }
}

/* ---------------- materiais e espessura ---------------- */

// n = índice de refração, abbe = dispersão (maior = menos franja colorida), dens = g/cm³, centro mínimo de lente negativa (mm)
export const MATERIAIS = [
  { id: '1.50', nome: 'Resina 1.50 (CR-39)', n: 1.498, abbe: 58, dens: 1.32, tcMin: 2.0, preco: 1, nota: 'A mais nítida e barata. Fica grossa a partir de ±2,00.' },
  { id: '1.53', nome: 'Trivex 1.53', n: 1.532, abbe: 45, dens: 1.11, tcMin: 1.5, preco: 2, nota: 'A mais leve e resistente a impacto. Boa para crianças e esporte.' },
  { id: '1.59', nome: 'Policarbonato 1.59', n: 1.586, abbe: 30, dens: 1.2, tcMin: 1.3, preco: 2, nota: 'Muito resistente a impacto; pode mostrar franja colorida nas bordas.' },
  { id: '1.60', nome: 'Resina 1.60', n: 1.6, abbe: 42, dens: 1.3, tcMin: 1.3, preco: 3, nota: 'Bom equilíbrio entre espessura, nitidez e preço até uns ±4,00.' },
  { id: '1.67', nome: 'Alto índice 1.67', n: 1.67, abbe: 32, dens: 1.35, tcMin: 1.2, preco: 4, nota: 'Bem mais fina para graus de ±4,00 a ±6,00.' },
  { id: '1.74', nome: 'Alto índice 1.74', n: 1.74, abbe: 33, dens: 1.47, tcMin: 1.2, preco: 5, nota: 'A mais fina que existe; faz diferença acima de ±6,00.' },
]

export const ARMACOES = [
  { id: 'p', nome: 'Pequena', aro: 48, ponte: 18, altura: 32 },
  { id: 'm', nome: 'Média', aro: 52, ponte: 18, altura: 38 },
  { id: 'g', nome: 'Grande', aro: 56, ponte: 17, altura: 44 },
]

/**
 * Espessuras pela fórmula da sagita (aproximação usada em laboratório): s = y² · P / (2000 · (n − 1)), y em mm.
 * Lente negativa: centro fino e borda grossa; positiva: borda mínima de 1 mm e centro grosso.
 * y = metade do diâmetro efetivo, que cresce quando a pupila não fica no centro do aro (descentração).
 */
export function espessura(olho, material, armacao, dnpTotal) {
  const dnpMono = dnpTotal / 2
  const descentra = Math.max(0, (armacao.aro + armacao.ponte) / 2 - dnpMono)
  const yMax = armacao.aro / 2 + 1 + descentra // pior ponto da borda (lado da têmpora)
  const yMin = armacao.altura / 2 // borda mais próxima (cima/baixo)
  const { a, b } = meridianos(olho)
  const k = 2000 * (material.n - 1)
  const fraco = Math.max(a, b), forte = Math.min(a, b) // cilindro negativo: b é o meridiano mais negativo
  const negativo = equivalente(olho) <= 0
  let centro, bordaMax, bordaMin
  if (negativo) {
    // centro no mínimo do material; a borda engrossa com o meridiano mais negativo no ponto mais longe
    centro = material.tcMin
    bordaMax = centro + (yMax * yMax * Math.abs(Math.min(0, forte))) / k
    bordaMin = centro + (yMin * yMin * Math.abs(Math.min(0, fraco))) / k
  } else {
    // positiva: a borda mais distante fica com 1 mm, e o centro cresce para isso caber
    centro = 1.0 + (yMax * yMax * Math.max(0, fraco)) / k
    bordaMin = 1.0
    bordaMax = Math.max(1.0, centro - (yMin * yMin * Math.max(0, fraco)) / k)
  }
  // volume de um paraboloide ≈ área · espessura média
  const area = Math.PI * (armacao.aro / 2) * (armacao.altura / 2) // mm²
  const media = (centro + (bordaMax + bordaMin) / 2) / 2
  const peso = (area * media * material.dens) / 1000 // g
  return { centro, bordaMax, bordaMin, peso, negativo, yMax }
}

/** Índice sugerido pelo maior grau (meridiano mais forte entre os dois olhos). */
export function indiceSugerido(R) {
  const forte = Math.max(...OLHOS.flatMap((o) => { const m = meridianos(R.olhos[o]); return [Math.abs(m.a), Math.abs(m.b)] }))
  if (forte <= 2) return { id: '1.50', motivo: 'Grau baixo: a resina comum fica fina e é a mais nítida.' }
  if (forte <= 4) return { id: '1.60', motivo: 'Grau médio: a 1.60 afina bem sem perder nitidez.' }
  if (forte <= 6) return { id: '1.67', motivo: 'Grau alto: a 1.67 reduz bastante a espessura.' }
  return { id: '1.74', motivo: 'Grau muito alto: só a 1.74 deixa a lente realmente fina.' }
}

/** Refletância de Fresnel por superfície, incidência normal: ((n−1)/(n+1))². Sem antirreflexo, a lente reflete 2× isso. */
export const reflexo = (n) => ((n - 1) / (n + 1)) ** 2

/* ---------------- visão: acomodação, desfoque e zonas das lentes ---------------- */

/** Amplitude de acomodação média (Hofstetter): 18,5 − 0,3 × idade. O olho usa com conforto cerca da metade. */
export const acomodacaoUtil = (idade) => Math.max(0, (18.5 - 0.3 * idade) / 2)

/**
 * Erro de foco (dioptrias) olhando um objeto a `dist` metros através de uma zona da lente que soma `adicao`
 * à correção de longe. Considera que a correção de longe da receita está certa.
 * Faltou poder: o olho completa com a acomodação que tem; sobrou poder (adição demais para a distância): borra.
 */
export function erroComLente(dist, adicao, acom) {
  const precisa = 1 / dist
  return Math.max(0, precisa - adicao - acom) + Math.max(0, adicao - precisa)
}

/** Erro de foco sem óculos: equivalente esférico S, astigmatismo vira metade do cilindro (círculo de menor confusão). */
export function erroSemOculos(dist, S, cil, acom) {
  const precisa = S + 1 / dist // quanto o olho teria de acomodar
  const foco = precisa < 0 ? -precisa : Math.max(0, precisa - acom)
  return foco + Math.abs(cil) / 2
}

/**
 * Diâmetro angular do borrão (graus): pupila (m) × erro (D) em radianos.
 * Pupila de 4 mm: 1 dioptria vira um borrão de ~0,23°.
 */
export const borraoGraus = (erro, pupilaMm = 4) => ((pupilaMm / 1000) * erro * 180) / Math.PI

export const TIPOS = [
  { id: 'mono-longe', nome: 'Monofocal para longe', presbita: false, desc: 'Um grau só, para longe. Para quem tem adição, perto e computador ficam embaçados.' },
  { id: 'mono-perto', nome: 'Monofocal para perto', presbita: true, desc: 'Óculos de leitura: nítido de perto, embaçado de longe.' },
  { id: 'bifocal', nome: 'Bifocal', presbita: true, desc: 'Longe em cima e perto numa "janela" embaixo, com linha visível. Não tem distância intermediária (computador).' },
  { id: 'multi-basica', nome: 'Multifocal básica', presbita: true, desc: 'Longe, intermediário e perto sem linha. Corredor estreito e laterais distorcidas: exige mexer mais a cabeça.' },
  { id: 'multi-premium', nome: 'Multifocal premium (digital)', presbita: true, desc: 'Mesmo princípio, com campos de visão bem mais largos e menos distorção. Adaptação mais fácil.' },
  { id: 'ocupacional', nome: 'Ocupacional (escritório)', presbita: true, desc: 'Para quem passa o dia no computador: perto e intermediário amplos, sem longe.' },
]

/**
 * Mapa da lente: para um ponto (x, y) da lente normalizado (−1..1, y=+1 em cima), devolve a adição naquele
 * ponto, o astigmatismo indesejado (dioptrias) e se está na linha do bifocal.
 * Nas progressivas, o astigmatismo lateral segue o teorema de Minkwitz: cresce cerca do dobro da taxa com que a
 * adição aumenta ao longo do corredor, por isso adições maiores e corredores curtos distorcem mais.
 */
export function zonaDaLente(tipo, adicao, x, y) {
  const ax = Math.abs(x)
  switch (tipo) {
    case 'mono-longe': return { add: 0, astig: 0 }
    case 'mono-perto': return { add: adicao, astig: 0 }
    case 'bifocal': {
      const dentro = y < -0.28 && ax < 0.42
      const linha = Math.abs(y + 0.28) < 0.012 && ax < 0.42
      return { add: dentro ? adicao : 0, astig: 0, linha, prisma: dentro ? 0.012 : 0 }
    }
    case 'ocupacional': {
      // degressiva: em cima ~1/3 a menos que a adição (monitor), embaixo a adição toda (papel)
      const t = Math.min(1, Math.max(0, (0.6 - y) / 1.1))
      const add = adicao * (0.55 + 0.45 * t)
      const largura = 0.75
      const astig = Math.max(0, ax - largura) * adicao * 0.9
      return { add, astig }
    }
    default: { // progressivas
      const premium = tipo === 'multi-premium'
      const topo = 0.08, fundo = -0.5 // corredor: do ponto de montagem até a zona de perto
      let t = 0
      if (y < topo) t = Math.min(1, (topo - y) / (topo - fundo))
      const s = t * t * (3 - 2 * t) // subida suave da adição
      const add = adicao * s
      // largura da zona nítida em cada altura
      const longe = premium ? 0.92 : 0.72
      const corredor = (premium ? 0.26 : 0.15) * Math.min(1.4, 2 / Math.max(1, adicao))
      const perto = (premium ? 0.42 : 0.3) * Math.min(1.3, 2 / Math.max(1, adicao))
      let largura
      if (y >= topo) largura = longe - Math.max(0, topo + 0.25 - y) * 0 // longe: largo
      else if (t < 1) largura = corredor + (longe - corredor) * Math.max(0, 1 - t * 2.2) * 0.6
      else largura = perto
      const ganho = (premium ? 1.5 : 2.3) * adicao // Minkwitz: ~2× o gradiente de adição
      const astig = y >= topo + 0.15 ? Math.max(0, ax - longe) * 0.6 * adicao : Math.max(0, ax - largura) * ganho * (0.4 + 0.6 * Math.min(1, t * 1.5))
      return { add, astig }
    }
  }
}
