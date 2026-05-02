import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Redis } from 'ioredis';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import {
  copilotSession,
  copilotTurn,
} from '@corredor/db';
import {
  createAnthropicClient,
  classifyIntent,
  generateResponseStream,
  checkQuota,
  incrementQuota,
} from '@corredor/ai';
import type { TurnMessage } from '@corredor/ai';
import { Embedder, retrieve } from '@corredor/core';
import type { SqlClient } from '@corredor/core';
import type { AnyDb } from '../trpc.js';
import { getSession, getSessionId, IDLE_TIMEOUT_SECONDS } from '../middleware/session.js';
import { checkFeatureFlag, FeatureDisabledError } from '../lib/feature-flags.js';

interface StreamDeps {
  db: AnyDb;
  redis: Redis;
  anthropicApiKey: string | undefined;
  openaiApiKey: string | undefined;
  databaseUrl: string;
}

function makeSqlClient(databaseUrl: string): SqlClient {
  const neonSql = neon(databaseUrl);
  return {
    async query(text: string, params: unknown[]) {
      const rows = await neonSql(text, params as (string | number | boolean | null)[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { rows: rows as any };
    },
  };
}

export function createCopilotStreamRoutes(deps: StreamDeps) {
  const app = new Hono();
  const sqlClient = makeSqlClient(deps.databaseUrl);
  const embedder = deps.openaiApiKey
    ? new Embedder({ apiKey: deps.openaiApiKey, redis: deps.redis })
    : null;

  app.post('/turn', async (c) => {
    // Authenticate via session cookie (same as tRPC tenant middleware)
    const sessionId = getSessionId(c);
    if (!sessionId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const session = await getSession(deps.redis, sessionId);
    if (!session) {
      return c.json({ error: 'Session expired' }, 401);
    }

    const idleSeconds = (Date.now() - new Date(session.lastSeenAt).getTime()) / 1000;
    if (idleSeconds > IDLE_TIMEOUT_SECONDS) {
      return c.json({ error: 'Session expired due to inactivity' }, 401);
    }

    const { tenantId, userId } = session;

    // Parse request body
    let body: { sessionId: string; message: string };
    try {
      body = (await c.req.json()) as { sessionId: string; message: string };
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.sessionId || !body.message || body.message.length > 4000) {
      return c.json({ error: 'sessionId and message (max 4000 chars) required' }, 400);
    }

    // Verify copilot session ownership
    const [copSession] = await deps.db
      .select()
      .from(copilotSession)
      .where(
        and(
          eq(copilotSession.id, body.sessionId),
          eq(copilotSession.tenantId, tenantId),
          eq(copilotSession.userId, userId),
        ),
      )
      .limit(1);

    if (!copSession) {
      return c.json({ error: 'Copilot session not found' }, 404);
    }

    if (!copSession.isActive) {
      return c.json({ error: 'Session is closed' }, 400);
    }

    // Feature-flag gate
    try {
      await checkFeatureFlag(deps.db, tenantId, 'ai_copilot');
    } catch (e) {
      if (e instanceof FeatureDisabledError) {
        return c.json({ error: e.message, upgradePrompt: e.upgradePrompt }, 403);
      }
      throw e;
    }

    // Quota check
    const quota = await checkQuota(deps.redis, tenantId, userId, 'free');
    if (!quota.allowed) {
      return c.json({
        error: 'Monthly copilot limit reached',
        used: quota.used,
        limit: quota.limit,
      }, 429);
    }

    if (!deps.anthropicApiKey) {
      return c.json({ error: 'AI provider not configured' }, 503);
    }
    const client = createAnthropicClient(deps.anthropicApiKey);

    // Get conversation history
    const historyRows = await deps.db
      .select({ role: copilotTurn.role, content: copilotTurn.content })
      .from(copilotTurn)
      .where(eq(copilotTurn.sessionId, copSession.id))
      .orderBy(copilotTurn.createdAt);

    const history: TurnMessage[] = historyRows
      .filter((r: { role: string; content: string }) => r.role === 'user' || r.role === 'assistant')
      .map((r: { role: string; content: string }) => ({ role: r.role as 'user' | 'assistant', content: r.content }));

    const recentContext = history.slice(-3).map((h) => `${h.role}: ${h.content}`).join('\n');

    // Classify intent
    const classification = await classifyIntent(client, body.message, recentContext);

    // RAG retrieval — fetch relevant chunks for context injection
    let retrievedChunks: Awaited<ReturnType<typeof retrieve>> = [];
    if (embedder) {
      try {
        retrievedChunks = await retrieve(sqlClient, embedder, {
          tenantId,
          query: body.message,
          topK: 8,
          entityTypes: ['property', 'contact_note', 'document_page', 'property_description'],
        });
      } catch {
        // Non-fatal: proceed without RAG context rather than failing the turn
      }
    }

    // Save user turn
    await deps.db
      .insert(copilotTurn)
      .values({
        tenantId,
        sessionId: copSession.id,
        role: 'user',
        intent: classification.type,
        content: body.message,
      });

    const startMs = Date.now();

    // Stream SSE response
    return streamSSE(c, async (stream) => {
      // Send intent classification event
      await stream.writeSSE({
        event: 'intent',
        data: JSON.stringify(classification),
      });

      let fullText = '';
      let firstTokenMs: number | null = null;
      let streamMeta = { inputTokens: 0, outputTokens: 0, model: '' };

      try {
        const generator = generateResponseStream(client, {
          tenantId,
          userId,
          intent: classification.type,
          message: body.message,
          history,
          retrievedChunks,
          locale: 'es-AR',
        });

        for await (const event of generator) {
          switch (event.type) {
            case 'text_delta':
              if (firstTokenMs === null) firstTokenMs = Date.now() - startMs;
              fullText += event.data;
              await stream.writeSSE({ event: 'text_delta', data: event.data });
              break;
            case 'citations':
              await stream.writeSSE({ event: 'citations', data: event.data });
              break;
            case 'action_suggestion':
              await stream.writeSSE({ event: 'action_suggestion', data: event.data });
              break;
            case 'done': {
              const meta = JSON.parse(event.data) as {
                inputTokens: number;
                outputTokens: number;
                model: string;
              };
              streamMeta = meta;
              break;
            }
          }
        }
      } catch {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ message: 'Generation failed' }),
        });
        return;
      }

      const latencyMs = Date.now() - startMs;

      // Save assistant turn
      const [assistantTurn] = await deps.db
        .insert(copilotTurn)
        .values({
          tenantId,
          sessionId: copSession.id,
          role: 'assistant',
          intent: classification.type,
          content: fullText,
          inputTokens: streamMeta.inputTokens,
          outputTokens: streamMeta.outputTokens,
          tokenCount: streamMeta.inputTokens + streamMeta.outputTokens,
          firstTokenMs,
          latencyMs,
          totalMs: latencyMs,
          model: streamMeta.model,
        })
        .returning();

      // Increment quota + update session
      await incrementQuota(deps.redis, tenantId, userId);

      const updates: Record<string, unknown> = {
        turnCount: sql`${copilotSession.turnCount} + 2`,
        updatedAt: new Date(),
      };
      if (!copSession.title) {
        updates.title = body.message.slice(0, 100);
      }
      await deps.db
        .update(copilotSession)
        .set(updates)
        .where(eq(copilotSession.id, copSession.id));

      // Update DB quota tracking
      const month = new Date().toISOString().slice(0, 7);
      const totalTokens = streamMeta.inputTokens + streamMeta.outputTokens;
      await deps.db.execute(
        sql`INSERT INTO copilot_quota_usage (id, tenant_id, month, total_tokens, total_requests, chat_tokens, updated_at)
            VALUES (gen_random_uuid(), ${tenantId}, ${month}, ${totalTokens}, 1, ${totalTokens}, now())
            ON CONFLICT (tenant_id, month)
            DO UPDATE SET
              total_tokens = copilot_quota_usage.total_tokens + ${totalTokens},
              total_requests = copilot_quota_usage.total_requests + 1,
              chat_tokens = copilot_quota_usage.chat_tokens + ${totalTokens},
              updated_at = now()`,
      );

      // Final done event
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({
          turnId: assistantTurn?.id,
          inputTokens: streamMeta.inputTokens,
          outputTokens: streamMeta.outputTokens,
          model: streamMeta.model,
          latencyMs,
          firstTokenMs,
        }),
      });
    });
  });

  return app;
}
