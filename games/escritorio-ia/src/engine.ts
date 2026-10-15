import type { Agent, Evaluation, LeaderReview, MissionRun, Report, Settings } from './types';
import { LlmError, type ChatFn, type ChatMessage } from './llm';
import { JSON_RETRY, leaderPrompt, leaderSystem, workerFirstPrompt, workerRetryPrompt, workerSystem } from './prompts';

/**
 * Motor da missão (sem Three.js, sem DOM): roda as rodadas de trabalho e
 * revisão até o líder aprovar ou acabarem as rodadas.
 *
 *   rodada N:  cada agente entrega um relatório  →  o líder avalia tudo
 *              aprovado?  sim → documentação final, contratos concluídos (OK)
 *                         não → TODOS refazem, recebendo o pedido anterior,
 *                               o resultado, o feedback e o novo prompt
 */

export interface EngineHooks {
  onAgent(agent: Agent): void;
  onReport(agent: Agent, report: Report): void;
  onReview(review: LeaderReview): void;
  onLog(message: string): void;
  onWait(seconds: number, reason: string): void;
  onLeader(reading: boolean): void;
}

export interface EngineInput {
  run: MissionRun;
  agents: Agent[];
  settings: Settings;
  chat: ChatFn;
  price: (model: string, tokensIn: number, tokensOut: number) => number;
  signal: AbortSignal;
  hooks: EngineHooks;
}

const now = (): string => new Date().toISOString();

const sleep = (seconds: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (seconds <= 0) return resolve();
    const t = setTimeout(resolve, seconds * 1000);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Cancelado', 'AbortError'));
    });
  });

/** Extrai o primeiro objeto JSON de um texto (modelos às vezes cercam com ```json). */
export function parseLeaderJson(text: string, agents: Agent[]): Omit<LeaderReview, 'round' | 'model' | 'cost' | 'at'> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const truthy = (v: unknown): boolean => v === true || v === 'true' || v === 'sim';
  const list = Array.isArray(data.agentes) ? (data.agentes as Record<string, unknown>[]) : [];
  const evaluations: Evaluation[] = agents.map((a) => {
    const e = list.find((x) => String(x.id ?? '').trim() === a.id) ?? list.find((x) => String(x.id ?? '').includes(a.name));
    return {
      id: a.id,
      ok: e ? truthy(e.ok) : false,
      feedback: String(e?.feedback ?? ''),
      newPrompt: String(e?.novo_prompt ?? e?.novoPrompt ?? ''),
    };
  });
  return {
    approved: truthy(data.aprovado),
    analysis: String(data.analise ?? ''),
    solution: String(data.solucao ?? ''),
    evaluations,
  };
}

export async function runMission(input: EngineInput): Promise<MissionRun> {
  const { run, agents, settings, chat, price, signal, hooks } = input;
  const pause = (): Promise<void> => sleep(settings.pauseSeconds, signal);
  const chatOpts = { signal, onWait: hooks.onWait };

  try {
    for (let round = 1; round <= settings.maxRounds; round++) {
      run.round = round;
      hooks.onLog(`▶️ Rodada ${round} de ${settings.maxRounds}`);

      // 1) Cada agente trabalha (um de cada vez, respeitando o limite de pedidos dos modelos gratuitos).
      for (const agent of agents) {
        signal.throwIfAborted();
        const last = agent.reports[agent.reports.length - 1];
        const fb = agent.feedback[agent.feedback.length - 1];
        const prompt = round === 1 || !last || !fb ? workerFirstPrompt(run.objective, agent) : workerRetryPrompt(run.objective, agent, last, fb, round);
        agent.status = round === 1 ? 'trabalhando' : 'refazendo';
        hooks.onAgent(agent);
        hooks.onLog(`${agent.name} começou a ${round === 1 ? 'trabalhar' : 'refazer'}.`);

        const messages: ChatMessage[] = [
          { role: 'system', content: workerSystem(agent) },
          { role: 'user', content: prompt },
        ];
        const res = await chat(agent.model, messages, chatOpts);
        const report: Report = {
          round,
          prompt,
          content: res.text.trim(),
          model: res.model,
          tokensIn: res.tokensIn,
          tokensOut: res.tokensOut,
          cost: price(agent.model, res.tokensIn, res.tokensOut),
          at: now(),
        };
        agent.reports.push(report);
        agent.status = 'entregue';
        run.totalCost += report.cost;
        hooks.onReport(agent, report);
        hooks.onAgent(agent);
        hooks.onLog(`📄 ${agent.name} entregou o relatório da rodada ${round}.`);
        await pause();
      }

      // 2) O líder lê todos os relatórios e decide.
      signal.throwIfAborted();
      hooks.onLog('🧑‍💼 O líder está lendo os relatórios…');
      hooks.onLeader(true);
      const messages: ChatMessage[] = [
        { role: 'system', content: leaderSystem(round, settings.maxRounds) },
        { role: 'user', content: leaderPrompt(run.objective, agents, round, settings.maxRounds) },
      ];
      let res = await chat(settings.leaderModel, messages, { ...chatOpts, json: true });
      let cost = price(settings.leaderModel, res.tokensIn, res.tokensOut);
      let parsed = parseLeaderJson(res.text, agents);
      if (!parsed) {
        hooks.onLog('⚠️ O líder não respondeu no formato esperado. Pedindo de novo…');
        await pause();
        res = await chat(
          settings.leaderModel,
          [...messages, { role: 'assistant', content: res.text }, { role: 'user', content: JSON_RETRY }],
          { ...chatOpts, json: true },
        );
        cost += price(settings.leaderModel, res.tokensIn, res.tokensOut);
        parsed = parseLeaderJson(res.text, agents);
      }
      const review: LeaderReview = {
        round,
        model: res.model,
        cost,
        at: now(),
        ...(parsed ?? {
          approved: false,
          analysis: `O líder não conseguiu responder em JSON. Resposta bruta:\n\n${res.text.slice(0, 1500)}`,
          solution: '',
          evaluations: agents.map((a) => ({ id: a.id, ok: false, feedback: '', newPrompt: '' })),
        }),
      };
      hooks.onLeader(false);
      run.totalCost += cost;
      run.reviews.push(review);
      hooks.onReview(review);

      if (review.approved) {
        hooks.onLog(`✅ Missão aprovada na rodada ${round}!`);
        for (const a of agents) {
          a.status = 'ok';
          hooks.onAgent(a);
        }
        run.status = 'aprovada';
        run.finishedAt = now();
        return run;
      }

      hooks.onLog(`🔁 O líder pediu para todos refazerem. ${review.analysis}`);
      for (const a of agents) {
        const e = review.evaluations.find((x) => x.id === a.id);
        a.feedback.push({ round, ok: e?.ok ?? false, feedback: e?.feedback ?? '', newPrompt: e?.newPrompt ?? '' });
      }
      if (round < settings.maxRounds) await pause();
    }

    hooks.onLog('⏹️ Acabaram as rodadas sem aprovação. Contratos encerrados.');
    for (const a of agents) {
      a.status = 'encerrado';
      hooks.onAgent(a);
    }
    run.status = 'nao_aprovada';
    run.finishedAt = now();
    return run;
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    run.status = aborted ? 'cancelada' : 'erro';
    run.error = aborted ? 'Missão cancelada por você.' : error instanceof Error ? error.message : String(error);
    run.finishedAt = now();
    hooks.onLog(aborted ? '⏹️ Missão cancelada.' : `❌ ${run.error}${error instanceof LlmError && error.fatal ? '' : ' Você pode tentar de novo.'}`);
    for (const a of agents) {
      if (a.status === 'trabalhando' || a.status === 'refazendo') a.status = aborted ? 'aguardando' : 'erro';
      hooks.onAgent(a);
    }
    return run;
  } finally {
    hooks.onLeader(false);
  }
}
