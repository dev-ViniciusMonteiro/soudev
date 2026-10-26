// Gerador de convites: tipos, temas (paletas), desenho do convite em SVG e codificação dos dados
// no próprio link (sem servidor). O mesmo SVG serve para a prévia, o download em imagem e a página /convite.

export const TEMAS = [
  { id: 'rose', nome: 'Romântico', bg1: '#fff1f3', bg2: '#ffe0e6', accent: '#be123c', text: '#4a1020', muted: '#9f5a66', font: 'Georgia, "Times New Roman", serif' },
  { id: 'gold', nome: 'Elegante', bg1: '#201d18', bg2: '#2f2a22', accent: '#d4af37', text: '#f5efe0', muted: '#b6a988', font: 'Georgia, "Times New Roman", serif' },
  { id: 'festa', nome: 'Festa', bg1: '#fef3c7', bg2: '#fde68a', accent: '#d946ef', text: '#3b0764', muted: '#7c5a1e', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'azul', nome: 'Azul', bg1: '#dbeafe', bg2: '#bfdbfe', accent: '#1d4ed8', text: '#17315e', muted: '#4f6ea3', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'rosa', nome: 'Rosa', bg1: '#fce7f3', bg2: '#fbcfe8', accent: '#db2777', text: '#500724', muted: '#a85680', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: 'verde', nome: 'Verde', bg1: '#dcfce7', bg2: '#bbf7d0', accent: '#15803d', text: '#052e16', muted: '#4a7a5c', font: 'Georgia, serif' },
  { id: 'minimal', nome: 'Minimalista', bg1: '#ffffff', bg2: '#f3f4f6', accent: '#111827', text: '#111827', muted: '#6b7280', font: 'Georgia, serif' },
  { id: 'noite', nome: 'Noite', bg1: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', text: '#e2e8f0', muted: '#8aa0b4', font: '"Trebuchet MS", "Segoe UI", sans-serif' },
]

export const TIPOS = [
  { id: 'aniversario', nome: 'Aniversário', emoji: '🎂', tema: 'festa', eyebrow: 'Com alegria, convidamos você para', titulo: 'Aniversário da Ana', subtitulo: '30 anos', mensagem: 'Venha comemorar esse dia tão especial com a gente! Teremos bolo, comidinhas e muita música.' },
  { id: 'infantil', nome: 'Aniversário infantil', emoji: '🎈', tema: 'azul', eyebrow: 'Venha comemorar com a gente', titulo: 'Festa do Theo', subtitulo: '5 aninhos', mensagem: 'Prepare a fantasia e venha brincar! Teremos bolo, doces e muita diversão.' },
  { id: 'casamento', nome: 'Casamento', emoji: '💍', tema: 'rose', eyebrow: 'Com a bênção de Deus, convidam para o casamento', titulo: 'Maria & João', subtitulo: '', mensagem: 'É com imensa alegria que convidamos você para celebrar a nossa união. Sua presença é o nosso maior presente.' },
  { id: 'bodas', nome: 'Bodas', emoji: '💞', tema: 'gold', eyebrow: 'Com gratidão, convidamos para as nossas', titulo: 'Bodas de Prata', subtitulo: '25 anos de casados', mensagem: 'Celebre conosco 25 anos de amor, parceria e muitas histórias. Será uma honra ter você ao nosso lado.' },
  { id: 'cha-bebe', nome: 'Chá de bebê', emoji: '🍼', tema: 'azul', eyebrow: 'Vem aí nosso bebê! Convidamos você para o', titulo: 'Chá do Davi', subtitulo: '', mensagem: 'Venha celebrar a chegada do nosso pequeno com muito carinho, brincadeiras e lembrancinhas.' },
  { id: 'cha-panela', nome: 'Chá de panela', emoji: '🍽️', tema: 'verde', eyebrow: 'Convidamos você para o nosso', titulo: 'Chá de Panela', subtitulo: 'Ana & Pedro', mensagem: 'Estamos montando o nosso lar e queremos você nesse momento. Confira a listinha de presentes!' },
  { id: 'formatura', nome: 'Formatura', emoji: '🎓', tema: 'noite', eyebrow: 'Com orgulho, convido você para a minha', titulo: 'Formatura', subtitulo: 'Engenharia Civil', mensagem: 'Depois de muito esforço, chegou a hora de comemorar. Sua presença tornará essa conquista ainda mais especial.' },
  { id: 'cha-revelacao', nome: 'Chá revelação', emoji: '🎉', tema: 'festa', eyebrow: 'Menino ou menina? Venha descobrir no', titulo: 'Chá Revelação', subtitulo: 'Família Silva', mensagem: 'A curiosidade está no ar! Venha fazer sua aposta e descobrir com a gente esse grande segredo.' },
  { id: 'religioso', nome: 'Batizado / religioso', emoji: '⛪', tema: 'minimal', eyebrow: 'Convidamos você para a celebração do', titulo: 'Batizado da Laura', subtitulo: '', mensagem: 'Será uma alegria contar com a sua presença neste momento tão importante para a nossa família.' },
  { id: 'festa', nome: 'Festa (geral)', emoji: '🎉', tema: 'festa', eyebrow: 'Você está convidado(a) para', titulo: 'Nossa Festa', subtitulo: '', mensagem: 'Reserve a data e venha curtir com a gente! Vai ter música, comida boa e boas risadas.' },
]

export const getTipo = (id) => TIPOS.find((t) => t.id === id) || TIPOS[0]
export const getTema = (id) => TEMAS.find((t) => t.id === id) || TEMAS[0]

export function exemploConvite(tipoId = 'aniversario') {
  const t = getTipo(tipoId)
  return { tipo: t.id, eyebrow: t.eyebrow, titulo: t.titulo, subtitulo: t.subtitulo, data: '', hora: '', local: '', endereco: '', mensagem: t.mensagem, rsvp: '', tema: t.tema }
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function dataExtenso(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  if (!d) return iso
  return `${+d} de ${MESES[+m - 1] || ''} de ${a}`
}

/* ---- codificação no link (unicode-safe base64url) ---- */
export function encodeConvite(obj) {
  try {
    const json = JSON.stringify(obj)
    const b64 = btoa(unescape(encodeURIComponent(json)))
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch { return '' }
}
export function decodeConvite(s) {
  try {
    let b64 = String(s).replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    return JSON.parse(decodeURIComponent(escape(atob(b64))))
  } catch { return null }
}

/* ---- desenho do convite em SVG ---- */
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function wrap(text, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}

export function conviteSVG(d) {
  const t = getTema(d.tema)
  const tipo = getTipo(d.tipo)
  const W = 1080, H = 1350
  const cx = W / 2
  const out = []
  let y = 150

  const texto = (txt, { size = 32, color = t.text, weight = 400, ls = 0, ff = t.font, italic = false, up = false, lh = 1.28 } = {}) => {
    const arr = Array.isArray(txt) ? txt : [txt]
    for (let ln of arr) {
      if (up) ln = ln.toUpperCase()
      out.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-family="${ff}" font-size="${size}" fill="${color}" font-weight="${weight}" letter-spacing="${ls}"${italic ? ' font-style="italic"' : ''}>${esc(ln)}</text>`)
      y += size * lh
    }
  }
  const gap = (n) => { y += n }

  // fundo + moldura
  out.push(`<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient></defs>`)
  out.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`)
  out.push(`<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="26" fill="none" stroke="${t.accent}" stroke-width="3"/>`)
  out.push(`<rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="18" fill="none" stroke="${t.accent}" stroke-width="1" opacity="0.5"/>`)

  // emoji
  texto(tipo.emoji, { size: 118, lh: 1.0 }); gap(26)
  // eyebrow
  wrap(d.eyebrow || tipo.eyebrow, 40).forEach((l) => texto(l, { size: 24, color: t.muted, ls: 3, up: true, lh: 1.3 }))
  gap(24)
  // título
  wrap(d.titulo || tipo.titulo, 18).forEach((l) => texto(l, { size: 82, weight: 700, lh: 1.08 }))
  // subtítulo
  if (d.subtitulo) { gap(6); texto(d.subtitulo, { size: 42, color: t.accent, italic: true }) }
  gap(28)
  // divisória
  out.push(`<rect x="${cx - 70}" y="${y}" width="140" height="3" rx="2" fill="${t.accent}"/>`); gap(50)
  // data / hora
  const dataLinha = [dataExtenso(d.data), d.hora].filter(Boolean).join(' · ')
  if (dataLinha) { texto('📅 ' + dataLinha, { size: 36, weight: 600 }); gap(14) }
  // local / endereço
  if (d.local) { texto('📍 ' + d.local, { size: 34, weight: 600 }); gap(6) }
  if (d.endereco) { wrap(d.endereco, 44).forEach((l) => texto(l, { size: 24, color: t.muted })); }
  if (d.local || d.endereco) gap(24)
  // mensagem
  if (d.mensagem) { wrap(d.mensagem, 40).forEach((l) => texto(l, { size: 28, color: t.text, lh: 1.5 })) }
  // rsvp (rodapé)
  if (d.rsvp) {
    y = Math.max(y + 40, H - 170)
    texto('Confirme sua presença', { size: 22, color: t.muted, ls: 2, up: true }); gap(8)
    texto(d.rsvp, { size: 32, color: t.accent, weight: 600 })
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${out.join('')}</svg>`
}

/** Data URL do SVG, para usar em <img src> e no download. */
export const conviteDataUrl = (d) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(conviteSVG(d))
