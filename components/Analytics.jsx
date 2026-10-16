'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { clip, contentGroup, track } from '@/lib/analytics'

const isEmergencyNumber = (number) => number.length <= 4 || number.startsWith('0800')

// Rastreamento por delegação: um único conjunto de ouvintes no documento cobre todas as ferramentas.
export default function Analytics() {
  const pathname = usePathname()
  const toolStarted = useRef(false)

  useEffect(() => {
    toolStarted.current = false
    // Espera o título da nova página ser aplicado antes de enviar.
    const timer = setTimeout(() => {
      track('page_view', {
        page_title: document.title,
        page_location: location.href,
        page_path: pathname,
        content_group: contentGroup(pathname),
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    // Primeira interação com a ferramenta: a principal métrica de uso real.
    const onInteract = (event) => {
      if (toolStarted.current || !event.target.closest?.('[data-tool-slug]')) return
      toolStarted.current = true
      track('tool_start', { interaction: event.type })
    }

    const onClick = (event) => {
      const el = event.target.closest?.('a, button')
      if (!el) return
      const label = clip(el.getAttribute('aria-label') || el.textContent)

      if (el.matches('a.tool-card')) {
        const place = el.closest('.tool-page') ? 'relacionadas' : location.pathname === '/' ? 'inicio' : 'catalogo'
        track('select_content', { content_type: 'ferramenta', item_id: el.getAttribute('href').split('/').pop(), location: place })
        return
      }

      const href = el.getAttribute('href') || ''
      if (el.hasAttribute('download')) {
        const name = el.getAttribute('download') || ''
        track('file_download', { file_extension: (name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase() })
        return
      }
      if (href.startsWith('tel:')) {
        const number = href.slice(4).replace(/\D/g, '')
        track('phone_call', { phone_number: isEmergencyNumber(number) ? number : 'outro', link_text: label })
        return
      }
      if (/wa\.me|whatsapp|instagram\.com|mailto:/.test(href)) {
        track('contact_click', { link_url: href.startsWith('mailto:') ? 'mailto' : href, link_text: label })
        return
      }
      if (el.closest('.site-header, .site-footer') && el.tagName === 'A') {
        track('menu_click', { link_text: label, link_url: href, menu: el.closest('.site-header') ? 'topo' : 'rodape' })
        return
      }
      // Botões com data-ga já mandam um evento próprio (copiar, abas, escolher arquivo).
      if (el.tagName === 'BUTTON' && !el.dataset.ga && el.closest('[data-tool-slug]')) {
        track('tool_action', { action_label: label })
      }
    }

    // "toggle" não sobe pelo DOM: escutamos na fase de captura.
    const onToggle = (event) => {
      const details = event.target
      if (details.tagName !== 'DETAILS' || !details.open || !details.closest('.faq')) return
      track('faq_open', { question: clip(details.querySelector('summary')?.textContent) })
    }

    // Recibo e outras páginas usam a impressão do navegador para "salvar em PDF".
    const onPrint = () => track('print')

    const interactions = ['pointerdown', 'keydown', 'input', 'change']
    interactions.forEach((type) => document.addEventListener(type, onInteract, true))
    document.addEventListener('click', onClick, true)
    document.addEventListener('toggle', onToggle, true)
    window.addEventListener('beforeprint', onPrint)
    return () => {
      interactions.forEach((type) => document.removeEventListener(type, onInteract, true))
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('toggle', onToggle, true)
      window.removeEventListener('beforeprint', onPrint)
    }
  }, [])

  // Core Web Vitals reais dos visitantes (os mesmos sinais que o Google usa no ranqueamento).
  useReportWebVitals((metric) => {
    track(metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_id: metric.id,
      metric_rating: metric.rating,
      metric_value: metric.value,
      non_interaction: true,
    })
  })

  return null
}

// Dispara um evento quando o componente aparece (ex.: página 404).
export function TrackEvent({ name, params }) {
  useEffect(() => {
    track(name, { page_path: location.pathname, ...params })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
