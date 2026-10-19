// Tabelas dos sistemas de gestão. Cada tabela vira uma aba na planilha e os campos viram colunas.
// Todos os nichos usam as mesmas tabelas: clientes, produtos e vendas são compartilhados, e cada nicho
// liga as tabelas extras de que precisa (agenda, ordens de serviço, pets, matrículas...).
//
// Tipos: texto, longo, numero, dinheiro, pct, data, datahora, hora, opcao, ref, sim, email, tel, url, cor, json.
// "nichos" limita o campo a alguns sistemas; sem ele, o campo aparece em todos.

const ativo = { id: 'ativo', rotulo: 'Ativo', tipo: 'sim', padrao: true }
const obs = { id: 'obs', rotulo: 'Observações', tipo: 'longo' }

export const ETAPAS_PEDIDO = [
  ['novo', 'Novo'],
  ['preparo', 'Em preparo'],
  ['pronto', 'Pronto'],
  ['saiu', 'Saiu p/ entrega'],
  ['entregue', 'Entregue'],
]

export const STATUS_OS = [
  ['aberta', 'Aberta'],
  ['orcamento', 'Orçamento enviado'],
  ['aprovada', 'Aprovada'],
  ['execucao', 'Em execução'],
  ['pronta', 'Pronta'],
  ['entregue', 'Entregue'],
  ['cancelada', 'Cancelada'],
]

// "pendente" é o pedido feito pelo agendamento online esperando o profissional aceitar.
// "bloqueio" não é atendimento: é um horário fechado (almoço, folga, férias).
export const STATUS_AGENDA = [
  ['pendente', 'Aguardando aprovação'],
  ['agendado', 'Agendado'],
  ['confirmado', 'Confirmado'],
  ['atendimento', 'Em atendimento'],
  ['concluido', 'Concluído'],
  ['faltou', 'Faltou'],
  ['cancelado', 'Cancelado'],
  ['recusado', 'Recusado'],
  ['bloqueio', 'Horário bloqueado'],
]

export const ETAPAS_FUNIL = [
  ['novo', 'Novo contato'],
  ['qualificado', 'Qualificado'],
  ['proposta', 'Proposta enviada'],
  ['negociacao', 'Negociação'],
  ['ganho', 'Ganho'],
  ['perdido', 'Perdido'],
]

export const FORMAS_PAGAMENTO = [
  ['dinheiro', 'Dinheiro'],
  ['pix', 'Pix'],
  ['debito', 'Cartão de débito'],
  ['credito', 'Cartão de crédito'],
  ['fiado', 'Fiado / a prazo'],
]

export const tabelas = {
  clientes: {
    rotulo: 'Clientes',
    singular: 'cliente',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel' },
      { id: 'email', rotulo: 'E-mail', tipo: 'email' },
      { id: 'documento', rotulo: 'CPF / CNPJ', tipo: 'texto' },
      { id: 'nascimento', rotulo: 'Nascimento', tipo: 'data' },
      { id: 'endereco', rotulo: 'Endereço', tipo: 'texto' },
      { id: 'bairro', rotulo: 'Bairro', tipo: 'texto' },
      {
        id: 'objetivo',
        rotulo: 'Objetivo',
        tipo: 'opcao',
        opcoes: [['emagrecer', 'Emagrecer'], ['hipertrofia', 'Hipertrofia'], ['saude', 'Saúde'], ['performance', 'Performance']],
        nichos: ['academia-studio'],
      },
      { id: 'restricoes', rotulo: 'Restrições / lesões', tipo: 'texto', nichos: ['academia-studio'] },
      { id: 'limite_fiado', rotulo: 'Limite de fiado', tipo: 'dinheiro', nichos: ['mercadinho-pdv'] },
      { id: 'empresa', rotulo: 'Empresa', tipo: 'texto', nichos: ['crm-vendas'] },
      obs,
    ],
    colunas: ['nome', 'telefone', 'bairro'],
  },

  categorias: {
    rotulo: 'Categorias',
    singular: 'categoria',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'ordem', rotulo: 'Ordem no cardápio', tipo: 'numero' },
    ],
    colunas: ['nome', 'ordem'],
  },

  produtos: {
    rotulo: 'Produtos e serviços',
    singular: 'produto',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'tipo', rotulo: 'Tipo', tipo: 'opcao', opcoes: [['produto', 'Produto'], ['servico', 'Serviço']], padrao: 'produto' },
      { id: 'categoria_id', rotulo: 'Categoria', tipo: 'ref', ref: 'categorias' },
      { id: 'preco', rotulo: 'Preço de venda', tipo: 'dinheiro', obrigatorio: true },
      { id: 'custo', rotulo: 'Custo', tipo: 'dinheiro' },
      { id: 'codigo_barras', rotulo: 'Código de barras / SKU', tipo: 'texto' },
      { id: 'ncm', rotulo: 'NCM (nota fiscal)', tipo: 'texto', ajuda: '8 dígitos. Quem informa é o contador. Serviços não usam.' },
      { id: 'cfop', rotulo: 'CFOP', tipo: 'texto', ajuda: 'Venda ao consumidor dentro do estado: 5102.' },
      { id: 'unidade', rotulo: 'Unidade', tipo: 'opcao', opcoes: [['un', 'Unidade'], ['kg', 'Quilo'], ['l', 'Litro'], ['cx', 'Caixa']], padrao: 'un' },
      { id: 'controla_estoque', rotulo: 'Controlar estoque', tipo: 'sim' },
      { id: 'estoque_minimo', rotulo: 'Estoque mínimo', tipo: 'numero' },
      { id: 'duracao_min', rotulo: 'Duração (min)', tipo: 'numero', ajuda: 'Para serviços com horário marcado.' },
      { id: 'comissao_pct', rotulo: 'Comissão do profissional (%)', tipo: 'pct', nichos: ['barbearia-salao', 'petshop'] },
      { id: 'descricao', rotulo: 'Descrição', tipo: 'longo' },
      { id: 'foto_url', rotulo: 'Foto (link da imagem)', tipo: 'url' },
      { id: 'visual', rotulo: 'Reconhecimento pela câmera', tipo: 'json', oculto: true },
      { id: 'adicionais', rotulo: 'Adicionais', tipo: 'texto', ajuda: 'Ex.: Bacon:4; Ovo:2,5; Cheddar:3', nichos: ['restaurante-delivery'] },
      { id: 'publicado', rotulo: 'Mostrar no site (cardápio / agendamento)', tipo: 'sim', padrao: true },
      ativo,
    ],
    colunas: ['nome', 'categoria_id', 'preco', 'tipo'],
  },

  estoque_mov: {
    rotulo: 'Movimentos de estoque',
    singular: 'movimento',
    titulo: 'motivo',
    campos: [
      { id: 'produto_id', rotulo: 'Produto', tipo: 'ref', ref: 'produtos', obrigatorio: true },
      { id: 'qtd', rotulo: 'Quantidade (+ entrada, − saída)', tipo: 'numero', obrigatorio: true },
      {
        id: 'motivo',
        rotulo: 'Motivo',
        tipo: 'opcao',
        opcoes: [['compra', 'Compra / entrada'], ['venda', 'Venda'], ['ajuste', 'Ajuste de inventário'], ['perda', 'Perda / vencido'], ['os', 'Usado em OS']],
      },
      { id: 'custo_unit', rotulo: 'Custo unitário', tipo: 'dinheiro' },
      { id: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'ref', ref: 'fornecedores' },
      { id: 'ref_id', rotulo: 'Venda / OS', tipo: 'texto', oculto: true },
      obs,
    ],
    colunas: ['produto_id', 'qtd', 'motivo', 'criado_em'],
  },

  fornecedores: {
    rotulo: 'Fornecedores',
    singular: 'fornecedor',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'cnpj', rotulo: 'CNPJ', tipo: 'texto' },
      { id: 'contato', rotulo: 'Contato', tipo: 'texto' },
      { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
      { id: 'email', rotulo: 'E-mail', tipo: 'email' },
      obs,
    ],
    colunas: ['nome', 'contato', 'telefone'],
  },

  vendas: {
    rotulo: 'Vendas e pedidos',
    singular: 'venda',
    titulo: 'numero',
    campos: [
      { id: 'numero', rotulo: 'Número', tipo: 'numero', servidor: true },
      { id: 'codigo_publico', rotulo: 'Código de acompanhamento', tipo: 'texto', servidor: true },
      { id: 'cliente_id', rotulo: 'Cliente', tipo: 'ref', ref: 'clientes' },
      { id: 'cliente_nome', rotulo: 'Nome do cliente', tipo: 'texto' },
      { id: 'itens', rotulo: 'Itens', tipo: 'json' },
      { id: 'subtotal', rotulo: 'Subtotal', tipo: 'dinheiro' },
      { id: 'desconto', rotulo: 'Desconto', tipo: 'dinheiro' },
      { id: 'taxa_entrega', rotulo: 'Taxa de entrega', tipo: 'dinheiro' },
      { id: 'acrescimo', rotulo: 'Taxa de serviço / acréscimo', tipo: 'dinheiro' },
      { id: 'total', rotulo: 'Total', tipo: 'dinheiro' },
      { id: 'pagamentos', rotulo: 'Pagamentos', tipo: 'json' },
      { id: 'fiscal', rotulo: 'Nota fiscal', tipo: 'json' },
      { id: 'troco', rotulo: 'Troco', tipo: 'dinheiro' },
      {
        id: 'status',
        rotulo: 'Situação',
        tipo: 'opcao',
        opcoes: [['aberta', 'Aberta'], ['concluida', 'Concluída'], ['orcamento', 'Orçamento'], ['cancelada', 'Cancelada']],
      },
      { id: 'etapa', rotulo: 'Etapa do pedido', tipo: 'opcao', opcoes: ETAPAS_PEDIDO },
      {
        id: 'origem',
        rotulo: 'Origem',
        tipo: 'opcao',
        opcoes: [['pdv', 'Balcão / PDV'], ['cardapio', 'Cardápio online'], ['mesa', 'Mesa'], ['os', 'Ordem de serviço'], ['agenda', 'Agenda'], ['proposta', 'Proposta']],
      },
      { id: 'entrega', rotulo: 'Entrega', tipo: 'opcao', opcoes: [['retirada', 'Retirada'], ['entrega', 'Entrega'], ['local', 'Consumo no local']] },
      { id: 'endereco', rotulo: 'Endereço de entrega', tipo: 'texto' },
      { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
      { id: 'pagamento_previsto', rotulo: 'Pagamento combinado', tipo: 'texto' },
      { id: 'mesa', rotulo: 'Mesa', tipo: 'numero' },
      { id: 'caixa_id', rotulo: 'Caixa', tipo: 'ref', ref: 'caixas' },
      { id: 'profissional_id', rotulo: 'Profissional', tipo: 'ref', ref: 'profissionais' },
      { id: 'ref_id', rotulo: 'OS / agendamento', tipo: 'texto', oculto: true },
      { id: 'concluida_em', rotulo: 'Concluída em', tipo: 'datahora' },
      { id: 'operador', rotulo: 'Operador', tipo: 'texto' },
      obs,
    ],
    colunas: ['numero', 'cliente_nome', 'total', 'status', 'criado_em'],
  },

  caixas: {
    rotulo: 'Caixas',
    singular: 'caixa',
    titulo: 'aberto_em',
    campos: [
      { id: 'aberto_em', rotulo: 'Aberto em', tipo: 'datahora' },
      { id: 'fechado_em', rotulo: 'Fechado em', tipo: 'datahora' },
      { id: 'valor_inicial', rotulo: 'Troco inicial', tipo: 'dinheiro' },
      { id: 'valor_contado', rotulo: 'Dinheiro contado no fechamento', tipo: 'dinheiro' },
      { id: 'valor_esperado', rotulo: 'Dinheiro esperado', tipo: 'dinheiro' },
      { id: 'resumo', rotulo: 'Resumo por forma', tipo: 'json' },
      { id: 'status', rotulo: 'Situação', tipo: 'opcao', opcoes: [['aberto', 'Aberto'], ['fechado', 'Fechado']] },
      { id: 'operador', rotulo: 'Operador', tipo: 'texto' },
    ],
    colunas: ['aberto_em', 'status', 'valor_inicial'],
  },

  caixa_mov: {
    rotulo: 'Sangrias e suprimentos',
    singular: 'movimento de caixa',
    titulo: 'motivo',
    campos: [
      { id: 'caixa_id', rotulo: 'Caixa', tipo: 'ref', ref: 'caixas' },
      { id: 'tipo', rotulo: 'Tipo', tipo: 'opcao', opcoes: [['sangria', 'Sangria (retirada)'], ['suprimento', 'Suprimento (entrada)']] },
      { id: 'valor', rotulo: 'Valor', tipo: 'dinheiro' },
      { id: 'motivo', rotulo: 'Motivo', tipo: 'texto' },
    ],
    colunas: ['tipo', 'valor', 'motivo'],
  },

  lancamentos: {
    rotulo: 'Contas a pagar e receber',
    singular: 'lançamento',
    titulo: 'descricao',
    campos: [
      { id: 'tipo', rotulo: 'Tipo', tipo: 'opcao', opcoes: [['receita', 'A receber'], ['despesa', 'A pagar']], padrao: 'despesa', obrigatorio: true },
      { id: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
      { id: 'valor', rotulo: 'Valor', tipo: 'dinheiro', obrigatorio: true },
      { id: 'vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true },
      { id: 'pago_em', rotulo: 'Pago em', tipo: 'data' },
      {
        id: 'categoria',
        rotulo: 'Categoria',
        tipo: 'opcao',
        opcoes: [
          ['aluguel', 'Aluguel'],
          ['fornecedor', 'Fornecedor'],
          ['salarios', 'Salários e comissões'],
          ['contas', 'Água, luz, internet'],
          ['impostos', 'Impostos'],
          ['marketing', 'Marketing'],
          ['mensalidade', 'Mensalidade'],
          ['fiado', 'Fiado'],
          ['servico', 'Serviço'],
          ['outros', 'Outros'],
        ],
      },
      { id: 'cliente_id', rotulo: 'Cliente', tipo: 'ref', ref: 'clientes' },
      { id: 'fornecedor_id', rotulo: 'Fornecedor', tipo: 'ref', ref: 'fornecedores' },
      { id: 'forma', rotulo: 'Forma de pagamento', tipo: 'opcao', opcoes: FORMAS_PAGAMENTO },
      { id: 'ref_id', rotulo: 'Venda / matrícula', tipo: 'texto', oculto: true },
      obs,
    ],
    colunas: ['descricao', 'valor', 'vencimento', 'pago_em'],
  },

  profissionais: {
    rotulo: 'Profissionais',
    singular: 'profissional',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
      { id: 'funcao', rotulo: 'Função', tipo: 'texto' },
      { id: 'comissao_pct', rotulo: 'Comissão padrão (%)', tipo: 'pct' },
      { id: 'cor', rotulo: 'Cor na agenda', tipo: 'cor', padrao: '#67e8f9' },
      { id: 'publicado', rotulo: 'Aparece no agendamento online', tipo: 'sim', padrao: true },
      ativo,
    ],
    colunas: ['nome', 'funcao', 'comissao_pct'],
  },

  agendamentos: {
    rotulo: 'Agendamentos',
    singular: 'agendamento',
    titulo: 'cliente_nome',
    campos: [
      { id: 'codigo_publico', rotulo: 'Código de acompanhamento', tipo: 'texto', servidor: true },
      { id: 'inicio', rotulo: 'Início', tipo: 'datahora', obrigatorio: true },
      { id: 'fim', rotulo: 'Fim', tipo: 'datahora' },
      { id: 'profissional_id', rotulo: 'Profissional', tipo: 'ref', ref: 'profissionais' },
      { id: 'servico_id', rotulo: 'Serviço', tipo: 'ref', ref: 'produtos' },
      { id: 'cliente_id', rotulo: 'Cliente', tipo: 'ref', ref: 'clientes' },
      { id: 'cliente_nome', rotulo: 'Nome do cliente', tipo: 'texto' },
      { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
      { id: 'pet_id', rotulo: 'Pet', tipo: 'ref', ref: 'pets', nichos: ['petshop'] },
      { id: 'valor', rotulo: 'Valor', tipo: 'dinheiro' },
      { id: 'status', rotulo: 'Situação', tipo: 'opcao', opcoes: STATUS_AGENDA, padrao: 'agendado' },
      { id: 'origem', rotulo: 'Origem', tipo: 'opcao', opcoes: [['balcao', 'Balcão / telefone'], ['online', 'Agendamento online']] },
      { id: 'venda_id', rotulo: 'Venda', tipo: 'texto', oculto: true },
      obs,
    ],
    colunas: ['inicio', 'cliente_nome', 'servico_id', 'status'],
  },

  ordens: {
    rotulo: 'Ordens de serviço',
    singular: 'ordem de serviço',
    titulo: 'numero',
    campos: [
      { id: 'numero', rotulo: 'Número', tipo: 'numero', servidor: true },
      { id: 'codigo_publico', rotulo: 'Código de acompanhamento', tipo: 'texto', servidor: true },
      { id: 'cliente_id', rotulo: 'Cliente', tipo: 'ref', ref: 'clientes', obrigatorio: true },
      { id: 'equipamento', rotulo: 'Equipamento / veículo', tipo: 'texto', obrigatorio: true },
      { id: 'marca_modelo', rotulo: 'Marca e modelo', tipo: 'texto' },
      { id: 'serie', rotulo: 'Nº de série / IMEI / placa', tipo: 'texto' },
      { id: 'acessorios', rotulo: 'Acessórios deixados', tipo: 'texto' },
      { id: 'defeito', rotulo: 'Defeito relatado', tipo: 'longo', obrigatorio: true },
      { id: 'laudo', rotulo: 'Laudo técnico', tipo: 'longo' },
      { id: 'checklist', rotulo: 'Checklist de entrada', tipo: 'json' },
      { id: 'itens', rotulo: 'Peças e serviços', tipo: 'json' },
      { id: 'total', rotulo: 'Total', tipo: 'dinheiro' },
      { id: 'status', rotulo: 'Situação', tipo: 'opcao', opcoes: STATUS_OS, padrao: 'aberta' },
      { id: 'previsao', rotulo: 'Previsão de entrega', tipo: 'data' },
      { id: 'tecnico', rotulo: 'Técnico', tipo: 'texto' },
      { id: 'garantia_dias', rotulo: 'Garantia (dias)', tipo: 'numero', padrao: 90 },
      { id: 'venda_id', rotulo: 'Venda', tipo: 'texto', oculto: true },
    ],
    colunas: ['numero', 'cliente_id', 'equipamento', 'status'],
  },

  planos: {
    rotulo: 'Planos',
    singular: 'plano',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'valor', rotulo: 'Valor mensal', tipo: 'dinheiro', obrigatorio: true },
      { id: 'meses', rotulo: 'Fidelidade (meses)', tipo: 'numero', padrao: 1 },
      { id: 'aulas_semana', rotulo: 'Aulas por semana (0 = livre)', tipo: 'numero' },
      { id: 'descricao', rotulo: 'Descrição', tipo: 'longo' },
      ativo,
    ],
    colunas: ['nome', 'valor', 'meses'],
  },

  matriculas: {
    rotulo: 'Matrículas',
    singular: 'matrícula',
    titulo: 'cliente_id',
    campos: [
      { id: 'cliente_id', rotulo: 'Aluno', tipo: 'ref', ref: 'clientes', obrigatorio: true },
      { id: 'plano_id', rotulo: 'Plano', tipo: 'ref', ref: 'planos', obrigatorio: true },
      { id: 'inicio', rotulo: 'Início', tipo: 'data', obrigatorio: true },
      { id: 'dia_vencimento', rotulo: 'Dia do vencimento', tipo: 'numero', padrao: 10 },
      { id: 'desconto', rotulo: 'Desconto mensal', tipo: 'dinheiro' },
      {
        id: 'status',
        rotulo: 'Situação',
        tipo: 'opcao',
        opcoes: [['ativa', 'Ativa'], ['trancada', 'Trancada'], ['cancelada', 'Cancelada']],
        padrao: 'ativa',
      },
      obs,
    ],
    colunas: ['cliente_id', 'plano_id', 'dia_vencimento', 'status'],
  },

  presencas: {
    rotulo: 'Check-ins',
    singular: 'check-in',
    titulo: 'cliente_id',
    campos: [{ id: 'cliente_id', rotulo: 'Aluno', tipo: 'ref', ref: 'clientes', obrigatorio: true }],
    colunas: ['cliente_id', 'criado_em'],
  },

  pets: {
    rotulo: 'Pets',
    singular: 'pet',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { id: 'cliente_id', rotulo: 'Tutor', tipo: 'ref', ref: 'clientes', obrigatorio: true },
      { id: 'especie', rotulo: 'Espécie', tipo: 'opcao', opcoes: [['cao', 'Cão'], ['gato', 'Gato'], ['outro', 'Outro']], padrao: 'cao' },
      { id: 'raca', rotulo: 'Raça', tipo: 'texto' },
      { id: 'porte', rotulo: 'Porte', tipo: 'opcao', opcoes: [['p', 'Pequeno'], ['m', 'Médio'], ['g', 'Grande']] },
      { id: 'nascimento', rotulo: 'Nascimento', tipo: 'data' },
      { id: 'peso', rotulo: 'Peso (kg)', tipo: 'numero' },
      { id: 'alergias', rotulo: 'Alergias / cuidados', tipo: 'texto' },
      obs,
    ],
    colunas: ['nome', 'cliente_id', 'raca', 'porte'],
  },

  vacinas: {
    rotulo: 'Vacinas e vermífugos',
    singular: 'vacina',
    titulo: 'vacina',
    campos: [
      { id: 'pet_id', rotulo: 'Pet', tipo: 'ref', ref: 'pets', obrigatorio: true },
      { id: 'vacina', rotulo: 'Vacina / vermífugo', tipo: 'texto', obrigatorio: true },
      { id: 'aplicada_em', rotulo: 'Aplicada em', tipo: 'data' },
      { id: 'proxima_em', rotulo: 'Próxima dose', tipo: 'data' },
      obs,
    ],
    colunas: ['pet_id', 'vacina', 'aplicada_em', 'proxima_em'],
  },

  leads: {
    rotulo: 'Oportunidades',
    singular: 'oportunidade',
    titulo: 'nome',
    campos: [
      { id: 'nome', rotulo: 'Nome do contato', tipo: 'texto', obrigatorio: true },
      { id: 'empresa', rotulo: 'Empresa', tipo: 'texto' },
      { id: 'telefone', rotulo: 'Telefone / WhatsApp', tipo: 'tel' },
      { id: 'email', rotulo: 'E-mail', tipo: 'email' },
      { id: 'interesse', rotulo: 'Interesse', tipo: 'texto' },
      { id: 'valor', rotulo: 'Valor estimado', tipo: 'dinheiro' },
      { id: 'etapa', rotulo: 'Etapa', tipo: 'opcao', opcoes: ETAPAS_FUNIL, padrao: 'novo' },
      {
        id: 'origem',
        rotulo: 'Origem',
        tipo: 'opcao',
        opcoes: [['instagram', 'Instagram'], ['google', 'Google'], ['indicacao', 'Indicação'], ['whatsapp', 'WhatsApp'], ['site', 'Site'], ['outro', 'Outro']],
      },
      { id: 'responsavel', rotulo: 'Responsável', tipo: 'texto' },
      { id: 'proximo_contato', rotulo: 'Próximo contato', tipo: 'data' },
      { id: 'motivo_perda', rotulo: 'Motivo da perda', tipo: 'texto' },
      { id: 'cliente_id', rotulo: 'Cliente (quando ganho)', tipo: 'ref', ref: 'clientes', oculto: true },
      obs,
    ],
    colunas: ['nome', 'empresa', 'valor', 'etapa'],
  },

  atividades: {
    rotulo: 'Atividades',
    singular: 'atividade',
    titulo: 'descricao',
    campos: [
      { id: 'lead_id', rotulo: 'Oportunidade', tipo: 'ref', ref: 'leads' },
      { id: 'tipo', rotulo: 'Tipo', tipo: 'opcao', opcoes: [['ligacao', 'Ligação'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'], ['reuniao', 'Reunião'], ['tarefa', 'Tarefa']] },
      { id: 'descricao', rotulo: 'Descrição', tipo: 'texto', obrigatorio: true },
      { id: 'data', rotulo: 'Data', tipo: 'data' },
      { id: 'feita', rotulo: 'Feita', tipo: 'sim' },
    ],
    colunas: ['descricao', 'lead_id', 'data', 'feita'],
  },

  usuarios: {
    rotulo: 'Usuários',
    singular: 'usuário',
    titulo: 'email',
    campos: [
      { id: 'email', rotulo: 'E-mail (login)', tipo: 'email', obrigatorio: true },
      { id: 'nome', rotulo: 'Nome', tipo: 'texto' },
      {
        id: 'papel',
        rotulo: 'Papel',
        tipo: 'opcao',
        opcoes: [['dono', 'Dono (tudo)'], ['gerente', 'Gerente'], ['operador', 'Operador de caixa / atendente']],
        padrao: 'operador',
      },
      ativo,
    ],
    colunas: ['email', 'nome', 'papel'],
  },

  // Uma linha por configuração: id = nome da chave.
  config: {
    rotulo: 'Configurações',
    singular: 'configuração',
    titulo: 'id',
    campos: [{ id: 'valor', rotulo: 'Valor', tipo: 'texto' }],
    colunas: ['id', 'valor'],
  },
}

export const campoBase = {
  id: { id: 'id', rotulo: 'ID', tipo: 'texto' },
  criado_em: { id: 'criado_em', rotulo: 'Criado em', tipo: 'datahora' },
  atualizado_em: { id: 'atualizado_em', rotulo: 'Atualizado em', tipo: 'numero' },
}

export function campo(tabela, id) {
  return tabelas[tabela]?.campos.find((c) => c.id === id) ?? campoBase[id]
}

/** Campos visíveis da tabela no nicho atual. */
export function camposDe(tabela, nicho) {
  return tabelas[tabela].campos.filter((c) => !c.oculto && !c.servidor && (!c.nichos || c.nichos.includes(nicho)))
}

/** Converte o texto da planilha de volta para o tipo do campo. */
export function lerValor(tabela, id, valor) {
  if (valor === '' || valor === null || valor === undefined) return id === 'excluido' ? false : ''
  const tipo = id === 'atualizado_em' || id === '_rev' ? 'numero' : id === 'excluido' ? 'sim' : campo(tabela, id)?.tipo
  if (typeof valor !== 'string') return valor
  switch (tipo) {
    case 'numero':
    case 'dinheiro':
    case 'pct': {
      const n = Number(valor.replace(',', '.'))
      return Number.isFinite(n) ? n : 0
    }
    case 'sim':
      return valor === '1' || valor.toLowerCase() === 'true' || valor.toLowerCase() === 'sim'
    case 'json':
      try {
        return JSON.parse(valor)
      } catch {
        return null
      }
    default:
      return valor
  }
}

/** Configurações da loja (aba config). "publica" = o cardápio e o agendamento online podem ler. */
export const CONFIGS = [
  { id: 'empresa_nome', rotulo: 'Nome do negócio', tipo: 'texto', publica: true },
  { id: 'empresa_telefone', rotulo: 'Telefone', tipo: 'tel', publica: true },
  { id: 'whatsapp', rotulo: 'WhatsApp para pedidos (com DDD)', tipo: 'tel', publica: true },
  { id: 'endereco', rotulo: 'Endereço', tipo: 'texto', publica: true },
  { id: 'cidade', rotulo: 'Cidade', tipo: 'texto', publica: true },
  { id: 'documento', rotulo: 'CNPJ / CPF', tipo: 'texto' },
  { id: 'pix_chave', rotulo: 'Chave Pix', tipo: 'texto', publica: true },
  { id: 'pix_nome', rotulo: 'Nome do recebedor do Pix', tipo: 'texto', publica: true },
  { id: 'emails_notificacao', rotulo: 'E-mails que recebem cada venda (separe por vírgula)', tipo: 'texto' },
  { id: 'email_cliente', rotulo: 'Mandar comprovante por e-mail ao cliente', tipo: 'sim' },
  { id: 'abre', rotulo: 'Abre às', tipo: 'hora', publica: true, padrao: '09:00' },
  { id: 'fecha', rotulo: 'Fecha às', tipo: 'hora', publica: true, padrao: '19:00' },
  { id: 'dias', rotulo: 'Dias de funcionamento', tipo: 'texto', publica: true, padrao: '1,2,3,4,5,6', ajuda: '0 = domingo … 6 = sábado' },
  { id: 'intervalo_agenda', rotulo: 'Intervalo da agenda (min)', tipo: 'numero', publica: true, padrao: 30 },
  { id: 'loja_aberta', rotulo: 'Cardápio online recebendo pedidos', tipo: 'sim', publica: true, padrao: true },
  { id: 'taxa_entrega', rotulo: 'Taxa de entrega', tipo: 'dinheiro', publica: true },
  { id: 'pedido_minimo', rotulo: 'Pedido mínimo', tipo: 'dinheiro', publica: true },
  { id: 'tempo_entrega', rotulo: 'Tempo de entrega (texto)', tipo: 'texto', publica: true, padrao: '40 a 60 min' },
  { id: 'mesas', rotulo: 'Quantidade de mesas', tipo: 'numero', padrao: 12 },
  { id: 'taxa_servico', rotulo: 'Taxa de serviço nas mesas (%)', tipo: 'pct', padrao: 10 },
  { id: 'multa_atraso', rotulo: 'Multa por atraso na mensalidade (%)', tipo: 'pct', padrao: 2 },
  { id: 'uf', rotulo: 'Estado (UF)', tipo: 'texto', padrao: 'SP' },
  { id: 'ie', rotulo: 'Inscrição estadual', tipo: 'texto' },
  { id: 'im', rotulo: 'Inscrição municipal (serviços)', tipo: 'texto' },
  {
    id: 'regime',
    rotulo: 'Regime tributário',
    tipo: 'opcao',
    opcoes: [['simples', 'Simples Nacional'], ['mei', 'MEI'], ['presumido', 'Lucro Presumido'], ['real', 'Lucro Real']],
    padrao: 'simples',
  },
  { id: 'serie_nfce', rotulo: 'Série da NFC-e', tipo: 'numero', padrao: 1 },
  { id: 'nfce_auto', rotulo: 'Emitir nota (simulação) ao concluir cada venda', tipo: 'sim' },
  {
    id: 'mei_atividade',
    rotulo: 'Atividade do MEI',
    tipo: 'opcao',
    opcoes: [['comercio', 'Comércio ou indústria'], ['servicos', 'Serviços'], ['ambos', 'Comércio e serviços']],
    padrao: 'comercio',
  },
  { id: 'mei_abertura', rotulo: 'Data de abertura do MEI', tipo: 'data', ajuda: 'No ano em que abriu, o limite é proporcional aos meses.' },
  { id: 'modulos', rotulo: 'Módulos ligados', tipo: 'texto', oculto: true },
]
