// Blocos que montam a página da loja e os modelos prontos (cada modelo = tema + ordem de blocos).

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).slice(0, 12)

export const BLOCOS = {
  cabecalho: { nome: 'Cabeçalho', icone: '🏷️', dica: 'Logo, nome e descrição da loja', padrao: { alinhamento: 'centro', tamanhoLogo: 'm', mostrarNome: true, mostrarDescricao: true } },
  capa: { nome: 'Capa', icone: '🖼️', dica: 'Banner grande com título e botão', padrao: { titulo: '', subtitulo: '', altura: 'media', botao: 'Ver produtos' } },
  aviso: { nome: 'Aviso', icone: '📣', dica: 'Faixa com promoção ou recado', padrao: { texto: 'Frete grátis acima de R$ 100', estilo: 'cor' } },
  busca: { nome: 'Busca', icone: '🔎', dica: 'Campo para o cliente procurar', padrao: { placeholder: 'Buscar produto…' } },
  categorias: { nome: 'Categorias', icone: '🗂️', dica: 'Filtro por categoria', padrao: { estilo: 'pilulas' } },
  destaques: { nome: 'Destaques', icone: '⭐', dica: 'Produtos marcados como destaque', padrao: { titulo: 'Mais pedidos', layout: 'carrossel' } },
  produtos: { nome: 'Produtos', icone: '🛍️', dica: 'Vitrine (grade, lista, carrossel…)', padrao: { titulo: 'Produtos', layout: 'grade', colunas: 2, categoria: '', mostrarDescricao: false } },
  texto: { nome: 'Texto', icone: '📝', dica: 'Sobre a loja, regras, recado', padrao: { titulo: 'Sobre nós', texto: 'Conte a história da sua loja, como funciona a entrega e as formas de pagamento.', alinhamento: 'esquerda' } },
  imagem: { nome: 'Imagem', icone: '🌄', dica: 'Foto solta com legenda', padrao: { imagem: null, legenda: '', formato: 'largo' } },
  contato: { nome: 'Contato', icone: '📍', dica: 'WhatsApp, Instagram, endereço, horário', padrao: { titulo: 'Fale com a gente', mostrarMapa: false } },
  rodape: { nome: 'Rodapé', icone: '🔚', dica: 'Fecho da página', padrao: { texto: '' } },
}

export const novoBloco = (tipo, opcoes = {}) => ({ id: uid(), tipo, visivel: true, opcoes: { ...BLOCOS[tipo].padrao, ...opcoes } })

export const CORES = ['#ff5a36', '#ff4f8b', '#8b5cf6', '#2563eb', '#0ea5e9', '#16a34a', '#a3ff12', '#f59e0b', '#b45309', '#111111']

export const FUNDOS = [
  { id: 'claro', nome: 'Claro' },
  { id: 'creme', nome: 'Creme' },
  { id: 'escuro', nome: 'Escuro' },
  { id: 'preto', nome: 'Preto' },
]
export const FONTES = [
  { id: 'moderna', nome: 'Moderna' },
  { id: 'elegante', nome: 'Elegante' },
  { id: 'divertida', nome: 'Divertida' },
  { id: 'tech', nome: 'Tech' },
]

export const MODELOS = [
  {
    id: 'vitrine',
    nome: 'Vitrine',
    desc: 'Capa grande, destaques e grade de produtos.',
    tema: { cor: '#ff5a36', fundo: 'claro', fonte: 'moderna', cantos: 'suave', cartao: 'sombra' },
    blocos: () => [novoBloco('cabecalho'), novoBloco('capa'), novoBloco('busca'), novoBloco('categorias'), novoBloco('destaques'), novoBloco('produtos', { titulo: 'Todos os produtos' }), novoBloco('contato'), novoBloco('rodape')],
  },
  {
    id: 'cardapio',
    nome: 'Cardápio',
    desc: 'Lista com descrição, ótima para comida e serviços.',
    tema: { cor: '#16a34a', fundo: 'claro', fonte: 'moderna', cantos: 'suave', cartao: 'borda' },
    blocos: () => [novoBloco('cabecalho', { alinhamento: 'esquerda' }), novoBloco('aviso', { texto: 'Pedidos até as 22h · Entrega na região', estilo: 'suave' }), novoBloco('busca'), novoBloco('categorias', { estilo: 'abas' }), novoBloco('produtos', { titulo: 'Cardápio', layout: 'lista', mostrarDescricao: true }), novoBloco('contato'), novoBloco('rodape')],
  },
  {
    id: 'docinho',
    nome: 'Docinho',
    desc: 'Fofo e redondinho, com fotos grandes.',
    tema: { cor: '#ff4f8b', fundo: 'creme', fonte: 'divertida', cantos: 'redondo', cartao: 'sombra' },
    blocos: () => [novoBloco('cabecalho', { tamanhoLogo: 'g' }), novoBloco('aviso', { texto: 'Encomendas com 2 dias de antecedência 💕' }), novoBloco('destaques', { titulo: 'Os queridinhos' }), novoBloco('categorias'), novoBloco('produtos', { titulo: 'Cardápio de doces', layout: 'grande' }), novoBloco('texto', { titulo: 'Feito com carinho' }), novoBloco('contato'), novoBloco('rodape')],
  },
  {
    id: 'noite',
    nome: 'Noite',
    desc: 'Escuro e neon, para moda, tech e games.',
    tema: { cor: '#a3ff12', fundo: 'preto', fonte: 'tech', cantos: 'redondo', cartao: 'borda' },
    blocos: () => [novoBloco('aviso', { texto: 'NOVA COLEÇÃO NO AR', estilo: 'faixa' }), novoBloco('cabecalho'), novoBloco('capa', { altura: 'alta' }), novoBloco('destaques', { titulo: 'Em alta', layout: 'grade' }), novoBloco('produtos', { titulo: 'Catálogo', colunas: 2 }), novoBloco('contato'), novoBloco('rodape')],
  },
  {
    id: 'minimal',
    nome: 'Minimal',
    desc: 'Elegante e limpo, para boutique e decoração.',
    tema: { cor: '#111111', fundo: 'creme', fonte: 'elegante', cantos: 'reto', cartao: 'plano' },
    blocos: () => [novoBloco('cabecalho', { alinhamento: 'esquerda' }), novoBloco('texto', { titulo: '', texto: 'Peças escolhidas a dedo. Escolha, monte seu pedido e finalize pelo WhatsApp.', alinhamento: 'centro' }), novoBloco('categorias', { estilo: 'abas' }), novoBloco('produtos', { titulo: '', colunas: 2 }), novoBloco('contato'), novoBloco('rodape')],
  },
  {
    id: 'zero',
    nome: 'Do zero',
    desc: 'Só o essencial. Monte a página do seu jeito.',
    tema: { cor: '#2563eb', fundo: 'claro', fonte: 'moderna', cantos: 'suave', cartao: 'sombra' },
    blocos: () => [novoBloco('cabecalho'), novoBloco('produtos')],
  },
]

export function configDoModelo(id, base = {}) {
  const m = MODELOS.find((x) => x.id === id) || MODELOS[0]
  return { ...base, modelo: m.id, tema: { ...m.tema }, blocos: m.blocos() }
}

export const PRODUTOS_EXEMPLO = [
  { nome: 'Produto exemplo 1', preco: 2990, categoria: 'Novidades', descricao: 'Troque a foto, o nome e o preço. Descreva tamanho, sabor ou material.', destaque: true },
  { nome: 'Produto exemplo 2', preco: 4990, preco_de: 5990, categoria: 'Novidades', descricao: 'Este está em promoção: o preço antigo aparece riscado.', destaque: true },
  { nome: 'Produto exemplo 3', preco: 1500, categoria: 'Mais vendidos', descricao: 'Apague os exemplos quando cadastrar os seus.' },
]
