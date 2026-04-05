# {{PACKAGE_NAME}}

A swarming visualization project built with [Vite](https://vitejs.dev/), React, and `@swarming-vis/react-graph`.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
src/
  main.tsx    — Application entry point
  App.tsx     — Root component with SwarmGraph visualization
  data.json   — Sample dataset (50 nodes, 60 edges)
```

## Customization

Edit `src/data.json` to supply your own nodes and edges. Each node needs an `id`, `label`, `group`, and `value`. Each edge needs a `source`, `target`, and `value`.
