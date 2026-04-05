import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ForceGraphSimulation } from '../engine/ForceGraphSimulation';
import type { TopToken, TraderEdge } from '../types';

function makeTopToken(overrides: Partial<TopToken> = {}): TopToken {
  return {
    tokenAddress: 'token_' + Math.random().toString(36).slice(2, 8),
    symbol: 'TKN',
    name: 'Token',
    chain: 'solana',
    trades: 100,
    volume: 50000,
    nativeSymbol: 'SOL',
    ...overrides,
  };
}

function makeTraderEdge(tokenAddress: string, overrides: Partial<TraderEdge> = {}): TraderEdge {
  return {
    trader: 'trader_' + Math.random().toString(36).slice(2, 8),
    tokenAddress,
    chain: 'solana',
    trades: 5,
    volume: 1000,
    ...overrides,
  };
}

describe('ForceGraphSimulation', () => {
  let sim: ForceGraphSimulation;

  beforeEach(() => {
    sim = new ForceGraphSimulation();
  });

  afterEach(() => {
    sim.dispose();
  });

  it('starts with empty nodes and edges', () => {
    expect(sim.getHubNodes()).toHaveLength(0);
    expect(sim.getAgentNodes()).toHaveLength(0);
    expect(sim.getEdges()).toHaveLength(0);
  });

  it('creates hub nodes from top tokens', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A', symbol: 'AAA' })];
    sim.update(tokens, []);
    const hubs = sim.getHubNodes();
    expect(hubs).toHaveLength(1);
    expect(hubs[0].id).toBe('A');
    expect(hubs[0].type).toBe('hub');
    expect(hubs[0].label).toBe('AAA');
  });

  it('creates agent nodes from trader edges', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    const edges = [makeTraderEdge('A', { trader: 'bob' })];
    sim.update(tokens, edges);
    const agents = sim.getAgentNodes();
    expect(agents).toHaveLength(1);
    expect(agents[0].type).toBe('agent');
    expect(agents[0].hubTokenAddress).toBe('A');
  });

  it('creates hub-to-hub edges for multiple hubs', () => {
    const tokens = [
      makeTopToken({ tokenAddress: 'A' }),
      makeTopToken({ tokenAddress: 'B' }),
      makeTopToken({ tokenAddress: 'C' }),
    ];
    sim.update(tokens, []);
    const edges = sim.getEdges();
    expect(edges).toHaveLength(3);
  });

  it('creates agent-to-hub edges', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    const traderEdges = [
      makeTraderEdge('A', { trader: 'trader1' }),
      makeTraderEdge('A', { trader: 'trader2' }),
    ];
    sim.update(tokens, traderEdges);
    const edges = sim.getEdges();
    expect(edges).toHaveLength(2);
  });

  it('ignores trader edges for non-existent hubs', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    const traderEdges = [makeTraderEdge('NONEXISTENT', { trader: 'bob' })];
    sim.update(tokens, traderEdges);
    expect(sim.getAgentNodes()).toHaveLength(0);
  });

  it('retrieves a node by ID', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A', symbol: 'AAA' })];
    sim.update(tokens, []);
    const node = sim.getNode('A');
    expect(node).toBeDefined();
    expect(node!.id).toBe('A');
    expect(node!.label).toBe('AAA');
  });

  it('returns undefined for unknown node ID', () => {
    expect(sim.getNode('nonexistent')).toBeUndefined();
  });

  it('updates existing hub labels on re-update', () => {
    const token = makeTopToken({ tokenAddress: 'A', symbol: 'OLD' });
    sim.update([token], []);
    expect(sim.getNode('A')!.label).toBe('OLD');
    sim.update([{ ...token, symbol: 'NEW' }], []);
    expect(sim.getNode('A')!.label).toBe('NEW');
  });

  it('respects maxAgentNodes config', () => {
    const sim2 = new ForceGraphSimulation({ maxAgentNodes: 2 });
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    const traderEdges = Array.from({ length: 10 }, (_, i) =>
      makeTraderEdge('A', { trader: `trader${i}` }),
    );
    sim2.update(tokens, traderEdges);
    expect(sim2.getAgentNodes().length).toBeLessThanOrEqual(2);
    sim2.dispose();
  });

  it('assigns positions to nodes', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    sim.update(tokens, []);
    const node = sim.getNode('A')!;
    expect(typeof node.x).toBe('number');
    expect(typeof node.y).toBe('number');
    expect(typeof node.z).toBe('number');
  });

  it('tick advances the simulation without error', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    sim.update(tokens, []);
    expect(() => sim.tick()).not.toThrow();
  });

  it('reheat does not throw', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    sim.update(tokens, []);
    expect(() => sim.reheat(0.8)).not.toThrow();
  });

  it('dispose stops the simulation', () => {
    const tokens = [makeTopToken({ tokenAddress: 'A' })];
    sim.update(tokens, []);
    expect(() => sim.dispose()).not.toThrow();
  });
});
