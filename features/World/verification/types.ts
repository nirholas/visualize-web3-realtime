/**
 * Giza LuminAIR Verification types.
 * Adapted from @gizatech/luminair-react for inline-style integration.
 */

export type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

export interface StepState {
  status: StepStatus;
  message?: string;
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  patterns: string[];
}

export interface VerificationState {
  isOpen: boolean;
  isVerifying: boolean;
  steps: Record<string, StepState>;
  allStepsCompleted: boolean;
  result?: {
    success: boolean;
    message?: string;
  };
}

/**
 * Verification steps based on the LuminAIR WASM console output patterns.
 */
export const VERIFICATION_STEPS: VerificationStep[] = [
  {
    id: 'setup',
    title: 'Protocol Setup',
    description: 'Initializing verifier components',
    patterns: [
      'Starting LuminAIR proof verification',
      'Protocol Setup: Initializing verifier components',
      'Protocol Setup: Configuration complete',
    ],
  },
  {
    id: 'preprocessed',
    title: 'Commit preprocessed trace',
    description: 'Processing preprocessed trace commitments',
    patterns: [
      'Interaction Phase 0: Processing preprocessed trace',
      'Interaction Phase 0: Preprocessed trace committed',
    ],
  },
  {
    id: 'main',
    title: 'Commit main trace',
    description: 'Processing main execution trace',
    patterns: [
      'Interaction Phase 1: Processing main trace',
      'Interaction Phase 1: Main trace committed',
    ],
  },
  {
    id: 'interaction',
    title: 'Commit interaction trace',
    description: 'Processing interaction trace commitments',
    patterns: [
      'Interaction Phase 2: Processing interaction trace',
      'Interaction Phase 2: Interaction trace committed',
    ],
  },
  {
    id: 'verify',
    title: 'Verify proof with STWO',
    description: 'Verifying STARK proof with STWO prover',
    patterns: [
      'Proof Verification: Verifying STARK proof',
      'Proof Verification: STARK proof is valid',
    ],
  },
];
