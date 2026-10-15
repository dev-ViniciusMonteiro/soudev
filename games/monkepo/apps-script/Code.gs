// MonKePo: servidor no Google Apps Script. ARQUIVO GERADO, não edite aqui.
// Fonte: games/monkepo/server e games/monkepo/shared (npm run build:monkepo-script).
"use strict";
var MonKePo = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // games/monkepo/server/index.ts
  var server_exports = {};
  __export(server_exports, {
    configurar: () => configurar,
    doGet: () => doGet,
    doPost: () => doPost,
    handle: () => handle
  });

  // games/monkepo/shared/data.ts
  var NATURE_STAT_ORDER = [1, 2, 5, 3, 4];
  function natureMultipliers(nature) {
    const mult = [1, 1, 1, 1, 1, 1];
    const up = Math.floor(nature / 5);
    const down = nature % 5;
    if (up !== down) {
      mult[NATURE_STAT_ORDER[up]] = 1.1;
      mult[NATURE_STAT_ORDER[down]] = 0.9;
    }
    return mult;
  }
  function expForLevel(growth, n) {
    if (n <= 1) return 0;
    const c = n ** 3;
    switch (growth) {
      case "erratica":
        if (n <= 50) return Math.floor(c * (100 - n) / 50);
        if (n <= 68) return Math.floor(c * (150 - n) / 100);
        if (n <= 98) return Math.floor(c * Math.floor((1911 - 10 * n) / 3) / 500);
        return Math.floor(c * (160 - n) / 100);
      case "rapida":
        return Math.floor(4 * c / 5);
      case "media-rapida":
        return c;
      case "media-lenta":
        return Math.floor(6 * c / 5 - 15 * n * n + 100 * n - 140);
      case "lenta":
        return Math.floor(5 * c / 4);
      case "flutuante":
        if (n <= 15) return Math.floor(c * (Math.floor((n + 1) / 3) + 24) / 50);
        if (n <= 36) return Math.floor(c * (n + 14) / 50);
        return Math.floor(c * (Math.floor(n / 2) + 32) / 50);
    }
  }
  var MOVES = [
    { id: 1, nome: "Investida", tipo: "Normal", poder: 35, precisao: 95, pp: 35 },
    { id: 2, nome: "Arranhão", tipo: "Normal", poder: 40, precisao: 100, pp: 35 },
    { id: 3, nome: "Rosnado", tipo: "Normal", poder: 0, precisao: 100, pp: 40, efeito: "ataque-alvo-1" },
    { id: 4, nome: "Olhar Feroz", tipo: "Normal", poder: 0, precisao: 100, pp: 30, efeito: "defesa-alvo-1" },
    { id: 5, nome: "Ataque Rápido", tipo: "Normal", poder: 40, precisao: 100, pp: 30, prioridade: 1 },
    { id: 6, nome: "Absorver", tipo: "Planta", poder: 20, precisao: 100, pp: 20, efeito: "drena-50" },
    { id: 7, nome: "Folha Cortante", tipo: "Planta", poder: 55, precisao: 95, pp: 25, efeito: "critico-alto" },
    { id: 8, nome: "Brasa", tipo: "Fogo", poder: 40, precisao: 100, pp: 25, efeito: "queima-10" },
    { id: 9, nome: "Roda de Fogo", tipo: "Fogo", poder: 60, precisao: 100, pp: 25, efeito: "queima-10" },
    { id: 10, nome: "Jato d'Água", tipo: "Água", poder: 40, precisao: 100, pp: 25 },
    { id: 11, nome: "Bolhas", tipo: "Água", poder: 20, precisao: 100, pp: 30, efeito: "velocidade-alvo-1-10" },
    { id: 12, nome: "Areia nos Olhos", tipo: "Terra", poder: 0, precisao: 100, pp: 15, efeito: "precisao-alvo-1" },
    { id: 13, nome: "Rajada", tipo: "Voador", poder: 40, precisao: 100, pp: 35 },
    { id: 14, nome: "Bicada", tipo: "Voador", poder: 35, precisao: 100, pp: 35 },
    { id: 15, nome: "Mordida", tipo: "Sombrio", poder: 60, precisao: 100, pp: 25, efeito: "recua-30" },
    { id: 16, nome: "Choque", tipo: "Elétrico", poder: 40, precisao: 100, pp: 30, efeito: "paralisa-10" },
    { id: 17, nome: "Golpe de Karatê", tipo: "Lutador", poder: 50, precisao: 100, pp: 25, efeito: "critico-alto" },
    { id: 18, nome: "Tiro de Lama", tipo: "Terra", poder: 55, precisao: 95, pp: 15, efeito: "velocidade-alvo-1" }
  ];
  var SPECIES = [
    { id: 1, nome: "Folhito", tipos: ["Planta"], base: [45, 49, 49, 65, 65, 45], crescimento: "media-lenta", captura: 45, expBase: 64, femea: 31, evolui: { para: 2, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 6], [13, 7]] },
    { id: 2, nome: "Folhudo", tipos: ["Planta"], base: [60, 62, 63, 80, 80, 60], crescimento: "media-lenta", captura: 45, expBase: 141, femea: 31, evolui: { para: 3, nivel: 36 }, golpes: [[1, 1], [1, 6], [13, 7], [22, 18]] },
    { id: 3, nome: "Florestor", tipos: ["Planta", "Terra"], base: [80, 92, 88, 100, 95, 75], crescimento: "media-lenta", captura: 45, expBase: 208, femea: 31, golpes: [[1, 7], [1, 18]] },
    { id: 4, nome: "Brasito", tipos: ["Fogo"], base: [44, 58, 42, 62, 48, 66], crescimento: "media-lenta", captura: 45, expBase: 65, femea: 31, evolui: { para: 5, nivel: 16 }, golpes: [[1, 2], [1, 3], [7, 8], [16, 9]] },
    { id: 5, nome: "Brasão", tipos: ["Fogo", "Lutador"], base: [60, 80, 58, 78, 58, 76], crescimento: "media-lenta", captura: 45, expBase: 142, femea: 31, evolui: { para: 6, nivel: 36 }, golpes: [[1, 2], [1, 8], [16, 9], [20, 17]] },
    { id: 6, nome: "Vulcanor", tipos: ["Fogo", "Lutador"], base: [78, 112, 72, 100, 72, 96], crescimento: "media-lenta", captura: 45, expBase: 209, femea: 31, golpes: [[1, 9], [1, 17]] },
    { id: 7, nome: "Gotim", tipos: ["Água"], base: [50, 60, 50, 52, 50, 48], crescimento: "media-lenta", captura: 45, expBase: 65, femea: 31, evolui: { para: 8, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 10], [12, 12]] },
    { id: 8, nome: "Marolão", tipos: ["Água", "Terra"], base: [70, 85, 70, 62, 70, 50], crescimento: "media-lenta", captura: 45, expBase: 143, femea: 31, evolui: { para: 9, nivel: 36 }, golpes: [[1, 1], [1, 10], [16, 18], [20, 11]] },
    { id: 9, nome: "Tsunamor", tipos: ["Água", "Terra"], base: [100, 110, 90, 85, 90, 60], crescimento: "media-lenta", captura: 45, expBase: 210, femea: 31, golpes: [[1, 10], [1, 18]] },
    { id: 10, nome: "Ratiz", tipos: ["Normal"], base: [38, 30, 41, 30, 41, 60], crescimento: "media-rapida", captura: 255, expBase: 48, femea: 127, evolui: { para: 11, nivel: 20 }, golpes: [[1, 1], [1, 4], [5, 5], [13, 15]] },
    { id: 11, nome: "Ratazão", tipos: ["Normal"], base: [78, 70, 61, 50, 61, 100], crescimento: "media-rapida", captura: 90, expBase: 128, femea: 127, golpes: [[1, 5], [1, 15]] },
    { id: 12, nome: "Piupiu", tipos: ["Normal", "Voador"], base: [40, 55, 30, 30, 30, 85], crescimento: "media-lenta", captura: 200, expBase: 59, femea: 127, evolui: { para: 13, nivel: 22 }, golpes: [[1, 14], [1, 3], [8, 5], [15, 13]] },
    { id: 13, nome: "Gaviano", tipos: ["Normal", "Voador"], base: [60, 85, 60, 50, 50, 125], crescimento: "media-lenta", captura: 45, expBase: 162, femea: 127, golpes: [[1, 13], [1, 5]] }
  ];
  var STARTERS = [1, 4, 7];
  var getSpecies = (id) => SPECIES.find((s) => s.id === id);
  var getMove = (id) => MOVES.find((m) => m.id === id);
  function evolvesInto(from, to) {
    let s = getSpecies(from);
    for (let i = 0; (s == null ? void 0 : s.evolui) && i < 5; i++) {
      if (s.evolui.para === to) return true;
      s = getSpecies(s.evolui.para);
    }
    return false;
  }

  // games/monkepo/shared/monster.ts
  var MAX_MONSTERS = 240;
  var MAX_LEVEL = 100;
  var MAX_WILD_LEVEL = 60;
  var MAX_EV = 255;
  var MAX_EV_TOTAL = 510;
  var MAX_SAVE_CHARS = 3e4;
  var NICK_RE = /^[\p{L}\p{N} ]{1,12}$/u;
  var UID_RE = /^[0-9a-z]{8}$/;
  var fromB36 = (s) => /^[0-9a-z]+$/.test(s) ? parseInt(s, 36) : NaN;
  function decodeMonster(s) {
    const p = s.split(".");
    if (p.length < 8 || p.length > 9) return null;
    const [uid, sp, lv, xp, pid, ivs, evs, moves, nick] = p;
    const ivBits = fromB36(ivs);
    let evList;
    if (evs === "0") evList = [0, 0, 0, 0, 0, 0];
    else if (/^[0-9a-f]{12}$/.test(evs)) evList = Array.from({ length: 6 }, (_, i) => parseInt(evs.slice(i * 2, i * 2 + 2), 16));
    else return null;
    const m = {
      uid,
      sp: fromB36(sp),
      lv: fromB36(lv),
      xp: fromB36(xp),
      pid: fromB36(pid),
      ivs: Array.from({ length: 6 }, (_, i) => Math.floor(ivBits / 2 ** (5 * i)) % 32),
      evs: evList,
      moves: moves.split("-").map(fromB36)
    };
    if (nick !== void 0) m.nick = nick;
    if (!Number.isFinite(ivBits) || ivBits >= 2 ** 30) return null;
    return m;
  }
  function decodeMonsters(s) {
    if (s === "") return [];
    const list = [];
    for (const part of s.split(",")) {
      const m = decodeMonster(part);
      if (!m) return null;
      list.push(m);
    }
    return list;
  }
  var natureOf = (m) => (m.pid >>> 0) % 25;
  function statsOf(m) {
    const s = getSpecies(m.sp);
    if (!s) return [0, 0, 0, 0, 0, 0];
    const mult = natureMultipliers(natureOf(m));
    return s.base.map((b, i) => {
      const core = Math.floor((2 * b + m.ivs[i] + Math.floor(m.evs[i] / 4)) * m.lv / 100);
      return i === 0 ? core + m.lv + 10 : Math.floor((core + 5) * mult[i]);
    });
  }
  var powerOf = (m) => statsOf(m).reduce((a, b) => a + b, 0);
  function learnableMoves(sp, lv) {
    const allowed = /* @__PURE__ */ new Set();
    for (const s of SPECIES) {
      if (s.id !== sp && !evolvesInto(s.id, sp)) continue;
      for (const [level, move] of s.golpes) if (level <= lv) allowed.add(move);
    }
    return allowed;
  }
  function validateMonster(m) {
    const s = getSpecies(m.sp);
    if (!UID_RE.test(m.uid)) return "uid inválido";
    if (!s) return "espécie inexistente";
    if (!Number.isInteger(m.lv) || m.lv < 1 || m.lv > MAX_LEVEL) return "nível inválido";
    const min = expForLevel(s.crescimento, m.lv);
    const max = m.lv === MAX_LEVEL ? min : expForLevel(s.crescimento, m.lv + 1) - 1;
    if (!Number.isInteger(m.xp) || m.xp < min || m.xp > max) return "experiência não bate com o nível";
    if (!Number.isInteger(m.pid) || m.pid < 0 || m.pid > 4294967295) return "personalidade inválida";
    if (m.ivs.length !== 6 || m.ivs.some((v) => !Number.isInteger(v) || v < 0 || v > 31)) return "IVs inválidos";
    if (m.evs.length !== 6 || m.evs.some((v) => !Number.isInteger(v) || v < 0 || v > MAX_EV)) return "EVs inválidos";
    if (m.evs.reduce((a, b) => a + b, 0) > MAX_EV_TOTAL) return "EVs acima do total";
    if (m.moves.length < 1 || m.moves.length > 4 || new Set(m.moves).size !== m.moves.length) return "golpes inválidos";
    const allowed = learnableMoves(m.sp, m.lv);
    if (m.moves.some((id) => !getMove(id) || !allowed.has(id))) return "golpe que a espécie não aprende";
    if (m.nick !== void 0 && !NICK_RE.test(m.nick)) return "apelido inválido";
    return null;
  }
  function validateChange(prev, next, limits) {
    if (next.length > MAX_MONSTERS) return "monstros demais";
    const seen = /* @__PURE__ */ new Set();
    for (const m of next) {
      if (seen.has(m.uid)) return "uid repetido";
      seen.add(m.uid);
      const err = validateMonster(m);
      if (err) return `${m.uid}: ${err}`;
    }
    const before = new Map(prev.map((m) => [m.uid, m]));
    let newOnes = 0;
    let levelsGained = 0;
    for (const m of next) {
      const old = before.get(m.uid);
      if (!old) {
        newOnes++;
        if (m.lv > MAX_WILD_LEVEL) return `${m.uid}: monstro novo com nível alto demais`;
        continue;
      }
      if (old.sp !== m.sp && !evolvesInto(old.sp, m.sp)) return `${m.uid}: mudou de espécie`;
      if (m.lv < old.lv || m.xp < old.xp) return `${m.uid}: perdeu nível`;
      if (old.pid !== m.pid || old.ivs.some((v, i) => v !== m.ivs[i])) return `${m.uid}: dados fixos alterados`;
      levelsGained += m.lv - old.lv;
    }
    if (limits.firstSave && next.some((m) => !before.has(m.uid) && (!STARTERS.includes(m.sp) || m.lv !== 5))) return "o primeiro monstro deve ser um inicial no nível 5";
    const minutes = Math.max(0, limits.minutes);
    const maxNew = limits.firstSave ? 1 : 3 + Math.floor(minutes * 2);
    if (newOnes > maxNew) return "monstros novos demais para o tempo jogado";
    if (levelsGained > 10 + Math.floor(minutes * 6)) return "níveis demais para o tempo jogado";
    return null;
  }
  function bestMonster(list) {
    let best = null;
    for (const m of list) {
      const power = powerOf(m);
      if (!best || power > best.power) best = { monster: m, power };
    }
    return best;
  }

  // games/monkepo/server/index.ts
  var SHEET_PLAYERS = "jogadores";
  var SHEET_LOG = "log";
  var COLS = ["id", "usuario", "hash", "sal", "liberado", "versao_token", "criado_em", "ultimo_acesso", "rev", "monstros", "qtd", "poder", "melhor", "salvo_em"];
  var C = Object.fromEntries(COLS.map((name, i) => [name, i]));
  var TOKEN_DAYS = 7;
  var HASH_ROUNDS = 200;
  var MAX_BODY = 4e4;
  var MAX_LOGIN_FAILS = 5;
  var MAX_NEW_ACCOUNTS_PER_HOUR = 60;
  var MAX_SAVES_PER_MINUTE = 6;
  var USER_RE = /^[a-z0-9_]{3,16}$/;
  var CLIENT_HASH_RE = /^[0-9a-f]{64}$/;
  var ApiError = class extends Error {
    constructor(code, message, extra = {}) {
      super(message);
      this.code = code;
      this.extra = extra;
    }
  };
  var now = () => Date.now();
  var hex = (bytes) => bytes.map((b) => (b & 255).toString(16).padStart(2, "0")).join("");
  var b64 = (data) => Utilities.base64EncodeWebSafe(data).replace(/=+$/, "");
  function unb64(s) {
    const padded = s + "=".repeat((4 - s.length % 4) % 4);
    return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString();
  }
  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }
  function secret(name) {
    const value = PropertiesService.getScriptProperties().getProperty(name);
    if (!value) throw new ApiError("config", "Servidor não configurado: rode a função configurar()");
    return value;
  }
  function storedHash(clientHash, salt) {
    const pepper = secret("PIMENTA");
    let h = `${salt}:${clientHash}`;
    for (let i = 0; i < HASH_ROUNDS; i++) h = hex(Utilities.computeHmacSha256Signature(h, pepper));
    return h;
  }
  function makeToken(id, version) {
    const payload = b64(`${id}.${now() + TOKEN_DAYS * 864e5}.${version}`);
    return `${payload}.${b64(Utilities.computeHmacSha256Signature(payload, secret("SEGREDO")))}`;
  }
  function readToken(token) {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) throw new ApiError("sessao", "Sessão inválida, entre de novo");
    const expected = b64(Utilities.computeHmacSha256Signature(payload, secret("SEGREDO")));
    if (!safeEqual(sig, expected)) throw new ApiError("sessao", "Sessão inválida, entre de novo");
    const [id, exp, version] = unb64(payload).split(".");
    if (!(Number(exp) > now())) throw new ApiError("sessao", "Sessão expirada, entre de novo");
    return { id, exp: Number(exp), version: Number(version) };
  }
  function bearer(body) {
    var _a;
    const auth = String((_a = body.authorization) != null ? _a : "");
    if (!auth.startsWith("Bearer ")) throw new ApiError("sessao", "Faltou o Bearer");
    return auth.slice(7).trim();
  }
  function hit(key, limit, seconds) {
    var _a;
    const cache = CacheService.getScriptCache();
    const count = Number((_a = cache.get(key)) != null ? _a : 0) + 1;
    cache.put(key, String(count), seconds);
    return count <= limit;
  }
  function sheet(name) {
    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (!s) throw new ApiError("config", "Servidor não configurado: rode a função configurar()");
    return s;
  }
  function findPlayer(col, value) {
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
  function writePlayer(p) {
    sheet(SHEET_PLAYERS).getRange(p.row, 1, 1, COLS.length).setValues([p.v]);
  }
  function log(user, action, reason) {
    try {
      const s = sheet(SHEET_LOG);
      s.appendRow([(/* @__PURE__ */ new Date()).toISOString(), user, action, reason.slice(0, 300)]);
      if (s.getLastRow() > 2e3) s.deleteRows(2, 500);
    } catch {
    }
  }
  function withLock(fn) {
    const lock = LockService.getScriptLock();
    lock.waitLock(15e3);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }
  function authenticated(body) {
    const token = readToken(bearer(body));
    const p = findPlayer("id", token.id);
    if (!p || Number(p.v[C.versao_token]) !== token.version) throw new ApiError("sessao", "Sessão encerrada, entre de novo");
    if (p.v[C.liberado].toUpperCase() !== "SIM") throw new ApiError("bloqueado", "Conta bloqueada");
    return p;
  }
  function maybeRenew(body, p) {
    const { exp } = readToken(bearer(body));
    return exp - now() < 2 * 864e5 ? makeToken(p.v[C.id], Number(p.v[C.versao_token])) : void 0;
  }
  function enter(body) {
    var _a;
    let decoded = "";
    try {
      decoded = unb64(bearer(body));
    } catch {
      throw new ApiError("login", "Login inválido");
    }
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep).toLowerCase();
    const clientHash = decoded.slice(sep + 1);
    if (sep < 0 || !USER_RE.test(user)) throw new ApiError("login", "Usuário deve ter 3 a 16 letras minúsculas, números ou _");
    if (!CLIENT_HASH_RE.test(clientHash)) throw new ApiError("login", "Login inválido");
    const cache = CacheService.getScriptCache();
    const fails = Number((_a = cache.get(`falhas:${user}`)) != null ? _a : 0);
    if (fails >= MAX_LOGIN_FAILS) throw new ApiError("limite", "Muitas tentativas. Aguarde 15 minutos.");
    return withLock(() => {
      let p = findPlayer("usuario", user);
      let created = false;
      if (!p) {
        if (!hit(`novos:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 13)}`, MAX_NEW_ACCOUNTS_PER_HOUR, 3600)) {
          throw new ApiError("limite", "Muitos cadastros agora. Tente mais tarde.");
        }
        const salt = Utilities.getUuid();
        const iso = (/* @__PURE__ */ new Date()).toISOString();
        const v = COLS.map(() => "");
        v[C.id] = Utilities.getUuid();
        v[C.usuario] = user;
        v[C.hash] = storedHash(clientHash, salt);
        v[C.sal] = salt;
        v[C.liberado] = "SIM";
        v[C.versao_token] = "1";
        v[C.criado_em] = iso;
        v[C.ultimo_acesso] = iso;
        v[C.rev] = "0";
        v[C.qtd] = "0";
        v[C.poder] = "0";
        v[C.salvo_em] = iso;
        sheet(SHEET_PLAYERS).appendRow(v);
        p = findPlayer("id", v[C.id]);
        created = true;
        if (!p) throw new ApiError("interno", "Falha ao criar a conta");
      } else if (!safeEqual(storedHash(clientHash, p.v[C.sal]), p.v[C.hash])) {
        cache.put(`falhas:${user}`, String(fails + 1), 900);
        log(user, "entrar", "senha incorreta");
        throw new ApiError("login", "Senha incorreta (ou esse usuário já é de outra pessoa)");
      }
      if (p.v[C.liberado].toUpperCase() !== "SIM") throw new ApiError("bloqueado", "Conta bloqueada");
      cache.remove(`falhas:${user}`);
      p.v[C.ultimo_acesso] = (/* @__PURE__ */ new Date()).toISOString();
      writePlayer(p);
      return {
        ok: true,
        novo: created,
        usuario: user,
        token: makeToken(p.v[C.id], Number(p.v[C.versao_token])),
        rev: Number(p.v[C.rev]),
        monstros: p.v[C.monstros]
      };
    });
  }
  function load(body) {
    const p = authenticated(body);
    return { ok: true, usuario: p.v[C.usuario], rev: Number(p.v[C.rev]), monstros: p.v[C.monstros], token: maybeRenew(body, p) };
  }
  function save(body) {
    var _a;
    const first = authenticated(body);
    const user = first.v[C.usuario];
    if (!hit(`salvar:${first.v[C.id]}`, MAX_SAVES_PER_MINUTE, 60)) throw new ApiError("limite", "Salvando rápido demais");
    const data = String((_a = body.monstros) != null ? _a : "");
    if (data.length > MAX_SAVE_CHARS) throw new ApiError("invalido", "Save grande demais");
    const next = decodeMonsters(data);
    if (!next) {
      log(user, "salvar", "formato inválido");
      throw new ApiError("invalido", "Formato do save inválido");
    }
    return withLock(() => {
      var _a2, _b, _c;
      const p = findPlayer("id", first.v[C.id]);
      if (!p) throw new ApiError("sessao", "Conta não encontrada");
      const rev = Number(p.v[C.rev]);
      if (Number(body.rev) !== rev) {
        throw new ApiError("conflito", "Save desatualizado: outro aparelho salvou antes", { rev, monstros: p.v[C.monstros] });
      }
      const prev = (_a2 = decodeMonsters(p.v[C.monstros])) != null ? _a2 : [];
      const minutes = (now() - Date.parse(p.v[C.salvo_em] || p.v[C.criado_em])) / 6e4;
      const err = validateChange(prev, next, { minutes, firstSave: rev === 0 });
      if (err) {
        log(user, "salvar", err);
        throw new ApiError("invalido", `Save recusado: ${err}`);
      }
      const best = bestMonster(next);
      p.v[C.rev] = String(rev + 1);
      p.v[C.monstros] = data;
      p.v[C.qtd] = String(next.length);
      p.v[C.poder] = String((_b = best == null ? void 0 : best.power) != null ? _b : 0);
      p.v[C.melhor] = best ? `${best.monster.nick || ((_c = getSpecies(best.monster.sp)) == null ? void 0 : _c.nome)} Nv.${best.monster.lv}` : "";
      p.v[C.salvo_em] = (/* @__PURE__ */ new Date()).toISOString();
      writePlayer(p);
      CacheService.getScriptCache().remove("ranking");
      return { ok: true, rev: rev + 1, token: maybeRenew(body, p) };
    });
  }
  function ranking() {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("ranking");
    if (cached) return { ok: true, ranking: JSON.parse(cached) };
    const s = sheet(SHEET_PLAYERS);
    const last = s.getLastRow();
    const rows = last < 2 ? [] : s.getRange(2, 1, last - 1, COLS.length).getValues();
    const list = rows.filter((r) => String(r[C.liberado]).toUpperCase() === "SIM" && Number(r[C.poder]) > 0).map((r) => ({ usuario: String(r[C.usuario]), poder: Number(r[C.poder]), monstro: String(r[C.melhor]) })).sort((a, b) => b.poder - a.poder).slice(0, 20);
    cache.put("ranking", JSON.stringify(list), 60);
    return { ok: true, ranking: list };
  }
  function logout(body) {
    const first = authenticated(body);
    return withLock(() => {
      const p = findPlayer("id", first.v[C.id]);
      if (!p) return { ok: true };
      p.v[C.versao_token] = String(Number(p.v[C.versao_token]) + 1);
      writePlayer(p);
      return { ok: true };
    });
  }
  function handle(raw) {
    var _a;
    try {
      if (raw.length > MAX_BODY) throw new ApiError("invalido", "Pedido grande demais");
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        throw new ApiError("invalido", "JSON inválido");
      }
      if (!body || typeof body !== "object") throw new ApiError("invalido", "JSON inválido");
      switch (body.acao) {
        case "entrar":
          return enter(body);
        case "carregar":
          return load(body);
        case "salvar":
          return save(body);
        case "ranking":
          return ranking();
        case "sair":
          return logout(body);
        default:
          throw new ApiError("invalido", "Ação desconhecida");
      }
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, codigo: e.code, erro: e.message, ...e.extra };
      log("-", "erro", String((_a = e == null ? void 0 : e.stack) != null ? _a : e));
      return { ok: false, codigo: "interno", erro: "Erro interno, tente de novo" };
    }
  }
  function doPost(e) {
    var _a, _b;
    const reply = handle((_b = (_a = e == null ? void 0 : e.postData) == null ? void 0 : _a.contents) != null ? _b : "");
    return ContentService.createTextOutput(JSON.stringify(reply)).setMimeType(ContentService.MimeType.JSON);
  }
  function doGet() {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, jogo: "MonKePo" })).setMimeType(ContentService.MimeType.JSON);
  }
  function configurar() {
    const props = PropertiesService.getScriptProperties();
    for (const key of ["SEGREDO", "PIMENTA"]) {
      if (!props.getProperty(key)) props.setProperty(key, Utilities.getUuid() + Utilities.getUuid());
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const setup = (name, header) => {
      let s = ss.getSheetByName(name);
      if (!s) s = ss.insertSheet(name);
      s.getRange(1, 1, s.getMaxRows(), header.length).setNumberFormat("@");
      s.getRange(1, 1, 1, header.length).setValues([[...header]]);
      s.setFrozenRows(1);
    };
    setup(SHEET_PLAYERS, COLS);
    setup(SHEET_LOG, ["data", "usuario", "acao", "motivo"]);
    return "MonKePo configurado. Agora publique como App da Web.";
  }
  return __toCommonJS(server_exports);
})();

function doPost(e) { return MonKePo.doPost(e); }
function doGet(e) { return MonKePo.doGet(e); }
function configurar() { return MonKePo.configurar(); }
