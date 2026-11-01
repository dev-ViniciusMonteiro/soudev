'use client'

import Link from 'next/link'
import { useCallback } from 'react'
import Autoteste from './Autoteste'
import EvidenciasTeste from './EvidenciasTeste'
import * as treino from '@/lib/treino/banco'
import { e1rm } from '@/lib/treino/logica'
import { ler as docLer, guardar as docGuardar } from '@/components/apps/documentador/armazem'
import { segundos } from '@/components/apps/documentador/comuns'
import { nomeStatus } from '@/components/apps/imoveis/status'
import { sequencia, textoVisor, ERRO_DIVISAO } from '@/lib/win98/calculadora'
import { novoJogo, revelar, marcar, acorde } from '@/lib/win98/campo-minado'
import * as disco98 from '@/lib/win98/arquivos'
import { executar as dos98, INVALIDO } from '@/lib/win98/dos'
import { janelas as janelas98, estadoInicial as janelasIniciais } from '@/lib/win98/janelas'

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

/* ---------- windows 98 ---------- */
// Regras do Windows 98 conferidas contra o comportamento do original.
const calc98 = (teclas) => textoVisor(sequencia(teclas))
const regra = (nome, fn) => ({
  nome,
  async rodar() {
    try {
      const [ok, detalhe] = fn()
      return { ok, detalhe }
    } catch (e) {
      return { ok: false, detalhe: `Erro: ${e.message}` }
    }
  },
})
const DOCS = 'C:\\Meus documentos'

function montarWin98() {
  return async () => {
    prepararStorage('win98.__autoteste__')
    const cenarios = [
      regra('Calculadora conta da esquerda para a direita (2 + 3 × 4)', () => {
        const v = calc98(['2', '+', '3', '*', '4', '='])
        return [v === '20,', `2 + 3 × 4 = "${v}" (no Windows 98 a Padrão não tem precedência: 20,).`]
      }),
      regra('Calculadora repete a última conta com "=" (2 + 3 = = =)', () => {
        const v = calc98(['2', '+', '3', '=', '=', '='])
        return [v === '11,', `2 + 3 = = = → "${v}" (esperado 11,: soma 3 a cada "=").`]
      }),
      regra('Porcentagem do Windows (200 + 10 %)', () => {
        const v = calc98(['2', '0', '0', '+', '1', '0', '%'])
        return [v === '20,', `200 + 10 % mostra "${v}" (10% de 200 = 20,).`]
      }),
      regra('Divisão por zero mostra a mensagem do Windows', () => {
        const v = calc98(['1', '/', '0', '='])
        return [v === ERRO_DIVISAO, `1 ÷ 0 → "${v}".`]
      }),
      regra('Campo minado: o primeiro clique nunca é mina', () => {
        let j = novoJogo({ linhas: 9, colunas: 9, minas: 1 }, { minas: [40] })
        j = revelar(j, 40, 1000)
        return [j.estado !== 'perdeu' && !j.casas[40].mina, `Clicou na casa 40 (que tinha a mina): a mina foi para a casa ${j.casas.findIndex((c) => c.mina)} e o jogo seguiu (${j.estado}).`]
      }),
      regra('Campo minado: casa vazia abre as vizinhas em cascata e vence', () => {
        let j = novoJogo({ linhas: 9, colunas: 9, minas: 1 }, { minas: [80] })
        j = revelar(j, 0, 1000)
        return [j.estado === 'ganhou' && j.abertas === 80, `Um clique abriu ${j.abertas} casas; estado: ${j.estado}.`]
      }),
      regra('Campo minado: bandeira → interrogação → nada, e o acorde', () => {
        let j = novoJogo({ linhas: 3, colunas: 3, minas: 1 }, { minas: [0] })
        const ciclo = [marcar(j, 0), marcar(marcar(j, 0), 0), marcar(marcar(marcar(j, 0), 0), 0)].map((x) => x.casas[0].marca)
        j = revelar(j, 4, 1000)
        j = marcar(j, 0)
        j = acorde(j, 4, 2000)
        const ok = ciclo.join() === 'bandeira,interrogacao,' && j.estado === 'ganhou'
        return [ok, `Marcas: ${ciclo.map((m) => ({ bandeira: 'bandeira', interrogacao: 'interrogação' })[m] || 'nada').join(' → ')}. Acorde no "1" com a bandeira certa: ${j.estado}.`]
      }),
      regra('Disco: "Nova pasta (2)" e nomes com caracteres proibidos', () => {
        let d = disco98.discoInicial()
        d = disco98.criarPasta(d, DOCS, 'Nova pasta')
        const livre = disco98.nomeLivre(d, DOCS, 'Nova pasta')
        const proibido = disco98.validarNome('a:b?.txt')
        return [livre === 'Nova pasta (2)' && !!proibido, `Próximo nome livre: "${livre}". "a:b?.txt" recusado: ${proibido ? 'sim' : 'não'}.`]
      }),
      regra('Lixeira: excluir e restaurar para o lugar de origem', () => {
        const leiame = disco98.juntar(DOCS, 'Leia-me.txt')
        let d = disco98.excluir(disco98.discoInicial(), leiame, 1)
        const sumiu = !disco98.achar(d, leiame)
        d = disco98.restaurar(d, d.lixeira[0].id)
        const voltou = !!disco98.achar(d, leiame)
        let protegido = false
        try {
          disco98.excluir(d, 'C:\\Windows')
        } catch {
          protegido = true
        }
        return [sumiu && voltou && protegido && d.lixeira.length === 0, `Excluído: ${sumiu}; restaurado: ${voltou}; pasta Windows protegida: ${protegido}.`]
      }),
      regra('MS-DOS: DIR, CD .. e comando inválido', () => {
        const d = disco98.discoInicial()
        const dir = dos98(d, 'C:\\', 'dir').saida.join('\n')
        const cd = dos98(d, 'C:\\Windows', 'cd..').cwd
        const inv = dos98(d, 'C:\\', 'xyz').saida[0]
        return [dir.includes('<DIR>') && cd === 'C:\\' && inv === INVALIDO, `DIR lista pastas: ${dir.includes('<DIR>')}; CD.. foi para ${cd}; "xyz" → "${inv}".`]
      }),
      regra('Barra de tarefas: clicar na janela ativa minimiza; de novo, restaura', () => {
        let e = janelasIniciais()
        e = janelas98(e, { tipo: 'abrir', app: 'a' })
        e = janelas98(e, { tipo: 'tarefa', id: 'j1' })
        const minimizou = e.janelas[0].min && e.ativa === null
        e = janelas98(e, { tipo: 'tarefa', id: 'j1' })
        const restaurou = !e.janelas[0].min && e.ativa === 'j1'
        return [minimizou && restaurou, `Minimizou: ${minimizou}; restaurou e ativou: ${restaurou}.`]
      }),
      cenarioStorage('win98.__autoteste__'),
    ]
    return { ctx: {}, cenarios, limpar: limparStorage('win98.__autoteste__') }
  }
}
const quebrarWin98 = quebrarStorage('win98.__autoteste__')

// Demos de produto (dados de exemplo no localStorage): confere que o navegador salva e relê.
const DEMOS = ['obra-organizada', 'meu-carro', 'garantia-facil', 'gestao-de-aluguel', 'achei-perdi', 'evento-facil']
const montarDemo = (slug) => () => async () => {
  const k = `demo.${slug}.__autoteste__`
  prepararStorage(k)
  const cenarios = [cap('Armazenamento local disponível', () => typeof localStorage !== 'undefined', 'O navegador guarda os dados da demo.', 'Sem armazenamento local neste navegador.'), cenarioStorage(k)]
  return { ctx: {}, cenarios, limpar: limparStorage(k) }
}
const demosMontar = Object.fromEntries(DEMOS.map((d) => [d, montarDemo(d)]))
const demosQuebrar = Object.fromEntries(DEMOS.map((d) => [d, quebrarStorage(`demo.${d}.__autoteste__`)]))

const MONTAR = { ...demosMontar, treino: montarTreino, documentador: montarDocumentador, imoveis: montarImoveis, ppfd: montarPpfd, globo: montarGlobo, 'editor-de-video': montarEditor, 'windows-98': montarWin98 }
const QUEBRAR = { ...demosQuebrar, treino: quebrarTreino, documentador: quebrarDocumentador, imoveis: quebrarImoveis, ppfd: quebrarPpfd, globo: quebrarGlobo, 'windows-98': quebrarWin98 }

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
      <EvidenciasTeste tipo="app" slug={slug} />
    </main>
  )
}
