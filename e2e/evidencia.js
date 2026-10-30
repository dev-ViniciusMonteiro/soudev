// Coleta evidências dos testes E2E: salva os prints em public/testes/img e um JSON por
// item em public/testes/dados, que as páginas /teste e a vitrine /testes leem para exibir.
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.join(process.cwd(), 'public', 'testes')
const DIR_IMG = path.join(RAIZ, 'img')
const DIR_DADOS = path.join(RAIZ, 'dados')

export function novaEvidencia(tipo, slug, nome) {
  fs.mkdirSync(DIR_IMG, { recursive: true })
  fs.mkdirSync(DIR_DADOS, { recursive: true })
  const passos = []

  return {
    // Tira o print (JPEG leve), salva em public/testes/img e anexa ao relatório do Playwright.
    async print(page, info, titulo, detalhe) {
      const arq = `${tipo}-${slug}-${String(passos.length + 1).padStart(2, '0')}.jpg`
      let buffer
      try {
        buffer = await page.screenshot({ type: 'jpeg', quality: 78 })
      } catch {
        return
      }
      fs.writeFileSync(path.join(DIR_IMG, arq), buffer)
      try { await info.attach(titulo, { body: buffer, contentType: 'image/jpeg' }) } catch {}
      passos.push({ titulo, detalhe: detalhe || '', img: `/testes/img/${arq}` })
    },
    nota(titulo, detalhe) {
      passos.push({ titulo, detalhe: detalhe || '' })
    },
    salvar(ok) {
      const dado = { tipo, slug, nome, ok, geradoEm: new Date().toISOString(), passos }
      fs.writeFileSync(path.join(DIR_DADOS, `${tipo}-${slug}.json`), JSON.stringify(dado, null, 2))
    },
  }
}
