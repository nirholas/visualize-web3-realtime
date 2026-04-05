# Task 31: Theme System & Presets

## Goal
Build a rich theme system with 10+ built-in presets that make visualizations instantly look stunning in different contexts. Themes are low-effort, high-shareability content.

## Context
Themes are viral. People screenshot beautiful visualizations and share them. Each theme preset is also a social media post, a playground option, and a reason for someone to try the library. shadcn/ui proved that good defaults drive adoption.

## Requirements

### 1. Theme Configuration
```ts
interface SwarmingTheme {
  name: string
  
  // Canvas
  background: string | [string, string]  // solid or gradient
  
  // Nodes
  nodeColors: string[]          // Palette for node groups
  nodeSize: number              // Base node size
  nodeOpacity: number           // 0-1
  
  // Edges
  edgeColor: string
  edgeOpacity: number
  edgeWidth: number
  
  // Hub nodes
  hubSize: number
  hubOpacity: number
  hubLabelColor: string
  hubLabelSize: number
  
  // Effects
  bloom: {
    enabled: boolean
    strength: number           // 0-3
    radius: number             // 0-1
    threshold: number          // 0-1
  }
  
  // Ambient
  ambientLight: number         // 0-1
  fog: { color: string; near: number; far: number } | null
}
```

### 2. Built-in Presets
| Theme | Vibe | Colors |
|-------|------|--------|
| `midnight` (default) | Deep space | Navy, cyan, magenta, white |
| `daylight` | Clean, professional | White bg, muted colors |
| `cyberpunk` | Neon noir | Black, hot pink, electric blue, lime |
| `terminal` | Hacker aesthetic | Black bg, green monochrome |
| `ocean` | Calm, organic | Deep blue, teal, aqua |
| `sunset` | Warm, vibrant | Dark purple, orange, pink, gold |
| `forest` | Natural, earthy | Dark green, brown, gold, moss |
| `monochrome` | Minimal, stark | Black bg, white nodes only |
| `pastel` | Soft, approachable | Light bg, pastel pinks/blues/yellows |
| `neon` | Maximum energy | Black bg, neon rainbow |
| `corporate` | Enterprise-safe | Light gray bg, blue/green/orange |
| `retro` | 80s/90s | CRT scanlines, amber/green phosphor |

### 3. Theme Switching
```tsx
// Static
<Swarming theme="cyberpunk" />

// Dynamic
const [theme, setTheme] = useState('midnight')
<Swarming theme={theme} />
<button onClick={() => setTheme('daylight')}>Light</button>

// Custom
<Swarming theme={{
  ...themes.midnight,
  nodeColors: ['#ff0000', '#00ff00', '#0000ff'],
}} />

// CSS custom properties (for external styling)
<Swarming theme="midnight" className="my-custom-styles" />
```

### 4. Theme Preview Page
`/themes` route showing all themes in a grid:
- Live mini-visualization for each theme
- Click to see full-screen preview
- "Copy config" button for each
- Theme playground: mix and match settings

### 5. Animated Transitions
When switching themes, smoothly interpolate:
- Background color (CSS transition)
- Node colors (shader uniform lerp)
- Bloom parameters (gradual)
- Duration: 500ms ease-out

## Files to Create
```
packages/swarming/src/themes/
├── index.ts           # Theme exports
├── types.ts           # ThemeConfig interface
├── midnight.ts
├── daylight.ts
├── cyberpunk.ts
├── terminal.ts
├── ocean.ts
├── sunset.ts
├── forest.ts
├── monochrome.ts
├── pastel.ts
├── neon.ts
├── corporate.ts
├── retro.ts
└── utils.ts           # Theme interpolation, merging

app/themes/
├── page.tsx           # Theme gallery
└── components/
    ├── ThemeCard.tsx
    └── ThemePlayground.tsx
```
