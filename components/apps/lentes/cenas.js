// Cenas desenhadas em canvas para as simulações. Cada cena tem a imagem colorida e um mapa de distância
// (em metros) por pixel, que é o que decide quanto cada parte fica desfocada.

export const DIST = { rua: 8, parede: 1.6, monitor: 0.65, mesa: 0.55, celular: 0.38 }

const fonte = (px, peso = 400) => `${peso} ${px}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`

function retArred(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
}

/**
 * Mesa de trabalho vista por quem está sentado: janela com a rua ao fundo (longe), monitor (intermediário) e
 * celular sobre a mesa (perto). Devolve { cor: canvas, dist: Float32Array, w, h }.
 */
export function cenaMesa(w, h) {
  const cor = document.createElement('canvas'); cor.width = w; cor.height = h
  const g = cor.getContext('2d')
  const dist = new Float32Array(w * h).fill(DIST.parede)
  const marca = (x0, y0, x1, y1, d) => {
    for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++) dist.fill(d, y * w + Math.max(0, x0 | 0), y * w + Math.min(w, x1 | 0))
  }
  const u = w / 1000 // unidades relativas

  // parede
  const pg = g.createLinearGradient(0, 0, 0, h); pg.addColorStop(0, '#e9e4dc'); pg.addColorStop(1, '#d9d2c6'); g.fillStyle = pg; g.fillRect(0, 0, w, h)

  // janela com a rua
  const jx = 70 * u, jy = 12 * u, jw = 860 * u, jh = 210 * u
  const ceu = g.createLinearGradient(0, jy, 0, jy + jh); ceu.addColorStop(0, '#9cc7ec'); ceu.addColorStop(1, '#dcecf7'); g.fillStyle = ceu; g.fillRect(jx, jy, jw, jh)
  const predios = [['#c9b9a3', 0, 110], ['#a8b6c4', 120, 150], ['#d8c7a8', 300, 95], ['#b4a596', 410, 170], ['#c2cdd6', 610, 130], ['#d4bfa6', 720, 160]]
  for (const [c, x, alt] of predios) {
    g.fillStyle = c; g.fillRect(jx + x * u, jy + jh - alt * u, 140 * u, alt * u)
    g.fillStyle = 'rgba(40,60,90,.55)'
    for (let yy = jy + jh - alt * u + 14 * u; yy < jy + jh - 30 * u; yy += 30 * u) for (let xx = jx + x * u + 14 * u; xx < jx + (x + 126) * u; xx += 30 * u) g.fillRect(xx, yy, 14 * u, 16 * u)
  }
  // placa da padaria e placa de rua (leitura de longe)
  g.fillStyle = '#7a1f1f'; g.fillRect(jx + 300 * u, jy + 92 * u, 200 * u, 46 * u)
  g.fillStyle = '#fff4dc'; g.font = fonte(30 * u, 800); g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText('PADARIA', jx + 400 * u, jy + 116 * u)
  g.fillStyle = '#1f5d3a'; g.fillRect(jx + 640 * u, jy + 30 * u, 170 * u, 44 * u)
  g.fillStyle = '#fff'; g.font = fonte(20 * u, 700); g.fillText('R. DAS FLORES', jx + 725 * u, jy + 46 * u); g.font = fonte(15 * u, 600); g.fillText('120 – 240', jx + 725 * u, jy + 64 * u)
  g.fillStyle = '#6b6f73'; g.fillRect(jx, jy + jh - 26 * u, jw, 26 * u) // calçada
  // ônibus com letreiro
  g.fillStyle = '#e8a33a'; retArred(g, jx + 40 * u, jy + jh - 96 * u, 230 * u, 74 * u, 8 * u); g.fill()
  g.fillStyle = '#20262c'; g.fillRect(jx + 52 * u, jy + jh - 88 * u, 206 * u, 22 * u)
  g.fillStyle = '#ffb000'; g.font = fonte(16 * u, 700); g.fillText('412  CENTRO', jx + 155 * u, jy + jh - 77 * u)
  marca(jx, jy, jx + jw, jy + jh, DIST.rua)
  // moldura da janela
  g.strokeStyle = '#f5f2ec'; g.lineWidth = 14 * u; g.strokeRect(jx, jy, jw, jh); g.beginPath(); g.moveTo(jx + jw / 2, jy); g.lineTo(jx + jw / 2, jy + jh); g.stroke()

  // mesa
  const mesaY = 432 * u
  const mg = g.createLinearGradient(0, mesaY, 0, h); mg.addColorStop(0, '#9b7653'); mg.addColorStop(1, '#7c5a3c'); g.fillStyle = mg; g.fillRect(0, mesaY, w, h - mesaY)
  g.strokeStyle = 'rgba(60,35,15,.25)'; g.lineWidth = 2 * u
  for (let yy = mesaY + 20 * u; yy < h; yy += 34 * u) { g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + 8 * u, w * 0.6, yy - 8 * u, w, yy + 4 * u); g.stroke() }
  marca(0, mesaY, w, h, DIST.mesa)

  // monitor
  const mx = 250 * u, mY = 168 * u, mw = 500 * u, mh = 252 * u
  g.fillStyle = '#26292e'; g.fillRect(mx + mw / 2 - 30 * u, mY + mh, 60 * u, mesaY - mY - mh + 10 * u)
  g.fillStyle = '#1b1d21'; retArred(g, mx - 12 * u, mY - 12 * u, mw + 24 * u, mh + 24 * u, 10 * u); g.fill()
  g.fillStyle = '#fbfbf9'; g.fillRect(mx, mY, mw, mh)
  g.fillStyle = '#1d4ed8'; g.fillRect(mx, mY, mw, 30 * u)
  g.fillStyle = '#fff'; g.font = fonte(15 * u, 700); g.textAlign = 'left'; g.fillText('Planilha de pedidos — novembro', mx + 12 * u, mY + 16 * u)
  g.fillStyle = '#202124'; g.font = fonte(14 * u, 400)
  const linhas = [['Cliente', 'Qtd', 'Valor'], ['Mercado Bom Preço', '120', 'R$ 2.340,00'], ['Restaurante Sabor', '48', 'R$ 912,50'], ['Padaria Central', '75', 'R$ 1.410,00'], ['Lanchonete do Zé', '30', 'R$ 486,90'], ['Hotel Avenida', '96', 'R$ 1.872,00'], ['Total', '369', 'R$ 7.021,40']]
  linhas.forEach((l, i) => {
    const yy = mY + 50 * u + i * 29 * u
    g.font = fonte(i === 0 || i === linhas.length - 1 ? 14 * u : 14 * u, i === 0 || i === linhas.length - 1 ? 700 : 400)
    g.fillText(l[0], mx + 16 * u, yy); g.fillText(l[1], mx + 290 * u, yy); g.fillText(l[2], mx + 380 * u, yy)
    g.fillStyle = '#e3e3e3'; g.fillRect(mx + 10 * u, yy + 14 * u, mw - 20 * u, 1 * u); g.fillStyle = '#202124'
  })
  marca(mx - 12 * u, mY - 12 * u, mx + mw + 12 * u, mY + mh + 12 * u, DIST.monitor)
  marca(mx + mw / 2 - 30 * u, mY + mh, mx + mw / 2 + 30 * u, mesaY, DIST.monitor)

  // xícara
  g.fillStyle = '#f3efe8'; retArred(g, 800 * u, mesaY + 40 * u, 90 * u, 80 * u, 10 * u); g.fill()
  g.strokeStyle = '#f3efe8'; g.lineWidth = 9 * u; g.beginPath(); g.arc(892 * u, mesaY + 78 * u, 20 * u, -Math.PI / 2, Math.PI / 2); g.stroke()

  // celular com mensagem (leitura de perto)
  const cx = 370 * u, cy = mesaY + 14 * u, cw = 260 * u, ch = Math.min(h - cy - 4 * u, 190 * u)
  g.fillStyle = '#111'; retArred(g, cx, cy, cw, ch, 22 * u); g.fill()
  g.fillStyle = '#f7f7f7'; retArred(g, cx + 10 * u, cy + 12 * u, cw - 20 * u, ch - 24 * u, 14 * u); g.fill()
  g.fillStyle = '#128c7e'; g.fillRect(cx + 10 * u, cy + 12 * u, cw - 20 * u, 30 * u)
  g.fillStyle = '#fff'; g.font = fonte(13 * u, 700); g.fillText('Farmácia Popular', cx + 22 * u, cy + 28 * u)
  const bolhas = ['Seu pedido está pronto para', 'retirada até as 18h. Leve a', 'receita e um documento com foto.', 'Valor: R$ 37,80 (desconto 15%).']
  g.fillStyle = '#dcf8c6'; retArred(g, cx + 22 * u, cy + 56 * u, cw - 44 * u, 92 * u, 8 * u); g.fill()
  g.fillStyle = '#1f2a24'; g.font = fonte(12 * u, 400)
  bolhas.forEach((t, i) => g.fillText(t, cx + 30 * u, cy + 74 * u + i * 19 * u))
  marca(cx, cy, cx + cw, cy + ch, DIST.celular)

  return { cor, dist, w, h }
}

/* ---------------- cenas dos tratamentos ---------------- */

/** Rua à noite com faróis e postes (antirreflexo). */
export function cenaNoite(g, w, h) {
  const ceu = g.createLinearGradient(0, 0, 0, h); ceu.addColorStop(0, '#060a18'); ceu.addColorStop(1, '#1a1f2e'); g.fillStyle = ceu; g.fillRect(0, 0, w, h)
  g.fillStyle = '#0d1120'
  for (let i = 0; i < 7; i++) g.fillRect(i * w / 7, h * (0.2 + (i % 3) * 0.08), w / 7 - 6, h)
  g.fillStyle = 'rgba(255,214,120,.8)'
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, h * 0.3 + ((i * 53) % (h * 0.35)), 6, 8)
  g.fillStyle = '#20232b'; g.fillRect(0, h * 0.72, w, h)
  g.strokeStyle = '#d9c56a'; g.setLineDash([30, 26]); g.lineWidth = 4; g.beginPath(); g.moveTo(0, h * 0.86); g.lineTo(w, h * 0.86); g.stroke(); g.setLineDash([])
  return [[w * 0.18, h * 0.3, 1], [w * 0.5, h * 0.27, 1], [w * 0.82, h * 0.3, 1], [w * 0.36, h * 0.8, 1.6], [w * 0.44, h * 0.8, 1.6], [w * 0.7, h * 0.78, 1.2]]
}

export function brilho(g, x, y, r, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, `rgba(255,250,235,${a})`); gr.addColorStop(0.15, `rgba(255,236,190,${0.8 * a})`); gr.addColorStop(1, 'rgba(255,220,150,0)')
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
}

/** Lago ao sol com reflexos na água (polarizado) e paisagem clara (fotossensível). */
export function cenaSol(g, w, h, comBrilhos = true) {
  const ceu = g.createLinearGradient(0, 0, 0, h * 0.45); ceu.addColorStop(0, '#5aa3e6'); ceu.addColorStop(1, '#cfe6f7'); g.fillStyle = ceu; g.fillRect(0, 0, w, h * 0.45)
  g.fillStyle = '#5e8d4a'; g.beginPath(); g.moveTo(0, h * 0.45); for (let x = 0; x <= w; x += w / 8) g.lineTo(x, h * (0.36 + 0.05 * Math.sin(x / 70))); g.lineTo(w, h * 0.45); g.fill()
  const agua = g.createLinearGradient(0, h * 0.45, 0, h); agua.addColorStop(0, '#3f7ea6'); agua.addColorStop(1, '#1e4e6e'); g.fillStyle = agua; g.fillRect(0, h * 0.45, w, h)
  // pedras e peixe visíveis sob a água (o polarizado revela)
  g.fillStyle = 'rgba(120,110,90,.55)'
  for (const [x, y, r] of [[0.2, 0.75, 34], [0.55, 0.85, 46], [0.8, 0.7, 28]]) { g.beginPath(); g.ellipse(w * x, h * y, r, r * 0.6, 0, 0, Math.PI * 2); g.fill() }
  g.fillStyle = 'rgba(240,140,60,.7)'; g.beginPath(); g.ellipse(w * 0.4, h * 0.68, 26, 10, 0.2, 0, Math.PI * 2); g.fill()
  if (comBrilhos) {
    // reflexo do sol na água: luz polarizada horizontalmente
    for (let i = 0; i < 90; i++) {
      const x = (i * 131) % w, y = h * 0.5 + ((i * 71) % (h * 0.45))
      g.fillStyle = `rgba(255,255,245,${0.35 + ((i * 7) % 10) / 20})`
      g.fillRect(x, y, 26 + (i % 5) * 10, 3)
    }
    const sol = g.createRadialGradient(w * 0.62, h * 0.58, 0, w * 0.62, h * 0.58, w * 0.25)
    sol.addColorStop(0, 'rgba(255,255,240,.85)'); sol.addColorStop(1, 'rgba(255,255,240,0)')
    g.fillStyle = sol; g.fillRect(0, h * 0.45, w, h)
  }
}

/** Tela de computador com texto (filtro de luz azul). */
export function cenaTela(g, w, h) {
  g.fillStyle = '#2b2f36'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#f4f7fb'; g.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.75)
  g.fillStyle = '#2563eb'; g.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.09)
  g.fillStyle = '#fff'; g.font = fonte(Math.max(12, w / 40), 700); g.textBaseline = 'middle'; g.textAlign = 'left'
  g.fillText('E-mail · Caixa de entrada', w * 0.11, h * 0.145)
  g.fillStyle = '#1f2937'; g.font = fonte(Math.max(11, w / 48), 400)
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 3 === 0 ? '#1e40af' : '#1f2937'
    g.fillText(['Reunião às 15h confirmada', 'Relatório mensal anexado', 'Pedido #4821 enviado', 'Lembrete: consulta amanhã', 'Fatura de novembro', 'Novo comentário no projeto', 'Promoção de lentes', 'Resumo da semana'][i], w * 0.12, h * 0.25 + i * h * 0.07)
    // remetente e horário do outro lado, para a comparação ter texto nas duas metades
    g.fillStyle = '#475569'
    g.fillText(['Ana Paula', 'Financeiro', 'Loja Online', 'Clínica Visão', 'Banco', 'Equipe', 'Ótica Centro', 'Agenda'][i], w * 0.56, h * 0.25 + i * h * 0.07)
    g.fillText(`${8 + i}:${String((i * 17) % 60).padStart(2, '0')}`, w * 0.82, h * 0.25 + i * h * 0.07)
  }
}
