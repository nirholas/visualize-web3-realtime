interface APITableProps {
  properties: {
    name: string;
    type: string;
    default?: string;
    required?: boolean;
    description: string;
  }[];
}

export function APITable({ properties }: APITableProps) {
  return (
    <div style={{
      overflowX: 'auto',
      margin: '16px 0',
      borderRadius: '8px',
      border: '1px solid rgba(140,140,200,0.15)',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        fontFamily: 'var(--font-ibm-plex-mono), monospace',
      }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(140,140,200,0.15)' }}>
            {['Prop', 'Type', 'Default', 'Description'].map(h => (
              <th key={h} style={{
                textAlign: 'left',
                padding: '10px 16px',
                color: '#8888aa',
                fontWeight: 500,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#0d0d1a',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {properties.map((prop, i) => (
            <tr key={prop.name} style={{
              borderBottom: i < properties.length - 1 ? '1px solid rgba(140,140,200,0.08)' : undefined,
            }}>
              <td style={{ padding: '10px 16px' }}>
                <code style={{
                  color: '#a78bfa',
                  background: 'rgba(167,139,250,0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                }}>
                  {prop.name}
                </code>
                {prop.required && (
                  <span style={{
                    color: '#f87171',
                    fontSize: '10px',
                    marginLeft: '4px',
                    verticalAlign: 'super',
                  }}>*</span>
                )}
              </td>
              <td style={{ padding: '10px 16px' }}>
                <code style={{
                  color: '#67e8f9',
                  fontSize: '12px',
                }}>
                  {prop.type}
                </code>
              </td>
              <td style={{ padding: '10px 16px', color: '#6b7280' }}>
                {prop.default ? (
                  <code style={{ fontSize: '12px' }}>{prop.default}</code>
                ) : '—'}
              </td>
              <td style={{ padding: '10px 16px', color: '#b0b0c8', fontSize: '12px' }}>
                {prop.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
