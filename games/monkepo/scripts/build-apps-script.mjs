// Gera games/monkepo/apps-script/Code.gs (um arquivo só, para colar no editor do Apps Script).
import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const result = await build({
  entryPoints: [`${root}server/index.ts`],
  bundle: true,
  format: 'iife',
  globalName: 'MonKePo',
  target: 'es2019',
  charset: 'utf8',
  write: false,
  legalComments: 'none',
})

const header = `// MonKePo: servidor no Google Apps Script. ARQUIVO GERADO, não edite aqui.
// Fonte: games/monkepo/server e games/monkepo/shared (npm run build:monkepo-script).
`
const entries = `
function doPost(e) { return MonKePo.doPost(e); }
function doGet(e) { return MonKePo.doGet(e); }
function configurar() { return MonKePo.configurar(); }
`
writeFileSync(`${root}apps-script/Code.gs`, header + result.outputFiles[0].text + entries)
console.log('apps-script/Code.gs gerado')
