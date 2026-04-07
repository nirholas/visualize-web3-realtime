'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useDarkMode } from './DarkModeContext';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TimelineBarProps {
  /** Accumulated event timestamps (ms since epoch) */
  eventTimestamps: number[];
  /** Whether the scrubber is at the live (rightmost) position */
  isLive: boolean;
  /** Whether playback / streaming is active */
  isPlaying: boolean;
  /** Current time filter position (ms), null = live */
  timeFilter: number | null;
  /** Called when the (i) info button is clicked */
  onInfoClick?: () => void;
  /** Called when the user scrubs to a new time (null = live) */
  onTimeChange: (timestamp: number | null) => void;
  /** Called when play/pause is toggled */
  onTogglePlay: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_HEIGHT = 48;
const BUCKET_COUNT = 120;
const TRACK_HEIGHT = 28;

// ---------------------------------------------------------------------------
// Bucket computation
// ---------------------------------------------------------------------------

interface BucketResult {
  buckets: { timestamp: number; count: number }[];
  maxCount: number;
  min: number;
  max: number;
}

function computeBuckets(timestamps: number[]): BucketResult {
  if (timestamps.length === 0) {
    return { buckets: [], maxCount: 1, min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;
  for (const ts of timestamps) {
    if (ts < min) min = ts;
    if (ts > max) max = ts;
  }

  const range = max - min;
  if (range === 0) {
    return {
      buckets: [{ timestamp: min, count: timestamps.length }],
      maxCount: timestamps.length || 1,
      min,
      max,
    };
  }

  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    timestamp: min + (i * range) / BUCKET_COUNT,
    count: 0,
  }));

  const bucketSize = range / BUCKET_COUNT;
  for (const ts of timestamps) {
    const idx = Math.min(Math.floor((ts - min) / bucketSize), BUCKET_COUNT - 1);
    buckets[idx].count++;
  }

  let maxCount = 0;
  for (const b of buckets) {
    if (b.count > maxCount) maxCount = b.count;
  }

  return { buckets, maxCount: maxCount || 1, min, max };
}

function formatScrubDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TimelineBar = memo<TimelineBarProps>(
  ({ eventTimestamps, isLive, isPlaying, timeFilter, onInfoClick, onTimeChange, onTogglePlay }) => {
    const isDark = useDarkMode();
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hoverInfo, setHoverInfo] = useState<{ x: number; ts: number } | null>(null);

    const { buckets, maxCount, min: timeMin, max: timeMax } = useMemo(
      () => computeBuckets(eventTimestamps),
      [eventTimestamps],
    );

    // Progress as 0..1 fraction
    const progress = useMemo(() => {
      if (buckets.length === 0 || isLive || timeFilter === null) return 1;
      const range = timeMax - timeMin;
      if (range === 0) return 1;
      return Math.max(0, Math.min(1, (timeFilter - timeMin) / range));
    }, [buckets.length, isLive, timeFilter, timeMin, timeMax]);

    // Convert clientX → timestamp
    const xToTimestamp = useCallback(
      (clientX: number): number | null => {
        const track = trackRef.current;
        if (!track || buckets.length === 0) return null;
        const rect = track.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return timeMin + frac * (timeMax - timeMin);
      },
      [buckets.length, timeMin, timeMax],
    );

    const xToLocalOffset = useCallback((clientX: number): number => {
      const track = trackRef.current;
      if (!track) return 0;
      return clientX - track.getBoundingClientRect().left;
    }, []);

    const handleScrub = useCallback(
      (clientX: number) => {
        const ts = xToTimestamp(clientX);
        if (ts === null) return;
        const range = timeMax - timeMin;
        if (range > 0 && (ts - timeMin) / range >= 0.98) {
          onTimeChange(null); // snap to live
        } else {
          onTimeChange(ts);
        }
      },
      [xToTimestamp, onTimeChange, timeMin, timeMax],
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handleScrub(e.clientX);
      },
      [handleScrub],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        const ts = xToTimestamp(e.clientX);
        const x = xToLocalOffset(e.clientX);
        if (ts !== null) setHoverInfo({ x, ts });
        if (isDragging) handleScrub(e.clientX);
      },
      [isDragging, xToTimestamp, xToLocalOffset, handleScrub],
    );

    const handlePointerUp = useCallback(() => setIsDragging(false), []);

    const handlePointerLeave = useCallback(() => {
      if (!isDragging) setHoverInfo(null);
    }, [isDragging]);

    return (
      <div
        style={{
          alignItems: 'center',
          background: isDark ? 'rgba(14, 14, 22, 0.95)' : '#ffffff',
          boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 12,
          height: BAR_HEIGHT,
          padding: '0 16px',
          width: '100%',
        }}
      >
        {/* Left: Logo + App Name + Info */}
        <div style={{ alignItems: 'center', display: 'flex', flexShrink: 0, gap: 8 }}>
          {/* Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke={isDark ? '#475569' : '#ccc'} strokeWidth="1.5" />
            <circle cx="12" cy="12" r="4" fill="#1a1a2e" />
            <circle cx="12" cy="5" r="2" fill="#0f3460" />
            <circle cx="18" cy="15" r="2" fill="#16213e" />
            <circle cx="6" cy="15" r="2" fill="#2c2c54" />
          </svg>

          {/* App name pill */}
          <div
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f5',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e8e8e8',
              borderRadius: 12,
              color: isDark ? '#94a3b8' : '#666',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.04em',
              padding: '3px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            Web3 Visualizer
          </div>

          {/* Info button */}
          <button
            onClick={onInfoClick}
            style={{
              alignItems: 'center',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
              borderRadius: '50%',
              color: isDark ? '#94a3b8' : '#161616',
              cursor: 'pointer',
              display: 'flex',
              flexShrink: 0,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              height: 22,
              justifyContent: 'center',
              width: 22,
            }}
            title="Info"
            type="button"
          >
            i
          </button>
        </div>

        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          style={{
            alignItems: 'center',
            background: isDark ? '#2a2a4e' : '#1a1a2e',
            border: 'none',
            borderRadius: 8,
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            flexShrink: 0,
            height: 36,
            justifyContent: 'center',
            width: 36,
          }}
          title={isPlaying ? 'Pause' : 'Play'}
          type="button"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {/* Timeline Track Wrapper (tooltip rendered here, outside overflow:hidden track) */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            ref={trackRef}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              alignItems: 'flex-end',
              background: isDark ? 'rgba(255,255,255,0.06)' : '#e8e8e8',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              height: TRACK_HEIGHT,
              overflow: 'hidden',
              position: 'relative',
              touchAction: 'none',
            }}
          >
            {/* Progress fill */}
            <div
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, rgba(100,120,200,0.15), rgba(60,100,200,0.10))'
                  : 'linear-gradient(90deg, rgba(26,26,46,0.08), rgba(15,52,96,0.10))',
                bottom: 0,
                left: 0,
                position: 'absolute',
                top: 0,
                transition: isDragging ? 'none' : 'width 0.3s ease',
                width: `${progress * 100}%`,
                zIndex: 1,
              }}
            />

            {/* Tick marks */}
            {buckets.map((bucket, i) => {
              const h = bucket.count / maxCount;
              const filled = i / buckets.length <= progress;
              return (
                <div
                  key={i}
                  style={{
                    background: isDark
                      ? (filled
                        ? `rgba(120,140,220,${0.2 + h * 0.6})`
                        : `rgba(255,255,255,${0.04 + h * 0.1})`)
                      : (filled
                        ? `rgba(26,26,46,${0.15 + h * 0.65})`
                        : `rgba(0,0,0,${0.04 + h * 0.12})`),
                    borderRadius: 1,
                    flex: 1,
                    height: `${Math.max(12, h * 100)}%`,
                    minWidth: 2,
                    position: 'relative',
                    transition: isDragging ? 'none' : 'height 0.3s, background 0.3s',
                    zIndex: 2,
                  }}
                />
              );
            })}

            {/* Playhead */}
            <div
              style={{
                background: isDark ? '#7b8eea' : '#1a1a2e',
                bottom: 0,
                boxShadow: isDark ? '0 0 4px rgba(123,142,234,0.4)' : '0 0 4px rgba(26,26,46,0.3)',
                left: `${progress * 100}%`,
                position: 'absolute',
                top: 0,
                transition: isDragging ? 'none' : 'left 0.3s ease',
                width: 2,
                zIndex: 5,
              }}
            />
          </div>

          {/* Hover tooltip (outside track to avoid overflow clip) */}
          {hoverInfo && (
            <div
              style={{
                background: isDark ? 'rgba(20, 20, 35, 0.95)' : '#fff',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e0e0e0',
                borderRadius: 6,
                bottom: TRACK_HEIGHT + 6,
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
                color: isDark ? '#e2e8f0' : '#161616',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                left: Math.max(
                  0,
                  Math.min(
                    hoverInfo.x - 70,
                    (trackRef.current?.offsetWidth ?? 400) - 140,
                  ),
                ),
                padding: '4px 8px',
                pointerEvents: 'none',
                position: 'absolute',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              {formatScrubDate(hoverInfo.ts)}
            </div>
          )}
        </div>

        {/* Live indicator */}
        {isLive && (
          <div
            style={{
              alignItems: 'center',
              color: '#22c55e',
              display: 'flex',
              flexShrink: 0,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              gap: 4,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                animation: 'tl-pulse 2s ease-in-out infinite',
                background: '#22c55e',
                borderRadius: '50%',
                display: 'inline-block',
                height: 6,
                width: 6,
              }}
            />
            LIVE
          </div>
        )}

        <style>{`@keyframes tl-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  },
);

TimelineBar.displayName = 'TimelineBar';

export default TimelineBar;
