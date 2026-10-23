// Filtro da busca do topo, roda no navegador sobre o índice montado em lib/busca-indice.js.

/** Minúsculas e sem acento: "calculo" acha "Cálculo". */
export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Cada palavra digitada precisa aparecer em algum lugar; o nome vale mais que as palavras-chave e a descrição. */
export function buscar(indice, termo, limite = 8) {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (!palavras.length) return []
  const achados = []
  for (const item of indice) {
    const nome = normalizar(item.nome)
    const resto = normalizar(`${item.chaves} ${item.texto} ${item.secao}`)
    let pontos = 0
    let todas = true
    for (const p of palavras) {
      if (nome.startsWith(p)) pontos += 6
      else if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(nome)) pontos += 4
      else if (nome.includes(p)) pontos += 3
      else if (resto.includes(p)) pontos += 1
      else {
        todas = false
        break
      }
    }
    if (todas) achados.push({ item, pontos })
  }
  return achados
    .sort((a, b) => b.pontos - a.pontos || a.item.nome.localeCompare(b.item.nome))
    .slice(0, limite)
    .map((a) => a.item)
}
