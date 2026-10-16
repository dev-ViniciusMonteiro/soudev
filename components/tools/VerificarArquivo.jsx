'use client'

import { useState } from 'react'
import { CopyButton, FileDrop, Notice } from '../ui'
import { track } from '@/lib/analytics'
import { fetchJson } from '@/lib/apis'
import { PESO, analisar, aplicarConsulta, formatarBytes, listarNos } from '@/lib/scanner'

const MAX_BYTES = 700 * 1024 ** 2
const ROTULO_NIVEL = { danger: 'Perigoso', warn: 'Atenção', info: 'Info', ok: 'Ok' }

function veredito(raiz) {
  const achados = listarNos(raiz).flatMap((no) => no.achados)
  if (raiz.nivel === 'danger') return ['danger', 'Perigoso: não abra este arquivo', 'Encontramos sinais fortes de vírus ou golpe. Apague o arquivo e não passe senhas nem códigos para quem enviou.']
  if (achados.some((a) => a.nivel === 'warn' && !a.generico)) return ['warn', 'Suspeito: tenha cuidado', 'Há sinais que pedem atenção. Só abra se você tiver certeza de quem enviou e por quê.']
  if (achados.some((a) => a.nivel === 'warn')) return ['warn', 'É um programa ou script', 'Não encontramos sinais de vírus, mas um programa pode fazer qualquer coisa no computador. Só abra se baixou do site oficial de quem fez.']
  if (raiz.conhecido) return ['ok', 'Arquivo legítimo conhecido', 'Este arquivo exato aparece no banco de softwares conhecidos e nenhum sinal de vírus foi encontrado.']
  return ['ok', 'Nenhum sinal de vírus encontrado', 'Isso não garante 100%: nenhuma análise automática pega tudo. Confira os detalhes abaixo.']
}

/** Achados do arquivo e de tudo que tem dentro, com o caminho de onde veio. */
function todosAchados(raiz) {
  return listarNos(raiz)
    .flatMap((no) => no.achados.map((a) => ({ ...a, onde: no === raiz ? '' : no.caminho.split(' › ').slice(1).join(' › ') })))
    .sort((a, b) => PESO[b.nivel] - PESO[a.nivel])
}

export default function VerificarArquivo() {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [erro, setErro] = useState('')
  const [resultados, setResultados] = useState([])

  const verificar = async (files) => {
    setBusy(true)
    setErro('')
    setResultados([])
    const lista = []
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        setErro(`"${file.name}" tem ${formatarBytes(file.size)}. O limite aqui é ${formatarBytes(MAX_BYTES)}.`)
        continue
      }
      try {
        setStatus(`Lendo ${file.name}…`)
        const bytes = new Uint8Array(await file.arrayBuffer())
        const raiz = await analisar(file.name, bytes, { onProgress: setStatus })

        // Só as impressões digitais (SHA-256) saem do aparelho, nunca o arquivo.
        setStatus('Consultando bases de vírus conhecidos…')
        const hashes = [...new Set(listarNos(raiz).map((no) => no.sha256).filter(Boolean))].slice(0, 25)
        let consulta = { ok: false }
        try {
          const resposta = await fetchJson('/api/verificar-hash', {
            timeout: 25000,
            retries: 0,
            init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes }) },
          })
          aplicarConsulta(raiz, resposta.resultados || {})
          consulta = { ok: true, fontes: resposta.fontes, incompleto: resposta.incompleto, total: hashes.length }
        } catch {
          // Sem internet ou base fora do ar: a análise local continua valendo.
        }
        lista.push({ raiz, consulta })
        track('file_scan', { verdict: raiz.nivel, file_type: raiz.tipo, findings_count: todosAchados(raiz).filter((a) => a.nivel !== 'ok').length, inner_files: listarNos(raiz).length - 1 })
      } catch (error) {
        console.error(error)
        setErro(`Não foi possível analisar "${file.name}". O arquivo pode estar corrompido ou ser grande demais para a memória do aparelho.`)
      }
      setResultados([...lista])
    }
    setStatus('')
    setBusy(false)
  }

  return (
    <div className="tool-stack">
      <FileDrop
        multiple
        onFiles={verificar}
        label={busy ? 'Analisando…' : 'Escolher arquivo'}
        hint="ZIP, EXE, PDF, Word, Excel, APK, scripts, imagens... O arquivo não sai do seu aparelho."
      />
      <Notice>{status}</Notice>
      <Notice kind="error">{erro}</Notice>
      {resultados.map(({ raiz, consulta }) => (
        <Resultado key={`${raiz.nome}-${raiz.sha256}`} raiz={raiz} consulta={consulta} />
      ))}
      {resultados.length > 0 && (
        <Notice kind="info">
          Esta análise procura sinais conhecidos de vírus e golpes, mas não substitui um antivírus. Se você já abriu um arquivo perigoso: desconecte da
          internet, rode o antivírus completo (no Windows, Segurança do Windows &gt; Verificação completa), troque suas senhas de outro aparelho e avise
          seu banco.
        </Notice>
      )}
    </div>
  )
}

function Resultado({ raiz, consulta }) {
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [nivel, titulo, texto] = veredito(raiz)
  const achados = todosAchados(raiz)
  const visiveis = mostrarTodos ? achados : achados.slice(0, 12)
  const dentro = listarNos(raiz).slice(1)
  const tabela = [...dentro].sort((a, b) => PESO[b.nivel] - PESO[a.nivel]).slice(0, 300)

  return (
    <section className="scan-result" aria-label={`Resultado de ${raiz.nome}`}>
      <h2 className="tool-subtitle scan-file">{raiz.nome}</h2>
      <div className={`verdict ${nivel}`}>
        <strong>{titulo}</strong>
        <span>{texto}</span>
      </div>

      {achados.length > 0 && (
        <ul className="signal-list">
          {visiveis.map((a, i) => (
            <li key={`${a.onde}-${a.texto}-${i}`} className={a.nivel}>
              {a.onde && <span className="scan-where">{a.onde}: </span>}
              {a.texto}
            </li>
          ))}
        </ul>
      )}
      {achados.length > visiveis.length && (
        <button type="button" className="btn btn-ghost" onClick={() => setMostrarTodos(true)}>
          Ver todos os {achados.length} sinais
        </button>
      )}

      <div className="rows">
        <div className="row"><span>Tipo real</span><strong>{raiz.rotulo}</strong></div>
        <div className="row"><span>Tamanho</span><strong>{formatarBytes(raiz.tamanho)}</strong></div>
        {raiz.detalhes.map(([rotulo, valor]) => (
          <div key={rotulo} className="row"><span>{rotulo}</span><strong>{valor}</strong></div>
        ))}
        <div className="row">
          <span>Bases de vírus</span>
          <strong>
            {consulta.ok
              ? `Consultado em ${consulta.fontes.join(' e ')} (${consulta.total} ${consulta.total > 1 ? 'impressões digitais' : 'impressão digital'})${consulta.incompleto ? ', com falha parcial' : ''}`
              : 'Não foi possível consultar agora'}
          </strong>
        </div>
        <div className="row scan-hash">
          <span>SHA-256</span>
          <strong>{raiz.sha256}</strong>
        </div>
      </div>

      <div className="actions">
        <a className="btn btn-primary" href={`https://www.virustotal.com/gui/file/${raiz.sha256}`} target="_blank" rel="noopener noreferrer">
          Ver no VirusTotal (sem enviar o arquivo)
        </a>
        <CopyButton text={raiz.sha256} label="Copiar SHA-256" />
      </div>

      {dentro.length > 0 && (
        <details className="scan-contents" open={dentro.length <= 15}>
          <summary>Arquivos dentro ({dentro.length})</summary>
          <div className="table-wrap table-scroll">
            <table className="table">
              <thead>
                <tr><th>Arquivo</th><th>Tipo</th><th>Tamanho</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {tabela.map((no, i) => (
                  <tr key={`${no.caminho}-${i}`}>
                    <td className="scan-path">{no.caminho.split(' › ').slice(1).join(' › ')}</td>
                    <td>{no.rotulo}</td>
                    <td>{formatarBytes(no.tamanho)}</td>
                    <td><span className={`scan-badge ${no.nivel}`}>{ROTULO_NIVEL[no.nivel]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dentro.length > tabela.length && <p className="muted small">Mostrando {tabela.length} de {dentro.length} arquivos (os mais preocupantes primeiro).</p>}
        </details>
      )}
    </section>
  )
}
