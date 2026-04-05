'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

function highlightSyntax(code: string, language: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'bash' || language === 'sh') {
    html = html
      .replace(/(#.*$)/gm, '<span style="color:#6b7280">$1</span>')
      .replace(/^(\s*)(npm|npx|yarn|pnpm|cd|mkdir|git)\b/gm, '$1<span style="color:#c084fc">$2</span>');
    return html;
  }

  // Comments
  html = html.replace(/(\/\/.*$)/gm, '<span style="color:#6b7280">$1</span>');
  html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6b7280">$1</span>');

  // Strings
  html = html.replace(/(&apos;[^&apos;]*&apos;|`[^`]*`)/g, '<span style="color:#a5d6a7">$1</span>');
  html = html.replace(/(&#39;.*?&#39;)/g, '<span style="color:#a5d6a7">$1</span>');
  html = html.replace(/("(?:[^"\\]|\\.)*?")/g, '<span style="color:#a5d6a7">$1</span>');
  html = html.replace(/('(?:[^'\\]|\\.)*?')/g, '<span style="color:#a5d6a7">$1</span>');

  // Keywords
  const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|new|this|typeof|interface|type|async|await|default|switch|case|break|try|catch|throw|null|undefined|true|false)\b/g;
  html = html.replace(keywords, '<span style="color:#c084fc">$1</span>');

  // JSX tags
  html = html.replace(/(&lt;\/?)([\w.]+)/g, '$1<span style="color:#7dd3fc">$2</span>');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fbbf24">$1</span>');

  // Types after colon
  html = html.replace(/(:\s*)([\w<>\[\]|&]+)/g, '$1<span style="color:#67e8f9">$2</span>');

  return html;
}

export function CodeBlock({ code, language = 'typescript', filename, showLineNumbers = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');
  const highlighted = highlightSyntax(code, language);

  return (
    <div style={{
      borderRadius: '8px',
      border: '1px solid rgba(140,140,200,0.15)',
      background: '#0d0d1a',
      overflow: 'hidden',
      margin: '16px 0',
      fontSize: '13px',
    }}>
      {filename && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(140,140,200,0.1)',
          color: '#8888aa',
          fontSize: '12px',
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{filename}</span>
          <span style={{ color: '#6b7280', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
            {language}
          </span>
        </div>
      )}
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
            transition: 'all 150ms ease',
            zIndex: 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(140,140,200,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(140,140,200,0.1)'; }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre style={{
          padding: '16px',
          margin: 0,
          overflowX: 'auto',
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          lineHeight: 1.6,
          color: '#d8d8e8',
        }}>
          {showLineNumbers ? (
            <code>
              {lines.map((line, i) => (
                <div key={i} style={{ display: 'flex' }}>
                  <span style={{
                    color: '#4a4a5a',
                    marginRight: '16px',
                    minWidth: `${String(lines.length).length}ch`,
                    textAlign: 'right',
                    userSelect: 'none',
                  }}>
                    {i + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line, language) }} />
                </div>
              ))}
            </code>
          ) : (
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          )}
        </pre>
      </div>
    </div>
  );
}
