import { useEffect, useState } from 'react'

const parseJsonConfig = (value, fallback) => {
  if (!value) return fallback

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const brandName = import.meta.env.VITE_BRAND_NAME || 'Vinicius Monteiro Orlandi'
const heroTitle = import.meta.env.VITE_HERO_TITLE || 'Eu sou Vinicius, desenvolvedor de software especialista em e-commerce, IA e web.'
const heroSubtitle =
  import.meta.env.VITE_HERO_SUBTITLE ||
  'Crio sites, aplicações web, automações e produtos digitais que convertem atenção em vendas, confiança e crescimento real para marcas e negócios.'
const contactEmail = import.meta.env.VITE_EMAIL || 'contato@vinicius.dev'
const linkedinUrl = import.meta.env.VITE_LINKEDIN_URL || 'https://www.linkedin.com'
const githubUrl = import.meta.env.VITE_GITHUB_URL || 'https://github.com'
const whatsappUrl = import.meta.env.VITE_WHATSAPP_URL || 'https://wa.me/5511999999999'

const defaultServices = [
  {
    title: 'Desenvolvimento de software',
    description: 'Soluções sob medida para negócios que precisam de tecnologia para vender, escalar e operar melhor.',
    price: 'A consultar',
  },
  {
    title: 'Liderança técnica',
    description: 'Arquitetura, gestão de equipe, decisões técnicas, entregas com foco em impacto e velocidade.',
    price: 'A consultar',
  },
  {
    title: 'Sites e aplicações web',
    description: 'Experiências digitais modernas, rápidas, responsivas e pensadas para conversão e relacionamento.',
    price: 'A consultar',
  },
  {
    title: 'IA e agentes',
    description: 'Automação de processos, agentes de atendimento, produtividade e ferramentas inteligentes para equipes.',
    price: 'A consultar',
  },
  {
    title: 'Modelagem e venda de modelos em lota 20+',
    description: 'Estratégia, modelagem funcional e entrega de ativos digitais para uso em operações e produtos.',
    price: 'A consultar',
  },
  {
    title: 'Aulas de programação e IA aplicada',
    description: 'Treinamentos e mentoring para pessoas e times que querem aprender a usar inteligência artificial e código no dia a dia.',
    price: 'A consultar',
  },
]

const defaultProducts = [
  {
    name: 'Landing page premium',
    price: 'A consultar',
    description: 'Site profissional para vender sua marca, captar leads e fechar oportunidades.',
  },
  {
    name: 'E-commerce estratégico',
    price: 'A consultar',
    description: 'Plataforma para vendas com experiência sólida, navegação clara e conversão focada.',
  },
  {
    name: 'Sistema interno ou dashboard',
    price: 'A consultar',
    description: 'Painéis e ferramentas para operação, gestão de dados e tomada de decisão.',
  },
  {
    name: 'Agente de IA para negócios',
    price: 'A consultar',
    description: 'Automação com foco em atendimento, pesquisa, organização e produtividade em escala.',
  },
]

const services = parseJsonConfig(import.meta.env.VITE_SERVICES, defaultServices)
const products = parseJsonConfig(import.meta.env.VITE_PRODUCTS, defaultProducts)
const quoteServices = [
  'Desenvolvimento de site e/ou aplicação',
  'Soluções com IA',
  'Impressão 3D',
  'Modelagem 3D',
  'Outros',
]

const MESSAGE_SUBMITTED_KEY = 'soudev-message-submitted'
const QUOTE_HISTORY_KEY = 'soudev-quote-history'

const hasSubmittedMessage = () => {
  try {
    return window.sessionStorage.getItem(MESSAGE_SUBMITTED_KEY) === 'true'
  } catch {
    return false
  }
}

const readQuoteHistory = () => {
  try {
    const history = JSON.parse(window.sessionStorage.getItem(QUOTE_HISTORY_KEY) || '[]')
    return Array.isArray(history) ? history : []
  } catch {
    return []
  }
}

export default function App() {
  const [lead, setLead] = useState({ name: '', message: '' })
  const [submitted, setSubmitted] = useState(hasSubmittedMessage)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteHistory, setQuoteHistory] = useState(readQuoteHistory)
  const [quoteNotice, setQuoteNotice] = useState('')
  const [quoteServicesSelected, setQuoteServicesSelected] = useState([])
  const [quoteName, setQuoteName] = useState('')
  const [quoteContact, setQuoteContact] = useState('')
  const [quoteDetails, setQuoteDetails] = useState('')
  const [quoteError, setQuoteError] = useState('')
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)

  useEffect(() => {
    if (!quoteOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setQuoteOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [quoteOpen])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!lead.name.trim() || !lead.message.trim() || isSubmitting || submitted) return

    setIsSubmitting(true)

    try {
      const payload = {
        nome: lead.name.trim(),
        mensagem: lead.message.trim(),
      }

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        console.error('Erro do Apps Script:', response.status, response.statusText)
        return
      }

      try {
        window.sessionStorage.setItem(MESSAGE_SUBMITTED_KEY, 'true')
      } catch {
        // The in-memory state still prevents another message on this page.
      }

      setSubmitted(true)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleQuoteService = (service) => {
    setQuoteServicesSelected((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service],
    )
  }

  const handleQuoteSubmit = async (event) => {
    event.preventDefault()
    if (isSubmittingQuote) return

    const quote = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: quoteName.trim(),
      contact: quoteContact.trim(),
      services: [...quoteServicesSelected],
      details: quoteDetails.trim(),
    }
    const quoteMessage = [
      `Solicitante: ${quote.name}`,
      `Contato: ${quote.contact}`,
      `Serviços selecionados: ${quote.services.join(', ')}`,
      `Detalhes da cotação: ${quote.details}`,
    ].join('\n\n')

    setIsSubmittingQuote(true)
    setQuoteError('')

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'Cotação', mensagem: quoteMessage }),
      })

      if (!response.ok) {
        setQuoteError('Não foi possível enviar agora. Revise os dados e tente novamente.')
        return
      }

      const nextHistory = [...quoteHistory, quote]
      let historySaved = true
      try {
        window.sessionStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(nextHistory))
      } catch {
        historySaved = false
      }

      setQuoteHistory(nextHistory)
      setQuoteNotice(
        historySaved
          ? 'Cotação enviada. Você pode solicitar outra quando quiser.'
          : 'Cotação enviada, mas o histórico não pôde ser salvo neste navegador.',
      )
      setQuoteServicesSelected([])
      setQuoteName('')
      setQuoteContact('')
      setQuoteDetails('')
      setQuoteOpen(false)
    } catch (error) {
      console.error('Erro ao enviar cotação:', error)
      setQuoteError('Não foi possível enviar agora. Verifique sua conexão e tente novamente.')
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  return (
    <div className="site-shell single-form-page">
      <div className="robot-city" aria-hidden="true">
        <div className="city-horizon" />
        <div className="walking-robot robot-one">
          <span className="robot-antenna" />
          <span className="robot-head"><i /><i /></span>
          <span className="robot-body" />
          <span className="robot-arm robot-arm-left" />
          <span className="robot-arm robot-arm-right" />
          <span className="robot-leg robot-leg-left" />
          <span className="robot-leg robot-leg-right" />
        </div>
        <div className="walking-robot robot-two">
          <span className="robot-antenna" />
          <span className="robot-head"><i /><i /></span>
          <span className="robot-body" />
          <span className="robot-arm robot-arm-left" />
          <span className="robot-arm robot-arm-right" />
          <span className="robot-leg robot-leg-left" />
          <span className="robot-leg robot-leg-right" />
        </div>
        <div className="walking-robot robot-three">
          <span className="robot-antenna" />
          <span className="robot-head"><i /><i /></span>
          <span className="robot-body" />
          <span className="robot-arm robot-arm-left" />
          <span className="robot-arm robot-arm-right" />
          <span className="robot-leg robot-leg-left" />
          <span className="robot-leg robot-leg-right" />
        </div>
      </div>
      <main className="page-content form-only-layout">
        <section className="contact-only-card">
          {submitted ? (
            <div className="success-message">
              <span className="eyebrow">Mensagem enviada</span>
              <h3>Obrigado pela confiança.</h3>
              <p>Sua mensagem chegou. Em breve, entrarei em contato para entender seu objetivo e indicar o melhor caminho.</p>
              <div className="success-proof">
                <strong>Mais de 8 anos de experiência</strong>
                <p>Experiência em projetos para grandes players como:</p>
                <div className="brand-list" aria-label="Marcas atendidas">
                  <span>Natura</span>
                  <span>Cidade Center Norte</span>
                  <span>Fugini</span>
                  <span>Yamaha</span>
                  <span>Entre outras</span>
                </div>
                <p>Atuação com tecnologia, visão de negócio e comunicação clara em cada etapa.</p>
              </div>
              <a
                className="instagram-link"
                href="https://www.instagram.com/vinicius.d3v"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle className="instagram-flash" cx="18" cy="6" r="1" />
                </svg>
                <span>Acompanhe também</span>
                <strong>@vinicius.d3v</strong>
              </a>
            </div>
          ) : (
            <form className="lead-form" onSubmit={handleSubmit}>
              <div className="form-heading">
                <a
                  className="instagram-link"
                  href="https://www.instagram.com/vinicius.d3v"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Seguir Vinicius no Instagram"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle className="instagram-flash" cx="18" cy="6" r="1" />
                  </svg>
                  <span>Seguir no Instagram</span>
                  <strong>@vinicius.d3v</strong>
                </a>
                <h1 className="glow-title">
                  <span className="title-line">Deixe sua mensagem</span>
                  <span className="title-name title-name-one">Vinicius019</span>
                  <span className="title-name title-name-two">Lulis.X0X0</span>
                </h1>
              </div>

              <label>
                <span>Seu nome</span>
                <input
                  type="text"
                  placeholder="Digite seu nome"
                  value={lead.name}
                  onChange={(event) => setLead((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label>
                <span>Sua mensagem e rede social</span>
                <textarea
                  rows="5"
                  placeholder="Escreva aqui sua mensagem..."
                  value={lead.message}
                  onChange={(event) => setLead((current) => ({ ...current, message: event.target.value }))}
                />
              </label>

              <button type="submit" className="primary-button follow-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="button-content">
                    <span className="loader" aria-hidden="true" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar mensagem'
                )}
              </button>
            </form>
          )}
        </section>
      </main>
      <button
        className="quote-float-button"
        type="button"
        onClick={() => {
          setQuoteNotice('')
          setQuoteOpen(true)
        }}
        title="Solicitar uma cotação de serviço"
      >
        <span className="quote-button-mark" aria-hidden="true">+</span>
        <span>Cotação de serviço</span>
      </button>
      {quoteNotice && <p className="quote-toast" role="status">{quoteNotice}</p>}

      {quoteOpen && (
        <div className="quote-overlay" onMouseDown={(event) => event.target === event.currentTarget && setQuoteOpen(false)}>
          <section className="quote-dialog" role="dialog" aria-modal="true" aria-labelledby="quote-title">
            <button className="quote-close" type="button" onClick={() => setQuoteOpen(false)} aria-label="Voltar para a página anterior">
              <span aria-hidden="true">×</span>
            </button>
            <div className="quote-intro">
              <span className="eyebrow">Projeto sob medida</span>
              <h2 id="quote-title">Vamos tirar sua ideia do papel.</h2>
              <p>Conte o que precisa. Vou analisar o contexto e retornar com próximos passos claros, escopo e investimento.</p>
            </div>
            <div className="quote-trust-row">
              <strong>+ de 8 anos de experiência</strong>
              <span>Projetos para Natura, Cidade Center Norte, Fugini, Yamaha e outras marcas.</span>
            </div>
            <details className="quote-history">
              <summary>Histórico desta sessão ({quoteHistory.length})</summary>
              {quoteHistory.length === 0 ? (
                <p>Nenhuma cotação enviada nesta sessão.</p>
              ) : (
                <ol>
                  {[...quoteHistory].reverse().map((item) => (
                    <li key={item.id}>
                      <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
                      <strong>{item.services.join(', ')}</strong>
                      <p>{item.details}</p>
                    </li>
                  ))}
                </ol>
              )}
            </details>
            <form className="quote-form" onSubmit={handleQuoteSubmit}>
              <fieldset className="quote-service-fieldset">
                <legend>O que você deseja cotar?</legend>
                <div className="quote-service-options">
                  {quoteServices.map((service) => (
                    <label className="quote-service-option" key={service}>
                      <input
                        type="checkbox"
                        checked={quoteServicesSelected.includes(service)}
                        onChange={() => toggleQuoteService(service)}
                      />
                      <span>{service}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="quote-contact-fields">
                <label>
                  <span>Seu nome</span>
                  <input value={quoteName} onChange={(event) => setQuoteName(event.target.value)} required autoComplete="name" placeholder="Nome e sobrenome" />
                </label>
                <label>
                  <span>E-mail ou telefone</span>
                  <input value={quoteContact} onChange={(event) => setQuoteContact(event.target.value)} required autoComplete="email" placeholder="Como posso falar com você?" />
                </label>
              </div>
              <label className="quote-details-field">
                <span>Conte mais sobre o que você precisa</span>
                <textarea value={quoteDetails} onChange={(event) => setQuoteDetails(event.target.value)} required rows="4" placeholder="Objetivo, escopo, prazo desejado e qualquer detalhe importante..." />
              </label>
              <p className="quote-disclaimer">Os valores podem variar conforme o escopo e os requisitos do projeto. Trabalho com desenvolvimento acelerado e planejamento para entregar projetos em prazos enxutos, sem abrir mão da qualidade.</p>
              {quoteError && <p className="quote-error" role="alert">{quoteError}</p>}
              <button className="primary-button quote-submit" type="submit" disabled={isSubmittingQuote || quoteServicesSelected.length === 0}>
                {isSubmittingQuote ? 'Enviando cotação...' : 'Solicitar minha cotação'}
              </button>
              {quoteServicesSelected.length === 0 && <span className="quote-hint">Selecione ao menos uma opção para continuar.</span>}
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
