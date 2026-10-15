import type { Agent, Feedback, Report } from './types';
import { getRole } from './roles';

/**
 * Prompts do escritório. O fluxo segue dois padrões conhecidos de sistemas
 * multiagente: orquestrador-trabalhadores (cada agente recebe uma tarefa da
 * missão) e avaliador-otimizador (o líder avalia e pede revisão com
 * feedback e um prompt novo, até aprovar ou acabarem as rodadas).
 */

const MAX_CONTEXT_CHARS = 6000; // corta textos longos para controlar tokens e custo

export const clip = (text: string, max = MAX_CONTEXT_CHARS): string =>
  text.length > max ? `${text.slice(0, max)}\n\n[… texto cortado para economizar tokens …]` : text;

export function workerSystem(agent: Agent): string {
  const role = getRole(agent.roleId);
  return [
    `Você é ${agent.name}, ${role.title} contratado(a) para uma equipe de agentes de IA em um escritório.`,
    role.instructions,
    'Responda SEMPRE em português do Brasil e em Markdown, no formato de relatório de trabalho abaixo, sem texto antes ou depois:',
    '## Resumo',
    '## Trabalho realizado',
    '## Resultado',
    '## Pendências e riscos',
    '## Confiança (0 a 100)',
    'Entregue o resultado completo (não apenas um plano do que faria). Seja específico e prático.',
  ].join('\n');
}

/** Pedido da primeira rodada. */
export function workerFirstPrompt(objective: string, agent: Agent): string {
  return `# Missão da equipe\n${objective}\n\n# Sua tarefa\n${agent.task}\n\nProduza o relatório completo.`;
}

/** Pedido de revisão: inclui o que foi pedido, o que foi entregue, a avaliação e o novo prompt do líder. */
export function workerRetryPrompt(objective: string, agent: Agent, last: Report, fb: Feedback, round: number): string {
  return [
    `# Missão da equipe\n${objective}`,
    `# Sua tarefa original\n${agent.task}`,
    `# Rodada ${round}: o líder pediu para refazer`,
    `## O que foi pedido antes\n${clip(last.prompt, 3000)}`,
    `## O que você entregou\n${clip(last.content)}`,
    `## Avaliação do líder\n${fb.feedback || 'Sem comentários específicos.'}`,
    `## Novo pedido (siga este)\n${fb.newPrompt || 'Melhore o relatório com mais profundidade, exemplos concretos e correção das pendências.'}`,
    'Refaça o relatório completo, incorporando as melhorias pedidas.',
  ].join('\n\n');
}

export function leaderSystem(round: number, maxRounds: number): string {
  return [
    'Você é o(a) LÍDER de uma equipe de agentes de IA. Sua função é ler todos os relatórios, decidir se, juntos, eles resolvem a missão e, se não resolverem, orientar cada agente a refazer.',
    `Esta é a rodada ${round} de no máximo ${maxRounds}.${round >= maxRounds ? ' É a ÚLTIMA rodada: se houver algo aproveitável, aprove e consolide a melhor solução possível, apontando as limitações.' : ''}`,
    'Critérios para aprovar: a missão foi atendida, o conteúdo é correto, específico e utilizável, e não há contradições graves entre os relatórios.',
    'Responda APENAS com um JSON válido (sem Markdown em volta), exatamente neste formato:',
    '{"aprovado": true|false, "analise": "sua avaliação geral em poucas frases", "solucao": "se aprovado: a solução final consolidada em Markdown, organizada em tópicos; se não: vazio", "agentes": [{"id": "id do agente", "ok": true|false, "feedback": "o que está bom e o que falta", "novo_prompt": "um novo pedido completo e autossuficiente para a próxima rodada"}]}',
    'Inclua uma entrada em "agentes" para CADA agente. Escreva tudo em português do Brasil.',
  ].join('\n');
}

export function leaderPrompt(objective: string, agents: Agent[], round: number, maxRounds: number): string {
  const blocks = agents.map((a) => {
    const role = getRole(a.roleId);
    const last = a.reports[a.reports.length - 1];
    return `## Agente ${a.id}: ${a.name} (${role.title}, modelo ${a.model})\nTarefa: ${a.task}\n\nRelatório:\n${clip(last?.content ?? '(sem relatório)')}`;
  });
  return `RODADA: ${round} de ${maxRounds}\n\n# Missão\n${objective}\n\n# Relatórios da equipe\n\n${blocks.join('\n\n---\n\n')}`;
}

export const JSON_RETRY = 'Sua resposta anterior não era um JSON válido. Responda SOMENTE com o JSON no formato pedido, sem nenhum texto antes ou depois.';
