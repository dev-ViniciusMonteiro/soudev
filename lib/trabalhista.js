// Tabelas vigentes em 2026. Atualize aqui quando o governo publicar novos valores.
export const ANO_TABELAS = 2026
export const SALARIO_MINIMO = 1621.0

const INSS_FAIXAS = [
  { ate: 1621.0, aliquota: 0.075 },
  { ate: 2902.84, aliquota: 0.09 },
  { ate: 4354.27, aliquota: 0.12 },
  { ate: 8475.55, aliquota: 0.14 },
]

const IRRF_FAIXAS = [
  { ate: 2428.8, aliquota: 0, deducao: 0 },
  { ate: 2826.65, aliquota: 0.075, deducao: 182.16 },
  { ate: 3751.05, aliquota: 0.15, deducao: 394.16 },
  { ate: 4664.68, aliquota: 0.225, deducao: 675.49 },
  { ate: Infinity, aliquota: 0.275, deducao: 908.73 },
]

export const DEDUCAO_DEPENDENTE = 189.59
export const DESCONTO_SIMPLIFICADO = 607.2

export const round2 = (value) => Math.round(value * 100) / 100

export function calcularInss(base) {
  let anterior = 0
  let total = 0
  for (const faixa of INSS_FAIXAS) {
    if (base <= anterior) break
    total += (Math.min(base, faixa.ate) - anterior) * faixa.aliquota
    anterior = faixa.ate
  }
  return round2(total)
}

// Lei 15.270/2025: redução que zera o imposto até R$ 5.000 e diminui gradualmente até R$ 7.350.
function reducaoIrrf(rendimento, imposto) {
  if (rendimento <= 5000) return Math.min(imposto, 312.89)
  if (rendimento <= 7350) return Math.min(imposto, Math.max(0, 978.62 - 0.133145 * rendimento))
  return 0
}

export function calcularIrrf(rendimento, { inss = 0, dependentes = 0, outrasDeducoes = 0 } = {}) {
  const baseLegal = rendimento - inss - dependentes * DEDUCAO_DEPENDENTE - outrasDeducoes
  const baseSimplificada = rendimento - DESCONTO_SIMPLIFICADO
  const base = Math.max(0, Math.min(baseLegal, baseSimplificada))
  const faixa = IRRF_FAIXAS.find((item) => base <= item.ate)
  const bruto = Math.max(0, base * faixa.aliquota - faixa.deducao)
  const imposto = round2(Math.max(0, bruto - reducaoIrrf(rendimento, bruto)))
  return { base: round2(base), aliquota: faixa.aliquota, imposto, simplificado: baseSimplificada < baseLegal }
}

/* ---------- Datas ---------- */

export const parseDate = (value) => {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

export const toInputDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

// Data estável usada no HTML gerado no build. Os componentes trocam pela data de hoje logo após carregar.
export const DATA_INICIAL = new Date(2026, 9, 14)

export const addDays =(date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
export const diffDays = (a, b) => Math.round((b - a) / 86400000)

export function anosCompletos(inicio, fim) {
  let anos = fim.getFullYear() - inicio.getFullYear()
  if (fim.getMonth() < inicio.getMonth() || (fim.getMonth() === inicio.getMonth() && fim.getDate() < inicio.getDate())) anos--
  return Math.max(0, anos)
}

// Diferença em anos, meses e dias (calendário).
export function diferencaCalendario(inicio, fim) {
  let anos = fim.getFullYear() - inicio.getFullYear()
  let meses = fim.getMonth() - inicio.getMonth()
  let dias = fim.getDate() - inicio.getDate()
  if (dias < 0) {
    meses--
    dias += daysInMonth(fim.getFullYear(), fim.getMonth() - 1)
  }
  if (meses < 0) {
    anos--
    meses += 12
  }
  return { anos, meses, dias }
}

// Avos de 13º: meses do ano com pelo menos 15 dias trabalhados.
function avos13(inicio, fim) {
  const inicioAno = new Date(fim.getFullYear(), 0, 1)
  const start = inicio > inicioAno ? inicio : inicioAno
  let avos = 0
  for (let m = start.getMonth(); m <= fim.getMonth(); m++) {
    const primeiro = m === start.getMonth() ? start.getDate() : 1
    const ultimo = m === fim.getMonth() ? fim.getDate() : daysInMonth(fim.getFullYear(), m)
    if (ultimo - primeiro + 1 >= 15) avos++
  }
  return avos
}

// Avos de férias no período aquisitivo atual (fração acima de 14 dias conta como mês).
function avosFerias(admissao, fim) {
  const anos = anosCompletos(admissao, fim)
  let cursor = new Date(admissao.getFullYear() + anos, admissao.getMonth(), admissao.getDate())
  let meses = 0
  const limite = addDays(fim, 1)
  for (;;) {
    const proximo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate())
    if (proximo > limite) break
    meses++
    cursor = proximo
  }
  if (diffDays(cursor, fim) + 1 >= 15) meses++
  return Math.min(meses, 12)
}

export const MOTIVOS_RESCISAO = {
  sem_justa: 'Dispensa sem justa causa',
  pedido: 'Pedido de demissão',
  acordo: 'Acordo entre as partes',
  justa: 'Dispensa por justa causa',
}

export function calcularRescisao({ salario, admissao, saida, motivo, aviso, feriasVencidas = 0, saldoFgts, dependentes = 0 }) {
  const linhas = []
  const descontos = []
  const diaria = salario / 30

  const diasTrabalhados = Math.min(saida.getDate(), 30)
  const saldoSalario = round2(diaria * diasTrabalhados)
  linhas.push({ label: `Saldo de salário (${diasTrabalhados} dias)`, valor: saldoSalario })

  const anos = anosCompletos(admissao, saida)
  const diasAviso = Math.min(30 + 3 * anos, 90)
  let avisoValor = 0
  let fimProjetado = saida
  if (aviso === 'indenizado' && (motivo === 'sem_justa' || motivo === 'acordo')) {
    const dias = motivo === 'acordo' ? Math.floor(diasAviso / 2) : diasAviso
    avisoValor = round2(diaria * dias)
    fimProjetado = addDays(saida, diasAviso)
    linhas.push({ label: `Aviso prévio indenizado (${dias} dias)`, valor: avisoValor })
  }

  let decimo = 0
  let feriasProp = 0
  if (motivo !== 'justa') {
    const fim13 = fimProjetado.getFullYear() === saida.getFullYear() ? fimProjetado : new Date(saida.getFullYear(), 11, 31)
    const avos = avos13(admissao, fim13)
    decimo = round2((salario / 12) * avos)
    linhas.push({ label: `13º salário proporcional (${avos}/12)`, valor: decimo })

    const avosF = avosFerias(admissao, fimProjetado)
    feriasProp = round2((salario / 12) * avosF)
    linhas.push({ label: `Férias proporcionais (${avosF}/12)`, valor: feriasProp })
  }

  const feriasVenc = round2(salario * feriasVencidas)
  if (feriasVenc) linhas.push({ label: 'Férias vencidas', valor: feriasVenc })
  const terco = round2((feriasProp + feriasVenc) / 3)
  if (terco) linhas.push({ label: '1/3 constitucional sobre férias', valor: terco })

  const inssSaldo = calcularInss(saldoSalario)
  const inss13 = calcularInss(decimo)
  if (inssSaldo) descontos.push({ label: 'INSS sobre saldo de salário', valor: inssSaldo })
  if (inss13) descontos.push({ label: 'INSS sobre 13º', valor: inss13 })
  const irSaldo = calcularIrrf(saldoSalario, { inss: inssSaldo, dependentes }).imposto
  const ir13 = calcularIrrf(decimo, { inss: inss13, dependentes }).imposto
  if (irSaldo) descontos.push({ label: 'IRRF sobre saldo de salário', valor: irSaldo })
  if (ir13) descontos.push({ label: 'IRRF sobre 13º', valor: ir13 })
  if (motivo === 'pedido' && aviso === 'nao_cumprido') descontos.push({ label: 'Aviso prévio não cumprido', valor: round2(salario) })

  const bruto = round2(linhas.reduce((t, l) => t + l.valor, 0))
  const totalDescontos = round2(descontos.reduce((t, l) => t + l.valor, 0))

  const meses = Math.max(1, Math.round(diffDays(admissao, saida) / 30.44))
  const saldoInformado = Number.isFinite(saldoFgts)
  const saldoBase = saldoInformado ? saldoFgts : round2(salario * 0.08 * meses)
  const depositoRescisao = round2((saldoSalario + avisoValor + decimo) * 0.08)
  const multaPercentual = motivo === 'sem_justa' ? 0.4 : motivo === 'acordo' ? 0.2 : 0
  const multa = round2((saldoBase + depositoRescisao) * multaPercentual)
  const saquePercentual = motivo === 'sem_justa' ? 1 : motivo === 'acordo' ? 0.8 : 0

  return {
    linhas,
    descontos,
    bruto,
    totalDescontos,
    liquido: round2(bruto - totalDescontos),
    fgts: {
      saldoEstimado: !saldoInformado,
      saldo: saldoBase,
      deposito: depositoRescisao,
      multa,
      multaPercentual,
      saque: round2((saldoBase + depositoRescisao) * saquePercentual + multa),
    },
    diasAviso,
    anos,
    seguroDesemprego: motivo === 'sem_justa',
  }
}
