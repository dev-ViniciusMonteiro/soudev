'use client'

// Barra de comando do MEI na Mão: microfone, campo para escrever e "Tudo o que posso pedir".
// Entende perguntas (assistente.js) e ações (comandos.js). Cada tela pode tratar ações próprias em onLocal.

import { useMemo, useRef, useState } from 'react'
import { Modal, useConfig, useSistema, useTabela } from '../base'
import { imprimir } from '../comuns'
import { NotaFiscal } from '../Fiscal'
import { CATALOGO, PERGUNTAS_PRONTAS, ehPergunta, periodoDe, perguntar } from '@/lib/sistemas/assistente'
import { interpretar } from '@/lib/sistemas/comandos'
import { proximoDAS, reaisFalado, receitasDoMes, valorDAS } from '@/lib/sistemas/mei'
import { brl, hojeISO, num, round2 } from '@/lib/sistemas/regras'
import { falar, falaDisponivel, ouvir, vozDisponivel } from '@/lib/sistemas/voz'

// Itens ditos fora da tela de venda ("vendi 2 coxinhas") seguem para ela.
export const pendente = { carrinho: null }

export function useDados() {
  const cfg = useConfig()
  const vendas = useTabela('vendas')
  const lancamentos = useTabela('lancamentos')
  const produtos = useTabela('produtos')
  const clientes = useTabela('clientes')
  const movs = useTabela('estoque_mov')
  return useMemo(() => ({ vendas, lancamentos, produtos, clientes, movs, cfg }), [vendas, lancamentos, produtos, clientes, movs, cfg])
}

export function registrarGasto(banco, { valor, descricao, categoria, ref_id = '' }) {
  const hoje = hojeISO()
  return banco.salvar('lancamentos', { tipo: 'despesa', descricao: descricao || 'Gasto', valor: round2(valor), vencimento: hoje, pago_em: hoje, forma: 'dinheiro', categoria: categoria || 'outros', ref_id })
}

export function competenciaDAS() {
  const prox = proximoDAS()
  return `${prox.competencia.getFullYear()}-${String(prox.competencia.getMonth() + 1).padStart(2, '0')}`
}

/** Relatório Mensal das Receitas Brutas pronto para imprimir e assinar. */
export function imprimirRelatorioMensal(cfg, vendas, produtos, mes) {
  const rec = receitasDoMes(vendas, produtos, mes)
  const [a, m] = mes.split('-')
  const esc = (s) => String(s ?? '').replace(/</g, '&lt;')
  const linha = (rot, v) => `<tr><td>${rot}</td><td class="n">${brl(v)}</td></tr>`
  imprimir(
    `<h1>Relatório Mensal das Receitas Brutas</h1><p class="muted">Período de apuração: ${m}/${a}</p>
    <div class="grade"><div>CNPJ: <b>${esc(cfg.documento) || '________________'}</b></div><div>Empreendedor: <b>${esc(cfg.empresa_nome)}</b></div></div>
    <h2>Receita bruta mensal: revenda de mercadorias (comércio)</h2><table>${linha('I - Revenda de mercadorias com dispensa de emissão de documento fiscal', rec.comercioSemNota)}${linha('II - Revenda de mercadorias com documento fiscal emitido', rec.comercioComNota)}${linha('III - Total das receitas com revenda de mercadorias (I + II)', rec.comercio)}</table>
    <h2>Receita bruta mensal: venda de produtos industrializados (indústria)</h2><table>${linha('IV - Venda de produtos industrializados com dispensa de emissão de documento fiscal', 0)}${linha('V - Venda de produtos industrializados com documento fiscal emitido', 0)}${linha('VI - Total das receitas com venda de produtos industrializados (IV + V)', 0)}</table>
    <h2>Receita bruta mensal: prestação de serviços</h2><table>${linha('VII - Receita com prestação de serviços com dispensa de emissão de documento fiscal', rec.servicoSemNota)}${linha('VIII - Receita com prestação de serviços com documento fiscal emitido', rec.servicoComNota)}${linha('IX - Total das receitas com prestação de serviços (VII + VIII)', rec.servico)}</table>
    <table><tr><td class="total">X - Total geral das receitas brutas no mês (III + VI + IX)</td><td class="n total">${brl(rec.total)}</td></tr></table>
    <p class="muted">Anexe a este relatório os documentos fiscais de compras de mercadorias e insumos e as notas fiscais emitidas no período. Gerado pelo MEI na Mão a partir das vendas registradas; confira antes de assinar.</p>
    <div class="ass"><div>Local e data</div><div>Assinatura do empreendedor</div></div>`,
    { titulo: `Relatório mensal ${m}-${a}` },
  )
  return rec
}

const resp = (tela, fala = tela, lista) => ({ tela, fala, lista })

/**
 * Barra de comando. onLocal(cmd, texto) trata ações da tela e devolve uma resposta,
 * true (tratou sem resposta) ou undefined (deixa para as ações gerais).
 */
export function BarraComando({ contexto = 'geral', onLocal, exemplos, mostrarAtalhos = false }) {
  const { banco, ir } = useSistema()
  const dados = useDados()
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [parcial, setParcial] = useState('')
  const [resposta, setResposta] = useState(null)
  const [catalogo, setCatalogo] = useState(false)
  const [nota, setNota] = useState(null)
  const campo = useRef(null)
  const ativos = dados.produtos.filter((p) => p.ativo !== false)

  const responder = (r, pergunta) => {
    if (!r || r === true) return
    setResposta({ ...r, pergunta })
    falar(r.fala)
  }

  const global = (cmd, frase) => {
    switch (cmd.acao) {
      case 'ajuda':
        setCatalogo(true)
        return resp('Abri a lista com tudo o que você pode perguntar ou mandar fazer. Toque em qualquer exemplo.')
      case 'ir':
        ir(cmd.tela)
        return null
      case 'vender':
        pendente.carrinho = cmd.itens
        ir('venda-facil')
        return null
      case 'nova_venda':
        ir('venda-facil')
        return null
      case 'gasto': {
        registrarGasto(banco, cmd)
        return resp(`Pronto, anotei um gasto de ${brl(cmd.valor)}: ${cmd.descricao}.`, `Pronto, anotei um gasto de ${reaisFalado(cmd.valor)}: ${cmd.descricao}.`)
      }
      case 'apagar_gasto': {
        const ultimo = [...dados.lancamentos].filter((l) => l.tipo === 'despesa').sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))[0]
        if (!ultimo) return resp('Não há gastos para apagar.')
        banco.excluir('lancamentos', ultimo.id)
        return resp(`Apaguei o último gasto: ${ultimo.descricao}, ${brl(ultimo.valor)}.`, `Apaguei o último gasto: ${ultimo.descricao}, ${reaisFalado(ultimo.valor)}.`)
      }
      case 'novo_produto': {
        const existe = ativos.find((p) => p.nome.toLowerCase() === cmd.nome.toLowerCase())
        if (existe) return resp(`${existe.nome} já está cadastrado, por ${brl(existe.preco)}. Para mudar, diga: mudar o preço de ${existe.nome} para tantos reais.`)
        banco.salvar('produtos', { nome: cmd.nome, preco: cmd.preco, tipo: cmd.tipo, ativo: true, publicado: true })
        return resp(`Cadastrei ${cmd.tipo === 'servico' ? 'o serviço' : 'o produto'} ${cmd.nome} por ${brl(cmd.preco)}.`, `Cadastrei ${cmd.nome} por ${reaisFalado(cmd.preco)}.`)
      }
      case 'preco': {
        const antes = cmd.produto.preco
        banco.salvar('produtos', { id: cmd.produto.id, preco: cmd.preco })
        return resp(`${cmd.produto.nome}: preço mudou de ${brl(antes)} para ${brl(cmd.preco)}.`, `Pronto, ${cmd.produto.nome} agora custa ${reaisFalado(cmd.preco)}.`)
      }
      case 'novo_cliente': {
        banco.salvar('clientes', { nome: cmd.nome, telefone: cmd.telefone })
        return resp(`Cadastrei ${cmd.nome}${cmd.telefone ? `, telefone ${cmd.telefone}` : ''}.`)
      }
      case 'entrada': {
        const pares = []
        for (const { produto, qtd } of cmd.itens) {
          if (!produto.controla_estoque) pares.push(['produtos', { id: produto.id, controla_estoque: true }])
          pares.push(['estoque_mov', { produto_id: produto.id, qtd, motivo: 'compra', custo_unit: produto.custo || '' }])
        }
        banco.salvarVarios(pares)
        return resp(`Entrada registrada: ${cmd.itens.map((i) => `${num(i.qtd, 3)} ${i.produto.nome}`).join(', ')}.`)
      }
      case 'das_pago': {
        const comp = competenciaDAS()
        if (dados.lancamentos.some((l) => l.ref_id === `das:${comp}`)) return resp(`O DAS de ${comp.slice(5)}/${comp.slice(0, 4)} já estava marcado como pago.`)
        const v = valorDAS(dados.cfg.mei_atividade).total
        registrarGasto(banco, { valor: v, descricao: `DAS ${comp.slice(5)}/${comp.slice(0, 4)}`, categoria: 'impostos', ref_id: `das:${comp}` })
        return resp(`Marquei o DAS de ${comp.slice(5)}/${comp.slice(0, 4)} como pago, ${brl(v)}.`, `Marquei o DAS como pago, ${reaisFalado(v)}.`)
      }
      case 'relatorio': {
        const explicito = /\b(passad|janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i.test(frase)
        const p = periodoDe(frase)
        const mes = explicito ? p.ini.slice(0, 7) : hojeISO().slice(0, 7)
        const rec = imprimirRelatorioMensal(dados.cfg, dados.vendas, new Map(dados.produtos.map((x) => [x.id, x])), mes)
        return resp(`Abri o relatório de ${mes.slice(5)}/${mes.slice(0, 4)} para imprimir: total ${brl(rec.total)}.`, `Abri o relatório para imprimir. Total de ${reaisFalado(rec.total)}.`)
      }
      case 'nota': {
        const v = [...dados.vendas].filter((x) => x.status === 'concluida' && !x.fiscal).sort((a, b) => String(b.concluida_em || b.criado_em).localeCompare(String(a.concluida_em || a.criado_em)))[0]
        if (!v) return resp('Não achei venda sem nota para emitir.')
        setNota({ venda: v, documento: cmd.documento || '' })
        return resp(`Abri a nota da última venda sem nota (${brl(v.total)}).`)
      }
      default:
        return undefined
    }
  }

  const processar = (frase) => {
    if (!frase.trim()) return
    const cmd = interpretar(frase, { produtos: ativos, clientes: dados.clientes, contexto })
    // "Quanto deu?" na venda é o total do carrinho, não uma pergunta sobre o histórico.
    if (cmd.acao === 'total' && onLocal) return responder(onLocal(cmd, frase), frase)
    if (ehPergunta(frase) && cmd.acao !== 'nota') {
      const r = perguntar(frase, dados)
      if (r) return responder(r, frase)
    }
    const local = onLocal?.(cmd, frase)
    if (local !== undefined) return responder(local, frase)
    const g = global(cmd, frase)
    if (g !== undefined) return responder(g, frase)
    const r = perguntar(frase, dados)
    if (r) return responder(r, frase)
    responder(resp('Não entendi. Toque em “Tudo o que posso pedir” para ver exemplos, ou tente: “qual o produto mais vendido?”, “vendi duas coxinhas”, “gastei 50 reais de luz”.'), frase)
  }

  const falarAgora = () => {
    setParcial('')
    setOuvindo(true)
    ouvir({
      onParcial: setParcial,
      onFinal: (t) => {
        setParcial(t)
        processar(t)
      },
      onErro: (e) => responder(resp(e)),
      onFim: () => setOuvindo(false),
    })
  }

  return (
    <div className="mf-barra-cmd">
      <div className="mf-voz">
        <button type="button" className={ouvindo ? 'mf-mic ouvindo' : 'mf-mic'} onClick={falarAgora} disabled={!vozDisponivel() || ouvindo} aria-label="Falar um comando">
          🎤
        </button>
        <div>
          <strong>{ouvindo ? 'Pode falar…' : vozDisponivel() ? 'Toque e fale, ou escreva abaixo' : 'Escreva abaixo (voz indisponível neste navegador)'}</strong>
          <span className="muted">{parcial ? `“${parcial}”` : exemplos}</span>
        </div>
      </div>
      <form
        className="mf-escrever"
        onSubmit={(e) => {
          e.preventDefault()
          processar(texto)
          setTexto('')
        }}
      >
        <input ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva um pedido ou pergunta" aria-label="Escreva um pedido ou pergunta" />
        <button type="submit" className="mf-continuar">
          Enviar
        </button>
        <button type="button" className="mf-voltar" onClick={() => setCatalogo(true)}>
          📖 Tudo o que posso pedir
        </button>
      </form>
      {mostrarAtalhos && (
        <div className="mf-chips">
          {PERGUNTAS_PRONTAS.map((q) => (
            <button key={q} type="button" onClick={() => processar(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
      {resposta && (
        <div className="mf-resposta" role="status">
          {resposta.pergunta && <small className="mf-pergunta-feita">“{resposta.pergunta}”</small>}
          <p>{resposta.tela}</p>
          {resposta.lista?.length > 0 && (
            <ol className="mf-resposta-lista">
              {resposta.lista.map(([rotulo, valor], i) => (
                <li key={`${rotulo}-${i}`}>
                  <span>{rotulo}</span>
                  <strong>{valor}</strong>
                </li>
              ))}
            </ol>
          )}
          <div className="mf-resposta-acoes">
            {falaDisponivel() && (
              <button type="button" className="mf-ouvir" onClick={() => falar(resposta.fala)}>
                🔊 Ouvir de novo
              </button>
            )}
            <button type="button" className="mf-ouvir" onClick={() => setResposta(null)}>
              ✕ Fechar
            </button>
          </div>
        </div>
      )}
      {catalogo && (
        <Catalogo
          onFechar={() => setCatalogo(false)}
          onEscolher={(frase, tipo) => {
            setCatalogo(false)
            if (tipo === 'pergunta') processar(frase)
            else {
              setTexto(frase)
              setTimeout(() => campo.current?.focus(), 50)
            }
          }}
        />
      )}
      {nota && <NotaFiscal venda={nota.venda} documentoInicial={nota.documento} onFechar={() => setNota(null)} />}
    </div>
  )
}

function Catalogo({ onFechar, onEscolher }) {
  const [busca, setBusca] = useState('')
  const q = busca.trim().toLowerCase()
  const total = CATALOGO.reduce((s, g) => s + g.itens.length, 0)
  return (
    <Modal titulo="Tudo o que posso pedir" onFechar={onFechar} largo>
      <p className="muted">
        {total} exemplos. Fale do seu jeito: o sistema entende variações (“quanto vendi ontem”, “quanto faturei em março”, “quem mais compra”). Perguntas respondem na hora; pedidos (⚡) vão para o campo de texto
        para você ajustar e enviar.
      </p>
      <input className="mf-campo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar: estoque, cliente, DAS…" aria-label="Procurar exemplo" />
      {CATALOGO.map((g) => {
        const itens = g.itens.filter(([f]) => !q || f.toLowerCase().includes(q) || g.grupo.toLowerCase().includes(q))
        if (!itens.length) return null
        return (
          <section key={g.grupo} className="mf-catalogo-grupo">
            <h3>
              {g.icone} {g.grupo}
            </h3>
            <div className="mf-chips">
              {itens.map(([frase, tipo]) => (
                <button key={frase} type="button" className={tipo === 'acao' ? 'acao' : ''} onClick={() => onEscolher(frase, tipo)}>
                  {tipo === 'acao' ? '⚡ ' : ''}
                  {frase}
                </button>
              ))}
            </div>
          </section>
        )
      })}
      <p className="muted small">Também dá para dizer: “o que você sabe fazer?”, “abrir gastos”, “voltar para o início”. Os períodos valem em qualquer pergunta: hoje, ontem, semana passada, últimos 15 dias, em setembro, este ano.</p>
    </Modal>
  )
}
