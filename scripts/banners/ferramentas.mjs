// Banners das ferramentas: a tela real da ferramenta num monitor, com as cores da categoria.
// A Correção de exercícios pela câmera tem banner feito à mão (public/banners/ferramentas) e não está aqui.

const CORES = {
  golpes: ['#ef4444', '#facc15'],
  saude: ['#4ade80', '#22d3ee'],
  emergencia: ['#f97316', '#38bdf8'],
  pdf: ['#f43f5e', '#fb923c'],
  trabalho: ['#22c55e', '#facc15'],
  dia: ['#38bdf8', '#a78bfa'],
  texto: ['#a78bfa', '#22d3ee'],
  geradores: ['#22d3ee', '#facc15'],
  cultura: ['#f43f5e', '#8b5cf6'],
  comer: ['#f97316', '#ef4444'],
};

const TAG = {
  golpes: 'CONTRA GOLPES',
  saude: 'SAÚDE · GRÁTIS',
  emergencia: 'EMERGÊNCIA',
  pdf: 'PDF E IMAGEM · GRÁTIS',
  trabalho: 'TRABALHO E FINANÇAS',
  dia: 'DIA A DIA · GRÁTIS',
  texto: 'TEXTO E SEGURANÇA',
  geradores: 'GERADOR GRÁTIS',
  cultura: 'FILMES, SÉRIES E LIVROS',
  comer: 'ONDE COMER · GRÁTIS',
};

const f = (categoria, slug, titulo, chamada, selos) => ({
  tipo: 'ferramentas',
  slug,
  tag: TAG[categoria],
  titulo,
  chamada,
  cores: CORES[categoria],
  selos,
  tela: `fer-${slug}`,
  recorte: { esquerda: 200, topo: 0, largura: 1200, altura: 750 },
});

export const ferramentas = [
  /* Contra golpes */
  f('golpes', 'verificar-site-confiavel', 'Site Confiável?', ['Descubra se a loja', '*é golpe antes de pagar*'], [['🌐', 'Idade do site'], ['🏢', 'Dono e CNPJ'], ['🚩', 'Sinais de golpe'], ['🔒', 'Grátis e rápido']]),
  f('golpes', 'conferir-boleto', 'Boleto Falso?', ['Confira o boleto', '*antes de pagar*'], [['🏦', 'Banco e valor'], ['📅', 'Vencimento'], ['🔎', 'Código alterado?'], ['🛡️', 'Evite golpes']]),
  f('golpes', 'verificar-arquivo-virus', 'Tem Vírus?', ['Analise o arquivo', '*antes de abrir*'], [['🗜️', 'ZIP e EXE'], ['📄', 'PDF e Office'], ['📱', 'APK'], ['🔒', 'Sem enviar nada']]),
  f('golpes', 'consulta-ddd', 'Consulta DDD', ['De onde é', '*esse número?*'], [['📞', 'Estado e cidades'], ['🚩', 'Números suspeitos'], ['📍', 'Todos os DDDs'], ['⚡', 'Na hora']]),
  f('golpes', 'consulta-cnpj', 'Consulta CNPJ', ['Conheça a empresa', '*antes de fechar negócio*'], [['✅', 'Situação'], ['📅', 'Abertura'], ['🏭', 'Atividade'], ['👥', 'Sócios']]),

  /* Saúde e emergência */
  f('saude', 'calculadora-imc', 'Calculadora IMC', ['Seu IMC e', '*o peso saudável*'], [['⚖️', 'Índice na hora'], ['📏', 'Faixa ideal'], ['🎯', 'Peso saudável'], ['🔒', 'Sem cadastro']]),
  f('emergencia', 'socorro-perto-de-mim', 'Socorro Perto', ['Ajuda rápida', '*perto de você*'], [['🚑', 'Telefones 192/193'], ['🏥', 'Hospitais e UPAs'], ['💊', 'Farmácias'], ['📍', 'Pela localização']]),
  f('emergencia', 'alerta-clima', 'Alerta de Clima', ['O clima de hoje', '*e os riscos*'], [['🔥', 'Calor extremo'], ['⛈️', 'Chuva forte'], ['☀️', 'Índice UV'], ['🌫️', 'Qualidade do ar']]),

  /* PDF e imagem */
  f('pdf', 'pdf-para-word', 'PDF ⇄ Word', ['Converta PDF e Word', '*sem enviar arquivos*'], [['📄', 'PDF para Word'], ['📝', 'Word para PDF'], ['🔒', 'No navegador'], ['⚡', 'Grátis']]),
  f('pdf', 'juntar-pdf', 'Juntar PDF', ['Vários PDFs', '*em um só arquivo*'], [['📚', 'Vários arquivos'], ['↕️', 'Na sua ordem'], ['🔒', 'Sem upload'], ['⚡', 'Na hora']]),
  f('pdf', 'jpg-para-pdf', 'JPG ⇄ PDF', ['Fotos viram PDF', '*e PDF vira imagem*'], [['🖼️', 'JPG para PDF'], ['📄', 'PDF para JPG'], ['📱', 'No celular'], ['🔒', 'Sem upload']]),
  f('pdf', 'comprimir-pdf', 'Comprimir PDF', ['PDF leve para enviar', '*em qualquer lugar*'], [['🗜️', 'Reduz o tamanho'], ['📧', 'Cabe no e-mail'], ['🔒', 'Sem upload'], ['⚡', 'Grátis']]),
  f('pdf', 'remover-fundo', 'Remover Fundo', ['Tire o fundo da foto', '*com inteligência artificial*'], [['🤖', 'IA no navegador'], ['🖼️', 'PNG transparente'], ['🛍️', 'Fotos de produto'], ['🔒', 'Sem upload']]),
  f('pdf', 'dividir-pdf', 'Dividir PDF', ['Separe páginas', '*em vários arquivos*'], [['✂️', 'Extrair páginas'], ['📑', 'Vários arquivos'], ['🔒', 'Sem upload'], ['⚡', 'Grátis']]),
  f('pdf', 'assinar-pdf', 'Assinar PDF', ['Sua assinatura', '*no PDF em segundos*'], [['✍️', 'Desenhe'], ['📍', 'Onde quiser'], ['📄', 'Baixe assinado'], ['🔒', 'Sem upload']]),
  f('pdf', 'heic-para-jpg', 'HEIC para JPG', ['Fotos do iPhone', '*abrem em qualquer lugar*'], [['📱', 'Fotos do iPhone'], ['🖼️', 'Viram JPG'], ['📚', 'Em lote'], ['🔒', 'Sem upload']]),

  /* Trabalho e finanças */
  f('trabalho', 'calculadora-rescisao', 'Rescisão', ['Quanto você recebe', '*ao sair da empresa*'], [['📋', 'Verbas rescisórias'], ['🏦', 'Multa do FGTS'], ['💰', 'Valor líquido'], ['📅', 'Tabelas 2026']]),
  f('trabalho', 'calculadora-salario-liquido', 'Salário Líquido', ['Quanto cai', '*na sua conta*'], [['💵', 'Salário bruto'], ['🧾', 'INSS'], ['🏛️', 'Imposto de Renda'], ['📅', 'Tabelas 2026']]),
  f('trabalho', 'calculadora-ferias-13', 'Férias e 13º', ['Calcule as férias', '*e o décimo terceiro*'], [['🏖️', 'Férias com 1/3'], ['💸', 'Abono'], ['🎁', '13º salário'], ['📅', 'Tabelas 2026']]),
  f('trabalho', 'juros-compostos', 'Juros Compostos', ['Veja o seu dinheiro', '*crescer mês a mês*'], [['📈', 'Evolução'], ['💰', 'Aportes mensais'], ['📊', 'Gráfico'], ['🎯', 'Metas']]),
  f('trabalho', 'calculadora-horas-extras', 'Horas Extras', ['Cada hora extra', '*no valor certo*'], [['⏰', '50% e 100%'], ['🌙', 'Adicional noturno'], ['📅', 'Reflexo no DSR'], ['💰', 'Total a receber']]),
  f('trabalho', 'calculadora-seguro-desemprego', 'Seguro-Desemprego', ['Quanto e quantas', '*parcelas você recebe*'], [['💵', 'Valor da parcela'], ['🔢', 'Nº de parcelas'], ['📅', 'Regras 2026'], ['⚡', 'Na hora']]),
  f('trabalho', 'simulador-financiamento', 'Financiamento', ['Simule as parcelas', '*antes de assinar*'], [['🏠', 'Casa ou carro'], ['📉', 'SAC'], ['📊', 'Price'], ['🧾', 'Tabela completa']]),
  f('trabalho', 'tabela-fipe', 'Tabela FIPE', ['O preço justo', '*do seu veículo*'], [['🚗', 'Carros'], ['🏍️', 'Motos'], ['🚚', 'Caminhões'], ['⚖️', 'Compare o anúncio']]),
  f('trabalho', 'comparador-investimentos', 'Investimentos', ['Onde o dinheiro', '*rende mais hoje*'], [['🐷', 'Poupança'], ['🏦', 'CDB e LCI'], ['🇧🇷', 'Tesouro'], ['📈', 'Taxas de hoje']]),
  f('trabalho', 'conversor-moedas', 'Conversor', ['Dólar e euro', '*com a cotação de hoje*'], [['💵', 'Dólar'], ['💶', 'Euro'], ['💳', 'IOF do cartão'], ['🌎', 'Várias moedas']]),

  /* Dia a dia */
  f('dia', 'calculadora-porcentagem', 'Porcentagem', ['Descontos e aumentos', '*sem errar a conta*'], [['➗', 'X% de Y'], ['🏷️', 'Descontos'], ['📈', 'Aumentos'], ['🔁', 'Variação']]),
  f('dia', 'regra-de-tres', 'Regra de Três', ['A conta resolvida', '*com o passo a passo*'], [['🧮', 'Simples'], ['↗️', 'Direta'], ['↘️', 'Inversa'], ['📝', 'Passo a passo']]),
  f('dia', 'calculadora-datas', 'Dias e Idade', ['Conte dias', '*e calcule prazos*'], [['📅', 'Entre datas'], ['💼', 'Dias úteis'], ['➕', 'Some prazos'], ['🎂', 'Idade exata']]),
  f('dia', 'consulta-cep', 'Consulta CEP', ['Ache o endereço', '*ou o CEP*'], [['📮', 'Pelo CEP'], ['🏠', 'Pelo endereço'], ['🗺️', 'Todo o Brasil'], ['⚡', 'Na hora']]),
  f('dia', 'sorteador', 'Sorteador', ['Sorteie nomes', '*e números na hora*'], [['🎲', 'Números'], ['📝', 'Nomes'], ['👥', 'Grupos'], ['🎉', 'Para sorteios']]),
  f('dia', 'calculadora-dias-uteis', 'Dias Úteis', ['Prazos certos', '*sem contar feriados*'], [['💼', 'Dias úteis'], ['🎌', 'Feriados'], ['➕', 'Some prazos'], ['📅', 'Calendário']]),
  f('dia', 'feriados', 'Feriados', ['Planeje o ano', '*e os feriadões*'], [['📅', 'Todos do ano'], ['🏖️', 'Feriadões'], ['⏭️', 'Próximo feriado'], ['🇧🇷', 'Nacionais']]),
  f('dia', 'consulta-isbn', 'Consulta ISBN', ['Tudo sobre o livro', '*pelo ISBN*'], [['📖', 'Título'], ['✍️', 'Autor'], ['🏢', 'Editora'], ['📝', 'Sinopse']]),
  f('dia', 'simulador-urna-eletronica', 'Urna Simulada', ['Veja o voto virar', '*dado, hash e boletim*'], [['🗳️', 'Fluxo do voto'], ['📊', 'Contabilização'], ['🔀', 'RDV embaralhado'], ['🔐', 'Hash e assinatura']]),
  f('trabalho', 'gerador-de-curriculo', 'Gerador de Currículo', ['Seu currículo pronto', '*com modelos e dicas*'], [['📄', 'Vários modelos'], ['💡', 'Dica em cada campo'], ['🤖', 'Melhore com IA'], ['⬇️', 'PDF e Word']]),
  f('cultura', 'buscar-filmes-e-series', 'Filmes e Séries', ['Busque e descubra', '*e veja onde assistir*'], [['🎬', 'Filmes'], ['📺', 'Séries'], ['🍿', 'Onde assistir'], ['⭐', 'Recomendações']]),
  f('geradores', 'gerador-de-convite', 'Gerador de Convite', ['Crie e compartilhe', '*por um link pronto*'], [['🎂', 'Aniversário'], ['💍', 'Casamento'], ['🔗', 'Link direto'], ['⬇️', 'Baixe a imagem']]),
  f('dia', 'medir-objeto-na-foto', 'Medir na Foto', ['Saiba o tamanho', '*com uma moeda de referência*'], [['📏', 'Sem régua'], ['🪙', 'Moeda'], ['💳', 'Cartão'], ['📄', 'Folha A4']]),
  f('comer', 'restaurantes-perto-de-mim', 'Onde Comer Perto', ['Ache restaurantes', '*e comida por perto*'], [['🍽️', 'Restaurantes'], ['🍔', 'Lanches'], ['☕', 'Cafés'], ['📍', 'Perto de você']]),
  f('geradores', 'cronometro-de-poker', 'Cronômetro de Poker', ['Relógio de torneio', '*e cash, pra rodar offline*'], [['♠️', 'Torneio'], ['💵', 'Cash'], ['🎨', 'Temas e logo'], ['⬇️', 'Baixa o HTML']]),
  f('dia', 'tarefas-do-dia', 'Tarefas do Dia', ['Organize sua rotina', '*e o que fazer hoje*'], [['✅', 'Tarefas do dia'], ['🔁', 'Rotina'], ['🔥', 'Sequência'], ['📊', 'Progresso']]),

  /* Texto e segurança */
  f('texto', 'contador-caracteres', 'Contador', ['Caracteres e palavras', '*contados na hora*'], [['🔤', 'Caracteres'], ['📝', 'Palavras'], ['📏', 'Linhas'], ['🔁', 'Transforma o texto']]),
  f('texto', 'gerador-senha', 'Senha Forte', ['Senhas seguras', '*que ninguém adivinha*'], [['🔐', 'Aleatórias'], ['📏', 'Do tamanho certo'], ['💪', 'Força da senha'], ['🔒', 'No navegador']]),

  /* Geradores e documentos */
  f('geradores', 'gerador-qr-code', 'QR Code e Pix', ['QR Code para tudo', '*até para o Pix*'], [['🔗', 'Links'], ['📶', 'Wi-Fi'], ['💬', 'WhatsApp'], ['💠', 'Pix copia e cola']]),
  f('geradores', 'gerador-recibo', 'Recibo e Orçamento', ['Documentos profissionais', '*em PDF na hora*'], [['🧾', 'Recibos'], ['📋', 'Orçamentos'], ['📄', 'Salve em PDF'], ['✍️', 'Com assinatura']]),
  f('geradores', 'gerador-cpf', 'Gerador de CPF', ['CPF válido', '*para testar sistemas*'], [['🔢', 'Gera CPFs'], ['✅', 'Valida números'], ['📍', 'Por estado'], ['🧪', 'Para testes']]),
  f('geradores', 'gerador-cnpj', 'Gerador de CNPJ', ['CNPJ válido', '*e o novo alfanumérico*'], [['🔢', 'Numérico'], ['🔠', 'Alfanumérico'], ['✅', 'Valida números'], ['🧪', 'Para testes']]),
];
