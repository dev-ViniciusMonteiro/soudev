import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Office, type DeskView, type Pick } from './office';
import { MAX_AGENTS, ROLES, getRole, randomName } from './roles';
import type { Agent, MissionRun, ModelInfo, Settings } from './types';
import {
  DEMO_MODEL,
  KEY_STORAGE_NAME,
  defaultModel,
  demoChat,
  fallbackModels,
  fetchModels,
  finishOAuthIfNeeded,
  getKey,
  openRouterChat,
  setKey,
  startOAuth,
} from './llm';
import { runMission } from './engine';
import { buildAgentDoc, buildMissionDoc, downloadText, money, slug } from './docs';

/* ---------- Estado (salvo no navegador) ---------- */

const STORAGE = 'escritorio-ia.estado';

interface HistoryItem {
  id: string;
  objective: string;
  status: MissionRun['status'];
  finishedAt: string;
  totalCost: number;
  doc: string;
}

interface State {
  agents: Agent[];
  settings: Settings;
  objective: string;
  run: MissionRun | null;
  log: string[];
  history: HistoryItem[];
}

const DEFAULT_STATE: State = {
  agents: [],
  settings: { leaderModel: '', maxRounds: 3, pauseSeconds: 3, freeOnly: true, demo: !getKey(), useFallbacks: true },
  objective: '',
  run: null,
  log: [],
  history: [],
};

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = JSON.parse(raw) as State;
    const state = { ...structuredClone(DEFAULT_STATE), ...s, settings: { ...DEFAULT_STATE.settings, ...s.settings } };
    // Uma missão que estava rodando quando a página fechou é marcada como cancelada.
    if (state.run?.status === 'rodando') {
      state.run.status = 'cancelada';
      state.run.error = 'A página foi fechada durante a missão.';
      for (const a of state.agents) if (a.status === 'trabalhando' || a.status === 'refazendo') a.status = 'aguardando';
    }
    return state;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

const state = loadState();
let saveTimer = 0;
function save(): void {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      toast('Não foi possível salvar no navegador (armazenamento cheio). Baixe a documentação.');
    }
  }, 200);
}

let catalog: ModelInfo[] = [];
let catalogError = '';
let running: AbortController | null = null;
let leaderReading = false;
let tab: 'equipe' | 'missao' | 'relatorios' | 'conta' | 'regras' = state.agents.length ? 'missao' : 'regras';

/* ---------- Utilidades de interface ---------- */

type Child = Node | string | null | false | undefined;
function h(tag: string, attrs: Record<string, unknown> = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'value' || k === 'checked' || k === 'disabled') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== false && c !== undefined) el.append(c);
  return el;
}

/** Markdown vindo dos modelos é conteúdo não confiável: sempre sanitizado antes de virar HTML. */
function md(text: string): HTMLElement {
  const el = h('div', { class: 'md' });
  // Sem imagens/estilos: um modelo (ou prompt malicioso) poderia usar URLs de imagem para vazar dados.
  el.innerHTML = DOMPurify.sanitize(marked.parse(text, { async: false }) as string, { FORBID_TAGS: ['img', 'style', 'svg', 'math', 'form', 'input'], FORBID_ATTR: ['style'] });
  for (const link of el.querySelectorAll('a')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
  return el;
}

let toastTimer = 0;
function toast(text: string): void {
  const el = document.getElementById('toast')!;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 3800);
}

const uid = (): string => Math.random().toString(36).slice(2, 7);
const hasKey = (): boolean => !!getKey();
/** Acha o modelo mesmo quando o OpenRouter devolve o id sem :free ou com data no fim (ex.: gpt-4o-mini-2024-07-18). */
const modelInfo = (id: string): ModelInfo | undefined =>
  catalog.find((m) => m.id === id) ??
  catalog.find((m) => m.id.replace(/:free$/, '') === id.replace(/:free$/, '')) ??
  catalog.filter((m) => id.startsWith(m.id)).sort((x, y) => y.id.length - x.id.length)[0];
const price = (model: string, tokensIn: number, tokensOut: number): number => {
  const m = modelInfo(model);
  return m ? m.promptPrice * tokensIn + m.completionPrice * tokensOut : 0;
};

function priceLabel(id: string): string {
  if (state.settings.demo) return 'Modo demonstração: sem custo';
  const m = modelInfo(id);
  if (!m) return catalog.length ? 'Modelo não encontrado no OpenRouter' : 'Carregando preços…';
  if (m.free) return '🆓 Grátis (limite de pedidos do OpenRouter)';
  const est = price(id, 2500, 1500);
  return `US$ ${(m.promptPrice * 1e6).toFixed(2)} / 1M entrada · US$ ${(m.completionPrice * 1e6).toFixed(2)} / 1M saída · ~${money(est)} por relatório`;
}

/** Campo de modelo com busca (lista do OpenRouter). Só aceita modelos existentes. */
function modelPicker(value: string, onChange: (id: string) => void, disabled = false): HTMLElement {
  const info = h('span', { class: 'small muted', text: priceLabel(value) });
  const input = h('input', { type: 'text', list: 'model-list', value, disabled, placeholder: 'Busque: llama, gemma, gpt, claude…' }) as HTMLInputElement;
  input.addEventListener('change', () => {
    const id = input.value.trim();
    if (catalog.length && !modelInfo(id)) {
      toast('Escolha um modelo da lista do OpenRouter.');
      input.value = value;
      return;
    }
    value = id;
    info.textContent = priceLabel(id);
    onChange(id);
  });
  return h('label', { class: 'field' }, 'Modelo (LLM)', input, info);
}

function refreshModelList(): void {
  const list = document.getElementById('model-list')!;
  list.replaceChildren(
    ...catalog
      .filter((m) => !state.settings.freeOnly || m.free)
      .map((m) => h('option', { value: m.id, label: `${m.free ? '🆓 ' : ''}${m.name}` })),
  );
}

/* ---------- Cena 3D ---------- */

const office = new Office(document.getElementById('scene')!, (pick: Pick) => {
  if (pick.kind === 'shop') openShop();
  else if (pick.kind === 'leader') openLeader();
  else {
    const agent = state.agents.find((a) => a.desk === pick.index);
    if (agent) openAgent(agent);
    else openShop(pick.index);
  }
});

function deskView(a: Agent): DeskView {
  const role = getRole(a.roleId);
  return { name: a.name, roleTitle: role.title, icon: role.icon, color: role.color, model: state.settings.demo ? `${a.model} (demo)` : a.model, status: a.status };
}

function syncScene(): void {
  for (let i = 0; i < MAX_AGENTS; i++) {
    const a = state.agents.find((x) => x.desk === i);
    office.setDesk(i, a ? deskView(a) : null);
  }
  office.setLeader(state.settings.leaderModel, leaderReading);
}

/* ---------- Barra superior e painel ---------- */

const app = document.getElementById('app')!;

function render(): void {
  const connected = state.settings.demo
    ? h('span', { class: 'chip warn', text: '🧪 Modo demonstração' })
    : hasKey()
      ? h('span', { class: 'chip ok', text: '🔑 OpenRouter conectado' })
      : h('span', { class: 'chip warn', text: '🔌 Conecte o OpenRouter' });
  const cost = state.run ? h('span', { class: 'chip hide-mobile', text: `💲 Missão: ${money(state.run.totalCost)}` }) : null;
  const panelOpen = !document.getElementById('panel')?.classList.contains('hidden');

  const bar = h(
    'div',
    { class: 'bar' },
    h('span', { class: 'brand', text: '🏢 Escritório IA' }),
    connected,
    h('span', { class: 'chip hide-mobile', text: `👥 ${state.agents.length}/${MAX_AGENTS}` }),
    cost,
    h('span', { class: 'spacer' }),
    h('button', { class: 'btn', text: '🛒 Loja', onclick: () => openShop(), disabled: !!running }),
    running
      ? h('button', { class: 'btn danger', text: '⏹ Parar', onclick: () => running?.abort() })
      : h('button', { class: 'btn primary', text: '▶ Missão', onclick: () => setTab('missao') }),
    h('button', { class: 'btn', text: panelOpen ? '✕ Painel' : '☰ Painel', onclick: togglePanel }),
  );

  const tabs: [typeof tab, string][] = [
    ['equipe', 'Equipe'],
    ['missao', 'Missão'],
    ['relatorios', 'Relatórios'],
    ['conta', 'Conta'],
    ['regras', 'Regras'],
  ];
  const panel = h(
    'div',
    { id: 'panel', class: panelOpen ? '' : 'hidden' },
    h('div', { class: 'tabs' }, ...tabs.map(([id, label]) => h('button', { class: `tab${tab === id ? ' active' : ''}`, text: label, onclick: () => setTab(id) }))),
    h('div', { class: 'body' }, ...renderTab()),
  );

  const scroll = document.querySelector('#panel .body')?.scrollTop ?? 0;
  app.replaceChildren(bar, panel, h('datalist', { id: 'model-list' }), h('div', { id: 'modal', class: modalOpen ? 'open' : '', onpointerdown: (e: Event) => { if (e.target === e.currentTarget) closeModal(); } }), h('div', { id: 'toast' }));
  refreshModelList();
  if (modalContent) document.getElementById('modal')!.append(modalContent);
  const body = document.querySelector('#panel .body');
  if (body) body.scrollTop = scroll;
}

function togglePanel(): void {
  document.getElementById('panel')!.classList.toggle('hidden');
  render();
}

function setTab(t: typeof tab): void {
  tab = t;
  document.getElementById('panel')?.classList.remove('hidden');
  render();
}

function renderTab(): HTMLElement[] {
  switch (tab) {
    case 'equipe':
      return renderTeam();
    case 'missao':
      return renderMission();
    case 'relatorios':
      return renderReports();
    case 'conta':
      return renderAccount();
    default:
      return renderRules();
  }
}

const STATUS_COLOR: Record<string, string> = {
  aguardando: '#94a3b8',
  trabalhando: '#38bdf8',
  entregue: '#a78bfa',
  refazendo: '#fbbf24',
  ok: '#4ade80',
  encerrado: '#f87171',
  erro: '#f87171',
};
const statusPill = (s: string): HTMLElement => h('span', { class: 'pill', style: `background:${STATUS_COLOR[s] ?? '#94a3b8'}`, text: s === 'ok' ? 'OK ✓' : s });

function renderTeam(): HTMLElement[] {
  const leader = h(
    'div',
    { class: 'card' },
    h('h3', {}, '🧑‍💼 Líder da equipe'),
    h('p', { class: 'small muted', text: 'Lê todos os relatórios, decide se a missão foi resolvida e, se não, manda todos refazerem com um prompt melhorado.' }),
    modelPicker(state.settings.leaderModel, (id) => {
      state.settings.leaderModel = id;
      save();
      syncScene();
    }, !!running),
  );
  const cards = state.agents
    .slice()
    .sort((a, b) => a.desk - b.desk)
    .map((a) => {
      const role = getRole(a.roleId);
      const cost = a.reports.reduce((t, r) => t + r.cost, 0);
      return h(
        'div',
        { class: 'card' },
        h('h3', {}, `${role.icon} ${a.name}`, h('span', { class: 'small muted', text: role.title }), h('span', { class: 'spacer', style: 'flex:1' }), statusPill(a.status)),
        h('div', { class: 'small muted', text: `Mesa ${a.desk + 1} · ${a.model} · ${a.reports.length} relatório(s) · ${money(cost)}` }),
        h('div', { class: 'small', text: `Tarefa: ${a.task}` }),
        h('div', { class: 'row' }, h('button', { class: 'btn small', text: 'Abrir', onclick: () => openAgent(a) })),
      );
    });
  return [
    leader,
    h('div', { class: 'row' }, h('strong', { text: `Funcionários (${state.agents.length}/${MAX_AGENTS})` }), h('span', { style: 'flex:1' }), h('button', { class: 'btn small', text: '🛒 Contratar', disabled: !!running || state.agents.length >= MAX_AGENTS, onclick: () => openShop() })),
    ...(cards.length ? cards : [h('div', { class: 'notice', text: 'Nenhum funcionário ainda. Clique na loja (balcão verde) ou em uma mesa livre para contratar.' })]),
    state.agents.length && !running
      ? h('button', { class: 'btn danger', text: 'Encerrar todos os contratos e liberar as mesas', onclick: fireAll })
      : null,
  ].filter(Boolean) as HTMLElement[];
}

function renderMission(): HTMLElement[] {
  const run = state.run;
  const disabled = !!running;
  const objective = h('textarea', { rows: 5, disabled, placeholder: 'Ex.: Criar o plano de lançamento de uma loja online de camisetas, com público, divulgação, custos e textos das redes sociais.' }) as HTMLTextAreaElement;
  objective.value = state.objective;
  objective.addEventListener('input', () => {
    state.objective = objective.value;
    save();
  });
  const rounds = h('input', { type: 'number', min: 1, max: 5, value: state.settings.maxRounds, disabled }) as HTMLInputElement;
  rounds.addEventListener('change', () => {
    state.settings.maxRounds = Math.min(5, Math.max(1, Math.round(Number(rounds.value) || 3)));
    save();
    render();
  });
  const pause = h('input', { type: 'number', min: 0, max: 60, value: state.settings.pauseSeconds, disabled }) as HTMLInputElement;
  pause.addEventListener('change', () => {
    state.settings.pauseSeconds = Math.min(60, Math.max(0, Math.round(Number(pause.value) || 0)));
    save();
  });

  const out: HTMLElement[] = [
    h(
      'div',
      { class: 'card' },
      h('h3', {}, '🎯 Missão da equipe'),
      h('label', { class: 'field' }, 'Objetivo (o que a equipe deve entregar)', objective),
      h(
        'div',
        { class: 'row' },
        h('label', { class: 'field', style: 'flex:1' }, 'Máximo de rodadas (1 a 5)', rounds),
        h('label', { class: 'field', style: 'flex:1' }, 'Pausa entre chamadas (s)', pause),
      ),
      h('p', { class: 'small muted', text: 'Cada rodada: todos entregam relatório → o líder avalia. A pausa evita estourar o limite de 20 pedidos/min dos modelos gratuitos.' }),
      running
        ? h('button', { class: 'btn danger', text: '⏹ Parar missão', onclick: () => running?.abort() })
        : h('button', { class: 'btn primary', text: `▶ Iniciar missão com ${state.agents.length} agente(s)`, onclick: startMission, disabled: !state.agents.length }),
    ),
  ];

  if (run) {
    const label = { rodando: '⏳ Em andamento', aprovada: '✅ Aprovada', nao_aprovada: '⚠️ Não aprovada', cancelada: '⏹️ Cancelada', erro: '❌ Erro' }[run.status];
    out.push(
      h(
        'div',
        { class: 'card' },
        h('h3', {}, `📋 ${label}`, h('span', { class: 'small muted', text: `rodada ${run.round}/${run.maxRounds} · ${money(run.totalCost)}` })),
        run.error ? h('div', { class: 'notice error', text: run.error }) : null,
        !running && (run.status === 'erro' || run.status === 'cancelada') && run.round >= 1
          ? h('button', { class: 'btn primary', text: '🔄 Continuar de onde parou', onclick: continueMission })
          : null,
        h('div', { class: 'log' }, ...state.log.slice(-60).map((l) => h('div', { text: l }))),
        run.doc
          ? h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn primary small', text: '📘 Ver documentação final', onclick: () => openDoc(run.doc!) }),
              h('button', { class: 'btn small', text: '⬇ Baixar .md', onclick: () => downloadText(`missao-${slug(run.objective)}.md`, run.doc!) }),
            )
          : null,
      ),
    );
  }

  if (state.history.length) {
    out.push(
      h(
        'details',
        {},
        h('summary', { text: `🗂️ Missões anteriores (${state.history.length})` }),
        h(
          'div',
          { class: 'body', style: 'padding:8px 12px' },
          ...state.history.map((it) =>
            h(
              'div',
              { class: 'row small' },
              h('span', { style: 'flex:1', text: `${new Date(it.finishedAt).toLocaleDateString('pt-BR')} · ${it.objective.slice(0, 60)}` }),
              h('button', { class: 'btn small', text: 'Ver', onclick: () => openDoc(it.doc) }),
              h('button', { class: 'btn small', text: '⬇', onclick: () => downloadText(`missao-${slug(it.objective)}.md`, it.doc) }),
            ),
          ),
        ),
      ),
    );
  }
  return out;
}

function renderReports(): HTMLElement[] {
  const run = state.run;
  if (!run) return [h('div', { class: 'notice', text: 'Os relatórios aparecem aqui quando uma missão começa.' })];
  const out: HTMLElement[] = [];
  for (let r = 1; r <= run.round; r++) {
    out.push(h('strong', { text: `Rodada ${r}` }));
    for (const a of state.agents) {
      const rep = a.reports.find((x) => x.round === r);
      if (!rep) continue;
      out.push(h('details', {}, h('summary', { text: `📄 ${getRole(a.roleId).icon} ${a.name} · ${money(rep.cost)}` }), md(rep.content)));
    }
    const rv = run.reviews.find((x) => x.round === r);
    if (rv) {
      const fb = rv.approved
        ? md(rv.solution || rv.analysis)
        : h(
            'div',
            { class: 'md' },
            h('p', { text: rv.analysis }),
            ...rv.evaluations.map((e) => {
              const a = state.agents.find((x) => x.id === e.id);
              return h('p', {}, h('strong', { text: `${a?.name ?? e.id}: ` }), `${e.feedback || '-'} `, h('em', { text: e.newPrompt ? `Novo pedido: ${e.newPrompt}` : '' }));
            }),
          );
      out.push(h('details', { open: r === run.round }, h('summary', { text: `🧑‍💼 Líder: ${rv.approved ? '✅ aprovado' : '🔁 refazer'} · ${money(rv.cost)}` }), fb));
    }
  }
  if (run.doc) out.push(h('button', { class: 'btn primary', text: '📘 Documentação final da missão', onclick: () => openDoc(run.doc!) }));
  return out;
}

function renderAccount(): HTMLElement[] {
  const keyInput = h('input', { type: 'password', placeholder: 'sk-or-v1-…', autocomplete: 'off' }) as HTMLInputElement;
  const demo = h('input', { type: 'checkbox', checked: state.settings.demo, disabled: !!running }) as HTMLInputElement;
  demo.addEventListener('change', () => {
    state.settings.demo = demo.checked;
    save();
    syncScene();
    render();
  });
  const freeOnly = h('input', { type: 'checkbox', checked: state.settings.freeOnly }) as HTMLInputElement;
  freeOnly.addEventListener('change', () => {
    state.settings.freeOnly = freeOnly.checked;
    save();
    render();
  });
  const fallbacks = h('input', { type: 'checkbox', checked: state.settings.useFallbacks }) as HTMLInputElement;
  fallbacks.addEventListener('change', () => {
    state.settings.useFallbacks = fallbacks.checked;
    save();
  });
  return [
    h(
      'div',
      { class: 'card' },
      h('h3', {}, '🔑 Conta do OpenRouter'),
      h('p', { class: 'small muted', text: hasKey() ? 'Conectado. A chave fica só neste navegador e é enviada apenas para openrouter.ai.' : 'Conecte sua conta para usar qualquer modelo. Você paga direto ao OpenRouter (ou usa os modelos grátis).' }),
      hasKey()
        ? h('button', { class: 'btn danger', text: 'Desconectar (apagar a chave deste navegador)', disabled: !!running, onclick: () => { setKey(''); state.settings.demo = true; save(); render(); syncScene(); } })
        : h('button', { class: 'btn primary', text: 'Conectar com OpenRouter', onclick: () => startOAuth().then(() => toast('Faça login na aba que abriu e volte para cá.')) }),
      !hasKey()
        ? h('label', { class: 'field' }, 'Ou cole uma chave de API', h('div', { class: 'row' }, keyInput, h('button', { class: 'btn', text: 'Salvar', onclick: () => {
            if (!/^sk-or-/.test(keyInput.value.trim())) return toast('A chave do OpenRouter começa com sk-or-.');
            setKey(keyInput.value);
            state.settings.demo = false;
            save();
            render();
            syncScene();
            toast('Chave salva neste navegador.');
          } })))
        : null,
      h('div', { class: 'notice warn small', text: 'Segurança: crie uma chave com limite de crédito em openrouter.ai/settings/keys e não use em computador compartilhado.' }),
    ),
    h(
      'div',
      { class: 'card' },
      h('h3', {}, '⚙️ Preferências'),
      h('label', { class: 'check' }, demo, 'Modo demonstração (respostas simuladas, sem custo e sem chave)'),
      h('label', { class: 'check' }, freeOnly, 'Mostrar só modelos gratuitos na busca'),
      h('label', { class: 'check' }, fallbacks, 'Se um modelo grátis estiver sobrecarregado, usar outro grátis como reserva'),
      h('p', { class: 'small muted', text: catalogError || `${catalog.length} modelos carregados do OpenRouter (${catalog.filter((m) => m.free).length} gratuitos).` }),
    ),
  ];
}

function renderRules(): HTMLElement[] {
  return [
    md(`# Como funciona o Escritório IA

1. **Conecte o OpenRouter** (aba *Conta*) ou jogue no **modo demonstração**.
2. **Contrate até 6 funcionários** na loja (balcão verde). Cada um ocupa uma mesa, tem uma função e usa a **LLM que você escolher**: grátis ou paga.
3. Escolha o **modelo do líder** clicando na mesa dele (ao fundo).
4. Na aba **Missão**, escreva o objetivo e confira a **tarefa de cada funcionário** (clique na mesa para editar).
5. Clique em **Iniciar missão**.

## O ciclo de trabalho
- **Rodada:** cada funcionário entrega um **relatório** (resumo, trabalho realizado, resultado, pendências, confiança).
- **Líder:** lê todos os relatórios e decide:
  - ✅ **Aprovado:** consolida a solução, todos ficam com **OK** e o **contrato termina**.
  - 🔁 **Refazer:** **todos refazem**, recebendo o que foi pedido, o que entregaram, a avaliação e um **novo prompt** com o que melhorar.
- Isso se repete até aprovar ou acabar o **máximo de rodadas** (para não gastar demais).
- No fim sai a **documentação** com a solução, **um tópico por funcionário**, o histórico de decisões e os custos, pronta para baixar em Markdown.

## Regras
- Máximo de **6 funcionários** + 1 líder. Máximo de **5 rodadas** por missão.
- Uma missão por vez. Deixe esta aba aberta enquanto a equipe trabalha (é o seu computador que coordena tudo).
- **Modelos grátis** do OpenRouter: até **20 pedidos/min** e **50 pedidos/dia** (ou **1.000/dia** se a conta já comprou US$ 10 em créditos). Cada rodada usa 1 pedido por funcionário + 1 do líder.
- **Modelos pagos** são cobrados pelo OpenRouter na sua conta. O jogo mostra a **estimativa de custo** de cada relatório e da missão.
- Sua chave fica **só neste navegador** e só é enviada para openrouter.ai. Nada passa por servidores do site.`),
  ];
}

/* ---------- Janelas (modal) ---------- */

let modalOpen = false;
let modalContent: HTMLElement | null = null;

function openModal(title: string, ...content: Child[]): void {
  modalOpen = true;
  modalContent = h(
    'div',
    { class: 'dialog' },
    h('div', { class: 'dialog-head' }, h('h2', { text: title }), h('button', { class: 'btn small', text: '✕ Fechar', onclick: closeModal })),
    ...content,
  );
  render();
}

function closeModal(): void {
  modalOpen = false;
  modalContent = null;
  render();
}

function freeDesk(preferred?: number): number {
  const used = new Set(state.agents.map((a) => a.desk));
  if (preferred !== undefined && !used.has(preferred)) return preferred;
  for (let i = 0; i < MAX_AGENTS; i++) if (!used.has(i)) return i;
  return -1;
}

function openShop(desk?: number): void {
  if (running) return toast('Espere a missão terminar para contratar.');
  const full = state.agents.length >= MAX_AGENTS;
  openModal(
    '🛒 Loja de agentes',
    h('p', { class: 'muted', text: full ? 'Todas as 6 mesas estão ocupadas. Encerre um contrato para contratar outro.' : `Escolha uma função. Você tem ${MAX_AGENTS - state.agents.length} mesa(s) livre(s). Depois de contratar, escolha a LLM e a tarefa.` }),
    h(
      'div',
      { class: 'shop-grid' },
      ...ROLES.map((role) =>
        h(
          'div',
          { class: 'card' },
          h('div', { class: 'role-icon', text: role.icon }),
          h('h3', { text: role.title }),
          h('p', { class: 'small muted', text: role.description }),
          h('button', { class: 'btn primary small', text: 'Contratar', disabled: full, onclick: () => hire(role.id, desk) }),
        ),
      ),
    ),
  );
}

function hire(roleId: string, desk?: number): void {
  const d = freeDesk(desk);
  if (d < 0) return toast('Sem mesas livres.');
  const role = getRole(roleId);
  const agent: Agent = {
    id: `a${uid()}`,
    desk: d,
    name: randomName(state.agents.map((a) => a.name)),
    roleId,
    model: defaultModel(catalog),
    task: role.exampleTask,
    status: 'aguardando',
    reports: [],
    feedback: [],
    hiredAt: new Date().toISOString(),
  };
  state.agents.push(agent);
  save();
  syncScene();
  toast(`${agent.name} (${role.title}) contratado(a) para a mesa ${d + 1}!`);
  openAgent(agent);
}

function openAgent(agent: Agent): void {
  const role = getRole(agent.roleId);
  const task = h('textarea', { rows: 4, disabled: !!running }) as HTMLTextAreaElement;
  task.value = agent.task;
  task.addEventListener('input', () => {
    agent.task = task.value;
    save();
  });
  openModal(
    `${role.icon} ${agent.name}: ${role.title}`,
    h('div', { class: 'row' }, statusPill(agent.status), h('span', { class: 'small muted', text: `Mesa ${agent.desk + 1} · contratado(a) em ${new Date(agent.hiredAt).toLocaleDateString('pt-BR')}` })),
    modelPicker(agent.model, (id) => {
      agent.model = id;
      save();
      syncScene();
    }, !!running),
    h('label', { class: 'field' }, 'Tarefa / prompt deste funcionário', task),
    h('p', { class: 'small muted', text: role.description }),
    ...agent.reports.map((r) => h('details', {}, h('summary', { text: `📄 Relatório da rodada ${r.round} · ${money(r.cost)}` }), md(r.content))),
    h(
      'div',
      { class: 'row' },
      agent.reports.length
        ? h('button', { class: 'btn small', text: '⬇ Documentação deste funcionário', onclick: () => downloadText(`${slug(agent.name)}-${role.id}.md`, buildAgentDoc(agent, state.run?.objective ?? state.objective)) })
        : null,
      h('span', { style: 'flex:1' }),
      h('button', {
        class: 'btn danger small',
        text: 'Encerrar contrato',
        disabled: !!running,
        onclick: () => {
          state.agents = state.agents.filter((a) => a !== agent);
          save();
          syncScene();
          closeModal();
          toast(`Contrato de ${agent.name} encerrado.`);
        },
      }),
    ),
  );
}

function openLeader(): void {
  openModal(
    '🧑‍💼 Líder da equipe',
    h('p', { class: 'muted', text: 'O líder lê os relatórios de todos, decide se a missão foi resolvida e, se não, pede para todos refazerem com feedback e um novo prompt. Use um modelo forte aqui: é ele quem garante a qualidade.' }),
    modelPicker(state.settings.leaderModel, (id) => {
      state.settings.leaderModel = id;
      save();
      syncScene();
    }, !!running),
  );
}

function openDoc(doc: string): void {
  openModal(
    '📘 Documentação da missão',
    h('div', { class: 'row' }, h('button', { class: 'btn primary small', text: '⬇ Baixar .md', onclick: () => downloadText(`missao-${slug(state.objective)}.md`, doc) })),
    md(doc),
  );
}

function fireAll(): void {
  if (!confirm('Encerrar o contrato de todos os funcionários e liberar as mesas?')) return;
  state.agents = [];
  save();
  syncScene();
  render();
}

/* ---------- Missão ---------- */

async function startMission(): Promise<void> {
  if (running) return;
  if (!state.agents.length) return toast('Contrate pelo menos um funcionário.');
  if (!state.objective.trim()) return toast('Escreva o objetivo da missão.');
  if (!state.settings.demo && !hasKey()) {
    setTab('conta');
    return toast('Conecte o OpenRouter ou ative o modo demonstração.');
  }
  if (!state.settings.leaderModel) state.settings.leaderModel = defaultModel(catalog);
  const empty = state.agents.find((a) => !a.task.trim());
  if (empty) return toast(`Defina a tarefa de ${empty.name}.`);

  // Novo contrato para esta missão: zera relatórios e status.
  for (const a of state.agents) {
    a.status = 'aguardando';
    a.reports = [];
    a.feedback = [];
  }
  const run: MissionRun = {
    id: uid(),
    objective: state.objective.trim(),
    status: 'rodando',
    round: 0,
    maxRounds: state.settings.maxRounds,
    startedAt: new Date().toISOString(),
    reviews: [],
    totalCost: 0,
  };
  state.run = run;
  state.log = [`🚀 Missão iniciada com ${state.agents.length} funcionário(s)${state.settings.demo ? ' (modo demonstração)' : ''}.`];
  await executeRun(run);
}

/** Retoma uma missão interrompida (erro, cancelamento ou página fechada) sem refazer o que já foi entregue. */
async function continueMission(): Promise<void> {
  const run = state.run;
  if (running || !run || (run.status !== 'erro' && run.status !== 'cancelada')) return;
  if (!state.settings.demo && !hasKey()) {
    setTab('conta');
    return toast('Conecte o OpenRouter ou ative o modo demonstração.');
  }
  run.status = 'rodando';
  run.error = undefined;
  run.finishedAt = undefined;
  state.log.push(`${new Date().toLocaleTimeString('pt-BR')} 🔄 Continuando a missão de onde parou…`);
  await executeRun(run);
}

async function executeRun(run: MissionRun): Promise<void> {
  running = new AbortController();
  tab = 'missao';
  save();
  syncScene();
  render();

  const chat = state.settings.demo
    ? demoChat()
    : openRouterChat(getKey(), (model) => (state.settings.useFallbacks ? fallbackModels(catalog, model) : []));
  const agents = state.agents.slice().sort((a, b) => a.desk - b.desk);
  const log = (m: string): void => {
    state.log.push(`${new Date().toLocaleTimeString('pt-BR')} ${m}`);
    save();
    render();
  };

  await runMission({
    run,
    agents,
    settings: { ...state.settings, leaderModel: state.settings.demo ? DEMO_MODEL : state.settings.leaderModel },
    chat,
    price,
    signal: running.signal,
    hooks: {
      onAgent: () => {
        syncScene();
        save();
      },
      onReport: () => save(),
      onReview: () => save(),
      onLog: log,
      onWait: (s, reason) => {
        toast(`⏳ Aguardando ${Math.round(s)}s: ${reason}`);
        log(`⏳ Tentando de novo em ${Math.round(s)}s: ${reason}`);
      },
      onLeader: (reading) => {
        leaderReading = reading;
        syncScene();
      },
    },
  });

  running = null;
  if (run.status === 'aprovada' || run.status === 'nao_aprovada') {
    run.doc = buildMissionDoc(run, agents, state.settings.demo ? DEMO_MODEL : state.settings.leaderModel);
    state.history.unshift({ id: run.id, objective: run.objective, status: run.status, finishedAt: run.finishedAt ?? new Date().toISOString(), totalCost: run.totalCost, doc: run.doc });
    state.history = state.history.slice(0, 10);
    toast(run.status === 'aprovada' ? '✅ Missão aprovada! Contratos concluídos.' : '⚠️ Rodadas esgotadas. Documentação gerada.');
  }
  save();
  syncScene();
  render();
  if (run.doc) openDoc(run.doc);
}

addEventListener('beforeunload', (e) => {
  if (running) e.preventDefault();
});

// Outra aba (login do OpenRouter) gravou a chave: atualiza esta.
addEventListener('storage', (e) => {
  if (e.key === KEY_STORAGE_NAME) {
    if (getKey()) state.settings.demo = false;
    save();
    render();
    syncScene();
    if (getKey()) toast('🔑 OpenRouter conectado!');
  }
});

/* ---------- Início ---------- */

async function boot(): Promise<void> {
  render();
  syncScene();
  const oauth = await finishOAuthIfNeeded();
  if (oauth === 'ok') {
    state.settings.demo = false;
    save();
    toast('🔑 OpenRouter conectado! Se o jogo estava aberto em outra aba, pode voltar para ela.');
  } else if (oauth === 'erro') {
    toast('Não foi possível concluir o login no OpenRouter. Tente de novo ou cole a chave.');
  }
  try {
    catalog = await fetchModels();
    if (!state.settings.leaderModel || !modelInfo(state.settings.leaderModel)) state.settings.leaderModel = defaultModel(catalog);
    save();
  } catch {
    catalogError = 'Não foi possível carregar a lista de modelos do OpenRouter (verifique a conexão). O modo demonstração continua funcionando.';
  }
  syncScene();
  render();
}

boot();
