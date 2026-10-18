// Planos prontos (viram rotinas normais e editáveis).
import { uid } from './logica'

const serie = (reps, carga = 0, tipo = 'normal', descanso) => ({ tipo, reps, carga, ...(descanso ? { descanso } : {}) })
const series = (n, reps, extra = {}) => Array.from({ length: n }, () => ({ ...serie(reps), ...extra }))

/** Um exercício da rotina. */
export function item(ex, { n = 3, reps = 10, descanso = 90, regra = 'dupla', min, max, tipo = 'reps', tempo, aquecimento = 0, corporal = false, unilateral = false, inc } = {}) {
  return {
    id: uid(),
    ex,
    tipo,
    descanso,
    corporal,
    unilateral,
    series: [...series(aquecimento, Math.max(5, reps), { tipo: 'aquecimento' }), ...series(n, reps, tipo === 'tempo' ? { tempo: tempo || 30, reps: 0 } : {})],
    progressao: { regra, ...(min ? { min } : {}), ...(max ? { max } : {}), ...(inc ? { inc } : {}) },
  }
}

const dupla = (ex, n, min, max, extra) => item(ex, { n, reps: min, min, max, regra: 'dupla', ...extra })

export const PLANOS = [
  {
    id: 'ppl',
    nome: 'Push / Pull / Legs',
    descricao: 'Empurrar, puxar e pernas. 3 dias (ou 6, repetindo). Bom para intermediários.',
    modo: 'semana',
    rotinas: [
      {
        nome: 'Push (peito, ombro, tríceps)',
        dias: [1, 4],
        itens: () => [
          item('Barbell_Bench_Press_-_Medium_Grip', { n: 4, reps: 6, min: 6, max: 8, regra: 'dupla', descanso: 150, aquecimento: 2 }),
          dupla('Incline_Dumbbell_Press', 3, 8, 12),
          dupla('Seated_Dumbbell_Press', 3, 8, 12),
          dupla('Side_Lateral_Raise', 3, 12, 15, { descanso: 60 }),
          dupla('Triceps_Pushdown_-_Rope_Attachment', 3, 10, 15, { descanso: 60 }),
        ],
      },
      {
        nome: 'Pull (costas, bíceps)',
        dias: [2, 5],
        itens: () => [
          item('Barbell_Deadlift', { n: 3, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 5 }),
          dupla('Wide-Grip_Lat_Pulldown', 3, 8, 12),
          dupla('Seated_Cable_Rows', 3, 8, 12),
          dupla('Face_Pull', 3, 12, 15, { descanso: 60 }),
          dupla('Barbell_Curl', 3, 8, 12, { descanso: 60 }),
        ],
      },
      {
        nome: 'Legs (pernas)',
        dias: [3, 6],
        itens: () => [
          item('Barbell_Squat', { n: 4, reps: 6, min: 6, max: 8, regra: 'dupla', descanso: 180, aquecimento: 2, inc: 5 }),
          dupla('Romanian_Deadlift', 3, 8, 10),
          dupla('Leg_Press', 3, 10, 15),
          dupla('Lying_Leg_Curls', 3, 10, 15, { descanso: 60 }),
          dupla('Standing_Calf_Raises', 4, 10, 15, { descanso: 60 }),
        ],
      },
    ],
  },
  {
    id: 'upper-lower',
    nome: 'Superior / Inferior',
    descricao: '4 dias: dois de parte de cima e dois de pernas. Equilíbrio entre força e volume.',
    modo: 'semana',
    rotinas: [
      {
        nome: 'Superior A (força)',
        dias: [1],
        itens: () => [
          item('Barbell_Bench_Press_-_Medium_Grip', { n: 4, reps: 5, regra: 'linear', descanso: 150, aquecimento: 2 }),
          item('Bent_Over_Barbell_Row', { n: 4, reps: 6, regra: 'linear', descanso: 120 }),
          dupla('Standing_Military_Press', 3, 6, 8),
          dupla('Pullups', 3, 6, 10, { corporal: true }),
          dupla('Hammer_Curls', 2, 10, 12, { descanso: 60 }),
        ],
      },
      {
        nome: 'Inferior A (força)',
        dias: [2],
        itens: () => [
          item('Barbell_Squat', { n: 4, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 5 }),
          dupla('Romanian_Deadlift', 3, 6, 8),
          dupla('Dumbbell_Lunges', 3, 8, 10, { unilateral: true }),
          dupla('Standing_Calf_Raises', 4, 8, 12),
          item('Plank', { n: 3, tipo: 'tempo', tempo: 40, regra: 'tempo', descanso: 60, corporal: true }),
        ],
      },
      {
        nome: 'Superior B (volume)',
        dias: [4],
        itens: () => [
          dupla('Incline_Dumbbell_Press', 4, 8, 12),
          dupla('Seated_Cable_Rows', 4, 10, 12),
          dupla('Side_Lateral_Raise', 3, 12, 15, { descanso: 60 }),
          dupla('Close-Grip_Front_Lat_Pulldown', 3, 10, 12),
          dupla('Triceps_Pushdown', 3, 10, 15, { descanso: 60 }),
        ],
      },
      {
        nome: 'Inferior B (volume)',
        dias: [5],
        itens: () => [
          item('Barbell_Deadlift', { n: 3, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 5 }),
          dupla('Leg_Press', 4, 10, 15),
          dupla('Leg_Extensions', 3, 12, 15, { descanso: 60 }),
          dupla('Seated_Leg_Curl', 3, 12, 15, { descanso: 60 }),
          dupla('Seated_Calf_Raise', 3, 12, 15, { descanso: 60 }),
        ],
      },
    ],
  },
  {
    id: 'full-body',
    nome: 'Corpo inteiro',
    descricao: '3 dias por semana, corpo todo em cada treino. Ideal para começar.',
    modo: 'semana',
    rotinas: [
      {
        nome: 'Corpo inteiro A',
        dias: [1, 5],
        itens: () => [
          item('Goblet_Squat', { n: 3, reps: 10, min: 8, max: 12, regra: 'dupla', descanso: 90 }),
          dupla('Dumbbell_Bench_Press', 3, 8, 12),
          dupla('Seated_Cable_Rows', 3, 10, 12),
          dupla('Dumbbell_Shoulder_Press', 2, 10, 12),
          item('Plank', { n: 3, tipo: 'tempo', tempo: 30, regra: 'tempo', descanso: 45, corporal: true }),
        ],
      },
      {
        nome: 'Corpo inteiro B',
        dias: [3],
        itens: () => [
          dupla('Romanian_Deadlift', 3, 8, 12),
          dupla('Pushups', 3, 8, 15, { corporal: true }),
          dupla('Wide-Grip_Lat_Pulldown', 3, 10, 12),
          dupla('Dumbbell_Lunges', 2, 10, 12, { unilateral: true }),
          dupla('Crunches', 3, 15, 20, { corporal: true, descanso: 45 }),
        ],
      },
    ],
  },
  {
    id: '5x5',
    nome: '5×5 (força)',
    descricao: 'Dois treinos alternados (A, B, A…), 3 vezes por semana, subindo carga a cada treino. Clássico para ganhar força.',
    modo: 'rotacao',
    rotinas: [
      {
        nome: '5×5 A',
        dias: [],
        itens: () => [
          item('Barbell_Squat', { n: 5, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 2.5 }),
          item('Barbell_Bench_Press_-_Medium_Grip', { n: 5, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 2.5 }),
          item('Bent_Over_Barbell_Row', { n: 5, reps: 5, regra: 'linear', descanso: 150, inc: 2.5 }),
        ],
      },
      {
        nome: '5×5 B',
        dias: [],
        itens: () => [
          item('Barbell_Squat', { n: 5, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 2.5 }),
          item('Standing_Military_Press', { n: 5, reps: 5, regra: 'linear', descanso: 180, aquecimento: 1, inc: 2.5 }),
          item('Barbell_Deadlift', { n: 1, reps: 5, regra: 'linear', descanso: 180, aquecimento: 2, inc: 5 }),
        ],
      },
    ],
  },
]
