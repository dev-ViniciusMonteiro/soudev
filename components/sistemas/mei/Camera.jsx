'use client'

// Câmera do MEI na Mão: reconhece o produto pela imagem, lê QR/código de barras e tira as fotos que ensinam o sistema.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { brl } from '@/lib/sistemas/regras'
import { bip, useSistema } from '../base'
import { lerCodigo, miniatura, palpite, produtoDoQr, ranquear, vetorDe } from '@/lib/sistemas/visao'

function useCamera() {
  const video = useRef(null)
  const [erro, setErro] = useState('')
  const [pronta, setPronta] = useState(false)
  useEffect(() => {
    let stream
    let vivo = true
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(async (s) => {
        if (!vivo) return s.getTracks().forEach((t) => t.stop())
        stream = s
        video.current.srcObject = s
        await video.current.play()
        setPronta(true)
      })
      .catch((e) => setErro(e.name === 'NotAllowedError' ? 'Permita o uso da câmera para continuar.' : `Não consegui abrir a câmera (${e.message}).`))
    if (!navigator.mediaDevices) setErro('Este navegador não dá acesso à câmera. Abra o site pelo Chrome ou Safari.')
    return () => {
      vivo = false
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])
  return { video, erro, pronta }
}

/** Lê QR Code ou código de barras e devolve o produto (ou o código desconhecido). */
export function LerCodigo({ produtos, onProduto, onDesconhecido }) {
  const { video, erro, pronta } = useCamera()
  const [msg, setMsg] = useState('Aponte para o QR Code ou o código de barras')
  const pausa = useRef(0)
  // O mesmo código só conta de novo depois de sair do quadro (segurar o produto não soma várias vezes).
  const visto = useRef({ codigo: '', quando: 0 })
  // Callbacks em ref: o leitor não reinicia quando o componente pai redesenha.
  const cb = useRef({ produtos, onProduto, onDesconhecido })
  cb.current = { produtos, onProduto, onDesconhecido }
  useEffect(() => {
    if (!pronta) return
    let parar = false
    const loop = async () => {
      if (parar) return
      if (Date.now() > pausa.current) {
        const codigo = await lerCodigo(video.current).catch(() => null)
        const repetido = codigo && codigo === visto.current.codigo && Date.now() - visto.current.quando < 2500
        if (codigo) visto.current = { codigo, quando: Date.now() }
        if (codigo && !repetido) {
          pausa.current = Date.now() + 1800
          const { produtos, onProduto, onDesconhecido } = cb.current
          const id = produtoDoQr(codigo)
          const p = id ? produtos.find((x) => x.id === id) : produtos.find((x) => x.codigo_barras && String(x.codigo_barras) === codigo)
          if (p) {
            bip()
            setMsg(`✓ ${p.nome}`)
            onProduto(p)
          } else {
            setMsg(`Código ${codigo} não cadastrado`)
            onDesconhecido?.(codigo)
          }
        }
      }
      setTimeout(loop, 250)
    }
    loop()
    return () => {
      parar = true
    }
  }, [pronta, video])
  return (
    <div className="mf-camera">
      {erro ? <p className="notice error">{erro}</p> : <video ref={video} playsInline muted />}
      <div className="mf-mira codigo" aria-hidden="true" />
      <p className="mf-camera-msg" role="status">
        {pronta ? msg : 'Abrindo a câmera…'}
      </p>
    </div>
  )
}

/** Mostra o produto para a câmera: o sistema sugere qual é e a pessoa confirma. Errou? Ela escolhe o certo e o sistema aprende. */
export function Reconhecer({ produtos, onProduto }) {
  const { banco } = useSistema()
  const { video, erro, pronta } = useCamera()
  const [estado, setEstado] = useState('carregando')
  const [sugestao, setSugestao] = useState(null)
  const [opcoes, setOpcoes] = useState(null)
  const ultimoVetor = useRef(null)
  const ensinados = useMemo(() => produtos.filter((p) => Array.isArray(p.visual) && p.visual.length), [produtos])

  const procurar = useCallback(async () => {
    if (!video.current) return null
    const v = await vetorDe(video.current)
    ultimoVetor.current = v
    return ranquear(v, ensinados)
  }, [ensinados, video])

  useEffect(() => {
    if (!pronta || sugestao || opcoes || !ensinados.length) return
    let parar = false
    const loop = async () => {
      if (parar) return
      try {
        const ranking = await procurar()
        setEstado('procurando')
        const p = ranking && palpite(ranking)
        if (p && !parar) {
          setSugestao({ ...p, ranking })
          return
        }
      } catch (e) {
        setEstado(`erro:${e.message}`)
        return
      }
      setTimeout(loop, 500)
    }
    loop()
    return () => {
      parar = true
    }
  }, [pronta, sugestao, opcoes, ensinados.length, procurar])

  const aprender = (p) => {
    if (!ultimoVetor.current) return
    const visual = [...(Array.isArray(p.visual) ? p.visual : []), ultimoVetor.current].slice(-6)
    banco.salvar('produtos', { id: p.id, visual })
  }

  const confirmar = (p, ensinar) => {
    bip()
    if (ensinar) aprender(p)
    onProduto(p)
    setSugestao(null)
    setOpcoes(null)
  }

  if (!ensinados.length) {
    return (
      <div className="mf-vazio">
        <span aria-hidden="true">📸</span>
        <p>
          Primeiro ensine o sistema: em <b>Meus produtos</b>, abra um produto e toque em <b>Ensinar a câmera</b> (3 fotos). Depois é só mostrar o produto aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="mf-camera">
      {erro ? <p className="notice error">{erro}</p> : <video ref={video} playsInline muted />}
      <div className="mf-mira" aria-hidden="true" />
      {!sugestao && !opcoes && (
        <p className="mf-camera-msg" role="status">
          {!pronta ? 'Abrindo a câmera…' : estado === 'carregando' ? 'Preparando a câmera inteligente (na primeira vez baixa uns 4 MB)…' : estado.startsWith('erro:') ? `Não consegui reconhecer: ${estado.slice(5)}` : 'Mostre o produto no meio da tela'}
        </p>
      )}
      {sugestao && (
        <div className="mf-sugestao" role="dialog" aria-label="Produto reconhecido">
          {sugestao.produto.foto_url ? <img src={sugestao.produto.foto_url} alt="" /> : <span className="mf-letra">{sugestao.produto.nome[0]}</span>}
          <div>
            <small>É este?</small>
            <strong>{sugestao.produto.nome}</strong>
            <span>{brl(sugestao.produto.preco)}</span>
          </div>
          <div className="mf-sugestao-botoes">
            <button type="button" className="mf-sim" onClick={() => confirmar(sugestao.produto, sugestao.nota < 0.9)}>
              ✓ Sim
            </button>
            <button type="button" className="mf-nao" onClick={() => (setOpcoes(sugestao.ranking.slice(0, 6).map((r) => r.produto)), setSugestao(null))}>
              ✗ Não
            </button>
          </div>
        </div>
      )}
      {opcoes && (
        <div className="mf-sugestao lista" role="dialog" aria-label="Escolha o produto certo">
          <strong>Qual é o produto? O sistema vai aprender.</strong>
          <div className="mf-opcoes">
            {[...opcoes, ...produtos.filter((p) => !opcoes.includes(p))].slice(0, 12).map((p) => (
              <button key={p.id} type="button" onClick={() => confirmar(p, true)}>
                {p.nome}
              </button>
            ))}
          </div>
          <button type="button" className="mf-nao" onClick={() => setOpcoes(null)}>
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  )
}

/** Tira 3 fotos de ângulos diferentes para ensinar o produto à câmera. A primeira vira a foto do cartão. */
export function Ensinar({ produto, onPronto }) {
  const { video, erro, pronta } = useCamera()
  const [fotos, setFotos] = useState([])
  const [ocupado, setOcupado] = useState(false)
  const [msgErro, setMsgErro] = useState('')
  const dicas = ['De frente', 'De lado', 'Mais perto ou de cima']
  const tirar = async () => {
    setOcupado(true)
    setMsgErro('')
    try {
      const vetor = await vetorDe(video.current)
      const foto = fotos.length === 0 ? miniatura(video.current) : null
      const novas = [...fotos, { vetor, foto }]
      setFotos(novas)
      bip()
      if (novas.length === 3) onPronto({ vetores: novas.map((f) => f.vetor), foto: novas[0].foto })
    } catch (e) {
      setMsgErro(`Não consegui processar a foto: ${e.message}`)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <div className="mf-camera">
      {erro ? <p className="notice error">{erro}</p> : <video ref={video} playsInline muted />}
      <div className="mf-mira" aria-hidden="true" />
      <p className="mf-camera-msg">
        Foto {Math.min(fotos.length + 1, 3)} de 3 · {dicas[Math.min(fotos.length, 2)]} · {produto?.nome}
      </p>
      <button type="button" className="mf-disparo" disabled={!pronta || ocupado || fotos.length >= 3} onClick={tirar} aria-label="Tirar foto">
        {ocupado ? '…' : '📸'}
      </button>
      {msgErro && <p className="notice error">{msgErro}</p>}
    </div>
  )
}
