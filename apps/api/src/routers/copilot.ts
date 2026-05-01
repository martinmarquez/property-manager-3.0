import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  copilotSession,
  copilotTurn,
} from '@corredor/db';
import {
  createAnthropicClient,
  classifyIntent,
  generateResponse,
  checkQuota,
  incrementQuota,
} from '@corredor/ai';
import type { AnthropicClient, TurnMessage } from '@corredor/ai';
import { router, protectedProcedure } from '../trpc.js';
import type { AuthenticatedContext } from '../trpc.js';
import { env } from '../env.js';

function getAnthropicClient(): AnthropicClient {
  if (!env.ANTHROPIC_API_KEY) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'AI provider not configured',
    });
  }
  return createAnthropicClient(env.ANTHROPIC_API_KEY);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export const copilotRouter = router({
  listSessions: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { tenantId, userId, db } = ctx as AuthenticatedContext;

      const conditions = [
        eq(copilotSession.tenantId, tenantId),
        eq(copilotSession.userId, userId),
      ];

      if (input.cursor) {
        const cursorRow = await db
          .select({ createdAt: copilotSession.createdAt })
          .from(copilotSession)
          .where(eq(copilotSession.id, input.cursor))
          .limit(1);

        if (cursorRow[0]) {
          conditions.push(
            sql`${copilotSession.createdAt} < ${cursorRow[0].createdAt}`,
          );
        }
      }

      const sessions = await db
        .select({
          id: copilotSession.id,
          title: copilotSession.title,
          isActive: copilotSession.isActive,
          turnCount: copilotSession.turnCount,
          createdAt: copilotSession.createdAt,
          updatedAt: copilotSession.updatedAt,
        })
        .from(copilotSession)
        .where(and(...conditions))
        .orderBy(desc(copilotSession.createdAt))
        .limit(input.limit + 1);

      const hasMore = sessions.length > input.limit;
      const items = hasMore ? sessions.slice(0, input.limit) : sessions;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      };
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { tenantId, userId, db } = ctx as AuthenticatedContext;

      const [session] = await db
        .select()
        .from(copilotSession)
        .where(
          and(
            eq(copilotSession.id, input.sessionId),
            eq(copilotSession.tenantId, tenantId),
            eq(copilotSession.userId, userId),
          ),
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      const turns = await db
        .select()
        .from(copilotTurn)
        .where(eq(copilotTurn.sessionId, session.id))
        .orderBy(copilotTurn.createdAt);

      return { session, turns };
    }),

  createSession: protectedProcedure
    .input(
      z.object({
        title: z.string().max(200).optional(),
        context: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, userId, db } = ctx as AuthenticatedContext;

      const [session] = await db
        .insert(copilotSession)
        .values({
          tenantId,
          userId,
          title: input.title ?? null,
          context: input.context ?? {},
        })
        .returning();

      return session!;
    }),

  submitTurn: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        message: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, userId, db, redis } = ctx as AuthenticatedContext;

      // Verify session ownership
      const [session] = await db
        .select()
        .from(copilotSession)
        .where(
          and(
            eq(copilotSession.id, input.sessionId),
            eq(copilotSession.tenantId, tenantId),
            eq(copilotSession.userId, userId),
          ),
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }

      if (!session.isActive) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session is closed' });
      }

      // Quota check (default plan: 'free' — TODO: read from tenant.plan)
      const quota = await checkQuota(redis, tenantId, userId, 'free');
      if (!quota.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Monthly copilot limit reached (${quota.limit}). Upgrade plan for unlimited access.`,
        });
      }

      const client = getAnthropicClient();
      const startMs = Date.now();

      // Get conversation history for context
      const historyRows = await db
        .select({ role: copilotTurn.role, content: copilotTurn.content })
        .from(copilotTurn)
        .where(eq(copilotTurn.sessionId, session.id))
        .orderBy(copilotTurn.createdAt);

      const history: TurnMessage[] = historyRows
        .filter((r) => r.role === 'user' || r.role === 'assistant')
        .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));

      // Build context string from last 3 turns for classifier
      const recentContext = history.slice(-3).map((h) => `${h.role}: ${h.content}`).join('\n');

      // Classify intent
      const classification = await classifyIntent(client, input.message, recentContext);

      // Save user turn
      const [userTurn] = await db
        .insert(copilotTurn)
        .values({
          tenantId,
          sessionId: session.id,
          role: 'user',
          intent: classification.type,
          content: input.message,
        })
        .returning();

      // Generate response (non-streaming for tRPC mutation)
      const result = await generateResponse(client, {
        tenantId,
        userId,
        intent: classification.type,
        message: input.message,
        history,
        retrievedChunks: [],
        locale: 'es-AR',
      });

      const latencyMs = Date.now() - startMs;

      // Save assistant turn
      const [assistantTurn] = await db
        .insert(copilotTurn)
        .values({
          tenantId,
          sessionId: session.id,
          role: 'assistant',
          intent: classification.type,
          content: result.content,
          toolCalls: result.actionSuggestion ? [result.actionSuggestion] : null,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          tokenCount: result.inputTokens + result.outputTokens,
          latencyMs,
          totalMs: latencyMs,
          model: result.model,
          actionType: result.actionSuggestion?.type ?? null,
          actionConfirmed: result.actionSuggestion ? false : null,
        })
        .returning();

      // Increment counters
      await incrementQuota(redis, tenantId, userId);

      // Update session turn count + title (auto-title from first message)
      const updates: Record<string, unknown> = {
        turnCount: sql`${copilotSession.turnCount} + 2`,
        updatedAt: new Date(),
      };
      if (!session.title && input.message.length > 0) {
        updates.title = input.message.slice(0, 100);
      }
      await db
        .update(copilotSession)
        .set(updates)
        .where(eq(copilotSession.id, session.id));

      // Update quota usage in DB
      const month = currentMonth();
      const totalTokens = result.inputTokens + result.outputTokens;
      await db.execute(
        sql`INSERT INTO copilot_quota_usage (id, tenant_id, month, total_tokens, total_requests, chat_tokens, updated_at)
            VALUES (gen_random_uuid(), ${tenantId}, ${month}, ${totalTokens}, 1, ${totalTokens}, now())
            ON CONFLICT (tenant_id, month)
            DO UPDATE SET
              total_tokens = copilot_quota_usage.total_tokens + ${totalTokens},
              total_requests = copilot_quota_usage.total_requests + 1,
              chat_tokens = copilot_quota_usage.chat_tokens + ${totalTokens},
              updated_at = now()`,
      );

      return {
        userTurn: userTurn!,
        assistantTurn: assistantTurn!,
        intent: classification,
        citations: result.citations,
        actionSuggestion: result.actionSuggestion,
      };
    }),

  confirmAction: protectedProcedure
    .input(
      z.object({
        turnId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;

      const [turn] = await db
        .select()
        .from(copilotTurn)
        .where(
          and(
            eq(copilotTurn.id, input.turnId),
            eq(copilotTurn.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!turn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Turn not found' });
      }

      if (turn.actionConfirmed !== false) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No pending action on this turn' });
      }

      await db
        .update(copilotTurn)
        .set({ actionConfirmed: true })
        .where(eq(copilotTurn.id, input.turnId));

      return { confirmed: true, turnId: input.turnId, actionType: turn.actionType };
    }),

  cancelAction: protectedProcedure
    .input(
      z.object({
        turnId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenantId, db } = ctx as AuthenticatedContext;

      const [turn] = await db
        .select()
        .from(copilotTurn)
        .where(
          and(
            eq(copilotTurn.id, input.turnId),
            eq(copilotTurn.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!turn) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Turn not found' });
      }

      if (turn.actionConfirmed !== false) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No pending action on this turn' });
      }

      await db
        .update(copilotTurn)
        .set({ actionConfirmed: null, actionType: null })
        .where(eq(copilotTurn.id, input.turnId));

      return { cancelled: true, turnId: input.turnId };
    }),
});
