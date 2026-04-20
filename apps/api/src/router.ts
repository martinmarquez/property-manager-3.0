import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';

/**
 * Root tRPC router.
 *
 * Procedure namespacing:
 *   system.health   — health / liveness probes
 *   auth.*          — authentication (login, logout, me, register, …)
 *
 * Phase B+ routers added here as modules are implemented:
 *   contacts.*  leads.*  properties.*  pipelines.*  inbox.*  documents.*
 *   portals.*   calendar.*  ai.*  billing.*
 */
export const appRouter = router({
  system: healthRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
