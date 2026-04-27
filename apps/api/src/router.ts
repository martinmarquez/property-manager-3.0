import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';
import { propertiesRouter } from './routers/properties.js';
import { contactsRouter } from './routers/contacts.js';
import { documentsRouter } from './routers/documents.js';
import { esignRouter } from './routers/esign.js';

/**
 * Root tRPC router.
 *
 * Procedure namespacing:
 *   system.health   — health / liveness probes
 *   auth.*          — authentication (login, logout, me, register, …)
 *   properties.*    — property CRUD, soft-delete, trash, bulk edit, import
 *   contacts.*      — contact CRUD, relationships, segments, duplicates (Phase B)
 *   documents.*     — doc templates, documents, clauses (Phase E)
 *   esign.*         — e-sign integration: Signaturit + DocuSign (Phase E)
 *
 * Phase B+ routers added here as modules are implemented:
 *   leads.*  pipelines.*  inbox.*
 *   portals.*   calendar.*  ai.*  billing.*
 */
export const appRouter = router({
  system:     healthRouter,
  auth:       authRouter,
  properties: propertiesRouter,
  contacts:   contactsRouter,
  documents:  documentsRouter,
  esign:      esignRouter,
});

export type AppRouter = typeof appRouter;
