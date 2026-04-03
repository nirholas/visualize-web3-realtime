import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PumpFun World — real-time 3D token visualization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0a0a14',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              border: '2px solid rgba(120, 140, 234, 0.4)',
              borderRadius: 24,
              display: 'flex',
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              padding: '24px 48px',
            }}
          >
            PumpFun World
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              fontSize: 20,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Real-time 3D Token Visualization
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
