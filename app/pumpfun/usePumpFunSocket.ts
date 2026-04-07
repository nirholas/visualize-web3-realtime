import { useState, useEffect, useRef } from 'react';
import { PumpNode, PumpLink, GraphData } from './types';

const SOCKET_URL = 'wss://pumpportal.fun/api/data';
const FLUSH_INTERVAL_MS = 1500;
const GC_THRESHOLD_MS = 45 * 1000; // 45 seconds
const MAX_ACTIVE_TRADES = 400;

// Whale threshold in SOL
const WHALE_THRESHOLD_SOL = 1;

// Max tokens to track trades for (prevents flooding)
const MAX_SUBSCRIBED_TOKENS = 50;

// Hub IDs that trades route to
const HUB_BUYS = 'hub:buys';
const HUB_SELLS = 'hub:sells';
const HUB_CREATES = 'hub:creates';
const HUB_WHALES = 'hub:whales';

/**
 * Normalize SOL amount from PumpPortal.
 * PumpPortal is inconsistent — sometimes sends lamports (>1e6), sometimes SOL.
 */
function normalizeSol(raw: number | undefined): number {
  if (raw === undefined || raw === null) return 0;
  return raw > 1e6 ? raw / 1e9 : raw;
}

/** Determine which hub a trade should link to */
function routeToHub(type: string, solAmount: number): string {
  if (type === 'create') return HUB_CREATES;
  if (solAmount >= WHALE_THRESHOLD_SOL) return HUB_WHALES;
  if (type === 'buy') return HUB_BUYS;
  return HUB_SELLS;
}

export function usePumpFunSocket() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const masterDataRef = useRef<GraphData>({ nodes: [], links: [] });
  const bufferRef = useRef<GraphData>({ nodes: [], links: [] });
  const wsRef = useRef<WebSocket | null>(null);
  // Track subscribed token mints (ordered by subscription time)
  const subscribedMintsRef = useRef<string[]>([]);

  // --- WEBSOCKET CONNECTION & MESSAGE PARSING ---
  useEffect(() => {
    const ws = new WebSocket(SOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[PumpPortal] Connected');
      // Subscribe to new token creations
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      // Subscribe to migration events
      ws.send(JSON.stringify({ method: 'subscribeMigration' }));
      // NOTE: PumpPortal requires specific mint addresses for trade subscriptions.
      // We dynamically subscribe to trades for each new token as it's created.
      console.log('[PumpPortal] Subscribed to new tokens + migrations (trades will be subscribed per-token)');
    };

    /** Subscribe to trades for a specific token mint */
    const subscribeToTokenTrades = (mint: string) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const subs = subscribedMintsRef.current;

      // Already subscribed
      if (subs.includes(mint)) return;

      // If at capacity, unsubscribe the oldest token
      if (subs.length >= MAX_SUBSCRIBED_TOKENS) {
        const oldest = subs.shift()!;
        ws.send(JSON.stringify({ method: 'unsubscribeTokenTrade', keys: [oldest] }));
      }

      // Subscribe to this token's trades
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade', keys: [mint] }));
      subs.push(mint);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const now = Date.now();

        const mintId = msg.mint || msg.tokenMint;
        if (!mintId) return;

        // Normalize SOL amount
        const solAmount = normalizeSol(msg.solAmount);

        // Determine event type:
        // - subscribeTokenTrade messages have txType: 'buy' | 'sell' | 'create' | 'migrate'
        // - subscribeNewToken messages have NO txType but have mint + name
        const txType = (msg.txType || '').toLowerCase();
        let eventType: string;

        if (txType === 'buy' || txType === 'sell' || txType === 'create' || txType === 'migrate') {
          eventType = txType;
        } else if (msg.mint && (msg.name || msg.symbol)) {
          // subscribeNewToken event (no txType field)
          eventType = 'create';
        } else {
          return; // Unknown event
        }

        // Skip migrations for now (no dedicated hub)
        if (eventType === 'migrate') return;

        const hubTarget = routeToHub(eventType, solAmount);

        if (eventType === 'create') {
          // Coin creation particle
          const nodeId = `create-${mintId}-${now}-${Math.random().toString(36).slice(2, 6)}`;
          const newNode: PumpNode = {
            id: nodeId,
            type: 'token',
            ticker: msg.symbol || msg.name || 'NEW',
            solAmount,
            timestamp: now,
          };
          bufferRef.current.nodes.push(newNode);
          bufferRef.current.links.push({ source: nodeId, target: hubTarget });

          // Dynamically subscribe to trades for this newly created token
          subscribeToTokenTrades(mintId);
        } else {
          // Buy or sell trade particle
          const tradeId = msg.signature || `trade-${mintId}-${now}-${Math.random().toString(36).slice(2, 6)}`;
          const newTrade: PumpNode = {
            id: tradeId,
            type: 'trade',
            isBuy: eventType === 'buy',
            solAmount,
            ticker: msg.symbol || msg.name,
            timestamp: now,
          };
          bufferRef.current.nodes.push(newTrade);
          bufferRef.current.links.push({ source: tradeId, target: hubTarget });
        }
      } catch (err) {
        console.error('[PumpPortal] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[PumpPortal] Disconnected');
      subscribedMintsRef.current = [];
    };
    ws.onerror = (e) => console.error('[PumpPortal] Error:', e);

    return () => {
      subscribedMintsRef.current = [];
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  // --- THE FLUSH & GARBAGE COLLECTOR LOOP ---
  useEffect(() => {
    const tick = setInterval(() => {
      let currentNodes = [...masterDataRef.current.nodes];
      let currentLinks = [...masterDataRef.current.links];

      const bufferedNodes = bufferRef.current.nodes;
      const bufferedLinks = bufferRef.current.links;

      if (bufferedNodes.length > 0) currentNodes = currentNodes.concat(bufferedNodes);
      if (bufferedLinks.length > 0) currentLinks = currentLinks.concat(bufferedLinks);

      bufferRef.current = { nodes: [], links: [] };

      const now = Date.now();

      // GC: remove nodes older than threshold
      const alive = currentNodes.filter(
        (node) => now - node.timestamp < GC_THRESHOLD_MS,
      );

      // Hard cap: keep most recent trades
      alive.sort((a, b) => b.timestamp - a.timestamp);
      const capped = alive.slice(0, MAX_ACTIVE_TRADES);
      const activeIds = new Set(capped.map((n) => n.id));

      // Clean up orphaned links
      const activeLinks = currentLinks.filter((link) => {
        const srcId =
          typeof link.source === 'object'
            ? (link.source as PumpNode).id
            : link.source;
        return activeIds.has(srcId);
      });

      masterDataRef.current = {
        nodes: capped,
        links: activeLinks,
      };

      setGraphData({
        nodes: [...masterDataRef.current.nodes],
        links: [...masterDataRef.current.links],
      });
    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(tick);
  }, []);

  return graphData;
}
