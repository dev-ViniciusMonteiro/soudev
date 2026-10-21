'use client'

// Radar de Imóveis: prospecção para corretor. Mapa com sua localização e as construções em volta, ficha de cada
// imóvel com dados públicos (endereço, CEP, área, empresas no local, sócios pelo CNPJ, o que tem no bairro)
// e o caminho oficial até o proprietário (matrícula no cartório). A carteira fica salva no navegador.

import { useEffect, useState } from 'react'
import Carteira from './Carteira'
import Ficha from './Ficha'
import Guia from './Guia'
import Mapa from './Mapa'

const CHAVE = 'imoveis.carteira'

function lerCarteira() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? []
  } catch {
    return []
  }
}

export default function Imoveis() {
  const [aba, setAba] = useState('mapa')
  const [ponto, setPonto] = useState(null) // { lat, lon, construcao?, salvoId? }
  const [carteira, setCarteira] = useState([])
  const [centro, setCentro] = useState(null)

  useEffect(() => {
    setCarteira(lerCarteira())
    document.documentElement.classList.add('ap-tela-cheia')
    return () => document.documentElement.classList.remove('ap-tela-cheia')
  }, [])

  const salvarCarteira = (lista) => {
    setCarteira(lista)
    try {
      localStorage.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      /* sem armazenamento */
    }
  }

  const salvarItem = (item) => {
    const agora = new Date().toISOString()
    const existe = carteira.some((x) => x.id === item.id)
    salvarCarteira(existe ? carteira.map((x) => (x.id === item.id ? { ...x, ...item, atualizado: agora } : x)) : [{ ...item, criado: agora, atualizado: agora }, ...carteira])
  }

  const abrirNoMapa = (item) => {
    setAba('mapa')
    setCentro({ lat: item.lat, lon: item.lon, zoom: 19, t: Date.now() })
    setPonto({ lat: item.lat, lon: item.lon, salvoId: item.id })
  }

  return (
    <div className="im-app">
      <header className="im-topo">
        <a href="/apps/imoveis" className="im-voltar" aria-label="Sobre o Radar de Imóveis">
          ←
        </a>
        <strong>Radar de Imóveis</strong>
        <nav className="im-abas" aria-label="Seções">
          {[
            ['mapa', '🗺️ Mapa'],
            ['carteira', `📋 Carteira (${carteira.length})`],
            ['guia', '📖 Achar o dono'],
          ].map(([id, rotulo]) => (
            <button key={id} type="button" className={aba === id ? 'chip active' : 'chip'} onClick={() => setAba(id)}>
              {rotulo}
            </button>
          ))}
        </nav>
      </header>

      <div className="im-corpo" hidden={aba !== 'mapa'}>
        <Mapa centro={centro} ponto={ponto} carteira={carteira} aoEscolher={setPonto} visivel={aba === 'mapa'} />
        {ponto && (
          <Ficha
            key={`${ponto.lat},${ponto.lon},${ponto.construcao?.id ?? ''}`}
            ponto={ponto}
            salvo={carteira.find((x) => x.id === ponto.salvoId) ?? carteira.find((x) => Math.abs(x.lat - ponto.lat) < 1e-5 && Math.abs(x.lon - ponto.lon) < 1e-5)}
            aoSalvar={salvarItem}
            aoFechar={() => setPonto(null)}
          />
        )}
      </div>
      {aba === 'carteira' && <Carteira carteira={carteira} salvar={salvarCarteira} abrirNoMapa={abrirNoMapa} />}
      {aba === 'guia' && <Guia />}
    </div>
  )
}
