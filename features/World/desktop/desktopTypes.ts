export type WindowId =
  | 'filters'
  | 'livefeed'
  | 'stats'
  | 'aichat'
  | 'share'
  | 'embed'
  | 'sources'
  | 'timeline';

export interface WindowState {
  id: WindowId;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface AppDefinition {
  id: WindowId;
  label: string;
  /** SVG path or emoji string */
  icon: string;
  /** Default window size */
  defaultSize: { width: number; height: number };
  /** Default window position (from top-left) */
  defaultPosition: { x: number; y: number };
  /** Whether this app shows in the taskbar even when closed */
  pinned: boolean;
  /** Short description for start menu */
  description?: string;
}
