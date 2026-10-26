// Dados do Gerador de Currículo: modelos visuais, cores, dicas de campo e exemplos por área.
// O exemplo de cada área preenche o "essencial do ramo" (cargo, resumo, experiências, habilidades,
// cursos), mantendo nome/foto/contato. Tudo fictício e didático, pensado para quem está começando.

export const MODELOS = [
  { id: 'classico', nome: 'Clássico', layout: 'single', accent: '#1f5c45', ats: true, desc: 'Uma coluna, sóbrio. O mais lido por sistemas de triagem (ATS).' },
  { id: 'moderno', nome: 'Moderno', layout: 'sidebar', accent: '#2b5d8c', desc: 'Barra lateral colorida com foto. Bonito e organizado.' },
  { id: 'minimalista', nome: 'Minimalista', layout: 'single', accent: '#222222', desc: 'Limpo, só tipografia. Elegante e neutro.' },
  { id: 'compacto', nome: 'Compacto', layout: 'sidebar', accent: '#6b21a8', desc: 'Tudo em uma página, denso. Bom para quem tem muito conteúdo.' },
  { id: 'criativo', nome: 'Criativo', layout: 'band', accent: '#be123c', desc: 'Faixa de cor no topo e destaque. Para áreas criativas.' },
  { id: 'elegante', nome: 'Elegante', layout: 'single', serif: true, accent: '#7c3a2d', desc: 'Tipografia com serifa. Ar sofisticado e tradicional.' },
  { id: 'lateral', nome: 'Lateral direita', layout: 'sidebarR', accent: '#0f766e', desc: 'Barra colorida à direita. Visual diferente e arejado.' },
  { id: 'tradicional', nome: 'Tradicional', layout: 'band', accent: '#334155', desc: 'Faixa discreta e conservador. Seguro para qualquer vaga.' },
]

export const CORES = ['#1f5c45', '#2b5d8c', '#6b21a8', '#be123c', '#b45309', '#0f766e', '#334155', '#222222']

export const DICAS = {
  foto: 'Opcional. Se usar, escolha uma foto nítida, de frente, com fundo neutro. Em vagas com triagem automática, prefira sem foto.',
  nome: 'Seu nome completo, como nos documentos. Nada de apelido.',
  cargo: 'O cargo que você QUER, não o atual. Ex.: “Pedreiro”, “Auxiliar Administrativo”, “Corretor de Imóveis”. Adapte para cada vaga.',
  email: 'Um e-mail simples e profissional (nome.sobrenome@). Confira se consegue acessar.',
  telefone: 'Com DDD. Deixe o número do WhatsApp.',
  cidade: 'Cidade e estado. Se aceita viajar, mudar ou trabalhar remoto, escreva.',
  linkedin: 'Se tiver LinkedIn, deixe completo e com foto. Se não usa, pode deixar em branco.',
  site: 'Portfólio, Instagram profissional, GitHub ou site do seu trabalho. Só preencha se for relevante.',
  resumo: 'De 3 a 4 linhas: quem você é, o que sabe fazer e o que procura. Comece pelo mais forte. Sem clichê de “proativo e dinâmico”.',
  experiencias: 'Comece pela mais recente. Sem carteira assinada? Vale trabalho autônomo, obras/serviços por conta, ajuda em negócio da família, estágio e voluntariado. Use verbos de ação e, quando der, números.',
  formacao: 'Curso, instituição e período. Pode incluir ensino médio, curso técnico e “cursando”. Para muitas vagas operacionais, o ensino médio já basta.',
  habilidades: 'Misture as práticas (ferramentas, técnicas) e as de convivência (pontualidade, trabalho em equipe). Seja honesto no nível.',
  idiomas: 'Só o que você realmente usa, com nível realista. Para muitas vagas, português já é suficiente — não precisa inventar inglês.',
  cursos: 'Cursos, certificados e treinamentos (inclusive NRs de segurança, CNH, cursos do SENAI/SENAC). Mostram que você se prepara.',
}

// Identidade padrão do exemplo (nome e foto reais; contato é placeholder para a pessoa trocar).
export const IDENT = {
  foto: '/vinicius-rosto.jpg',
  nome: 'Vinicius Monteiro Orlandi',
  email: 'seuemail@exemplo.com',
  telefone: '(11) 90000-0000',
  cidade: 'São Paulo, SP',
  linkedin: '',
  site: '',
}

const exp = (cargo, empresa, periodo, local, desc) => ({ cargo, empresa, periodo, local, desc })

// Cada área: nome, ícone, modelos recomendados, dica do ramo e exemplo essencial.
export const AREAS = [
  {
    id: 'branco', nome: 'Começar do zero (só explicações)', icone: '📝', recomendados: ['classico', 'moderno', 'minimalista'],
    dica: 'Modo em branco: nada vem escrito, só a explicação de cada campo logo abaixo dele. Preencha no seu ritmo, com as suas informações.',
    exemplo: {
      cargo: '', resumo: '', email: '', telefone: '', cidade: '', linkedin: '', site: '',
      experiencias: [{ cargo: '', empresa: '', periodo: '', local: '', desc: '' }],
      formacao: [{ curso: '', instituicao: '', periodo: '' }],
      habilidades: [],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [],
    },
  },
  {
    id: 'geral', nome: 'Primeiro emprego / Geral', icone: '🌱', recomendados: ['classico', 'moderno', 'minimalista'],
    dica: 'Sem experiência? Valorize cursos, projetos, trabalho voluntário e atividades do dia a dia que mostrem responsabilidade.',
    exemplo: {
      cargo: 'Auxiliar / Primeiro emprego',
      resumo: 'Pessoa em início de carreira, pontual, organizada e com muita vontade de aprender. Busco a primeira oportunidade para colaborar com a equipe, crescer na empresa e assumir novas responsabilidades.',
      experiencias: [
        exp('Trabalho voluntário', 'Ação comunitária do bairro', '2024 – 2025', 'São Paulo, SP', 'Ajudei na organização de eventos e na arrecadação de doações.\nAtendi o público e trabalhei em equipe com outros voluntários.'),
        exp('Ajudante em negócio da família', 'Comércio local', '2022 – 2024', 'São Paulo, SP', 'Atendi clientes, organizei produtos e ajudei no controle do caixa.\nDesenvolvi responsabilidade, pontualidade e bom atendimento.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2024' }],
      habilidades: ['Pontualidade', 'Trabalho em equipe', 'Boa comunicação', 'Organização', 'Vontade de aprender', 'Informática básica'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Informática básica', instituicao: 'Curso gratuito', ano: '2024' }],
    },
  },
  {
    id: 'construcao', nome: 'Construção civil', icone: '🧱', recomendados: ['classico', 'compacto', 'tradicional'],
    dica: 'Destaque experiência prática, tipos de obra, ferramentas que domina, cursos de NR (segurança) e disponibilidade para viajar.',
    exemplo: {
      cargo: 'Pedreiro',
      resumo: 'Profissional da construção civil com experiência em obras residenciais e comerciais. Domino assentamento, reboco, contrapiso e acabamento, trabalho com qualidade, dentro do prazo e seguindo as normas de segurança.',
      experiencias: [
        exp('Pedreiro', 'Construtora Exemplo', '2021 – atual', 'São Paulo, SP', 'Execução de alvenaria, reboco, contrapiso e assentamento de pisos e azulejos.\nLeitura de projetos simples e conferência de medidas.\nTrabalho em equipe seguindo as normas de segurança (uso de EPI).'),
        exp('Servente de obras', 'Obras autônomas', '2018 – 2021', 'São Paulo, SP', 'Preparo de massa e concreto, transporte de materiais e apoio ao pedreiro.\nOrganização e limpeza do canteiro de obras.'),
      ],
      formacao: [{ curso: 'Ensino Fundamental Completo', instituicao: 'Escola Exemplo', periodo: '2016' }],
      habilidades: ['Alvenaria e reboco', 'Assentamento de piso e azulejo', 'Contrapiso e acabamento', 'Leitura de medidas', 'Uso de EPI', 'Trabalho em equipe', 'Disponibilidade para viagem'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'NR-35 (Trabalho em Altura)', instituicao: 'Treinamento', ano: '2023' }, { nome: 'Leitura de Projetos', instituicao: 'SENAI', ano: '2022' }],
    },
  },
  {
    id: 'vendas', nome: 'Vendas e comércio', icone: '🛍️', recomendados: ['moderno', 'classico', 'criativo'],
    dica: 'Mostre resultados com números (metas batidas, % de aumento) e experiência com atendimento e fechamento de vendas.',
    exemplo: {
      cargo: 'Vendedor(a)',
      resumo: 'Vendedor(a) com facilidade de relacionamento, foco no cliente e em bater metas. Experiência em atendimento, demonstração de produtos e fechamento de vendas no varejo.',
      experiencias: [
        exp('Vendedor(a)', 'Loja Exemplo', '2022 – atual', 'São Paulo, SP', 'Atendimento e venda no varejo, com média de 110% da meta mensal.\nMontagem de vitrine e organização da loja.\nAbertura e fechamento de caixa.'),
        exp('Atendente de balcão', 'Comércio Exemplo', '2020 – 2022', 'São Paulo, SP', 'Atendimento ao cliente, tirar dúvidas e indicar produtos.\nControle de estoque e reposição.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2019' }],
      habilidades: ['Atendimento ao cliente', 'Técnicas de venda', 'Negociação', 'Fechamento de vendas', 'Trabalho com metas', 'Operação de caixa', 'Comunicação'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Técnicas de Vendas e Atendimento', instituicao: 'SENAC', ano: '2022' }],
    },
  },
  {
    id: 'corretor', nome: 'Corretor de imóveis', icone: '🏠', recomendados: ['moderno', 'elegante', 'classico'],
    dica: 'Informe o CRECI (ou que está em processo), a região em que atua e resultados (imóveis vendidos/locados).',
    exemplo: {
      cargo: 'Corretor(a) de Imóveis',
      resumo: 'Corretor(a) de imóveis com CRECI ativo, perfil consultivo e foco em entender a necessidade do cliente. Experiência em captação, visitas, negociação e fechamento de vendas e locações.',
      experiencias: [
        exp('Corretor(a) de Imóveis', 'Imobiliária Exemplo', '2022 – atual', 'São Paulo, SP', 'Captação de imóveis, anúncios e agendamento de visitas.\nNegociação e fechamento de vendas e locações.\nAcompanhamento de documentação e pós-venda.'),
      ],
      formacao: [
        { curso: 'Técnico em Transações Imobiliárias (TTI)', instituicao: 'Instituição Exemplo', periodo: '2021' },
        { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' },
      ],
      habilidades: ['CRECI ativo', 'Captação de imóveis', 'Negociação', 'Atendimento consultivo', 'Portais e anúncios', 'Documentação imobiliária', 'CNH categoria B'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Técnico em Transações Imobiliárias', instituicao: 'Curso TTI', ano: '2021' }],
    },
  },
  {
    id: 'administrativo', nome: 'Administrativo e recepção', icone: '🗂️', recomendados: ['classico', 'minimalista', 'tradicional'],
    dica: 'Valorize organização, pacote Office, atendimento e rotinas administrativas (planilhas, arquivo, agendamentos).',
    exemplo: {
      cargo: 'Auxiliar Administrativo',
      resumo: 'Profissional organizado(a) e atento(a) a detalhes, com experiência em rotinas administrativas, atendimento e uso do pacote Office. Busco contribuir com a organização e o bom andamento do setor.',
      experiencias: [
        exp('Auxiliar Administrativo', 'Empresa Exemplo', '2022 – atual', 'São Paulo, SP', 'Atendimento telefônico e por e-mail, organização de documentos e arquivo.\nLançamento de dados em planilhas e emissão de relatórios.\nAgendamento de reuniões e apoio aos demais setores.'),
        exp('Recepcionista', 'Empresa Exemplo', '2020 – 2022', 'São Paulo, SP', 'Recepção de visitantes, controle de agenda e atendimento ao público.'),
      ],
      formacao: [{ curso: 'Técnico em Administração', instituicao: 'Instituição Exemplo', periodo: '2021' }, { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Pacote Office (Word e Excel)', 'Organização e arquivo', 'Atendimento', 'Rotinas administrativas', 'Digitação', 'Comunicação', 'Trabalho em equipe'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }, { idioma: 'Inglês', nivel: 'Básico' }],
      cursos: [{ nome: 'Excel do básico ao intermediário', instituicao: 'Curso online', ano: '2023' }],
    },
  },
  {
    id: 'saude', nome: 'Saúde e cuidados', icone: '🩺', recomendados: ['classico', 'tradicional', 'compacto'],
    dica: 'Informe registro no conselho (COREN, se tiver), experiência com pacientes e cursos (primeiros socorros, cuidador).',
    exemplo: {
      cargo: 'Técnico(a) de Enfermagem',
      resumo: 'Profissional da saúde cuidadoso(a) e humano(a), com registro no COREN e experiência no cuidado a pacientes. Atuo com sinais vitais, administração de medicação e apoio à equipe de enfermagem.',
      experiencias: [
        exp('Técnico(a) de Enfermagem', 'Clínica Exemplo', '2022 – atual', 'São Paulo, SP', 'Verificação de sinais vitais e administração de medicação conforme prescrição.\nCurativos, coleta de material e apoio aos procedimentos.\nRegistro em prontuário e atenção ao conforto do paciente.'),
        exp('Cuidador(a) de idosos', 'Atendimento domiciliar', '2020 – 2022', 'São Paulo, SP', 'Auxílio em higiene, alimentação e medicação de pacientes idosos.'),
      ],
      formacao: [{ curso: 'Técnico em Enfermagem', instituicao: 'Instituição Exemplo', periodo: '2021' }, { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Registro COREN', 'Sinais vitais', 'Administração de medicação', 'Curativos', 'Primeiros socorros', 'Empatia e paciência', 'Trabalho em equipe'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Primeiros Socorros', instituicao: 'Treinamento', ano: '2023' }],
    },
  },
  {
    id: 'educacao', nome: 'Educação', icone: '📚', recomendados: ['elegante', 'classico', 'minimalista'],
    dica: 'Destaque formação, faixas etárias com que já trabalhou e metodologias. Para auxiliar de classe, não precisa de diploma superior.',
    exemplo: {
      cargo: 'Auxiliar de Classe / Professor(a)',
      resumo: 'Profissional da educação dedicado(a) e paciente, com gosto por ensinar e acompanhar o desenvolvimento das crianças. Experiência de apoio em sala de aula e atividades pedagógicas.',
      experiencias: [
        exp('Auxiliar de Classe', 'Escola Exemplo', '2022 – atual', 'São Paulo, SP', 'Apoio ao professor em sala e no preparo de atividades.\nAcompanhamento das crianças em rotinas, higiene e alimentação.\nAjuda na mediação de conflitos e no cuidado com a segurança.'),
      ],
      formacao: [{ curso: 'Pedagogia (cursando)', instituicao: 'Faculdade Exemplo', periodo: '2024 – 2027' }, { curso: 'Magistério', instituicao: 'Escola Exemplo', periodo: '2019' }],
      habilidades: ['Apoio pedagógico', 'Paciência', 'Comunicação', 'Organização de atividades', 'Cuidado com crianças', 'Trabalho em equipe'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Educação Infantil na Prática', instituicao: 'Curso online', ano: '2023' }],
    },
  },
  {
    id: 'gastronomia', nome: 'Gastronomia e alimentação', icone: '🍽️', recomendados: ['compacto', 'moderno', 'classico'],
    dica: 'Mostre tipos de cozinha, ritmo (alto volume), higiene (manipulação de alimentos) e trabalho sob pressão.',
    exemplo: {
      cargo: 'Cozinheiro(a) / Auxiliar de Cozinha',
      resumo: 'Profissional de cozinha ágil e organizado(a), acostumado(a) a alto volume e a trabalhar em equipe. Cuido do preparo, da padronização dos pratos e das boas práticas de higiene.',
      experiencias: [
        exp('Cozinheiro(a)', 'Restaurante Exemplo', '2021 – atual', 'São Paulo, SP', 'Preparo de pratos quentes e frios seguindo as fichas técnicas.\nOrganização da praça e controle de insumos para reduzir desperdício.\nBoas práticas de higiene e manipulação de alimentos.'),
        exp('Auxiliar de Cozinha', 'Lanchonete Exemplo', '2019 – 2021', 'São Paulo, SP', 'Pré-preparo de ingredientes, montagem de pratos e limpeza.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Preparo de pratos', 'Trabalho em equipe', 'Agilidade sob pressão', 'Higiene e manipulação de alimentos', 'Controle de estoque', 'Organização'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Manipulação de Alimentos', instituicao: 'SENAC', ano: '2022' }],
    },
  },
  {
    id: 'logistica', nome: 'Logística e transporte', icone: '🚚', recomendados: ['classico', 'compacto', 'tradicional'],
    dica: 'Informe categoria da CNH, veículos que dirige, experiência com rotas/estoque e pontualidade.',
    exemplo: {
      cargo: 'Motorista / Estoquista',
      resumo: 'Profissional de logística responsável e pontual, com CNH e experiência em entregas, rotas e organização de estoque. Dirijo com segurança e cuido bem da carga.',
      experiencias: [
        exp('Motorista Entregador', 'Transportadora Exemplo', '2021 – atual', 'São Paulo, SP', 'Entregas na região com planejamento de rotas e cumprimento de prazos.\nConferência de carga e descarga e cuidado com as mercadorias.\nManutenção básica e checklist diário do veículo.'),
        exp('Estoquista', 'Empresa Exemplo', '2019 – 2021', 'São Paulo, SP', 'Recebimento, conferência e organização de produtos no estoque.\nControle de entrada e saída e apoio ao inventário.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['CNH categoria B/D', 'Direção segura', 'Planejamento de rotas', 'Organização de estoque', 'Conferência de carga', 'Pontualidade', 'Leitor de código de barras'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Direção Defensiva', instituicao: 'Treinamento', ano: '2022' }],
    },
  },
  {
    id: 'limpeza', nome: 'Serviços gerais e limpeza', icone: '🧹', recomendados: ['classico', 'tradicional', 'compacto'],
    dica: 'Valorize experiência, capricho, confiança e disponibilidade de horário. Honestidade e pontualidade pesam muito.',
    exemplo: {
      cargo: 'Auxiliar de Serviços Gerais',
      resumo: 'Profissional caprichoso(a), confiável e pontual, com experiência em limpeza e conservação de ambientes. Trabalho com atenção aos detalhes e respeito às rotinas do local.',
      experiencias: [
        exp('Auxiliar de Limpeza', 'Empresa Exemplo', '2021 – atual', 'São Paulo, SP', 'Limpeza e conservação de salas, banheiros e áreas comuns.\nUso correto de produtos e materiais de limpeza.\nOrganização e reposição de materiais.'),
        exp('Diarista', 'Residências', '2018 – 2021', 'São Paulo, SP', 'Limpeza completa de residências com organização e capricho.'),
      ],
      formacao: [{ curso: 'Ensino Fundamental Completo', instituicao: 'Escola Exemplo', periodo: '2015' }],
      habilidades: ['Limpeza e conservação', 'Organização', 'Uso de produtos de limpeza', 'Pontualidade', 'Confiança', 'Disponibilidade de horário'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [],
    },
  },
  {
    id: 'beleza', nome: 'Beleza e estética', icone: '💇', recomendados: ['criativo', 'moderno', 'lateral'],
    dica: 'Liste os serviços que faz, coloque o Instagram do trabalho e, se tiver, portfólio de fotos. Experiência conta muito.',
    exemplo: {
      cargo: 'Cabeleireiro(a) / Manicure',
      resumo: 'Profissional de beleza atencioso(a) e detalhista, com experiência em atendimento e fidelização de clientes. Ofereço serviços com qualidade, higiene e um atendimento acolhedor.',
      experiencias: [
        exp('Cabeleireiro(a)', 'Salão Exemplo', '2021 – atual', 'São Paulo, SP', 'Corte, escova, coloração e tratamentos capilares.\nAtendimento e fidelização, com agenda cheia e boa avaliação dos clientes.\nControle de agenda e higienização dos materiais.'),
        exp('Manicure e Pedicure', 'Autônoma', '2019 – 2021', 'São Paulo, SP', 'Serviços de manicure e pedicure com capricho e higiene.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Corte e escova', 'Coloração', 'Manicure e pedicure', 'Atendimento ao cliente', 'Higienização', 'Organização de agenda'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Colorimetria Capilar', instituicao: 'Curso profissionalizante', ano: '2022' }],
    },
  },
  {
    id: 'industria', nome: 'Indústria e manutenção', icone: '🏭', recomendados: ['classico', 'compacto', 'tradicional'],
    dica: 'Destaque linha/máquinas que operou, cursos de NR, metas de produção e atenção à segurança e à qualidade.',
    exemplo: {
      cargo: 'Operador(a) de Produção',
      resumo: 'Profissional de produção atento(a) à segurança e à qualidade, acostumado(a) ao ritmo da linha e ao trabalho em turnos. Cumpro metas e sigo os procedimentos padrão.',
      experiencias: [
        exp('Operador(a) de Produção', 'Indústria Exemplo', '2021 – atual', 'São Paulo, SP', 'Operação de máquinas da linha de produção seguindo os procedimentos.\nControle de qualidade e registro de produção.\nUso de EPI e atenção às normas de segurança (NRs).'),
        exp('Auxiliar de Produção', 'Indústria Exemplo', '2019 – 2021', 'São Paulo, SP', 'Abastecimento de linha, embalagem e organização do setor.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Operação de máquinas', 'Controle de qualidade', 'Trabalho em turnos', 'Uso de EPI', 'Normas de segurança (NR-12)', 'Trabalho em equipe', 'Metas de produção'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'NR-12 (Segurança em Máquinas)', instituicao: 'Treinamento', ano: '2022' }],
    },
  },
  {
    id: 'seguranca', nome: 'Segurança e portaria', icone: '🛡️', recomendados: ['classico', 'tradicional', 'compacto'],
    dica: 'Informe curso de vigilante e reciclagem (se tiver), experiência com controle de acesso e postura/discrição.',
    exemplo: {
      cargo: 'Porteiro / Vigilante',
      resumo: 'Profissional atento(a), responsável e discreto(a), com experiência em controle de acesso e segurança. Atendo bem os moradores/clientes e mantenho a ordem e os registros em dia.',
      experiencias: [
        exp('Porteiro(a)', 'Condomínio Exemplo', '2021 – atual', 'São Paulo, SP', 'Controle de acesso de moradores, visitantes e prestadores.\nMonitoramento por câmeras e registro de ocorrências.\nAtendimento cordial e recebimento de encomendas.'),
        exp('Vigilante', 'Empresa Exemplo', '2019 – 2021', 'São Paulo, SP', 'Ronda, controle de entrada e apoio à segurança do local.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2018' }],
      habilidades: ['Controle de acesso', 'Monitoramento por câmeras', 'Registro de ocorrências', 'Atenção e discrição', 'Atendimento ao público', 'Pontualidade'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Formação de Vigilante', instituicao: 'Curso credenciado', ano: '2021' }],
    },
  },
  {
    id: 'atendimento', nome: 'Atendimento e telemarketing', icone: '🎧', recomendados: ['moderno', 'classico', 'minimalista'],
    dica: 'Mostre boa comunicação, experiência com metas/indicadores e sistemas de atendimento. Clareza na fala conta muito.',
    exemplo: {
      cargo: 'Atendente / Operador(a) de Telemarketing',
      resumo: 'Profissional de atendimento comunicativo(a) e paciente, com boa dicção e foco na satisfação do cliente. Experiência em suporte, vendas por telefone e cumprimento de metas.',
      experiencias: [
        exp('Operador(a) de Telemarketing', 'Call Center Exemplo', '2022 – atual', 'São Paulo, SP', 'Atendimento receptivo e ativo com foco na resolução no primeiro contato.\nRegistro de atendimentos no sistema e cumprimento de metas.\nBoa avaliação de satisfação dos clientes.'),
        exp('Atendente', 'Empresa Exemplo', '2020 – 2022', 'São Paulo, SP', 'Atendimento ao público, dúvidas e encaminhamento de solicitações.'),
      ],
      formacao: [{ curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2019' }],
      habilidades: ['Boa comunicação e dicção', 'Atendimento ao cliente', 'Trabalho com metas', 'Sistemas de atendimento (CRM)', 'Paciência', 'Digitação'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }],
      cursos: [{ nome: 'Atendimento ao Cliente', instituicao: 'Curso online', ano: '2022' }],
    },
  },
  {
    id: 'tecnologia', nome: 'Tecnologia / TI', icone: '💻', recomendados: ['moderno', 'minimalista', 'lateral'],
    dica: 'Mostre projetos (com link no GitHub), tecnologias que domina e cursos. Para júnior, projetos valem mais que experiência.',
    exemplo: {
      cargo: 'Desenvolvedor(a) Front-End Júnior',
      resumo: 'Pessoa em início de carreira em desenvolvimento web, com base em HTML, CSS, JavaScript e React construída em cursos e projetos próprios. Organizada, comunicativa e ávida por aprender.',
      experiencias: [
        exp('Projeto pessoal — Site de portfólio', 'Projeto próprio', '2025', 'Remoto', 'Criei e publiquei um site responsivo com HTML, CSS e JavaScript.\nVersionamento com Git e GitHub e deploy gratuito na Vercel.'),
        exp('Atendente', 'Loja Exemplo', '2023 – 2024', 'São Paulo, SP', 'Atendimento e organização do estoque, com responsabilidade e trabalho em equipe.'),
      ],
      formacao: [{ curso: 'Análise e Desenvolvimento de Sistemas (cursando)', instituicao: 'Faculdade Exemplo', periodo: '2024 – 2026' }, { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2022' }],
      habilidades: ['HTML', 'CSS', 'JavaScript', 'React', 'Git e GitHub', 'Lógica de programação', 'Trabalho em equipe'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }, { idioma: 'Inglês', nivel: 'Intermediário (leitura técnica)' }],
      cursos: [{ nome: 'Desenvolvimento Web Completo', instituicao: 'Curso online', ano: '2025' }],
    },
  },
  {
    id: 'design', nome: 'Design e criação', icone: '🎨', recomendados: ['criativo', 'lateral', 'moderno'],
    dica: 'O portfólio é o mais importante: coloque o link bem visível. Liste ferramentas (Photoshop, Figma) e tipos de trabalho.',
    exemplo: {
      cargo: 'Designer Gráfico Júnior',
      resumo: 'Designer em início de carreira com olhar para composição, tipografia e identidade visual. Crio peças para redes sociais e materiais gráficos, sempre atento(a) ao briefing e ao prazo.',
      experiencias: [
        exp('Designer Freelancer', 'Trabalhos autônomos', '2023 – atual', 'Remoto', 'Criação de posts, logos e materiais para pequenos negócios.\nAtendimento ao briefing do cliente e entrega dentro do prazo.'),
      ],
      formacao: [{ curso: 'Design Gráfico (cursando)', instituicao: 'Faculdade Exemplo', periodo: '2024 – 2026' }, { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2022' }],
      habilidades: ['Photoshop', 'Illustrator', 'Figma', 'Identidade visual', 'Social media', 'Criatividade', 'Atenção ao briefing'],
      idiomas: [{ idioma: 'Português', nivel: 'Nativo' }, { idioma: 'Inglês', nivel: 'Básico' }],
      cursos: [{ nome: 'Design para Redes Sociais', instituicao: 'Curso online', ano: '2023' }],
    },
  },
]

export const getArea = (id) => AREAS.find((a) => a.id === id) || AREAS[0]
export const montarExemplo = (id) => ({ ...IDENT, ...getArea(id).exemplo })
