'use client'

// Editor do Meu Jornal: criar/entrar, escrever matérias, escolher o peso (manchete, destaque, normal, curta),
// arrastar para priorizar, publicar ou deixar em rascunho, ver a prévia da capa e ajustar a aparência.

import { useCallback, useEffect, useRef, useState } from 'react'
import { moverItem, useOrdenavel } from '@/components/catalogo/useOrdenavel'
import { enviarFoto, fotoUrl, getToken, jn, setToken, temBackend } from '@/lib/jornal/api'
import { PESOS, SECOES, dataCurta } from '@/lib/jornal/formato'
import Capa from './Capa'

const slugDe = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30)
const VAZIA = { titulo: '', linha_fina: '', secao: '', autor: '', texto: '', foto: null, legenda: '', peso: 'normal', estado: 'rascunho' }

/* ------------------------------ entrar / criar ------------------------------ */
function Entrada({ aoEntrar }) {
  const [modo, setModo] = useState('criar')
  const [f, setF] = useState({ nome: '', slug: '', senha: '' })
  const [slugMexido, setSlugMexido] = useState(false)
  const [disp, setDisp] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const slug = slugMexido ? f.slug : slugDe(f.nome)

  useEffect(() => {
    if (modo !== 'criar' || slug.length < 3) { setDisp(null); return }
    const t = setTimeout(() => jn(`/disponivel/${encodeURIComponent(slug)}`).then(setDisp).catch(() => setDisp(null)), 400)
    return () => clearTimeout(t)
  }, [slug, modo])

  async function enviar(e) {
    e.preventDefault()
    setErro(''); setEnviando(true)
    try {
      const d = modo === 'criar'
        ? await jn('/cadastro', { metodo: 'POST', corpo: { nome: f.nome, slug, senha: f.senha } })
        : await jn('/login', { metodo: 'POST', corpo: { slug: f.slug, senha: f.senha } })
      setToken(d.token)
      aoEntrar()
    } catch (er) { setErro(er.message) } finally { setEnviando(false) }
  }

  return (
    <div className="je-entrada">
      <div className="je-entrada-papel">
        <p className="je-sobretitulo">Edição especial · Grátis</p>
        <h1 className="jn-letreiro-gotico">Meu Jornal</h1>
        <p className="je-lema">Seu jornalzinho com cara de jornal de papel. Escreva, escolha a manchete e compartilhe o link.</p>
        <div className="je-abas" role="tablist">
          <button role="tab" aria-selected={modo === 'criar'} className={modo === 'criar' ? 'ativo' : ''} onClick={() => setModo('criar')}>Criar meu jornal</button>
          <button role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'ativo' : ''} onClick={() => setModo('entrar')}>Já tenho um</button>
        </div>
        <form onSubmit={enviar} className="je-form">
          {modo === 'criar' ? (
            <>
              <label>Nome do jornal<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Gazeta do Bairro" maxLength={60} required /></label>
              <label>Link do jornal
                <span className="je-prefixo"><span>soudev.vercel.app/j/</span><input value={slug} onChange={(e) => { setSlugMexido(true); setF({ ...f, slug: slugDe(e.target.value) }) }} placeholder="gazeta-do-bairro" required /></span>
                {disp && <small className={disp.disponivel ? 'je-ok' : 'je-erro-txt'}>{disp.disponivel ? 'Disponível ✓' : disp.motivo || 'Já está em uso.'}</small>}
              </label>
            </>
          ) : (
            <label>Link do jornal<input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="gazeta-do-bairro" required /></label>
          )}
          <label>Senha<input type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} minLength={6} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} required /></label>
          {erro && <p className="je-erro">{erro}</p>}
          <button className="je-btn" disabled={enviando}>{enviando ? 'Aguarde…' : modo === 'criar' ? 'Criar jornal' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------ formulário da matéria ------------------------------ */
function FormMateria({ inicial, autorPadrao, secoesUsadas, aoSalvar, aoCancelar }) {
  const [m, setM] = useState(() => ({ ...VAZIA, autor: autorPadrao || '', ...inicial }))
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [subindo, setSubindo] = useState(false)
  const arquivo = useRef(null)
  const set = (k, v) => setM((x) => ({ ...x, [k]: v }))

  async function foto(e) {
    const a = e.target.files?.[0]
    e.target.value = ''
    if (!a) return
    setErro(''); setSubindo(true)
    try { set('foto', await enviarFoto(a)) } catch (er) { setErro(er.message) } finally { setSubindo(false) }
  }
  async function salvar(estado) {
    if (!m.titulo.trim()) { setErro('Dê um título à matéria.'); return }
    setErro(''); setEnviando(true)
    try { await aoSalvar({ ...m, estado }) } catch (er) { setErro(er.message); setEnviando(false) }
  }
  const publicada = inicial?.estado === 'publicada'

  return (
    <div className="je-materia-form">
      <div className="je-form-topo">
        <button className="je-btn texto" onClick={aoCancelar}>← Voltar</button>
        <h2>{inicial?.id ? 'Editar matéria' : 'Nova matéria'}</h2>
      </div>
      <label className="je-titulo-campo">Título<textarea rows={2} value={m.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Praça do bairro ganha bancos novos" maxLength={160} /></label>
      <label>Linha fina <small>(a frase abaixo do título)</small><input value={m.linha_fina} onChange={(e) => set('linha_fina', e.target.value)} placeholder="Ex.: Moradores se juntaram e reformaram tudo em um fim de semana" maxLength={280} /></label>
      <div className="je-grade2">
        <label>Seção<input value={m.secao} onChange={(e) => set('secao', e.target.value)} list="je-secoes" placeholder="Cidade, Esporte…" maxLength={30} /></label>
        <label>Autor<input value={m.autor} onChange={(e) => set('autor', e.target.value)} placeholder="Quem escreveu" maxLength={60} /></label>
      </div>
      <datalist id="je-secoes">{[...new Set([...secoesUsadas, ...SECOES])].map((s) => <option key={s} value={s} />)}</datalist>

      <fieldset className="je-pesos">
        <legend>Importância na capa</legend>
        {PESOS.map(([k, nome, explica]) => (
          <label key={k} className={m.peso === k ? 'ativo' : ''}>
            <input type="radio" name="peso" value={k} checked={m.peso === k} onChange={() => set('peso', k)} />
            <strong>{nome}</strong><span>{explica}</span>
          </label>
        ))}
      </fieldset>

      <div className="je-foto-campo">
        <span className="je-rotulo">Foto <small>(opcional)</small></span>
        {m.foto ? (
          <div className="je-foto-prev">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotoUrl(m.foto)} alt="" />
            <div>
              <input value={m.legenda} onChange={(e) => set('legenda', e.target.value)} placeholder="Legenda da foto" maxLength={200} aria-label="Legenda da foto" />
              <button className="je-btn texto" onClick={() => set('foto', null)}>Tirar foto</button>
            </div>
          </div>
        ) : (
          <button className="je-btn claro" onClick={() => arquivo.current?.click()} disabled={subindo}>{subindo ? 'Enviando…' : '📷 Escolher foto'}</button>
        )}
        <input ref={arquivo} type="file" accept="image/*" hidden onChange={foto} />
      </div>

      <label>Texto <small>(deixe uma linha em branco entre os parágrafos)</small>
        <textarea className="je-texto" rows={14} value={m.texto} onChange={(e) => set('texto', e.target.value)} placeholder="Escreva a matéria aqui…" maxLength={20000} />
      </label>

      {erro && <p className="je-erro">{erro}</p>}
      <div className="je-acoes">
        <button className="je-btn" onClick={() => salvar('publicada')} disabled={enviando || subindo}>{publicada ? 'Salvar' : 'Publicar agora'}</button>
        <button className="je-btn claro" onClick={() => salvar('rascunho')} disabled={enviando || subindo}>{publicada ? 'Tirar do ar (rascunho)' : 'Salvar rascunho'}</button>
      </div>
    </div>
  )
}

/* ------------------------------ configurações ------------------------------ */
function Configuracoes({ jornal, aoSalvar, aoSair }) {
  const [f, setF] = useState({ nome: jornal.nome, ...jornal.config })
  const [msg, setMsg] = useState('')
  const [senha, setSenha] = useState({ atual: '', nova: '' })
  const [msgSenha, setMsgSenha] = useState('')
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  async function salvar(e) {
    e.preventDefault()
    const { nome, ...config } = f
    try { await aoSalvar({ nome, config }); setMsg('Salvo ✓'); setTimeout(() => setMsg(''), 2500) } catch (er) { setMsg(er.message) }
  }
  async function trocarSenha(e) {
    e.preventDefault()
    try { await jn('/senha', { metodo: 'POST', corpo: senha }); setSenha({ atual: '', nova: '' }); setMsgSenha('Senha trocada ✓') } catch (er) { setMsgSenha(er.message) }
  }
  async function apagar() {
    const s = prompt('Isso apaga o jornal e todas as matérias, sem volta. Digite sua senha para confirmar:')
    if (!s) return
    try { await jn('/conta', { metodo: 'DELETE', corpo: { senha: s } }); aoSair() } catch (er) { alert(er.message) }
  }

  return (
    <div className="je-config">
      <form onSubmit={salvar} className="je-cartao">
        <h2>O jornal</h2>
        <label>Nome<input value={f.nome} onChange={(e) => set('nome', e.target.value)} maxLength={60} /></label>
        <label>Lema <small>(a frase embaixo do nome)</small><input value={f.lema} onChange={(e) => set('lema', e.target.value)} placeholder="Ex.: As notícias da nossa rua desde 2026" maxLength={120} /></label>
        <div className="je-grade2">
          <label>Cidade<input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="São Paulo" maxLength={60} /></label>
          <label>Preço de capa <small>(de brincadeira)</small><input value={f.preco} onChange={(e) => set('preco', e.target.value)} placeholder="R$ 1,00 ou Grátis" maxLength={20} /></label>
        </div>
        <label>Editor responsável <small>(também vira o autor padrão)</small><input value={f.editor} onChange={(e) => set('editor', e.target.value)} maxLength={80} /></label>
        <h2>Aparência</h2>
        <div className="je-opcoes">
          <span>Papel</span>
          {[['amarelado', 'Amarelado (antigo)'], ['branco', 'Branco']].map(([k, n]) => <label key={k} className={f.papel === k ? 'ativo' : ''}><input type="radio" name="papel" checked={f.papel === k} onChange={() => set('papel', k)} />{n}</label>)}
        </div>
        <div className="je-opcoes">
          <span>Letreiro</span>
          {[['gotico', 'Gótico'], ['classico', 'Clássico']].map(([k, n]) => <label key={k} className={`${f.letreiro === k ? 'ativo' : ''} jn-letreiro-${k}`}><input type="radio" name="letreiro" checked={f.letreiro === k} onChange={() => set('letreiro', k)} />{n}</label>)}
        </div>
        <label className="je-check"><input type="checkbox" checked={f.fotosPB} onChange={(e) => set('fotosPB', e.target.checked)} /> Fotos em preto e branco, como no papel</label>
        <div className="je-acoes"><button className="je-btn">Salvar</button>{msg && <span className="je-ok">{msg}</span>}</div>
      </form>
      <form onSubmit={trocarSenha} className="je-cartao">
        <h2>Senha</h2>
        <div className="je-grade2">
          <label>Senha atual<input type="password" value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} autoComplete="current-password" /></label>
          <label>Nova senha<input type="password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} minLength={6} autoComplete="new-password" /></label>
        </div>
        <div className="je-acoes"><button className="je-btn claro">Trocar senha</button>{msgSenha && <span>{msgSenha}</span>}</div>
      </form>
      <div className="je-cartao je-perigo"><button className="je-btn texto" onClick={apagar}>Apagar meu jornal</button></div>
    </div>
  )
}

/* ------------------------------ painel ------------------------------ */
export default function Editor() {
  const [fase, setFase] = useState('carregando')
  const [jornal, setJornal] = useState(null)
  const [materias, setMaterias] = useState([])
  const [limite, setLimite] = useState(80)
  const [aba, setAba] = useState('materias')
  const [editando, setEditando] = useState(null) // null | {} (nova) | matéria
  const [aviso, setAviso] = useState('')
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    if (!getToken()) { setFase('entrar'); return }
    try {
      const d = await jn('/eu')
      setJornal(d.jornal); setMaterias(d.materias); setLimite(d.limite); setFase('painel')
    } catch (er) {
      if (er.status === 401) { setToken(''); setFase('entrar') } else { setAviso(er.message); setFase('erro') }
    }
  }, [])
  useEffect(() => { if (temBackend()) carregar(); else setFase('sem-backend') }, [carregar])

  const avisar = (t) => { setAviso(t); setTimeout(() => setAviso(''), 3000) }
  const salvarOrdem = (lista) => jn('/materias/ordem', { metodo: 'POST', corpo: { ids: lista.map((m) => m.id) } }).catch((er) => avisar(er.message))
  const ord = useOrdenavel(materias, setMaterias, { onFim: salvarOrdem })
  const mover = (i, delta) => { const l = moverItem(materias, i, delta); setMaterias(l); salvarOrdem(l) }
  const paraTopo = (i) => { const l = [materias[i], ...materias.filter((_, j) => j !== i)]; setMaterias(l); salvarOrdem(l) }

  async function mudar(m, campos) {
    setMaterias((l) => l.map((x) => (x.id === m.id ? { ...x, ...campos, publicado_em: x.publicado_em || (campos.estado === 'publicada' ? Date.now() : null), atualizado_em: Date.now() } : x)))
    try { await jn(`/materias/${m.id}`, { metodo: 'PATCH', corpo: campos }) } catch (er) { avisar(er.message); carregar() }
  }
  async function apagar(m) {
    if (!confirm(`Apagar a matéria "${m.titulo}"?`)) return
    setMaterias((l) => l.filter((x) => x.id !== m.id))
    try { await jn(`/materias/${m.id}`, { metodo: 'DELETE' }) } catch (er) { avisar(er.message); carregar() }
  }
  async function salvarMateria(dados) {
    if (editando?.id) {
      await jn(`/materias/${editando.id}`, { metodo: 'PATCH', corpo: dados })
    } else {
      await jn('/materias', { metodo: 'POST', corpo: dados })
    }
    await carregar()
    setEditando(null)
    avisar(dados.estado === 'publicada' ? 'Publicada no jornal ✓' : 'Rascunho salvo ✓')
  }
  async function salvarJornal(dados) {
    const d = await jn('/jornal', { metodo: 'PATCH', corpo: dados })
    setJornal((j) => ({ ...j, ...d.jornal }))
  }
  async function sair() {
    await jn('/sair', { metodo: 'POST' }).catch(() => {})
    setToken(''); setJornal(null); setMaterias([]); setFase('entrar')
  }

  if (fase === 'carregando') return <div className="je je-centro"><p>Abrindo a redação…</p></div>
  if (fase === 'sem-backend') return <div className="je je-centro"><p>O Meu Jornal está fora do ar neste ambiente.</p></div>
  if (fase === 'erro') return <div className="je je-centro"><p>{aviso}</p><button className="je-btn" onClick={() => { setFase('carregando'); carregar() }}>Tentar de novo</button></div>
  if (fase === 'entrar') return <div className="je"><Entrada aoEntrar={() => { setFase('carregando'); carregar() }} /></div>

  const linkPublico = `${typeof window !== 'undefined' ? window.location.origin : ''}/j/${jornal.slug}`
  const publicadas = materias.filter((m) => m.estado === 'publicada').length
  const copiar = async () => { try { await navigator.clipboard.writeText(linkPublico); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch {} }

  return (
    <div className="je">
      <header className="je-topo">
        <a href="/" className="je-voltar" aria-label="Voltar ao soudev">←</a>
        <div className="je-topo-nome">
          <strong className={`jn-letreiro-${jornal.config.letreiro}`}>{jornal.nome}</strong>
          <span>{publicadas} publicada{publicadas === 1 ? '' : 's'} · {materias.length - publicadas} rascunho{materias.length - publicadas === 1 ? '' : 's'}{jornal.visitas ? ` · ${jornal.visitas} visita${jornal.visitas === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div className="je-topo-acoes">
          <button className="je-btn claro" onClick={copiar}>{copiado ? 'Link copiado!' : 'Copiar link'}</button>
          <a className="je-btn" href={`/j/${jornal.slug}`} target="_blank" rel="noopener">Ver o jornal ↗</a>
          <button className="je-btn texto" onClick={sair}>Sair</button>
        </div>
      </header>

      {!editando && (
        <nav className="je-abas je-abas-painel" role="tablist">
          {[['materias', 'Matérias'], ['previa', 'Prévia da capa'], ['jornal', 'Aparência e dados']].map(([k, n]) => (
            <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? 'ativo' : ''} onClick={() => setAba(k)}>{n}</button>
          ))}
        </nav>
      )}
      {aviso && <p className="je-aviso" role="status">{aviso}</p>}

      <main className="je-corpo">
        {editando ? (
          <FormMateria
            inicial={editando}
            autorPadrao={jornal.config.editor}
            secoesUsadas={[...new Set(materias.map((m) => m.secao).filter(Boolean))]}
            aoSalvar={salvarMateria}
            aoCancelar={() => setEditando(null)}
          />
        ) : aba === 'materias' ? (
          <section>
            <div className="je-lista-topo">
              <button className="je-btn" onClick={() => setEditando({})} disabled={materias.length >= limite}>+ Escrever matéria</button>
              <p>A ordem da lista é a ordem no jornal. Arraste pela alça <b>⠿</b> (ou use as setas) para priorizar.</p>
            </div>
            {materias.length === 0 ? (
              <div className="je-vazio">
                <p className="jn-letreiro-gotico">Extra! Extra!</p>
                <p>Seu jornal ainda não tem nenhuma matéria. Escreva a primeira e marque como <b>Manchete</b>.</p>
              </div>
            ) : (
              <ol className="je-lista">
                {materias.map((m, i) => (
                  <li key={m.id} ref={ord.ref(m.id)} {...ord.item(m.id)} className={`je-item peso-${m.peso}${m.estado === 'rascunho' ? ' rascunho' : ''}`}>
                    <button className="je-alca" {...ord.alca(m.id)} aria-label={`Arrastar "${m.titulo}"`}>⠿</button>
                    {m.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="je-mini" src={fotoUrl(m.foto)} alt="" />
                    ) : <span className="je-mini vazio">¶</span>}
                    <div className="je-item-info">
                      <button className="je-item-titulo" onClick={() => setEditando(m)}>{m.titulo}</button>
                      <span className="je-item-meta">
                        {m.secao && <>{m.secao} · </>}
                        {m.estado === 'publicada' ? `publicada ${dataCurta(m.publicado_em || m.criado_em)}` : 'rascunho'}
                      </span>
                    </div>
                    <select className="je-peso" value={m.peso} onChange={(e) => mudar(m, { peso: e.target.value })} aria-label="Importância">
                      {PESOS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                    </select>
                    <div className="je-item-acoes">
                      <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                      <button onClick={() => mover(i, 1)} disabled={i === materias.length - 1} aria-label="Descer">↓</button>
                      <button onClick={() => paraTopo(i)} disabled={i === 0} title="Levar para o topo">Topo</button>
                      <button className={m.estado === 'publicada' ? 'pub' : ''} onClick={() => mudar(m, { estado: m.estado === 'publicada' ? 'rascunho' : 'publicada' })}>
                        {m.estado === 'publicada' ? 'No ar' : 'Publicar'}
                      </button>
                      <button onClick={() => setEditando(m)}>Editar</button>
                      <button onClick={() => apagar(m)} aria-label={`Apagar "${m.titulo}"`}>✕</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="je-legenda">
              {PESOS.map(([k, n, e]) => <span key={k}><b className={`je-selo peso-${k}`}>{n}</b> {e}</span>)}
            </p>
          </section>
        ) : aba === 'previa' ? (
          <section className="je-previa">
            <p className="je-legenda">Assim está a capa agora (só as matérias publicadas aparecem).</p>
            <div className="je-previa-folha"><Capa jornal={jornal} materias={materias} /></div>
          </section>
        ) : (
          <Configuracoes jornal={jornal} aoSalvar={salvarJornal} aoSair={() => { setToken(''); setFase('entrar') }} />
        )}
      </main>
    </div>
  )
}
