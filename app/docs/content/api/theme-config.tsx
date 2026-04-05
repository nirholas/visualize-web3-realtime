import { APITable } from '../../components/APITable';
import { CodeBlock } from '../../components/CodeBlock';

export default function ThemeConfigPage() {
  return (
    <>
      <h1>Theme Configuration</h1>
      <p className="docs-lead">
        Complete API reference for the theming system.
      </p>

      <h2 id="create-theme">createTheme()</h2>
      <CodeBlock
        language="typescript"
        code={`function createTheme(overrides: Partial<ThemeTokens>): Theme`}
      />

      <h2 id="theme-tokens">ThemeTokens</h2>
      <APITable
        properties={[
          { name: 'background', type: 'string', default: '"#0a0a0f"', description: 'Main background color' },
          { name: 'surface', type: 'string', default: '"#141420"', description: 'Card and panel surface color' },
          { name: 'border', type: 'string', default: '"#2a2a3a"', description: 'Border color' },
          { name: 'text', type: 'string', default: '"#e2e2f0"', description: 'Primary text color' },
          { name: 'textMuted', type: 'string', default: '"#8888aa"', description: 'Secondary/muted text color' },
          { name: 'accent', type: 'string', default: '"#a78bfa"', description: 'Accent/brand color used for highlights and interactive elements' },
          { name: 'success', type: 'string', default: '"#10b981"', description: 'Success state color' },
          { name: 'warning', type: 'string', default: '"#fbbf24"', description: 'Warning state color' },
          { name: 'error', type: 'string', default: '"#ef4444"', description: 'Error state color' },
        ]}
      />

      <h2 id="presets">Built-in presets</h2>
      <CodeBlock
        language="tsx"
        code={`import { darkTheme, lightTheme, createTheme, ThemeProvider } from '@web3viz/ui';

// Use dark theme (default)
<ThemeProvider theme={darkTheme}>

// Use light theme
<ThemeProvider theme={lightTheme}>

// Custom theme
<ThemeProvider theme={createTheme({ accent: '#6366f1', background: '#000' })}>`}
      />

      <h2 id="css-variables">CSS custom properties</h2>
      <p>
        The <code>ThemeProvider</code> sets CSS custom properties on the root element.
        You can use these anywhere in your CSS:
      </p>
      <CodeBlock
        language="css"
        code={`.my-panel {
  background: var(--w3v-surface);
  border: 1px solid var(--w3v-border);
  color: var(--w3v-text);
}

.my-button {
  background: var(--w3v-accent);
  color: var(--w3v-bg);
}`}
      />
    </>
  );
}
