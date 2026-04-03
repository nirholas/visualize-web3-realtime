# Root `package.json` Configuration

**File Path:** `/workspaces/visualize-web3-realtime/package.json`

**Purpose:** Defines the root-level npm package manifest for the `visualize-web3-realtime` monorepo. This file declares the project identity, npm workspace topology, development and production dependencies, and all runnable scripts for the entire repository.

---

## Line-by-Line Documentation

### Package Identity (Lines 1-4)

```json
{
  "name": "visualize-web3-realtime",
  "version": "0.1.0",
  "private": true,
```

| Property | Value | Description |
|----------|-------|-------------|
| `name` | `"visualize-web3-realtime"` | The unique identifier for this package. Used internally by npm for dependency resolution and workspace linking. This is the monorepo root package name. |
| `version` | `"0.1.0"` | Semantic version of the root package. `0.1.0` indicates an initial development release (pre-1.0 stability). Follows [SemVer](https://semver.org/) conventions. |
| `private` | `true` | Prevents accidental publication to the npm registry. This is critical for monorepo roots, which should never be published as standalone packages. If omitted or `false`, running `npm publish` could leak the entire workspace to the public registry. |

### Package Manager (Line 5)

```json
"packageManager": "npm@10.8.2",
```

| Property | Value | Description |
|----------|-------|-------------|
| `packageManager` | `"npm@10.8.2"` | Declares the exact package manager and version that this project requires. Enables [Corepack](https://nodejs.org/api/corepack.html) to automatically install and enforce the correct npm version. If a developer uses a different version, Corepack will warn or block the operation, ensuring consistent lockfile generation and dependency resolution across all contributors. |

### Workspaces (Lines 6-9)

```json
"workspaces": [
  "packages/*",
  "apps/*"
],
```

| Pattern | Resolved Packages | Description |
|---------|-------------------|-------------|
| `"packages/*"` | All directories under `packages/` (e.g., `packages/core`, `packages/providers`, `packages/react-graph`, `packages/ui`, `packages/utils`, `packages/tailwind-config`, `packages/tsconfig`, `packages/executor`) | Shared libraries and configuration packages consumed by apps and other packages. Each subdirectory must contain its own `package.json`. |
| `"apps/*"` | All directories under `apps/` (e.g., `apps/playground`) | Standalone deployable applications. Each subdirectory must contain its own `package.json`. |

**How Workspaces Work:**
- npm hoists shared dependencies to the root `node_modules/` directory to reduce duplication.
- Cross-workspace dependencies using `"*"` as the version (e.g., `"@web3viz/core": "*"`) resolve to the local workspace package via symlinks.
- Running `npm install` at the root installs dependencies for all workspaces.

### Scripts (Lines 10-19)

```json
"scripts": {
  "dev": "next dev -p 3100",
  "dev:playground": "turbo run dev --filter=@web3viz/playground",
  "dev:executor": "turbo run dev --filter=@web3viz/executor",
  "build": "next build",
  "build:web": "next build",
  "start": "next start -p 3100",
  "lint": "next lint",
  "typecheck": "turbo run typecheck"
},
```

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3100` | Starts the root-level Next.js development server on port 3100. Provides hot module replacement (HMR) for rapid iteration. This runs the main web application at `http://localhost:3100`. |
| `dev:playground` | `turbo run dev --filter=@web3viz/playground` | Starts only the playground app and its dependencies using Turborepo's `--filter` flag. Turborepo automatically starts any upstream packages the playground depends on. Runs on port 3200 (as defined in the playground's own `package.json`). |
| `dev:executor` | `turbo run dev --filter=@web3viz/executor` | Starts only the executor app and its dependencies using Turborepo's `--filter` flag. Isolates the executor service for independent development. |
| `build` | `next build` | Produces an optimized production build of the root-level Next.js application. Outputs to the `.next/` directory. Includes static generation, code splitting, and minification. |
| `build:web` | `next build` | Alias for `build`. Provides semantic clarity when used in CI/CD pipelines that may build multiple targets (e.g., web, executor). |
| `start` | `next start -p 3100` | Starts the production Next.js server on port 3100, serving the output of `npm run build`. Requires a prior build step. |
| `lint` | `next lint` | Runs ESLint via Next.js's built-in linting integration. Checks code quality and style violations across the root application's source files. |
| `typecheck` | `turbo run typecheck` | Runs TypeScript type checking across all workspaces using Turborepo. Turborepo parallelizes the type checking and caches results. Each workspace defines its own `typecheck` script (typically `tsc --noEmit`). |

### Production Dependencies (Lines 20-30)

```json
"dependencies": {
  "@react-three/drei": "^9.122.0",
  "@react-three/fiber": "^8.18.0",
  "d3-force": "^3.0.0",
  "framer-motion": "^11.0.0",
  "html2canvas": "^1.4.1",
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "three": "^0.169.0"
},
```

| Dependency | Version Range | Purpose |
|------------|---------------|---------|
| `@react-three/drei` | `^9.122.0` | Collection of useful helpers and abstractions for `@react-three/fiber`. Provides pre-built 3D components such as cameras, controls, loaders, shaders, and post-processing effects. Used for the 3D graph visualization. |
| `@react-three/fiber` | `^8.18.0` | React renderer for Three.js. Bridges React's declarative component model with Three.js's imperative 3D API, enabling 3D scenes to be built with JSX. Core rendering engine for the graph visualization. |
| `d3-force` | `^3.0.0` | Force-directed graph simulation from D3.js. Provides physics-based layout algorithms (charge, collision, links, centering) that position nodes in the graph visualization. Operates independently of D3's DOM manipulation. |
| `framer-motion` | `^11.0.0` | Production-ready animation library for React. Provides declarative animations, layout transitions, gesture handling, and spring physics. Used for UI transitions and interactive elements. |
| `html2canvas` | `^1.4.1` | Renders HTML elements to a `<canvas>` element by reading the DOM and computed styles. Enables screenshot/export functionality of the visualization for sharing or saving. |
| `next` | `^14.2.0` | React meta-framework providing server-side rendering (SSR), static site generation (SSG), API routes, file-based routing, image optimization, and build tooling. The application's runtime framework. Version 14.2+ includes the stable App Router. |
| `react` | `^18.3.0` | Core React library for building user interfaces with a component-based architecture. Version 18.3 includes concurrent rendering features, automatic batching, and transitions. |
| `react-dom` | `^18.3.0` | React's DOM-specific rendering methods. Provides `createRoot()` for client-side rendering and `hydrateRoot()` for server-side rendering hydration. Must match the `react` version. |
| `three` | `^0.169.0` | Low-level 3D graphics library built on WebGL. Provides the scene graph, geometries, materials, lights, cameras, and rendering pipeline that `@react-three/fiber` wraps. Version must be compatible with the installed `@react-three/fiber`. |

### Development Dependencies (Lines 31-42)

```json
"devDependencies": {
  "@types/d3-force": "^3.0.10",
  "@types/node": "^20.14.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "@types/three": "^0.169.0",
  "autoprefixer": "^10.4.0",
  "postcss": "^8.4.0",
  "tailwindcss": "^3.4.0",
  "turbo": "^2.0.0",
  "typescript": "^5.5.0"
}
```

| Dependency | Version Range | Purpose |
|------------|---------------|---------|
| `@types/d3-force` | `^3.0.10` | TypeScript type definitions for the `d3-force` library. Provides type safety for simulation, force, and node/link interfaces. |
| `@types/node` | `^20.14.0` | TypeScript type definitions for Node.js built-in modules (`fs`, `path`, `process`, etc.). Required for server-side code and build tooling. |
| `@types/react` | `^18.3.0` | TypeScript type definitions for React. Provides types for hooks, components, events, and JSX intrinsic elements. Must match the installed `react` major version. |
| `@types/react-dom` | `^18.3.0` | TypeScript type definitions for ReactDOM. Provides types for DOM-specific rendering APIs. Must match the installed `react-dom` major version. |
| `@types/three` | `^0.169.0` | TypeScript type definitions for Three.js. Provides types for all Three.js classes, interfaces, and constants. Must match the installed `three` version. |
| `autoprefixer` | `^10.4.0` | PostCSS plugin that automatically adds vendor prefixes (e.g., `-webkit-`, `-moz-`) to CSS rules based on browser compatibility data from [Can I Use](https://caniuse.com/). Ensures cross-browser CSS compatibility. |
| `postcss` | `^8.4.0` | CSS transformation framework. Serves as the plugin runner for Tailwind CSS and Autoprefixer. Processes CSS through a pipeline of plugins during the build step. |
| `tailwindcss` | `^3.4.0` | Utility-first CSS framework. Scans source files for class usage and generates only the CSS utilities that are actually used, resulting in minimal production CSS bundles. Version 3.4 includes improved performance and new utility classes. |
| `turbo` | `^2.0.0` | Turborepo monorepo build orchestrator. Provides intelligent caching, parallel task execution, and dependency-aware task ordering. Version 2.0 includes improved caching and the new `tasks` configuration schema. |
| `typescript` | `^5.5.0` | TypeScript compiler and language service. Provides static type checking, IDE support, and transpilation. Version 5.5 includes inferred type predicates and other language improvements. |

---

## Build Pipeline Integration

This `package.json` is the entry point for all CI/CD operations:

1. **Install:** `npm install` installs all workspace dependencies and creates symlinks.
2. **Type Check:** `npm run typecheck` validates types across all workspaces via Turborepo.
3. **Lint:** `npm run lint` checks code style on the root application.
4. **Build:** `npm run build` produces the production Next.js bundle.
5. **Start:** `npm run start` serves the production build.

## Dependency Graph

The root package depends on workspace packages via the `workspaces` field. Internal packages (under `packages/`) are consumed by both the root app and the playground app (under `apps/`).
