'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import Autoteste from './Autoteste'
import EvidenciasTeste from './EvidenciasTeste'
import { abrirBanco, esquecerBanco } from '@/lib/sistemas/db'
import { semear } from '@/lib/sistemas/seed'
import { precificar, totalItens } from '@/lib/sistemas/regras'

function contagem(banco) {
  const linhas = []
  for (const [t, m] of banco.dados) if (m.size) linhas.push(`${t}: ${m.size}`)
  return linhas.length ? linhas.join('\n') : '(vazio — nenhum registro)'
}
const totalRegistros = (banco) => {
  let n = 0
  for (const m of banco.dados.values()) n += m.size
  return n
}

export default function TesteSistema({ slug, nome }) {
  const montar = useCallback(async () => {
    const ns = `teste-${slug}-${Math.random().toString(36).slice(2, 8)}`
    const banco = await abrirBanco(ns)
    if (banco.vazio()) {
      semear(banco, slug)
      await banco.esperarGravacao()
    }
    const cenarios = [
      {
        nome: 'Banco do navegador disponível',
        async rodar() {
          const ok = banco && typeof banco.config === 'function'
          return { ok, detalhe: ok ? 'IndexedDB aberto num espaço de teste isolado.' : 'Não foi possível abrir o armazenamento.' }
        },
      },
      {
        nome: 'Dados de exemplo carregam',
        async rodar() {
          const ok = !banco.vazio()
          return { ok, detalhe: ok ? `Carregados ${totalRegistros(banco)} registros de exemplo.` : 'O banco está vazio.' }
        },
        async corrigir() {
          const antes = contagem(banco)
          semear(banco, slug)
          await banco.esperarGravacao()
          return { feito: 'recarreguei os dados de exemplo.', antes, depois: contagem(banco) }
        },
      },
      {
        nome: 'Cadastrar e reler um cliente',
        async rodar() {
          const id = `qa-cli-${Date.now()}`
          banco.salvar('clientes', { id, nome: 'Cliente de Teste' })
          const lido = banco.get('clientes', id)
          const ok = lido?.nome === 'Cliente de Teste'
          return { ok, detalhe: ok ? 'Criou um cliente e releu do banco com o mesmo nome.' : 'O cliente gravado não voltou igual.' }
        },
      },
      {
        nome: 'Lançar uma venda: total calculado certo',
        async rodar() {
          banco.salvar('produtos', { id: 'qa-prod', nome: 'Produto de Teste', preco: 10, ativo: true })
          const itens = precificar([{ produto_id: 'qa-prod', qtd: 3 }], banco.lista('produtos'))
          const total = totalItens(itens)
          const ok = Math.abs(total - 30) < 0.001
          return { ok, detalhe: `3 × R$ 10,00 = R$ ${total.toFixed(2)} (esperado R$ 30,00).` }
        },
      },
      {
        nome: 'Backup (exportar) gera arquivo válido',
        async rodar() {
          const dados = {}
          for (const [t, m] of banco.dados) dados[t] = [...m.values()]
          const json = JSON.stringify({ sistema: slug, dados })
          const volta = JSON.parse(json)
          const tabelas = Object.keys(volta.dados).length
          const ok = tabelas > 0 && json.length > 10
          return { ok, detalhe: `Backup com ${tabelas} tabela(s) e ${json.length.toLocaleString('pt-BR')} caracteres, relido sem erro.` }
        },
      },
    ]
    const limpar = async () => {
      try { await banco.apagarTudo() } catch {}
      esquecerBanco(ns)
    }
    return { ctx: { banco, slug }, cenarios, limpar }
  }, [slug])

  const aoQuebrar = useCallback(async (ctx) => {
    // Esvazia o banco em memória para o cenário "Dados de exemplo" falhar e se autocorrigir.
    ctx.banco.dados.clear()
    ctx.banco.listas?.clear?.()
  }, [])

  return (
    <main className="container tool-page at-pagina">
      <p className="breadcrumb"><Link href={`/sistemas/${slug}`}>← {nome || slug}</Link></p>
      <Autoteste
        titulo={`Autoteste · ${nome || slug}`}
        intro="Roda cenários reais no motor do sistema (num espaço isolado, sem tocar nos seus dados). Se algo falha, tenta corrigir e documenta o antes e o depois."
        montar={montar}
        aoQuebrar={aoQuebrar}
      />
      <EvidenciasTeste tipo="sistema" slug={slug} />
    </main>
  )
}
