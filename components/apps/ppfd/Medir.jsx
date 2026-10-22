'use client'

// Tela de medição: fonte (sensor ou câmera), leitura grande em PPFD, faixa da fase, DLI, perfil da luz e calibração.

import { useState } from 'react'
import { FAIXAS, avaliar, dli } from '@/lib/ppfd/luz'

const ESCALA = 1500 // fim da barra (µmol/m²/s)
const num = (n, c = 0) => (Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: c, minimumFractionDigits: c }) : '—')

export default function Medir({ leitura, perfil, fator, luxDe, calibAtual, perfis, perfilId, setPerfilId, vermelho, setVermelho, fatorPersonalizado, setFatorPersonalizado, fase, setFase, horas, setHoras, temSensor, salvarCalib }) {
  const { fonte, setFonte, frontal, setFrontal, estado, mediaRecente } = leitura
  const [calibrando, setCalibrando] = useState(false)
  const [referencia, setReferencia] = useState('')
  const [unidade, setUnidade] = useState('ppfd')
  const [congelado, setCongelado] = useState(null)

  const valorBruto = fonte === 'sensor' ? estado.lux : estado.relativo
  const lux = luxDe(valorBruto)
  const ppfdVivo = lux !== null ? lux * fator : null
  const ppfd = congelado ?? ppfdVivo
  const av = ppfd !== null ? avaliar(ppfd, fase) : null
  const semCalibracao = fonte === 'camera' && !calibAtual?.luxPorRelativo

  const calibrar = () => {
    const v = Number(String(referencia).replace(',', '.'))
    const bruto = mediaRecente()
    if (!v || !bruto) return
    const luxRef = unidade === 'lux' ? v : v / fator
    if (fonte === 'sensor') salvarCalib({ multiplicador: luxRef / bruto, metodo: unidade })
    else salvarCalib({ luxPorRelativo: luxRef / bruto, metodo: unidade })
    setCalibrando(false)
    setReferencia('')
  }

  return (
    <div className="pf-medir">
      <section className="pf-cartao pf-fontes">
        <h2>1. Como medir</h2>
        <div className="pf-linha">
          {temSensor && (
            <button type="button" className={fonte === 'sensor' ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => setFonte('sensor')}>
              🔆 Sensor de luz
            </button>
          )}
          <button type="button" className={fonte === 'camera' && frontal ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => (setFrontal(true), setFonte('camera'))}>
            🤳 Câmera da frente
          </button>
          <button type="button" className={fonte === 'camera' && !frontal ? 'btn btn-primary' : 'btn btn-ghost'} onClick={() => (setFrontal(false), setFonte('camera'))}>
            📷 Câmera de trás
          </button>
          {fonte && (
            <button type="button" className="btn btn-ghost" onClick={() => setFonte(null)}>
              Parar
            </button>
          )}
        </div>
        {!fonte && <p className="muted small">Câmera da frente: deite o celular no lugar da planta, tela para cima, com um papel branco (sulfite) cobrindo a câmera. É como os apps de PPFD funcionam.</p>}
        {estado.erro && <p className="notice warn small">{estado.erro}</p>}
      </section>

      <section className="pf-cartao pf-leitura">
        <div className="pf-numero">
          <strong>{ppfd !== null ? num(ppfd) : fonte ? (semCalibracao ? 'calibre' : '…') : '—'}</strong>
          <span>µmol/m²/s</span>
        </div>
        {congelado !== null && <p className="pf-congelado">Leitura congelada</p>}
        <div className="pf-barra" aria-hidden="true">
          {FAIXAS.map((f) => (
            <span key={f.id} className={f.id === fase ? 'atual' : ''} style={{ left: `${(f.min / ESCALA) * 100}%`, width: `${((f.max - f.min) / ESCALA) * 100}%`, background: f.cor }} title={f.nome} />
          ))}
          {ppfd !== null && <i style={{ left: `${Math.min(100, (ppfd / ESCALA) * 100)}%` }} />}
        </div>
        <div className="pf-escala">
          <span>0</span>
          <span>500</span>
          <span>1000</span>
          <span>1500</span>
        </div>
        {av && <p className={`pf-avaliacao ${av.tom}`}>{av.texto}</p>}
        <dl className="pf-dados">
          <dt>DLI ({horas} h de luz)</dt>
          <dd>{ppfd !== null ? `${num(dli(ppfd, horas), 1)} mol/m²/dia` : '—'}</dd>
          <dt>Iluminância</dt>
          <dd>{lux !== null ? `${num(lux)} lux` : '—'}</dd>
          <dt>Fator do espectro</dt>
          <dd>
            {num(fator * 1000, 2)} µmol por klux · 1 µmol ≈ {num(1 / fator, 0)} lux
          </dd>
          {fonte === 'camera' && (
            <>
              <dt>Câmera</dt>
              <dd>{estado.manual ? `exposição travada${estado.limite ? ' (no mínimo)' : ''}` : 'exposição automática (só relativo)'}</dd>
            </>
          )}
        </dl>
        {fonte === 'camera' && estado.limite && estado.estouro > 0.05 && <p className="notice warn small">Luz forte demais para a câmera: dobre o papel (2–3 folhas) e calibre de novo com o papel dobrado.</p>}
        {semCalibracao && estado.manual && <p className="notice warn small">Calibre a câmera uma vez (abaixo) para ver o PPFD. Sem calibrar, cada celular dá um número diferente.</p>}
        <div className="pf-linha">
          <button type="button" className="btn btn-ghost" disabled={ppfdVivo === null && congelado === null} onClick={() => setCongelado(congelado === null ? ppfdVivo : null)}>
            {congelado === null ? '⏸ Congelar' : '▶ Voltar ao vivo'}
          </button>
          {fonte && (
            <button type="button" className="btn btn-ghost" onClick={() => setCalibrando((c) => !c)}>
              🎯 {calibAtual ? 'Recalibrar' : 'Calibrar'}
            </button>
          )}
        </div>
        {calibAtual && <p className="muted small">Calibrado em {new Date(calibAtual.quando).toLocaleDateString('pt-BR')} ({calibAtual.metodo === 'lux' ? 'com luxímetro' : 'com valor de PPFD de referência'}).</p>}
        {calibrando && (
          <div className="pf-calibrar">
            <p className="small">
              Coloque o celular (com o papel) <strong>exatamente no mesmo ponto</strong> do valor de referência e informe:
            </p>
            <ul className="small">
              <li>a leitura de um medidor de PAR/quantum ou luxímetro no mesmo lugar; ou</li>
              <li>o PPFD do mapa de PAR do fabricante da luminária, no centro e na altura indicados.</li>
            </ul>
            <div className="pf-linha">
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} inputMode="decimal" placeholder="Valor de referência" aria-label="Valor de referência" />
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Unidade">
                <option value="ppfd">µmol/m²/s (PPFD)</option>
                <option value="lux">lux</option>
              </select>
              <button type="button" className="btn btn-primary" onClick={calibrar} disabled={!referencia || !mediaRecente()}>
                Calibrar agora
              </button>
            </div>
            <p className="muted small">A calibração fica salva neste aparelho, para esta câmera. Use sempre o mesmo papel.</p>
          </div>
        )}
      </section>

      <section className="pf-cartao">
        <h2>2. Sua luz</h2>
        <label className="field">
          <span className="field-label">Tipo de luminária</span>
          <select value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">{perfil.nota}</p>
        {perfil.ajustaVermelho && (
          <label className="field">
            <span className="field-label">Vermelho 660 nm: {Math.round(vermelho * 100)}% dos fótons</span>
            <input type="range" min="0" max="0.4" step="0.01" value={vermelho} onChange={(e) => setVermelho(Number(e.target.value))} />
            <span className="muted small">Placas com uma fileira de 660 nm costumam ficar entre 8% e 20%. Quanto mais vermelho, mais PPFD para o mesmo lux.</span>
          </label>
        )}
        {perfil.id === 'personalizado' && (
          <label className="field">
            <span className="field-label">Fator (µmol/m²/s por lux)</span>
            <input value={fatorPersonalizado} onChange={(e) => setFatorPersonalizado(e.target.value)} inputMode="decimal" />
          </label>
        )}
      </section>

      <section className="pf-cartao">
        <h2>3. Fase da planta</h2>
        <div className="pf-fases">
          {FAIXAS.map((f) => (
            <button key={f.id} type="button" className={fase === f.id ? 'pf-fase ativa' : 'pf-fase'} style={{ '--cor': f.cor }} onClick={() => (setFase(f.id), setHoras(f.horas))}>
              <strong>{f.nome}</strong>
              <small>
                {f.min}–{f.max} µmol
              </small>
            </button>
          ))}
        </div>
        <label className="field">
          <span className="field-label">Horas de luz por dia: {horas} h</span>
          <input type="range" min="8" max="24" step="1" value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
        </label>
      </section>
    </div>
  )
}
