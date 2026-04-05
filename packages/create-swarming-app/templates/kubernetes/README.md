# Kubernetes Swarm Visualization

Visualize your Kubernetes cluster as a real-time force-directed graph. Pods are rendered as nodes, colored by status, and grouped by namespace. Pods that share the same deployment or ReplicaSet are connected by edges.

## Prerequisites

- [kubectl](https://kubernetes.io/docs/tasks/tools/) configured with access to a cluster
- Node.js 18+

## Setup

### 1. Start kubectl proxy

The visualization reads pod data from the Kubernetes API server through `kubectl proxy`. Open a terminal and run:

```bash
kubectl proxy --port=8001
```

This opens an unauthenticated HTTP proxy to your cluster's API on `localhost:8001`. The Vite dev server is configured to forward `/api` requests to this proxy.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open the URL printed in the terminal (default: `http://localhost:5173`).

## Demo mode

If `kubectl proxy` is not running or the API is unreachable, the app automatically falls back to **demo mode** with realistic fake cluster data across four namespaces (`default`, `kube-system`, `monitoring`, `app`).

## Project structure

```
src/
  main.tsx         — Entry point
  App.tsx          — Root component with namespace filter and SwarmGraph
  K8sProvider.ts   — React hook that polls the K8s API and maps pods to graph data
  pod-colors.ts    — Status color map and namespace color hashing
```

## Customization

- **Poll interval** — Change the default 5-second interval by passing a value to `useK8sPods(ms)` in `App.tsx`.
- **Node sizing** — Adjust the `value` field in `K8sProvider.ts` to size pods by resource usage.
- **Additional resources** — Extend `K8sProvider.ts` to fetch Services, Deployments, or Ingresses and add them as nodes.

## Production build

```bash
npm run build
npm run preview
```

The production build outputs static files to `dist/`. Note that the kubectl proxy must still be accessible for live data; without it the app will use demo data.
