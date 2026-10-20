// Processos do Documentador: uma fila de agentes. Cada agente analisa o material e passa adiante;
// o último ("montador") recebe tudo e escreve o documento seguindo a estrutura do padrão, ao pé da letra.
//
// campos: cabeçalho que a pessoa preenche (o que ficar em branco o montador tira do material ou marca [A DEFINIR]).
// estrutura: o esqueleto do documento final, em Markdown, que vai no prompt do montador.

export const REGRAS = `Você faz parte de uma linha de agentes que produz documentação técnica corporativa em português do Brasil.
Regras:
- Use somente o que está no material enviado, nos campos do cabeçalho e nas análises dos agentes anteriores.
- Não invente nomes de pessoas, sistemas, servidores, datas, horários, números ou valores. Quando faltar algo, escreva [A DEFINIR: o que falta].
- Quando você deduzir algo que não está escrito (por exemplo, uma classificação de risco), deixe claro com "(sugerido)".
- Escreva de forma objetiva, em frases curtas e voz ativa. Sem enrolação e sem frases de abertura ou despedida.`

const opcoes = (...lista) => lista

export const PADROES = [
  {
    id: 'gmud',
    nome: 'GMUD (gestão de mudança)',
    descricao: 'Pedido de mudança no padrão ITIL, com cabeçalho completo, riscos, plano de implantação, testes e rollback.',
    icone: '🛠️',
    campos: [
      { id: 'numero', rotulo: 'Número da GMUD', dica: 'Ex.: GMUD-2026-0153' },
      { id: 'titulo', rotulo: 'Título da mudança' },
      { id: 'sistema', rotulo: 'Sistema / aplicação' },
      { id: 'ambiente', rotulo: 'Ambiente', opcoes: opcoes('Produção', 'Homologação', 'Desenvolvimento', 'Produção e homologação') },
      { id: 'tipo', rotulo: 'Tipo de mudança', opcoes: opcoes('Normal', 'Padrão (pré-aprovada)', 'Emergencial') },
      { id: 'categoria', rotulo: 'Categoria', opcoes: opcoes('Nova funcionalidade', 'Melhoria', 'Correção de defeito', 'Infraestrutura', 'Configuração', 'Banco de dados', 'Segurança') },
      { id: 'prioridade', rotulo: 'Prioridade', opcoes: opcoes('Baixa', 'Média', 'Alta', 'Crítica') },
      { id: 'risco', rotulo: 'Risco', opcoes: opcoes('Baixo', 'Médio', 'Alto'), dica: 'Em branco: a IA sugere' },
      { id: 'solicitante', rotulo: 'Solicitante' },
      { id: 'responsavel', rotulo: 'Responsável técnico (executor)' },
      { id: 'area', rotulo: 'Área / squad' },
      { id: 'aprovadores', rotulo: 'Aprovadores', dica: 'Nomes separados por vírgula' },
      { id: 'janela', rotulo: 'Data e janela de execução', dica: 'Ex.: 25/10/2026, 22h às 23h30' },
      { id: 'indisponibilidade', rotulo: 'Indisponibilidade prevista', dica: 'Ex.: Não / Sim, 15 min' },
      { id: 'chamado', rotulo: 'Chamado / história relacionada', dica: 'Ex.: JIRA-482' },
      { id: 'versao', rotulo: 'Versão / release' },
    ],
    estrutura: `# GMUD {Número} – {Título da mudança}

## 1. Cabeçalho
Tabela com duas colunas (Campo | Valor) e TODAS as linhas abaixo, nesta ordem:
Número da GMUD, Título, Sistema / aplicação, Ambiente, Tipo de mudança, Categoria, Prioridade, Risco, Solicitante, Responsável técnico, Área / squad, Aprovadores, Data e janela de execução, Indisponibilidade prevista, Chamado relacionado, Versão / release, Data de elaboração, Versão do documento (1.0).

## 2. Resumo da mudança
Um parágrafo de até 5 linhas: o que muda, onde e quando.

## 3. Objetivo e justificativa
Por que a mudança é necessária, benefício esperado e o que acontece se não for feita.

## 4. Escopo
### Dentro do escopo
### Fora do escopo

## 5. Itens de configuração afetados
Tabela: Item | Tipo (serviço, banco, configuração, job, infraestrutura…) | Alteração.

## 6. Análise de impacto
Usuários e áreas afetadas, sistemas e integrações impactados, indisponibilidade e efeito no negócio.

## 7. Análise de risco
Tabela: Risco | Probabilidade | Impacto | Mitigação.
Depois da tabela, a classificação final do risco com a justificativa em uma frase.

## 8. Pré-requisitos e dependências

## 9. Plano de implantação
Tabela: Passo | Ação | Responsável | Horário previsto | Duração.
Passos numerados, na ordem de execução, incluindo backup antes da mudança.

## 10. Plano de validação (testes pós-implantação)
Tabela: Teste | Como validar | Resultado esperado | Responsável.

## 11. Plano de rollback
### Gatilhos para rollback
### Passos do rollback
Tabela: Passo | Ação | Responsável | Duração.
### Tempo estimado de rollback

## 12. Comunicação
Tabela: Quando (antes / durante / depois) | Público | Canal | Mensagem.

## 13. Evidências
Lista do que deve ser anexado (prints, logs, resultados dos testes, aprovação).

## 14. Aprovações
Tabela: Nome | Papel | Data | Aprovação. Uma linha por aprovador; campos sem informação ficam em branco.

## 15. Pendências a confirmar
Lista de todos os [A DEFINIR] do documento, cada um com o que precisa ser respondido.

## Histórico de revisões
Tabela: Versão | Data | Autor | Descrição. Primeira linha: 1.0, data de elaboração, responsável técnico, "Criação do documento".`,
    agentes: [
      {
        nome: 'Analista de negócio',
        icone: '🧭',
        papel: `Você é analista de negócio. Entenda o pedido de mudança e responda em Markdown com estas seções:
- O que muda (em linguagem simples)
- Por que (problema, objetivo, benefício e consequência de não fazer)
- Quem é afetado (usuários, áreas, clientes)
- Escopo: dentro e fora
- Lacunas: perguntas que o material não responde`,
      },
      {
        nome: 'Engenheiro de software',
        icone: '🧑‍💻',
        papel: `Você é engenheiro de software sênior. Levante os detalhes técnicos da mudança e responda em Markdown com:
- Sistemas, serviços, componentes, bancos, filas, jobs e configurações afetados (itens de configuração)
- Integrações impactadas
- Pré-requisitos e dependências (acessos, versões, outras equipes, janelas)
- Passos técnicos de implantação, na ordem, incluindo backup e verificações
- Lacunas técnicas`,
      },
      {
        nome: 'Analista de mudanças e riscos',
        icone: '🛡️',
        papel: `Você é analista de gestão de mudanças (ITIL). Com base no material e nas análises anteriores, responda em Markdown com:
- Impacto: usuários, sistemas, indisponibilidade
- Riscos: probabilidade, impacto e mitigação de cada um, e a classificação final (sugerida, se não informada)
- Tipo de mudança sugerido (normal, padrão ou emergencial), se não informado
- Plano de testes pós-implantação: o que testar, como e resultado esperado
- Rollback: gatilhos, passos e tempo estimado
- Comunicação: quem avisar, quando e por qual canal
- Evidências que devem ser anexadas`,
      },
      {
        nome: 'Montador da GMUD',
        icone: '📄',
        montador: true,
        papel: `Você é redator técnico sênior de GMUDs. Junte as informações do cabeçalho, do material e de todos os agentes num documento único, sem repetir conteúdo entre seções e sem contradições.
Os valores preenchidos no cabeçalho têm prioridade sobre qualquer outra fonte.`,
      },
    ],
  },
  {
    id: 'negocio-tecnica',
    nome: 'Documentação de negócio e técnica',
    descricao: 'Documento completo de um sistema ou funcionalidade: contexto, regras, requisitos, arquitetura, integrações, dados e operação.',
    icone: '📘',
    campos: [
      { id: 'nome', rotulo: 'Nome do sistema / projeto' },
      { id: 'versao', rotulo: 'Versão do documento', dica: 'Ex.: 1.0' },
      { id: 'status', rotulo: 'Status', opcoes: opcoes('Rascunho', 'Em revisão', 'Aprovado') },
      { id: 'autor', rotulo: 'Autor' },
      { id: 'area', rotulo: 'Área / squad' },
      { id: 'po', rotulo: 'Product owner / responsável de negócio' },
      { id: 'links', rotulo: 'Repositório e links', dica: 'Git, Jira, Figma…' },
    ],
    estrutura: `# {Nome do sistema} – Documentação de negócio e técnica

## Controle do documento
Tabela com duas colunas (Campo | Valor): Sistema / projeto, Versão do documento, Status, Autor, Área / squad, Product owner, Repositório e links, Data de elaboração.

## 1. Visão geral
Resumo executivo em um parágrafo: o que é, para quem e qual problema resolve.

## 2. Contexto e problema de negócio

## 3. Objetivos e indicadores de sucesso
Lista de objetivos, cada um com o indicador que mostra que foi atingido.

## 4. Atores e público
Tabela: Ator | Descrição | O que faz no sistema.

## 5. Escopo
### Dentro do escopo
### Fora do escopo

## 6. Regras de negócio
Tabela: ID (RN-01, RN-02…) | Regra | Observação.

## 7. Fluxos principais
Para cada fluxo: nome, passo a passo numerado e exceções.

## 8. Requisitos funcionais
Tabela: ID (RF-01…) | Requisito | Prioridade.

## 9. Requisitos não funcionais
Tabela: ID (RNF-01…) | Categoria (desempenho, disponibilidade, segurança, LGPD, usabilidade…) | Requisito.

## 10. Arquitetura da solução
Componentes, responsabilidades e tecnologias. Se houver informação suficiente, inclua um diagrama em bloco \`\`\`mermaid.

## 11. Integrações
Tabela: Sistema | Direção (envia / recebe) | Protocolo | Dados trocados | Frequência.

## 12. Modelo de dados
Entidades principais, com os campos mais importantes e relacionamentos.

## 13. APIs e contratos
Tabela: Método | Endpoint | Descrição | Autenticação. Exemplos de payload só se estiverem no material.

## 14. Segurança e acesso
Autenticação, perfis de acesso, dados sensíveis e tratamento conforme a LGPD.

## 15. Infraestrutura, ambientes e deploy

## 16. Monitoramento, logs e alertas

## 17. Riscos, premissas e dependências

## 18. Glossário
Tabela: Termo | Significado.

## 19. Pendências a confirmar
Lista de todos os [A DEFINIR] do documento, cada um com o que precisa ser respondido.`,
    agentes: [
      {
        nome: 'Analista de negócio',
        icone: '🧭',
        papel: `Você é analista de negócio sênior. Extraia do material e responda em Markdown com:
- Contexto e problema de negócio
- Objetivos e como medir o sucesso
- Atores e o que cada um faz
- Escopo: dentro e fora
- Regras de negócio, numeradas
- Fluxos principais, passo a passo, com exceções
- Requisitos funcionais, numerados e com prioridade
- Lacunas de negócio`,
      },
      {
        nome: 'Arquiteto de software',
        icone: '🏗️',
        papel: `Você é arquiteto de software. Extraia do material e das análises anteriores e responda em Markdown com:
- Componentes, responsabilidades e tecnologias
- Integrações (sistema, direção, protocolo, dados, frequência)
- Modelo de dados (entidades, campos principais, relacionamentos)
- APIs e contratos
- Requisitos não funcionais (desempenho, disponibilidade, segurança, LGPD)
- Segurança e acesso
- Infraestrutura, ambientes, deploy, monitoramento e alertas
- Riscos técnicos, premissas e dependências
- Lacunas técnicas`,
      },
      {
        nome: 'Revisor',
        icone: '🔎',
        papel: `Você é revisor de documentação. Compare o material com as análises anteriores e responda em Markdown com:
- Contradições entre as análises e o material (e qual versão vale, segundo o material)
- Informações importantes do material que ficaram de fora
- Termos que precisam entrar no glossário
- Lista consolidada de pendências a confirmar`,
      },
      {
        nome: 'Montador do documento',
        icone: '📄',
        montador: true,
        papel: `Você é redator técnico sênior. Junte as informações do cabeçalho, do material e de todos os agentes num documento único, aplicando as correções do revisor, sem repetir conteúdo entre seções e sem contradições.
Os valores preenchidos no cabeçalho têm prioridade sobre qualquer outra fonte.`,
      },
    ],
  },
]

const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)

/** Processo editável a partir de um padrão (cada agente ganha id e modelo próprio, vazio = modelo padrão). */
export function processoDoPadrao(padrao, nome = padrao.nome) {
  return {
    id: novoId(),
    base: padrao.id,
    nome,
    descricao: padrao.descricao,
    icone: padrao.icone,
    campos: padrao.campos.map((c) => ({ ...c })),
    estrutura: padrao.estrutura,
    agentes: padrao.agentes.map((a) => ({ id: novoId(), modelo: '', montador: false, ...a })),
  }
}

export const novoAgente = () => ({ id: novoId(), nome: 'Novo agente', icone: '🤖', modelo: '', montador: false, papel: 'Você é … Analise o material e responda em Markdown com:\n- …\n- Lacunas' })

export { novoId }
