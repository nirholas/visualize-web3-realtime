'use client';

// ============================================================================
// Toolbar — Editor toolbar with tool selection and actions
// ============================================================================

import React, { memo, useCallback } from 'react';
import type { EditorTool, LayoutType } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onLayout: (layout: LayoutType) => void;
  onExportJSON: () => void;
  onExportSVG: () => void;
  onExportMermaid: () => void;
  onImportJSON: () => void;
  onImportMermaid: () => void;
  physicsEnabled: boolean;
  onTogglePhysics: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const toolbarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 2,
  padding: '4px 8px',
  background: 'rgba(15, 15, 30, 0.92)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  zIndex: 50,
  flexWrap: 'wrap',
  justifyContent: 'center',
  fontFamily: 'monospace',
  fontSize: 12,
  userSelect: 'none',
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '5px 10px',
  background: 'transparent',
  color: '#a0a0c0',
  border: '1px solid transparent',
  borderRadius: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(99,102,241,0.3)',
  color: '#c4b5fd',
  borderColor: 'rgba(99,102,241,0.4)',
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  alignSelf: 'stretch',
  background: 'rgba(255,255,255,0.1)',
  margin: '0 4px',
};

// ---------------------------------------------------------------------------
// Tool button
// ---------------------------------------------------------------------------

const ToolBtn = memo<{
  label: string;
  tool?: EditorTool;
  activeTool?: EditorTool;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}>(function ToolBtn({ label, tool, activeTool, onClick, disabled, title, danger }) {
  const isActive = tool && tool === activeTool;
  const style: React.CSSProperties = {
    ...(isActive ? btnActive : btnBase),
    ...(disabled ? { opacity: 0.35, cursor: 'default' } : {}),
    ...(danger ? { color: '#ef4444' } : {}),
  };

  return (
    <button
      style={style}
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          e.currentTarget.style.color = '#e2e8f0';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = danger ? '#ef4444' : '#a0a0c0';
        }
      }}
    >
      {label}
    </button>
  );
});

// ---------------------------------------------------------------------------
// Layout dropdown
// ---------------------------------------------------------------------------

const LayoutDropdown = memo<{ onLayout: (layout: LayoutType) => void }>(function LayoutDropdown({ onLayout }) {
  const [open, setOpen] = React.useState(false);

  const layouts: Array<{ key: LayoutType; label: string }> = [
    { key: 'force', label: 'Force' },
    { key: 'hierarchical', label: 'Tree' },
    { key: 'circular', label: 'Circle' },
    { key: 'grid', label: 'Grid' },
    { key: 'radial', label: 'Radial' },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={btnBase}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a0a0c0'; }}
        title="Auto-arrange layout"
      >
        Layout
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '4px 0',
              minWidth: 120,
              zIndex: 51,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {layouts.map((l) => (
              <button
                key={l.key}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 16px',
                  background: 'none',
                  border: 'none',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                onClick={() => { onLayout(l.key); setOpen(false); }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Export dropdown
// ---------------------------------------------------------------------------

const ExportDropdown = memo<{
  onExportJSON: () => void;
  onExportSVG: () => void;
  onExportMermaid: () => void;
  onImportJSON: () => void;
  onImportMermaid: () => void;
}>(function ExportDropdown({ onExportJSON, onExportSVG, onExportMermaid, onImportJSON, onImportMermaid }) {
  const [open, setOpen] = React.useState(false);

  const items = [
    { label: 'Export JSON', action: onExportJSON },
    { label: 'Export SVG', action: onExportSVG },
    { label: 'Export Mermaid', action: onExportMermaid },
    { label: 'Import JSON', action: onImportJSON },
    { label: 'Import Mermaid', action: onImportMermaid },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={btnBase}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a0a0c0'; }}
        title="Import/Export"
      >
        File
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '4px 0',
              minWidth: 140,
              zIndex: 51,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 16px',
                  background: 'none',
                  border: 'none',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                onClick={() => { item.action(); setOpen(false); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main toolbar
// ---------------------------------------------------------------------------

export const Toolbar = memo<ToolbarProps>(function Toolbar(props) {
  const {
    activeTool,
    onToolChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onFitView,
    onLayout,
    onExportJSON,
    onExportSVG,
    onExportMermaid,
    onImportJSON,
    onImportMermaid,
    physicsEnabled,
    onTogglePhysics,
    onDeleteSelected,
    hasSelection,
  } = props;

  return (
    <div style={toolbarStyle}>
      {/* Tool selection */}
      <ToolBtn label="Select" tool="select" activeTool={activeTool} onClick={() => onToolChange('select')} title="Select tool (V)" />
      <ToolBtn label="+ Node" tool="addNode" activeTool={activeTool} onClick={() => onToolChange('addNode')} title="Add node (N)" />
      <ToolBtn label="+ Edge" tool="addEdge" activeTool={activeTool} onClick={() => onToolChange('addEdge')} title="Add edge (E)" />
      <ToolBtn label="Pan" tool="pan" activeTool={activeTool} onClick={() => onToolChange('pan')} title="Pan tool (Space)" />

      <div style={dividerStyle} />

      {/* Undo/Redo */}
      <ToolBtn label="Undo" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" />
      <ToolBtn label="Redo" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" />

      <div style={dividerStyle} />

      {/* Zoom */}
      <ToolBtn label="+" onClick={onZoomIn} title="Zoom in" />
      <ToolBtn label="-" onClick={onZoomOut} title="Zoom out" />
      <ToolBtn label="Fit" onClick={onFitView} title="Fit all nodes in view" />

      <div style={dividerStyle} />

      {/* Layout & Physics */}
      <LayoutDropdown onLayout={onLayout} />
      <ToolBtn
        label={physicsEnabled ? 'Physics On' : 'Physics Off'}
        onClick={onTogglePhysics}
        title="Toggle force simulation"
      />

      <div style={dividerStyle} />

      {/* File operations */}
      <ExportDropdown
        onExportJSON={onExportJSON}
        onExportSVG={onExportSVG}
        onExportMermaid={onExportMermaid}
        onImportJSON={onImportJSON}
        onImportMermaid={onImportMermaid}
      />

      {/* Delete */}
      {hasSelection && (
        <>
          <div style={dividerStyle} />
          <ToolBtn label="Delete" onClick={onDeleteSelected} danger title="Delete selected (Del)" />
        </>
      )}
    </div>
  );
});
