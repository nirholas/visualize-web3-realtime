'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'web3viz_onboarding_seen';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector or 'taskbar' | 'startmenu' | 'graph' for special anchoring */
  target: string;
  /** Arrow direction pointing toward target */
  arrow: 'bottom' | 'top' | 'left' | 'right' | 'none';
  /** Action hint shown on the button */
  action?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Web3 Realtime',
    description:
      'This is a live 3D visualization of blockchain activity. Let\u2019s walk through the basics so you know how to explore.',
    target: 'graph',
    arrow: 'none',
  },
  {
    id: 'start-menu',
    title: 'The Start Menu',
    description:
      'Click the W3 button at the bottom to open the Start Menu. From here you can launch any tool \u2014 filters, live feed, stats, AI chat, and more.',
    target: '[title="Start"]',
    arrow: 'bottom',
  },
  {
    id: 'data-sources',
    title: 'Enable a data source',
    description:
      'Open "Data Sources" from the taskbar or Start Menu. Toggle on a provider like PumpFun or Ethereum to start streaming live data into the graph.',
    target: '[data-app-id="sources"]',
    arrow: 'bottom',
  },
  {
    id: 'graph-controls',
    title: 'Navigate the 3D graph',
    description:
      'Drag to rotate the view. Scroll to zoom in and out. Hover over the large spheres (hubs) to see which protocol category they represent.',
    target: 'graph',
    arrow: 'none',
  },
  {
    id: 'windows',
    title: 'Taskbar & windows',
    description:
      'Each icon in the taskbar opens a floating window. You can drag windows around, minimize them, or close them. Click a taskbar icon to toggle its window.',
    target: 'taskbar',
    arrow: 'bottom',
  },
  {
    id: 'search',
    title: 'Search for a wallet',
    description:
      'Open the Stats window and paste a wallet address into the search box. The camera will fly to that address in the graph if it\u2019s in the current data.',
    target: '[data-app-id="stats"]',
    arrow: 'bottom',
  },
  {
    id: 'explore',
    title: 'You\u2019re ready!',
    description:
      'You can re-open this guide anytime from the Start Menu. Try the AI Chat to ask questions about the data, or hit the Journey button for an automated camera tour.',
    target: 'graph',
    arrow: 'none',
  },
];

export function useOnboarding() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true); // default true to avoid flash

  // Check localStorage on mount
  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      setHasSeenOnboarding(seen === 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setHasSeenOnboarding(true);
  }, []);

  const startOnboarding = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setActive(false);
      markSeen();
    }
  }, [stepIndex, markSeen]);

  const skipOnboarding = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  const dismissPrompt = useCallback(() => {
    markSeen();
  }, [markSeen]);

  const currentStep = active ? ONBOARDING_STEPS[stepIndex] : null;
  const totalSteps = ONBOARDING_STEPS.length;

  return {
    /** Whether the onboarding walkthrough is currently running */
    active,
    /** Current step data (null if not active) */
    currentStep,
    /** 0-based step index */
    stepIndex,
    totalSteps,
    /** True if user has completed or dismissed onboarding before */
    hasSeenOnboarding,
    /** Show the initial "Want a tour?" prompt */
    showPrompt: !hasSeenOnboarding && !active,
    startOnboarding,
    nextStep,
    skipOnboarding,
    dismissPrompt,
  };
}
