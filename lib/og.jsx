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
          background: 'linear-gradient(135deg, #050b18 0%, #0e1a2f 60%, #1b1640 100%)',
          color: '#e8f1ff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #67e8f9, #a78bfa)',
              color: '#06101f',
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            V
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 700 }}>
            vinicius<span style={{ color: '#67e8f9' }}>.dev</span>
          </div>
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
                borderRadius: 32,
                border: '3px solid rgba(103, 232, 249, 0.5)',
                background: 'rgba(103, 232, 249, 0.12)',
                color: '#67e8f9',
                fontSize: 54,
                fontWeight: 800,
              }}
            >
              {badge}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 }}>{title}</div>
            {subtitle && <div style={{ display: 'flex', fontSize: 30, color: '#94a3b8', lineHeight: 1.35 }}>{subtitle}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, fontSize: 26, color: '#cbd5e1' }}>
          <span style={{ color: '#4ade80' }}>●</span> Grátis · Sem cadastro · Roda no seu navegador
        </div>
      </div>
    ),
    ogSize,
  )
}
