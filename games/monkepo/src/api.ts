// Cliente do servidor (Apps Script) do MonKePo: login, carregar/salvar monstros e ranking.

// URL do App da Web publicado (termina em /exec). Definida no build: VITE_MONKEPO_API.
const API_URL: string = import.meta.env.VITE_MONKEPO_API ?? '';
const TOKEN_KEY = 'monkepo.sessao';

export interface ApiReply {
  ok: boolean;
  codigo?: string;
  erro?: string;
  [key: string]: unknown;
}

export interface Session {
  usuario: string;
  token: string;
}

let session: Session | null = null;
try {
  session = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null');
} catch {
  session = null;
}

function storeSession(s: Session | null): void {
  session = s;
  try {
    if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* navegador sem armazenamento: a sessão vale só nesta aba */
  }
}

export const currentSession = (): Session | null => session;

const toB64Url = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** A senha nunca sai do navegador: vai só o SHA-256 dela misturado com o usuário. */
export async function passwordHash(usuario: string, senha: string): Promise<string> {
  const data = new TextEncoder().encode(`monkepo:v1:${usuario.toLowerCase()}:${senha}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function call(body: Record<string, unknown>): Promise<ApiReply> {
  if (!API_URL) return { ok: false, codigo: 'config', erro: 'Servidor do jogo não configurado' };
  let lastError = 'Sem conexão com o servidor';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // text/plain evita a checagem de CORS (preflight), que o Apps Script não responde.
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
      const reply = (await res.json()) as ApiReply;
      if (typeof reply.token === 'string' && session) storeSession({ ...session, token: reply.token });
      if (reply.codigo === 'sessao') storeSession(null);
      return reply;
    } catch (e) {
      lastError = (e as Error).message || lastError;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  return { ok: false, codigo: 'rede', erro: lastError };
}

const authorized = (): string => `Bearer ${session?.token ?? ''}`;

/** Entra; se o usuário não existir, a conta é criada na hora. */
export async function entrar(usuario: string, senha: string): Promise<ApiReply> {
  const user = usuario.trim().toLowerCase();
  const credential = toB64Url(`${user}:${await passwordHash(user, senha)}`);
  const reply = await call({ acao: 'entrar', authorization: `Bearer ${credential}` });
  if (reply.ok && typeof reply.token === 'string') storeSession({ usuario: user, token: reply.token });
  return reply;
}

export const carregar = (): Promise<ApiReply> => call({ acao: 'carregar', authorization: authorized() });
export const salvar = (rev: number, monstros: string): Promise<ApiReply> => call({ acao: 'salvar', authorization: authorized(), rev, monstros });
export const ranking = (): Promise<ApiReply> => call({ acao: 'ranking' });

export async function sair(): Promise<void> {
  if (session) await call({ acao: 'sair', authorization: authorized() });
  storeSession(null);
}
