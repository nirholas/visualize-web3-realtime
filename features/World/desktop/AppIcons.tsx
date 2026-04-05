import { memo } from 'react';

/** SVG icons for each desktop app, matching Win12 style */

const sz = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export const FiltersIcon = memo(() => (
  <svg {...sz}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
));
FiltersIcon.displayName = 'FiltersIcon';

export const LiveFeedIcon = memo(() => (
  <svg {...sz}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
));
LiveFeedIcon.displayName = 'LiveFeedIcon';

export const StatsIcon = memo(() => (
  <svg {...sz}>
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
));
StatsIcon.displayName = 'StatsIcon';

export const AiChatIcon = memo(() => (
  <svg {...sz}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
));
AiChatIcon.displayName = 'AiChatIcon';

export const ShareIcon = memo(() => (
  <svg {...sz}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
));
ShareIcon.displayName = 'ShareIcon';

export const EmbedIcon = memo(() => (
  <svg {...sz}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
));
EmbedIcon.displayName = 'EmbedIcon';

export const SourcesIcon = memo(() => (
  <svg {...sz}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
));
SourcesIcon.displayName = 'SourcesIcon';

export const TimelineIcon = memo(() => (
  <svg {...sz}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
));
TimelineIcon.displayName = 'TimelineIcon';

export const StartMenuIcon = memo(() => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
    <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
    <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.7" />
    <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
  </svg>
));
StartMenuIcon.displayName = 'StartMenuIcon';

export const HelpIcon = memo(() => (
  <svg {...sz}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
));
HelpIcon.displayName = 'HelpIcon';

export const JourneyIcon = memo(() => (
  <svg {...sz}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
));
JourneyIcon.displayName = 'JourneyIcon';

const ICON_MAP: Record<string, React.FC> = {
  filters: FiltersIcon,
  livefeed: LiveFeedIcon,
  stats: StatsIcon,
  aichat: AiChatIcon,
  share: ShareIcon,
  embed: EmbedIcon,
  sources: SourcesIcon,
  timeline: TimelineIcon,
};

export function getAppIcon(iconKey: string): React.FC {
  return ICON_MAP[iconKey] ?? StatsIcon;
}
