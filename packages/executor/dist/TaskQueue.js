let _idCounter = 0;
function uid() {
    return `task_${Date.now()}_${++_idCounter}`;
}
export class TaskQueue {
    queue = [];
    inProgress = new Map();
    completed = [];
    failed = [];
    enqueue(definition, agentId = '') {
        const taskId = uid();
        const task = {
            taskId,
            agentId,
            description: definition.description,
            status: 'queued',
            priority: definition.priority ?? 5,
            createdAt: Date.now(),
        };
        this.queue.push({
            task,
            definition,
            retryCount: 0,
            maxRetries: definition.retryCount ?? 1,
        });
        // Sort by priority ascending (lower = higher priority)
        this.queue.sort((a, b) => (a.task.priority ?? 5) - (b.task.priority ?? 5));
        return taskId;
    }
    dequeue(role) {
        const idx = this.queue.findIndex((e) => !role || !e.definition.requiredRole || e.definition.requiredRole === role);
        if (idx < 0)
            return null;
        const [entry] = this.queue.splice(idx, 1);
        const task = {
            ...entry.task,
            status: 'in-progress',
            startedAt: Date.now(),
        };
        entry.task = task;
        this.inProgress.set(task.taskId, entry);
        return task;
    }
    complete(taskId, result) {
        const entry = this.inProgress.get(taskId);
        if (!entry)
            return;
        this.inProgress.delete(taskId);
        this.completed.push({ ...entry.task, status: 'completed', endedAt: Date.now(), result });
    }
    fail(taskId, error) {
        const entry = this.inProgress.get(taskId);
        if (!entry)
            return;
        this.inProgress.delete(taskId);
        if (entry.retryCount < entry.maxRetries) {
            entry.retryCount += 1;
            entry.task = { ...entry.task, status: 'queued', startedAt: undefined };
            this.queue.unshift(entry);
        }
        else {
            this.failed.push({ ...entry.task, status: 'failed', endedAt: Date.now(), error });
        }
    }
    checkTimeouts(timeoutMs = 60_000) {
        const now = Date.now();
        const stalled = [];
        for (const [taskId, entry] of this.inProgress) {
            const started = entry.task.startedAt ?? now;
            const taskTimeout = entry.definition.timeout ?? timeoutMs;
            if (now - started > taskTimeout) {
                stalled.push(taskId);
            }
        }
        for (const taskId of stalled) {
            this.fail(taskId, 'Task timed out');
        }
        return stalled;
    }
    getStats() {
        return {
            queued: this.queue.length,
            inProgress: this.inProgress.size,
            completed: this.completed.length,
            failed: this.failed.length,
        };
    }
    getAll() {
        return [
            ...this.queue.map((e) => e.task),
            ...Array.from(this.inProgress.values()).map((e) => e.task),
            ...this.completed.slice(-50),
            ...this.failed.slice(-20),
        ];
    }
    getQueueLength() { return this.queue.length; }
    getInProgressCount() { return this.inProgress.size; }
}
