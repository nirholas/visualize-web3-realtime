import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
/**
 * Persistent state store using SQLite.
 * Survives process restarts via database tables.
 */
export class StateStore {
    db;
    constructor(dbPath) {
        // Create directory if it doesn't exist
        const dir = dirname(dbPath);
        mkdirSync(dir, { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeSchema();
    }
    initializeSchema() {
        // Create tables with IF NOT EXISTS
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        address TEXT,
        parent_agent_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        priority INTEGER DEFAULT 5,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        ended_at INTEGER,
        result TEXT,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        task_id TEXT,
        timestamp INTEGER NOT NULL,
        payload TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS executor_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id);
      CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);
    }
    saveAgent(agent) {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO agents (id, name, role, status, address, parent_agent_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(agent.agentId, agent.name, agent.role, 'idle', agent.address ?? null, agent.parentAgentId ?? null, agent.createdAt, Date.now());
        }
        catch (err) {
            console.error('[StateStore] Failed to save agent:', err);
        }
    }
    saveTask(task) {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tasks (id, agent_id, description, status, priority, created_at, started_at, ended_at, result, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(task.taskId, task.agentId, task.description, task.status, task.priority ?? 5, task.createdAt, task.startedAt ?? null, task.endedAt ?? null, task.result ?? null, task.error ?? null);
        }
        catch (err) {
            console.error('[StateStore] Failed to save task:', err);
        }
    }
    saveEvent(event) {
        try {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO events (id, event_id, type, agent_id, task_id, timestamp, payload)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(`evt_${event.eventId}`, event.eventId, event.type, event.agentId, event.taskId ?? null, event.timestamp, JSON.stringify(event.payload));
        }
        catch (err) {
            console.error('[StateStore] Failed to save event:', err);
        }
    }
    loadActiveAgents() {
        try {
            const stmt = this.db.prepare(`
        SELECT id, name, role, address, parent_agent_id, created_at
        FROM agents
        WHERE status != 'shutdown'
        ORDER BY created_at DESC
      `);
            const rows = stmt.all();
            return rows.map((row) => ({
                agentId: row.id,
                name: row.name,
                role: row.role,
                address: row.address || undefined,
                parentAgentId: row.parent_agent_id || undefined,
                createdAt: row.created_at,
            }));
        }
        catch (err) {
            console.error('[StateStore] Failed to load active agents:', err);
            return [];
        }
    }
    loadActiveTasks() {
        try {
            const stmt = this.db.prepare(`
        SELECT id, agent_id, description, status, priority, created_at, started_at, ended_at, result, error
        FROM tasks
        WHERE status IN ('queued', 'in-progress')
        ORDER BY priority ASC, created_at ASC
      `);
            const rows = stmt.all();
            return rows.map((row) => ({
                taskId: row.id,
                agentId: row.agent_id,
                description: row.description,
                status: row.status,
                priority: row.priority,
                createdAt: row.created_at,
                startedAt: row.started_at || undefined,
                endedAt: row.ended_at || undefined,
                result: row.result || undefined,
                error: row.error || undefined,
            }));
        }
        catch (err) {
            console.error('[StateStore] Failed to load active tasks:', err);
            return [];
        }
    }
    loadRecentEvents(limit = 100) {
        try {
            const stmt = this.db.prepare(`
        SELECT event_id, type, agent_id, task_id, timestamp, payload
        FROM events
        ORDER BY timestamp DESC
        LIMIT ?
      `);
            const rows = stmt.all(limit);
            return rows.reverse().map((row) => ({
                eventId: row.event_id,
                type: row.type,
                agentId: row.agent_id,
                taskId: row.task_id || undefined,
                timestamp: row.timestamp,
                payload: JSON.parse(row.payload),
            }));
        }
        catch (err) {
            console.error('[StateStore] Failed to load recent events:', err);
            return [];
        }
    }
    getStats() {
        try {
            const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get()
                .count;
            const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM events').get()
                .count;
            const startTime = this.getMeta('start_time');
            const uptime = startTime ? Date.now() - parseInt(startTime, 10) : 0;
            return { totalTasks: taskCount, totalEvents: eventCount, uptime };
        }
        catch (err) {
            console.error('[StateStore] Failed to get stats:', err);
            return { totalTasks: 0, totalEvents: 0, uptime: 0 };
        }
    }
    setMeta(key, value) {
        try {
            const stmt = this.db.prepare('INSERT OR REPLACE INTO executor_meta (key, value) VALUES (?, ?)');
            stmt.run(key, value);
        }
        catch (err) {
            console.error('[StateStore] Failed to set meta:', err);
        }
    }
    getMeta(key) {
        try {
            const stmt = this.db.prepare('SELECT value FROM executor_meta WHERE key = ?');
            const row = stmt.get(key);
            return row ? row.value : null;
        }
        catch (err) {
            console.error('[StateStore] Failed to get meta:', err);
            return null;
        }
    }
    close() {
        try {
            this.db.close();
        }
        catch (err) {
            console.error('[StateStore] Failed to close database:', err);
        }
    }
}
