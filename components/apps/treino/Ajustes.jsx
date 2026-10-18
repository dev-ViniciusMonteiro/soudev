'use client'

import { useState } from 'react'
import { exportarTudo, importarTudo, limpar, lista, salvarVarios } from '@/lib/treino/banco'
import { ANILHAS_PADRAO, BARRAS, addDias, casarExercicio, hoje, importarAppleSaude, importarCsv, uid } from '@/lib/treino/logica'
import { useAviso, useBib } from './comum'

export default function Ajustes({ cfg, mudarCfg }) {
  const bib = useBib()
  const aviso = useAviso()
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [permissao, setPermissao] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const pares = cfg.anilhas || Object.fromEntries(ANILHAS_PADRAO.map((a) => [a, 4]))

  const importar = async (arq) => {
    if (!arq) return
    setOcupado(true)
    setMsg('')
    try {
      const texto = await arq.text()
      if (/\.json$/i.test(arq.name)) {
        const json = JSON.parse(texto)
        await importarTudo(json)
        setMsg('Backup restaurado.')
      } else if (/\.xml$/i.test(arq.name) || texto.includes('HKQuantityTypeIdentifier')) {
        const pesos = importarAppleSaude(texto)
        if (!pesos.length) throw new Error('Nenhum registro de peso encontrado no arquivo do Apple Saúde.')
        await salvarVarios('pesos', pesos.map((p) => ({ id: p.data, ...p })))
        setMsg(`${pesos.length} registros de peso importados do Apple Saúde.`)
      } else {
        const novos = new Map()
        const resolver = (nome) => {
          const id = casarExercicio(nome, bib.todos)
          if (id) return id
          const chave = `meu:imp-${nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
          if (!novos.has(chave)) novos.set(chave, { id: chave, n: nome, pt: '', m: [], s: [], e: 'other', c: 'strength', l: '', k: '', f: '', tipo: 'reps', i: [], img: 0 })
          return chave
        }
        const { formato, sessoes } = importarCsv(texto, resolver)
        const existentes = await lista('exercicios')
        const criar = [...novos.values()].filter((n) => !existentes.some((e) => e.id === n.id))
        if (criar.length) await salvarVarios('exercicios', criar)
        await salvarVarios(
          'sessoes',
          sessoes.map((s) => ({
            id: `imp-${s.inicio}-${s.nome}`.replace(/[^a-zA-Z0-9-]/g, ''),
            rotina_id: null,
            nome: s.nome,
            data: s.data,
            inicio: s.inicio,
            fim: s.inicio,
            status: 'concluida',
            nota: `Importado do ${formato}`,
            pesoCorporal: 0,
            itens: s.itens.map((it) => ({ id: uid(), ex: it.ex, tipo: it.series.some((x) => x.reps) ? 'reps' : 'tempo', descanso: cfg.descansoPadrao, series: it.series, progressao: { regra: 'nenhuma' } })),
          })),
        )
        setMsg(`${sessoes.length} treinos importados do ${formato[0].toUpperCase() + formato.slice(1)}${criar.length ? `, ${criar.length} exercícios novos criados (sem músculo definido: edite em Exercícios › Meus)` : ''}.`)
      }
    } catch (e) {
      setMsg(`Não deu certo: ${e.message}`)
    }
    setOcupado(false)
  }

  const exportar = async () => {
    const dados = await exportarTudo()
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `treino-backup-${hoje()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const exportarCsv = async () => {
    const sessoes = (await lista('sessoes')).filter((s) => s.status === 'concluida').sort((a, b) => a.data.localeCompare(b.data))
    const linhas = [['data', 'treino', 'exercicio', 'serie', 'tipo', 'carga_kg', 'reps', 'reps_esq', 'reps_dir', 'segundos', 'km', 'esforco']]
    for (const s of sessoes)
      for (const it of s.itens)
        it.series
          .filter((x) => x.feita)
          .forEach((x, k) => linhas.push([s.data, s.nome, bib.de(it.ex)?.pt || bib.de(it.ex)?.n || it.ex, k + 1, x.tipo, x.carga ?? '', x.reps ?? '', x.repsE ?? '', x.repsD ?? '', x.tempo ?? '', x.distancia ?? '', x.esforco ?? '']))
    const csv = linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }))
    a.download = `treinos-${hoje()}.csv`
    a.click()
  }

  return (
    <div className="tr-pagina">
      <section className="tr-cartao">
        <h2>Durante o treino</h2>
        <label className="tr-campo tr-campo-linha">
          <span>Esforço da série</span>
          <select className="tr-select" value={cfg.esforco} onChange={(e) => mudarCfg({ esforco: e.target.value })}>
            <option value="rir">RIR (repetições na reserva)</option>
            <option value="rpe">RPE (escala de 6 a 10)</option>
          </select>
        </label>
        <label className="tr-campo tr-campo-linha">
          <span>Descanso padrão (s)</span>
          <input className="tr-input tr-mini" type="number" inputMode="numeric" value={cfg.descansoPadrao} onChange={(e) => mudarCfg({ descansoPadrao: Number(e.target.value) })} />
        </label>
        <label className="tr-check-linha">
          <input type="checkbox" checked={cfg.som} onChange={(e) => mudarCfg({ som: e.target.checked })} /> Som no fim do descanso
        </label>
        <label className="tr-check-linha">
          <input type="checkbox" checked={cfg.vibrar} onChange={(e) => mudarCfg({ vibrar: e.target.checked })} /> Vibrar (celular)
        </label>
        {permissao !== 'unsupported' && permissao !== 'granted' && (
          <button type="button" className="tr-btn tr-btn-ghost" onClick={async () => setPermissao(await Notification.requestPermission())}>
            Avisar com notificação quando o app estiver em segundo plano
          </button>
        )}
        {permissao === 'granted' && <p className="tr-ajuda">✓ Notificações ativas.</p>}
        <p className="tr-ajuda">A tela fica acesa durante o treino (quando o navegador permite).</p>
      </section>

      <section className="tr-cartao">
        <h2>Barra e anilhas</h2>
        <label className="tr-campo tr-campo-linha">
          <span>Barra padrão</span>
          <select className="tr-select" value={cfg.barra} onChange={(e) => mudarCfg({ barra: Number(e.target.value) })}>
            {BARRAS.map(([id, nome, peso]) => (
              <option key={id} value={peso}>
                {nome} ({peso} kg)
              </option>
            ))}
          </select>
        </label>
        <p className="tr-ajuda">Pares de anilhas disponíveis na sua academia (0 = não tem):</p>
        <div className="tr-anilhas-inv">
          {ANILHAS_PADRAO.map((a) => (
            <label key={a} className="tr-campo">
              <span>{String(a).replace('.', ',')} kg</span>
              <input className="tr-input tr-mini" type="number" min="0" inputMode="numeric" value={pares[a] ?? 0} onChange={(e) => mudarCfg({ anilhas: { ...pares, [a]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>
        {cfg.anilhas && (
          <button type="button" className="tr-link" onClick={() => mudarCfg({ anilhas: null })}>
            Voltar a considerar todas as anilhas à vontade
          </button>
        )}
      </section>

      <section className="tr-cartao">
        <h2>Deload</h2>
        <p className="tr-ajuda">Semana mais leve para recuperar. As cargas sugeridas caem pela porcentagem abaixo.</p>
        <label className="tr-campo tr-campo-linha">
          <span>Reduzir a carga em (%)</span>
          <input className="tr-input tr-mini" type="number" inputMode="numeric" value={cfg.deloadPct} onChange={(e) => mudarCfg({ deloadPct: Number(e.target.value) })} />
        </label>
        <label className="tr-campo tr-campo-linha">
          <span>Deload automático</span>
          <select className="tr-select" value={cfg.deloadCada} onChange={(e) => mudarCfg({ deloadCada: Number(e.target.value) })}>
            <option value={0}>Não</option>
            {[3, 4, 5, 6, 8].map((n) => (
              <option key={n} value={n}>
                Após {n} semanas de treino
              </option>
            ))}
          </select>
        </label>
        {cfg.deloadAte && cfg.deloadAte >= hoje() ? (
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => mudarCfg({ deloadAte: '' })}>
            Encerrar deload (vai até {cfg.deloadAte.split('-').reverse().join('/')})
          </button>
        ) : (
          <button type="button" className="tr-btn tr-btn-ghost" onClick={() => mudarCfg({ deloadAte: addDias(hoje(), 6) })}>
            Começar deload agora (7 dias)
          </button>
        )}
      </section>

      <section className="tr-cartao">
        <h2>Importar e exportar</h2>
        <p className="tr-ajuda">
          Traga seu histórico de outros apps: CSV do <strong>Strong</strong>, <strong>Hevy</strong> ou <strong>FitNotes</strong>, o <code>export.xml</code> do <strong>Apple Saúde</strong> (peso corporal) ou um backup deste app.
        </p>
        <label className={`tr-btn tr-btn-ghost ${ocupado ? 'desativado' : ''}`}>
          {ocupado ? 'Importando…' : 'Escolher arquivo para importar'}
          <input type="file" accept=".csv,.json,.xml,text/csv,application/json,text/xml" hidden disabled={ocupado} onChange={(e) => importar(e.target.files?.[0])} />
        </label>
        {msg && (
          <p className="tr-ajuda" role="status">
            {msg}
          </p>
        )}
        <div className="tr-acoes">
          <button type="button" className="tr-btn tr-btn-ghost" onClick={exportar}>
            Baixar backup completo (JSON)
          </button>
          <button type="button" className="tr-btn tr-btn-ghost" onClick={exportarCsv}>
            Baixar treinos em planilha (CSV)
          </button>
        </div>
      </section>

      <section className="tr-cartao">
        <h2>Seus dados</h2>
        <p className="tr-ajuda">Tudo fica neste aparelho (IndexedDB), funciona sem internet e nada é enviado. Use o backup para levar para outro aparelho.</p>
        <button
          type="button"
          className="tr-btn tr-btn-perigo"
          onClick={async () => {
            if (!confirm('Apagar TODOS os treinos, rotinas, pesos e fotos deste aparelho? Baixe um backup antes se quiser guardar.')) return
            for (const c of ['rotinas', 'sessoes', 'pesos', 'fotos', 'exercicios', 'config']) await limpar(c)
            aviso('Tudo apagado.')
          }}
        >
          Apagar tudo
        </button>
        <button
          type="button"
          className="tr-btn tr-btn-ghost"
          onClick={async () => {
            if (!confirm('Criar 8 semanas de treinos de exemplo? Eles se somam aos seus dados (use "Apagar tudo" depois para limpar).')) return
            const { gerarDemo } = await import('@/lib/treino/demo')
            await gerarDemo()
            aviso('Dados de exemplo criados: 8 semanas de Push/Pull/Legs.')
          }}
        >
          Gerar dados de exemplo
        </button>
      </section>
    </div>
  )
}
