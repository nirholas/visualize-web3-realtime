export class HealthMonitor {
    checks = new Map();
    intervalId;
    addCheck(name, check) {
        this.checks.set(name, check);
    }
    start(intervalMs = 30_000) {
        this.intervalId = setInterval(() => {
            const health = this.getHealth();
            if (health.status !== 'healthy') {
                console.warn(`[HealthMonitor] Status: ${health.status}`);
                for (const c of health.checks.filter((c) => c.status !== 'pass')) {
                    console.warn(`  [${c.name}] ${c.status}: ${c.message}`);
                }
            }
        }, intervalMs);
    }
    stop() {
        if (this.intervalId)
            clearInterval(this.intervalId);
    }
    getHealth() {
        const results = [];
        for (const [, fn] of this.checks) {
            try {
                results.push(fn());
            }
            catch (err) {
                results.push({
                    name: 'unknown',
                    status: 'fail',
                    message: String(err),
                    timestamp: Date.now(),
                });
            }
        }
        const hasCritical = results.some((c) => c.status === 'fail');
        const hasDegraded = results.some((c) => c.status === 'warn');
        return {
            status: hasCritical ? 'critical' : hasDegraded ? 'degraded' : 'healthy',
            checks: results,
        };
    }
}
