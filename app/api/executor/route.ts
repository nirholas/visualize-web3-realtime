import { NextRequest, NextResponse } from 'next/server';

/**
 * Executor proxy API route.
 *
 * Forwards REST requests to the executor backend.
 * The executor WebSocket is connected directly by the frontend.
 */

const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:8765';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') ?? '/api/status';

  try {
    const res = await fetch(`${EXECUTOR_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Executor unreachable', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') ?? '/api/tasks';

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
  } catch (err) {
    return NextResponse.json(
      { error: 'Executor unreachable', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 503 },
    );
  }
}
