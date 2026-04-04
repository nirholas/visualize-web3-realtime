import type { AppDefinition } from './desktopTypes';

/* ------------------------------------------------------------------ */
/*  Glassmorphism design tokens                                       */
/* ------------------------------------------------------------------ */

export const GLASS = {
  bg: 'rgba(18, 18, 30, 0.72)',
  bgSolid: 'rgba(18, 18, 30, 0.88)',
  bgHover: 'rgba(30, 30, 48, 0.82)',
  bgActive: 'rgba(40, 40, 60, 0.90)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderLight: '1px solid rgba(255, 255, 255, 0.04)',
  borderFocus: '1px solid rgba(255, 255, 255, 0.15)',
  blur: 'blur(20px)',
  blurLight: 'blur(12px)',
  shadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  shadowLight: '0 2px 8px rgba(0, 0, 0, 0.2)',
  radius: 12,
  radiusLg: 16,
  radiusSm: 8,
} as const;

/* ------------------------------------------------------------------ */
/*  Taskbar                                                           */
/* ------------------------------------------------------------------ */

export const TASKBAR_HEIGHT = 52;

/* ------------------------------------------------------------------ */
/*  App registry — defines every "window app"                         */
/* ------------------------------------------------------------------ */

export const APPS: AppDefinition[] = [
  {
    id: 'filters',
    label: 'Filters',
    icon: 'filters',
    defaultSize: { width: 260, height: 480 },
    defaultPosition: { x: 60, y: 80 },
    pinned: true,
    description: 'Toggle data sources & categories',
  },
  {
    id: 'livefeed',
    label: 'Live Feed',
    icon: 'livefeed',
    defaultSize: { width: 340, height: 360 },
    defaultPosition: { x: 400, y: 120 },
    pinned: true,
    description: 'Real-time event stream',
  },
  {
    id: 'stats',
    label: 'Stats',
    icon: 'stats',
    defaultSize: { width: 480, height: 120 },
    defaultPosition: { x: 200, y: 100 },
    pinned: true,
    description: 'Volume, tokens & transactions',
  },
  {
    id: 'aichat',
    label: 'AI Chat',
    icon: 'aichat',
    defaultSize: { width: 360, height: 420 },
    defaultPosition: { x: 100, y: 100 },
    pinned: true,
    description: 'Ask questions about the data',
  },
  {
    id: 'share',
    label: 'Share',
    icon: 'share',
    defaultSize: { width: 320, height: 380 },
    defaultPosition: { x: 300, y: 100 },
    pinned: true,
    description: 'Customize colors & share',
  },
  {
    id: 'embed',
    label: 'Embed',
    icon: 'embed',
    defaultSize: { width: 420, height: 440 },
    defaultPosition: { x: 200, y: 80 },
    pinned: false,
    description: 'Generate embed widgets',
  },
  {
    id: 'sources',
    label: 'Data Sources',
    icon: 'sources',
    defaultSize: { width: 400, height: 500 },
    defaultPosition: { x: 250, y: 60 },
    pinned: true,
    description: 'Manage provider connections',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: 'timeline',
    defaultSize: { width: 600, height: 80 },
    defaultPosition: { x: 200, y: 20 },
    pinned: false,
    description: 'Playback & scrub events',
  },
];

export const APP_MAP = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<
  string,
  AppDefinition
>;
