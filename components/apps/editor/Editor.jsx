'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apagarMidia, apagarProjeto, duplicarProjeto, espaco, lerProjeto, listarProjetos, midiasDo, salvarMidia, salvarProjeto } from '@/lib/editor/banco'
import { importarArquivo } from '@/lib/editor/midia'
import { TAMANHOS, TEXTO_PADRAO, acharClipe, arred, clipesEm, dividir, duracaoProjeto, fimDo, fmtTempo, inserir, lerLegendas, limparTrilhasVazias, novoClipe, novoProjeto, remover, uid } from '@/lib/editor/modelo'
import { formatBytes } from '@/lib/client'
import Exportar from './Exportar'
import Linha from './Linha'
import Painel from './Painel'
import Previa from './Previa'
import Propriedades from './Propriedades'
import { useFontesDoProjeto } from './campos'

const digitando = (el) => el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

export default function Editor() {
  const [aberto, setAberto] = useState(null)
  useEffect(() => {
    document.documentElement.classList.add('ap-tela-cheia')
    const id = new URLSearchParams(location.search).get('p')
    if (id) setAberto(id)
    return () => document.documentElement.classList.remove('ap-tela-cheia')
  }, [])
  const abrir = (id) => {
    history.replaceState(null, '', id ? `?p=${id}` : location.pathname)
    setAberto(id)
  }
  return aberto ? <Area key={aberto} id={aberto} onSair={() => abrir(null)} /> : <Projetos onAbrir={abrir} />
}

/* ---------- Lista de projetos ---------- */

function Projetos({ onAbrir }) {
  const [lista, setLista] = useState(null)
  const [uso, setUso] = useState(null)
  const [novo, setNovo] = useState(false)
  const recarregar = useCallback(() => {
    listarProjetos().then(setLista)
    espaco().then(setUso)
  }, [])
  useEffect(recarregar, [recarregar])
  const criar = async ([, , w, h], nome) => {
    const p = novoProjeto(nome || 'Projeto sem nome', [w, h])
    await salvarProjeto(p)
    onAbrir(p.id)
  }
  return (
    <div className="ed-projetos">
      <header className="ed-topo">
        <a href="/apps/editor-de-video" className="ed-voltar" aria-label="Sair do editor">
          ←
        </a>
        <h1>Editor de vídeo</h1>
        <span className="ed-espaco" />
        <button type="button" className="ed-btn ed-btn-primario" onClick={() => setNovo(true)}>
          + Novo projeto
        </button>
      </header>
      <main className="ed-projetos-corpo">
        {lista === null ? (
          <p className="ed-dica">Carregando…</p>
        ) : !lista.length || novo ? (
          <section>
            <h2>Qual o formato do vídeo?</h2>
            <div className="ed-formatos">
              {TAMANHOS.map((t) => (
                <button key={t[0]} type="button" className="ed-formato" onClick={() => criar(t)}>
                  <span className="ed-formato-forma" style={{ aspectRatio: `${t[2]} / ${t[3]}` }} aria-hidden="true" />
                  <strong>{t[0]}</strong>
                  <span>{t[1].replace(/^[^ ]+ [^ ]+ /, '')}</span>
                </button>
              ))}
            </div>
            {lista.length > 0 && (
              <button type="button" className="ed-btn" onClick={() => setNovo(false)}>
                Voltar aos projetos
              </button>
            )}
          </section>
        ) : (
          <section>
            <h2>Seus projetos</h2>
            <ul className="ed-lista-projetos">
              {lista.map((p) => (
                <li key={p.id}>
                  <button type="button" className="ed-projeto" onClick={() => onAbrir(p.id)}>
                    <span className="ed-projeto-forma" style={{ aspectRatio: `${p.largura} / ${p.altura}` }}>
                      {p.capa ? <img src={p.capa} alt="" /> : <span aria-hidden="true">🎬</span>}
                    </span>
                    <strong>{p.nome}</strong>
                    <span>
                      {p.largura}×{p.altura} · {fmtTempo(duracaoProjeto(p))} · {new Date(p.alterado).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                  <div className="ed-projeto-acoes">
                    <button
                      type="button"
                      className="ed-icone"
                      title="Renomear"
                      onClick={async () => {
                        const nome = prompt('Novo nome do projeto:', p.nome)
                        if (nome?.trim()) {
                          await salvarProjeto({ ...p, nome: nome.trim() })
                          recarregar()
                        }
                      }}
                    >
                      ✎
                    </button>
                    <button type="button" className="ed-icone" title="Duplicar" onClick={async () => (await duplicarProjeto(p), recarregar())}>
                      ⧉
                    </button>
                    <button
                      type="button"
                      className="ed-icone"
                      title="Apagar"
                      onClick={async () => {
                        if (!confirm(`Apagar "${p.nome}" e as mídias dele deste navegador?`)) return
                        await apagarProjeto(p.id)
                        recarregar()
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="ed-dica">
          Os projetos e vídeos ficam guardados neste navegador (nada é enviado).
          {uso && ` Espaço usado: ${formatBytes(uso.usado)} de ${formatBytes(uso.total)}.`}
        </p>
      </main>
    </div>
  )
}

/* ---------- Área de edição ---------- */

function Area({ id, onSair }) {
  const [projeto, setProjeto] = useState(null)
  const [midias, setMidias] = useState(new Map())
  const [tempo, setTempoBruto] = useState(0)
  const [tocando, setTocando] = useState(false)
  const [selecao, setSelecao] = useState([])
  const [marcadorSel, setMarcadorSel] = useState(null)
  const [zoom, setZoom] = useState(60)
  const [ima, setIma] = useState(true)
  const [ripple, setRipple] = useState(false)
  const [salvo, setSalvo] = useState(true)
  const [aviso, setAviso] = useState('')
  const [exportar, setExportar] = useState(false)
  const [ocupado, setOcupado] = useState('')
  const [, setRedesenho] = useState(0)
  const hist = useRef({ passado: [], futuro: [], chave: null, t: 0 })
  const atual = useRef(null)
  const area = useRef(null)
  const copiados = useRef(null)
  const kfCopiados = useRef(null)
  atual.current = projeto

  useEffect(() => {
    let vivo = true
    Promise.all([lerProjeto(id), midiasDo(id)]).then(([p, ms]) => {
      if (!vivo) return
      if (!p) return onSair()
      setProjeto(p)
      setMidias(new Map(ms.map((m) => [m.id, m])))
    })
    return () => {
      vivo = false
    }
  }, [id, onSair])

  useFontesDoProjeto(projeto, () => setRedesenho((n) => n + 1))

  const avisar = (t) => {
    setAviso(t)
    clearTimeout(avisar.t)
    avisar.t = setTimeout(() => setAviso(''), 3500)
  }

  /** Muda o projeto. registrar=false não cria passo no histórico; chave junta mudanças seguidas do mesmo campo. */
  const definir = useCallback((novo, registrar = true, chave = null) => {
    const h = hist.current
    const agora = Date.now()
    const juntar = chave && h.chave === chave && agora - h.t < 1200
    if (registrar && !juntar && atual.current) {
      h.passado.push(atual.current)
      if (h.passado.length > 150) h.passado.shift()
      h.futuro = []
    }
    h.chave = chave
    h.t = agora
    atual.current = novo
    setProjeto(novo)
    setSalvo(false)
  }, [])

  const mudarProjeto = useCallback((fn, chave) => definir(fn(atual.current), true, chave || null), [definir])
  const mudarClipe = useCallback(
    (idClipe, fn, arg) => {
      const registrar = typeof arg === 'boolean' ? arg : true
      const chave = typeof arg === 'string' ? arg : null
      const p = atual.current
      definir({ ...p, trilhas: p.trilhas.map((t) => ({ ...t, itens: t.itens.map((c) => (c.id === idClipe ? fn(c) : c)) })) }, registrar, chave)
    },
    [definir],
  )

  const desfazer = () => {
    const h = hist.current
    if (!h.passado.length) return
    h.futuro.push(atual.current)
    const p = h.passado.pop()
    h.chave = null
    atual.current = p
    setProjeto(p)
    setSalvo(false)
  }
  const refazer = () => {
    const h = hist.current
    if (!h.futuro.length) return
    h.passado.push(atual.current)
    const p = h.futuro.pop()
    h.chave = null
    atual.current = p
    setProjeto(p)
    setSalvo(false)
  }

  // salva sozinho
  useEffect(() => {
    if (!projeto || salvo) return
    const t = setTimeout(() => {
      const primeira = projeto.trilhas.flatMap((tr) => tr.itens).find((c) => midias.get(c.midia)?.miniatura)
      salvarProjeto({ ...projeto, capa: primeira ? midias.get(primeira.midia).miniatura : '' }).then(() => setSalvo(true))
    }, 700)
    return () => clearTimeout(t)
  }, [projeto, salvo, midias])

  const dur = projeto ? duracaoProjeto(projeto) : 0
  const setTempo = useCallback((t) => setTempoBruto(Math.max(0, Math.min(t, dur + 20))), [dur])
  const quadro = projeto ? 1 / projeto.fps : 1 / 30

  /* ---------- Importar ---------- */

  const importar = async (arquivos, t = null, trilhaId = null) => {
    if (!arquivos.length) return
    let p = atual.current
    let pos = t ?? tempo
    const vazio = !p.trilhas.some((tr) => tr.itens.length)
    const novas = new Map(midias)
    for (const [i, arq] of arquivos.entries()) {
      setOcupado(`Importando ${arq.name || 'arquivo'} (${i + 1}/${arquivos.length})…`)
      try {
        const m = await importarArquivo(arq, p.id)
        await salvarMidia(m)
        novas.set(m.id, m)
        if (vazio && i === 0 && m.tipo === 'video' && m.largura && (m.largura !== p.largura || m.altura !== p.altura)) {
          const esc = Math.min(1, 3840 / Math.max(m.largura, m.altura))
          p = { ...p, largura: Math.round((m.largura * esc) / 2) * 2, altura: Math.round((m.altura * esc) / 2) * 2 }
          avisar(`Formato do projeto ajustado ao vídeo: ${p.largura}×${p.altura}.`)
        }
        const c = novoClipe(m.tipo, { midia: m, inicio: pos })
        p = inserir(p, c, { trilhaId })
        const inserido = acharClipe(p, c.id).clipe
        pos = fimDo(inserido)
      } catch (e) {
        avisar(e.message)
      }
    }
    setMidias(novas)
    definir(p)
    setOcupado('')
  }

  const inserirMidia = (m, t = tempo, trilhaId = null) => {
    const c = novoClipe(m.tipo, { midia: m, inicio: t })
    definir(inserir(atual.current, c, { trilhaId }))
    setSelecao([c.id])
  }

  // os modelos são pensados para 1080p: tamanho e posição acompanham o quadro do projeto
  const escalaQuadro = () => Math.min(atual.current.largura, atual.current.altura) / 1080
  const escalarTexto = (tx, pos = {}) => {
    const f = escalaQuadro()
    return [{ ...TEXTO_PADRAO, ...tx, tamanho: Math.round((tx.tamanho || TEXTO_PADRAO.tamanho) * f), contorno: Math.round((tx.contorno || 0) * f), letra: Math.round((tx.letra || 0) * f) }, Object.fromEntries(Object.entries(pos).map(([k, v]) => [k, Math.round(v * f)]))]
  }

  const inserirTexto = (bruto, posBruta = {}) => {
    const [tx, pos] = escalarTexto(bruto, posBruta)
    const c = novoClipe('texto', { inicio: tempo, dur: 5, texto: tx })
    c.t = { ...c.t, ...pos }
    c.nome = tx.conteudo.split('\n')[0]
    definir(inserir(atual.current, c))
    setSelecao([c.id])
  }

  const inserirSticker = (st, nome) => {
    const c = novoClipe('sticker', { inicio: tempo, dur: 4, sticker: { cor: '#fbbf24', ...st } })
    c.nome = nome
    definir(inserir(atual.current, c))
    setSelecao([c.id])
  }

  const importarLegendas = async (arq, [, estiloBruto, posBruta = { y: 380 }]) => {
    const [estilo, pos] = escalarTexto(estiloBruto, posBruta)
    if (!arq) return
    const falas = lerLegendas(await arq.text())
    if (!falas.length) return avisar('Não encontrei legendas nesse arquivo (use .srt ou .vtt).')
    const trilha = { id: uid(), tipo: 'texto', mudo: false, oculto: false, itens: [] }
    for (const f of falas) {
      const c = novoClipe('texto', { inicio: arred(f.ini), dur: arred(f.fim - f.ini), texto: { ...estilo, conteudo: f.txt } })
      c.t = { ...c.t, ...pos }
      c.nome = f.txt.split('\n')[0]
      trilha.itens.push(c)
    }
    definir({ ...atual.current, trilhas: [trilha, ...atual.current.trilhas] })
    avisar(`${falas.length} legendas adicionadas numa trilha nova.`)
  }

  const removerMidia = async (m) => {
    const usos = atual.current.trilhas.flatMap((t) => t.itens).filter((c) => c.midia === m.id)
    if (usos.length && !confirm(`"${m.nome}" está em ${usos.length} clipe(s). Apagar mesmo assim (os clipes saem da linha do tempo)?`)) return
    if (usos.length) definir(remover(atual.current, usos.map((c) => c.id)))
    await apagarMidia(m.id)
    const n = new Map(midias)
    n.delete(m.id)
    setMidias(n)
  }

  /* ---------- Ações da linha do tempo ---------- */

  const alvosNaAgulha = () => {
    const sob = clipesEm(atual.current, tempo).map(({ clipe }) => clipe.id)
    return selecao.length ? selecao.filter((x) => sob.includes(x)) : sob
  }

  const acoes = {
    dividir: () => {
      let p = atual.current
      const novos = []
      for (const idC of alvosNaAgulha()) {
        const [np, idNovo] = dividir(p, idC, tempo)
        p = np
        if (idNovo) novos.push(idNovo)
      }
      if (novos.length) {
        definir(p)
        setSelecao(novos)
      }
    },
    cortarAntes: () => {
      let p = atual.current
      for (const idC of alvosNaAgulha()) {
        const [np, idNovo] = dividir(p, idC, tempo)
        if (!idNovo) continue
        p = remover(np, [idC], ripple)
        if (ripple) setTempoBruto(acharClipe(p, idNovo)?.clipe.inicio ?? tempo)
      }
      definir(p)
    },
    cortarDepois: () => {
      let p = atual.current
      for (const idC of alvosNaAgulha()) {
        const [np, idNovo] = dividir(p, idC, tempo)
        if (idNovo) p = remover(np, [idNovo], ripple)
      }
      definir(p)
    },
    apagar: () => {
      if (!selecao.length) return
      definir(limparTrilhasVazias(remover(atual.current, selecao, ripple)))
      setSelecao([])
    },
    copiar: () => {
      const cs = atual.current.trilhas.flatMap((t) => t.itens).filter((c) => selecao.includes(c.id))
      if (!cs.length) return
      const base = Math.min(...cs.map((c) => c.inicio))
      copiados.current = cs.map((c) => ({ ...structuredClone(c), inicio: c.inicio - base }))
      avisar(`${cs.length} clipe(s) copiado(s).`)
    },
    colar: (em = tempo) => {
      if (!copiados.current?.length) return
      let p = atual.current
      const ids = []
      for (const c of copiados.current) {
        const novo = { ...structuredClone(c), id: uid(), inicio: arred(em + c.inicio) }
        p = inserir(p, novo)
        ids.push(novo.id)
      }
      definir(p)
      setSelecao(ids)
    },
    duplicar: () => {
      const cs = atual.current.trilhas.flatMap((t) => t.itens).filter((c) => selecao.includes(c.id))
      if (!cs.length) return
      const base = Math.min(...cs.map((c) => c.inicio))
      const fim = Math.max(...cs.map(fimDo))
      let p = atual.current
      const ids = []
      for (const c of cs) {
        const novo = { ...structuredClone(c), id: uid(), inicio: arred(fim + (c.inicio - base)) }
        p = inserir(p, novo)
        ids.push(novo.id)
      }
      definir(p)
      setSelecao(ids)
    },
    marcador: () => {
      const m = { id: uid(), t: arred(tempo), nota: '', cor: '#fbbf24', dur: 0 }
      definir({ ...atual.current, marcadores: [...(atual.current.marcadores || []), m] })
      setMarcadorSel(m.id)
      setSelecao([])
    },
  }

  const trilhaMudar = (idT, patch) =>
    definir({
      ...atual.current,
      trilhas: patch === null ? atual.current.trilhas.filter((t) => t.id !== idT) : atual.current.trilhas.map((t) => (t.id === idT ? { ...t, ...patch } : t)),
    })

  /* ---------- Teclado e colar ---------- */

  const teclado = useRef(null)
  teclado.current = (e) => {
    if (digitando(e.target) || exportar) return
    const ctrl = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    const feito = () => e.preventDefault()
    if (k === ' ' || (k === 'k' && !ctrl)) return feito(), setTocando((t) => !t)
    if (ctrl && k === 'z') return feito(), e.shiftKey ? refazer() : desfazer()
    if (ctrl && k === 'y') return feito(), refazer()
    if (ctrl && k === 'a') return feito(), setSelecao(atual.current.trilhas.flatMap((t) => t.itens.map((c) => c.id)))
    if (ctrl && k === 'c') return feito(), acoes.copiar()
    if (ctrl && k === 'd') return feito(), acoes.duplicar()
    if (ctrl && k === 'v') return copiados.current?.length ? (feito(), acoes.colar()) : undefined
    if (ctrl) return
    setTocando(false)
    if (k === 'j') return feito(), setTempo(tempo - 1)
    if (k === 'l') return feito(), setTempo(tempo + 1)
    if (k === 'arrowleft') return feito(), setTempo(tempo - (e.shiftKey ? 5 : quadro))
    if (k === 'arrowright') return feito(), setTempo(tempo + (e.shiftKey ? 5 : quadro))
    if (k === 'home' || k === 'enter') return feito(), setTempo(0)
    if (k === 'end') return feito(), setTempo(dur)
    if (k === 's') return feito(), acoes.dividir()
    if (k === 'q') return feito(), acoes.cortarAntes()
    if (k === 'w') return feito(), acoes.cortarDepois()
    if (k === 'delete' || k === 'backspace') {
      if (marcadorSel && !selecao.length) {
        definir({ ...atual.current, marcadores: atual.current.marcadores.filter((m) => m.id !== marcadorSel) })
        setMarcadorSel(null)
        return feito()
      }
      return feito(), acoes.apagar()
    }
    if (k === 'n') return feito(), setIma((x) => (avisar(`Ímã ${x ? 'desligado' : 'ligado'}.`), !x))
    if (k === 'm') return feito(), acoes.marcador()
    if (k === '+' || k === '=') return feito(), setZoom((z) => Math.min(600, z * 1.25))
    if (k === '-') return feito(), setZoom((z) => Math.max(4, z / 1.25))
    if (k === 'escape') return setSelecao([]), setMarcadorSel(null)
  }

  useEffect(() => {
    const tecla = (e) => teclado.current?.(e)
    const colar = (e) => {
      if (digitando(e.target)) return
      const arqs = [...(e.clipboardData?.files || [])]
      if (arqs.length) {
        e.preventDefault()
        importar(arqs)
        return
      }
      const texto = e.clipboardData?.getData('text/plain')
      if (texto && !copiados.current?.length) {
        e.preventDefault()
        inserirTexto({ conteudo: texto.slice(0, 500) })
      }
    }
    window.addEventListener('keydown', tecla)
    window.addEventListener('paste', colar)
    return () => {
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('paste', colar)
    }
  })

  if (!projeto)
    return (
      <div className="ed-app ed-carregando">
        <span className="spinner" aria-hidden="true" /> Abrindo o projeto…
      </div>
    )

  return (
    <div className="ed-app" ref={area}>
      <header className="ed-topo">
        <button type="button" className="ed-voltar" onClick={onSair} aria-label="Voltar aos projetos">
          ←
        </button>
        <input className="ed-nome" value={projeto.nome} onChange={(e) => mudarProjeto((p) => ({ ...p, nome: e.target.value }), 'nome')} aria-label="Nome do projeto" />
        <span className="ed-salvo" aria-live="polite">
          {salvo ? '✓ Salvo' : 'Salvando…'}
        </span>
        <span className="ed-espaco" />
        <button type="button" className="ed-icone" onClick={desfazer} disabled={!hist.current.passado.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
          ↶
        </button>
        <button type="button" className="ed-icone" onClick={refazer} disabled={!hist.current.futuro.length} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer">
          ↷
        </button>
        <button type="button" className="ed-btn ed-btn-primario" onClick={() => (setTocando(false), setExportar(true))} disabled={dur <= 0}>
          Exportar
        </button>
      </header>

      <div className="ed-meio">
        <Painel projeto={projeto} midias={midias} importar={importar} inserirMidia={inserirMidia} inserirTexto={inserirTexto} inserirSticker={inserirSticker} importarLegendas={importarLegendas} apagarMidia={removerMidia} tempo={tempo} />
        <Previa projeto={projeto} midias={midias} tempo={tempo} setTempo={setTempoBruto} tocando={tocando} setTocando={setTocando} selecao={selecao} selecionar={setSelecao} mudarClipe={mudarClipe} />
        <Propriedades projeto={projeto} midias={midias} selecao={selecao} tempo={tempo} setTempo={setTempo} mudarClipe={mudarClipe} mudarProjeto={mudarProjeto} acoes={acoes} marcadorSel={marcadorSel} setMarcadorSel={setMarcadorSel} kfCopiados={kfCopiados} />
      </div>

      <div className="ed-ferramentas" role="toolbar" aria-label="Linha do tempo">
        <button type="button" className="ed-icone" onClick={() => setTempo(0)} title="Início (Home)" aria-label="Ir para o início">
          ⏮
        </button>
        <button type="button" className="ed-play" onClick={() => setTocando((t) => !t)} title="Tocar/pausar (Espaço)" aria-label={tocando ? 'Pausar' : 'Tocar'}>
          {tocando ? '⏸' : '▶'}
        </button>
        <button type="button" className="ed-icone" onClick={() => setTempo(dur)} title="Fim (End)" aria-label="Ir para o fim">
          ⏭
        </button>
        <span className="ed-tempo">
          {fmtTempo(tempo, projeto.fps, true)} <span>/ {fmtTempo(dur, projeto.fps, true)}</span>
        </span>
        <span className="ed-sep" />
        <button type="button" className="ed-icone" onClick={acoes.dividir} title="Dividir na agulha (S)" aria-label="Dividir">
          ✂
        </button>
        <button type="button" className="ed-icone ed-texto-curto" onClick={acoes.cortarAntes} title="Apagar o que vem antes da agulha (Q)">
          ⇤✂
        </button>
        <button type="button" className="ed-icone ed-texto-curto" onClick={acoes.cortarDepois} title="Apagar o que vem depois da agulha (W)">
          ✂⇥
        </button>
        <button type="button" className="ed-icone" onClick={acoes.duplicar} disabled={!selecao.length} title="Duplicar (Ctrl+D)" aria-label="Duplicar">
          ⧉
        </button>
        <button type="button" className="ed-icone" onClick={acoes.apagar} disabled={!selecao.length} title="Apagar (Delete)" aria-label="Apagar">
          🗑
        </button>
        <button type="button" className="ed-icone" onClick={acoes.marcador} title="Marcador na agulha (M)" aria-label="Adicionar marcador">
          ⚑
        </button>
        <span className="ed-sep" />
        <button type="button" className={`ed-alternar ${ima ? 'ativo' : ''}`} onClick={() => setIma((x) => !x)} aria-pressed={ima} title="Ímã: gruda nas bordas dos clipes, na agulha e nos marcadores (N)">
          🧲 Ímã
        </button>
        <button type="button" className={`ed-alternar ${ripple ? 'ativo' : ''}`} onClick={() => setRipple((x) => !x)} aria-pressed={ripple} title="Ripple: ao apagar ou aparar, os clipes seguintes andam junto e não fica buraco">
          ⇆ Ripple
        </button>
        <span className="ed-espaco" />
        <button type="button" className="ed-icone" onClick={() => setZoom((z) => Math.max(4, z / 1.25))} aria-label="Diminuir zoom">
          −
        </button>
        <input type="range" min="4" max="600" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom da linha do tempo" className="ed-zoom" />
        <button type="button" className="ed-icone" onClick={() => setZoom((z) => Math.min(600, z * 1.25))} aria-label="Aumentar zoom">
          +
        </button>
      </div>

      <Linha
        projeto={projeto}
        midias={midias}
        tempo={tempo}
        setTempo={setTempo}
        tocando={tocando}
        setTocando={setTocando}
        selecao={selecao}
        selecionar={(ids) => {
          setSelecao(ids)
          if (ids.length) setMarcadorSel(null)
        }}
        definir={definir}
        ima={ima}
        ripple={ripple}
        zoom={zoom}
        setZoom={setZoom}
        marcadorSel={marcadorSel}
        setMarcadorSel={setMarcadorSel}
        trilhaMudar={trilhaMudar}
        onSoltar={(o, t, trilhaId) => {
          if (o.midia) {
            const m = midias.get(o.midia)
            if (m) inserirMidia(m, t, trilhaId)
          } else importar(o.arquivos, t, trilhaId)
        }}
      />

      {ocupado && (
        <div className="ed-ocupado" role="status">
          <span className="spinner" aria-hidden="true" /> {ocupado}
        </div>
      )}
      {aviso && (
        <div className="ed-toast" role="status">
          {aviso}
        </div>
      )}
      {exportar && <Exportar projeto={projeto} midias={midias} onFechar={() => setExportar(false)} />}
    </div>
  )
}
