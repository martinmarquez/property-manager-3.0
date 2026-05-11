import { Hono } from 'hono';
import { eq, and, isNull, desc, lt, sql, ilike, or } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import type Redis from 'ioredis';
import {
  property,
  propertyMedia,
  contact,
  lead,
  tenant,
  apiKey,
  webhook,
} from '@corredor/db';
import { setTenantContext } from '@corredor/db';
import type { AnyDb } from '../trpc.js';
import { apiKeyAuth, requireScopes, type ApiEnv } from '../middleware/api-key-auth.js';
import { apiRateLimiter } from '../middleware/api-rate-limit.js';
import { versionHeaders } from '../middleware/api-versioning.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePagination(c: { req: { query: (k: string) => string | undefined } }) {
  const cursor = c.req.query('cursor') ?? null;
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 25, 1), 100);
  return { cursor, limit };
}

function errorJson(code: string, message: string) {
  return { error: { code, message } } as const;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUuid(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createV1Routes(deps: { db: AnyDb; redis: Redis }) {
  const { db, redis } = deps;
  const app = new Hono<ApiEnv>();

  // ── Global middleware for all /v1/* routes ─────────────────────────────
  app.use('*', versionHeaders());
  app.use('*', apiRateLimiter(redis, db));

  // ── Health (unauthenticated) ──────────────────────────────────────────
  app.get('/health', async (c) => {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    try {
      await db.execute(sql`SELECT 1`);
    } catch {
      dbStatus = 'disconnected';
    }
    const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
    const healthy = dbStatus === 'connected' && redisStatus === 'connected';
    return c.json(
      { status: healthy ? 'ok' : 'degraded', timestamp: new Date().toISOString(), version: process.env['APP_VERSION'] ?? '0.1.0' },
      healthy ? 200 : 503,
    );
  });

  // ── Listings (public, unauthenticated) ────────────────────────────────
  app.get('/listings', async (c) => {
    const slug = c.req.header('X-Tenant-Slug');
    if (!slug) {
      return c.json(errorJson('validation_error', 'X-Tenant-Slug header is required'), 400);
    }
    const tenants = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, slug)).limit(1);
    if (tenants.length === 0) return c.json(errorJson('not_found', 'Tenant not found'), 404);
    const tenantId = tenants[0]!.id;

    const { cursor, limit } = parsePagination(c);
    const typeFilter = c.req.query('type');

    const conditions = [
      eq(property.tenantId, tenantId),
      eq(property.status, 'active'),
      isNull(property.deletedAt),
      ...(typeFilter ? [eq(property.propertyType, typeFilter as 'apartment')] : []),
      ...(cursor ? [lt(property.id, cursor)] : []),
    ];

    const rows = await db
      .select()
      .from(property)
      .where(and(...conditions))
      .orderBy(desc(property.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    return c.json({ data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null });
  });

  app.get('/listings/:id', async (c) => {
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    const rows = await db
      .select()
      .from(property)
      .where(and(eq(property.id, id), eq(property.status, 'active'), isNull(property.deletedAt)))
      .limit(1);

    if (rows.length === 0) return c.json(errorJson('not_found', 'Listing not found'), 404);
    return c.json({ data: rows[0] });
  });

  // ── Authenticated routes ──────────────────────────────────────────────
  const authenticated = new Hono<ApiEnv>();
  authenticated.use('*', apiKeyAuth(db));

  async function withTenant<T>(tenantId: string, fn: (tx: AnyDb) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setTenantContext(tx as any, tenantId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fn(tx as any);
    });
  }

  // ── /me ───────────────────────────────────────────────────────────────
  authenticated.get('/me', async (c) => {
    const tenantId = c.get('tenantId');
    const apiKeyId = c.get('apiKeyId');
    const scopes = c.get('scopes');

    const tenants = await db.select().from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    const keys = await db
      .select({ name: apiKey.name, prefix: apiKey.prefix })
      .from(apiKey)
      .where(eq(apiKey.id, apiKeyId))
      .limit(1);

    return c.json({
      data: {
        tenantId,
        tenantName: tenants[0]?.name ?? null,
        keyName: keys[0]?.name ?? null,
        keyPrefix: keys[0]?.prefix ?? null,
        scopes,
      },
    });
  });

  // ── Properties ────────────────────────────────────────────────────────
  authenticated.get('/properties', async (c) => {
    const tenantId = c.get('tenantId');
    const { cursor, limit } = parsePagination(c);
    const search = c.req.query('search');
    const statusFilter = c.req.query('status');

    return withTenant(tenantId, async (tx) => {
      const conditions = [
        isNull(property.deletedAt),
        ...(statusFilter ? [eq(property.status, statusFilter as 'active')] : []),
        ...(search ? [or(ilike(property.title, `%${search}%`), ilike(property.referenceCode, `%${search}%`))] : []),
        ...(cursor ? [lt(property.id, cursor)] : []),
      ];

      const rows = await tx
        .select()
        .from(property)
        .where(and(...conditions))
        .orderBy(desc(property.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return c.json({ data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null });
    });
  });

  authenticated.get('/properties/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(property)
        .where(and(eq(property.id, id), isNull(property.deletedAt)))
        .limit(1);

      if (rows.length === 0) return c.json(errorJson('not_found', 'Property not found'), 404);
      return c.json({ data: rows[0] });
    });
  });

  authenticated.post('/properties', requireScopes('properties:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json();

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .insert(property)
        .values({
          tenantId,
          referenceCode: body.referenceCode ?? `REF-${Date.now()}`,
          title: body.title,
          description: body.description,
          propertyType: body.propertyType ?? 'apartment',
          status: body.status ?? 'active',
          featured: body.featured ?? false,
          coveredAreaM2: body.surfaceCovered,
          totalAreaM2: body.surfaceTotal,
          rooms: body.rooms,
          bedrooms: body.bedrooms,
          bathrooms: body.bathrooms,
          garages: body.parkingSpaces,
          country: body.address?.country ?? 'AR',
          province: body.address?.state,
          locality: body.address?.city,
          addressStreet: body.address?.street,
          addressNumber: body.address?.number,
          lat: body.location?.lat,
          lng: body.location?.lng,
        })
        .returning();

      return c.json({ data: rows[0] }, 201);
    });
  });

  authenticated.patch('/properties/:id', requireScopes('properties:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    const body = await c.req.json();

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: property.id }).from(property)
        .where(and(eq(property.id, id), isNull(property.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Property not found'), 404);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.title !== undefined) updates['title'] = body.title;
      if (body.description !== undefined) updates['description'] = body.description;
      if (body.status !== undefined) updates['status'] = body.status;
      if (body.featured !== undefined) updates['featured'] = body.featured;
      if (body.surfaceTotal !== undefined) updates['totalAreaM2'] = body.surfaceTotal;
      if (body.surfaceCovered !== undefined) updates['coveredAreaM2'] = body.surfaceCovered;
      if (body.rooms !== undefined) updates['rooms'] = body.rooms;
      if (body.bedrooms !== undefined) updates['bedrooms'] = body.bedrooms;
      if (body.bathrooms !== undefined) updates['bathrooms'] = body.bathrooms;
      if (body.parkingSpaces !== undefined) updates['garages'] = body.parkingSpaces;

      const rows = await tx
        .update(property)
        .set(updates)
        .where(eq(property.id, id))
        .returning();

      return c.json({ data: rows[0] });
    });
  });

  authenticated.delete('/properties/:id', requireScopes('properties:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: property.id }).from(property)
        .where(and(eq(property.id, id), isNull(property.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Property not found'), 404);

      await tx
        .update(property)
        .set({ deletedAt: new Date() })
        .where(eq(property.id, id));

      return c.body(null, 204);
    });
  });

  // ── Property Media ────────────────────────────────────────────────────
  authenticated.get('/properties/:id/media', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(propertyMedia)
        .where(eq(propertyMedia.propertyId, id))
        .orderBy(propertyMedia.sortOrder);

      return c.json({ data: rows });
    });
  });

  authenticated.post('/properties/:id/media', requireScopes('properties:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    const body = await c.req.json();

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .insert(propertyMedia)
        .values({
          tenantId,
          propertyId: id,
          storageKey: body.url,
          mediaType: body.mimeType?.startsWith('video') ? 'video' : 'photo',
          fullUrl: body.url,
          caption: body.title ?? body.description,
          sortOrder: body.position ?? 0,
        })
        .returning();

      return c.json({ data: rows[0] }, 201);
    });
  });

  authenticated.delete('/properties/:id/media/:mediaId', requireScopes('properties:write'), async (c) => {
    const mediaId = c.req.param('mediaId');
    if (!validateUuid(mediaId)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);
    const tenantId = c.get('tenantId');

    return withTenant(tenantId, async (tx) => {
      const deleted = await tx
        .delete(propertyMedia)
        .where(eq(propertyMedia.id, mediaId))
        .returning({ id: propertyMedia.id });

      if (deleted.length === 0) return c.json(errorJson('not_found', 'Media not found'), 404);
      return c.body(null, 204);
    });
  });

  // ── Contacts ──────────────────────────────────────────────────────────
  authenticated.get('/contacts', async (c) => {
    const tenantId = c.get('tenantId');
    const { cursor, limit } = parsePagination(c);
    const search = c.req.query('search');
    const kindFilter = c.req.query('kind');

    return withTenant(tenantId, async (tx) => {
      const conditions = [
        isNull(contact.deletedAt),
        ...(kindFilter ? [eq(contact.kind, kindFilter as 'person')] : []),
        ...(search
          ? [or(
              ilike(contact.firstName, `%${search}%`),
              ilike(contact.lastName, `%${search}%`),
              ilike(contact.legalName, `%${search}%`),
            )]
          : []),
        ...(cursor ? [lt(contact.id, cursor)] : []),
      ];

      const rows = await tx
        .select()
        .from(contact)
        .where(and(...conditions))
        .orderBy(desc(contact.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return c.json({ data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null });
    });
  });

  authenticated.get('/contacts/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(contact)
        .where(and(eq(contact.id, id), isNull(contact.deletedAt)))
        .limit(1);

      if (rows.length === 0) return c.json(errorJson('not_found', 'Contact not found'), 404);
      return c.json({ data: rows[0] });
    });
  });

  authenticated.post('/contacts', requireScopes('contacts:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json();

    if (!body.kind) return c.json(errorJson('validation_error', 'kind is required'), 422);

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .insert(contact)
        .values({
          tenantId,
          kind: body.kind,
          firstName: body.firstName,
          lastName: body.lastName,
          legalName: body.companyName,
          emails: body.email ? [{ value: body.email, type: 'work', primary: true }] : [],
          phones: body.phone ? [{ e164: body.phone, type: 'mobile', primary: true }] : [],
          nationalId: body.nationalId,
          notes: body.notes,
        })
        .returning();

      return c.json({ data: rows[0] }, 201);
    });
  });

  authenticated.patch('/contacts/:id', requireScopes('contacts:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    const body = await c.req.json();

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: contact.id }).from(contact)
        .where(and(eq(contact.id, id), isNull(contact.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Contact not found'), 404);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.firstName !== undefined) updates['firstName'] = body.firstName;
      if (body.lastName !== undefined) updates['lastName'] = body.lastName;
      if (body.companyName !== undefined) updates['legalName'] = body.companyName;
      if (body.nationalId !== undefined) updates['nationalId'] = body.nationalId;
      if (body.notes !== undefined) updates['notes'] = body.notes;
      if (body.email !== undefined) updates['emails'] = [{ value: body.email, type: 'work', primary: true }];
      if (body.phone !== undefined) updates['phones'] = [{ e164: body.phone, type: 'mobile', primary: true }];

      const rows = await tx
        .update(contact)
        .set(updates)
        .where(eq(contact.id, id))
        .returning();

      return c.json({ data: rows[0] });
    });
  });

  authenticated.delete('/contacts/:id', requireScopes('contacts:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: contact.id }).from(contact)
        .where(and(eq(contact.id, id), isNull(contact.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Contact not found'), 404);

      await tx.update(contact).set({ deletedAt: new Date() }).where(eq(contact.id, id));
      return c.body(null, 204);
    });
  });

  // ── Contact sub-resources ─────────────────────────────────────────────
  authenticated.get('/contacts/:id/leads', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);
    const { cursor, limit } = parsePagination(c);

    return withTenant(tenantId, async (tx) => {
      const conditions = [
        eq(lead.contactId, id),
        isNull(lead.deletedAt),
        ...(cursor ? [lt(lead.id, cursor)] : []),
      ];

      const rows = await tx
        .select()
        .from(lead)
        .where(and(...conditions))
        .orderBy(desc(lead.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return c.json({ data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null });
    });
  });

  // ── Leads ─────────────────────────────────────────────────────────────
  authenticated.get('/leads', async (c) => {
    const tenantId = c.get('tenantId');
    const { cursor, limit } = parsePagination(c);
    const pipelineId = c.req.query('pipelineId');
    const stageId = c.req.query('stageId');
    const search = c.req.query('search');

    return withTenant(tenantId, async (tx) => {
      const conditions = [
        isNull(lead.deletedAt),
        ...(pipelineId && validateUuid(pipelineId) ? [eq(lead.pipelineId, pipelineId)] : []),
        ...(stageId && validateUuid(stageId) ? [eq(lead.stageId, stageId)] : []),
        ...(search ? [ilike(lead.title, `%${search}%`)] : []),
        ...(cursor ? [lt(lead.id, cursor)] : []),
      ];

      const rows = await tx
        .select()
        .from(lead)
        .where(and(...conditions))
        .orderBy(desc(lead.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      return c.json({ data, nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null });
    });
  });

  authenticated.get('/leads/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(lead)
        .where(and(eq(lead.id, id), isNull(lead.deletedAt)))
        .limit(1);

      if (rows.length === 0) return c.json(errorJson('not_found', 'Lead not found'), 404);
      return c.json({ data: rows[0] });
    });
  });

  authenticated.post('/leads', requireScopes('leads:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json();

    if (!body.pipelineId || !body.stageId) {
      return c.json(errorJson('validation_error', 'pipelineId and stageId are required'), 422);
    }

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .insert(lead)
        .values({
          tenantId,
          pipelineId: body.pipelineId,
          stageId: body.stageId,
          contactId: body.contactId,
          propertyId: body.propertyId,
          title: body.title,
          expectedValue: body.value?.toString(),
          expectedCurrency: body.currency ?? 'USD',
          ownerUserId: body.ownerUserId,
        })
        .returning();

      return c.json({ data: rows[0] }, 201);
    });
  });

  authenticated.patch('/leads/:id', requireScopes('leads:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    const body = await c.req.json();

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: lead.id }).from(lead)
        .where(and(eq(lead.id, id), isNull(lead.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Lead not found'), 404);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.stageId !== undefined) updates['stageId'] = body.stageId;
      if (body.title !== undefined) updates['title'] = body.title;
      if (body.value !== undefined) updates['expectedValue'] = body.value?.toString();
      if (body.currency !== undefined) updates['expectedCurrency'] = body.currency;
      if (body.ownerUserId !== undefined) updates['ownerUserId'] = body.ownerUserId;
      if (body.lostReason !== undefined) updates['lostReason'] = body.lostReason;
      if (body.status === 'won') updates['wonAt'] = new Date();
      if (body.status === 'lost') updates['lostAt'] = new Date();

      const rows = await tx
        .update(lead)
        .set(updates)
        .where(eq(lead.id, id))
        .returning();

      return c.json({ data: rows[0] });
    });
  });

  // ── Webhooks ──────────────────────────────────────────────────────────
  authenticated.get('/webhooks', requireScopes('webhooks:write'), async (c) => {
    const tenantId = c.get('tenantId');

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          active: webhook.active,
          lastTriggeredAt: webhook.lastTriggeredAt,
          failureCount: webhook.failureCount,
          createdAt: webhook.createdAt,
        })
        .from(webhook)
        .where(isNull(webhook.deletedAt))
        .orderBy(desc(webhook.createdAt));

      return c.json({ data: rows });
    });
  });

  authenticated.post('/webhooks', requireScopes('webhooks:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const body = await c.req.json();

    if (!body.url || !body.events?.length) {
      return c.json(errorJson('validation_error', 'url and events are required'), 422);
    }

    const VALID_EVENTS = [
      'property.created', 'property.updated', 'property.deleted',
      'contact.created', 'contact.updated',
      'lead.created', 'lead.stage_changed', 'lead.won', 'lead.lost',
      'inbox.message.received',
      'reservation.created', 'boleto.signed',
    ];
    const invalidEvents = (body.events as string[]).filter((e) => !VALID_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return c.json(errorJson('validation_error', `Invalid event types: ${invalidEvents.join(', ')}`), 422);
    }

    const rawSecret = `whsec_${randomBytes(32).toString('hex')}`;
    const secretHash = createHash('sha256').update(rawSecret).digest('hex');

    return withTenant(tenantId, async (tx) => {
      const rows = await tx
        .insert(webhook)
        .values({
          tenantId,
          url: body.url,
          events: body.events,
          secretHash,
        })
        .returning({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          active: webhook.active,
          lastTriggeredAt: webhook.lastTriggeredAt,
          failureCount: webhook.failureCount,
          createdAt: webhook.createdAt,
        });

      return c.json({ data: { ...rows[0], secret: rawSecret } }, 201);
    });
  });

  authenticated.delete('/webhooks/:id', requireScopes('webhooks:write'), async (c) => {
    const tenantId = c.get('tenantId');
    const id = c.req.param('id');
    if (!validateUuid(id)) return c.json(errorJson('validation_error', 'Invalid ID format'), 400);

    return withTenant(tenantId, async (tx) => {
      const existing = await tx.select({ id: webhook.id }).from(webhook)
        .where(and(eq(webhook.id, id), isNull(webhook.deletedAt)))
        .limit(1);
      if (existing.length === 0) return c.json(errorJson('not_found', 'Webhook not found'), 404);

      await tx.update(webhook).set({ deletedAt: new Date() }).where(eq(webhook.id, id));
      return c.body(null, 204);
    });
  });

  // ── Portal Status ─────────────────────────────────────────────────────
  authenticated.get('/portals/status', async (c) => {
    return c.json({ data: [] });
  });

  // Mount authenticated routes
  app.route('/', authenticated);

  return app;
}
