import type { Agent, MissionRun } from './types';
import { getRole } from './roles';

const STATUS_LABEL: Record<MissionRun['status'], string> = {
  rodando: 'Em andamento',
  aprovada: '✅ Aprovada pelo líder',
  nao_aprovada: '⚠️ Encerrada sem aprovação (rodadas esgotadas)',
  cancelada: '⏹️ Cancelada',
  erro: '❌ Interrompida por erro',
};

export const money = (usd: number): string => (usd === 0 ? 'grátis' : `US$ ${usd.toFixed(usd < 0.01 ? 4 : 2)}`);
const date = (iso?: string): string => (iso ? new Date(iso).toLocaleString('pt-BR') : '-');
const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Documentação final da missão: equipe, solução, um tópico por agente, decisões e custos. */
export function buildMissionDoc(run: MissionRun, agents: Agent[], leaderModel: string): string {
  const lastReview = run.reviews[run.reviews.length - 1];
  const lines: string[] = [];
  lines.push(`# Relatório da missão`, '', `> ${run.objective.split('\n').join('\n> ')}`, '');
  lines.push(`- **Situação:** ${STATUS_LABEL[run.status]}`);
  lines.push(`- **Rodadas:** ${run.round} de ${run.maxRounds}`);
  lines.push(`- **Início:** ${date(run.startedAt)} · **Fim:** ${date(run.finishedAt)}`);
  lines.push(`- **Custo total estimado:** ${money(run.totalCost)}`);
  if (run.error) lines.push(`- **Observação:** ${run.error}`);
  if (leaderModel === 'demo/simulado') lines.push('- **Modo demonstração:** as respostas foram simuladas; nenhum modelo foi chamado.');
  lines.push('', '## Equipe', '', '| Agente | Função | Modelo | Tarefa | Relatórios | Custo |', '|---|---|---|---|---|---|');
  for (const a of agents) {
    const cost = a.reports.reduce((t, r) => t + r.cost, 0);
    lines.push(`| ${a.name} | ${getRole(a.roleId).title} | \`${a.model}\` | ${cell(a.task)} | ${a.reports.length} | ${money(cost)} |`);
  }
  lines.push(`| Líder | Coordenação e revisão | \`${leaderModel}\` | Avaliar e consolidar | ${run.reviews.length} | ${money(run.reviews.reduce((t, r) => t + r.cost, 0))} |`);

  lines.push('', '## Solução final', '');
  if (lastReview?.approved && lastReview.solution.trim()) lines.push(lastReview.solution.trim());
  else lines.push('_A missão não foi aprovada pelo líder. Abaixo estão os melhores relatórios de cada agente e a última avaliação._', '', lastReview?.analysis ?? '');

  lines.push('', '## Documentação por tópico');
  for (const a of agents) {
    const last = a.reports[a.reports.length - 1];
    lines.push('', `### ${getRole(a.roleId).icon} ${a.name}: ${getRole(a.roleId).title}`, '', `**Tarefa:** ${a.task}`, '');
    lines.push(last ? last.content.replace(/^## /gm, '#### ') : '_Sem relatório._');
  }

  lines.push('', '## Histórico de decisões do líder');
  for (const r of run.reviews) {
    lines.push('', `### Rodada ${r.round}: ${r.approved ? 'aprovada' : 'refazer'}`, '', r.analysis || '_Sem análise._');
    if (!r.approved) {
      for (const e of r.evaluations) {
        const a = agents.find((x) => x.id === e.id);
        if (!a) continue;
        lines.push('', `- **${a.name}** (${e.ok ? 'ok' : 'precisa melhorar'}): ${e.feedback || '-'}`);
        if (e.newPrompt) lines.push(`  - Novo pedido: ${e.newPrompt}`);
      }
    }
  }
  lines.push('', '---', `_Gerado pelo Escritório IA em ${new Date().toLocaleString('pt-BR')}._`);
  return lines.join('\n');
}

/** Documento individual de um agente: todas as rodadas, com pedido, entrega e feedback. */
export function buildAgentDoc(agent: Agent, objective: string): string {
  const role = getRole(agent.roleId);
  const lines = [`# ${role.icon} ${agent.name}: ${role.title}`, '', `- **Modelo:** \`${agent.model}\``, `- **Missão:** ${objective}`, `- **Tarefa:** ${agent.task}`];
  for (const r of agent.reports) {
    lines.push('', `## Rodada ${r.round}`, '', '### Pedido', '', '```', r.prompt, '```', '', '### Relatório', '', r.content.replace(/^## /gm, '#### '));
    const fb = agent.feedback.find((f) => f.round === r.round);
    if (fb) lines.push('', '### Avaliação do líder', '', fb.feedback || '-', '', `**Novo pedido:** ${fb.newPrompt || '-'}`);
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'missao';
