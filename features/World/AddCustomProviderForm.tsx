'use client';

import { memo, useCallback, useState } from 'react';
import type { StreamType } from '@web3viz/providers';

// ============================================================================
// Add Custom Provider Form
//
// Lets users input a WebSocket / SSE / REST URL and optional field mappings
// to create a custom data stream that feeds into the visualization.
// ============================================================================

export interface CustomProviderFormData {
  name: string;
  url: string;
  streamType: StreamType;
  jsonPath: string;
  fieldMap: {
    label: string;
    amount: string;
    address: string;
    tokenAddress: string;
    timestamp: string;
  };
}

interface AddCustomProviderFormProps {
  onSubmit: (data: CustomProviderFormData) => void;
  onCancel: () => void;
}

const MONO = "'IBM Plex Mono', monospace";

const inputStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  color: '#1a1a1a',
  fontFamily: MONO,
  fontSize: 11,
  outline: 'none',
  padding: '8px 10px',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: '#666',
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: '0.06em',
  marginBottom: 4,
  textTransform: 'uppercase',
  display: 'block',
};

const STREAM_TYPES: { value: StreamType; label: string; hint: string }[] = [
  { value: 'websocket', label: 'WebSocket', hint: 'wss:// or ws://' },
  { value: 'sse', label: 'SSE', hint: 'Server-Sent Events endpoint' },
  { value: 'rest', label: 'REST Poll', hint: 'Polled every 5s' },
];

const AddCustomProviderForm = memo<AddCustomProviderFormProps>(({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [streamType, setStreamType] = useState<StreamType>('websocket');
  const [jsonPath, setJsonPath] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldAmount, setFieldAmount] = useState('');
  const [fieldAddress, setFieldAddress] = useState('');
  const [fieldTokenAddress, setFieldTokenAddress] = useState('');
  const [fieldTimestamp, setFieldTimestamp] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(() => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!url.trim()) { setError('URL is required'); return; }

    // Basic URL validation
    try {
      const parsed = new URL(url.trim());
      if (streamType === 'websocket' && !parsed.protocol.startsWith('ws')) {
        setError('WebSocket URL must start with ws:// or wss://');
        return;
      }
      if (streamType !== 'websocket' && parsed.protocol.startsWith('ws')) {
        setError('HTTP endpoint expected for SSE/REST');
        return;
      }
    } catch {
      setError('Invalid URL format');
      return;
    }

    setError('');
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      streamType,
      jsonPath: jsonPath.trim(),
      fieldMap: {
        label: fieldLabel.trim() || 'label',
        amount: fieldAmount.trim() || 'amount',
        address: fieldAddress.trim() || 'address',
        tokenAddress: fieldTokenAddress.trim() || 'tokenAddress',
        timestamp: fieldTimestamp.trim() || 'timestamp',
      },
    });
  }, [name, url, streamType, jsonPath, fieldLabel, fieldAmount, fieldAddress, fieldTokenAddress, fieldTimestamp, onSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
          Add Custom Source
        </span>
        <button
          onClick={onCancel}
          type="button"
          style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 16, padding: 0 }}
        >
          &#x2715;
        </button>
      </div>

      <p style={{ fontFamily: MONO, fontSize: 10, color: '#888', margin: 0, lineHeight: 1.5 }}>
        Connect a custom WebSocket, SSE, or REST API that emits JSON events.
      </p>

      {/* Name */}
      <div>
        <label style={labelStyle}>Source Name</label>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Data Stream"
        />
      </div>

      {/* Stream type selector */}
      <div>
        <label style={labelStyle}>Transport</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {STREAM_TYPES.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStreamType(st.value)}
              title={st.hint}
              style={{
                background: streamType === st.value ? '#1a1a1a' : '#f0f0f0',
                border: '1px solid',
                borderColor: streamType === st.value ? '#1a1a1a' : '#d0d0d0',
                borderRadius: 4,
                color: streamType === st.value ? '#fff' : '#666',
                cursor: 'pointer',
                flex: 1,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.04em',
                padding: '6px 0',
                textTransform: 'uppercase',
                transition: 'all 150ms',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* URL */}
      <div>
        <label style={labelStyle}>URL</label>
        <input
          style={inputStyle}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={streamType === 'websocket' ? 'wss://example.com/stream' : 'https://api.example.com/events'}
        />
      </div>

      {/* JSON Path */}
      <div>
        <label style={labelStyle}>JSON Path (optional)</label>
        <input
          style={inputStyle}
          value={jsonPath}
          onChange={(e) => setJsonPath(e.target.value)}
          placeholder="data.events"
        />
        <span style={{ fontFamily: MONO, fontSize: 9, color: '#aaa', marginTop: 2, display: 'block' }}>
          Dot-notation path to event array in response
        </span>
      </div>

      {/* Advanced field mapping */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.04em',
          padding: 0,
          textAlign: 'left',
          textTransform: 'uppercase',
        }}
      >
        {showAdvanced ? '▾' : '▸'} Field Mapping
      </button>

      {showAdvanced && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 0 8px', borderLeft: '2px solid #e8e8e8' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#aaa', lineHeight: 1.4 }}>
            Map your JSON fields to the visualization schema. Leave blank for defaults.
          </span>
          {[
            { label: 'Label Field', value: fieldLabel, set: setFieldLabel, placeholder: 'label (or name, symbol)' },
            { label: 'Amount Field', value: fieldAmount, set: setFieldAmount, placeholder: 'amount (or value, price)' },
            { label: 'Address Field', value: fieldAddress, set: setFieldAddress, placeholder: 'address (or from, sender)' },
            { label: 'Token Address', value: fieldTokenAddress, set: setFieldTokenAddress, placeholder: 'tokenAddress (or token, asset)' },
            { label: 'Timestamp', value: fieldTimestamp, set: setFieldTimestamp, placeholder: 'timestamp (or time, ts)' },
          ].map((f) => (
            <div key={f.label}>
              <label style={labelStyle}>{f.label}</label>
              <input
                style={{ ...inputStyle, fontSize: 10 }}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <span style={{ fontFamily: MONO, fontSize: 10, color: '#ef4444' }}>
          {error}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: '#f0f0f0',
            border: '1px solid #d0d0d0',
            borderRadius: 6,
            color: '#666',
            cursor: 'pointer',
            flex: 1,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.04em',
            padding: '8px 0',
            textTransform: 'uppercase',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            background: '#1a1a1a',
            border: '1px solid #1a1a1a',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            flex: 1,
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: '0.04em',
            padding: '8px 0',
            textTransform: 'uppercase',
          }}
        >
          Connect
        </button>
      </div>
    </div>
  );
});

AddCustomProviderForm.displayName = 'AddCustomProviderForm';

export default AddCustomProviderForm;
