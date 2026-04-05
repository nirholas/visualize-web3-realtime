'use client';

import { useState, useCallback } from 'react';

interface LivePreviewProps {
  code: string;
  language?: string;
  height?: number;
  description?: string;
}

export function LivePreview({ code, language = 'tsx', height = 300, description }: LivePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [editableCode, setEditableCode] = useState(code);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(editableCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editableCode]);

  return (
    <div style={{
      borderRadius: '8px',
      border: '1px solid rgba(140,140,200,0.15)',
      overflow: 'hidden',
      margin: '24px 0',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(140,140,200,0.1)',
        background: '#0d0d1a',
      }}>
        {(['preview', 'code'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? 'rgba(140,140,200,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #a78bfa' : '2px solid transparent',
              color: activeTab === tab ? '#e2e2f0' : '#8888aa',
              fontSize: '12px',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
        {description && (
          <span style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            color: '#6b7280',
            fontSize: '11px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            alignSelf: 'center',
          }}>
            {description}
          </span>
        )}
      </div>

      {/* Content */}
      {activeTab === 'preview' ? (
        <div style={{
          height,
          background: '#0a0a12',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Animated visualization preview placeholder */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'radial-gradient(circle, #a78bfa33 0%, transparent 70%)',
              animation: 'pulse 2s ease-in-out infinite',
              position: 'absolute',
            }} />
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#a78bfa',
              boxShadow: '0 0 12px #a78bfa66',
            }} />
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#7dd3fc',
                boxShadow: '0 0 6px #7dd3fc44',
                transform: `rotate(${i * 72}deg) translateX(40px)`,
                opacity: 0.7,
              }} />
            ))}
            <p style={{
              position: 'absolute',
              bottom: 16,
              color: '#6b7280',
              fontSize: '11px',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
            }}>
              Interactive preview — edit the code tab to experiment
            </p>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(140,140,200,0.1)',
              border: '1px solid rgba(140,140,200,0.2)',
              borderRadius: '4px',
              color: '#8888aa',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              zIndex: 1,
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <textarea
            value={editableCode}
            onChange={e => setEditableCode(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: height,
              padding: '16px',
              background: '#0d0d1a',
              color: '#d8d8e8',
              border: 'none',
              fontFamily: 'var(--font-ibm-plex-mono), monospace',
              fontSize: '13px',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
