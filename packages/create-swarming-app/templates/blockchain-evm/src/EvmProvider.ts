import { useState, useEffect, useRef, useCallback } from 'react';
import { EVM_WS_URL, CHAIN_NAME, MAX_NODES, MAX_EDGES } from './config';

// =============================================================================
// Types
// =============================================================================

export interface GraphNode {
  /** Unique address used as the node identifier */
  tokenAddress: string;
  symbol: string;
  name: string;
  chain: string;
  trades: number;
  volume: number;
  nativeSymbol: string;
}

export interface GraphEdge {
  /** The "from" address (sender) */
  trader: string;
  /** The "to" address (receiver / contract) — used as the hub node */
  tokenAddress: string;
  chain: string;
  trades: number;
  volume: number;
}

// =============================================================================
// Helpers
// =============================================================================

/** Shorten an Ethereum address to 0xAbCd...1234 form */
function shortAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Generate a random Ethereum-style address for demo mode */
function randomAddr(): string {
  const hex = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += hex[Math.floor(Math.random() * 16)];
  }
  return addr;
}

// =============================================================================
// useEvmStream Hook
//
// Connects to an EVM-compatible JSON-RPC WebSocket and subscribes to new
// pending transactions or new block headers. When a transaction arrives it
// is mapped into the node/edge graph format expected by <SwarmGraph>.
//
// Ethereum JSON-RPC WebSocket API overview:
//   The eth_subscribe method opens a persistent subscription over a WebSocket
//   connection. Supported subscription types include:
//     - "newPendingTransactions" — emits tx hashes as they enter the mempool
//     - "newHeads"              — emits block header objects on each new block
//
//   Once subscribed, the server pushes notifications with:
//     { "jsonrpc": "2.0", "method": "eth_subscription", "params": { "subscription": "<id>", "result": <data> } }
//
//   To get full transaction details from a hash you call:
//     eth_getTransactionByHash(txHash) -> { from, to, value, hash, ... }
//
//   Values are hex-encoded (e.g. "0xde0b6b3a7640000" = 1 ETH in wei).
//
// If the WebSocket connection fails (e.g. invalid API key), the hook
// automatically falls back to a demo mode that generates fake transactions
// every second so you can see the visualization working immediately.
// =============================================================================

export function useEvmStream() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [connected, setConnected] = useState(false);
  const [blockNumber, setBlockNumber] = useState<number>(0);

  // Mutable refs so the WebSocket callbacks can access latest state
  const nodesRef = useRef<Map<string, GraphNode>>(new Map());
  const edgesRef = useRef<GraphEdge[]>([]);
  const txCountRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Flush current maps into React state
  // ---------------------------------------------------------------------------
  const flush = useCallback(() => {
    setNodes(Array.from(nodesRef.current.values()));
    setEdges([...edgesRef.current]);
  }, []);

  // ---------------------------------------------------------------------------
  // Upsert a node (address) into the graph
  // ---------------------------------------------------------------------------
  const upsertNode = useCallback((address: string) => {
    const existing = nodesRef.current.get(address);
    if (existing) {
      existing.trades += 1;
      existing.volume += 1;
    } else {
      // Evict oldest nodes if we exceed the limit
      if (nodesRef.current.size >= MAX_NODES) {
        const firstKey = nodesRef.current.keys().next().value as string;
        nodesRef.current.delete(firstKey);
      }
      nodesRef.current.set(address, {
        tokenAddress: address,
        symbol: shortAddr(address),
        name: shortAddr(address),
        chain: CHAIN_NAME,
        trades: 1,
        volume: 1,
        nativeSymbol: 'ETH',
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Add an edge (transaction) to the graph
  // ---------------------------------------------------------------------------
  const addEdge = useCallback((from: string, to: string, valueEth: number) => {
    // Evict oldest edges if we exceed the limit
    if (edgesRef.current.length >= MAX_EDGES) {
      edgesRef.current = edgesRef.current.slice(-Math.floor(MAX_EDGES * 0.8));
    }
    edgesRef.current.push({
      trader: from,
      tokenAddress: to,
      chain: CHAIN_NAME,
      trades: 1,
      volume: valueEth,
    });
    txCountRef.current += 1;
  }, []);

  // ---------------------------------------------------------------------------
  // Process a raw transaction object from eth_getTransactionByHash
  // ---------------------------------------------------------------------------
  const processTx = useCallback(
    (tx: { from: string; to: string | null; value: string; hash: string }) => {
      if (!tx.from || !tx.to) return; // skip contract creation txs

      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();

      // Convert hex wei to ETH (1 ETH = 10^18 wei)
      const weiHex = tx.value || '0x0';
      const wei = parseInt(weiHex, 16);
      const ethValue = wei / 1e18;

      upsertNode(from);
      upsertNode(to);
      addEdge(from, to, ethValue);
      flush();
    },
    [upsertNode, addEdge, flush],
  );

  // ---------------------------------------------------------------------------
  // Demo mode: generates fake transactions when WebSocket is unavailable
  // ---------------------------------------------------------------------------
  const startDemoMode = useCallback(() => {
    console.warn('[EvmProvider] WebSocket unavailable — running in demo mode');
    setConnected(false);
    let fakeBlock = 19_000_000;

    demoTimerRef.current = setInterval(() => {
      const from = randomAddr();
      const to = randomAddr();
      const ethValue = Math.random() * 5;

      upsertNode(from);
      upsertNode(to);
      addEdge(from, to, ethValue);

      fakeBlock += 1;
      setBlockNumber(fakeBlock);
      flush();
    }, 1000);
  }, [upsertNode, addEdge, flush]);

  // ---------------------------------------------------------------------------
  // WebSocket connection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    function connect() {
      try {
        const ws = new WebSocket(EVM_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setConnected(true);

          // ------------------------------------------------------------------
          // Subscribe to new pending transactions.
          //
          // JSON-RPC request format:
          //   { "jsonrpc": "2.0", "id": 1, "method": "eth_subscribe", "params": ["newPendingTransactions"] }
          //
          // The server will respond with a subscription ID, then push tx hashes
          // as they enter the mempool.
          // ------------------------------------------------------------------
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_subscribe',
              params: ['newPendingTransactions'],
            }),
          );

          // ------------------------------------------------------------------
          // Also subscribe to new block headers so we can track block number.
          //
          //   { "jsonrpc": "2.0", "id": 2, "method": "eth_subscribe", "params": ["newHeads"] }
          //
          // Each notification's result contains: { number, hash, parentHash, ... }
          // ------------------------------------------------------------------
          ws.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'eth_subscribe',
              params: ['newHeads'],
            }),
          );
        };

        ws.onmessage = (event) => {
          if (cancelled) return;

          try {
            const data = JSON.parse(event.data);

            // Handle subscription confirmations (ignored)
            if (data.id && data.result && typeof data.result === 'string') {
              return;
            }

            // Handle subscription notifications
            if (data.method === 'eth_subscription' && data.params) {
              const result = data.params.result;

              // newHeads — result is a block header object with a hex block number
              if (result && typeof result === 'object' && result.number) {
                setBlockNumber(parseInt(result.number, 16));
                return;
              }

              // newPendingTransactions — result is a transaction hash string.
              // We fetch the full transaction to get from/to/value.
              if (typeof result === 'string') {
                // ----------------------------------------------------------------
                // eth_getTransactionByHash retrieves the full transaction details.
                //
                //   { "jsonrpc": "2.0", "id": 3, "method": "eth_getTransactionByHash", "params": ["0x...txhash"] }
                //
                // Response includes: { from, to, value, gas, gasPrice, input, ... }
                // ----------------------------------------------------------------
                ws.send(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: Math.floor(Math.random() * 1_000_000),
                    method: 'eth_getTransactionByHash',
                    params: [result],
                  }),
                );
              }
            }

            // Handle eth_getTransactionByHash responses
            if (data.result && typeof data.result === 'object' && data.result.from) {
              processTx(data.result);
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          if (cancelled) return;
          ws.close();
        };

        ws.onclose = () => {
          if (cancelled) return;
          setConnected(false);
          wsRef.current = null;
          // Fall back to demo mode if connection drops
          startDemoMode();
        };
      } catch {
        // WebSocket constructor failed — fall back to demo mode
        if (!cancelled) startDemoMode();
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (demoTimerRef.current) {
        clearInterval(demoTimerRef.current);
        demoTimerRef.current = null;
      }
    };
  }, [processTx, startDemoMode]);

  return {
    nodes,
    edges,
    connected,
    blockNumber,
    txCount: txCountRef.current,
  };
}
