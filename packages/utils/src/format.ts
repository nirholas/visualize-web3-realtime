/**
 * Format a number with compact suffixes (K, M, B).
 */
export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(decimals)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return String(Math.round(n));
}

/**
 * Format SOL amount with appropriate precision.
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1000) return `${formatNumber(sol)} SOL`;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  return `${sol.toFixed(4)} SOL`;
}

/**
 * Truncate a Solana address for display.
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Simple debounce utility for event handlers.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
