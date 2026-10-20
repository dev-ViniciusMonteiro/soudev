// localStorage com proteção: em modo privado ou com o armazenamento cheio, o app segue funcionando sem lembrar.

export function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave)
    return v === null ? padrao : JSON.parse(v)
  } catch {
    return padrao
  }
}

export function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}
