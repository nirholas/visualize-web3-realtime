// ---------------------------------------------------------------------------
// Collaboration Types
// ---------------------------------------------------------------------------

/** Configuration for collaborative/multiplayer mode */
export interface CollaborationConfig {
  /** Room identifier — users in the same room see each other */
  room: string;
  /** WebSocket relay server URL */
  server: string;
  /** Display name for this user */
  username: string;
  /** Cursor/avatar color (hex) */
  color?: string;
  /** Enable camera follow mode (default: false) */
  followMode?: boolean;
}

/** A connected peer in the room */
export interface Peer {
  /** Unique peer ID (assigned by server) */
  id: string;
  /** Display name */
  username: string;
  /** Cursor/avatar color */
  color: string;
  /** 3D cursor position in scene space */
  cursor: [number, number, number] | null;
  /** Camera position */
  camera: [number, number, number] | null;
  /** Camera look-at target */
  cameraTarget: [number, number, number] | null;
  /** Currently selected node ID */
  selectedNode: string | null;
  /** Whether this peer is the presenter */
  isPresenter: boolean;
  /** Last activity timestamp */
  lastSeen: number;
}

/** Annotation placed on a node */
export interface Annotation {
  id: string;
  /** Node ID this annotation is attached to */
  nodeId: string;
  /** Text content */
  text: string;
  /** Author peer ID */
  authorId: string;
  /** Author username */
  authorName: string;
  /** Author color */
  authorColor: string;
  /** Timestamp */
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Wire protocol messages (client <-> server)
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: 'join'; room: string; username: string; color: string }
  | { type: 'cursor'; position: [number, number, number] | null }
  | { type: 'camera'; position: [number, number, number]; target: [number, number, number] }
  | { type: 'select'; nodeId: string | null }
  | { type: 'annotate'; annotation: Omit<Annotation, 'id' | 'authorId' | 'authorName' | 'authorColor'> }
  | { type: 'removeAnnotation'; annotationId: string }
  | { type: 'presenter'; enabled: boolean }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'welcome'; peerId: string; peers: Peer[]; annotations: Annotation[] }
  | { type: 'peerJoined'; peer: Peer }
  | { type: 'peerLeft'; peerId: string }
  | { type: 'peerUpdate'; peerId: string; update: Partial<Peer> }
  | { type: 'annotation'; annotation: Annotation }
  | { type: 'annotationRemoved'; annotationId: string }
  | { type: 'presenterChanged'; peerId: string | null }
  | { type: 'pong' }
  | { type: 'error'; message: string };

/** Connection state of the sync engine */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Collaboration context value exposed to consumers */
export interface CollaborationState {
  /** Current connection state */
  connectionState: ConnectionState;
  /** This user's peer ID (null until connected) */
  peerId: string | null;
  /** All connected peers (excluding self) */
  peers: Peer[];
  /** All annotations in the room */
  annotations: Annotation[];
  /** Current presenter peer ID (null if no presenter) */
  presenterId: string | null;
  /** Whether this user is following another user's camera */
  followingPeerId: string | null;
  /** Update cursor position */
  updateCursor: (position: [number, number, number] | null) => void;
  /** Update camera position */
  updateCamera: (position: [number, number, number], target: [number, number, number]) => void;
  /** Select a node (visible to all peers) */
  selectNode: (nodeId: string | null) => void;
  /** Add an annotation to a node */
  addAnnotation: (nodeId: string, text: string) => void;
  /** Remove an annotation */
  removeAnnotation: (annotationId: string) => void;
  /** Toggle presenter mode */
  setPresenter: (enabled: boolean) => void;
  /** Follow another peer's camera */
  followPeer: (peerId: string | null) => void;
  /** Generate a shareable room URL */
  shareUrl: string | null;
}
