// Regras do MEI usadas pelo MEI na Mão. Valores de outubro de 2026: confira sempre no Portal do Empreendedor.
// Para atualizar no ano seguinte, mude só este bloco.

export const MEI = {
  atualizado: 'outubro de 2026',
  salarioMinimo: 1621,
  inss: 81.05, // 5% do salário mínimo
  icms: 1, // comércio e indústria
  iss: 5, // serviços
  limiteAnual: 81000,
  limiteMensalReferencia: 6750,
  toleranciaExcesso: 0.2, // até 20% acima: DAS complementar e sai do MEI em janeiro
  vencimentoDAS: 20,
  prazoDASN: '31 de maio',
  links: {
    portal: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
    das: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao',
    nfse: 'https://www.nfse.gov.br/EmissorNacional',
    dasn: 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao',
  },
}

export const ATIVIDADES = [
  ['comercio', 'Comércio ou indústria (vendo produtos)'],
  ['servicos', 'Serviços'],
  ['ambos', 'Comércio e serviços'],
]

const round2 = (n) => Math.round(n * 100) / 100

export function valorDAS(atividade = 'comercio') {
  const icms = atividade === 'servicos' ? 0 : MEI.icms
  const iss = atividade === 'comercio' ? 0 : MEI.iss
  return { total: round2(MEI.inss + icms + iss), inss: MEI.inss, icms, iss }
}

/** Próximo vencimento do DAS (dia 20 do mês seguinte à competência). */
export function proximoDAS(hoje = new Date()) {
  const venc = new Date(hoje.getFullYear(), hoje.getMonth(), MEI.vencimentoDAS)
  if (hoje.getDate() > MEI.vencimentoDAS) venc.setMonth(venc.getMonth() + 1)
  const competencia = new Date(venc.getFullYear(), venc.getMonth() - 1, 1)
  const dias = Math.ceil((venc - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000)
  return { vencimento: venc, competencia, dias }
}

/** Limite do ano: no ano em que abriu o MEI é proporcional aos meses (R$ 6.750 por mês, contando o mês da abertura). */
export function limiteDoAno(abertura, ano = new Date().getFullYear()) {
  const d = abertura ? new Date(`${abertura}T12:00`) : null
  if (d && !Number.isNaN(d.getTime()) && d.getFullYear() === ano) {
    const meses = 12 - d.getMonth()
    return { valor: meses * MEI.limiteMensalReferencia, proporcional: true, meses }
  }
  return { valor: MEI.limiteAnual, proporcional: false, meses: 12 }
}

export function situacaoLimite(faturado, limite) {
  const pct = limite ? faturado / limite : 0
  if (pct > 1 + MEI.toleranciaExcesso) return { tom: 'erro', texto: 'Passou mais de 20% do limite: o desenquadramento é retroativo ao começo do ano. Procure um contador agora.' }
  if (pct > 1) return { tom: 'erro', texto: 'Passou do limite (até 20%): paga DAS complementar sobre o excesso e deixa de ser MEI em janeiro.' }
  if (pct > 0.8) return { tom: 'aviso', texto: 'Mais de 80% do limite usado. Vale conversar com um contador sobre virar ME.' }
  return { tom: 'ok', texto: 'Dentro do limite do MEI.' }
}

/** Precisa emitir nota? Regra geral do MEI (confirme na sua prefeitura e no seu estado). */
export function precisaNota({ documento = '', servico = false }) {
  const d = String(documento).replace(/\D/g, '')
  if (d.length === 14) return { obrigatoria: true, texto: `Cliente é empresa (CNPJ): a nota é obrigatória. ${servico ? 'Serviço: NFS-e pelo Emissor Nacional.' : 'Produto: NF-e.'}` }
  return {
    obrigatoria: false,
    texto: servico
      ? 'Cliente pessoa física: a nota é exigida se ele pedir. Para serviços, muitas prefeituras já cobram a NFS-e em todo serviço: confira na sua cidade.'
      : 'Cliente pessoa física: a nota é exigida se ele pedir.',
  }
}

/**
 * Relatório Mensal das Receitas Brutas (o MEI preenche todo mês e guarda com as notas).
 * Separa comércio e serviço, com e sem nota fiscal.
 */
export function receitasDoMes(vendas, produtos, mes) {
  const r = { comercioSemNota: 0, comercioComNota: 0, servicoSemNota: 0, servicoComNota: 0, qtd: 0 }
  for (const v of vendas) {
    if (v.status !== 'concluida') continue
    const quando = new Date(v.concluida_em || v.criado_em)
    const chave = `${quando.getFullYear()}-${String(quando.getMonth() + 1).padStart(2, '0')}`
    if (chave !== mes) continue
    r.qtd++
    const comNota = v.fiscal?.status === 'autorizada'
    for (const i of v.itens || []) {
      const valor = Number(i.preco) * Number(i.qtd)
      const servico = produtos.get(i.produto_id)?.tipo === 'servico'
      const k = `${servico ? 'servico' : 'comercio'}${comNota ? 'ComNota' : 'SemNota'}`
      r[k] = round2(r[k] + valor)
    }
    // Desconto e acréscimo entram proporcionalmente no comércio (simplificação).
    const ajuste = -Number(v.desconto || 0) + Number(v.acrescimo || 0)
    if (ajuste) r[comNota ? 'comercioComNota' : 'comercioSemNota'] = round2(r[comNota ? 'comercioComNota' : 'comercioSemNota'] + ajuste)
  }
  r.comercio = round2(r.comercioSemNota + r.comercioComNota)
  r.servico = round2(r.servicoSemNota + r.servicoComNota)
  r.total = round2(r.comercio + r.servico)
  return r
}

/** Textos curtos da Central MEI (lidos em voz alta pelo botão Ouvir). */
export const AJUDA = [
  {
    id: 'das',
    titulo: 'O que é o DAS?',
    texto: `É o boleto mensal do MEI. Ele junta o INSS (5% do salário mínimo, R$ ${MEI.inss.toFixed(2).replace('.', ',')}) com R$ 1 de ICMS para quem vende produto e R$ 5 de ISS para quem presta serviço. Vence todo dia ${MEI.vencimentoDAS}, mesmo se você não vendeu nada no mês. Pagar em dia garante aposentadoria, auxílio-doença e salário-maternidade.`,
  },
  {
    id: 'limite',
    titulo: 'Quanto posso faturar?',
    texto: `Até R$ 81 mil por ano, somando tudo o que vendeu, com ou sem nota. No ano em que abriu o MEI o limite é proporcional: R$ 6.750 por mês. Se passar até 20%, paga um DAS complementar e vira microempresa em janeiro. Se passar mais de 20%, o desenquadramento vale desde o começo do ano. Há um projeto no Congresso para subir o limite, mas ele ainda não foi aprovado.`,
  },
  {
    id: 'nota',
    titulo: 'Quando preciso emitir nota?',
    texto: 'Sempre que vender para empresa (CNPJ). Para pessoa física, quando o cliente pedir. Serviço usa a NFS-e pelo Emissor Nacional, com login gov.br nível prata ou ouro, e as prefeituras estão migrando para esse padrão nacional em 2026. Produto usa a NF-e. O MEI na Mão mostra o caminho em cada venda.',
  },
  {
    id: 'relatorio',
    titulo: 'Relatório mensal',
    texto: `Todo mês o MEI deve preencher o Relatório Mensal das Receitas Brutas, separando comércio e serviço, com e sem nota, e guardar junto com as notas de compra e de venda. O MEI na Mão monta esse relatório sozinho a partir das suas vendas. Basta imprimir e assinar.`,
  },
  {
    id: 'dasn',
    titulo: 'Declaração anual',
    texto: `Até ${MEI.prazoDASN} de cada ano você entrega a DASN-SIMEI, informando quanto faturou no ano anterior e se teve empregado. Os números estão prontos no resumo anual do MEI na Mão. Atrasar gera multa.`,
  },
  {
    id: 'reforma',
    titulo: 'Reforma tributária e o MEI',
    texto: 'O MEI continua no Simples Nacional e o valor do DAS não muda por causa da reforma em 2026. Os novos impostos CBS e IBS começam em fase de teste em 2026 e de verdade a partir de 2027, e os sistemas de nota vão ganhando campos novos aos poucos. Na dúvida, fale com um contador: muitos atendem MEI de graça pelo programa do Sebrae.',
  },
]

/** Valor em reais para ser lido em voz alta. */
export function reaisFalado(valor) {
  const v = Math.round((Number(valor) || 0) * 100)
  const reais = Math.floor(v / 100)
  const cent = v % 100
  const r = reais === 1 ? '1 real' : `${reais.toLocaleString('pt-BR')} reais`
  return cent ? `${reais ? `${r} e ` : ''}${cent} centavos` : r
}
