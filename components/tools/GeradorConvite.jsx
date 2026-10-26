'use client'

// Gerador de convites (aniversário, casamento, festas e mais). Monta o convite, mostra a prévia e gera
// um LINK que carrega os dados no próprio endereço (?c=...), para compartilhar sem servidor. Também
// baixa a imagem (PNG) e abre no WhatsApp.

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics'
import { downloadBlob } from '@/lib/client'
import { Field, Notice } from '../ui'
import { TEMAS, TIPOS, conviteDataUrl, conviteSVG, encodeConvite, exemploConvite, getTipo } from '@/lib/convites'

const CHAVE = 'soudev-convite-v1'

export default function GeradorConvite() {
  const [c, setC] = useState(() => exemploConvite('aniversario'))
  const [link, setLink] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    try { const s = localStorage.getItem(CHAVE); if (s) { const d = JSON.parse(s); if (d && d.tipo) setC(d) } } catch {}
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(CHAVE, JSON.stringify(c)) } catch {} }, 400)
    return () => clearTimeout(t)
  }, [c])
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    setLink(`${origin}/convite?c=${encodeConvite(c)}`)
  }, [c])

  const set = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }))
  const trocarTipo = (e) => {
    const id = e.target.value
    const t = getTipo(id)
    // troca o tipo e atualiza os textos/tema de exemplo só se ainda estiverem no padrão anterior
    setC((x) => {
      const antigo = getTipo(x.tipo)
      const manterTexto = (campo) => (x[campo] && x[campo] !== antigo[campo] ? x[campo] : t[campo])
      return { ...x, tipo: id, eyebrow: x.eyebrow && x.eyebrow !== antigo.eyebrow ? x.eyebrow : t.eyebrow, titulo: manterTexto('titulo'), subtitulo: manterTexto('subtitulo'), mensagem: manterTexto('mensagem'), tema: t.tema }
    })
  }

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800); track('convite_link') } catch {}
  }
  const whats = () => {
    const txt = `${c.titulo || 'Você está convidado(a)!'} 🎉 Veja o convite: ${link}`
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener')
    track('convite_whatsapp')
  }
  const baixarImagem = () => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1080, 1350)
      ctx.drawImage(img, 0, 0, 1080, 1350)
      canvas.toBlob((b) => { if (b) downloadBlob(b, `convite-${(c.titulo || 'festa').toLowerCase().replace(/\s+/g, '-')}.png`) }, 'image/png')
      track('convite_imagem')
    }
    img.onerror = () => {}
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(conviteSVG(c))
  }

  const linkLongo = link.length > 1500

  return (
    <div className="gc">
      <style>{CSS}</style>

      <Notice kind="info">
        Monte seu convite, veja a prévia e <b>compartilhe o link</b>: os dados viajam dentro do próprio endereço, então quem abrir vê o convite pronto — sem cadastro e sem servidor. Dá para baixar a imagem também.
      </Notice>

      <div className="gc-layout">
        {/* formulário */}
        <div className="gc-form">
          <Field label="Tipo de convite" className="gc-field">
            <select value={c.tipo} onChange={trocarTipo}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.nome}</option>)}
            </select>
          </Field>

          <Field label="Chamada (abertura)" hint="A frase de convite no topo. Ex.: “Com alegria, convidamos você para”." className="gc-field">
            <input value={c.eyebrow} onChange={set('eyebrow')} />
          </Field>
          <Field label="Título" hint="O nome do evento ou dos homenageados. Ex.: “Aniversário da Ana”, “Maria & João”." className="gc-field">
            <input value={c.titulo} onChange={set('titulo')} />
          </Field>
          <Field label="Subtítulo (opcional)" hint="Ex.: “30 anos”, “Bodas de Prata”." className="gc-field">
            <input value={c.subtitulo} onChange={set('subtitulo')} />
          </Field>

          <div className="gc-grid2">
            <Field label="Data" className="gc-field"><input type="date" value={c.data} onChange={set('data')} /></Field>
            <Field label="Horário" className="gc-field"><input type="time" value={c.hora} onChange={set('hora')} /></Field>
          </div>
          <Field label="Local" hint="Nome do lugar. Ex.: “Salão de festas do condomínio”." className="gc-field">
            <input value={c.local} onChange={set('local')} />
          </Field>
          <Field label="Endereço (opcional)" hint="Rua, número, bairro e cidade. Vira o botão “Como chegar”." className="gc-field">
            <input value={c.endereco} onChange={set('endereco')} />
          </Field>
          <Field label="Mensagem" className="gc-field"><textarea value={c.mensagem} onChange={set('mensagem')} rows={4} /></Field>
          <Field label="Confirmar presença (opcional)" hint="Um telefone com DDD vira o botão de WhatsApp “Confirmar presença”. Pode ser um texto também." className="gc-field">
            <input value={c.rsvp} onChange={set('rsvp')} placeholder="(11) 90000-0000" />
          </Field>

          <div className="gc-temas">
            <span className="gc-temas-lbl">Tema</span>
            <div className="gc-temas-chips">
              {TEMAS.map((t) => (
                <button key={t.id} type="button" className={'gc-tema' + (t.id === c.tema ? ' sel' : '')} onClick={() => setC((x) => ({ ...x, tema: t.id }))} title={t.nome}
                  style={{ background: `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`, borderColor: t.id === c.tema ? t.accent : 'var(--line-strong)' }}>
                  <span style={{ background: t.accent }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* prévia + ações */}
        <div className="gc-side">
          <div className="gc-preview">
            <img src={conviteDataUrl(c)} alt="Prévia do convite" />
          </div>

          <div className="gc-acoes">
            <button className="btn btn-primary" onClick={copiarLink}>{copiado ? 'Link copiado!' : '🔗 Copiar link'}</button>
            <button className="btn" onClick={whats}>💬 Enviar no WhatsApp</button>
            <button className="btn btn-ghost" onClick={baixarImagem}>⬇ Baixar imagem</button>
          </div>

          <div className="gc-linkbox">
            <span className="gc-linkbox-lbl">Link do convite</span>
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </div>
          {linkLongo && <Notice kind="warning">O link ficou longo por causa de um texto grande. Funciona, mas se quiser um link curto, encurte a mensagem ou use um encurtador de links.</Notice>}
        </div>
      </div>
    </div>
  )
}

const CSS = `
.gc{margin-top:14px}
.gc-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:20px;margin-top:14px}
@media(max-width:820px){.gc-layout{grid-template-columns:minmax(0,1fr)}}
.gc-form{display:flex;flex-direction:column;gap:12px}
.gc-field input,.gc-field textarea,.gc-field select{width:100%;padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--text);font:inherit}
.gc-field textarea{resize:vertical}
.gc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.gc-temas{border-top:1px solid var(--line);padding-top:12px}
.gc-temas-lbl{display:block;font-weight:600;font-size:14px;margin-bottom:8px}
.gc-temas-chips{display:flex;flex-wrap:wrap;gap:8px}
.gc-tema{width:46px;height:46px;border-radius:10px;border:2px solid var(--line-strong);cursor:pointer;display:flex;align-items:flex-end;justify-content:flex-end;padding:5px}
.gc-tema span{width:12px;height:12px;border-radius:50%;display:block}
.gc-tema.sel{box-shadow:0 0 0 2px var(--bg),0 0 0 4px var(--accent)}
.gc-side{display:flex;flex-direction:column;gap:12px;position:sticky;top:12px;align-self:start}
.gc-preview{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px;display:flex;justify-content:center}
.gc-preview img{width:100%;max-width:340px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.gc-acoes{display:flex;flex-wrap:wrap;gap:8px}
.gc-acoes .btn{flex:1;min-width:130px}
.gc-linkbox{display:flex;flex-direction:column;gap:4px}
.gc-linkbox-lbl{font-size:12px;color:var(--muted)}
.gc-linkbox input{width:100%;padding:9px;border:1px solid var(--line-strong);border-radius:var(--radius);background:var(--bg-2);color:var(--muted);font:inherit;font-size:12px}
`
