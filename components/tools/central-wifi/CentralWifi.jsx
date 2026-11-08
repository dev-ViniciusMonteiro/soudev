'use client'

// Central do Wi-Fi: a pessoa cola a lista de conectados do roteador; o site diz o fabricante e o tipo de cada
// aparelho, guarda apelidos e destaca os novos. Mais um guia por roteador e um check-up de segurança.
// Tudo no navegador: a lista não sai do aparelho.

import { useEffect, useMemo, useState } from 'react'
import './central-wifi.css'
import { EXEMPLO, PERGUNTAS, ROTEADORES, carregarFabricantes, lerLista, macAleatorio, tipoProvavel } from './dados'

const CHAVE = 'central-wifi-v1'
const STATUS = [['conhecido', 'Conhecido', '✓'], ['suspeito', 'Não sei', '?'], ['bloquear', 'Bloquear', '⛔']]

function lerSalvo() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') } catch { return {} }
}

/* ------------------------------ aba 1: quem está ------------------------------ */
function QuemEsta({ aoIrGuia }) {
  const [texto, setTexto] = useState('')
  const [lista, setLista] = useState(null) // [{mac, ip, nome}]
  const [fab, setFab] = useState(null)
  const [salvo, setSalvo] = useState({ aparelhos: {} })
  const [novos, setNovos] = useState(new Set())
  const [erro, setErro] = useState('')

  useEffect(() => {
    const s = lerSalvo()
    setSalvo({ aparelhos: s.aparelhos || {} })
    if (s.ultimoTexto) setTexto(s.ultimoTexto)
    if (new URLSearchParams(window.location.search).get('exemplo') === '1') { setTexto(EXEMPLO); analisar(EXEMPLO) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const gravar = (s) => { setSalvo(s); try { localStorage.setItem(CHAVE, JSON.stringify(s)) } catch {} }

  async function analisar(t = texto) {
    setErro('')
    const achados = lerLista(t)
    if (!achados.length) { setLista(null); setErro('Não achei nenhum endereço MAC no texto. Copie a lista de "dispositivos conectados" do roteador (precisa aparecer o MAC, algo como 3C:5A:37:12:AB:90).'); return }
    try { setFab(await carregarFabricantes()) } catch { setErro('Não consegui carregar a lista de fabricantes. Confira a internet e tente de novo.') }
    const agora = Date.now()
    const ap = { ...salvo.aparelhos }
    const n = new Set()
    for (const a of achados) {
      if (!ap[a.mac]) { n.add(a.mac); ap[a.mac] = { apelido: '', status: 'suspeito', nome: a.nome, primeiro: agora } }
      ap[a.mac] = { ...ap[a.mac], nome: a.nome || ap[a.mac].nome, ip: a.ip, ultimo: agora }
    }
    // na primeira vez, nada é "novo": é o ponto de partida
    const primeiraVez = !Object.keys(salvo.aparelhos).length
    setNovos(primeiraVez ? new Set() : n)
    setLista(achados)
    gravar({ ...salvo, aparelhos: ap, ultimoTexto: t })
  }
  const exemplo = () => { setTexto(EXEMPLO); analisar(EXEMPLO) }
  const mudar = (mac, campos) => gravar({ ...salvo, aparelhos: { ...salvo.aparelhos, [mac]: { ...salvo.aparelhos[mac], ...campos } } })
  const esquecer = () => { if (confirm('Apagar os apelidos e o histórico guardados neste aparelho?')) { gravar({ aparelhos: {} }); setLista(null); setTexto(''); setNovos(new Set()) } }

  const linhas = useMemo(() => (lista || []).map((a) => {
    const aleatorio = macAleatorio(a.mac)
    const fabricante = fab?.get(a.mac.replace(/:/g, '').slice(0, 6)) || ''
    const s = salvo.aparelhos[a.mac] || {}
    return { ...a, aleatorio, fabricante, ...tipoProvavel(a.nome, fabricante, aleatorio), apelido: s.apelido || '', status: s.status || 'suspeito', primeiro: s.primeiro }
  }), [lista, fab, salvo])
  const conta = (st) => linhas.filter((l) => l.status === st).length
  const ausentes = useMemo(() => {
    if (!lista) return []
    const agora = new Set(lista.map((a) => a.mac))
    return Object.entries(salvo.aparelhos).filter(([mac, v]) => !agora.has(mac) && v.status === 'conhecido')
  }, [lista, salvo])

  return (
    <div className="cw-bloco">
      <ol className="cw-passos">
        <li>Abra o painel ou o app do seu roteador e vá em <b>Dispositivos conectados</b> (não sabe onde fica? <button className="cw-link" onClick={aoIrGuia}>veja o guia</button>).</li>
        <li>Selecione a lista inteira, copie e cole aqui. Também vale o resultado do comando <code>arp -a</code> no Windows.</li>
      </ol>
      <textarea className="cw-texto" rows={7} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Cole aqui a lista do roteador. Ex.:\nGalaxy-A54   192.168.0.105   3C:5A:37:12:AB:90'} aria-label="Lista de aparelhos conectados" />
      <div className="cw-acoes">
        <button className="btn btn-primary" onClick={() => analisar()} disabled={!texto.trim()}>Identificar aparelhos</button>
        <button className="btn" onClick={exemplo}>Ver um exemplo</button>
        {Object.keys(salvo.aparelhos).length > 0 && <button className="btn cw-discreto" onClick={esquecer}>Apagar histórico</button>}
      </div>
      {erro && <p className="notice warn">{erro}</p>}

      {linhas.length > 0 && (
        <>
          <div className="cw-resumo">
            <span><b>{linhas.length}</b> aparelho{linhas.length > 1 ? 's' : ''} conectado{linhas.length > 1 ? 's' : ''}</span>
            {novos.size > 0 && <span className="cw-tag novo"><b>{novos.size}</b> novo{novos.size > 1 ? 's' : ''} desde a última vez</span>}
            <span className="cw-tag ok">{conta('conhecido')} conhecido{conta('conhecido') === 1 ? '' : 's'}</span>
            {conta('suspeito') > 0 && <span className="cw-tag sus">{conta('suspeito')} sem identificar</span>}
            {conta('bloquear') > 0 && <span className="cw-tag blq">{conta('bloquear')} para bloquear</span>}
          </div>
          <ul className="cw-lista">
            {linhas.map((l) => (
              <li key={l.mac} className={`cw-ap st-${l.status}${novos.has(l.mac) ? ' novo' : ''}`}>
                <span className="cw-icone" aria-hidden="true">{l.icone}</span>
                <div className="cw-ap-info">
                  <input className="cw-apelido" value={l.apelido} onChange={(e) => mudar(l.mac, { apelido: e.target.value })} placeholder={l.nome || 'Dê um apelido (ex.: TV da sala)'} aria-label={`Apelido de ${l.nome || l.mac}`} />
                  <span className="cw-ap-tipo">{l.tipo}{novos.has(l.mac) && <b className="cw-novo">NOVO</b>}</span>
                  <span className="cw-ap-det">
                    {l.fabricante ? <>Fabricante: <b>{l.fabricante}</b></> : l.aleatorio ? <>Endereço <b>privado</b> (o celular esconde o fabricante)</> : <>Fabricante não encontrado</>}
                    {l.ip && <> · IP {l.ip}</>} · <span className="mono">{l.mac}</span>
                  </span>
                </div>
                <div className="cw-status" role="group" aria-label="Situação">
                  {STATUS.map(([k, n, ic]) => (
                    <button key={k} className={l.status === k ? `ativo ${k}` : ''} aria-pressed={l.status === k} onClick={() => mudar(l.mac, { status: k })}>{ic} {n}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {ausentes.length > 0 && <p className="muted small">Fora da rede agora: {ausentes.map(([mac, v]) => v.apelido || v.nome || mac).join(', ')}.</p>}
          {conta('bloquear') > 0 && (
            <div className="notice">
              <b>Como bloquear:</b> o site não consegue mexer no roteador. Abra o painel e use <b>Controle de acesso</b> ou <b>Filtro MAC</b> com o endereço acima (<button className="cw-link" onClick={aoIrGuia}>guia por roteador</button>).
              Se o aparelho tem endereço <b>privado</b>, ele pode mudar de endereço: aí o jeito certo é <b>trocar a senha do Wi-Fi</b> e reconectar só os seus aparelhos.
            </div>
          )}
          <p className="muted small">🔒 A lista é lida só no seu navegador. Os apelidos ficam guardados neste aparelho e nada é enviado.</p>
        </>
      )}
    </div>
  )
}

/* ------------------------------ aba 2: guia ------------------------------ */
function Guia() {
  const [r, setR] = useState('tplink')
  const rot = ROTEADORES.find((x) => x.id === r)
  return (
    <div className="cw-bloco">
      <h3>1. Descubra o endereço do roteador</h3>
      <ul className="cw-dicas">
        <li><b>Windows:</b> abra o Prompt de Comando, digite <code>ipconfig</code> e veja o <b>Gateway Padrão</b>.</li>
        <li><b>Android:</b> Configurações → Wi-Fi → toque na rede conectada → <b>Gateway</b> ou <b>Roteador</b>.</li>
        <li><b>iPhone:</b> Ajustes → Wi-Fi → ⓘ ao lado da rede → <b>Roteador</b>.</li>
        <li>Digite esse número no navegador (ex.: <code>192.168.0.1</code>). O usuário e a senha do painel costumam estar na <b>etiqueta embaixo do roteador</b>.</li>
      </ul>
      <h3>2. Escolha o seu roteador</h3>
      <div className="cw-chips">
        {ROTEADORES.map((x) => <button key={x.id} className={`chip${r === x.id ? ' active' : ''}`} onClick={() => setR(x.id)}>{x.nome}</button>)}
      </div>
      <div className="cw-rot">
        <p><b>Endereço do painel:</b> {rot.ip}</p>
        <p><b>App no celular:</b> {rot.app}</p>
        <p><b>Ver quem está conectado:</b></p>
        <ul>{rot.ver.map((v) => <li key={v}>{v}</li>)}</ul>
        <p><b>Bloquear um aparelho:</b></p>
        <ul>{rot.bloquear.map((v) => <li key={v}>{v}</li>)}</ul>
        <p className="muted small">Os nomes dos menus mudam de um modelo para outro. Se não achar, procure palavras parecidas.</p>
      </div>
      <h3>3. O jeito mais garantido de tirar todo mundo</h3>
      <p>Troque a <b>senha do Wi-Fi</b>: todos os aparelhos caem e só volta quem souber a nova. Use o <a href="/ferramentas/gerador-senha">Gerador de senha forte</a> e, para as visitas, o <a href="/ferramentas/gerador-qr-code">QR Code do Wi-Fi</a>.</p>
    </div>
  )
}

/* ------------------------------ aba 3: check-up ------------------------------ */
function forcaSenha(s) {
  if (!s) return null
  let conj = 0
  if (/[a-z]/.test(s)) conj += 26
  if (/[A-Z]/.test(s)) conj += 26
  if (/\d/.test(s)) conj += 10
  if (/[^a-zA-Z0-9]/.test(s)) conj += 33
  const bits = Math.round(s.length * Math.log2(Math.max(conj, 2)))
  const fraca = /^(.)\1+$/.test(s) || /^(12345678|password|senha123|qwerty)/i.test(s)
  // Wi-Fi: quem captura a conexão pode testar senhas offline, então menos de 10 caracteres é fraca
  if (fraca || s.length < 10 || bits < 50) return { nota: 'Fraca', cls: 'blq', bits }
  if (s.length < 14 || bits < 70) return { nota: 'Média', cls: 'sus', bits }
  return { nota: 'Forte', cls: 'ok', bits }
}

function Checkup() {
  const [resp, setResp] = useState({})
  const [senha, setSenha] = useState('')
  useEffect(() => { try { setResp(lerSalvo().checkup || {}) } catch {} }, [])
  const responder = (id, v) => {
    const n = { ...resp, [id]: v }
    setResp(n)
    try { const s = lerSalvo(); localStorage.setItem(CHAVE, JSON.stringify({ ...s, checkup: n })) } catch {}
  }
  const respondidas = PERGUNTAS.filter((q) => resp[q.id] && resp[q.id] !== 'naosei')
  const total = respondidas.reduce((s, q) => s + q.peso, 0)
  const pontos = respondidas.reduce((s, q) => s + (resp[q.id] === q.bom ? q.peso : 0), 0)
  const nota = total ? Math.round((pontos / total) * 100) : null
  const problemas = PERGUNTAS.filter((q) => resp[q.id] && resp[q.id] !== q.bom)
  const f = forcaSenha(senha)

  return (
    <div className="cw-bloco">
      <ol className="cw-perguntas">
        {PERGUNTAS.map((q) => (
          <li key={q.id}>
            <span>{q.p}</span>
            <div className="cw-sn" role="group" aria-label={q.p}>
              {[['sim', 'Sim'], ['nao', 'Não'], ['naosei', 'Não sei']].map(([v, n]) => (
                <button key={v} className={resp[q.id] === v ? 'ativo' : ''} aria-pressed={resp[q.id] === v} onClick={() => responder(q.id, v)}>{n}</button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {nota !== null && (
        <div className={`cw-nota ${nota >= 80 ? 'ok' : nota >= 50 ? 'sus' : 'blq'}`}>
          <strong>{nota}</strong><span>/100</span>
          <p>{nota >= 80 ? 'Seu Wi-Fi está bem protegido.' : nota >= 50 ? 'Dá para melhorar: veja o que arrumar abaixo.' : 'Seu Wi-Fi está vulnerável: arrume os itens abaixo.'}</p>
        </div>
      )}
      {problemas.length > 0 && (
        <ul className="cw-arrumar">
          {problemas.map((q) => <li key={q.id}><b>{q.p.replace(/\?$/, '')}:</b> {q.dica}</li>)}
        </ul>
      )}
      {PERGUNTAS.some((q) => resp[q.id] === 'naosei') && <p className="muted small">Para os itens "Não sei", abra o painel do roteador (veja o guia) e confira.</p>}

      <h3>Teste a força da senha do Wi-Fi</h3>
      <input type="password" className="cw-senha" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite a senha (não sai do seu aparelho)" aria-label="Senha do Wi-Fi para testar" autoComplete="off" />
      {f && <p className={`cw-forca ${f.cls}`}>Senha <b>{f.nota}</b> · {senha.length} caracteres · cerca de {f.bits} bits</p>}
    </div>
  )
}

/* ------------------------------ ferramenta ------------------------------ */
export default function CentralWifi() {
  const [aba, setAba] = useState('quem')
  const abas = [['quem', '📶 Quem está no meu Wi-Fi'], ['guia', '🧭 Como ver no meu roteador'], ['checkup', '🛡️ Check-up de segurança']]
  return (
    <div className="cw">
      <div className="tabs cw-abas" role="tablist">
        {abas.map(([k, n]) => <button key={k} role="tab" aria-selected={aba === k} className={`tab${aba === k ? ' active' : ''}`} onClick={() => setAba(k)}>{n}</button>)}
      </div>
      {aba === 'quem' && <QuemEsta aoIrGuia={() => setAba('guia')} />}
      {aba === 'guia' && <Guia />}
      {aba === 'checkup' && <Checkup />}
    </div>
  )
}
