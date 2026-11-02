'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { linkCom, lerDoLink, limparHash } from '@/lib/compartilhar'
import { Aviso, Compartilhar, uid, useLocal } from './comum'

const CORES = ['#e11d48', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#db2777', '#4f46e5', '#0d9488']
const cor = (id) => CORES[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length]
const iniciais = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

function demo() {
  const p = (id, nome, nascimento, extra = {}) => ({ id, nome, nascimento, falecimento: '', sexo: '', pais: [], conjuge: '', historia: '', ...extra })
  return {
    titulo: 'Família Souza',
    pessoas: [
      p('a1', 'José Souza', '1931', { falecimento: '2009', sexo: 'm', conjuge: 'a2', historia: 'Veio de Minas para trabalhar na lavoura de café. Abriu o primeiro armazém da rua.' }),
      p('a2', 'Maria Aparecida', '1935', { falecimento: '2018', sexo: 'f', conjuge: 'a1', historia: 'Fazia o melhor pão de queijo da cidade. Criou seis filhos e mais uns tantos sobrinhos.' }),
      p('b1', 'Antônio Souza', '1958', { sexo: 'm', pais: ['a1', 'a2'], conjuge: 'b2', historia: 'Ficou com o armazém e transformou em mercadinho.' }),
      p('b2', 'Lúcia Ferreira', '1961', { sexo: 'f', conjuge: 'b1' }),
      p('b3', 'Rosa Souza', '1962', { sexo: 'f', pais: ['a1', 'a2'], conjuge: 'b4', historia: 'Professora por 35 anos na escola do bairro.' }),
      p('b4', 'Carlos Mendes', '1960', { sexo: 'm', conjuge: 'b3' }),
      p('c1', 'Paulo Souza', '1985', { sexo: 'm', pais: ['b1', 'b2'], conjuge: 'c2' }),
      p('c2', 'Fernanda Lima', '1987', { sexo: 'f', conjuge: 'c1' }),
      p('c3', 'Juliana Souza', '1990', { sexo: 'f', pais: ['b1', 'b2'] }),
      p('c4', 'Marcos Mendes', '1988', { sexo: 'm', pais: ['b3', 'b4'] }),
      p('d1', 'Lara Souza', '2015', { sexo: 'f', pais: ['c1', 'c2'] }),
      p('d2', 'Theo Souza', '2019', { sexo: 'm', pais: ['c1', 'c2'] }),
    ],
  }
}

// Gerações: filho fica uma abaixo do pai/mãe mais novo(a); casal fica na mesma linha.
function geracoes(pessoas) {
  const porId = Object.fromEntries(pessoas.map((p) => [p.id, p]))
  const g = Object.fromEntries(pessoas.map((p) => [p.id, 0]))
  for (let volta = 0; volta < 30; volta++) {
    let mudou = false
    for (const p of pessoas) {
      let v = g[p.id]
      for (const pai of p.pais) if (porId[pai]) v = Math.max(v, g[pai] + 1)
      if (p.conjuge && porId[p.conjuge]) v = Math.max(v, g[p.conjuge])
      if (v !== g[p.id]) {
        g[p.id] = v
        mudou = true
      }
    }
    if (!mudou) break
  }
  const linhas = []
  const pos = {}
  const max = Math.max(0, ...Object.values(g))
  for (let n = 0; n <= max; n++) {
    const desta = pessoas.filter((p) => g[p.id] === n)
    // ordena pela posição média dos pais; depois por nascimento
    desta.sort((a, b) => {
      const m = (p) => (p.pais.length ? p.pais.reduce((s, x) => s + (pos[x] ?? 0), 0) / p.pais.length : p.conjuge && porId[p.conjuge]?.pais.length ? porId[p.conjuge].pais.reduce((s, x) => s + (pos[x] ?? 0), 0) / porId[p.conjuge].pais.length : 999)
      return m(a) - m(b) || String(a.nascimento).localeCompare(String(b.nascimento))
    })
    const grupos = []
    const usado = new Set()
    for (const p of desta) {
      if (usado.has(p.id)) continue
      usado.add(p.id)
      const c = p.conjuge && g[p.conjuge] === n && !usado.has(p.conjuge) ? porId[p.conjuge] : null
      if (c) usado.add(c.id)
      // quem é "da família" (tem pais na árvore) fica do lado de dentro
      grupos.push(c ? (p.pais.length || !c.pais.length ? [p, c] : [c, p]) : [p])
    }
    let i = 0
    for (const gr of grupos) for (const p of gr) pos[p.id] = i++
    linhas.push(grupos)
  }
  return linhas
}

export default function ArvoreFamilia() {
  const [local, setLocal] = useLocal('soudev-arvore-v1', demo)
  const [compartilhada, setCompartilhada] = useState(null)
  const [sel, setSel] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [link, setLink] = useState('')
  const [linhasSvg, setLinhasSvg] = useState([])
  const conteudo = useRef(null)

  useEffect(() => {
    const d = lerDoLink()
    if (d?.pessoas) setCompartilhada(d)
  }, [])

  const arvore = compartilhada || local
  const soLeitura = Boolean(compartilhada)
  const pessoas = arvore?.pessoas || []
  const porId = useMemo(() => Object.fromEntries(pessoas.map((p) => [p.id, p])), [pessoas])
  const linhas = useMemo(() => geracoes(pessoas), [pessoas])
  const atual = sel ? porId[sel] : null

  // desenha as ligações medindo os cartões na tela
  const desenhar = useCallback(() => {
    const raiz = conteudo.current
    if (!raiz) return
    const caixa = raiz.getBoundingClientRect()
    const r = (id) => {
      const el = raiz.querySelector(`[data-pid="${id}"]`)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: (b.left - caixa.left) / zoom, y: (b.top - caixa.top) / zoom, w: b.width / zoom, h: b.height / zoom }
    }
    const out = []
    const feitos = new Set()
    for (const p of pessoas) {
      if (p.conjuge && porId[p.conjuge] && !feitos.has([p.id, p.conjuge].sort().join())) {
        feitos.add([p.id, p.conjuge].sort().join())
        const a = r(p.id)
        const b = r(p.conjuge)
        if (a && b && Math.abs(a.y - b.y) < 5) {
          const [e, d] = a.x < b.x ? [a, b] : [b, a]
          out.push({ c: 'av-casal', d: `M${e.x + e.w} ${e.y + e.h / 2} L${d.x} ${d.y + d.h / 2}` })
        }
      }
      const pais = p.pais.map((x) => r(x)).filter(Boolean)
      const f = r(p.id)
      if (!pais.length || !f) continue
      const px = pais.reduce((s, q) => s + q.x + q.w / 2, 0) / pais.length
      const py = Math.max(...pais.map((q) => q.y + q.h)) + (pais.length === 2 ? 0 : 0)
      const meio = (py + f.y) / 2
      out.push({ c: '', d: `M${px} ${pais.length === 2 ? Math.max(...pais.map((q) => q.y + q.h / 2)) : py} L${px} ${meio} L${f.x + f.w / 2} ${meio} L${f.x + f.w / 2} ${f.y}` })
    }
    setLinhasSvg(out)
  }, [pessoas, porId, zoom])
  useLayoutEffect(() => {
    desenhar()
  }, [desenhar, linhas])
  useEffect(() => {
    const ro = new ResizeObserver(() => desenhar())
    if (conteudo.current) ro.observe(conteudo.current)
    return () => ro.disconnect()
  }, [desenhar])

  if (!arvore) return null

  const mudar = (fn) => setLocal((a) => ({ ...a, pessoas: fn(a.pessoas) }))
  const editar = (campo, v) => mudar((l) => l.map((p) => (p.id === sel ? { ...p, [campo]: v } : p)))
  const adicionar = (tipo) => {
    const id = uid()
    const base = { id, nome: '', nascimento: '', falecimento: '', sexo: '', pais: [], conjuge: '', historia: '' }
    mudar((l) => {
      const s = l.find((p) => p.id === sel)
      if (!s) return l
      if (tipo === 'pai') {
        const outro = s.pais.length === 1 ? l.find((p) => p.id === s.pais[0]) : null
        const casar = outro && !outro.conjuge
        return [
          ...l.map((p) => (p.id === sel ? { ...p, pais: [...p.pais, id] } : casar && p.id === outro.id ? { ...p, conjuge: id } : p)),
          { ...base, nome: 'Pai/Mãe', conjuge: casar ? outro.id : '' },
        ]
      }
      if (tipo === 'conjuge') return [...l.map((p) => (p.id === sel ? { ...p, conjuge: id } : p)), { ...base, nome: 'Cônjuge', conjuge: sel }]
      if (tipo === 'filho') return [...l, { ...base, nome: 'Filho(a)', pais: [sel, s.conjuge].filter(Boolean) }]
      if (tipo === 'irmao') return [...l, { ...base, nome: 'Irmão(ã)', pais: [...s.pais] }]
      return l
    })
    setSel(id)
  }
  const remover = () => {
    if (!confirm(`Remover ${atual.nome || 'esta pessoa'} da árvore?`)) return
    mudar((l) => l.filter((p) => p.id !== sel).map((p) => ({ ...p, pais: p.pais.filter((x) => x !== sel), conjuge: p.conjuge === sel ? '' : p.conjuge })))
    setSel(null)
  }
  const importar = () => {
    if (!confirm('Substituir a árvore deste navegador pela árvore do link?')) return
    setLocal(compartilhada)
    setCompartilhada(null)
    limparHash()
  }
  const parentes = atual
    ? {
        pais: atual.pais.map((x) => porId[x]).filter(Boolean),
        conjuge: porId[atual.conjuge],
        filhos: pessoas.filter((p) => p.pais.includes(atual.id)),
        irmaos: atual.pais.length ? pessoas.filter((p) => p.id !== atual.id && p.pais.some((x) => atual.pais.includes(x))) : [],
      }
    : null

  return (
    <div className="gp">
      {soLeitura && (
        <Aviso tom="alerta">
          Você está vendo a árvore <b>{arvore.titulo}</b> que alguém compartilhou (somente leitura).{' '}
          <button type="button" className="btn btn-primary btn-sm" onClick={importar}>Copiar para mim e editar</button>{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCompartilhada(null); limparHash() }}>Ver a minha árvore</button>
        </Aviso>
      )}
      <div className="gp-barra">
        {soLeitura ? <h3 className="gp-titulo">{arvore.titulo}</h3> : <input value={arvore.titulo} onChange={(e) => setLocal((a) => ({ ...a, titulo: e.target.value }))} aria-label="Nome da árvore" style={{ maxWidth: 280, fontWeight: 700 }} />}
        <span className="gp-sub">{pessoas.length} pessoas · {linhas.length} gerações</span>
        <span className="gp-espaco" />
        <div className="av-zoom">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} aria-label="Diminuir">−</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} aria-label="Aumentar">+</button>
        </div>
        {!soLeitura && <button type="button" className="btn btn-primary btn-sm" onClick={() => setLink(linkCom(arvore))}>Compartilhar</button>}
      </div>

      {link && !soLeitura && <Compartilhar link={link} mensagem={`Olha a árvore da ${arvore.titulo} 🌳`} titulo="Link da árvore" dica="Quem abrir vê a árvore e pode copiar para completar com o que sabe e te mandar de volta. Os dados vão dentro do link: nada fica guardado em servidor." />}

      <div className="gp-lado">
        <div className="av-palco">
          <div className="av-conteudo" ref={conteudo} style={{ transform: `scale(${zoom})` }}>
            <svg className="av-svg" aria-hidden="true">
              {linhasSvg.map((l, i) => <path key={i} d={l.d} className={l.c} />)}
            </svg>
            {linhas.map((grupos, i) => (
              <div key={i} className="av-geracao">
                {grupos.map((gr) => (
                  <div key={gr[0].id} className="av-casal-grupo">
                    {gr.map((p) => (
                      <button key={p.id} type="button" data-pid={p.id} className="av-pessoa" data-sel={sel === p.id || undefined} data-falecido={p.falecimento || undefined} onClick={() => setSel(p.id)}>
                        <span className="av-foto" style={{ background: cor(p.id) }}>{iniciais(p.nome)}</span>
                        <b>{p.nome || 'Sem nome'}</b>
                        <small>{p.nascimento ? `${p.nascimento}${p.falecimento ? ` – ${p.falecimento}` : ''}` : ' '}</small>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {!pessoas.length && (
              <button type="button" className="btn btn-primary" onClick={() => { const id = uid(); setLocal((a) => ({ ...a, pessoas: [{ id, nome: 'Eu', nascimento: '', falecimento: '', sexo: '', pais: [], conjuge: '', historia: '' }] })); setSel(id) }}>
                Começar por mim
              </button>
            )}
          </div>
        </div>

        <div className="gp-caixa av-ficha">
          {!atual ? (
            <>
              <b>Toque numa pessoa</b>
              <p className="gp-sub">Para ver a história, os parentes e {soLeitura ? 'os detalhes' : 'adicionar pai, mãe, cônjuge, filhos e irmãos'}.</p>
              {!soLeitura && (
                <div className="gp-barra">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Apagar a árvore e começar do zero?') && setLocal({ titulo: 'Minha família', pessoas: [] })}>Começar do zero</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Voltar para a árvore de exemplo?') && setLocal(demo())}>Ver exemplo</button>
                </div>
              )}
            </>
          ) : soLeitura ? (
            <>
              <div className="gp-linha"><span className="av-foto" style={{ background: cor(atual.id) }}>{iniciais(atual.nome)}</span><div><b>{atual.nome}</b><p className="gp-sub">{atual.nascimento}{atual.falecimento ? ` – ${atual.falecimento}` : ''}</p></div></div>
              {atual.historia && <p className="av-historia">{atual.historia}</p>}
            </>
          ) : (
            <>
              <div className="gp-linha">
                <span className="av-foto" style={{ background: cor(atual.id) }}>{iniciais(atual.nome)}</span>
                <input value={atual.nome} onChange={(e) => editar('nome', e.target.value)} aria-label="Nome" placeholder="Nome" autoFocus={!atual.nome || /^(Pai\/Mãe|Cônjuge|Filho\(a\)|Irmão\(ã\))$/.test(atual.nome)} />
                <button type="button" className="gp-x" onClick={() => setSel(null)} aria-label="Fechar">✕</button>
              </div>
              <div className="gp-grade2">
                <label className="gp-campo"><span>Nasceu (ano)</span><input value={atual.nascimento} onChange={(e) => editar('nascimento', e.target.value.slice(0, 10))} inputMode="numeric" /></label>
                <label className="gp-campo"><span>Faleceu (ano)</span><input value={atual.falecimento} onChange={(e) => editar('falecimento', e.target.value.slice(0, 10))} inputMode="numeric" placeholder="—" /></label>
              </div>
              <label className="gp-campo"><span>História, lembranças, receitas…</span><textarea value={atual.historia} onChange={(e) => editar('historia', e.target.value)} placeholder="De onde veio, o que fazia, um causo da família…" /></label>
              <div className="av-rel">
                <button type="button" className="btn btn-ghost btn-sm" disabled={atual.pais.length >= 2} onClick={() => adicionar('pai')}>＋ Pai/Mãe</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!!atual.conjuge} onClick={() => adicionar('conjuge')}>＋ Cônjuge</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => adicionar('filho')}>＋ Filho(a)</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!atual.pais.length} title={!atual.pais.length ? 'Adicione pai ou mãe primeiro' : ''} onClick={() => adicionar('irmao')}>＋ Irmão(ã)</button>
              </div>
              <div className="gp-sub" style={{ display: 'grid', gap: 2 }}>
                {parentes.pais.length > 0 && <span>Pais: {parentes.pais.map((p) => p.nome).join(' e ')}</span>}
                {parentes.conjuge && <span>Cônjuge: {parentes.conjuge.nome}</span>}
                {parentes.filhos.length > 0 && <span>Filhos: {parentes.filhos.map((p) => p.nome).join(', ')}</span>}
                {parentes.irmaos.length > 0 && <span>Irmãos: {parentes.irmaos.map((p) => p.nome).join(', ')}</span>}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start', color: '#dc2626' }} onClick={remover}>Remover da árvore</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
