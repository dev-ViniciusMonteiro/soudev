'use client'

import { useRef, useState } from 'react'
import { ANIMAVEIS, BLENDS, EASES, MASCARAS, TAMANHOS, arred, comKeyframe, fmtTempo, keyframeEm, valorEm } from '@/lib/editor/modelo'
import { FORMAS } from '@/lib/editor/render'
import { Cor, Numero, SeletorFonte } from './campos'
import { EMOJIS } from './Painel'
import { definirAnimavel } from './Previa'

const CORES_MARCADOR = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6']

function Secao({ titulo, children, aberta = true }) {
  return (
    <details className="ed-secao" open={aberta}>
      <summary>{titulo}</summary>
      <div className="ed-secao-corpo">{children}</div>
    </details>
  )
}

export default function Propriedades(props) {
  const { projeto, selecao, marcadorSel } = props
  const clipes = projeto.trilhas.flatMap((t) => t.itens.map((c) => ({ c, t })))
  const sel = clipes.filter(({ c }) => selecao.includes(c.id))
  const marcador = (projeto.marcadores || []).find((m) => m.id === marcadorSel)
  return (
    <aside className="ed-props" aria-label="Propriedades">
      {sel.length === 1 ? <PropsClipe {...props} clipe={sel[0].c} trilha={sel[0].t} /> : sel.length > 1 ? <PropsVarios {...props} n={sel.length} /> : marcador ? <PropsMarcador {...props} m={marcador} /> : <PropsProjeto {...props} />}
    </aside>
  )
}

/* ---------- Projeto ---------- */

function PropsProjeto({ projeto, mudarProjeto, setTempo, setMarcadorSel }) {
  const preset = TAMANHOS.find(([, , w, h]) => w === projeto.largura && h === projeto.altura)?.[0] || 'custom'
  const f = projeto.fundo
  return (
    <>
      <h2 className="ed-props-titulo">Projeto</h2>
      <Secao titulo="Quadro">
        <label className="ed-campo">
          <span>Nome</span>
          <input value={projeto.nome} onChange={(e) => mudarProjeto((p) => ({ ...p, nome: e.target.value }), 'nome')} />
        </label>
        <label className="ed-campo">
          <span>Formato</span>
          <select
            value={preset}
            onChange={(e) => {
              const t = TAMANHOS.find(([id]) => id === e.target.value)
              if (t) mudarProjeto((p) => ({ ...p, largura: t[2], altura: t[3] }))
            }}
          >
            {TAMANHOS.map(([id, nome, w, h]) => (
              <option key={id} value={id}>
                {nome} · {w}×{h}
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <div className="ed-linha2">
          <Numero rotulo="L" valor={projeto.largura} casas={0} min={16} max={4096} onMudar={(v) => mudarProjeto((p) => ({ ...p, largura: Math.round(v / 2) * 2 }), 'largura')} sufixo="px" />
          <Numero rotulo="A" valor={projeto.altura} casas={0} min={16} max={4096} onMudar={(v) => mudarProjeto((p) => ({ ...p, altura: Math.round(v / 2) * 2 }), 'altura')} sufixo="px" />
        </div>
        <label className="ed-campo">
          <span>Quadros por segundo</span>
          <select value={projeto.fps} onChange={(e) => mudarProjeto((p) => ({ ...p, fps: Number(e.target.value) }))}>
            {[24, 25, 30, 50, 60].map((v) => (
              <option key={v} value={v}>
                {v} fps
              </option>
            ))}
          </select>
        </label>
      </Secao>
      <Secao titulo="Fundo">
        <div className="ed-segmentos">
          {[
            ['cor', 'Cor'],
            ['gradiente', 'Degradê'],
            ['desfoque', 'Vídeo desfocado'],
          ].map(([v, t]) => (
            <button key={v} type="button" className={f.tipo === v ? 'ativo' : ''} onClick={() => mudarProjeto((p) => ({ ...p, fundo: { ...p.fundo, tipo: v } }))}>
              {t}
            </button>
          ))}
        </div>
        <Cor rotulo={f.tipo === 'gradiente' ? 'Cor 1' : 'Cor'} valor={f.cor} onMudar={(v) => mudarProjeto((p) => ({ ...p, fundo: { ...p.fundo, cor: v } }), 'fundo-cor')} />
        {f.tipo === 'gradiente' && <Cor rotulo="Cor 2" valor={f.cor2} onMudar={(v) => mudarProjeto((p) => ({ ...p, fundo: { ...p.fundo, cor2: v } }), 'fundo-cor2')} />}
        {f.tipo === 'desfoque' && <Numero rotulo="Desfoque" valor={f.desfoque} min={0} max={200} casas={0} sufixo="px" onMudar={(v) => mudarProjeto((p) => ({ ...p, fundo: { ...p.fundo, desfoque: v } }), 'fundo-blur')} />}
        <p className="ed-dica">O fundo aparece onde o vídeo não cobre o quadro, como num vídeo deitado num formato vertical.</p>
      </Secao>
      <Secao titulo={`Marcadores (${projeto.marcadores?.length || 0})`}>
        {!projeto.marcadores?.length && <p className="ed-dica">Aperte M para marcar o ponto da agulha. Use para lembrar cortes, batidas da música ou trechos.</p>}
        <ul className="ed-lista-marc">
          {[...(projeto.marcadores || [])]
            .sort((a, b) => a.t - b.t)
            .map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setTempo(m.t)
                    setMarcadorSel(m.id)
                  }}
                >
                  <span style={{ color: m.cor }}>⚑</span> {fmtTempo(m.t, projeto.fps, true)} {m.nota || ''}
                </button>
              </li>
            ))}
        </ul>
      </Secao>
      <Atalhos />
    </>
  )
}

function PropsMarcador({ m, projeto, mudarProjeto, setMarcadorSel, setTempo }) {
  const mudar = (patch, chave) => mudarProjeto((p) => ({ ...p, marcadores: p.marcadores.map((x) => (x.id === m.id ? { ...x, ...patch } : x)) }), chave)
  return (
    <>
      <h2 className="ed-props-titulo">⚑ Marcador</h2>
      <Secao titulo="Marcador">
        <label className="ed-campo">
          <span>Anotação</span>
          <input value={m.nota || ''} onChange={(e) => mudar({ nota: e.target.value }, `marc-nota-${m.id}`)} placeholder="Ex.: entra a música" autoFocus />
        </label>
        <Numero rotulo="Tempo" valor={m.t} min={0} casas={3} passo={1 / projeto.fps} sufixo="s" onMudar={(v) => mudar({ t: v }, `marc-t-${m.id}`)} />
        <Numero rotulo="Duração" valor={m.dur || 0} min={0} casas={3} passo={0.1} sufixo="s" onMudar={(v) => mudar({ dur: v }, `marc-d-${m.id}`)} />
        <div className="ed-cores-marc">
          {CORES_MARCADOR.map((c) => (
            <button key={c} type="button" style={{ background: c }} className={m.cor === c ? 'ativo' : ''} onClick={() => mudar({ cor: c })} aria-label={`Cor ${c}`} />
          ))}
        </div>
        <div className="ed-acoes">
          <button type="button" className="ed-btn" onClick={() => setTempo(m.t)}>
            Ir para
          </button>
          <button
            type="button"
            className="ed-btn ed-btn-perigo"
            onClick={() => {
              mudarProjeto((p) => ({ ...p, marcadores: p.marcadores.filter((x) => x.id !== m.id) }))
              setMarcadorSel(null)
            }}
          >
            Apagar
          </button>
        </div>
      </Secao>
    </>
  )
}

function PropsVarios({ n, acoes }) {
  return (
    <>
      <h2 className="ed-props-titulo">{n} clipes selecionados</h2>
      <div className="ed-acoes ed-acoes-col">
        <button type="button" className="ed-btn" onClick={acoes.dividir}>
          ✂ Dividir na agulha (S)
        </button>
        <button type="button" className="ed-btn" onClick={acoes.duplicar}>
          ⧉ Duplicar (Ctrl+D)
        </button>
        <button type="button" className="ed-btn" onClick={acoes.copiar}>
          Copiar (Ctrl+C)
        </button>
        <button type="button" className="ed-btn ed-btn-perigo" onClick={acoes.apagar}>
          🗑 Apagar (Delete)
        </button>
      </div>
      <Atalhos />
    </>
  )
}

/* ---------- Clipe ---------- */

function PropsClipe({ projeto, clipe: c, tempo, setTempo, mudarClipe, acoes, midias, kfCopiados }) {
  const [aba, setAba] = useState('ajustes')
  const tl = Math.max(0, Math.min(c.dur, tempo - c.inicio))
  const naAgulha = tempo >= c.inicio && tempo <= c.inicio + c.dur
  const mudar = (fn, chave) => mudarClipe(c.id, fn, chave)
  const visual = c.tipo !== 'audio'
  const m = midias.get(c.midia)

  // campo animável com o botão de keyframe ◆
  const anim = (prop, rotulo, { min = -Infinity, max = Infinity, passo = 1, casas = 2, sufixo = '' } = {}) => {
    const temKf = c.kf?.[prop]?.length
    const aqui = keyframeEm(c, prop, tl)
    return (
      <Numero
        key={prop}
        rotulo={rotulo}
        valor={arred(valorEm(c, prop, tl), casas)}
        min={min}
        max={max}
        passo={passo}
        casas={casas}
        sufixo={sufixo}
        onMudar={(v) => mudar((x) => definirAnimavel(x, prop, v, tl), `${c.id}:${prop}`)}
        extra={
          <button
            type="button"
            className={`ed-kf ${aqui ? 'aqui' : temKf ? 'tem' : ''}`}
            title={aqui ? 'Remover keyframe deste ponto' : 'Criar keyframe neste ponto (animar)'}
            aria-label={aqui ? `Remover keyframe de ${rotulo}` : `Criar keyframe de ${rotulo}`}
            aria-pressed={!!aqui}
            disabled={!naAgulha}
            onClick={() =>
              mudar((x) => {
                if (aqui) {
                  const ks = x.kf[prop].filter((k) => k !== keyframeEm(x, prop, tl))
                  const kf = { ...x.kf }
                  if (ks.length) kf[prop] = ks
                  else delete kf[prop]
                  return { ...x, kf }
                }
                return comKeyframe(x, prop, tl, valorEm(x, prop, tl))
              })
            }
          >
            ◆
          </button>
        }
      />
    )
  }

  return (
    <>
      <h2 className="ed-props-titulo">
        {{ video: '🎬', imagem: '🖼', audio: '🎵', texto: 'T', sticker: '⭐' }[c.tipo]} {c.nome || c.texto?.conteudo?.split('\n')[0] || 'Clipe'}
      </h2>
      <div className="ed-acoes">
        <button type="button" className="ed-btn ed-btn-mini" onClick={acoes.dividir} title="Dividir na agulha (S)">
          ✂ Dividir
        </button>
        <button type="button" className="ed-btn ed-btn-mini" onClick={acoes.duplicar} title="Duplicar (Ctrl+D)">
          ⧉ Duplicar
        </button>
        <button type="button" className="ed-btn ed-btn-mini ed-btn-perigo" onClick={acoes.apagar} title="Apagar (Delete)">
          🗑
        </button>
      </div>
      {!naAgulha && (
        <p className="ed-dica">
          A agulha está fora deste clipe.{' '}
          <button type="button" className="ed-link" onClick={() => setTempo(c.inicio)}>
            Ir para o início
          </button>{' '}
          para criar keyframes.
        </p>
      )}
      <div className="ed-segmentos">
        <button type="button" className={aba === 'ajustes' ? 'ativo' : ''} onClick={() => setAba('ajustes')}>
          Ajustes
        </button>
        <button type="button" className={aba === 'animacao' ? 'ativo' : ''} onClick={() => setAba('animacao')}>
          Animação {Object.keys(c.kf || {}).length ? `(${Object.keys(c.kf).length})` : ''}
        </button>
      </div>

      {aba === 'animacao' ? (
        <Animacao c={c} tl={tl} naAgulha={naAgulha} mudar={mudar} setTempo={setTempo} kfCopiados={kfCopiados} />
      ) : (
        <>
          {c.tipo === 'texto' && (
            <Secao titulo="Texto">
              <label className="ed-campo">
                <span>Conteúdo</span>
                <textarea rows={3} value={c.texto.conteudo} onChange={(e) => mudar((x) => ({ ...x, texto: { ...x.texto, conteudo: e.target.value } }), `${c.id}:conteudo`)} />
              </label>
              <SeletorFonte valor={c.texto.fonte} onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, fonte: v } }))} />
              <div className="ed-linha2">
                <Numero rotulo="Tamanho" valor={c.texto.tamanho} min={6} max={800} casas={0} sufixo="px" onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, tamanho: v } }), `${c.id}:tam`)} />
                <label className="ed-campo">
                  <span>Peso</span>
                  <select value={c.texto.peso} onChange={(e) => mudar((x) => ({ ...x, texto: { ...x.texto, peso: Number(e.target.value) } }))}>
                    <option value={300}>Fino</option>
                    <option value={400}>Normal</option>
                    <option value={700}>Negrito</option>
                    <option value={900}>Black</option>
                  </select>
                </label>
              </div>
              <div className="ed-segmentos">
                {[
                  ['left', '⯇ Esquerda'],
                  ['center', 'Centro'],
                  ['right', 'Direita ⯈'],
                ].map(([v, t]) => (
                  <button key={v} type="button" className={c.texto.alinhar === v ? 'ativo' : ''} onClick={() => mudar((x) => ({ ...x, texto: { ...x.texto, alinhar: v } }))}>
                    {t}
                  </button>
                ))}
                <button type="button" className={c.texto.italico ? 'ativo' : ''} onClick={() => mudar((x) => ({ ...x, texto: { ...x.texto, italico: !x.texto.italico } }))} aria-pressed={!!c.texto.italico}>
                  <em>Itálico</em>
                </button>
              </div>
              <Cor rotulo="Cor" valor={c.texto.cor} onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, cor: v } }), `${c.id}:cor`)} />
              <Cor rotulo="Fundo" valor={c.texto.fundo} permitirVazio onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, fundo: v } }), `${c.id}:fundo`)} />
              <div className="ed-linha2">
                <Numero rotulo="Contorno" valor={c.texto.contorno} min={0} max={60} casas={0} sufixo="px" onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, contorno: v } }), `${c.id}:cont`)} />
                <Cor rotulo="Cor do contorno" valor={c.texto.corContorno} onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, corContorno: v } }), `${c.id}:corcont`)} />
              </div>
              <div className="ed-linha2">
                <Numero rotulo="Espaço letras" valor={c.texto.letra || 0} min={-20} max={100} casas={0} sufixo="px" onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, letra: v } }), `${c.id}:letra`)} />
                <Numero rotulo="Entrelinhas" valor={c.texto.espaco || 1.15} min={0.6} max={3} passo={0.01} casas={2} onMudar={(v) => mudar((x) => ({ ...x, texto: { ...x.texto, espaco: v } }), `${c.id}:esp`)} />
              </div>
              <label className="ed-check">
                <input type="checkbox" checked={!!c.texto.sombra} onChange={(e) => mudar((x) => ({ ...x, texto: { ...x.texto, sombra: e.target.checked } }))} /> Sombra
              </label>
            </Secao>
          )}

          {c.tipo === 'sticker' && (
            <Secao titulo="Figurinha">
              <div className="ed-segmentos">
                <button type="button" className={c.sticker.tipo === 'emoji' ? 'ativo' : ''} onClick={() => mudar((x) => ({ ...x, sticker: { ...x.sticker, tipo: 'emoji', valor: '⭐' } }))}>
                  Emoji
                </button>
                <button type="button" className={c.sticker.tipo === 'forma' ? 'ativo' : ''} onClick={() => mudar((x) => ({ ...x, sticker: { ...x.sticker, tipo: 'forma', valor: 'estrela' } }))}>
                  Forma
                </button>
              </div>
              {c.sticker.tipo === 'forma' ? (
                <>
                  <label className="ed-campo">
                    <span>Forma</span>
                    <select value={c.sticker.valor} onChange={(e) => mudar((x) => ({ ...x, sticker: { ...x.sticker, valor: e.target.value } }))}>
                      {FORMAS.map(([v, t]) => (
                        <option key={v} value={v}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Cor rotulo="Cor" valor={c.sticker.cor} onMudar={(v) => mudar((x) => ({ ...x, sticker: { ...x.sticker, cor: v } }), `${c.id}:stcor`)} />
                </>
              ) : (
                <label className="ed-campo">
                  <span>Emoji</span>
                  <select value={c.sticker.valor} onChange={(e) => mudar((x) => ({ ...x, sticker: { ...x.sticker, valor: e.target.value } }))}>
                    {Object.entries(EMOJIS).map(([g, l]) => (
                      <optgroup key={g} label={g}>
                        {l.map((em) => (
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              )}
            </Secao>
          )}

          {visual && (
            <Secao titulo="Transformar">
              <div className="ed-linha2">
                {anim('x', 'X', { casas: 0, sufixo: 'px' })}
                {anim('y', 'Y', { casas: 0, sufixo: 'px' })}
              </div>
              <div className="ed-linha2">
                {anim('escala', 'Escala', { min: 0.01, max: 20, passo: 0.01, casas: 3, sufixo: '×' })}
                {anim('rot', 'Rotação', { min: -3600, max: 3600, casas: 1, sufixo: '°' })}
              </div>
              <div className="ed-linha2">
                <Numero rotulo="Largura" valor={c.t.sx ?? 1} min={0.01} max={20} passo={0.01} casas={3} sufixo="×" onMudar={(v) => mudar((x) => ({ ...x, t: { ...x.t, sx: v } }), `${c.id}:sx`)} />
                <Numero rotulo="Altura" valor={c.t.sy ?? 1} min={0.01} max={20} passo={0.01} casas={3} sufixo="×" onMudar={(v) => mudar((x) => ({ ...x, t: { ...x.t, sy: v } }), `${c.id}:sy`)} />
              </div>
              {anim('opac', 'Opacidade', { min: 0, max: 100, casas: 0, sufixo: '%' })}
              <label className="ed-campo">
                <span>Mesclagem</span>
                <select value={c.blend} onChange={(e) => mudar((x) => ({ ...x, blend: e.target.value }))}>
                  {BLENDS.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ed-acoes">
                <button type="button" className="ed-btn ed-btn-mini" onClick={() => mudar((x) => ({ ...x, t: { x: 0, y: 0, escala: 1, sx: 1, sy: 1, rot: 0, opac: 1 }, kf: Object.fromEntries(Object.entries(x.kf || {}).filter(([k]) => !['x', 'y', 'escala', 'rot', 'opac'].includes(k))) }))}>
                  Centralizar e zerar
                </button>
                {(c.tipo === 'video' || c.tipo === 'imagem') && m && (
                  <button
                    type="button"
                    className="ed-btn ed-btn-mini"
                    onClick={() => {
                      const f = Math.max(projeto.largura / m.largura, projeto.altura / m.altura) / Math.min(projeto.largura / m.largura, projeto.altura / m.altura)
                      mudar((x) => ({ ...x, t: { ...x.t, x: 0, y: 0, escala: arred(f, 3) } }))
                    }}
                  >
                    Preencher o quadro
                  </button>
                )}
              </div>
            </Secao>
          )}

          {visual && (
            <Secao titulo="Efeitos" aberta={false}>
              {anim('desfoque', 'Desfoque', { min: 0, max: 200, casas: 1, sufixo: 'px' })}
              <Numero rotulo="Brilho" valor={c.efeitos.brilho ?? 100} min={0} max={300} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, efeitos: { ...x.efeitos, brilho: v } }), `${c.id}:brilho`)} />
              <Numero rotulo="Contraste" valor={c.efeitos.contraste ?? 100} min={0} max={300} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, efeitos: { ...x.efeitos, contraste: v } }), `${c.id}:contr`)} />
              <Numero rotulo="Saturação" valor={c.efeitos.saturacao ?? 100} min={0} max={300} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, efeitos: { ...x.efeitos, saturacao: v } }), `${c.id}:sat`)} />
              <label className="ed-check">
                <input type="checkbox" checked={!!c.efeitos.pb} onChange={(e) => mudar((x) => ({ ...x, efeitos: { ...x.efeitos, pb: e.target.checked } }))} /> Preto e branco
              </label>
              <label className="ed-check">
                <input type="checkbox" checked={!!c.efeitos.sepia} onChange={(e) => mudar((x) => ({ ...x, efeitos: { ...x.efeitos, sepia: e.target.checked } }))} /> Sépia
              </label>
            </Secao>
          )}

          {visual && (
            <Secao titulo="Máscara" aberta={!!c.mascara?.tipo}>
              <label className="ed-campo">
                <span>Forma</span>
                <select value={c.mascara?.tipo || ''} onChange={(e) => mudar((x) => ({ ...x, mascara: e.target.value ? { x: 0, y: 0, l: e.target.value === 'cinema' ? 1 : 0.6, a: e.target.value === 'cinema' ? 0.12 : 0.6, suave: 0, inverter: false, contorno: 0, corContorno: '#ffffff', ...x.mascara, tipo: e.target.value } : null }))}>
                  {MASCARAS.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              {c.mascara?.tipo && (
                <>
                  {c.mascara.tipo !== 'cinema' && (
                    <div className="ed-linha2">
                      <Numero rotulo="Centro X" valor={Math.round(c.mascara.x * 100)} min={-100} max={100} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, x: v / 100 } }), `${c.id}:mx`)} />
                      {c.mascara.tipo !== 'dividir' && <Numero rotulo="Centro Y" valor={Math.round(c.mascara.y * 100)} min={-100} max={100} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, y: v / 100 } }), `${c.id}:my`)} />}
                    </div>
                  )}
                  {c.mascara.tipo !== 'dividir' && (
                    <div className="ed-linha2">
                      {c.mascara.tipo !== 'cinema' && <Numero rotulo="Largura" valor={Math.round(c.mascara.l * 100)} min={1} max={300} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, l: v / 100 } }), `${c.id}:ml`)} />}
                      <Numero rotulo={c.mascara.tipo === 'cinema' ? 'Barra' : 'Altura'} valor={Math.round(c.mascara.a * 100)} min={1} max={c.mascara.tipo === 'cinema' ? 45 : 300} casas={0} sufixo="%" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, a: v / 100 } }), `${c.id}:ma`)} />
                    </div>
                  )}
                  <Numero rotulo="Suavizar borda" valor={c.mascara.suave} min={0} max={300} casas={0} sufixo="px" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, suave: v } }), `${c.id}:msu`)} />
                  <label className="ed-check">
                    <input type="checkbox" checked={!!c.mascara.inverter} onChange={(e) => mudar((x) => ({ ...x, mascara: { ...x.mascara, inverter: e.target.checked } }))} /> Inverter (esconde o que está dentro)
                  </label>
                  {!['dividir', 'cinema'].includes(c.mascara.tipo) && (
                    <div className="ed-linha2">
                      <Numero rotulo="Contorno" valor={c.mascara.contorno} min={0} max={100} casas={0} sufixo="px" onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, contorno: v } }), `${c.id}:mco`)} />
                      <Cor rotulo="Cor" valor={c.mascara.corContorno} onMudar={(v) => mudar((x) => ({ ...x, mascara: { ...x.mascara, corContorno: v } }), `${c.id}:mcc`)} />
                    </div>
                  )}
                </>
              )}
            </Secao>
          )}

          {(c.tipo === 'video' || c.tipo === 'audio') && (
            <Secao titulo="Velocidade e som">
              <Numero
                rotulo="Velocidade"
                valor={c.vel}
                min={0.1}
                max={8}
                passo={0.05}
                casas={2}
                sufixo="×"
                onMudar={(v) =>
                  mudar((x) => {
                    // mantém o mesmo trecho da mídia: a duração na linha do tempo muda
                    const trecho = x.dur * x.vel
                    const max = m ? (m.duracao - x.corte) / v : Infinity
                    return { ...x, vel: v, dur: arred(Math.min(trecho / v, max)) }
                  }, `${c.id}:vel`)
                }
              />
              <div className="ed-chips">
                {[0.25, 0.5, 1, 1.5, 2, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={c.vel === v ? 'ativo' : ''}
                    onClick={() =>
                      mudar((x) => {
                        const trecho = x.dur * x.vel
                        const max = m ? (m.duracao - x.corte) / v : Infinity
                        return { ...x, vel: v, dur: arred(Math.min(trecho / v, max)) }
                      })
                    }
                  >
                    {v}×
                  </button>
                ))}
              </div>
              <label className="ed-check">
                <input type="checkbox" checked={c.tom !== false} onChange={(e) => mudar((x) => ({ ...x, tom: e.target.checked }))} /> Manter o tom da voz ao acelerar
              </label>
              {anim('vol', 'Volume', { min: 0, max: 100, casas: 0, sufixo: '%' })}
              <label className="ed-check">
                <input type="checkbox" checked={!!c.mudo} onChange={(e) => mudar((x) => ({ ...x, mudo: e.target.checked }))} /> Sem som
              </label>
            </Secao>
          )}

          <Secao titulo="Tempo" aberta={false}>
            <Numero rotulo="Início" valor={c.inicio} min={0} casas={3} passo={1 / projeto.fps} sufixo="s" onMudar={(v) => mudar((x) => ({ ...x, inicio: v }), `${c.id}:ini`)} />
            <Numero
              rotulo="Duração"
              valor={c.dur}
              min={1 / projeto.fps}
              max={(c.tipo === 'video' || c.tipo === 'audio') && m ? (m.duracao - c.corte) / c.vel : 36000}
              casas={3}
              passo={1 / projeto.fps}
              sufixo="s"
              onMudar={(v) => mudar((x) => ({ ...x, dur: v }), `${c.id}:dur`)}
            />
            {(c.tipo === 'video' || c.tipo === 'audio') && <p className="ed-dica">Começa em {fmtTempo(c.corte, projeto.fps, true)} do arquivo original.</p>}
          </Secao>
        </>
      )}
    </>
  )
}

/* ---------- Animação: lista de keyframes e curva ---------- */

function Animacao({ c, tl, naAgulha, mudar, setTempo, kfCopiados }) {
  const [focado, setFocado] = useState(null)
  const props = Object.keys(c.kf || {})
  const todos = [...new Set(props.flatMap((p) => c.kf[p].map((k) => k.t)))].sort((a, b) => a - b)
  const anterior = [...todos].reverse().find((t) => t < tl - 0.01)
  const proximo = todos.find((t) => t > tl + 0.01)
  const f = focado && c.kf?.[focado.prop]?.[focado.i]

  const mudarKf = (prop, i, patch) => mudar((x) => ({ ...x, kf: { ...x.kf, [prop]: x.kf[prop].map((k, j) => (j === i ? { ...k, ...patch } : k)).sort((a, b) => a.t - b.t) } }))

  return (
    <>
      <div className="ed-acoes">
        <button type="button" className="ed-btn ed-btn-mini" disabled={anterior === undefined} onClick={() => setTempo(c.inicio + anterior)} title="Keyframe anterior">
          ◀ ◆
        </button>
        <button type="button" className="ed-btn ed-btn-mini" disabled={proximo === undefined} onClick={() => setTempo(c.inicio + proximo)} title="Próximo keyframe">
          ◆ ▶
        </button>
        <button
          type="button"
          className="ed-btn ed-btn-mini"
          disabled={!props.length}
          onClick={() => {
            const base = todos[0] || 0
            kfCopiados.current = Object.fromEntries(props.map((p) => [p, c.kf[p].map((k) => ({ ...k, t: k.t - base }))]))
          }}
        >
          Copiar keyframes
        </button>
        <button
          type="button"
          className="ed-btn ed-btn-mini"
          disabled={!kfCopiados.current || !naAgulha}
          title="Cola a partir da agulha"
          onClick={() =>
            mudar((x) => {
              let novo = x
              for (const [p, ks] of Object.entries(kfCopiados.current)) for (const k of ks) if (tl + k.t <= x.dur + 0.001) novo = comKeyframe(novo, p, tl + k.t, k.v, k.e)
              return novo
            })
          }
        >
          Colar keyframes
        </button>
      </div>
      {!props.length && <p className="ed-dica">Nada animado ainda. Em Ajustes, aperte ◆ ao lado de uma propriedade (posição, escala, rotação, opacidade, desfoque, volume), mova a agulha, mude o valor: o movimento é criado entre os dois pontos.</p>}
      {props.map((p) => (
        <Secao key={p} titulo={`${ANIMAVEIS[p]?.[0] || p} (${c.kf[p].length})`}>
          <table className="ed-kf-tabela">
            <tbody>
              {c.kf[p].map((k, i) => (
                <tr key={i} className={focado?.prop === p && focado.i === i ? 'sel' : ''}>
                  <td>
                    <button type="button" className="ed-link" onClick={() => (setTempo(c.inicio + k.t), setFocado({ prop: p, i }))}>
                      {k.t.toFixed(2)}s
                    </button>
                  </td>
                  <td>{arred(k.v, 2)}</td>
                  <td>
                    {i < c.kf[p].length - 1 ? (
                      <select
                        value={EASES.find(([, , e]) => JSON.stringify(e) === JSON.stringify(k.e))?.[0] || 'custom'}
                        onChange={(e) => {
                          const ease = EASES.find(([id]) => id === e.target.value)
                          if (ease) mudarKf(p, i, { e: ease[2] })
                          setFocado({ prop: p, i })
                        }}
                        aria-label="Curva até o próximo keyframe"
                      >
                        {EASES.map(([id, nome]) => (
                          <option key={id} value={id}>
                            {nome}
                          </option>
                        ))}
                        <option value="custom">Personalizada</option>
                      </select>
                    ) : (
                      <span className="ed-dica">último</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ed-icone"
                      aria-label="Apagar keyframe"
                      onClick={() =>
                        mudar((x) => {
                          const ks = x.kf[p].filter((_, j) => j !== i)
                          const kf = { ...x.kf }
                          if (ks.length) kf[p] = ks
                          else delete kf[p]
                          return { ...x, kf }
                        })
                      }
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      ))}
      {f && f.e && focado.i < c.kf[focado.prop].length - 1 && (
        <Secao titulo="Curva do movimento">
          <CurvaBezier valor={f.e} onMudar={(e) => mudarKf(focado.prop, focado.i, { e })} />
          <p className="ed-dica">Arraste os dois pontos para mudar a aceleração entre este keyframe e o próximo.</p>
        </Secao>
      )}
    </>
  )
}

export function CurvaBezier({ valor, onMudar }) {
  const svg = useRef(null)
  const arr = useRef(null)
  const [x1, y1, x2, y2] = valor
  const T = 200
  const P = 30
  const px = (v) => P + v * T
  const py = (v) => P + (1 - v) * T
  const mover = (e) => {
    if (arr.current === null) return
    const r = svg.current.getBoundingClientRect()
    const esc = (T + 2 * P) / r.width
    const vx = Math.max(0, Math.min(1, ((e.clientX - r.left) * esc - P) / T))
    const vy = Math.max(-0.6, Math.min(1.6, 1 - ((e.clientY - r.top) * esc - P) / T))
    const n = [...valor]
    n[arr.current * 2] = Math.round(vx * 100) / 100
    n[arr.current * 2 + 1] = Math.round(vy * 100) / 100
    onMudar(n)
  }
  return (
    <svg ref={svg} className="ed-curva" viewBox={`0 0 ${T + 2 * P} ${T + 2 * P}`} onPointerMove={mover} onPointerUp={() => (arr.current = null)} onPointerLeave={() => (arr.current = null)} role="img" aria-label={`Curva cubic-bezier(${valor.join(', ')})`}>
      <rect x={P} y={P} width={T} height={T} className="ed-curva-fundo" />
      <line x1={px(0)} y1={py(0)} x2={px(x1)} y2={py(y1)} className="ed-curva-braco" />
      <line x1={px(1)} y1={py(1)} x2={px(x2)} y2={py(y2)} className="ed-curva-braco" />
      <path d={`M${px(0)},${py(0)} C${px(x1)},${py(y1)} ${px(x2)},${py(y2)} ${px(1)},${py(1)}`} className="ed-curva-linha" />
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={px(x)}
          cy={py(y)}
          r="9"
          className="ed-curva-ponto"
          onPointerDown={(e) => {
            try {
              e.currentTarget.ownerSVGElement.setPointerCapture(e.pointerId)
            } catch {}
            arr.current = i
          }}
        />
      ))}
      <text x={P} y={T + 2 * P - 8} className="ed-curva-texto">
        cubic-bezier({valor.join(', ')})
      </text>
    </svg>
  )
}

function Atalhos() {
  return (
    <Secao titulo="Atalhos do teclado" aberta={false}>
      <dl className="ed-atalhos">
        {[
          ['Espaço / K', 'Tocar ou pausar'],
          ['J / L', 'Voltar / avançar 1 s'],
          ['← / →', 'Um quadro'],
          ['Shift + ← / →', '5 segundos'],
          ['Home / Enter · End', 'Início · fim'],
          ['S', 'Dividir na agulha'],
          ['Q / W', 'Cortar antes / depois da agulha'],
          ['Ctrl+C / Ctrl+V', 'Copiar / colar na agulha'],
          ['Ctrl+D', 'Duplicar'],
          ['Delete', 'Apagar'],
          ['Ctrl+A', 'Selecionar tudo'],
          ['Ctrl+Z / Ctrl+Shift+Z', 'Desfazer / refazer'],
          ['N', 'Ímã liga/desliga (Shift ao arrastar ignora)'],
          ['M', 'Marcador na agulha'],
          ['+ / −', 'Zoom da linha do tempo'],
        ].map(([k, d]) => (
          <div key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </Secao>
  )
}
