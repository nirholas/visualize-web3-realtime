/**
 * ERC-8004 Provider Constants
 * Event topics and known collections
 */

// ERC-4906 MetadataUpdate event topics
export const METADATA_UPDATE_TOPIC =
  '0xf8e1a15aba9398e019f0b49df1a4fde98ee17ae345cb5f6b5e2c27f5033e8ce7';
export const BATCH_METADATA_UPDATE_TOPIC =
  '0x6bd5c950a8d8df17f772f5af37cb3655737899cbf903264b9795592da439661c';

// Shared with ERC-20 — distinguish by topics.length (4 = ERC-721, 3 = ERC-20)
export const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// Known ERC-8004 collections (expand over time)
export const KNOWN_COLLECTIONS: Record<string, { name: string; chain: string }> = {
  // Add known contract addresses as they're discovered
};

// Event buffering / throttling
export const EVENT_BUFFER_SIZE = 300;
export const MAX_EVENTS_PER_SECOND = 5;
