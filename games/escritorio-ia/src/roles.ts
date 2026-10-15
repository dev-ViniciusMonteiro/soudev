/** Catálogo da loja: funções que podem ser contratadas (até 6 por vez). */
export interface Role {
  id: string;
  title: string;
  icon: string;
  color: number;
  description: string;
  instructions: string; // vai no prompt de sistema do agente
  exampleTask: string;
}

export const ROLES: Role[] = [
  {
    id: 'pesquisador',
    title: 'Pesquisador(a)',
    icon: '🔎',
    color: 0x7c4dff,
    description: 'Levanta informações, compara alternativas e cita fontes e premissas.',
    instructions:
      'Sua especialidade é pesquisa: levante fatos, compare alternativas, deixe claro o que é dado e o que é suposição e aponte onde a informação deveria ser verificada.',
    exampleTask: 'Levante as 5 principais alternativas para resolver a missão, com prós, contras e custo estimado.',
  },
  {
    id: 'redator',
    title: 'Redator(a)',
    icon: '✍️',
    color: 0xe040fb,
    description: 'Escreve textos claros: posts, e-mails, páginas, roteiros e documentação.',
    instructions:
      'Sua especialidade é escrita: produza textos prontos para uso, claros, bem estruturados e no tom adequado ao público.',
    exampleTask: 'Escreva o texto final que será entregue ao cliente, pronto para publicar.',
  },
  {
    id: 'programador',
    title: 'Programador(a)',
    icon: '💻',
    color: 0x00e676,
    description: 'Escreve e revisa código, propõe arquitetura e passos de implementação.',
    instructions:
      'Sua especialidade é programação: proponha a solução técnica, escreva código funcional em blocos de código Markdown e explique como testar.',
    exampleTask: 'Implemente a parte técnica da missão e explique como rodar e testar.',
  },
  {
    id: 'analista',
    title: 'Analista de dados',
    icon: '📊',
    color: 0xf5a623,
    description: 'Organiza números, estima resultados e monta tabelas e indicadores.',
    instructions:
      'Sua especialidade é análise: organize dados em tabelas, faça estimativas explícitas (com fórmula) e defina indicadores de sucesso.',
    exampleTask: 'Estime custos, prazos e indicadores de sucesso da missão em uma tabela.',
  },
  {
    id: 'estrategista',
    title: 'Estrategista',
    icon: '♟️',
    color: 0x448aff,
    description: 'Define plano, prioridades, etapas e riscos.',
    instructions:
      'Sua especialidade é estratégia: defina objetivos, prioridades, um plano em etapas com prazos e os principais riscos com mitigação.',
    exampleTask: 'Monte o plano de ação em etapas, com prioridades e riscos.',
  },
  {
    id: 'revisor',
    title: 'Revisor(a) / QA',
    icon: '🧪',
    color: 0xff5252,
    description: 'Procura erros, lacunas e inconsistências e propõe correções.',
    instructions:
      'Sua especialidade é qualidade: critique a missão com olhar de cliente exigente, encontre falhas, lacunas e riscos e proponha correções concretas.',
    exampleTask: 'Liste o que pode dar errado nesta missão e como evitar cada problema.',
  },
  {
    id: 'criativo',
    title: 'Criativo(a)',
    icon: '💡',
    color: 0x0deef3,
    description: 'Gera ideias, nomes, conceitos e abordagens fora do óbvio.',
    instructions:
      'Sua especialidade é criatividade: gere várias ideias originais, depois escolha e detalhe as melhores com justificativa.',
    exampleTask: 'Proponha 10 ideias criativas para a missão e detalhe as 3 melhores.',
  },
  {
    id: 'marketing',
    title: 'Marketing e SEO',
    icon: '📣',
    color: 0xff9100,
    description: 'Posicionamento, público, canais, palavras-chave e divulgação.',
    instructions:
      'Sua especialidade é marketing e SEO: defina público, posicionamento, canais, palavras-chave e um plano de divulgação mensurável.',
    exampleTask: 'Monte o plano de divulgação com público, canais, palavras-chave e metas.',
  },
];

export const getRole = (id: string): Role => ROLES.find((r) => r.id === id) ?? ROLES[0];

const NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Isa', 'João', 'Lara', 'Marcos', 'Nina', 'Otávio', 'Paula', 'Rafa'];

export function randomName(taken: string[]): string {
  const free = NAMES.filter((n) => !taken.includes(n));
  const pool = free.length ? free : NAMES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const MAX_AGENTS = 6;
