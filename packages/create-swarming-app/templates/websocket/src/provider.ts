import { useState, useEffect, useRef, useCallback } from "react";

interface SwarmNode {
  id: string;
  label: string;
  group: string;
  value: number;
}

interface SwarmEdge {
  source: string;
  target: string;
}

interface SwarmMessage {
  type: "node-add" | "edge-add" | "node-remove";
  payload: Record<string, unknown>;
}

interface SwarmSocketState {
  nodes: SwarmNode[];
  edges: SwarmEdge[];
  connected: boolean;
}

const WS_URL = "ws://localhost:8080";
const MAX_BACKOFF = 30_000;

export function useSwarmSocket(): SwarmSocketState {
  const [nodes, setNodes] = useState<SwarmNode[]>([]);
  const [edges, setEdges] = useState<SwarmEdge[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      backoffRef.current = 1000; // Reset backoff on successful connection
    };

    ws.onclose = () => {
      setConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: SwarmMessage;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      switch (msg.type) {
        case "node-add": {
          const node = msg.payload as unknown as SwarmNode;
          setNodes((prev) => {
            // Avoid duplicates
            if (prev.some((n) => n.id === node.id)) return prev;
            return [...prev, node];
          });
          break;
        }
        case "edge-add": {
          const edge = msg.payload as unknown as SwarmEdge;
          setEdges((prev) => [...prev, edge]);
          break;
        }
        case "node-remove": {
          const { id } = msg.payload as { id: string };
          setNodes((prev) => prev.filter((n) => n.id !== id));
          setEdges((prev) =>
            prev.filter((e) => e.source !== id && e.target !== id)
          );
          break;
        }
      }
    };
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    const delay = backoffRef.current;
    backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { nodes, edges, connected };
}
