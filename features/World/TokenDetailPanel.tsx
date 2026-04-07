'use client';

import { memo } from 'react';
import type { TopToken } from '@web3viz/core';
import { useDarkMode } from './DarkModeContext';
import { formatStat } from './utils/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUsd(value: number | undefined): string {
  if (!value) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatSupply(value: number | undefined): string {
  if (!value) return '—';
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

function timeAgoFromTimestamp(ts: number | undefined): string {
  if (!ts) return '—';
  const msTs = ts < 1e12 ? ts * 1000 : ts;
  const diff = Date.now() - msTs;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const FONT = "'IBM Plex Mono', monospace";

const Row = memo<{ label: string; value: string; color?: string; href?: string; isDark: boolean }>(
  ({ label, value, color, href, isDark }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: color || (isDark ? '#818cf8' : '#4f46e5'), fontFamily: FONT, textDecoration: 'none' }}
        >
          {value}
        </a>
      ) : (
        <span style={{ fontSize: 12, color: color || (isDark ? '#e2e8f0' : '#1a1a1a'), fontFamily: FONT, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      )}
    </div>
  ),
);
Row.displayName = 'Row';

const BondingCurveBar = memo<{ progress: number; graduated: boolean; isDark: boolean }>(
  ({ progress, graduated, isDark }) => {
    const pct = Math.round(progress * 100);
    const barColor = graduated ? '#22c55e' : '#818cf8';
    return (
      <div style={{ padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
            Bonding Curve
          </span>
          <span style={{ fontSize: 11, color: graduated ? '#22c55e' : (isDark ? '#e2e8f0' : '#1a1a1a'), fontFamily: FONT, fontWeight: 600 }}>
            {graduated ? '🎓 Graduated' : `${pct}%`}
          </span>
        </div>
        <div style={{
          height: 6,
          borderRadius: 3,
          background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>
    );
  },
);
BondingCurveBar.displayName = 'BondingCurveBar';

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export interface TokenDetailPanelProps {
  token: TopToken | null;
}

export const TokenDetailPanel = memo<TokenDetailPanelProps>(({ token }) => {
  const isDark = useDarkMode();

  if (!token) {
    return (
      <div style={{ padding: 20, fontFamily: FONT, fontSize: 12, color: isDark ? '#64748b' : '#999', textAlign: 'center' }}>
        Click a token node to view details
      </div>
    );
  }

  const solscanUrl = `https://solscan.io/token/${token.tokenAddress}`;
  const pumpfunUrl = `https://pump.fun/coin/${token.tokenAddress}`;

  return (
    <div style={{
      padding: '12px 16px',
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflow: 'auto',
      maxHeight: '100%',
    }}>
      {/* Header: image + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        {token.imageUrl && (
          <img
            src={token.imageUrl}
            alt={token.symbol}
            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1a1a1a' }}>
              {token.symbol}
            </span>
            {token.nsfw && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#ef444433', color: '#ef4444', fontWeight: 600 }}>
                NSFW
              </span>
            )}
            {token.graduated && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#22c55e33', color: '#22c55e', fontWeight: 600 }}>
                GRADUATED
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {token.name}
          </div>
        </div>
      </div>

      {/* Description */}
      {token.description && (
        <div style={{
          fontSize: 11,
          lineHeight: 1.5,
          color: isDark ? '#94a3b8' : '#555',
          padding: '6px 8px',
          background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
          borderRadius: 6,
          border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f0f0f0',
          maxHeight: 80,
          overflow: 'auto',
        }}>
          {token.description}
        </div>
      )}

      {/* Bonding Curve */}
      {token.bondingCurveProgress !== undefined && (
        <BondingCurveBar progress={token.bondingCurveProgress} graduated={!!token.graduated} isDark={isDark} />
      )}

      {/* Divider */}
      <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#eee', margin: '2px 0' }} />

      {/* Market Data */}
      <Row label="USD Market Cap" value={formatUsd(token.usdMarketCap)} isDark={isDark} />
      <Row label="Volume (SOL)" value={token.volumeSol != null ? `${token.volumeSol.toFixed(2)} SOL` : '—'} isDark={isDark} />
      <Row label="Trades" value={formatStat(token.trades)} isDark={isDark} />
      {token.totalSupply != null && (
        <Row label="Total Supply" value={formatSupply(token.totalSupply)} isDark={isDark} />
      )}

      {/* Divider */}
      <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#eee', margin: '2px 0' }} />

      {/* Token Info */}
      <Row label="Mint" value={truncateAddress(token.tokenAddress)} href={solscanUrl} isDark={isDark} />
      {token.creator && (
        <Row label="Creator" value={truncateAddress(token.creator)} href={`https://solscan.io/account/${token.creator}`} isDark={isDark} />
      )}
      {token.createdTimestamp != null && token.createdTimestamp > 0 && (
        <Row label="Created" value={timeAgoFromTimestamp(token.createdTimestamp)} isDark={isDark} />
      )}
      {token.replyCount != null && token.replyCount > 0 && (
        <Row label="Replies" value={String(token.replyCount)} isDark={isDark} />
      )}
      {token.kingOfTheHillTimestamp != null && token.kingOfTheHillTimestamp > 0 && (
        <Row label="KOTH" value={timeAgoFromTimestamp(token.kingOfTheHillTimestamp)} isDark={isDark} color="#fbbf24" />
      )}
      {token.raydiumPool && (
        <Row label="Raydium Pool" value={truncateAddress(token.raydiumPool)} href={`https://solscan.io/account/${token.raydiumPool}`} isDark={isDark} />
      )}

      {/* Social Links */}
      {(token.twitter || token.telegram || token.website) && (
        <>
          <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#eee', margin: '2px 0' }} />
          {token.twitter && (
            <Row label="Twitter" value={`@${token.twitter}`} href={`https://x.com/${token.twitter}`} isDark={isDark} />
          )}
          {token.telegram && (
            <Row label="Telegram" value={token.telegram} href={`https://t.me/${token.telegram}`} isDark={isDark} />
          )}
          {token.website && (
            <Row label="Website" value={new URL(token.website).hostname} href={token.website} isDark={isDark} />
          )}
        </>
      )}

      {/* External Links */}
      <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#eee', margin: '2px 0' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <a
          href={pumpfunUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: FONT,
            textAlign: 'center',
            color: isDark ? '#e2e8f0' : '#1a1a1a',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
            borderRadius: 6,
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          pump.fun
        </a>
        <a
          href={solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: '6px 0',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: FONT,
            textAlign: 'center',
            color: isDark ? '#e2e8f0' : '#1a1a1a',
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
            borderRadius: 6,
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Solscan
        </a>
      </div>
    </div>
  );
});

TokenDetailPanel.displayName = 'TokenDetailPanel';
export default TokenDetailPanel;
