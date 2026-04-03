import type { ShareColors } from '@web3viz/core';

/**
 * Build a shareable URL encoding the current colors and optional address.
 */
export function buildShareUrl(colors: ShareColors, address?: string): string {
  const params = new URLSearchParams();
  params.set('bg', colors.background.replace('#', ''));
  params.set('pc', colors.protocol.replace('#', ''));
  params.set('uc', colors.user.replace('#', ''));
  if (address) params.set('address', address);
  return `${window.location.origin}/world?${params.toString()}`;
}

/**
 * Parse share URL params back into ShareColors + optional address.
 */
export function parseShareParams(search: string): {
  colors: Partial<ShareColors>;
  address?: string;
} {
  const params = new URLSearchParams(search);
  const colors: Partial<ShareColors> = {};

  const bg = params.get('bg');
  const pc = params.get('pc');
  const uc = params.get('uc');
  const address = params.get('address') || undefined;

  if (bg && /^[0-9a-f]{6}$/i.test(bg)) colors.background = `#${bg}`;
  if (pc && /^[0-9a-f]{6}$/i.test(pc)) colors.protocol = `#${pc}`;
  if (uc && /^[0-9a-f]{6}$/i.test(uc)) colors.user = `#${uc}`;

  return { colors, address };
}

/**
 * Build pre-filled text for social share.
 */
export function buildShareText(
  stats: { tokens: number; volume: number; transactions: number },
  shareUrl: string,
): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return [
    `I'm part of a financial system breathing in real time.`,
    `${fmt(stats.tokens)} tokens, $${fmt(stats.volume)} volume, ${fmt(stats.transactions)} transactions.`,
    ``,
    `Explore the world: ${shareUrl}`,
  ].join('\n');
}

/**
 * Open X/Twitter compose with pre-filled text.
 */
export function shareOnX(text: string, url: string): void {
  const tweetUrl = new URL('https://twitter.com/intent/tweet');
  tweetUrl.searchParams.set('text', text);
  tweetUrl.searchParams.set('url', url);
  window.open(tweetUrl.toString(), '_blank', 'noopener,noreferrer');
}

/**
 * Open LinkedIn share dialog with URL.
 */
export function shareOnLinkedIn(url: string): void {
  const linkedInUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  linkedInUrl.searchParams.set('url', url);
  window.open(linkedInUrl.toString(), '_blank', 'noopener,noreferrer');
}
