// ---------------------------------------------------------------------------
// CollaborationProvider — React context for multiplayer collaboration
//
// Wraps the SyncEngine and exposes collaboration state + actions to the
// component tree via React context.
// ---------------------------------------------------------------------------

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SyncEngine } from './SyncEngine';
import type {
  Annotation,
  CollaborationConfig,
  CollaborationState,
  ConnectionState,
  Peer,
} from './types';

const CollaborationContext = createContext<CollaborationState | null>(null);

export function useCollaboration(): CollaborationState | null {
  return useContext(CollaborationContext);
}

export function useCollaborationRequired(): CollaborationState {
  const ctx = useContext(CollaborationContext);
  if (!ctx) {
    throw new Error('useCollaborationRequired must be used within a CollaborationProvider');
  }
  return ctx;
}

interface CollaborationProviderProps {
  config: CollaborationConfig;
  children: React.ReactNode;
}

export function CollaborationProvider({ config, children }: CollaborationProviderProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  const [followingPeerId, setFollowingPeerId] = useState<string | null>(null);

  const engineRef = useRef<SyncEngine | null>(null);

  // Connect on mount, reconnect when config changes
  useEffect(() => {
    const engine = new SyncEngine(config, {
      onStateChange: setConnectionState,
      onWelcome: (id, initialPeers, initialAnnotations) => {
        setPeerId(id);
        setPeers(initialPeers);
        setAnnotations(initialAnnotations);
      },
      onPeerJoined: (peer) => {
        setPeers((prev) => [...prev.filter((p) => p.id !== peer.id), peer]);
      },
      onPeerLeft: (leftId) => {
        setPeers((prev) => prev.filter((p) => p.id !== leftId));
        setFollowingPeerId((prev) => (prev === leftId ? null : prev));
      },
      onPeerUpdate: (updateId, update) => {
        setPeers((prev) =>
          prev.map((p) => (p.id === updateId ? { ...p, ...update, lastSeen: Date.now() } : p)),
        );
      },
      onAnnotation: (annotation) => {
        setAnnotations((prev) => [...prev, annotation]);
      },
      onAnnotationRemoved: (annotationId) => {
        setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
      },
      onPresenterChanged: (newPresenterId) => {
        setPresenterId(newPresenterId);
      },
      onError: (message) => {
        console.warn('[swarming/collab]', message);
      },
    });

    engineRef.current = engine;
    engine.connect();

    return () => {
      engine.disconnect();
      engineRef.current = null;
    };
  }, [config.room, config.server, config.username, config.color]);

  const updateCursor = useCallback(
    (position: [number, number, number] | null) => {
      engineRef.current?.sendCursor(position);
    },
    [],
  );

  const updateCamera = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      engineRef.current?.sendCamera(position, target);
    },
    [],
  );

  const selectNode = useCallback((nodeId: string | null) => {
    engineRef.current?.sendSelect(nodeId);
  }, []);

  const addAnnotation = useCallback((nodeId: string, text: string) => {
    engineRef.current?.sendAnnotation(nodeId, text);
  }, []);

  const removeAnnotation = useCallback((annotationId: string) => {
    engineRef.current?.sendRemoveAnnotation(annotationId);
  }, []);

  const setPresenter = useCallback((enabled: boolean) => {
    engineRef.current?.sendPresenter(enabled);
  }, []);

  const followPeer = useCallback((targetPeerId: string | null) => {
    setFollowingPeerId(targetPeerId);
  }, []);

  const shareUrl = useMemo(() => {
    if (!config.room) return null;
    // Build a share URL — uses swarming.dev hosted viewer by default
    const base = 'https://swarming.dev/view';
    const params = new URLSearchParams({ room: config.room });
    return `${base}?${params.toString()}`;
  }, [config.room]);

  const value = useMemo<CollaborationState>(
    () => ({
      connectionState,
      peerId,
      peers,
      annotations,
      presenterId,
      followingPeerId,
      updateCursor,
      updateCamera,
      selectNode,
      addAnnotation,
      removeAnnotation,
      setPresenter,
      followPeer,
      shareUrl,
    }),
    [
      connectionState,
      peerId,
      peers,
      annotations,
      presenterId,
      followingPeerId,
      updateCursor,
      updateCamera,
      selectNode,
      addAnnotation,
      removeAnnotation,
      setPresenter,
      followPeer,
      shareUrl,
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
