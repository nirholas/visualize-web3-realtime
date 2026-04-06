'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation, ForceNode } from '../ForceGraph';
import { GRAPH_CONFIG } from '../constants';

const { MAX_EDGES, EDGE_HIGHLIGHT_R, EDGE_HIGHLIGHT_G, EDGE_HIGHLIGHT_B } = GRAPH_CONFIG;

/** Batch-rendered edges via LineSegments */
export const Edges = memo(
  ({
    sim,
    activeProtocol,
    highlightedHubId,
    highlightedAddress,
    isDark = true,
  }: {
    sim: ForceGraphSimulation;
    activeProtocol?: string | null;
    highlightedHubId?: string | null;
    /** When set, only the edge from this agent address is highlighted (not all hub edges) */
    highlightedAddress?: string | null;
    isDark?: boolean;
  }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const maxEdges = MAX_EDGES;
    const edgeColor = useMemo(() => new THREE.Color(), []);

    useEffect(() => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(maxEdges * 6);
      const colors = new Float32Array(maxEdges * 6);
      const pAttr = new THREE.Float32BufferAttribute(positions, 3);
      const cAttr = new THREE.Float32BufferAttribute(colors, 3);
      pAttr.setUsage(THREE.DynamicDrawUsage);
      cAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', pAttr);
      geo.setAttribute('color', cAttr);
      geo.setDrawRange(0, 0);
      posAttr.current = pAttr;
      colorAttr.current = cAttr;

      if (lineRef.current) {
        lineRef.current.geometry.dispose();
        lineRef.current.geometry = geo;
      }
    }, []);

    useFrame(() => {
      const pA = posAttr.current;
      const cA = colorAttr.current;
      if (!pA || !cA || !lineRef.current) return;

      const edges = sim.edges;
      const count = Math.min(edges.length, maxEdges);

      for (let i = 0; i < count; i++) {
        const edge = edges[i];
        const src = edge.source as ForceNode;
        const tgt = edge.target as ForceNode;
        const idx = i * 6;

        pA.array[idx] = src.x ?? 0;
        pA.array[idx + 1] = src.y ?? 0;
        pA.array[idx + 2] = src.z ?? 0;
        pA.array[idx + 3] = tgt.x ?? 0;
        pA.array[idx + 4] = tgt.y ?? 0;
        pA.array[idx + 5] = tgt.z ?? 0;

        const isHubEdge = src.type === 'hub' && tgt.type === 'hub';

        // When a specific address is searched, only highlight that agent's edge
        let isHighlightEdge: boolean;
        if (highlightedAddress) {
          const searchLower = highlightedAddress.toLowerCase();
          const srcParts = src.id.split(':');
          const tgtParts = tgt.id.split(':');
          isHighlightEdge =
            (srcParts.length >= 2 && srcParts[1].toLowerCase() === searchLower) ||
            (tgtParts.length >= 2 && tgtParts[1].toLowerCase() === searchLower);
        } else {
          isHighlightEdge = !!(
            highlightedHubId &&
            (src.id === highlightedHubId ||
              tgt.id === highlightedHubId ||
              src.hubTokenAddress === highlightedHubId ||
              tgt.hubTokenAddress === highlightedHubId)
          );
        }

        if (isHighlightEdge) {
          // Bright values > 1.0 trigger selective bloom via toneMapped={false}
          cA.array[idx] = EDGE_HIGHLIGHT_R;
          cA.array[idx + 1] = EDGE_HIGHLIGHT_G;
          cA.array[idx + 2] = EDGE_HIGHLIGHT_B;
          cA.array[idx + 3] = EDGE_HIGHLIGHT_R;
          cA.array[idx + 4] = EDGE_HIGHLIGHT_G;
          cA.array[idx + 5] = EDGE_HIGHLIGHT_B;
        } else if (!isHubEdge && (src.isWhale || tgt.isWhale)) {
          // Whale trader edges: bright teal
          cA.array[idx] = 0.22;
          cA.array[idx + 1] = 0.74;
          cA.array[idx + 2] = 0.97;
          cA.array[idx + 3] = 0.22;
          cA.array[idx + 4] = 0.74;
          cA.array[idx + 5] = 0.97;
        } else if (!isHubEdge && (src.isSniper || tgt.isSniper)) {
          // Sniper bot edges: bright orange
          cA.array[idx] = 0.98;
          cA.array[idx + 1] = 0.45;
          cA.array[idx + 2] = 0.09;
          cA.array[idx + 3] = 0.98;
          cA.array[idx + 4] = 0.45;
          cA.array[idx + 5] = 0.09;
        } else {
          // Derive color from the hub node's chain color
          const hubNode = src.type === 'hub' ? src : tgt.type === 'hub' ? tgt : null;
          let attenuation: number;

          if (activeProtocol) {
            const srcRelated = src.id === activeProtocol || src.hubTokenAddress === activeProtocol;
            const tgtRelated = tgt.id === activeProtocol || tgt.hubTokenAddress === activeProtocol;
            attenuation = srcRelated || tgtRelated ? (isHubEdge ? 0.55 : 0.4) : 0.08;
          } else {
            attenuation = isDark ? (isHubEdge ? 0.6 : 0.4) : isHubEdge ? 0.35 : 0.25;
          }

          if (hubNode && hubNode.color) {
            edgeColor.set(hubNode.color);
            cA.array[idx] = edgeColor.r * attenuation;
            cA.array[idx + 1] = edgeColor.g * attenuation;
            cA.array[idx + 2] = edgeColor.b * attenuation;
            cA.array[idx + 3] = edgeColor.r * attenuation;
            cA.array[idx + 4] = edgeColor.g * attenuation;
            cA.array[idx + 5] = edgeColor.b * attenuation;
          } else {
            const gray = attenuation;
            cA.array[idx] = gray;
            cA.array[idx + 1] = gray;
            cA.array[idx + 2] = gray;
            cA.array[idx + 3] = gray;
            cA.array[idx + 4] = gray;
            cA.array[idx + 5] = gray;
          }
        }
      }

      pA.needsUpdate = true;
      cA.needsUpdate = true;
      lineRef.current.geometry.setDrawRange(0, count * 2);
    });

    return (
      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial vertexColors transparent opacity={0.08} toneMapped={false} />
      </lineSegments>
    );
  },
);

Edges.displayName = 'Edges';