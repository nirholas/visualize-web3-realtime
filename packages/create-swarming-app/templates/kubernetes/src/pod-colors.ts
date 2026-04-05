export const POD_STATUS_COLORS: Record<string, string> = {
  Running: "#10b981",
  Pending: "#f59e0b",
  Succeeded: "#6366f1",
  Failed: "#ef4444",
  Unknown: "#6b7280",
};

const NAMESPACE_PALETTE = [
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
  "#3b82f6", // blue
  "#ef4444", // red
];

/**
 * Deterministically maps a namespace string to a color from the palette
 * by computing a simple hash of the string.
 */
export function getNamespaceColor(namespace: string): string {
  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % NAMESPACE_PALETTE.length;
  return NAMESPACE_PALETTE[index];
}
