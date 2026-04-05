// ============================================================================
// Battery-aware performance hook
//
// Monitors device battery level and adjusts the performance tier downward
// when battery is low. Requires expo-battery (optional peer dep).
// ============================================================================

import { useEffect, useState } from 'react';
import type { PerformanceTier } from '../types';

/** Try to import expo-battery; returns null if not installed */
function tryGetBatteryModule(): { getBatteryLevelAsync: () => Promise<number>; addBatteryLevelListener: (cb: (state: { batteryLevel: number }) => void) => { remove: () => void } } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-battery');
  } catch {
    return null;
  }
}

const LOW_BATTERY_THRESHOLD = 0.15;
const MEDIUM_BATTERY_THRESHOLD = 0.30;

/**
 * Returns the effective performance tier, downgrading if battery is low.
 * If expo-battery is not installed, returns the requested tier unchanged.
 */
export function useBatteryAware(
  requestedTier: PerformanceTier,
  enabled: boolean,
): PerformanceTier {
  const [batteryLevel, setBatteryLevel] = useState(1.0);

  useEffect(() => {
    if (!enabled) return;

    const Battery = tryGetBatteryModule();
    if (!Battery) return;

    Battery.getBatteryLevelAsync().then(setBatteryLevel).catch(() => {});

    const subscription = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
      setBatteryLevel(level);
    });

    return () => subscription.remove();
  }, [enabled]);

  if (!enabled) return requestedTier;

  if (batteryLevel <= LOW_BATTERY_THRESHOLD) return 'low';
  if (batteryLevel <= MEDIUM_BATTERY_THRESHOLD && requestedTier === 'high') return 'medium';

  return requestedTier;
}
