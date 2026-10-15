// Servidor do MonKePo no Google Apps Script: login, salvamento dos monstros e ranking.
// Tudo chega por POST (texto JSON). O Apps Script não lê cabeçalhos, então o "Bearer" vem no corpo.
//
// Rotas (campo "acao"):
//   entrar   authorization: "Bearer " + base64url(usuario + ":" + sha256 da senha)  -> cria a conta se não existir
//   carregar authorization: "Bearer " + token da sessão
//   salvar   authorization + rev + monstros
//   ranking  público
//   sair     encerra todas as sessões do usuário

import { decodeMonsters, validateChange, bestMonster, MAX_SAVE_CHARS } from '../shared/monster';
import { getSpecies } from '../shared/data';

const SHEET_PLAYERS = 'jogadores';
const SHEET_LOG = 'log';
const COLS = ['id', 'usuario', 'hash', 'sal', 'liberado', 'versao_token', 'criado_em', 'ultimo_acesso', 'rev', 'monstros', 'qtd', 'poder', 'melhor', 'salvo_em'] as const;
type Col = (typeof COLS)[number];
const C = Object.fromEntries(COLS.map((name, i) => [name, i])) as Record<Col, number>;

const TOKEN_DAYS = 7;
const HASH_ROUNDS = 200;
const MAX_BODY = 40000;
const MAX_LOGIN_FAILS = 5;
const MAX_NEW_ACCOUNTS_PER_HOUR = 60;
const MAX_SAVES_PER_MINUTE = 6;
const USER_RE = /^[a-z0-9_]{3,16}$/;
const CLIENT_HASH_RE = /^[0-9a-f]{64}$/;

interface Reply {
  ok: boolean;
  [key: string]: unknown;
}
class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/* ---------- Utilitários ---------- */

const now = (): number => Date.now();
const hex = (bytes: number[]): string => bytes.map((b) => (b & 0xff).toString(16).padStart(2, '0')).join('');
const b64 = (data: string | number[]): string => Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
function unb64(s: string): string {
  const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString();
}

/** Comparação em tempo constante (não vaza onde a diferença está). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function secret(name: 'SEGREDO' | 'PIMENTA'): string {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new ApiError('config', 'Servidor não configurado: rode a função configurar()');
  return value;
}

/** Hash guardado na planilha: o hash do navegador misturado com sal + pimenta, várias rodadas. */
function storedHash(clientHash: string, salt: string): string {
  const pepper = secret('PIMENTA');
  let h = `${salt}:${clientHash}`;
  for (let i = 0; i < HASH_ROUNDS; i++) h = hex(Utilities.computeHmacSha256Signature(h, pepper));
  return h;
}

function makeToken(id: string, version: number): string {
  const payload = b64(`${id}.${now() + TOKEN_DAYS * 86400000}.${version}`);
  return `${payload}.${b64(Utilities.computeHmacSha256Signature(payload, secret('SEGREDO')))}`;
}

function readToken(token: string): { id: string; exp: number; version: number } {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) throw new ApiError('sessao', 'Sessão inválida, entre de novo');
  const expected = b64(Utilities.computeHmacSha256Signature(payload, secret('SEGREDO')));
  if (!safeEqual(sig, expected)) throw new ApiError('sessao', 'Sessão inválida, entre de novo');
  const [id, exp, version] = unb64(payload).split('.');
  if (!(Number(exp) > now())) throw new ApiError('sessao', 'Sessão expirada, entre de novo');
  return { id, exp: Number(exp), version: Number(version) };
}

function bearer(body: Record<string, unknown>): string {
  const auth = String(body.authorization ?? '');
  if (!auth.startsWith('Bearer ')) throw new ApiError('sessao', 'Faltou o Bearer');
  return auth.slice(7).trim();
}

/** Limite simples por chave no cache do script. */
function hit(key: string, limit: number, seconds: number): boolean {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get(key) ?? 0) + 1;
  cache.put(key, String(count), seconds);
  return count <= limit;
}

/* ---------- Planilha ---------- */

function sheet(name: string): GasSheet {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new ApiError('config', 'Servidor não configurado: rode a função configurar()');
  return s;
}

interface PlayerRow {
  row: number; // linha na planilha
  v: string[];
}

function findPlayer(col: 'id' | 'usuario', value: string): PlayerRow | null {
  const s = sheet(SHEET_PLAYERS);
  const last = s.getLastRow();
  if (last < 2) return null;
  const column = s.getRange(2, C[col] + 1, last - 1, 1).getValues();
  const i = column.findIndex((r) => String(r[0]) === value);
  if (i < 0) return null;
  const row = i + 2;
  const v = s.getRange(row, 1, 1, COLS.length).getValues()[0].map((x) => String(x));
  return { row, v };
}

function writePlayer(p: PlayerRow): void {
  sheet(SHEET_PLAYERS).getRange(p.row, 1, 1, COLS.length).setValues([p.v]);
}

function log(user: string, action: string, reason: string): void {
  try {
    const s = sheet(SHEET_LOG);
    s.appendRow([new Date().toISOString(), user, action, reason.slice(0, 300)]);
    if (s.getLastRow() > 2000) s.deleteRows(2, 500); // guarda só as últimas
  } catch {
    /* log nunca derruba a resposta */
  }
}

function withLock<T>(fn: () => T): T {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Sessão válida + jogador liberado. */
function authenticated(body: Record<string, unknown>): PlayerRow {
  const token = readToken(bearer(body));
  const p = findPlayer('id', token.id);
  if (!p || Number(p.v[C.versao_token]) !== token.version) throw new ApiError('sessao', 'Sessão encerrada, entre de novo');
  if (p.v[C.liberado].toUpperCase() !== 'SIM') throw new ApiError('bloqueado', 'Conta bloqueada');
  return p;
}

/** Renova o token quando faltam menos de 2 dias para vencer. */
function maybeRenew(body: Record<string, unknown>, p: PlayerRow): string | undefined {
  const { exp } = readToken(bearer(body));
  return exp - now() < 2 * 86400000 ? makeToken(p.v[C.id], Number(p.v[C.versao_token])) : undefined;
}

/* ---------- Rotas ---------- */

function enter(body: Record<string, unknown>): Reply {
  let decoded = '';
  try {
    decoded = unb64(bearer(body));
  } catch {
    throw new ApiError('login', 'Login inválido');
  }
  const sep = decoded.indexOf(':');
  const user = decoded.slice(0, sep).toLowerCase();
  const clientHash = decoded.slice(sep + 1);
  if (sep < 0 || !USER_RE.test(user)) throw new ApiError('login', 'Usuário deve ter 3 a 16 letras minúsculas, números ou _');
  if (!CLIENT_HASH_RE.test(clientHash)) throw new ApiError('login', 'Login inválido');
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get(`falhas:${user}`) ?? 0);
  if (fails >= MAX_LOGIN_FAILS) throw new ApiError('limite', 'Muitas tentativas. Aguarde 15 minutos.');

  return withLock(() => {
    let p = findPlayer('usuario', user);
    let created = false;
    if (!p) {
      if (!hit(`novos:${new Date().toISOString().slice(0, 13)}`, MAX_NEW_ACCOUNTS_PER_HOUR, 3600)) {
        throw new ApiError('limite', 'Muitos cadastros agora. Tente mais tarde.');
      }
      const salt = Utilities.getUuid();
      const iso = new Date().toISOString();
      const v = COLS.map(() => '');
      v[C.id] = Utilities.getUuid();
      v[C.usuario] = user;
      v[C.hash] = storedHash(clientHash, salt);
      v[C.sal] = salt;
      v[C.liberado] = 'SIM';
      v[C.versao_token] = '1';
      v[C.criado_em] = iso;
      v[C.ultimo_acesso] = iso;
      v[C.rev] = '0';
      v[C.qtd] = '0';
      v[C.poder] = '0';
      v[C.salvo_em] = iso;
      sheet(SHEET_PLAYERS).appendRow(v);
      p = findPlayer('id', v[C.id]);
      created = true;
      if (!p) throw new ApiError('interno', 'Falha ao criar a conta');
    } else if (!safeEqual(storedHash(clientHash, p.v[C.sal]), p.v[C.hash])) {
      cache.put(`falhas:${user}`, String(fails + 1), 900);
      log(user, 'entrar', 'senha incorreta');
      throw new ApiError('login', 'Senha incorreta (ou esse usuário já é de outra pessoa)');
    }
    if (p.v[C.liberado].toUpperCase() !== 'SIM') throw new ApiError('bloqueado', 'Conta bloqueada');
    cache.remove(`falhas:${user}`);
    p.v[C.ultimo_acesso] = new Date().toISOString();
    writePlayer(p);
    return {
      ok: true,
      novo: created,
      usuario: user,
      token: makeToken(p.v[C.id], Number(p.v[C.versao_token])),
      rev: Number(p.v[C.rev]),
      monstros: p.v[C.monstros],
    };
  });
}

function load(body: Record<string, unknown>): Reply {
  const p = authenticated(body);
  return { ok: true, usuario: p.v[C.usuario], rev: Number(p.v[C.rev]), monstros: p.v[C.monstros], token: maybeRenew(body, p) };
}

function save(body: Record<string, unknown>): Reply {
  const first = authenticated(body);
  const user = first.v[C.usuario];
  if (!hit(`salvar:${first.v[C.id]}`, MAX_SAVES_PER_MINUTE, 60)) throw new ApiError('limite', 'Salvando rápido demais');
  const data = String(body.monstros ?? '');
  if (data.length > MAX_SAVE_CHARS) throw new ApiError('invalido', 'Save grande demais');
  const next = decodeMonsters(data);
  if (!next) {
    log(user, 'salvar', 'formato inválido');
    throw new ApiError('invalido', 'Formato do save inválido');
  }

  return withLock(() => {
    const p = findPlayer('id', first.v[C.id]);
    if (!p) throw new ApiError('sessao', 'Conta não encontrada');
    const rev = Number(p.v[C.rev]);
    if (Number(body.rev) !== rev) {
      throw new ApiError('conflito', 'Save desatualizado: outro aparelho salvou antes', { rev, monstros: p.v[C.monstros] });
    }
    const prev = decodeMonsters(p.v[C.monstros]) ?? [];
    const minutes = (now() - Date.parse(p.v[C.salvo_em] || p.v[C.criado_em])) / 60000;
    const err = validateChange(prev, next, { minutes, firstSave: rev === 0 });
    if (err) {
      log(user, 'salvar', err);
      throw new ApiError('invalido', `Save recusado: ${err}`);
    }
    const best = bestMonster(next);
    p.v[C.rev] = String(rev + 1);
    p.v[C.monstros] = data;
    p.v[C.qtd] = String(next.length);
    p.v[C.poder] = String(best?.power ?? 0);
    p.v[C.melhor] = best ? `${best.monster.nick || getSpecies(best.monster.sp)?.nome} Nv.${best.monster.lv}` : '';
    p.v[C.salvo_em] = new Date().toISOString();
    writePlayer(p);
    CacheService.getScriptCache().remove('ranking');
    return { ok: true, rev: rev + 1, token: maybeRenew(body, p) };
  });
}

function ranking(): Reply {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('ranking');
  if (cached) return { ok: true, ranking: JSON.parse(cached) };
  const s = sheet(SHEET_PLAYERS);
  const last = s.getLastRow();
  const rows = last < 2 ? [] : s.getRange(2, 1, last - 1, COLS.length).getValues();
  const list = rows
    .filter((r) => String(r[C.liberado]).toUpperCase() === 'SIM' && Number(r[C.poder]) > 0)
    .map((r) => ({ usuario: String(r[C.usuario]), poder: Number(r[C.poder]), monstro: String(r[C.melhor]) }))
    .sort((a, b) => b.poder - a.poder)
    .slice(0, 20);
  cache.put('ranking', JSON.stringify(list), 60);
  return { ok: true, ranking: list };
}

function logout(body: Record<string, unknown>): Reply {
  const first = authenticated(body);
  return withLock(() => {
    const p = findPlayer('id', first.v[C.id]);
    if (!p) return { ok: true };
    p.v[C.versao_token] = String(Number(p.v[C.versao_token]) + 1);
    writePlayer(p);
    return { ok: true };
  });
}

/* ---------- Entradas do Apps Script ---------- */

export function handle(raw: string): Reply {
  try {
    if (raw.length > MAX_BODY) throw new ApiError('invalido', 'Pedido grande demais');
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new ApiError('invalido', 'JSON inválido');
    }
    if (!body || typeof body !== 'object') throw new ApiError('invalido', 'JSON inválido');
    switch (body.acao) {
      case 'entrar':
        return enter(body);
      case 'carregar':
        return load(body);
      case 'salvar':
        return save(body);
      case 'ranking':
        return ranking();
      case 'sair':
        return logout(body);
      default:
        throw new ApiError('invalido', 'Ação desconhecida');
    }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, codigo: e.code, erro: e.message, ...e.extra };
    log('-', 'erro', String((e as Error)?.stack ?? e));
    return { ok: false, codigo: 'interno', erro: 'Erro interno, tente de novo' };
  }
}

export function doPost(e: GasPostEvent): GasTextOutput {
  const reply = handle(e?.postData?.contents ?? '');
  return ContentService.createTextOutput(JSON.stringify(reply)).setMimeType(ContentService.MimeType.JSON);
}

export function doGet(): GasTextOutput {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, jogo: 'MonKePo' })).setMimeType(ContentService.MimeType.JSON);
}

/** Rode uma vez no editor: cria as abas e gera as chaves secretas. */
export function configurar(): string {
  const props = PropertiesService.getScriptProperties();
  for (const key of ['SEGREDO', 'PIMENTA']) {
    if (!props.getProperty(key)) props.setProperty(key, Utilities.getUuid() + Utilities.getUuid());
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setup = (name: string, header: readonly string[]): void => {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    // Tudo como texto, para a planilha não transformar dados em número ou data.
    s.getRange(1, 1, s.getMaxRows(), header.length).setNumberFormat('@');
    s.getRange(1, 1, 1, header.length).setValues([[...header]]);
    s.setFrozenRows(1);
  };
  setup(SHEET_PLAYERS, COLS);
  setup(SHEET_LOG, ['data', 'usuario', 'acao', 'motivo']);
  return 'MonKePo configurado. Agora publique como App da Web.';
}
