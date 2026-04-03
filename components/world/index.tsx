'use client';

import { Flexbox } from '@lobehub/ui';
import { Button, Spin } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { zeroAddress } from 'viem';
import useSWR from 'swr';

import dynamic from '@/libs/next/dynamic';
import type { X402FlowTrace } from '@/libs/x402/middleware';
import { lambdaClient } from '@/libs/trpc/client/lambda';

import LiveFeed from './LiveFeed';
import { useStyles } from './style';

const LoadingPlaceholder = () => {
  const { styles } = useStyles();
  return <div className={styles.loadingPlaceholder} />;
};

const X402Network = dynamic(() => import('@/features/X402Flow/X402Network'), {
  loading: () => <LoadingPlaceholder />,
  ssr: false,
});

const X402Snapshot = dynamic(() => import('@/features/X402Flow/X402Snapshot'), {
  ssr: false,
});

type Period = '24h' | '7d' | '15d' | '30d' | 'all';

/**
 * Build a synthetic X402FlowTrace from ecosystem stats so the timeline
 * scrubber and stats HUD have something to display.
 */
const buildSyntheticFlow = (
  stats: {
    topEndpoints: { count: number; displayLabel: string; volume: number }[];
    totalAgents: number;
    totalTxs: number;
    totalVolume: number;
  },
  t: (key: string) => string,
): X402FlowTrace => {
  const now = Date.now();
  return {
    agentAddress: zeroAddress,
    agentName: t('x402World.ecosystemName'),
    apiCalls: stats.topEndpoints.map((ep, i) => ({
      amountPaid: String(ep.volume),
      duration: 200,
      id: `eco-call-${i}`,
      paymentRequired: true,
      responseStatus: 200,
      url: ep.displayLabel,
    })),
    duration: 0,
    events: stats.topEndpoints.map((ep, i) => ({
      amount: String(ep.volume),
      apiUrl: ep.displayLabel,
      sequenceIndex: i,
      timestamp: now - (stats.topEndpoints.length - i) * 1000,
      type: 'api_call_complete' as const,
    })),
    flowId: 'ecosystem',
    startedAt: now,
    status: 'completed',
    totalPaid: String(stats.totalVolume),
    userPrompt: t('x402World.ecosystemActivity'),
  };
};

function formatStat(value: number, prefix = ''): string {
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${prefix}${(value / 1000).toFixed(1)}K`;
  return `${prefix}${value}`;
}

// ---------------------------------------------------------------------------
// Ecosystem Stats — top-left overlay chips (totalAgents / totalTxs / totalVolume)
// ---------------------------------------------------------------------------

interface EcosystemStatsProps {
  totalAgents: number;
  totalTxs: number;
  totalVolume: number;
}

const EcosystemStats = memo<EcosystemStatsProps>(({ totalAgents, totalTxs, totalVolume }) => {
  const { styles } = useStyles();
  return (
    <div className={styles.statsPanel}>
      <div className={styles.statPill}>
        <span className={styles.statPillLabel}>Agents</span>
        <span className={styles.statPillValue}>{formatStat(totalAgents)}</span>
      </div>
      <div className={styles.statPill}>
        <span className={styles.statPillLabel}>Txs</span>
        <span className={styles.statPillValue}>{formatStat(totalTxs)}</span>
      </div>
      <div className={styles.statPill}>
        <span className={styles.statPillLabel}>Volume</span>
        <span className={styles.statPillValue}>{formatStat(totalVolume, '$')}</span>
      </div>
    </div>
  );
});

EcosystemStats.displayName = 'EcosystemStats';

const WorldPage = memo(() => {
  const { cx, styles } = useStyles();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [period, setPeriod] = useState<Period>('all');

  const periodOptions: { label: string; value: Period }[] = useMemo(
    () => [
      { label: t('x402World.period24h'), value: '24h' },
      { label: t('x402World.period7d'), value: '7d' },
      { label: t('x402World.period15d'), value: '15d' },
      { label: t('x402World.period30d'), value: '30d' },
      { label: t('x402World.periodAll'), value: 'all' },
    ],
    [t],
  );

  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ['x402-ecosystem-stats', period],
    () => lambdaClient.x402Payments.ecosystemStats.query({ period }),
    { refreshInterval: 30_000 },
  );

  const apiEndpoints = useMemo(
    () => stats?.topEndpoints.map((ep) => ep.displayLabel) ?? [],
    [stats?.topEndpoints],
  );

  const flow = useMemo<X402FlowTrace | null>(
    () => (stats ? buildSyntheticFlow(stats, t) : null),
    [stats, t],
  );

  const handleShare = useCallback(() => {
    setShowSnapshot(true);
  }, []);

  const handleStartJourney = useCallback(() => {
    navigate('/x402');
  }, [navigate]);

  const handleCloseSnapshot = useCallback(() => {
    setShowSnapshot(false);
  }, []);

  // SEO: set document title + OG meta tags for social sharing
  useEffect(() => {
    const prev = document.title;
    document.title = 'x402 World — Payment Ecosystem | SperaxOS';

    const metas: HTMLMetaElement[] = [];
    const setMeta = (prop: string, content: string) => {
      const el = document.createElement('meta');
      el.setAttribute('property', prop);
      el.content = content;
      document.head.append(el);
      metas.push(el);
    };
    setMeta('og:title', 'x402 World — Payment Ecosystem');
    setMeta('og:description', 'Real-time agent-to-agent micropayments powered by HTTP 402');
    setMeta('og:image', '/api/og/world');
    setMeta('og:type', 'website');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'x402 World — Payment Ecosystem');
    setMeta('twitter:image', '/api/og/world');

    return () => {
      document.title = prev;
      for (const el of metas) el.remove();
    };
  }, []);

  // Keyboard shortcuts: F=fullscreen, S=share, Escape=close snapshot
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'f': {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
          break;
        }
        case 's': {
          if (!showSnapshot) setShowSnapshot(true);
          break;
        }
        case 'escape': {
          if (showSnapshot) setShowSnapshot(false);
          break;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSnapshot]);

  if (isLoading) {
    return (
      <Flexbox align={'center'} className={styles.container} justify={'center'}>
        <Spin size={'large'} />
      </Flexbox>
    );
  }

  if (error) {
    return (
      <Flexbox align={'center'} className={styles.container} gap={12} justify={'center'}>
        <span className={styles.errorText}>{t('x402World.error')}</span>
        <Button onClick={() => mutate()} size={'small'} type={'primary'}>
          {t('x402World.retry')}
        </Button>
      </Flexbox>
    );
  }

  return (
    <div className={styles.container}>
      {/* Ecosystem totals — top left */}
      {stats && (
        <EcosystemStats
          totalAgents={stats.totalAgents}
          totalTxs={stats.totalTxs}
          totalVolume={stats.totalVolume}
        />
      )}

      {/* Period selector — top right, segmented control */}
      <div aria-label={t('x402World.periodSelector')} className={styles.periodSelector} role={'group'}>
        {periodOptions.map((opt) => (
          <button
            aria-pressed={period === opt.value}
            className={cx(styles.periodButton, period === opt.value && styles.periodButtonActive)}
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <X402Network
        apiEndpoints={apiEndpoints}
        compact={false}
        flow={flow}
        height="100%"
        onShare={handleShare}
        onStartJourney={handleStartJourney}
        stage="idle"
        title={t('x402World.title')}
      />
      <LiveFeed />

      {/* Keyboard hint — bottom left */}
      <span className={styles.kbHint}>F · fullscreen &nbsp; S · share</span>

      {showSnapshot && (
        <div className={styles.snapshotOverlay}>
          <X402Snapshot
            apiEndpoints={apiEndpoints}
            flow={flow}
            onClose={handleCloseSnapshot}
          />
        </div>
      )}
    </div>
  );
});

WorldPage.displayName = 'WorldPage';

export default WorldPage;
