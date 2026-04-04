/**
 * Runtime validation helpers for external data.
 * These are intentionally lightweight (no full schema library) to keep
 * bundle size small while catching the most dangerous runtime errors.
 */

/** Check that a value is a non-null object. */
export function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Safely parse JSON, returning null on failure instead of throwing. */
export function safeJsonParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/** Extract a string field, returning fallback if missing or wrong type. */
export function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
}

/** Extract a number field, returning fallback if missing, NaN, or wrong type. */
export function getNumber(obj: Record<string, unknown>, key: string, fallback = 0): number {
  const v = obj[key];
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Extract a boolean field. */
export function getBoolean(obj: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = obj[key];
  return typeof v === 'boolean' ? v : fallback;
}

/** Validate an Ethereum-style hex address (0x + 40 hex chars). */
export function isValidEthAddress(v: unknown): v is string {
  return typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v);
}

/** Validate a Solana-style base58 address (32-44 alphanumeric chars). */
export function isValidSolAddress(v: unknown): v is string {
  return typeof v === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
}

/** Validate that a hex string looks like a proper hex (0x prefix, even length). */
export function isValidHexData(v: unknown): v is string {
  return typeof v === 'string' && /^0x[0-9a-fA-F]*$/.test(v) && v.length % 2 === 0;
}

/**
 * Validate an Ethereum log object has the minimum expected structure.
 */
export function isValidEthLog(v: unknown): v is {
  address: string;
  topics: string[];
  data: string;
  transactionHash: string;
  logIndex: string;
  blockNumber: string;
} {
  if (!isObject(v)) return false;
  if (typeof v.address !== 'string') return false;
  if (!Array.isArray(v.topics) || v.topics.length === 0) return false;
  if (typeof v.data !== 'string') return false;
  if (typeof v.transactionHash !== 'string') return false;
  return true;
}

/**
 * Validate a numeric string parses to a finite positive number.
 */
export function parseFiniteFloat(v: string): number | null {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
