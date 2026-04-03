const MOCK_TOOL_NAMES = ['read_file', 'grep_search', 'run_in_terminal', 'semantic_search', 'create_file'];
const MOCK_CATEGORIES = ['filesystem', 'search', 'terminal', 'search', 'filesystem'];
let _callId = 0;
function uid() { return `call_${Date.now()}_${++_callId}`; }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export class AgentManager {
    client;
    agents = new Map();
    eventListeners = new Set();
    constructor(client) {
        this.client = client;
    }
    onEvent(callback) {
        this.eventListeners.add(callback);
        return () => this.eventListeners.delete(callback);
    }
    emit(event) {
        for (const fn of this.eventListeners)
            fn(event);
    }
    async spawnAgent(config) {
        const identity = await this.client.spawnAgent(config);
        this.agents.set(identity.agentId, { identity, status: 'idle', currentTaskId: null });
        this.emit({
            eventId: `evt_spawn_${identity.agentId}`,
            type: 'agent:spawn',
            timestamp: Date.now(),
            agentId: identity.agentId,
            payload: { name: identity.name, role: identity.role },
        });
        console.log(`[AgentManager] Spawned agent: ${identity.name} (${identity.role})`);
        return identity;
    }
    async assignTask(task) {
        const agent = this.agents.get(task.agentId);
        if (!agent) {
            console.warn(`[AgentManager] Agent not found: ${task.agentId}`);
            return;
        }
        agent.status = 'busy';
        agent.currentTaskId = task.taskId;
        this.emit({
            eventId: `evt_task_start_${task.taskId}`,
            type: 'task:started',
            timestamp: Date.now(),
            agentId: task.agentId,
            taskId: task.taskId,
            payload: { description: task.description, priority: task.priority },
        });
        // In mock mode, simulate the task execution
        this.simulateTaskExecution(task, agent);
    }
    async simulateTaskExecution(task, agent) {
        const toolCallCount = 2 + Math.floor(Math.random() * 5);
        const failed = Math.random() < 0.1;
        // Simulate tool calls
        for (let i = 0; i < toolCallCount; i++) {
            await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
            const toolIdx = Math.floor(Math.random() * MOCK_TOOL_NAMES.length);
            const callId = uid();
            this.emit({
                eventId: `evt_tool_${callId}`,
                type: 'tool:started',
                timestamp: Date.now(),
                agentId: task.agentId,
                taskId: task.taskId,
                callId,
                payload: {
                    callId,
                    toolName: MOCK_TOOL_NAMES[toolIdx],
                    toolCategory: MOCK_CATEGORIES[toolIdx],
                    inputSummary: `Executing ${MOCK_TOOL_NAMES[toolIdx]}`,
                },
            });
            await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
            this.emit({
                eventId: `evt_tool_done_${callId}`,
                type: 'tool:completed',
                timestamp: Date.now(),
                agentId: task.agentId,
                taskId: task.taskId,
                callId,
                payload: { callId, outputSummary: 'Done.' },
            });
        }
        await new Promise((r) => setTimeout(r, 200));
        // Complete or fail the task
        if (failed) {
            this.emit({
                eventId: `evt_task_fail_${task.taskId}`,
                type: 'task:failed',
                timestamp: Date.now(),
                agentId: task.agentId,
                taskId: task.taskId,
                payload: { error: 'Simulated task failure' },
            });
        }
        else {
            this.emit({
                eventId: `evt_task_done_${task.taskId}`,
                type: 'task:completed',
                timestamp: Date.now(),
                agentId: task.agentId,
                taskId: task.taskId,
                payload: { result: 'Task completed successfully' },
            });
        }
        agent.status = 'idle';
        agent.currentTaskId = null;
    }
    getAvailableAgent(role) {
        for (const [, state] of this.agents) {
            if (state.status === 'idle') {
                if (!role || state.identity.role === role)
                    return state.identity;
            }
        }
        return null;
    }
    async shutdownAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        this.agents.delete(agentId);
        this.emit({
            eventId: `evt_shutdown_${agentId}`,
            type: 'agent:shutdown',
            timestamp: Date.now(),
            agentId,
            payload: {},
        });
    }
    getActiveAgents() {
        return Array.from(this.agents.values()).map((s) => s.identity);
    }
    getAgentCount() { return this.agents.size; }
    getBusyCount() { return Array.from(this.agents.values()).filter((a) => a.status === 'busy').length; }
}
