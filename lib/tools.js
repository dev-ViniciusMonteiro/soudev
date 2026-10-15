// Catálogo das ferramentas. Cada entrada alimenta a página, as meta tags, o sitemap e os dados estruturados.
// title: até ~50 caracteres (o nome do site é somado depois). description: até ~155 caracteres.

export const categories = [
  {
    id: 'pdf',
    name: 'PDF e imagem',
    description: 'Converta, junte, comprima e edite arquivos PDF e imagens sem enviar nada para servidores.',
  },
  {
    id: 'trabalho',
    name: 'Trabalho e finanças',
    description: 'Calculadoras trabalhistas e financeiras atualizadas com as tabelas de INSS e IRRF de 2026.',
  },
  { id: 'dia', name: 'Dia a dia', description: 'Calculadoras rápidas para resolver contas do cotidiano.' },
  { id: 'texto', name: 'Texto e segurança', description: 'Conte caracteres, transforme textos e crie senhas fortes.' },
  { id: 'geradores', name: 'Geradores e documentos', description: 'QR Code, Pix, recibos, orçamentos e dados válidos para testes.' },
]

export const tools = [
  {
    slug: 'pdf-para-word',
    name: 'PDF para Word e Word para PDF',
    title: 'PDF para Word e Word para PDF Online Grátis',
    description:
      'Converta PDF em Word (.docx) editável e Word em PDF grátis, sem cadastro e sem enviar arquivos. Funciona no navegador do celular ou do computador.',
    short: 'Extraia o texto de um PDF para .docx ou transforme um Word em PDF.',
    badge: 'DOC',
    category: 'pdf',
    keywords: ['pdf para word', 'word para pdf', 'converter pdf em word', 'converter pdf em docx', 'transformar word em pdf'],
    intro:
      'Converta PDF em documento do Word editável e documentos .docx em PDF direto no navegador. O arquivo é processado no seu computador e não é enviado a nenhum servidor.',
    steps: [
      'Escolha a direção da conversão: PDF → Word ou Word → PDF.',
      'Clique em escolher arquivo ou arraste o documento para a área indicada.',
      'No PDF → Word, o arquivo .docx é baixado automaticamente quando a conversão termina.',
      'No Word → PDF, confira a prévia e clique em “Salvar como PDF”.',
    ],
    about: [
      'Converter PDF para Word é útil quando você precisa editar um contrato, currículo, trabalho escolar ou qualquer documento que só tem em PDF. A ferramenta lê o texto de cada página e monta um arquivo .docx que abre no Microsoft Word, Google Docs e LibreOffice, preservando as quebras de linha e de página.',
      'O caminho inverso também é simples: carregue um arquivo do Word e salve como PDF para enviar por e-mail, anexar em sites de vagas ou imprimir sem desconfigurar. Como tudo roda no seu navegador, documentos sigilosos não passam por servidores de terceiros.',
    ],
    faq: [
      ['O PDF convertido mantém a formatação?', 'O conversor preserva o texto e as quebras de linha e de página. Layouts complexos, tabelas e imagens não são reproduzidos, porque o objetivo é ter o texto editável.'],
      ['Funciona com PDF escaneado?', 'Não. PDFs escaneados são imagens e precisam de OCR. A ferramenta funciona com PDFs que têm texto selecionável.'],
      ['Como salvo o Word em PDF?', 'Depois de carregar o .docx, clique em “Salvar como PDF” e escolha “Salvar como PDF” no destino da janela de impressão.'],
      ['Preciso instalar algum programa?', 'Não. Funciona em qualquer navegador moderno, no computador ou no celular, sem instalar nada.'],
    ],
  },
  {
    slug: 'juntar-pdf',
    name: 'Juntar PDF',
    title: 'Juntar PDF Online Grátis: Unir Arquivos PDF',
    description:
      'Junte vários arquivos PDF em um só, na ordem que quiser. Grátis, sem cadastro, sem marca d’água e sem enviar seus arquivos para a internet.',
    short: 'Una vários PDFs em um só arquivo, na ordem que você quiser.',
    badge: 'PDF',
    category: 'pdf',
    keywords: ['juntar pdf', 'unir pdf', 'mesclar pdf', 'juntar arquivos pdf', 'combinar pdf'],
    intro:
      'Junte dois ou mais arquivos PDF em um único documento. Reordene os arquivos antes de unir. Tudo acontece no seu navegador, sem upload e sem limite de uso.',
    steps: [
      'Clique em “Adicionar PDFs” ou arraste os arquivos para a área indicada.',
      'Use as setas para colocar os arquivos na ordem final.',
      'Clique em “Juntar PDFs” e o arquivo unido será baixado.',
    ],
    about: [
      'Juntar PDF é a forma mais prática de reunir documentos para inscrições, processos, concursos e envios para RH: RG, comprovante de residência, certidões e declarações em um único arquivo. Você escolhe a ordem e recebe um PDF pronto para anexar.',
      'Diferente de muitos sites, aqui não há marca d’água, cadastro ou limite diário. Os arquivos são lidos e unidos no seu próprio dispositivo, o que deixa o processo mais rápido e mantém seus documentos pessoais privados.',
    ],
    faq: [
      ['Existe limite de arquivos?', 'Não há limite fixo. O que limita é a memória do seu dispositivo, então arquivos muito grandes podem demorar mais.'],
      ['Meus arquivos ficam salvos em algum lugar?', 'Não. Os arquivos são lidos e unidos localmente. Nada sai do seu computador.'],
      ['PDFs protegidos por senha funcionam?', 'PDFs com senha de abertura precisam ser desbloqueados antes de serem unidos.'],
      ['Funciona no celular?', 'Sim. Basta escolher os arquivos salvos no celular, organizar a ordem e juntar.'],
    ],
  },
  {
    slug: 'jpg-para-pdf',
    name: 'JPG para PDF e PDF para JPG',
    title: 'JPG para PDF e PDF para JPG Online Grátis',
    description:
      'Transforme fotos JPG, PNG ou WebP em PDF ou converta cada página de um PDF em imagem JPG. Grátis, rápido, sem cadastro e sem upload.',
    short: 'Transforme imagens em PDF ou cada página de um PDF em imagem.',
    badge: 'JPG',
    category: 'pdf',
    keywords: ['jpg para pdf', 'pdf para jpg', 'imagem para pdf', 'png para pdf', 'foto para pdf', 'converter pdf em imagem'],
    intro:
      'Converta fotos JPG, PNG ou WebP em um PDF organizado, ou extraia cada página de um PDF como imagem JPG de alta qualidade. Rápido, gratuito e privado.',
    steps: [
      'Escolha “Imagens → PDF” ou “PDF → JPG”.',
      'Adicione as imagens (e organize a ordem) ou selecione o PDF.',
      'Escolha o tamanho da página e a margem, se quiser.',
      'Baixe o PDF gerado ou as imagens de cada página.',
    ],
    about: [
      'Transformar foto em PDF é essencial para enviar documentos fotografados com o celular: RG, CNH, comprovantes e atestados. Cada imagem vira uma página no tamanho A4, centralizada e ajustada automaticamente na orientação certa.',
      'Já a conversão de PDF para JPG ajuda a postar uma página em redes sociais, inserir em apresentações ou enviar por WhatsApp como imagem. As páginas são renderizadas em alta resolução, prontas para leitura e impressão.',
    ],
    faq: [
      ['Quais formatos de imagem são aceitos?', 'JPG, PNG e WebP. Cada imagem vira uma página do PDF, na ordem escolhida.'],
      ['Qual a qualidade das imagens geradas do PDF?', 'As páginas são renderizadas em resolução dupla, o suficiente para leitura e impressão comum.'],
      ['Posso juntar várias fotos em um PDF só?', 'Sim. Adicione quantas imagens quiser, ordene com as setas e gere um único PDF.'],
    ],
  },
  {
    slug: 'comprimir-pdf',
    name: 'Comprimir PDF',
    title: 'Comprimir PDF Online Grátis: Reduzir Tamanho',
    description:
      'Diminua o tamanho de arquivos PDF para enviar por e-mail ou anexar em sites com limite de MB. Grátis, sem cadastro e sem enviar o arquivo.',
    short: 'Reduza o tamanho de PDFs para enviar por e-mail ou anexar em sites.',
    badge: 'ZIP',
    category: 'pdf',
    keywords: ['comprimir pdf', 'diminuir tamanho pdf', 'reduzir pdf', 'compactar pdf', 'pdf menor'],
    intro:
      'Diminua o tamanho de arquivos PDF para caber em limites de upload de sites, concursos e e-mails. Escolha o nível de compressão e compare o antes e depois.',
    steps: [
      'Escolha o nível de compressão: leve, recomendada ou forte.',
      'Selecione o PDF que deseja reduzir.',
      'Compare o tamanho antes e depois e baixe o PDF comprimido.',
    ],
    about: [
      'Muitos sites de inscrição, prefeituras, universidades e sistemas de RH aceitam anexos de no máximo 1, 2 ou 5 MB. Comprimir o PDF resolve isso em segundos, principalmente em documentos escaneados ou cheios de fotos.',
      'A compressão otimiza cada página como imagem, o que reduz muito o tamanho de digitalizações. Se o resultado não compensar, a ferramenta avisa, e você pode tentar o nível forte ou manter o original.',
    ],
    faq: [
      ['Como a compressão funciona?', 'Cada página é convertida em imagem otimizada. Isso reduz bastante PDFs com fotos e escaneamentos. Em contrapartida, o texto deixa de ser selecionável.'],
      ['E se o arquivo ficar maior?', 'Em PDFs que só têm texto, a compressão pode não ajudar. A ferramenta avisa quando o resultado não compensa.'],
      ['A qualidade fica ruim?', 'No nível recomendado o documento continua legível. Use o nível leve quando a qualidade for mais importante que o tamanho.'],
    ],
  },
  {
    slug: 'remover-fundo',
    name: 'Remover fundo de imagem',
    title: 'Remover Fundo de Imagem Grátis com IA',
    description:
      'Tire o fundo de fotos automaticamente com inteligência artificial e baixe em PNG transparente ou fundo branco. Grátis, sem cadastro e sem upload.',
    short: 'Tire o fundo de fotos automaticamente com inteligência artificial.',
    badge: 'IA',
    category: 'pdf',
    keywords: ['remover fundo', 'tirar fundo de foto', 'fundo transparente', 'remover fundo de imagem', 'png sem fundo'],
    intro:
      'Remova o fundo de fotos de produtos, retratos e logos com IA que roda no seu próprio navegador. Baixe em PNG transparente ou com fundo branco.',
    steps: [
      'Selecione uma foto em JPG, PNG ou WebP.',
      'Aguarde a IA recortar o fundo (a primeira vez demora um pouco mais).',
      'Escolha fundo transparente, branco ou colorido e baixe a imagem.',
    ],
    about: [
      'Remover o fundo de uma imagem é indispensável para fotos de produtos em lojas virtuais, marketplaces, catálogos, fotos de perfil e montagens. A inteligência artificial identifica a pessoa ou o objeto principal e recorta automaticamente, sem precisar de Photoshop.',
      'O modelo de IA é executado no seu dispositivo, então suas fotos não são enviadas para nenhum servidor. Depois de baixado na primeira utilização, ele fica em cache e as próximas remoções são mais rápidas.',
    ],
    faq: [
      ['Minha foto é enviada para algum servidor?', 'Não. O modelo de IA é baixado uma vez e a imagem é processada no seu dispositivo.'],
      ['Por que a primeira vez demora mais?', 'Na primeira utilização o navegador baixa o modelo de IA (algumas dezenas de MB). Depois ele fica em cache.'],
      ['Posso trocar o fundo por uma cor?', 'Sim. Escolha fundo branco ou uma cor personalizada antes de baixar.'],
    ],
  },
  {
    slug: 'calculadora-rescisao',
    name: 'Calculadora de rescisão',
    title: 'Calculadora de Rescisão 2026: Cálculo CLT',
    description:
      'Calcule sua rescisão CLT 2026: saldo de salário, aviso prévio, 13º, férias + 1/3, multa de 40% do FGTS e descontos de INSS e IR. Grátis e rápido.',
    short: 'Estime as verbas rescisórias, multa do FGTS e o valor líquido.',
    badge: 'CLT',
    category: 'trabalho',
    keywords: ['calculadora de rescisão', 'cálculo rescisão clt', 'acerto trabalhista', 'calcular rescisão 2026', 'verbas rescisórias'],
    intro:
      'Calcule a rescisão do contrato de trabalho CLT: saldo de salário, aviso prévio proporcional, 13º e férias proporcionais, 1/3 de férias, descontos de INSS e IRRF e multa do FGTS. Usa as tabelas de 2026.',
    steps: [
      'Informe o último salário bruto e as datas de admissão e do último dia trabalhado.',
      'Escolha o motivo da saída e como foi o aviso prévio.',
      'Indique se há férias vencidas e, se souber, o saldo do FGTS.',
      'Veja na hora as verbas, os descontos, o líquido e o valor do FGTS para saque.',
    ],
    about: [
      'A calculadora de rescisão mostra quanto você deve receber ao sair de um emprego com carteira assinada. Ela considera o motivo do desligamento (sem justa causa, pedido de demissão, acordo ou justa causa), o aviso prévio proporcional ao tempo de casa e a projeção do aviso indenizado no 13º e nas férias.',
      'Os descontos de INSS e Imposto de Renda usam as tabelas progressivas de 2026, já com a isenção de IR para quem ganha até R$ 5 mil. O resultado também estima a multa de 40% (ou 20% no acordo) e o valor disponível para saque do FGTS. Use para conferir o termo de rescisão (TRCT) que a empresa apresentar.',
    ],
    faq: [
      ['O cálculo tem valor oficial?', 'Não. É uma estimativa para conferência. Convenções coletivas, horas extras, adicionais e médias podem alterar o valor final.'],
      ['Como é calculado o aviso prévio?', 'São 30 dias mais 3 dias por ano completo trabalhado, até o limite de 90 dias (Lei 12.506/2011).'],
      ['Quem tem direito à multa de 40% do FGTS?', 'Quem foi dispensado sem justa causa. No acordo entre as partes a multa é de 20% e o saque é de até 80% do saldo.'],
      ['Qual o prazo para a empresa pagar a rescisão?', 'Até 10 dias corridos após o término do contrato, independentemente do tipo de aviso prévio.'],
    ],
  },
  {
    slug: 'calculadora-salario-liquido',
    name: 'Calculadora de salário líquido',
    title: 'Calculadora de Salário Líquido 2026',
    description:
      'Calcule seu salário líquido 2026 com descontos de INSS e Imposto de Renda, já com a isenção de IR até R$ 5 mil. Grátis, simples e atualizado.',
    short: 'Descubra quanto cai na conta depois do INSS e do Imposto de Renda.',
    badge: 'R$',
    category: 'trabalho',
    keywords: ['salário líquido', 'calcular salário líquido 2026', 'calculadora salário líquido', 'desconto inss irrf', 'quanto vou receber'],
    intro:
      'Calcule o salário líquido a partir do bruto com as tabelas progressivas de INSS e IRRF de 2026, incluindo a nova isenção de IR para quem ganha até R$ 5 mil.',
    steps: [
      'Digite o salário bruto mensal.',
      'Informe o número de dependentes para o Imposto de Renda.',
      'Adicione outros descontos e marque o vale-transporte, se houver.',
      'Confira o salário líquido e o detalhamento de cada desconto.',
    ],
    about: [
      'O salário líquido é o valor que de fato cai na sua conta depois dos descontos obrigatórios. Os principais são o INSS, calculado de forma progressiva por faixas, e o Imposto de Renda Retido na Fonte (IRRF), que considera dependentes e o desconto simplificado.',
      'Desde 2026, a Lei 15.270/2025 zera o Imposto de Renda para quem recebe até R$ 5.000 por mês e reduz o imposto gradualmente até R$ 7.350. A calculadora já aplica essa regra e escolhe automaticamente a dedução mais vantajosa.',
    ],
    faq: [
      ['Quem ganha até R$ 5 mil paga Imposto de Renda?', 'Desde 2026, a redução da Lei 15.270/2025 zera o IR para rendimentos tributáveis de até R$ 5.000 por mês e reduz o imposto de forma gradual até R$ 7.350.'],
      ['O que é o desconto simplificado?', 'É uma dedução fixa que substitui as deduções legais quando é mais vantajosa. A calculadora escolhe automaticamente a melhor opção.'],
      ['Como funciona o desconto do INSS?', 'É progressivo: cada faixa do salário tem sua alíquota (7,5%, 9%, 12% e 14%), até o teto da Previdência.'],
    ],
  },
  {
    slug: 'calculadora-ferias-13',
    name: 'Calculadora de férias e 13º salário',
    title: 'Calculadora de Férias e 13º Salário 2026',
    description:
      'Calcule férias com 1/3, venda de 10 dias (abono) e o 13º salário com 1ª e 2ª parcelas e descontos de INSS e IR. Tabelas 2026, grátis.',
    short: 'Calcule férias com 1/3, abono pecuniário e as parcelas do 13º.',
    badge: '13º',
    category: 'trabalho',
    keywords: ['calcular férias', 'cálculo 13 salário', 'abono pecuniário', 'calculadora de férias', 'décimo terceiro 2026'],
    intro:
      'Calcule o valor das férias com o terço constitucional, a venda de 10 dias (abono pecuniário) e o 13º salário com primeira e segunda parcelas e os descontos de INSS e IRRF.',
    steps: [
      'Informe o salário bruto e o número de dependentes.',
      'Na aba Férias, escolha os dias e se vai vender 10 dias.',
      'Na aba 13º salário, escolha os meses trabalhados no ano.',
      'Veja o valor bruto, os descontos e o líquido de cada pagamento.',
    ],
    about: [
      'As férias são pagas com acréscimo de um terço do salário e podem ter até 10 dias convertidos em dinheiro, o chamado abono pecuniário, que é isento de INSS e Imposto de Renda. A calculadora mostra quanto você recebe em cada cenário.',
      'O 13º salário é pago em duas parcelas: a primeira, sem descontos, até 30 de novembro, e a segunda, com INSS e IRRF, até 20 de dezembro. Quem trabalhou menos de 12 meses recebe proporcionalmente aos meses com 15 dias ou mais de trabalho.',
    ],
    faq: [
      ['Quando são pagas as parcelas do 13º?', 'A primeira parcela até 30 de novembro, sem descontos. A segunda até 20 de dezembro, já com INSS e IRRF.'],
      ['O abono de férias tem desconto?', 'Não. O abono pecuniário e seu 1/3 são isentos de INSS e de Imposto de Renda.'],
      ['Quando as férias devem ser pagas?', 'Até 2 dias antes do início do período de descanso.'],
    ],
  },
  {
    slug: 'juros-compostos',
    name: 'Calculadora de juros compostos',
    title: 'Calculadora de Juros Compostos com Aportes',
    description:
      'Simule investimentos com juros compostos e aportes mensais. Veja o total investido, os juros e a evolução ano a ano. Taxa mensal ou anual. Grátis.',
    short: 'Simule investimentos com aportes mensais e veja a evolução.',
    badge: 'J%',
    category: 'trabalho',
    keywords: ['juros compostos', 'simulador de investimento', 'calculadora juros compostos', 'calcular rendimento', 'aporte mensal'],
    intro:
      'Simule quanto seu dinheiro rende com juros compostos e aportes mensais. Informe a taxa ao mês ou ao ano e acompanhe a evolução do patrimônio ano a ano.',
    steps: [
      'Informe o valor inicial e quanto pretende investir por mês.',
      'Digite a taxa de juros e escolha se ela é mensal ou anual.',
      'Defina o período em meses ou anos.',
      'Veja o valor final e a tabela com a evolução do patrimônio.',
    ],
    about: [
      'Os juros compostos são os “juros sobre juros”: o rendimento de cada mês passa a render também nos meses seguintes. Com aportes regulares e tempo, o efeito é exponencial, e a parte dos juros pode superar o valor que você investiu.',
      'Use a calculadora para comparar cenários: Tesouro Direto, CDB, poupança ou a meta de aposentadoria. A taxa anual é convertida em mensal de forma equivalente, e a tabela mostra quanto foi investido e quanto veio de juros em cada período.',
    ],
    faq: [
      ['Qual a fórmula dos juros compostos?', 'M = C × (1 + i)^n, somada ao valor futuro dos aportes mensais. A taxa anual é convertida para mensal de forma equivalente.'],
      ['A simulação considera imposto e inflação?', 'Não. O resultado é bruto, útil para comparar cenários.'],
      ['Qual a diferença para juros simples?', 'Nos juros simples o rendimento incide só sobre o valor inicial. Nos compostos, incide sobre o saldo acumulado, por isso cresce mais rápido.'],
    ],
  },
  {
    slug: 'calculadora-porcentagem',
    name: 'Calculadora de porcentagem',
    title: 'Calculadora de Porcentagem Online',
    description:
      'Calcule porcentagem fácil: quanto é X% de um valor, aumento, desconto e variação percentual. Resultado na hora, grátis e direto no navegador.',
    short: 'Quanto é X% de Y, aumentos, descontos e variação percentual.',
    badge: '%',
    category: 'dia',
    keywords: ['calculadora de porcentagem', 'quanto é x% de y', 'calcular desconto', 'calcular porcentagem', 'variação percentual'],
    intro:
      'Resolva qualquer conta de porcentagem: quanto é X% de um valor, que porcentagem um número representa, aplicar aumento ou desconto e calcular variação percentual.',
    steps: [
      'Escolha o tipo de cálculo no quadro correspondente.',
      'Preencha os dois valores.',
      'O resultado aparece na hora, com a explicação da conta.',
    ],
    about: [
      'Porcentagem aparece o tempo todo: descontos em lojas, reajuste de salário e aluguel, gorjeta, juros, notas e metas. Esta calculadora reúne as quatro contas mais usadas em uma só página, com resultado instantâneo.',
      'Você pode descobrir quanto é 15% de R$ 200, que percentual 45 representa de 300, aplicar um desconto de 20% em um preço ou ver quanto um valor subiu ou caiu de um mês para outro.',
    ],
    faq: [
      ['Como calcular um desconto?', 'Multiplique o valor por (1 − desconto/100). Exemplo: 20% de desconto em R$ 150 dá 150 × 0,8 = R$ 120.'],
      ['Como calcular variação percentual?', '(valor final − valor inicial) ÷ valor inicial × 100.'],
      ['Como calcular quanto é X% de um número?', 'Multiplique o número pela porcentagem e divida por 100. Exemplo: 15% de 200 = 200 × 15 ÷ 100 = 30.'],
    ],
  },
  {
    slug: 'calculadora-imc',
    name: 'Calculadora de IMC',
    title: 'Calculadora de IMC: Índice de Massa Corporal',
    description:
      'Calcule seu IMC (Índice de Massa Corporal) com peso e altura, veja a classificação da OMS e a faixa de peso ideal para sua altura. Grátis.',
    short: 'Calcule seu Índice de Massa Corporal e a faixa de peso saudável.',
    badge: 'IMC',
    category: 'dia',
    keywords: ['calculadora imc', 'índice de massa corporal', 'peso ideal', 'calcular imc', 'tabela imc'],
    intro:
      'Calcule o IMC (Índice de Massa Corporal) com peso e altura e veja a classificação da OMS e a faixa de peso considerada saudável para sua altura.',
    steps: ['Informe seu peso em quilos.', 'Informe sua altura em centímetros ou metros.', 'Veja o IMC, a classificação e a faixa de peso saudável.'],
    about: [
      'O IMC é o indicador mais usado para avaliar se o peso está adequado à altura em adultos. Ele é obtido dividindo o peso (kg) pela altura (m) ao quadrado e classificado pela Organização Mundial da Saúde em faixas: abaixo do peso, normal, sobrepeso e obesidade graus I, II e III.',
      'Além do resultado, a calculadora mostra a faixa de peso considerada saudável para a sua altura (IMC entre 18,5 e 24,9). Lembre que o IMC não diferencia músculo de gordura e não substitui a avaliação de um profissional de saúde.',
    ],
    faq: [
      ['Como o IMC é calculado?', 'Peso em quilos dividido pela altura em metros ao quadrado.'],
      ['O IMC serve para todo mundo?', 'É uma referência para adultos. Não diferencia massa muscular de gordura e não substitui avaliação profissional.'],
      ['Qual o IMC ideal?', 'Para adultos, a OMS considera peso normal o IMC entre 18,5 e 24,9.'],
    ],
  },
  {
    slug: 'regra-de-tres',
    name: 'Regra de três',
    title: 'Calculadora de Regra de Três Simples',
    description:
      'Resolva regra de três simples direta ou inversamente proporcional com passo a passo. Calculadora grátis, rápida e fácil de usar.',
    short: 'Resolva regra de três simples, direta ou inversa, com o passo a passo.',
    badge: '3x',
    category: 'dia',
    keywords: ['regra de três', 'calculadora regra de 3', 'proporção', 'regra de três inversa', 'regra de três simples'],
    intro:
      'Calcule regra de três simples diretamente ou inversamente proporcional e veja a conta montada passo a passo.',
    steps: [
      'Escolha se as grandezas são diretamente ou inversamente proporcionais.',
      'Preencha os três valores conhecidos.',
      'Veja o valor de X e a conta montada passo a passo.',
    ],
    about: [
      'A regra de três é usada para descobrir um valor desconhecido a partir de uma proporção: receitas, conversão de medidas, preço por quantidade, consumo de combustível e muito mais. Se 2 kg custam R$ 10, quanto custam 5 kg? É regra de três direta.',
      'Quando uma grandeza aumenta e a outra diminui, como mais pessoas trabalhando e menos dias para terminar uma tarefa, a regra é inversa. A calculadora resolve os dois casos e mostra o raciocínio.',
    ],
    faq: [
      ['Quando a regra de três é inversa?', 'Quando uma grandeza aumenta e a outra diminui. Exemplo: mais trabalhadores, menos dias para terminar uma obra.'],
      ['Como montar uma regra de três direta?', 'A está para B assim como C está para X. Multiplique cruzado: X = (B × C) ÷ A.'],
    ],
  },
  {
    slug: 'calculadora-datas',
    name: 'Dias entre datas e idade',
    title: 'Calcular Dias Entre Datas, Dias Úteis e Idade',
    description:
      'Conte quantos dias há entre duas datas, calcule dias úteis, some prazos e descubra a idade exata em anos, meses e dias. Grátis e rápido.',
    short: 'Conte dias, dias úteis, some prazos e calcule idade exata.',
    badge: 'DIA',
    category: 'dia',
    keywords: ['dias entre datas', 'calcular idade', 'contar dias úteis', 'somar dias', 'quantos dias faltam'],
    intro:
      'Calcule quantos dias, semanas e meses existem entre duas datas, conte dias úteis, some ou subtraia dias de uma data e descubra a idade exata.',
    steps: [
      'Escolha a aba: dias entre datas, somar dias ou calcular idade.',
      'Preencha as datas (e a quantidade de dias, se for somar).',
      'Veja o resultado em dias corridos, dias úteis, semanas, meses e anos.',
    ],
    about: [
      'Contar dias entre datas é útil para prazos de entrega, contratos, boletos, gravidez, viagens e contagem regressiva para eventos. A ferramenta mostra o total de dias corridos, os dias úteis (sem fins de semana e feriados nacionais fixos) e a diferença em anos, meses e dias.',
      'Também dá para somar ou subtrair dias de uma data, em dias corridos ou úteis, para saber quando vence um prazo. E a calculadora de idade mostra a idade exata, os dias de vida e quanto falta para o próximo aniversário.',
    ],
    faq: [
      ['Os dias úteis consideram feriados?', 'São descontados sábados, domingos e feriados nacionais fixos. Feriados móveis e municipais não entram na conta.'],
      ['Como calcular quantos dias faltam para uma data?', 'Use a aba “Dias entre datas” com a data de hoje como inicial e a data desejada como final.'],
    ],
  },
  {
    slug: 'contador-caracteres',
    name: 'Contador de caracteres e palavras',
    title: 'Contador de Caracteres e Palavras Online',
    description:
      'Conte caracteres com e sem espaço, palavras, frases e linhas em tempo real. Converta para maiúsculas, minúsculas e remova acentos. Grátis.',
    short: 'Conte caracteres, palavras e linhas e transforme o texto.',
    badge: 'Aa',
    category: 'texto',
    keywords: ['contador de caracteres', 'contador de palavras', 'converter maiúsculas', 'contar caracteres', 'remover acentos'],
    intro:
      'Conte caracteres com e sem espaço, palavras, frases e parágrafos em tempo real. Veja limites de redes sociais e converta para maiúsculas, minúsculas ou remova acentos.',
    steps: [
      'Cole ou digite o texto na caixa.',
      'Acompanhe a contagem de caracteres, palavras, frases e linhas em tempo real.',
      'Use os botões para transformar o texto e copie o resultado.',
    ],
    about: [
      'O contador de caracteres ajuda a respeitar limites de redações, trabalhos acadêmicos, formulários, anúncios, títulos e descrições para o Google e posts em redes sociais como X, Instagram e LinkedIn. As barras mostram quanto do limite de cada plataforma você já usou.',
      'A ferramenta também converte o texto para MAIÚSCULAS, minúsculas, palavras capitalizadas ou tipo frase, remove acentos, espaços extras e quebras de linha. Tudo acontece no navegador, sem salvar o que você escreve.',
    ],
    faq: [
      ['Qual o limite de caracteres de uma meta description?', 'O recomendado é até cerca de 155 a 160 caracteres para não ser cortada no Google.'],
      ['Espaços contam como caracteres?', 'Sim, no total de caracteres. A ferramenta também mostra a contagem sem espaços.'],
    ],
  },
  {
    slug: 'gerador-senha',
    name: 'Gerador de senha forte',
    title: 'Gerador de Senha Forte e Segura Online',
    description:
      'Gere senhas fortes e aleatórias com letras, números e símbolos, do tamanho que precisar. Criadas no seu navegador, nunca salvas ou enviadas.',
    short: 'Crie senhas seguras e aleatórias com o tamanho que precisar.',
    badge: '***',
    category: 'texto',
    keywords: ['gerador de senha', 'senha forte', 'criar senha segura', 'gerar senha aleatória', 'senha segura'],
    intro:
      'Gere senhas fortes e aleatórias com letras, números e símbolos usando a criptografia do próprio navegador. As senhas não são salvas nem enviadas.',
    steps: [
      'Escolha o tamanho da senha.',
      'Marque os tipos de caracteres: maiúsculas, minúsculas, números e símbolos.',
      'Copie uma das senhas geradas ou gere novas.',
    ],
    about: [
      'Senhas fracas ou repetidas são a principal porta de entrada de invasões em e-mails, redes sociais e bancos. Uma senha longa e aleatória, diferente para cada serviço, é a forma mais simples de se proteger.',
      'O gerador usa o gerador criptográfico do navegador (crypto.getRandomValues) e mostra a força da senha em bits de entropia. Combine com um gerenciador de senhas para não precisar decorar nenhuma delas.',
    ],
    faq: [
      ['As senhas são realmente aleatórias?', 'Sim. Usamos crypto.getRandomValues, o gerador criptográfico do navegador.'],
      ['Qual tamanho de senha é seguro?', 'Para a maioria das contas, 16 caracteres ou mais com tipos variados já são muito fortes.'],
      ['As senhas ficam salvas no site?', 'Não. Elas são criadas no seu dispositivo e não são armazenadas nem enviadas.'],
    ],
  },
  {
    slug: 'gerador-qr-code',
    name: 'Gerador de QR Code e Pix',
    title: 'Gerador de QR Code Grátis: Pix, Wi-Fi e Link',
    description:
      'Crie QR Code grátis e sem validade para links, Wi-Fi, WhatsApp e Pix copia e cola com valor. Personalize as cores e baixe em PNG ou SVG.',
    short: 'QR Code para links, Wi-Fi, WhatsApp e Pix copia e cola.',
    badge: 'QR',
    category: 'geradores',
    keywords: ['gerador de qr code', 'qr code pix', 'qr code wifi', 'pix copia e cola', 'criar qr code grátis'],
    intro:
      'Crie QR Codes grátis e sem prazo de validade para links, textos, redes Wi-Fi, WhatsApp e cobranças Pix com valor. Baixe em PNG ou SVG.',
    steps: [
      'Escolha o tipo: link ou texto, Pix, Wi-Fi ou WhatsApp.',
      'Preencha os dados. O QR Code é atualizado na hora.',
      'Personalize as cores e o tamanho, se quiser.',
      'Baixe em PNG ou SVG ou copie o código Pix copia e cola.',
    ],
    about: [
      'O QR Code leva o cliente direto para o seu site, cardápio, Instagram ou WhatsApp, e é perfeito para cartões de visita, embalagens, cardápios e cartazes. Os códigos gerados aqui são estáticos: não expiram e não dependem de nenhum serviço para continuar funcionando.',
      'Para quem vende, o QR Code Pix gera a cobrança no padrão BR Code do Banco Central, com chave, nome, cidade e valor opcional, além do código “Pix copia e cola”. Também dá para criar um QR Code de Wi-Fi para os clientes se conectarem sem digitar a senha.',
    ],
    faq: [
      ['O QR Code expira?', 'Não. O QR Code é estático: a informação fica no próprio desenho e funciona para sempre.'],
      ['O QR Code Pix é seguro?', 'Ele segue o padrão BR Code do Banco Central. Confira sempre a chave e o nome do recebedor ao pagar.'],
      ['Posso usar o QR Code em material impresso?', 'Sim. Baixe em SVG ou em PNG de 2048 px para imprimir com nitidez em qualquer tamanho.'],
    ],
  },
  {
    slug: 'gerador-recibo',
    name: 'Gerador de recibo e orçamento',
    title: 'Gerador de Recibo e Orçamento em PDF Grátis',
    description:
      'Faça recibos de pagamento com valor por extenso e orçamentos com itens, desconto e validade. Preencha online e salve em PDF grátis.',
    short: 'Monte recibos e orçamentos profissionais e salve em PDF.',
    badge: 'REC',
    category: 'geradores',
    keywords: ['gerador de recibo', 'modelo de recibo', 'fazer orçamento pdf', 'recibo de pagamento', 'modelo de orçamento'],
    intro:
      'Preencha os dados e gere recibos de pagamento com valor por extenso ou orçamentos com itens, desconto e validade. Salve em PDF ou imprima.',
    steps: [
      'Escolha entre Recibo e Orçamento.',
      'Preencha os dados. A prévia do documento é atualizada na hora.',
      'Clique em “Salvar em PDF / Imprimir” e escolha “Salvar como PDF”.',
    ],
    about: [
      'O gerador de recibo é ideal para autônomos, MEIs, prestadores de serviço e proprietários de imóveis: aluguel, serviços, sinal de pagamento e vendas entre pessoas. O valor por extenso é escrito automaticamente, evitando erros.',
      'O gerador de orçamento monta uma proposta com lista de itens, quantidades, valores, desconto, observações e validade. O documento sai limpo e profissional, pronto para enviar ao cliente em PDF pelo WhatsApp ou e-mail.',
    ],
    faq: [
      ['O recibo tem validade jurídica?', 'Um recibo assinado serve como comprovante de pagamento. Para MEI e empresas, a nota fiscal continua obrigatória quando exigida.'],
      ['Como salvo em PDF?', 'Clique em “Salvar em PDF” e escolha “Salvar como PDF” como destino na janela de impressão.'],
      ['Meus dados ficam salvos?', 'Não. Tudo é preenchido e gerado no seu navegador.'],
    ],
  },
  {
    slug: 'gerador-cpf',
    name: 'Gerador e validador de CPF',
    title: 'Gerador de CPF Válido e Validador de CPF',
    description:
      'Gere CPF válido para testes de software, escolha o estado de emissão, gere em lote e valide CPFs pelo dígito verificador. Grátis.',
    short: 'Gere CPFs válidos para testes de software e valide números.',
    badge: 'CPF',
    category: 'geradores',
    keywords: ['gerador de cpf', 'validar cpf', 'cpf para teste', 'gerar cpf válido', 'validador de cpf'],
    intro:
      'Gere números de CPF válidos para testes de sistemas e formulários, escolha o estado de emissão e valide CPFs pelo dígito verificador.',
    steps: [
      'Escolha a quantidade e, se quiser, o estado de emissão.',
      'Marque se quer os números com ou sem pontuação.',
      'Copie um CPF ou a lista inteira.',
      'Para validar, digite um CPF no campo de validação.',
    ],
    about: [
      'Desenvolvedores, testadores (QA) e analistas precisam de CPFs válidos para testar cadastros, formulários e integrações sem usar dados de pessoas reais. O gerador cria números que passam no cálculo dos dígitos verificadores, em lote e com ou sem máscara.',
      'O nono dígito do CPF indica a região fiscal de emissão, e você pode escolher o estado. O validador confere se um número é válido pela regra oficial do dígito verificador. Ele não consulta a situação cadastral na Receita Federal.',
    ],
    faq: [
      ['Os CPFs gerados são de pessoas reais?', 'São números aleatórios que só passam no cálculo do dígito verificador. Use apenas para testes, nunca para fraude ou cadastro real.'],
      ['Como funciona a validação do CPF?', 'Os dois últimos dígitos são calculados a partir dos nove primeiros com pesos decrescentes e módulo 11.'],
    ],
  },
  {
    slug: 'gerador-cnpj',
    name: 'Gerador e validador de CNPJ',
    title: 'Gerador de CNPJ Alfanumérico e Validador',
    description:
      'Gere e valide CNPJ numérico e o novo CNPJ alfanumérico da Receita Federal (2026). Em lote, com ou sem máscara, para testes de sistemas.',
    short: 'CNPJ numérico e o novo CNPJ alfanumérico para testes.',
    badge: 'PJ',
    category: 'geradores',
    keywords: ['gerador de cnpj', 'cnpj alfanumérico', 'validar cnpj', 'gerar cnpj válido', 'validador cnpj alfanumérico'],
    intro:
      'Gere e valide CNPJs no formato numérico tradicional e no novo formato alfanumérico adotado pela Receita Federal a partir de julho de 2026. Ideal para adaptar e testar sistemas.',
    steps: [
      'Escolha o formato: numérico ou alfanumérico.',
      'Defina a quantidade, se é matriz (0001) e se quer pontuação.',
      'Copie um CNPJ ou a lista inteira.',
      'Para validar, digite um CNPJ numérico ou alfanumérico no campo de validação.',
    ],
    about: [
      'A partir de julho de 2026, a Receita Federal passou a emitir CNPJs alfanuméricos: as 12 primeiras posições podem ter letras e números, e os dígitos verificadores continuam numéricos. Sistemas de cadastro, ERPs, e-commerces e bancos de dados precisam aceitar o novo formato.',
      'Use o gerador para criar massas de teste nos dois formatos e o validador para conferir a regra de cálculo: o valor de cada caractere é o código ASCII menos 48, com os mesmos pesos e o módulo 11 do CNPJ tradicional.',
    ],
    faq: [
      ['O que muda no CNPJ alfanumérico?', 'As 12 primeiras posições podem ter letras e números. Os dois dígitos verificadores continuam numéricos, calculados com o valor ASCII de cada caractere menos 48.'],
      ['Os CNPJs antigos continuam válidos?', 'Sim. Os CNPJs numéricos existentes não mudam. O formato novo vale para novas inscrições.'],
      ['Os CNPJs gerados são de empresas reais?', 'Não. São números aleatórios válidos apenas pelo dígito verificador, para uso em testes.'],
    ],
  },
  {
    slug: 'dividir-pdf',
    name: 'Dividir PDF',
    title: 'Dividir PDF Online Grátis: Separar Páginas',
    description:
      'Separe um PDF em vários arquivos, extraia páginas específicas ou divida a cada N páginas. Grátis, sem cadastro e sem enviar o arquivo.',
    short: 'Extraia páginas ou separe um PDF em vários arquivos.',
    badge: 'CUT',
    category: 'pdf',
    keywords: ['dividir pdf', 'separar pdf', 'extrair páginas pdf', 'separar páginas do pdf', 'cortar pdf'],
    intro:
      'Divida um PDF em vários arquivos ou extraia só as páginas que você precisa. Escolha intervalos como “1-3, 5”, separe página por página ou a cada N páginas, tudo no navegador.',
    steps: [
      'Selecione o arquivo PDF.',
      'Escolha o modo: extrair páginas, separar todas ou dividir a cada N páginas.',
      'Informe as páginas ou o intervalo, se for o caso.',
      'Clique em dividir e baixe os arquivos gerados.',
    ],
    about: [
      'Dividir PDF é útil para enviar só uma parte de um documento grande: um capítulo de apostila, uma página de contrato, o comprovante dentro de um extrato ou cada holerite em um arquivo separado. Você escolhe as páginas e recebe um novo PDF na hora.',
      'O processamento acontece no seu navegador, sem upload, e o PDF resultante mantém o texto selecionável e a qualidade original, porque as páginas são copiadas e não convertidas em imagem.',
    ],
    faq: [
      ['Como informo as páginas?', 'Use números e intervalos separados por vírgula, por exemplo: 1-3, 5, 8-10.'],
      ['A qualidade do PDF muda?', 'Não. As páginas são copiadas do original, sem compressão nem conversão.'],
      ['Posso separar cada página em um arquivo?', 'Sim. Use o modo “Separar todas as páginas” e cada página vira um PDF.'],
    ],
  },
  {
    slug: 'assinar-pdf',
    name: 'Assinar PDF',
    title: 'Assinar PDF Online Grátis: Assinatura Digitalizada',
    description:
      'Desenhe ou digite sua assinatura e posicione no PDF em qualquer página. Grátis, sem cadastro e sem enviar o documento para a internet.',
    short: 'Desenhe sua assinatura e coloque no PDF onde quiser.',
    badge: 'ASS',
    category: 'pdf',
    keywords: ['assinar pdf', 'assinatura em pdf', 'colocar assinatura no pdf', 'assinar documento online', 'assinatura digitalizada'],
    intro:
      'Assine documentos PDF desenhando com o mouse ou o dedo, ou digitando o seu nome. Clique na página para posicionar a assinatura e baixe o PDF assinado, sem enviar o arquivo para nenhum servidor.',
    steps: [
      'Desenhe sua assinatura no quadro ou digite o seu nome.',
      'Selecione o PDF que deseja assinar.',
      'Clique na página, no lugar onde a assinatura deve ficar. Ajuste o tamanho se precisar.',
      'Clique em “Baixar PDF assinado”.',
    ],
    about: [
      'Assinar PDF sem imprimir economiza tempo em contratos de aluguel, declarações, autorizações, propostas e documentos escolares. A assinatura é inserida como imagem na posição escolhida e o restante do documento continua igual, com o texto selecionável.',
      'Como tudo roda no seu navegador, documentos sigilosos não passam por servidores de terceiros. Importante: esta é uma assinatura digitalizada (imagem). Ela não equivale a uma assinatura digital com certificado ICP-Brasil, exigida em alguns processos oficiais.',
    ],
    faq: [
      ['A assinatura tem validade jurídica?', 'Assinaturas digitalizadas são aceitas em muitos acordos entre particulares. Processos que exigem certificado digital ICP-Brasil ou gov.br precisam desse tipo de assinatura.'],
      ['Posso assinar várias páginas?', 'Sim. Clique em cada página onde a assinatura deve aparecer. Para remover uma, clique sobre ela.'],
      ['Funciona no celular?', 'Sim. Dá para desenhar a assinatura com o dedo e tocar na página para posicioná-la.'],
    ],
  },
  {
    slug: 'heic-para-jpg',
    name: 'HEIC para JPG',
    title: 'Converter HEIC para JPG Online Grátis',
    description:
      'Converta fotos HEIC do iPhone para JPG em lote, direto no navegador. Grátis, sem cadastro, sem limite e sem enviar suas fotos.',
    short: 'Converta fotos do iPhone (HEIC) para JPG em lote.',
    badge: 'HEIC',
    category: 'pdf',
    keywords: ['heic para jpg', 'converter heic', 'heic to jpg', 'foto iphone para jpg', 'abrir arquivo heic'],
    intro:
      'Converta fotos HEIC e HEIF do iPhone para JPG, o formato que abre em qualquer computador, site ou aplicativo. Converta várias de uma vez sem enviar as fotos para a internet.',
    steps: [
      'Selecione uma ou várias fotos .heic ou .heif.',
      'Escolha a qualidade do JPG.',
      'Aguarde a conversão e baixe as fotos uma a uma ou todas de uma vez.',
    ],
    about: [
      'O iPhone salva fotos no formato HEIC, que ocupa menos espaço, mas não abre em muitos programas do Windows, sites de inscrição e sistemas de empresas. Converter para JPG resolve o problema e mantém uma ótima qualidade.',
      'A conversão acontece no seu dispositivo: as fotos não são enviadas para nenhum servidor, o que é importante para imagens pessoais e documentos fotografados.',
    ],
    faq: [
      ['O que é um arquivo HEIC?', 'É o formato de imagem padrão do iPhone desde o iOS 11. Ele ocupa cerca de metade do espaço de um JPG com qualidade parecida.'],
      ['A qualidade da foto diminui?', 'Na qualidade alta a diferença é imperceptível. Você pode escolher uma qualidade menor para arquivos mais leves.'],
      ['Tem limite de fotos?', 'Não. O limite é só a memória do seu dispositivo.'],
    ],
  },
  {
    slug: 'calculadora-horas-extras',
    name: 'Calculadora de horas extras',
    title: 'Calculadora de Horas Extras 2026 com DSR',
    description:
      'Calcule horas extras de 50% e 100%, adicional noturno e o reflexo no DSR a partir do salário e da jornada. Grátis, rápido e atualizado.',
    short: 'Horas extras de 50% e 100%, adicional noturno e reflexo no DSR.',
    badge: 'HE',
    category: 'trabalho',
    keywords: ['calculadora de horas extras', 'calcular hora extra', 'hora extra 50%', 'hora extra 100%', 'dsr sobre horas extras'],
    intro:
      'Calcule o valor das horas extras de 50% e 100%, do adicional noturno e do reflexo no descanso semanal remunerado (DSR) a partir do salário e da jornada mensal.',
    steps: [
      'Informe o salário bruto e a jornada mensal (220 horas para 44h semanais).',
      'Digite a quantidade de horas extras a 50%, a 100% e as horas noturnas.',
      'Informe os dias úteis e os domingos e feriados do mês para o DSR.',
      'Veja o valor da hora, de cada adicional e o total a receber.',
    ],
    about: [
      'A hora extra é paga com acréscimo mínimo de 50% sobre a hora normal em dias úteis e, em geral, 100% em domingos e feriados. O valor da hora é o salário dividido pela jornada mensal: 220 horas para quem trabalha 44 horas por semana, 200 para 40 horas e 180 para 36 horas.',
      'As horas extras habituais também geram reflexo no DSR (descanso semanal remunerado), calculado dividindo o total de extras pelos dias úteis e multiplicando pelos domingos e feriados do mês. A calculadora soma tudo para você conferir o holerite. Convenções coletivas podem prever percentuais maiores.',
    ],
    faq: [
      ['Como calcular o valor da hora?', 'Divida o salário mensal pela jornada mensal. Exemplo: R$ 2.200 ÷ 220 = R$ 10 por hora.'],
      ['Quanto vale a hora extra de 50%?', 'A hora normal mais metade. Com hora de R$ 10, a extra de 50% vale R$ 15.'],
      ['O que é o adicional noturno?', 'Para trabalho urbano entre 22h e 5h, é um acréscimo de no mínimo 20% sobre a hora normal.'],
    ],
  },
  {
    slug: 'calculadora-seguro-desemprego',
    name: 'Calculadora de seguro-desemprego',
    title: 'Calculadora Seguro-Desemprego 2026: Valor e Parcelas',
    description:
      'Calcule o valor e o número de parcelas do seguro-desemprego 2026 pela média dos últimos salários. Tabela atualizada, grátis e rápido.',
    short: 'Valor da parcela e quantas parcelas você recebe em 2026.',
    badge: 'SD',
    category: 'trabalho',
    keywords: ['calculadora seguro desemprego', 'seguro desemprego 2026', 'valor seguro desemprego', 'parcelas seguro desemprego', 'tabela seguro desemprego'],
    intro:
      'Descubra quanto vai receber de seguro-desemprego em 2026 e em quantas parcelas, com base na média dos três últimos salários, no tempo trabalhado e no número de vezes que já pediu o benefício.',
    steps: [
      'Informe os salários brutos dos três meses anteriores à dispensa.',
      'Escolha quantas vezes você já solicitou o seguro-desemprego.',
      'Informe quantos meses trabalhou com carteira assinada nos últimos 36 meses.',
      'Veja o valor de cada parcela, a quantidade de parcelas e o total.',
    ],
    about: [
      'O seguro-desemprego é pago a quem foi dispensado sem justa causa. O valor da parcela é calculado sobre a média dos salários dos três meses anteriores à dispensa, em três faixas: até R$ 2.222,17 recebe 80% da média, na faixa seguinte o valor é R$ 1.777,74 mais metade do que passar disso, e acima de R$ 3.703,99 recebe o teto de R$ 2.518,65. Nenhuma parcela é menor que o salário mínimo.',
      'A quantidade de parcelas, de 3 a 5, depende de quantas vezes você já pediu o benefício e de quantos meses trabalhou. Na primeira solicitação, por exemplo, é preciso ter trabalhado pelo menos 12 dos últimos 18 meses. O pedido pode ser feito pela Carteira de Trabalho Digital ou pelo portal gov.br entre 7 e 120 dias após a dispensa.',
    ],
    faq: [
      ['Qual o valor máximo do seguro-desemprego em 2026?', 'O teto é de R$ 2.518,65 por parcela. O mínimo é o salário mínimo de R$ 1.621,00.'],
      ['Quem tem direito?', 'Trabalhadores dispensados sem justa causa, inclusive na rescisão indireta, que cumpram o tempo mínimo de trabalho e não tenham outra renda suficiente.'],
      ['Quem pede demissão recebe?', 'Não. Pedido de demissão e dispensa por justa causa não dão direito ao seguro-desemprego. No acordo entre as partes também não há direito.'],
    ],
  },
  {
    slug: 'simulador-financiamento',
    name: 'Simulador de financiamento',
    title: 'Simulador de Financiamento SAC e Price',
    description:
      'Simule financiamento de imóvel ou veículo nas tabelas SAC e Price: valor das parcelas, juros totais e a tabela de amortização. Grátis.',
    short: 'Parcelas, juros e tabela de amortização nos sistemas SAC e Price.',
    badge: 'FIN',
    category: 'trabalho',
    keywords: ['simulador de financiamento', 'tabela price', 'tabela sac', 'simular financiamento imobiliário', 'calcular parcela financiamento'],
    intro:
      'Simule um financiamento de imóvel, carro ou empréstimo e compare os sistemas SAC e Price: valor da primeira e da última parcela, total de juros e a tabela completa de amortização.',
    steps: [
      'Informe o valor do bem e da entrada.',
      'Digite a taxa de juros (ao mês ou ao ano) e o prazo em meses.',
      'Compare o resumo dos sistemas SAC e Price lado a lado.',
      'Abra a tabela de amortização para ver todas as parcelas.',
    ],
    about: [
      'Na Tabela Price as parcelas são fixas do começo ao fim, o que facilita o planejamento. No SAC (Sistema de Amortização Constante), a amortização é igual todo mês e as parcelas começam maiores e vão diminuindo, o que resulta em menos juros no total. Financiamentos imobiliários costumam usar SAC, e veículos e empréstimos, Price.',
      'O simulador calcula o valor financiado (bem menos entrada), converte a taxa anual em mensal de forma equivalente e mostra quanto você vai pagar de juros em cada sistema. A simulação não inclui seguros, taxas administrativas e correção pela TR ou IPCA, que entram no Custo Efetivo Total (CET) informado pelo banco.',
    ],
    faq: [
      ['Qual é melhor: SAC ou Price?', 'O SAC paga menos juros no total, mas tem parcelas iniciais maiores. A Price tem parcelas fixas e menores no começo, com mais juros no total.'],
      ['O que é amortização?', 'É a parte da parcela que reduz a dívida. O restante da parcela são os juros do período.'],
      ['A simulação inclui seguros e taxas?', 'Não. Seguros obrigatórios, tarifas e correção monetária fazem parte do CET informado pelo banco.'],
    ],
  },
  {
    slug: 'consulta-cep',
    name: 'Consulta CEP',
    title: 'Consulta CEP Grátis: Buscar CEP e Endereço',
    description:
      'Consulte o endereço completo de um CEP ou descubra o CEP de uma rua pelo nome, cidade e estado. Grátis, rápido e sem cadastro.',
    short: 'Busque o endereço pelo CEP ou o CEP pelo endereço.',
    badge: 'CEP',
    category: 'dia',
    keywords: ['consulta cep', 'buscar cep', 'descobrir cep', 'cep pelo endereço', 'qual meu cep'],
    intro:
      'Digite um CEP para ver rua, bairro, cidade, estado e DDD, ou busque o CEP de um endereço pelo nome da rua, da cidade e do estado.',
    steps: [
      'Para buscar o endereço, digite o CEP com 8 números.',
      'Para descobrir o CEP, escolha o estado e digite a cidade e o nome da rua.',
      'Copie o endereço ou o CEP encontrado.',
    ],
    about: [
      'A consulta de CEP ajuda a preencher cadastros, calcular frete, conferir endereços de entrega e descobrir o CEP correto de uma rua. O resultado mostra logradouro, bairro, cidade, estado, DDD e o código IBGE do município.',
      'Os dados vêm da base pública do ViaCEP, que é atualizada a partir das informações dos Correios. Cidades pequenas costumam ter um CEP único para todo o município, por isso a busca por rua pode não trazer resultados nelas.',
    ],
    faq: [
      ['Como descobrir o CEP de uma rua?', 'Use a aba “Buscar CEP pelo endereço”, escolha o estado e digite a cidade e pelo menos 3 letras do nome da rua.'],
      ['Por que meu CEP não foi encontrado?', 'Ele pode ser novo, estar digitado errado ou pertencer a uma cidade com CEP único. Confira os 8 números.'],
      ['A consulta é gratuita?', 'Sim, sem limite e sem cadastro.'],
    ],
    privacy: 'O CEP ou endereço digitado é consultado na base pública do ViaCEP. Nenhum outro dado é enviado.',
  },
  {
    slug: 'sorteador',
    name: 'Sorteador de nomes e números',
    title: 'Sorteador Online: Sortear Nomes e Números',
    description:
      'Sorteie números, nomes ou participantes de sorteios do Instagram e divida pessoas em grupos. Aleatório de verdade, grátis e sem cadastro.',
    short: 'Sorteie números, nomes ou divida pessoas em grupos.',
    badge: 'SOR',
    category: 'dia',
    keywords: ['sorteador', 'sortear nomes', 'sortear números', 'sorteio instagram', 'dividir em grupos'],
    intro:
      'Sorteie números em um intervalo, escolha ganhadores em uma lista de nomes ou comentários do Instagram e divida pessoas em grupos de forma aleatória e justa.',
    steps: [
      'Escolha o modo: números, nomes ou grupos.',
      'Informe o intervalo ou cole a lista, uma pessoa por linha.',
      'Defina quantos resultados quer e se pode repetir.',
      'Clique em sortear e copie o resultado.',
    ],
    about: [
      'O sorteador é ideal para rifas, amigo secreto, ordem de apresentação, escolha de vencedores de promoções e sorteios no Instagram. Cole a lista de participantes, remova duplicados com um clique e sorteie quantos ganhadores precisar.',
      'O resultado usa o gerador criptográfico do navegador (crypto.getRandomValues), o que garante que cada participante tem a mesma chance. Também dá para dividir uma turma ou equipe em grupos equilibrados.',
    ],
    faq: [
      ['O sorteio é realmente aleatório?', 'Sim. Usamos o gerador criptográfico do navegador, o mesmo tipo usado para criar senhas seguras.'],
      ['Como faço um sorteio do Instagram?', 'Copie os nomes ou @ dos comentários, cole na lista (um por linha), marque “remover duplicados” e sorteie.'],
      ['Posso sortear sem repetir?', 'Sim. Por padrão, um número ou nome sorteado não se repete.'],
    ],
  },
]

export const getTool = (slug) => tools.find((tool) => tool.slug === slug)
