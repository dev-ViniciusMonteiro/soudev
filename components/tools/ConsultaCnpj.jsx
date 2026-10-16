'use client'

import { useState } from 'react'
import { CopyButton, Field, Notice } from '../ui'
import { BRASIL_API, apiMessage, fetchJson, idadeTexto, isoParaBR } from '@/lib/apis'
import { brl, formatCnpj, limparCnpj, validarCnpj } from '@/lib/br'

const telefone = (t) => {
  const d = String(t ?? '').replace(/\D/g, '')
  if (d.length < 10) return ''
  return `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}`
}

export default function ConsultaCnpj() {
  const [cnpj, setCnpj] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const consultar = async (event) => {
    event.preventDefault()
    setErro('')
    setRes(null)
    const c = limparCnpj(cnpj)
    if (!validarCnpj(c)) return setErro('CNPJ inválido. Confira os 14 caracteres.')
    if (/[A-Z]/.test(c)) return setErro('CNPJ com letras (novo formato) ainda não aparece na base pública consultada.')
    setBusy(true)
    try {
      setRes(await fetchJson(`${BRASIL_API}/cnpj/v1/${c}`, { timeout: 15000 }))
    } catch (e) {
      setErro(apiMessage(e, 'CNPJ não encontrado na Receita Federal. Desconfie de quem informou esse número.'))
    } finally {
      setBusy(false)
    }
  }

  const alertas = []
  if (res) {
    const situacao = String(res.descricao_situacao_cadastral ?? '').toUpperCase()
    if (situacao !== 'ATIVA') alertas.push(['danger', `Situação cadastral: ${situacao || 'desconhecida'}${res.motivo_situacao_cadastral ? ` (${String(res.descricao_motivo_situacao_cadastral || '').toLowerCase()})` : ''}. Empresa que não está ativa não deveria estar vendendo.`])
    const aberta = res.data_inicio_atividade ? new Date(res.data_inicio_atividade) : null
    if (aberta && Date.now() - aberta < 180 * 86400000) alertas.push(['warn', `Empresa aberta há só ${idadeTexto(aberta)}. Golpes costumam usar empresas recém-criadas.`])
    if (res.opcao_pelo_mei) alertas.push(['info', 'É MEI (microempreendedor individual): o faturamento permitido é limitado. Desconfie se vender produtos caros em grande volume.'])
    if (situacao === 'ATIVA' && alertas.length === 0) alertas.push(['ok', 'Empresa ativa na Receita Federal.'])
  }

  const resumo = res
    ? [
        `CNPJ: ${formatCnpj(res.cnpj)}`,
        `Razão social: ${res.razao_social}`,
        res.nome_fantasia && `Nome fantasia: ${res.nome_fantasia}`,
        `Situação: ${res.descricao_situacao_cadastral}`,
        `Abertura: ${isoParaBR(res.data_inicio_atividade)}`,
        `Atividade: ${res.cnae_fiscal} - ${res.cnae_fiscal_descricao}`,
        `Endereço: ${[res.descricao_tipo_de_logradouro, res.logradouro, res.numero, res.complemento, res.bairro, `${res.municipio}/${res.uf}`, `CEP ${res.cep}`].filter(Boolean).join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div className="tool-stack">
      <form className="grid-2" onSubmit={consultar}>
        <Field label="CNPJ">
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" inputMode="numeric" />
        </Field>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Consultando…' : 'Consultar CNPJ'}</button>
        </div>
      </form>
      <Notice kind="error">{erro}</Notice>
      {res && (
        <>
          <ul className="signal-list">
            {alertas.map(([k, t]) => (
              <li key={t} className={k}>{t}</li>
            ))}
          </ul>
          <div className="rows">
            <h2 className="tool-subtitle">{res.nome_fantasia || res.razao_social}</h2>
            {[
              ['CNPJ', formatCnpj(res.cnpj)],
              ['Razão social', res.razao_social],
              ['Nome fantasia', res.nome_fantasia],
              ['Situação', `${res.descricao_situacao_cadastral}${res.data_situacao_cadastral ? ` desde ${isoParaBR(res.data_situacao_cadastral)}` : ''}`],
              ['Abertura', res.data_inicio_atividade && `${isoParaBR(res.data_inicio_atividade)} (${idadeTexto(new Date(res.data_inicio_atividade))})`],
              ['Matriz ou filial', res.descricao_identificador_matriz_filial],
              ['Natureza jurídica', res.natureza_juridica],
              ['Porte', res.porte],
              ['Capital social', res.capital_social ? brl(Number(res.capital_social)) : ''],
              ['Simples Nacional', res.opcao_pelo_simples ? 'Sim' : 'Não'],
              ['MEI', res.opcao_pelo_mei ? 'Sim' : 'Não'],
              ['Atividade principal', `${res.cnae_fiscal} - ${res.cnae_fiscal_descricao}`],
              ['Endereço', [res.descricao_tipo_de_logradouro, res.logradouro, res.numero, res.complemento, res.bairro].filter(Boolean).join(', ')],
              ['Cidade', `${res.municipio}/${res.uf} - CEP ${res.cep}`],
              ['Telefone', [telefone(res.ddd_telefone_1), telefone(res.ddd_telefone_2)].filter(Boolean).join(' / ')],
              ['E-mail', res.email],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="row"><span>{k}</span><strong>{v}</strong></div>
              ))}
          </div>
          {res.qsa?.length > 0 && (
            <div className="rows">
              <h2 className="tool-subtitle">Sócios e administradores</h2>
              {res.qsa.map((s) => (
                <div key={`${s.nome_socio}-${s.qualificacao_socio}`} className="row"><span>{s.qualificacao_socio}</span><strong>{s.nome_socio}</strong></div>
              ))}
            </div>
          )}
          {res.cnaes_secundarios?.filter((c) => c.codigo).length > 0 && (
            <details className="details">
              <summary>Atividades secundárias ({res.cnaes_secundarios.filter((c) => c.codigo).length})</summary>
              <ul className="details-body">
                {res.cnaes_secundarios.filter((c) => c.codigo).map((c) => (
                  <li key={c.codigo}>{c.codigo} - {c.descricao}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="actions">
            <CopyButton text={resumo} label="Copiar resumo" />
          </div>
          <p className="muted small">Dados públicos do Cadastro Nacional da Pessoa Jurídica (Receita Federal), via BrasilAPI. Podem ter alguns dias de atraso.</p>
        </>
      )}
    </div>
  )
}
