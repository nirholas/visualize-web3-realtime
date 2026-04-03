'use client';

interface StartJourneyProps {
  disabled?: boolean;
  isRunning: boolean;
  onClick: () => void;
  restarted?: boolean;
}

export default function StartJourney({ disabled = false, isRunning, onClick, restarted = false }: StartJourneyProps) {
  return (
    <button
      aria-label={restarted ? 'Restart journey' : 'Start journey'}
      disabled={disabled}
      onClick={onClick}
      style={{
        alignItems: 'center',
        background: disabled ? '#e8e8e8' : '#1a1a1a',
        border: '1px solid #e0e0e0',
        borderRadius: '50%',
        bottom: 18,
        color: '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        fontWeight: 600,
        height: 68,
        justifyContent: 'center',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        opacity: disabled ? 0.65 : 1,
        position: 'absolute',
        right: 18,
        textAlign: 'center',
        textTransform: 'uppercase',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        whiteSpace: 'pre-line',
        width: 68,
        zIndex: 35,
      }}
      type="button"
    >
      {isRunning ? 'Tour\nRunning' : restarted ? 'Restart\nJourney' : 'Start\nJourney'}
    </button>
  );
}
