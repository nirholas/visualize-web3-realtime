// ============================================================================
// Persistence — Save/load strategies for editor graphs
// ============================================================================

import type { EditorGraph, PersistenceConfig } from './types';

export interface PersistenceStrategy {
  save(graph: EditorGraph): void;
  load(): EditorGraph | null;
}

export function createPersistence(config: PersistenceConfig): PersistenceStrategy {
  switch (config.type) {
    case 'localStorage':
      return new LocalStoragePersistence(config.key ?? 'swarming-editor');
    case 'url':
      return new UrlPersistence();
    case 'callback':
      return new CallbackPersistence(config.onSave, config.onLoad);
  }
}

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------

class LocalStoragePersistence implements PersistenceStrategy {
  constructor(private key: string) {}

  save(graph: EditorGraph): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(graph));
    } catch {
      // Storage full or unavailable
    }
  }

  load(): EditorGraph | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw) as EditorGraph;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// URL hash encoding
// ---------------------------------------------------------------------------

class UrlPersistence implements PersistenceStrategy {
  save(graph: EditorGraph): void {
    try {
      const json = JSON.stringify(graph);
      const encoded = btoa(encodeURIComponent(json));
      window.history.replaceState(null, '', `#graph=${encoded}`);
    } catch {
      // Too large or encoding error
    }
  }

  load(): EditorGraph | null {
    try {
      const hash = window.location.hash;
      const match = hash.match(/^#graph=(.+)$/);
      if (!match) return null;
      const json = decodeURIComponent(atob(match[1]));
      return JSON.parse(json) as EditorGraph;
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Callback
// ---------------------------------------------------------------------------

class CallbackPersistence implements PersistenceStrategy {
  constructor(
    private onSave?: (graph: EditorGraph) => void,
    private onLoadFn?: () => EditorGraph | null,
  ) {}

  save(graph: EditorGraph): void {
    this.onSave?.(graph);
  }

  load(): EditorGraph | null {
    return this.onLoadFn?.() ?? null;
  }
}
