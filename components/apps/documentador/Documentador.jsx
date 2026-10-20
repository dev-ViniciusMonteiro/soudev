'use client'

// Documentador: a pessoa conecta a própria chave do OpenRouter, escolhe um processo (fila de agentes),
// manda o material e o último agente monta o documento no padrão escolhido (GMUD, negócio e técnica…).
// Tudo fica no navegador: chave, processos, rascunhos e histórico.

import { useEffect, useMemo, useState } from 'react'
import { concluirLogin, lerChave, listarModelos, modeloPadrao as escolherPadrao } from '@/lib/documentador/ia'
import { PADROES, processoDoPadrao } from '@/lib/documentador/processos'
import { guardar, ler } from './armazem'
import Conexao from './Conexao'
import Gerar from './Gerar'
import Processos from './Processos'
import { Documento, Historico } from './Documento'

const ABAS = [
  ['conexao', '1. Conexão'],
  ['gerar', '2. Gerar'],
  ['documento', '3. Documento'],
  ['processos', 'Processos e agentes'],
  ['historico', 'Histórico'],
]

export default function Documentador() {
  const [aba, setAba] = useState(null)
  const [chave, setChave] = useState('')
  const [modelos, setModelos] = useState([])
  const [erroModelos, setErroModelos] = useState('')
  const [modelo, setModelo] = useState('')
  const [processos, setProcessos] = useState(null)
  const [processoId, setProcessoId] = useState('')
  const [documento, setDocumento] = useState(null) // { id, titulo, processo, markdown, criado }
  const [historico, setHistorico] = useState([])
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    ;(async () => {
      const login = await concluirLogin()
      if (login === 'ok') setAviso('Conectado ao OpenRouter.')
      if (login === 'erro') setAviso('Não foi possível concluir o login no OpenRouter. Tente de novo ou cole a chave.')
      const c = lerChave()
      setChave(c)
      const salvos = ler('doc.processos', null)
      const lista = Array.isArray(salvos) && salvos.length ? salvos : PADROES.map((p) => processoDoPadrao(p))
      setProcessos(lista)
      setProcessoId(ler('doc.processo', '') || lista[0].id)
      setModelo(ler('doc.modelo', ''))
      setHistorico(ler('doc.historico', []))
      setAba(c ? 'gerar' : 'conexao')
    })()
    listarModelos()
      .then(setModelos)
      .catch((e) => setErroModelos(e.message))
  }, [])

  // Sem modelo escolhido: o maior modelo gratuito do momento.
  const modeloEfetivo = modelo || (modelos.length ? escolherPadrao(modelos) : '')

  useEffect(() => {
    if (processos) guardar('doc.processos', processos)
  }, [processos])

  const processo = useMemo(() => processos?.find((p) => p.id === processoId) ?? processos?.[0], [processos, processoId])

  const escolherProcesso = (id) => {
    setProcessoId(id)
    guardar('doc.processo', id)
  }

  const escolherModelo = (id) => {
    setModelo(id)
    guardar('doc.modelo', id)
  }

  const novoDocumento = (doc) => {
    setDocumento(doc)
    setHistorico((h) => {
      const lista = [doc, ...h.filter((x) => x.id !== doc.id)].slice(0, 30)
      guardar('doc.historico', lista)
      return lista
    })
    setAba('documento')
  }

  const editarDocumento = (markdown) => {
    const novo = { ...documento, markdown }
    setDocumento(novo)
    setHistorico((h) => {
      const lista = h.map((x) => (x.id === novo.id ? novo : x))
      guardar('doc.historico', lista)
      return lista
    })
  }

  const apagarDoHistorico = (id) =>
    setHistorico((h) => {
      const lista = h.filter((x) => x.id !== id)
      guardar('doc.historico', lista)
      return lista
    })

  if (!aba || !processos) {
    return (
      <div className="ap-carregando">
        <span className="spinner" aria-hidden="true" /> Carregando o Documentador…
      </div>
    )
  }

  return (
    <main className="container dc-app">
      <header className="dc-topo">
        <a href="/apps/documentador" className="dc-voltar" aria-label="Sobre o Documentador">
          ←
        </a>
        <div>
          <h1>Documentador</h1>
          <p className="muted small">Agentes de IA que transformam suas anotações em GMUD ou documentação de negócio e técnica.</p>
        </div>
        <span className={chave ? 'dc-status ok' : 'dc-status'}>{chave ? `Conectado · ${modeloEfetivo || 'carregando modelos…'}` : 'Sem chave do OpenRouter'}</span>
      </header>

      <nav className="dc-abas" aria-label="Etapas">
        {ABAS.map(([id, rotulo]) => (
          <button key={id} type="button" className={aba === id ? 'chip active' : 'chip'} onClick={() => setAba(id)} disabled={id === 'documento' && !documento}>
            {rotulo}
          </button>
        ))}
      </nav>

      {aviso && (
        <p className="notice ok" role="status">
          {aviso}{' '}
          <button type="button" className="dc-link" onClick={() => setAviso('')}>
            Fechar
          </button>
        </p>
      )}

      {aba === 'conexao' && (
        <Conexao
          chave={chave}
          setChave={setChave}
          modelos={modelos}
          erroModelos={erroModelos}
          modelo={modelo}
          modeloEfetivo={modeloEfetivo}
          escolherModelo={escolherModelo}
          aoConcluir={() => setAba('gerar')}
        />
      )}
      {/* Sempre montado: a fila de agentes continua rodando enquanto a pessoa olha outra aba. */}
      <div hidden={aba !== 'gerar'}>
        <Gerar
          chave={chave}
          modelos={modelos}
          modeloPadrao={modeloEfetivo}
          processos={processos}
          processo={processo}
          escolherProcesso={escolherProcesso}
          irPara={setAba}
          aoTerminar={novoDocumento}
        />
      </div>
      {aba === 'documento' && documento && <Documento documento={documento} aoEditar={editarDocumento} />}
      {aba === 'processos' && <Processos processos={processos} setProcessos={setProcessos} processoId={processo.id} escolherProcesso={escolherProcesso} modelos={modelos} />}
      {aba === 'historico' && (
        <Historico
          historico={historico}
          abrir={(d) => {
            setDocumento(d)
            setAba('documento')
          }}
          apagar={apagarDoHistorico}
        />
      )}
    </main>
  )
}
