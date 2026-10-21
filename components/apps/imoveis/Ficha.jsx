'use client'

// Ficha do imóvel: tudo o que dá para saber com dados públicos e o caminho oficial até o proprietário.

import { useEffect, useState } from 'react'
import { formatKm } from '@/lib/apis'
import { cepPelaRua, codigoIbge, consultarCnpj, empresasPerto, enderecoDoPonto, enderecoTexto, formatarCep, links, vizinhanca } from '@/lib/imoveis/fontes'
import { STATUS } from './status'

function copiar(texto, avisar) {
  navigator.clipboard?.writeText(texto).then(
    () => avisar('Copiado!'),
    () => avisar('Não deu para copiar.'),
  )
}

const Link = ({ href, children }) => (
  <a className="btn btn-ghost im-link" href={href} target="_blank" rel="noopener noreferrer">
    {children} ↗
  </a>
)

export default function Ficha({ ponto, salvo, aoSalvar, aoFechar }) {
  const { lat, lon, construcao } = ponto
  const [end, setEnd] = useState(salvo?.endereco ?? null)
  const [erroEnd, setErroEnd] = useState('')
  const [ceps, setCeps] = useState([])
  const [ibge, setIbge] = useState(null)
  const [empresas, setEmpresas] = useState(null)
  const [bairro, setBairro] = useState(null)
  const [cnpj, setCnpj] = useState('')
  const [empresa, setEmpresa] = useState(null)
  const [erroCnpj, setErroCnpj] = useState('')
  const [aviso, setAviso] = useState('')
  const [form, setForm] = useState(() => ({ status: 'prospectar', proprietario: '', telefone: '', email: '', matricula: '', cartorio: '', valor: '', notas: '', ...salvo }))
  const [carta, setCarta] = useState(false)

  const avisar = (t) => {
    setAviso(t)
    setTimeout(() => setAviso(''), 1800)
  }

  // Endereço, CEP e código IBGE; empresas no local.
  useEffect(() => {
    let vivo = true
    enderecoDoPonto(lat, lon)
      .then(async (e) => {
        if (!vivo) return
        setEnd(e)
        const [lista, codigo] = await Promise.all([e.cep ? Promise.resolve([]) : cepPelaRua(e.uf, e.cidade, e.rua), codigoIbge(e.uf, e.cidade)])
        if (!vivo) return
        setCeps(lista)
        setIbge(codigo)
      })
      .catch(() => vivo && setErroEnd('Não consegui o endereço deste ponto agora.'))
    empresasPerto(lat, lon)
      .then((l) => vivo && setEmpresas(l))
      .catch(() => vivo && setEmpresas([]))
    return () => {
      vivo = false
    }
  }, [lat, lon])

  const l = links(lat, lon, end)
  const titulo = end ? [end.rua, end.numero].filter(Boolean).join(', ') || end.nomeLugar || 'Imóvel' : 'Carregando endereço…'
  const coords = `${lat.toFixed(6)}, ${lon.toFixed(6)}`

  const consultar = async (n = cnpj) => {
    setErroCnpj('')
    setEmpresa(null)
    try {
      setEmpresa(await consultarCnpj(n))
    } catch (e) {
      setErroCnpj(e.status === 404 ? 'CNPJ não encontrado.' : e.message || 'Não deu para consultar agora.')
    }
  }

  const analisarBairro = async () => {
    setBairro('carregando')
    try {
      setBairro(await vizinhanca(lat, lon))
    } catch {
      setBairro('erro')
    }
  }

  const textoAnuncio = () => {
    if (!Array.isArray(bairro)) return ''
    const perto = bairro.filter((b) => b.maisPerto && b.maisPerto.d <= 0.6).map((b) => `${b.nome.toLowerCase()} a ${formatKm(b.maisPerto.d)}${b.maisPerto.nome ? ` (${b.maisPerto.nome})` : ''}`)
    const tipo = construcao?.tipo?.toLowerCase() ?? 'imóvel'
    return `${tipo[0].toUpperCase()}${tipo.slice(1)} ${end?.bairro ? `no bairro ${end.bairro}` : ''}${end?.cidade ? `, ${end.cidade}` : ''}.${construcao?.area ? ` Área construída aproximada de ${construcao.area} m²${construcao.andares ? ` em ${construcao.andares} andares` : ''}.` : ''} Localização prática: ${perto.slice(0, 6).join('; ') || 'região com comércio e serviços próximos'}.`
  }

  const salvar = () => {
    aoSalvar({
      id: salvo?.id ?? `i${Date.now().toString(36)}`,
      lat,
      lon,
      endereco: end,
      titulo,
      tipo: construcao?.tipo ?? salvo?.tipo ?? '',
      area: construcao?.area ?? salvo?.area ?? null,
      andares: construcao?.andares ?? salvo?.andares ?? null,
      ...form,
    })
    avisar(salvo ? 'Atualizado na carteira.' : 'Salvo na carteira!')
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <aside className="im-ficha" aria-label="Ficha do imóvel">
      <div className="im-ficha-topo">
        <div>
          <h2>{titulo}</h2>
          <p className="muted small">{end ? enderecoTexto(end) : erroEnd || '…'}</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={aoFechar}>
          ✕
        </button>
      </div>
      {aviso && <p className="notice ok small">{aviso}</p>}

      <section className="im-sec">
        <h3>📌 Dados do local</h3>
        <dl className="im-dados">
          {construcao && (
            <>
              <dt>Construção</dt>
              <dd>
                {construcao.tipo}
                {construcao.andares ? ` · ${construcao.andares} andares` : ''}
                {construcao.area ? ` · ~${construcao.area} m² de projeção` : ''}
              </dd>
            </>
          )}
          {construcao?.nome && (
            <>
              <dt>Nome</dt>
              <dd>{construcao.nome}</dd>
            </>
          )}
          <dt>CEP</dt>
          <dd>
            {end?.cep ? formatarCep(end.cep) : ceps.length ? ceps.map((c) => `${c.cep}${c.complemento ? ` (${c.complemento})` : ''}`).join(' · ') : '—'}
          </dd>
          <dt>Bairro</dt>
          <dd>{end?.bairro || '—'}</dd>
          <dt>Município</dt>
          <dd>
            {end?.cidade ? `${end.cidade}/${end.uf}` : '—'}
            {ibge ? ` · IBGE ${ibge}` : ''}
          </dd>
          <dt>Coordenadas</dt>
          <dd>
            {coords}{' '}
            <button type="button" className="im-mini" onClick={() => copiar(coords, avisar)}>
              copiar
            </button>
          </dd>
        </dl>
        <div className="im-links">
          <Link href={l.streetView}>Street View</Link>
          <Link href={l.googleMaps}>Google Maps</Link>
        </div>
      </section>

      <section className="im-sec im-destaque">
        <h3>🔑 Descobrir o proprietário</h3>
        <p className="muted small">O dono só aparece oficialmente na matrícula do cartório, que é pública: qualquer pessoa pode pedir a certidão.</p>
        <ol className="im-passos">
          <li>
            <strong>Ache a matrícula no mapa do Registro de Imóveis</strong>
            <span>Abra o mapa do ONR, vá até estas coordenadas e clique no lote: aparecem o cartório e o número da matrícula (onde a região já foi mapeada).</span>
            <div className="im-links">
              <Link href={l.onrMapa}>Mapa do ONR</Link>
              <button type="button" className="btn btn-ghost" onClick={() => copiar(coords, avisar)}>
                Copiar coordenadas
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => copiar(l.endereco, avisar)}>
                Copiar endereço
              </button>
            </div>
          </li>
          <li>
            <strong>Peça a certidão de matrícula</strong>
            <span>No RI Digital (serviço oficial dos cartórios), com o cartório e a matrícula. A certidão traz o proprietário atual, o histórico e se há penhora ou hipoteca. Paga, chega por e-mail.</span>
            <div className="im-links">
              <Link href={l.riDigital}>RI Digital</Link>
            </div>
          </li>
          <li>
            <strong>Sem matrícula no mapa? Use o cadastro da prefeitura</strong>
            <span>O número do IPTU (inscrição/SQL) e a certidão de dados cadastrais ajudam o cartório a achar a matrícula. Às vezes o porteiro, o síndico ou um vizinho informam a inscrição.</span>
            <div className="im-links">
              <Link href={l.iptu}>{/^s[aã]o paulo$/i.test(end?.cidade ?? '') ? 'GeoSampa (SP)' : `IPTU de ${end?.cidade || 'sua cidade'}`}</Link>
              <Link href={l.prefeituraDados}>Dados abertos da prefeitura</Link>
            </div>
          </li>
          <li>
            <strong>Já sabe o CPF/CNPJ de quem pode ser o dono?</strong>
            <span>A pesquisa de bens do ONR lista os imóveis registrados em nome de uma pessoa ou empresa (paga, com identificação).</span>
            <div className="im-links">
              <Link href={l.pesquisaBens}>Pesquisa de bens (ONR)</Link>
            </div>
          </li>
          <li>
            <strong>Pesquise o endereço</strong>
            <span>Anúncios antigos, empresas registradas e notícias costumam revelar quem é o responsável pelo imóvel.</span>
            <div className="im-links">
              <Link href={l.buscaEndereco}>Endereço no Google</Link>
              <Link href={l.anuncios}>Anúncios antigos</Link>
              <Link href={l.cnpjNoEndereco}>CNPJs neste endereço</Link>
            </div>
          </li>
          <li>
            <strong>Fale direto</strong>
            <span>Deixe uma carta para o proprietário na portaria ou na caixa de correio.</span>
            <div className="im-links">
              <button type="button" className="btn btn-ghost" onClick={() => setCarta((c) => !c)}>
                {carta ? 'Esconder a carta' : 'Carta ao proprietário'}
              </button>
            </div>
            {carta && <Carta endereco={titulo} avisar={avisar} />}
          </li>
        </ol>
      </section>

      <section className="im-sec">
        <h3>🏢 Empresas e comércios no local</h3>
        {empresas === null ? (
          <p className="muted small">
            <span className="spinner" aria-hidden="true" /> Procurando no OpenStreetMap…
          </p>
        ) : empresas.length === 0 ? (
          <p className="muted small">Nenhuma empresa cadastrada no OpenStreetMap a até 60 m. Se houver uma placa no imóvel, consulte o CNPJ abaixo.</p>
        ) : (
          <ul className="im-empresas">
            {empresas.slice(0, 12).map((e) => (
              <li key={e.id}>
                <strong>{e.nome}</strong> <span className="muted small">· {e.categoria} · {formatKm(e.distancia)}</span>
                <div className="im-contatos">
                  {e.telefone && <a href={`tel:${e.telefone.replace(/[^\d+]/g, '')}`}>📞 {e.telefone}</a>}
                  {e.site && (
                    <a href={e.site.startsWith('http') ? e.site : `https://${e.site}`} target="_blank" rel="noopener noreferrer">
                      🌐 site
                    </a>
                  )}
                  {e.instagram && (
                    <a href={e.instagram.startsWith('http') ? e.instagram : `https://instagram.com/${e.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      📷 Instagram
                    </a>
                  )}
                  {e.email && <a href={`mailto:${e.email}`}>✉️ {e.email}</a>}
                  {e.cnpj && (
                    <button type="button" className="im-mini" onClick={() => (setCnpj(e.cnpj), consultar(e.cnpj))}>
                      ver CNPJ
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <form
          className="im-linha"
          onSubmit={(ev) => {
            ev.preventDefault()
            consultar()
          }}
        >
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="CNPJ da empresa no imóvel" inputMode="numeric" aria-label="CNPJ" />
          <button type="submit" className="btn btn-primary">
            Consultar
          </button>
        </form>
        {erroCnpj && <p className="notice error small">{erroCnpj}</p>}
        {empresa && (
          <div className="im-cnpj">
            <strong>{empresa.razao}</strong>
            {empresa.fantasia && <span className="muted small"> ({empresa.fantasia})</span>}
            <p className="small">
              {empresa.situacao} · aberta em {empresa.abertura?.split('-').reverse().join('/')} · {empresa.atividade}
            </p>
            <p className="small">{empresa.endereco}</p>
            {(empresa.telefone || empresa.email) && (
              <p className="small">
                {empresa.telefone && `📞 ${empresa.telefone}`} {empresa.email && `· ✉️ ${empresa.email.toLowerCase()}`}
              </p>
            )}
            {empresa.socios.length > 0 && (
              <>
                <p className="small">
                  <strong>Sócios (Receita Federal):</strong>
                </p>
                <ul className="small">
                  {empresa.socios.map((s) => (
                    <li key={s.nome}>
                      {s.nome} · {s.qualificacao}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="muted small">Quem ocupa o imóvel nem sempre é o dono, mas costuma saber quem é.</p>
          </div>
        )}
      </section>

      <section className="im-sec">
        <h3>🏘️ O bairro (para o anúncio)</h3>
        {bairro === null && (
          <button type="button" className="btn btn-ghost" onClick={analisarBairro}>
            Analisar o que tem a até 1 km
          </button>
        )}
        {bairro === 'carregando' && (
          <p className="muted small">
            <span className="spinner" aria-hidden="true" /> Contando escolas, mercados, transporte…
          </p>
        )}
        {bairro === 'erro' && <p className="notice error small">Não deu para analisar agora. Tente de novo em instantes.</p>}
        {Array.isArray(bairro) && (
          <>
            <ul className="im-bairro">
              {bairro.map((b) => (
                <li key={b.nome}>
                  <span>
                    {b.icone} {b.nome}
                  </span>
                  <strong>{b.qtd}</strong>
                  <small className="muted">{b.maisPerto ? `mais perto a ${formatKm(b.maisPerto.d)}` : 'nenhum a 1 km'}</small>
                </li>
              ))}
            </ul>
            <p className="im-anuncio">{textoAnuncio()}</p>
            <button type="button" className="btn btn-ghost" onClick={() => copiar(textoAnuncio(), avisar)}>
              Copiar texto para o anúncio
            </button>
          </>
        )}
      </section>

      <section className="im-sec">
        <h3>📋 Na minha carteira</h3>
        <div className="im-form">
          <label className="field">
            <span className="field-label">Etapa</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS.map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Proprietário</span>
            <input value={form.proprietario} onChange={(e) => set('proprietario', e.target.value)} placeholder="Nome (da certidão)" />
          </label>
          <label className="field">
            <span className="field-label">Telefone</span>
            <input value={form.telefone} onChange={(e) => set('telefone', e.target.value)} inputMode="tel" />
          </label>
          <label className="field">
            <span className="field-label">Matrícula / cartório</span>
            <input value={form.matricula} onChange={(e) => set('matricula', e.target.value)} placeholder="Ex.: 12.345 · 4º RI" />
          </label>
          <label className="field">
            <span className="field-label">Valor pedido</span>
            <input value={form.valor} onChange={(e) => set('valor', e.target.value)} inputMode="decimal" />
          </label>
          <label className="field im-largo">
            <span className="field-label">Anotações</span>
            <textarea rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Placa de vende? Portaria? Estado do imóvel…" />
          </label>
        </div>
        <button type="button" className="btn btn-primary" onClick={salvar}>
          {salvo ? 'Atualizar na carteira' : 'Salvar na carteira'}
        </button>
      </section>
    </aside>
  )
}

function Carta({ endereco, avisar }) {
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const texto = `Prezado(a) proprietário(a) do imóvel ${endereco},

Meu nome é ${nome || '[seu nome]'}, sou corretor(a) de imóveis${contato ? ` (${contato})` : ''}. Tenho clientes procurando imóveis nesta região e gostaria de conversar sobre a possibilidade de venda ou locação do seu imóvel, sem nenhum compromisso.

Se tiver interesse, ou se quiser apenas saber quanto o seu imóvel vale hoje, entre em contato comigo. Será um prazer ajudar.

Atenciosamente,
${nome || '[seu nome]'}${contato ? `\n${contato}` : ''}`
  return (
    <div className="im-carta">
      <div className="im-linha">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="CRECI e telefone" />
      </div>
      <textarea readOnly rows={9} value={texto} />
      <div className="im-links">
        <button type="button" className="btn btn-ghost" onClick={() => copiar(texto, avisar)}>
          Copiar
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const w = window.open('', '_blank')
            if (!w) return
            w.document.write(`<pre style="font:16px/1.6 Georgia,serif;white-space:pre-wrap;max-width:640px;margin:40px auto">${texto.replace(/</g, '&lt;')}</pre>`)
            w.document.close()
            w.print()
          }}
        >
          Imprimir
        </button>
      </div>
    </div>
  )
}
