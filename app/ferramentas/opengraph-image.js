import { ogSize, renderOg } from '@/lib/og'
import { tools } from '@/lib/tools'

export const alt = 'Todas as ferramentas online grátis'
export const size = ogSize
export const contentType = 'image/png'

export default function Image() {
  return renderOg({
    badge: String(tools.length),
    title: 'Todas as ferramentas grátis',
    subtitle: 'PDF, imagem, calculadoras 2026, QR Code Pix, recibos, CPF e CNPJ.',
  })
}
