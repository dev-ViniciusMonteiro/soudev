import { ImageResponse } from 'next/og'

export const ogSize = { width: 1200, height: 630 }

// Imagem de compartilhamento (WhatsApp, LinkedIn, X, Google Discover).
export function renderOg({ badge, title, subtitle }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: '#f7f5f0',
          color: '#1a1a1a',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 600, paddingBottom: 18, borderBottom: '2px solid #1a1a1a' }}>
          Vinicius Monteiro
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          {badge && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 150,
                height: 150,
                padding: '0 20px',
                borderRadius: 8,
                border: '3px solid #cbc4b4',
                color: '#1f5c45',
                fontSize: 48,
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
            {subtitle && <div style={{ display: 'flex', fontSize: 30, color: '#5e5a52', lineHeight: 1.35 }}>{subtitle}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#5e5a52' }}>Grátis · Sem cadastro · Roda no seu navegador</div>
      </div>
    ),
    ogSize,
  )
}
