'use client'

import { useMemo, useState } from 'react'
import { analisar, corrigir, csvParaJson, diffJson, estatisticas, ordenarChaves, paraCsv, paraTypescript, paraYaml, tipoDe, xmlCompleto } from '@/lib/dev/json'
import { Abas, Aviso, Codigo, Copiar, Seg, usePersistente } from './comum'

const EXEMPLO = `{
  "id": 42,
  "nome": "Ana Souza",
  "ativo": true,
  "saldo": 1520.75,
  "tags": ["cliente", "vip"],
  "endereco": { "cidade": "Campinas", "uf": "SP", "cep": "13000-000" },
  "pedidos": [
    { "id": 1, "total": 99.9, "itens": 3 },
    { "id": 2, "total": 15, "itens": 1, "cupom": "BEMVINDO" }
  ],
  "observacao": null
}`

function baixar(texto, nome, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Erro({ erro }) {
  return (
    <Aviso tipo="erro">
      <b>JSON inválido</b>
      {erro.linha && ` · linha ${erro.linha}, coluna ${erro.coluna}`}
      <br />
      {erro.msg}
    </Aviso>
  )
}

/* ------------------------------ árvore ------------------------------ */
function Valor({ v }) {
  const t = tipoDe(v)
  if (t === 'string') return <span className="dv-j-str">&quot;{v}&quot;</span>
  if (t === 'number') return <span className="dv-j-num">{String(v)}</span>
  if (t === 'boolean') return <span className="dv-j-bool">{String(v)}</span>
  return <span className="dv-j-null">null</span>
}
function No({ chave, v, caminho, nivel, aberto, onCaminho, filtro }) {
  const [abre, setAbre] = useState(aberto ?? nivel < 2)
  const t = tipoDe(v)
  const comp = t === 'object' || t === 'array'
  const filhos = comp ? (t === 'array' ? v.map((x, i) => [i, x]) : Object.entries(v)) : []
  const rotulo = chave !== undefined && (
    <span className="dv-j-chave" onClick={() => onCaminho(caminho)} title="Clique para copiar o caminho">
      {typeof chave === 'number' ? chave : `"${chave}"`}
    </span>
  )
  const casa = filtro && String(chave ?? '').toLowerCase().includes(filtro)
  if (!comp)
    return (
      <div className="dv-j-linha" data-casa={casa || undefined}>
        {rotulo}
        {rotulo && <span className="dv-j-pont">: </span>}
        <Valor v={v} />
      </div>
    )
  return (
    <div className="dv-j-no">
      <div className="dv-j-linha" data-casa={casa || undefined}>
        <button type="button" className="dv-j-seta" onClick={() => setAbre(!abre)} aria-label={abre ? 'Recolher' : 'Expandir'}>
          {abre ? '▾' : '▸'}
        </button>
        {rotulo}
        {rotulo && <span className="dv-j-pont">: </span>}
        <span className="dv-j-pont">{t === 'array' ? '[' : '{'}</span>
        {!abre && (
          <span className="dv-j-resumo" onClick={() => setAbre(true)}>
            {t === 'array' ? `${v.length} itens` : `${filhos.length} chaves`}
          </span>
        )}
        {!abre && <span className="dv-j-pont">{t === 'array' ? ']' : '}'}</span>}
      </div>
      {abre && (
        <div className="dv-j-filhos">
          {filhos.map(([k, x]) => (
            <No
              key={k}
              chave={k}
              v={x}
              nivel={nivel + 1}
              aberto={aberto}
              filtro={filtro}
              onCaminho={onCaminho}
              caminho={typeof k === 'number' ? `${caminho}[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `${caminho}.${k}` : `${caminho}[${JSON.stringify(k)}]`}
            />
          ))}
          <div className="dv-j-linha"><span className="dv-j-pont">{t === 'array' ? ']' : '}'}</span></div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ principal ------------------------------ */
export default function JsonToolkit() {
  const [aba, setAba] = useState('formatar')
  const [texto, setTexto] = usePersistente('4dev-json', EXEMPLO)
  const [indent, setIndent] = useState(2)
  const [ordenar, setOrdenar] = useState(false)
  const [b, setB] = usePersistente('4dev-json-b', '')
  const [formato, setFormato] = useState('yaml')
  const [caminho, setCaminho] = useState('')
  const [filtro, setFiltro] = useState('')
  const [chaveArvore, setChaveArvore] = useState(0)
  const [abertoTudo, setAbertoTudo] = useState(undefined)

  const r = useMemo(() => analisar(texto), [texto])
  const info = r.ok ? estatisticas(r.valor) : null
  const esp = indent === 'tab' ? '\t' : indent

  const formatar = () => r.ok && setTexto(JSON.stringify(ordenar ? ordenarChaves(r.valor) : r.valor, null, esp))
  const minificar = () => r.ok && setTexto(JSON.stringify(ordenar ? ordenarChaves(r.valor) : r.valor))
  const consertar = () => setTexto(corrigir(texto))

  const rb = useMemo(() => analisar(b), [b])
  const diferencas = useMemo(() => (r.ok && rb.ok ? diffJson(r.valor, rb.valor) : null), [r, rb])

  const convertido = useMemo(() => {
    if (formato === 'csv2json') {
      try {
        return JSON.stringify(csvParaJson(texto), null, 2)
      } catch (e) {
        return `Erro: ${e.message}`
      }
    }
    if (!r.ok) return ''
    if (formato === 'yaml') return paraYaml(r.valor)
    if (formato === 'csv') return paraCsv(r.valor)
    if (formato === 'ts') return paraTypescript(r.valor)
    if (formato === 'xml') return xmlCompleto(r.valor)
    return ''
  }, [formato, r, texto])

  const abrirArquivo = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) f.text().then(setTexto)
  }

  return (
    <div className="dv-ferramenta">
      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          ['formatar', 'Formatar e validar'],
          ['arvore', 'Árvore'],
          ['comparar', 'Comparar'],
          ['converter', 'Converter'],
        ]}
      />

      <div className="dv-barra">
        <span className="dv-status" data-ok={r.ok || undefined} data-erro={(!r.ok && !r.vazio) || undefined}>
          {r.vazio ? 'vazio' : r.ok ? `✓ válido · ${tipoDe(r.valor)} · ${info.chaves} chaves · prof. ${info.profundidade} · ${new Blob([texto]).size.toLocaleString('pt-BR')} bytes` : `✗ linha ${r.erro.linha ?? '?'}`}
        </span>
        <span className="dv-espaco" />
        <label className="dv-btn dv-btn-sec">
          Abrir arquivo
          <input type="file" accept=".json,.txt,.csv,application/json" hidden onChange={abrirArquivo} />
        </label>
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setTexto('')}>Limpar</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setTexto(EXEMPLO)}>Exemplo</button>
      </div>

      {aba === 'formatar' && (
        <>
          <div className="dv-barra">
            <button type="button" className="dv-btn" onClick={formatar} disabled={!r.ok}>Formatar</button>
            <button type="button" className="dv-btn dv-btn-sec" onClick={minificar} disabled={!r.ok}>Minificar</button>
            <button type="button" className="dv-btn dv-btn-sec" onClick={consertar} title="Remove comentários e vírgulas sobrando, troca aspas simples e põe aspas nas chaves">Corrigir</button>
            <Seg rotulo="Indentação" valor={indent} onChange={setIndent} opcoes={[[2, '2 esp.'], [4, '4 esp.'], ['tab', 'Tab']]} />
            <label className="dv-check">
              <input type="checkbox" checked={ordenar} onChange={(e) => setOrdenar(e.target.checked)} /> Ordenar chaves
            </label>
            <span className="dv-espaco" />
            <Copiar texto={texto} />
            <button type="button" className="dv-btn dv-btn-sec" onClick={() => baixar(texto, 'dados.json')} disabled={!r.ok}>Baixar</button>
          </div>
          {!r.ok && !r.vazio && <Erro erro={r.erro} />}
          <Codigo valor={texto} onChange={setTexto} linhas={22} rotulo="JSON" placeholder="Cole o JSON aqui…" erroLinha={r.erro?.linha} />
        </>
      )}

      {aba === 'arvore' && (
        <>
          {!r.ok ? (
            r.vazio ? <Aviso>Cole um JSON na aba Formatar.</Aviso> : <Erro erro={r.erro} />
          ) : (
            <>
              <div className="dv-barra">
                <input className="dv-input" placeholder="Destacar chave…" value={filtro} onChange={(e) => setFiltro(e.target.value.toLowerCase())} style={{ maxWidth: 220 }} />
                <button type="button" className="dv-btn dv-btn-sec" onClick={() => { setAbertoTudo(true); setChaveArvore((k) => k + 1) }}>Expandir tudo</button>
                <button type="button" className="dv-btn dv-btn-sec" onClick={() => { setAbertoTudo(false); setChaveArvore((k) => k + 1) }}>Recolher tudo</button>
                <span className="dv-espaco" />
                {caminho && (
                  <>
                    <code className="dv-caminho">{caminho}</code>
                    <Copiar texto={caminho} rotulo="Copiar caminho" />
                  </>
                )}
              </div>
              <p className="dv-dica">Clique no nome de uma chave para ver o caminho dela (JSONPath).</p>
              <div className="dv-arvore" key={chaveArvore}>
                <No v={r.valor} caminho="$" nivel={0} aberto={abertoTudo} filtro={filtro} onCaminho={setCaminho} />
              </div>
            </>
          )}
        </>
      )}

      {aba === 'comparar' && (
        <>
          <div className="dv-grade2">
            <div>
              <p className="dv-rotulo">A (original) {!r.ok && !r.vazio && <span className="dv-erro-txt">· inválido, linha {r.erro.linha}</span>}</p>
              <Codigo valor={texto} onChange={setTexto} linhas={14} rotulo="JSON A" erroLinha={r.erro?.linha} />
            </div>
            <div>
              <p className="dv-rotulo">B (novo) {!rb.ok && !rb.vazio && <span className="dv-erro-txt">· inválido, linha {rb.erro.linha}</span>}</p>
              <Codigo valor={b} onChange={setB} linhas={14} rotulo="JSON B" placeholder="Cole o segundo JSON…" erroLinha={rb.erro?.linha} />
            </div>
          </div>
          {diferencas &&
            (diferencas.length ? (
              <div className="dv-tabela-scroll">
                <table className="dv-tabela">
                  <thead>
                    <tr><th>Caminho</th><th>Mudança</th><th>A</th><th>B</th></tr>
                  </thead>
                  <tbody>
                    {diferencas.map((d) => (
                      <tr key={d.caminho} data-t={d.tipo}>
                        <td><code>{d.caminho}</code></td>
                        <td>{{ adicionado: '+ adicionado', removido: '− removido', alterado: '~ alterado', tipo: '≠ tipo mudou' }[d.tipo]}</td>
                        <td><code>{d.de === undefined ? '' : JSON.stringify(d.de)?.slice(0, 120)}</code></td>
                        <td><code>{d.para === undefined ? '' : JSON.stringify(d.para)?.slice(0, 120)}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="dv-dica">{diferencas.length} diferença(s). A ordem das chaves não conta como diferença.</p>
              </div>
            ) : (
              <Aviso tipo="ok">Os dois JSONs são equivalentes.</Aviso>
            ))}
        </>
      )}

      {aba === 'converter' && (
        <>
          <div className="dv-barra">
            <Seg rotulo="Converter para" valor={formato} onChange={setFormato} opcoes={[['yaml', 'YAML'], ['csv', 'CSV'], ['ts', 'TypeScript'], ['xml', 'XML'], ['csv2json', 'CSV → JSON']]} />
            <span className="dv-espaco" />
            <Copiar texto={convertido} />
            <button
              type="button"
              className="dv-btn dv-btn-sec"
              disabled={!convertido}
              onClick={() => baixar(convertido, { yaml: 'dados.yaml', csv: 'dados.csv', ts: 'tipos.ts', xml: 'dados.xml', csv2json: 'dados.json' }[formato], 'text/plain')}
            >
              Baixar
            </button>
          </div>
          <div className="dv-grade2">
            <div>
              <p className="dv-rotulo">{formato === 'csv2json' ? 'CSV de entrada' : 'JSON de entrada'}</p>
              <Codigo valor={texto} onChange={setTexto} linhas={18} rotulo="Entrada" erroLinha={formato === 'csv2json' ? null : r.erro?.linha} />
            </div>
            <div>
              <p className="dv-rotulo">Resultado</p>
              {formato !== 'csv2json' && !r.ok && !r.vazio ? <Erro erro={r.erro} /> : <Codigo valor={convertido} somenteLeitura linhas={18} rotulo="Resultado" />}
            </div>
          </div>
          {formato === 'csv' && <p className="dv-dica">Objetos aninhados viram colunas com ponto (endereco.cidade); listas viram JSON dentro da célula.</p>}
        </>
      )}
    </div>
  )
}
