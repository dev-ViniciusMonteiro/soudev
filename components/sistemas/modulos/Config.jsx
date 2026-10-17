'use client'

// Configurações: dados do negócio, conexão com a planilha (login por código no e-mail), módulos e backup.

import { useState } from 'react'
import { CampoInput, Topo, converter, paraInput, useConfig, useSistema, useStatus } from '../base'
import { abrirBanco, esquecerBanco } from '@/lib/sistemas/db'
import { idDaUrl, pedirCodigo, entrar, salvarConexao } from '@/lib/sistemas/api'
import { gruposMenu, modulos } from '@/lib/sistemas/nichos'
import { CONFIGS, tabelas } from '@/lib/sistemas/schema'
import { dataBR } from '@/lib/sistemas/regras'
import { downloadBlob } from '@/lib/client'
import { track } from '@/lib/analytics'

const grupos = [
  ['Negócio', ['empresa_nome', 'documento', 'empresa_telefone', 'whatsapp', 'endereco', 'cidade']],
  ['Pix', ['pix_chave', 'pix_nome']],
  ['E-mails', ['emails_notificacao', 'email_cliente']],
  ['Funcionamento e agenda', ['abre', 'fecha', 'dias', 'intervalo_agenda']],
  ['Cardápio, mesas e mensalidades', ['loja_aberta', 'taxa_entrega', 'pedido_minimo', 'tempo_entrega', 'mesas', 'taxa_servico', 'multa_atraso']],
]

export default function Config() {
  const { banco, conexao } = useSistema()
  return (
    <div className="sx-modulo">
      <Topo titulo="Configurações" sub={conexao ? `Conectado à planilha como ${conexao.email}` : 'Modo demonstração: os dados ficam só neste navegador'} />
      <Planilha />
      <DadosNegocio key={banco.ns} />
      <Modulos />
      <Backup />
    </div>
  )
}

function DadosNegocio() {
  const { banco } = useSistema()
  const cfg = useConfig()
  const [valores, setValores] = useState(() => Object.fromEntries(CONFIGS.map((c) => [c.id, paraInput(c, cfg[c.id])])))
  const [salvo, setSalvo] = useState(false)
  return (
    <form
      className="sx-cartao sx-form"
      onSubmit={(e) => {
        e.preventDefault()
        const out = {}
        for (const c of CONFIGS) if (!c.oculto) out[c.id] = converter(c, valores[c.id])
        banco.setConfig(out)
        setSalvo(true)
        setTimeout(() => setSalvo(false), 2000)
      }}
    >
      <h2>Dados do negócio</h2>
      {grupos.map(([titulo, ids]) => (
        <fieldset key={titulo} className="sx-fieldset">
          <legend>{titulo}</legend>
          <div className="sx-form-grid">
            {ids.map((id) => {
              const c = CONFIGS.find((x) => x.id === id)
              return (
                <div key={id} className="field">
                  <span className="field-label">{c.rotulo}</span>
                  <CampoInput c={c} value={valores[id]} onChange={(v) => setValores((s) => ({ ...s, [id]: v }))} />
                  {c.ajuda && <small className="field-hint">{c.ajuda}</small>}
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}
      <div className="sx-acoes">
        <button type="submit" className="btn btn-primary">
          Salvar configurações
        </button>
        {salvo && <span className="notice ok">Salvo!</span>}
      </div>
    </form>
  )
}

function Planilha() {
  const { banco, conexao } = useSistema()
  const status = useStatus(banco)
  const [url, setUrl] = useState(conexao?.url ?? '')
  const [email, setEmail] = useState(conexao?.email ?? '')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState(conexao && status.estado !== 'sessao' ? 'conectado' : 'url')
  const [copiar, setCopiar] = useState(true)
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const passo = async (fn) => {
    setMsg('')
    setOcupado(true)
    try {
      await fn()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const enviarCodigo = () =>
    passo(async () => {
      if (!idDaUrl(url)) throw new Error('Cole o link do App da Web, que começa com https://script.google.com/ e termina em /exec.')
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe seu e-mail.')
      await pedirCodigo(url.trim(), email.trim())
      setEtapa('codigo')
      setMsg(`Enviamos um código para ${email}. Confira também o spam.`)
    })

  const confirmar = () =>
    passo(async () => {
      const r = await entrar(url.trim(), email.trim(), codigo)
      const nova = { url: url.trim(), email: r.email, token: r.token, papel: r.papel }
      // Leva os dados da demonstração para a planilha, se a pessoa quiser.
      if (copiar && !conexao) {
        const destino = await abrirBanco(`planilha-${idDaUrl(nova.url)}`, { ...nova })
        const pares = []
        for (const [t, mapa] of banco.dados) if (tabelas[t]) for (const r2 of mapa.values()) pares.push([t, r2])
        for (let i = 0; i < pares.length; i += 400) destino.salvarVarios(pares.slice(i, i + 400))
        await destino.esperarGravacao()
        destino.fechar()
        esquecerBanco(destino.ns)
      }
      salvarConexao(nova)
      track('sistema_planilha_conectada', { papel: r.papel })
      window.location.reload()
    })

  if (etapa === 'conectado' && conexao) {
    return (
      <section className="sx-cartao">
        <h2>Planilha conectada</h2>
        <ul className="sx-lista-valores">
          <li>
            <span>E-mail</span>
            <strong>{conexao.email}</strong>
          </li>
          <li>
            <span>Papel</span>
            <strong>{conexao.papel}</strong>
          </li>
          <li>
            <span>Situação</span>
            <strong>{status.estado === 'sincronizado' ? `Em dia${status.ultimo ? ` (${dataBR(status.ultimo, true)})` : ''}` : status.estado}</strong>
          </li>
          <li>
            <span>Na fila para enviar</span>
            <strong>{status.pendentes}</strong>
          </li>
        </ul>
        {status.erro && <p className="notice warn">{status.erro}</p>}
        <div className="sx-acoes">
          <button type="button" className="btn btn-primary" onClick={() => banco.sincronizar()}>
            Sincronizar agora
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (status.pendentes && !confirm(`Ainda há ${status.pendentes} alterações sem enviar. Desconectar mesmo assim? Elas continuam guardadas neste navegador e sobem quando você conectar de novo.`)) return
              salvarConexao(null)
              window.location.reload()
            }}
          >
            Desconectar e voltar à demonstração
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="sx-cartao">
      <h2>{status.estado === 'sessao' ? 'Entre de novo na planilha' : 'Guardar os dados numa planilha do Google (grátis)'}</h2>
      <ol className="sx-passos">
        <li>
          Crie uma planilha nova em <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">sheets.new</a> e abra <b>Extensões → Apps Script</b>.
        </li>
        <li>
          Apague o que estiver no editor e cole o código do servidor:{' '}
          <a href="/sistemas/Code.gs" download="Code.gs">
            baixar Code.gs
          </a>{' '}
          ou{' '}
          <button
            type="button"
            className="sx-link"
            onClick={async () => {
              const texto = await (await fetch('/sistemas/Code.gs')).text()
              await navigator.clipboard.writeText(texto)
              setMsg('Código copiado. Cole no editor do Apps Script.')
            }}
          >
            copiar o código
          </button>
          .
        </li>
        <li>
          Selecione a função <b>configurar</b> e clique em <b>Executar</b>. Autorize o acesso. Ela cria as abas e registra você como dono.
        </li>
        <li>
          <b>Implantar → Nova implantação → App da Web</b>. Executar como: <b>Eu</b>. Quem pode acessar: <b>Qualquer pessoa</b>. Copie o link que termina em <code>/exec</code>.
        </li>
        <li>Cole o link abaixo e entre com o e-mail da sua conta Google (ou de um usuário cadastrado na aba usuarios).</li>
      </ol>
      <div className="sx-form-grid">
        <label className="field">
          <span className="field-label">Link do App da Web</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" disabled={etapa === 'codigo'} />
        </label>
        <label className="field">
          <span className="field-label">Seu e-mail</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={etapa === 'codigo'} />
        </label>
        {etapa === 'codigo' && (
          <label className="field">
            <span className="field-label">Código de 6 dígitos</span>
            <input inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus maxLength={6} />
          </label>
        )}
      </div>
      {!conexao && (
        <label className="check">
          <input type="checkbox" checked={copiar} onChange={(e) => setCopiar(e.target.checked)} />
          Enviar os dados desta demonstração para a planilha (bom para ver as abas preenchidas)
        </label>
      )}
      {msg && <p className={/Enviamos|copiado/.test(msg) ? 'notice ok' : 'notice error'}>{msg}</p>}
      <div className="sx-acoes">
        {etapa !== 'codigo' ? (
          <button type="button" className="btn btn-primary" disabled={ocupado} onClick={enviarCodigo}>
            {ocupado ? 'Enviando…' : 'Receber código por e-mail'}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" disabled={ocupado || codigo.length < 6} onClick={confirmar}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEtapa('url')}>
              Voltar
            </button>
          </>
        )}
      </div>
      <p className="muted small">
        Cada aba da planilha é uma tabela (clientes, produtos, vendas…). Todos os sistemas usam as mesmas abas, então você pode ligar vários módulos na mesma planilha. Uma conta Gmail comum manda até cerca de 100 e-mails por dia pelo
        Apps Script.
      </p>
    </section>
  )
}

function Modulos() {
  const { banco, nicho } = useSistema()
  const chave = `modulos_${nicho.slug}`
  const atuais = (() => {
    try {
      return JSON.parse(banco.get('config', chave)?.valor || '[]')
    } catch {
      return []
    }
  })()
  const opcionais = gruposMenu.flatMap(([, ids]) => ids).filter((id) => !nicho.modulos.includes(id))
  const alternar = (id) => {
    const novos = atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]
    banco.salvar('config', { id: chave, valor: JSON.stringify(novos) })
  }
  return (
    <section className="sx-cartao">
      <h2>Módulos de outros sistemas</h2>
      <p className="muted small">Todos usam o mesmo banco. Ligue a agenda numa loja, o PDV numa academia, o funil num restaurante…</p>
      <div className="sx-check">
        {opcionais.map((id) => (
          <label key={id} className="check">
            <input type="checkbox" checked={atuais.includes(id)} onChange={() => alternar(id)} />
            {modulos[id].icone} {modulos[id].rotulo}
          </label>
        ))}
      </div>
    </section>
  )
}

function Backup() {
  const { banco, conexao, nicho } = useSistema()
  const [msg, setMsg] = useState('')
  const exportar = () => {
    const dados = {}
    for (const [t, mapa] of banco.dados) dados[t] = [...mapa.values()]
    downloadBlob(new Blob([JSON.stringify({ sistema: nicho.slug, exportado_em: new Date().toISOString(), dados })], { type: 'application/json' }), `backup-${nicho.slug}-${new Date().toISOString().slice(0, 10)}.json`)
  }
  const importar = async (arquivo) => {
    try {
      const { dados } = JSON.parse(await arquivo.text())
      const pares = []
      for (const [t, lista] of Object.entries(dados || {})) if (tabelas[t] && Array.isArray(lista)) for (const r of lista) if (r?.id) pares.push([t, r])
      for (let i = 0; i < pares.length; i += 400) banco.salvarVarios(pares.slice(i, i + 400))
      await banco.esperarGravacao()
      setMsg(`${pares.length} registros importados.`)
    } catch (e) {
      setMsg(`Arquivo inválido: ${e.message}`)
    }
  }
  return (
    <section className="sx-cartao">
      <h2>Backup</h2>
      <div className="sx-acoes">
        <button type="button" className="btn btn-ghost" onClick={exportar}>
          Baixar backup (JSON)
        </button>
        <label className="btn btn-ghost">
          Importar backup
          <input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && importar(e.target.files[0])} />
        </label>
        {!conexao && (
          <button
            type="button"
            className="btn btn-ghost sx-perigo"
            onClick={async () => {
              if (!confirm('Apagar tudo desta demonstração e começar com os dados de exemplo de novo?')) return
              await banco.apagarTudo()
              esquecerBanco(banco.ns)
              window.location.reload()
            }}
          >
            Restaurar demonstração
          </button>
        )}
      </div>
      {msg && <p className="notice ok">{msg}</p>}
    </section>
  )
}
