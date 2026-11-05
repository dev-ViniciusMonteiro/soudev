'use client'

// Karaokê: cola o link do YouTube, o vídeo toca no player oficial e a letra aparece sincronizada, ficando verde
// palavra por palavra. A letra vem do LRCLIB (base aberta de letras sincronizadas), achada pelo nome do vídeo;
// se não houver, a pessoa cola a letra e marca o começo de cada linha uma vez (fica salvo no aparelho).
// O site não baixa nem altera o áudio do YouTube: só toca o vídeo pelo player oficial.

import { useCallback, useEffect, useRef, useState } from 'react'

const CHAVE = 'karaoke-v1'

/* ---------------- utilidades ---------------- */

export function idDoLink(s) {
  const t = String(s || '').trim()
  const m = t.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/) || t.match(/^([\w-]{11})$/)
  return m ? m[1] : null
}

let apiPromessa = null
function carregarApiYoutube() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  apiPromessa ??= new Promise((ok, falha) => {
    const anterior = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { anterior?.(); ok(window.YT) }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.onerror = () => { apiPromessa = null; falha(new Error('Não consegui carregar o player do YouTube. Confira a internet.')) }
    document.head.appendChild(s)
  })
  return apiPromessa
}

const LIXO = /(official|oficial|music video|lyric[s]?|letra|video clipe|videoclipe|clipe|karaok[eê]|playback|instrumental|audio|áudio|ao vivo|live|hd|4k|remaster(ed)?|visualizer|legendad[oa]|com letra)/i
/** "Chitãozinho & Xororó - Evidências (Ao Vivo) [Clipe Oficial]" → { artista, musica } */
export function limparTitulo(titulo, canal = '') {
  let t = String(titulo || '')
    .replace(/[([{][^)\]}]*[)\]}]/g, (m) => (LIXO.test(m) ? ' ' : m))
    .replace(/\b(karaok[eê]|playback|com letra|lyrics?|letra)\b/gi, ' ')
    .replace(/\s*[|•].*$/, '')
    .replace(/\s+/g, ' ').trim()
  let [artista, ...resto] = t.split(/\s+[-–—]\s+/)
  let musica = resto.join(' - ').trim()
  if (!musica) { musica = artista; artista = String(canal).replace(/\s*(VEVO|- Topic|Oficial|Official|TV)$/i, '').trim() }
  musica = musica.replace(/\s+(ft\.?|feat\.?|part\.?)\s.*$/i, '').trim()
  return { artista: artista.trim(), musica }
}

/** Texto LRC → [{ t: segundos, texto }] em ordem. */
export function lerLrc(lrc) {
  const linhas = []
  for (const l of String(lrc || '').split(/\r?\n/)) {
    const tempos = [...l.matchAll(/\[(\d+):(\d+(?:[.,]\d+)?)\]/g)]
    if (!tempos.length) continue
    const texto = l.replace(/\[[^\]]*\]/g, '').trim()
    for (const [, mm, ss] of tempos) linhas.push({ t: Number(mm) * 60 + Number(ss.replace(',', '.')), texto: texto || '♪' })
  }
  return linhas.sort((a, b) => a.t - b.t)
}

async function buscarLetras(artista, musica, duracao) {
  const pedir = async (params) => {
    const r = await fetch('https://lrclib.net/api/search?' + new URLSearchParams(params))
    return r.ok ? r.json() : []
  }
  let lista = artista && musica ? await pedir({ track_name: musica, artist_name: artista }) : []
  if (!lista.some((x) => x.syncedLyrics)) lista = lista.concat(await pedir({ q: `${artista} ${musica}`.trim() }))
  const vistos = new Set()
  return lista
    .filter((x) => x.syncedLyrics && !vistos.has(x.id) && vistos.add(x.id))
    .map((x) => ({ id: x.id, nome: x.trackName, artista: x.artistName, duracao: x.duration, lrc: x.syncedLyrics }))
    .sort((a, b) => (duracao ? Math.abs(a.duracao - duracao) - Math.abs(b.duracao - duracao) : 0))
    .slice(0, 12)
}

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') } catch { return {} } }
const gravar = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)) } catch { /* sem armazenamento */ } }
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/* ---------------- componente ---------------- */

export default function Karaoke() {
  const [link, setLink] = useState('')
  const [videoId, setVideoId] = useState(null)
  const [info, setInfo] = useState(null) // { titulo, canal, artista, musica }
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)
  const [letras, setLetras] = useState([])
  const [fonte, setFonte] = useState(null) // { tipo: 'lrclib'|'manual', id?, nome? }
  const [opcoes, setOpcoes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [busca, setBusca] = useState('')
  const [offset, setOffset] = useState(0)
  const [mudo, setMudo] = useState(false)
  const [volume, setVolume] = useState(100)
  const [indice, setIndice] = useState(-1)
  const [antes, setAntes] = useState(null) // segundos até a primeira linha
  const [historico, setHistorico] = useState([])
  const [manual, setManual] = useState(null) // { texto, linhas, marcadas, etapa: 'colar'|'marcar' }
  const [mic, setMic] = useState(null) // { ctx, stream, ganho }
  const [micVol, setMicVol] = useState(80)
  const [cheia, setCheia] = useState(false)
  const [nomeBusca, setNomeBusca] = useState('')

  const player = useRef(null)
  const caixaVideo = useRef(null)
  const palco = useRef(null)
  const linhaAtual = useRef(null)
  const estado = useRef({ letras: [], offset: 0, indice: -1, antes: null })
  estado.current.letras = letras
  estado.current.offset = offset

  useEffect(() => { setHistorico(ler().historico || []) }, [])

  /* abrir vídeo */
  const abrir = useCallback((valor) => {
    const id = idDoLink(valor)
    if (!id) { setErro('Não reconheci esse link. Copie o endereço do vídeo no YouTube (ex.: youtube.com/watch?v=… ou youtu.be/…).'); return }
    setErro(''); setVideoId(id); setInfo(null); setLetras([]); setFonte(null); setOpcoes([]); setIndice(-1); setManual(null); setPronto(false)
    const salvo = ler().videos?.[id]
    setOffset(salvo?.offset || 0)
    try { const u = new URL(window.location.href); u.searchParams.set('v', id); window.history.replaceState(null, '', u) } catch { /* sem url */ }
  }, [])

  // abre direto se a página veio com ?v=ID (link para compartilhar)
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('v'); if (v && idDoLink(v)) { setLink(`https://youtu.be/${v}`); abrir(v) } }, [abrir])

  /* cria o player */
  useEffect(() => {
    if (!videoId) return
    let vivo = true
    carregarApiYoutube().then((YT) => {
      if (!vivo) return
      player.current?.destroy?.()
      // o YouTube troca o alvo por um iframe: o alvo é criado aqui, fora do controle do React
      const alvo = document.createElement('div')
      caixaVideo.current?.replaceChildren(alvo)
      player.current = new YT.Player(alvo, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => {
            if (!vivo) return
            window.__karaoke = e.target // gancho dos testes
            setPronto(true); e.target.setVolume(volume); if (mudo) e.target.mute(); descobrir(e.target)
            // ?demo=1 (banner): toca sem som já na parte cantada
            if (new URLSearchParams(window.location.search).get('demo') === '1') { e.target.mute(); setMudo(true); e.target.seekTo(24.6, true); e.target.playVideo() }
          },
          onError: (e) => setErro([101, 150].includes(e.data) ? 'O dono desse vídeo não permite que ele toque fora do YouTube. Procure outra versão (por exemplo, a versão karaokê ou de outro canal).' : 'O YouTube não conseguiu tocar esse vídeo. Confira o link.'),
        },
      })
    }).catch((e) => setErro(e.message))
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])
  useEffect(() => () => player.current?.destroy?.(), [])

  /* nome do vídeo (pelo próprio YouTube) e busca da letra */
  async function descobrir(p) {
    let titulo = p.getVideoData?.().title || '', canal = p.getVideoData?.().author || ''
    if (!titulo) {
      try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${videoId}`); const j = await r.json(); titulo = j.title; canal = j.author_name } catch { /* sem título */ }
    }
    const { artista, musica } = limparTitulo(titulo, canal)
    setInfo({ titulo, canal, artista, musica })
    setBusca(`${artista} ${musica}`.trim())
    const d = ler()
    d.historico = [{ id: videoId, titulo: titulo || videoId }, ...(d.historico || []).filter((h) => h.id !== videoId)].slice(0, 8)
    gravar(d); setHistorico(d.historico)
    const salvo = d.videos?.[videoId]
    if (salvo?.manual) { setLetras(salvo.manual); setFonte({ tipo: 'manual' }); return }
    await procurar(artista, musica, p.getDuration?.() || 0, salvo?.lrclib)
  }

  async function procurar(artista, musica, duracao, preferido) {
    setBuscando(true)
    try {
      const lista = await buscarLetras(artista, musica, duracao)
      setOpcoes(lista)
      const escolhida = lista.find((x) => x.id === preferido) || lista[0]
      if (escolhida) usar(escolhida)
      else { setLetras([]); setFonte(null) }
    } catch { setOpcoes([]); setLetras([]); setFonte(null) } finally { setBuscando(false) }
  }

  function usar(op) {
    setLetras(lerLrc(op.lrc)); setFonte({ tipo: 'lrclib', id: op.id, nome: `${op.nome} · ${op.artista} · ${mmss(op.duracao)}` })
    const d = ler(); d.videos = { ...(d.videos || {}), [videoId]: { ...(d.videos?.[videoId] || {}), lrclib: op.id, manual: undefined } }; gravar(d)
  }

  function buscarDeNovo(e) {
    e?.preventDefault()
    const q = busca.trim()
    if (!q) return
    const [a, ...m] = q.split(/\s+[-–]\s+/)
    procurar(m.length ? a : '', m.length ? m.join(' ') : q, player.current?.getDuration?.() || 0)
  }

  /* acompanha o vídeo: linha atual e o verde palavra por palavra */
  useEffect(() => {
    let quadro
    const passo = () => {
      quadro = requestAnimationFrame(passo)
      const p = player.current, ls = estado.current.letras
      if (!p?.getCurrentTime || !ls.length) return
      const t = p.getCurrentTime() + estado.current.offset
      let i = -1
      for (let k = 0; k < ls.length && ls[k].t <= t; k++) i = k
      if (i !== estado.current.indice) { estado.current.indice = i; setIndice(i) }
      const falta = i < 0 && ls[0].t - t < 4 && ls[0].t - t > 0 ? Math.ceil(ls[0].t - t) : null
      if (falta !== estado.current.antes) { estado.current.antes = falta; setAntes(falta) }
      const el = linhaAtual.current
      if (i < 0 || !el) return
      const fim = ls[i + 1] ? ls[i + 1].t : ls[i].t + 5
      const dur = Math.min(Math.max(fim - ls[i].t, 0.5), 9) * 0.92 // termina um pouco antes da próxima linha
      const prog = Math.min(1, Math.max(0, (t - ls[i].t) / dur))
      const palavras = el.querySelectorAll('[data-ini]')
      for (const w of palavras) {
        const a = Number(w.dataset.ini), b = Number(w.dataset.fim)
        const pw = prog >= b ? 1 : prog <= a ? 0 : (prog - a) / (b - a)
        w.style.setProperty('--pw', String(pw))
      }
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [])

  /* som do vídeo */
  function alternarMudo() { const p = player.current; if (!p) return; if (mudo) p.unMute(); else p.mute(); setMudo(!mudo) }
  function mudarVolume(v) { setVolume(v); player.current?.setVolume?.(v); if (v > 0 && mudo) { player.current?.unMute?.(); setMudo(false) } }

  /* atraso da letra */
  function ajustar(delta) {
    setOffset((o) => {
      const n = Math.round((o + delta) * 100) / 100
      const d = ler(); d.videos = { ...(d.videos || {}), [videoId]: { ...(d.videos?.[videoId] || {}), offset: n } }; gravar(d)
      return n
    })
  }

  /* microfone com eco (use fone de ouvido para não dar microfonia) */
  async function alternarMic() {
    if (mic) { mic.stream.getTracks().forEach((t) => t.stop()); mic.ctx.close(); setMic(null); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const fonteMic = ctx.createMediaStreamSource(stream)
      const ganho = ctx.createGain(); ganho.gain.value = micVol / 100
      const atraso = ctx.createDelay(1); atraso.delayTime.value = 0.11
      const retorno = ctx.createGain(); retorno.gain.value = 0.32
      const molhado = ctx.createGain(); molhado.gain.value = 0.45
      fonteMic.connect(ganho)
      ganho.connect(ctx.destination) // voz direta
      ganho.connect(atraso); atraso.connect(retorno); retorno.connect(atraso); atraso.connect(molhado); molhado.connect(ctx.destination) // eco
      setMic({ ctx, stream, ganho })
    } catch { setErro('Não consegui usar o microfone. Permita o acesso no navegador (ícone de cadeado na barra de endereço).') }
  }
  useEffect(() => { if (mic) mic.ganho.gain.value = micVol / 100 }, [micVol, mic])
  useEffect(() => () => { if (mic) { mic.stream.getTracks().forEach((t) => t.stop()); mic.ctx.close() } }, [mic])

  /* tela cheia */
  function alternarCheia() { if (document.fullscreenElement) document.exitFullscreen(); else palco.current?.requestFullscreen?.() }
  useEffect(() => { const f = () => setCheia(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])

  /* letra manual: colar e marcar o começo de cada linha */
  function comecarMarcar() {
    const linhas = manual.texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!linhas.length) return
    setManual({ ...manual, linhas, marcadas: [], etapa: 'marcar' })
    player.current?.seekTo?.(0, true); player.current?.playVideo?.()
  }
  const marcar = useCallback(() => {
    setManual((m) => {
      if (!m || m.etapa !== 'marcar') return m
      const t = Math.max(0, (player.current?.getCurrentTime?.() || 0) - 0.15)
      const marcadas = [...m.marcadas, { t, texto: m.linhas[m.marcadas.length] }]
      if (marcadas.length < m.linhas.length) return { ...m, marcadas }
      setLetras(marcadas); setFonte({ tipo: 'manual' }); setOffset(0)
      const d = ler(); d.videos = { ...(d.videos || {}), [videoId]: { ...(d.videos?.[videoId] || {}), manual: marcadas, offset: 0 } }; gravar(d)
      player.current?.seekTo?.(Math.max(0, marcadas[0].t - 3), true)
      return null
    })
  }, [videoId])
  useEffect(() => {
    if (manual?.etapa !== 'marcar') return
    const tecla = (e) => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); marcar() } }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [manual?.etapa, marcar])

  /* ---------------- tela ---------------- */

  const atual = indice >= 0 ? letras[indice] : null
  const palavrasAtuais = (() => {
    if (!atual) return []
    const ws = atual.texto.split(/(\s+)/).filter((w) => w.length)
    const total = ws.reduce((s, w) => s + (w.trim() ? w.length : 0), 0) || 1
    let acc = 0
    return ws.map((w) => { if (!w.trim()) return { w }; const ini = acc / total; acc += w.length; return { w, ini, fim: acc / total } })
  })()

  return (
    <div className={`kk${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1' ? ' kk-demo' : ''}`}>
      <header className="kk-topo">
        <a href="/apps/karaoke" className="kk-voltar" aria-label="Voltar para a página do Karaokê">←</a>
        <div><strong>🎤 Karaokê</strong><span>Cole o link do YouTube e cante junto</span></div>
      </header>

      <form className="kk-link" onSubmit={(e) => { e.preventDefault(); abrir(link) }}>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole aqui o link do vídeo do YouTube" aria-label="Link do vídeo do YouTube" inputMode="url" />
        <button className="kk-btn">Abrir</button>
      </form>
      {erro && <p className="kk-erro" role="alert">{erro}</p>}

      {!videoId && (
        <div className="kk-inicio">
          <div className="kk-dica">
            <h2>Como funciona</h2>
            <ol>
              <li>Procure a música no YouTube (a versão <b>karaokê</b> já vem sem a voz do cantor).</li>
              <li>Copie o link do vídeo e cole acima.</li>
              <li>A letra aparece embaixo e vai ficando <span className="kk-verde">verde</span> conforme a música passa.</li>
            </ol>
            <form className="kk-procurar" onSubmit={(e) => { e.preventDefault(); if (nomeBusca.trim()) window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(nomeBusca.trim() + ' karaoke'), '_blank', 'noopener') }}>
              <input value={nomeBusca} onChange={(e) => setNomeBusca(e.target.value)} placeholder="Nome da música (abre a busca no YouTube)" aria-label="Nome da música" />
              <button className="kk-btn claro">Procurar no YouTube</button>
            </form>
          </div>
          {historico.length > 0 && (
            <div className="kk-historico">
              <h2>Cantadas recentemente</h2>
              <div className="kk-cartoes">
                {historico.map((h) => (
                  <button key={h.id} onClick={() => { setLink(`https://youtu.be/${h.id}`); abrir(h.id) }}>
                    <img src={`https://i.ytimg.com/vi/${h.id}/mqdefault.jpg`} alt="" loading="lazy" />
                    <span>{h.titulo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {videoId && (
        <section className={`kk-palco${cheia ? ' cheia' : ''}`} ref={palco}>
          <div className="kk-video" ref={caixaVideo} />

          <div className="kk-letra" aria-live="off">
            {buscando && <p className="kk-aviso">Procurando a letra sincronizada…</p>}
            {!buscando && !letras.length && !manual && pronto && (
              <div className="kk-sem">
                <p>Não achei a letra sincronizada dessa música.</p>
                <button className="kk-btn" onClick={() => setManual({ texto: '', etapa: 'colar' })}>Colar a letra e sincronizar</button>
              </div>
            )}
            {manual?.etapa === 'marcar' && (
              <div className="kk-marcar">
                <p className="kk-aviso">Toque em <b>Marcar</b> (ou aperte Espaço) quando cada linha começar a ser cantada.</p>
                <p className="kk-proxima-marcar">{manual.linhas[manual.marcadas.length]}</p>
                <button className="kk-btn grande" onClick={marcar}>Marcar ({manual.marcadas.length + 1}/{manual.linhas.length})</button>
                <button className="kk-btn texto" onClick={() => setManual(null)}>Cancelar</button>
              </div>
            )}
            {letras.length > 0 && !manual && (
              <div className="kk-linhas">
                {antes !== null && <p className="kk-contagem">{antes}</p>}
                <p className="kk-l passada">{letras[indice - 1]?.texto || ' '}</p>
                <p className="kk-l atual" ref={linhaAtual} key={indice}>
                  {atual ? palavrasAtuais.map((p, k) => (p.ini === undefined ? <span key={k}>{p.w}</span> : <span key={k} className="kk-p" data-ini={p.ini} data-fim={p.fim}>{p.w}</span>)) : (letras[0] ? '♪' : '')}
                </p>
                <p className="kk-l proxima">{(indice >= 0 ? letras[indice + 1] : letras[0])?.texto || ' '}</p>
                <p className="kk-l depois">{(indice >= 0 ? letras[indice + 2] : letras[1])?.texto || ' '}</p>
              </div>
            )}
          </div>

          <div className="kk-controles">
            <button className="kk-btn claro" onClick={alternarMudo} title="Liga ou desliga o som do vídeo">{mudo ? '🔇 Sem som' : '🔊 Com som'}</button>
            <label className="kk-faixa" title="Volume do vídeo">Vídeo<input type="range" min="0" max="100" value={volume} onChange={(e) => mudarVolume(Number(e.target.value))} /></label>
            <span className="kk-sep" />
            <button className={`kk-btn claro${mic ? ' ativo' : ''}`} onClick={alternarMic} title="Seu microfone com eco, saindo nas caixas (use fone para não dar microfonia)">{mic ? '🎤 Microfone ligado' : '🎤 Microfone com eco'}</button>
            {mic && <label className="kk-faixa" title="Volume do microfone">Voz<input type="range" min="0" max="150" value={micVol} onChange={(e) => setMicVol(Number(e.target.value))} /></label>}
            <span className="kk-sep" />
            <button className="kk-btn claro" onClick={alternarCheia}>{cheia ? '↙ Sair da tela cheia' : '⛶ Tela cheia'}</button>
          </div>

          {letras.length > 0 && !manual && (
            <div className="kk-ajuste">
              <span>Letra fora do tempo?</span>
              <button className="kk-btn claro peq" onClick={() => ajustar(-0.25)}>◀ Atrasar</button>
              <b>{offset > 0 ? '+' : ''}{offset.toFixed(2).replace('.', ',')} s</b>
              <button className="kk-btn claro peq" onClick={() => ajustar(0.25)}>Adiantar ▶</button>
              {offset !== 0 && <button className="kk-btn texto peq" onClick={() => ajustar(-offset)}>zerar</button>}
            </div>
          )}
        </section>
      )}

      {videoId && !cheia && (
        <section className="kk-fonte">
          {info && <p className="kk-musica">{info.titulo}</p>}
          {fonte?.tipo === 'lrclib' && <p>Letra: {fonte.nome} · <small>LRCLIB, base aberta mantida pela comunidade</small></p>}
          {fonte?.tipo === 'manual' && <p>Letra sincronizada por você (salva neste aparelho).</p>}
          <form className="kk-procurar" onSubmit={buscarDeNovo}>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Artista - música" aria-label="Buscar outra letra" />
            <button className="kk-btn claro">Buscar letra</button>
            <button type="button" className="kk-btn texto" onClick={() => setManual({ texto: '', etapa: 'colar' })}>Colar minha letra</button>
          </form>
          {opcoes.length > 1 && (
            <label className="kk-opcoes">Outras versões da letra:
              <select value={fonte?.tipo === 'lrclib' ? fonte.id : ''} onChange={(e) => usar(opcoes.find((o) => String(o.id) === e.target.value))}>
                {fonte?.tipo !== 'lrclib' && <option value="">escolha</option>}
                {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome} · {o.artista} · {mmss(o.duracao)}</option>)}
              </select>
            </label>
          )}
          {manual?.etapa === 'colar' && (
            <div className="kk-colar">
              <textarea value={manual.texto} onChange={(e) => setManual({ ...manual, texto: e.target.value })} rows={8} placeholder="Cole a letra aqui, uma linha por verso" />
              <div><button className="kk-btn" onClick={comecarMarcar} disabled={!manual.texto.trim()}>Começar a marcar</button> <button className="kk-btn texto" onClick={() => setManual(null)}>Cancelar</button></div>
              <small>O vídeo volta para o início. A cada verso cantado, toque em Marcar. A letra fica salva só neste aparelho.</small>
            </div>
          )}
          <p className="kk-legal">O vídeo toca pelo player oficial do YouTube; o site não baixa nem altera o áudio. Músicas e letras pertencem aos seus autores.</p>
        </section>
      )}
    </div>
  )
}
