'use client'

// Gerador de currículo didático: formulário com dicas em cada campo, vários modelos visuais,
// prévia ao vivo, download em PDF (impressão) e Word (.docx, bom para ATS), além de atalhos que
// montam prompts prontos para melhorar o texto com IA. Exemplo pré-preenchido nível iniciante.

import { forwardRef, useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'
import { Field, Notice, Tabs } from '../ui'

/* ---------- exemplo (nome/foto reais, resto fictício e nível de entrada) ---------- */
const EXEMPLO = {
  foto: '/vinicius-rosto.jpg',
  nome: 'Vinicius Monteiro Orlandi',
  cargo: 'Desenvolvedor Front-End Júnior',
  email: 'seuemail@exemplo.com',
  telefone: '(11) 90000-0000',
  cidade: 'São Paulo, SP',
  linkedin: 'linkedin.com/in/seu-usuario',
  site: 'github.com/seu-usuario',
  resumo:
    'Pessoa em início de carreira em desenvolvimento web, com base em HTML, CSS, JavaScript e React construída em cursos e projetos próprios. Organizada, comunicativa e ávida por aprender, busco a primeira oportunidade para somar a um time e crescer junto com a empresa.',
  experiencias: [
    { cargo: 'Projeto pessoal — Site de portfólio', empresa: 'Projeto próprio', periodo: '2025', local: 'Remoto', desc: 'Criei e publiquei um site responsivo com HTML, CSS e JavaScript.\nUsei Git e GitHub para versionar o código.\nColoquei no ar com deploy gratuito (Vercel).' },
    { cargo: 'Atendente', empresa: 'Loja Exemplo', periodo: 'Jan/2023 – Dez/2024', local: 'São Paulo, SP', desc: 'Atendi clientes e organizei o estoque, desenvolvendo responsabilidade e trabalho em equipe.\nControlei o caixa com conferência diária sem divergências.' },
  ],
  formacao: [
    { curso: 'Análise e Desenvolvimento de Sistemas', instituicao: 'Faculdade Exemplo', periodo: '2024 – 2026 (cursando)' },
    { curso: 'Ensino Médio Completo', instituicao: 'Escola Exemplo', periodo: '2022' },
  ],
  habilidades: ['HTML', 'CSS', 'JavaScript', 'React', 'Git e GitHub', 'Lógica de programação', 'Trabalho em equipe'],
  idiomas: [{ idioma: 'Português', nivel: 'Nativo' }, { idioma: 'Inglês', nivel: 'Intermediário (leitura técnica)' }],
  cursos: [
    { nome: 'Desenvolvimento Web Completo', instituicao: 'Curso online', ano: '2025' },
    { nome: 'Lógica de Programação', instituicao: 'Curso online', ano: '2024' },
  ],
}

/* ---------- dicas por campo ---------- */
const DICAS = {
  foto: 'Opcional. Se usar, escolha uma foto nítida, de frente, com fundo neutro e roupa de trabalho. Em processos por ATS, prefira sem foto.',
  nome: 'Seu nome completo, do jeito que aparece nos documentos. Nada de apelido.',
  cargo: 'O cargo que você QUER, não o que tem hoje. Ex.: “Auxiliar Administrativo”, “Desenvolvedor Júnior”. Adapte para cada vaga.',
  email: 'Um e-mail profissional (nome.sobrenome@). Evite e-mails antigos ou engraçadinhos.',
  telefone: 'Com DDD. Confira se o WhatsApp está nesse número.',
  cidade: 'Cidade e estado. Se aceita trabalho remoto ou mudança, escreva (ex.: “Aberto a remoto”).',
  linkedin: 'Deixe o LinkedIn completo e com foto. É quase sempre a primeira coisa que o recrutador abre.',
  site: 'Portfólio, GitHub, Behance ou seu site. Se não tiver, deixe em branco (não invente).',
  resumo: 'De 3 a 4 linhas: quem você é, o que sabe fazer e o que procura. Comece pelo mais forte. Sem “sou proativo e dinâmico”.',
  experiencias: 'Comece pela mais recente. Sem experiência formal? Use projetos, estágios, trabalho voluntário, freelas e atividades do curso. Descreva com verbos de ação e, quando der, com números (quanto, quantos, em quanto tempo).',
  formacao: 'Curso, instituição e período. Pode incluir cursos técnicos e o ensino médio se for o seu caso. “Cursando” é válido.',
  habilidades: 'Misture técnicas (ferramentas, idiomas) e comportamentais (comunicação, organização). Seja honesto no nível.',
  idiomas: 'Só idiomas que você realmente usa. Diga o nível de forma realista (básico, intermediário, avançado, fluente).',
  cursos: 'Cursos livres, certificações e workshops. Ótimo para quem tem pouca experiência: mostra que você corre atrás.',
}

const MODELOS = [
  { id: 'classico', nome: 'Clássico', layout: 'single', accent: '#1f5c45', ats: true, desc: 'Uma coluna, sóbrio. O mais lido por sistemas de triagem (ATS).' },
  { id: 'moderno', nome: 'Moderno', layout: 'sidebar', accent: '#2b5d8c', desc: 'Barra lateral colorida com foto. Bonito e organizado.' },
  { id: 'minimalista', nome: 'Minimalista', layout: 'single', accent: '#222222', desc: 'Limpo, só tipografia. Elegante e neutro.' },
  { id: 'compacto', nome: 'Compacto', layout: 'sidebar', accent: '#6b21a8', desc: 'Tudo em uma página, denso. Bom para quem tem muito conteúdo.' },
  { id: 'criativo', nome: 'Criativo', layout: 'sidebar', accent: '#be123c', desc: 'Mais cor e destaque. Para áreas criativas e de design.' },
]
const CORES = ['#1f5c45', '#2b5d8c', '#6b21a8', '#be123c', '#b45309', '#0f766e', '#222222']
const CHAVE = 'soudev-curriculo-v1'

export default function GeradorCurriculo() {
  const [cv, setCv] = useState(EXEMPLO)
  const [tplId, setTplId] = useState('classico')
  const [accent, setAccent] = useState(MODELOS[0].accent)
  const [aba, setAba] = useState('conteudo')
  const [msg, setMsg] = useState('')
  const previewRef = useRef(null)
  const tpl = MODELOS.find((m) => m.id === tplId) || MODELOS[0]

  /* autosave local (por conveniência; cai no try/catch) */
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE)
      if (salvo) { const d = JSON.parse(salvo); if (d && d.nome) setCv({ ...EXEMPLO, ...d }) }
    } catch {}
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify(cv)) } catch {} }, 500)
    return () => clearTimeout(t)
  }, [cv])

  const set = (k) => (e) => setCv((c) => ({ ...c, [k]: e.target.value }))
  const setLista = (campo, i, k, v) => setCv((c) => {
    const l = c[campo].map((it, j) => (j === i ? { ...it, [k]: v } : it)); return { ...c, [campo]: l }
  })
  const addItem = (campo, modelo) => setCv((c) => ({ ...c, [campo]: [...c[campo], modelo] }))
  const delItem = (campo, i) => setCv((c) => ({ ...c, [campo]: c[campo].filter((_, j) => j !== i) }))

  const trocarFoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setCv((c) => ({ ...c, foto: r.result })); r.readAsDataURL(file)
  }
  const escolherModelo = (m) => { setTplId(m.id); setAccent(m.accent) }

  const limpar = () => {
    const vazio = { foto: '', nome: '', cargo: '', email: '', telefone: '', cidade: '', linkedin: '', site: '', resumo: '', experiencias: [], formacao: [], habilidades: [], idiomas: [], cursos: [] }
    setCv(vazio)
  }
  const restaurar = () => setCv(EXEMPLO)

  /* salvar / carregar JSON */
  const salvarJson = () => { downloadBlob(new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' }), 'meu-curriculo.json'); track('cvgen_salvar') }
  const carregarJson = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => { try { setCv({ ...EXEMPLO, ...JSON.parse(r.result) }); setMsg('Currículo carregado.') } catch { setMsg('Arquivo inválido.') } }
    r.readAsText(file); e.target.value = ''
  }

  /* PDF por impressão (do iframe, só o currículo) */
  const baixarPdf = () => {
    const node = previewRef.current; if (!node) return
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${(cv.nome || 'curriculo').replace(/\s+/g, '-')}</title><style>${CSS}\n@page{size:A4;margin:0}html,body{margin:0;background:#fff}.cvgen-print .cv-page{box-shadow:none;margin:0}</style></head><body class="cvgen cvgen-print">${node.outerHTML}</body></html>`
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    const go = () => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 1000) }
    if (frame.contentWindow.document.readyState === 'complete') setTimeout(go, 300)
    else frame.onload = () => setTimeout(go, 300)
    track('cvgen_pdf', { modelo: tplId })
  }

  /* Word .docx (uma coluna, amigável a ATS) */
  const baixarDocx = async () => {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx')
    const H = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 60 } })
    const B = (t) => new Paragraph({ text: t, bullet: { level: 0 } })
    const linha = (forte, data) => new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: forte, bold: true }), ...(data ? [new TextRun({ text: `  |  ${data}` })] : [])] })
    const kids = [
      new Paragraph({ text: cv.nome || 'Seu Nome', heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT }),
      ...(cv.cargo ? [new Paragraph({ children: [new TextRun({ text: cv.cargo, bold: true })] })] : []),
      new Paragraph({ text: [cv.email, cv.telefone, cv.cidade, cv.linkedin, cv.site].filter(Boolean).join('  |  ') }),
    ]
    if (cv.resumo) { kids.push(H('Resumo')); kids.push(new Paragraph({ text: cv.resumo })) }
    if (cv.experiencias.length) { kids.push(H('Experiência')); cv.experiencias.forEach((x) => { kids.push(linha(`${x.cargo}${x.empresa ? ' — ' + x.empresa : ''}`, [x.periodo, x.local].filter(Boolean).join(' · '))); (x.desc || '').split('\n').filter(Boolean).forEach((d) => kids.push(B(d))) }) }
    if (cv.formacao.length) { kids.push(H('Formação')); cv.formacao.forEach((x) => kids.push(linha(`${x.curso}${x.instituicao ? ', ' + x.instituicao : ''}`, x.periodo))) }
    if (cv.habilidades.length) { kids.push(H('Habilidades')); kids.push(new Paragraph({ text: cv.habilidades.join(' · ') })) }
    if (cv.cursos.length) { kids.push(H('Cursos e certificações')); cv.cursos.forEach((x) => kids.push(linha(`${x.nome}${x.instituicao ? ', ' + x.instituicao : ''}`, x.ano))) }
    if (cv.idiomas.length) { kids.push(H('Idiomas')); kids.push(new Paragraph({ text: cv.idiomas.map((i) => `${i.idioma}: ${i.nivel}`).join('  |  ') })) }
    const doc = new Document({ styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } }, sections: [{ children: kids }] })
    downloadBlob(await Packer.toBlob(doc), `${(cv.nome || 'curriculo').replace(/\s+/g, '-')}.docx`)
    track('cvgen_docx', { modelo: tplId })
  }

  return (
    <div className="cvgen">
      <style>{CSS}</style>

      <Notice kind="info">
        Monte seu currículo grátis, direto no navegador. O exemplo vem preenchido para você ver o resultado e trocar pelos seus dados —
        cada campo tem uma dica. Baixe em <b>PDF</b> (visual) ou <b>Word</b> (melhor para sistemas de triagem). Nada é enviado a servidores.
      </Notice>

      <Tabs value={aba} onChange={setAba} tabs={[['conteudo', 'Conteúdo'], ['modelo', 'Modelo e cores'], ['ia', 'Melhorar com IA']]} />

      <div className="cvg-layout">
        {/* ------- painel esquerdo ------- */}
        <div className="cvg-left">
          {aba === 'conteudo' && (
            <div className="cvg-form">
              <div className="cvg-foto-row">
                <img className="cvg-foto-mini" src={cv.foto || '/icon.svg'} alt="" />
                <div>
                  <label className="btn btn-ghost btn-sm">Trocar foto<input type="file" accept="image/*" hidden onChange={trocarFoto} /></label>
                  {cv.foto && <button className="btn btn-ghost btn-sm" onClick={() => setCv((c) => ({ ...c, foto: '' }))}>Remover</button>}
                  <small className="cvg-dica">{DICAS.foto}</small>
                </div>
              </div>

              <Campo id="nome" label="Nome completo" value={cv.nome} onChange={set('nome')} dica={DICAS.nome} />
              <Campo id="cargo" label="Cargo / objetivo" value={cv.cargo} onChange={set('cargo')} dica={DICAS.cargo} />
              <div className="cvg-grid2">
                <Campo id="email" label="E-mail" value={cv.email} onChange={set('email')} dica={DICAS.email} />
                <Campo id="telefone" label="Telefone" value={cv.telefone} onChange={set('telefone')} dica={DICAS.telefone} />
                <Campo id="cidade" label="Cidade/UF" value={cv.cidade} onChange={set('cidade')} dica={DICAS.cidade} />
                <Campo id="linkedin" label="LinkedIn" value={cv.linkedin} onChange={set('linkedin')} dica={DICAS.linkedin} />
                <Campo id="site" label="Portfólio / GitHub" value={cv.site} onChange={set('site')} dica={DICAS.site} />
              </div>
              <Campo id="resumo" label="Resumo profissional" value={cv.resumo} onChange={set('resumo')} dica={DICAS.resumo} textarea />

              <Secao titulo="Experiência" dica={DICAS.experiencias}>
                {cv.experiencias.map((x, i) => (
                  <div className="cvg-item" key={i}>
                    <div className="cvg-grid2">
                      <input value={x.cargo} onChange={(e) => setLista('experiencias', i, 'cargo', e.target.value)} placeholder="Cargo / título" aria-label="Cargo" />
                      <input value={x.empresa} onChange={(e) => setLista('experiencias', i, 'empresa', e.target.value)} placeholder="Empresa / projeto" aria-label="Empresa" />
                      <input value={x.periodo} onChange={(e) => setLista('experiencias', i, 'periodo', e.target.value)} placeholder="Período (ex.: 2023 – atual)" aria-label="Período" />
                      <input value={x.local} onChange={(e) => setLista('experiencias', i, 'local', e.target.value)} placeholder="Local / remoto" aria-label="Local" />
                    </div>
                    <textarea value={x.desc} onChange={(e) => setLista('experiencias', i, 'desc', e.target.value)} placeholder="O que você fez (uma linha por tarefa/resultado)" rows={3} aria-label="Descrição" />
                    <button className="icon-btn cvg-del" onClick={() => delItem('experiencias', i)} aria-label="Remover">× remover</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addItem('experiencias', { cargo: '', empresa: '', periodo: '', local: '', desc: '' })}>+ Adicionar experiência</button>
              </Secao>

              <Secao titulo="Formação" dica={DICAS.formacao}>
                {cv.formacao.map((x, i) => (
                  <div className="cvg-item" key={i}>
                    <div className="cvg-grid2">
                      <input value={x.curso} onChange={(e) => setLista('formacao', i, 'curso', e.target.value)} placeholder="Curso" aria-label="Curso" />
                      <input value={x.instituicao} onChange={(e) => setLista('formacao', i, 'instituicao', e.target.value)} placeholder="Instituição" aria-label="Instituição" />
                      <input value={x.periodo} onChange={(e) => setLista('formacao', i, 'periodo', e.target.value)} placeholder="Período" aria-label="Período" />
                    </div>
                    <button className="icon-btn cvg-del" onClick={() => delItem('formacao', i)} aria-label="Remover">× remover</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addItem('formacao', { curso: '', instituicao: '', periodo: '' })}>+ Adicionar formação</button>
              </Secao>

              <Secao titulo="Habilidades" dica={DICAS.habilidades}>
                <TagsInput valores={cv.habilidades} onChange={(l) => setCv((c) => ({ ...c, habilidades: l }))} placeholder="Digite e tecle Enter (ex.: Excel)" />
              </Secao>

              <Secao titulo="Idiomas" dica={DICAS.idiomas}>
                {cv.idiomas.map((x, i) => (
                  <div className="cvg-item cvg-inline" key={i}>
                    <input value={x.idioma} onChange={(e) => setLista('idiomas', i, 'idioma', e.target.value)} placeholder="Idioma" aria-label="Idioma" />
                    <input value={x.nivel} onChange={(e) => setLista('idiomas', i, 'nivel', e.target.value)} placeholder="Nível" aria-label="Nível" />
                    <button className="icon-btn" onClick={() => delItem('idiomas', i)} aria-label="Remover">×</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addItem('idiomas', { idioma: '', nivel: '' })}>+ Adicionar idioma</button>
              </Secao>

              <Secao titulo="Cursos e certificações" dica={DICAS.cursos}>
                {cv.cursos.map((x, i) => (
                  <div className="cvg-item" key={i}>
                    <div className="cvg-grid2">
                      <input value={x.nome} onChange={(e) => setLista('cursos', i, 'nome', e.target.value)} placeholder="Curso / certificação" aria-label="Curso" />
                      <input value={x.instituicao} onChange={(e) => setLista('cursos', i, 'instituicao', e.target.value)} placeholder="Instituição" aria-label="Instituição" />
                      <input value={x.ano} onChange={(e) => setLista('cursos', i, 'ano', e.target.value)} placeholder="Ano" aria-label="Ano" />
                    </div>
                    <button className="icon-btn cvg-del" onClick={() => delItem('cursos', i)} aria-label="Remover">× remover</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addItem('cursos', { nome: '', instituicao: '', ano: '' })}>+ Adicionar curso</button>
              </Secao>

              <div className="cvg-utils">
                <button className="btn btn-ghost btn-sm" onClick={salvarJson}>Salvar dados (JSON)</button>
                <label className="btn btn-ghost btn-sm">Carregar dados<input type="file" accept="application/json" hidden onChange={carregarJson} /></label>
                <button className="btn btn-ghost btn-sm" onClick={restaurar}>Restaurar exemplo</button>
                <button className="btn btn-ghost btn-sm" onClick={limpar}>Limpar tudo</button>
              </div>
              {msg && <Notice kind="success">{msg}</Notice>}
            </div>
          )}

          {aba === 'modelo' && (
            <div className="cvg-form">
              <h3 className="cvg-h3">Escolha um modelo</h3>
              <div className="cvg-modelos">
                {MODELOS.map((m) => (
                  <button key={m.id} className={'cvg-modelo' + (m.id === tplId ? ' sel' : '')} onClick={() => escolherModelo(m)}>
                    <span className="cvg-modelo-top" style={{ background: m.accent }} />
                    <b>{m.nome}{m.ats && <span className="cvg-ats">ATS</span>}</b>
                    <small>{m.desc}</small>
                  </button>
                ))}
              </div>
              <h3 className="cvg-h3">Cor de destaque</h3>
              <div className="cvg-cores">
                {CORES.map((c) => <button key={c} className={'cvg-cor' + (c === accent ? ' sel' : '')} style={{ background: c }} onClick={() => setAccent(c)} aria-label={'Cor ' + c} />)}
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Cor personalizada" />
              </div>
              <Notice kind="info">Dica: para vagas com triagem automática (ATS), prefira o modelo <b>Clássico</b> e baixe em <b>Word</b>. Modelos com barra lateral são ótimos para enviar direto a pessoas.</Notice>
            </div>
          )}

          {aba === 'ia' && <PainelIA cv={cv} />}
        </div>

        {/* ------- prévia ------- */}
        <div className="cvg-right">
          <div className="cvg-acoes cvg-sem-impressao">
            <button className="btn btn-primary" onClick={baixarPdf}>⬇ Baixar PDF</button>
            <button className="btn btn-ghost" onClick={baixarDocx}>⬇ Baixar Word (.docx)</button>
          </div>
          <div className="cvg-preview-wrap">
            <Preview ref={previewRef} cv={cv} tpl={tpl} accent={accent} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- campos ---------- */
function Campo({ id, label, value, onChange, dica, textarea }) {
  return (
    <Field label={label} hint={dica} className="cvg-field">
      {textarea ? <textarea id={id} value={value} onChange={onChange} rows={4} /> : <input id={id} value={value} onChange={onChange} />}
    </Field>
  )
}
function Secao({ titulo, dica, children }) {
  return (
    <div className="cvg-secao">
      <h3 className="cvg-h3">{titulo}</h3>
      {dica && <small className="cvg-dica">{dica}</small>}
      {children}
    </div>
  )
}
function TagsInput({ valores, onChange, placeholder }) {
  const [t, setT] = useState('')
  const add = () => { const v = t.trim(); if (v && !valores.includes(v)) onChange([...valores, v]); setT('') }
  return (
    <div>
      <div className="cvg-tags">
        {valores.map((v, i) => <span className="cvg-tag" key={i}>{v}<button onClick={() => onChange(valores.filter((_, j) => j !== i))} aria-label={'Remover ' + v}>×</button></span>)}
      </div>
      <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} placeholder={placeholder} />
    </div>
  )
}

/* ---------- painel de IA ---------- */
function PainelIA({ cv }) {
  const [copiado, setCopiado] = useState('')
  const base = `Dados atuais do currículo:\n- Cargo desejado: ${cv.cargo || '(não informado)'}\n- Resumo: ${cv.resumo || '(vazio)'}\n- Experiências: ${cv.experiencias.map((e) => `${e.cargo} (${e.empresa})`).join('; ') || '(nenhuma)'}\n- Habilidades: ${cv.habilidades.join(', ') || '(nenhuma)'}`
  const prompts = [
    ['Escrever meu resumo profissional', `Você é um especialista em recrutamento. Escreva um resumo profissional de 3 a 4 linhas para um currículo, em português do Brasil, em tom objetivo e na primeira pessoa, para quem busca a vaga de "${cv.cargo || 'minha área'}". Destaque pontos fortes e o objetivo, sem clichês como "proativo e dinâmico".\n\n${base}`],
    ['Melhorar as descrições de experiência', `Reescreva as descrições de experiência do meu currículo com verbos de ação e, quando possível, com resultados mensuráveis (quanto, quantos, em quanto tempo). Mantenha a verdade dos fatos, não invente. Devolva em tópicos curtos.\n\n${base}`],
    ['Adaptar o currículo para uma vaga', `Vou colar uma descrição de vaga. Compare com o meu currículo abaixo e me diga: (1) quais palavras-chave da vaga eu deveria incluir, (2) o que reforçar, (3) um resumo profissional sob medida para essa vaga. Depois peça a descrição da vaga.\n\n${base}`],
    ['Sugerir habilidades para o meu objetivo', `Liste de 8 a 12 habilidades (técnicas e comportamentais) relevantes para a vaga de "${cv.cargo || 'minha área'}", separando as duas categorias, adequadas a quem está começando. Marque quais costumam ser exigidas e quais são diferenciais.`],
    ['Simular uma entrevista', `Aja como entrevistador(a) para a vaga de "${cv.cargo || 'minha área'}". Faça 5 perguntas, uma de cada vez, espere minha resposta e dê um retorno curto em cada uma, com uma dica de como melhorar. Baseie-se no meu currículo.\n\n${base}`],
    ['Escrever uma carta de apresentação', `Escreva uma carta de apresentação curta (um parágrafo de abertura, um do porquê eu sirvo para a vaga e um de encerramento) para a vaga de "${cv.cargo || 'minha área'}", em português do Brasil, tom profissional e caloroso.\n\n${base}`],
  ]
  const copiar = async (texto, titulo) => { try { await navigator.clipboard.writeText(texto); setCopiado(titulo); setTimeout(() => setCopiado(''), 1800) } catch {} ; track('cvgen_prompt', { prompt: titulo }) }
  const abrir = (dest, texto) => {
    const u = dest === 'chatgpt' ? 'https://chatgpt.com/?q=' + encodeURIComponent(texto) : dest === 'claude' ? 'https://claude.ai/new?q=' + encodeURIComponent(texto) : 'https://gemini.google.com/app'
    window.open(u, '_blank', 'noopener')
    track('cvgen_ia_abrir', { dest })
  }
  return (
    <div className="cvg-form">
      <Notice kind="info">A IA ajuda a <b>escrever melhor</b> o que é seu — não invente experiências. Cada botão monta um prompt já com seus dados. Copie e cole, ou abra direto no assistente. Sempre revise o resultado.</Notice>
      {prompts.map(([titulo, texto]) => (
        <div className="cvg-prompt" key={titulo}>
          <b>{titulo}</b>
          <pre>{texto}</pre>
          <div className="cvg-prompt-acoes">
            <button className="btn btn-primary btn-sm" onClick={() => copiar(texto, titulo)}>{copiado === titulo ? 'Copiado!' : 'Copiar prompt'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => abrir('chatgpt', texto)}>Abrir no ChatGPT</button>
            <button className="btn btn-ghost btn-sm" onClick={() => abrir('claude', texto)}>Claude</button>
            <button className="btn btn-ghost btn-sm" onClick={() => abrir('gemini', texto)}>Gemini</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------- prévia do currículo ---------- */
const Preview = forwardRef(function Preview({ cv, tpl, accent }, ref) {
    const contatos = [cv.email, cv.telefone, cv.cidade, cv.linkedin, cv.site].filter(Boolean)
    const Header = (
      <div className="cv-header">
        {cv.foto && <img className="cv-foto" src={cv.foto} alt="" />}
        <div>
          <h1>{cv.nome || 'Seu Nome'}</h1>
          {cv.cargo && <p className="cv-cargo">{cv.cargo}</p>}
        </div>
      </div>
    )
    const Exp = cv.experiencias.length > 0 && (
      <section><h2>Experiência</h2>{cv.experiencias.map((x, i) => (
        <div className="cv-entry" key={i}>
          <div className="cv-entry-top"><b>{x.cargo || 'Cargo'}{x.empresa && <span className="cv-sub"> — {x.empresa}</span>}</b><span className="cv-per">{[x.periodo, x.local].filter(Boolean).join(' · ')}</span></div>
          {x.desc && <ul>{x.desc.split('\n').filter(Boolean).map((d, j) => <li key={j}>{d}</li>)}</ul>}
        </div>))}</section>
    )
    const Form = cv.formacao.length > 0 && (
      <section><h2>Formação</h2>{cv.formacao.map((x, i) => (
        <div className="cv-entry" key={i}><div className="cv-entry-top"><b>{x.curso || 'Curso'}</b><span className="cv-per">{x.periodo}</span></div>{x.instituicao && <p className="cv-sub">{x.instituicao}</p>}</div>))}</section>
    )
    const Cursos = cv.cursos.length > 0 && (
      <section><h2>Cursos e certificações</h2>{cv.cursos.map((x, i) => (
        <div className="cv-entry" key={i}><div className="cv-entry-top"><b>{x.nome || 'Curso'}</b><span className="cv-per">{x.ano}</span></div>{x.instituicao && <p className="cv-sub">{x.instituicao}</p>}</div>))}</section>
    )
    const Resumo = cv.resumo && <section><h2>Resumo</h2><p>{cv.resumo}</p></section>
    const Hab = cv.habilidades.length > 0 && <section><h2>Habilidades</h2><div className="cv-tags">{cv.habilidades.map((h, i) => <span key={i}>{h}</span>)}</div></section>
    const Idi = cv.idiomas.length > 0 && <section><h2>Idiomas</h2><ul className="cv-idiomas">{cv.idiomas.map((x, i) => <li key={i}><b>{x.idioma}</b>{x.nivel && ' — ' + x.nivel}</li>)}</ul></section>
    const Contatos = contatos.length > 0 && <section className="cv-contatos"><h2>Contato</h2><ul>{contatos.map((c, i) => <li key={i}>{c}</li>)}</ul></section>

    if (tpl.layout === 'sidebar') {
      return (
        <div className={`cv-page cv-tpl-${tpl.id} cv-sidebar`} style={{ '--cv-accent': accent }} ref={ref}>
          <aside className="cv-aside">
            {cv.foto && <img className="cv-foto" src={cv.foto} alt="" />}
            {Contatos}{Hab}{Idi}
          </aside>
          <main className="cv-main">
            <div className="cv-head-side"><h1>{cv.nome || 'Seu Nome'}</h1>{cv.cargo && <p className="cv-cargo">{cv.cargo}</p>}</div>
            {Resumo}{Exp}{Form}{Cursos}
          </main>
        </div>
      )
    }
    return (
      <div className={`cv-page cv-tpl-${tpl.id}`} style={{ '--cv-accent': accent }} ref={ref}>
        {Header}
        {contatos.length > 0 && <p className="cv-contato-linha">{contatos.join('  ·  ')}</p>}
        {Resumo}{Exp}{Form}{Hab}{Cursos}{Idi}
      </div>
    )
  })

/* ---------- estilos (namespace .cvgen e .cv-page) ---------- */
const CSS = `
.cvgen{margin-top:14px}
.cvgen .btn-sm{padding:6px 10px;font-size:13px}
.cvgen .cvg-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;margin-top:14px}
@media(max-width:900px){.cvgen .cvg-layout{grid-template-columns:minmax(0,1fr)}}
.cvgen .cvg-form{display:flex;flex-direction:column;gap:12px}
.cvgen .cvg-field textarea,.cvgen input,.cvgen textarea,.cvgen select{width:100%;padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.cvgen textarea{resize:vertical}
.cvgen .cvg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:520px){.cvgen .cvg-grid2{grid-template-columns:1fr}}
.cvgen .cvg-dica{display:block;color:var(--muted);font-size:12px;line-height:1.4;margin:2px 0 6px}
.cvgen .cvg-foto-row{display:flex;gap:12px;align-items:center}
.cvgen .cvg-foto-mini{width:66px;height:66px;border-radius:50%;object-fit:cover;border:2px solid var(--line-strong);background:var(--panel-2)}
.cvgen .cvg-foto-row label{margin-right:6px}
.cvgen .cvg-secao{border-top:1px solid var(--line);padding-top:12px}
.cvgen .cvg-h3{font-size:16px;margin:0 0 2px}
.cvgen .cvg-item{border:1px solid var(--line);border-radius:var(--radius);padding:10px;margin:8px 0;display:flex;flex-direction:column;gap:8px}
.cvgen .cvg-inline{flex-direction:row;align-items:center}
.cvgen .cvg-del{align-self:flex-start;color:var(--red);background:none;border:none;cursor:pointer;font-size:12px;padding:0}
.cvgen .icon-btn{width:34px;height:34px;flex:0 0 auto;border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:var(--radius);cursor:pointer}
.cvgen .cvg-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
.cvgen .cvg-tag{display:inline-flex;align-items:center;gap:6px;background:var(--panel-2);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:13px}
.cvgen .cvg-tag button{background:none;border:none;color:var(--muted);cursor:pointer;font-size:15px;line-height:1}
.cvgen .cvg-utils{display:flex;flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:12px}
.cvgen .cvg-modelos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.cvgen .cvg-modelo{text-align:left;display:flex;flex-direction:column;gap:4px;padding:10px;border:1px solid var(--line-strong);border-radius:var(--radius-lg);background:var(--panel);cursor:pointer}
.cvgen .cvg-modelo.sel{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset}
.cvgen .cvg-modelo-top{height:10px;border-radius:999px}
.cvgen .cvg-modelo small{color:var(--muted);font-size:12px}
.cvgen .cvg-ats{font-size:10px;background:var(--green);color:#fff;border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle}
.cvgen .cvg-cores{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cvgen .cvg-cor{width:30px;height:30px;border-radius:50%;border:2px solid var(--line-strong);cursor:pointer}
.cvgen .cvg-cor.sel{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text)}
.cvgen .cvg-cores input[type=color]{width:40px;height:34px;padding:2px}
.cvgen .cvg-prompt{border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:8px}
.cvgen .cvg-prompt pre{white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono);font-size:12px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius);padding:10px;margin:0;max-height:150px;overflow:auto}
.cvgen .cvg-prompt-acoes{display:flex;flex-wrap:wrap;gap:8px}

.cvgen .cvg-right{position:relative}
.cvgen .cvg-acoes{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.cvgen .cvg-preview-wrap{overflow:auto;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px;display:flex;justify-content:center}

/* página A4 */
.cv-page{width:210mm;min-height:297mm;background:#fff;color:#1f2430;padding:18mm 16mm;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:var(--font-sans);font-size:11.2pt;line-height:1.5;transform-origin:top center}
@media(max-width:1200px){.cv-page{transform:scale(.86)}}
@media(max-width:1000px){.cv-page{transform:scale(.62)}}
@media(max-width:520px){.cv-page{transform:scale(.42)}}
.cvgen-print .cv-page,.cv-page{--cv-accent:#1f5c45}
.cv-page h1{font-size:22pt;line-height:1.1;color:#1f2430;margin:0}
.cv-page h2{font-size:12pt;text-transform:uppercase;letter-spacing:.06em;color:var(--cv-accent);border-bottom:2px solid var(--cv-accent);padding-bottom:3px;margin:16px 0 8px}
.cv-page section{margin-bottom:4px}
.cv-page p{margin:0}
.cv-page ul{margin:4px 0 0;padding-left:18px}
.cv-page li{margin-bottom:2px}
.cv-cargo{font-weight:600;color:var(--cv-accent);font-size:12.5pt;margin-top:2px}
.cv-header{display:flex;gap:16px;align-items:center}
.cv-foto{width:96px;height:96px;border-radius:50%;object-fit:cover;flex:none}
.cv-contato-linha{color:#51586a;font-size:10pt;margin-top:8px;border-bottom:1px solid #e3e3e3;padding-bottom:10px}
.cv-entry{margin-bottom:9px}
.cv-entry-top{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.cv-per{color:#6b7280;font-size:9.5pt;white-space:nowrap}
.cv-sub{color:#6b7280;font-weight:400}
.cv-tags{display:flex;flex-wrap:wrap;gap:6px}
.cv-tags span{background:#f0f1f4;border-radius:4px;padding:2px 9px;font-size:9.8pt}
.cv-idiomas{list-style:none;padding:0;margin:0}
.cv-idiomas li{margin-bottom:2px}

/* sidebar */
.cv-sidebar{display:grid;grid-template-columns:62mm 1fr;gap:0;padding:0;overflow:hidden}
.cv-sidebar .cv-aside{background:var(--cv-accent);color:#fff;padding:16mm 10mm}
.cv-sidebar .cv-aside .cv-foto{width:100px;height:100px;border:3px solid rgba(255,255,255,.5);margin:0 auto 14px;display:block}
.cv-sidebar .cv-aside h2{color:#fff;border-bottom-color:rgba(255,255,255,.45)}
.cv-sidebar .cv-aside .cv-tags span{background:rgba(255,255,255,.18);color:#fff}
.cv-sidebar .cv-aside section{word-break:break-word}
.cv-sidebar .cv-aside ul{list-style:none;padding:0;font-size:10pt}
.cv-sidebar .cv-main{padding:16mm 12mm}
.cv-head-side h1{font-size:21pt}
.cv-tpl-minimalista h2{border-bottom:none;color:#1f2430;border-left:3px solid var(--cv-accent);padding-left:8px}
.cv-tpl-criativo h1{color:var(--cv-accent)}
.cv-tpl-compacto{font-size:10.4pt}
.cv-tpl-compacto h2{margin:10px 0 5px}

@media print{.cvg-sem-impressao{display:none}}
`
