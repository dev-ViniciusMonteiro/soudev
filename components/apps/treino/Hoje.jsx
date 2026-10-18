'use client'

import { useMemo, useState } from 'react'
import { excluir, salvar, useColecao } from '@/lib/treino/banco'
import { DIAS, DIAS_CURTOS, MUSCULOS, addDias, curva1rm, emDeload, equilibrio, estadoMusculos, hoje, proximoTreino, repsDaSerie, rotinaDoDia, round, semana, seriesFeitas, uid } from '@/lib/treino/logica'
import { Deslizavel, Modal, fmtData, fmtDuracao, fmtKg, nomeEx, useAviso, useBib } from './comum'
import { criarSessao } from './Sessao'

/** Dicas por regras simples a partir do histórico (sem IA, nada sai do aparelho). */
export function dicasDoTreinador(sessoes, rotinas, bib, cfg) {
  const dicas = []
  const concluidas = sessoes.filter((s) => s.status === 'concluida')
  if (!concluidas.length) return [['👋', 'Faça o primeiro treino e anote cargas e repetições. A partir do segundo, o app sugere a carga de cada série.']]
  const ultima = concluidas.map((s) => s.data).sort().at(-1)
  const parado = Math.floor((new Date(`${hoje()}T12:00`) - new Date(`${ultima}T12:00`)) / 86400000)
  if (parado >= 7) dicas.push(['⏰', `Faz ${parado} dias desde o último treino. Volte com cargas 10% menores na primeira sessão.`])
  const est = estadoMusculos(sessoes, bib.de, { dias: 7 })
  const treinados = new Set(rotinas.flatMap((r) => r.itens.flatMap((it) => bib.de(it.ex)?.m || [])))
  const esquecidos = Object.entries(est)
    .filter(([m, x]) => treinados.has(m) && (x.diasSem === null || x.diasSem >= 8))
    .map(([m]) => MUSCULOS[m])
  if (esquecidos.length) dicas.push(['🎯', `Sem treinar há mais de uma semana: ${esquecidos.slice(0, 4).join(', ')}.`])
  const poucos = Object.entries(est)
    .filter(([m, x]) => ['chest', 'lats', 'quadriceps', 'hamstrings', 'shoulders', 'glutes'].includes(m) && x.series > 0 && x.series < 6)
    .map(([m]) => MUSCULOS[m])
  if (poucos.length) dicas.push(['📈', `Volume baixo nos últimos 7 dias (menos de 6 séries): ${poucos.join(', ')}. Para hipertrofia, 10 a 20 séries por semana costuma funcionar bem.`])
  const estagnados = []
  const exercicios = new Set(concluidas.flatMap((s) => s.itens.map((i) => i.ex)))
  for (const ex of exercicios) {
    const c = curva1rm(sessoes, ex)
    if (c.length < 5) continue
    const ultimos = c.slice(-4).map((p) => p.valor)
    const antes = c.slice(0, -4).map((p) => p.valor)
    if (Math.max(...ultimos) <= Math.max(...antes)) estagnados.push(nomeEx(bib.de(ex)))
  }
  if (estagnados.length >= 3 && !emDeload(cfg, sessoes)) dicas.push(['🔋', `${estagnados.length} exercícios sem evoluir nos últimos 4 treinos. Uma semana de deload (carga ~10% menor) pode destravar. Ative em Ajustes.`])
  else if (estagnados.length) dicas.push(['🧱', `Estagnado: ${estagnados.slice(0, 3).join(', ')}. Tente outra faixa de repetições ou troque por uma variação por algumas semanas.`])
  for (const p of equilibrio(sessoes)) {
    if (p.valor === null || p.situacao === 'ok') continue
    dicas.push(['⚖️', `${p.nome}: ${p.valor} (referência perto de ${p.ideal}). ${p.situacao === 'baixo' ? `${p.nome.split(' / ')[0]} está atrás.` : `${p.nome.split(' / ')[1]} está atrás.`}`])
  }
  const rpeAlto = concluidas
    .slice(-6)
    .flatMap((s) => s.itens.flatMap((i) => i.series.filter((x) => x.feita && x.esforco !== '' && x.esforco !== undefined)))
    .map((x) => (cfg.esforco === 'rpe' ? Number(x.esforco) : 10 - Number(x.esforco)))
  if (rpeAlto.length >= 10 && rpeAlto.reduce((a, b) => a + b, 0) / rpeAlto.length >= 9.5) dicas.push(['😮‍💨', 'Quase todas as séries recentes foram até a falha. Deixar 1 ou 2 repetições na reserva ajuda a recuperar entre treinos.'])
  if (!dicas.length) dicas.push(['✅', 'Tudo em dia: volume equilibrado e cargas subindo. Continue assim.'])
  return dicas
}

export default function Hoje({ cfg, mudarCfg, abrirSessao, irPara }) {
  const rotinas = useColecao('rotinas')
  const sessoes = useColecao('sessoes')
  const bib = useBib()
  const aviso = useAviso()
  const [trocar, setTrocar] = useState(false)
  const [limite, setLimite] = useState(10)
  const data = hoje()

  const ativa = sessoes?.find((s) => s.status === 'andamento')
  const concluidas = useMemo(() => (sessoes || []).filter((s) => s.status === 'concluida').sort((a, b) => (b.data + (b.inicio || '')).localeCompare(a.data + (a.inicio || ''))), [sessoes])
  const dicas = useMemo(() => (sessoes && rotinas && bib ? dicasDoTreinador(sessoes, rotinas, bib, cfg) : []), [sessoes, rotinas, bib, cfg])
  if (!rotinas || !sessoes || !bib) return <p className="tr-vazio">Carregando…</p>

  const opts = { modo: cfg.modo, data, troca: cfg.troca }
  const rotina = rotinaDoDia(rotinas, sessoes, opts)
  const feitaHoje = concluidas.find((s) => s.data === data)
  const proximo = !rotina ? proximoTreino(rotinas, sessoes, opts) : null
  const deload = emDeload(cfg, sessoes)
  const dias = semana(data, cfg.inicioSemana)

  const iniciar = (r) => {
    if (ativa) return abrirSessao(ativa)
    abrirSessao(criarSessao(r, sessoes, cfg))
  }

  const copiar = (s) => {
    const nova = { ...structuredClone(s), id: uid(), data, inicio: `${data}T${new Date().toTimeString().slice(0, 8)}`, fim: null, status: 'andamento', itens: s.itens.map((it) => ({ ...it, motivo: `Copiado do treino de ${fmtData(s.data)}.`, series: it.series.map((x) => ({ ...x, feita: false })) })) }
    if (ativa) return aviso('Termine ou descarte o treino em andamento primeiro.')
    abrirSessao(nova)
  }

  const apagar = async (s) => {
    await excluir('sessoes', s.id)
    aviso(`Treino de ${fmtData(s.data)} apagado.`, () => salvar('sessoes', s))
  }

  return (
    <div className="tr-pagina">
      <div className="tr-semana" aria-label="Esta semana">
        {dias.map((d) => {
          const feito = concluidas.some((s) => s.data === d)
          const plano = cfg.modo === 'semana' && rotinas.some((r) => r.dias?.includes(new Date(`${d}T12:00`).getDay()))
          return (
            <div key={d} className={`tr-dia ${d === data ? 'hoje' : ''} ${feito ? 'feito' : ''} ${plano ? 'plano' : ''}`} title={feito ? 'Treinou' : plano ? 'Dia de treino' : 'Descanso'}>
              <span>{DIAS_CURTOS[new Date(`${d}T12:00`).getDay()]}</span>
              <strong>{feito ? '✓' : Number(d.slice(8))}</strong>
            </div>
          )
        })}
      </div>

      {deload && (
        <div className="tr-cartao tr-cartao-aviso">
          <strong>🔋 Semana de deload</strong>
          <p className="tr-ajuda">As cargas sugeridas estão {cfg.deloadPct}% menores para o corpo se recuperar.</p>
          {cfg.deloadAte && (
            <button type="button" className="tr-link" onClick={() => mudarCfg({ deloadAte: '' })}>
              Encerrar deload
            </button>
          )}
        </div>
      )}

      {ativa ? (
        <div className="tr-cartao tr-hoje tr-hoje-ativo">
          <span className="tr-ajuda">Treino em andamento</span>
          <h2>{ativa.nome}</h2>
          <p className="tr-ajuda">
            Começou {fmtDuracao((Date.now() - new Date(ativa.inicio)) / 1000)} atrás · {ativa.itens.reduce((t, i) => t + i.series.filter((x) => x.feita).length, 0)} séries feitas
          </p>
          <button type="button" className="tr-btn tr-btn-primario tr-btn-grande" onClick={() => abrirSessao(ativa)}>
            Continuar treino
          </button>
        </div>
      ) : rotina ? (
        <div className="tr-cartao tr-hoje">
          <span className="tr-ajuda">{feitaHoje ? 'Você já treinou hoje. Quer mais?' : cfg.modo === 'rotacao' ? 'Próximo da rotação' : `Treino de ${DIAS[new Date().getDay()].toLowerCase()}`}</span>
          <h2>{rotina.nome}</h2>
          <ul className="tr-hoje-lista">
            {rotina.itens.map((it) => (
              <li key={it.id}>
                {nomeEx(bib.de(it.ex))} <span className="tr-ajuda">{it.series.filter((s) => s.tipo !== 'aquecimento').length}×{it.tipo === 'reps' ? it.series.find((s) => s.tipo !== 'aquecimento')?.reps : `${it.series[0]?.tempo}s`}</span>
              </li>
            ))}
          </ul>
          {rotina.nota && <p className="tr-ajuda">📝 {rotina.nota}</p>}
          <div className="tr-acoes">
            <button type="button" className="tr-btn tr-btn-primario tr-btn-grande" onClick={() => iniciar(rotina)}>
              Começar treino
            </button>
            {rotinas.length > 1 && (
              <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setTrocar(true)}>
                Trocar o de hoje
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tr-cartao tr-hoje">
          {rotinas.length ? (
            <>
              <span className="tr-ajuda">Dia de descanso</span>
              <h2>Recuperar também é treino 😴</h2>
              {proximo && (
                <p className="tr-ajuda">
                  Próximo: <strong>{proximo.rotina.nome}</strong> {proximo.dias === 1 ? 'amanhã' : `${DIAS[new Date(`${proximo.data}T12:00`).getDay()].toLowerCase()}`}
                </p>
              )}
              <div className="tr-acoes">
                <button type="button" className="tr-btn tr-btn-ghost" onClick={() => setTrocar(true)}>
                  Treinar mesmo assim
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Bem-vindo ao Treino</h2>
              <p className="tr-ajuda">Escolha um plano pronto (Push/Pull/Legs, Superior/Inferior, Corpo inteiro ou 5×5) ou monte suas rotinas.</p>
              <button type="button" className="tr-btn tr-btn-primario tr-btn-grande" onClick={() => irPara('rotinas')}>
                Montar meu plano
              </button>
            </>
          )}
        </div>
      )}

      {!ativa && (
        <div className="tr-acoes">
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => abrirSessao(criarSessao(null, sessoes, cfg))}>
            + Treino livre
          </button>
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => abrirSessao({ ...criarSessao(null, sessoes, cfg, addDias(data, -1)), nome: 'Treino passado', status: 'concluida', inicio: `${addDias(data, -1)}T18:00`, fim: `${addDias(data, -1)}T19:00` }, true)}>
            Registrar treino passado
          </button>
        </div>
      )}

      <section className="tr-cartao">
        <h2>Treinador</h2>
        <ul className="tr-dicas">
          {dicas.map(([icone, texto], i) => (
            <li key={i}>
              <span aria-hidden="true">{icone}</span>
              <span>{texto}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="tr-titulo-linha">
          <h2>Histórico</h2>
          <span className="tr-ajuda">Deslize: ← apagar · → copiar</span>
        </div>
        {!concluidas.length && <p className="tr-vazio">Seus treinos aparecem aqui.</p>}
        <ul className="tr-historico">
          {concluidas.slice(0, limite).map((s) => {
            const series = s.itens.reduce((t, it) => t + seriesFeitas(it).length, 0)
            const volume = s.itens.reduce((t, it) => t + seriesFeitas(it).reduce((v, se) => v + ((it.corporal ? Number(s.pesoCorporal) || 0 : 0) + (Number(se.carga) || 0)) * repsDaSerie(se), 0), 0)
            return (
              <li key={s.id}>
                <Deslizavel onApagar={() => apagar(s)} onCopiar={() => copiar(s)}>
                  <button type="button" className="tr-historico-item" onClick={() => abrirSessao(structuredClone(s), true)}>
                    <span className="tr-historico-data">
                      <strong>{Number(s.data.slice(8))}</strong>
                      <span>{fmtData(s.data, { month: 'short' })}</span>
                    </span>
                    <span className="tr-ex-texto">
                      <strong>{s.nome}</strong>
                      <span>
                        {s.itens.map((it) => nomeEx(bib.de(it.ex))).join(', ')}
                      </span>
                      <span>
                        {series} séries · {fmtKg(round(volume, 0))}
                        {s.fim && s.inicio ? ` · ${fmtDuracao((new Date(s.fim) - new Date(s.inicio)) / 1000)}` : ''}
                      </span>
                    </span>
                  </button>
                </Deslizavel>
                <span className="sr-only">
                  <button type="button" onClick={() => copiar(s)}>
                    Copiar treino de {fmtData(s.data)}
                  </button>
                  <button type="button" onClick={() => apagar(s)}>
                    Apagar treino de {fmtData(s.data)}
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
        {concluidas.length > limite && (
          <button type="button" className="tr-btn tr-btn-ghost tr-largo" onClick={() => setLimite((l) => l + 20)}>
            Ver mais
          </button>
        )}
      </section>

      {trocar && (
        <Modal titulo="Qual treino hoje?" onFechar={() => setTrocar(false)}>
          <ul className="tr-escolha">
            {[...rotinas]
              .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
              .map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`tr-ex-linha ${rotina?.id === r.id ? 'marcado' : ''}`}
                    onClick={async () => {
                      await mudarCfg({ troca: { data, rotina_id: r.id } })
                      setTrocar(false)
                    }}
                  >
                    <span className="tr-ex-texto">
                      <strong>{r.nome}</strong>
                      <span>{r.itens.map((it) => nomeEx(bib.de(it.ex))).join(', ')}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          {cfg.troca?.data === data && (
            <button
              type="button"
              className="tr-btn tr-btn-ghost tr-largo"
              onClick={async () => {
                await mudarCfg({ troca: null })
                setTrocar(false)
              }}
            >
              Voltar ao planejado
            </button>
          )}
        </Modal>
      )}
    </div>
  )
}
