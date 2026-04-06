import type { X402Session, X402PaymentProof, X402Tier } from '@web3viz/core';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// In-memory session store — bounded to prevent memory exhaustion
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 10_000;
const sessions = new Map<string, X402Session>();

/** Evict expired sessions to reclaim space. */
function evictExpired(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}

/** Create a new session from a verified payment proof. */
export function createSession(proof: X402PaymentProof, tier: X402Tier, windowMs: number): X402Session {
  if (sessions.size >= MAX_SESSIONS) evictExpired();
  // If still at capacity after eviction, remove the oldest entry
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest) sessions.delete(oldest);
  }

  const now = Date.now();
  const session: X402Session = {
    sessionId: randomUUID(),
    address: proof.from,
    tier,
    createdAt: now,
    expiresAt: windowMs > 0 ? now + windowMs : now + 3_600_000, // default 1h for free
    proof,
    requestCount: 0,
  };

  sessions.set(session.sessionId, session);
  return session;
}

/** Look up a session by ID, returning undefined if expired or missing. */
export function getSession(sessionId: string): X402Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return undefined;
  }
  return session;
}

/** Increment the request counter for a session. */
export function recordRequest(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) session.requestCount++;
}

/** Create a free-tier session by IP (no proof needed). */
export function getOrCreateFreeSession(ip: string): X402Session {
  // Reuse existing free session for this IP if still valid
  for (const s of sessions.values()) {
    if (s.tier === 'free' && s.address === ip && Date.now() < s.expiresAt) {
      return s;
    }
  }

  const dummyProof: X402PaymentProof = {
    txHash: '0x0',
    network: 'base-sepolia',
    asset: 'USDC',
    amount: '0',
    from: ip,
    to: '0x0',
    resource: '',
    paidAt: Date.now(),
    signature: '',
  };

  return createSession(dummyProof, 'free', 3_600_000);
}
