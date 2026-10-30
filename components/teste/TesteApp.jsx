'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import Autoteste from './Autoteste'
import * as treino from '@/lib/treino/banco'
import { e1rm } from '@/lib/treino/logica'
import { ler as docLer, guardar as docGuardar } from '@/components/apps/documentador/armazem'
import { segundos } from '@/components/apps/documentador/comuns'
import { nomeStatus } from '@/components/apps/imoveis/status'

/* ---------- blocos reaproveitáveis ---------- */
const cap = (nome, teste, okTxt, falhaTxt) => ({
  async rodar() {
    let ok = false
    try { ok = !!teste() } catch { ok = false }
    return { ok, detalhe: ok ? okTxt : falhaTxt }
  },
  nome,
})

// Cenário de "salvar e reler" com autocorreção, sobre uma chave de teste no localStorage.
function cenarioStorage(chave) {
  return {
    nome: 'Salvar e reler um registro',
    async rodar() {
      const x = JSON.parse(localStorage.getItem(chave) || 'null')
      const ok = x?.valor === 42
      return { ok, detalhe: ok ? 'Registro de teste salvo e relido com o valor correto (42).' : `Valor lido inesperado: ${JSON.stringify(x?.valor)}.` }
    },
    async corrigir() {
      const antes = localStorage.getItem(chave) || '(vazio — nada salvo)'
      localStorage.setItem(chave, JSON.stringify({ valor: 42 }))
      return { feito: 'regravei o registro de teste com o valor correto.', antes, depois: localStorage.getItem(chave) }
    },
  }
}
const prepararStorage = (chave) => localStorage.setItem(chave, JSON.stringify({ valor: 42 }))
const quebrarStorage = (chave) => () => localStorage.setItem(chave, JSON.stringify({ valor: 999 }))
const limparStorage = (chave) => () => { try { localStorage.removeItem(chave) } catch {} }

/* ---------- treino ---------- */
function montarTreino() {
  return async () => {
    await treino.salvar('config', { id: '__autoteste__', valor: 42 })
    const cenarios = [
      cap('Armazenamento (IndexedDB) disponível', () => indexedDB, 'Banco do treino disponível no navegador.', 'IndexedDB indisponível neste navegador.'),
      {
        nome: 'Cálculo de 1RM (progressão) correto',
        async rodar() {
          const v = e1rm(100, 5)
          return { ok: Math.abs(v - 116.7) < 0.05, detalhe: `e1RM(100 kg × 5) = ${v} kg (esperado 116,7 kg, fórmula de Epley).` }
        },
      },
      {
        nome: 'Salvar e reler um registro',
        async rodar() {
          const x = await treino.pegar('config', '__autoteste__')
          const ok = x?.valor === 42
          return { ok, detalhe: ok ? 'Gravou e releu com o valor correto (42).' : `Valor inesperado: ${JSON.stringify(x?.valor)}.` }
        },
        async corrigir() {
          const antes = JSON.stringify(await treino.pegar('config', '__autoteste__'), null, 2)
          await treino.salvar('config', { id: '__autoteste__', valor: 42 })
          return { feito: 'regravei o registro com o valor correto.', antes, depois: JSON.stringify(await treino.pegar('config', '__autoteste__'), null, 2) }
        },
      },
      {
        nome: 'Backup (exportar) gera arquivo válido',
        async rodar() {
          const d = await treino.exportarTudo()
          return { ok: d?.app === 'soudev-treino', detalhe: d?.app ? `Backup "${d.app}" versão ${d.versao}.` : 'Formato inesperado.' }
        },
      },
    ]
    return { ctx: {}, cenarios, limpar: async () => { try { await treino.excluir('config', '__autoteste__') } catch {} } }
  }
}
const quebrarTreino = async () => { await treino.salvar('config', { id: '__autoteste__', valor: 999 }) }

/* ---------- documentador ---------- */
function montarDocumentador() {
  return async () => {
    docGuardar('__autoteste__', { valor: 42 })
    const cenarios = [
      cap('Armazenamento disponível', () => { localStorage.setItem('__t__', '1'); localStorage.removeItem('__t__'); return true }, 'localStorage disponível para guardar documentos.', 'Sem armazenamento (janela anônima?).'),
      {
        nome: 'Fórmula de tempo (relógio dos agentes) correta',
        async rodar() {
          const v = segundos(90000)
          return { ok: v === '1 min 30 s', detalhe: `segundos(90 s) = "${v}" (esperado "1 min 30 s").` }
        },
      },
      {
        nome: 'Salvar e reler um documento',
        async rodar() {
          const x = docLer('__autoteste__', null)
          const ok = x?.valor === 42
          return { ok, detalhe: ok ? 'Documento de teste salvo e relido corretamente.' : `Valor inesperado: ${JSON.stringify(x?.valor)}.` }
        },
        async corrigir() {
          const antes = JSON.stringify(docLer('__autoteste__', null))
          docGuardar('__autoteste__', { valor: 42 })
          return { feito: 'regravei o documento de teste.', antes, depois: JSON.stringify(docLer('__autoteste__', null)) }
        },
      },
    ]
    return { ctx: {}, cenarios, limpar: limparStorage('__autoteste__') }
  }
}
const quebrarDocumentador = async () => { docGuardar('__autoteste__', { valor: 999 }) }

/* ---------- imóveis ---------- */
function montarImoveis() {
  return async () => {
    prepararStorage('imoveis.__autoteste__')
    const cenarios = [
      cap('Armazenamento disponível', () => { localStorage.setItem('__t__', '1'); localStorage.removeItem('__t__'); return true }, 'localStorage disponível para a carteira de imóveis.', 'Sem armazenamento (janela anônima?).'),
      {
        nome: 'Status do imóvel reconhecido',
        async rodar() {
          const v = nomeStatus('zzz-inexistente')
          return { ok: v === 'Prospectar', detalhe: `Status desconhecido vira "${v}" (padrão "Prospectar").` }
        },
      },
      cenarioStorage('imoveis.__autoteste__'),
    ]
    return { ctx: {}, cenarios, limpar: limparStorage('imoveis.__autoteste__') }
  }
}
const quebrarImoveis = quebrarStorage('imoveis.__autoteste__')

/* ---------- ppfd ---------- */
function montarPpfd() {
  return async () => {
    prepararStorage('ppfd.__autoteste__')
    const cenarios = [
      cap('Armazenamento disponível', () => { localStorage.setItem('__t__', '1'); localStorage.removeItem('__t__'); return true }, 'localStorage disponível para salvar mapas de PPFD.', 'Sem armazenamento (janela anônima?).'),
      cap('Câmera disponível no navegador', () => navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function', 'getUserMedia disponível (a medição por câmera funciona aqui).', 'Este navegador não expõe a câmera (getUserMedia).'),
      cenarioStorage('ppfd.__autoteste__'),
    ]
    return { ctx: {}, cenarios, limpar: limparStorage('ppfd.__autoteste__') }
  }
}
const quebrarPpfd = quebrarStorage('ppfd.__autoteste__')

/* ---------- globo ---------- */
function montarGlobo() {
  return async () => {
    prepararStorage('globo.__autoteste__')
    const cenarios = [
      cap('WebGL (3D) disponível', () => { const c = document.createElement('canvas'); return c.getContext('webgl') || c.getContext('experimental-webgl') }, 'WebGL disponível: o globo 3D renderiza neste navegador.', 'WebGL indisponível (o globo 3D não vai renderizar).'),
      {
        nome: 'API de dados do Globo responde',
        async rodar() {
          const r = await fetch('/api/globo')
          const d = await r.json().catch(() => null)
          const ok = !!d && typeof d.erro === 'string'
          return { ok, detalhe: ok ? `Rota /api/globo no ar (validou a entrada: "${d.erro}").` : `Resposta inesperada (HTTP ${r.status}).` }
        },
      },
      cenarioStorage('globo.__autoteste__'),
    ]
    return { ctx: {}, cenarios, limpar: limparStorage('globo.__autoteste__') }
  }
}
const quebrarGlobo = quebrarStorage('globo.__autoteste__')

/* ---------- editor de vídeo ---------- */
function montarEditor() {
  return async () => {
    const cenarios = [
      cap('Canvas 2D disponível', () => document.createElement('canvas').getContext('2d'), 'Canvas disponível (prévia e cortes funcionam).', 'Canvas 2D indisponível neste navegador.'),
      cap('Gravação de mídia (MediaRecorder) disponível', () => 'MediaRecorder' in window, 'MediaRecorder disponível: exportar o vídeo funciona.', 'MediaRecorder indisponível (exportar pode não funcionar).'),
      cap('Criar link de arquivo (createObjectURL)', () => typeof URL.createObjectURL === 'function', 'createObjectURL disponível: abrir e baixar arquivos funciona.', 'Indisponível neste navegador.'),
    ]
    return { ctx: {}, cenarios, limpar: async () => {} }
  }
}

const MONTAR = { treino: montarTreino, documentador: montarDocumentador, imoveis: montarImoveis, ppfd: montarPpfd, globo: montarGlobo, 'editor-de-video': montarEditor }
const QUEBRAR = { treino: quebrarTreino, documentador: quebrarDocumentador, imoveis: quebrarImoveis, ppfd: quebrarPpfd, globo: quebrarGlobo }

export default function TesteApp({ slug, nome }) {
  const fabrica = MONTAR[slug]
  const montar = useCallback(fabrica ? fabrica() : null, [slug])

  return (
    <main className="container tool-page at-pagina">
      <p className="breadcrumb"><Link href={`/apps/${slug}`}>← {nome || slug}</Link></p>
      {montar ? (
        <Autoteste
          titulo={`Autoteste · ${nome || slug}`}
          intro="Roda cenários reais do app no navegador. Se algo falha, tenta corrigir e documenta o antes e o depois."
          montar={montar}
          aoQuebrar={QUEBRAR[slug] || null}
        />
      ) : (
        <div className="at">
          <h1>Autoteste · {nome || slug}</h1>
          <p className="muted">O autoteste deste app ainda não foi configurado.</p>
        </div>
      )}
    </main>
  )
}
