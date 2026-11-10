// PDF do currículo gerado de verdade (pdf-lib), em vez do "imprimir como PDF" do navegador:
// download direto em qualquer aparelho, A4 idêntico em todo navegador, sem cabeçalho/rodapé do navegador,
// texto selecionável em uma coluna (o que os ATS leem melhor), links clicáveis, metadados preenchidos
// e rodapé com paginação. Usa as fontes padrão do PDF (Helvetica): arquivo leve, sem embutir fonte.
// O layout encolhe um pouco, se preciso, para caber em 2 páginas (o que recrutadores esperam).

import { PDFDocument, PDFString, StandardFonts, rgb } from 'pdf-lib'
import { curriculo as cv, periodo } from './curriculo'

const A4 = [595.28, 841.89]
const MX = 46
const TOPO = 40
const BASE = 50
const LARGURA = A4[0] - MX * 2
const MAX_PAGINAS = 2

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const COR = { forte: hex('#111827'), texto: hex('#1f2937'), suave: hex('#4b5563'), claro: hex('#6b7280'), linha: hex('#d1d5db'), destaque: hex('#1f5c45') }

const host = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

// As fontes padrão só cobrem o WinAnsi: troca o que não existe nele e descarta o resto.
const limpar = (t) =>
  String(t)
    .replace(/\s*→\s*/g, ' › ')
    .replace(/[^\x20-\x7e\xa0-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, '')

async function montar(e) {
  const pdf = await PDFDocument.create()
  const F = {
    r: await pdf.embedFont(StandardFonts.Helvetica),
    b: await pdf.embedFont(StandardFonts.HelveticaBold),
    i: await pdf.embedFont(StandardFonts.HelveticaOblique),
  }
  // Tamanhos: corpo, itens das alocações, metadados miúdos. Tudo escala junto com "e".
  const T = { corpo: 9.2 * e, item: 9 * e, meta: 8.6 * e, mini: 7.9 * e }
  const LH = 1.4
  const paginas = []
  let page
  let y
  let filete = null // bloco de alocação aberto: o filete lateral acompanha a quebra de página

  const link = (url, x1, y1, x2, y2) => {
    const ref = pdf.context.register(
      pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x1, y1, x2, y2], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } }),
    )
    page.node.addAnnot(ref)
  }

  const linhaFilete = (topo, fim) => page.drawLine({ start: { x: MX - 8, y: topo }, end: { x: MX - 8, y: fim }, thickness: 1.6, color: COR.linha })

  const novaPagina = () => {
    if (filete && page) linhaFilete(filete, y + 2)
    page = pdf.addPage(A4)
    paginas.push(page)
    y = A4[1] - TOPO
    if (paginas.length > 1) {
      // Cabeçalho curto nas páginas seguintes: impresso, dá para saber de quem é a folha.
      const t = limpar(cv.titulo)
      page.drawText(limpar(cv.nome), { x: MX, y: y - 8, size: 8.5, font: F.b, color: COR.forte })
      page.drawText(t, { x: MX + LARGURA - F.r.widthOfTextAtSize(t, 8.5), y: y - 8, size: 8.5, font: F.r, color: COR.suave })
      page.drawLine({ start: { x: MX, y: y - 14 }, end: { x: MX + LARGURA, y: y - 14 }, thickness: 0.6, color: COR.linha })
      y -= 26
    }
    if (filete) filete = y
  }

  const caber = (h) => {
    if (y - h < BASE) novaPagina()
  }

  // Quebra trechos (fonte, cor e link próprios) em linhas da largura dada.
  const quebrar = (trechos, size, largura) => {
    const palavras = []
    let colar = false
    for (const tr of trechos) {
      const texto = limpar(tr.t)
      texto.split(' ').forEach((p, i) => {
        if (p) palavras.push({ ...tr, font: tr.font || F.r, t: p, colar: i === 0 && colar && palavras.length > 0 })
      })
      colar = !texto.endsWith(' ')
    }
    const linhas = [[]]
    let x = 0
    for (const p of palavras) {
      const w = p.font.widthOfTextAtSize(p.t, size)
      const esp = p.colar ? 0 : p.font.widthOfTextAtSize(' ', size)
      const linha = linhas[linhas.length - 1]
      if (linha.length && !p.colar && x + esp + w > largura) {
        linhas.push([{ ...p, colar: false, x: 0, w }])
        x = w
      } else {
        const px = linha.length ? x + esp : 0
        linha.push({ ...p, x: px, w })
        x = px + w
      }
    }
    return linhas
  }

  // Cada linha vira poucos textos contínuos (com espaços de verdade), para a extração de texto dos ATS sair limpa.
  const desenharLinhas = (linhas, { x = MX, size, lh, cor = COR.texto }) => {
    for (const linha of linhas) {
      const base = y - size
      const grupos = []
      for (const p of linha) {
        const g = grupos[grupos.length - 1]
        if (g && g.font === p.font && g.cor === p.cor && g.link === p.link) {
          g.t += (p.colar ? '' : ' ') + p.t
          g.w = p.x + p.w - g.x
        } else {
          if (g && !p.colar) g.t += ' '
          grupos.push({ t: p.t, font: p.font, cor: p.cor, link: p.link, x: p.x, w: p.w })
        }
      }
      for (const g of grupos) {
        page.drawText(g.t, { x: x + g.x, y: base, size, font: g.font, color: g.cor || cor })
        if (g.link) link(g.link, x + g.x, base - 2, x + g.x + g.w, base + size * 0.85)
      }
      y -= lh
    }
  }

  const texto = (trechos, { x = MX, largura = LARGURA, size = T.corpo, lh = size * LH, cor } = {}) => {
    const linhas = quebrar(typeof trechos === 'string' ? [{ t: trechos }] : trechos, size, largura)
    caber(Math.min(linhas.length, 3) * lh)
    desenharLinhas(linhas, { x, size, lh, cor })
  }

  const item = (t, { x = MX + 2, size = T.item, lh = size * LH, extra = 0 } = {}) => {
    const recuo = 10
    const linhas = quebrar([{ t }], size, LARGURA - (x - MX) - recuo)
    caber(linhas.length * lh + extra)
    page.drawText('•', { x, y: y - size, size, font: F.r, color: COR.destaque })
    desenharLinhas(linhas, { x: x + recuo, size, lh })
    y -= 1.2 * e
  }

  // Linha de título com a data alinhada à direita.
  const cabecalho = (trechos, direita, { size, lh = size * 1.38 }) => {
    const d = direita ? limpar(direita) : ''
    const dW = d ? F.r.widthOfTextAtSize(d, T.meta) + 12 : 0
    const linhas = quebrar(trechos, size, LARGURA - dW)
    caber(lh)
    if (d) page.drawText(d, { x: MX + LARGURA - dW + 12, y: y - size, size: T.meta, font: F.r, color: COR.suave })
    desenharLinhas(linhas, { size, lh, cor: COR.forte })
  }

  const secao = (titulo, reserva = 50) => {
    y -= 10 * e
    caber(20 * e + reserva * e)
    const size = 9.4 * e
    page.drawText(limpar(titulo.toUpperCase()), { x: MX, y: y - size, size, font: F.b, color: COR.destaque })
    page.drawLine({ start: { x: MX, y: y - size - 5 }, end: { x: MX + LARGURA, y: y - size - 5 }, thickness: 0.8, color: COR.linha })
    y -= size + 13 * e
  }

  // ---------- Topo ----------
  novaPagina()
  page.drawRectangle({ x: 0, y: A4[1] - 6, width: A4[0], height: 6, color: COR.destaque })
  y -= 6
  page.drawText(limpar(cv.nome), { x: MX, y: y - 22, size: 23, font: F.b, color: COR.forte })
  y -= 31
  page.drawText(limpar(cv.titulo), { x: MX, y: y - 11.5, size: 11.5, font: F.b, color: COR.destaque })
  y -= 21

  const sep = { t: '  ·  ', cor: COR.linha }
  const contato = [{ t: cv.local }, { t: cv.email, link: `mailto:${cv.email}`, cor: COR.destaque }]
  for (const [, url] of cv.links) contato.push({ t: host(url), link: url, cor: COR.destaque })
  texto(contato.flatMap((c, i) => (i ? [sep, c] : [c])), { size: 8.7, cor: COR.suave })

  // ---------- Resumo ----------
  secao('Resumo')
  texto(cv.resumo, { lh: T.corpo * 1.45 })
  y -= 3 * e
  for (const d of cv.destaques) item(d, { size: T.corpo })

  // ---------- Experiência ----------
  secao('Experiência', 80)
  cabecalho([{ t: cv.empresa.nome, font: F.b }], periodo(cv.empresa), { size: 11 * e })
  texto(`${cv.empresa.cargo}  ·  ${cv.empresa.tipo}`, { size: T.meta, cor: COR.suave })
  texto([{ t: 'Principais projetos em clientes de grande porte (nomes omitidos por confidencialidade):', font: F.i }], { size: T.meta, cor: COR.claro })

  for (const a of cv.alocacoes) {
    y -= 6 * e
    // Título, cliente e o primeiro item não se separam na quebra de página.
    caber(T.item * LH * 4 + 4)
    filete = y - 1
    cabecalho([{ t: a.papel, font: F.b }], periodo(a), { size: 9.8 * e })
    texto([{ t: a.cliente, font: F.i }], { size: T.meta, cor: COR.suave })
    y -= 1.5 * e
    // A linha de tecnologias fica sempre junto do último item.
    const stack = a.stack.length ? [{ t: 'Tecnologias: ', font: F.b, cor: COR.suave }, { t: a.stack.join(' · '), cor: COR.claro }] : null
    const stackH = stack ? quebrar(stack, T.mini, LARGURA - 12).length * T.mini * 1.38 : 0
    a.itens.forEach((i, n) => item(i, { extra: n === a.itens.length - 1 ? stackH : 0 }))
    if (stack) texto(stack, { x: MX + 12, largura: LARGURA - 12, size: T.mini, lh: T.mini * 1.38 })
    linhaFilete(filete, y + 2)
    filete = null
  }

  // ---------- Anteriores ----------
  secao('Experiência anterior', 28)
  for (const a of cv.anteriores) {
    cabecalho([{ t: `${a.empresa}: ${a.papel}`, font: F.b }], periodo(a), { size: 9.8 * e })
    for (const i of a.itens) item(i)
  }

  // ---------- Competências ----------
  secao('Competências')
  const COL = 122
  for (const [grupo, itens] of cv.competencias) {
    const size = T.meta
    const lh = size * 1.38
    const lg = quebrar([{ t: grupo, font: F.b }], size, COL - 10)
    const li = quebrar([{ t: itens }], size, LARGURA - COL)
    caber(Math.max(lg.length, li.length) * lh)
    const y0 = y
    desenharLinhas(lg, { size, lh, cor: COR.forte })
    const yG = y
    y = y0
    desenharLinhas(li, { x: MX + COL, size, lh })
    y = Math.min(y, yG) - 2.5 * e
  }

  // ---------- Certificações ----------
  secao('Certificações')
  for (const c of cv.certificacoes) item(c, { size: T.meta })

  // ---------- Formação e idiomas ----------
  secao('Formação e idiomas', 30)
  for (const [curso, escola, ano] of cv.formacao) {
    cabecalho([{ t: curso, font: F.b }, { t: `  ·  ${escola}`, cor: COR.suave }], ano, { size: T.corpo })
  }
  y -= 2 * e
  texto(cv.idiomas.flatMap(([idioma, nivel], i) => [...(i ? [sep] : []), { t: `${idioma}: `, font: F.b }, { t: nivel }]), { size: T.item })

  // ---------- Rodapé com paginação ----------
  const online = cv.links.find(([nome]) => /online/i.test(nome))?.[1]
  paginas.forEach((p, i) => {
    page = p
    const yR = 26
    const s = 7.5
    p.drawLine({ start: { x: MX, y: yR + 12 }, end: { x: MX + LARGURA, y: yR + 12 }, thickness: 0.5, color: COR.linha })
    let esq = limpar(`${cv.nome}  ·  Currículo`)
    if (online) esq += `  ·  ${host(online)}`
    p.drawText(esq, { x: MX, y: yR, size: s, font: F.r, color: COR.claro })
    if (online) {
      const xL = MX + F.r.widthOfTextAtSize(esq, s) - F.r.widthOfTextAtSize(host(online), s)
      link(online, xL, yR - 2, MX + F.r.widthOfTextAtSize(esq, s), yR + 7)
    }
    const dir = limpar(`Página ${i + 1} de ${paginas.length}`)
    p.drawText(dir, { x: MX + LARGURA - F.r.widthOfTextAtSize(dir, s), y: yR, size: s, font: F.r, color: COR.claro })
  })

  // ---------- Metadados (leitor de PDF, ATS e buscadores) ----------
  pdf.setTitle(`Currículo de ${cv.nome}: ${cv.titulo}`, { showInWindowTitleBar: true })
  pdf.setAuthor(cv.nome)
  pdf.setSubject(cv.resumo.slice(0, 240))
  pdf.setKeywords(cv.competencias.flatMap(([, itens]) => itens.split(', ')).slice(0, 60))
  pdf.setCreator(online || 'soudev')
  pdf.setProducer('soudev (pdf-lib)')
  pdf.setLanguage('pt-BR')
  pdf.setCreationDate(new Date())
  pdf.setModificationDate(new Date())

  return { pdf, paginas: paginas.length }
}

export async function gerarCurriculoPdf() {
  // Começa no tamanho cheio e encolhe aos poucos até caber em MAX_PAGINAS (sem descer de 88%).
  let r
  for (let e = 1; e >= 0.879; e -= 0.03) {
    r = await montar(e)
    if (r.paginas <= MAX_PAGINAS) break
  }
  return r.pdf.save()
}
