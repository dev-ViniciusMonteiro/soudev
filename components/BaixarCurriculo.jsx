'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'
import { curriculo as cv, periodo } from '@/lib/curriculo'

const ARQUIVO = 'Vinicius-Monteiro-Tech-Lead-Fullstack'

// Word em uma coluna, só texto e títulos padrão: é o formato que os ATS (Gupy, Workday, Greenhouse) leem melhor.
async function gerarDocx() {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
  const titulo = (texto) => new Paragraph({ text: texto, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } })
  const item = (texto) => new Paragraph({ text: texto, bullet: { level: 0 } })
  const linha = (forte, data) =>
    new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: forte, bold: true }), new TextRun({ text: `  |  ${data}` })] })

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections: [
      {
        children: [
          new Paragraph({ text: cv.nome, heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
          new Paragraph({ children: [new TextRun({ text: cv.titulo, bold: true })] }),
          new Paragraph({ text: [cv.local, cv.email, ...cv.links.map(([, url]) => url)].join('  |  ') }),
          titulo('Resumo'),
          new Paragraph({ text: cv.resumo }),
          ...cv.destaques.map(item),
          titulo('Experiência'),
          linha(`${cv.empresa.nome}: ${cv.empresa.cargo}`, periodo(cv.empresa)),
          new Paragraph({ text: 'Consultoria de tecnologia (CLT). Alocações em clientes:' }),
          ...cv.alocacoes.flatMap((a) => [
            linha(`${a.cliente}: ${a.papel}`, periodo(a)),
            ...a.itens.map(item),
            ...(a.stack.length ? [new Paragraph({ children: [new TextRun({ text: `Tecnologias: ${a.stack.join(', ')}`, italics: true })] })] : []),
          ]),
          titulo('Competências'),
          ...cv.competencias.map(([grupo, itens]) => new Paragraph({ children: [new TextRun({ text: `${grupo}: `, bold: true }), new TextRun(itens)] })),
          titulo('Certificações'),
          ...cv.certificacoes.map(item),
          titulo('Formação'),
          ...cv.formacao.map(([curso, escola, ano]) => linha(`${curso}, ${escola}`, ano)),
        ],
      },
    ],
  })
  return Packer.toBlob(doc)
}

export function BaixarCurriculo() {
  const [gerando, setGerando] = useState(false)

  const word = async () => {
    setGerando(true)
    try {
      downloadBlob(await gerarDocx(), `${ARQUIVO}.docx`)
      track('curriculo_download', { formato: 'docx' })
    } finally {
      setGerando(false)
    }
  }

  const pdf = () => {
    track('curriculo_download', { formato: 'pdf' })
    // O nome sugerido pelo navegador ao salvar em PDF vem do título da aba.
    const antes = document.title
    document.title = ARQUIVO
    window.print()
    document.title = antes
  }

  return (
    <div className="cv-acoes cv-sem-impressao">
      <button type="button" className="btn btn-primary" onClick={pdf}>
        Baixar PDF
      </button>
      <button type="button" className="btn btn-ghost" onClick={word} disabled={gerando}>
        {gerando ? 'Gerando…' : 'Baixar Word (.docx)'}
      </button>
      <a className="btn btn-ghost" href="/resume.json" target="_blank" rel="noopener">
        JSON Resume
      </a>
    </div>
  )
}
