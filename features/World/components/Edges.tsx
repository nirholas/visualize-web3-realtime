'use client';

import React, { memo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation, ForceNode } from '../ForceGraph';
import { GRAPH_CONFIG } from '../constants';

const { MAX_EDGES } = GRAPH_CONFIG;

// Dark grey for the cyberpunk neural network aesthetic
const EDGE_GREY = 0.133; // #222222

/** Batch-rendered edges — very faint dark grey lines showing underlying structure */
export const Edges = memo(
  ({
    sim,
    activeProtocol,
    highlightedHubId,
    highlightedAddress,
  }: {
    sim: ForceGraphSimulation;
    activeProtocol?: string | null;
    highlightedHubId?: string | null;
    highlightedAddress?: string | null;
    isDark?: boolean;
  }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const posAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const colorAttr = useRef<THREE.Float32BufferAttribute | null>(null);
    const maxEdges = MAX_EDGES;

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

        // When a specific address is searched, slightly brighten that agent's edge
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
          // Slightly brighter grey for highlighted edges
          const hl = 0.35;
          cA.array[idx] = hl;
          cA.array[idx + 1] = hl;
          cA.array[idx + 2] = hl;
          cA.array[idx + 3] = hl;
          cA.array[idx + 4] = hl;
          cA.array[idx + 5] = hl;
        } else if (activeProtocol) {
          const srcRelated = src.id === activeProtocol || src.hubTokenAddress === activeProtocol;
          const tgtRelated = tgt.id === activeProtocol || tgt.hubTokenAddress === activeProtocol;
          const g = srcRelated || tgtRelated ? EDGE_GREY : 0.05;
          cA.array[idx] = g;
          cA.array[idx + 1] = g;
          cA.array[idx + 2] = g;
          cA.array[idx + 3] = g;
          cA.array[idx + 4] = g;
          cA.array[idx + 5] = g;
        } else {
          // Default: uniform dark grey (#222222)
          cA.array[idx] = EDGE_GREY;
          cA.array[idx + 1] = EDGE_GREY;
          cA.array[idx + 2] = EDGE_GREY;
          cA.array[idx + 3] = EDGE_GREY;
          cA.array[idx + 4] = EDGE_GREY;
          cA.array[idx + 5] = EDGE_GREY;
        }
      }

      pA.needsUpdate = true;
      cA.needsUpdate = true;
      lineRef.current.geometry.setDrawRange(0, count * 2);
    });

    return (
      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial vertexColors transparent opacity={0.4} toneMapped={false} />
      </lineSegments>
    );
  },
);

Edges.displayName = 'Edges';
