// Índice da busca do topo: tudo que tem página no site (ferramentas, sistemas, apps e jogos), em forma compacta.
// Só no servidor (layout): os catálogos completos não vão para o navegador, só este resumo.

import { apps } from '@/lib/apps'
import { games } from '@/lib/games'
import { nichos } from '@/lib/sistemas/nichos'
import { tools } from '@/lib/tools'

export function montarIndice() {
  return [
    ...tools.map((t) => ({ nome: t.name, texto: t.short, href: `/ferramentas/${t.slug}`, secao: 'Ferramenta', chaves: (t.keywords ?? []).join(' ') })),
    ...nichos.map((n) => ({ nome: n.nome, texto: n.curto, href: `/sistemas/${n.slug}`, secao: 'Sistema', chaves: (n.keywords ?? []).join(' ') })),
    ...apps.map((a) => ({ nome: a.nome, texto: a.curto, href: `/apps/${a.slug}`, secao: 'App', chaves: (a.keywords ?? []).join(' ') })),
    ...games.map((g) => ({ nome: g.name, texto: g.short, href: `/jogos/${g.slug}`, secao: 'Jogo', chaves: [...(g.keywords ?? []), ...(g.genre ?? [])].join(' ') })),
  ]
}
