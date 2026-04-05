'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { GLASS } from './desktopConstants';
import type { ConnectionState } from '@web3viz/core';

interface Toast {
  id: string;
  message: string;
  type: 'connected' | 'disconnected';
  timestamp: number;
}

const TOAST_DURATION = 3000;

interface ConnectionToastsProps {
  connections: Record<string, ConnectionState[]>;
}

export const ConnectionToasts = memo<ConnectionToastsProps>(({ connections }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const newToasts: Toast[] = [];
    const currentMap = new Map<string, boolean>();

    for (const [providerId, conns] of Object.entries(connections)) {
      const anyConnected = conns.some((c) => c.connected);
      currentMap.set(providerId, anyConnected);

      const wasConnected = prevRef.current.get(providerId);
      if (wasConnected === undefined) continue; // first render, skip

      if (anyConnected && !wasConnected) {
        newToasts.push({
          id: `${providerId}_${Date.now()}`,
          message: `${providerId} connected`,
          type: 'connected',
          timestamp: Date.now(),
        });
      } else if (!anyConnected && wasConnected) {
        newToasts.push({
          id: `${providerId}_${Date.now()}`,
          message: `${providerId} disconnected`,
          type: 'disconnected',
          timestamp: Date.now(),
        });
      }
    }

    prevRef.current = currentMap;

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts].slice(-5));
    }
  }, [connections]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => now - t.timestamp < TOAST_DURATION));
    }, 500);
    return () => clearInterval(timer);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9800,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: GLASS.bgSolid,
            border: GLASS.border,
            borderRadius: GLASS.radiusSm,
            boxShadow: GLASS.shadowLight,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: '#c8d0dc',
            animation: 'toastIn 200ms ease-out',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: toast.type === 'connected' ? '#22c55e' : '#ef4444',
              flexShrink: 0,
            }}
          />
          <span style={{ textTransform: 'capitalize' }}>
            {toast.message}
          </span>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
});

ConnectionToasts.displayName = 'ConnectionToasts';
