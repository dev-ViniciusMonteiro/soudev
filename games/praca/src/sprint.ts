// Tela do Sprint Review: reunião no centro ("pronto"), perguntas com a placa (levantar/baixar), votação
// e relatório final (copiar ou baixar). O campo de texto não é recriado enquanto a pessoa digita.

import { type EstadoRetro, type LinhaResultado, PERGUNTAS_RETRO, RAIO_CENTRO_RETRO, type RespostaRetro, TAMANHO_RESPOSTA, VOTOS_RETRO } from './protocolo';
import type { Rede } from './rede';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

interface Contexto {
  el: El;
  rede: () => Rede | null;
  euId: () => string;
  nome: (id: string) => string;
  /** Distância do meu boneco ao chafariz. */
  distCentro: () => number;
  aviso: (texto: string) => void;
}

const MEDALHA = ['🥇', '🥈', '🥉'];

/** replaceChildren não aceita null: tira os itens vazios. */
const nos = (...l: (Node | null | false)[]): Node[] => l.filter((x): x is Node => Boolean(x));

export class SprintUI {
  readonly painel: HTMLElement;
  readonly relatorio: HTMLElement;
  private chave = '';
  private campo: HTMLInputElement | null = null;
  private corpo: HTMLElement | null = null;
  estado: EstadoRetro | null = null;
  private pontos: LinhaResultado[] | null = null;
  private ultimoStatus: string | undefined;

  constructor(private c: Contexto) {
    this.painel = c.el('div', { cls: 'sprint', hidden: true });
    this.relatorio = c.el('div', { cls: 'relatorio', hidden: true });
    // Atalhos: Enter levanta a placa (no campo), Esc baixa.
    addEventListener('keydown', (e) => {
      const r = this.estado;
      if (r?.fase !== 'pergunta') return;
      if (e.key === 'Escape' && r.status[c.euId()] === 'levantada') {
        c.rede()?.retro('baixar');
        e.preventDefault();
      }
    });
  }

  /** Estado novo do servidor (null = acabou ou foi cancelado). */
  atualizar(r: EstadoRetro | null): void {
    const antes = this.estado;
    this.estado = r;
    if (!r) {
      // Cancelado (todos saíram) ou o relatório foi fechado.
      this.painel.hidden = true;
      if (antes?.fase !== 'fim') this.relatorio.hidden = true;
      this.chave = '';
      return;
    }
    if (r.fase === 'votacao' || r.fase === 'fim') {
      this.painel.hidden = true;
      this.desenharRelatorio(r);
      return;
    }
    this.relatorio.hidden = true;
    const chave = `${r.fase}:${r.pergunta}`;
    if (chave !== this.chave) {
      this.chave = chave;
      this.montar(r);
      if (antes && r.fase === 'pergunta') this.c.aviso(`${PERGUNTAS_RETRO[r.pergunta].emoji} Pergunta ${r.pergunta + 1} de ${PERGUNTAS_RETRO.length}: ${PERGUNTAS_RETRO[r.pergunta].titulo}`);
    }
    this.atualizarCorpo(r);
    this.painel.hidden = false;
  }

  /** Pontos chegaram (depois do relatório final). */
  resultado(l: LinhaResultado[]): void {
    this.pontos = l;
    if (this.estado?.fase === 'fim' || !this.relatorio.hidden) this.desenharRelatorio(this.estado);
  }

  /** O relatório final ainda aberto (o tema de Halloween fica até fechar). */
  get aberto(): boolean {
    return !this.painel.hidden || !this.relatorio.hidden;
  }

  /** A cada quadro: o botão "pronto" só funciona no centro. */
  tick(): void {
    const r = this.estado;
    if (r?.fase !== 'reuniao' || !this.corpo) return;
    const botao = this.painel.querySelector<HTMLButtonElement>('.sprint-pronto');
    if (!botao || r.prontos.includes(this.c.euId())) return;
    const perto = this.c.distCentro() <= RAIO_CENTRO_RETRO - 0.5;
    botao.disabled = !perto;
    botao.textContent = perto ? '✅ Estou pronto' : '🚶 Vá até o chafariz para ficar pronto';
  }

  private montar(r: EstadoRetro): void {
    const { el } = this.c;
    this.corpo = el('div', { cls: 'sprint-corpo' });
    this.campo = null;
    if (r.fase === 'reuniao') {
      this.painel.replaceChildren(
        el('h3', { textContent: '🎃 Sprint Review' }),
        el('p', { textContent: 'Todo mundo até o chafariz no centro da praça. Quando estiver lá, clique em "Estou pronto". Quando todos estiverem prontos, começam as perguntas.' }),
        el('button', { cls: 'btn forte grande sprint-pronto', textContent: '✅ Estou pronto', onclick: () => this.c.rede()?.retro('pronto') }),
        this.corpo,
      );
      return;
    }
    const q = PERGUNTAS_RETRO[r.pergunta];
    const campo = el('input', { placeholder: 'Em poucas palavras…', maxLength: TAMANHO_RESPOSTA, cls: 'sprint-campo' });
    campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.levantar();
        e.preventDefault();
      }
      e.stopPropagation(); // WASD no campo não anda com o boneco
    });
    this.campo = campo;
    this.painel.replaceChildren(
      el('div', { cls: 'sprint-numero', textContent: `Pergunta ${r.pergunta + 1} de ${PERGUNTAS_RETRO.length}` }),
      el('h3', { textContent: `${q.emoji} ${q.titulo}` }),
      el('p', { cls: 'sprint-pergunta', textContent: q.pergunta }),
      campo,
      this.corpo,
      el('p', { cls: 'nota', textContent: '1) Escreva e clique em ✋ Levantar placa (ou Enter): a placa aparece na mão do seu boneco para todos lerem. 2) Quando terminar, clique em 👇 Baixar placa (ou Esc). Quando todos baixarem, vem a próxima pergunta. Pode levantar mais de uma placa por pergunta.' }),
    );
  }

  private levantar(): void {
    const t = this.campo?.value.trim();
    if (!t) {
      this.campo?.focus();
      this.c.aviso('Escreva algo antes de levantar a placa.');
      return;
    }
    this.c.rede()?.placa(t);
  }

  private atualizarCorpo(r: EstadoRetro): void {
    const { el } = this.c;
    if (!this.corpo) return;
    const eu = this.c.euId();
    const souAnfitriao = r.anfitriao === eu;
    if (r.fase === 'reuniao') {
      const pronto = r.prontos.includes(eu);
      const botao = this.painel.querySelector<HTMLButtonElement>('.sprint-pronto');
      if (botao && pronto) {
        botao.disabled = true;
        botao.textContent = '✅ Você está pronto';
      }
      this.corpo.replaceChildren(
        ...nos(
        el('small', { textContent: `Prontos: ${r.prontos.length} de ${r.participantes.length}` }),
        el('ul', { cls: 'sprint-lista' }, ...r.participantes.map((id) => el('li', { textContent: `${r.prontos.includes(id) ? '✅' : '⏳'} ${this.c.nome(id)}${id === r.anfitriao ? ' (conduz)' : ''}` }))),
        souAnfitriao ? el('button', { cls: 'btn', textContent: '⏩ Começar sem esperar todos', onclick: () => this.c.rede()?.retro('avancar') }) : null,
        ),
      );
      return;
    }
    const status = r.status[eu];
    const levantada = status === 'levantada';
    // Baixou a placa: o campo fica limpo para uma próxima resposta.
    if (this.ultimoStatus === 'levantada' && !levantada && this.campo) this.campo.value = '';
    this.ultimoStatus = status;
    const minhas = r.respostas.filter((x) => x.autor === eu);
    const icone = { pensando: '🤔 pensando', levantada: '✋ com a placa', baixada: '✅ terminou' } as const;
    this.corpo.replaceChildren(
        ...nos(
      el(
        'div',
        { cls: 'linha' },
        el('button', { cls: 'btn forte', textContent: levantada ? '✏️ Trocar texto da placa' : '✋ Levantar placa', onclick: () => this.levantar() }),
        levantada ? el('button', { cls: 'btn baixar', textContent: '👇 Baixar placa', onclick: () => this.c.rede()?.retro('baixar') }) : null,
        status === 'pensando' ? el('button', { cls: 'btn', textContent: 'Passar', title: 'Não tenho nada para esta pergunta', onclick: () => this.c.rede()?.retro('passar') }) : null,
      ),
      status === 'baixada' ? el('p', { cls: 'sprint-ok', textContent: '✅ Você terminou esta pergunta. Pode levantar outra placa se lembrar de mais alguma coisa.' }) : null,
      minhas.length ? el('small', { textContent: `Suas respostas: ${minhas.map((x) => `"${x.texto}"`).join(', ')}` }) : null,
      el('ul', { cls: 'sprint-lista' }, ...r.participantes.map((id) => el('li', { textContent: `${icone[r.status[id] ?? 'pensando']} · ${this.c.nome(id)}${r.placas[id] ? `: "${r.placas[id]}"` : ''}` }))),
      souAnfitriao ? el('button', { cls: 'btn', textContent: '⏩ Próxima pergunta (quem conduz)', onclick: () => this.c.rede()?.retro('avancar') }) : null,
      ),
    );
  }

  private desenharRelatorio(r: EstadoRetro | null): void {
    if (!r) return;
    const { el } = this.c;
    const eu = this.c.euId();
    const rolagem = this.relatorio.querySelector('.caixa')?.scrollTop ?? 0;
    const fim = r.fase === 'fim';
    const usados = r.respostas.filter((x) => x.votos.includes(eu)).length;
    const terminei = r.terminaramVoto.includes(eu);
    const premio = new Map(r.premiadas.map((id, i) => [id, i]));
    const linha = (x: RespostaRetro) => {
      const pos = premio.get(x.id);
      const votei = x.votos.includes(eu);
      return el(
        'li',
        { cls: `${votei ? 'votada' : ''}${pos !== undefined && pos < 3 ? ' top' : ''}` },
        el('span', { cls: 'r-texto', textContent: `${pos !== undefined && pos < 3 ? `${MEDALHA[pos]} ` : ''}${x.texto}` }),
        el('small', { textContent: x.nome }),
        fim || x.autor === eu || terminei
          ? el('span', { cls: 'r-votos', textContent: `❤️ ${x.votos.length}` })
          : el('button', { cls: votei ? 'voto ativo' : 'voto', textContent: votei ? `❤️ ${x.votos.length}` : `🤍 ${x.votos.length}`, disabled: !votei && usados >= VOTOS_RETRO, onclick: () => this.c.rede()?.voto(x.id) }),
      );
    };
    const grupos = PERGUNTAS_RETRO.map((q, i) => {
      const lista = r.respostas.filter((x) => x.pergunta === i);
      return el('section', { cls: 'r-grupo' }, el('h4', { textContent: `${q.emoji} ${q.titulo}` }), el('small', { textContent: q.pergunta }), lista.length ? el('ul', {}, ...lista.map(linha)) : el('p', { cls: 'nota', textContent: 'Sem respostas.' }));
    });
    const topo = fim
      ? [
          el('h2', { textContent: '🎃 Relatório do Sprint Review' }),
          r.premiadas.length
            ? el(
                'ol',
                { cls: 'r-podio' },
                ...r.premiadas.slice(0, 3).map((id, i) => {
                  const x = r.respostas.find((y) => y.id === id)!;
                  return el('li', { textContent: `${MEDALHA[i]} "${x.texto}" — ${x.nome} (${x.votos.length} ${x.votos.length === 1 ? 'voto' : 'votos'})` });
                }),
              )
            : el('p', { textContent: 'Ninguém votou desta vez.' }),
          el('p', { cls: 'nota', textContent: 'Quem escreveu as 5 respostas mais votadas ganha pontos extras (XP e moedas).' }),
          this.pontos ? el('p', { cls: 'ganhos', textContent: this.textoPontos(eu) }) : null,
        ]
      : [
          el('h2', { textContent: '🗳️ Votação' }),
          el('p', { textContent: `Escolha as ${VOTOS_RETRO} melhores respostas (não vale votar nas suas). As 3 mais votadas ganham medalha e as 5 mais votadas dão pontos para quem escreveu.` }),
          el('p', { cls: 'ganhos', textContent: terminei ? '✅ Você terminou de votar. Esperando os outros…' : `Votos restantes: ${VOTOS_RETRO - usados}` }),
        ];
    const rodape = fim
      ? el(
          'div',
          { cls: 'linha' },
          el('button', { cls: 'btn', textContent: '📋 Copiar relatório', onclick: () => this.copiar(r) }),
          el('button', { cls: 'btn', textContent: '⬇ Baixar (.md)', onclick: () => this.baixar(r) }),
          el('button', { cls: 'btn forte', textContent: 'Fechar', onclick: () => this.fechar() }),
        )
      : el(
          'div',
          { cls: 'linha' },
          terminei ? null : el('button', { cls: 'btn forte', textContent: '✅ Terminei de votar', onclick: () => this.c.rede()?.retro('terminarVoto') }),
          r.anfitriao === eu ? el('button', { cls: 'btn', textContent: '⏩ Encerrar votação (quem conduz)', onclick: () => this.c.rede()?.retro('avancar') }) : null,
          el('small', { textContent: `Terminaram: ${r.terminaramVoto.length} de ${r.participantes.length}` }),
        );
    const caixa = el('div', { cls: 'caixa relatorio-caixa' }, ...topo, ...grupos, rodape);
    this.relatorio.replaceChildren(caixa);
    caixa.scrollTop = rolagem;
    this.relatorio.hidden = false;
  }

  private textoPontos(eu: string): string {
    const meu = this.pontos?.find((x) => x.id === eu);
    return meu ? `Você ganhou +${meu.xp} XP e +${meu.moedas} 🪙 (${meu.pontos} voto(s) nas suas respostas)` : '';
  }

  fechar(): void {
    this.relatorio.hidden = true;
    this.painel.hidden = true;
    this.estado = null;
    this.pontos = null;
    this.chave = '';
    this.aoFechar();
  }

  aoFechar: () => void = () => {};

  /** Relatório em Markdown (para colar no Confluence, Slack, e-mail…). */
  texto(r: EstadoRetro): string {
    const data = new Date().toLocaleDateString('pt-BR');
    const l: string[] = [`# 🎃 Sprint Review · SuperApp · ${data}`, '', `Participantes: ${r.participantes.map((id) => this.c.nome(id)).join(', ')}`, ''];
    if (r.premiadas.length) {
      l.push('## 🏆 Mais votadas', '');
      r.premiadas.forEach((id, i) => {
        const x = r.respostas.find((y) => y.id === id)!;
        l.push(`${i + 1}. ${MEDALHA[i] ?? ''} ${x.texto} (${x.nome}, ${x.votos.length} ${x.votos.length === 1 ? 'voto' : 'votos'})`.replace('  ', ' '));
      });
      l.push('');
    }
    PERGUNTAS_RETRO.forEach((q, i) => {
      l.push(`## ${q.emoji} ${q.titulo}`, `_${q.pergunta}_`, '');
      const lista = r.respostas.filter((x) => x.pergunta === i).sort((a, b) => b.votos.length - a.votos.length);
      if (!lista.length) l.push('- (sem respostas)');
      for (const x of lista) l.push(`- ${x.texto} (${x.nome}${x.votos.length ? `, ${x.votos.length} ❤️` : ''})`);
      l.push('');
    });
    return l.join('\n');
  }

  private async copiar(r: EstadoRetro): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.texto(r));
      this.c.aviso('Relatório copiado!');
    } catch {
      prompt('Copie o relatório:', this.texto(r));
    }
  }

  private baixar(r: EstadoRetro): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([this.texto(r)], { type: 'text/markdown' }));
    a.download = `sprint-review-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
