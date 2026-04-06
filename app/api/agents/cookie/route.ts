import { NextRequest, NextResponse } from 'next/server';

const COOKIE_FUN_BASE = 'https://api.cookie.fun/v2/agents/agentsPaged';
const ALLOWED_PARAMS = new Set(['interval', 'page', 'pageSize']);

export async function GET(req: NextRequest) {
  const params = new URLSearchParams();
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) {
      params.set(key, value);
    }
  }

  const url = `${COOKIE_FUN_BASE}?${params.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Upstream API error' },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch agent data' }, { status: 502 });
  }
}
