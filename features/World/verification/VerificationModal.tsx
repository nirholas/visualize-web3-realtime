'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import { GizaLogo } from './GizaLogo';
import { VERIFICATION_STEPS } from './types';
import type { VerificationState, StepStatus } from './types';

const MONO = "'IBM Plex Mono', monospace";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificationState: VerificationState;
  proofPath: string;
  settingsPath: string;
  graphPath: string;
  title?: string;
  author?: string;
  modelDescription?: string;
  authorUrl?: string;
}

function getOverallStatus(vs: VerificationState): StepStatus | 'pending' {
  if (vs.result && !vs.result.success) return 'error';
  if (vs.result?.success && vs.allStepsCompleted) return 'completed';
  if (vs.isVerifying || (vs.result?.success && !vs.allStepsCompleted)) return 'in-progress';
  return 'pending';
}

const STATUS_BADGE: Record<string, { bg: string; text: string; icon: string }> = {
  completed: { bg: '#dcfce7', text: '#166534', icon: '\u2713' },
  'in-progress': { bg: '#f3f4f6', text: '#374151', icon: '\u25CB' },
  error: { bg: '#fef2f2', text: '#dc2626', icon: '\u2717' },
  pending: { bg: '#f3f4f6', text: '#374151', icon: '\u25CB' },
};

const STATUS_LABEL: Record<string, string> = {
  completed: 'Verified',
  'in-progress': 'Verifying',
  error: 'Failed',
  pending: 'Pending',
};

const STEP_ICONS: Record<StepStatus, { symbol: string; color: string }> = {
  pending: { symbol: '\u25CB', color: '#9ca3af' },
  'in-progress': { symbol: '\u25CF', color: '#eab308' },
  completed: { symbol: '\u2713', color: '#6b7280' },
  error: { symbol: '\u2717', color: '#ef4444' },
};

const StepRow = memo<{ title: string; status: StepStatus; isVerifying: boolean }>(
  ({ title, status, isVerifying }) => {
    const icon = STEP_ICONS[status];
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 8,
          opacity: status === 'pending' && !isVerifying ? 0.5 : 1,
          padding: '3px 0',
        }}
      >
        <span style={{ color: icon.color, fontSize: 12, width: 14, textAlign: 'center' }}>
          {status === 'in-progress' ? '\u25CF' : icon.symbol}
        </span>
        <span
          style={{
            color: status === 'error' ? '#ef4444' : '#6b7280',
            fontFamily: MONO,
            fontSize: 11,
          }}
        >
          {title}
        </span>
      </div>
    );
  },
);
StepRow.displayName = 'StepRow';

export const VerificationModal = memo<VerificationModalProps>(({
  isOpen,
  onClose,
  verificationState,
  proofPath,
  settingsPath,
  graphPath,
  title = "Can't be evil.",
  author = 'Giza',
  modelDescription = 'Demo model',
  authorUrl = 'https://www.gizatech.xyz/',
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDownload = useCallback(async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const [proofResp, settingsResp] = await Promise.all([
        fetch(proofPath),
        fetch(settingsPath),
      ]);
      if (proofResp.ok) zip.file('proof.bin', await proofResp.blob());
      if (settingsResp.ok) zip.file('settings.bin', await settingsResp.blob());
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'luminair-proof.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [proofPath, settingsPath]);

  if (!isOpen) return null;

  const overall = getOverallStatus(verificationState);
  const badge = STATUS_BADGE[overall];

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        alignItems: 'center',
        backdropFilter: 'blur(4px)',
        background: 'rgba(0,0,0,0.5)',
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        left: 0,
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: MONO,
          maxHeight: '90vh',
          maxWidth: 900,
          overflow: 'hidden',
          width: '92vw',
        }}
      >
        {/* Header */}
        <div
          style={{
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 20px',
          }}
        >
          <h2 style={{ color: '#111827', fontSize: 20, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button
            aria-label="Close verification modal"
            onClick={onClose}
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: '4px 8px',
            }}
          >
            \u00D7
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, gap: 24, overflow: 'auto', padding: 20 }}>
          {/* Left: Graph Visualization */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300,
                overflow: 'hidden',
              }}
            >
              {graphPath ? (
                <iframe
                  src={graphPath}
                  title="Computation Graph"
                  style={{ border: 'none', height: '100%', width: '100%' }}
                />
              ) : (
                <span style={{ color: '#9ca3af', fontSize: 12 }}>No graph available</span>
              )}
            </div>

            {/* Download button */}
            {verificationState.result && (
              <button
                onClick={handleDownload}
                type="button"
                style={{
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  fontFamily: MONO,
                  fontSize: 11,
                  gap: 6,
                  marginTop: 12,
                  padding: '6px 12px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download proof
              </button>
            )}

            {/* Footer */}
            <div style={{ alignItems: 'center', display: 'flex', gap: 4, marginTop: 16 }}>
              <GizaLogo size={12} color="#9ca3af" />
              <a
                href="https://www.gizatech.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#9ca3af', fontSize: 11, textDecoration: 'none' }}
              >
                Made By Giza
              </a>
            </div>
          </div>

          {/* Right: Status + Logs */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* Description */}
            <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              This verification occurs entirely in your browser, cryptographically verifying
              that the computational graph executed precisely as intended. By leveraging
              zero-knowledge proofs, we mathematically guarantee the integrity of the computation.
            </p>

            {/* Terminal */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                fontFamily: MONO,
                fontSize: 11,
                minHeight: 200,
                overflow: 'hidden',
                padding: 12,
              }}
            >
              <div
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  color: '#9ca3af',
                  fontSize: 10,
                  marginBottom: 8,
                  paddingBottom: 8,
                }}
              >
                verification logs
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {VERIFICATION_STEPS.map((step) => (
                  <StepRow
                    key={step.id}
                    title={step.title}
                    status={verificationState.steps[step.id]?.status ?? 'pending'}
                    isVerifying={verificationState.isVerifying}
                  />
                ))}

                {verificationState.isVerifying && (
                  <div style={{ alignItems: 'center', color: '#3b82f6', display: 'flex', fontSize: 11, gap: 8, padding: '3px 0' }}>
                    <span style={{ fontSize: 12 }}>{'\u25CF'}</span>
                    Processing verification...
                  </div>
                )}

                {(overall === 'completed' || (verificationState.result && !verificationState.result.success)) && (
                  <div
                    style={{
                      borderTop: '1px solid #e5e7eb',
                      color: verificationState.result?.success ? '#22c55e' : '#ef4444',
                      display: 'flex',
                      fontSize: 11,
                      gap: 8,
                      marginTop: 8,
                      paddingTop: 8,
                    }}
                  >
                    <span>{verificationState.result?.success ? '\u2713' : '\u2717'}</span>
                    <span>
                      {verificationState.result?.success
                        ? 'Verification completed successfully'
                        : `Verification failed: ${verificationState.result?.message}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MetaRow label="Status">
                <span
                  style={{
                    background: badge.bg,
                    borderRadius: 12,
                    color: badge.text,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '2px 10px',
                  }}
                >
                  {badge.icon} {STATUS_LABEL[overall]}
                </span>
              </MetaRow>
              <MetaRow label="Author">
                <a
                  href={authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#374151', fontSize: 11, textDecoration: 'none' }}
                >
                  {author}
                </a>
              </MetaRow>
              <MetaRow label="Model description">
                <span style={{ color: '#374151', fontSize: 11 }}>{modelDescription}</span>
              </MetaRow>
              <MetaRow label="Prover">
                <a
                  href="https://github.com/gizatechxyz/LuminAIR"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#374151', fontSize: 11, textDecoration: 'none' }}
                >
                  LuminAIR STWO
                </a>
              </MetaRow>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

VerificationModal.displayName = 'VerificationModal';

// Small helper for metadata rows
const MetaRow = memo<{ label: string; children: React.ReactNode }>(({ label, children }) => (
  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 500 }}>{label}:</span>
    {children}
  </div>
));
MetaRow.displayName = 'MetaRow';
