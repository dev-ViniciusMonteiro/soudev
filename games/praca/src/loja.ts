// Loja da praça: compra com moedas do jogo. Cada item pode ser provado no seu boneco antes de comprar;
// depois de comprado, "Usar" coloca na aparência (salva no perfil e todos na sala veem).

import type { Aparencia } from './boneco';
import { type CategoriaLoja, ITENS, type Item, type Perfil } from './protocolo';

type El = <K extends keyof HTMLElementTagNameMap>(tag: K, props?: Partial<HTMLElementTagNameMap[K]> & { cls?: string }, ...filhos: (Node | string | null | false)[]) => HTMLElementTagNameMap[K];

interface Contexto {
  el: El;
  perfil: () => Perfil | null;
  aparencia: () => Aparencia;
  /** Prova (só no meu boneco, sem salvar) ou null para tirar a prova. */
  provar: (parcial: Partial<Aparencia> | null) => void;
  /** Usa de verdade (salva no perfil). */
  usar: (parcial: Partial<Aparencia>) => void;
  comprar: (item: string) => Promise<Perfil>;
  aviso: (texto: string) => void;
}

const ABAS: [CategoriaLoja, string][] = [
  ['chapeu', '👑 Chapéus'],
  ['acessorio', '🪽 Costas'],
  ['roupa', '🤵 Roupas'],
  ['pet', '🐶 Pets'],
  ['arma', '🔫 Armas'],
];
/** Valor de "tirar" de cada parte (chapéu nenhum, roupa básica...). */
const VAZIO: Record<CategoriaLoja, string> = { chapeu: 'nenhum', acessorio: 'nenhum', roupa: 'basica', pet: 'nenhum', arma: 'padrao' };

const parteDe = (it: Item): Partial<Aparencia> => {
  const [k, v] = it.id.split(':');
  return { [k]: v } as Partial<Aparencia>;
};

export class Loja {
  readonly painel: HTMLElement;
  private aba: CategoriaLoja = 'chapeu';
  private provando: string | null = null;

  constructor(private c: Contexto) {
    this.painel = c.el('div', { cls: 'loja', hidden: true });
  }

  get aberta(): boolean {
    return !this.painel.hidden;
  }

  abrir(): void {
    this.painel.hidden = false;
    this.desenhar();
  }

  fechar(): void {
    this.painel.hidden = true;
    if (this.provando) {
      this.provando = null;
      this.c.provar(null);
    }
  }

  desenhar(): void {
    if (this.painel.hidden) return;
    const { el } = this.c;
    const p = this.c.perfil();
    const a = this.c.aparencia();
    const itens = ITENS.filter((i) => i.preco && i.categoria === this.aba);
    const cartao = (it: Item) => {
      const [k, v] = it.id.split(':');
      const tenho = Boolean(p?.itens.includes(it.id));
      const usando = (a as unknown as Record<string, unknown>)[k] === v;
      const provando = this.provando === it.id;
      const podeComprar = Boolean(p && p.moedas >= (it.preco ?? 0));
      return el(
        'div',
        { cls: `loja-item${usando ? ' usando' : ''}${provando ? ' provando' : ''}` },
        el('div', { cls: 'loja-icone', textContent: it.icone ?? '🎁' }),
        el('strong', { textContent: it.nome }),
        it.descricao ? el('small', { textContent: it.descricao }) : null,
        el('div', { cls: 'loja-preco', textContent: tenho ? '✅ Seu' : `🪙 ${it.preco!.toLocaleString('pt-BR')}` }),
        el(
          'div',
          { cls: 'linha' },
          tenho
            ? el('button', {
                cls: usando ? 'btn' : 'btn forte',
                textContent: usando ? 'Tirar' : 'Usar',
                onclick: () => {
                  this.provando = null;
                  this.c.usar(usando ? ({ [k]: VAZIO[it.categoria!] } as Partial<Aparencia>) : parteDe(it));
                  this.desenhar();
                },
              })
            : el('button', {
                cls: 'btn forte',
                textContent: 'Comprar',
                disabled: !podeComprar,
                title: podeComprar ? '' : 'Moedas insuficientes: jogue os jogos da praça para ganhar mais',
                onclick: () => void this.comprar(it),
              }),
          tenho
            ? null
            : el('button', {
                cls: 'btn',
                textContent: provando ? 'Tirar prova' : 'Provar',
                onclick: () => {
                  this.provando = provando ? null : it.id;
                  this.c.provar(provando ? null : parteDe(it));
                  this.desenhar();
                },
              }),
        ),
      );
    };
    this.painel.replaceChildren(
      el(
        'div',
        { cls: 'loja-topo' },
        el('h3', { textContent: '🛒 Loja da praça' }),
        el('span', { cls: 'loja-saldo', textContent: `🪙 ${(p?.moedas ?? 0).toLocaleString('pt-BR')}` }),
        el('button', { cls: 'btn', textContent: '✕', title: 'Fechar', onclick: () => this.fechar() }),
      ),
      el('p', { cls: 'nota', textContent: this.aba === 'arma' ? 'Armas são só visual: no mata-mata todo mundo tem o mesmo dano. O visual aparece nas suas armas lá.' : 'Só moedas do jogo. Prove no seu boneco antes de comprar.' }),
      el(
        'div',
        { cls: 'opcoes loja-abas' },
        ...ABAS.map(([id, texto]) =>
          el('button', {
            cls: id === this.aba ? 'opcao ativa' : 'opcao',
            textContent: texto,
            onclick: () => {
              this.aba = id;
              this.desenhar();
            },
          }),
        ),
      ),
      el('div', { cls: 'loja-grade' }, ...itens.map(cartao)),
    );
    if (!p) this.painel.append(el('p', { cls: 'nota', textContent: 'Entre na praça uma vez para criar seu perfil e ter moedas.' }));
  }

  private async comprar(it: Item): Promise<void> {
    try {
      await this.c.comprar(it.id);
      this.provando = null;
      this.c.aviso(`${it.icone ?? '🎁'} ${it.nome} é seu!`);
      // Já veste o que acabou de comprar.
      this.c.usar(parteDe(it));
    } catch (e) {
      this.c.aviso(e instanceof Error ? e.message : 'Não deu para comprar agora.');
    }
    this.desenhar();
  }
}
