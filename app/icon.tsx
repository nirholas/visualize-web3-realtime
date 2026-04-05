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
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #818cf8, #4f46e5)',
            boxShadow: '0 0 8px rgba(129,140,248,0.6)',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
