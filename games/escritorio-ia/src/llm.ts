import type { ModelInfo } from './types';

const API = 'https://openrouter.ai/api/v1';
const KEY_STORAGE = 'escritorio-ia.openrouter-key';
const VERIFIER_STORAGE = 'escritorio-ia.pkce-verifier';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface ChatOptions {
  json?: boolean;
  signal?: AbortSignal;
  /** Avisado quando a chamada precisa esperar (limite de pedidos do provedor). */
  onWait?: (seconds: number, reason: string) => void;
}

export type ChatFn = (model: string, messages: ChatMessage[], opts?: ChatOptions) => Promise<ChatResult>;

export class LlmError extends Error {
  constructor(
    message: string,
    readonly fatal: boolean, // true = não adianta tentar de novo (chave inválida, sem crédito)
  ) {
    super(message);
  }
}

/* ---------- Chave e login (OAuth PKCE do OpenRouter) ---------- */

export function getKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Sem armazenamento: a chave vale só enquanto a página estiver aberta.
  }
}

export const KEY_STORAGE_NAME = KEY_STORAGE;

const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** URL desta página do jogo, sem parâmetros (usada como retorno do login). */
export const callbackUrl = (): string => `${location.origin}${location.pathname}`;

/**
 * Abre o login do OpenRouter numa aba nova (o OpenRouter não abre dentro de
 * iframe). A aba volta para o jogo com ?code=..., troca o código pela chave e
 * grava no navegador; esta aba percebe pelo evento `storage`.
 */
export async function startOAuth(): Promise<void> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  localStorage.setItem(VERIFIER_STORAGE, verifier);
  const url = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl())}&code_challenge=${challenge}&code_challenge_method=S256`;
  window.open(url, '_blank', 'noopener');
}

/** Se a página abriu com ?code= (volta do login), troca pela chave. Retorna true se trocou. */
export async function finishOAuthIfNeeded(): Promise<'ok' | 'erro' | null> {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  if (!code) return null;
  history.replaceState(null, '', location.pathname);
  try {
    const verifier = localStorage.getItem(VERIFIER_STORAGE) ?? undefined;
    const res = await fetch(`${API}/auth/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: verifier ? 'S256' : undefined }),
    });
    const data = await res.json();
    if (!res.ok || !data.key) return 'erro';
    setKey(data.key);
    localStorage.removeItem(VERIFIER_STORAGE);
    return 'ok';
  } catch {
    return 'erro';
  }
}

/* ---------- Modelos ---------- */

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API}/models`);
  if (!res.ok) throw new Error('Não foi possível carregar a lista de modelos.');
  const data = (await res.json()) as {
    data: { id: string; name: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }[];
  };
  return data.data
    .map((m) => {
      const promptPrice = Number(m.pricing?.prompt ?? 0) || 0;
      const completionPrice = Number(m.pricing?.completion ?? 0) || 0;
      return {
        id: m.id,
        name: m.name,
        promptPrice: Math.max(0, promptPrice),
        completionPrice: Math.max(0, completionPrice),
        context: m.context_length ?? 0,
        free: m.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0),
      };
    })
    .filter((m) => m.promptPrice >= 0 && !m.id.startsWith('openrouter/auto'))
    .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name));
}

// A lista de modelos gratuitos do OpenRouter muda com frequência, então o padrão é escolhido por regra:
// descarta modelos especializados (código, segurança, áudio, minúsculos) e prefere o maior modelo geral.
const NOT_GENERAL = /safety|guard|code|coder|embed|vision|omni|audio|tts|speech|ocr|-xs-|nano|mini|\b[0-3](?:\.\d+)?b\b/i;

const paramsBillions = (id: string): number => {
  const sizes = [...id.matchAll(/(\d+(?:\.\d+)?)b(?![a-z])/gi)].map((m) => Number(m[1]));
  return sizes.length ? Math.max(...sizes) : 0;
};

export function defaultModel(models: ModelInfo[]): string {
  const free = models.filter((m) => m.free);
  const general = free.filter((m) => !NOT_GENERAL.test(m.id));
  const pool = general.length ? general : free;
  const best = [...pool].sort((a, b) => paramsBillions(b.id) - paramsBillions(a.id) || b.context - a.context)[0];
  return best?.id ?? models[0]?.id ?? 'openrouter/auto';
}

export const DEMO_MODEL = 'demo/simulado';

/* ---------- Chamada ao OpenRouter ---------- */

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Cancelado', 'AbortError'));
    });
  });

export function openRouterChat(apiKey: string): ChatFn {
  return async (model, messages, opts = {}) => {
    const body: Record<string, unknown> = { model, messages, temperature: 0.4 };
    if (opts.json) body.response_format = { type: 'json_object' };

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        signal: opts.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': location.origin,
          'X-Title': 'Escritorio IA',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) throw new LlmError(data.error.message ?? 'Erro do provedor do modelo.', false);
        const text: string = data.choices?.[0]?.message?.content ?? '';
        if (!text.trim()) {
          if (attempt < 2) continue;
          throw new LlmError('O modelo respondeu vazio.', false);
        }
        return {
          text,
          tokensIn: data.usage?.prompt_tokens ?? 0,
          tokensOut: data.usage?.completion_tokens ?? 0,
          model: data.model ?? model,
        };
      }

      // Alguns modelos não aceitam response_format: tenta de novo sem ele.
      if (res.status === 400 && body.response_format && attempt === 0) {
        delete body.response_format;
        continue;
      }
      if (res.status === 401) throw new LlmError('Chave do OpenRouter inválida ou revogada. Conecte de novo na aba Conta.', true);
      if (res.status === 402) throw new LlmError('Sem créditos no OpenRouter para este modelo. Use um modelo gratuito ou adicione créditos.', true);
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        const retryAfter = Number(res.headers.get('retry-after'));
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 8 * 2 ** attempt;
        opts.onWait?.(wait, res.status === 429 ? 'limite de pedidos do modelo' : 'instabilidade do provedor');
        await sleep(wait * 1000, opts.signal);
        continue;
      }
      let message = `Erro ${res.status} ao chamar o modelo ${model}.`;
      try {
        const err = await res.json();
        if (err?.error?.message) message = `${message} ${err.error.message}`;
      } catch {
        // resposta sem JSON
      }
      throw new LlmError(message, res.status === 404);
    }
  };
}

/* ---------- Modo demonstração (sem chave, sem custo) ---------- */

export function demoChat(): ChatFn {
  return async (_model, messages, opts = {}) => {
    await sleep(700 + Math.random() * 900, opts.signal);
    const system = messages[0]?.content ?? '';
    const user = messages[messages.length - 1]?.content ?? '';
    if (system.includes('LÍDER')) {
      const round = Number(/RODADA: (\d+)/.exec(user)?.[1] ?? 1);
      const ids = [...user.matchAll(/## Agente (\w+): ([^(]+)\(/g)].map((m) => ({ id: m[1], name: m[2].trim() }));
      const approved = round >= 2;
      return {
        text: JSON.stringify({
          aprovado: approved,
          analise: approved
            ? 'Os relatórios agora se complementam e respondem à missão com detalhes práticos. Aprovado.'
            : 'Bom começo, mas os relatórios ainda estão genéricos e um pouco desconectados entre si.',
          solucao: approved
            ? `# Solução consolidada (demonstração)\n\n## Visão geral\nA equipe dividiu a missão em frentes complementares.\n\n${ids
                .map((a) => `## Contribuição de ${a.name}\n- Entrega revisada e aprovada na rodada ${round}.`)
                .join('\n\n')}\n\n## Próximos passos\n1. Validar com dados reais.\n2. Executar o plano.`
            : '',
          agentes: ids.map((a, i) => ({
            id: a.id,
            ok: approved || i % 2 === 1,
            feedback: approved ? 'Ótimo trabalho.' : 'Seja mais específico: traga exemplos concretos e números.',
            novo_prompt: approved ? '' : 'Refaça com exemplos concretos, números estimados e conexão com as outras frentes da equipe.',
          })),
        }),
        tokensIn: 0,
        tokensOut: 0,
        model: DEMO_MODEL,
      };
    }
    const task = /# Sua tarefa(?: original)?\n([^\n]+)/.exec(user)?.[1] ?? 'tarefa';
    const retry = user.includes('o líder pediu para refazer');
    return {
      text: [
        '## Resumo',
        `${retry ? 'Versão revisada, com os ajustes pedidos pelo líder. ' : ''}Relatório de demonstração para: ${task}`,
        '## Trabalho realizado',
        '- Análise da missão e da tarefa.\n- Levantamento de opções.\n- Escolha da melhor abordagem.',
        '## Resultado',
        retry ? '| Item | Estimativa |\n|---|---|\n| Prazo | 2 semanas |\n| Custo | R$ 1.500 |' : 'Proposta inicial em alto nível.',
        '## Pendências e riscos',
        retry ? '- Validar números com dados reais.' : '- Falta detalhar números e exemplos.',
        '## Confiança (0 a 100)',
        retry ? '82' : '55',
      ].join('\n\n'),
      tokensIn: 0,
      tokensOut: 0,
      model: DEMO_MODEL,
    };
  };
}
