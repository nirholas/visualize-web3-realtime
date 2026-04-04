'use client';

import { memo } from 'react';
import { useVerification } from './useVerification';
import { VerificationModal } from './VerificationModal';
import { GizaLogo } from './GizaLogo';
import type { StepStatus } from './types';

export interface VerifyBadgeProps {
  proofPath: string;
  settingsPath: string;
  graphPath: string;
  title?: string;
  labelText?: string;
  author?: string;
  modelDescription?: string;
  authorUrl?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; logo: string }> = {
  completed: { bg: '#dcfce7', text: '#166534', border: '#166534', logo: '#166534' },
  'in-progress': { bg: '#fffbeb', text: '#92400e', border: '#92400e', logo: '#d97706' },
  error: { bg: '#fef2f2', text: '#dc2626', border: '#dc2626', logo: '#dc2626' },
  pending: { bg: '#fffbeb', text: '#92400e', border: '#92400e', logo: '#d97706' },
};

export const VerifyBadge = memo<VerifyBadgeProps>(({
  proofPath,
  settingsPath,
  graphPath,
  title = "Can't be evil.",
  labelText = 'VERIFIED COMPUTE',
  author = 'Giza',
  modelDescription = 'Demo model',
  authorUrl = 'https://www.gizatech.xyz/',
}) => {
  const { state, overallStatus, openModal, closeModal } = useVerification({
    proofPath,
    settingsPath,
    autoStart: true,
  });

  const colors = STATUS_COLORS[overallStatus] || STATUS_COLORS.pending;

  const statusText = (() => {
    switch (overallStatus) {
      case 'completed': return labelText;
      case 'in-progress': return 'VERIFYING...';
      case 'error': return 'VERIFICATION FAILED';
      default: return 'VERIFYING...';
    }
  })();

  return (
    <>
      <button
        onClick={openModal}
        type="button"
        aria-label={`Verification status: ${statusText}`}
        style={{
          alignItems: 'center',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          color: colors.text,
          cursor: 'pointer',
          display: 'inline-flex',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          fontWeight: 500,
          gap: 8,
          letterSpacing: '0.04em',
          opacity: state.isVerifying ? 0.75 : 1,
          padding: '6px 12px',
          transition: 'all 200ms ease',
        }}
      >
        <GizaLogo size={14} color={colors.logo} />
        <span>{statusText}</span>
        {/* Info icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      <VerificationModal
        isOpen={state.isOpen}
        onClose={closeModal}
        verificationState={state}
        proofPath={proofPath}
        settingsPath={settingsPath}
        graphPath={graphPath}
        title={title}
        author={author}
        modelDescription={modelDescription}
        authorUrl={authorUrl}
      />
    </>
  );
});

VerifyBadge.displayName = 'VerifyBadge';
