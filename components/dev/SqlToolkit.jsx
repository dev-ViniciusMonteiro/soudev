'use client'

import { useMemo, useState } from 'react'
import { diffLinhas } from '@/lib/dev/diff'
import { csvParaJson, analisar } from '@/lib/dev/json'
import { DIALETOS, converter, explicarSql, formatar, gerarInsert, minificar } from '@/lib/dev/sql'
import { Abas, Aviso, Codigo, Copiar, Seg, VerDiff, usePersistente } from './comum'

const EXEMPLO = `select u.id, u.nome, count(p.id) as total_pedidos, sum(p.valor) as gasto
from usuarios u left join pedidos p on p.usuario_id = u.id and p.status = 'pago'
where u.ativo = true and lower(u.email) like '%gmail%' and u.criado_em between '2026-01-01' and '2026-12-31'
group by u.id, u.nome having count(p.id) > 2 order by gasto desc limit 10;`

const EXEMPLO_DADOS = `id,nome,email,ativo,saldo
1,Ana Souza,ana@exemplo.com,true,1520.75
2,Bruno Lima,bruno@exemplo.com,false,0
3,Carla D'Ávila,carla@exemplo.com,true,89.9`

function Formatar({ sql, setSql }) {
  const [caixa, setCaixa] = useState('maiusculas')
  const [ind, setInd] = useState('  ')
  const saida = useMemo(() => formatar(sql, { caixa, indent: ind }), [sql, caixa, ind])
  return (
    <>
      <div className="dv-barra">
        <button type="button" className="dv-btn" onClick={() => setSql(saida)}>Aplicar formatação</button>
        <button type="button" className="dv-btn dv-btn-sec" onClick={() => setSql(minificar(sql))}>Minificar</button>
        <Seg rotulo="Palavras-chave" valor={caixa} onChange={setCaixa} opcoes={[['maiusculas', 'MAIÚSC.'], ['minusculas', 'minúsc.'], ['manter', 'Manter']]} />
        <Seg rotulo="Indentação" valor={ind} onChange={setInd} opcoes={[['  ', '2'], ['    ', '4'], ['\t', 'Tab']]} />
      </div>
      <div className="dv-grade2">
        <div>
          <p className="dv-rotulo">Sua query</p>
          <Codigo valor={sql} onChange={setSql} linhas={20} rotulo="SQL" placeholder="Cole o SQL aqui…" />
        </div>
        <div>
          <div className="dv-barra"><p className="dv-rotulo">Formatado</p><span className="dv-espaco" /><Copiar texto={saida} /></div>
          <Codigo valor={saida} somenteLeitura linhas={20} rotulo="SQL formatado" />
        </div>
      </div>
    </>
  )
}

function Explicar({ sql, setSql }) {
  const e = useMemo(() => explicarSql(sql), [sql])
  return (
    <div className="dv-grade2">
      <div>
        <p className="dv-rotulo">Sua query</p>
        <Codigo valor={sql} onChange={setSql} linhas={18} rotulo="SQL" />
      </div>
      <div>
        {!e.passos.length && !e.alertas.length ? (
          <Aviso>Cole uma query para ver a explicação.</Aviso>
        ) : (
          <>
            {e.alertas.length > 0 && (
              <div className="dv-alertas">
                {e.alertas.map((a, i) => (
                  <Aviso key={i} tipo={a.n === 'perigo' ? 'erro' : a.n === 'aviso' ? 'alerta' : 'info'}>
                    {a.n === 'perigo' ? '⛔ ' : a.n === 'aviso' ? '⚠ ' : 'ℹ '}
                    {a.t}
                  </Aviso>
                ))}
              </div>
            )}
            <ol className="dv-passos">
              {e.passos.map((p, i) => (
                <li key={i}>
                  <b>{p.t}</b>
                  {p.d && <code>{p.d}</code>}
                </li>
              ))}
            </ol>
            {!e.alertas.length && <Aviso tipo="ok">Nenhum problema comum encontrado.</Aviso>}
          </>
        )}
      </div>
    </div>
  )
}

function Converter({ sql, setSql }) {
  const [destino, setDestino] = useState('sqlserver')
  const r = useMemo(() => converter(sql, destino), [sql, destino])
  return (
    <>
      <div className="dv-barra">
        <span className="dv-rotulo">Converter para</span>
        <Seg rotulo="Banco de destino" valor={destino} onChange={setDestino} opcoes={DIALETOS} />
      </div>
      <div className="dv-grade2">
        <div>
          <p className="dv-rotulo">Query de origem (qualquer banco)</p>
          <Codigo valor={sql} onChange={setSql} linhas={16} rotulo="SQL de origem" />
        </div>
        <div>
          <div className="dv-barra"><p className="dv-rotulo">{DIALETOS.find((d) => d[0] === destino)[1]}</p><span className="dv-espaco" /><Copiar texto={r.sql} /></div>
          <Codigo valor={r.sql} somenteLeitura linhas={16} rotulo="SQL convertido" />
        </div>
      </div>
      {r.notas.map((n) => <Aviso key={n} tipo="alerta">⚠ {n}</Aviso>)}
      <p className="dv-dica">Converte aspas de nomes, LIMIT ⇄ TOP ⇄ OFFSET/FETCH, NOW/GETDATE, IFNULL/ISNULL → COALESCE, LEN/LENGTH, TRUE/FALSE, || e auto incremento. Revise antes de rodar.</p>
    </>
  )
}

function GerarInsert() {
  const [dados, setDados] = usePersistente('4dev-sql-dados', EXEMPLO_DADOS)
  const [tabela, setTabela] = useState('clientes')
  const [dialeto, setDialeto] = useState('postgres')
  const [criar, setCriar] = useState(true)
  const r = useMemo(() => {
    const t = dados.trim()
    if (!t) return { sql: '' }
    try {
      let linhas
      if (t.startsWith('[') || t.startsWith('{')) {
        const a = analisar(t)
        if (!a.ok) return { erro: `JSON inválido: ${a.erro.msg} (linha ${a.erro.linha})` }
        linhas = Array.isArray(a.valor) ? a.valor : [a.valor]
      } else linhas = csvParaJson(t)
      return { sql: gerarInsert(linhas, { tabela: tabela.trim() || 'tabela', dialeto, criar }), n: linhas.length }
    } catch (e) {
      return { erro: e.message }
    }
  }, [dados, tabela, dialeto, criar])
  return (
    <>
      <div className="dv-barra">
        <label className="dv-check">Tabela <input className="dv-input" value={tabela} onChange={(e) => setTabela(e.target.value)} style={{ width: 140 }} /></label>
        <Seg rotulo="Banco" valor={dialeto} onChange={setDialeto} opcoes={DIALETOS} />
        <label className="dv-check"><input type="checkbox" checked={criar} onChange={(e) => setCriar(e.target.checked)} /> CREATE TABLE</label>
      </div>
      <div className="dv-grade2">
        <div>
          <p className="dv-rotulo">CSV ou JSON (lista de objetos)</p>
          <Codigo valor={dados} onChange={setDados} linhas={16} rotulo="Dados" />
        </div>
        <div>
          <div className="dv-barra"><p className="dv-rotulo">{r.n ? `${r.n} linha(s)` : 'SQL'}</p><span className="dv-espaco" /><Copiar texto={r.sql || ''} /></div>
          {r.erro ? <Aviso tipo="erro">{r.erro}</Aviso> : <Codigo valor={r.sql} somenteLeitura linhas={16} rotulo="INSERT gerado" />}
        </div>
      </div>
      <p className="dv-dica">Os tipos das colunas são deduzidos dos valores (número, texto, data, booleano). Aspas simples são escapadas.</p>
    </>
  )
}

function Comparar({ sql, setSql }) {
  const [b, setB] = usePersistente('4dev-sql-b', '')
  const fa = useMemo(() => formatar(sql), [sql])
  const fb = useMemo(() => formatar(b), [b])
  const iguais = b.trim() && minificar(fa).toUpperCase() === minificar(fb).toUpperCase()
  const partes = useMemo(() => (b.trim() ? diffLinhas(fa, fb) : []), [fa, fb, b])
  return (
    <>
      <div className="dv-grade2">
        <div>
          <p className="dv-rotulo">Query A</p>
          <Codigo valor={sql} onChange={setSql} linhas={10} rotulo="Query A" />
        </div>
        <div>
          <p className="dv-rotulo">Query B</p>
          <Codigo valor={b} onChange={setB} linhas={10} rotulo="Query B" placeholder="Cole a outra versão…" />
        </div>
      </div>
      {b.trim() &&
        (iguais ? (
          <Aviso tipo="ok">As duas queries são iguais (só mudam espaços, quebras de linha ou maiúsculas).</Aviso>
        ) : (
          <>
            <p className="dv-dica">Comparação depois de formatar as duas do mesmo jeito: só aparecem as mudanças reais.</p>
            <VerDiff partes={partes} />
          </>
        ))}
    </>
  )
}

export default function SqlToolkit() {
  const [aba, setAba] = useState('formatar')
  const [sql, setSql] = usePersistente('4dev-sql', EXEMPLO)
  return (
    <div className="dv-ferramenta">
      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          ['formatar', 'Formatar'],
          ['explicar', 'Explicar'],
          ['converter', 'Converter banco'],
          ['insert', 'CSV/JSON → INSERT'],
          ['comparar', 'Comparar'],
        ]}
      />
      {aba === 'formatar' && <Formatar sql={sql} setSql={setSql} />}
      {aba === 'explicar' && <Explicar sql={sql} setSql={setSql} />}
      {aba === 'converter' && <Converter sql={sql} setSql={setSql} />}
      {aba === 'insert' && <GerarInsert />}
      {aba === 'comparar' && <Comparar sql={sql} setSql={setSql} />}
    </div>
  )
}
