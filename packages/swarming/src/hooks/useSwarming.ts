// ---------------------------------------------------------------------------
// useSwarming — Convenience hook for accessing collaboration state
//
// Returns collaboration state (peers, cursors, shareUrl, etc.) when used
// inside a <Swarming collaboration={...} /> component tree.
// ---------------------------------------------------------------------------

import { useCollaboration } from '../collaboration/CollaborationProvider';
import type { CollaborationState } from '../collaboration/types';

/**
 * Access the collaboration state from within a `<Swarming />` component tree.
 *
 * Returns `null` when collaboration is not configured.
 *
 * @example
 * ```tsx
 * function ShareButton() {
 *   const collab = useSwarming();
 *   if (!collab) return null;
 *   return <button onClick={() => navigator.clipboard.writeText(collab.shareUrl!)}>Share</button>;
 * }
 * ```
 */
export function useSwarming(): CollaborationState | null {
  return useCollaboration();
}
