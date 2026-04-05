import { CodeBlock } from '../../components/CodeBlock';

export default function ThemesPage() {
  return (
    <>
      <h1>Themes</h1>
      <p className="docs-lead">
        Configure dark and light themes with CSS custom properties.
      </p>

      <h2 id="built-in-themes">Built-in themes</h2>
      <p>
        Swarming ships with <code>dark</code> and <code>light</code> themes.
        Pass the theme name as a prop:
      </p>
      <CodeBlock
        language="tsx"
        code={`<Swarming provider={provider} theme="dark" />`}
      />

      <h2 id="custom-themes">Custom themes</h2>
      <p>
        Use <code>createTheme</code> to build your own theme:
      </p>
      <CodeBlock
        language="typescript"
        code={`import { createTheme } from '@web3viz/ui';

export const myTheme = createTheme({
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  accent: '#00ff88',
});`}
      />

      <h2 id="css-variables">CSS custom properties</h2>
      <p>
        All theme values are exposed as CSS custom properties prefixed with{' '}
        <code>--w3v-</code> so you can use them in your own styles.
      </p>
    </>
  );
}
