// Gera backend-soudev/src/sistemas/gerado.ts: as colunas de cada tabela e as regras de preço e horário,
// as mesmas do navegador e do Code.gs da planilha. Rode depois de mudar lib/sistemas/schema.js ou regras.js.
// Uso: node lib/sistemas/apps-script/build-nuvem.mjs [caminho do backend-soudev]
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import * as regras from '../regras.js'
import { CONFIGS, tabelas } from '../schema.js'

const backend = process.argv[2] ?? fileURLToPath(new URL('../../../../backend-soudev', import.meta.url))
const colunas = Object.fromEntries(Object.entries(tabelas).map(([nome, t]) => [nome, t.campos.map((c) => c.id)]))
const publica = CONFIGS.filter((c) => c.publica).map((c) => c.id)

const usadas = ['pad', 'round2', 'parseValor', 'lerAdicionais', 'precificar', 'totalItens', 'minutos', 'hhmm', 'hojeISO', 'ocupaHorario', 'horariosLivres']
const fonte = usadas
  .map((nome) => {
    const src = regras[nome].toString()
    return src.startsWith('function') ? `export ${src}` : `export const ${nome} = ${src}`
  })
  .join('\n\n')

const saida = `// @ts-nocheck
// GERADO por soudev (node lib/sistemas/apps-script/build-nuvem.mjs). Não edite aqui: mude lib/sistemas/schema.js ou regras.js.

export const COLUNAS: Record<string, string[]> = ${JSON.stringify(colunas)}
export const CONFIG_PUBLICA: string[] = ${JSON.stringify(publica)}

${fonte}
`
mkdirSync(join(backend, 'src/sistemas'), { recursive: true })
writeFileSync(join(backend, 'src/sistemas/gerado.ts'), saida)
console.log(`${join(backend, 'src/sistemas/gerado.ts')} gerado`)
