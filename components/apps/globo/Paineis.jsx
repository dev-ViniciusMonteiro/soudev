'use client'

import { useEffect, useState } from 'react'
import { distancia, fmtCoord, passagens, pontoCardeal } from '@/lib/globo/geo'

const fmtNum = (n, d = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
const fmtQuando = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function relativo(t) {
  const s = Math.round((new Date(t).getTime() - Date.now()) / 1000)
  const a = Math.abs(s)
  const txt = a < 3600 ? `${Math.round(a / 60)} min` : a < 86400 ? `${Math.floor(a / 3600)} h ${Math.round((a % 3600) / 60)} min` : `${Math.floor(a / 86400)} d ${Math.floor((a % 86400) / 3600)} h`
  return s >= 0 ? `em ${txt}` : `há ${txt}`
}

function Linha({ rotulo, children }) {
  if (children === '' || children === null || children === undefined) return null
  return (
    <div className="gl-linha">
      <dt>{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function InfoSelecionado({ sel, C, sat, viewer, rastreando, cabine, radio, onRastrear, onCabine, onTocarRadio, onEstacoes, onFechar, voarPara, avisar }) {
  const m = sel.meta
  const [, tique] = useState(0)
  const [passes, setPasses] = useState(null)
  useEffect(() => {
    const t = setInterval(() => tique((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => setPasses(null), [sel.id])

  const preverPassagens = (obs, origem) => {
    const lista = passagens(sat, m.satrec, obs, { horas: 48 })
    setPasses({ lista, origem })
  }
  const passagensAqui = () => {
    if (!navigator.geolocation) return preverPassagensCentro()
    navigator.geolocation.getCurrentPosition(
      (p) => preverPassagens({ lat: p.coords.latitude, lon: p.coords.longitude, alt: p.coords.altitude || 0 }, 'sua localização'),
      () => {
        avisar('Sem permissão de localização: usei o centro da vista.')
        preverPassagensCentro()
      },
      { timeout: 8000 },
    )
  }
  const preverPassagensCentro = () => {
    const cv = viewer.scene.canvas
    const p = viewer.camera.pickEllipsoid(new C.Cartesian2(cv.clientWidth / 2, cv.clientHeight / 2))
    const g = p ? C.Cartographic.fromCartesian(p) : viewer.camera.positionCartographic
    preverPassagens({ lat: C.Math.toDegrees(g.latitude), lon: C.Math.toDegrees(g.longitude) }, 'centro da vista')
  }

  return (
    <aside className="gl-painel gl-painel-dir" aria-label="Detalhes">
      <div className="gl-painel-topo">
        <h2>{m.titulo}</h2>
        <button type="button" className="gl-btn" onClick={onFechar} aria-label="Fechar detalhes">
          ✕
        </button>
      </div>
      <dl className="gl-dados">
        {m.tipo === 'aviao' && (
          <>
            <Linha rotulo="Voo">{m.voo}</Linha>
            <Linha rotulo="Matrícula">{m.reg}</Linha>
            <Linha rotulo="Modelo">{m.modelo}</Linha>
            <Linha rotulo="ICAO">{m.id?.toUpperCase()}</Linha>
            <Linha rotulo="Altitude">{m.solo ? 'No solo' : `${fmtNum(m.alt)} ft (${fmtNum(m.alt * 0.3048)} m)`}</Linha>
            <Linha rotulo="Velocidade">{m.vel ? `${fmtNum(m.vel)} kt (${fmtNum(m.vel * 1.852)} km/h)` : ''}</Linha>
            <Linha rotulo="Rumo">{`${fmtNum(m.rumo)}° ${pontoCardeal(m.rumo)}`}</Linha>
            <Linha rotulo="Subida">{m.vs ? `${m.vs > 0 ? '+' : ''}${fmtNum(m.vs)} ft/min` : 'Nivelado'}</Linha>
            <Linha rotulo="Squawk">{m.sq ? `${m.sq}${m.squawkTexto ? ` · ${m.squawkTexto}` : ''}` : ''}</Linha>
            <Linha rotulo="Emergência">{m.emerg}</Linha>
            <Linha rotulo="Militar">{m.mil ? 'Sim' : ''}</Linha>
          </>
        )}
        {m.tipo === 'satelite' && (
          <>
            <Linha rotulo="NORAD">{m.id}</Linha>
            <Linha rotulo="Altitude">{`${fmtNum((m.alt || 0) / 1000)} km`}</Linha>
            <Linha rotulo="Velocidade">{m.vel ? `${fmtNum(m.vel, 2)} km/s (${fmtNum(m.vel * 3600)} km/h)` : ''}</Linha>
            <Linha rotulo="Uma volta">{m.periodo ? `${fmtNum(m.periodo)} min` : ''}</Linha>
            <Linha rotulo="Sobre">{fmtCoord(m.lat || 0, m.lon || 0)}</Linha>
          </>
        )}
        {m.tipo === 'terremoto' && (
          <>
            <Linha rotulo="Magnitude">{m.mag?.toFixed(1)}</Linha>
            <Linha rotulo="Local">{m.lugar}</Linha>
            <Linha rotulo="Quando">{`${fmtQuando(m.quando)} (${relativo(m.quando)})`}</Linha>
            <Linha rotulo="Profundidade">{`${fmtNum(m.prof)} km`}</Linha>
            <Linha rotulo="Tsunami">{m.tsunami ? '⚠ Alerta de tsunami emitido' : ''}</Linha>
          </>
        )}
        {m.tipo === 'evento' && (
          <>
            <Linha rotulo="Tipo">{m.categoria}</Linha>
            <Linha rotulo="Registro">{`${fmtQuando(m.quando)} (${relativo(m.quando)})`}</Linha>
          </>
        )}
        {m.tipo === 'ciclone' && (
          <>
            <Linha rotulo="Classe">{m.classe}</Linha>
            <Linha rotulo="Vento">{m.intensidade ? `${m.intensidade} kt (${fmtNum(m.intensidade * 1.852)} km/h)` : ''}</Linha>
            <Linha rotulo="Pressão">{m.pressao ? `${m.pressao} mb` : ''}</Linha>
            <Linha rotulo="Movimento">{m.movimento}</Linha>
            <Linha rotulo="Atualizado">{m.atualizado ? fmtQuando(m.atualizado) : ''}</Linha>
          </>
        )}
        {m.tipo === 'lancamento' && (
          <>
            <Linha rotulo="Quando">{`${fmtQuando(m.quando)} (${relativo(m.quando)})`}</Linha>
            <Linha rotulo="Status">{m.status}</Linha>
            <Linha rotulo="Foguete">{m.foguete}</Linha>
            <Linha rotulo="Empresa">{m.empresa}</Linha>
            <Linha rotulo="Base">{`${m.base}${m.local ? `, ${m.local}` : ''}`}</Linha>
          </>
        )}
        {m.tipo === 'radio' && (
          <>
            <Linha rotulo="País">{m.pais}</Linha>
            <Linha rotulo="Estilo">{m.tags?.split(',').slice(0, 4).join(', ')}</Linha>
            <Linha rotulo="Qualidade">{m.kbps ? `${m.codec} ${m.kbps} kbps` : m.codec}</Linha>
          </>
        )}
        {m.tipo === 'bike-rede' && (
          <>
            <Linha rotulo="Cidade">{`${m.cidade}, ${m.pais}`}</Linha>
            <Linha rotulo="Empresa">{m.empresa}</Linha>
          </>
        )}
        {m.tipo === 'bike-estacao' && (
          <>
            <Linha rotulo="Bicicletas livres">{m.livres ?? '?'}</Linha>
            <Linha rotulo="Vagas">{m.vagas ?? '?'}</Linha>
          </>
        )}
        {m.tipo === 'camera' && (
          <>
            <Linha rotulo="Operador">{m.operador}</Linha>
            <Linha rotulo="Área">{m.zona}</Linha>
            <Linha rotulo="Descrição">{m.descricao}</Linha>
          </>
        )}
        {m.tipo === 'vento' && (
          <>
            <Linha rotulo="Velocidade">{`${fmtNum(m.vel)} km/h`}</Linha>
            <Linha rotulo="Rajadas">{`${fmtNum(m.raj)} km/h`}</Linha>
            <Linha rotulo="Vem do">{`${pontoCardeal(m.dir)} (${fmtNum(m.dir)}°)`}</Linha>
            <Linha rotulo="Temperatura">{m.temp !== undefined ? `${fmtNum(m.temp, 1)} °C` : ''}</Linha>
          </>
        )}
        {m.lat !== undefined && m.tipo !== 'satelite' && <Linha rotulo="Posição">{fmtCoord(m.lat, m.lon)}</Linha>}
      </dl>

      {m.tipo === 'lancamento' && m.imagem && <img className="gl-foto" src={m.imagem} alt={m.foguete} loading="lazy" />}
      {m.tipo === 'lancamento' && m.missao && <p className="gl-texto">{m.missao}</p>}

      <div className="gl-acoes">
        {['aviao', 'satelite'].includes(m.tipo) && (
          <button type="button" className={`gl-botao ${rastreando ? 'ativo' : ''}`} onClick={() => onRastrear(!rastreando)}>
            {rastreando ? '■ Parar de seguir' : '🎯 Seguir'}
          </button>
        )}
        {m.tipo === 'aviao' && (
          <button type="button" className={`gl-botao ${cabine ? 'ativo' : ''}`} onClick={onCabine}>
            {cabine ? '■ Sair da cabine' : '🛫 Visão da cabine (C)'}
          </button>
        )}
        {m.tipo === 'satelite' && (
          <button type="button" className="gl-botao" onClick={passagensAqui}>
            🔭 Quando passa por aqui?
          </button>
        )}
        {m.tipo === 'radio' && (
          <button type="button" className="gl-botao" onClick={() => onTocarRadio(radio?.id === m.id ? null : m)}>
            {radio?.id === m.id ? '■ Parar' : '▶ Ouvir agora'}
          </button>
        )}
        {m.tipo === 'bike-rede' && (
          <button type="button" className="gl-botao" onClick={() => onEstacoes(m.id.replace(/^bk-/, ''))}>
            🚲 Ver estações
          </button>
        )}
        {m.lat !== undefined && !['aviao', 'satelite'].includes(m.tipo) && (
          <button type="button" className="gl-botao" onClick={() => voarPara(m.lon, m.lat, m.tipo === 'camera' || m.tipo === 'bike-estacao' ? 1500 : 250000, 0, -55)}>
            ✈ Ir até lá
          </button>
        )}
        {m.tipo === 'aviao' && (
          <a className="gl-botao" href={`https://adsb.lol/?icao=${m.id}`} target="_blank" rel="noopener noreferrer">
            Abrir no adsb.lol ↗
          </a>
        )}
        {m.tipo === 'terremoto' && m.url && (
          <a className="gl-botao" href={m.url} target="_blank" rel="noopener noreferrer">
            Detalhes no USGS ↗
          </a>
        )}
        {m.tipo === 'evento' && m.fonte && (
          <a className="gl-botao" href={m.fonte} target="_blank" rel="noopener noreferrer">
            Fonte ↗
          </a>
        )}
        {m.tipo === 'lancamento' && m.video && (
          <a className="gl-botao" href={m.video} target="_blank" rel="noopener noreferrer">
            Transmissão ↗
          </a>
        )}
      </div>

      {passes && (
        <div className="gl-passes">
          <h3>Próximas passagens · {passes.origem}</h3>
          {passes.lista.length ? (
            <ul>
              {passes.lista.map((p) => (
                <li key={p.inicio.getTime()}>
                  <strong>{p.inicio.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</strong>
                  <span>
                    {Math.max(1, Math.round((p.fim - p.inicio) / 60000))} min · até {p.maxElev}° de altura · do {pontoCardeal(p.azInicio)} para o {pontoCardeal(p.azFim)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gl-texto">Não passa a mais de 10° do horizonte nas próximas 48 horas.</p>
          )}
          <p className="gl-fonte">Visível a olho nu quando passa à noite com o céu limpo e o satélite ainda iluminado pelo sol (logo depois do pôr ou antes do nascer do sol).</p>
        </div>
      )}
      {m.tipo === 'camera' && <p className="gl-fonte">Dado público do OpenStreetMap, mapeado por voluntários. Não há imagem ao vivo.</p>}
    </aside>
  )
}

/* ---------- Contatos na vista ---------- */

const TIPOS = [
  ['aviao', '✈️ Aviões'],
  ['satelite', '🛰️ Satélites'],
  ['terremoto', '〰️ Terremotos'],
  ['evento', '🔥 Eventos'],
  ['lancamento', '🚀 Lançamentos'],
  ['radio', '📻 Rádios'],
]

export function Contatos({ viewer, C, onEscolher, onFechar }) {
  const [tipo, setTipo] = useState('aviao')
  const [lista, setLista] = useState([])
  useEffect(() => {
    const ler = () => {
      const cv = viewer.scene.canvas
      const p = viewer.camera.pickEllipsoid(new C.Cartesian2(cv.clientWidth / 2, cv.clientHeight / 2))
      const g = p ? C.Cartographic.fromCartesian(p) : viewer.camera.positionCartographic
      const centro = { lat: C.Math.toDegrees(g.latitude), lon: C.Math.toDegrees(g.longitude) }
      const ret = viewer.camera.computeViewRectangle()
      const dentro = (m) => !ret || C.Rectangle.contains(ret, C.Cartographic.fromDegrees(m.lon, m.lat))
      const out = []
      for (let i = 0; i < viewer.dataSources.length; i++)
        for (const e of viewer.dataSources.get(i).entities.values) {
          const m = e.meta
          if (!m || m.tipo !== tipo || m.lat === undefined || !dentro(m)) continue
          out.push({ e, m, d: distancia(centro, m) })
        }
      out.sort((a, b) => a.d - b.d)
      setLista(out.slice(0, 80))
    }
    ler()
    const t = setInterval(ler, 2000)
    return () => clearInterval(t)
  }, [viewer, C, tipo])
  return (
    <aside className="gl-painel gl-painel-dir" aria-label="Contatos na vista">
      <div className="gl-painel-topo">
        <h2>Contatos na vista</h2>
        <button type="button" className="gl-btn" onClick={onFechar} aria-label="Fechar contatos">
          ✕
        </button>
      </div>
      <div className="gl-filtros">
        {TIPOS.map(([v, t]) => (
          <button key={v} type="button" className={tipo === v ? 'ativo' : ''} onClick={() => setTipo(v)}>
            {t}
          </button>
        ))}
      </div>
      {!lista.length && <p className="gl-texto">Nada deste tipo na vista. Ligue a camada ou mova o globo.</p>}
      <ul className="gl-contatos">
        {lista.map(({ e, m, d }) => (
          <li key={e.id}>
            <button type="button" onClick={() => onEscolher(e)}>
              <strong>{m.titulo}</strong>
              <span>
                {m.tipo === 'aviao' ? `${fmtNum(m.alt)} ft · ${fmtNum(m.vel)} kt · ` : m.tipo === 'satelite' ? `${fmtNum((m.alt || 0) / 1000)} km · ` : m.tipo === 'terremoto' ? `${relativo(m.quando)} · ` : ''}
                {fmtNum(d / 1000)} km do centro
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
