'use client'

// Simulador educativo de golpes (phishing): mostra EXEMPLOS FALSOS com visual parecido com os golpes
// reais, mas com marcas fictícias, aviso permanente de que é falso e formulários inertes (não coletam
// nada). Ao interagir, a tela revela os sinais do golpe e como se proteger. Objetivo: conscientização.

import { useState } from 'react'
import { track } from '@/lib/analytics'
import { Notice } from '../ui'

const GOLPES = [
  {
    id: 'login', tipo: 'browser', titulo: 'Login clonado de rede social', icone: '🔑',
    url: 'faceboot-conta.verifica-login.xyz', resumo: 'Uma página igual à da rede social pedindo seu e-mail e senha.',
    querem: 'Sua senha. Com ela, invadem sua conta, pedem dinheiro aos seus contatos e trancam você pra fora.',
    sinais: [
      'O endereço (URL) não é o oficial: "faceboot-conta.verifica-login.xyz" em vez do site real.',
      'A página pediu login "do nada", depois de você clicar num link.',
      'Pequenos erros no logo, nas cores e no texto.',
      'Pressa: "sua conta será desativada se não entrar agora".',
    ],
    protecao: ['Nunca faça login por link recebido. Digite o endereço do site você mesmo ou use o app oficial.', 'Confira a URL inteira antes de digitar a senha.', 'Ative a verificação em duas etapas (2FA).'],
  },
  {
    id: 'promo', tipo: 'browser', titulo: 'Falsa promoção / sorteio', icone: '🎁',
    url: 'megaluz-ofertas.premio-cliente.online', resumo: '"Você foi selecionado!" Responda perguntas e ganhe um prêmio — só pagar um "frete".',
    querem: 'Os dados do seu cartão (no "frete") e espalhar o golpe pelos seus contatos no WhatsApp.',
    sinais: [
      'Prêmio bom demais para ser verdade (um celular caro por R$ 2 de frete).',
      'Pede para compartilhar com amigos no WhatsApp para "liberar".',
      'Cronômetro de pressa: "faltam 4:59 para acabar".',
      'No fim, pede os dados do cartão para pagar um valor pequeno.',
    ],
    protecao: ['Promoção real não pede para você compartilhar em grupos para "ganhar".', 'Desconfie de pressa e de prêmio fácil.', 'Nunca ponha o cartão para "pagar frete de brinde".'],
  },
  {
    id: 'banco', tipo: 'browser', titulo: '"Sua conta será bloqueada"', icone: '🏦',
    url: 'seu-banco.central-seguranca.info', resumo: 'Um aviso de "acesso suspeito" mandando você confirmar seus dados em 24h.',
    querem: 'Sua senha, o código do app (token) e dados do cartão — para esvaziar sua conta.',
    sinais: [
      'Ameaça com prazo: "confirme em 24h ou sua conta será bloqueada".',
      'Veio por SMS/e-mail com um link encurtado.',
      'Pede senha, código do aplicativo (token) ou número do cartão.',
      'O endereço não é o do banco de verdade.',
    ],
    protecao: ['Banco não pede senha nem token por link, SMS ou telefone.', 'Na dúvida, ligue para o número do verso do cartão ou abra o app oficial.', 'Nunca repasse o código que chega no seu celular.'],
  },
  {
    id: 'premio', tipo: 'browser', titulo: 'Prêmio / Pix premiado', icone: '💸',
    url: 'resultado-sorteio.pix-premiado.site', resumo: '"Você ganhou R$ 5.000 no Pix! Pague uma pequena taxa para liberar."',
    querem: 'Que você pague uma "taxa de liberação" (e nunca receba nada) e entregue seus dados.',
    sinais: [
      'Você ganhou algo que nunca participou.',
      'Para "receber", você tem que pagar antes (taxa, imposto, frete).',
      'Falam para não contar a ninguém e agir rápido.',
      'Prêmio em dinheiro "liberado" por um site aleatório.',
    ],
    protecao: ['Prêmio de verdade nunca cobra para ser liberado.', 'Se pediram para pagar para receber, é golpe.', 'Não envie Pix para desconhecidos sob pressão.'],
  },
  {
    id: 'whats', tipo: 'chat', titulo: 'Falso parente no WhatsApp', icone: '📱',
    url: '', resumo: '"Mãe, troquei de número. Preciso que você faça um Pix agora, depois te explico."',
    querem: 'Que você faça um Pix na hora, achando que é um filho/parente com o número novo.',
    sinais: [
      'Número desconhecido dizendo ser alguém da família.',
      'História de urgência e um pedido de dinheiro.',
      'Insiste para você não ligar ("estou sem áudio", "celular quebrado").',
      'A conta do Pix está num nome diferente do parente.',
    ],
    protecao: ['Ligue para o número antigo do parente e confirme por voz/vídeo.', 'Combine uma pergunta secreta com a família.', 'Desconfie de qualquer pedido urgente de dinheiro por mensagem.'],
  },
]

export default function GolpesDemo() {
  const [sel, setSel] = useState(null)
  const [revelado, setRevelado] = useState(false)
  const g = GOLPES.find((x) => x.id === sel)

  const abrir = (id) => { setSel(id); setRevelado(false); track('golpe_abrir', { golpe: id }) }
  const revelar = () => { setRevelado(true); track('golpe_revelado', { golpe: sel }) }
  const voltar = () => { setSel(null); setRevelado(false) }

  return (
    <div className="gd">
      <style>{CSS}</style>
      <Notice kind="warning">
        <b>Tudo aqui é FALSO e serve só para aprender.</b> As marcas são inventadas, nada é coletado e os campos não funcionam. O objetivo é você reconhecer os golpes na vida real. Nunca digite dados verdadeiros em páginas que chegam por link.
      </Notice>

      {!g ? (
        <>
          <p className="gd-intro">Escolha um golpe para ver como ele aparece e, principalmente, <b>como identificar</b>:</p>
          <div className="gd-grid">
            {GOLPES.map((x) => (
              <button key={x.id} className="gd-card" onClick={() => abrir(x.id)}>
                <span className="gd-ic">{x.icone}</span>
                <b>{x.titulo}</b>
                <small>{x.resumo}</small>
                <span className="gd-ver">Ver exemplo →</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="gd-demo">
          <div className="gd-demo-top">
            <button className="btn btn-ghost btn-sm" onClick={voltar}>← Voltar</button>
            <span className="gd-demo-tit">{g.icone} {g.titulo}</span>
          </div>

          {/* moldura falsa */}
          <div className="gd-frame">
            <div className="gd-fita">⚠️ EXEMPLO FALSO · DEMONSTRAÇÃO EDUCATIVA · NÃO DIGITE DADOS REAIS</div>
            {g.tipo === 'browser' && (
              <div className="gd-urlbar">
                <span className="gd-cad">🔓</span>
                <span className="gd-url">{g.url}</span>
              </div>
            )}
            <div className="gd-tela">
              {g.tipo === 'browser' ? <Mock id={g.id} onIsca={revelar} /> : <Chat onIsca={revelar} />}
              {revelado && (
                <div className="gd-reveal">
                  <div className="gd-reveal-box">
                    <div className="gd-reveal-h">🚩 Isto é um golpe!</div>
                    <p className="gd-querem"><b>O que o golpista queria:</b> {g.querem}</p>
                    <h4>Sinais que entregam o golpe</h4>
                    <ul className="gd-sinais">{g.sinais.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    <h4>Como se proteger</h4>
                    <ul className="gd-prot">{g.protecao.map((s, i) => <li key={i}>{s}</li>)}</ul>
                    <div className="gd-reveal-acoes">
                      <button className="btn" onClick={() => setRevelado(false)}>Ver a tela de novo</button>
                      <button className="btn btn-primary" onClick={voltar}>Ver outro golpe</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {!revelado && <p className="gd-dica muted">Interaja como você faria de verdade (clicar no botão, "entrar"…) para ver o que aconteceria e os sinais. <button className="gd-link" onClick={revelar}>Ou mostre os sinais agora.</button></p>}
        </div>
      )}
    </div>
  )
}

/* mocks de navegador (marcas fictícias, campos inertes) */
function Mock({ id, onIsca }) {
  const inert = (e) => { e.preventDefault(); onIsca() }
  if (id === 'login') {
    return (
      <form className="m-login" onSubmit={inert}>
        <div className="m-logo">faceboot</div>
        <input placeholder="E-mail ou telefone" readOnly onClick={onIsca} />
        <input placeholder="Senha" type="password" readOnly onClick={onIsca} />
        <button className="m-btn" type="submit">Entrar</button>
        <p className="m-link">Esqueceu a senha?</p>
      </form>
    )
  }
  if (id === 'promo') {
    return (
      <div className="m-promo">
        <div className="m-promo-top">MEGALUZ · DIA DO CLIENTE</div>
        <h3>🎉 Você foi selecionado(a)!</h3>
        <p>Responda 3 perguntas e ganhe um <b>Smartphone X</b>. Só pague o frete de <b>R$ 2,00</b>.</p>
        <div className="m-timer">⏳ Oferta acaba em 04:59</div>
        <button className="m-btn laranja" onClick={onIsca}>RESPONDER E GANHAR</button>
        <p className="m-share">Compartilhe com 5 amigos no WhatsApp para liberar 👇</p>
      </div>
    )
  }
  if (id === 'banco') {
    return (
      <div className="m-banco">
        <div className="m-banco-top">🏦 Seu Banco · Central de Segurança</div>
        <h3>⚠️ Acesso suspeito detectado</h3>
        <p>Identificamos um acesso incomum à sua conta. <b>Confirme seus dados em até 24h</b> ou sua conta será <b>bloqueada</b>.</p>
        <button className="m-btn" onClick={onIsca}>Confirmar meus dados agora</button>
      </div>
    )
  }
  if (id === 'premio') {
    return (
      <div className="m-premio">
        <div className="m-conf">🎊</div>
        <h3>Parabéns! Você ganhou R$ 5.000 no Pix</h3>
        <p>Para liberar o prêmio, pague a <b>taxa de liberação de R$ 29,90</b> via Pix.</p>
        <button className="m-btn verde" onClick={onIsca}>LIBERAR MEU PRÊMIO</button>
        <p className="m-mini">Não compartilhe este link. Resgate em até 10 minutos.</p>
      </div>
    )
  }
  return null
}

/* mock de conversa de WhatsApp (fictício) */
function Chat({ onIsca }) {
  return (
    <div className="m-chat">
      <div className="m-chat-top"><span className="m-ava">?</span><div><b>+55 11 9 9999-0000</b><small>desconhecido</small></div></div>
      <div className="m-bolhas">
        <div className="m-bolha rec">Oi mãe ❤️ troquei de número, salva aí</div>
        <div className="m-bolha rec">Tô num aperto, preciso que você faça um Pix agora. Depois te explico, tô sem áudio</div>
        <div className="m-bolha rec">É pra uma conta de um amigo, R$ 850. Consegue?</div>
      </div>
      <div className="m-chat-input"><input placeholder="Mensagem" readOnly onClick={onIsca} /><button className="m-send" onClick={onIsca}>Responder</button></div>
    </div>
  )
}

const CSS = `
.gd{margin-top:14px}
.gd .btn-sm{padding:6px 10px;font-size:13px}
.gd-intro{margin:14px 0 10px}
.gd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.gd-card{text-align:left;display:flex;flex-direction:column;gap:6px;padding:14px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--panel);color:var(--text);cursor:pointer;transition:border-color .15s}
.gd-card:hover{border-color:var(--accent)}
.gd-ic{font-size:30px}
.gd-card b{font-size:16px}
.gd-card small{color:var(--muted);font-size:13px;flex:1}
.gd-ver{color:var(--accent);font-weight:600;font-size:13px}
.gd-demo-top{display:flex;align-items:center;gap:12px;margin:12px 0}
.gd-demo-tit{font-weight:700}
.gd-frame{border:1px solid var(--line-strong);border-radius:12px;overflow:hidden;background:#0d1117;box-shadow:var(--shadow);max-width:560px;margin:0 auto}
.gd-fita{background:#b3261e;color:#fff;font-size:12px;font-weight:700;text-align:center;padding:6px 10px;letter-spacing:.02em}
.gd-urlbar{display:flex;align-items:center;gap:8px;background:#1b222c;padding:8px 12px;border-bottom:1px solid #000}
.gd-cad{font-size:13px}
.gd-url{font-family:var(--font-mono);font-size:12.5px;color:#ff8a80;background:#0d1117;border:1px solid #30363d;border-radius:999px;padding:5px 12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gd-tela{position:relative;background:#f0f2f5;color:#1a1a1a;min-height:300px;padding:22px}
.gd-reveal{position:absolute;inset:0;background:rgba(10,13,17,.9);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto}
.gd-reveal-box{background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:12px;padding:18px;max-width:460px;width:100%}
.gd-reveal-h{font-size:22px;font-weight:800;color:#f2574c;margin-bottom:8px}
.gd-querem{font-size:14px;margin:0 0 12px}
.gd-reveal-box h4{font-size:14px;margin:12px 0 6px;color:var(--accent)}
.gd-sinais,.gd-prot{margin:0;padding-left:20px;font-size:14px;display:flex;flex-direction:column;gap:5px}
.gd-reveal-acoes{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}
.gd-dica{font-size:13px;margin:12px 0;text-align:center}
.gd-link{background:none;border:none;color:var(--accent);cursor:pointer;font:inherit;text-decoration:underline;padding:0}

/* mocks */
.m-btn{border:none;border-radius:8px;background:#1877f2;color:#fff;font-weight:700;padding:12px;font-size:15px;cursor:pointer;width:100%}
.m-btn.laranja{background:#f5600a}.m-btn.verde{background:#16a34a}
.m-login{max-width:320px;margin:0 auto;display:flex;flex-direction:column;gap:10px;background:#fff;padding:22px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1)}
.m-logo{font-size:34px;font-weight:800;color:#1877f2;text-align:center;font-family:Georgia,serif}
.m-login input{padding:12px;border:1px solid #ccd0d5;border-radius:8px;font:inherit;background:#fff;color:#1a1a1a}
.m-link,.m-share,.m-mini{text-align:center;color:#1877f2;font-size:13px;margin:0}
.m-promo,.m-banco,.m-premio{max-width:360px;margin:0 auto;background:#fff;border-radius:10px;padding:20px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.1);display:flex;flex-direction:column;gap:10px;color:#1a1a1a}
.m-promo-top{background:#0a3d91;color:#fff;font-weight:800;font-size:12px;padding:8px;border-radius:6px;letter-spacing:.05em}
.m-promo h3,.m-banco h3,.m-premio h3{margin:4px 0;font-size:19px}
.m-timer{background:#fee2e2;color:#b3261e;font-weight:700;border-radius:6px;padding:6px}
.m-share{color:#128c7e;font-weight:600}
.m-banco-top{background:#004a8f;color:#fff;font-weight:700;font-size:13px;padding:8px;border-radius:6px}
.m-premio .m-conf{font-size:44px}
.m-mini{color:#888}
/* chat whatsapp fictício */
.m-chat{max-width:360px;margin:0 auto;background:#e5ddd5;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)}
.m-chat-top{background:#075e54;color:#fff;display:flex;align-items:center;gap:10px;padding:10px 12px}
.m-ava{width:34px;height:34px;border-radius:50%;background:#cfd8dc;color:#075e54;display:flex;align-items:center;justify-content:center;font-weight:800}
.m-chat-top small{display:block;opacity:.8;font-size:11px}
.m-bolhas{padding:14px;display:flex;flex-direction:column;gap:8px;min-height:150px}
.m-bolha{max-width:85%;padding:8px 11px;border-radius:10px;font-size:14px;color:#111}
.m-bolha.rec{background:#fff;align-self:flex-start}
.m-chat-input{display:flex;gap:6px;padding:8px;background:#f0f0f0}
.m-chat-input input{flex:1;padding:10px;border:none;border-radius:999px;font:inherit}
.m-send{border:none;background:#075e54;color:#fff;border-radius:999px;padding:0 16px;font-weight:700;cursor:pointer}
`
