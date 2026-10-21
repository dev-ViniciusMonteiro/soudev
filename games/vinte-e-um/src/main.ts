// 21 contra a Banca: até 3 jogadores contra a banca, no mesmo aparelho ou numa sala online.
// Quem hospeda (ou o jogo local) roda a Mesa; quem entra na sala só manda as jogadas e desenha o estado recebido.

import './estilo.css';
import { Cena, CORES_FICHAS, ligarSom } from './cena';
import { APOSTA_MIN, type Estado, Mesa, type Tipo, opcoesDe } from './mesa';
import { connect, newRoomCode, type Net } from './rede';
import { type Jogada, NOME_JOGADA, estrategia, textoTotal, total } from './regras';
import { alternarSom, estaMudo, tocar } from './som';
import { Gestos, ICONE, type Sinal } from './gestos';

type Acao =
  | { t: 'apostar'; i: number; valor: number }
  | { t: 'pronto'; i: number; pronto: boolean }
  | { t: 'jogar'; i: number; jogada: Jogada }
  | { t: 'recarregar'; i: number }
  | { t: 'bot'; i: number; tipo: Tipo };

/* ---------- Utilidades de DOM (sempre textContent: nomes vêm de outros jogadores) ---------- */

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...filhos: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...resto } = props;
  if (cls) e.className = cls;
  Object.assign(e, resto);
  for (const f of filhos) if (f) e.append(f);
  return e;
}

const $ = <T extends HTMLElement>(sel: string): T => document.querySelector(sel) as T;

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

const reais = (n: number): string => `$ ${Math.round(n).toLocaleString('pt-BR')}`;

/* ---------- Estrutura da página ---------- */

const app = $('#app');
const palco = el('div', { cls: 'palco' });
const rotulos = el('div', { cls: 'rotulos' });
const topo = el('header', { cls: 'topo' });
const painel = el('section', { cls: 'painel', ariaLive: 'polite' });
const aviso = el('div', { cls: 'aviso', role: 'status' });
const menu = el('div', { cls: 'menu' });
app.append(palco, rotulos, topo, aviso, painel, menu);

const cena = new Cena(palco);
ligarSom((tipo, atraso) => tocar(tipo, atraso));

/* ---------- Estado da partida neste aparelho ---------- */

let estado: Estado | null = null;
let mesa: Mesa | null = null; // só em quem hospeda ou no jogo local
let net: Net | null = null;
let codigoSala = '';
let anfitriao = '';
let meus: number[] = []; // assentos que este aparelho controla
let modo: 'menu' | 'local' | 'hospede' | 'convidado' = 'menu';
let dica = '';
let vezAnterior = -1;
let faseAnterior = '';
let avisoAnterior = '';
let distribuirTimer: ReturnType<typeof setTimeout> | null = null;
let lugarVisto: number | null = null; // lugar em que a câmera 3D está sentada (null = vista geral)

/* ---------- Gestos pela câmera ---------- */

const minhasPessoas = (e: Estado): number[] => meus.filter((i) => e.assentos[i].tipo === 'pessoa');

/** O que os gestos podem fazer agora: apostar na hora das apostas, ou as jogadas da sua vez. */
function sinaisPermitidos(): Sinal[] {
  const e = estado;
  if (!e) return [];
  if (e.fase === 'apostas' || e.fase === 'fim') return minhasPessoas(e).some((i) => !e.assentos[i].pronto && e.assentos[i].saldo >= APOSTA_MIN) ? ['apostar'] : [];
  if (e.fase === 'jogadas' && meus.includes(e.vez) && e.assentos[e.vez].tipo === 'pessoa') return opcoesDe(e, e.vez);
  return [];
}

function aoSinal(s: Sinal): void {
  const e = estado;
  if (!e) return;
  if (s === 'apostar') {
    const i = minhasPessoas(e).find((k) => !e.assentos[k].pronto && e.assentos[k].saldo >= APOSTA_MIN);
    if (i === undefined) return;
    const a = e.assentos[i];
    const valor = a.aposta >= APOSTA_MIN ? a.aposta : Math.min(25, a.saldo);
    if (valor !== a.aposta) enviar({ t: 'apostar', i, valor });
    enviar({ t: 'pronto', i, pronto: true });
    tocar('ficha');
    mostrarAviso(`${ICONE.apostar} ${a.nome} apostou ${reais(valor)}`);
    return;
  }
  // Cartas ainda voando: espera a animação acabar e joga.
  if (cena.ocupado()) {
    setTimeout(() => aoSinal(s), 300);
    return;
  }
  jogar(s);
}

const gestos = new Gestos(aoSinal, sinaisPermitidos);

async function alternarGestos(): Promise<void> {
  if (gestos.ligado) gestos.desligar();
  else {
    try {
      await gestos.ligar();
      mostrarAviso('Gestos ligados: 👆 pedir · ✋ parar · 🤟 dobrar · ✌️ dividir · 👍 apostar');
    } catch (e) {
      gestos.desligar();
      mostrarAviso((e as Error)?.message || 'Não foi possível ligar a câmera.');
    }
  }
  desenharTopo();
}

function alternarVisao(): void {
  lugarVisto = lugarVisto !== null || !estado ? null : (minhasPessoas(estado)[0] ?? meus[0] ?? null);
  cena.sentar(lugarVisto);
  desenharTopo();
}

function enviar(acao: Acao): void {
  if (mesa) aplicar(acao, '');
  else net?.send('acao', acao, anfitriao || undefined);
}

/** Executa a ação na mesa. "de" = id do convidado ('' = este aparelho); só mexe no próprio lugar. */
function aplicar(acao: Acao, de: string): void {
  if (!mesa) return;
  const a = mesa.estado.assentos[acao.i];
  if (!a || (de && a.dono !== de)) return;
  if (acao.t === 'apostar') mesa.apostar(acao.i, acao.valor);
  else if (acao.t === 'pronto') mesa.marcarPronto(acao.i, acao.pronto);
  else if (acao.t === 'jogar') mesa.jogar(acao.i, acao.jogada);
  else if (acao.t === 'recarregar') mesa.recarregar(acao.i);
  else if (acao.t === 'bot' && !de && a.tipo !== 'pessoa' && (mesa.estado.fase === 'apostas' || mesa.estado.fase === 'fim')) mesa.ocupar(acao.i, acao.tipo, acao.tipo === 'bot' ? `Computador ${acao.i + 1}` : '');
}

/** Toda mudança da mesa passa por aqui: desenha, avisa a sala e distribui quando todos estão prontos. */
function aoMudarMesa(e: Estado): void {
  if (net && mesa) net.send('estado', mesa.publico());
  receber(mesa ? structuredClone(e) : e);
  if (modo === 'local') {
    const saldos = ler<Record<string, number>>('vinteum.saldos', {});
    for (const i of meus) if (e.assentos[i].tipo === 'pessoa') saldos[e.assentos[i].nome] = e.assentos[i].saldo;
    guardar('vinteum.saldos', saldos);
  }
  if (mesa?.podeDistribuir() && !distribuirTimer) {
    distribuirTimer = setTimeout(() => {
      distribuirTimer = null;
      mesa?.distribuir();
    }, 700);
  }
}

function receber(e: Estado): void {
  estado = e;
  if (e.fase !== 'jogadas' || e.vez !== vezAnterior) dica = '';
  if (e.fase === 'jogadas' && e.vez !== vezAnterior && meus.includes(e.vez) && e.assentos[e.vez].tipo === 'pessoa') tocar('vez', 0.4);
  if (e.fase === 'fim' && faseAnterior !== 'fim') somDoResultado(e);
  vezAnterior = e.vez;
  faseAnterior = e.fase;
  // Nas apostas o indicador vira cursor para escolher as fichas; nas jogadas, cada gesto é uma ação.
  gestos.modo = e.fase === 'apostas' || e.fase === 'fim' ? 'cursor' : 'jogada';
  cena.atualizar(e);
  desenharRotulos();
  desenharPainel();
  if (e.aviso && `${e.rodada}:${e.aviso}` !== avisoAnterior) mostrarAviso(e.aviso);
  avisoAnterior = `${e.rodada}:${e.aviso}`;
}

function somDoResultado(e: Estado): void {
  const minhas = meus.flatMap((i) => (e.assentos[i].tipo === 'pessoa' ? e.assentos[i].maos : []));
  if (!minhas.length) return;
  const saldo = minhas.reduce((s, m) => s + m.premio - m.aposta, 0);
  setTimeout(() => tocar(minhas.some((m) => m.resultado === 'blackjack') ? 'blackjack' : saldo > 0 ? 'vitoria' : saldo < 0 ? 'derrota' : 'ficha'), 700);
}

let avisoTimer: ReturnType<typeof setTimeout> | null = null;
function mostrarAviso(texto: string): void {
  aviso.textContent = texto;
  aviso.classList.add('visivel');
  if (avisoTimer) clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => aviso.classList.remove('visivel'), 2600);
}

/* ---------- Rótulos sobre a mesa ---------- */

const RESULTADO: Record<string, [string, string]> = {
  blackjack: ['Blackjack!', 'ganho'],
  ganhou: ['Ganhou', 'ganho'],
  empate: ['Empate', 'empate'],
  perdeu: ['Perdeu', 'perda'],
  estourou: ['Estourou', 'perda'],
};

const rotuloBanca = el('div', { cls: 'rotulo banca' });
const rotulosAssento = [0, 1, 2].map(() => el('div', { cls: 'rotulo' }));
rotulos.append(rotuloBanca, ...rotulosAssento);

function desenharRotulos(): void {
  if (!estado) return;
  const e = estado;
  const totalBanca = textoTotal(e.banca);
  rotuloBanca.replaceChildren(el('strong', { textContent: 'Banca' }), totalBanca ? el('span', { cls: 'total', textContent: totalBanca }) : '');
  e.assentos.forEach((a, i) => {
    const r = rotulosAssento[i];
    r.classList.toggle('vez', e.fase === 'jogadas' && e.vez === i);
    r.classList.toggle('meu', meus.includes(i) && a.tipo === 'pessoa');
    if (a.tipo === 'vazio') {
      const podeChamar = mesa && (e.fase === 'apostas' || e.fase === 'fim');
      r.replaceChildren(el('span', { cls: 'vazio', textContent: 'Lugar livre' }), podeChamar ? el('button', { cls: 'mini', textContent: '+ Computador', onclick: () => enviar({ t: 'bot', i, tipo: 'bot' }) }) : '');
      return;
    }
    const maos = a.maos.map((m, k) => {
      const [texto, classe] = m.resultado ? RESULTADO[m.resultado] : ['', ''];
      const ganho = m.resultado ? m.premio - m.aposta : 0;
      return el(
        'div',
        { cls: `mao${e.vez === i && a.atual === k && e.fase === 'jogadas' ? ' atual' : ''}` },
        el('span', { cls: 'total', textContent: textoTotal(m.cartas) }),
        m.resultado ? el('span', { cls: `res ${classe}`, textContent: `${texto} ${ganho > 0 ? `+${reais(ganho)}` : ganho < 0 ? `−${reais(-ganho)}` : ''}` }) : '',
      );
    });
    const sair =
      mesa && a.tipo === 'bot' && (e.fase === 'apostas' || e.fase === 'fim') ? el('button', { cls: 'mini', textContent: 'tirar', title: 'Tirar o computador deste lugar', onclick: () => enviar({ t: 'bot', i, tipo: 'vazio' }) }) : '';
    r.replaceChildren(
      el('div', { cls: 'nome' }, el('strong', { textContent: a.nome }), a.tipo === 'bot' ? el('small', { textContent: ' 🤖' }) : '', sair),
      el('div', { cls: 'saldo', textContent: `Saldo ${reais(a.saldo)}${a.maos.length ? '' : a.aposta ? ` · aposta ${reais(a.aposta)}` : ''}${a.pronto && !a.maos.length ? ' ✓' : ''}` }),
      ...maos,
    );
  });
}

cena.aCadaQuadro(() => {
  if (!estado) return;
  const pos = (r: HTMLElement, p: { x: number; y: number }): void => {
    r.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, 0)`;
  };
  pos(rotuloBanca, cena.naTela('banca'));
  rotulosAssento.forEach((r, i) => pos(r, cena.naTela(i)));
  painel.classList.toggle('animando', cena.ocupado());
});

/* ---------- Painel de baixo: apostas e jogadas ---------- */

const VALORES_FICHA = [5, 10, 25, 100, 500];

function desenharPainel(): void {
  if (!estado) return;
  const e = estado;
  const linhas: HTMLElement[] = [];
  const minhasPessoas = meus.filter((i) => e.assentos[i].tipo === 'pessoa');

  if (e.fase === 'apostas' || e.fase === 'fim') {
    for (const i of minhasPessoas) {
      const a = e.assentos[i];
      if (a.saldo < APOSTA_MIN) {
        linhas.push(el('div', { cls: 'linha' }, el('strong', { textContent: `${a.nome}: sem fichas.` }), el('button', { cls: 'btn', textContent: `Recomeçar com ${reais(1000)}`, onclick: () => enviar({ t: 'recarregar', i }) })));
        continue;
      }
      const fichas = VALORES_FICHA.filter((v) => v <= a.saldo).map((v) =>
        el('button', {
          cls: 'ficha',
          textContent: String(v),
          title: `Somar ${v}`,
          disabled: a.pronto,
          onclick: () => {
            tocar('ficha');
            enviar({ t: 'apostar', i, valor: a.aposta + v });
          },
        }),
      );
      fichas.forEach((f, k) => f.style.setProperty('--cor', CORES_FICHAS[VALORES_FICHA[k]] ?? '#888'));
      linhas.push(
        el(
          'div',
          { cls: 'linha' },
          el('strong', { cls: 'quem', textContent: a.nome }),
          el('span', { cls: 'valor', textContent: reais(a.aposta) }),
          el('div', { cls: 'fichas' }, ...fichas),
          el('button', { cls: 'btn leve', textContent: 'Limpar', disabled: a.pronto, onclick: () => enviar({ t: 'apostar', i, valor: 0 }) }),
          el('button', {
            cls: a.pronto ? 'btn leve' : 'btn forte',
            textContent: a.pronto ? 'Mudar aposta' : e.fase === 'fim' ? 'Apostar de novo' : 'Apostar',
            disabled: !a.pronto && a.aposta < APOSTA_MIN,
            onclick: () => enviar({ t: 'pronto', i, pronto: !a.pronto }),
          }),
        ),
      );
    }
    const esperando = e.assentos.filter((a) => a.tipo === 'pessoa' && !a.pronto && a.saldo >= APOSTA_MIN).map((a) => a.nome);
    const ninguem = !e.assentos.some((a) => a.tipo !== 'vazio');
    linhas.push(
      el('p', {
        cls: 'status',
        textContent: ninguem
          ? 'Ninguém na mesa. Chame o computador para um lugar livre ou espere alguém entrar.'
          : esperando.length
            ? `Aposta mínima ${reais(APOSTA_MIN)}. Esperando: ${esperando.join(', ')}.`
            : 'Distribuindo as cartas…',
      }),
    );
  } else if (e.fase === 'jogadas') {
    const a = e.assentos[e.vez];
    const minhaVez = meus.includes(e.vez) && a?.tipo === 'pessoa';
    if (minhaVez) {
      const ops = opcoesDe(e, e.vez);
      const m = a.maos[a.atual];
      const teclas: Record<Jogada, string> = { pedir: '1', parar: '2', dobrar: '3', dividir: '4' };
      linhas.push(
        el('p', { cls: 'status forte', textContent: `Sua vez, ${a.nome}${a.maos.length > 1 ? ` (mão ${a.atual + 1} de ${a.maos.length})` : ''}: ${textoTotal(m.cartas)}` }),
        el(
          'div',
          { cls: 'linha acoes' },
          ...(['pedir', 'parar', 'dobrar', 'dividir'] as Jogada[]).map((j) =>
            el('button', { cls: j === 'pedir' || j === 'parar' ? 'btn forte' : 'btn', textContent: `${NOME_JOGADA[j]} (${teclas[j]})`, disabled: !ops.includes(j), onclick: () => jogar(j) }),
          ),
          el('button', { cls: 'btn leve', textContent: 'Dica (H)', onclick: mostrarDica }),
        ),
      );
      if (dica) linhas.push(el('p', { cls: 'dica', textContent: dica }));
    } else {
      linhas.push(el('p', { cls: 'status', textContent: a?.tipo === 'bot' || a?.saindo ? `${a.nome} está pensando…` : `Vez de ${a?.nome ?? '…'}` }));
    }
  } else if (e.fase === 'banca') {
    linhas.push(el('p', { cls: 'status', textContent: `A banca está jogando: ${textoTotal(e.banca) || '…'}` }));
  }
  painel.replaceChildren(...linhas);
}

function jogar(j: Jogada): void {
  if (!estado || cena.ocupado()) return;
  if (!opcoesDe(estado, estado.vez).includes(j) || !meus.includes(estado.vez)) return;
  enviar({ t: 'jogar', i: estado.vez, jogada: j });
}

function mostrarDica(): void {
  if (!estado) return;
  const a = estado.assentos[estado.vez];
  const m = a?.maos[a.atual];
  if (!m) return;
  const ops = opcoesDe(estado, estado.vez);
  const j = estrategia(m.cartas, estado.banca[0], ops.includes('dobrar'), ops.includes('dividir'));
  const t = total(m.cartas);
  dica = `Pela estratégia básica, com ${t.macia ? 'mão macia de ' : ''}${t.valor} contra ${estado.banca[0].valor} da banca: ${NOME_JOGADA[j].toLowerCase()}.`;
  desenharPainel();
}

addEventListener('keydown', (ev) => {
  if (modo === 'menu' || !estado || ev.target instanceof HTMLInputElement) return;
  const mapa: Record<string, Jogada> = { '1': 'pedir', ' ': 'pedir', '2': 'parar', Enter: 'parar', '3': 'dobrar', '4': 'dividir' };
  if (mapa[ev.key] && estado.fase === 'jogadas') {
    ev.preventDefault();
    jogar(mapa[ev.key]);
  } else if (ev.key.toLowerCase() === 'h' && estado.fase === 'jogadas' && meus.includes(estado.vez)) mostrarDica();
});

/* ---------- Topo ---------- */

function desenharTopo(): void {
  const somBtn = el('button', { cls: 'icone', title: 'Som', textContent: estaMudo() ? '🔇' : '🔊' });
  somBtn.onclick = () => {
    alternarSom();
    somBtn.textContent = estaMudo() ? '🔇' : '🔊';
  };
  const sala = codigoSala
    ? el(
        'button',
        {
          cls: 'sala',
          title: 'Copiar o convite',
          onclick: async () => {
            const link = `${location.origin}${location.pathname}?sala=${codigoSala}`;
            try {
              await navigator.clipboard.writeText(link);
              mostrarAviso('Convite copiado. Mande para os amigos!');
            } catch {
              mostrarAviso(`Sala ${codigoSala}: ${link}`);
            }
          },
        },
        `Sala ${codigoSala} · copiar convite`,
      )
    : '';
  topo.replaceChildren(
    el('strong', { cls: 'marca', textContent: '21 contra a Banca' }),
    sala,
    el('span', { cls: 'espaco' }),
    el('button', { cls: `icone${lugarVisto !== null ? ' ligado' : ''}`, title: lugarVisto !== null ? 'Ver a mesa de cima' : 'Sentar: ver do meu lugar', textContent: '👁', onclick: () => alternarVisao() }),
    el('button', { cls: `icone${gestos.ligado ? ' ligado' : ''}`, title: gestos.ligado ? 'Desligar os gestos' : 'Jogar por gestos (câmera)', textContent: '🖐', onclick: () => void alternarGestos() }),
    el('button', { cls: 'icone', title: 'Regras', textContent: '?', onclick: () => abrirRegras() }),
    somBtn,
    el('button', { cls: 'icone', title: 'Sair para o menu', textContent: '✕', onclick: () => voltarAoMenu() }),
  );
}

function abrirRegras(): void {
  const caixa = el(
    'div',
    { cls: 'caixa regras' },
    el('h2', { textContent: 'Como jogar' }),
    el('p', { textContent: 'Chegue mais perto de 21 do que a banca, sem passar. Ás vale 1 ou 11, figuras valem 10.' }),
    el(
      'ul',
      {},
      ...[
        'Blackjack (ás + carta de 10 nas duas primeiras) paga 3 para 2.',
        'A banca compra até 17 e para em todo 17.',
        'Pedir: mais uma carta. Parar: fica com o que tem.',
        'Dobrar: dobra a aposta e recebe só mais uma carta.',
        'Dividir: com duas cartas de mesmo valor, separa em duas mãos (até 4). Ases divididos recebem uma carta cada.',
        'Empate devolve a aposta. Seis baralhos, reembaralhados quando 75% já saiu.',
        'Atalhos: 1 ou Espaço pede, 2 ou Enter para, 3 dobra, 4 divide, H mostra a dica.',
        'Por gestos (🖐 no topo): 👆 pedir, ✋ parar, 🤟 três dedos dobrar, ✌️ dividir e 👍 apostar. Segure o gesto até o anel completar. Nas apostas, aponte o indicador para uma ficha e segure para escolher.',
      ].map((t) => el('li', { textContent: t })),
    ),
    el('p', { cls: 'nota', textContent: 'Jogo de entretenimento com fichas de mentira, sem dinheiro de verdade.' }),
    el('button', { cls: 'btn forte', textContent: 'Entendi', onclick: () => caixa.parentElement?.remove() }),
  );
  app.append(el('div', { cls: 'fundo', onclick: (ev: MouseEvent) => ev.target === ev.currentTarget && (ev.currentTarget as HTMLElement).remove() }, caixa));
}

/* ---------- Menu ---------- */

interface ConfigLocal {
  lugares: { tipo: Tipo; nome: string }[];
  nomeOnline: string;
  gesto?: { lugar: number; nome: string; bots: boolean };
}

const configPadrao: ConfigLocal = {
  lugares: [
    { tipo: 'pessoa', nome: 'Jogador 1' },
    { tipo: 'bot', nome: '' },
    { tipo: 'vazio', nome: '' },
  ],
  nomeOnline: '',
};

function desenharMenu(erro = ''): void {
  const cfg = ler<ConfigLocal>('vinteum.config', configPadrao);
  const lugares = cfg.lugares.map((l, i) => {
    const tipo = el(
      'select',
      { ariaLabel: `Lugar ${i + 1}` },
      ...([
        ['pessoa', 'Pessoa'],
        ['bot', 'Computador'],
        ['vazio', 'Vazio'],
      ] as const).map(([v, t]) => el('option', { value: v, textContent: t, selected: l.tipo === v })),
    );
    const nome = el('input', { value: l.nome || `Jogador ${i + 1}`, maxLength: 16, ariaLabel: `Nome do lugar ${i + 1}` });
    const sync = (): void => {
      nome.disabled = tipo.value !== 'pessoa';
    };
    tipo.onchange = sync;
    sync();
    return { tipo, nome, linha: el('div', { cls: 'lugar' }, el('span', { textContent: `Lugar ${i + 1}` }), tipo, nome) };
  });
  const nomeOnline = el('input', { value: cfg.nomeOnline, maxLength: 16, placeholder: 'Seu nome', ariaLabel: 'Seu nome' });
  const codigo = el('input', { value: new URLSearchParams(location.search).get('sala') ?? '', maxLength: 6, placeholder: 'CÓDIGO', ariaLabel: 'Código da sala' });
  codigo.oninput = () => (codigo.value = codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));

  // Sentar por gestos: escolhe o lugar na mesa (esquerda, meio ou direita).
  const gesto = { lugar: 1, nome: '', bots: true, ...cfg.gesto };
  const nomeGesto = el('input', { value: gesto.nome, maxLength: 16, placeholder: 'Seu nome', ariaLabel: 'Seu nome na mesa' });
  const comBots = el('input', { type: 'checkbox', checked: gesto.bots });
  const botoesLugar = ['Esquerda', 'Meio', 'Direita'].map((rotulo, i) =>
    el('button', {
      cls: i === gesto.lugar ? 'lugar-btn ativo' : 'lugar-btn',
      textContent: `🪑 ${rotulo}`,
      onclick: () => {
        gesto.lugar = i;
        botoesLugar.forEach((b, k) => b.classList.toggle('ativo', k === i));
      },
    }),
  );

  const salvarCfg = (): ConfigLocal => {
    const novo: ConfigLocal = {
      lugares: lugares.map((l) => ({ tipo: l.tipo.value as Tipo, nome: l.nome.value.trim() })),
      nomeOnline: nomeOnline.value.trim(),
      gesto: { lugar: gesto.lugar, nome: nomeGesto.value.trim(), bots: comBots.checked },
    };
    guardar('vinteum.config', novo);
    return novo;
  };

  const secaoGestos = el(
    'section',
    { cls: 'destaque-gestos' },
    el('h2', { textContent: '🖐 Sentar à mesa e jogar por gestos' }),
    el('p', { cls: 'nota', textContent: 'A câmera vê sua mão: 👆 pedir · ✋ parar · 🤟 dobrar · ✌️ dividir · 👍 apostar. A visão 3D fica no seu lugar, olhando para a banca.' }),
    el('div', { cls: 'lugares-mesa' }, ...botoesLugar),
    el('div', { cls: 'lugar' }, nomeGesto),
    el('label', { cls: 'lugar marcar' }, comBots, 'Computador nos outros lugares'),
    el('button', {
      cls: 'btn forte grande',
      textContent: 'Sentar e jogar por gestos',
      onclick: () => {
        const c = salvarCfg();
        const g = c.gesto!;
        const nome = g.nome || 'Você';
        void iniciarPorGestos({ ...c, lugares: [0, 1, 2].map((i) => (i === g.lugar ? { tipo: 'pessoa' as Tipo, nome } : { tipo: (g.bots ? 'bot' : 'vazio') as Tipo, nome: '' })) }, g.lugar);
      },
    }),
  );

  menu.replaceChildren(
    el(
      'div',
      { cls: 'caixa' },
      el('h1', { textContent: '21 contra a Banca' }),
      el('p', { cls: 'sub', textContent: 'Blackjack em 3D: até 3 jogadores contra a banca, no mesmo aparelho ou online com amigos.' }),
      erro ? el('p', { cls: 'erro', textContent: erro }) : '',
      secaoGestos,
      el(
        'section',
        {},
        el('h2', { textContent: 'Neste aparelho' }),
        ...lugares.map((l) => l.linha),
        el('button', {
          cls: 'btn forte grande',
          textContent: 'Jogar',
          onclick: () => {
            const c = salvarCfg();
            if (!c.lugares.some((l) => l.tipo !== 'vazio')) return desenharMenu('Coloque pelo menos uma pessoa ou o computador na mesa.');
            iniciarLocal(c);
          },
        }),
      ),
      el(
        'section',
        {},
        el('h2', { textContent: 'Online com amigos' }),
        el('div', { cls: 'lugar' }, nomeOnline),
        el('button', {
          cls: 'btn forte',
          textContent: 'Criar sala',
          onclick: () => {
            const c = salvarCfg();
            iniciarHospede(c.nomeOnline || 'Anfitrião');
          },
        }),
        el(
          'div',
          { cls: 'lugar' },
          codigo,
          el('button', {
            cls: 'btn',
            textContent: 'Entrar na sala',
            onclick: () => {
              const c = salvarCfg();
              if (codigo.value.length !== 6) return desenharMenu('O código da sala tem 6 letras.');
              iniciarConvidado(codigo.value, c.nomeOnline || 'Convidado');
            },
          }),
        ),
        el('p', { cls: 'nota', textContent: 'A conexão é direta entre os navegadores. Em algumas redes de empresa ou de celular ela pode ser bloqueada.' }),
      ),
      el('p', { cls: 'nota', textContent: 'Fichas de mentira, só por diversão. Nada de dinheiro de verdade.' }),
    ),
  );
  menu.hidden = false;
}

function limparPartida(): void {
  mesa?.parar();
  mesa = null;
  net?.leave();
  net = null;
  codigoSala = '';
  anfitriao = '';
  meus = [];
  estado = null;
  if (distribuirTimer) clearTimeout(distribuirTimer);
  distribuirTimer = null;
}

function voltarAoMenu(erro = ''): void {
  limparPartida();
  gestos.desligar();
  lugarVisto = null;
  cena.sentar(null);
  modo = 'menu';
  history.replaceState(null, '', location.pathname);
  painel.replaceChildren();
  rotulos.hidden = true;
  desenharMenu(erro);
}

function comecarMesa(): Mesa {
  limparPartida();
  mesa = new Mesa(aoMudarMesa);
  menu.hidden = true;
  rotulos.hidden = false;
  return mesa;
}

function iniciarLocal(cfg: ConfigLocal): void {
  const m = comecarMesa();
  modo = 'local';
  const saldos = ler<Record<string, number>>('vinteum.saldos', {});
  cfg.lugares.forEach((l, i) => {
    const nome = l.tipo === 'bot' ? `Computador ${i + 1}` : l.nome || `Jogador ${i + 1}`;
    if (l.tipo !== 'vazio') m.ocupar(i, l.tipo, nome, '', l.tipo === 'pessoa' ? saldos[nome] : undefined);
  });
  meus = [0, 1, 2];
  desenharTopo();
  aoMudarMesa(m.estado);
}

/** Jogo local com você sentado num lugar: a câmera 3D vai para o lugar e os gestos ligam. */
async function iniciarPorGestos(cfg: ConfigLocal, lugar: number): Promise<void> {
  iniciarLocal(cfg);
  lugarVisto = lugar;
  cena.sentar(lugar);
  desenharTopo();
  if (!gestos.ligado) await alternarGestos();
}

function iniciarHospede(nome: string): void {
  const m = comecarMesa();
  modo = 'hospede';
  codigoSala = newRoomCode();
  net = connect(codigoSala);
  history.replaceState(null, '', `${location.pathname}?sala=${codigoSala}`);
  m.ocupar(0, 'pessoa', nome);
  meus = [0];
  net.on('entrar', (dados, peer) => {
    const d = dados as { nome?: string };
    const e = m.estado;
    if (e.assentos.some((a) => a.dono === peer)) return;
    const livre = e.assentos.findIndex((a) => a.tipo === 'vazio' && !a.saindo);
    if (livre < 0) return net?.send('cheia', {}, peer);
    m.ocupar(livre, 'pessoa', String(d.nome ?? 'Convidado'), peer);
    net?.send('lugar', { i: livre }, peer);
    net?.send('estado', m.publico(), peer);
    mostrarAviso(`${m.estado.assentos[livre].nome} entrou na mesa.`);
  });
  net.on('acao', (dados, peer) => aplicar(dados as Acao, peer));
  net.onLeave((peer) => {
    const i = m.estado.assentos.findIndex((a) => a.dono === peer);
    if (i < 0) return;
    mostrarAviso(`${m.estado.assentos[i].nome} saiu da mesa.`);
    m.liberar(i);
  });
  desenharTopo();
  aoMudarMesa(m.estado);
  mostrarAviso('Sala criada. Copie o convite no topo e mande para até 2 amigos.');
}

function iniciarConvidado(codigo: string, nome: string): void {
  limparPartida();
  modo = 'convidado';
  codigoSala = codigo;
  net = connect(codigo);
  menu.hidden = true;
  rotulos.hidden = false;
  desenharTopo();
  painel.replaceChildren(el('p', { cls: 'status', textContent: `Procurando a sala ${codigo}…` }));
  const pedir = (): void => net?.send('entrar', { nome });
  net.onJoin(() => pedir());
  pedir();
  const desistir = setTimeout(() => {
    if (!meus.length) voltarAoMenu(`Não encontrei a sala ${codigo}. Confira o código e se quem criou está com o jogo aberto.`);
  }, 20000);
  net.on('lugar', (dados, peer) => {
    clearTimeout(desistir);
    anfitriao = peer;
    meus = [(dados as { i: number }).i];
    mostrarAviso('Você entrou na mesa. Boa sorte!');
    if (estado) receber(estado);
  });
  net.on('estado', (dados, peer) => {
    if (anfitriao && peer !== anfitriao) return;
    receber(dados as Estado);
  });
  net.on('cheia', () => {
    clearTimeout(desistir);
    voltarAoMenu('A mesa já está cheia (3 jogadores).');
  });
  net.onLeave((peer) => {
    if (peer === anfitriao) voltarAoMenu('Quem criou a sala saiu. A mesa foi fechada.');
  });
}

/* ---------- Início ---------- */

rotulos.hidden = true;
const salaDoLink = new URLSearchParams(location.search).get('sala');
desenharMenu(salaDoLink ? 'Você recebeu um convite: escreva seu nome e clique em “Entrar na sala”.' : '');
