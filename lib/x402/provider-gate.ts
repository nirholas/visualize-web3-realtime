import type { X402Tier } from '@web3viz/core';
import { X402_TIERS } from './config';

/**
 * Given the user's current tier, return the list of allowed provider IDs.
 */
export function getAllowedProviders(tier: X402Tier): string[] {
  return X402_TIERS[tier].allowedProviders;
}

/**
 * Check if a specific provider is allowed for a tier.
 */
export function isProviderAllowed(providerId: string, tier: X402Tier): boolean {
  return X402_TIERS[tier].allowedProviders.includes(providerId);
}

/**
 * Get rate limit (events per second) for a tier.
 */
export function getEventRateLimit(tier: X402Tier): number {
  return X402_TIERS[tier].maxEventsPerSecond;
}

/**
 * Get max connections allowed for a tier.
 */
export function getMaxConnections(tier: X402Tier): number {
  return X402_TIERS[tier].maxConnections;
}
