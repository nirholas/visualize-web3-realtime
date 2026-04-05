'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { ControlValues } from '../lib/sharing';
import type { CompileResult } from '../lib/compiler';

interface PlaygroundPreviewProps {
  code: string;
  controls: ControlValues;
  onError: (error: string | null) => void;
}

// Module scope for lazy-loaded modules
let ForceGraphComponent: React.ComponentType<Record<string, unknown>> | null = null;
let reactModule: typeof import('react') | null = null;

async function loadForceGraph() {
  if (!ForceGraphComponent) {
    const mod = await import('@web3viz/react-graph');
    ForceGraphComponent = mod.ForceGraph;
  }
  return ForceGraphComponent;
}

async function loadReact() {
  if (!reactModule) {
    reactModule = await import('react');
  }
  return reactModule;
}

export function PlaygroundPreview({ code, controls, onError }: PlaygroundPreviewProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const prevCodeRef = useRef(code);

  // Compile user code and extract component
  useEffect(() => {
    // Debounce compilation by 300ms
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { compileCode } = await import('../lib/compiler');
        const result: CompileResult = await compileCode(code);

        if (!result.success || !result.code) {
          onError(result.error || 'Unknown compilation error');
          return;
        }

        const React = await loadReact();
        const ForceGraph = await loadForceGraph();

        // Create a module scope for the compiled code
        const scopeArgs = [
          'React',
          'useState',
          'useEffect',
          'useRef',
          'useMemo',
          'useCallback',
          'ForceGraph',
        ];
        const scopeValues = [
          React,
          React.useState,
          React.useEffect,
          React.useRef,
          React.useMemo,
          React.useCallback,
          ForceGraph,
        ];

        // eslint-disable-next-line no-new-func
        const factory = new Function(...scopeArgs, result.code);
        const UserComponent = factory(...scopeValues);

        if (typeof UserComponent === 'function') {
          onError(null);
          setComponent(() => UserComponent);
        } else {
          onError('No default export or App function found. Export a React component as default.');
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, onError]);

  // Merge controls into simulation config props
  const controlProps = useMemo(
    () => ({
      simulationConfig: {
        maxAgentNodes: controls.maxNodes,
        hubChargeStrength: controls.chargeStrength,
        hubLinkDistance: controls.linkDistance,
        centerStrength: controls.centerPull,
      },
      postProcessing: controls.bloom ? { bloom: true, bloomIntensity: 0.5 } : undefined,
      background: controls.background,
    }),
    [controls]
  );

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono">
        Loading preview...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ background: controls.background }}>
      <ErrorBoundary key={prevCodeRef.current !== code ? (prevCodeRef.current = code) : code}>
        <Component {...controlProps} />
      </ErrorBoundary>
    </div>
  );
}

// Error boundary to catch render errors in user code
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[Playground Preview]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="bg-red-900/50 border border-red-700/50 rounded-lg p-6 max-w-md text-center">
            <div className="text-red-300 font-semibold text-sm mb-2">Runtime Error</div>
            <pre className="text-red-200 text-xs font-mono whitespace-pre-wrap">
              {this.state.error}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
