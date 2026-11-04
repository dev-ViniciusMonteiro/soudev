import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #2350c9, #0e359d)',
          color: '#ffffff',
          fontSize: 120,
          fontWeight: 800,
          fontFamily: 'sans-serif',
        }}
      >
        V
        <div style={{ position: 'absolute', right: 34, bottom: 38, width: 26, height: 26, borderRadius: 13, background: '#ff606a' }} />
      </div>
    ),
    size,
  )
}
