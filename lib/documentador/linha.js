// Linha de agentes: cada um recebe o material, o cabeçalho e o que os anteriores escreveram.
// O montador (último) recebe tudo isso mais a estrutura do padrão e devolve só o documento.

import { REGRAS } from './processos'
import { conversar } from './ia'

const hoje = () => new Date().toLocaleDateString('pt-BR')

function blocoCabecalho(processo, valores) {
  const linhas = processo.campos.map((c) => `- ${c.rotulo}: ${String(valores[c.id] ?? '').trim() || '(não informado)'}`)
  return `# Campos do cabeçalho (preenchidos pela pessoa)\n${linhas.join('\n')}\n- Data de elaboração: ${hoje()}`
}

function blocoMaterial(material, anexos) {
  const partes = [String(material || '').trim()]
  for (const a of anexos) partes.push(`--- Arquivo: ${a.nome} ---\n${a.texto}`)
  return `# Material enviado\n<<<\n${partes.filter(Boolean).join('\n\n') || '(vazio)'}\n>>>`
}

function blocoAnteriores(processo, saidas, ate) {
  const feitos = processo.agentes.slice(0, ate).map((a, i) => (saidas[i]?.texto ? `## ${a.nome}\n${saidas[i].texto.trim()}` : null)).filter(Boolean)
  return feitos.length ? `# Análises dos agentes anteriores\n${feitos.join('\n\n')}` : ''
}

/** Mensagens de um agente da linha. */
export function mensagensDoAgente({ processo, indice, valores, material, anexos, saidas }) {
  const agente = processo.agentes[indice]
  const montador = indice === processo.agentes.length - 1
  const contexto = [blocoCabecalho(processo, valores), blocoMaterial(material, anexos), blocoAnteriores(processo, saidas, indice)].filter(Boolean).join('\n\n')
  const tarefa = montador
    ? `# Estrutura obrigatória do documento\n${processo.estrutura}\n\n# Sua tarefa\nMonte o documento final seguindo EXATAMENTE a estrutura acima: mesmos títulos, mesma numeração, mesma ordem e todas as tabelas pedidas, inclusive o cabeçalho completo. Substitua {…} pelos valores reais. Seções sem informação ficam com [A DEFINIR: …], nunca são removidas.\nResponda somente com o documento em Markdown (tabelas no formato | a | b |), sem comentários antes ou depois e sem cercar o documento com \`\`\`.`
    : `# Sua tarefa\nFaça a sua parte da análise conforme o seu papel. Responda em Markdown, com tópicos curtos. Não escreva o documento final: isso é feito pelo último agente.`
  return [
    { role: 'system', content: `${REGRAS}\n\n# Seu papel\n${agente.papel}` },
    { role: 'user', content: `${contexto}\n\n${tarefa}` },
  ]
}

/** Alguns modelos cercam o documento com ```markdown mesmo pedindo para não cercar. */
export function limparDocumento(texto) {
  const m = String(texto).trim().match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i)
  return m ? m[1].trim() : String(texto).trim()
}

/**
 * Roda os agentes a partir de "inicio", reaproveitando as saídas anteriores (para continuar ou refazer só o fim).
 * aoMudar(indice, parcial) recebe { estado: 'rodando' | 'feito' | 'erro' | 'esperando', texto, erro, ... }.
 */
export async function rodarLinha({ processo, valores, material, anexos, saidas: iniciais = [], inicio = 0, chave, modeloPadrao, modelos, sinal, aoMudar }) {
  const saidas = iniciais.slice(0, inicio)
  for (let i = inicio; i < processo.agentes.length; i++) {
    const agente = processo.agentes[i]
    const modelo = agente.modelo || modeloPadrao
    const comeco = Date.now()
    aoMudar(i, { estado: 'rodando', modelo, inicio: comeco })
    try {
      const r = await conversar({
        chave,
        modelo,
        modelos,
        sinal,
        mensagens: mensagensDoAgente({ processo, indice: i, valores, material, anexos, saidas }),
        onEspera: (segundos, motivo) => aoMudar(i, { estado: 'esperando', aviso: `Tentando de novo em ${segundos}s: ${motivo}` }),
      })
      const montador = i === processo.agentes.length - 1
      saidas[i] = { texto: montador ? limparDocumento(r.texto) : r.texto, modelo: r.modelo, entrada: r.entrada, saida: r.saida, ms: Date.now() - comeco }
      aoMudar(i, { estado: 'feito', ...saidas[i], aviso: '' })
    } catch (e) {
      const cancelado = e?.name === 'AbortError'
      aoMudar(i, { estado: cancelado ? 'parado' : 'erro', erro: cancelado ? 'Parado por você.' : e.message, aviso: '' })
      throw e
    }
  }
  return saidas
}

/** Estimativa grosseira de tokens (4 caracteres por token) para avisar antes de estourar o contexto. */
export const tokensAprox = (texto) => Math.ceil(String(texto || '').length / 4)
