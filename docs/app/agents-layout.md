# app/agents/layout.tsx

## File Path

`/workspaces/visualize-web3-realtime/app/agents/layout.tsx`

## Purpose

Layout component for the `/agents` route segment. Provides route-specific metadata (title and description) for the Agent World visualization page. The layout itself is a transparent pass-through that renders children without adding any wrapper DOM.

## Module Dependencies

None. This file uses only React's built-in `React.ReactNode` type (available globally in the Next.js environment).

## Line-by-Line Documentation

### Lines 1-4 -- Metadata Export

```ts
export const metadata = {
  title: 'Agent World -- Visualize AI Agents in Real-Time',
  description: 'Watch autonomous AI agents complete tasks, call tools, and coordinate in real-time.',
};
```

Named export consumed by Next.js to set route-specific `<title>` and `<meta name="description">` tags. These override the root layout metadata when the `/agents` route is active.

| Property | Value | Purpose |
|----------|-------|---------|
| `title` | `'Agent World -- Visualize AI Agents in Real-Time'` | Browser tab title for the agents page. |
| `description` | `'Watch autonomous AI agents complete tasks, call tools, and coordinate in real-time.'` | SEO meta description. |

### Lines 6-12 -- AgentLayout Component

```ts
export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

A pass-through layout that wraps children in a React Fragment (`<>...</>`). This adds no extra DOM elements -- it exists solely to attach the `metadata` export to the `/agents` route segment.

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `metadata` | Named constant (`object`) | Route-level metadata for SEO. |
| `AgentLayout` | Default function component | Pass-through layout for the agents route. |

## Component Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `React.ReactNode` | The matched page component (`app/agents/page.tsx`). |

## State Management

None. This is a server component with no client-side state.

## Side Effects

- The `metadata` export causes Next.js to update `<title>` and `<meta>` tags when this route segment is active.

## Usage Examples

Next.js automatically nests this layout between the root layout and the agents page:

```
app/layout.tsx          (RootLayout)
  app/agents/layout.tsx (AgentLayout)  <-- this file
    app/agents/page.tsx (AgentsPage)
```
