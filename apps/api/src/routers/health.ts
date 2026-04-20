import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import { env } from '../env.js';

const healthOutputSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  timestamp: z.string(),
  version: z.string(),
  db: z.enum(['connected', 'disconnected']),
  uptime: z.number(),
});

export const healthRouter = router({
  /**
   * system.health — liveness + readiness probe.
   * Pings the database and returns build metadata.
   * Called by GET /health (Hono handler) and available via tRPC for apps/web.
   */
  health: publicProcedure.output(healthOutputSchema).query(async ({ ctx }) => {
    let dbStatus: 'connected' | 'disconnected' = 'connected';

    try {
      await ctx.db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: env.APP_VERSION,
      db: dbStatus,
      uptime: process.uptime(),
    };
  }),
});

export type HealthRouter = typeof healthRouter;
