// Exporta o Markdown do documento para Word (.docx): títulos, parágrafos, listas, tabelas e código.
// Usa o lexer do marked para ler o Markdown e a biblioteca docx para montar o arquivo.

const ENTIDADES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
const decodificar = (s) => String(s ?? '').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTIDADES[m])

export async function markdownParaDocx(markdown, titulo = 'Documento') {
  const [{ marked }, d] = await Promise.all([import('marked'), import('docx')])
  const { BorderStyle, Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } = d

  const NIVEIS = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5]
  const borda = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
  const bordas = { top: borda, bottom: borda, left: borda, right: borda }

  /** Tokens de linha (negrito, itálico, código, link) viram TextRuns. */
  const corridas = (tokens = [], estilo = {}) =>
    tokens.flatMap((t) => {
      switch (t.type) {
        case 'strong':
          return corridas(t.tokens, { ...estilo, bold: true })
        case 'em':
          return corridas(t.tokens, { ...estilo, italics: true })
        case 'del':
          return corridas(t.tokens, { ...estilo, strike: true })
        case 'codespan':
          return [new TextRun({ ...estilo, text: decodificar(t.text), font: 'Consolas' })]
        case 'br':
          return [new TextRun({ ...estilo, text: '', break: 1 })]
        case 'link':
          return [new ExternalHyperlink({ link: t.href, children: corridas(t.tokens, { ...estilo, style: 'Hyperlink' }) })]
        case 'text':
          return t.tokens ? corridas(t.tokens, estilo) : [new TextRun({ ...estilo, text: decodificar(t.text) })]
        default:
          return [new TextRun({ ...estilo, text: decodificar(t.text ?? t.raw ?? '') })]
      }
    })

  const tabela = (t) => {
    const colunas = t.header.length
    const celula = (c, cabecalho) =>
      new TableCell({
        borders: bordas,
        shading: cabecalho ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E8EEF4' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: corridas(c.tokens, cabecalho ? { bold: true } : {}) })],
      })
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array(colunas).fill(Math.floor(9000 / colunas)),
      rows: [new TableRow({ tableHeader: true, children: t.header.map((c) => celula(c, true)) }), ...t.rows.map((linha) => new TableRow({ children: linha.map((c) => celula(c, false)) }))],
    })
  }

  const lista = (t, nivel = 0) =>
    t.items.flatMap((item, i) => {
      const prefixo = t.ordered ? `${(Number(t.start) || 1) + i}. ` : ''
      const out = []
      for (const sub of item.tokens) {
        if (sub.type === 'list') out.push(...lista(sub, nivel + 1))
        else if (sub.type === 'text' || sub.type === 'paragraph') {
          const filhos = corridas(sub.tokens ?? [{ type: 'text', text: sub.text }])
          out.push(
            t.ordered
              ? new Paragraph({ indent: { left: 360 * (nivel + 1) }, children: [new TextRun(prefixo), ...filhos] })
              : new Paragraph({ bullet: { level: nivel }, children: [...(item.task ? [new TextRun(item.checked ? '☑ ' : '☐ ')] : []), ...filhos] }),
          )
        }
      }
      return out
    })

  const blocos = (tokens) =>
    tokens.flatMap((t) => {
      switch (t.type) {
        case 'heading':
          return [new Paragraph({ heading: NIVEIS[Math.min(t.depth, 5)] ?? HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 }, children: corridas(t.tokens) })]
        case 'paragraph':
          return [new Paragraph({ spacing: { after: 120 }, children: corridas(t.tokens) })]
        case 'list':
          return lista(t)
        case 'table':
          return [tabela(t), new Paragraph({ text: '' })]
        case 'code':
          return decodificar(t.text)
            .split('\n')
            .map((linha) => new Paragraph({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F3F3' }, children: [new TextRun({ text: linha || ' ', font: 'Consolas', size: 18 })] }))
        case 'blockquote':
          return blocos(t.tokens)
        case 'hr':
          return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BFBFBF', space: 1 } } })]
        case 'space':
          return []
        default:
          return t.text ? [new Paragraph({ text: decodificar(t.text) })] : []
      }
    })

  const doc = new Document({
    title: titulo,
    creator: 'Documentador',
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: blocos(marked.lexer(markdown)) }],
  })
  return Packer.toBlob(doc)
}

/** Nome de arquivo seguro a partir do primeiro título do documento. */
export function nomeArquivo(markdown, padrao = 'documento') {
  const titulo = String(markdown).match(/^#\s+(.+)$/m)?.[1] ?? padrao
  return (
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || padrao
  )
}
