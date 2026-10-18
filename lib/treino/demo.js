// Dados de exemplo: 8 semanas de Push/Pull/Legs com cargas subindo, algumas falhas e peso corporal.
import { salvarVarios } from './banco'
import { addDias, hoje, round, uid } from './logica'
import { PLANOS } from './planos'

export async function gerarDemo() {
  let semente = 7
  const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646
  const plano = PLANOS.find((p) => p.id === 'ppl')
  const rotinas = plano.rotinas.map((r, i) => ({ id: uid(), nome: r.nome, dias: r.dias, ordem: i + 1, itens: r.itens(), nota: '' }))
  const base = { Barbell_Bench_Press_: 50 }
  const cargaInicial = (ex) => {
    const tabela = { 'Barbell_Bench_Press_-_Medium_Grip': 50, Barbell_Deadlift: 90, Barbell_Squat: 70, Romanian_Deadlift: 50, Leg_Press: 120, Incline_Dumbbell_Press: 18, Seated_Dumbbell_Press: 14, Side_Lateral_Raise: 7, 'Triceps_Pushdown_-_Rope_Attachment': 20, 'Wide-Grip_Lat_Pulldown': 45, Seated_Cable_Rows: 45, Face_Pull: 15, Barbell_Curl: 20, Lying_Leg_Curls: 30, Standing_Calf_Raises: 60 }
    return tabela[ex] ?? base[ex] ?? 20
  }
  const sessoes = []
  const pesos = []
  const inicio = addDias(hoje(), -56)
  for (let d = 0; d < 56; d++) {
    const data = addDias(inicio, d)
    const dia = new Date(`${data}T12:00`).getDay()
    if (d % 7 === 0) pesos.push({ id: data, data, peso: round(82 - d * 0.05 + rnd() * 0.6, 1) })
    const rotina = rotinas.find((r) => r.dias.includes(dia))
    if (!rotina || rnd() < 0.12) continue
    const semana = Math.floor(d / 7)
    const hora = 17 + Math.floor(rnd() * 3)
    const itens = rotina.itens.map((it) => {
      const trabalho = it.series.filter((s) => s.tipo !== 'aquecimento')
      const passo = it.progressao.inc || 2.5
      const carga = round(cargaInicial(it.ex) + Math.floor(semana * 0.8) * passo, 1)
      const meta = it.progressao.max || trabalho[0].reps
      return {
        ...it,
        id: uid(),
        series: [
          ...it.series.filter((s) => s.tipo === 'aquecimento').map((s) => ({ ...s, carga: round(carga * 0.5, 0), feita: true })),
          ...trabalho.map((s, k) => {
            if (it.tipo === 'tempo') return { ...s, tempo: (s.tempo || 30) + semana * 5, feita: true }
            const reps = Math.max(1, Math.min(meta, (s.reps || 8) + Math.floor(rnd() * 3) - (k > 1 ? 1 : 0)))
            return { ...s, carga, reps, esforco: Math.max(0, Math.min(4, Math.round(3 - k + rnd()))), feita: true }
          }),
        ],
      }
    })
    sessoes.push({ id: uid(), rotina_id: rotina.id, nome: rotina.nome, data, inicio: `${data}T${hora}:05:00`, fim: `${data}T${hora + 1}:${String(Math.floor(rnd() * 50) + 5).padStart(2, '0')}:00`, status: 'concluida', itens, nota: '', deload: false, pesoCorporal: pesos.at(-1)?.peso || 80 })
  }
  await salvarVarios('rotinas', rotinas)
  await salvarVarios('sessoes', sessoes)
  await salvarVarios('pesos', pesos)
  await salvarVarios('config', [{ id: 'geral', modo: 'semana', inicioSemana: 1, esforco: 'rir', descansoPadrao: 90, som: true, vibrar: true, pesoCorporal: pesos.at(-1).peso, metaPeso: 78, barra: 20, anilhas: null, deloadAte: '', deloadPct: 10, deloadCada: 0, troca: null, unidade: 'kg' }])
  return { rotinas: rotinas.length, sessoes: sessoes.length }
}
