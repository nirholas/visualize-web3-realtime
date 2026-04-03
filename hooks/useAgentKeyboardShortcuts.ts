'use client';

import { useEffect } from 'react';
import type { AgentIdentity } from '@web3viz/core';

interface UseAgentKeyboardShortcutsOptions {
  agents: Map<string, AgentIdentity>;
  onSelectAgent: (agentId: string | null) => void;
  onTogglePlay: () => void;
  onFitCamera: () => void;
  onToggleFeed?: () => void;
  onCloseInspector?: () => void;
  onStepBackward?: () => void;
  onStepForward?: () => void;
}

export function useAgentKeyboardShortcuts({
  agents,
  onSelectAgent,
  onTogglePlay,
  onFitCamera,
  onToggleFeed,
  onCloseInspector,
  onStepBackward,
  onStepForward,
}: UseAgentKeyboardShortcutsOptions) {
  useEffect(() => {
    const agentList = Array.from(agents.values());

    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire shortcuts when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'Escape':
          onSelectAgent(null);
          onCloseInspector?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onStepBackward?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onStepForward?.();
          break;
        case 'KeyF':
          onFitCamera();
          break;
        case 'KeyL':
          onToggleFeed?.();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9': {
          const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
          if (idx < agentList.length) {
            onSelectAgent(agentList[idx].agentId);
          }
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agents, onSelectAgent, onTogglePlay, onFitCamera, onToggleFeed, onCloseInspector, onStepBackward, onStepForward]);
}
