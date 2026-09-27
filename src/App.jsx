import { useState } from 'react'

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

export default function App() {
  const [lead, setLead] = useState({ name: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!lead.name.trim() || !lead.message.trim() || isSubmitting) return

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

      setSubmitted(true)
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="site-shell single-form-page">
      <main className="page-content form-only-layout">
        <section className="contact-only-card">
          {submitted ? (
            <div className="success-message">
              <span className="eyebrow">Mensagem enviada</span>
              <h3>Muito obrigado pela sua mensagem.</h3>
              <p>Mostre essa tela para <strong>Vinicius019</strong> ou <strong>Lulis.X0X0</strong>.</p>
            </div>
          ) : (
            <form className="lead-form" onSubmit={handleSubmit}>
              <div className="form-heading">
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
    </div>
  )
}
