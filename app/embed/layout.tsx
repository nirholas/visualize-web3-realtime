export const metadata = {
  title: 'PumpFun Widget',
  description: 'Embeddable real-time PumpFun network visualization',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      {children}
    </div>
  );
}
