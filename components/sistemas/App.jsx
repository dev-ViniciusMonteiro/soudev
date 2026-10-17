'use client'

// Casca dos sistemas: abre o banco (demonstração ou planilha), menu lateral e troca de módulos pelo #hash.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { SistemaContext, useStatus } from './base'
import { abrirBanco } from '@/lib/sistemas/db'
import { idDaUrl, lerConexao } from '@/lib/sistemas/api'
import { getNicho, gruposMenu, modulos } from '@/lib/sistemas/nichos'
import { semear } from '@/lib/sistemas/seed'
import { dataBR } from '@/lib/sistemas/regras'
import { track } from '@/lib/analytics'
import Painel from './modulos/Painel'
import Pdv from './modulos/Pdv'
import Caixa from './modulos/Caixa'
import Pedidos from './modulos/Pedidos'
import Mesas from './modulos/Mesas'
import Cardapio from './modulos/Cardapio'
import Agenda from './modulos/Agenda'
import Ordens from './modulos/Ordens'
import Mensalidades from './modulos/Mensalidades'
import Checkin from './modulos/Checkin'
import Funil from './modulos/Funil'
import Vacinas from './modulos/Vacinas'
import Vendas from './modulos/Vendas'
import Estoque from './modulos/Estoque'
import Financeiro from './modulos/Financeiro'
import Relatorios from './modulos/Relatorios'
import Cadastro from './modulos/Cadastro'
import Config from './modulos/Config'

const telas = { painel: Painel, pdv: Pdv, caixa: Caixa, pedidos: Pedidos, mesas: Mesas, cardapio: Cardapio, agenda: Agenda, ordens: Ordens, mensalidades: Mensalidades, checkin: Checkin, funil: Funil, vacinas: Vacinas, vendas: Vendas, estoque: Estoque, financeiro: Financeiro, relatorios: Relatorios, config: Config }

const SO_GESTOR = ['config', 'tabela:usuarios', 'financeiro', 'relatorios']

export default function SistemaApp({ slug }) {
  const nicho = getNicho(slug)
  const [banco, setBanco] = useState(null)
  const [erro, setErro] = useState('')
  const [conexao, setConexao] = useState(null)

  useEffect(() => {
    let vivo = true
    const c = lerConexao()
    const id = c && idDaUrl(c.url)
    const ns = id ? `planilha-${id}` : `demo-${slug}`
    abrirBanco(ns, id ? { ...c } : null)
      .then((b) => {
        if (!vivo) return
        if (!id && b.vazio()) semear(b, slug)
        if (id) b.iniciarSync()
        setConexao(id ? c : null)
        setBanco(b)
      })
      .catch((e) => vivo && setErro(`Não foi possível abrir o banco do navegador (${e?.message || e}). Em janela anônima alguns navegadores bloqueiam o armazenamento.`))
    track('sistema_aberto', { sistema: slug, modo: id ? 'planilha' : 'demo' })
    return () => {
      vivo = false
    }
  }, [slug])

  useEffect(() => {
    document.documentElement.classList.add('sx-tela-cheia')
    return () => document.documentElement.classList.remove('sx-tela-cheia')
  }, [])

  if (erro) return <div className="sx-carregando">{erro}</div>
  if (!banco) {
    return (
      <div className="sx-carregando">
        <span className="spinner" aria-hidden="true" /> Abrindo {nicho.nome}…
      </div>
    )
  }
  return <Casca nicho={nicho} banco={banco} conexao={conexao} />
}

function lerHash() {
  if (typeof window === 'undefined') return 'painel'
  return decodeURIComponent(window.location.hash.slice(1)) || 'painel'
}

function Casca({ nicho, banco, conexao }) {
  const papel = conexao ? conexao.papel || banco.meta.papel || 'operador' : 'dono'
  const usuario = conexao?.email || 'dono@exemplo.com'
  const [tela, setTela] = useState(lerHash)
  const [menu, setMenu] = useState(false)
  const [extras, setExtras] = useState(() => lerExtras(banco, nicho.slug))
  const [, forcar] = useState(0)

  useEffect(
    () =>
      banco.ouvir(() => {
        const novos = lerExtras(banco, nicho.slug)
        setExtras((atuais) => (JSON.stringify(atuais) === JSON.stringify(novos) ? atuais : novos))
      }),
    [banco, nicho.slug],
  )
  useEffect(() => {
    const mudou = () => setTela(lerHash())
    window.addEventListener('hashchange', mudou)
    return () => window.removeEventListener('hashchange', mudou)
  }, [])

  const ativos = useMemo(() => {
    const lista = [...nicho.modulos, ...extras.filter((m) => modulos[m] && !nicho.modulos.includes(m))]
    return lista.filter((m) => papel !== 'operador' || !SO_GESTOR.includes(m))
  }, [nicho, extras, papel])

  const ir = useCallback((m) => {
    window.location.hash = m
    setTela(m)
    setMenu(false)
    document.querySelector('.sx-principal')?.scrollTo(0, 0)
  }, [])

  const atual = ativos.includes(tela) ? tela : 'painel'
  const ctx = useMemo(() => ({ banco, nicho, conexao, papel, usuario, ir, ativos, recarregar: () => forcar((n) => n + 1) }), [banco, nicho, conexao, papel, usuario, ir, ativos])
  const Tela = modulos[atual]?.tabela ? null : telas[atual]

  return (
    <SistemaContext.Provider value={ctx}>
      <div className="sx-app" style={{ '--sx-cor': nicho.cor }}>
        <aside className={menu ? 'sx-lateral aberto' : 'sx-lateral'}>
          <div className="sx-marca">
            <span className="sx-marca-icone" aria-hidden="true">
              {nicho.badge}
            </span>
            <div>
              <strong>{banco.config().empresa_nome || nicho.nome}</strong>
              <small>{nicho.nome}</small>
            </div>
          </div>
          <nav className="sx-menu" aria-label="Módulos">
            {gruposMenu.map(([grupo, ids]) => {
              const visiveis = ids.filter((id) => ativos.includes(id))
              if (!visiveis.length) return null
              return (
                <div key={grupo} className="sx-menu-grupo">
                  <span className="sx-menu-titulo">{grupo}</span>
                  {visiveis.map((id) => (
                    <button key={id} type="button" className={atual === id ? 'sx-menu-item ativo' : 'sx-menu-item'} onClick={() => ir(id)}>
                      <span aria-hidden="true">{modulos[id].icone}</span>
                      {modulos[id].tabela ? nicho.rotulos[modulos[id].tabela] ?? modulos[id].rotulo : modulos[id].rotulo}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>
          <div className="sx-lateral-pe">
            <Link href={`/sistemas/${nicho.slug}`} className="sx-sair">
              ← Sobre este sistema
            </Link>
            <Link href="/sistemas" className="sx-sair">
              Ver outros sistemas
            </Link>
          </div>
        </aside>
        {menu && <button type="button" className="sx-veu" aria-label="Fechar menu" onClick={() => setMenu(false)} />}
        <div className="sx-corpo">
          <header className="sx-barra">
            <button type="button" className="sx-hamburguer" aria-label="Abrir menu" onClick={() => setMenu(true)}>
              ☰
            </button>
            <span className="sx-barra-titulo">{modulos[atual].icone} {modulos[atual].tabela ? nicho.rotulos[modulos[atual].tabela] ?? modulos[atual].rotulo : modulos[atual].rotulo}</span>
            <StatusSync banco={banco} conexao={conexao} ir={ir} />
            <span className="sx-usuario" title={`Papel: ${papel}`}>
              {usuario}
            </span>
          </header>
          <main className="sx-principal">{Tela ? <Tela key={atual} /> : <Cadastro key={atual} tabela={modulos[atual].tabela} />}</main>
        </div>
      </div>
    </SistemaContext.Provider>
  )
}

function lerExtras(banco, slug) {
  try {
    return JSON.parse(banco.get('config', `modulos_${slug}`)?.valor || '[]')
  } catch {
    return []
  }
}

function StatusSync({ banco, conexao, ir }) {
  const s = useStatus(banco)
  if (!conexao) {
    return (
      <button type="button" className="sx-status tom-aviso" onClick={() => ir('config')} title="Os dados ficam só neste navegador. Conecte uma planilha para guardar na nuvem.">
        Demonstração · conectar planilha
      </button>
    )
  }
  const textos = {
    pendente: ['Conectando…', 'neutro'],
    enviando: ['Sincronizando…', 'neutro'],
    sincronizado: [s.pendentes ? `${s.pendentes} para enviar` : `Planilha em dia${s.ultimo ? ` · ${dataBR(s.ultimo, true).slice(11)}` : ''}`, 'ok'],
    offline: [`Sem internet · ${s.pendentes} na fila`, 'aviso'],
    erro: [`Erro ao sincronizar · ${s.pendentes} na fila`, 'erro'],
    sessao: ['Sessão expirada · entrar de novo', 'erro'],
  }
  const [texto, tom] = textos[s.estado] ?? textos.pendente
  return (
    <button type="button" className={`sx-status tom-${tom}`} title={s.erro || 'Clique para sincronizar agora'} onClick={() => (s.estado === 'sessao' ? ir('config') : banco.sincronizar())}>
      {texto}
    </button>
  )
}
