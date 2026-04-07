import { useState, useEffect, useRef } from 'react';
import { PumpNode, PumpLink, GraphData } from './types';

const SOCKET_URL = 'wss://pumpportal.fun/api/data';
const FLUSH_INTERVAL_MS = 1500;
const GC_THRESHOLD_MS = 45 * 1000; // 45 seconds
const MAX_ACTIVE_TOKENS = 15;

export function usePumpFunSocket() {
  // The state that React actually uses to render the graph
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  
  // Master state kept in a ref to avoid stale closures in the setInterval loop
  const masterDataRef = useRef<GraphData>({ nodes: [], links: [] });
  
  // The high-speed temporary buffer
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

        // Pumpportal payloads use 'mint' or 'tokenMint' as the unique token ID
        const mintId = data.mint || data.tokenMint;
        if (!mintId) return;

        // Handle Token Launch
        if (data.txType === 'create') {
          const newToken: PumpNode = {
            id: mintId,
            type: 'token',
            ticker: data.symbol || 'UNKNOWN',
            timestamp: now,
          };
          bufferRef.current.nodes.push(newToken);
        } 
        // Handle Trades (Swarm Particles)
        else if (data.txType === 'buy' || data.txType === 'sell') {
          const tradeId = data.signature || `${mintId}-${now}-${Math.random()}`;
          
          const newTrade: PumpNode = {
            id: tradeId,
            type: 'trade',
            isBuy: data.txType === 'buy',
            solAmount: data.solAmount || 0,
            timestamp: now,
          };
          
          const newLink: PumpLink = {
            source: tradeId,
            target: mintId, // Point the particle to the token
          };

          bufferRef.current.nodes.push(newTrade);
          bufferRef.current.links.push(newLink);

          // Touch the parent token's timestamp so it doesn't get garbage collected
          const activeToken = masterDataRef.current.nodes.find(n => n.id === mintId && n.type === 'token');
          if (activeToken) activeToken.timestamp = now;
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
      
      // 1. Drain the buffer into the master array
      if (bufferedNodes.length > 0) currentNodes = currentNodes.concat(bufferedNodes);
      if (bufferedLinks.length > 0) currentLinks = currentLinks.concat(bufferedLinks);
      
      // Reset the buffer instantly so it can catch new messages
      bufferRef.current = { nodes: [], links: [] };

      const now = Date.now();
      
      // 2. Identify active tokens (Time-To-Live Check)
      const aliveTokens = currentNodes.filter(node => 
        node.type === 'token' && (now - node.timestamp) < GC_THRESHOLD_MS
      );

      // 3. Enforce Hard Cap (Sort by newest, slice top 15)
      aliveTokens.sort((a, b) => b.timestamp - a.timestamp);
      const cappedTokens = aliveTokens.slice(0, MAX_ACTIVE_TOKENS);
      const activeTokenIds = new Set(cappedTokens.map(t => t.id));

      // 4. Cascading Deletion (Remove links & trades belonging to dead tokens)
      const activeLinks = currentLinks.filter(link => {
        // D3 physics mutates strings into objects, so we handle both
        const targetId = typeof link.target === 'object' ? (link.target as PumpNode).id : link.target;
        return activeTokenIds.has(targetId);
      });

      const activeTradeIds = new Set(activeLinks.map(link => 
        typeof link.source === 'object' ? (link.source as PumpNode).id : link.source
      ));

      const activeTrades = currentNodes.filter(node => 
        node.type === 'trade' && activeTradeIds.has(node.id)
      );

      // 5. Finalize state and trigger ONE React render
      masterDataRef.current = {
        nodes: [...cappedTokens, ...activeTrades],
        links: activeLinks
      };

      // D3 modifies arrays in place, so we map new arrays to force React to notice the update
      setGraphData({
        nodes: [...masterDataRef.current.nodes],
        links: [...masterDataRef.current.links]
      });

    }, FLUSH_INTERVAL_MS);

    return () => clearInterval(tick);
  }, []);

  return graphData;
}
