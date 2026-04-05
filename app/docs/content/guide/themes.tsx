import { CodeBlock } from '../../components/CodeBlock';

export default function ThemesPage() {
  return (
    <>
      <h1>Themes</h1>
      <p className="docs-lead">
        Configure dark and light themes using CSS custom properties and the ThemeProvider.
      </p>

      <h2 id="theme-provider">ThemeProvider</h2>
      <p>
        Wrap your app with <code>ThemeProvider</code> to enable theming:
      </p>
      <CodeBlock
        language="tsx"
        code={`import { ThemeProvider, createTheme } from '@web3viz/ui';

const myTheme = createTheme({
  background: '#0a0a0f',
  surface: '#141420',
  border: '#2a2a3a',
  text: '#e2e2f0',
  textMuted: '#8888aa',
  accent: '#a78bfa',
});

export default function App({ children }) {
  return <ThemeProvider theme={myTheme}>{children}</ThemeProvider>;
}`}
      />

      <h2 id="design-tokens">Design tokens</h2>
      <p>
        All colors are exposed as CSS custom properties for runtime overrides:
      </p>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Default (Dark)</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['--w3v-bg', '#0a0a0f', 'Background color'],
            ['--w3v-surface', '#141420', 'Card/panel surface'],
            ['--w3v-border', '#2a2a3a', 'Border color'],
            ['--w3v-text', '#e2e2f0', 'Primary text'],
            ['--w3v-text-muted', '#8888aa', 'Secondary text'],
            ['--w3v-accent', '#a78bfa', 'Accent/brand color'],
          ].map(([token, value, desc]) => (
            <tr key={token}>
              <td><code>{token}</code></td>
              <td>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: value,
                    border: '1px solid rgba(140,140,200,0.2)',
                  }} />
                  <code>{value}</code>
                </span>
              </td>
              <td>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="css-override">Override via CSS</h2>
      <CodeBlock
        language="css"
        filename="globals.css"
        code={`:root {
  --w3v-bg: #ffffff;
  --w3v-surface: #f5f5f5;
  --w3v-text: #111111;
  --w3v-accent: #6366f1;
}`}
      />

      <h2 id="presets">Built-in presets</h2>
      <CodeBlock
        language="tsx"
        code={`import { darkTheme, lightTheme } from '@web3viz/ui';

// Use a preset
<ThemeProvider theme={darkTheme}>

// Or extend one
<ThemeProvider theme={{ ...darkTheme, accent: '#10b981' }}>`}
      />
    </>
  );
}
