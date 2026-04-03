'use client';

/**
 * Provider registration entry point.
 * Import this file once in the app layout/page to register all providers.
 * Each provider self-registers via registerProvider() from @web3viz/core.
 *
 * To add a new provider:
 * 1. Create a provider module in providers/<name>/
 * 2. Import it here
 * 3. That's it — useDataProvider discovers it automatically
 */

// Register providers (each file calls registerProvider internally)
// import './solana-pumpfun';   // ← Task 23 will add this
import './ethereum';          // ← Task 24
// import './base';              // ← Task 25
// import './agents';            // ← Task 26
// import './erc8004';           // ← Task 27
// import './cex-volume';        // ← Task 28

export {};
