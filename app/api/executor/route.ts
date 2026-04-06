import { NextRequest, NextResponse } from 'next/server';

/**
 * Executor proxy API route.
 *
 * Forwards REST requests to the executor backend.
 * The executor WebSocket is connected directly by the frontend.
 */

const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:8765';

// ---------------------------------------------------------------------------
// Path allowlist — only these prefixes may be proxied to the executor
// ---------------------------------------------------------------------------
const ALLOWED_PATH_PREFIXES = ['/api/status', '/api/tasks', '/api/agents'];

function isAllowedPath(path: string): boolean {
  // Reject anything with protocol schemes, double slashes, or path traversal
  if (/[:@]|\/\/|\.\./.test(path)) return false;
  return ALLOWED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

// ---------------------------------------------------------------------------
// Simple per-IP rate limiter — 30 requests / 60 s window, max 10 000 IPs
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const MAX_TRACKED_IPS = 10_000;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    // Evict expired entries periodically to bound memory
    if (ipHits.size >= MAX_TRACKED_IPS) {
      for (const [k, v] of ipHits) {
        if (now > v.resetAt) ipHits.delete(k);
      }
    }
    // If still at capacity after eviction, reject to prevent memory abuse
    if (ipHits.size >= MAX_TRACKED_IPS) return true;
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

function getClientIp(request: NextRequest): string {
  // In production behind a trusted proxy, x-forwarded-for is set by the infra.
  // We take the first (leftmost) IP which is the original client.
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') ?? '/api/status';

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const res = await fetch(`${EXECUTOR_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Executor unreachable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') ?? '/api/tasks';

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${EXECUTOR_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Executor unreachable' }, { status: 503 });
  }
}
