'use client'

import { useEffect, useState } from 'react'
import { CopyButton, Field, Notice, NumberInput, Tabs } from '../ui'
import { onlyDigits, parseNumber } from '@/lib/br'
import { downloadBlob } from '@/lib/client'
import { gerarPixPayload } from '@/lib/pix'

const escapeWifi = (value) => value.replace(/([\\;,:"])/g, '\\$1')

function buildContent(mode, data) {
  switch (mode) {
    case 'link':
      return data.text.trim()
    case 'wifi':
      if (!data.ssid.trim()) return ''
      return `WIFI:T:${data.security};S:${escapeWifi(data.ssid)};${data.security === 'nopass' ? '' : `P:${escapeWifi(data.password)};`}H:${data.hidden ? 'true' : 'false'};;`
    case 'whatsapp': {
      const phone = onlyDigits(data.phone)
      if (phone.length < 10) return ''
      const full = phone.length <= 11 ? `55${phone}` : phone
      return `https://wa.me/${full}${data.message ? `?text=${encodeURIComponent(data.message)}` : ''}`
    }
    case 'pix': {
      if (!data.key.trim() || !data.name.trim() || !data.city.trim()) return ''
      const valor = parseNumber(data.amount)
      return gerarPixPayload({
        chave: data.key,
        nome: data.name,
        cidade: data.city,
        valor: Number.isFinite(valor) ? valor : 0,
        txid: data.txid,
        descricao: data.description,
      })
    }
    default:
      return ''
  }
}

export default function QrCode() {
  const [mode, setMode] = useState('link')
  const [data, setData] = useState({
    text: 'https://',
    ssid: '',
    password: '',
    security: 'WPA',
    hidden: false,
    phone: '',
    message: '',
    key: '',
    name: '',
    city: '',
    amount: '',
    txid: '',
    description: '',
  })
  const [style, setStyle] = useState({ dark: '#0b1220', light: '#ffffff', size: 512, margin: 2 })
  const [image, setImage] = useState('')
  const set = (key) => (event) => setData((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const content = buildContent(mode, data)
  const validLink = mode !== 'link' || content.length > 8

  useEffect(() => {
    let cancelled = false
    if (!content || !validLink) {
      setImage('')
      return undefined
    }
    import('qrcode').then(async ({ default: QR }) => {
      try {
        const url = await QR.toDataURL(content, { width: style.size, margin: style.margin, color: { dark: style.dark, light: style.light }, errorCorrectionLevel: 'M' })
        if (!cancelled) setImage(url)
      } catch {
        if (!cancelled) setImage('')
      }
    })
    return () => {
      cancelled = true
    }
  }, [content, validLink, style])

  const downloadSvg = async () => {
    const { default: QR } = await import('qrcode')
    const svg = await QR.toString(content, { type: 'svg', margin: style.margin, color: { dark: style.dark, light: style.light }, errorCorrectionLevel: 'M' })
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `qrcode-${mode}.svg`)
  }

  return (
    <div className="tool-stack">
      <Tabs tabs={[['link', 'Link ou texto'], ['pix', 'Pix'], ['wifi', 'Wi-Fi'], ['whatsapp', 'WhatsApp']]} value={mode} onChange={setMode} />
      <div className="tool-split">
        <div className="tool-form">
          {mode === 'link' && (
            <Field label="Link ou texto">
              <textarea rows={4} value={data.text} onChange={set('text')} placeholder="https://seusite.com.br" />
            </Field>
          )}
          {mode === 'wifi' && (
            <>
              <Field label="Nome da rede (SSID)">
                <input value={data.ssid} onChange={set('ssid')} />
              </Field>
              <Field label="Segurança">
                <select value={data.security} onChange={set('security')}>
                  <option value="WPA">WPA/WPA2/WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Sem senha</option>
                </select>
              </Field>
              {data.security !== 'nopass' && (
                <Field label="Senha">
                  <input value={data.password} onChange={set('password')} />
                </Field>
              )}
              <label className="check">
                <input type="checkbox" checked={data.hidden} onChange={set('hidden')} />
                Rede oculta
              </label>
            </>
          )}
          {mode === 'whatsapp' && (
            <>
              <Field label="Número com DDD">
                <input value={data.phone} onChange={set('phone')} inputMode="tel" placeholder="(11) 99999-9999" />
              </Field>
              <Field label="Mensagem inicial (opcional)">
                <textarea rows={3} value={data.message} onChange={set('message')} />
              </Field>
            </>
          )}
          {mode === 'pix' && (
            <>
              <Field label="Chave Pix" hint="CPF/CNPJ só números, e-mail, telefone com +55 ou chave aleatória.">
                <input value={data.key} onChange={set('key')} />
              </Field>
              <div className="grid-2">
                <Field label="Nome do recebedor">
                  <input value={data.name} onChange={set('name')} maxLength={25} />
                </Field>
                <Field label="Cidade">
                  <input value={data.city} onChange={set('city')} maxLength={15} />
                </Field>
              </div>
              <div className="grid-2">
                <Field label="Valor (opcional)">
                  <NumberInput value={data.amount} onChange={set('amount')} placeholder="0,00" />
                </Field>
                <Field label="Identificador (opcional)">
                  <input value={data.txid} onChange={set('txid')} maxLength={25} placeholder="PEDIDO123" />
                </Field>
              </div>
              <Field label="Descrição (opcional)">
                <input value={data.description} onChange={set('description')} maxLength={40} />
              </Field>
            </>
          )}
          <details className="details">
            <summary>Personalizar cores e tamanho</summary>
            <div className="grid-2">
              <Field label="Cor do código">
                <input type="color" value={style.dark} onChange={(event) => setStyle((s) => ({ ...s, dark: event.target.value }))} />
              </Field>
              <Field label="Cor de fundo">
                <input type="color" value={style.light} onChange={(event) => setStyle((s) => ({ ...s, light: event.target.value }))} />
              </Field>
              <Field label="Tamanho do PNG">
                <select value={style.size} onChange={(event) => setStyle((s) => ({ ...s, size: Number(event.target.value) }))}>
                  {[256, 512, 1024, 2048].map((size) => (
                    <option key={size} value={size}>{size} px</option>
                  ))}
                </select>
              </Field>
              <Field label="Margem">
                <select value={style.margin} onChange={(event) => setStyle((s) => ({ ...s, margin: Number(event.target.value) }))}>
                  {[0, 1, 2, 4].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
          </details>
        </div>
        <div className="tool-result qr-result">
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="QR Code gerado" className="qr-image" />
              <div className="actions">
                <a className="btn btn-primary" href={image} download={`qrcode-${mode}.png`}>Baixar PNG</a>
                <button type="button" className="btn btn-ghost" onClick={downloadSvg}>Baixar SVG</button>
              </div>
              {mode === 'pix' && (
                <div className="pix-code">
                  <span className="field-label">Pix copia e cola</span>
                  <code>{content}</code>
                  <CopyButton text={content} label="Copiar código Pix" className="btn btn-ghost" />
                </div>
              )}
            </>
          ) : (
            <Notice kind="warn">
              {mode === 'pix' ? 'Preencha chave, nome e cidade.' : mode === 'wifi' ? 'Informe o nome da rede.' : mode === 'whatsapp' ? 'Informe o número com DDD.' : 'Digite um link ou texto.'}
            </Notice>
          )}
        </div>
      </div>
    </div>
  )
}
