import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #0a0a14, #0f1029)',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay omitted — Satori cannot parse rgba() inside linear-gradient color stops */}
        {/* Central glow */}
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Central node */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #a78bfa, #6366f1)',
            boxShadow: '0 0 24px rgba(129,140,248,0.6)',
            display: 'flex',
            position: 'absolute',
          }}
        />
        {/* Orbiting nodes with connection hint */}
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#38bdf8', position: 'absolute', top: 28, right: 40, boxShadow: '0 0 10px rgba(56,189,248,0.7)', display: 'flex' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', position: 'absolute', bottom: 32, left: 30, boxShadow: '0 0 8px rgba(52,211,153,0.7)', display: 'flex' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f472b6', position: 'absolute', bottom: 28, right: 34, boxShadow: '0 0 10px rgba(244,114,182,0.7)', display: 'flex' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', position: 'absolute', top: 36, left: 34, boxShadow: '0 0 6px rgba(251,191,36,0.7)', display: 'flex' }} />
        {/* Edge lines */}
        <svg width="180" height="180" style={{ position: 'absolute', top: 0, left: 0 } as React.CSSProperties}>
          <line x1="90" y1="90" x2="126" y2="35" stroke="rgba(129,140,248,0.2)" strokeWidth="1" />
          <line x1="90" y1="90" x2="37" y2="138" stroke="rgba(129,140,248,0.15)" strokeWidth="1" />
          <line x1="90" y1="90" x2="134" y2="140" stroke="rgba(129,140,248,0.15)" strokeWidth="1" />
          <line x1="90" y1="90" x2="40" y2="42" stroke="rgba(129,140,248,0.12)" strokeWidth="1" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
