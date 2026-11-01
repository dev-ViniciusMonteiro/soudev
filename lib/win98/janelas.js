// Gerenciador de janelas (função pura, usada com useReducer): abrir em cascata, focar trazendo para a frente,
// minimizar, maximizar/restaurar, mover, redimensionar e o clique na barra de tarefas do Windows 98
// (janela ativa → minimiza; outra → restaura e ativa).

export const LARGURA_MIN = 120
export const ALTURA_MIN = 60

export const estadoInicial = () => ({ janelas: [], ordem: [], ativa: null, proximo: 1 })

/** Janela visível mais de cima (a que fica ativa quando a atual some). */
function topoVisivel(janelas, ordem, exceto) {
  for (let i = ordem.length - 1; i >= 0; i--) {
    const j = janelas.find((x) => x.id === ordem[i])
    if (j && j.id !== exceto && !j.min) return j.id
  }
  return null
}

const trocar = (estado, id, mudanca) => ({ ...estado, janelas: estado.janelas.map((j) => (j.id === id ? { ...j, ...mudanca } : j)) })

const paraFrente = (ordem, id) => [...ordem.filter((x) => x !== id), id]

export function janelas(estado, acao) {
  switch (acao.tipo) {
    case 'abrir': {
      const { app, titulo, icone, largura = 440, altura = 320, props = {}, unica = false, redimensionavel = true, area = { largura: 1024, altura: 740 }, max = false, extra = {} } = acao
      if (unica) {
        const ja = estado.janelas.find((j) => j.app === app)
        if (ja) return janelas(estado, { tipo: 'focar', id: ja.id })
      }
      const id = `j${estado.proximo}`
      // Cascata: cada janela nova desce e anda 22 px; volta ao começo quando sairia da tela.
      const passo = estado.janelas.length % 8
      const w = Math.min(largura, area.largura - 8)
      const h = Math.min(altura, area.altura - 8)
      const x = Math.max(0, Math.min(36 + passo * 22, area.largura - w))
      const y = Math.max(0, Math.min(24 + passo * 22, area.altura - h))
      const nova = { ...extra, id, app, titulo, icone, x, y, w, h, min: false, max: max && redimensionavel, props, redimensionavel }
      return { janelas: [...estado.janelas, nova], ordem: [...estado.ordem, id], ativa: id, proximo: estado.proximo + 1 }
    }
    case 'fechar': {
      const janelasSem = estado.janelas.filter((j) => j.id !== acao.id)
      const ordem = estado.ordem.filter((x) => x !== acao.id)
      const ativa = estado.ativa === acao.id ? topoVisivel(janelasSem, ordem) : estado.ativa
      return { ...estado, janelas: janelasSem, ordem, ativa }
    }
    case 'focar': {
      if (!estado.janelas.some((j) => j.id === acao.id)) return estado
      return { ...trocar(estado, acao.id, { min: false }), ordem: paraFrente(estado.ordem, acao.id), ativa: acao.id }
    }
    case 'desfocar':
      return { ...estado, ativa: null }
    case 'minimizar': {
      const e = trocar(estado, acao.id, { min: true })
      return { ...e, ativa: estado.ativa === acao.id ? topoVisivel(e.janelas, e.ordem, acao.id) : estado.ativa }
    }
    case 'maximizar': {
      const j = estado.janelas.find((x) => x.id === acao.id)
      if (!j || !j.redimensionavel) return estado
      return { ...trocar(estado, acao.id, { max: !j.max, min: false }), ordem: paraFrente(estado.ordem, acao.id), ativa: acao.id }
    }
    case 'mover':
      return trocar(estado, acao.id, { x: Math.round(acao.x), y: Math.max(0, Math.round(acao.y)) })
    case 'redimensionar':
      return trocar(estado, acao.id, {
        ...(acao.x !== undefined ? { x: Math.round(acao.x) } : {}),
        ...(acao.y !== undefined ? { y: Math.max(0, Math.round(acao.y)) } : {}),
        w: Math.max(LARGURA_MIN, Math.round(acao.w)),
        h: Math.max(ALTURA_MIN, Math.round(acao.h)),
      })
    case 'tarefa': {
      // Clique no botão da barra de tarefas.
      const j = estado.janelas.find((x) => x.id === acao.id)
      if (!j) return estado
      if (estado.ativa === acao.id && !j.min) return janelas(estado, { tipo: 'minimizar', id: acao.id })
      return janelas(estado, { tipo: 'focar', id: acao.id })
    }
    case 'titulo':
      return trocar(estado, acao.id, { titulo: acao.titulo })
    case 'icone':
      return trocar(estado, acao.id, { icone: acao.icone })
    case 'fecharTodas':
      return { ...estadoInicial(), proximo: estado.proximo }
    case 'props':
      return trocar(estado, acao.id, { props: { ...estado.janelas.find((j) => j.id === acao.id)?.props, ...acao.props } })
    case 'tamanho':
      return trocar(estado, acao.id, { w: acao.w, h: acao.h })
    case 'minimizarTodas':
      return { ...estado, janelas: estado.janelas.map((j) => ({ ...j, min: true })), ativa: null }
    default:
      return estado
  }
}

/** Posição de cada janela na pilha (z-index). */
export const camada = (estado, id) => estado.ordem.indexOf(id) + 1
