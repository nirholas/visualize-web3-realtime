import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0a12',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Central node */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #a78bfa, #6366f1)',
            boxShadow: '0 0 8px rgba(129,140,248,0.7)',
            display: 'flex',
            position: 'absolute',
          }}
        />
        {/* Orbiting nodes */}
        <div
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: '#38bdf8',
            position: 'absolute',
            top: 5,
            right: 7,
            boxShadow: '0 0 4px rgba(56,189,248,0.8)',
            display: 'flex',
          }}
        />
        <div
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#34d399',
            position: 'absolute',
            bottom: 6,
            left: 6,
            boxShadow: '0 0 3px rgba(52,211,153,0.8)',
            display: 'flex',
          }}
        />
        <div
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#f472b6',
            position: 'absolute',
            bottom: 5,
            right: 6,
            boxShadow: '0 0 3px rgba(244,114,182,0.8)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
