import type { CategoryConfig } from '@web3viz/core';

export const PUMPFUN_CATEGORIES: CategoryConfig[] = [
  { id: 'launches',      label: 'Launches',        icon: '⚡', color: '#a78bfa' },
  { id: 'agentLaunches', label: 'Agent Launches',   icon: '⬡',  color: '#f472b6' },
  { id: 'trades',        label: 'Trades',           icon: '▲',  color: '#60a5fa' },
  { id: 'claimsWallet',  label: 'Wallet Claims',    icon: '◆',  color: '#fbbf24' },
  { id: 'claimsGithub',  label: 'GitHub Claims',    icon: '⬢',  color: '#34d399' },
  { id: 'claimsFirst',   label: 'First Claims',     icon: '★',  color: '#f87171' },
  { id: 'bondingCurve',  label: 'Bonding Curve',    icon: '📈', color: '#22d3ee' },
  { id: 'whales',        label: 'Whale Trades',     icon: '🐋', color: '#818cf8' },
  { id: 'snipers',       label: 'Sniper Bots',      icon: '🎯', color: '#fb7185' },
  { id: 'clusters',      label: 'Social Clusters',  icon: '👥', color: '#a3e635' },
];
