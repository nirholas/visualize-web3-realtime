'use client';

import { AnimatePresence, m } from 'motion/react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { lambdaClient } from '@/libs/trpc/client/lambda';

import { useStyles } from './style';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date | null, t: (key: string, opts?: Record<string, number>) => string): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return t('x402World.justNow');
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t('x402World.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('x402World.hoursAgo', { count: hrs });
  return t('x402World.daysAgo', { count: Math.floor(hrs / 24) });
}

function formatUsdc(amount: number): string {
  if (amount < 0.01) return '<$0.01';
  if (amount < 1) return `$${amount.toFixed(3)}`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentPayment {
  amountUsdc: number;
  chainId: number;
  createdAt: Date | null;
  displayLabel: string;
  id: string;
  status: string;
  tokenSymbol: string;
}

// ---------------------------------------------------------------------------
// Status dot color mapping
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
};
const DEFAULT_STATUS_COLOR = '#ef4444';

// ---------------------------------------------------------------------------
// Chain name lookup (common EVM chains)
// ---------------------------------------------------------------------------

const CHAIN_NAMES: Record<number, string> = {
  1: 'ETH',
  10: 'OP',
  56: 'BSC',
  137: 'POLY',
  8453: 'BASE',
  42161: 'ARB',
  43114: 'AVAX',
  84532: 'BASE',
};

function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `#${chainId}`;
}

// ---------------------------------------------------------------------------
// Single payment card
// ---------------------------------------------------------------------------

interface PaymentCardProps {
  isNew: boolean;
  payment: RecentPayment;
  t: (key: string, opts?: Record<string, number>) => string;
}

const PaymentCard = memo<PaymentCardProps>(({ payment, isNew, t }) => {
  const { styles } = useStyles();
  const label = payment.displayLabel;
  const statusColor = STATUS_COLORS[payment.status] ?? DEFAULT_STATUS_COLOR;

  return (
    <m.div
      animate={{ opacity: 1, x: 0 }}
      className={styles.feedCard}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      initial={{ opacity: isNew ? 0 : 1, x: isNew ? 12 : 0 }}
      layout
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <span className={styles.statusDot} style={{ background: statusColor }} />
      <span className={styles.feedLabel}>{label}</span>
      <span className={styles.feedChain}>{chainName(payment.chainId)}</span>
      <span className={styles.feedAmount}>{formatUsdc(payment.amountUsdc)}</span>
      <span className={styles.feedTimestamp}>{timeAgo(payment.createdAt, t)}</span>
    </m.div>
  );
});

PaymentCard.displayName = 'PaymentCard';

// ---------------------------------------------------------------------------
// Live Feed container
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 12;

const LiveFeed = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('common');
  const prevKeysRef = useRef<Set<string>>(new Set());
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());

  const { data: payments } = useSWR(
    'x402-recent-payments',
    () => lambdaClient.x402Payments.recentPayments.query({ limit: MAX_VISIBLE }),
    { refreshInterval: 10_000 },
  );

  const visible = payments?.slice(0, MAX_VISIBLE) ?? [];

  useEffect(() => {
    if (!visible.length) return;
    const currentKeys = new Set(visible.map((p) => p.id));
    const incoming = new Set([...currentKeys].filter((k) => !prevKeysRef.current.has(k)));
    if (incoming.size > 0) setNewKeys(incoming);
    prevKeysRef.current = currentKeys;
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedHeader}>
        <span className={styles.statusDotPulse} />
        {t('x402World.live')}
      </div>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((p) => (
          <PaymentCard isNew={newKeys.has(p.id)} key={p.id} payment={p} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
});

LiveFeed.displayName = 'LiveFeed';

export default LiveFeed;
