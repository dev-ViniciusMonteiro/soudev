// Fonte única do currículo: alimenta a página /curriculo, o .docx, o /resume.json e o /llms.txt.
// Toda a experiência é pela Compass UOL (consultoria, CLT): os clientes aparecem como alocações, nunca como empregador.

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
    'Tech Lead e Desenvolvedor Full Stack atuando na área desde 2018, especializado em e-commerce, integrações entre sistemas e cloud. Na Compass UOL desde 2021, atuei para Natura &Co (Natura e Avon em toda a América Latina), Qualicorp e UOL EdTech, e hoje lidero 4 squads no Cidade Center Norte. Trabalho de ponta a ponta, do UI/UX ao QA, com Node.js, TypeScript, React e Next.js, AWS (Lambda, EventBridge, ECS) e Azure, Salesforce Commerce Cloud e Oracle Integration Cloud. Certificado Oracle Generative AI Professional, uso IA generativa no ciclo de desenvolvimento para entregar mais rápido.',
  destaques: [
    'Lidero 4 squads (cerca de 13 pessoas) no Cidade Center Norte, incluindo um e-commerce montado do zero.',
    'Reduzi de 60% para 0,001% a taxa de erro das integrações de pedidos da Real Distribuidora.',
    'Sustentei a PDP de Natura e Avon em 7 países da América Latina, com automação serverless na AWS.',
    'Entreguei sozinho, em 8 dias, uma POC completa na AWS com desenvolvimento orientado por IA.',
  ],
  empresa: {
    nome: 'Compass UOL',
    tipo: 'consultoria de tecnologia, CLT',
    cargo: 'Trainee → Júnior → Pleno → Tech Lead',
    inicio: '04/2021',
    fim: 'atual',
  },
  alocacoes: [
    {
      cliente: 'Cidade Center Norte',
      papel: 'Tech Lead (4 squads)',
      inicio: '04/2026',
      fim: 'atual',
      itens: [
        'Lidero tecnicamente 4 squads, cerca de 13 pessoas, no complexo Cidade Center Norte (Shopping Center Norte, Lar Center, Expo Center Norte e Novotel): integrações, infraestrutura AWS, app e e-commerce.',
        'Montamos do zero o e-commerce de venda de vagas de estacionamento, com squad de front-end e back-end, da definição da solução à operação.',
        'Coordeno o app que integra e controla as operações dos empreendimentos do complexo, com squad de front-end, back-end, QA e PO.',
        'Conduzo os rituais Scrum, as decisões de arquitetura e a revisão de código, acompanhando as entregas do UI/UX ao QA.',
      ],
      stack: ['Liderança técnica', 'Scrum', 'Arquitetura de software', 'AWS', 'C# (.NET)', 'Integrações', 'E-commerce'],
    },
    {
      cliente: 'Natura &Co (Natura e Avon)',
      papel: 'Backend Developer · Salesforce',
      inicio: '05/2024',
      fim: '04/2026',
      itens: [
        'Mantenedor da PDP (página e dados de produto) de Natura e Avon em 7 países (Brasil, Argentina, Chile, Colômbia, Peru, Bolívia e México): regras, evolução e sustentação.',
        'Criei uma automação com AWS EventBridge e Lambda que atualiza os produtos do tipo kit, evitando quebras no fluxo de venda e mantendo a integridade dos dados de produto nos 7 países.',
        'Construí um sistema white-label de gestão de consultoras no squad de Pós-Compra.',
        'Recriei a gestão de pedidos em tempo real, com atualização instantânea no e-commerce e no painel da consultora.',
        'Migrei a base de dados do CSP (acelerador de e-commerce criado pela Compass) com estabilidade e desenvolvi funcionalidades de pedidos e carrinho no front (React/Next.js) e no backend.',
      ],
      stack: ['Node.js', 'TypeScript', 'Salesforce Commerce Cloud B2C', 'AWS Lambda', 'AWS EventBridge', 'DynamoDB', 'GraphQL', 'React', 'Next.js', 'Databricks', 'Azure API Gateway', 'Azure Pipelines', 'GA4'],
    },
    {
      cliente: 'Compass UOL (interno): AI Native',
      papel: 'Full Stack, em paralelo à Natura',
      inicio: '06/2025',
      fim: '07/2025',
      itens: [
        'Em 8 dias, desenvolvi sozinho a POC de um sistema web de gestão de clínica psicológica: 30 telas no Figma, 42 tasks e cenários de teste.',
        'Desenvolvimento orientado por IA (Amazon Q Developer e AI Cockpit) com Node.js, React e microsserviços, provisionado e publicado na AWS.',
      ],
      stack: ['Node.js', 'React', 'Microsserviços', 'MySQL', 'AWS ECS', 'AWS API Gateway', 'AWS VPC', 'AWS CodeDeploy', 'Figma', 'Amazon Q Developer'],
    },
    {
      cliente: 'Qualicorp',
      papel: 'Commerce Platform Developer',
      inicio: '04/2023',
      fim: '05/2024',
      itens: [
        'Desenvolvi um chatbot humanizado de vendas de planos de saúde no WhatsApp, com Dialogflow e ChatGPT, que atendia cerca de 500 pessoas por mês.',
        'Construí funcionalidades do e-commerce de planos de saúde com Node.js, Vue.js e Neo4j em microsserviços, acompanhando o crescimento do canal de vendas online.',
        'Otimizei os eventos de GA4 e GTM para medir com precisão as interações e apoiar as decisões do negócio.',
      ],
      stack: ['Node.js', 'Vue.js', 'Neo4j', 'Microsserviços', 'Dialogflow', 'OpenAI', 'GA4', 'GTM'],
    },
    {
      cliente: 'UOL EdTech',
      papel: 'Desenvolvedor Full Stack',
      inicio: '09/2022',
      fim: '09/2023',
      itens: [
        'Participei da criação da plataforma Campus Digital, em uso até hoje, que atende instituições como FAAP, PUC-RS e UNINASSAU.',
        'Desenvolvi o sistema de detecção de fraude por câmera em provas online, além de provas, login com AWS Cognito e gestão acadêmica.',
      ],
      stack: ['Node.js', 'NestJS', 'Next.js', 'SQL', 'AWS Cognito', 'Testes automatizados'],
    },
    {
      cliente: 'Port Info, Yamaha e acelerador interno',
      papel: 'Backend Node.js (Oracle Commerce)',
      inicio: '03/2022',
      fim: '09/2022',
      itens: [
        'Implementei Server-Sent Events (Node.js e Express) para integração em tempo real com o Oracle Commerce Cloud no Acelerador TRX, reaproveitado em vários projetos.',
        'Port Info: participei da criação do e-commerce em OCC e das integrações entre sistemas com OIC.',
        'Yamaha: implantação do CSP (acelerador de e-commerce criado pela Compass) com backend em Node.js e TypeScript, finalizando as entregas críticas.',
      ],
      stack: ['Node.js', 'TypeScript', 'Express', 'Oracle Commerce Cloud (OCC)', 'Oracle Integration Cloud (OIC)', 'React'],
    },
    {
      cliente: 'Fugini',
      papel: 'Líder de equipe backend',
      inicio: '08/2021',
      fim: '03/2022',
      itens: [
        'Liderei a equipe de backend dos e-commerces B2B Fugini e Ramy, integrados ao ERP via Oracle Integration Cloud, com entregas no prazo.',
        'Modelei a base MySQL de dados fiscais e comerciais e implementei o cálculo de Substituição Tributária (ICMS-ST) em tempo real.',
      ],
      stack: ['Node.js', 'Express', 'MySQL', 'Oracle Database', 'Oracle Integration Cloud (OIC)', 'OCC', 'ERP'],
    },
    {
      cliente: 'Real Distribuidora',
      papel: 'Desenvolvedor de integrações, em paralelo à Fugini',
      inicio: '08/2021',
      fim: '02/2022',
      itens: [
        'Reduzi a taxa de erro das integrações de pedidos de 60% para 0,001% com Oracle Integration Cloud, em alto volume de transações, aumentando as vendas e diminuindo o esforço operacional.',
      ],
      stack: ['Oracle Integration Cloud (OIC)', 'OCC Classic', 'Node.js', 'ERP'],
    },
  ],
  // Antes da Compass: trabalho informal, sem vínculo.
  anteriores: [
    {
      empresa: 'Freelancer',
      papel: 'Desenvolvimento web',
      inicio: '2018',
      fim: '2021',
      itens: ['Telas e sites em HTML, CSS e JavaScript para pequenos clientes, em paralelo à faculdade.'],
    },
  ],
  competencias: [
    ['Linguagens e frameworks', 'TypeScript, JavaScript, Node.js, NestJS, Express, React, Next.js, Vue.js, C# (.NET), GraphQL, REST'],
    ['Cloud e DevOps', 'AWS (Lambda, EventBridge, ECS, API Gateway, Cognito, VPC, CodeDeploy), Azure (API Gateway, Pipelines), Oracle Cloud Infrastructure, Docker, CI/CD'],
    ['Commerce e integrações', 'Salesforce Commerce Cloud B2C, Oracle Commerce Cloud (OCC), Oracle Integration Cloud (OIC), ERP, meios de pagamento'],
    ['Dados e analytics', 'DynamoDB, PostgreSQL, MySQL, Oracle Database, Neo4j, OpenSearch, Databricks, GA4, GTM, Power BI'],
    ['IA aplicada', 'IA generativa, chatbots (Dialogflow, OpenAI), desenvolvimento com IA (Amazon Q Developer, GitHub Copilot), assistente pessoal com LLM'],
    ['Liderança e produto', 'Liderança de squads, Scrum, arquitetura de microsserviços, revisão de código, UI/UX (Figma), QA e testes automatizados'],
  ],
  certificacoes: [
    'Oracle Cloud Infrastructure 2025 Generative AI Certified Professional (Oracle, 04/2025)',
    'Oracle Cloud Infrastructure 2025 Foundations Associate (Oracle, 04/2025)',
    'Oracle Cloud Infrastructure 2023 AI Certified Foundations Associate (Oracle, 04/2024)',
    'Google Analytics Individual Qualification (Google, 04/2025)',
    'GenAI Technical Certification (AI/R Company, 03/2024)',
    'Liderança Técnica, presencial (Rocketseat Assemble)',
  ],
  formacao: [['Bacharelado em Ciência da Computação', 'UNIFAJ, Jaguariúna/SP', '2022']],
  idiomas: [
    ['Português', 'nativo'],
    ['Inglês', 'intermediário (conversação e escrita)'],
  ],
}

export const periodo = (a) => `${a.inicio} – ${a.fim}`
