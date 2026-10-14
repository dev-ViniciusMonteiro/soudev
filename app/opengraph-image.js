import { ogSize, renderOg } from '@/lib/og'
import { tools } from '@/lib/tools'

export const alt = 'Ferramentas online grátis de Vinicius Monteiro Orlandi'
export const size = ogSize
export const contentType = 'image/png'

export default function Image() {
  return renderOg({
    title: 'Ferramentas online grátis',
    subtitle: `${tools.length} ferramentas de PDF, calculadoras 2026, QR Code Pix, recibos e geradores.`,
  })
}
