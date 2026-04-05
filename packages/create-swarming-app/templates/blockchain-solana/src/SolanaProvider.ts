import { useCallback, useEffect, useRef, useState } from "react";
import {
  SOLANA_WS_URL,
  DEX_PROGRAMS,
  MAX_NODES,
  MAX_EDGES,
  DEMO_INTERVAL_MS,
} from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwapNode {
  tokenAddress: string;
  symbol: string;
  name: string;
  chain: string;
  trades: number;
  volume: number;
  nativeSymbol: string;
  source: string;
}

export interface SwapEdge {
  trader: string;
  tokenAddress: string;
  chain: string;
  trades: number;
  volume: number;
  source: string;
}

export interface SolanaStreamState {
  nodes: SwapNode[];
  edges: SwapEdge[];
  connected: boolean;
  stats: {
    txCount: number;
    nodeCount: number;
  };
}

// ---------------------------------------------------------------------------
// Demo data helpers — used as a fallback when the WebSocket cannot connect
// ---------------------------------------------------------------------------

const DEMO_TOKENS = [
  { symbol: "SOL", name: "Solana" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "RAY", name: "Raydium" },
  { symbol: "JUP", name: "Jupiter" },
  { symbol: "BONK", name: "Bonk" },
  { symbol: "WIF", name: "dogwifhat" },
  { symbol: "JTO", name: "Jito" },
  { symbol: "PYTH", name: "Pyth Network" },
  { symbol: "ORCA", name: "Orca" },
  { symbol: "MNGO", name: "Mango Markets" },
];

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * 16)];
  return out;
}

function generateDemoSwap(): { node: SwapNode; edge: SwapEdge } {
  const token = DEMO_TOKENS[Math.floor(Math.random() * DEMO_TOKENS.length)];
  const address = randomHex(44);
  const trader = randomHex(44);
  const volume = Math.random() * 100;

  return {
    node: {
      tokenAddress: address,
      symbol: token.symbol,
      name: token.name,
      chain: "solana",
      trades: 1,
      volume,
      nativeSymbol: "SOL",
      source: "demo",
    },
    edge: {
      trader,
      tokenAddress: address,
      chain: "solana",
      trades: 1,
      volume,
      source: "demo",
    },
  };
}

// ---------------------------------------------------------------------------
// Solana log parsing
// ---------------------------------------------------------------------------

/**
 * Attempt to extract a token address from Solana transaction log lines.
 *
 * Real-world DEX swap logs include program invocations, token mint addresses,
 * and transfer instructions. This parser looks for common patterns emitted by
 * Raydium and Jupiter programs. For production use you would decode the full
 * instruction data via the IDL — this simplified version extracts addresses
 * that appear alongside "Transfer" or "Swap" keywords.
 */
function parseSwapFromLogs(
  logs: string[],
  signature: string,
): { node: SwapNode; edge: SwapEdge } | null {
  // Look for a token address mentioned in a Transfer/Swap log line
  let tokenAddress: string | null = null;
  let symbol = "UNKNOWN";

  for (const line of logs) {
    // Match base58 addresses (32–44 chars) near swap-related keywords
    const match = line.match(
      /(?:Transfer|Swap|swap)\s.*?([1-9A-HJ-NP-Za-km-z]{32,44})/,
    );
    if (match) {
      tokenAddress = match[1];
      break;
    }
  }

  if (!tokenAddress) return null;

  // Derive a human-readable symbol from the first 4 chars (placeholder)
  symbol = tokenAddress.slice(0, 4).toUpperCase();

  const volume = Math.random() * 50 + 0.1;

  return {
    node: {
      tokenAddress,
      symbol,
      name: `Token ${symbol}`,
      chain: "solana",
      trades: 1,
      volume,
      nativeSymbol: "SOL",
      source: "solana-ws",
    },
    edge: {
      trader: signature,
      tokenAddress,
      chain: "solana",
      trades: 1,
      volume,
      source: "solana-ws",
    },
  };
}

// ---------------------------------------------------------------------------
// Hook: useSolanaStream
// ---------------------------------------------------------------------------

/**
 * React hook that connects to the Solana mainnet WebSocket JSON-RPC API
 * and subscribes to transaction logs mentioning known DEX program IDs.
 *
 * ## Solana WebSocket API overview
 *
 * Solana validators expose a JSON-RPC WebSocket endpoint that supports
 * pub/sub subscriptions. The `logsSubscribe` method streams transaction
 * logs in real time. You can filter by:
 *
 * - `"all"` — every transaction
 * - `{ "mentions": ["<programId>"] }` — only transactions that reference
 *   a specific program (e.g. a DEX).
 *
 * Each notification contains:
 * ```json
 * {
 *   "jsonrpc": "2.0",
 *   "method": "logsNotification",
 *   "params": {
 *     "result": {
 *       "value": {
 *         "signature": "<tx-signature>",
 *         "err": null,
 *         "logs": ["Program 675kPX... invoke", "Transfer ...", ...]
 *       }
 *     },
 *     "subscription": 123
 *   }
 * }
 * ```
 *
 * We parse the `logs` array to extract token addresses involved in swaps
 * and build a live graph of token nodes connected by swap edges.
 *
 * If the connection fails or is unavailable (e.g. rate-limited), the hook
 * automatically falls back to demo mode which generates synthetic data.
 */
export function useSolanaStream(): SolanaStreamState {
  const [nodes, setNodes] = useState<SwapNode[]>([]);
  const [edges, setEdges] = useState<SwapEdge[]>([]);
  const [connected, setConnected] = useState(false);
  const [txCount, setTxCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionIds = useRef<number[]>([]);

  // -----------------------------------------------------------------------
  // Append helpers that respect MAX_NODES / MAX_EDGES bounds
  // -----------------------------------------------------------------------

  const appendNode = useCallback((node: SwapNode) => {
    setNodes((prev) => {
      // Deduplicate by tokenAddress, increment trades if already present
      const idx = prev.findIndex(
        (n) => n.tokenAddress === node.tokenAddress,
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          trades: updated[idx].trades + node.trades,
          volume: updated[idx].volume + node.volume,
        };
        return updated;
      }
      const next = [...prev, node];
      return next.length > MAX_NODES ? next.slice(-MAX_NODES) : next;
    });
  }, []);

  const appendEdge = useCallback((edge: SwapEdge) => {
    setEdges((prev) => {
      const next = [...prev, edge];
      return next.length > MAX_EDGES ? next.slice(-MAX_EDGES) : next;
    });
  }, []);

  // -----------------------------------------------------------------------
  // Demo mode — generates a fake swap event every DEMO_INTERVAL_MS
  // -----------------------------------------------------------------------

  const startDemo = useCallback(() => {
    if (demoTimerRef.current) return;
    demoTimerRef.current = setInterval(() => {
      const { node, edge } = generateDemoSwap();
      appendNode(node);
      appendEdge(edge);
      setTxCount((c) => c + 1);
    }, DEMO_INTERVAL_MS);
  }, [appendNode, appendEdge]);

  const stopDemo = useCallback(() => {
    if (demoTimerRef.current) {
      clearInterval(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  // -----------------------------------------------------------------------
  // WebSocket connection to Solana mainnet
  // -----------------------------------------------------------------------

  useEffect(() => {
    let disposed = false;

    function connect() {
      try {
        const ws = new WebSocket(SOLANA_WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (disposed) return;
          setConnected(true);
          stopDemo();

          // Subscribe to logs for each known DEX program.
          // The `logsSubscribe` RPC method accepts a filter object with
          // a `mentions` array containing exactly one program ID.
          let reqId = 1;
          for (const programId of Object.values(DEX_PROGRAMS)) {
            const subscribeMsg = {
              jsonrpc: "2.0",
              id: reqId++,
              method: "logsSubscribe",
              params: [
                { mentions: [programId] },
                { commitment: "confirmed" },
              ],
            };
            ws.send(JSON.stringify(subscribeMsg));
          }
        };

        ws.onmessage = (event) => {
          if (disposed) return;

          try {
            const data = JSON.parse(event.data as string);

            // Handle subscription confirmations — store the subscription ID
            // so we can unsubscribe on cleanup.
            if (data.result !== undefined && typeof data.result === "number") {
              subscriptionIds.current.push(data.result);
              return;
            }

            // Handle log notifications
            if (data.method === "logsNotification") {
              const value = data.params?.result?.value;
              if (!value || value.err) return;

              const parsed = parseSwapFromLogs(
                value.logs ?? [],
                value.signature ?? randomHex(88),
              );
              if (parsed) {
                appendNode(parsed.node);
                appendEdge(parsed.edge);
                setTxCount((c) => c + 1);
              }
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onerror = () => {
          if (disposed) return;
          setConnected(false);
          // Fall back to demo mode on error
          startDemo();
        };

        ws.onclose = () => {
          if (disposed) return;
          setConnected(false);
          // Fall back to demo mode on disconnect
          startDemo();
        };
      } catch {
        // WebSocket constructor can throw if the URL is invalid
        if (!disposed) startDemo();
      }
    }

    connect();

    return () => {
      disposed = true;
      stopDemo();

      // Unsubscribe from all active subscriptions before closing
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        let reqId = 100;
        for (const subId of subscriptionIds.current) {
          ws.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: reqId++,
              method: "logsUnsubscribe",
              params: [subId],
            }),
          );
        }
        ws.close();
      }
      subscriptionIds.current = [];
      wsRef.current = null;
    };
  }, [appendNode, appendEdge, startDemo, stopDemo]);

  return {
    nodes,
    edges,
    connected,
    stats: {
      txCount,
      nodeCount: nodes.length,
    },
  };
}
