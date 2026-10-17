// Nota fiscal em MODO SIMULAÇÃO: monta os dados como uma API fiscal faria (chave de acesso de 44 dígitos,
// número, série, protocolo, avisos de validação), mas nada é enviado à SEFAZ ou à prefeitura.
// Para emitir de verdade, a função emitirSimulado é trocada por uma chamada a uma API fiscal no servidor
// (Focus NFe, NFE.io…), com o certificado A1 do cliente.

import { onlyDigits, validarCnpj, validarCpf } from '../br'
import { round2 } from './regras'

const UF = { RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53 }

// Carga tributária aproximada só para o texto da Lei 12.741 (em produção vem da tabela do IBPT por NCM).
const TRIB_APROX = { federal: 0.0405, estadual: 0.18, municipal: 0.05 }

/** Dígito verificador da chave de acesso (módulo 11, pesos 2 a 9 da direita para a esquerda). */
export function dvChave(chave43) {
  let soma = 0
  let peso = 2
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

const aleatorio = (digitos) => {
  let s = ''
  for (let i = 0; i < digitos; i++) s += Math.floor(Math.random() * 10)
  return s
}

export function montarChave({ uf, data, cnpj, modelo, serie, numero }) {
  const aamm = `${String(data.getFullYear()).slice(2)}${String(data.getMonth() + 1).padStart(2, '0')}`
  const base = `${String(UF[uf] ?? 35)}${aamm}${onlyDigits(cnpj).padStart(14, '0').slice(-14)}${modelo}${String(serie).padStart(3, '0')}${String(numero).padStart(9, '0')}1${aleatorio(8)}`
  return base + dvChave(base)
}

export const formatarChave = (chave) => String(chave).replace(/(\d{4})(?=\d)/g, '$1 ')

/** Serviço puro vira NFS-e; produto para empresa (CNPJ), NF-e; produto para consumidor, NFC-e. */
export function tipoNota(venda, produtos, documento = '') {
  const itens = venda.itens || []
  const servico = itens.length > 0 && itens.every((i) => produtos.get(i.produto_id)?.tipo === 'servico')
  if (servico) return 'nfse'
  return onlyDigits(documento).length === 14 ? 'nfe' : 'nfce'
}

/** Confere o que uma API fiscal recusaria. Erros bloqueiam; avisos só alertam (na simulação). */
export function validar({ venda, cfg, produtos, tipo, cpf: documento }) {
  const erros = []
  const avisos = []
  if (venda.status !== 'concluida') erros.push('Só dá para emitir nota de venda concluída.')
  if (venda.fiscal?.status === 'autorizada') erros.push('Esta venda já tem nota autorizada.')
  if (!(venda.itens || []).length) erros.push('A venda não tem itens.')
  const doc = onlyDigits(cfg.documento)
  if (!doc) avisos.push('CNPJ do emitente não cadastrado (Configurações → Dados do negócio). Na simulação usamos um CNPJ de exemplo.')
  else if (doc.length === 14 && !validarCnpj(doc)) avisos.push('O CNPJ do emitente parece inválido. A SEFAZ rejeitaria (rejeição 207).')
  if (tipo !== 'nfse' && !onlyDigits(cfg.ie)) avisos.push(`Inscrição estadual não cadastrada. ${tipo === 'nfe' ? 'NF-e' : 'NFC-e'} exige IE.`)
  if (tipo === 'nfse' && !onlyDigits(cfg.im)) avisos.push('Inscrição municipal não cadastrada. A prefeitura costuma exigir para NFS-e.')
  const docCliente = onlyDigits(documento)
  if (docCliente.length === 11 && !validarCpf(docCliente)) erros.push('CPF do cliente inválido.')
  if (docCliente.length === 14 && !validarCnpj(docCliente)) erros.push('CNPJ do cliente inválido.')
  if (docCliente && docCliente.length !== 11 && docCliente.length !== 14) erros.push('Documento do cliente deve ser CPF (11 dígitos) ou CNPJ (14).')
  if (tipo === 'nfe' && !docCliente) erros.push('NF-e precisa do CNPJ do cliente.')
  if (tipo !== 'nfse') {
    const semNcm = (venda.itens || []).filter((i) => {
      const p = produtos.get(i.produto_id)
      return p?.tipo !== 'servico' && onlyDigits(p?.ncm).length !== 8
    })
    if (semNcm.length) avisos.push(`${semNcm.length} ${semNcm.length === 1 ? 'item está' : 'itens estão'} sem NCM (ex.: ${semNcm[0].nome}). Em produção a SEFAZ rejeita (rejeição 778); o contador informa o NCM certo.`)
  }
  return { erros, avisos }
}

/** Gera a nota simulada e grava na venda. Devolve o objeto fiscal. */
export function emitirSimulado(banco, venda, { cpf = '', documento = '' } = {}) {
  cpf = documento || cpf
  const cfg = banco.config()
  const produtos = new Map(banco.lista('produtos').map((p) => [p.id, p]))
  const tipo = tipoNota(venda, produtos, cpf)
  const { erros, avisos } = validar({ venda, cfg, produtos, tipo, cpf })
  if (erros.length) throw new Error(erros.join(' '))
  const anteriores = banco.lista('vendas').filter((v) => v.fiscal?.tipo === tipo)
  const numero = anteriores.reduce((m, v) => Math.max(m, Number(v.fiscal.numero) || 0), 0) + 1
  const serie = Number(cfg.serie_nfce) || 1
  const agora = new Date()
  const cnpj = onlyDigits(cfg.documento).length === 14 ? onlyDigits(cfg.documento) : '11222333000181'
  const uf = String(cfg.uf || 'SP').toUpperCase()
  const total = Number(venda.total) || 0
  const fiscal = {
    tipo,
    ambiente: 'simulacao',
    status: 'autorizada',
    numero,
    serie,
    chave: tipo === 'nfse' ? '' : montarChave({ uf, data: agora, cnpj, modelo: tipo === 'nfe' ? 55 : 65, serie, numero }),
    codigo_verificacao: tipo === 'nfse' ? `${aleatorio(4)}${Math.random().toString(36).slice(2, 6).toUpperCase()}` : '',
    protocolo: `${UF[uf] ?? 35}${String(agora.getFullYear()).slice(2)}${aleatorio(10)}`,
    emitida_em: agora.toISOString(),
    cpf: onlyDigits(cpf),
    tributos: {
      federal: round2(total * TRIB_APROX.federal),
      estadual: tipo === 'nfse' ? 0 : round2(total * TRIB_APROX.estadual),
      municipal: tipo === 'nfse' ? round2(total * TRIB_APROX.municipal) : 0,
    },
    avisos,
  }
  banco.salvar('vendas', { id: venda.id, fiscal })
  return fiscal
}

export function cancelarSimulado(banco, venda, motivo) {
  if (String(motivo || '').trim().length < 15) throw new Error('A SEFAZ exige justificativa com pelo menos 15 caracteres.')
  const emitida = new Date(venda.fiscal?.emitida_em || 0)
  if (venda.fiscal?.tipo === 'nfce' && Date.now() - emitida.getTime() > 30 * 60000) {
    throw new Error('Passou de 30 minutos da autorização: em vários estados a NFC-e só pode ser cancelada nesse prazo (depois, só por cancelamento extemporâneo).')
  }
  const fiscal = { ...venda.fiscal, status: 'cancelada', cancelada_em: new Date().toISOString(), motivo_cancelamento: String(motivo).trim() }
  banco.salvar('vendas', { id: venda.id, fiscal })
  return fiscal
}

/** Conteúdo do QR Code impresso no DANFE (na simulação, um texto que deixa claro que não é nota real). */
export const qrConteudo = (fiscal) => `NOTA SIMULADA - SEM VALOR FISCAL|${fiscal.tipo.toUpperCase()}|${fiscal.chave || fiscal.codigo_verificacao}|${fiscal.protocolo}`
