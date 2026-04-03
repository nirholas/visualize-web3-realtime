# app/page.tsx

## File Path

`/workspaces/visualize-web3-realtime/app/page.tsx`

## Purpose

Root page component that serves as an automatic redirect. When users navigate to the application root (`/`), they are immediately redirected to the `/world` route. This file contains no visual UI.

## Module Dependencies

| Import | Source | Description |
|--------|--------|-------------|
| `redirect` | `next/navigation` | Next.js server-side redirect function. Throws internally to trigger a 307 redirect response. |

## Line-by-Line Documentation

### Line 1 -- Import

```ts
import { redirect } from "next/navigation";
```

Imports the `redirect` function from Next.js navigation utilities. This function performs a server-side redirect and never returns (it throws a special Next.js internal error to halt rendering).

### Line 2 -- Home Component

```ts
export default function Home() { redirect("/world"); }
```

Defines and exports the default page component. The function body consists of a single call to `redirect("/world")`, which immediately sends the user to the `/world` route. No JSX is returned because `redirect()` throws before reaching a return statement.

## Exported Members

| Export | Kind | Description |
|--------|------|-------------|
| `Home` | Default function component | Root page that redirects to `/world`. |

## Component Props

None. This component accepts no props.

## State Management

None. This is a server component with no state.

## Side Effects

- Triggers a server-side HTTP redirect (307 Temporary Redirect) to `/world`.

## Usage Examples

This component is automatically rendered by Next.js when a user visits the root URL (`/`). No manual usage is required.

```
GET / --> 307 Redirect --> /world
```
