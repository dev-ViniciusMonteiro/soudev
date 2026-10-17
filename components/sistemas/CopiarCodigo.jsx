'use client'

// Botões do guia: copiar o Code.gs inteiro para colar no Apps Script, ou baixar o arquivo.
// O código é buscado ao abrir a página: assim a cópia acontece direto no clique (o Safari exige isso).

import { useEffect, useState } from 'react'
import { track } from '@/lib/analytics'

export default function CopiarCodigo() {
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    fetch('/sistemas/Code.gs')
      .then((r) => r.text())
      .then(setCodigo)
      .catch(() => setEstado('erro'))
  }, [])

  const copiar = () => {
    navigator.clipboard
      .writeText(codigo)
      .then(() => {
        setEstado('ok')
        track('sistema_codigo_copiado')
      })
      .catch(() => setEstado('erro'))
  }

  return (
    <div className="sx-guia-copiar">
      <button type="button" className="btn btn-primary btn-lg" onClick={copiar} disabled={!codigo}>
        {estado === 'ok' ? '✓ Código copiado' : codigo ? 'Copiar o código' : 'Carregando o código…'}
      </button>
      <a className="btn btn-ghost btn-lg" href="/sistemas/Code.gs" download="Code.gs">
        Baixar Code.gs
      </a>
      {estado === 'ok' && <p className="notice ok">Pronto! Agora é só colar no editor do Apps Script (Ctrl+V).</p>}
      {estado === 'erro' && <p className="notice error">O navegador bloqueou a cópia. Use “Baixar Code.gs”, abra o arquivo, selecione tudo e copie.</p>}
    </div>
  )
}
