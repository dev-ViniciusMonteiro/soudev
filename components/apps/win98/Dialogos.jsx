'use client'

// Diálogos do sistema: caixa de mensagem, Executar, Abrir/Salvar como, Sobre o Windows,
// Propriedades (do sistema e de arquivos), Data e hora e a Ajuda.

import { useEffect, useRef, useState } from 'react'
import Icone, { iconeDoArquivo } from './icones'
import { Rotulo } from './Menu'
import { dataCurta, horaCurta, useJanela, useSistema } from './sistema'
import { achar, caminhoReal, contarItens, criarPasta, extensao, juntar, listar, nomeDe, pai, partes, tamanhoBytes, tamanhoKB, tipoDeArquivo, validarNome } from '@/lib/win98/arquivos'

export function Botao({ children, padrao, onClick, disabled, ...resto }) {
  return (
    <button type="button" className={`w98-botao ${padrao ? 'padrao' : ''}`} onClick={onClick} disabled={disabled} {...resto}>
      <span>{typeof children === 'string' ? <Rotulo texto={children} /> : children}</span>
    </button>
  )
}

/* ---------- Caixa de mensagem ---------- */
export function CaixaMensagem({ texto, icone = 'info', botoes = ['OK'], padrao = 0, responder }) {
  const jan = useJanela()
  const primeiro = useRef(null)
  useEffect(() => {
    primeiro.current?.focus()
  }, [])
  const clicar = (b) => {
    responder?.(b)
    jan.fecharJa()
  }
  return (
    <div className="w98-msg" onKeyDown={(e) => e.key === 'Escape' && clicar(botoes.includes('Cancelar') ? 'Cancelar' : botoes.at(-1))}>
      <div className="w98-msg-linha">
        {icone && <Icone nome={icone} />}
        <div className="w98-msg-texto">{texto}</div>
      </div>
      <div className="w98-msg-botoes">
        {botoes.map((b, i) => (
          <Botao key={b} padrao={i === padrao} ref={i === padrao ? primeiro : undefined} onClick={() => clicar(b)} data-botao={b}>
            {b}
          </Botao>
        ))}
      </div>
    </div>
  )
}

/* ---------- Executar ---------- */
export function Executar() {
  const sis = useSistema()
  const jan = useJanela()
  const [texto, setTexto] = useState(sis.config.historicoExecutar?.[0] || '')
  const campo = useRef(null)
  useEffect(() => {
    campo.current?.focus()
    campo.current?.select()
  }, [])

  const ok = () => {
    const t = texto.trim()
    if (!t) return
    jan.fecharJa()
    sis.mudarConfig((c) => ({ ...c, historicoExecutar: [t, ...(c.historicoExecutar || []).filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 10) }))
    sis.executarComando(t)
  }

  return (
    <form
      className="w98-dialogo"
      style={{ width: 347 }}
      onSubmit={(e) => {
        e.preventDefault()
        ok()
      }}
    >
      <div className="w98-linha" style={{ alignItems: 'flex-start', gap: 12 }}>
        <Icone nome="executar" />
        <p style={{ margin: '4px 0 0' }}>Digite o nome de um programa, pasta, documento ou recurso da Internet, e o Windows o abrirá para você.</p>
      </div>
      <label className="w98-linha" style={{ margin: '6px 0 4px' }}>
        <span>
          <u>A</u>brir:
        </span>
        <input ref={campo} className="w98-campo" style={{ flex: 1 }} value={texto} onChange={(e) => setTexto(e.target.value)} list="w98-historico" aria-label="Abrir" />
        <datalist id="w98-historico">
          {(sis.config.historicoExecutar || []).map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </label>
      <div className="w98-botoes-direita">
        <button type="submit" className="w98-botao padrao" disabled={!texto.trim()}>
          <span>OK</span>
        </button>
        <Botao onClick={() => jan.fecharJa()}>Cancelar</Botao>
        <Botao onClick={() => sis.dialogoArquivo({ modo: 'abrir', titulo: 'Procurar', tipos: [{ rotulo: 'Programas', ext: ['exe', 'com', 'bat'] }, { rotulo: 'Todos os arquivos', ext: null }], pasta: 'C:\\Windows' }).then((c) => c && setTexto(c))}>
          &Procurar...
        </Botao>
      </div>
    </form>
  )
}

/* ---------- Sobre ---------- */
export function Sobre({ programa = 'Windows', icone = 'logo' }) {
  const jan = useJanela()
  const memoria = typeof navigator !== 'undefined' && navigator.deviceMemory ? navigator.deviceMemory * 1024 * 1024 : 65536
  return (
    <div className="w98-dialogo" style={{ width: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px 10px', borderBottom: '1px solid var(--w-sombra)', boxShadow: '0 1px var(--w-luz)' }}>
        <Icone nome="logo" tamanho={48} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>
            Windows<span style={{ fontWeight: 400 }}>98</span>
          </div>
          <div>recriação para navegador · soudev</div>
        </div>
      </div>
      <div className="w98-linha" style={{ alignItems: 'flex-start', gap: 12, paddingTop: 4 }}>
        <Icone nome={icone} />
        <div style={{ lineHeight: 1.6 }}>
          <div>{programa === 'Windows' ? 'Windows 98' : programa}</div>
          <div>Versão 4.10.1998 (recriação soudev)</div>
          <div>Código e desenhos originais; não é software da Microsoft.</div>
          <br />
          <div>Este produto está licenciado para:</div>
          <div>&nbsp;&nbsp;Visitante do soudev</div>
          <div style={{ height: 2, margin: '8px 0', boxShadow: 'inset 0 1px var(--w-sombra), inset 0 -1px var(--w-luz)' }} />
          <div>Memória física disponível para o Windows: {memoria.toLocaleString('pt-BR')} KB</div>
          <div>Recursos do sistema: 94% livres</div>
        </div>
      </div>
      <div className="w98-botoes-direita">
        <Botao padrao onClick={() => jan.fecharJa()} autoFocus>
          OK
        </Botao>
      </div>
    </div>
  )
}

/* ---------- Abrir / Salvar como ---------- */
const MEU_COMPUTADOR = 'meu-computador'

export function DialogoArquivo({ modo, nome: nomeInicial = '', pasta: pastaInicial = 'C:\\Meus documentos', tipos = [{ rotulo: 'Todos os arquivos (*.*)', ext: null }], responder }) {
  const sis = useSistema()
  const jan = useJanela()
  const [pasta, setPasta] = useState(caminhoReal(sis.disco, pastaInicial) || 'C:\\Meus documentos')
  const [nome, setNome] = useState(nomeInicial)
  const [tipo, setTipo] = useState(0)
  const [sel, setSel] = useState(null)
  const respondido = useRef(false)
  const salvar = modo === 'salvar'

  const responderUmaVez = (v) => {
    if (respondido.current) return
    respondido.current = true
    responder?.(v)
  }
  useEffect(() => {
    jan.registrarFechar(() => {
      responderUmaVez(null)
      return true
    })
  }, [jan]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtro = tipos[tipo]?.ext
  const itens = (listar(sis.disco, pasta) || []).filter((i) => i.tipo === 'pasta' || !filtro || filtro.includes(extensao(i.nome)))
  const cadeia = ['C:\\', ...partes(pasta).map((_, i, arr) => juntar(...arr.slice(0, i + 1)))]

  const confirmar = async () => {
    const n = nome.trim()
    if (!n) return
    const alvoPasta = achar(sis.disco, juntar(pasta, n))
    if (alvoPasta?.tipo === 'pasta') {
      setPasta(caminhoReal(sis.disco, juntar(pasta, n)))
      setNome('')
      return
    }
    const erroNome = validarNome(n)
    if (erroNome) {
      await sis.msg({ titulo: salvar ? 'Salvar como' : 'Abrir', texto: erroNome, icone: 'erro' })
      return
    }
    let final = n
    if (salvar && !extensao(n) && filtro?.[0]) final = `${n}.${filtro[0]}`
    const caminho = juntar(pasta, final)
    const existe = achar(sis.disco, caminho)
    if (salvar && existe) {
      const r = await sis.msg({ titulo: 'Salvar como', texto: `${caminho}\nEste arquivo já existe.\n\nDeseja substituí-lo?`, icone: 'aviso', botoes: ['&Sim', '&Não'], padrao: 1 })
      if (r !== '&Sim') return
    }
    if (!salvar && !existe) {
      await sis.msg({ titulo: 'Abrir', texto: `${final}\nArquivo não encontrado.\nVerifique se o nome correto do arquivo foi digitado.`, icone: 'aviso' })
      return
    }
    responderUmaVez(salvar ? caminho : caminhoReal(sis.disco, caminho))
    jan.fecharJa()
  }

  const novaPasta = () => {
    try {
      let n = 'Nova pasta'
      for (let i = 2; achar(sis.disco, juntar(pasta, n)); i++) n = `Nova pasta (${i})`
      sis.mudarDisco((d) => criarPasta(d, pasta, n))
    } catch (e) {
      sis.msg({ titulo: 'Erro', texto: e.message, icone: 'erro' })
    }
  }

  return (
    <form
      className="w98-dialogo"
      style={{ width: 430 }}
      onSubmit={(e) => {
        e.preventDefault()
        confirmar()
      }}
    >
      <div className="w98-linha">
        <span style={{ width: 70 }}>{salvar ? <>Salvar <u>e</u>m:</> : <>E<u>x</u>aminar:</>}</span>
        <select className="w98-campo" style={{ flex: 1, height: 22, padding: 1 }} value={pasta} onChange={(e) => setPasta(e.target.value)} aria-label="Pasta">
          {cadeia.map((c, i) => (
            <option key={c} value={c}>
              {'\u00a0'.repeat(i * 2)}
              {i === 0 ? '(C:)' : nomeDe(c)}
            </option>
          ))}
        </select>
        <button type="button" className="w98-ferramenta pequena" title="Um nível acima" disabled={pasta === 'C:\\'} onClick={() => setPasta(pai(pasta))}>
          <Icone nome="pastaAberta" tamanho={16} />
        </button>
        <button type="button" className="w98-ferramenta pequena" title="Criar nova pasta" onClick={novaPasta}>
          <Icone nome="pasta" tamanho={16} />
        </button>
      </div>
      <div className="w98-lista" style={{ height: 150, display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignContent: 'flex-start' }} data-testid="w98-lista-arquivos">
        {itens.map((i) => (
          <button
            key={i.nome}
            type="button"
            style={{ width: 'auto' }}
            className={sel === i.nome ? 'sel' : ''}
            onClick={() => {
              setSel(i.nome)
              if (i.tipo === 'arquivo') setNome(i.nome)
            }}
            onDoubleClick={() => {
              if (i.tipo === 'pasta') {
                setPasta(juntar(pasta, i.nome))
                setSel(null)
              } else {
                setNome(i.nome)
                setTimeout(confirmar)
              }
            }}
          >
            <Icone nome={iconeDoArquivo(i.nome, i.tipo)} tamanho={16} />
            <span>{i.nome}</span>
          </button>
        ))}
      </div>
      <div className="w98-linha">
        <span style={{ width: 120 }}>
          <u>N</u>ome do arquivo:
        </span>
        <input className="w98-campo" style={{ flex: 1 }} value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome do arquivo" autoFocus />
        <button type="submit" className="w98-botao padrao" style={{ width: 80 }}>
          <span>{salvar ? 'Salvar' : 'Abrir'}</span>
        </button>
      </div>
      <div className="w98-linha">
        <span style={{ width: 120 }}>{salvar ? <>Salvar como <u>t</u>ipo:</> : <>Arquivos do <u>t</u>ipo:</>}</span>
        <select className="w98-campo" style={{ flex: 1, height: 22, padding: 1 }} value={tipo} onChange={(e) => setTipo(Number(e.target.value))} aria-label="Tipo">
          {tipos.map((t, i) => (
            <option key={t.rotulo} value={i}>
              {t.rotulo}
            </option>
          ))}
        </select>
        <Botao style={{ width: 80 }} onClick={() => (responderUmaVez(null), jan.fecharJa())}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}

/* ---------- Propriedades do sistema ---------- */
export function PropriedadesSistema() {
  const jan = useJanela()
  const nucleos = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1
  const ram = typeof navigator !== 'undefined' && navigator.deviceMemory ? `${navigator.deviceMemory * 1024} MB de RAM` : '64,0 MB de RAM'
  return (
    <Abas
      largura={400}
      abas={['Geral', 'Gerenciador de dispositivos', 'Perfis de hardware', 'Desempenho']}
      rodape={
        <>
          <Botao padrao onClick={() => jan.fecharJa()}>
            OK
          </Botao>
          <Botao onClick={() => jan.fecharJa()}>Cancelar</Botao>
        </>
      }
    >
      {(aba) =>
        aba === 0 ? (
          <div style={{ display: 'flex', gap: 18, minHeight: 250 }}>
            <Icone nome="computador" tamanho={64} />
            <div style={{ lineHeight: 1.5 }}>
              <b>Sistema:</b>
              <div style={{ paddingLeft: 16, marginBottom: 10 }}>
                Windows 98
                <br />
                Recriação soudev
                <br />
                4.10.1998
              </div>
              <b>Registrado para:</b>
              <div style={{ paddingLeft: 16, marginBottom: 10 }}>
                Visitante
                <br />
                soudev.com.br
              </div>
              <b>Computador:</b>
              <div style={{ paddingLeft: 16 }}>
                Processador com {nucleos} {nucleos === 1 ? 'núcleo' : 'núcleos'}
                <br />
                {ram}
              </div>
            </div>
          </div>
        ) : aba === 3 ? (
          <div style={{ minHeight: 250, lineHeight: 1.8 }}>
            <div>Memória: {ram.replace(' de RAM', '')}</div>
            <div>Recursos do sistema: 94% livres</div>
            <div>Sistema de arquivos: 32 bits</div>
            <div>Memória virtual: 32 bits</div>
            <div>Compactação de disco: não instalada</div>
            <p style={{ marginTop: 12 }}>O sistema está configurado para desempenho ideal.</p>
          </div>
        ) : (
          <div style={{ minHeight: 250 }}>
            <p>Esta guia não está disponível na recriação.</p>
          </div>
        )
      }
    </Abas>
  )
}

/** Caixa de diálogo com guias (abas) e rodapé de botões. */
export function Abas({ abas, children, rodape, largura = 400, inicial = 0 }) {
  const [aba, setAba] = useState(inicial)
  return (
    <div className="w98-dialogo" style={{ width: largura }}>
      <div>
        <div className="w98-abas" role="tablist">
          {abas.map((a, i) => (
            <button key={a} type="button" role="tab" aria-selected={aba === i} className={`w98-aba ${aba === i ? 'ativa' : ''}`} onClick={() => setAba(i)}>
              {a}
            </button>
          ))}
        </div>
        <div className="w98-painel-aba">{children(aba)}</div>
      </div>
      <div className="w98-botoes-direita">{rodape}</div>
    </div>
  )
}

/* ---------- Propriedades de arquivo/pasta ---------- */
export function PropriedadesItem({ caminho }) {
  const sis = useSistema()
  const jan = useJanela()
  const no = achar(sis.disco, caminho)
  if (!no) return <div className="w98-dialogo">O item não existe mais.</div>
  const nome = nomeDe(caminho)
  const pastaInfo = no.tipo === 'pasta' ? contarItens(no) : null
  const bytes = no.tipo === 'pasta' ? pastaInfo.bytes : tamanhoBytes(no)
  const linha = (r, v) => (
    <div style={{ display: 'flex', gap: 8, margin: '4px 0' }}>
      <span style={{ width: 90 }}>{r}</span>
      <span style={{ flex: 1, wordBreak: 'break-all' }}>{v}</span>
    </div>
  )
  const sep = <div style={{ height: 2, margin: '8px 0', boxShadow: 'inset 0 1px var(--w-sombra), inset 0 -1px var(--w-luz)' }} />
  return (
    <Abas
      largura={360}
      abas={['Geral']}
      rodape={
        <>
          <Botao padrao onClick={() => jan.fecharJa()}>
            OK
          </Botao>
          <Botao onClick={() => jan.fecharJa()}>Cancelar</Botao>
        </>
      }
    >
      {() => (
        <div>
          <div className="w98-linha" style={{ gap: 18 }}>
            <Icone nome={iconeDoArquivo(nome, no.tipo)} />
            <span>{nome}</span>
          </div>
          {sep}
          {linha('Tipo:', tipoDeArquivo(nome, no.tipo))}
          {linha('Local:', pai(caminho))}
          {linha('Tamanho:', `${tamanhoKB(bytes)} (${bytes.toLocaleString('pt-BR')} bytes)`)}
          {pastaInfo && linha('Contém:', `${pastaInfo.arquivos} arquivo(s), ${pastaInfo.pastas} pasta(s)`)}
          {sep}
          {linha('Modificado:', no.modificado ? `${dataCurta(no.modificado)} ${horaCurta(no.modificado)}` : '25/6/1998 12:00')}
          {sep}
          <div className="w98-linha" style={{ gap: 14 }}>
            <span style={{ width: 76 }}>Atributos:</span>
            <label className="w98-check">
              <input type="checkbox" checked={!!no.sistema} readOnly /> Somente leitura
            </label>
            <label className="w98-check">
              <input type="checkbox" checked={false} readOnly /> Oculto
            </label>
          </div>
        </div>
      )}
    </Abas>
  )
}

/* ---------- Data e hora ---------- */
export function DataHora() {
  const jan = useJanela()
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const ano = agora.getFullYear()
  const mes = agora.getMonth()
  const primeiro = new Date(ano, mes, 1).getDay()
  const dias = new Date(ano, mes + 1, 0).getDate()
  const nomeMes = agora.toLocaleDateString('pt-BR', { month: 'long' })
  const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone
  const angulo = (v, total) => (v / total) * 360
  return (
    <Abas
      largura={420}
      abas={['Data e hora', 'Fuso horário']}
      rodape={
        <>
          <Botao padrao onClick={() => jan.fecharJa()}>
            OK
          </Botao>
          <Botao onClick={() => jan.fecharJa()}>Cancelar</Botao>
          <Botao disabled>&Aplicar</Botao>
        </>
      }
    >
      {(aba) =>
        aba === 0 ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <fieldset className="w98-fieldset">
              <legend>Data</legend>
              <div className="w98-linha" style={{ marginBottom: 6 }}>
                <span className="w98-campo" style={{ flex: 1, textTransform: 'capitalize' }}>
                  {nomeMes}
                </span>
                <span className="w98-campo" style={{ width: 54 }}>
                  {ano}
                </span>
              </div>
              <div className="w98-calendario" data-testid="w98-calendario">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <span key={i} className="w98-dia-sem">
                    {d}
                  </span>
                ))}
                {Array.from({ length: primeiro }, (_, i) => (
                  <span key={`v${i}`} />
                ))}
                {Array.from({ length: dias }, (_, i) => (
                  <span key={i} className={i + 1 === agora.getDate() ? 'w98-hoje' : ''}>
                    {i + 1}
                  </span>
                ))}
              </div>
            </fieldset>
            <fieldset className="w98-fieldset" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <legend>Hora</legend>
              <svg width="110" height="110" viewBox="0 0 110 110" aria-label="Relógio">
                {Array.from({ length: 12 }, (_, i) => (
                  <rect key={i} x="53" y="4" width="4" height="4" fill={i % 3 ? '#008080' : '#000080'} transform={`rotate(${i * 30} 55 55)`} />
                ))}
                <line x1="55" y1="55" x2="55" y2="26" stroke="#008080" strokeWidth="5" transform={`rotate(${angulo((agora.getHours() % 12) + agora.getMinutes() / 60, 12)} 55 55)`} />
                <line x1="55" y1="55" x2="55" y2="14" stroke="#008080" strokeWidth="3" transform={`rotate(${angulo(agora.getMinutes(), 60)} 55 55)`} />
                <line x1="55" y1="58" x2="55" y2="12" stroke="#000" strokeWidth="1" transform={`rotate(${angulo(agora.getSeconds(), 60)} 55 55)`} />
              </svg>
              <span className="w98-campo" style={{ width: 90, textAlign: 'center' }}>
                {agora.toLocaleTimeString('pt-BR')}
              </span>
            </fieldset>
          </div>
        ) : (
          <div style={{ minHeight: 190 }}>
            <span className="w98-campo" style={{ display: 'block', marginBottom: 10 }}>
              {fuso}
            </span>
            <p>O relógio usa o fuso horário configurado no seu aparelho.</p>
          </div>
        )
      }
    </Abas>
  )
}

/* ---------- Ajuda ---------- */
const TOPICOS = [
  ['Bem-vindo', 'Esta é uma recriação do Windows 98 feita do zero para o navegador. Os programas, o disco C: e as configurações ficam guardados só neste aparelho.'],
  ['Área de trabalho', 'Clique duas vezes num ícone para abri-lo. Arraste os ícones para mudá-los de lugar. Clique com o botão direito na área de trabalho para criar pastas e documentos, organizar os ícones ou abrir as Propriedades de Vídeo.'],
  ['Janelas', 'Arraste pela barra de título para mover; arraste as bordas para redimensionar. Clique duas vezes no título para maximizar. O botão da janela na barra de tarefas minimiza e restaura.'],
  ['Campo Minado', 'Descubra todas as casas sem minas. O número mostra quantas minas há nas 8 casas vizinhas. Botão direito marca uma bandeira; clique com os dois botões (ou o do meio) num número para abrir as vizinhas quando as bandeiras já batem. O primeiro clique nunca é uma mina.'],
  ['Calculadora', 'Funciona como a do Windows 98: as contas são feitas na ordem em que você digita (2 + 3 × 4 = 20). Use o teclado: números, + − * /, Enter para igual, Esc para limpar e Backspace para apagar.'],
  ['Prompt do MS-DOS', 'Digite AJUDA para ver os comandos. DIR lista os arquivos, CD muda de pasta, TYPE mostra um arquivo de texto e EXIT fecha a janela.'],
  ['Atalhos de teclado', 'Ctrl+Esc abre o menu Iniciar. F2 renomeia o ícone selecionado, Delete manda para a Lixeira e Enter abre. No Campo Minado, F2 começa um jogo novo.'],
]

export function Ajuda() {
  const [t, setT] = useState(0)
  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 4, padding: 2 }}>
      <div className="w98-lista" style={{ width: 170 }}>
        {TOPICOS.map(([titulo], i) => (
          <button key={titulo} type="button" className={t === i ? 'sel' : ''} onClick={() => setT(i)}>
            <Icone nome="ajuda" tamanho={16} />
            {titulo}
          </button>
        ))}
      </div>
      <div className="w98-ajuda">
        <h2>{TOPICOS[t][0]}</h2>
        <p>{TOPICOS[t][1]}</p>
      </div>
    </div>
  )
}


/* ---------- Pedir um texto (Localizar, recorde do Campo minado, Abrir do IE) ---------- */
export function PedirTexto({ texto, rotulo, valor = '', botao = 'OK', responder }) {
  const jan = useJanela()
  const [v, setV] = useState(valor)
  const campo = useRef(null)
  useEffect(() => {
    campo.current?.focus()
    campo.current?.select()
  }, [])
  return (
    <form
      className="w98-dialogo"
      style={{ width: 320 }}
      onSubmit={(e) => {
        e.preventDefault()
        responder?.(v)
        jan.fecharJa()
      }}
    >
      {texto && <div style={{ whiteSpace: 'pre-line', textAlign: rotulo ? 'left' : 'center' }}>{texto}</div>}
      <label className="w98-linha">
        {rotulo && (
          <span>
            <Rotulo texto={rotulo} />
          </span>
        )}
        <input ref={campo} className="w98-campo" style={{ flex: 1 }} value={v} onChange={(e) => setV(e.target.value)} aria-label={rotulo ? rotulo.replace('&', '') : 'Texto'} />
      </label>
      <div className="w98-botoes-direita" style={{ justifyContent: rotulo ? 'flex-end' : 'center' }}>
        <button type="submit" className="w98-botao padrao" data-botao="OK">
          <span>
            <Rotulo texto={botao} />
          </span>
        </button>
        {rotulo && <Botao onClick={() => jan.fechar()}>Cancelar</Botao>}
      </div>
    </form>
  )
}
