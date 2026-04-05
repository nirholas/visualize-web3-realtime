# Task 29: Vue, Svelte, and Vanilla JS Adapters

## Goal
Extend swarming beyond React to Vue, Svelte, and vanilla JavaScript. Each framework adapter opens an entirely new audience.

## Context
React is ~40% of the frontend market. Vue is ~20%, Svelte is ~10%, and vanilla/other is ~30%. By being React-only, we're excluding 60% of potential users. The core engine (physics, rendering) is framework-agnostic — only the wrapper layer needs adaptation.

## Requirements

### 1. Core Extraction
Separate the framework-agnostic engine from the React wrapper:
```
@swarming/engine   — Physics + rendering (no React dependency)
@swarming/react    — React wrapper (current)
@swarming/vue      — Vue wrapper (new)
@swarming/svelte   — Svelte wrapper (new)
swarming           — Meta-package that re-exports @swarming/react (for backwards compat)
```

### 2. Vue Adapter
```vue
<template>
  <Swarming :source="wsUrl" :theme="'dark'" @node-click="handleClick" />
</template>

<script setup>
import { Swarming } from '@swarming/vue'

const wsUrl = 'wss://...'
const handleClick = (node) => console.log(node)
</script>
```

- Vue 3 Composition API
- Reactive props (changing `source` reconnects)
- Emits for events (`@node-click`, `@ready`)
- TypeScript support
- SSR-safe (Nuxt compatible)

### 3. Svelte Adapter
```svelte
<script>
  import { Swarming } from '@swarming/svelte'
  
  let source = 'wss://...'
</script>

<Swarming {source} theme="dark" on:nodeClick={handleClick} />
```

- Svelte 4 + Svelte 5 (runes) support
- Reactive bindings
- SvelteKit SSR-safe

### 4. Vanilla JS (already in Task 06, but formalize)
```js
import { createSwarming } from '@swarming/engine'

const viz = createSwarming(document.getElementById('container'), {
  source: 'wss://...',
  theme: 'dark',
})
```

### 5. Framework Adapter Pattern
Each adapter is thin (~100-200 lines) and wraps the engine:
```ts
// Pseudocode for any framework adapter
function createFrameworkWrapper() {
  // 1. Mount: create engine instance, attach to DOM element
  // 2. Props change: call engine.setConfig(newProps)
  // 3. Events: subscribe to engine events, emit framework events
  // 4. Unmount: call engine.destroy()
}
```

### 6. Documentation
Each adapter gets its own docs section:
- `/docs/react` — React guide (current)
- `/docs/vue` — Vue guide
- `/docs/svelte` — Svelte guide
- `/docs/vanilla` — Vanilla JS guide
- Each with framework-specific code examples and CodeSandbox links

### 7. Testing
- Each adapter has smoke tests (mount, render, events, unmount)
- Use framework-specific testing tools (vue-test-utils, svelte-testing-library)

## Files to Create
```
packages/engine/              # Framework-agnostic core
├── src/
│   ├── index.ts
│   ├── SwarmingEngine.ts    # Main engine class
│   ├── physics/
│   ├── renderers/
│   └── types.ts
└── package.json

packages/react/               # React wrapper
├── src/
│   ├── index.ts
│   └── Swarming.tsx
└── package.json

packages/vue/                 # Vue wrapper
├── src/
│   ├── index.ts
│   └── Swarming.vue
└── package.json

packages/svelte/              # Svelte wrapper
├── src/
│   ├── index.ts
│   └── Swarming.svelte
└── package.json
```
