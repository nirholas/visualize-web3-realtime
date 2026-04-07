import { useState, useEffect, useRef } from 'react';
import { PumpNode, PumpLink, GraphData } from './types';

const SOCKET_URL = 'wss://pumpportal.fun/api/data';
const FLUSH_INTERVAL_MS = 1500;
const GC_THRESHOLD_MS = 45 * 1000; // 45 seconds
const MAX_ACTIVE_TRADES = 300;

// Hub IDs that trades route to
const HUB_BUYS = 'hub:buys';
const HUB_SELLS = 'hub:sells';
const HUB_CREATES = 'hub:creates';
const HUB_WHALES = 'hub:whales';

/** Determine which hub(s) a trade should link to */
function routeToHub(txType: string, solAmount: number): string {
  if (txType === 'create') return HUB_CREATES;
  // Whales get their own hub (>1 SOL)
  if (solAmount > 1) return HUB_WHALES;
  if (txType === 'buy') return HUB_BUYS;
  return HUB_SELLS;
}

export function usePumpFunSocket() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const masterDataRef = useRef<GraphData>({ nodes: [], links: [] });
  const bufferRef = useRef<GraphData>({ nodes: [], links: [] });
  const wsRef = useRef<WebSocket | null>(null);

  // --- WEBSOCKET CONNECTION & MESSAGE PARSING ---
  useEffect(() => {
    const ws = new WebSocket(SOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🟢 PumpPortal WebSocket Connected');
      ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
      ws.send(JSON.stringify({ method: 'subscribeTokenTrade' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const now = Date.now();

        const mintId = data.mint || data.tokenMint;
        if (!mintId) return;

        const txType: string = data.txType ?? '';
        const solAmount: number = data.solAmount ?? 0;
        const hubTarget = routeToHub(txType, solAmount);

        if (txType === 'create') {
          // Coin creation → particle linked to COIN CREATIONS hub
          const nodeId = `create-${mintId}-${now}`;
          const newNode: PumpNode = {
            id: nodeId,
            type: 'token',
            ticker: data.symbol || 'NEW',
            timestamp: now,
          };
          const newLink: PumpLink = {
            source: nodeId,
            target: hubTarget,
          };
          bufferRef.current.nodes.push(newNode);
          bufferRef.current.links.push(newLink);
        } else if (txType === 'buy' || txType === 'sell') {
          const tradeId = data.signature || `${mintId}-${now}-${Math.random()}`;
          const newTrade: PumpNode = {
            id: tradeId,
            type: 'trade',
            isBuy: txType === 'buy',
            solAmount,
            timestamp: now,
          };
          const newLink: PumpLink = {
            source: tradeId,
            target: hubTarget,
          };
          bufferRef.current.nodes.push(newTrade);
          bufferRef.current.links.push(newLink);
        }
      } catch (err) {
        console.error('WebSocket parsing error:', err);
      }
    };

    ws.onclose = () => console.log('🔴 PumpPortal WebSocket Disconnected');

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
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
