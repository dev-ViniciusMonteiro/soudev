// Gerador do relógio de poker (torneio e cash). O relógio é um HTML autossuficiente: o mesmo documento
// serve para a prévia (iframe) e para o download (roda offline). A lógica fica em clockRuntime(cfg),
// embutida via .toString(), então ela precisa ser autocontida (só usa o argumento cfg e APIs do browser).

export const TEMAS = [
  { id: 'roxo', nome: 'Roxo e preto', bg: '#0c0612', panel: '#1a0f2e', fg: '#ffffff', accent: '#a855f7', muted: '#c4b1e6' },
  { id: 'verde', nome: 'Verde mesa', bg: '#07130d', panel: '#0f241a', fg: '#ffffff', accent: '#34d399', muted: '#9ec9b5' },
  { id: 'dourado', nome: 'Dourado e preto', bg: '#0a0a0a', panel: '#17130c', fg: '#f6ecd4', accent: '#d4af37', muted: '#c2b48c' },
  { id: 'vermelho', nome: 'Vermelho', bg: '#120606', panel: '#2a0e0e', fg: '#ffffff', accent: '#ef4444', muted: '#e6a9a9' },
  { id: 'azul', nome: 'Azul', bg: '#060b18', panel: '#0e1b33', fg: '#ffffff', accent: '#3b82f6', muted: '#a3bce6' },
  { id: 'claro', nome: 'Claro', bg: '#eef1f5', panel: '#ffffff', fg: '#111827', accent: '#7c3aed', muted: '#6b7280' },
  { id: 'preto', nome: 'Preto minimalista', bg: '#000000', panel: '#0e0e0e', fg: '#ffffff', accent: '#ffffff', muted: '#9ca3af' },
]
export const getTema = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0]

const arredonda = (v) => {
  if (v <= 100) return Math.max(1, Math.round(v / 5) * 5)
  if (v <= 500) return Math.round(v / 25) * 25
  if (v <= 2000) return Math.round(v / 50) * 50
  if (v <= 10000) return Math.round(v / 100) * 100
  return Math.round(v / 500) * 500
}

/** Gera a estrutura de blinds do torneio a partir de parâmetros simples. */
export function gerarEstrutura({ sb = 25, bb = 50, min = 20, qtd = 12, mult = 1.5, comAnte = false, pausaCada = 4, pausaMin = 10 }) {
  const niveis = []
  let s = sb, b = bb, nivel = 0
  for (let i = 0; i < qtd; i++) {
    niveis.push({ sb: s, bb: b, ante: comAnte ? arredonda(b * 0.25) : 0, min, pausa: false })
    nivel++
    if (pausaCada > 0 && nivel % pausaCada === 0 && i < qtd - 1) niveis.push({ sb: 0, bb: 0, ante: 0, min: pausaMin, pausa: true })
    b = arredonda(b * mult); s = arredonda(b / 2)
  }
  return niveis
}

export function configPadrao() {
  return {
    modo: 'torneio',
    nome: 'Torneio da Casa',
    temaId: 'roxo',
    logo: '',
    niveis: gerarEstrutura({ sb: 25, bb: 50, min: 20, qtd: 12, mult: 1.5, comAnte: false, pausaCada: 4, pausaMin: 10 }),
    cash: { lembreteMin: 30 },
  }
}

// CSS do relógio (usa variáveis que o runtime define a partir do tema).
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--fg);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none}
.pk{height:100%;display:flex;flex-direction:column;padding:min(3vh,24px) min(4vw,32px)}
.pk-top{display:flex;align-items:center;justify-content:center;gap:16px;min-height:0}
.pk-logo{max-height:14vh;max-width:40vw;object-fit:contain}
.pk-nome{font-size:clamp(18px,4.5vw,40px);font-weight:700;letter-spacing:.5px;text-align:center}
.pk-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5vh;min-height:0}
.pk-fase{font-size:clamp(16px,4vw,34px);letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:600}
.pk-timer{font-size:clamp(92px,30vw,360px);font-weight:800;line-height:.92;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.pk-timer.alerta{color:var(--accent);animation:pisca 1s steps(2,start) infinite}
@keyframes pisca{50%{opacity:.35}}
.pk-blinds{font-size:clamp(26px,9vw,84px);font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums}
.pk-ante{font-size:clamp(16px,4.5vw,36px);color:var(--muted)}
.pk-bottom{display:flex;flex-direction:column;gap:12px;align-items:center}
.pk-prox{font-size:clamp(14px,3.6vw,26px);color:var(--muted);text-align:center}
.pk-controls{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pk-controls button{min-width:58px;height:54px;padding:0 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--fg) 22%,transparent);background:var(--panel);color:var(--fg);font-size:18px;font-weight:700;cursor:pointer}
.pk-controls button:active{transform:translateY(1px)}
.pk-controls button.main{background:var(--accent);border-color:var(--accent);color:#06040a;min-width:88px;font-size:24px}
.pk-info{font-size:clamp(12px,3vw,18px);color:var(--muted)}
@media(max-width:520px){.pk-controls button{height:48px;min-width:48px;font-size:16px}}
`

// Runtime do relógio — autocontido. Recebe cfg e monta/opera tudo.
function clockRuntime(cfg) {
  var tema = cfg.tema
  var rs = document.documentElement.style
  rs.setProperty('--bg', tema.bg); rs.setProperty('--panel', tema.panel); rs.setProperty('--fg', tema.fg)
  rs.setProperty('--accent', tema.accent); rs.setProperty('--muted', tema.muted)
  document.body.style.background = tema.bg

  var logoHtml = cfg.logo ? '<img class="pk-logo" src="' + cfg.logo + '" alt="">' : ''
  var controlsTorneio = '<button data-a="prev" title="Nível anterior">⏮</button>'
    + '<button data-a="menos" title="-1 min">−1</button>'
    + '<button data-a="play" class="main" title="Pausar/continuar">▶</button>'
    + '<button data-a="mais" title="+1 min">+1</button>'
    + '<button data-a="next" title="Próximo nível">⏭</button>'
    + '<button data-a="reset" title="Reiniciar nível">⟳</button>'
    + '<button data-a="full" title="Tela cheia">⛶</button>'
  var controlsCash = '<button data-a="play" class="main">▶</button>'
    + '<button data-a="reset" title="Zerar">⟳</button>'
    + '<button data-a="full" title="Tela cheia">⛶</button>'

  document.body.innerHTML = '<div class="pk">'
    + '<header class="pk-top">' + logoHtml + '<div class="pk-nome">' + (cfg.nome || '') + '</div></header>'
    + '<main class="pk-main">'
    + '<div class="pk-fase" id="pk-fase"></div>'
    + '<div class="pk-timer" id="pk-timer">00:00</div>'
    + '<div class="pk-blinds" id="pk-blinds"></div>'
    + '<div class="pk-ante" id="pk-ante"></div>'
    + '</main>'
    + '<footer class="pk-bottom">'
    + '<div class="pk-prox" id="pk-prox"></div>'
    + '<div class="pk-controls">' + (cfg.modo === 'cash' ? controlsCash : controlsTorneio) + '</div>'
    + '<div class="pk-info" id="pk-info"></div>'
    + '</footer></div>'

  var el = function (id) { return document.getElementById(id) }
  var timerEl = el('pk-timer'), faseEl = el('pk-fase'), blindsEl = el('pk-blinds'), anteEl = el('pk-ante'), proxEl = el('pk-prox'), infoEl = el('pk-info'), playBtn = document.querySelector('[data-a=play]')
  var nf = function (n) { return Number(n).toLocaleString('pt-BR') }
  var fmt = function (s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x }

  var actx = null
  function beep(freq, dur) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination); o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.08; o.start(); o.stop(actx.currentTime + dur) } catch (e) {} }
  function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen() } catch (e) {} }

  var running = false

  if (cfg.modo === 'cash') {
    var elapsed = 0, lembrete = (cfg.cash && cfg.cash.lembreteMin) || 0
    faseEl.textContent = 'Cash game'
    blindsEl.style.display = 'none'; anteEl.style.display = 'none'
    function renderCash() {
      var d = new Date()
      timerEl.textContent = fmt(elapsed)
      proxEl.textContent = 'Agora: ' + d.toLocaleTimeString('pt-BR')
      infoEl.textContent = lembrete ? ('Aviso a cada ' + lembrete + ' min de mesa') : 'Tempo de sessão'
      playBtn.textContent = running ? '⏸' : '▶'
    }
    setInterval(function () {
      if (running) { elapsed++; if (lembrete && elapsed % (lembrete * 60) === 0) beep(660, 0.4) }
      renderCash()
    }, 1000)
    renderCash()
    document.querySelector('.pk-controls').addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-a'); if (!a) return
      if (a === 'play') { running = !running; if (running) beep(520, 0.08) }
      else if (a === 'reset') { elapsed = 0 }
      else if (a === 'full') toggleFull()
      renderCash()
    })
    window.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); running = !running; renderCash() } else if (e.key === 'f') toggleFull() })
    return
  }

  // ---- torneio ----
  var niveis = cfg.niveis || [], idx = 0, rest = (niveis[0] ? niveis[0].min : 20) * 60, elapsedT = 0, fim = false
  var jogaveis = function () { var c = 0; for (var i = 0; i < niveis.length; i++) if (!niveis[i].pausa) c++; return c }
  var numeroNivel = function (i) { var c = 0; for (var k = 0; k <= i; k++) if (!niveis[k].pausa) c++; return c }
  function proximoTexto() {
    if (idx >= niveis.length - 1) return 'Último nível'
    var p = niveis[idx + 1]
    if (p.pausa) return 'Próximo: intervalo de ' + p.min + ' min'
    return 'Próximo: blinds ' + nf(p.sb) + ' / ' + nf(p.bb) + (p.ante ? ' (ante ' + nf(p.ante) + ')' : '')
  }
  function render() {
    var n = niveis[idx] || { pausa: true, min: 0 }
    timerEl.textContent = fim ? 'FIM' : fmt(rest)
    timerEl.className = 'pk-timer' + (!fim && rest <= 10 ? ' alerta' : '')
    if (n.pausa) {
      faseEl.textContent = 'Intervalo'
      blindsEl.style.display = 'none'; anteEl.style.display = 'none'
    } else {
      faseEl.textContent = 'Nível ' + numeroNivel(idx)
      blindsEl.style.display = ''; blindsEl.textContent = nf(n.sb) + ' / ' + nf(n.bb)
      if (n.ante) { anteEl.style.display = ''; anteEl.textContent = 'Ante ' + nf(n.ante) } else anteEl.style.display = 'none'
    }
    proxEl.textContent = fim ? 'Torneio encerrado' : proximoTexto()
    infoEl.textContent = 'Decorrido ' + fmt(elapsedT) + ' · Nível ' + (n.pausa ? '—' : numeroNivel(idx)) + '/' + jogaveis()
    playBtn.textContent = fim ? '✓' : (running ? '⏸' : '▶')
  }
  function irPara(i, soar) { idx = Math.max(0, Math.min(niveis.length - 1, i)); rest = niveis[idx].min * 60; fim = false; if (soar) beep(520, 0.3); render() }
  function avancar(auto) { if (idx < niveis.length - 1) irPara(idx + 1, auto); else { fim = true; running = false; beep(300, 0.5); render() } }
  setInterval(function () {
    if (!running || fim) return
    rest--; elapsedT++
    if (rest > 0 && rest <= 10) beep(880, 0.07)
    if (rest <= 0) { avancar(true); return }
    render()
  }, 1000)
  render()
  document.querySelector('.pk-controls').addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-a'); if (!a) return
    if (a === 'play') { if (!fim) { running = !running; if (running) beep(520, 0.06) } }
    else if (a === 'next') avancar(false)
    else if (a === 'prev') irPara(idx - 1, false)
    else if (a === 'reset') { rest = niveis[idx].min * 60; fim = false }
    else if (a === 'mais') rest += 60
    else if (a === 'menos') rest = Math.max(0, rest - 60)
    else if (a === 'full') toggleFull()
    render()
  })
  window.addEventListener('keydown', function (e) {
    if (e.key === ' ') { e.preventDefault(); if (!fim) running = !running }
    else if (e.key === 'ArrowRight') avancar(false)
    else if (e.key === 'ArrowLeft') irPara(idx - 1, false)
    else if (e.key === 'f') toggleFull()
    render()
  })
}

/** Monta o HTML autossuficiente do relógio com a configuração embutida. */
export function gerarHTML(cfg) {
  const full = { modo: cfg.modo, nome: cfg.nome, logo: cfg.logo || '', niveis: cfg.niveis || [], cash: cfg.cash || { lembreteMin: 0 }, tema: getTema(cfg.temaId) }
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>' + (cfg.nome || 'Relógio de Poker') + '</title><style>' + CSS + '</style></head><body>'
    + '<script>(' + clockRuntime.toString() + ')(' + JSON.stringify(full) + ');</script>'
    + '</body></html>'
}
