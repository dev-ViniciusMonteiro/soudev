'use client'

// Gerador de currículo didático: escolha a ÁREA da vaga e o formulário vem com o essencial do ramo
// meio preenchido, com dica em cada campo. Vários modelos (com recomendados por área), prévia ao vivo
// que se ajusta à tela, download em PDF (impressão) e Word (.docx, bom para ATS) e atalhos de IA.

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'
import { Field, Notice, Tabs } from '../ui'
import { AREAS, CORES, DICAS, MODELOS, getArea, montarExemplo } from '@/lib/curriculo-modelos'

const CHAVE = 'soudev-curriculo-v2'
const useIsoEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function GeradorCurriculo() {
  const [areaId, setAreaId] = useState('geral')
  const [cv, setCv] = useState(() => montarExemplo('geral'))
  const [tplId, setTplId] = useState('classico')
  const [accent, setAccent] = useState(MODELOS[0].accent)
  const [aba, setAba] = useState('conteudo')
  const [msg, setMsg] = useState('')
  const previewRef = useRef(null)
  const tpl = MODELOS.find((m) => m.id === tplId) || MODELOS[0]
  const area = getArea(areaId)

  /* restaura/salva no navegador (conveniência) */
  useEffect(() => {
    try {
      const s = localStorage.getItem(CHAVE)
      if (s) {
        const d = JSON.parse(s)
        if (d?.cv?.nome !== undefined) {
          setCv({ ...montarExemplo(d.areaId || 'geral'), ...d.cv })
          if (d.areaId) setAreaId(d.areaId)
          if (d.tplId) setTplId(d.tplId)
          if (d.accent) setAccent(d.accent)
        }
      }
    } catch {}
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify({ cv, areaId, tplId, accent })) } catch {} }, 500)
    return () => clearTimeout(t)
  }, [cv, areaId, tplId, accent])

  const set = (k) => (e) => setCv((c) => ({ ...c, [k]: e.target.value }))
  const setLista = (campo, i, k, v) => setCv((c) => ({ ...c, [campo]: c[campo].map((it, j) => (j === i ? { ...it, [k]: v } : it)) }))
  const addItem = (campo, modelo) => setCv((c) => ({ ...c, [campo]: [...c[campo], modelo] }))
  const delItem = (campo, i) => setCv((c) => ({ ...c, [campo]: c[campo].filter((_, j) => j !== i) }))

  const aplicarArea = (id) => {
    const a = getArea(id)
    setAreaId(id)
    setCv((c) => ({ ...c, ...a.exemplo })) // mantém nome/foto/contato, troca o conteúdo do ramo
    const rec = MODELOS.find((m) => m.id === a.recomendados[0])
    if (rec) { setTplId(rec.id); setAccent(rec.accent) }
    track('cvgen_area', { area: id })
  }
  const escolherModelo = (m) => { setTplId(m.id); setAccent(m.accent) }

  const trocarFoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader(); r.onload = () => setCv((c) => ({ ...c, foto: r.result })); r.readAsDataURL(file)
  }
  const restaurar = () => { setCv(montarExemplo(areaId)); setMsg('Exemplo da área restaurado.') }
  const limpar = () => setCv({ foto: '', nome: '', cargo: '', email: '', telefone: '', cidade: '', linkedin: '', site: '', resumo: '', experiencias: [], formacao: [], habilidades: [], idiomas: [], cursos: [] })

  const salvarJson = () => { downloadBlob(new Blob([JSON.stringify({ cv, areaId, tplId, accent }, null, 2)], { type: 'application/json' }), 'meu-curriculo.json'); track('cvgen_salvar') }
  const carregarJson = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result); const dados = d.cv || d; setCv({ ...montarExemplo(d.areaId || areaId), ...dados }); if (d.areaId) setAreaId(d.areaId); if (d.tplId) setTplId(d.tplId); if (d.accent) setAccent(d.accent); setMsg('Currículo carregado.') } catch { setMsg('Arquivo inválido.') } }
    r.readAsText(file); e.target.value = ''
  }

  const baixarPdf = () => {
    const node = previewRef.current; if (!node) return
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${(cv.nome || 'curriculo').replace(/\s+/g, '-')}</title><style>${CSS}\n@page{size:A4;margin:0}html,body{margin:0;background:#fff}.cvgen-print .cv-page{box-shadow:none;margin:0}</style></head><body class="cvgen cvgen-print">${node.outerHTML}</body></html>`
    const frame = document.createElement('iframe')
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(frame)
    const doc = frame.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    const go = () => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 1000) }
    if (doc.readyState === 'complete') setTimeout(go, 350); else frame.onload = () => setTimeout(go, 350)
    track('cvgen_pdf', { modelo: tplId })
  }

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

  const modelosOrdenados = [...MODELOS].sort((a, b) => (area.recomendados.includes(b.id) ? 1 : 0) - (area.recomendados.includes(a.id) ? 1 : 0))

  return (
    <div className="cvgen">
      <style>{CSS}</style>

      <Notice kind="info">
        Monte seu currículo grátis. <b>Escolha a área da vaga</b> e o formulário já vem com o essencial do ramo para você trocar pelos seus
        dados — cada campo tem uma dica. Baixe em <b>PDF</b> (visual) ou <b>Word</b> (melhor para triagem automática). Nada é enviado a servidores.
      </Notice>

      {/* seletor de área */}
      <div className="cvg-area">
        <label className="cvg-area-sel">
          <span>Para qual área é a vaga?</span>
          <select value={areaId} onChange={(e) => aplicarArea(e.target.value)}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.icone} {a.nome}</option>)}
          </select>
        </label>
        <p className="cvg-area-dica">💡 {area.dica}</p>
        <div className="cvg-rec">
          <span className="cvg-rec-lbl">Modelos recomendados:</span>
          {area.recomendados.map((id) => {
            const m = MODELOS.find((x) => x.id === id); if (!m) return null
            return <button key={id} className={'cvg-rec-chip' + (id === tplId ? ' sel' : '')} onClick={() => escolherModelo(m)}>{m.nome}</button>
          })}
        </div>
      </div>

      <Tabs value={aba} onChange={setAba} tabs={[['conteudo', 'Conteúdo'], ['modelo', 'Modelo e cores'], ['ia', 'Melhorar com IA']]} />

      <div className="cvg-layout">
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
                <Campo id="linkedin" label="LinkedIn (opcional)" value={cv.linkedin} onChange={set('linkedin')} dica={DICAS.linkedin} />
                <Campo id="site" label="Portfólio / site (opcional)" value={cv.site} onChange={set('site')} dica={DICAS.site} />
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
                    <button className="cvg-del" onClick={() => delItem('experiencias', i)}>× remover</button>
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
                    <button className="cvg-del" onClick={() => delItem('formacao', i)}>× remover</button>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addItem('formacao', { curso: '', instituicao: '', periodo: '' })}>+ Adicionar formação</button>
              </Secao>

              <Secao titulo="Habilidades" dica={DICAS.habilidades}>
                <TagsInput valores={cv.habilidades} onChange={(l) => setCv((c) => ({ ...c, habilidades: l }))} placeholder="Digite e tecle Enter (ex.: Pontualidade)" />
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
                    <button className="cvg-del" onClick={() => delItem('cursos', i)}>× remover</button>
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
                {modelosOrdenados.map((m) => (
                  <button key={m.id} className={'cvg-modelo' + (m.id === tplId ? ' sel' : '')} onClick={() => escolherModelo(m)}>
                    <span className="cvg-modelo-top" style={{ background: m.accent }} />
                    <b>{m.nome}
                      {area.recomendados.includes(m.id) && <span className="cvg-badge rec">Recomendado</span>}
                      {m.ats && <span className="cvg-badge ats">ATS</span>}
                    </b>
                    <small>{m.desc}</small>
                  </button>
                ))}
              </div>
              <h3 className="cvg-h3">Cor de destaque</h3>
              <div className="cvg-cores">
                {CORES.map((c) => <button key={c} className={'cvg-cor' + (c === accent ? ' sel' : '')} style={{ background: c }} onClick={() => setAccent(c)} aria-label={'Cor ' + c} />)}
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} aria-label="Cor personalizada" />
              </div>
              <Notice kind="info">Para vagas com triagem automática (ATS), prefira o modelo <b>Clássico</b> e baixe em <b>Word</b>. Modelos com cor e barra lateral ficam ótimos para enviar direto a uma pessoa.</Notice>
            </div>
          )}

          {aba === 'ia' && <PainelIA cv={cv} />}
        </div>

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
    window.open(u, '_blank', 'noopener'); track('cvgen_ia_abrir', { dest })
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

/* ---------- prévia (escala para caber na tela) ---------- */
const Preview = forwardRef(function Preview({ cv, tpl, accent }, ref) {
  const stageRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [box, setBox] = useState({ h: 0, left: 0 })
  useIsoEffect(() => {
    const stage = stageRef.current, page = ref?.current
    if (!stage || !page) return
    const medir = () => {
      const pw = page.offsetWidth || 794
      const s = Math.min(1, stage.clientWidth / pw)
      setScale(s)
      setBox({ h: page.offsetHeight * s, left: Math.max(0, (stage.clientWidth - pw * s) / 2) })
    }
    medir()
    const ro = new ResizeObserver(medir); ro.observe(stage)
    return () => ro.disconnect()
  }, [cv, tpl, accent, ref])

  const contatos = [cv.email, cv.telefone, cv.cidade, cv.linkedin, cv.site].filter(Boolean)
  const Resumo = cv.resumo && <section><h2>Resumo</h2><p>{cv.resumo}</p></section>
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
  const Hab = cv.habilidades.length > 0 && <section><h2>Habilidades</h2><div className="cv-tags">{cv.habilidades.map((h, i) => <span key={i}>{h}</span>)}</div></section>
  const Idi = cv.idiomas.length > 0 && <section><h2>Idiomas</h2><ul className="cv-idiomas">{cv.idiomas.map((x, i) => <li key={i}><b>{x.idioma}</b>{x.nivel && ' — ' + x.nivel}</li>)}</ul></section>
  const Contatos = contatos.length > 0 && <section className="cv-contatos"><h2>Contato</h2><ul>{contatos.map((c, i) => <li key={i}>{c}</li>)}</ul></section>
  const nome = cv.nome || 'Seu Nome'
  const cls = `cv-page cv-tpl-${tpl.id} cv-${tpl.layout}${tpl.serif ? ' cv-serif' : ''}`

  let page
  if (tpl.layout === 'sidebar' || tpl.layout === 'sidebarR') {
    const aside = <aside className="cv-aside">{cv.foto && <img className="cv-foto" src={cv.foto} alt="" />}{Contatos}{Hab}{Idi}</aside>
    const main = <main className="cv-main"><div className="cv-head-side"><h1>{nome}</h1>{cv.cargo && <p className="cv-cargo">{cv.cargo}</p>}</div>{Resumo}{Exp}{Form}{Cursos}</main>
    page = <div className={cls} style={{ '--cv-accent': accent }} ref={ref}>{tpl.layout === 'sidebarR' ? <>{main}{aside}</> : <>{aside}{main}</>}</div>
  } else if (tpl.layout === 'band') {
    page = (
      <div className={cls} style={{ '--cv-accent': accent }} ref={ref}>
        <div className="cv-bandtop">
          {cv.foto && <img className="cv-foto" src={cv.foto} alt="" />}
          <div><h1>{nome}</h1>{cv.cargo && <p className="cv-cargo">{cv.cargo}</p>}{contatos.length > 0 && <p className="cv-bandcontato">{contatos.join('  ·  ')}</p>}</div>
        </div>
        <div className="cv-bandbody">{Resumo}{Exp}{Form}{Hab}{Cursos}{Idi}</div>
      </div>
    )
  } else {
    page = (
      <div className={cls} style={{ '--cv-accent': accent }} ref={ref}>
        <div className="cv-header">{cv.foto && <img className="cv-foto" src={cv.foto} alt="" />}<div><h1>{nome}</h1>{cv.cargo && <p className="cv-cargo">{cv.cargo}</p>}</div></div>
        {contatos.length > 0 && <p className="cv-contato-linha">{contatos.join('  ·  ')}</p>}
        {Resumo}{Exp}{Form}{Hab}{Cursos}{Idi}
      </div>
    )
  }

  return (
    <div className="cv-stage" ref={stageRef} style={{ height: box.h ? box.h + 'px' : undefined }}>
      <div className="cv-scaler" style={{ transform: `scale(${scale})`, left: box.left + 'px' }}>{page}</div>
    </div>
  )
})

/* ---------- estilos (namespace .cvgen e .cv-page) ---------- */
const CSS = `
.cvgen{margin-top:14px}
.cvgen .btn-sm{padding:6px 10px;font-size:13px}
.cvgen .cvg-area{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px 14px;margin:14px 0}
.cvgen .cvg-area-sel{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-weight:600}
.cvgen .cvg-area-sel select{flex:1;min-width:200px;padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.cvgen .cvg-area-dica{color:var(--muted);font-size:13px;margin:8px 0}
.cvgen .cvg-rec{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cvgen .cvg-rec-lbl{font-size:12px;color:var(--muted)}
.cvgen .cvg-rec-chip{border:1px solid var(--line-strong);background:var(--bg-2);color:var(--text);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}
.cvgen .cvg-rec-chip.sel{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
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
.cvgen .cvg-badge{font-size:10px;border-radius:4px;padding:1px 5px;margin-left:6px;vertical-align:middle;color:#fff}
.cvgen .cvg-badge.ats{background:var(--green)}
.cvgen .cvg-badge.rec{background:var(--accent);color:var(--on-accent)}
.cvgen .cvg-cores{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cvgen .cvg-cor{width:30px;height:30px;border-radius:50%;border:2px solid var(--line-strong);cursor:pointer}
.cvgen .cvg-cor.sel{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--text)}
.cvgen .cvg-cores input[type=color]{width:40px;height:34px;padding:2px}
.cvgen .cvg-prompt{border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px;display:flex;flex-direction:column;gap:8px}
.cvgen .cvg-prompt pre{white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono);font-size:12px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--radius);padding:10px;margin:0;max-height:150px;overflow:auto}
.cvgen .cvg-prompt-acoes{display:flex;flex-wrap:wrap;gap:8px}
.cvgen .cvg-acoes{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.cvgen .cvg-preview-wrap{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px;overflow:hidden}

/* escala responsiva da folha */
.cv-stage{position:relative;width:100%;overflow:hidden}
.cv-scaler{position:absolute;top:0;left:0;transform-origin:top left}

/* folha A4 */
.cv-page{width:210mm;min-height:297mm;background:#fff;color:#1f2430;font-family:var(--font-sans);font-size:11.2pt;line-height:1.5;box-shadow:0 8px 30px rgba(0,0,0,.25)}
.cv-page,.cvgen-print .cv-page{--cv-accent:#1f5c45}
.cv-single,.cv-page.cv-single{padding:18mm 16mm}
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

/* layouts com barra lateral */
.cv-sidebar,.cv-sidebarR{display:grid;overflow:hidden}
.cv-sidebar{grid-template-columns:62mm 1fr}
.cv-sidebarR{grid-template-columns:1fr 62mm}
.cv-aside{background:var(--cv-accent);color:#fff;padding:16mm 10mm;word-break:break-word}
.cv-aside .cv-foto{width:100px;height:100px;border:3px solid rgba(255,255,255,.5);margin:0 auto 14px;display:block}
.cv-aside h2{color:#fff;border-bottom-color:rgba(255,255,255,.45)}
.cv-aside .cv-tags span{background:rgba(255,255,255,.18);color:#fff}
.cv-aside ul{list-style:none;padding:0;font-size:10pt;word-break:break-word}
.cv-main{padding:16mm 12mm}
.cv-head-side h1{font-size:21pt}

/* layout com faixa no topo */
.cv-band{padding:0;overflow:hidden}
.cv-bandtop{background:var(--cv-accent);color:#fff;padding:15mm 16mm 12mm;display:flex;gap:16px;align-items:center}
.cv-bandtop .cv-foto{border:3px solid rgba(255,255,255,.6)}
.cv-bandtop h1{color:#fff}
.cv-bandtop .cv-cargo{color:rgba(255,255,255,.92)}
.cv-bandcontato{color:rgba(255,255,255,.85);font-size:10pt;margin-top:6px}
.cv-bandbody{padding:12mm 16mm 16mm}

/* variações por modelo */
.cv-serif,.cv-serif h1,.cv-serif h2{font-family:var(--font-serif)}
.cv-tpl-minimalista h2{border-bottom:none;color:#1f2430;border-left:3px solid var(--cv-accent);padding-left:8px}
.cv-tpl-criativo h1{letter-spacing:-.5px}
.cv-tpl-compacto{font-size:10.4pt}
.cv-tpl-compacto h2{margin:10px 0 5px}
.cv-tpl-tradicional .cv-bandtop{padding-block:11mm 9mm}

@media print{.cvg-sem-impressao{display:none}}
`
