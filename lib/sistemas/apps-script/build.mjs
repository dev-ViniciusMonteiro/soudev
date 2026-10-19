// Gera public/sistemas/Code.gs (um arquivo só, para colar no editor do Apps Script).
// As colunas vêm do esquema e as regras de preço e horário são as mesmas do navegador.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as regras from '../regras.js'
import { CONFIGS, tabelas } from '../schema.js'

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url))

const colunas = Object.fromEntries(Object.entries(tabelas).map(([nome, t]) => [nome, t.campos.map((c) => c.id)]))
const publica = CONFIGS.filter((c) => c.publica).map((c) => c.id)

const usadas = ['pad', 'round2', 'parseValor', 'lerAdicionais', 'precificar', 'totalItens', 'minutos', 'hhmm', 'hojeISO', 'ocupaHorario', 'horariosLivres']
const fonte = usadas
  .map((nome) => {
    const src = regras[nome].toString()
    return src.startsWith('function') ? src : `const ${nome} = ${src}`
  })
  .join('\n\n')

const saida = readFileSync(aqui('./Code.template.js'), 'utf8')
  .replace('/*COLUNAS*/ {}', JSON.stringify(colunas))
  .replace('/*CONFIG_PUBLICA*/ []', JSON.stringify(publica))
  .replace('/*REGRAS*/', fonte)

mkdirSync(aqui('../../../public/sistemas'), { recursive: true })
writeFileSync(aqui('../../../public/sistemas/Code.gs'), saida)
console.log('public/sistemas/Code.gs gerado')
