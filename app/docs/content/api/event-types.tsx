import { CodeBlock } from '../../components/CodeBlock';

export default function EventTypesPage() {
  return (
    <>
      <h1>Event Types</h1>
      <p className="docs-lead">
        TypeScript type definitions for all data structures and event callbacks.
      </p>

      <h2 id="graph-types">Graph types</h2>
      <CodeBlock
        language="typescript"
        showLineNumbers
        code={`interface GraphNode {
  id: string;
  label?: string;
  category?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  z?: number;
  [key: string]: unknown;  // Custom properties
}

interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  color?: string;
  [key: string]: unknown;
}

type Vec3 = { x: number; y: number; z: number };`}
      />

      <h2 id="data-types">Data types</h2>
      <CodeBlock
        language="typescript"
        code={`interface Token {
  id: string;
  name: string;
  symbol: string;
  mint: string;
  uri?: string;
  timestamp: number;
}

interface Trade {
  id: string;
  tokenId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  trader: string;
  timestamp: number;
}

interface Claim {
  id: string;
  tokenId: string;
  claimer: string;
  amount: number;
  timestamp: number;
}

interface TopToken {
  id: string;
  name: string;
  marketCap: number;
  volume24h: number;
}

interface TraderEdge {
  source: string;
  target: string;
  tradeCount: number;
  volume: number;
}`}
      />

      <h2 id="handle-types">Handle types</h2>
      <CodeBlock
        language="typescript"
        code={`interface GraphHandle {
  focusNode: (id: string) => void;
  resetCamera: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

interface ShareColors {
  background: string;
  text: string;
  accent: string;
}`}
      />

      <h2 id="category-types">Category types</h2>
      <CodeBlock
        language="typescript"
        code={`interface CategoryConfig {
  id: string;
  label: string;
  color: string;
  icon?: string;
  visible?: boolean;
}

// Built-in categories
const CATEGORIES = ['token', 'trade', 'claim', 'default'] as const;
type Category = typeof CATEGORIES[number];`}
      />
    </>
  );
}
