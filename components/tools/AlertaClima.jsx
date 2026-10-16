'use client'

import { useState } from 'react'
import { Field, Notice } from '../ui'
import { fetchJson, minhaPosicao } from '@/lib/apis'

const TEMPO = [
  [[0], '☀️', 'Céu limpo'], [[1, 2], '🌤️', 'Poucas nuvens'], [[3], '☁️', 'Nublado'], [[45, 48], '🌫️', 'Nevoeiro'],
  [[51, 53, 55, 56, 57], '🌦️', 'Garoa'], [[61, 63, 66], '🌧️', 'Chuva'], [[65, 67], '🌧️', 'Chuva forte'],
  [[71, 73, 75, 77, 85, 86], '🌨️', 'Neve'], [[80, 81], '🌦️', 'Pancadas de chuva'], [[82], '⛈️', 'Pancadas fortes'],
  [[95], '⛈️', 'Tempestade com raios'], [[96, 99], '⛈️', 'Tempestade com granizo'],
]
const tempo = (code) => TEMPO.find(([codes]) => codes.includes(code)) ?? [[], '🌡️', '—']
const DIA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const nomeDia = (iso, i) => (i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : DIA[new Date(`${iso}T12:00`).getDay()])

/** Gera os alertas de um dia com orientação do que fazer. */
function alertasDoDia(d, i) {
  const a = []
  const quando = nomeDia(d.time[i], i).toLowerCase()
  const sens = d.apparent_temperature_max[i]
  if (sens >= 38) a.push(['danger', `Calor extremo ${quando}: sensação de ${Math.round(sens)}°C`, 'Beba água mesmo sem sede, evite sol das 10h às 16h, não deixe crianças, idosos ou animais em carros fechados e fique atento a tontura, dor de cabeça e confusão (sinais de insolação: ligue 192).'])
  else if (sens >= 33) a.push(['warn', `Muito calor ${quando}: sensação de ${Math.round(sens)}°C`, 'Hidrate-se, use roupas leves e redobre o cuidado com bebês, idosos e quem tem doença do coração ou dos rins.'])
  const min = d.temperature_2m_min[i]
  if (min <= 3) a.push(['danger', `Frio intenso ${quando}: mínima de ${Math.round(min)}°C`, 'Risco de geada e hipotermia. Agasalhe idosos e crianças, cuidado com aquecedores e fogareiros em lugar fechado (risco de intoxicação) e ajude quem está na rua ligando para a assistência social da cidade.'])
  else if (min <= 10) a.push(['warn', `Frio ${quando}: mínima de ${Math.round(min)}°C`, 'Agasalhe-se em camadas e proteja idosos, bebês e animais.'])
  const uv = d.uv_index_max[i]
  if (uv >= 11) a.push(['danger', `Índice UV extremo ${quando} (${Math.round(uv)})`, 'Queimadura em poucos minutos. Evite sol das 10h às 16h, use protetor (FPS 30+), chapéu e óculos.'])
  else if (uv >= 8) a.push(['warn', `Índice UV muito alto ${quando} (${Math.round(uv)})`, 'Use protetor solar e reaplique a cada 2 horas; prefira sombra no meio do dia.'])
  const chuva = d.precipitation_sum[i]
  const code = d.weather_code[i]
  if (chuva >= 60) a.push(['danger', `Chuva muito forte ${quando}: cerca de ${Math.round(chuva)} mm`, 'Risco de alagamento e deslizamento. Não atravesse ruas alagadas a pé ou de carro, fique longe de córregos e encostas, e desligue a energia se a água entrar em casa.'])
  else if (chuva >= 30) a.push(['warn', `Chuva forte ${quando}: cerca de ${Math.round(chuva)} mm`, 'Evite áreas que costumam alagar e não estacione perto de árvores ou córregos.'])
  if (code === 96 || code === 99) a.push(['danger', `Tempestade com granizo ${quando}`, 'Guarde o carro em lugar coberto, fique longe de janelas e não se abrigue embaixo de árvores.'])
  else if (code === 95) a.push(['warn', `Tempestade com raios ${quando}`, 'Evite áreas abertas, piscinas e praias; não fique embaixo de árvores e tire aparelhos da tomada.'])
  const vento = d.wind_gusts_10m_max[i]
  if (vento >= 75) a.push(['danger', `Rajadas de vento de até ${Math.round(vento)} km/h ${quando}`, 'Risco de queda de árvores, postes e telhas. Fique em local seguro e longe de placas e árvores.'])
  else if (vento >= 50) a.push(['warn', `Ventania ${quando}: rajadas de ${Math.round(vento)} km/h`, 'Prenda objetos soltos e cuidado ao andar perto de árvores.'])
  const umid = d.relative_humidity_2m_min[i]
  if (umid <= 12) a.push(['danger', `Ar extremamente seco ${quando}: umidade de ${umid}%`, 'Estado de emergência para a saúde. Evite exercícios ao ar livre, beba muita água, use soro nos olhos e no nariz e umidifique o ambiente.'])
  else if (umid <= 20) a.push(['warn', `Ar muito seco ${quando}: umidade de ${umid}%`, 'Evite atividade física das 10h às 17h, hidrate-se e use toalhas molhadas ou bacia de água no quarto.'])
  else if (umid <= 30) a.push(['info', `Ar seco ${quando}: umidade de ${umid}%`, 'Beba bastante água e evite exercício intenso no meio da tarde.'])
  return a
}

export default function AlertaClima() {
  const [cidade, setCidade] = useState('')
  const [opcoes, setOpcoes] = useState(null)
  const [dados, setDados] = useState(null)
  const [busy, setBusy] = useState('')
  const [erro, setErro] = useState('')

  const carregar = async (lugar) => {
    setOpcoes(null)
    setErro('')
    setBusy('Buscando a previsão…')
    const { lat, lon } = lugar
    try {
      const [f, ar, rio] = await Promise.all([
        fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,relative_humidity_2m_min,uv_index_max,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=3`),
        fetchJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&hourly=us_aqi&forecast_days=2&timezone=auto`).catch(() => null),
        fetchJson(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&past_days=60&forecast_days=7`).catch(() => null),
      ])
      const alertas = [0, 1, 2].flatMap((i) => alertasDoDia(f.daily, i))
      // Qualidade do ar: pior valor das próximas 24h (fumaça de queimadas, poluição).
      const aqi = ar ? Math.max(ar.current?.us_aqi ?? 0, ...(ar.hourly?.us_aqi ?? []).slice(0, 24).filter((x) => x != null)) : null
      if (aqi > 150) alertas.unshift(['danger', `Ar insalubre (índice ${aqi})`, 'Fumaça ou poluição forte. Fique em casa com janelas fechadas, evite exercício ao ar livre e use máscara PFF2 se precisar sair. Crianças, idosos, gestantes e asmáticos são os mais afetados.'])
      else if (aqi > 100) alertas.push(['warn', `Ar ruim para grupos sensíveis (índice ${aqi})`, 'Quem tem asma, bronquite, doença do coração, crianças e idosos devem evitar esforço ao ar livre.'])
      // Rio: compara a previsão com a média dos últimos 60 dias (indicador experimental).
      let rioInfo = null
      if (rio?.daily?.river_discharge) {
        const v = rio.daily.river_discharge
        const passado = v.slice(0, 60).filter((x) => x != null)
        const futuro = v.slice(60).filter((x) => x != null)
        const media = passado.reduce((s, x) => s + x, 0) / Math.max(1, passado.length)
        const pico = Math.max(...futuro)
        if (media >= 5 && futuro.length) {
          rioInfo = { media, pico, razao: pico / media }
          if (pico / media >= 3) alertas.unshift(['danger', 'Rio da região bem acima do normal nos próximos dias', 'O volume previsto é mais que o triplo da média recente. Se você mora perto de rio ou córrego, acompanhe a Defesa Civil, separe documentos e remédios e tenha um plano para sair.'])
          else if (pico / media >= 2) alertas.push(['warn', 'Rio da região acima do normal', 'O volume previsto é o dobro da média recente. Fique atento aos avisos da Defesa Civil.'])
        }
      }
      setDados({ lugar, f, aqi, pm25: ar?.current?.pm2_5, rioInfo, alertas })
    } catch {
      setErro('Não foi possível buscar a previsão agora. Tente de novo em instantes.')
    } finally {
      setBusy('')
    }
  }

  const buscarCidade = async (event) => {
    event.preventDefault()
    setErro('')
    if (cidade.trim().length < 2) return setErro('Digite o nome da cidade.')
    setBusy('Procurando a cidade…')
    try {
      const r = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade.trim())}&count=6&language=pt&countryCode=BR`)
      const lista = (r.results ?? []).map((c) => ({ lat: c.latitude, lon: c.longitude, nome: `${c.name}${c.admin1 ? ` - ${c.admin1}` : ''}` }))
      setBusy('')
      if (!lista.length) return setErro('Cidade não encontrada. Confira a grafia.')
      if (lista.length === 1) return carregar(lista[0])
      setOpcoes(lista)
    } catch {
      setBusy('')
      setErro('Não foi possível procurar a cidade agora.')
    }
  }

  const usarLocalizacao = async () => {
    setErro('')
    setBusy('Pegando sua localização…')
    try {
      const p = await minhaPosicao()
      let nome = 'Sua localização'
      try {
        const r = await fetchJson(`https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lon}&format=jsonv2&zoom=10`, { timeout: 8000, retries: 0 })
        const a = r.address ?? {}
        nome = [a.city || a.town || a.village || a.municipality, a.state].filter(Boolean).join(' - ') || nome
      } catch {
        /* sem nome, segue com as coordenadas */
      }
      await carregar({ ...p, nome })
    } catch (e) {
      setBusy('')
      setErro(e.message)
    }
  }

  const ordem = { danger: 0, warn: 1, info: 2 }
  const f = dados?.f

  return (
    <div className="tool-stack">
      <div className="grid-2">
        <form className="input-group" onSubmit={buscarCidade}>
          <Field label="Cidade">
            <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex.: Porto Alegre" />
          </Field>
          <button type="submit" className="btn btn-primary" disabled={!!busy}>Ver alertas</button>
        </form>
        <button type="button" className="btn btn-ghost btn-lg" onClick={usarLocalizacao} disabled={!!busy}>📍 Usar minha localização</button>
      </div>
      {busy && (
        <p className="muted">
          <span className="spinner" aria-hidden="true" /> {busy}
        </p>
      )}
      <Notice kind="error">{erro}</Notice>
      {opcoes && (
        <div className="chips">
          {opcoes.map((o) => (
            <button key={`${o.lat},${o.lon}`} type="button" className="chip" onClick={() => carregar(o)}>{o.nome}</button>
          ))}
        </div>
      )}
      {dados && f && (
        <>
          <h2 className="tool-subtitle">{dados.lugar.nome} — agora</h2>
          <div className="stats">
            <div className="stat highlight"><span>{tempo(f.current.weather_code)[2]}</span><strong>{tempo(f.current.weather_code)[1]} {Math.round(f.current.temperature_2m)}°C</strong></div>
            <div className="stat"><span>Sensação</span><strong>{Math.round(f.current.apparent_temperature)}°C</strong></div>
            <div className="stat"><span>Umidade</span><strong>{f.current.relative_humidity_2m}%</strong></div>
            <div className="stat"><span>Rajadas</span><strong>{Math.round(f.current.wind_gusts_10m)} km/h</strong></div>
            {dados.aqi != null && <div className="stat"><span>Qualidade do ar</span><strong>{dados.aqi <= 50 ? 'Boa' : dados.aqi <= 100 ? 'Moderada' : dados.aqi <= 150 ? 'Ruim p/ sensíveis' : 'Insalubre'} ({dados.aqi})</strong></div>}
          </div>
          {dados.alertas.length ? (
            <ul className="alert-list">
              {[...dados.alertas].sort((a, b) => ordem[a[0]] - ordem[b[0]]).map(([k, titulo, oQueFazer]) => (
                <li key={titulo} className={k}>
                  <strong>{titulo}</strong>
                  <span>{oQueFazer}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Notice kind="ok">Nenhum alerta para os próximos 3 dias. Bom tempo!</Notice>
          )}
          <div className="day-cards">
            {f.daily.time.map((t, i) => (
              <div key={t} className="day-card">
                <strong>{nomeDia(t, i)}</strong>
                <span className="day-icon">{tempo(f.daily.weather_code[i])[1]}</span>
                <span>{tempo(f.daily.weather_code[i])[2]}</span>
                <span>{Math.round(f.daily.temperature_2m_min[i])}° / {Math.round(f.daily.temperature_2m_max[i])}°</span>
                <small>Chuva: {Math.round(f.daily.precipitation_sum[i])} mm ({f.daily.precipitation_probability_max[i] ?? 0}%)</small>
                <small>UV máx.: {Math.round(f.daily.uv_index_max[i])} • Umidade mín.: {f.daily.relative_humidity_2m_min[i]}%</small>
              </div>
            ))}
          </div>
          {dados.rioInfo && (
            <p className="muted small">
              Rio mais próximo (modelo GloFAS, indicador experimental): pico previsto de {Math.round(dados.rioInfo.pico)} m³/s contra média de {Math.round(dados.rioInfo.media)} m³/s nos últimos 60 dias.
            </p>
          )}
          <Notice kind="info">
            Receba os alertas oficiais da Defesa Civil de graça por SMS: envie seu CEP para 40199. Em emergência: Defesa Civil 199, Bombeiros 193, SAMU 192.
          </Notice>
          <p className="muted small">Previsão do Open-Meteo (modelos meteorológicos globais). Para avisos oficiais consulte também o INMET e a Defesa Civil do seu estado.</p>
        </>
      )}
    </div>
  )
}
