// Praça online: cada pessoa vira um boneco numa praça 3D e vê os outros (até 12 por sala) andando em tempo real.
// O servidor das salas e os perfis (nível, moedas, itens, ranking) ficam no backend-soudev (Cloudflare).

import './estilo.css';
import * as THREE from 'three';
import { APARENCIA_PADRAO, type Aparencia, Boneco, CABELOS, CHAPEUS, CORES, PELES, escreverSkin, lerSkin } from './boneco';
import { Controles } from './controles';
import { criarMundo, resolverColisao } from './mundo';
import { Anim, CONQUISTAS, EMOTES, type Emote, ENVIOS_POR_SEGUNDO, ITENS, type InfoSala, type Jogador, type MotivoErro, type MsgServidor, type Perfil, type Pose, itensBloqueados, xpDoNivel } from './protocolo';
import { Rede, atualizarPerfil, criarPerfil, meuPerfil, online, pedirRanking, pedirSala } from './rede';
import { Telao } from './telao';

/* ---------- Utilidades de tela ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...filhos: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...resto } = props;
  if (cls) e.className = cls;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : (JSON.parse(v) as T);
  } catch {
    return padrao;
  }
}

function guardar(chave: string, v: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
}

const NOME_EMOTE: Record<Emote, string> = { acenar: '👋', dancar: '🕺', comemorar: '🎉', joinha: '👍' };
const rotulo = (nome: string, nivel: number): string => `${nome} · Nv ${nivel}`;

/* ---------- Cena ---------- */

const app = document.querySelector('#app') as HTMLElement;
const canvas = el('canvas', { cls: 'tela-jogo' });
const tela = el('div', { cls: 'tela' });
const hud = el('div', { cls: 'hud', hidden: true });
const aviso = el('div', { cls: 'aviso', hidden: true });
app.append(canvas, hud, aviso, tela);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
const ajustar = (): void => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
addEventListener('resize', ajustar);
ajustar();

const controles = new Controles(canvas, app);
controles.ativo = false;

let aparencia: Aparencia = { ...APARENCIA_PADRAO, ...lerSkin(ler('praca.skin', escreverSkin(APARENCIA_PADRAO))) };
let nome: string = ler('praca.nome', '');
let perfil: Perfil | null = null;

/* ---------- Estado ---------- */

interface Remoto {
  j: Jogador;
  boneco: Boneco;
  alvo: THREE.Vector3;
  rotAlvo: number;
  anim: Anim;
  vel: number;
  antes: THREE.Vector3;
}

let mundo: Awaited<ReturnType<typeof criarMundo>> | null = null;
let rede: Rede | null = null;
let sala: InfoSala | null = null;
let publicaPedida = false;
let tentativasCheia = 0;
const remotos = new Map<string, Remoto>();
const eu = { pos: new THREE.Vector3(0, 0, 9), vy: 0, rot: Math.PI, anim: Anim.Parado as Anim, boneco: new Boneco(null, escreverSkin(aparencia)) };
let ultimoEnvio = 0;
let ultimaPoseEnviada = '';
const telao = new Telao();

/* ---------- Mundo ---------- */

const carregando = criarMundo().then((m) => {
  mundo = m;
  m.cena.add(eu.boneco.grupo);
  telao.grupo.position.set(0, 0, -19.5);
  m.cena.add(telao.grupo);
  m.colisao.push({ x: 0, z: -19.7, mx: 3.3, mz: 0.35 });
  return m;
});

async function atualizarTelao(): Promise<void> {
  try {
    telao.desenhar(await pedirRanking('nivel'));
  } catch {
    /* sem rede: fica o último */
  }
}
void atualizarTelao();
setInterval(() => void atualizarTelao(), 60000);

// Perfil salvo neste aparelho (se já jogou antes): traz apelido e aparência do servidor.
const carregandoPerfil = meuPerfil().then((p) => {
  if (p) usarPerfil(p);
  return p;
});

function usarPerfil(p: Perfil): void {
  perfil = p;
  nome = p.apelido;
  guardar('praca.nome', nome);
  if (p.skin) {
    aparencia = { ...APARENCIA_PADRAO, ...lerSkin(p.skin) };
    guardar('praca.skin', escreverSkin(aparencia));
    eu.boneco.aplicarSkin(p.skin);
  }
}

/* ---------- Rede ---------- */

function mostrarAviso(texto: string, ms = 2600): void {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout((mostrarAviso as unknown as { t?: number }).t);
  (mostrarAviso as unknown as { t?: number }).t = window.setTimeout(() => (aviso.hidden = true), ms);
}

function limparSala(): void {
  rede?.sair();
  rede = null;
  sala = null;
  for (const r of remotos.values()) r.boneco.remover();
  remotos.clear();
}

function adicionarRemoto(j: Jogador): void {
  if (!mundo || j.id === perfil?.id || remotos.has(j.id)) return;
  const boneco = new Boneco(rotulo(j.nome, j.nivel), j.skin);
  const [x, y, z, r, a] = j.pose;
  boneco.grupo.position.set(x, y, z);
  boneco.grupo.rotation.y = r;
  mundo.cena.add(boneco.grupo);
  remotos.set(j.id, { j, boneco, alvo: new THREE.Vector3(x, y, z), rotAlvo: r, anim: a, vel: 0, antes: new THREE.Vector3(x, y, z) });
}

const MENSAGEM_ERRO: Record<MotivoErro, string> = {
  cheia: 'A sala está cheia (12 pessoas).',
  fechada: 'Essa sala está no meio de uma partida. Tente daqui a pouco.',
  invalida: 'Não deu para entrar nessa sala.',
  duplicado: 'Você abriu a praça em outra aba ou aparelho. Esta aqui foi desconectada.',
  bloqueado: 'Esse item ainda está bloqueado para você.',
};

function receber(m: MsgServidor): void {
  switch (m.k) {
    case 'bemvindo': {
      sala = m.sala;
      tentativasCheia = 0;
      const meu = m.jogadores.find((j) => j.id === m.eu);
      if (meu) {
        eu.pos.set(meu.pose[0], meu.pose[1], meu.pose[2]);
        eu.rot = meu.pose[3];
        controles.yaw = eu.rot + Math.PI;
      }
      for (const r of remotos.values()) r.boneco.remover();
      remotos.clear();
      m.jogadores.forEach(adicionarRemoto);
      history.replaceState(null, '', `${location.pathname}?sala=${m.sala.codigo}`);
      entrarNoJogo();
      break;
    }
    case 'entrou':
      adicionarRemoto(m.j);
      mostrarAviso(`${m.j.nome} chegou na praça`);
      desenharHud();
      break;
    case 'saiu': {
      const r = remotos.get(m.id);
      if (r) {
        r.boneco.remover();
        remotos.delete(m.id);
        mostrarAviso(`${r.j.nome} saiu`);
        desenharHud();
      }
      break;
    }
    case 'poses':
      for (const [id, x, y, z, rot, a] of m.l) {
        const r = remotos.get(id);
        if (!r) continue;
        r.alvo.set(x, y, z);
        r.rotAlvo = rot;
        r.anim = a;
      }
      break;
    case 'emote':
      remotos.get(m.id)?.boneco.emote(m.e);
      break;
    case 'skin': {
      const r = remotos.get(m.id);
      if (r) {
        r.j.skin = m.s;
        r.boneco.aplicarSkin(m.s);
      }
      break;
    }
    case 'erro':
      // Item bloqueado não derruba a conexão: só avisa e volta a aparência salva.
      if (m.motivo === 'bloqueado') {
        mostrarAviso(MENSAGEM_ERRO.bloqueado);
        if (perfil) eu.boneco.aplicarSkin(perfil.skin);
        return;
      }
      // Sala pública lotou entre o "Jogar" e a conexão: pede outra.
      if (m.motivo === 'cheia' && publicaPedida && tentativasCheia++ < 3) {
        limparSala();
        void conectar(true);
        return;
      }
      limparSala();
      menu(MENSAGEM_ERRO[m.motivo]);
      break;
  }
}

/** Garante o perfil (cria no primeiro acesso) e acerta o apelido se mudou no menu. */
async function garantirPerfil(): Promise<void> {
  await carregandoPerfil;
  if (!perfil) usarPerfil(await criarPerfil(nome, escreverSkin(aparencia)));
  else if (perfil.apelido !== nome) usarPerfil(await atualizarPerfil({ apelido: nome }));
}

async function conectar(publica: boolean, codigo?: string): Promise<void> {
  publicaPedida = publica && !codigo;
  tela.replaceChildren(el('div', { cls: 'caixa centro' }, el('p', { textContent: 'Entrando na praça…' })));
  try {
    await carregando;
    await garantirPerfil();
    const cod = codigo ?? (await pedirSala(publica));
    limparSala();
    rede = new Rede(cod);
    rede.aoReceber = receber;
    rede.aoEstado = (e) => {
      if (e === 'reconectando') mostrarAviso('Conexão caiu, reconectando…', 5000);
      if (e === 'caiu') {
        limparSala();
        menu('A conexão com o servidor caiu.');
      }
    };
  } catch (e) {
    console.warn(e);
    menu(e instanceof Error && e.message && !/fetch/i.test(e.message) ? e.message : 'Não consegui falar com o servidor. Confira a internet e tente de novo.');
  }
}

/* ---------- Perfil, ranking e aparência ---------- */

/** Por que um item está bloqueado ("Nível 5", "Conquista: Rei da colina") ou null se pode usar. */
function motivoBloqueio(a: Aparencia): string | null {
  const nivel = perfil?.nivel ?? 1;
  const b = itensBloqueados(escreverSkin(a), nivel, perfil?.itens ?? [])[0];
  if (!b) return null;
  const it = ITENS.find((i) => i.id === b)!;
  return it.nivel ? `Nível ${it.nivel}` : `Conquista: ${CONQUISTAS.find((c) => c.id === it.conquista)?.nome ?? it.conquista}`;
}

function cartaoPerfil(): HTMLElement | null {
  if (!perfil) return null;
  const base = xpDoNivel(perfil.nivel);
  const prox = xpDoNivel(perfil.nivel + 1);
  const barra = el('div', { cls: 'barra-xp' }, el('span'));
  (barra.firstElementChild as HTMLElement).style.width = `${Math.round(((perfil.xp - base) / (prox - base)) * 100)}%`;
  return el(
    'div',
    { cls: 'perfil' },
    el('div', { cls: 'perfil-linha' }, el('strong', { textContent: `Nível ${perfil.nivel}` }), el('span', { textContent: `🪙 ${perfil.moedas.toLocaleString('pt-BR')}` })),
    barra,
    el('small', { textContent: `${perfil.xp - base} / ${prox - base} XP para o nível ${perfil.nivel + 1} · ${perfil.conquistas.length} conquista(s)` }),
  );
}

function painelRanking(): HTMLElement {
  const caixa = el('div', { cls: 'ranking' });
  const lista = el('ol', { cls: 'ranking-lista' });
  const abas: [string, string][] = [
    ['nivel', 'Nível'],
    ['moedas', 'Moedas'],
  ];
  const mostrar = async (por: string): Promise<void> => {
    botoes.forEach((b) => b.classList.toggle('ativa', b.dataset.por === por));
    lista.replaceChildren(el('li', { textContent: 'Carregando…' }));
    try {
      const r = await pedirRanking(por);
      const linha = (l: (typeof r.lista)[number], minha = false) => el('li', { cls: minha ? 'eu' : '' }, el('span', { textContent: `${l.posicao}º` }), el('span', { textContent: l.apelido }), el('strong', { textContent: por === 'moedas' ? `🪙 ${l.valor.toLocaleString('pt-BR')}` : `Nv ${l.valor}` }));
      lista.replaceChildren(...r.lista.map((l) => linha(l, l.id === perfil?.id)));
      if (r.eu && !r.lista.some((l) => l.id === r.eu!.id)) lista.append(el('li', { cls: 'separador', textContent: '…' }), linha(r.eu, true));
      if (!r.lista.length) lista.replaceChildren(el('li', { textContent: 'Ninguém ainda. Seja o primeiro!' }));
    } catch {
      lista.replaceChildren(el('li', { textContent: 'Não deu para carregar o ranking.' }));
    }
  };
  const botoes = abas.map(([por, texto]) => {
    const b = el('button', { cls: 'opcao', textContent: texto, onclick: () => void mostrar(por) });
    b.dataset.por = por;
    return b;
  });
  caixa.append(el('div', { cls: 'opcoes' }, ...botoes), lista);
  void mostrar('nivel');
  return caixa;
}

function editorAparencia(): HTMLElement {
  const grupo = (titulo: string, ...itens: HTMLElement[]) => el('div', { cls: 'grupo' }, el('span', { textContent: titulo }), el('div', { cls: 'opcoes' }, ...itens));
  const corBtn = (cor: string, ativa: boolean, fn: () => void) => {
    const b = el('button', { cls: ativa ? 'cor ativa' : 'cor', title: cor, onclick: fn });
    b.style.background = cor;
    return b;
  };
  // Opções de cabelo, chapéu e óculos podem estar bloqueadas por nível ou conquista.
  const txtBtn = (texto: string, ativa: boolean, parcial: Partial<Aparencia>) => {
    const bloqueio = motivoBloqueio({ ...aparencia, ...parcial });
    const b = el('button', { cls: `opcao${ativa ? ' ativa' : ''}${bloqueio ? ' bloqueada' : ''}`, textContent: bloqueio ? `🔒 ${texto}` : texto, title: bloqueio ?? '', onclick: () => (bloqueio ? mostrarAviso(`${texto}: libera com ${bloqueio}`) : mudar(parcial)) });
    return b;
  };
  const mudar = (parcial: Partial<Aparencia>) => {
    aparencia = { ...aparencia, ...parcial };
    const skin = escreverSkin(aparencia);
    guardar('praca.skin', skin);
    eu.boneco.aplicarSkin(skin);
    // Dentro da sala a troca vai pela conexão (o servidor valida e salva); fora, direto no perfil.
    if (rede) rede.trocarSkin(skin);
    else if (perfil) void atualizarPerfil({ skin }).then(usarPerfil, (e: Error) => mostrarAviso(e.message));
    if (perfil) perfil = { ...perfil, skin };
    caixa.replaceWith(editorAparencia());
  };
  const caixa = el(
    'div',
    { cls: 'aparencia' },
    grupo('Pele', ...PELES.map((c, i) => corBtn(c, aparencia.pele === i, () => mudar({ pele: i })))),
    grupo('Cabelo', ...CABELOS.map((c) => txtBtn(c, aparencia.cabelo === c, { cabelo: c }))),
    grupo('Cor do cabelo', ...['#1c1917', '#3f2a1d', '#92400e', '#facc15', '#e5e7eb', '#ec4899', '#3b82f6'].map((c) => corBtn(c, aparencia.corCabelo === c, () => mudar({ corCabelo: c })))),
    grupo('Camiseta', ...CORES.map((c) => corBtn(c, aparencia.camisa === c, () => mudar({ camisa: c })))),
    grupo('Calça', ...CORES.map((c) => corBtn(c, aparencia.calca === c, () => mudar({ calca: c })))),
    grupo('Tênis', ...CORES.map((c) => corBtn(c, aparencia.sapato === c, () => mudar({ sapato: c })))),
    grupo('Chapéu', ...CHAPEUS.map((c) => txtBtn(c, aparencia.chapeu === c, { chapeu: c }))),
    grupo('Óculos', txtBtn('sem', !aparencia.oculos, { oculos: false }), txtBtn('escuros', aparencia.oculos, { oculos: true })),
  );
  return caixa;
}

/* ---------- Telas ---------- */

function menu(erro?: string): void {
  estado = 'menu';
  controles.ativo = false;
  hud.hidden = true;
  const codigoLink = new URLSearchParams(location.search).get('sala')?.toUpperCase() ?? '';
  const campoNome = el('input', { value: nome, placeholder: 'Seu apelido', maxLength: 16, autocomplete: 'nickname' as AutoFill });
  const campoCodigo = el('input', { value: codigoLink, placeholder: 'Código', maxLength: 6, className: 'codigo' });
  const contador = el('p', { cls: 'nota', textContent: ' ' });
  void online().then((o) => (contador.textContent = o ? `${o.jogadores} ${o.jogadores === 1 ? 'pessoa' : 'pessoas'} online agora` : 'Servidor fora do ar no momento.'));
  const confirmarNome = (): boolean => {
    nome = campoNome.value.trim().slice(0, 16);
    if (!nome) {
      campoNome.focus();
      campoNome.classList.add('erro');
      return false;
    }
    guardar('praca.nome', nome);
    return true;
  };
  const codigoValido = (c: string) => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
  const slotPerfil = el('div');
  const desenharPerfil = () => slotPerfil.replaceChildren(...[cartaoPerfil()].filter((x): x is HTMLElement => Boolean(x)));
  desenharPerfil();
  void carregandoPerfil.then(() => {
    desenharPerfil();
    if (perfil && !campoNome.value) campoNome.value = perfil.apelido;
  });
  tela.replaceChildren(
    el(
      'div',
      { cls: 'caixa menu' },
      el('h1', { textContent: 'Praça' }),
      el('p', { cls: 'sub', textContent: 'Entre, vire um boneco e encontre gente de verdade andando pela praça. Até 12 por sala.' }),
      erro ? el('p', { cls: 'erro-msg', textContent: erro }) : null,
      slotPerfil,
      el('label', { cls: 'campo' }, el('span', { textContent: 'Apelido' }), campoNome),
      codigoLink && codigoValido(codigoLink)
        ? el('button', { cls: 'btn forte grande', textContent: `Entrar na sala ${codigoLink}`, onclick: () => confirmarNome() && conectar(false, codigoLink) })
        : el('button', { cls: 'btn forte grande', textContent: '▶ Jogar', onclick: () => confirmarNome() && conectar(true) }),
      el(
        'div',
        { cls: 'linha' },
        el('button', { cls: 'btn', textContent: 'Criar sala privada', onclick: () => confirmarNome() && conectar(false) }),
        campoCodigo,
        el('button', {
          cls: 'btn',
          textContent: 'Entrar',
          onclick: () => {
            const c = campoCodigo.value.trim().toUpperCase();
            if (!codigoValido(c)) {
              campoCodigo.classList.add('erro');
              return;
            }
            if (confirmarNome()) void conectar(false, c);
          },
        }),
      ),
      contador,
      el('details', { cls: 'personalizar' }, el('summary', { textContent: '🎨 Personalizar boneco' }), editorAparencia()),
      el('details', { cls: 'personalizar' }, el('summary', { textContent: '🏆 Ranking' }), painelRanking()),
      el('p', { cls: 'nota', textContent: 'WASD ou setas andam, Shift corre, Espaço pula, 1–4 fazem emotes, arraste para girar a câmera. No celular: joystick na esquerda. Cada minuto na praça vale 1 XP (até 60 por dia).' }),
    ),
  );
  tela.hidden = false;
}

function entrarNoJogo(): void {
  estado = 'jogo';
  tela.hidden = true;
  controles.ativo = true;
  desenharHud();
  hud.hidden = false;
}

function desenharHud(): void {
  if (!sala) return;
  const convite = `${location.origin}${location.pathname}?sala=${sala.codigo}`;
  const total = remotos.size + 1;
  const lista = el('div', { cls: 'lista', hidden: true }, el('strong', { textContent: 'Na sala' }), el('span', { textContent: `• ${rotulo(nome, perfil?.nivel ?? 1)} (você)` }), ...[...remotos.values()].map((r) => el('span', { textContent: `• ${rotulo(r.j.nome, r.j.nivel)}` })));
  const painelAparencia = el('div', { cls: 'painel-aparencia', hidden: true }, editorAparencia());
  const painelRk = el('div', { cls: 'painel-aparencia', hidden: true });
  const alternar = (p: HTMLElement) => {
    for (const x of [lista, painelAparencia, painelRk]) if (x !== p) x.hidden = true;
    p.hidden = !p.hidden;
  };
  hud.replaceChildren(
    el(
      'div',
      { cls: 'topo' },
      el('button', { cls: 'chip', textContent: `${sala.publica ? 'Sala pública' : 'Sala privada'} ${sala.codigo} · 👥 ${total}/${sala.max}`, onclick: () => alternar(lista) }),
      el('button', {
        cls: 'chip',
        textContent: '🔗 Convidar',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(convite);
            mostrarAviso('Link copiado! Mande para quem você quer na sala.');
          } catch {
            prompt('Copie o link da sala:', convite);
          }
        },
      }),
      el('button', { cls: 'chip', textContent: '🎨', title: 'Aparência', onclick: () => alternar(painelAparencia) }),
      el('button', {
        cls: 'chip',
        textContent: '🏆',
        title: 'Ranking',
        onclick: () => {
          if (painelRk.hidden) painelRk.replaceChildren(painelRanking());
          alternar(painelRk);
        },
      }),
      el('button', {
        cls: 'chip',
        textContent: 'Sair',
        onclick: () => {
          limparSala();
          history.replaceState(null, '', location.pathname);
          // Ao sair, o servidor soma o XP de presença: recarrega o perfil para mostrar.
          setTimeout(() => void meuPerfil().then((p) => p && (usarPerfil(p), menu())), 1500);
          menu();
        },
      }),
    ),
    lista,
    painelAparencia,
    painelRk,
    el('div', { cls: 'emotes' }, ...EMOTES.map((e, i) => el('button', { cls: 'emote', title: `${e} (${i + 1})`, textContent: NOME_EMOTE[e], onclick: () => fazerEmote(e) }))),
  );
}

function fazerEmote(e: Emote): void {
  if (estado !== 'jogo') return;
  eu.boneco.emote(e);
  rede?.emote(e);
}
controles.aoEmote = fazerEmote;

/* ---------- Laço ---------- */

let estado: 'menu' | 'jogo' = 'menu';
const relogio = new THREE.Clock();
const ANDAR = 4.2;
const CORRER = 7.5;
const GRAVIDADE = 28;
const PULO = 9.5;

function anguloPerto(de: number, para: number, k: number): number {
  let d = (para - de) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return de + d * k;
}

function quadro(): void {
  requestAnimationFrame(quadro);
  const dt = Math.min(0.05, relogio.getDelta());
  if (!mundo) return;
  const t = relogio.elapsedTime;

  if (estado === 'jogo') {
    controles.ler();
    // Andar no referencial da câmera.
    const fx = -Math.sin(controles.yaw);
    const fz = -Math.cos(controles.yaw);
    const mx = -fz * controles.mover.x + fx * controles.mover.y;
    const mz = fx * controles.mover.x + fz * controles.mover.y;
    const quanto = Math.hypot(mx, mz);
    const vel = (controles.correr ? CORRER : ANDAR) * Math.min(1, quanto);
    if (quanto > 0.05) {
      eu.pos.x += (mx / quanto) * vel * dt;
      eu.pos.z += (mz / quanto) * vel * dt;
      eu.rot = anguloPerto(eu.rot, Math.atan2(mx, mz), 1 - Math.exp(-dt * 14));
    }
    if (eu.pos.y <= 0 && controles.pegarPulo()) eu.vy = PULO;
    eu.vy -= GRAVIDADE * dt;
    eu.pos.y = Math.max(0, eu.pos.y + eu.vy * dt);
    if (eu.pos.y === 0) eu.vy = Math.max(0, eu.vy);
    resolverColisao(eu.pos, 0.35, mundo.colisao);
    eu.anim = eu.pos.y > 0.05 ? Anim.NoAr : quanto > 0.05 ? (controles.correr ? Anim.Correndo : Anim.Andando) : Anim.Parado;
    eu.boneco.grupo.position.copy(eu.pos);
    eu.boneco.grupo.rotation.y = eu.rot;
    eu.boneco.atualizar(dt, eu.anim, vel);

    // Manda a pose ~10x por segundo, só quando mudou.
    if (rede && t - ultimoEnvio >= 1 / ENVIOS_POR_SEGUNDO) {
      const p: Pose = [eu.pos.x, eu.pos.y, eu.pos.z, eu.rot, eu.anim];
      const chave = p.map((v) => Math.round(v * 50)).join(',');
      if (chave !== ultimaPoseEnviada) {
        rede.pose(p);
        ultimaPoseEnviada = chave;
        ultimoEnvio = t;
      }
    }

    // Câmera em terceira pessoa.
    const d = controles.distancia;
    const alvo = new THREE.Vector3(eu.pos.x, eu.pos.y + 1.4, eu.pos.z);
    const desejada = new THREE.Vector3(alvo.x + Math.sin(controles.yaw) * d * Math.cos(controles.pitch), alvo.y + Math.sin(controles.pitch) * d + 0.6, alvo.z + Math.cos(controles.yaw) * d * Math.cos(controles.pitch));
    camera.position.lerp(desejada, 1 - Math.exp(-dt * 12));
    camera.lookAt(alvo);
  } else {
    // Menu: câmera gira devagar em volta do seu boneco.
    eu.boneco.grupo.position.copy(eu.pos);
    eu.boneco.grupo.rotation.y = eu.rot;
    eu.boneco.atualizar(dt, Anim.Parado, 0);
    const a = t * 0.15;
    camera.position.set(eu.pos.x + Math.sin(a) * 6, 3, eu.pos.z + Math.cos(a) * 6);
    camera.lookAt(eu.pos.x, 1.1, eu.pos.z);
  }

  // Os outros: desliza até a última posição recebida (os envios chegam a cada 100 ms).
  const k = 1 - Math.exp(-dt * 10);
  for (const r of remotos.values()) {
    const g = r.boneco.grupo;
    r.antes.copy(g.position);
    g.position.lerp(r.alvo, k);
    g.rotation.y = anguloPerto(g.rotation.y, r.rotAlvo, k);
    const passo = Math.hypot(g.position.x - r.antes.x, g.position.z - r.antes.z) / Math.max(dt, 1e-3);
    r.vel += (passo - r.vel) * k;
    r.boneco.atualizar(dt, r.anim, r.vel);
  }

  // Sombra acompanha o jogador (mapa de sombra menor = mais nítido).
  mundo.sol.position.set(eu.pos.x + 30, 50, eu.pos.z + 20);
  mundo.sol.target.position.copy(eu.pos);
  renderer.render(mundo.cena, camera);
}

menu();
requestAnimationFrame(quadro);
