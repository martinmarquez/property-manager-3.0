import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';
import { propertiesRouter } from './routers/properties.js';
import { contactsRouter } from './routers/contacts.js';

/**
 * Root tRPC router.
 *
 * Procedure namespacing:
 *   system.health   — health / liveness probes
 *   auth.*          — authentication (login, logout, me, register, …)
 *   properties.*    — property CRUD, soft-delete, trash, bulk edit, import
 *   contacts.*      — contact CRUD, relationships, segments, duplicates (Phase B)
 *
 * Phase B+ routers added here as modules are implemented:
 *   leads.*  pipelines.*  inbox.*  documents.*
 *   portals.*   calendar.*  ai.*  billing.*
 */
export const appRouter = router({
  system:     healthRouter,
  auth:       authRouter,
  properties: propertiesRouter,
  contacts:   contactsRouter,
});

export type AppRouter = typeof appRouter;
