'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { DocsHeader } from './DocsHeader';

export function DocsShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: '#0a0a12',
    }}>
      <DocsHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Desktop sidebar */}
        <div className="docs-sidebar-desktop">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              className="docs-sidebar-overlay"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 40,
              }}
            />
            <div
              className="docs-sidebar-mobile"
              style={{
                position: 'fixed',
                top: 48,
                left: 0,
                bottom: 0,
                zIndex: 41,
              }}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <main
          className="docs-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '32px 40px 80px',
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
