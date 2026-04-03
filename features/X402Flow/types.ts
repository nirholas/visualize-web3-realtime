// Flow visualization stage types
export type VortexStage = 'idle' | 'prompt' | 'calling' | 'paying' | 'receiving' | 'complete';

export type X402FlowEventType =
  | 'api_call_start'
  | 'api_call_complete'
  | 'payment_required'
  | 'payment_signing'
  | 'payment_sent'
  | 'payment_failed'
  | 'budget_exceeded'
  | 'flow_complete';

export interface X402FlowEvent {
  amount?: string;
  apiUrl: string;
  sequenceIndex: number;
  timestamp: number;
  type: X402FlowEventType;
}

export interface X402ApiCallTrace {
  amountPaid: string;
  duration: number;
  id: string;
  paymentRequired: boolean;
  responseStatus: number;
  url: string;
}

export interface X402FlowTrace {
  agentAddress: string;
  agentName: string;
  apiCalls: X402ApiCallTrace[];
  duration: number;
  endedAt?: number;
  events: X402FlowEvent[];
  flowId: string;
  startedAt: number;
  status: 'active' | 'completed' | 'failed';
  totalPaid: string;
  userPrompt: string;
}
