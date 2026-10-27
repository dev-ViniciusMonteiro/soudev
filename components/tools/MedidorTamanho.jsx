'use client'

// Medidor de tamanho na foto: a pessoa marca uma referência de tamanho conhecido (moeda, cartão, A4)
// e depois mede o objeto. O cálculo é pela proporção de pixels, tudo no navegador. Pontos ficam em
// coordenadas da imagem original (sobrevivem a redimensionamento da tela).

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { FileDrop, Notice } from '../ui'

const REFS = [
  { id: 'moeda-1', nome: 'Moeda de R$ 1,00 (27 mm)', mm: 27, dica: 'Arraste de uma borda à outra da moeda (o diâmetro).' },
  { id: 'moeda-50', nome: 'Moeda de 50 centavos (23 mm)', mm: 23, dica: 'Arraste pelo diâmetro da moeda.' },
  { id: 'moeda-25', nome: 'Moeda de 25 centavos (25 mm)', mm: 25, dica: 'Arraste pelo diâmetro da moeda.' },
  { id: 'moeda-10', nome: 'Moeda de 10 centavos (20 mm)', mm: 20, dica: 'Arraste pelo diâmetro da moeda.' },
  { id: 'moeda-5', nome: 'Moeda de 5 centavos (22 mm)', mm: 22, dica: 'Arraste pelo diâmetro da moeda.' },
  { id: 'cartao', nome: 'Cartão de banco — lado maior (85,6 mm)', mm: 85.6, dica: 'Arraste ao longo do lado maior do cartão.' },
  { id: 'a4-maior', nome: 'Folha A4 — lado maior (297 mm)', mm: 297, dica: 'Arraste ao longo do lado maior da folha.' },
  { id: 'a4-menor', nome: 'Folha A4 — lado menor (210 mm)', mm: 210, dica: 'Arraste ao longo do lado menor da folha.' },
  { id: 'custom', nome: 'Personalizado…', mm: null, dica: 'Informe o tamanho real e arraste sobre ele.' },
]

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

function formatar(mm, unidade) {
  if (!isFinite(mm)) return '—'
  if (unidade === 'cm') return (mm / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' cm'
  if (unidade === 'pol') return (mm / 25.4).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' pol'
  return mm.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mm'
}

export default function MedidorTamanho() {
  const [img, setImg] = useState(null) // HTMLImageElement
  const [refId, setRefId] = useState('moeda-1')
  const [refMmCustom, setRefMmCustom] = useState('50')
  const [unidade, setUnidade] = useState('cm')
  const [modo, setModo] = useState('ref') // ref | obj
  const [refSeg, setRefSeg] = useState(null) // {a,b} em coords da imagem
  const [objs, setObjs] = useState([]) // [{a,b}]
  const [temp, setTemp] = useState(null) // segmento em desenho

  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const dispW = useRef(0) // largura de exibição atual
  const arrastando = useRef(false)

  const ref = REFS.find((r) => r.id === refId) || REFS[0]
  const refMm = ref.id === 'custom' ? Number(String(refMmCustom).replace(',', '.')) : ref.mm
  const escala = refSeg && refMm > 0 ? refMm / dist(refSeg.a, refSeg.b) : null // mm por pixel da imagem

  const carregarArquivo = (files) => {
    const file = files[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => {
      const im = new Image()
      im.onload = () => { setImg(im); setRefSeg(null); setObjs([]); setTemp(null); setModo('ref'); track('medidor_foto') }
      im.src = r.result
    }
    r.readAsDataURL(file)
  }

  // ajusta o tamanho de exibição e redesenha
  const redesenhar = () => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !img || !wrap) return
    const larg = Math.max(240, wrap.clientWidth)
    const alt = Math.round(larg * (img.naturalHeight / img.naturalWidth))
    if (canvas.width !== larg || canvas.height !== alt) { canvas.width = larg; canvas.height = alt }
    dispW.current = larg
    const r = img.naturalWidth / larg // imagem->exibição: divide por r
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, larg, alt)
    ctx.drawImage(img, 0, 0, larg, alt)
    const P = (p) => ({ x: p.x / r, y: p.y / r })
    const linha = (seg, cor, texto) => {
      if (!seg) return
      const a = P(seg.a), b = P(seg.b)
      ctx.lineWidth = 3; ctx.strokeStyle = cor; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      for (const p of [a, b]) { ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill() }
      if (texto) {
        const m = meio(a, b)
        ctx.font = '600 14px system-ui, sans-serif'
        const w = ctx.measureText(texto).width + 12
        ctx.fillStyle = 'rgba(0,0,0,.72)'
        ctx.beginPath(); ctx.roundRect(m.x - w / 2, m.y - 24, w, 20, 6); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(texto, m.x, m.y - 14)
      }
    }
    linha(refSeg, '#f5a623', refMm > 0 ? `ref: ${formatar(refMm, unidade)}` : 'referência')
    objs.forEach((s, i) => linha(s, '#1f9d55', escala ? formatar(dist(s.a, s.b) * escala, unidade) : `#${i + 1}`))
    if (temp) linha(temp, modo === 'ref' ? '#f5a623' : '#1f9d55', escala && modo === 'obj' ? formatar(dist(temp.a, temp.b) * escala, unidade) : null)
  }

  useEffect(redesenhar) // redesenha a cada render com estado novo
  useEffect(() => {
    const onResize = () => redesenhar()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line
  }, [img])

  // pointer → coords da imagem original
  const ponto = (e) => {
    const canvas = canvasRef.current, rect = canvas.getBoundingClientRect()
    const escalaCanvas = canvas.width / rect.width
    const r = img.naturalWidth / dispW.current
    const x = (e.clientX - rect.left) * escalaCanvas * r
    const y = (e.clientY - rect.top) * escalaCanvas * r
    return { x, y }
  }
  const onDown = (e) => { if (!img) return; e.currentTarget.setPointerCapture?.(e.pointerId); arrastando.current = true; const p = ponto(e); setTemp({ a: p, b: p }) }
  const onMove = (e) => { if (!arrastando.current) return; const p = ponto(e); setTemp((t) => (t ? { a: t.a, b: p } : null)) }
  const onUp = (e) => {
    if (!arrastando.current) return
    arrastando.current = false
    const p = ponto(e)
    setTemp(null)
    const seg = temp ? { a: temp.a, b: p } : null
    if (!seg || dist(seg.a, seg.b) < 10) return // clique curto demais
    if (modo === 'ref') { setRefSeg(seg); setModo('obj') }
    else setObjs((l) => [...l, seg])
  }

  return (
    <div className="md">
      <style>{CSS}</style>

      {!img ? (
        <>
          <Notice kind="info">
            Meça o tamanho de um objeto pela foto. Coloque junto dele algo de tamanho conhecido (uma <b>moeda</b>, um <b>cartão</b> ou uma <b>folha A4</b>) no mesmo plano, fotografe de frente e envie a imagem.
          </Notice>
          <FileDrop accept="image/*" onFiles={carregarArquivo} label="Enviar foto" hint="Use a câmera ou escolha uma imagem. Nada é enviado para servidores." />
        </>
      ) : (
        <>
          <div className="md-controls">
            <label className="md-campo">Referência
              <select value={refId} onChange={(e) => { setRefId(e.target.value); setRefSeg(null); setModo('ref') }}>
                {REFS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </label>
            {ref.id === 'custom' && (
              <label className="md-campo md-custom">Tamanho real (mm)
                <input value={refMmCustom} onChange={(e) => setRefMmCustom(e.target.value)} inputMode="decimal" placeholder="ex.: 50" />
              </label>
            )}
            <label className="md-campo">Unidade
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="cm">Centímetros</option>
                <option value="mm">Milímetros</option>
                <option value="pol">Polegadas</option>
              </select>
            </label>
          </div>

          <div className={'md-passo ' + (modo === 'ref' ? 'ref' : 'obj')}>
            {modo === 'ref'
              ? <><b>Passo 1 — referência.</b> {ref.dica}</>
              : <><b>Passo 2 — medir.</b> Arraste sobre o objeto (de ponta a ponta) para ver o tamanho. Pode medir vários.</>}
          </div>

          <div className="md-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} className="md-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: 'none' }} />
          </div>

          <div className="md-acoes">
            <button className="btn" onClick={() => { setRefSeg(null); setModo('ref') }}>Refazer referência</button>
            <button className="btn btn-ghost" onClick={() => setObjs((l) => l.slice(0, -1))} disabled={!objs.length}>Desfazer medição</button>
            <button className="btn btn-ghost" onClick={() => setObjs([])} disabled={!objs.length}>Limpar medições</button>
            <button className="btn btn-ghost" onClick={() => setImg(null)}>Nova foto</button>
          </div>

          {refSeg && objs.length > 0 && (
            <div className="md-result">
              <h3>Medidas</h3>
              <ul>
                {objs.map((s, i) => (
                  <li key={i}><span className="md-dot" /> Medida {i + 1}<strong>{escala ? formatar(dist(s.a, s.b) * escala, unidade) : '—'}</strong></li>
                ))}
              </ul>
            </div>
          )}

          <Notice kind="warning">
            A precisão depende de a foto ser de frente (sem inclinação) e de a referência estar no <b>mesmo plano</b> do objeto. Fotos em ângulo distorcem a medida.
          </Notice>
        </>
      )}
    </div>
  )
}

const CSS = `
.md{margin-top:14px}
.md-controls{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}
.md-campo{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;flex:1;min-width:150px}
.md-campo select,.md-campo input{padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit;font-weight:400}
.md-passo{padding:10px 12px;border-radius:var(--radius);font-size:14px;margin-bottom:10px;border:1px solid var(--line)}
.md-passo.ref{background:color-mix(in srgb,#f5a623 14%,transparent);border-color:#f5a62366}
.md-passo.obj{background:color-mix(in srgb,#1f9d55 14%,transparent);border-color:#1f9d5566}
.md-wrap{width:100%;border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden;background:var(--panel-2)}
.md-canvas{display:block;width:100%;height:auto;cursor:crosshair}
.md-acoes{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.md-result{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);padding:12px 14px;margin-bottom:12px}
.md-result h3{font-size:16px;margin:0 0 8px}
.md-result ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
.md-result li{display:flex;align-items:center;gap:8px;font-size:14px}
.md-result li strong{margin-left:auto;font-variant-numeric:tabular-nums;font-size:16px}
.md-dot{width:10px;height:10px;border-radius:50%;background:#1f9d55;flex:none}
`
