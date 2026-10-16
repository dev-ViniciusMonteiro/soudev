'use client'

import { useState } from 'react'
import { Field, Notice } from '../ui'
import { BRASIL_API, fetchJson, idadeTexto, isoParaBR } from '@/lib/apis'
import { formatCnpj, limparCnpj, validarCnpj } from '@/lib/br'

// Marcas muito imitadas em sites falsos: padrão no endereço e domínios oficiais.
const MARCAS = [
  [/mercadoli[vb]re/, 'Mercado Livre', ['mercadolivre.com.br', 'mercadolivre.com', 'mercadopago.com.br']],
  [/mercadopago/, 'Mercado Pago', ['mercadopago.com.br', 'mercadopago.com']],
  [/magalu|magazineluiza/, 'Magazine Luiza', ['magazineluiza.com.br', 'magalu.com.br', 'magalu.com']],
  [/americanas/, 'Americanas', ['americanas.com.br']],
  [/casasbahia/, 'Casas Bahia', ['casasbahia.com.br']],
  [/pontofrio/, 'Ponto', ['pontofrio.com.br']],
  [/amazon(?!as|ia|ense)/, 'Amazon', ['amazon.com.br', 'amazon.com']],
  [/shopee/, 'Shopee', ['shopee.com.br', 'shopee.com']],
  [/shein/, 'Shein', ['shein.com', 'shein.com.br']],
  [/aliexpress/, 'AliExpress', ['aliexpress.com']],
  [/netshoes/, 'Netshoes', ['netshoes.com.br']],
  [/kabum/, 'KaBuM!', ['kabum.com.br']],
  [/carrefour/, 'Carrefour', ['carrefour.com.br']],
  [/havan/, 'Havan', ['havan.com.br']],
  [/lojasrenner|renneroficial/, 'Renner', ['lojasrenner.com.br']],
  [/boticario/, 'O Boticário', ['boticario.com.br']],
  [/naturacosmeticos|naturaoficial/, 'Natura', ['natura.com.br']],
  [/nike(?!l)/, 'Nike', ['nike.com.br', 'nike.com']],
  [/adidas/, 'Adidas', ['adidas.com.br', 'adidas.com']],
  [/samsung/, 'Samsung', ['samsung.com']],
  [/iphone|appleoficial|applestore/, 'Apple', ['apple.com']],
  [/correios/, 'Correios', ['correios.com.br']],
  [/nubank/, 'Nubank', ['nubank.com.br']],
  [/itauunibanco|bancoitau|itau(?=[-.]|$)/, 'Itaú', ['itau.com.br']],
  [/bradesco/, 'Bradesco', ['bradesco.com.br']],
  [/santander/, 'Santander', ['santander.com.br']],
  [/caixatem|caixaeconomica|caixafederal/, 'Caixa', ['caixa.gov.br']],
  [/picpay/, 'PicPay', ['picpay.com']],
  [/serasa/, 'Serasa', ['serasa.com.br']],
]
// Palavras de órgãos públicos: site oficial sempre termina em .gov.br.
const GOVERNO = /govbr|gov-br|detran|receitafederal|senatran|denatran|sefaz|ipva|fgts|bolsafamilia|cnhsocial|cnhdigital|(^|[.-])inss([.-]|$)/
const ISCA = ['oferta', 'promo', 'desconto', 'liquida', 'outlet', 'queima', 'saldao', 'blackfriday', 'black', 'barato', 'gratis', 'premio', 'brinde', 'cupom']
const TLD_RISCO = ['shop', 'store', 'online', 'site', 'xyz', 'top', 'click', 'buzz', 'icu', 'live', 'fun', 'space', 'sbs', 'cfd', 'today', 'vip']
const SEGUNDO_NIVEL_BR = new Set(['com', 'net', 'org', 'gov', 'edu', 'ind', 'art', 'blog', 'eco', 'emp', 'eti', 'inf', 'tur', 'adv', 'arq', 'eng', 'med', 'srv', 'tv', 'app', 'dev', 'log', 'tec', 'agr', 'far', 'imb', 'rec', 'mus', 'leg', 'jus', 'mil', 'coop'])

function dominioDe(entrada) {
  let texto = entrada.trim().toLowerCase()
  if (!texto) return null
  if (!/^[a-z]+:\/\//.test(texto)) texto = `https://${texto}`
  try {
    const url = new URL(texto)
    const host = url.hostname.replace(/^www\./, '').replace(/\.$/, '')
    if (!host.includes('.')) return null
    const partes = host.split('.')
    const n = partes.length >= 3 && partes.at(-1) === 'br' && SEGUNDO_NIVEL_BR.has(partes.at(-2)) ? 3 : 2
    return { host, dominio: partes.slice(-n).join('.'), protocolo: url.protocol, ehIp: /^\d+\.\d+\.\d+\.\d+$/.test(host) }
  } catch {
    return null
  }
}

/** Sinais tirados só do endereço do site. */
function sinaisDoEndereco({ host, dominio, protocolo, ehIp }) {
  const s = []
  const compacto = host.replace(/[-.]/g, '')
  if (ehIp) s.push(['danger', 'O endereço é um número de IP, não um nome de site. Lojas e bancos de verdade não usam isso.'])
  if (protocolo === 'http:') s.push(['warn', 'O link começa com http:// (sem cadeado). Nunca digite senha ou cartão em site sem https.'])
  if (host.includes('xn--')) s.push(['danger', 'O endereço usa letras especiais que imitam outras (ex.: "а" russo no lugar de "a"). Truque comum de sites falsos.'])
  for (const [padrao, marca, oficiais] of MARCAS) {
    if ((padrao.test(compacto) || padrao.test(host)) && !oficiais.some((o) => dominio === o || host.endsWith(`.${o}`))) {
      s.push(['danger', `O endereço usa o nome ${marca}, mas não é o site oficial (${oficiais[0]}). Golpistas copiam marcas famosas.`])
      break
    }
  }
  const pareceGoverno = GOVERNO.test(host) || GOVERNO.test(compacto) || host.split('.').includes('gov')
  if (pareceGoverno && !host.endsWith('.gov.br')) {
    s.push(['danger', 'O endereço parece de órgão público (Detran, Receita, INSS, CNH...), mas não termina em .gov.br. Sites oficiais do governo sempre terminam em .gov.br.'])
  }
  const isca = ISCA.filter((p) => compacto.includes(p))
  if (isca.length) s.push(['warn', `O endereço tem palavras de isca (${isca.join(', ')}). Sozinho não prova nada, mas é comum em lojas falsas.`])
  const tld = host.split('.').at(-1)
  if (TLD_RISCO.includes(tld)) s.push(['warn', `A terminação .${tld} é barata e muito usada em sites de golpe. Desconfie se for uma "loja famosa".`])
  if ((dominio.match(/-/g) ?? []).length >= 2 || /\d{3,}/.test(dominio)) s.push(['warn', 'O nome tem muitos hífens ou números, o que é raro em lojas conhecidas.'])
  return s
}

async function consultarDominio(dominio) {
  const url = dominio.endsWith('.br') ? `https://rdap.registro.br/domain/${dominio}` : `https://rdap.org/domain/${dominio}`
  const r = await fetchJson(url, { timeout: 15000 })
  const evento = (tipo) => r.events?.find((e) => e.eventAction === tipo)?.eventDate
  const titular = r.entities?.find((e) => e.roles?.includes('registrant'))
  const doc = titular?.publicIds?.find((p) => ['cnpj', 'cpf'].includes(String(p.type).toLowerCase()))
  return { criado: evento('registration'), expira: evento('expiration'), alterado: evento('last changed'), documento: doc ? { tipo: doc.type.toLowerCase(), numero: doc.identifier } : null }
}

export default function VerificarSite() {
  const [site, setSite] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')
  const [res, setRes] = useState(null)

  const verificar = async (event) => {
    event.preventDefault()
    setErro('')
    setRes(null)
    const d = dominioDe(site)
    if (!d) return setErro('Cole o endereço do site, por exemplo: lojaexemplo.com.br')
    const cnpjDigitado = limparCnpj(cnpj)
    if (cnpjDigitado && !validarCnpj(cnpjDigitado)) return setErro('O CNPJ digitado é inválido. Confira os números (ou deixe em branco).')
    setBusy(true)
    const sinais = sinaisDoEndereco(d)
    let registro = null
    let registroErro = ''
    if (!d.ehIp) {
      try {
        registro = await consultarDominio(d.dominio)
      } catch (e) {
        registroErro = e?.status === 404 ? 'Esse domínio não aparece como registrado. Pode ser erro de digitação ou um site que já saiu do ar.' : 'Não foi possível consultar o registro do domínio agora.'
      }
    }
    if (registro?.criado) {
      const dias = (Date.now() - new Date(registro.criado)) / 86400000
      if (dias < 90) sinais.unshift(['danger', `O site foi criado há apenas ${idadeTexto(new Date(registro.criado))}. Lojas falsas costumam durar poucas semanas.`])
      else if (dias < 365) sinais.unshift(['warn', `O site existe há ${idadeTexto(new Date(registro.criado))}. É recente: pesquise a reputação antes de comprar.`])
      else sinais.push(['ok', `O domínio existe há ${idadeTexto(new Date(registro.criado))}.`])
    }
    if (registro?.documento?.tipo === 'cpf') sinais.push(['warn', 'O domínio está em nome de uma pessoa física (CPF), não de uma empresa. Estranho para uma loja.'])

    // CNPJ: o digitado ou o do dono do domínio .br
    const alvo = cnpjDigitado || (registro?.documento?.tipo === 'cnpj' ? limparCnpj(registro.documento.numero) : '')
    let empresa = null
    if (alvo) {
      try {
        empresa = await fetchJson(`${BRASIL_API}/cnpj/v1/${alvo}`, { timeout: 15000 })
        const situacao = String(empresa.descricao_situacao_cadastral ?? '').toUpperCase()
        if (situacao && situacao !== 'ATIVA') sinais.unshift(['danger', `O CNPJ ${formatCnpj(alvo)} está com situação "${situacao}" na Receita Federal.`])
        else sinais.push(['ok', `CNPJ ativo: ${empresa.nome_fantasia || empresa.razao_social}.`])
        if (empresa.data_inicio_atividade) {
          const meses = (Date.now() - new Date(empresa.data_inicio_atividade)) / (86400000 * 30.44)
          if (meses < 6) sinais.unshift(['warn', `A empresa foi aberta há menos de 6 meses (${isoParaBR(empresa.data_inicio_atividade)}).`])
        }
        if (cnpjDigitado && registro?.documento?.tipo === 'cnpj' && limparCnpj(registro.documento.numero) !== cnpjDigitado) {
          sinais.unshift(['warn', 'O CNPJ que aparece no site é diferente do CNPJ dono do domínio. Pode ser normal (grupo de empresas), mas confira.'])
        }
      } catch (e) {
        if (e?.status === 404) sinais.unshift(['danger', `O CNPJ ${formatCnpj(alvo)} não foi encontrado na Receita Federal.`])
      }
    } else if (d.dominio.endsWith('.br')) {
      sinais.push(['info', 'Procure o CNPJ no rodapé do site e digite acima para conferir a empresa na Receita.'])
    } else {
      sinais.push(['warn', 'Não achamos um CNPJ ligado a este site. Loja brasileira séria mostra o CNPJ no rodapé: digite-o acima para conferir.'])
    }

    const nivel = sinais.some(([k]) => k === 'danger') ? 'danger' : sinais.filter(([k]) => k === 'warn').length >= 2 ? 'warn' : 'ok'
    setRes({ d, registro, registroErro, empresa, sinais, nivel })
    setBusy(false)
  }

  const veredito = {
    danger: ['Alto risco', 'Encontramos sinais fortes de golpe. Não pague, não informe dados e não clique em links desse site.'],
    warn: ['Atenção', 'Há sinais que pedem cuidado. Pesquise a reputação e prefira pagar com cartão de crédito (dá para contestar).'],
    ok: ['Nenhum sinal grave encontrado', 'Isso não garante que o site é seguro: confira os pontos abaixo antes de comprar.'],
  }

  return (
    <div className="tool-stack">
      <form className="grid-2" onSubmit={verificar}>
        <Field label="Endereço do site ou link" hint="Cole o link que recebeu ou o endereço da loja.">
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="lojaexemplo.com.br" autoCapitalize="none" spellCheck="false" />
        </Field>
        <Field label="CNPJ que aparece no site (opcional)" hint="Fica no rodapé de lojas sérias.">
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
        </Field>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Verificando…' : 'Verificar site'}</button>
        </div>
      </form>
      <Notice kind="error">{erro}</Notice>
      {res && (
        <>
          <div className={`verdict ${res.nivel}`}>
            <strong>{veredito[res.nivel][0]}</strong>
            <span>{veredito[res.nivel][1]}</span>
          </div>
          <ul className="signal-list">
            {res.sinais.map(([k, texto]) => (
              <li key={texto} className={k}>{texto}</li>
            ))}
          </ul>
          <div className="rows">
            <h2 className="tool-subtitle">Dados encontrados</h2>
            <div className="row"><span>Domínio</span><strong>{res.d.dominio}</strong></div>
            {res.registro?.criado && <div className="row"><span>Registrado em</span><strong>{isoParaBR(res.registro.criado)} ({idadeTexto(new Date(res.registro.criado))})</strong></div>}
            {res.registro?.expira && <div className="row"><span>Vence em</span><strong>{isoParaBR(res.registro.expira)}</strong></div>}
            {res.registro?.documento && <div className="row"><span>Dono do domínio</span><strong>{res.registro.documento.tipo.toUpperCase()} {res.registro.documento.numero}</strong></div>}
            {res.registroErro && <div className="row"><span>Registro</span><strong>{res.registroErro}</strong></div>}
            {res.empresa && (
              <>
                <div className="row"><span>Empresa</span><strong>{res.empresa.razao_social}</strong></div>
                <div className="row"><span>Situação na Receita</span><strong>{res.empresa.descricao_situacao_cadastral}</strong></div>
                <div className="row"><span>Aberta em</span><strong>{isoParaBR(res.empresa.data_inicio_atividade)}</strong></div>
                <div className="row"><span>Atividade</span><strong>{res.empresa.cnae_fiscal_descricao}</strong></div>
                <div className="row"><span>Cidade</span><strong>{res.empresa.municipio}/{res.empresa.uf}</strong></div>
              </>
            )}
          </div>
          <div className="actions">
            <a className="btn btn-ghost" href={`https://www.reclameaqui.com.br/busca/?q=${encodeURIComponent(res.d.dominio.split('.')[0])}`} target="_blank" rel="noopener noreferrer">Ver no Reclame Aqui</a>
            <a className="btn btn-ghost" href={`https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(res.d.host)}`} target="_blank" rel="noopener noreferrer">Checar no Google (Navegação segura)</a>
          </div>
          <Notice kind="info">Antes de pagar: desconfie de preço muito abaixo do normal, de pagamento só por Pix para pessoa física e de pressa ("só hoje"). Em dúvida, compre pelo site oficial digitando o endereço você mesmo.</Notice>
        </>
      )}
    </div>
  )
}
