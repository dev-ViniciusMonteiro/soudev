// Gerador do relógio de poker (torneio e cash) com visual de campeonato. O relógio é um HTML
// autossuficiente: o mesmo documento serve para a prévia (iframe) e para o download (roda offline).
// A lógica fica em clockRuntime(cfg), embutida via .toString(), então é autocontida (só usa cfg e o browser).

export const TEMAS = [
  { id: 'roxo', nome: 'Roxo e preto', bg: '#0b0612', panel: '#17102a', fg: '#ffffff', accent: '#b06bff', muted: '#c4b1e6' },
  { id: 'verde', nome: 'Verde mesa', bg: '#05110b', panel: '#0d2016', fg: '#ffffff', accent: '#36d399', muted: '#9ec9b5' },
  { id: 'dourado', nome: 'Dourado e preto', bg: '#080808', panel: '#15120b', fg: '#f6ecd4', accent: '#e6be55', muted: '#c2b48c' },
  { id: 'vermelho', nome: 'Vermelho', bg: '#100505', panel: '#260c0c', fg: '#ffffff', accent: '#f1564c', muted: '#e6a9a9' },
  { id: 'azul', nome: 'Azul royal', bg: '#050a16', panel: '#0d1a30', fg: '#ffffff', accent: '#4f8cff', muted: '#a3bce6' },
  { id: 'claro', nome: 'Claro', bg: '#e9edf2', panel: '#ffffff', fg: '#121826', accent: '#7c3aed', muted: '#5b6472' },
  { id: 'preto', nome: 'Preto minimalista', bg: '#000000', panel: '#0d0d0d', fg: '#ffffff', accent: '#e8e8e8', muted: '#9ca3af' },
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
export function gerarEstrutura({ sb = 25, bb = 50, min = 20, qtd = 12, mult = 1.5, comAnte = true, pausaCada = 4, pausaMin = 10 }) {
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
    temaId: 'dourado',
    logo: '',
    jogadores: 18,
    premiacao: 'R$ 900',
    niveis: gerarEstrutura({ sb: 25, bb: 50, min: 20, qtd: 12, mult: 1.5, comAnte: true, pausaCada: 4, pausaMin: 10 }),
    cash: { lembreteMin: 30 },
  }
}

// CSS do relógio — visual de campeonato. Usa variáveis definidas pelo runtime a partir do tema.
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--bg);color:var(--fg);font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none}
.pk{height:100%;display:flex;flex-direction:column;position:relative;
  background:radial-gradient(130% 90% at 50% 0%, color-mix(in srgb,var(--accent) 12%, transparent), transparent 55%), radial-gradient(120% 120% at 50% 120%, color-mix(in srgb,var(--panel) 70%, transparent), transparent 60%);}
.pk::before{content:"";position:absolute;inset:14px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:16px;pointer-events:none}
.pk-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:min(3vh,22px) min(4vw,34px) 0}
.pk-brand{display:flex;align-items:center;gap:14px;min-width:0}
.pk-logo{max-height:9vh;max-width:28vw;object-fit:contain}
.pk-nome{font-size:clamp(18px,3.4vw,38px);font-weight:800;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pk-head-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-variant-numeric:tabular-nums}
.pk-head-right .hr{font-size:clamp(14px,2.4vw,24px);font-weight:700}
.pk-head-right .lb{font-size:clamp(10px,1.6vw,14px);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.pk-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6vh;min-height:0;padding:0 16px}
.pk-fase{font-size:clamp(15px,3vw,30px);letter-spacing:.3em;text-transform:uppercase;color:var(--accent);font-weight:800}
.pk-timer{font-size:clamp(84px,24vw,300px);font-weight:800;line-height:.9;font-variant-numeric:tabular-nums;letter-spacing:-.02em;text-shadow:0 0 40px color-mix(in srgb,var(--accent) 30%,transparent)}
.pk-timer.alerta{color:var(--accent);animation:pisca 1s steps(2,start) infinite}
@keyframes pisca{50%{opacity:.4}}
.pk-blindrow{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:.4vh}
.pk-blab{font-size:clamp(13px,2.2vw,22px);letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:700}
.pk-bval{font-size:clamp(30px,8vw,72px);font-weight:800;color:var(--accent);font-variant-numeric:tabular-nums}
.pk-ante{font-size:clamp(15px,3vw,30px);color:var(--fg);font-weight:700;opacity:.92}
.pk-ante .k{color:var(--muted);letter-spacing:.14em;text-transform:uppercase;font-size:.7em;font-weight:700;margin-right:6px}
.pk-tiles{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:0 min(4vw,34px)}
.pk-tile{flex:1 1 150px;max-width:260px;background:color-mix(in srgb,var(--panel) 85%,transparent);border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);border-top:3px solid var(--accent);border-radius:12px;padding:8px 12px;text-align:center}
.pk-tile span{display:block;font-size:clamp(9px,1.5vw,13px);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:700}
.pk-tile b{display:flex;align-items:center;justify-content:center;gap:10px;font-size:clamp(17px,3.2vw,30px);font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px}
.pk-tile b button{width:30px;height:30px;border-radius:8px;border:1px solid color-mix(in srgb,var(--fg) 25%,transparent);background:transparent;color:var(--fg);font-size:18px;cursor:pointer;line-height:1}
.pk-controls{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:min(2vh,16px) 16px min(3vh,22px)}
.pk-controls button{min-width:56px;height:52px;padding:0 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--fg) 20%,transparent);background:color-mix(in srgb,var(--panel) 85%,transparent);color:var(--fg);font-size:18px;font-weight:800;cursor:pointer}
.pk-controls button:active{transform:translateY(1px)}
.pk-controls button.main{background:var(--accent);border-color:var(--accent);color:#0a0710;min-width:92px;font-size:24px}
@media(max-width:560px){.pk-controls button{height:46px;min-width:46px;font-size:16px}.pk-tile{flex-basis:44%}}
`

// Runtime do relógio — autocontido.
function clockRuntime(cfg) {
  var tema = cfg.tema
  var rs = document.documentElement.style
  rs.setProperty('--bg', tema.bg); rs.setProperty('--panel', tema.panel); rs.setProperty('--fg', tema.fg)
  rs.setProperty('--accent', tema.accent); rs.setProperty('--muted', tema.muted)
  document.body.style.background = tema.bg

  var logoHtml = cfg.logo ? '<img class="pk-logo" src="' + cfg.logo + '" alt="">' : ''
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
  var ctrlTorneio = '<button data-a="prev" title="Nível anterior">⏮</button>'
    + '<button data-a="menos" title="-1 min">−1</button>'
    + '<button data-a="play" class="main" title="Pausar/continuar">▶</button>'
    + '<button data-a="mais" title="+1 min">+1</button>'
    + '<button data-a="next" title="Próximo nível">⏭</button>'
    + '<button data-a="reset" title="Reiniciar nível">⟳</button>'
    + '<button data-a="full" title="Tela cheia">⛶</button>'
  var ctrlCash = '<button data-a="play" class="main">▶</button><button data-a="reset" title="Zerar">⟳</button><button data-a="full" title="Tela cheia">⛶</button>'

  var tilesTorneio = '<div class="pk-tile"><span>Próximo nível</span><b id="pk-prox">—</b></div>'
    + '<div class="pk-tile"><span>Próxima pausa</span><b id="pk-pausa">—</b></div>'
    + (cfg.jogadores > 0 ? '<div class="pk-tile"><span>Jogadores</span><b><button data-a="menosjog">−</button><i id="pk-jog"></i><button data-a="maisjog">+</button></b></div>' : '')
    + (cfg.premiacao ? '<div class="pk-tile"><span>Premiação</span><b id="pk-prem">' + esc(cfg.premiacao) + '</b></div>' : '')
    + '<div class="pk-tile"><span>Nível</span><b id="pk-niveltile">—</b></div>'
  var tilesCash = '<div class="pk-tile"><span>Hora</span><b id="pk-hora">--:--</b></div>'
    + (cfg.premiacao ? '<div class="pk-tile"><span>Mesa</span><b>' + esc(cfg.premiacao) + '</b></div>' : '')
    + (cfg.cash && cfg.cash.lembreteMin ? '<div class="pk-tile"><span>Aviso</span><b>a cada ' + cfg.cash.lembreteMin + ' min</b></div>' : '')

  document.body.innerHTML = '<div class="pk">'
    + '<header class="pk-head"><div class="pk-brand">' + logoHtml + '<span class="pk-nome">' + esc(cfg.nome) + '</span></div>'
    + '<div class="pk-head-right"><span class="hr" id="pk-decorrido">00:00</span><span class="lb" id="pk-declb">Decorrido</span></div></header>'
    + '<main class="pk-stage">'
    + '<div class="pk-fase" id="pk-fase"></div>'
    + '<div class="pk-timer" id="pk-timer">00:00</div>'
    + '<div class="pk-blindrow" id="pk-blindrow"><span class="pk-blab">Blinds</span><span class="pk-bval" id="pk-blinds"></span><span class="pk-ante" id="pk-ante"></span></div>'
    + '</main>'
    + '<div class="pk-tiles">' + (cfg.modo === 'cash' ? tilesCash : tilesTorneio) + '</div>'
    + '<footer class="pk-controls">' + (cfg.modo === 'cash' ? ctrlCash : ctrlTorneio) + '</footer>'
    + '</div>'

  var el = function (id) { return document.getElementById(id) }
  var timerEl = el('pk-timer'), faseEl = el('pk-fase'), playBtn = document.querySelector('[data-a=play]')
  var nf = function (n) { return Number(n).toLocaleString('pt-BR') }
  var fmt = function (s) { s = Math.max(0, Math.floor(s)); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; var mm = (m < 10 ? '0' : '') + m, xx = (x < 10 ? '0' : '') + x; return h > 0 ? h + ':' + mm + ':' + xx : mm + ':' + xx }

  var actx = null
  function beep(freq, dur) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination); o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.08; o.start(); o.stop(actx.currentTime + dur) } catch (e) {} }
  function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen() } catch (e) {} }

  var running = false
  var cliques = document.querySelector('.pk-tiles')

  if (cfg.modo === 'cash') {
    el('pk-declb').textContent = 'Sessão'
    faseEl.textContent = 'Cash Game'
    el('pk-blindrow').style.display = 'none'
    var elapsedC = 0, lembrete = (cfg.cash && cfg.cash.lembreteMin) || 0
    function renderCash() {
      timerEl.textContent = fmt(elapsedC)
      el('pk-decorrido').textContent = fmt(elapsedC)
      var horaEl = el('pk-hora'); if (horaEl) horaEl.textContent = new Date().toLocaleTimeString('pt-BR').slice(0, 5)
      playBtn.textContent = running ? '⏸' : '▶'
    }
    setInterval(function () { if (running) { elapsedC++; if (lembrete && elapsedC % (lembrete * 60) === 0) beep(660, 0.4) } renderCash() }, 1000)
    renderCash()
    document.querySelector('.pk-controls').addEventListener('click', function (e) { var a = e.target.getAttribute('data-a'); if (!a) return; if (a === 'play') { running = !running; if (running) beep(520, .08) } else if (a === 'reset') elapsedC = 0; else if (a === 'full') toggleFull(); renderCash() })
    window.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); running = !running; renderCash() } else if (e.key === 'f') toggleFull() })
    return
  }

  // ---- torneio ----
  var niveis = cfg.niveis || [], idx = 0, rest = (niveis[0] ? niveis[0].min : 20) * 60, elapsedT = 0, fim = false
  var jogadores = cfg.jogadores > 0 ? cfg.jogadores : 0
  var jogaveis = function () { var c = 0; for (var i = 0; i < niveis.length; i++) if (!niveis[i].pausa) c++; return c }
  var numeroNivel = function (i) { var c = 0; for (var k = 0; k <= i; k++) if (!niveis[k].pausa) c++; return c }
  function proxTxt() {
    if (idx >= niveis.length - 1) return 'Último'
    var p = niveis[idx + 1]
    if (p.pausa) return 'Intervalo ' + p.min + ' min'
    return nf(p.sb) + ' / ' + nf(p.bb) + (p.ante ? '  ·  ante ' + nf(p.ante) : '')
  }
  function tempoAtePausa() {
    var ip = -1; for (var i = idx + 1; i < niveis.length; i++) { if (niveis[i].pausa) { ip = i; break } }
    if (ip < 0) return null
    var s = rest; for (var k = idx + 1; k < ip; k++) s += niveis[k].min * 60
    return s
  }
  function render() {
    var n = niveis[idx] || { pausa: true, min: 0 }
    timerEl.textContent = fim ? 'FIM' : fmt(rest)
    timerEl.className = 'pk-timer' + (!fim && rest <= 10 ? ' alerta' : '')
    var row = el('pk-blindrow')
    if (n.pausa) { faseEl.textContent = 'Intervalo'; row.style.display = 'none' }
    else {
      faseEl.textContent = 'Nível ' + numeroNivel(idx)
      row.style.display = ''
      el('pk-blinds').textContent = nf(n.sb) + ' / ' + nf(n.bb)
      el('pk-ante').innerHTML = n.ante ? '<span class="k">Ante</span>' + nf(n.ante) : ''
    }
    el('pk-prox').textContent = fim ? '—' : proxTxt()
    var tp = tempoAtePausa(); el('pk-pausa').textContent = tp == null ? '—' : fmt(tp)
    el('pk-niveltile').textContent = n.pausa ? 'Intervalo' : (numeroNivel(idx) + ' / ' + jogaveis())
    el('pk-decorrido').textContent = fmt(elapsedT)
    var jg = el('pk-jog'); if (jg) jg.textContent = String(jogadores)
    playBtn.textContent = fim ? '✓' : (running ? '⏸' : '▶')
  }
  function irPara(i, soar) { idx = Math.max(0, Math.min(niveis.length - 1, i)); rest = niveis[idx].min * 60; fim = false; if (soar) beep(520, .3); render() }
  function avancar(auto) { if (idx < niveis.length - 1) irPara(idx + 1, auto); else { fim = true; running = false; beep(300, .5); render() } }
  setInterval(function () { if (!running || fim) return; rest--; elapsedT++; if (rest > 0 && rest <= 10) beep(880, .07); if (rest <= 0) { avancar(true); return } render() }, 1000)
  render()
  document.querySelector('.pk-controls').addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-a'); if (!a) return
    if (a === 'play') { if (!fim) { running = !running; if (running) beep(520, .06) } }
    else if (a === 'next') avancar(false)
    else if (a === 'prev') irPara(idx - 1, false)
    else if (a === 'reset') { rest = niveis[idx].min * 60; fim = false }
    else if (a === 'mais') rest += 60
    else if (a === 'menos') rest = Math.max(0, rest - 60)
    else if (a === 'full') toggleFull()
    render()
  })
  if (cliques) cliques.addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-a'); if (!a) return
    if (a === 'maisjog') jogadores++
    else if (a === 'menosjog') jogadores = Math.max(0, jogadores - 1)
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
  const full = {
    modo: cfg.modo, nome: cfg.nome, logo: cfg.logo || '', niveis: cfg.niveis || [],
    jogadores: Number(cfg.jogadores) || 0, premiacao: cfg.premiacao || '',
    cash: cfg.cash || { lembreteMin: 0 }, tema: getTema(cfg.temaId),
  }
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>' + (cfg.nome || 'Relógio de Poker') + '</title><style>' + CSS + '</style></head><body>'
    + '<script>(' + clockRuntime.toString() + ')(' + JSON.stringify(full) + ');</script>'
    + '</body></html>'
}
