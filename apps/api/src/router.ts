import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';
import { propertiesRouter } from './routers/properties.js';
import { contactsRouter } from './routers/contacts.js';
import { documentsRouter } from './routers/documents.js';
import { esignRouter } from './routers/esign.js';
import { ragRouter } from './routers/rag.js';
import { propertyDescriptionRouter } from './routers/propertyDescription.js';
import { searchRouter } from './routers/search.js';
import { copilotRouter } from './routers/copilot.js';
import { leadsRouter } from './routers/leads.js';
import { pipelinesRouter } from './routers/pipelines.js';
import { analyticsRouter } from './routers/analytics.js';
import { billingRouter } from './routers/billing.js';
import { reportsRouter } from './routers/reports.js';
import { siteRouter } from './routers/site.js';
import { appraisalsRouter } from './routers/appraisals.js';

/**
 * Root tRPC router.
 *
 * Procedure namespacing:
 *   system.health            — health / liveness probes
 *   auth.*                   — authentication (login, logout, me, register, …)
 *   properties.*             — property CRUD, soft-delete, trash, bulk edit, import
 *   contacts.*               — contact CRUD, relationships, segments, duplicates (Phase B)
 *   documents.*              — doc templates, documents, clauses (Phase E)
 *   esign.*                  — e-sign integration: Signaturit + DocuSign (Phase E)
 *   propertyDescription.*    — AI property description generation (Phase F)
 *   rag.*                    — RAG embedding management (Phase F)
 *   search.*                 — Smart Search: hybrid keyword+semantic, autocomplete (Phase F)
 *   copilot.*               — AI Copilot: sessions, turns, streaming, actions (Phase F)
 *
 * Phase B+ routers added here as modules are implemented:
 *   leads.*  pipelines.*  inbox.*
 *   portals.*   calendar.*  billing.*
 *   analytics.*             — Phase G: billing dashboard, appraisal usage, report adoption, site metrics
 *   reports.*               — Phase G: report data endpoints, CSV/XLSX export, share links, digest subscriptions
 *   site.*                  — Phase G: website builder CRUD, pages, domains, forms, themes, public listing feed
 */
export const appRouter = router({
  system:              healthRouter,
  auth:                authRouter,
  properties:          propertiesRouter,
  contacts:            contactsRouter,
  documents:           documentsRouter,
  esign:               esignRouter,
  rag:                 ragRouter,
  propertyDescription: propertyDescriptionRouter,
  search:              searchRouter,
  copilot:             copilotRouter,
  leads:               leadsRouter,
  pipelines:           pipelinesRouter,
  analytics:           analyticsRouter,
  billing:             billingRouter,
  reports:             reportsRouter,
  site:                siteRouter,
  appraisals:          appraisalsRouter,
});

export type AppRouter = typeof appRouter;
