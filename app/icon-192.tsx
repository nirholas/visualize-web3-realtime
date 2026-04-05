import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: 'linear-gradient(135deg, #0a0a14, #0f1029)',
          borderRadius: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #a78bfa, #6366f1)',
            boxShadow: '0 0 28px rgba(129,140,248,0.6)',
            display: 'flex',
            position: 'absolute',
          }}
        />
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#38bdf8', position: 'absolute', top: 30, right: 42, boxShadow: '0 0 12px rgba(56,189,248,0.7)', display: 'flex' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#34d399', position: 'absolute', bottom: 34, left: 32, boxShadow: '0 0 10px rgba(52,211,153,0.7)', display: 'flex' }} />
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f472b6', position: 'absolute', bottom: 30, right: 36, boxShadow: '0 0 10px rgba(244,114,182,0.7)', display: 'flex' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', position: 'absolute', top: 38, left: 36, boxShadow: '0 0 8px rgba(251,191,36,0.7)', display: 'flex' }} />
      </div>
    ),
    { ...size },
  );
}
