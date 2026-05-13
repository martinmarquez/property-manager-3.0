import { createServer } from 'node:http';
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
registry.setDefaultLabels({ app: 'corredor-worker', env: process.env['NODE_ENV'] ?? 'development' });

collectDefaultMetrics({ register: registry });

export const portalSyncTotal = new Counter({
  name: 'corredor_portal_sync_total',
  help: 'Total portal sync jobs processed, by status and portal name',
  labelNames: ['status', 'portal_name', 'queue_name'] as const,
  registers: [registry],
});

export const portalSyncDuration = new Histogram({
  name: 'corredor_portal_sync_duration_seconds',
  help: 'Portal sync job duration in seconds',
  labelNames: ['portal_name', 'queue_name', 'status'] as const,
  buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120],
  registers: [registry],
});

export const deadLetterQueueSize = new Counter({
  name: 'corredor_dead_letter_total',
  help: 'Total jobs moved to the dead-letter queue',
  labelNames: ['original_queue'] as const,
  registers: [registry],
});

/**
 * Start a minimal HTTP server on METRICS_PORT (default 9464) that serves /metrics.
 * Called once from the worker entrypoint.
 */
export function startMetricsServer(port = Number(process.env['METRICS_PORT'] ?? 9464)): void {
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics' && req.method === 'GET') {
      const metrics = await registry.metrics();
      res.writeHead(200, { 'Content-Type': registry.contentType });
      res.end(metrics);
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.info(`metrics server listening on :${port}/metrics`);
  });
}
