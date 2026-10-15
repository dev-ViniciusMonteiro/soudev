import { ogSize, renderOg } from '@/lib/og'

export const alt = 'Jogos online grátis no navegador'
export const size = ogSize
export const contentType = 'image/png'

export default function Image() {
  return renderOg({
    badge: 'JOGOS',
    title: 'Jogos online grátis',
    subtitle: 'Jogue direto no navegador, sem baixar nada. No PC e no celular.',
  })
}
