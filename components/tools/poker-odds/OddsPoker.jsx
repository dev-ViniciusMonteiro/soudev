'use client'

// Calculadora de odds de Texas Hold'em, para estudo: clique nas suas 2 cartas e nas da mesa, marque quantos
// estão na mesa e quem correu, e veja a chance de vencer, os outs e se vale continuar na mão.

import { useEffect, useMemo, useRef, useState } from 'react'
import './poker-odds.css'
import {
  CATEGORIAS, NAIPES, avaliar, calcularOuts, carta, categoriaDe, criarSimulacao, faixaInicial, naipeDe, nomeValor, recomendar, textoCarta, valorDe,
} from '@/lib/poker-odds'

const SLOTS = [
  { grupo: 'mao', rotulo: 'Sua carta 1' }, { grupo: 'mao', rotulo: 'Sua carta 2' },
  { grupo: 'mesa', rotulo: 'Flop 1' }, { grupo: 'mesa', rotulo: 'Flop 2' }, { grupo: 'mesa', rotulo: 'Flop 3' },
  { grupo: 'mesa', rotulo: 'Turn' }, { grupo: 'mesa', rotulo: 'River' },
]
const FAIXAS = [
  [1, 'Qualquer mão', 'Cada adversário pode ter qualquer par de cartas.'],
  [0.5, 'Mãos razoáveis', 'Quem continua na mão costuma ter algo: as 50% melhores mãos iniciais.'],
  [0.25, 'Mãos boas', 'Mesa apertada ou aposta grande: as 25% melhores.'],
  [0.1, 'Só mãos fortes', 'Aumentaram muito: as 10% melhores (pares altos, AK, AQ…).'],
]
const ALVO = 60000
const RUAS = ['Pré-flop', '', '', 'Flop', 'Turn', 'River']

function Carta({ c, pequena, vazia, rotulo, ativa, onClick }) {
  if (vazia) return <button type="button" className={`po-carta vazia${ativa ? ' ativa' : ''}${pequena ? ' pequena' : ''}`} onClick={onClick} aria-label={`${rotulo}: vazia`}><span>{rotulo}</span></button>
  const n = NAIPES[naipeDe(c)]
  return (
    <button type="button" className={`po-carta${n.vermelho ? ' vermelha' : ''}${ativa ? ' ativa' : ''}${pequena ? ' pequena' : ''}`} onClick={onClick} aria-label={`${rotulo || ''} ${nomeValor(valorDe(c))} de ${n.nome}`}>
      <b>{nomeValor(valorDe(c))}</b><i>{n.simbolo}</i>
    </button>
  )
}

export default function OddsPoker() {
  const [slots, setSlots] = useState(Array(7).fill(null))
  const [alvo, setAlvo] = useState(0)
  const [jogadores, setJogadores] = useState(6)
  const [correram, setCorreram] = useState([]) // índices dos adversários que correram
  const [pote, setPote] = useState('')
  const [aPagar, setAPagar] = useState('')
  const [faixa, setFaixa] = useState(1)
  const [res, setRes] = useState(null)

  // guarda as preferências da mesa (não as cartas)
  useEffect(() => {
    try { const d = JSON.parse(localStorage.getItem('poker-odds-v1') || '{}'); if (d.jogadores) setJogadores(d.jogadores); if (d.faixa) setFaixa(d.faixa) } catch {}
    // ?exemplo=1 (banner): A♥ K♥ com flush draw no flop, 6 na mesa, 2 correram
    if (new URLSearchParams(window.location.search).get('exemplo') === '1') {
      setSlots([carta(14, 1), carta(13, 1), carta(2, 1), carta(7, 1), carta(12, 3), null, null])
      setAlvo(5); setJogadores(6); setCorreram([0, 2]); setPote('100'); setAPagar('25'); setFaixa(0.5)
    }
  }, [])
  useEffect(() => { try { localStorage.setItem('poker-odds-v1', JSON.stringify({ jogadores, faixa })) } catch {} }, [jogadores, faixa])

  const minhas = slots.slice(0, 2).filter((c) => c !== null)
  const mesa = slots.slice(2).filter((c) => c !== null)
  const usadas = new Set(slots.filter((c) => c !== null))
  const ativos = Math.max(0, jogadores - 1 - correram.filter((i) => i < jogadores - 1).length)
  const pronto = minhas.length === 2 && ativos > 0 && [0, 3, 4, 5].includes(mesa.length)
  const chave = `${slots.join(',')}|${ativos}|${faixa}`

  // simulação em pedaços: os números vão se firmando sem travar a tela
  const corrida = useRef(0)
  useEffect(() => {
    const id = ++corrida.current
    if (!pronto) { setRes(null); return }
    const sim = criarSimulacao({ minhas, mesa, adversarios: ativos, faixa })
    const passo = Math.max(500, Math.round(16000 / (ativos + 1)))
    let parado = false
    const rodar = () => {
      if (parado || id !== corrida.current) return
      const r = sim.rodar(passo)
      setRes({ ...r, categorias: [...r.categorias] })
      if (r.jogos < ALVO) setTimeout(rodar, 0)
    }
    const t = setTimeout(rodar, 60)
    return () => { parado = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, pronto])

  const outs = useMemo(() => (minhas.length === 2 ? calcularOuts(minhas, mesa) : []), [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  const setOuts = useMemo(() => new Set(outs.map((o) => o.carta)), [outs])
  const maoAtual = minhas.length === 2 && mesa.length >= 3 ? CATEGORIAS[categoriaDe(avaliar([...minhas, ...mesa]))] : null
  const inicial = minhas.length === 2 ? faixaInicial(minhas[0], minhas[1]) : null
  const equidade = res && res.jogos ? res.equidade / res.jogos : null
  const num = (v) => Math.max(0, Number(String(v).replace(',', '.')) || 0)
  const rec = equidade !== null ? recomendar({ equidade, pote: num(pote), aPagar: num(aPagar), ativos }) : null
  const restantes = 52 - usadas.size

  function escolher(c) {
    if (usadas.has(c)) { setSlots((s) => s.map((x) => (x === c ? null : x))); return }
    const n = [...slots]
    let i = n[alvo] === null ? alvo : n.findIndex((x) => x === null)
    if (i < 0) i = alvo
    n[i] = c
    setSlots(n)
    const prox = n.findIndex((x) => x === null)
    setAlvo(prox < 0 ? i : prox)
  }
  function clicarSlot(i) {
    if (slots[i] !== null) setSlots((s) => s.map((x, j) => (j === i ? null : x)))
    setAlvo(i)
  }
  const novaMao = () => { setSlots(Array(7).fill(null)); setAlvo(0); setCorreram([]); setAPagar(''); setPote('') }
  const alternarCorreu = (i) => setCorreram((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]))
  const rua = minhas.length === 2 ? RUAS[mesa.length] || 'Complete o flop (3 cartas)' : ''

  return (
    <div className="po">
      <section className="po-mesa" aria-label="Cartas">
        <div className="po-grupo">
          <h3>Suas cartas</h3>
          <div className="po-slots">{[0, 1].map((i) => <Carta key={i} c={slots[i]} vazia={slots[i] === null} rotulo={SLOTS[i].rotulo} ativa={alvo === i} onClick={() => clicarSlot(i)} />)}</div>
        </div>
        <div className="po-grupo">
          <h3>Mesa {rua && <small>· {rua}</small>}</h3>
          <div className="po-slots">{[2, 3, 4, 5, 6].map((i) => <Carta key={i} c={slots[i]} vazia={slots[i] === null} rotulo={SLOTS[i].rotulo} ativa={alvo === i} onClick={() => clicarSlot(i)} />)}</div>
        </div>
        <button type="button" className="btn po-nova" onClick={novaMao}>Nova mão</button>
      </section>

      <section className="po-baralho" aria-label="Baralho: toque para escolher">
        <p className="muted small">Toque na carta para colocar em <b>{SLOTS[alvo].rotulo}</b>. Toque de novo para tirar.{outs.length > 0 && <> Cartas com borda verde são os seus <b>outs</b>.</>}</p>
        {NAIPES.map((n, ni) => (
          <div key={n.id} className="po-linha">
            {[14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((v) => {
              const c = carta(v, ni)
              const usada = usadas.has(c)
              return (
                <button key={c} type="button" className={`po-mini${n.vermelho ? ' vermelha' : ''}${usada ? ' usada' : ''}${setOuts.has(c) ? ' out' : ''}`} onClick={() => escolher(c)} aria-pressed={usada} aria-label={`${nomeValor(v)} de ${n.nome}`}>
                  <b>{nomeValor(v)}</b><i>{n.simbolo}</i>
                </button>
              )
            })}
          </div>
        ))}
      </section>

      <div className="po-duas">
        <section className="po-cartao">
          <h3>Jogadores</h3>
          <label className="po-linha-campo">Na mesa (com você)
            <span className="po-stepper">
              <button type="button" onClick={() => setJogadores((j) => Math.max(2, j - 1))} aria-label="Menos jogadores">−</button>
              <b>{jogadores}</b>
              <button type="button" onClick={() => setJogadores((j) => Math.min(10, j + 1))} aria-label="Mais jogadores">+</button>
            </span>
          </label>
          <p className="muted small">Toque em quem <b>correu</b> (desistiu da mão):</p>
          <div className="po-assentos">
            <span className="po-assento eu">Você</span>
            {Array.from({ length: jogadores - 1 }, (_, i) => (
              <button key={i} type="button" className={`po-assento${correram.includes(i) ? ' correu' : ''}`} onClick={() => alternarCorreu(i)} aria-pressed={correram.includes(i)}>
                J{i + 1}{correram.includes(i) ? ' · correu' : ''}
              </button>
            ))}
          </div>
          <p className="po-ativos"><b>{ativos}</b> adversário{ativos === 1 ? '' : 's'} ainda na mão</p>
          <label className="po-linha-campo">Mãos dos adversários
            <select value={faixa} onChange={(e) => setFaixa(Number(e.target.value))}>
              {FAIXAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
          </label>
          <p className="muted small">{FAIXAS.find((f) => f[0] === faixa)?.[2]}</p>
        </section>

        <section className="po-cartao">
          <h3>Aposta <small className="muted">(opcional)</small></h3>
          <div className="po-dois-campos">
            <label>Pote agora<input inputMode="decimal" value={pote} onChange={(e) => setPote(e.target.value)} placeholder="ex.: 100" /></label>
            <label>Para pagar<input inputMode="decimal" value={aPagar} onChange={(e) => setAPagar(e.target.value)} placeholder="ex.: 20" /></label>
          </div>
          <p className="muted small">Com o pote e o valor para pagar, a calculadora compara a sua chance com o preço da aposta (pot odds).</p>
        </section>
      </div>

      <section className="po-resultado" aria-live="polite">
        {!pronto ? (
          <p className="po-dica">
            {minhas.length < 2 ? 'Escolha as suas 2 cartas para começar.' : ativos === 0 ? 'Todos correram: o pote é seu! 🎉' : 'Complete o flop (3 cartas) ou deixe a mesa vazia para ver o pré-flop.'}
          </p>
        ) : (
          <>
            <div className="po-topo">
              <div className="po-equidade">
                <strong>{equidade !== null ? `${(equidade * 100).toFixed(1)}%` : '…'}</strong>
                <span>chance de levar o pote</span>
                {res && <small>{(res.vitorias / res.jogos * 100).toFixed(1)}% vence · {(res.empates / res.jogos * 100).toFixed(1)}% empata · {res.jogos.toLocaleString('pt-BR')} mãos simuladas</small>}
              </div>
              {rec && (
                <div className={`po-rec ${rec.tom}`}>
                  <span>Sugestão</span>
                  <strong>{rec.acao}</strong>
                  <p>{rec.motivo}</p>
                </div>
              )}
            </div>

            <div className="po-info">
              <div>
                <h4>Sua mão</h4>
                {maoAtual ? <p><b>{maoAtual}</b> agora</p> : inicial && <p><b>{inicial.nome}</b>: entre as {Math.max(1, Math.round(inicial.p * 100 + 0.5))}% melhores mãos iniciais</p>}
                <p className="muted small">Parte justa com {ativos + 1} na mão: {Math.round(100 / (ativos + 1))}%{rec && rec.precisa > 0 && <> · precisa de {Math.round(rec.precisa * 100)}% para pagar</>}</p>
              </div>
              {(mesa.length === 3 || mesa.length === 4) && (
                <div>
                  <h4>Outs: {outs.length}</h4>
                  {outs.length ? (
                    <>
                      <p className="small">Chance de melhorar na próxima carta: <b>{Math.round((outs.length / restantes) * 100)}%</b>{mesa.length === 3 && <> · até o river: <b>{Math.round((1 - ((restantes - outs.length) / restantes) * ((restantes - 1 - outs.length) / (restantes - 1))) * 100)}%</b></>}</p>
                      <p className="muted small">Regra rápida: outs × {mesa.length === 3 ? '4 (até o river)' : '2 (só o river)'} ≈ {outs.length * (mesa.length === 3 ? 4 : 2)}%</p>
                      <p className="po-outs">{[...new Set(outs.map((o) => o.vira))].map((v) => <span key={v}>{v}: {outs.filter((o) => o.vira === v).map((o) => textoCarta(o.carta)).join(' ')}</span>)}</p>
                    </>
                  ) : <p className="muted small">Nenhuma carta melhora a sua mão.</p>}
                </div>
              )}
            </div>

            {res && res.jogos > 0 && mesa.length < 5 && (
              <div className="po-dist">
                <h4>Como sua mão termina no river</h4>
                {CATEGORIAS.map((n, i) => ({ n, p: res.categorias[i] / res.jogos })).filter((x) => x.p >= 0.001).reverse().map((x) => (
                  <div key={x.n} className="po-barra"><span>{x.n}</span><i style={{ width: `${Math.max(1, x.p * 100)}%` }} /><b>{(x.p * 100).toFixed(1)}%</b></div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <p className="muted small po-aviso">
        Ferramenta de <b>estudo</b>: a chance é calculada simulando milhares de mãos possíveis contra os adversários que continuam. A sugestão considera só a matemática
        (não leia de posição, blefe e perfil). Em salas de poker online, usar ajuda em tempo real durante o jogo costuma ser proibido pelas regras do site.
      </p>
    </div>
  )
}
