import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#F5F4EE',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Yellow blob top-right */}
        <div style={{
          position: 'absolute',
          top: -120,
          right: -120,
          width: 480,
          height: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,239,113,0.7) 0%, rgba(244,239,113,0.1) 70%, transparent 100%)',
          display: 'flex',
        }} />

        {/* Yellow blob bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(244,239,113,0.5) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontSize: '120px',
            fontWeight: 900,
            color: '#1E1E1E',
            letterSpacing: '-4px',
            lineHeight: 1,
            marginBottom: '16px',
          }}>
            flexroom.
          </div>

          <div style={{
            width: '64px',
            height: '3px',
            background: '#F4EF71',
            borderRadius: '2px',
            marginBottom: '24px',
          }} />

          <div style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#868686',
            letterSpacing: '8px',
            textTransform: 'uppercase',
          }}>
            FIT SOCIAL HUB
          </div>

          <div style={{
            marginTop: '32px',
            fontSize: '18px',
            color: '#aaaaaa',
            letterSpacing: '1px',
          }}>
            San Cristóbal de las Casas, Chiapas
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '32px',
          right: '48px',
          fontSize: '16px',
          color: '#cccccc',
        }}>
          www.flexroomstudio.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
