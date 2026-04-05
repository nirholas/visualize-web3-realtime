// ============================================================================
// GLRenderer — Native GPU rendering via expo-gl
//
// Uses expo-gl to render the force-directed graph natively on the GPU.
// Falls back to WebViewFallback if expo-gl is not available.
//
// This renderer draws a 2D projection of the 3D force graph using native
// GL calls, optimized for mobile performance (instanced circles, line segments).
// ============================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { View, type ViewStyle } from 'react-native';
import { ForceGraphSimulation, type TopToken, type TraderEdge } from '@web3viz/core';
import type { ThemeColors, PerformanceConfig } from './types';

interface GLRendererProps {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  themeColors: ThemeColors;
  performanceConfig: PerformanceConfig;
  style?: ViewStyle;
  onNodeTap?: (index: number) => void;
  onReady?: () => void;
}

/** Try to dynamically import expo-gl */
function tryGetGLView(): React.ComponentType<{
  style?: ViewStyle;
  onContextCreate: (gl: WebGLRenderingContext) => void;
}> | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GLView } = require('expo-gl');
    return GLView;
  } catch {
    return null;
  }
}

/** Parse hex color to [r, g, b, a] floats */
function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
      1.0,
    ];
  }
  return [0.4, 0.4, 1.0, 1.0];
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  uniform vec2 u_resolution;
  uniform vec2 u_offset;
  uniform float u_scale;
  varying vec4 v_color;
  void main() {
    vec2 pos = (a_position - u_offset) * u_scale;
    vec2 clipSpace = (pos / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    gl_PointSize = 6.0 * u_scale;
    v_color = a_color;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec4 v_color;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function GLRenderer({
  topTokens,
  traderEdges,
  themeColors,
  performanceConfig,
  style,
  onReady,
}: GLRendererProps) {
  const simRef = useRef<ForceGraphSimulation | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const frameRef = useRef<number>(0);

  const GLView = tryGetGLView();

  // Keep simulation updated
  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new ForceGraphSimulation();
    }
    simRef.current.updateData(topTokens, traderEdges);
  }, [topTokens, traderEdges]);

  const onContextCreate = useCallback(
    (gl: WebGLRenderingContext) => {
      glRef.current = gl;

      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vs || !fs) return;

      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      programRef.current = program;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      onReady?.();

      const bgColor = hexToRgba(themeColors.background);
      const nodeColor = hexToRgba(themeColors.nodeColor);
      const edgeColor = hexToRgba(themeColors.edgeColor);

      const targetInterval = 1000 / performanceConfig.targetFps;
      let lastFrame = 0;

      function render(time: number) {
        frameRef.current = requestAnimationFrame(render);

        if (time - lastFrame < targetInterval) return;
        lastFrame = time;

        const sim = simRef.current;
        if (!sim || !programRef.current) return;

        sim.tick();

        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], bgColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(programRef.current);

        const width = gl.drawingBufferWidth;
        const height = gl.drawingBufferHeight;
        gl.viewport(0, 0, width, height);

        const uResolution = gl.getUniformLocation(programRef.current, 'u_resolution');
        const uOffset = gl.getUniformLocation(programRef.current, 'u_offset');
        const uScale = gl.getUniformLocation(programRef.current, 'u_scale');
        gl.uniform2f(uResolution, width, height);
        gl.uniform2f(uOffset, -width / 2, -height / 2);
        gl.uniform1f(uScale, 1.0);

        const nodes = sim.nodes;
        const maxNodes = performanceConfig.maxNodes;
        const count = Math.min(nodes.length, maxNodes);

        // Draw edges as GL_LINES
        if (sim.edges.length > 0) {
          const edgeCount = Math.min(sim.edges.length, maxNodes * 2);
          const edgePositions = new Float32Array(edgeCount * 4);
          const edgeColors = new Float32Array(edgeCount * 8);
          let ei = 0;
          for (let i = 0; i < edgeCount; i++) {
            const edge = sim.edges[i];
            const src = edge.source as { x?: number; y?: number } | undefined;
            const tgt = edge.target as { x?: number; y?: number } | undefined;
            if (!src || !tgt) continue;
            edgePositions[ei * 4] = (src.x ?? 0) + width / 2;
            edgePositions[ei * 4 + 1] = (src.y ?? 0) + height / 2;
            edgePositions[ei * 4 + 2] = (tgt.x ?? 0) + width / 2;
            edgePositions[ei * 4 + 3] = (tgt.y ?? 0) + height / 2;
            for (let c = 0; c < 2; c++) {
              edgeColors[ei * 8 + c * 4] = edgeColor[0];
              edgeColors[ei * 8 + c * 4 + 1] = edgeColor[1];
              edgeColors[ei * 8 + c * 4 + 2] = edgeColor[2];
              edgeColors[ei * 8 + c * 4 + 3] = edgeColor[3];
            }
            ei++;
          }
          const edgePosAttr = gl.getAttribLocation(programRef.current, 'a_position');
          const edgeColAttr = gl.getAttribLocation(programRef.current, 'a_color');
          const epBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, epBuf);
          gl.bufferData(gl.ARRAY_BUFFER, edgePositions.subarray(0, ei * 4), gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(edgePosAttr);
          gl.vertexAttribPointer(edgePosAttr, 2, gl.FLOAT, false, 0, 0);
          const ecBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, ecBuf);
          gl.bufferData(gl.ARRAY_BUFFER, edgeColors.subarray(0, ei * 8), gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(edgeColAttr);
          gl.vertexAttribPointer(edgeColAttr, 4, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINES, 0, ei * 2);
          gl.deleteBuffer(epBuf);
          gl.deleteBuffer(ecBuf);
        }

        // Draw nodes as GL_POINTS
        if (count > 0) {
          const positions = new Float32Array(count * 2);
          const colors = new Float32Array(count * 4);
          for (let i = 0; i < count; i++) {
            const node = nodes[i];
            positions[i * 2] = (node.x ?? 0) + width / 2;
            positions[i * 2 + 1] = (node.y ?? 0) + height / 2;
            const c = node.type === 'hub'
              ? hexToRgba(themeColors.hubGlow)
              : nodeColor;
            colors[i * 4] = c[0];
            colors[i * 4 + 1] = c[1];
            colors[i * 4 + 2] = c[2];
            colors[i * 4 + 3] = c[3];
          }

          const posAttr = gl.getAttribLocation(programRef.current, 'a_position');
          const colAttr = gl.getAttribLocation(programRef.current, 'a_color');

          const posBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
          gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(posAttr);
          gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

          const colBuf = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
          gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(colAttr);
          gl.vertexAttribPointer(colAttr, 4, gl.FLOAT, false, 0, 0);

          gl.drawArrays(gl.POINTS, 0, count);
          gl.deleteBuffer(posBuf);
          gl.deleteBuffer(colBuf);
        }

        // Flush for expo-gl
        (gl as unknown as { endFrameEXP?: () => void }).endFrameEXP?.();
      }

      frameRef.current = requestAnimationFrame(render);
    },
    [themeColors, performanceConfig, onReady],
  );

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  if (!GLView) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
        {/* Fallback message — consumer should use WebViewFallback instead */}
      </View>
    );
  }

  return <GLView style={[{ flex: 1 }, style]} onContextCreate={onContextCreate} />;
}
