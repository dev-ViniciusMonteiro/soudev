'use client'

import { useEffect, useMemo, useState } from 'react'
import { CLAIMS, DATAS, HEADERS, algSuportado, decodificar, gerarHs, precisaSegredo, tempoRelativo, verificar } from '@/lib/dev/jwt'
import { Abas, Aviso, Codigo, Copiar, usePersistente } from './comum'

// token de exemplo HS256 assinado com o segredo "segredo-de-teste"
const EXEMPLO =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFuYSBTb3V6YSIsInJvbGVzIjpbImFkbWluIl0sImlhdCI6MTc2MjAwMDAwMCwiZXhwIjo0MTAyNDQ0ODAwfQ.XJuVo0zTzlUkOAC3tmDmCLHABTgABS3MHLmw_qdrP0g'

const dataBr = (s) => new Date(s * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })

function Tabela({ obj, nomes, agora }) {
  return (
    <table className="dv-tabela dv-claims">
      <tbody>
        {Object.entries(obj).map(([k, v]) => {
          const ehData = DATAS.includes(k) && typeof v === 'number'
          const venc = k === 'exp' && ehData && v < agora
          const futuro = k === 'nbf' && ehData && v > agora
          return (
            <tr key={k}>
              <td><code className="dv-j-chave">{k}</code></td>
              <td>
                <code className="dv-claim-v">{typeof v === 'string' ? v : JSON.stringify(v)}</code>
                {ehData && (
                  <small className="dv-claim-data" data-ruim={venc || futuro || undefined}>
                    {dataBr(v)} · {tempoRelativo(v, agora)}
                    {venc && ' · EXPIRADO'}
                    {futuro && ' · ainda não vale'}
                  </small>
                )}
              </td>
              <td className="dv-muted">{nomes[k] || ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Decodificar() {
  const [token, setToken] = usePersistente('4dev-jwt', '')
  const [chave, setChave] = useState('')
  const [b64, setB64] = useState(false)
  const [res, setRes] = useState(null)
  const [agora, setAgora] = useState(() => Date.now() / 1000)
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now() / 1000), 1000)
    return () => clearInterval(t)
  }, [])
  const d = useMemo(() => decodificar(token), [token])
  useEffect(() => setRes(null), [token, chave, b64])

  const conferir = async () => {
    try {
      setRes((await verificar(token, chave, b64)) ? 'ok' : 'falhou')
    } catch (e) {
      setRes(`erro:${e.message}`)
    }
  }

  const exp = d.payload?.exp
  const partes = String(token).trim().replace(/^Bearer\s+/i, '').split('.')

  return (
    <>
      <div className="dv-barra">
        <span className="dv-rotulo">Token</span>
        <span className="dv-espaco" />
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setToken(EXEMPLO)}>Exemplo</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setToken('')}>Limpar</button>
      </div>
      <textarea
        className="dv-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Cole o JWT aqui (pode ser com “Bearer ” na frente)…"
        spellCheck={false}
        rows={4}
        aria-label="Token JWT"
      />
      {token.trim() && partes.length === 3 && (
        <p className="dv-token-cor" aria-hidden="true">
          <span className="dv-t-h">{partes[0]}</span>.<span className="dv-t-p">{partes[1]}</span>.<span className="dv-t-s">{partes[2]}</span>
        </p>
      )}
      {d.erro && <Aviso tipo="erro">{d.erro}</Aviso>}
      {d.header && (
        <>
          <div className="dv-chips">
            <span className="dv-chip" data-cor="h">alg: {d.header.alg}</span>
            {d.header.typ && <span className="dv-chip">typ: {d.header.typ}</span>}
            {typeof exp === 'number' && (
              <span className="dv-chip" data-cor={exp < agora ? 'ruim' : 'bom'}>
                {exp < agora ? `expirou ${tempoRelativo(exp, agora)}` : `expira ${tempoRelativo(exp, agora)}`}
              </span>
            )}
            <span className="dv-chip">{new Blob([token.trim()]).size} bytes</span>
          </div>
          {d.problemas.map((p) => (
            <Aviso key={p} tipo="alerta">⚠ {p}</Aviso>
          ))}
          <div className="dv-grade2">
            <div>
              <p className="dv-rotulo"><span className="dv-t-h">●</span> Header</p>
              <Tabela obj={d.header} nomes={HEADERS} agora={agora} />
              <Codigo valor={JSON.stringify(d.header, null, 2)} somenteLeitura linhas={5} rotulo="Header JSON" />
            </div>
            <div>
              <p className="dv-rotulo"><span className="dv-t-p">●</span> Payload (claims)</p>
              {d.payload && typeof d.payload === 'object' ? <Tabela obj={d.payload} nomes={CLAIMS} agora={agora} /> : <code>{String(d.payload)}</code>}
              <div className="dv-barra"><span className="dv-espaco" /><Copiar texto={JSON.stringify(d.payload, null, 2)} rotulo="Copiar payload" /></div>
            </div>
          </div>

          <div className="dv-caixa">
            <p className="dv-rotulo"><span className="dv-t-s">●</span> Verificar assinatura</p>
            {!algSuportado(d.header.alg) ? (
              <Aviso>Algoritmo {String(d.header.alg)} não é verificado aqui.</Aviso>
            ) : precisaSegredo(d.header.alg) ? (
              <div className="dv-barra">
                <input className="dv-input" type="text" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Segredo (secret) do HMAC" spellCheck={false} />
                <label className="dv-check"><input type="checkbox" checked={b64} onChange={(e) => setB64(e.target.checked)} /> segredo em base64</label>
                <button type="button" className="dv-btn" onClick={conferir} disabled={!chave}>Verificar</button>
              </div>
            ) : (
              <>
                <Codigo valor={chave} onChange={setChave} linhas={6} rotulo="Chave pública" placeholder={'-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n\nou o JWK / JWKS em JSON'} />
                <div className="dv-barra"><button type="button" className="dv-btn" onClick={conferir} disabled={!chave.trim()}>Verificar</button></div>
              </>
            )}
            {res === 'ok' && <Aviso tipo="ok">✓ Assinatura válida: o token foi assinado com essa chave e não foi alterado.</Aviso>}
            {res === 'falhou' && <Aviso tipo="erro">✗ Assinatura inválida: chave errada ou token alterado.</Aviso>}
            {res?.startsWith('erro:') && <Aviso tipo="erro">{res.slice(5)}</Aviso>}
            <p className="dv-dica">A chave é usada só aqui no navegador (WebCrypto) e não é enviada.</p>
          </div>
        </>
      )}
    </>
  )
}

function Gerar() {
  const agora = Math.floor(Date.now() / 1000)
  const [header, setHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}')
  const [payload, setPayload] = useState(`{\n  "sub": "1234",\n  "name": "Ana Souza",\n  "iat": ${agora},\n  "exp": ${agora + 3600}\n}`)
  const [segredo, setSegredo] = useState('segredo-de-teste')
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const t = await gerarHs(JSON.parse(header), JSON.parse(payload), segredo)
        if (vivo) {
          setToken(t)
          setErro('')
        }
      } catch (e) {
        if (vivo) setErro(e.message)
      }
    })()
    return () => {
      vivo = false
    }
  }, [header, payload, segredo])
  return (
    <>
      <div className="dv-grade2">
        <div>
          <p className="dv-rotulo">Header</p>
          <Codigo valor={header} onChange={setHeader} linhas={5} rotulo="Header" />
          <p className="dv-rotulo">Payload</p>
          <Codigo valor={payload} onChange={setPayload} linhas={10} rotulo="Payload" />
          <p className="dv-rotulo">Segredo</p>
          <input className="dv-input" value={segredo} onChange={(e) => setSegredo(e.target.value)} spellCheck={false} />
        </div>
        <div>
          <p className="dv-rotulo">Token gerado</p>
          {erro ? <Aviso tipo="erro">{erro}</Aviso> : <textarea className="dv-token" readOnly value={token} rows={8} aria-label="Token gerado" />}
          <div className="dv-barra"><Copiar texto={token} rotulo="Copiar token" /></div>
          <p className="dv-dica">Use para testes. Em produção, gere tokens no servidor com um segredo longo e aleatório.</p>
        </div>
      </div>
    </>
  )
}

export default function JwtDecoder() {
  const [aba, setAba] = useState('ler')
  return (
    <div className="dv-ferramenta">
      <Abas valor={aba} onChange={setAba} abas={[['ler', 'Decodificar e verificar'], ['gerar', 'Gerar token (HS256)']]} />
      {aba === 'ler' ? <Decodificar /> : <Gerar />}
    </div>
  )
}
