'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import Autoteste from './Autoteste'
import * as treino from '@/lib/treino/banco'
import { e1rm } from '@/lib/treino/logica'

const CHAVE_QA = '__autoteste__'

function montarTreino() {
  return async () => {
    // Deixa um registro de teste com valor conhecido (não mexe nos dados reais do usuário).
    await treino.salvar('config', { id: CHAVE_QA, valor: 42 })
    const cenarios = [
      {
        nome: 'Armazenamento (IndexedDB) disponível',
        async rodar() {
          const lista = await treino.lista('config')
          return { ok: Array.isArray(lista), detalhe: 'Banco do treino aberto e lido com sucesso.' }
        },
      },
      {
        nome: 'Cálculo de 1RM (progressão) correto',
        async rodar() {
          const v = e1rm(100, 5)
          const ok = Math.abs(v - 116.7) < 0.05
          return { ok, detalhe: `e1RM(100 kg × 5) = ${v} kg (esperado 116,7 kg pela fórmula de Epley).` }
        },
      },
      {
        nome: 'Salvar e reler um registro',
        async rodar() {
          const x = await treino.pegar('config', CHAVE_QA)
          const ok = x?.valor === 42
          return { ok, detalhe: ok ? 'Registro gravado e relido com o valor correto (42).' : `Valor lido inesperado: ${JSON.stringify(x?.valor)}.` }
        },
        async corrigir() {
          const antes = JSON.stringify(await treino.pegar('config', CHAVE_QA), null, 2)
          await treino.salvar('config', { id: CHAVE_QA, valor: 42 })
          const depois = JSON.stringify(await treino.pegar('config', CHAVE_QA), null, 2)
          return { feito: 'regravei o registro com o valor correto.', antes, depois }
        },
      },
      {
        nome: 'Backup (exportar) gera arquivo válido',
        async rodar() {
          const dump = await treino.exportarTudo()
          const ok = dump?.app === 'soudev-treino'
          return { ok, detalhe: ok ? `Backup "${dump.app}" versão ${dump.versao} gerado.` : 'O backup não veio no formato esperado.' }
        },
      },
    ]
    const limpar = async () => { try { await treino.excluir('config', CHAVE_QA) } catch {} }
    return { ctx: {}, cenarios, limpar }
  }
}

const aoQuebrarTreino = async () => {
  // Grava um valor errado para o cenário "Salvar e reler" falhar e se autocorrigir.
  await treino.salvar('config', { id: CHAVE_QA, valor: 999 })
}

export default function TesteApp({ slug, nome }) {
  const montar = useCallback(slug === 'treino' ? montarTreino() : null, [slug])

  return (
    <main className="container tool-page at-pagina">
      <p className="breadcrumb"><Link href={`/apps/${slug}`}>← {nome || slug}</Link></p>
      {montar ? (
        <Autoteste
          titulo={`Autoteste · ${nome || slug}`}
          intro="Roda cenários reais do app e, se algo falha, tenta corrigir e documenta o antes e o depois."
          montar={montar}
          aoQuebrar={slug === 'treino' ? aoQuebrarTreino : null}
        />
      ) : (
        <div className="at">
          <h1>Autoteste · {nome || slug}</h1>
          <p className="muted">O autoteste deste app ainda está sendo preparado. Já está pronto no app <Link href="/apps/treino/teste">Treino</Link> (modelo).</p>
        </div>
      )}
    </main>
  )
}
