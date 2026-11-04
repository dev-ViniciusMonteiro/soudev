'use client'

// Lente Certa: com a receita em mãos, a pessoa compara índices, tipos de lente e tratamentos com simulações,
// e leva a escolha pronta para a ótica. Não mede grau: isso só o oftalmologista, com o refrator.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Simulador, { MapaZonas } from './Simulador'
import Tratamento, { TRATAMENTOS } from './Tratamento'
import { ARMACOES, MATERIAIS, NOME_OLHO, OLHOS, TIPOS, diagnostico, equivalente, espessura, fmt, indiceSugerido, lerReceita, receitaExemplo, receitaVazia } from './optica'

const CHAVE = 'lente-certa-v1'
const ABAS = [['receita', 'Receita'], ['espessura', 'Espessura'], ['tipo', 'Tipo de lente'], ['tratamentos', 'Tratamentos'], ['escolha', 'Minha escolha']]
const PUPILAS = [[3, 'Dia claro'], [4, 'Ambiente interno'], [6, 'Noite']]

const inicial = () => ({ receita: receitaVazia(), armacao: 'm', material: null, tipo: null, tratamentos: { ar: true }, aba: 'receita' })

export default function Lentes() {
  const [s, setS] = useState(inicial)
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    // ?demo=1 abre direto no simulador com a receita de exemplo (sem salvar): usado no banner e na divulgação
    if (new URLSearchParams(location.search).get('demo') === '1') { setS({ ...inicial(), receita: receitaExemplo(), tipo: 'multi-premium', aba: 'tipo' }); setTimeout(() => document.querySelector('.ln-sim')?.scrollIntoView({ block: 'center', behavior: 'instant' }), 600); return }
    try { const d = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (d?.receita) setS({ ...inicial(), ...d }) } catch { /* sem armazenamento */ }
    setCarregou(true)
  }, [])
  useEffect(() => { if (carregou) try { localStorage.setItem(CHAVE, JSON.stringify(s)) } catch { /* ignora */ } }, [s, carregou])

  const R = useMemo(() => lerReceita(s.receita), [s.receita])
  const armacao = ARMACOES.find((a) => a.id === s.armacao) || ARMACOES[1]
  const sugerido = R.ok ? indiceSugerido(R) : null
  const material = MATERIAIS.find((m) => m.id === (s.material || sugerido?.id)) || MATERIAIS[0]
  const presbita = R.ok && R.adicao > 0
  const tipoId = s.tipo || (presbita ? 'multi-premium' : 'mono-longe')
  const muda = (p) => setS((v) => ({ ...v, ...p }))
  const irPara = (aba) => { muda({ aba }); try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { /* ignora */ } }

  return (
    <div className="ln">
      <header className="ln-topo">
        <Link href="/apps/lente-certa" className="ln-voltar" aria-label="Voltar">←</Link>
        <div>
          <strong>Lente Certa</strong>
          <span>Escolha a lente com calma, com a sua receita</span>
        </div>
      </header>

      <nav className="ln-abas" aria-label="Etapas">
        {ABAS.map(([id, nome], i) => (
          <button key={id} className={s.aba === id ? 'ativa' : ''} onClick={() => irPara(id)} disabled={id !== 'receita' && !R.ok}>
            <span>{i + 1}</span>{nome}
          </button>
        ))}
      </nav>

      <main className="ln-corpo">
        {s.aba === 'receita' && <AbaReceita s={s} muda={muda} R={R} avancar={() => irPara('espessura')} />}
        {s.aba === 'espessura' && R.ok && <AbaEspessura R={R} s={s} muda={muda} armacao={armacao} material={material} sugerido={sugerido} avancar={() => irPara('tipo')} />}
        {s.aba === 'tipo' && R.ok && <AbaTipo R={R} tipoId={tipoId} muda={muda} material={material} presbita={presbita} avancar={() => irPara('tratamentos')} />}
        {s.aba === 'tratamentos' && R.ok && <AbaTratamentos s={s} muda={muda} material={material} avancar={() => irPara('escolha')} />}
        {s.aba === 'escolha' && R.ok && <AbaEscolha R={R} s={s} armacao={armacao} material={material} tipoId={tipoId} />}
      </main>
    </div>
  )
}

/* ---------------- 1. Receita ---------------- */

function AbaReceita({ s, muda, R, avancar }) {
  const r = s.receita
  const campo = (olho, k) => (e) => muda({ receita: { ...r, [olho]: { ...r[olho], [k]: e.target.value } } })
  const geral = (k) => (e) => muda({ receita: { ...r, [k]: e.target.value } })
  const preenchido = r.od.esf !== '' || r.oe.esf !== ''
  const diag = R.ok ? diagnostico(R) : null
  return (
    <section className="ln-secao">
      <h1>Sua receita</h1>
      <p className="ln-sub">Copie os números da receita do oftalmologista. Use o ponto ou a vírgula, e o sinal de menos quando houver.</p>
      <div className="ln-receita" role="group" aria-label="Graus da receita">
        <div className="ln-rec-cab"><span /><span>Esférico</span><span>Cilíndrico</span><span>Eixo</span></div>
        {OLHOS.map((o) => (
          <div className="ln-rec-linha" key={o}>
            <span className="ln-rec-olho">{o.toUpperCase()}<small>{o === 'od' ? 'direito' : 'esquerdo'}</small></span>
            <input id={`${o}-esf`} inputMode="decimal" placeholder="-2,75" value={r[o].esf} onChange={campo(o, 'esf')} aria-label={`${NOME_OLHO[o]}: esférico`} />
            <input id={`${o}-cil`} inputMode="decimal" placeholder="-0,75" value={r[o].cil} onChange={campo(o, 'cil')} aria-label={`${NOME_OLHO[o]}: cilíndrico`} />
            <input id={`${o}-eixo`} inputMode="numeric" placeholder="180" value={r[o].eixo} onChange={campo(o, 'eixo')} aria-label={`${NOME_OLHO[o]}: eixo`} />
          </div>
        ))}
      </div>
      <div className="ln-rec-extra">
        <label>Adição <small>(se tiver)</small><input id="adicao" inputMode="decimal" placeholder="+1,75" value={r.adicao} onChange={geral('adicao')} /></label>
        <label>DNP total <small>(mm, opcional)</small><input id="dnp" inputMode="numeric" placeholder="63" value={r.dnp} onChange={geral('dnp')} /></label>
        <label>Sua idade <small>(anos)</small><input id="idade" inputMode="numeric" placeholder="45" value={r.idade} onChange={geral('idade')} /></label>
      </div>
      <div className="ln-acoes">
        <button className="ln-btn" onClick={avancar} disabled={!R.ok}>Continuar</button>
        <button className="ln-btn claro" onClick={() => muda({ receita: receitaExemplo(), material: null, tipo: null })}>Usar uma receita de exemplo</button>
        {preenchido && <button className="ln-btn texto" onClick={() => muda({ receita: receitaVazia(), material: null, tipo: null })}>Limpar</button>}
      </div>
      {preenchido && !R.ok && <ul className="ln-erros">{R.erros.map((e) => <li key={e}>{e}</li>)}</ul>}
      {R.transposta && <p className="ln-nota">Sua receita usa cilíndrico positivo. Convertemos para negativo (é o mesmo grau, escrito de outro jeito).</p>}
      {diag && (
        <div className="ln-diag">
          <h2>O que a receita mostra</h2>
          <div className="ln-cards">{diag.itens.map((i) => <div className="ln-card" key={i.t}><strong>{i.t}</strong><p>{i.d}</p></div>)}</div>
        </div>
      )}
      <details className="ln-ajuda">
        <summary>Como ler a receita</summary>
        <dl>
          <dt>OD e OE</dt><dd>Olho direito e olho esquerdo. Às vezes aparece "longe" e "perto" em linhas separadas: use a de longe e a diferença vira a adição.</dd>
          <dt>Esférico (ESF)</dt><dd>O grau principal. Negativo é miopia; positivo, hipermetropia. "Plano" ou "0" é sem grau.</dd>
          <dt>Cilíndrico (CIL) e eixo</dt><dd>O astigmatismo e a direção dele, de 0 a 180°. Sem cilíndrico, deixe os dois em branco.</dd>
          <dt>Adição (AD)</dt><dd>O reforço para perto, a partir dos 40 e poucos anos. É ela que permite bifocal e multifocal.</dd>
          <dt>DNP</dt><dd>Distância entre as pupilas. A ótica mede na hora; aqui ela só ajusta a conta da espessura.</dd>
        </dl>
      </details>
      <p className="ln-aviso">Este app não mede o grau e não substitui a consulta. Use uma receita recente (a maioria vale 1 ano).</p>
    </section>
  )
}

/* ---------------- 2. Espessura ---------------- */

function Perfil({ e }) {
  // corte da lente em escala real (mm): da borda mais grossa (esquerda) ao centro óptico e à borda mais fina.
  // A espessura varia com o quadrado da distância ao centro (sagita), por isso a curva.
  const esq = e.yMax, dir = 19, larg = esq + dir, alt = 12
  const y0 = alt / 2
  const t = (u) => {
    const lado = u < 0 ? e.bordaMax : e.bordaMin, len = u < 0 ? esq : dir
    return e.centro + (lado - e.centro) * (u / len) ** 2
  }
  const pts = []
  for (let k = 0; k <= 60; k++) { const u = -esq + (larg * k) / 60; pts.push([u + esq, t(u)]) }
  const d = 'M' + pts.map(([x, v]) => `${x.toFixed(2)} ${(y0 - v / 2).toFixed(2)}`).join(' L') + ' L' + pts.reverse().map(([x, v]) => `${x.toFixed(2)} ${(y0 + v / 2).toFixed(2)}`).join(' L') + ' Z'
  const w = larg
  return (
    <svg className="ln-perfil" viewBox={`-1 0 ${w + 2} ${alt}`} role="img" aria-label={`Corte da lente: borda ${e.bordaMax.toFixed(1)} mm, centro ${e.centro.toFixed(1)} mm`}>
      <path d={d} />
    </svg>
  )
}

function AbaEspessura({ R, s, muda, armacao, material, sugerido, avancar }) {
  // o olho de grau mais forte decide a aparência dos óculos
  const olho = OLHOS.reduce((a, o) => (Math.abs(equivalente(R.olhos[o])) > Math.abs(equivalente(R.olhos[a])) ? o : a), 'od')
  const linhas = MATERIAIS.map((m) => ({ m, e: espessura(R.olhos[olho], m, armacao, R.dnp) }))
  return (
    <section className="ln-secao">
      <h1>Espessura e índice da lente</h1>
      <p className="ln-sub">Quanto maior o índice, mais fina a lente para o mesmo grau. Os cortes abaixo estão em escala, calculados para o {NOME_OLHO[olho].toLowerCase()} ({fmt(R.olhos[olho].esf)}{R.olhos[olho].cil ? ` ${fmt(R.olhos[olho].cil)}` : ''}).</p>
      <div className="ln-armacoes" role="radiogroup" aria-label="Tamanho da armação">
        {ARMACOES.map((a) => (
          <button key={a.id} role="radio" aria-checked={s.armacao === a.id} className={s.armacao === a.id ? 'ativa' : ''} onClick={() => muda({ armacao: a.id })}>
            <strong>Armação {a.nome.toLowerCase()}</strong><span>{a.aro} mm de aro · {a.ponte} de ponte</span>
          </button>
        ))}
      </div>
      <p className="ln-nota">Armação menor e com o centro perto das suas pupilas deixa qualquer lente mais fina, principalmente na miopia.</p>
      <div className="ln-materiais">
        {linhas.map(({ m, e }) => (
          <button key={m.id} className={`ln-mat ${material.id === m.id ? 'ativa' : ''}`} onClick={() => muda({ material: m.id })} aria-pressed={material.id === m.id}>
            <div className="ln-mat-cab">
              <strong>{m.nome}</strong>
              {sugerido?.id === m.id && <span className="ln-selo">Sugerida</span>}
              <span className="ln-preco" aria-label={`Preço relativo ${m.preco} de 5`}>{'$'.repeat(m.preco)}<i>{'$'.repeat(5 - m.preco)}</i></span>
            </div>
            <Perfil e={e} />
            <div className="ln-mat-num">
              <span><b>{e.bordaMax.toFixed(1).replace('.', ',')} mm</b> borda</span>
              <span><b>{e.centro.toFixed(1).replace('.', ',')} mm</b> centro</span>
              <span><b>{e.peso.toFixed(1).replace('.', ',')} g</b> cada lente</span>
              <span><b>{m.abbe}</b> Abbe</span>
            </div>
            <p>{m.nota}</p>
          </button>
        ))}
      </div>
      {sugerido && <p className="ln-nota"><b>Por que a sugestão:</b> {sugerido.motivo} O número Abbe mede a nitidez nas bordas: quanto maior, menos franja colorida ao olhar de lado.</p>}
      <div className="ln-acoes"><button className="ln-btn" onClick={avancar}>Continuar com {material.nome}</button></div>
    </section>
  )
}

/* ---------------- 3. Tipo de lente ---------------- */

function AbaTipo({ R, tipoId, muda, material, presbita, avancar }) {
  const [pupila, setPupila] = useState(4)
  const [semOculos, setSemOculos] = useState(false)
  const tipos = TIPOS.filter((t) => presbita || !t.presbita)
  const tipo = TIPOS.find((t) => t.id === tipoId)
  return (
    <section className="ln-secao">
      <h1>Tipo de lente</h1>
      <p className="ln-sub">{presbita
        ? 'Com adição na receita, você escolhe como dividir longe, computador e perto. Veja como cada lente se comporta na mesma cena.'
        : 'Sua receita não tem adição: a lente indicada é a monofocal, que corrige tudo com um grau só.'}</p>
      <div className="ln-tipos" role="radiogroup" aria-label="Tipo de lente">
        {tipos.map((t) => (
          <button key={t.id} role="radio" aria-checked={t.id === tipoId} className={t.id === tipoId ? 'ativa' : ''} onClick={() => muda({ tipo: t.id })}>
            <strong>{t.nome}</strong><span>{t.desc}</span>
          </button>
        ))}
      </div>
      <div className="ln-sim-area">
        <Simulador R={R} tipo={tipoId} pupila={pupila} semOculos={semOculos} material={material} />
        <div className="ln-sim-lado">
          <MapaZonas tipo={tipoId} adicao={R.adicao} />
          <p className="ln-legenda"><i className="l1" /> nítido para longe <i className="l2" /> perto <i className="l3" /> distorção</p>
          <div className="ln-seg" role="radiogroup" aria-label="Luz do ambiente">
            {PUPILAS.map(([p, n]) => <button key={p} role="radio" aria-checked={pupila === p} className={pupila === p ? 'ativa' : ''} onClick={() => setPupila(p)}>{n}</button>)}
          </div>
          <label className="ln-check"><input type="checkbox" checked={semOculos} onChange={(e) => setSemOculos(e.target.checked)} /> Ver sem óculos</label>
          <p className="ln-nota">Arraste a imagem para mexer a cabeça: a lente acompanha o rosto e a cena fica parada, como na vida real. À noite a pupila abre e qualquer erro de foco aparece mais.</p>
        </div>
      </div>
      <p className="ln-nota"><b>{tipo.nome}:</b> {tipo.desc}</p>
      <p className="ln-aviso">Simulação aproximada, feita com a sua receita e a média de foco para a sua idade. A sensação real de uma multifocal depende da medida feita na ótica (altura e distância das pupilas) e de alguns dias de adaptação.</p>
      <div className="ln-acoes"><button className="ln-btn" onClick={avancar}>Continuar com {tipo.nome.toLowerCase()}</button></div>
    </section>
  )
}

/* ---------------- 4. Tratamentos ---------------- */

function AbaTratamentos({ s, muda, material, avancar }) {
  return (
    <section className="ln-secao">
      <h1>Tratamentos</h1>
      <p className="ln-sub">Toda lente de qualidade já bloqueia 100% do UV. Os tratamentos abaixo são opcionais: veja o efeito de cada um e marque os que quer.</p>
      <div className="ln-trats">
        {TRATAMENTOS.map((t) => (
          <article className="ln-trat" key={t.id}>
            <header>
              <h2>{t.nome}{t.recomendado && <span className="ln-selo">Recomendado</span>}</h2>
              <label className="ln-check"><input type="checkbox" checked={!!s.tratamentos[t.id]} onChange={(e) => muda({ tratamentos: { ...s.tratamentos, [t.id]: e.target.checked } })} /> Quero</label>
            </header>
            <p>{t.resumo}</p>
            <Tratamento id={t.id} material={material} />
          </article>
        ))}
      </div>
      <div className="ln-acoes"><button className="ln-btn" onClick={avancar}>Ver minha escolha</button></div>
    </section>
  )
}

/* ---------------- 5. Minha escolha ---------------- */

function AbaEscolha({ R, s, armacao, material, tipoId }) {
  const tipo = TIPOS.find((t) => t.id === tipoId)
  const trats = TRATAMENTOS.filter((t) => s.tratamentos[t.id]).map((t) => t.nome)
  const olho = OLHOS.reduce((a, o) => (Math.abs(equivalente(R.olhos[o])) > Math.abs(equivalente(R.olhos[a])) ? o : a), 'od')
  const e = espessura(R.olhos[olho], material, armacao, R.dnp)
  const [copiado, setCopiado] = useState(false)
  const linhaOlho = (o) => `${o.toUpperCase()}: ${fmt(R.olhos[o].esf)}${R.olhos[o].cil ? ` ${fmt(R.olhos[o].cil)} x ${R.olhos[o].eixo}°` : ''}`
  const texto = [
    'Minha escolha de lentes (Lente Certa)',
    `Receita: ${linhaOlho('od')} | ${linhaOlho('oe')}${R.adicao ? ` | Adição ${fmt(R.adicao)}` : ''}`,
    `Tipo: ${tipo.nome}`,
    `Material: ${material.nome}`,
    `Tratamentos: ${trats.length ? trats.join(', ') : 'nenhum'}`,
    `Armação: ${armacao.nome.toLowerCase()} (${armacao.aro} mm)`,
    `Espessura estimada: borda ${e.bordaMax.toFixed(1).replace('.', ',')} mm, centro ${e.centro.toFixed(1).replace('.', ',')} mm`,
  ].join('\n')
  const copiar = () => {
    navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000) }, () => setCopiado(false))
  }
  const perguntas = [
    'A ótica vai medir a DNP e a altura da pupila com a armação que eu escolher?',
    tipoId.startsWith('multi') ? 'Qual a marca e o desenho da multifocal, e tem garantia de adaptação (troca se eu não me adaptar)?' : null,
    'O antirreflexo tem garantia contra descascar? Por quanto tempo?',
    'Quanto tempo leva para ficar pronto e tem garantia contra riscos?',
    material.id === '1.59' || material.id === '1.53' ? null : 'Para criança ou esporte: tem a mesma lente em policarbonato ou Trivex?',
  ].filter(Boolean)
  return (
    <section className="ln-secao">
      <h1>Minha escolha</h1>
      <p className="ln-sub">Leve este resumo à ótica para confirmar a armação, as medidas e o preço. Ele fica salvo neste aparelho.</p>
      <div className="ln-resumo">
        <dl>
          <dt>Receita</dt><dd>{linhaOlho('od')}<br />{linhaOlho('oe')}{R.adicao ? <><br />Adição {fmt(R.adicao)}</> : null}</dd>
          <dt>Tipo</dt><dd>{tipo.nome}</dd>
          <dt>Material</dt><dd>{material.nome}</dd>
          <dt>Tratamentos</dt><dd>{trats.length ? trats.join(', ') : 'Nenhum'}</dd>
          <dt>Armação</dt><dd>{armacao.nome} ({armacao.aro} mm de aro)</dd>
          <dt>Espessura</dt><dd>Borda {e.bordaMax.toFixed(1).replace('.', ',')} mm · centro {e.centro.toFixed(1).replace('.', ',')} mm · {e.peso.toFixed(1).replace('.', ',')} g por lente</dd>
        </dl>
        <div className="ln-acoes">
          <button className="ln-btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar resumo'}</button>
        </div>
        <pre className="ln-texto" aria-label="Resumo em texto">{texto}</pre>
      </div>
      <h2>Pergunte na ótica</h2>
      <ul className="ln-perguntas">{perguntas.map((p) => <li key={p}>{p}</li>)}</ul>
      <p className="ln-aviso">Preços variam muito entre marcas e óticas; aqui o "$" é só a comparação entre os materiais.</p>
    </section>
  )
}
