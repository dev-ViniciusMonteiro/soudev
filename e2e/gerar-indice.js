// Roda depois de todos os testes: junta os JSON de cada item num índice para a vitrine /testes.
import fs from 'node:fs'
import path from 'node:path'

export default async function gerarIndice() {
  const base = path.join(process.cwd(), 'public', 'testes')
  const dadosDir = path.join(base, 'dados')
  let arquivos = []
  try {
    arquivos = fs.readdirSync(dadosDir).filter((f) => f.endsWith('.json'))
  } catch {
    return
  }
  const itens = arquivos.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(dadosDir, f), 'utf8'))
    return {
      tipo: d.tipo,
      slug: d.slug,
      nome: d.nome,
      ok: d.ok,
      geradoEm: d.geradoEm,
      prints: d.passos.filter((p) => p.img).length,
      capa: d.passos.find((p) => p.img)?.img || null,
    }
  })
  itens.sort((a, b) => (a.tipo === b.tipo ? a.nome.localeCompare(b.nome) : a.tipo.localeCompare(b.tipo)))
  const indice = { geradoEm: new Date().toISOString(), total: itens.length, ok: itens.filter((i) => i.ok).length, itens }
  fs.writeFileSync(path.join(base, 'indice.json'), JSON.stringify(indice, null, 2))
}
