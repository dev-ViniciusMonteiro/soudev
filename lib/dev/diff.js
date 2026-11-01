// Diff de linhas (LCS). Bom para textos de até alguns milhares de linhas.
export function diffLinhas(a, b) {
  const A = String(a).split('\n')
  const B = String(b).split('\n')
  const n = A.length
  const m = B.length
  if (n * m > 4_000_000) return [...A.map((l) => ({ t: '-', linha: l })), ...B.map((l) => ({ t: '+', linha: l }))]
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ t: '=', linha: A[i] })
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: '-', linha: A[i++] })
    else out.push({ t: '+', linha: B[j++] })
  }
  while (i < n) out.push({ t: '-', linha: A[i++] })
  while (j < m) out.push({ t: '+', linha: B[j++] })
  return out
}
