// Fonte única do currículo: alimenta a página /curriculo, o .docx, o /resume.json e o /llms.txt.
// Toda a experiência é pela Compass UOL (consultoria, CLT): os clientes aparecem como alocações, nunca como empregador.
// Confidencialidade: clientes descritos só por setor e porte, sem datas por alocação, sem métricas internas dos
// clientes e sem nomes de produtos ou programas internos. Só entra aqui o que pode ser dito publicamente.

export const curriculo = {
  nome: 'Vinicius Monteiro Orlandi',
  titulo: 'Tech Lead · Software Engineer Full Stack',
  local: 'Mogi Guaçu e São Paulo/SP',
  email: 'dev.viniciusmonteiro@gmail.com',
  links: [
    ['LinkedIn', 'https://www.linkedin.com/in/vinicius-monteiro-orlandi/'],
    ['GitHub', 'https://github.com/dev-ViniciusMonteiro'],
    ['Currículo online', 'https://soudev.vercel.app/curriculo'],
  ],
  resumo:
    'Tech Lead e Engenheiro de Software Full Stack com mais de 8 anos de experiência construindo e liderando produtos digitais de alto impacto: e-commerce, integrações entre sistemas e cloud. Na Compass UOL, atuo em clientes de grande porte, como uma multinacional de cosméticos com operação em 7 países da América Latina, uma das maiores administradoras de planos de saúde do país e uma plataforma de educação digital usada por grandes universidades. Hoje lidero squads multidisciplinares em um grande complexo comercial e de eventos de São Paulo. Trabalho de ponta a ponta, do UI/UX ao QA, com Node.js, TypeScript, React, Next.js, C# (.NET), AWS, Azure, Salesforce Commerce Cloud e Oracle Integration Cloud. Certificado Oracle Generative AI Professional, uso IA generativa no ciclo de desenvolvimento para entregar mais, com mais qualidade.',
  destaques: [
    'Lidero tecnicamente squads multidisciplinares (front-end, back-end, QA e produto), incluindo um e-commerce criado do zero até a operação.',
    'Levei a taxa de erro das integrações de pedidos de um distribuidor de alto volume para praticamente zero, destravando vendas e reduzindo o trabalho manual.',
    'Sustentei e evoluí as páginas e os dados de produto de uma operação de e-commerce em 7 países, com automação serverless na AWS.',
    'Entreguei sozinho, em poucos dias, uma prova de conceito completa na AWS com desenvolvimento orientado por IA.',
  ],
  empresa: {
    nome: 'Compass UOL',
    tipo: 'consultoria de tecnologia, CLT',
    cargo: 'Trainee → Júnior → Pleno → Tech Lead',
    fim: 'atual',
  },
  alocacoes: [
    {
      cliente: 'Grande complexo comercial e de eventos em São Paulo',
      papel: 'Tech Lead de squads multidisciplinares',
      fim: 'atual',
      itens: [
        'Lidero tecnicamente squads de front-end, back-end, QA e produto em integrações, infraestrutura AWS, aplicativo e e-commerce.',
        'Conduzi a criação, do zero até a operação, de um e-commerce de serviços, da definição da solução à entrega.',
        'Coordeno o aplicativo que integra e controla operações dos empreendimentos do cliente.',
        'Conduzo os rituais Scrum, as decisões de arquitetura e a revisão de código, garantindo qualidade do UI/UX ao QA.',
      ],
      stack: ['Liderança técnica', 'Scrum', 'Arquitetura de software', 'AWS', 'C# (.NET)', 'Integrações', 'E-commerce'],
    },
    {
      cliente: 'Multinacional de cosméticos e venda direta (7 países da América Latina)',
      papel: 'Backend Developer · Salesforce Commerce Cloud',
      itens: [
        'Responsável pela evolução e sustentação das páginas e dos dados de produto do e-commerce em 7 países da América Latina.',
        'Criei uma automação serverless com AWS EventBridge e Lambda que mantém a integridade dos produtos do tipo kit, evitando quebras no fluxo de venda.',
        'Construí um sistema white-label de gestão da força de vendas no squad de pós-compra.',
        'Recriei a gestão de pedidos em tempo real, com atualização instantânea no e-commerce e no painel da força de vendas.',
        'Conduzi uma migração de base de dados com estabilidade e desenvolvi funcionalidades de pedidos e carrinho no front (React/Next.js) e no backend.',
      ],
      stack: ['Node.js', 'TypeScript', 'Salesforce Commerce Cloud B2C', 'AWS Lambda', 'AWS EventBridge', 'DynamoDB', 'GraphQL', 'React', 'Next.js', 'Databricks', 'Azure API Gateway', 'Azure Pipelines', 'GA4'],
    },
    {
      cliente: 'Projeto interno de IA da consultoria',
      papel: 'Full Stack, em paralelo à alocação principal',
      itens: [
        'Desenvolvi sozinho, em poucos dias, a prova de conceito de um sistema web de gestão de clínica: telas no Figma, planejamento das tarefas e cenários de teste.',
        'Desenvolvimento orientado por IA (Amazon Q Developer) com Node.js, React e microsserviços, provisionado e publicado na AWS.',
      ],
      stack: ['Node.js', 'React', 'Microsserviços', 'MySQL', 'AWS ECS', 'AWS API Gateway', 'AWS VPC', 'AWS CodeDeploy', 'Figma', 'Amazon Q Developer'],
    },
    {
      cliente: 'Grande administradora de planos de saúde',
      papel: 'Commerce Platform Developer',
      itens: [
        'Desenvolvi um chatbot humanizado de vendas no WhatsApp, com Dialogflow e IA generativa, atendendo centenas de pessoas por mês.',
        'Construí funcionalidades do e-commerce de planos com Node.js, Vue.js e Neo4j em microsserviços, acompanhando o crescimento do canal de vendas online.',
        'Estruturei a medição de eventos com GA4 e GTM para apoiar decisões de negócio com dados confiáveis.',
      ],
      stack: ['Node.js', 'Vue.js', 'Neo4j', 'Microsserviços', 'Dialogflow', 'OpenAI', 'GA4', 'GTM'],
    },
    {
      cliente: 'Plataforma de educação digital para instituições de ensino superior',
      papel: 'Desenvolvedor Full Stack',
      itens: [
        'Participei da criação de uma plataforma de ensino digital usada por grandes universidades do país.',
        'Desenvolvi a detecção de fraude por câmera em provas online, além do módulo de provas, autenticação com AWS Cognito e gestão acadêmica.',
      ],
      stack: ['Node.js', 'NestJS', 'Next.js', 'SQL', 'AWS Cognito', 'Testes automatizados'],
    },
    {
      cliente: 'E-commerces de varejo e indústria (Oracle Commerce)',
      papel: 'Backend Node.js',
      itens: [
        'Implementei integração em tempo real com o Oracle Commerce Cloud via Server-Sent Events (Node.js e Express), reaproveitada em vários projetos da consultoria.',
        'Participei da criação de e-commerces em Oracle Commerce Cloud e das integrações entre sistemas com Oracle Integration Cloud.',
        'Atuei na implantação de um acelerador de e-commerce com backend em Node.js e TypeScript, finalizando entregas críticas.',
      ],
      stack: ['Node.js', 'TypeScript', 'Express', 'Oracle Commerce Cloud (OCC)', 'Oracle Integration Cloud (OIC)', 'React'],
    },
    {
      cliente: 'Indústria alimentícia (e-commerces B2B)',
      papel: 'Líder de equipe backend',
      itens: [
        'Liderei a equipe de backend de e-commerces B2B integrados ao ERP via Oracle Integration Cloud, com entregas dentro do prazo.',
        'Modelei a base de dados fiscais e comerciais e implementei o cálculo de Substituição Tributária (ICMS-ST) em tempo real.',
      ],
      stack: ['Node.js', 'Express', 'MySQL', 'Oracle Database', 'Oracle Integration Cloud (OIC)', 'OCC', 'ERP'],
    },
    {
      cliente: 'Distribuidor de alto volume (integrações de pedidos)',
      papel: 'Desenvolvedor de integrações',
      itens: [
        'Reestruturei as integrações de pedidos com Oracle Integration Cloud e levei a taxa de erro para praticamente zero em alto volume de transações, aumentando as vendas e reduzindo o esforço operacional.',
      ],
      stack: ['Oracle Integration Cloud (OIC)', 'OCC Classic', 'Node.js', 'ERP'],
    },
  ],
  // Antes da Compass: trabalho informal, sem vínculo.
  anteriores: [
    {
      empresa: 'Freelancer',
      papel: 'Desenvolvimento web',
      itens: ['Sites e interfaces em HTML, CSS e JavaScript para pequenos negócios, em paralelo à faculdade.'],
    },
  ],
  competencias: [
    ['Linguagens e frameworks', 'TypeScript, JavaScript, Node.js, NestJS, Express, React, Next.js, Vue.js, C# (.NET), GraphQL, REST'],
    ['Cloud e DevOps', 'AWS (Lambda, EventBridge, ECS, API Gateway, Cognito, VPC, CodeDeploy), Azure (API Gateway, Pipelines), Oracle Cloud Infrastructure, Docker, CI/CD'],
    ['Commerce e integrações', 'Salesforce Commerce Cloud B2C, Oracle Commerce Cloud (OCC), Oracle Integration Cloud (OIC), ERP, meios de pagamento'],
    ['Dados e analytics', 'DynamoDB, PostgreSQL, MySQL, Oracle Database, Neo4j, OpenSearch, Databricks, GA4, GTM, Power BI'],
    ['IA aplicada', 'IA generativa, chatbots (Dialogflow, OpenAI), agentes e assistentes com LLM, desenvolvimento com IA (Amazon Q Developer, GitHub Copilot, Claude Code)'],
    ['Liderança e produto', 'Liderança de squads, Scrum, arquitetura de microsserviços, revisão de código, UI/UX (Figma), QA e testes automatizados'],
  ],
  certificacoes: [
    'Oracle Cloud Infrastructure 2025 Generative AI Certified Professional (Oracle)',
    'Oracle Cloud Infrastructure 2025 Foundations Associate (Oracle)',
    'Oracle Cloud Infrastructure 2023 AI Certified Foundations Associate (Oracle)',
    'Google Analytics Individual Qualification (Google)',
    'GenAI Technical Certification (AI/R Company)',
    'Liderança Técnica, presencial (Rocketseat Assemble)',
  ],
  formacao: [['Bacharelado em Ciência da Computação', 'UNIFAJ, Jaguariúna/SP', '2022']],
  idiomas: [
    ['Português', 'nativo'],
    ['Inglês', 'intermediário (conversação e escrita)'],
  ],
}

// Sem datas por alocação: mostra só "atual" quando for o caso.
export const periodo = (a) => (a.inicio ? `${a.inicio} – ${a.fim}` : a.fim === 'atual' ? 'atual' : '')
