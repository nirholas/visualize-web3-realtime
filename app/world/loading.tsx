export default function WorldLoading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 12,
        background: '#0a0a12',
        fontFamily: "'IBM Plex Mono', monospace",
        color: '#d8d8e8',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid rgba(129,140,248,0.2)',
          borderTopColor: '#818cf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 11, opacity: 0.4, letterSpacing: '0.05em' }}>Loading visualization</p>
    </div>
  );
}
