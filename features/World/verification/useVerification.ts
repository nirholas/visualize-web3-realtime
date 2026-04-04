'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { VerificationState, StepStatus } from './types';
import { VERIFICATION_STEPS } from './types';

/**
 * Hook that manages the ZK verification lifecycle.
 * Wraps the @gizatech/luminair-web WASM verifier with console log monitoring
 * to track step progress.
 */
export function useVerification(options: {
  proofPath: string;
  settingsPath: string;
  autoStart?: boolean;
}) {
  const { proofPath, settingsPath, autoStart = false } = options;

  const [state, setState] = useState<VerificationState>({
    isOpen: false,
    isVerifying: false,
    allStepsCompleted: false,
    steps: VERIFICATION_STEPS.reduce(
      (acc, step) => ({ ...acc, [step.id]: { status: 'pending' as StepStatus } }),
      {} as Record<string, { status: StepStatus }>,
    ),
  });

  const originalConsoleLog = useRef<typeof console.log | null>(null);
  const originalConsoleInfo = useRef<typeof console.info | null>(null);
  const stepTimestamps = useRef<Record<string, number>>({});
  const verificationStarted = useRef(false);

  const updateStepStatus = useCallback((stepId: string, status: StepStatus, message?: string) => {
    setState((prev) => {
      const newSteps = { ...prev.steps, [stepId]: { status, message } };
      const allCompleted = VERIFICATION_STEPS.every((step) => newSteps[step.id]?.status === 'completed');
      return { ...prev, steps: newSteps, allStepsCompleted: allCompleted };
    });
  }, []);

  const updateStepWithDelay = useCallback(
    async (stepId: string, status: StepStatus, message?: string) => {
      const now = Date.now();
      const lastUpdate = stepTimestamps.current[stepId] || 0;
      const stepIndex = VERIFICATION_STEPS.findIndex((s) => s.id === stepId);
      const minDelay = 200 + stepIndex * 50;
      const elapsed = now - lastUpdate;

      if (elapsed < minDelay) {
        await new Promise((resolve) => setTimeout(resolve, minDelay - elapsed));
      }

      stepTimestamps.current[stepId] = Date.now();
      updateStepStatus(stepId, status, message);
    },
    [updateStepStatus],
  );

  // Monitor console logs for verification step patterns
  useEffect(() => {
    if (!state.isVerifying) return;

    stepTimestamps.current = {};
    originalConsoleLog.current = console.log;
    originalConsoleInfo.current = console.info;

    const handleLogMessage = (message: string) => {
      for (const step of VERIFICATION_STEPS) {
        for (const pattern of step.patterns) {
          if (message.includes(pattern)) {
            const status = pattern.includes('\u2705') ? 'completed' : 'in-progress';
            updateStepWithDelay(step.id, status, message);
          }
        }
      }

      if (message.includes('\u274C') || message.includes('Failed') || message.includes('Error')) {
        const failedStep = VERIFICATION_STEPS.find((step) =>
          step.patterns.some((p) => message.includes(p.replace('\u2705', '\u274C'))),
        );
        if (failedStep) {
          updateStepWithDelay(failedStep.id, 'error', message);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log = (...args: any[]) => {
      handleLogMessage(args.join(' '));
      originalConsoleLog.current?.(...args);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.info = (...args: any[]) => {
      handleLogMessage(args.join(' '));
      originalConsoleInfo.current?.(...args);
    };

    return () => {
      if (originalConsoleLog.current) console.log = originalConsoleLog.current;
      if (originalConsoleInfo.current) console.info = originalConsoleInfo.current;
    };
  }, [state.isVerifying, updateStepWithDelay]);

  const startVerification = useCallback(async () => {
    setState((prev) => ({ ...prev, isVerifying: true }));

    try {
      // Dynamic import — @gizatech/luminair-web is a WASM package
      const luminair = await import('@gizatech/luminair-web');
      await luminair.default();

      const [proofResp, settingsResp] = await Promise.all([
        fetch(proofPath),
        fetch(settingsPath),
      ]);

      if (!proofResp.ok || !settingsResp.ok) {
        throw new Error('Could not load proof or settings files');
      }

      const proofBytes = new Uint8Array(await proofResp.arrayBuffer());
      const settingsBytes = new Uint8Array(await settingsResp.arrayBuffer());
      const result = luminair.verify(proofBytes, settingsBytes);

      setState((prev) => ({
        ...prev,
        isVerifying: false,
        result: {
          success: result.success,
          message: result.error_message || 'Verification completed successfully!',
        },
      }));
    } catch (error) {
      const currentStep = VERIFICATION_STEPS.find(
        (step) => state.steps[step.id]?.status === 'in-progress',
      );
      if (currentStep) {
        updateStepWithDelay(
          currentStep.id,
          'error',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      setState((prev) => ({
        ...prev,
        isVerifying: false,
        result: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }));
    }
  }, [proofPath, settingsPath, state.steps, updateStepWithDelay]);

  // Auto-start on mount if requested
  useEffect(() => {
    if (autoStart && !verificationStarted.current) {
      verificationStarted.current = true;
      startVerification();
    }
  }, [autoStart, startVerification]);

  const openModal = useCallback(() => setState((prev) => ({ ...prev, isOpen: true })), []);
  const closeModal = useCallback(() => {
    if (!state.isVerifying) {
      setState((prev) => ({ ...prev, isOpen: false }));
    }
  }, [state.isVerifying]);

  const overallStatus = (() => {
    if (state.result && !state.result.success) return 'error';
    if (state.result?.success && state.allStepsCompleted) return 'completed';
    if (state.isVerifying || (state.result?.success && !state.allStepsCompleted)) return 'in-progress';
    return 'pending';
  })();

  return {
    state,
    overallStatus,
    startVerification,
    openModal,
    closeModal,
  };
}
