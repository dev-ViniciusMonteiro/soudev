// Comandos de AÇÃO do MEI na Mão (por voz ou escritos). As PERGUNTAS ficam em assistente.js.
// interpretar() devolve { acao, ... }. O contexto ('venda', 'pagamento', 'nota', 'geral') muda o que faz sentido.

import { acharProduto, lerValor, normalizar, numerosPorExtenso } from './voz'

const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na', 'para', 'pra', 'cliente', 'com'])

/** Cliente citado na frase (nome completo ou primeiro nome). */
export function acharCliente(trecho, clientes) {
  const t = ` ${normalizar(trecho)} `
  let melhor = null
  for (const c of clientes) {
    const partes = normalizar(c.nome)
      .split(' ')
      .filter((p) => p.length > 2 && !PARADAS.has(p))
    if (!partes.length) continue
    const acertos = partes.filter((p) => t.includes(` ${p} `)).length
    // Precisa do primeiro nome ("a Ana", "o Escritório Silva"): só o sobrenome confunde ("Dias", "Lima").
    if (!acertos || !t.includes(` ${partes[0]} `)) continue
    const nota = acertos / partes.length + 0.5
    if (!melhor || nota > melhor.nota) melhor = { cliente: c, nota }
  }
  return melhor && melhor.nota >= 0.5 ? melhor.cliente : null
}

const TELAS = [
  ['venda-facil', /\b(vender|venda|caixa|pdv)\b/],
  ['gastos', /\b(gastos?|despesas?)\b/],
  ['produtos-facil', /\b(produtos?|estoque|cardapio|mercadorias?)\b/],
  ['mei', /\b(central|mei|das|limite|relatorio|declaracao)\b/],
  ['vendas', /\b(historico|vendas anteriores|notas?)\b/],
  ['tabela:clientes', /\bclientes?\b/],
  ['config', /\b(configurac\w*|ajustes)\b/],
  ['facil', /\b(inicio|comeco|principal|home)\b/],
]

const FORMA = (t) => (/\bpix\b/.test(t) ? 'pix' : /\b(dinheiro|especie)\b/.test(t) ? 'dinheiro' : /\bcredito\b/.test(t) ? 'credito' : /\b(debito|cartao)\b/.test(t) ? 'debito' : /\bfiado\b|\bdepois\b|\bpendura\b/.test(t) ? 'fiado' : null)

/**
 * @param texto o que a pessoa disse ou escreveu
 * @param opts { produtos, clientes, contexto: 'geral' | 'venda' | 'pagamento' | 'nota' }
 */
export function interpretar(texto, { produtos = [], clientes = [], contexto = 'geral' } = {}) {
  const t = numerosPorExtenso(texto)
  const tem = (re) => re.test(t)
  if (!t) return { acao: 'desconhecido' }

  // Ajuda
  if (tem(/\b(o que (eu )?(posso|consigo|da para) (perguntar|falar|pedir|fazer|dizer|mandar)|ajuda|comandos|o que (voce|vc) (sabe|faz|entende))\b/)) return { acao: 'ajuda' }

  // Navegar: "abrir gastos", "ir para produtos", "tela de clientes"
  if (tem(/\b(abr[ea]|abrir|vai|ir|entra|entrar|leva|levar|volta|voltar|tela)\b( para| pra| a| o| na| no| ao| em| de)*\b/) && !tem(/\b(vendi|gastei|cadastr|nota)\w*/)) {
    const resto = t.replace(/\b(abr[ea]|abrir|vai|ir|entra|entrar|leva|levar|me|volta|voltar|tela|para|pra|a|o|na|no|ao|em|de|do|da)\b/g, ' ')
    const tela = TELAS.find(([, re]) => re.test(resto))
    if (tela) return { acao: 'ir', tela: tela[0] }
  }

  // Nova venda / cancelar venda
  if (tem(/\b(nova venda|outra venda|proxima venda|comecar (uma )?venda|proximo cliente)\b/)) return { acao: 'nova_venda' }
  if (tem(/\b(limpa|limpar|zera|zerar|apaga tudo|cancela|cancelar|desiste|desistir)\b/) && !tem(/\b(nota|gasto)\b/)) return { acao: 'limpar' }

  // Cadastrar produto: "cadastrar produto pão de queijo por 5 reais", "novo serviço corte por 30"
  const novoProd = t.match(/\b(?:cadastra|cadastrar|cadastre|novo|nova|adiciona|adicionar|criar|cria)\s+(?:o |um |uma )?(produto|servico)\s+(.+?)\s+(?:por|a|de|custa|custando|preco|valor|que custa|no valor de)?\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|real)?(?:\s*e\s*(\d{1,2})\s*centavos?)?/)
  if (novoProd) {
    const preco = Number(novoProd[3].replace(',', '.')) + (novoProd[4] ? Number(novoProd[4]) / 100 : 0)
    const nome = original(texto, novoProd[2])
    return { acao: 'novo_produto', nome, preco, tipo: novoProd[1] === 'servico' ? 'servico' : 'produto' }
  }

  // Mudar preço: "muda o preço da coxinha para 8 reais", "a coxinha agora custa 8"
  if (tem(/\b(preco|custa|custar|valor)\b/) && tem(/\b(muda|mudar|altera|alterar|troca|trocar|atualiza|atualizar|agora|passa|passar|coloca|colocar|novo)\b/)) {
    const valor = lerValor(t.split(/\b(para|pra|custa|custar|por)\b/).slice(-1)[0])
    const produto = acharProduto(t.replace(/\b(preco|custa|custar|valor|muda|mudar|altera|alterar|troca|trocar|atualiza|atualizar|agora|passa|passar|coloca|colocar|novo|reais?)\b/g, ' '), produtos)
    if (produto && valor) return { acao: 'preco', produto, preco: valor }
  }

  // Cadastrar cliente: "cadastrar cliente Maria Souza telefone 11 99999 8888"
  const novoCli = t.match(/\b(?:cadastra|cadastrar|cadastre|novo|nova|adiciona|adicionar|criar|cria)\s+(?:o |a |um |uma )?(?:cliente)\s+([a-z ]+?)(?:\s+(?:telefone|celular|whatsapp|zap|fone|numero|tel)\b(.*))?$/)
  if (novoCli) {
    const telefone = (novoCli[2] || '').replace(/\D/g, '')
    return { acao: 'novo_cliente', nome: original(texto, novoCli[1].trim()), telefone: telefone.length >= 10 ? telefone : '' }
  }

  // Estoque: "chegaram 24 refrigerantes", "entrada de 10 brownies", "repor 20 águas"
  if (tem(/\b(chegou|chegaram|entrou|entraram|entrada|repor|repus|reponho|abastec\w*|coloquei no estoque|comprei)\b/) && !tem(/\b(reais?|real|r\$|pix|dinheiro|cartao)\b/)) {
    const itens = itensDaFrase(t.replace(/\b(chegou|chegaram|entrou|entraram|entrada|repor|repus|reponho|abastec\w*|coloquei|no estoque|estoque|comprei|mais)\b/g, ' '), produtos)
    if (itens.length) return { acao: 'entrada', itens }
  }

  // DAS: "paguei o DAS", "marcar DAS como pago" (o "já paguei o DAS?" é pergunta)
  if (tem(/\b(paguei|pagar|marca|marcar|registra|registrar)\b.*\bdas\b|\bdas\b.*\bpago\b/) && !tem(/^ja\b|\bja paguei\b|\bquando\b|\bquanto\b/)) return { acao: 'das_pago' }

  // Apagar último gasto
  if (tem(/\b(apaga|apagar|desfaz|desfazer|remove|remover|tira|tirar|exclui|excluir)\b.*\bultimo gasto\b/)) return { acao: 'apagar_gasto' }

  // Relatório
  if (tem(/\b(imprim\w*|gera|gerar|faz|fazer|tira|tirar|mostra|mostrar)\b.*\brelatorio\b/)) return { acao: 'relatorio' }

  // Gasto: "gastei 50 reais de luz"
  if (tem(/\b(gastei|paguei|despesa|comprei|gasto)\b/) && contexto !== 'pagamento') {
    const valor = lerValor(t)
    if (valor) {
      const original_ = new Map(String(texto).split(/\s+/).map((w) => [normalizar(w), w.replace(/[^\p{L}\p{N}-]/gu, '')]))
      const descricao = (
        t
          .split(/\b(?:com|de|do|da|no|na|em)\b/)
          .slice(1)
          .join(' ')
          .replace(/\d+([.,]\d+)?|reais?|centavos?/g, '')
          .trim()
          .split(/\s+/)
          .map((w) => original_.get(w) || w)
          .join(' ') || 'Gasto'
      ).replace(/^./, (c) => c.toUpperCase())
      return { acao: 'gasto', valor, descricao, categoria: categoriaGasto(t) }
    }
  }

  // Nota fiscal: "emitir nota", "com nota", "CPF 123...", "sem nota"
  // CPF ou CNPJ falado ou escrito com pontos, traços e espaços.
  const doc = (String(texto).match(/\d[\d.\-/\s]{9,22}\d/)?.[0] || '').replace(/\D/g, '')
  const docValido = doc.length === 11 || doc.length === 14 ? doc : ''
  if (tem(/\bsem nota\b|\bnao precisa\b(?!.*\bnota\b.*\bprecisa)/) && contexto === 'nota') return { acao: 'sem_nota' }
  if (tem(/\bnota\b/) && tem(/\b(emit\w*|tira|tirar|faz|fazer|gera|gerar|com|quero|precisa|dar|da)\b/) && !tem(/\b(quantas|quais|quando|preciso emitir|tenho que)\b/)) return { acao: 'nota', documento: docValido }
  if (docValido && tem(/\b(cpf|cnpj)\b/)) return { acao: 'nota', documento: docValido }

  // ----- Dentro da venda -----
  if (contexto === 'venda' || contexto === 'pagamento' || contexto === 'nota') {
    if (tem(/\b(quanto (deu|ficou|da|e|esta)|qual (o|e o) total|^total$|valor total)\b/)) return { acao: 'total' }
    // Cliente da venda: "cliente Ana", "é para o Bruno"
    if (tem(/\b(cliente|para|pra|e da|e do|nome)\b/)) {
      const cliente = acharCliente(t, clientes)
      if (cliente && !acharProduto(t.replace(new RegExp(normalizar(cliente.nome).split(' ')[0], 'g'), ''), produtos)) return { acao: 'cliente', cliente, forma: FORMA(t) }
    }
    // Desconto: "desconto de 10%", "dá 5 reais de desconto"
    if (tem(/\bdesconto\b|\babate\b|\babater\b/)) {
      const n = Number(t.match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.'))
      if (n > 0) return { acao: 'desconto', valor: n, porcento: /%/.test(String(texto)) || tem(/\bpor ?cento\b/) }
    }
    // Tirar item: "tira o café", "remove 2 coxinhas"
    if (tem(/\b(tira|tirar|remove|remover|retira|retirar|apaga|apagar|exclui|excluir|sem)\b/)) {
      const qtd = Number(t.match(/\b(\d+)\b/)?.[1]) || null
      const produto = acharProduto(t.replace(/\b(tira|tirar|remove|remover|retira|retirar|apaga|apagar|exclui|excluir|sem)\b/g, ' '), produtos)
      if (produto) return { acao: 'remover', produto, qtd }
    }
    // Quantidade: "muda a coxinha para 3", "são 5 brigadeiros", "coloca 4 cafés no total"
    const mudaQtd = t.match(/\b(?:muda|mudar|troca|trocar|deixa|deixar|corrige|corrigir|sao|serao)\b(.*?)\b(?:para|pra|em)?\s*(\d+)\b(.*)$/)
    if (mudaQtd && tem(/\b(muda|mudar|troca|trocar|deixa|deixar|corrige|corrigir|sao|serao)\b/)) {
      const produto = acharProduto(`${mudaQtd[1]} ${mudaQtd[3]}`, produtos)
      if (produto) return { acao: 'quantidade', produto, qtd: Number(mudaQtd[2]) }
    }
    // Pagamento: "pagou no pix", "pagou com 50 em dinheiro", "recebi 100", "fiado"
    const forma = FORMA(t)
    if (forma || tem(/\b(recebi|pagou com|deu|me deu|troco para|troco pra)\b/)) {
      const recebido = tem(/\b(com|recebi|deu|troco)\b/) ? lerValor(t.replace(/\b(pix|credito|debito)\b/g, '')) : null
      if (forma || recebido) {
        const itens = forma ? [] : itensDaFrase(t, produtos)
        if (!itens.length) return { acao: 'pagar', forma: forma || 'dinheiro', recebido }
      }
    }
    if (tem(/\b(finaliza|finalizar|fecha|fechar|conclui|concluir|confirma|confirmar|pronto|terminei|terminar|acabou|so isso|e isso|encerra|encerrar)\b/)) return { acao: 'finalizar' }
  }

  // Vender: "vendi 2 coxinhas e 1 café", "mais um refrigerante"
  const itens = itensDaFrase(t.replace(/\b(vendi|vender|vende|venda|adiciona|adicionar|coloca|colocar|mais|bota|botar|quero|me ve|me da|manda|poe|por favor|tambem)\b/g, ' '), produtos)
  if (itens.length) return { acao: 'vender', itens, forma: FORMA(t) }
  return { acao: 'desconhecido' }
}

function itensDaFrase(t, produtos) {
  const itens = []
  for (const parte of t.split(/,|\be\b/).map((p) => p.trim()).filter(Boolean)) {
    const qtd = Number(parte.match(/\b(\d+(?:[.,]\d+)?)\b/)?.[1]?.replace(',', '.') || 1)
    const produto = acharProduto(parte, produtos)
    if (produto) itens.push({ produto, qtd: qtd > 0 && qtd < 1000 ? qtd : 1 })
  }
  return itens
}

function categoriaGasto(t) {
  const CATS = [
    ['contas', /\b(luz|energia|agua|internet|telefone|celular|gas)\b/],
    ['aluguel', /\baluguel\b/],
    ['impostos', /\b(das|imposto|taxa|inss)\b/],
    ['fornecedor', /\b(mercadoria|ingrediente|estoque|fornecedor|material|produto|embalage)/],
    ['marketing', /\b(anuncio|propaganda|instagram|marketing|panfleto|divulgacao)\b/],
    ['outros', /\b(gasolina|combustivel|uber|onibus|transporte|frete|entrega)\b/],
  ]
  return CATS.find(([, re]) => re.test(t))?.[0] ?? 'outros'
}

/** Recupera a grafia original (acentos, maiúsculas) de um trecho normalizado. */
function original(texto, trecho) {
  const mapa = new Map(String(texto).split(/\s+/).map((w) => [normalizar(w), w.replace(/[^\p{L}\p{N}-]/gu, '')]))
  const s = trecho
    .split(/\s+/)
    .map((w) => mapa.get(w) || w)
    .join(' ')
  return s.replace(/^./, (c) => c.toUpperCase())
}
