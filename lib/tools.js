// Catálogo das ferramentas. Cada entrada alimenta a página, as meta tags, o sitemap e os dados estruturados.
// title: até ~50 caracteres (o nome do site é somado depois). description: até ~155 caracteres.

export const categories = [
  { id: 'golpes', name: 'Contra golpes', description: 'Confira sites, boletos, telefones e empresas antes de pagar ou passar seus dados.' },
  { id: 'saude', name: 'Saúde e treino', description: 'Treino com correção de postura pela câmera e cálculos de saúde.' },
  { id: 'emergencia', name: 'Emergência e clima', description: 'Telefones de emergência, hospitais e farmácias perto de você e alertas de clima.' },
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
  { id: 'cultura', name: 'Filmes e séries', description: 'Busque e descubra filmes e séries, com recomendações e onde assistir no streaming.' },
  { id: 'comer', name: 'Restaurantes e comida', description: 'Ache restaurantes, lanchonetes, cafés e bares perto de você, por tipo de comida.' },
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
    slug: 'correcao-exercicios-camera',
    name: 'Correção de exercícios pela câmera',
    title: 'Personal pela Câmera: Corrija Seus Exercícios',
    description:
      'Treine com correção em tempo real pela câmera: 16 exercícios, entre eles agachamento, flexão, ponte, abdominal e polichinelo, com contagem e correção por voz. Grátis.',
    short: 'Conta repetições e corrige sua postura em tempo real, por voz.',
    badge: 'TREINO',
    category: 'saude',
    keywords: ['corrigir postura exercício', 'personal trainer online grátis', 'contador de repetições', 'como fazer agachamento correto', 'flexão de braço correta', 'treino em casa com câmera', 'corrigir agachamento', 'prancha abdominal tempo', 'ponte de glúteo correta', 'abdominal correto', 'contador de polichinelo', 'treino em casa sem equipamento'],
    intro:
      'Escolha o exercício, posicione o celular ou o notebook e treine: a câmera acompanha 33 pontos do seu corpo, conta as repetições e avisa na hora, na tela e por voz, quando a postura sai do lugar. São 16 exercícios: agachamento, afundo, ponte de glúteo, stiff, cadeirinha, flexão, rosca bíceps, desenvolvimento, elevação lateral, remada curvada, mergulho no banco, prancha, abdominal, escalador, polichinelo e corrida estacionária.',
    steps: [
      'Escolha o exercício e leia como posicionar a câmera (de lado ou de frente).',
      'Apoie o celular no chão ou numa mesa, a uns 2 a 3 metros, com o corpo inteiro aparecendo.',
      'Toque em "Ligar a câmera e começar" e permita o uso da câmera.',
      'Faça o exercício: o esqueleto fica verde quando está certo e vermelho onde precisa corrigir.',
      'Toque em "Terminar" para ver quantas repetições foram corretas e o que melhorar.',
    ],
    about: [
      'A ferramenta usa um modelo de inteligência artificial do Google (MediaPipe Pose) que roda dentro do navegador e encontra ombros, cotovelos, quadril, joelhos e tornozelos em cada quadro do vídeo. Com esses pontos, calculamos os ângulos das articulações, como o do joelho no agachamento e o do cotovelo na flexão, para contar cada repetição e conferir a amplitude, o alinhamento do corpo, a velocidade e os erros mais comuns de cada exercício.',
      'O vídeo não é gravado nem enviado para nenhum servidor: tudo é processado no seu aparelho. As correções seguem as orientações mais aceitas de execução, mas não substituem um profissional de educação física. Se sentir dor, pare o exercício. Quem tem lesão, problema cardíaco ou está começando deve procurar orientação antes de treinar.',
    ],
    faq: [
      ['O vídeo da câmera é gravado ou enviado?', 'Não. O vídeo é analisado ao vivo no seu navegador e nada é gravado nem enviado para servidores.'],
      ['Onde coloco o celular?', 'Para a maioria dos exercícios (agachamento, flexão, ponte, abdominal, prancha, remada), de lado para você. Para elevação lateral, desenvolvimento e polichinelo, de frente. Cada exercício mostra a posição certa antes de começar. Deixe a uns 2 a 3 metros, na altura do quadril, com o corpo inteiro aparecendo e boa iluminação.'],
      ['Por que algumas repetições não contam?', 'A repetição só conta quando você chega na amplitude mínima do exercício, como descer até perto de 90° no agachamento. Se o corpo sair da imagem, a contagem pausa até você aparecer de novo.'],
      ['Funciona no celular?', 'Sim, no Chrome, Safari ou Edge atualizados. Em celulares mais simples a análise pode ficar mais lenta; nesse caso, melhore a iluminação e use a câmera traseira apoiada.'],
      ['Substitui um personal trainer?', 'Não. Ajuda a perceber erros comuns e a manter a regularidade, mas um profissional avalia seu caso, sua carga e seus limites.'],
    ],
    privacy: 'O vídeo da câmera é analisado ao vivo no seu navegador e nunca é gravado nem enviado. O detector de movimento (MediaPipe, do Google) é baixado uma vez e roda no seu aparelho.',
  },
  {
    slug: 'calculadora-imc',
    name: 'Calculadora de IMC',
    title: 'Calculadora de IMC: Índice de Massa Corporal',
    description:
      'Calcule seu IMC (Índice de Massa Corporal) com peso e altura, veja a classificação da OMS e a faixa de peso ideal para sua altura. Grátis.',
    short: 'Calcule seu Índice de Massa Corporal e a faixa de peso saudável.',
    badge: 'IMC',
    category: 'saude',
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
  {
    slug: 'verificar-site-confiavel',
    name: 'Verificar se site é confiável',
    title: 'Site Confiável? Verifique Loja Antes de Comprar',
    description:
      'Descubra se um site ou loja é golpe: veja há quanto tempo existe, quem é o dono do domínio, a situação do CNPJ e sinais de site falso. Grátis.',
    short: 'Veja a idade do site, o dono, o CNPJ e sinais de golpe.',
    badge: 'SITE',
    category: 'golpes',
    keywords: ['site confiável', 'verificar site', 'site é golpe', 'loja confiável', 'consultar site golpe', 'como saber se um site é confiável'],
    intro:
      'Cole o link da loja ou do site que você recebeu. Mostramos há quanto tempo o domínio existe, quem é o dono (em sites .br), a situação do CNPJ na Receita e sinais típicos de site falso, como imitação de marcas famosas e de órgãos do governo.',
    steps: [
      'Cole o endereço do site ou o link recebido por mensagem.',
      'Se a loja mostrar um CNPJ no rodapé, digite-o também (opcional).',
      'Clique em verificar e veja o resultado e os sinais encontrados.',
      'Em caso de alerta, não pague e não informe dados pessoais.',
    ],
    about: [
      'Lojas falsas costumam ser criadas poucos dias antes de aparecerem em anúncios e somem em seguida. Por isso a data de registro do domínio é um dos sinais mais fortes: consultamos o registro oficial (registro.br para sites .br e o protocolo RDAP para os demais) e mostramos a idade do site.',
      'Também conferimos se o endereço imita marcas conhecidas (Mercado Livre, Magalu, Amazon, bancos, Correios) ou órgãos públicos sem terminar em .gov.br, se usa terminações baratas comuns em golpes e se o CNPJ informado existe e está ativo na Receita Federal. Nenhuma verificação automática garante 100%: use o resultado junto com o bom senso.',
    ],
    faq: [
      ['Como saber se um site é golpe?', 'Desconfie de site criado há poucas semanas, de preço muito abaixo do mercado, de pagamento só por Pix ou boleto, de CNPJ inexistente ou inativo e de endereço que imita uma marca famosa.'],
      ['O site passou na verificação. Posso comprar tranquilo?', 'Não há garantia total. Pesquise a reputação (Reclame Aqui), prefira cartão de crédito, que permite contestar a compra, e desconfie de pressa e de ofertas boas demais.'],
      ['Por que não aparece o dono de sites .com?', 'Sites internacionais costumam esconder os dados do titular. Em sites .br o registro mostra o CPF ou CNPJ do responsável.'],
      ['Caí em um golpe. O que fazer?', 'Avise o banco imediatamente (Pix pode ser contestado pelo MED em até 80 dias), registre boletim de ocorrência on-line e guarde comprovantes e conversas.'],
    ],
    privacy: 'O endereço é consultado no registro público de domínios (registro.br/RDAP) e o CNPJ na BrasilAPI. Nada é guardado.',
  },
  {
    slug: 'conferir-boleto',
    name: 'Conferir boleto falso',
    title: 'Conferir Boleto: Veja se é Falso Antes de Pagar',
    description:
      'Cole a linha digitável e descubra o banco que vai receber, o valor e o vencimento, e se o código foi alterado. Evite o golpe do boleto falso.',
    short: 'Veja banco, valor e vencimento e se o código foi alterado.',
    badge: 'BOL',
    category: 'golpes',
    keywords: ['conferir boleto', 'boleto falso', 'verificar boleto', 'consultar boleto pela linha digitável', 'boleto adulterado', 'como saber se boleto é verdadeiro'],
    intro:
      'Digite ou cole os números do boleto. A ferramenta lê o código como o banco lê: mostra qual banco vai receber o dinheiro, o valor e o vencimento, e confere os dígitos verificadores para descobrir se o código foi digitado errado ou adulterado.',
    steps: [
      'Copie a linha digitável do boleto (47 números) ou da conta de consumo (48 números).',
      'Cole no campo e, se quiser, informe o valor que você esperava pagar.',
      'Clique em conferir e veja banco, valor, vencimento e alertas.',
      'Antes de pagar, confira também o nome do beneficiário no app do banco.',
    ],
    about: [
      'No golpe do boleto falso, o criminoso troca o código de barras para que o dinheiro caia na conta dele, em outro banco, e às vezes altera o valor. Os três primeiros números da linha digitável indicam o banco que vai receber: se ele não for o banco da empresa que te cobrou, desconfie.',
      'Também verificamos os dígitos verificadores de cada bloco pelo padrão Febraban: se não conferem, o código foi digitado errado ou montado de forma fraudulenta. Funciona com boletos bancários e com contas de água, luz, telefone, tributos e multas. A leitura é feita no seu navegador.',
    ],
    faq: [
      ['Como saber se um boleto é verdadeiro?', 'Confira se o banco recebedor (os 3 primeiros números) é o banco da empresa, se o valor e o vencimento estão certos e, no app do banco, se o beneficiário e o CNPJ são da empresa que te cobrou.'],
      ['Os dígitos conferem. O boleto é seguro?', 'Significa que o código não foi alterado depois de gerado, mas um golpista pode gerar um boleto válido no nome dele. O mais importante é o nome do beneficiário na tela de pagamento.'],
      ['Recebi boleto por WhatsApp ou e-mail. O que faço?', 'Prefira gerar a 2ª via direto no site ou app oficial da empresa, digitando o endereço você mesmo.'],
      ['Qual a diferença entre 47 e 48 números?', 'Boletos de bancos têm 47 números. Contas de consumo, impostos e multas (arrecadação) têm 48 e começam com 8.'],
    ],
    privacy: 'A leitura do boleto é feita no seu navegador. Só o código do banco (3 números) é consultado na BrasilAPI para mostrar o nome.',
  },
  {
    slug: 'verificar-arquivo-virus',
    name: 'Verificar arquivo com vírus',
    title: 'Verificar Vírus em Arquivo: ZIP, EXE, PDF e APK',
    description:
      'Descubra se um arquivo baixado é vírus ou golpe: analise ZIP, EXE, PDF, Word, Excel e APK sem enviar o arquivo. Veja macros, scripts e programas disfarçados.',
    short: 'Analise ZIP, EXE, PDF, Office e APK atrás de vírus e golpes.',
    badge: 'VÍRUS',
    category: 'golpes',
    keywords: ['verificar vírus em arquivo', 'arquivo é vírus', 'analisar arquivo online', 'verificar zip vírus', 'scanner de vírus online', 'verificar exe', 'pdf com vírus', 'apk falso', 'como saber se um arquivo tem vírus'],
    intro:
      'Escolha o arquivo que você baixou ou recebeu por e-mail ou WhatsApp. A ferramenta abre o arquivo no seu navegador, sem enviá-lo para lugar nenhum, e procura sinais de vírus e golpe: programa disfarçado de PDF, macros, scripts escondidos, comandos perigosos, ZIP com senha e apps falsos de banco. Também consulta bases de vírus conhecidos.',
    steps: [
      'Clique em "Escolher arquivo" ou arraste o arquivo (pode ser ZIP, EXE, PDF, documento, APK, imagem ou script).',
      'Espere a análise: arquivos ZIP são abertos e cada arquivo de dentro é verificado.',
      'Veja o resultado e a lista de sinais encontrados.',
      'Se der "Perigoso", não abra: apague o arquivo e não passe senhas para quem enviou.',
    ],
    about: [
      'Golpistas mandam vírus disfarçados de boleto, nota fiscal, comprovante, currículo e intimação. Os truques mais comuns são programas com nome de PDF ("fatura.pdf.exe"), ZIP com senha para escapar do antivírus do e-mail, documentos do Word e Excel com macros, atalhos do Windows que rodam comandos e APKs falsos de banco que pedem acessibilidade para controlar o celular. A ferramenta reconhece o tipo real de cada arquivo pelo conteúdo, não pelo nome, e procura esses sinais.',
      'Tudo é analisado no seu próprio navegador: o arquivo nunca é enviado. Só a impressão digital do arquivo (o código SHA-256, que não permite reconstruir o conteúdo) é consultada em bases públicas de arquivos conhecidos. Para uma segunda opinião, use o botão do VirusTotal, que busca o resultado de dezenas de antivírus pela mesma impressão digital, também sem enviar o arquivo.',
    ],
    faq: [
      ['Como saber se um arquivo tem vírus?', 'Desconfie de arquivos que você não pediu, de "PDF" ou "boleto" que na verdade é .exe, .scr, .js ou .lnk, de ZIP com senha e de documentos que pedem para "habilitar conteúdo". Analise aqui e, se tiver dúvida, não abra.'],
      ['Meu arquivo é enviado para algum servidor?', 'Não. A análise é feita no seu navegador. Só a impressão digital SHA-256 é consultada em bases de vírus conhecidos; com ela não dá para ver nem reconstruir o arquivo.'],
      ['Deu "Nenhum sinal encontrado". Posso abrir tranquilo?', 'Nenhuma análise automática pega 100% dos vírus, principalmente os novos. Se o arquivo veio de alguém que você não conhece ou de uma mensagem com pressa e ameaça, não abra mesmo assim.'],
      ['Por que um programa normal aparece como "Atenção"?', 'Todo programa (.exe, .msi, .apk) pode fazer qualquer coisa no aparelho. Mesmo sem sinais de vírus, só abra se baixou do site oficial de quem fez o programa.'],
      ['Já abri o arquivo. E agora?', 'Desconecte da internet, rode a verificação completa do antivírus, troque suas senhas usando outro aparelho e avise o banco se informou dados. No celular, desinstale o app e revise as permissões de acessibilidade.'],
      ['Dá para verificar arquivos RAR e 7z?', 'O navegador não abre esses formatos. Extraia no seu computador, sem abrir nada, e envie aqui os arquivos de dentro. Mesmo assim consultamos a impressão digital do RAR ou 7z.'],
    ],
    privacy: 'O arquivo é analisado no seu navegador e nunca é enviado. Só a impressão digital SHA-256 é consultada em bases públicas de arquivos conhecidos (CIRCL e MalwareBazaar). Nada é guardado.',
  },
  {
    slug: 'consulta-ddd',
    name: 'Consulta DDD e número de telefone',
    title: 'Consulta DDD: de Onde é Esse Número?',
    description:
      'Descubra o estado e as cidades de um DDD ou número de telefone, identifique números do exterior e veja os golpes mais comuns por ligação e WhatsApp.',
    short: 'Estado e cidades do DDD e alerta de números suspeitos.',
    badge: 'DDD',
    category: 'golpes',
    keywords: ['consulta ddd', 'de onde é esse número', 'ddd de qual estado', 'número estrangeiro whatsapp golpe', 'ddd cidades'],
    intro:
      'Digite um DDD ou o número completo que te ligou ou mandou mensagem. Mostramos o estado e as cidades do DDD, se é celular ou fixo, e avisamos quando o número é do exterior, um 0800/0900 ou um número de empresa que costuma ser falsificado em golpes.',
    steps: [
      'Digite o DDD (2 números) ou o telefone completo, com ou sem +55.',
      'Clique em consultar.',
      'Veja o estado, as cidades e os alertas sobre o número.',
    ],
    about: [
      'Golpes por telefone e WhatsApp estão entre os mais comuns no Brasil: falsa central do banco, falso parente com número novo, falsas vagas de emprego e prêmios. Saber de onde vem o número ajuda a desconfiar: um DDD de outro estado ou um código de país estrangeiro (+62, +84, +1) oferecendo renda extra é sinal clássico de golpe.',
      'Os dados de DDD vêm da base pública da Anatel, via BrasilAPI. Lembre-se de que o número exibido pode ser falsificado: mesmo que pareça o do banco, nunca informe senha ou códigos por telefone.',
    ],
    faq: [
      ['Como saber de onde é um número de telefone?', 'Os dois primeiros números depois do +55 são o DDD, que indica o estado e a região. Digite-os aqui para ver as cidades.'],
      ['Recebi mensagem de número estrangeiro oferecendo emprego. É golpe?', 'Quase sempre. Vagas para curtir vídeos ou avaliar produtos terminam pedindo depósito para liberar saques. Não responda e bloqueie.'],
      ['O banco me ligou de um número 4004. É seguro?', 'Golpistas conseguem exibir números oficiais na tela. Desligue e ligue você para o número que está no verso do seu cartão.'],
    ],
    privacy: 'Apenas o DDD (2 números) é consultado na BrasilAPI. O número completo não sai do seu navegador.',
  },
  {
    slug: 'consulta-cnpj',
    name: 'Consulta CNPJ',
    title: 'Consulta CNPJ Grátis: Dados da Empresa',
    description:
      'Consulte qualquer CNPJ: razão social, situação na Receita, data de abertura, atividade, endereço, telefone e sócios. Grátis e sem cadastro.',
    short: 'Situação, abertura, atividade, endereço e sócios.',
    badge: 'CNPJ',
    category: 'golpes',
    keywords: ['consulta cnpj', 'consultar cnpj', 'cnpj receita federal', 'situação cadastral cnpj', 'sócios de uma empresa'],
    intro:
      'Digite o CNPJ e veja os dados públicos da empresa na Receita Federal: razão social, nome fantasia, situação cadastral, data de abertura, atividade principal, endereço, contatos e quadro de sócios, com alertas para empresas inativas ou recém-abertas.',
    steps: [
      'Digite o CNPJ com ou sem pontuação.',
      'Clique em consultar.',
      'Confira a situação, a data de abertura e os sócios.',
      'Copie o resumo se precisar.',
    ],
    about: [
      'Consultar o CNPJ antes de fechar negócio, contratar um serviço ou comprar em uma loja desconhecida evita muitos golpes: empresa baixada, inapta ou aberta há poucas semanas é um sinal de alerta, assim como atividade que não combina com o que está sendo vendido.',
      'Os dados vêm do Cadastro Nacional da Pessoa Jurídica, divulgado pela Receita Federal e disponibilizado pela BrasilAPI. A consulta é gratuita e não precisa de cadastro.',
    ],
    faq: [
      ['O que significa situação "inapta" ou "baixada"?', 'Baixada é empresa encerrada. Inapta é a que deixou de entregar declarações à Receita. Em ambos os casos ela não deveria estar vendendo nem emitindo notas.'],
      ['Dá para ver os sócios de uma empresa?', 'Sim. O quadro de sócios e administradores é público, com nome e qualificação (o CPF aparece parcialmente oculto).'],
      ['Os dados são atualizados?', 'São os dados públicos mais recentes divulgados pela Receita Federal, que podem ter alguns dias de atraso.'],
    ],
    privacy: 'O CNPJ digitado é consultado na BrasilAPI (dados públicos da Receita Federal). Nada é guardado.',
  },
  {
    slug: 'socorro-perto-de-mim',
    name: 'Socorro perto de mim',
    title: 'Hospital, UPA e Farmácia Perto de Mim',
    description:
      'Em uma emergência, veja os telefones úteis (SAMU, Bombeiros, Polícia, CVV) e os hospitais, UPAs, farmácias e delegacias mais próximos com rota.',
    short: 'Telefones de emergência e hospitais, UPAs e farmácias perto.',
    badge: 'SOS',
    category: 'emergencia',
    keywords: ['hospital mais próximo', 'upa perto de mim', 'farmácia 24 horas perto de mim', 'telefones de emergência', 'pronto socorro perto'],
    intro:
      'Ligue com um toque para SAMU, Bombeiros, Polícia, Defesa Civil, CVV e outros serviços de emergência, e encontre os hospitais, UPAs, farmácias, delegacias e quartéis de bombeiros mais próximos de você, com distância, telefone e rota no mapa.',
    steps: [
      'Em emergência grave, toque no número do SAMU (192) ou dos Bombeiros (193).',
      'Toque em "Usar minha localização" ou digite o endereço.',
      'Escolha o tipo de lugar: hospitais e UPAs, farmácias, polícia ou bombeiros.',
      'Toque em "Rota" para abrir o caminho no mapa ou em "Ligar".',
    ],
    about: [
      'Nos momentos de susto ninguém lembra o número do SAMU ou onde fica a UPA mais próxima. Esta página reúne os telefones de emergência do Brasil, que funcionam de graça de qualquer telefone, e uma busca dos serviços de saúde e segurança mais perto de você.',
      'Os lugares vêm do OpenStreetMap, o mapa colaborativo mundial. Alguns podem faltar ou estar com horário desatualizado; por isso também deixamos atalhos para buscar no Google Maps. Sua localização é usada só para a busca e não é guardada.',
    ],
    faq: [
      ['Qual a diferença entre SAMU (192) e Bombeiros (193)?', 'O SAMU atende emergências médicas (mal súbito, infarto, AVC, acidentes com feridos). Os Bombeiros atendem incêndios, resgates, afogamentos e desabamentos, e também socorrem vítimas.'],
      ['Ligar para esses números é grátis?', 'Sim. Os números de emergência são gratuitos e funcionam de celular sem crédito.'],
      ['Alguém tomou remédio ou produto de limpeza por engano. O que fazer?', 'Ligue para o Disque-Intoxicação (0800 722 6001) ou para o SAMU (192). Não provoque vômito sem orientação.'],
      ['Preciso conversar com alguém agora.', 'O CVV atende pelo 188, de graça, 24 horas, e também por chat no site cvv.org.br.'],
    ],
    privacy: 'Sua localização é usada só no seu navegador para buscar lugares próximos no OpenStreetMap. Nada é guardado.',
  },
  {
    slug: 'alerta-clima',
    name: 'Alerta de clima',
    title: 'Alerta de Clima: Calor, Chuva, UV e Ar Seco',
    description:
      'Veja os alertas de hoje e dos próximos dias para sua cidade: calor extremo, chuva forte, tempestade, índice UV, ar seco, qualidade do ar e o que fazer.',
    short: 'Calor, chuva forte, UV, ar seco e qualidade do ar hoje.',
    badge: 'CLIMA',
    category: 'emergencia',
    keywords: ['alerta de clima', 'alerta de calor', 'índice uv hoje', 'qualidade do ar hoje', 'chuva forte hoje', 'umidade do ar baixa'],
    intro:
      'Digite sua cidade ou use a localização para ver a previsão de hoje e dos próximos 2 dias com alertas claros: calor extremo, frio, índice UV, chuva forte, tempestade, vento, ar seco, poluição e fumaça de queimadas, sempre com orientação do que fazer para se proteger.',
    steps: [
      'Digite o nome da cidade ou toque em "Usar minha localização".',
      'Veja as condições de agora e os alertas ordenados por gravidade.',
      'Siga as orientações e compartilhe com quem mora com você.',
    ],
    about: [
      'Ondas de calor, tempo muito seco e tempestades causam internações e mortes todos os anos, principalmente entre idosos, crianças e pessoas com doenças crônicas. Esta ferramenta transforma a previsão do tempo em alertas práticos: quando beber mais água, quando evitar o sol, quando não sair por causa de alagamentos.',
      'A previsão vem do Open-Meteo, que reúne modelos meteorológicos globais, incluindo qualidade do ar e vazão de rios (indicador experimental). Para avisos oficiais, cadastre seu CEP na Defesa Civil enviando um SMS para 40199.',
    ],
    faq: [
      ['Qual umidade do ar é perigosa?', 'Abaixo de 30% já pede cuidado; abaixo de 20% é estado de alerta e abaixo de 12% é emergência, segundo os critérios da Defesa Civil.'],
      ['O que é índice UV alto?', 'De 6 a 7 é alto, de 8 a 10 muito alto e 11 ou mais é extremo. A partir de 8, a pele queima em poucos minutos sem proteção.'],
      ['Como receber alertas oficiais de enchente e deslizamento?', 'Envie seu CEP por SMS para 40199. O serviço da Defesa Civil é gratuito.'],
    ],
    privacy: 'A cidade ou localização é enviada apenas ao Open-Meteo para buscar a previsão. Nada é guardado.',
  },
  {
    slug: 'tabela-fipe',
    name: 'Tabela FIPE',
    title: 'Tabela FIPE: Preço de Carros, Motos e Caminhões',
    description:
      'Consulte o preço médio FIPE de carros, motos e caminhões por marca, modelo e ano, e compare com o valor do anúncio para não pagar caro nem cair em golpe.',
    short: 'Preço médio de veículos e comparação com o anúncio.',
    badge: 'FIPE',
    category: 'trabalho',
    keywords: ['tabela fipe', 'consulta fipe', 'preço fipe carro', 'tabela fipe moto', 'valor do carro usado'],
    intro:
      'Escolha marca, modelo e ano para ver o preço médio do veículo na Tabela FIPE do mês, e digite o valor do anúncio para saber se está caro, justo ou barato demais (o que pode ser golpe).',
    steps: [
      'Escolha o tipo: carro, moto ou caminhão.',
      'Selecione a marca, filtre e escolha o modelo.',
      'Escolha o ano e o combustível para ver o preço FIPE.',
      'Opcional: digite o preço do anúncio para comparar.',
    ],
    about: [
      'A Tabela FIPE é a referência de preço médio de veículos usados no Brasil, usada por lojas, seguradoras e financiamentos e atualizada todo mês pela Fundação Instituto de Pesquisas Econômicas. Ela ajuda a negociar a compra ou a venda de um carro usado.',
      'Um preço muito abaixo da FIPE é a principal isca do golpe do carro anunciado na internet: o criminoso pede sinal ou reserva antes da visita e some. Nunca pague antes de ver o veículo e a documentação pessoalmente.',
    ],
    faq: [
      ['O preço FIPE é o valor que vou pagar?', 'É uma média nacional de anúncios. O valor real varia com quilometragem, estado de conservação, opcionais, cor e região.'],
      ['Com que frequência a tabela muda?', 'Todo mês. O mês de referência aparece no resultado.'],
      ['O anúncio está 30% abaixo da FIPE. Vale a pena?', 'Desconfie. Pode ser golpe ou carro com problema (leilão, sinistro, débitos). Peça o laudo cautelar e consulte multas e restrições.'],
    ],
    privacy: 'As escolhas são consultadas na API pública da Tabela FIPE (Parallelum). Nada é guardado.',
  },
  {
    slug: 'comparador-investimentos',
    name: 'Comparador de investimentos',
    title: 'Poupança, CDB, LCI ou Tesouro: Qual Rende Mais?',
    description:
      'Compare poupança, CDB, LCI/LCA, Tesouro Selic e Tesouro IPCA+ com a Selic, o CDI e a inflação de hoje, já descontando o imposto. Veja qual rende mais.',
    short: 'Poupança, CDB, LCI e Tesouro com taxas de hoje.',
    badge: 'INV',
    category: 'trabalho',
    keywords: ['qual investimento rende mais', 'poupança ou cdb', 'simulador cdb', 'tesouro selic ou cdb', 'quanto rende 10 mil'],
    intro:
      'Informe quanto quer investir e por quanto tempo. Buscamos as taxas oficiais do Banco Central (Selic, CDI, IPCA e poupança) e mostramos quanto você teria no final em cada investimento, já descontando imposto de renda e taxas, e quanto ganhou acima da inflação.',
    steps: [
      'Digite o valor e o prazo em meses.',
      'Ajuste, se quiser, quanto o CDB e a LCI pagam (% do CDI) e a taxa do Tesouro IPCA+.',
      'Compare o valor final líquido e o ganho real de cada opção.',
    ],
    about: [
      'Muita gente deixa o dinheiro na poupança por costume, mas com a Selic alta outras aplicações seguras costumam render bem mais. A comparação considera o imposto de renda regressivo (de 22,5% a 15% conforme o prazo), a isenção de LCI, LCA e poupança e a taxa de custódia da B3 nos títulos do Tesouro.',
      'As taxas vêm direto do Banco Central e são atualizadas a cada acesso. CDB, LCI e LCA são garantidos pelo FGC até R$ 250 mil por instituição, e o Tesouro Direto pelo governo federal.',
    ],
    faq: [
      ['Poupança ou CDB: qual rende mais?', 'Com a Selic acima de 8,5% ao ano, um CDB que paga 100% do CDI rende mais que a poupança mesmo depois do imposto, na maioria dos prazos.'],
      ['O que é ganho real?', 'É o rendimento acima da inflação. Se for negativo, o dinheiro perdeu poder de compra no período.'],
      ['Os valores são garantidos?', 'É uma simulação com as taxas de hoje mantidas constantes. As taxas mudam ao longo do tempo.'],
    ],
    privacy: 'As taxas são buscadas no Banco Central. Os valores digitados não saem do seu navegador.',
  },
  {
    slug: 'conversor-moedas',
    name: 'Conversor de moedas',
    title: 'Conversor de Moedas: Dólar e Euro Hoje',
    description:
      'Converta dólar, euro, peso e outras moedas para real com a cotação de hoje e veja quanto uma compra sai de verdade no cartão internacional, com IOF.',
    short: 'Dólar, euro e outras moedas hoje, com IOF do cartão.',
    badge: 'US$',
    category: 'trabalho',
    keywords: ['conversor de moedas', 'dólar hoje', 'euro hoje', 'cotação do dólar', 'quanto custa no cartão internacional iof'],
    intro:
      'Veja a cotação do dia do dólar, do euro, da libra, dos pesos da América do Sul e de outras moedas, converta valores nos dois sentidos e calcule quanto uma compra em moeda estrangeira vai sair no cartão de crédito, com spread do banco e IOF.',
    steps: [
      'Escolha a moeda e digite o valor.',
      'Escolha o sentido: da moeda para real ou de real para a moeda.',
      'Veja a conversão e quanto sai no cartão internacional ou em espécie.',
    ],
    about: [
      'A cotação que aparece no noticiário é a comercial, usada entre bancos. Para quem viaja ou compra em sites do exterior, o valor final é maior: no cartão entram o spread do banco e o IOF de 3,5%, e na compra de moeda em espécie vale a cotação turismo, também com IOF.',
      'As cotações vêm da AwesomeAPI, com dados de mercado atualizados ao longo do dia.',
    ],
    faq: [
      ['Qual a diferença entre dólar comercial e turismo?', 'O comercial é usado em operações entre empresas e bancos. O turismo é o preço da moeda em espécie para o consumidor, um pouco mais caro.'],
      ['Quanto é o IOF no cartão internacional?', '3,5% sobre o valor da compra convertido em reais.'],
      ['O valor exato da fatura vai ser esse?', 'É uma estimativa. O banco usa a cotação dele no dia do fechamento ou da compra, conforme o contrato do cartão.'],
    ],
    privacy: 'As cotações são buscadas na AwesomeAPI. Os valores digitados não saem do seu navegador.',
  },
  {
    slug: 'calculadora-dias-uteis',
    name: 'Calculadora de dias úteis',
    title: 'Calculadora de Dias Úteis com Feriados',
    description:
      'Conte os dias úteis entre duas datas ou some um prazo em dias úteis, descontando fins de semana e feriados nacionais, inclusive Carnaval e Sexta-feira Santa.',
    short: 'Conte ou some dias úteis descontando os feriados.',
    badge: 'ÚTIL',
    category: 'dia',
    keywords: ['calculadora de dias úteis', 'contar dias úteis', 'somar dias úteis', 'prazo em dias úteis', 'dias úteis entre datas'],
    intro:
      'Calcule quantos dias úteis existem entre duas datas ou em que dia termina um prazo de N dias úteis, descontando sábados, domingos e todos os feriados nacionais, inclusive os que mudam de data todo ano, e os feriados da sua cidade.',
    steps: [
      'Escolha contar entre datas ou somar dias úteis.',
      'Informe as datas ou a quantidade de dias.',
      'Decida se Carnaval e Corpus Christi contam como folga.',
      'Opcional: adicione feriados estaduais ou municipais.',
    ],
    about: [
      'Prazos de pagamento, entrega, devolução, processos e licenças costumam ser contados em dias úteis. Esquecer um feriado móvel como a Sexta-feira Santa ou o Carnaval muda o resultado, por isso calculamos todos os feriados nacionais a partir da data da Páscoa de cada ano, sem depender de tabelas.',
      'Carnaval e Corpus Christi são pontos facultativos nacionais: na maioria das empresas e repartições não há expediente, mas você pode escolher contá-los como dias úteis. Feriados estaduais e municipais podem ser adicionados à mão.',
    ],
    faq: [
      ['Sábado é dia útil?', 'Para a maioria dos prazos, não. Esta calculadora considera de segunda a sexta, exceto feriados.'],
      ['A data inicial entra na contagem?', 'Não. A contagem começa no dia seguinte e inclui a data final, como na maioria dos prazos legais.'],
      ['O Dia da Consciência Negra é feriado?', 'Sim, 20 de novembro é feriado nacional desde 2024.'],
    ],
  },
  {
    slug: 'feriados',
    name: 'Feriados do ano',
    title: 'Feriados Nacionais do Ano e Feriadões',
    description:
      'Veja todos os feriados nacionais e pontos facultativos do ano com o dia da semana, os feriadões possíveis e quantos dias faltam para o próximo.',
    short: 'Lista de feriados, feriadões e o próximo feriado.',
    badge: 'FER',
    category: 'dia',
    keywords: ['feriados 2026', 'próximo feriado', 'feriados nacionais', 'feriadão', 'calendário de feriados'],
    intro:
      'Confira a lista completa de feriados nacionais e pontos facultativos do ano, com o dia da semana, quais viram feriadão ou permitem enforcar a sexta ou a segunda, quantos dias faltam para o próximo e um arquivo para adicionar tudo à sua agenda.',
    steps: [
      'Escolha o ano.',
      'Veja a lista com dias da semana e feriadões.',
      'Toque em "Adicionar à agenda" para salvar no celular.',
    ],
    about: [
      'O Brasil tem feriados de data fixa, como Tiradentes e Natal, e móveis, que dependem da Páscoa: Carnaval, Sexta-feira Santa e Corpus Christi. Desde 2024, o Dia Nacional de Zumbi e da Consciência Negra (20 de novembro) também é feriado nacional.',
      'Feriados que caem na segunda ou sexta formam fins de semana prolongados; os de terça e quinta permitem enforcar um dia. Feriados estaduais e municipais variam e não aparecem na lista.',
    ],
    faq: [
      ['Carnaval é feriado?', 'Nacionalmente é ponto facultativo. Algumas cidades e estados decretam feriado, como o Rio de Janeiro.'],
      ['Quando é o próximo feriado?', 'O destaque no topo mostra o próximo feriado e quantos dias faltam.'],
      ['Como colocar os feriados na agenda do celular?', 'Toque em "Adicionar à agenda (.ics)" e abra o arquivo: Google Agenda, Outlook e o calendário do iPhone importam todos de uma vez.'],
    ],
  },
  {
    slug: 'consulta-isbn',
    name: 'Consulta ISBN',
    title: 'Consulta ISBN: Encontre o Livro pelo Código',
    description:
      'Digite o ISBN e veja título, autores, editora, ano, número de páginas, sinopse e capa do livro, além da referência pronta no formato ABNT.',
    short: 'Título, autor, editora e sinopse pelo ISBN.',
    badge: 'ISBN',
    category: 'dia',
    keywords: ['consulta isbn', 'buscar livro por isbn', 'isbn do livro', 'referência abnt livro', 'descobrir livro pelo código'],
    intro:
      'Digite o ISBN de 10 ou 13 números que fica na contracapa do livro e veja título, autores, editora, ano, número de páginas, assuntos, sinopse e capa, com uma referência simplificada no formato ABNT pronta para copiar.',
    steps: [
      'Encontre o ISBN na contracapa ou na ficha catalográfica.',
      'Digite com ou sem traços.',
      'Veja os dados do livro e copie a referência.',
    ],
    about: [
      'O ISBN (International Standard Book Number) é o código único de cada edição de um livro. Com ele dá para identificar a obra exata, conferir a edição antes de comprar um livro usado e montar referências bibliográficas para trabalhos escolares.',
      'Os dados vêm da BrasilAPI, que consulta bases como a CBL (Câmara Brasileira do Livro), Mercado Editorial, Google Books e Open Library.',
    ],
    faq: [
      ['Onde fica o ISBN do livro?', 'Na contracapa, perto do código de barras, e na ficha catalográfica, nas primeiras páginas.'],
      ['ISBN de 10 ou de 13 números?', 'Os dois funcionam. Desde 2007 os livros usam o ISBN de 13 números, que começa com 978 ou 979.'],
      ['A referência ABNT está completa?', 'É uma versão simplificada (autor, título, local, editora e ano). Confira as regras exigidas pelo seu professor.'],
    ],
    privacy: 'O ISBN é consultado na BrasilAPI. Nada é guardado.',
  },
  {
    slug: 'simulador-urna-eletronica',
    name: 'Simulador de urna eletrônica',
    title: 'Simulador de Urna Eletrônica (Fictício)',
    description:
      'Simulador educativo e fictício do fluxo de votação: vote, veja a contabilização, o registro embaralhado, o boletim de urna, o hash e a assinatura digital.',
    short: 'Veja o passo a passo do voto e o caminho dos dados, com candidatos fictícios.',
    badge: 'URNA',
    category: 'dia',
    keywords: ['simulador urna eletrônica', 'como funciona a urna', 'fluxo de votação', 'boletim de urna', 'simulador de voto'],
    intro:
      'Simule o fluxo de votação e acompanhe o caminho dos dados em tempo real: o voto vira contagem, entra no registro embaralhado, gera o boletim de urna e recebe hash e assinatura digital. Material educativo com candidatos, partidos e seção inventados. Não é a urna real, não usa dados oficiais e não tem ligação com a Justiça Eleitoral.',
    steps: [
      'Clique em “Abrir (Zerésima)” para iniciar a seção com tudo zerado.',
      'Clique em “Habilitar eleitor” para liberar a urna, como faz o mesário.',
      'Digite os números no teclado e use CONFIRMA, CORRIGE e BRANCO ao longo dos cargos.',
      'Acompanhe nos painéis a contabilização, o registro embaralhado e o log.',
      'Clique em “Encerrar (BU)” para gerar o boletim com hash e assinatura.',
      'Em “Editar candidatos” você muda nomes, números, partidos e a seção.',
    ],
    about: [
      'O simulador mostra, de forma visual, como um voto percorre o processo: ao confirmar, ele incrementa um contador público, é guardado isolado por cargo num registro embaralhado (para que a sequência de votos de uma pessoa não possa ser remontada) e, no fim, entra na soma do boletim de urna. A identificação do eleitor acontece antes, no terminal do mesário, e nunca viaja junto com o voto — por isso o voto é secreto.',
      'No encerramento, o boletim é resumido num hash SHA-256 e assinado com uma chave ECDSA gerada no seu próprio navegador. Isso ilustra por que qualquer alteração de um único número mudaria o hash e quebraria a assinatura, e como terceiros conseguem refazer a conta e conferir o resultado.',
      'É um modelo para aprender o conceito. Reproduz o comportamento e os formatos públicos do processo, não o código-fonte, os resultados oficiais nem as chaves criptográficas reais. Todos os nomes, números e partidos são fictícios.',
    ],
    faq: [
      ['Este simulador tem dados reais de eleição?', 'Não. Tudo é fictício e inventado, serve só para estudo. Ele não baixa, não mostra e não analisa resultados oficiais.'],
      ['Tem ligação com o TSE ou a Justiça Eleitoral?', 'Nenhuma. É um projeto educativo independente, sem vínculo, marca ou endosso de qualquer órgão.'],
      ['O voto é mesmo secreto na simulação?', 'A identificação do eleitor fica separada do voto, e os votos são guardados embaralhados, exatamente para ilustrar como o sigilo é preservado.'],
      ['Posso trocar os candidatos?', 'Sim. Em “Editar candidatos” você muda números, nomes, partidos e os dados da seção. Editar reinicia a votação para manter os totais coerentes.'],
      ['A assinatura digital é de verdade?', 'A criptografia é real (SHA-256 e ECDSA P-256), mas a chave é gerada no seu navegador só para a demonstração. As chaves da urna real são da Justiça Eleitoral.'],
    ],
    privacy: 'Tudo roda no seu navegador, com dados fictícios. Nada é enviado para servidores.',
  },
  {
    slug: 'gerador-de-curriculo',
    name: 'Gerador de currículo',
    title: 'Gerador de Currículo Grátis com Modelos',
    description:
      'Monte seu currículo grátis com vários modelos, dicas em cada campo e atalhos de IA. Baixe em PDF ou Word, sem cadastro e sem enviar seus dados.',
    short: 'Crie um currículo profissional com modelos prontos, dicas e download em PDF ou Word.',
    badge: 'CV',
    category: 'trabalho',
    keywords: ['gerador de currículo', 'criar currículo grátis', 'modelo de currículo', 'currículo primeiro emprego', 'fazer currículo online'],
    intro:
      'Crie um currículo bonito e bem escrito direto no navegador. Escolha entre vários modelos, preencha seguindo as dicas de cada campo, veja a prévia ao vivo e baixe em PDF (visual) ou Word (melhor para sistemas de triagem). Ideal para o primeiro emprego: o exemplo já vem preenchido para você entender o que colocar. Tudo acontece no seu dispositivo, sem cadastro e sem enviar seus dados.',
    steps: [
      'Na aba Conteúdo, troque os dados do exemplo pelos seus, seguindo a dica de cada campo.',
      'Na aba Modelo e cores, escolha o visual e a cor de destaque.',
      'Use a aba Melhorar com IA para gerar o resumo, descrever experiências e simular entrevistas.',
      'Acompanhe a prévia ao vivo ao lado.',
      'Clique em Baixar PDF para a versão visual ou Baixar Word para enviar em processos com triagem automática.',
    ],
    about: [
      'Um bom currículo abre portas, principalmente para quem está começando. Esta ferramenta foi feita para ser didática: cada campo traz uma explicação do que escrever e uma recomendação, e o exemplo vem preenchido em nível de entrada, com projetos, cursos e experiências que qualquer pessoa pode adaptar. Quem ainda não teve emprego formal aprende a valorizar projetos pessoais, estágios, trabalho voluntário e atividades do curso.',
      'Você escolhe entre modelos clássicos (os mais lidos por sistemas automáticos de triagem, os ATS) e modelos modernos com barra lateral e foto, muda a cor de destaque e vê o resultado na hora. O download em Word gera um arquivo em uma coluna, o formato que as plataformas de vagas leem melhor; o PDF mantém o visual escolhido para enviar direto a pessoas.',
      'Os atalhos de IA montam prompts prontos com os seus dados para você usar no ChatGPT, Claude ou Gemini: escrever o resumo, melhorar as descrições com verbos de ação, adaptar o currículo a uma vaga e até treinar entrevista. A IA ajuda a escrever melhor o que é seu — nunca invente experiências, e sempre revise o resultado.',
    ],
    faq: [
      ['É grátis mesmo? Precisa de cadastro?', 'É grátis e sem cadastro. Tudo roda no seu navegador e nada é enviado para servidores.'],
      ['Qual formato enviar, PDF ou Word?', 'Para vagas em plataformas com triagem automática (ATS), prefira o Word no modelo Clássico, que é lido mais facilmente. Para enviar direto a uma pessoa por e-mail ou WhatsApp, o PDF mantém o visual.'],
      ['Não tenho experiência. O que coloco?', 'Use projetos pessoais, trabalhos do curso, estágios, voluntariado e freelas. A ferramenta traz dicas em cada campo mostrando como descrever isso com valor.'],
      ['Meus dados ficam guardados?', 'Ficam só no seu navegador, para você não perder o que digitou. Você pode salvar um arquivo JSON para continuar depois em outro dispositivo.'],
      ['Preciso pagar pela IA?', 'A ferramenta só monta o texto do prompt. Você usa no assistente de sua preferência (ChatGPT, Claude ou Gemini), nas condições gratuitas ou pagas de cada um.'],
    ],
    privacy: 'Seu currículo é montado e salvo apenas no seu navegador. Nenhum dado, foto ou arquivo é enviado para servidores.',
  },
  {
    slug: 'buscar-filmes-e-series',
    name: 'Buscar filmes e séries',
    title: 'Buscar Filmes e Séries: Onde Assistir no Streaming',
    description:
      'Busque e descubra filmes e séries. Filtre por gênero, década e nota, veja o elenco e as recomendações e descubra onde assistir em cada streaming no Brasil.',
    short: 'Pesquise filmes e séries com filtros, recomendações e onde assistir.',
    badge: '🎬',
    category: 'cultura',
    keywords: ['buscar filmes', 'onde assistir', 'buscar séries', 'recomendação de filmes', 'filmes por streaming', 'o que assistir'],
    intro:
      'Pesquise filmes e séries num só lugar. Vá do simples ao avançado: busque pelo nome ou descubra títulos por gênero, década, nota mínima e, principalmente, por onde assistir (Netflix, Prime Video, Max, Disney+ e outros serviços no Brasil). Veja sinopse, elenco, trailer e recomendações parecidas. Os dados vêm da TMDB.',
    steps: [
      'Escolha a aba Filmes ou Séries.',
      'Busque pelo nome ou use os filtros para descobrir títulos.',
      'Em “Onde assistir”, selecione os serviços de streaming que você tem.',
      'Clique em um resultado para ver sinopse, elenco, trailer e onde assistir.',
      'Use as recomendações “Você também pode gostar” para continuar explorando.',
    ],
    about: [
      'Este buscador reúne filmes e séries com uma busca que vai além do básico. Além de pesquisar pelo nome, você descobre títulos combinando filtros como gênero, década, nota mínima e ordenação, o que ajuda a responder pedidos específicos, como “séries de comédia dos anos 2000 bem avaliadas”.',
      'O diferencial é o “onde assistir”: escolha os serviços de streaming que você assina e veja o que está disponível neles, ou abra um título para conferir em quais plataformas ele está para assinar, alugar ou comprar no Brasil. As informações de disponibilidade são da TMDB em parceria com o JustWatch e mudam conforme os catálogos.',
      'Cada filme ou série traz sinopse, nota, elenco, trailer e recomendações de títulos parecidos. É uma forma rápida de decidir o que assistir em seguida.',
    ],
    faq: [
      ['De onde vêm as informações?', 'Os dados de filmes e séries vêm da TMDB (The Movie Database), com a disponibilidade de streaming do JustWatch.'],
      ['O “onde assistir” é confiável?', 'Mostra as plataformas registradas para o Brasil, mas catálogos mudam com frequência. Confira no serviço antes de assinar.'],
      ['Posso buscar por streaming específico?', 'Sim. Use “Onde assistir” e selecione um ou mais serviços para ver o que está disponível neles.'],
      ['Dá para filtrar por gênero e época?', 'Sim. Combine gênero, década, nota mínima e ordenação para descobrir títulos sob medida.'],
      ['É grátis?', 'Sim, a ferramenta é grátis e sem cadastro.'],
    ],
    privacy: 'As buscas passam por um servidor próprio que apenas repassa a consulta à TMDB. Não guardamos suas buscas.',
  },
  {
    slug: 'gerador-de-convite',
    name: 'Gerador de convite',
    title: 'Gerador de Convite Grátis: Aniversário, Casamento e Festa',
    description:
      'Crie convites grátis de aniversário, casamento, chá e festas. Monte, baixe a imagem e compartilhe por um link que já abre o convite pronto, sem cadastro.',
    short: 'Monte convites de festa e compartilhe por link ou imagem, sem cadastro.',
    badge: '🎉',
    category: 'geradores',
    keywords: ['gerador de convite', 'convite de aniversário', 'convite de casamento', 'convite online grátis', 'convite digital', 'criar convite'],
    intro:
      'Crie convites digitais grátis para aniversário, casamento, chá de bebê, chá de panela, formatura, batizado e qualquer festa. Escolha o tipo e o tema, preencha os dados e veja a prévia na hora. Compartilhe por um link que já abre o convite montado (os dados ficam no próprio link, sem precisar de cadastro ou servidor) ou baixe a imagem para enviar no WhatsApp.',
    steps: [
      'Escolha o tipo de convite e um tema de cores.',
      'Preencha título, data, horário, local e a mensagem.',
      'Veja a prévia atualizando ao lado.',
      'Opcional: coloque um telefone para o botão “Confirmar presença” pelo WhatsApp.',
      'Clique em “Copiar link” para compartilhar, ou “Baixar imagem” para salvar.',
    ],
    about: [
      'Este gerador cria convites bonitos e simples para qualquer comemoração, direto no navegador. Você escolhe entre vários tipos (aniversário, infantil, casamento, bodas, chá de bebê, chá de panela, chá revelação, formatura, batizado e festa em geral) e vários temas de cores, e o convite é montado na hora.',
      'O diferencial é o compartilhamento: em vez de precisar de um site com login, os dados do convite ficam guardados dentro do próprio link. Quando você copia o link e manda para alguém, a pessoa abre e vê o convite completo, com botões para confirmar presença no WhatsApp e ver como chegar no mapa. Nada é salvo em servidor.',
      'Dá para baixar o convite como imagem (PNG) para postar nos stories ou enviar em grupos. Tudo é grátis, sem marca d’água e sem cadastro.',
    ],
    faq: [
      ['Como funciona o compartilhamento por link?', 'Os dados do convite são codificados dentro do próprio endereço (a parte depois de “?c=”). Quem abre o link vê o convite montado, sem precisar de conta nem de servidor.'],
      ['Preciso pagar ou me cadastrar?', 'Não. É grátis, sem cadastro e sem marca d’água.'],
      ['Os convidados conseguem confirmar presença?', 'Sim, se você preencher um telefone no campo de confirmação. O convite ganha um botão que abre o WhatsApp já com a confirmação.'],
      ['Posso editar o convite depois?', 'Sim. Enquanto estiver no mesmo navegador, seus dados ficam salvos. Para mudar um convite já enviado, edite aqui e compartilhe o novo link.'],
      ['O link ficou muito grande. É normal?', 'Pode acontecer com textos longos, porque tudo vai dentro do link. Encurte a mensagem ou use um encurtador de links se precisar.'],
    ],
    privacy: 'O convite é montado só no seu navegador e os dados ficam dentro do link que você gera. Nada é enviado nem guardado em servidores.',
  },
  {
    slug: 'medir-objeto-na-foto',
    name: 'Medir objeto na foto',
    title: 'Medir Objeto na Foto com uma Moeda de Referência',
    description:
      'Descubra o tamanho de um objeto pela foto usando uma referência de tamanho conhecido, como uma moeda, cartão ou folha A4. Grátis e no navegador.',
    short: 'Meça o tamanho de um objeto na foto usando uma moeda ou cartão como referência.',
    badge: '📏',
    category: 'dia',
    keywords: ['medir objeto na foto', 'medir pela foto', 'tamanho pela moeda', 'régua pela câmera', 'medir sem régua'],
    intro:
      'Descubra o tamanho de qualquer objeto usando uma foto, sem régua. Coloque ao lado do objeto algo de tamanho conhecido — uma moeda, um cartão de banco ou uma folha A4 —, marque essa referência e depois arraste sobre o objeto para ver a medida em centímetros, milímetros ou polegadas. Tudo acontece no seu navegador.',
    steps: [
      'Fotografe o objeto de frente, com a referência (moeda, cartão ou A4) do lado, no mesmo plano.',
      'Envie a foto e escolha qual referência você usou.',
      'Arraste sobre a referência para marcar o tamanho conhecido.',
      'Arraste sobre o objeto para ver o tamanho; repita para medir outras partes.',
      'Troque a unidade (cm, mm ou polegadas) quando quiser.',
    ],
    about: [
      'Esta ferramenta mede objetos por comparação: sabendo o tamanho real de uma referência que aparece na foto, ela calcula o tamanho do objeto pela proporção de pixels. É útil para saber o tamanho de uma peça, uma ferramenta, uma joia, um machucado, um móvel pequeno ou qualquer coisa quando você não tem uma régua à mão.',
      'Use referências comuns e precisas: a moeda de R$ 1,00 tem 27 mm de diâmetro, um cartão de banco tem 85,6 mm no lado maior e uma folha A4 tem 297 mm × 210 mm. Quanto maior e mais nítida a referência na foto, melhor a precisão.',
      'Para um resultado bom, fotografe de frente (a câmera paralela ao objeto) e mantenha a referência no mesmo plano do que você quer medir. Fotos tiradas em ângulo distorcem as proporções e erram a medida. Nada é enviado para servidores: a imagem fica só no seu aparelho.',
    ],
    faq: [
      ['Preciso de uma régua?', 'Não. Basta colocar na foto algo de tamanho conhecido, como uma moeda ou um cartão, para servir de referência.'],
      ['Qual referência dá o melhor resultado?', 'Quanto maior e mais nítida, melhor. Um cartão de banco ou uma folha A4 costumam dar mais precisão que uma moeda pequena.'],
      ['Por que a medida às vezes erra?', 'Quase sempre por causa do ângulo. A câmera precisa estar de frente e a referência no mesmo plano do objeto; fotos inclinadas distorcem.'],
      ['Minha foto é enviada para algum lugar?', 'Não. Tudo é processado no seu navegador e nada é enviado para servidores.'],
      ['Funciona no celular?', 'Sim. Dá para tirar a foto na hora e arrastar o dedo para marcar a referência e medir.'],
    ],
    privacy: 'A foto é processada só no seu navegador. Nenhuma imagem é enviada para servidores.',
  },
  {
    slug: 'restaurantes-perto-de-mim',
    name: 'Restaurantes perto de mim',
    title: 'Restaurantes Perto de Mim: Comida por Região',
    description:
      'Ache restaurantes, lanchonetes, cafés, bares e padarias perto de você ou de uma região, filtrando por tipo de comida. Grátis, com mapa aberto.',
    short: 'Ache restaurantes e lugares para comer perto de você, por tipo de comida.',
    badge: '🍽️',
    category: 'comer',
    keywords: ['restaurantes perto de mim', 'onde comer perto', 'comida por região', 'lanchonete perto', 'restaurante por tipo de comida'],
    intro:
      'Ache rápido onde comer: escolha o tipo (restaurante, lanche, pizza, japonesa, churrascaria, café, bar, padaria, sorveteria e mais) e a busca abre direto no Google Maps, perto da sua localização ou na cidade/bairro que você digitar — com avaliações, fotos, horário e rota de cada lugar.',
    steps: [
      'Toque em “Usar minha localização” ou digite a cidade/bairro.',
      'Escolha o tipo de comida nos botões.',
      'A busca abre no Google Maps já na sua região.',
      'Lá você vê nota, fotos, horário e traça a rota.',
      'Precisa de algo específico? Use o campo “Procurar outra coisa”.',
    ],
    about: [
      'Em vez de depender de uma base limitada, esta ferramenta monta a busca certa e abre no Google Maps, que tem o catálogo mais completo de lugares para comer, com avaliações, fotos e horários atualizados. Você escolhe o tipo de comida e a região, e já cai na lista pronta no mapa.',
      'Dá para usar a sua localização (para ver o que está perto) ou digitar uma cidade/bairro para pesquisar em outro lugar — útil para planejar uma viagem ou um passeio. Há atalhos para as buscas mais comuns (pizza, hambúrguer, marmita, self-service, açaí, padaria…) e um campo livre para procurar qualquer coisa.',
      'É grátis, sem cadastro e não guarda nada. Sua localização, se você permitir, é usada apenas no seu navegador para centralizar a busca no mapa.',
    ],
    faq: [
      ['Como funciona?', 'A ferramenta monta o endereço de busca do Google Maps com o tipo de comida e a sua região, e abre em uma nova aba (ou no app do Maps).'],
      ['Preciso pagar ou me cadastrar?', 'Não. É grátis e sem cadastro.'],
      ['Mostra avaliações e fotos?', 'Sim, porque a busca abre no Google Maps, que tem nota, fotos, horários e rota de cada lugar.'],
      ['Minha localização é enviada para algum servidor?', 'Não. Ela é usada só no seu navegador para centralizar a busca no mapa.'],
      ['Posso procurar em outra cidade?', 'Sim. Digite a cidade ou o bairro no campo indicado antes de escolher o tipo de comida.'],
    ],
    privacy: 'A ferramenta apenas abre a busca no Google Maps. Sua localização, se permitida, é usada só no seu navegador para centralizar a busca; nada é enviado nem guardado.',
  },
]

export const getTool = (slug) => tools.find((tool) => tool.slug === slug)
