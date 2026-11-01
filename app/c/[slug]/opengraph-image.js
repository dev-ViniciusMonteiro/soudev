import { ImageResponse } from 'next/og'
import { carregarLoja } from './dados'

export const alt = 'Catálogo da loja'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Cartão do link no WhatsApp: nome da loja grande, na cor dela, com alguns produtos e preços.
export default async function Image({ params }) {
  const { slug } = await params
  const d = await carregarLoja(slug).catch(() => null)
  const nome = d?.loja?.nome || 'Catálogo'
  const cor = d?.loja?.config?.tema?.cor || '#ff5a36'
  const escuro = ['escuro', 'preto'].includes(d?.loja?.config?.tema?.fundo)
  const itens = (d?.produtos || []).filter((p) => p.estado === 'ativo').slice(0, 3)
  const ini = nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  const fundo = escuro ? '#0d0f14' : '#fbf8f3'
  const texto = escuro ? '#f5f5f7' : '#16130f'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: fundo, color: texto, fontFamily: 'sans-serif', padding: 64, position: 'relative' }}>
        <div style={{ position: 'absolute', right: -160, top: -160, width: 560, height: 560, borderRadius: 999, background: cor, opacity: 0.18, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ width: 120, height: 120, borderRadius: 999, background: cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700 }}>{ini}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, maxWidth: 900 }}>{nome}</div>
              <div style={{ fontSize: 30, opacity: 0.7, marginTop: 8 }}>Catálogo · Peça pelo WhatsApp</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {itens.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '22px 26px', borderRadius: 24, background: escuro ? '#1b1f28' : '#ffffff', border: `2px solid ${escuro ? '#2a2f3a' : '#ece6dc'}`, width: 340 }}>
                <div style={{ fontSize: 28, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.nome.slice(0, 26)}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color: cor, marginTop: 6 }}>{p.preco ? BRL.format(p.preco / 100) : 'Consulte'}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 30, fontWeight: 700 }}>
            <div style={{ display: 'flex', padding: '14px 26px', borderRadius: 999, background: '#25d366', color: '#fff' }}>Fazer pedido no WhatsApp</div>
            <div style={{ display: 'flex', opacity: 0.55, fontWeight: 500 }}>{`${(d?.produtos || []).length} produtos`}</div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
