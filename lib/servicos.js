// Serviços do Vinicius: catálogo da página /servicos (propaganda + "carrinho" de orçamento).
// preco: texto opcional (ex.: 'a partir de R$ 90'). Sem preço, aparece "Sob orçamento".

export const servicos = [
  {
    slug: 'aulas-de-programacao-e-ia',
    nome: 'Aulas de programação e IA',
    curto: 'Aulas particulares e em grupo, do zero ao primeiro emprego, e de IA para usar no trabalho.',
    icone: '🎓',
    cor: '#2b5d8c',
    titulo: 'Aulas particulares de programação e inteligência artificial (online)',
    descricao:
      'Aulas particulares de programação e de inteligência artificial com um Tech Lead com mais de 8 anos de experiência: lógica, JavaScript, React, Next.js, Node, banco de dados, IA no dia a dia e preparação para vagas. Online para todo o Brasil ou presencial em Mogi Guaçu/SP.',
    keywords: ['aulas de programação', 'aula particular de programação', 'curso de programação online', 'aulas de javascript', 'aulas de react', 'aula de inteligência artificial', 'mentoria de programação', 'como começar a programar'],
    chamada: 'Aprenda com quem faz isso todo dia, no seu ritmo e com projeto de verdade.',
    beneficios: [
      ['Do seu jeito', 'Começa do ponto em que você está: do zero, travado num projeto ou se preparando para entrevista.'],
      ['Projeto real', 'Você sai com um projeto publicado na internet para mostrar no portfólio.'],
      ['IA a seu favor', 'Aprende a programar e a usar Claude e ChatGPT para estudar e trabalhar mais rápido, sem depender deles.'],
      ['Gravação e material', 'As aulas online podem ser gravadas e você recebe o resumo e os exercícios.'],
    ],
    itens: [
      { id: 'aula-avulsa', nome: 'Aula avulsa (1 hora)', resumo: 'Para tirar dúvidas, destravar um projeto ou experimentar.', preco: '' },
      { id: 'pacote-4', nome: 'Pacote de 4 aulas', resumo: 'Um mês de acompanhamento semanal com plano de estudo.', preco: '' },
      { id: 'do-zero', nome: 'Programação do zero', resumo: 'Lógica, HTML, CSS e JavaScript até o primeiro site no ar.', preco: '' },
      { id: 'react-next', nome: 'React, Next.js e Node', resumo: 'Do componente ao sistema completo com banco de dados.', preco: '' },
      { id: 'ia-no-trabalho', nome: 'IA no dia a dia', resumo: 'Claude, ChatGPT e automações para quem não é programador.', preco: '' },
      { id: 'mentoria-carreira', nome: 'Mentoria de carreira', resumo: 'Currículo, LinkedIn, portfólio e simulação de entrevista técnica.', preco: '' },
      { id: 'turma-empresa', nome: 'Aula para equipe ou empresa', resumo: 'Treinamento sob medida para o seu time.', preco: '' },
    ],
    faq: [
      ['Preciso saber alguma coisa antes?', 'Não. As aulas começam do ponto em que você está, até do zero absoluto.'],
      ['As aulas são online ou presenciais?', 'Online para todo o Brasil (Google Meet ou Zoom) e presenciais em Mogi Guaçu/SP e região.'],
      ['Qual linguagem vou aprender?', 'Normalmente JavaScript, que serve para sites, sistemas e apps. Se você tiver um objetivo diferente, o plano se adapta.'],
      ['Serve para quem quer mudar de carreira?', 'Sim. A mentoria de carreira cuida de portfólio, currículo e entrevistas.'],
    ],
  },
  {
    slug: 'colocar-site-e-projeto-no-ar',
    nome: 'Colocar seu projeto no ar',
    curto: 'Domínio, hospedagem, deploy, HTTPS e e-mail profissional: seu site ou sistema funcionando de verdade.',
    icone: '🚀',
    cor: '#1f5c45',
    titulo: 'Colocar site e sistema no ar: domínio, hospedagem, deploy e manutenção',
    descricao:
      'Seu projeto está pronto no computador mas não está na internet? Eu configuro domínio, hospedagem (Vercel, Cloudflare, VPS), deploy automático, HTTPS, banco de dados e e-mail profissional, e corrijo os erros que impedem o projeto de subir.',
    keywords: ['colocar site no ar', 'como publicar site', 'deploy de site', 'hospedagem de site', 'configurar domínio', 'deploy vercel', 'site fora do ar', 'e-mail profissional com domínio'],
    chamada: 'Do "funciona na minha máquina" para o link que você manda para todo mundo.',
    beneficios: [
      ['Hospedagem certa', 'Escolho a opção mais barata que aguenta o seu projeto (muitas vezes gratuita).'],
      ['Domínio e e-mail', 'Seu nome.com.br apontado, com HTTPS e e-mail profissional.'],
      ['Deploy automático', 'Mudou o código, o site atualiza sozinho.'],
      ['Sem sustos', 'Backup, monitoramento e um passo a passo do que foi feito.'],
    ],
    itens: [
      { id: 'publicar-site', nome: 'Publicar site ou landing page', resumo: 'Do seu código (ou do seu construtor) para o ar, com domínio.', preco: '' },
      { id: 'publicar-sistema', nome: 'Publicar sistema com banco de dados', resumo: 'Front, back e banco funcionando em produção.', preco: '' },
      { id: 'dominio-email', nome: 'Domínio e e-mail profissional', resumo: 'Registro.br, DNS, HTTPS e e-mail com o seu domínio.', preco: '' },
      { id: 'corrigir-erro', nome: 'Corrigir projeto que não sobe', resumo: 'Erro no deploy, site fora do ar ou lento.', preco: '' },
      { id: 'migracao', nome: 'Migrar de hospedagem', resumo: 'Sair de uma hospedagem cara ou ruim sem perder nada.', preco: '' },
      { id: 'manutencao', nome: 'Manutenção mensal', resumo: 'Atualizações, backup e ajustes pequenos todo mês.', preco: '' },
    ],
    faq: [
      ['Fiz meu site com IA ou num construtor. Dá para publicar?', 'Dá. Projetos feitos com Lovable, Bolt, v0, Claude ou na mão: eu organizo e publico com domínio próprio.'],
      ['Quanto custa manter no ar?', 'Muitos sites ficam de graça (Vercel, Cloudflare). Sistemas com banco costumam custar de zero a algumas dezenas de reais por mês. Você sabe o custo antes.'],
      ['O domínio fica no meu nome?', 'Sempre. Domínio, contas e senhas ficam com você.'],
    ],
  },
  {
    slug: 'tirar-ideia-do-papel',
    nome: 'Tirar sua ideia do papel',
    curto: 'Sites, sistemas, apps e lojas sob medida: o seu sonho funcionando, do protótipo ao produto.',
    icone: '✨',
    cor: '#8a5a2b',
    titulo: 'Criar site, sistema ou aplicativo sob medida: tire sua ideia do papel',
    descricao:
      'Desenvolvimento de sites, sistemas, aplicativos e lojas sob medida: do protótipo rápido para validar a ideia até o produto completo. Agendamento, catálogo, painel administrativo, área de clientes, integrações com WhatsApp e pagamentos.',
    keywords: ['criar sistema sob medida', 'desenvolvimento de sistemas', 'criar aplicativo', 'criar site profissional', 'desenvolvedor freelancer', 'tirar ideia do papel', 'criar mvp', 'sistema de agendamento'],
    chamada: 'Você conta o sonho. Eu transformo em algo que as pessoas usam.',
    beneficios: [
      ['Protótipo rápido', 'Em poucos dias você já clica na sua ideia, antes de investir tudo.'],
      ['Feito para crescer', 'A mesma tecnologia de empresas grandes (React, Next.js, Node), sem exagero de custo.'],
      ['Funciona no celular', 'Tudo pensado para o celular primeiro, como app instalável quando faz sentido.'],
      ['Você é dono', 'Código, domínio e dados são seus. Sem mensalidade escondida.'],
    ],
    itens: [
      { id: 'landing', nome: 'Site ou página de vendas', resumo: 'Para apresentar o negócio e aparecer no Google.', preco: '' },
      { id: 'prototipo', nome: 'Protótipo para validar a ideia', resumo: 'Uma versão clicável e funcional para testar com clientes.', preco: '' },
      { id: 'sistema', nome: 'Sistema sob medida', resumo: 'Agendamento, estoque, pedidos, painel, área do cliente.', preco: '' },
      { id: 'app', nome: 'Aplicativo (web e celular)', resumo: 'App instalável no celular, com notificações e modo offline.', preco: '' },
      { id: 'loja', nome: 'Loja ou catálogo online', resumo: 'Vitrine com pedido pelo WhatsApp ou pagamento online.', preco: '' },
      { id: 'integracao', nome: 'Integração e automação', resumo: 'Planilha, WhatsApp, ERP e pagamentos conversando entre si.', preco: '' },
    ],
    faq: [
      ['Tenho só a ideia. Por onde começa?', 'Por uma conversa e um protótipo pequeno. Assim você vê a ideia funcionando antes de gastar com tudo.'],
      ['Quanto tempo leva?', 'Um protótipo costuma levar de dias a poucas semanas. O prazo do sistema completo vem no orçamento, por etapas.'],
      ['Vocês fazem o visual também?', 'Sim. Layout, textos e banners fazem parte do projeto.'],
      ['Posso ver exemplos?', 'Sim: os sistemas, apps e ferramentas deste site foram todos feitos por mim e estão no ar para testar.'],
    ],
  },
  {
    slug: 'inteligencia-artificial-para-empresas',
    nome: 'IA para empresas',
    curto: 'Configuro Claude, ChatGPT e automações na sua empresa: atendimento, documentos e processos com segurança.',
    icone: '🤖',
    cor: '#7c3aed',
    titulo: 'Implantação de inteligência artificial em empresas: Claude, ChatGPT e automações',
    descricao:
      'Implantação de inteligência artificial na sua empresa: assistentes que respondem com os documentos da empresa, atendimento no WhatsApp, automação de tarefas repetitivas, agentes conectados aos seus sistemas e treinamento da equipe, com cuidado com a LGPD e com os dados.',
    keywords: ['inteligência artificial para empresas', 'implantar ia na empresa', 'consultoria de ia', 'automação com ia', 'chatbot whatsapp com ia', 'claude para empresas', 'chatgpt para empresas', 'agente de ia'],
    chamada: 'IA que resolve o trabalho repetitivo de verdade, não só um chat bonito.',
    beneficios: [
      ['Começa pelo problema', 'Primeiro acho onde a IA economiza horas na sua rotina; depois escolho a ferramenta.'],
      ['Com os seus dados', 'Assistentes que respondem com os seus manuais, contratos, tabelas e sistemas.'],
      ['Seguro', 'Sem colar dado de cliente em qualquer lugar: regras de uso, permissões e cuidado com a LGPD.'],
      ['Equipe treinada', 'Seu time aprende a usar no dia a dia, com exemplos do próprio trabalho.'],
    ],
    itens: [
      { id: 'diagnostico', nome: 'Diagnóstico de IA', resumo: 'Mapeio as tarefas e mostro onde a IA dá retorno primeiro.', preco: '' },
      { id: 'assistente-docs', nome: 'Assistente com os documentos da empresa', resumo: 'Responde dúvidas da equipe ou de clientes com base nos seus arquivos.', preco: '' },
      { id: 'whatsapp-ia', nome: 'Atendimento com IA no WhatsApp', resumo: 'Responde, qualifica e passa para um humano quando precisa.', preco: '' },
      { id: 'automacao', nome: 'Automação de processos', resumo: 'Relatórios, conferência de documentos, e-mails e planilhas no automático.', preco: '' },
      { id: 'agentes', nome: 'Agentes conectados aos seus sistemas', resumo: 'Claude ou ChatGPT operando seu ERP, CRM ou banco (via MCP/API).', preco: '' },
      { id: 'treinamento', nome: 'Treinamento da equipe', resumo: 'Uso seguro e produtivo de IA no trabalho de cada área.', preco: '' },
    ],
    faq: [
      ['Minha empresa é pequena. Vale a pena?', 'Muitas vezes é onde mais vale: uma automação simples pode liberar horas por semana de uma pessoa.'],
      ['Meus dados ficam seguros?', 'Uso planos empresariais que não treinam com seus dados, com acesso só para quem precisa e regras claras de uso.'],
      ['Precisa trocar meus sistemas?', 'Não. A IA é conectada ao que você já usa: planilhas, WhatsApp, ERP, e-mail.'],
      ['Claude ou ChatGPT?', 'Depende da tarefa e do custo. O diagnóstico compara e recomenda.'],
    ],
  },
]

export const getServico = (slug) => servicos.find((s) => s.slug === slug)

export const FAQ_GERAL = [
  ['Quanto custa?', 'Cada projeto é diferente, por isso o orçamento é personalizado e sem compromisso. Monte o pedido, conte o que precisa e eu respondo com valores e prazos.'],
  ['Atende só em Mogi Guaçu?', 'Atendo todo o Brasil online. Presencialmente, em Mogi Guaçu/SP e região.'],
  ['Recebo comprovante?', 'Sim, você recebe recibo de todo serviço contratado.'],
  ['Como funciona o pagamento?', 'Por etapas, combinado no orçamento: você paga conforme as entregas acontecem.'],
]
