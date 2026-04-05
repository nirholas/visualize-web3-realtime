import { describe, it, expect } from 'vitest';
import { isAgentEvent, isAgentToken, registerAgentAddress } from '../agents/detection';
import type { DataProviderEvent } from '@web3viz/core';

function makeEvent(overrides: Partial<DataProviderEvent> = {}): DataProviderEvent {
  return {
    id: 'evt_1',
    providerId: 'test',
    category: 'trades',
    chain: 'solana',
    timestamp: Date.now(),
    label: 'Test Token',
    address: '0x0000000000000000000000000000000000000000',
    ...overrides,
  };
}

describe('isAgentEvent', () => {
  it('detects agent keywords in label', () => {
    expect(isAgentEvent(makeEvent({ label: 'AI Agent Token' }))).toBe(true);
    expect(isAgentEvent(makeEvent({ label: 'GPT Trading Bot' }))).toBe(true);
    expect(isAgentEvent(makeEvent({ label: 'Claude Assistant' }))).toBe(true);
    expect(isAgentEvent(makeEvent({ label: 'Autonomous Trader' }))).toBe(true);
  });

  it('returns false for non-agent labels', () => {
    expect(isAgentEvent(makeEvent({ label: 'Pepe Coin' }))).toBe(false);
    expect(isAgentEvent(makeEvent({ label: 'Regular Token' }))).toBe(false);
  });

  it('detects registered agent addresses', () => {
    const addr = '0x1111111111111111111111111111111111111111';
    registerAgentAddress(addr);
    expect(isAgentEvent(makeEvent({ label: 'Normal Name', address: addr }))).toBe(true);
  });

  it('detects agent keywords in meta', () => {
    expect(
      isAgentEvent(
        makeEvent({
          label: 'Normal Token',
          meta: { description: 'Powered by OpenAI' },
        }),
      ),
    ).toBe(true);
  });
});

describe('isAgentToken', () => {
  it('detects agent keywords in name', () => {
    expect(isAgentToken('AI Trading Bot', 'ATB')).toBe(true);
    expect(isAgentToken('ElizaOS', 'ELIZA')).toBe(true);
  });

  it('detects agent keywords in symbol', () => {
    expect(isAgentToken('Some Token', 'GPT')).toBe(true);
  });

  it('returns false for non-agent tokens', () => {
    expect(isAgentToken('Pepe', 'PEPE')).toBe(false);
    expect(isAgentToken('Wrapped SOL', 'WSOL')).toBe(false);
  });
});
