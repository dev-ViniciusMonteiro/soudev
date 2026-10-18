// Gera public/apps/treino/exercicios.json a partir do Free Exercise DB (domínio público, The Unlicense):
// https://github.com/yuhonas/free-exercise-db  ·  rode: npm run build:treino-exercicios
// As fotos não vão para o site: o app carrega do jsDelivr sob demanda.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NOMES_PT } from './nomes-pt.js'

const URL_DB = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const lista = await (await fetch(URL_DB)).json()

const curto = lista.map((x) => ({
  id: x.id,
  n: x.name,
  pt: NOMES_PT[x.id] || '',
  m: x.primaryMuscles,
  s: x.secondaryMuscles,
  e: x.equipment || 'other',
  c: x.category,
  l: x.level,
  k: x.mechanic || '',
  f: x.force || '',
  i: x.instructions,
  img: x.images.length,
}))

const destino = fileURLToPath(new URL('../../public/apps/treino/', import.meta.url))
mkdirSync(destino, { recursive: true })
writeFileSync(`${destino}exercicios.json`, JSON.stringify(curto))
console.log(`${curto.length} exercícios (${curto.filter((x) => x.pt).length} com nome em português)`)
