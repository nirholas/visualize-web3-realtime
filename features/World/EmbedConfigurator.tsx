'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isValidHex, normalizeHex, escapeHtml } from './utils/shared';

// ============================================================================
// Types
// ============================================================================

export interface EmbedConfig {
  bg: string;
  width: number;
  height: number;
  title: string;
}

interface EmbedConfiguratorProps {
  onClose: () => void;
}

// ============================================================================
// Helpers
// ============================================================================


const SIZE_PRESETS = [
  { label: 'Small', width: 400, height: 300 },
  { label: 'Medium', width: 600, height: 400 },
  { label: 'Large', width: 800, height: 500 },
  { label: 'Full Width', width: 0, height: 450 },
] as const;

const BG_SWATCHES = ['#ffffff', '#08080f', '#1a1a2e', '#3a3a3a', '#fdf6e3', '#282a36'];

// ============================================================================
// Build embed URL from config
// ============================================================================

function buildEmbedUrl(config: EmbedConfig): string {
  const params = new URLSearchParams();
  if (config.bg !== '#ffffff') params.set('bg', config.bg);
  if (config.title !== 'PumpFun · Live') params.set('title', config.title);
  const qs = params.toString();
  return `/embed${qs ? `?${qs}` : ''}`;
}

// ============================================================================
// Generate embed snippets
// ============================================================================

function generateIframeSnippet(config: EmbedConfig, baseUrl: string): string {
  const src = `${baseUrl}${buildEmbedUrl(config)}`;
  const w = config.width > 0 ? `width="${config.width}"` : 'width="100%"';
  const h = `height="${config.height}"`;
  const safeTitle = escapeHtml(config.title);
  return `<iframe\n  src="${src}"\n  ${w}\n  ${h}\n  frameborder="0"\n  allow="accelerometer; autoplay"\n  style="border: none; border-radius: 8px;"\n  title="${safeTitle}"\n></iframe>`;
}

function generateScriptSnippet(config: EmbedConfig, baseUrl: string): string {
  const src = `${baseUrl}${buildEmbedUrl(config)}`;
  const w = config.width > 0 ? `${config.width}px` : '100%';
  const safeTitle = escapeHtml(config.title).replace(/'/g, "\\'");
  return `<div id="pumpfun-widget" style="width:${w};height:${config.height}px;"></div>\n<script>\n  (function() {\n    var d = document.getElementById('pumpfun-widget');\n    var f = document.createElement('iframe');\n    f.src = '${src}';\n    f.style.cssText = 'width:100%;height:100%;border:none;border-radius:8px;';\n    f.title = '${safeTitle}';\n    d.appendChild(f);\n  })();\n</script>`;
}

function generateReactSnippet(config: EmbedConfig, baseUrl: string): string {
  const src = `${baseUrl}${buildEmbedUrl(config)}`;
  const w = config.width > 0 ? `${config.width}` : `"100%"`;
  const safeTitle = escapeHtml(config.title);
  return `export function PumpFunWidget() {\n  return (\n    <iframe\n      src="${src}"\n      width={${w}}\n      height={${config.height}}\n      frameBorder="0"\n      allow="accelerometer; autoplay"\n      style={{ border: 'none', borderRadius: 8 }}\n      title="${safeTitle}"\n    />\n  );\n}`;
}

// ============================================================================
// Sub-components
// ============================================================================

const SwatchRow = memo<{
  swatches: string[];
  value: string;
  onChange: (hex: string) => void;
}>(({ swatches, value, onChange }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {swatches.map((s) => (
      <button
        key={s}
        onClick={() => onChange(s)}
        style={{
          background: s,
          border: value === s ? '2px solid #818cf8' : '1px solid #d0d0d0',
          borderRadius: 4,
          cursor: 'pointer',
          height: 22,
          width: 22,
        }}
        title={s}
        type="button"
      />
    ))}
  </div>
));
SwatchRow.displayName = 'SwatchRow';

const HexInput = memo<{
  value: string;
  onChange: (hex: string) => void;
}>(({ value, onChange }) => {
  const [input, setInput] = useState(value);
  useEffect(() => setInput(value), [value]);

  const commit = useCallback(() => {
    const hex = normalizeHex(input);
    if (hex) onChange(hex);
    else setInput(value);
  }, [input, onChange, value]);

  return (
    <input
      onBlur={commit}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      style={{
        background: '#f5f5f5',
        border: '1px solid #e0e0e0',
        borderRadius: 4,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        padding: '3px 6px',
        width: 80,
      }}
      value={input}
    />
  );
});
HexInput.displayName = 'HexInput';

// ============================================================================
// Main Component
// ============================================================================

type SnippetType = 'iframe' | 'script' | 'react';

const EmbedConfigurator = memo<EmbedConfiguratorProps>(({ onClose }) => {
  const [config, setConfig] = useState<EmbedConfig>({
    bg: '#ffffff',
    height: 400,
    title: 'PumpFun · Live',
    width: 600,
  });
  const [snippetType, setSnippetType] = useState<SnippetType>('iframe');
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const codeRef = useRef<HTMLPreElement>(null);

  // Resolve origin on client
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const update = useCallback(
    (patch: Partial<EmbedConfig>) => setConfig((prev) => ({ ...prev, ...patch })),
    [],
  );

  const snippet = useMemo(() => {
    if (!baseUrl) return '';
    switch (snippetType) {
      case 'iframe':
        return generateIframeSnippet(config, baseUrl);
      case 'script':
        return generateScriptSnippet(config, baseUrl);
      case 'react':
        return generateReactSnippet(config, baseUrl);
    }
  }, [config, snippetType, baseUrl]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      if (codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [snippet]);

  const previewUrl = buildEmbedUrl(config);

  return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'IBM Plex Mono', monospace",
          overflow: 'hidden',
        }}
      >

        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'auto' }}>
          {/* Left: Controls */}
          <div
            style={{
              borderRight: '1px solid #e8e8e8',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
              gap: 16,
              overflowY: 'auto',
              padding: 20,
              width: 320,
            }}
          >
            {/* Size presets */}
            <div>
              <label style={labelStyle}>Size</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => update({ width: p.width, height: p.height })}
                    style={{
                      background:
                        config.width === p.width && config.height === p.height
                          ? '#161616'
                          : '#f5f5f5',
                      border: '1px solid #e0e0e0',
                      borderRadius: 4,
                      color:
                        config.width === p.width && config.height === p.height
                          ? '#fff'
                          : '#666',
                      cursor: 'pointer',
                      fontSize: 10,
                      padding: '4px 10px',
                      textTransform: 'uppercase',
                    }}
                    type="button"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <div>
                  <span style={{ color: '#999', fontSize: 9, textTransform: 'uppercase' }}>W</span>
                  <input
                    min={200}
                    onChange={(e) => update({ width: Number(e.target.value) || 0 })}
                    style={numInputStyle}
                    type="number"
                    value={config.width || ''}
                  />
                </div>
                <div>
                  <span style={{ color: '#999', fontSize: 9, textTransform: 'uppercase' }}>H</span>
                  <input
                    min={200}
                    onChange={(e) => update({ height: Math.max(200, Number(e.target.value) || 300) })}
                    style={numInputStyle}
                    type="number"
                    value={config.height}
                  />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div>
              <label style={labelStyle}>Background</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SwatchRow swatches={BG_SWATCHES} value={config.bg} onChange={(bg) => update({ bg })} />
                <HexInput value={config.bg} onChange={(bg) => update({ bg })} />
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Widget Title</label>
              <input
                onChange={(e) => update({ title: e.target.value })}
                style={{
                  background: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  padding: '5px 8px',
                  width: '100%',
                }}
                value={config.title}
              />
            </div>
          </div>

          {/* Right: Preview + Code */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0, padding: 20, gap: 16 }}>
            {/* Live Preview */}
            <div>
              <label style={labelStyle}>Preview</label>
              <div
                style={{
                  background: '#f0f0f0',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <iframe
                  src={previewUrl}
                  style={{
                    border: 'none',
                    display: 'block',
                    height: Math.min(config.height, 300),
                    width: '100%',
                  }}
                  title="Widget Preview"
                />
              </div>
            </div>

            {/* Snippet type tabs */}
            <div>
              <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
                {(['iframe', 'script', 'react'] as SnippetType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSnippetType(t)}
                    style={{
                      background: snippetType === t ? '#161616' : 'transparent',
                      border: '1px solid #e0e0e0',
                      borderRadius:
                        t === 'iframe' ? '4px 0 0 4px' : t === 'react' ? '0 4px 4px 0' : 0,
                      color: snippetType === t ? '#fff' : '#666',
                      cursor: 'pointer',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      padding: '4px 12px',
                      textTransform: 'uppercase',
                    }}
                    type="button"
                  >
                    {t === 'iframe' ? 'HTML' : t === 'script' ? 'Script' : 'React'}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div style={{ position: 'relative' }}>
                <pre
                  ref={codeRef}
                  style={{
                    background: '#1a1a1a',
                    borderRadius: 6,
                    color: '#d4d4d4',
                    fontSize: 11,
                    lineHeight: 1.5,
                    maxHeight: 180,
                    overflow: 'auto',
                    padding: '12px 14px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {snippet}
                </pre>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? '#22c55e' : 'rgba(255,255,255,0.12)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    padding: '4px 10px',
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    transition: 'background 0.2s',
                  }}
                  type="button"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
});

EmbedConfigurator.displayName = 'EmbedConfigurator';
export default EmbedConfigurator;

// ============================================================================
// Shared styles
// ============================================================================

const labelStyle: React.CSSProperties = {
  color: '#999',
  display: 'block',
  fontSize: 9,
  letterSpacing: '0.08em',
  marginBottom: 6,
  textTransform: 'uppercase',
};

const numInputStyle: React.CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #e0e0e0',
  borderRadius: 4,
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 11,
  marginLeft: 4,
  padding: '3px 6px',
  width: 60,
};
