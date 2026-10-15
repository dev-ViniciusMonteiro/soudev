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
  var st = (status, chance) => ({ tipo: "status", status, chance });
  var alvo = (stat, delta, chance = 100) => ({ tipo: "stat", alvo: "alvo", stat, delta, chance });
  var self = (stat, delta, chance = 100) => ({ tipo: "stat", alvo: "self", stat, delta, chance });
  var MOVES = [
    { id: 1, nome: "Investida", tipo: "Normal", poder: 35, precisao: 95, pp: 35 },
    { id: 2, nome: "Arranhão", tipo: "Normal", poder: 40, precisao: 100, pp: 35 },
    { id: 3, nome: "Rosnado", tipo: "Normal", poder: 0, precisao: 100, pp: 40, efeitos: [alvo("atk", -1)] },
    { id: 4, nome: "Olhar Feroz", tipo: "Normal", poder: 0, precisao: 100, pp: 30, efeitos: [alvo("def", -1)] },
    { id: 5, nome: "Ataque Rápido", tipo: "Normal", poder: 40, precisao: 100, pp: 30, prioridade: 1 },
    { id: 6, nome: "Absorver", tipo: "Planta", poder: 20, precisao: 100, pp: 20, efeitos: [{ tipo: "drena", fracao: 0.5 }] },
    { id: 7, nome: "Folha Cortante", tipo: "Planta", poder: 55, precisao: 95, pp: 25, efeitos: [{ tipo: "critico" }] },
    { id: 8, nome: "Brasa", tipo: "Fogo", poder: 40, precisao: 100, pp: 25, efeitos: [st("queimado", 10)] },
    { id: 9, nome: "Roda de Fogo", tipo: "Fogo", poder: 60, precisao: 100, pp: 25, efeitos: [st("queimado", 10)] },
    { id: 10, nome: "Jato d'Água", tipo: "Água", poder: 40, precisao: 100, pp: 25 },
    { id: 11, nome: "Bolhas", tipo: "Água", poder: 20, precisao: 100, pp: 30, efeitos: [alvo("spe", -1, 10)] },
    { id: 12, nome: "Areia nos Olhos", tipo: "Terra", poder: 0, precisao: 100, pp: 15, efeitos: [alvo("acc", -1)] },
    { id: 13, nome: "Rajada", tipo: "Voador", poder: 40, precisao: 100, pp: 35 },
    { id: 14, nome: "Bicada", tipo: "Voador", poder: 35, precisao: 100, pp: 35 },
    { id: 15, nome: "Mordida", tipo: "Sombrio", poder: 60, precisao: 100, pp: 25, efeitos: [{ tipo: "recua", chance: 30 }] },
    { id: 16, nome: "Choque", tipo: "Elétrico", poder: 40, precisao: 100, pp: 30, efeitos: [st("paralisado", 10)] },
    { id: 17, nome: "Golpe de Karatê", tipo: "Lutador", poder: 50, precisao: 100, pp: 25, efeitos: [{ tipo: "critico" }] },
    { id: 18, nome: "Tiro de Lama", tipo: "Terra", poder: 55, precisao: 95, pp: 15, efeitos: [alvo("spe", -1)] },
    { id: 19, nome: "Megadreno", tipo: "Planta", poder: 40, precisao: 100, pp: 10, efeitos: [{ tipo: "drena", fracao: 0.5 }] },
    { id: 20, nome: "Pó do Sono", tipo: "Planta", poder: 0, precisao: 75, pp: 15, efeitos: [st("dormindo", 100)] },
    { id: 21, nome: "Lança-chamas", tipo: "Fogo", poder: 95, precisao: 100, pp: 15, efeitos: [st("queimado", 10)] },
    { id: 22, nome: "Pulso d'Água", tipo: "Água", poder: 60, precisao: 100, pp: 20 },
    { id: 23, nome: "Hidrobomba", tipo: "Água", poder: 120, precisao: 80, pp: 5 },
    { id: 24, nome: "Ataque de Asa", tipo: "Voador", poder: 60, precisao: 100, pp: 35 },
    { id: 25, nome: "Pó de Neve", tipo: "Gelo", poder: 40, precisao: 100, pp: 25, efeitos: [st("congelado", 10)] },
    { id: 26, nome: "Raio de Gelo", tipo: "Gelo", poder: 95, precisao: 100, pp: 10, efeitos: [st("congelado", 10)] },
    { id: 27, nome: "Garra de Metal", tipo: "Metal", poder: 50, precisao: 95, pp: 35, efeitos: [self("atk", 1, 10)] },
    { id: 28, nome: "Cauda de Ferro", tipo: "Metal", poder: 100, precisao: 75, pp: 15, efeitos: [alvo("def", -1, 30)] },
    { id: 29, nome: "Ferrão Venenoso", tipo: "Venenoso", poder: 15, precisao: 100, pp: 35, efeitos: [st("envenenado", 30)] },
    { id: 30, nome: "Ácido", tipo: "Venenoso", poder: 40, precisao: 100, pp: 30, efeitos: [alvo("def", -1, 10)] },
    { id: 31, nome: "Cabeçada", tipo: "Normal", poder: 70, precisao: 100, pp: 15, efeitos: [{ tipo: "recua", chance: 30 }] },
    { id: 32, nome: "Pancada Corporal", tipo: "Normal", poder: 85, precisao: 100, pp: 15, efeitos: [st("paralisado", 30)] },
    { id: 33, nome: "Endurecer", tipo: "Normal", poder: 0, precisao: 0, pp: 30, efeitos: [self("def", 1)] },
    { id: 34, nome: "Dança das Espadas", tipo: "Normal", poder: 0, precisao: 0, pp: 30, efeitos: [self("atk", 2)] },
    { id: 35, nome: "Chute Rasteiro", tipo: "Lutador", poder: 50, precisao: 90, pp: 20 },
    { id: 36, nome: "Golpe Cruzado", tipo: "Lutador", poder: 100, precisao: 80, pp: 5, efeitos: [{ tipo: "critico" }] },
    { id: 37, nome: "Finta", tipo: "Sombrio", poder: 60, precisao: 0, pp: 20 },
    { id: 38, nome: "Bola Sombria", tipo: "Fantasma", poder: 80, precisao: 100, pp: 15, efeitos: [alvo("spd", -1, 20)] },
    { id: 39, nome: "Confusão", tipo: "Psíquico", poder: 50, precisao: 100, pp: 25 },
    { id: 40, nome: "Terremoto", tipo: "Terra", poder: 100, precisao: 100, pp: 10 },
    { id: 41, nome: "Avalanche de Pedras", tipo: "Pedra", poder: 75, precisao: 90, pp: 10, efeitos: [{ tipo: "recua", chance: 30 }] },
    { id: 42, nome: "Fúria do Dragão", tipo: "Dragão", poder: 1, precisao: 100, pp: 10, efeitos: [{ tipo: "fixo", dano: 40 }] },
    { id: 43, nome: "Agilidade", tipo: "Psíquico", poder: 0, precisao: 0, pp: 30, efeitos: [self("spe", 2)] },
    { id: 44, nome: "Relâmpago", tipo: "Elétrico", poder: 95, precisao: 100, pp: 15, efeitos: [st("paralisado", 10)] },
    { id: 45, nome: "Lâmina de Folha", tipo: "Planta", poder: 90, precisao: 100, pp: 15, efeitos: [{ tipo: "critico" }] },
    { id: 46, nome: "Pó Venenoso", tipo: "Venenoso", poder: 0, precisao: 75, pp: 35, efeitos: [st("envenenado", 100)] },
    { id: 47, nome: "Onda Elétrica", tipo: "Elétrico", poder: 0, precisao: 100, pp: 20, efeitos: [st("paralisado", 100)] }
  ];
  var SPECIES = [
    { id: 1, nome: "Lambert", sprite: "lambert", tipos: ["Planta"], base: [45, 49, 49, 65, 65, 45], ev: [0, 0, 0, 1, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 64, femea: 31, evolui: { para: 2, nivel: 16 }, golpes: [[1, 1], [1, 3], [3, 6], [6, 7], [11, 20], [15, 19]], arte: "Sanglorian" },
    { id: 2, nome: "Legko", sprite: "legko", tipos: ["Planta"], base: [60, 62, 63, 80, 80, 60], ev: [0, 0, 0, 1, 1, 0], crescimento: "media-lenta", captura: 45, expBase: 141, femea: 31, evolui: { para: 3, nivel: 36 }, golpes: [[1, 1], [1, 6], [16, 7], [21, 19], [27, 33], [32, 45]], arte: "Sanglorian" },
    { id: 3, nome: "Moloch", sprite: "moloch", tipos: ["Planta", "Lutador"], base: [80, 100, 90, 85, 85, 80], ev: [0, 2, 0, 1, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 208, femea: 31, golpes: [[1, 7], [1, 19], [36, 17], [40, 45], [46, 36], [52, 34]], arte: "Sanglorian" },
    { id: 4, nome: "Agnite", sprite: "agnite", tipos: ["Fogo"], base: [39, 52, 43, 60, 50, 65], ev: [0, 0, 0, 0, 0, 1], crescimento: "media-lenta", captura: 45, expBase: 65, femea: 31, evolui: { para: 5, nivel: 16 }, golpes: [[1, 2], [1, 3], [7, 8], [13, 4]], arte: "Leo, Sanglorian e extyrannomon" },
    { id: 5, nome: "Agnidon", sprite: "agnidon", tipos: ["Fogo"], base: [58, 64, 58, 80, 65, 80], ev: [0, 0, 0, 1, 0, 1], crescimento: "media-lenta", captura: 45, expBase: 142, femea: 31, evolui: { para: 6, nivel: 36 }, golpes: [[1, 2], [1, 8], [16, 9], [22, 15], [29, 37], [33, 34]], arte: "Leo" },
    { id: 6, nome: "Agnigon", sprite: "agnigon", tipos: ["Fogo", "Sombrio"], base: [78, 84, 78, 109, 85, 100], ev: [0, 0, 0, 3, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 209, femea: 31, golpes: [[1, 9], [1, 15], [36, 21], [44, 38], [52, 42]], arte: "Leo" },
    { id: 7, nome: "Dollfin", sprite: "dollfin", tipos: ["Água"], base: [50, 60, 50, 55, 50, 50], ev: [0, 1, 0, 0, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 65, femea: 31, evolui: { para: 8, nivel: 16 }, golpes: [[1, 1], [1, 3], [6, 10], [11, 11], [15, 12]], arte: "Cavalcadeur" },
    { id: 8, nome: "Sharpfin", sprite: "sharpfin", tipos: ["Água", "Lutador"], base: [65, 82, 62, 65, 62, 74], ev: [0, 2, 0, 0, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 143, femea: 31, evolui: { para: 9, nivel: 36 }, golpes: [[1, 1], [1, 10], [16, 17], [22, 22], [28, 31], [33, 35]], arte: "Projeto Tuxemon" },
    { id: 9, nome: "Bigfin", sprite: "bigfin", tipos: ["Água"], base: [100, 100, 90, 85, 90, 65], ev: [2, 1, 0, 0, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 210, femea: 31, golpes: [[1, 22], [1, 31], [36, 32], [42, 26], [50, 23]], arte: "Cavalcadeur e rsg167" },
    { id: 10, nome: "Noctula", sprite: "noctula", tipos: ["Voador", "Sombrio"], base: [40, 45, 35, 30, 40, 60], ev: [0, 0, 0, 0, 0, 1], crescimento: "media-rapida", captura: 190, expBase: 54, femea: 127, evolui: { para: 11, nivel: 22 }, golpes: [[1, 14], [1, 3], [5, 5], [9, 15], [15, 24], [19, 37]], arte: "Catch Challenger" },
    { id: 11, nome: "Noctalo", sprite: "noctalo", tipos: ["Voador", "Sombrio"], base: [75, 80, 70, 65, 75, 95], ev: [0, 0, 0, 0, 0, 2], crescimento: "media-rapida", captura: 90, expBase: 159, femea: 127, golpes: [[1, 24], [1, 15], [22, 37], [30, 38], [38, 43]], arte: "Catch Challenger" },
    { id: 12, nome: "Capiti", sprite: "capiti", tipos: ["Normal"], base: [38, 56, 35, 25, 35, 72], ev: [0, 0, 0, 0, 0, 1], crescimento: "media-rapida", captura: 255, expBase: 51, femea: 127, golpes: [[1, 1], [1, 4], [4, 5], [9, 15], [15, 31], [25, 32], [33, 34]], arte: "Catch Challenger" },
    { id: 13, nome: "Selket", sprite: "selket", tipos: ["Terra", "Venenoso"], base: [50, 65, 70, 30, 40, 40], ev: [0, 0, 1, 0, 0, 0], crescimento: "media-rapida", captura: 120, expBase: 66, femea: 127, evolui: { para: 14, nivel: 24 }, golpes: [[1, 2], [1, 33], [6, 29], [11, 12], [16, 18], [21, 30]], arte: "Catch Challenger" },
    { id: 14, nome: "Selmatek", sprite: "selmatek", tipos: ["Terra", "Venenoso"], base: [70, 95, 105, 50, 65, 60], ev: [0, 0, 2, 0, 0, 0], crescimento: "media-rapida", captura: 60, expBase: 165, femea: 127, golpes: [[1, 29], [1, 18], [24, 41], [30, 46], [38, 40]], arte: "Catch Challenger" },
    { id: 15, nome: "Propellercat", sprite: "propellercat", tipos: ["Normal", "Voador"], base: [55, 60, 50, 50, 50, 90], ev: [0, 0, 0, 0, 0, 2], crescimento: "rapida", captura: 75, expBase: 110, femea: 127, golpes: [[1, 13], [1, 5], [8, 3], [13, 24], [20, 31], [28, 43]], arte: "tamashihoshi" },
    { id: 16, nome: "Zunna", sprite: "zunna", tipos: ["Normal"], base: [70, 65, 55, 45, 55, 55], ev: [1, 0, 0, 0, 0, 0], crescimento: "rapida", captura: 200, expBase: 62, femea: 127, golpes: [[1, 1], [1, 4], [5, 33], [10, 31], [18, 32], [26, 34]], arte: "Spalding004 e Sanglorian" },
    { id: 17, nome: "Tweesher", sprite: "tweesher", tipos: ["Gelo"], base: [45, 50, 45, 58, 50, 57], ev: [0, 0, 0, 1, 0, 0], crescimento: "media-lenta", captura: 120, expBase: 63, femea: 127, evolui: { para: 18, nivel: 24 }, golpes: [[1, 14], [1, 3], [6, 25], [12, 13], [18, 11]], arte: "Leo e DevilDman" },
    { id: 18, nome: "Heronquak", sprite: "heronquak", tipos: ["Gelo", "Voador"], base: [65, 70, 60, 80, 65, 75], ev: [0, 0, 0, 2, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 147, femea: 127, evolui: { para: 19, nivel: 36 }, golpes: [[1, 25], [1, 13], [24, 24], [30, 26]], arte: "Leo e DevilDman" },
    { id: 19, nome: "Eaglace", sprite: "eaglace", tipos: ["Gelo", "Voador"], base: [85, 90, 80, 105, 85, 95], ev: [0, 0, 0, 3, 0, 0], crescimento: "media-lenta", captura: 45, expBase: 214, femea: 127, golpes: [[1, 26], [1, 24], [36, 43], [44, 23]], arte: "Leo e DevilDman" },
    { id: 20, nome: "Wrougon", sprite: "wrougon", tipos: ["Metal"], base: [50, 70, 90, 35, 45, 30], ev: [0, 0, 1, 0, 0, 0], crescimento: "lenta", captura: 120, expBase: 68, femea: -1, evolui: { para: 21, nivel: 32 }, golpes: [[1, 2], [1, 33], [7, 27], [13, 4], [20, 31]], arte: "Spalding004 e Chickenshowman" },
    { id: 21, nome: "Allagon", sprite: "allagon", tipos: ["Metal"], base: [65, 90, 115, 50, 60, 40], ev: [0, 0, 2, 0, 0, 0], crescimento: "lenta", captura: 45, expBase: 152, femea: -1, evolui: { para: 22, nivel: 50 }, golpes: [[1, 27], [1, 33], [32, 28], [38, 41]], arte: "Spalding004 e Chickenshowman" },
    { id: 22, nome: "Ferricran", sprite: "ferricran", tipos: ["Metal"], base: [80, 120, 140, 60, 75, 45], ev: [0, 0, 3, 0, 0, 0], crescimento: "lenta", captura: 45, expBase: 218, femea: -1, golpes: [[1, 28], [1, 41], [50, 40]], arte: "Spalding004 e Chickenshowman" },
    { id: 23, nome: "Chillimp", sprite: "chillimp", tipos: ["Gelo", "Lutador"], base: [55, 72, 45, 40, 45, 60], ev: [0, 1, 0, 0, 0, 0], crescimento: "media-rapida", captura: 90, expBase: 72, femea: 127, evolui: { para: 24, nivel: 28 }, golpes: [[1, 2], [1, 3], [7, 25], [12, 35], [18, 5], [24, 26]], arte: "Chickenshowman" },
    { id: 24, nome: "Snowrilla", sprite: "snowrilla", tipos: ["Gelo", "Lutador"], base: [90, 110, 80, 55, 70, 70], ev: [0, 2, 0, 0, 0, 0], crescimento: "media-rapida", captura: 45, expBase: 170, femea: 127, golpes: [[1, 25], [1, 35], [28, 36], [34, 26], [40, 32]], arte: "Chickenshowman" },
    { id: 25, nome: "Pigabyte", sprite: "pigabyte", tipos: ["Metal", "Normal"], base: [60, 60, 80, 50, 80, 40], ev: [0, 0, 1, 0, 1, 0], crescimento: "media-rapida", captura: 60, expBase: 120, femea: -1, golpes: [[1, 1], [1, 33], [8, 4], [14, 27], [22, 31], [30, 32]], arte: "josepharaoh99" }
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
