/**
 * Dynamic OG Image — /api/og/world
 *
 * Generates a 1200×630 Open Graph share card for the /world ecosystem page.
 * Shows headline x402 stats: total volume, agents, and payments.
 */
import { count, countDistinct, sum } from 'drizzle-orm';
import { ImageResponse } from 'next/og';

import { getServerDB } from '@/database/core/db-adaptor';
import { x402Payments } from '@/database/schemas';

// ─── Config ────────────────────────────────────────────────────────────

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

const INTER_FONT_URL =
  'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2';

const ACCENT = '#22c55e';
const ACCENT_GLOW = 'rgba(34,197,94,0.2)';

// ─── Types ─────────────────────────────────────────────────────────────

type FontConfig = { data: ArrayBuffer; name: string; style: 'normal'; weight: 700 };

interface EcosystemStats {
  totalAgents: number;
  totalTxs: number;
  totalVolume: number;
}

// ─── Data fetcher ──────────────────────────────────────────────────────

async function fetchStats(): Promise<EcosystemStats> {
  try {
    const db = await getServerDB();

    const [[agentsResult], [volumeResult], [txResult]] = await Promise.all([
      db.select({ value: countDistinct(x402Payments.userId) }).from(x402Payments),
      db.select({ value: sum(x402Payments.amountUsdc) }).from(x402Payments),
      db.select({ value: count() }).from(x402Payments),
    ]);

    return {
      totalAgents: agentsResult?.value ?? 0,
      totalTxs: txResult?.value ?? 0,
      totalVolume: Number(volumeResult?.value ?? 0),
    };
  } catch {
    return { totalAgents: 0, totalTxs: 0, totalVolume: 0 };
  }
}

// ─── Formatters ────────────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  if (v > 0) return `$${v.toFixed(2)}`;
  return '$0';
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Stat box ──────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        alignItems: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        gap: 8,
        padding: '28px 24px',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 16,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Image renderer ────────────────────────────────────────────────────

function renderWorldImage(stats: EcosystemStats, fonts: FontConfig[]) {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0c16 0%, #0d1117 40%, #070a10 100%)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
        height: '100%',
        padding: '52px 64px 48px',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 30%, ${ACCENT_GLOW} 0%, transparent 70%)`,
          display: 'flex',
          height: '100%',
          left: 0,
          position: 'absolute',
          top: 0,
          width: '100%',
        }}
      />

      {/* Header */}
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          position: 'relative',
          width: '100%',
          zIndex: 1,
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: 14 }}>
          <div
            style={{
              alignItems: 'center',
              background: 'rgba(34,197,94,0.15)',
              border: '2px solid rgba(34,197,94,0.4)',
              borderRadius: '50%',
              display: 'flex',
              height: 48,
              justifyContent: 'center',
              width: 48,
            }}
          >
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>S</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: 700 }}>
            SperaxOS
          </span>
        </div>
        <div
          style={{
            alignItems: 'center',
            background: `${ACCENT}18`,
            border: `1.5px solid ${ACCENT}45`,
            borderRadius: 30,
            color: ACCENT,
            display: 'flex',
            fontSize: 16,
            fontWeight: 700,
            gap: 8,
            letterSpacing: 1,
            padding: '6px 20px',
          }}
        >
          x402 WORLD
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginTop: 36,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          x402 Payment Ecosystem
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 20 }}>
          Real-time agent-to-agent micropayments powered by HTTP 402
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: 20,
          justifyContent: 'center',
          marginTop: 40,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <StatBox label="Volume" value={formatVolume(stats.totalVolume)} />
        <StatBox label="Agents" value={formatCount(stats.totalAgents)} />
        <StatBox label="Payments" value={formatCount(stats.totalTxs)} />
      </div>

      {/* Footer */}
      <div
        style={{
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: 16,
          position: 'relative',
          width: '100%',
          zIndex: 1,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          chat.sperax.io/world
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontStyle: 'italic' }}>
          Explore the network live
        </span>
      </div>
    </div>,
    { fonts, height: HEIGHT, width: WIDTH },
  );
}

// ─── Route handler ─────────────────────────────────────────────────────

export async function GET() {
  let interFontData: ArrayBuffer = new ArrayBuffer(0);
  try {
    const fontRes = await fetch(INTER_FONT_URL);
    if (fontRes.ok) interFontData = await fontRes.arrayBuffer();
  } catch {
    // Continue without custom font
  }

  const fonts: FontConfig[] =
    interFontData.byteLength > 0
      ? [{ data: interFontData, name: 'Inter', style: 'normal', weight: 700 }]
      : [];

  const stats = await fetchStats();

  const response = renderWorldImage(stats, fonts);

  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  response.headers.set('Content-Type', 'image/png');

  return response;
}
