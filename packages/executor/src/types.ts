// Re-export core agent types for use within the executor package
export type {
  AgentIdentity,
  AgentTask,
  AgentTaskStatus,
  AgentToolCall,
  AgentEvent,
  AgentEventType,
  AgentFlowTrace,
  ExecutorState,
  ExecutorStatus,
} from '@web3viz/core';

// ---------------------------------------------------------------------------
// Executor-specific types
// ---------------------------------------------------------------------------

export interface TaskDefinition {
  description: string;
  priority?: number;
  requiredRole?: string;
  timeout?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentSpawnConfig {
  role: string;
  name?: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  timestamp: number;
}

export interface ExecutorConfig {
  port: number;
  speraxosUrl: string;
  speraxosApiKey: string;
  maxAgents: number;
  taskPollInterval: number;
  heartbeatInterval: number;
  statePath: string;
}

export interface SnapshotMessage {
  type: 'snapshot';
  data: {
    agents: AgentIdentity[];
    tasks: AgentTask[];
    recentEvents: AgentEvent[];
  };
}

export interface EventMessage {
  type: 'event';
  data: AgentEvent;
}

export interface HeartbeatMessage {
  type: 'heartbeat';
  data: ExecutorState;
}

export type BroadcastMessage = SnapshotMessage | EventMessage | HeartbeatMessage;

import type { AgentIdentity, AgentTask, AgentEvent, ExecutorState } from '@web3viz/core';
