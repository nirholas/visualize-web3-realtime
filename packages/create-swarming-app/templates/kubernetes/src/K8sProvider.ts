import { useState, useEffect, useRef, useCallback } from "react";
import { POD_STATUS_COLORS, getNamespaceColor } from "./pod-colors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface K8sPod {
  metadata: {
    name: string;
    namespace: string;
    uid: string;
    labels?: Record<string, string>;
    ownerReferences?: Array<{ kind: string; name: string; uid: string }>;
  };
  status: {
    phase: string;
  };
}

interface K8sPodList {
  items: K8sPod[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  value: number;
  color?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  value: number;
}

export interface K8sPodsResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  namespaces: string[];
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Demo data (used when kubectl proxy is not available)
// ---------------------------------------------------------------------------

const DEMO_NAMESPACES = ["default", "kube-system", "monitoring", "app"];

const DEMO_DEPLOYMENTS: Record<string, string[]> = {
  default: ["nginx", "redis", "api-server"],
  "kube-system": [
    "coredns",
    "kube-proxy",
    "etcd",
    "kube-apiserver",
    "kube-scheduler",
  ],
  monitoring: ["prometheus", "grafana", "alertmanager"],
  app: ["frontend", "backend", "worker", "celery-beat"],
};

const DEMO_STATUSES = ["Running", "Running", "Running", "Running", "Pending", "Succeeded", "Failed"];

function generateDemoData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let podIndex = 0;

  for (const ns of DEMO_NAMESPACES) {
    const deployments = DEMO_DEPLOYMENTS[ns];
    for (const deployment of deployments) {
      const replicaCount = Math.floor(Math.random() * 3) + 1;
      const podIds: string[] = [];

      for (let r = 0; r < replicaCount; r++) {
        const status =
          DEMO_STATUSES[Math.floor(Math.random() * DEMO_STATUSES.length)];
        const id = `pod-${podIndex++}`;
        podIds.push(id);

        nodes.push({
          id,
          label: `${deployment}-${randomSuffix()}`,
          group: ns,
          value: 30 + Math.floor(Math.random() * 70),
          color: POD_STATUS_COLORS[status] ?? POD_STATUS_COLORS.Unknown,
        });
      }

      // Connect pods in the same deployment (replicaset relationship)
      for (let i = 1; i < podIds.length; i++) {
        edges.push({ source: podIds[0], target: podIds[i], value: 3 });
      }
    }

    // Connect first pod of each deployment within the namespace
    const nsNodes = nodes.filter((n) => n.group === ns);
    for (let i = 1; i < deployments.length; i++) {
      const a = nsNodes.find((n) =>
        n.label.startsWith(deployments[i - 1])
      );
      const b = nsNodes.find((n) => n.label.startsWith(deployments[i]));
      if (a && b) {
        edges.push({ source: a.id, target: b.id, value: 1 });
      }
    }
  }

  return { nodes, edges };
}

function randomSuffix(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 5; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Polls the Kubernetes API for pod data and maps it to graph nodes and edges.
 *
 * Prerequisites:
 *   1. Run `kubectl proxy` in a separate terminal (defaults to port 8001).
 *   2. The Vite dev server proxies `/api` requests to `http://localhost:8001`.
 *
 * If the API is unreachable the hook falls back to demo mode with realistic
 * fake cluster data.
 */
export function useK8sPods(pollIntervalMs = 5000): K8sPodsResult {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const demoMode = useRef(false);
  const demoData = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(
    null
  );

  const fetchPods = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/pods");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: K8sPodList = await res.json();
      const podNodes: GraphNode[] = [];
      const podEdges: GraphEdge[] = [];
      const nsSet = new Set<string>();

      // Group pods by owner (deployment / replicaset)
      const ownerToPods = new Map<string, string[]>();

      for (const pod of data.items) {
        const ns = pod.metadata.namespace;
        const status = pod.status.phase;
        nsSet.add(ns);

        const node: GraphNode = {
          id: pod.metadata.uid,
          label: pod.metadata.name,
          group: ns,
          value: 50,
          color: POD_STATUS_COLORS[status] ?? POD_STATUS_COLORS.Unknown,
        };
        podNodes.push(node);

        // Track owner relationships for edge creation
        const owner = pod.metadata.ownerReferences?.[0];
        if (owner) {
          const key = `${ns}/${owner.name}`;
          const list = ownerToPods.get(key) ?? [];
          list.push(pod.metadata.uid);
          ownerToPods.set(key, list);
        }
      }

      // Create edges: pods sharing the same owner (deployment/replicaset)
      for (const [, podIds] of ownerToPods) {
        for (let i = 1; i < podIds.length; i++) {
          podEdges.push({ source: podIds[0], target: podIds[i], value: 3 });
        }
      }

      setNodes(podNodes);
      setEdges(podEdges);
      setNamespaces(Array.from(nsSet).sort());
      setLoading(false);
      demoMode.current = false;
    } catch {
      // API unavailable — fall back to demo mode
      if (!demoMode.current) {
        demoMode.current = true;
        demoData.current = generateDemoData();
      }
      const demo = demoData.current!;
      setNodes(demo.nodes);
      setEdges(demo.edges);
      setNamespaces(DEMO_NAMESPACES);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPods();
    const id = setInterval(fetchPods, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchPods, pollIntervalMs]);

  return { nodes, edges, namespaces, loading };
}
