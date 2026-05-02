import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  eq, and, or, isNull, asc, desc, sql, inArray,
} from 'drizzle-orm';
import {
  conversation,
  message,
  inboxChannel,
  cannedResponse,
  autoTriageRule,
  contact,
  user,
} from '@corredor/db';
import { router, protectedProcedure } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const ConversationListInput = z.object({
  channelId: z.string().uuid().optional(),
  status:    z.enum(['open', 'assigned', 'pending', 'resolved', 'closed']).optional(),
  assignedAgentId: z.string().uuid().optional(),
  search:    z.string().max(200).optional(),
  sortBy:    z.enum(['last_message_at', 'created_at']).default('last_message_at'),
  sortDir:   z.enum(['asc', 'desc']).default('desc'),
  limit:     z.number().int().min(1).max(100).default(50),
  cursor:    z.string().optional(),
});

const ConversationAssignInput = z.object({
  conversationId: z.string().uuid(),
  agentId:        z.string().uuid().nullable(),
});

const BulkAssignInput = z.object({
  conversationIds: z.array(z.string().uuid()).min(1).max(100),
  agentId:         z.string().uuid().nullable(),
});

const MessageListInput = z.object({
  conversationId: z.string().uuid(),
  limit:  z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

const MessageSendInput = z.object({
  conversationId: z.string().uuid(),
  contentType: z.enum(['text', 'image', 'video', 'audio', 'document', 'template', 'location', 'contact_card']).default('text'),
  content: z.record(z.unknown()),
});

const CannedResponseInput = z.object({
  title: z.string().min(1).max(200),
  body:  z.string().min(1).max(10000),
  tags:  z.array(z.string().max(50)).max(20).default([]),
});

const AutoTriageRuleInput = z.object({
  name:       z.string().min(1).max(200),
  conditions: z.object({
    operator: z.enum(['and', 'or']),
    rules: z.array(z.object({
      field:    z.string(),
      operator: z.enum(['contains', 'equals', 'starts_with', 'regex']),
      value:    z.string(),
    })),
  }),
  action: z.object({
    type: z.enum(['assign', 'tag', 'set_priority', 'auto_reply']),
    agentId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    priority: z.number().int().optional(),
    cannedResponseId: z.string().uuid().optional(),
  }),
  priority: z.number().int().default(0),
  enabled:  z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const inboxRouter = router({

  // ---- Conversations ----

  'conversations.list': protectedProcedure
    .input(ConversationListInput)
    .query(async ({ ctx, input }) => {
      const conditions: ReturnType<typeof eq>[] = [
        eq(conversation.tenantId, ctx.tenantId),
        isNull(conversation.deletedAt),
      ];
      if (input.channelId)       conditions.push(eq(conversation.channelId, input.channelId));
      if (input.status)          conditions.push(eq(conversation.status, input.status));
      if (input.assignedAgentId) conditions.push(eq(conversation.assignedAgentId, input.assignedAgentId));

      const sortCol = input.sortBy === 'last_message_at' ? conversation.lastMessageAt : conversation.createdAt;
      const isDesc = input.sortDir === 'desc';

      if (input.cursor) {
        let cursorSortVal: string;
        let cursorId: string;
        try {
          const decoded = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8'));
          cursorSortVal = decoded.v;
          cursorId = decoded.id;
          if (cursorSortVal === undefined || !cursorId) throw new Error('missing fields');
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
        }

        conditions.push(
          or(
            isDesc
              ? sql`${sortCol} < ${cursorSortVal}`
              : sql`${sortCol} > ${cursorSortVal}`,
            and(
              sql`${sortCol} = ${cursorSortVal}`,
              isDesc
                ? sql`${conversation.id} > ${cursorId}::uuid`
                : sql`${conversation.id} < ${cursorId}::uuid`,
            ),
          )!,
        );
      }

      const orderFn = isDesc ? desc : asc;

      const rows = await ctx.db
        .select({
          conversation: conversation,
          contactFirstName: contact.firstName,
          contactLastName:  contact.lastName,
          contactLegalName: contact.legalName,
          contactKind:      contact.kind,
          channelType:      inboxChannel.type,
          channelName:      inboxChannel.name,
          agentName:        user.fullName,
        })
        .from(conversation)
        .leftJoin(contact, eq(conversation.contactId, contact.id))
        .leftJoin(inboxChannel, eq(conversation.channelId, inboxChannel.id))
        .leftJoin(user, eq(conversation.assignedAgentId, user.id))
        .where(and(...conditions))
        .orderBy(orderFn(sortCol), conversation.id)
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);

      let nextCursor: string | null = null;
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1]!.conversation;
        const sortVal = input.sortBy === 'last_message_at'
          ? (last.lastMessageAt instanceof Date ? last.lastMessageAt.toISOString() : last.lastMessageAt)
          : (last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt);
        nextCursor = Buffer.from(JSON.stringify({ v: sortVal, id: last.id })).toString('base64');
      }

      return { items, nextCursor };
    }),

  'conversations.get': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          conversation: conversation,
          contactFirstName: contact.firstName,
          contactLastName:  contact.lastName,
          contactLegalName: contact.legalName,
          contactKind:      contact.kind,
          contactPhones:    contact.phones,
          contactEmails:    contact.emails,
          channelType:      inboxChannel.type,
          channelName:      inboxChannel.name,
          agentName:        user.fullName,
        })
        .from(conversation)
        .leftJoin(contact, eq(conversation.contactId, contact.id))
        .leftJoin(inboxChannel, eq(conversation.channelId, inboxChannel.id))
        .leftJoin(user, eq(conversation.assignedAgentId, user.id))
        .where(and(
          eq(conversation.id, input.id),
          eq(conversation.tenantId, ctx.tenantId),
          isNull(conversation.deletedAt),
        ));

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const messages = await ctx.db
        .select()
        .from(message)
        .where(and(
          eq(message.conversationId, input.id),
          eq(message.tenantId, ctx.tenantId),
        ))
        .orderBy(desc(message.createdAt))
        .limit(50);

      return { ...row, messages };
    }),

  'conversations.assign': protectedProcedure
    .input(ConversationAssignInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(conversation)
        .where(and(
          eq(conversation.id, input.conversationId),
          eq(conversation.tenantId, ctx.tenantId),
          isNull(conversation.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const now = new Date();
      const [updated] = await ctx.db
        .update(conversation)
        .set({
          assignedAgentId: input.agentId,
          status: input.agentId ? 'assigned' : 'open',
          updatedAt: now,
          updatedBy: ctx.userId,
          version: existing.version + 1,
        })
        .where(and(
          eq(conversation.id, input.conversationId),
          eq(conversation.tenantId, ctx.tenantId),
        ))
        .returning();

      return updated;
    }),

  'conversations.bulkAssign': protectedProcedure
    .input(BulkAssignInput)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(conversation)
        .where(and(
          eq(conversation.tenantId, ctx.tenantId),
          inArray(conversation.id, input.conversationIds),
          isNull(conversation.deletedAt),
        ));

      if (existing.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No conversations found' });
      }

      const now = new Date();
      const ids = existing.map((c) => c.id);

      await ctx.db
        .update(conversation)
        .set({
          assignedAgentId: input.agentId,
          status: input.agentId ? 'assigned' : 'open',
          updatedAt: now,
          updatedBy: ctx.userId,
          version: sql`${conversation.version} + 1`,
        })
        .where(and(
          eq(conversation.tenantId, ctx.tenantId),
          inArray(conversation.id, ids),
        ));

      return { assigned: ids.length };
    }),

  // ---- Messages ----

  'messages.list': protectedProcedure
    .input(MessageListInput)
    .query(async ({ ctx, input }) => {
      const [conv] = await ctx.db
        .select({ id: conversation.id })
        .from(conversation)
        .where(and(
          eq(conversation.id, input.conversationId),
          eq(conversation.tenantId, ctx.tenantId),
        ));

      if (!conv) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const conditions: ReturnType<typeof eq>[] = [
        eq(message.conversationId, input.conversationId),
        eq(message.tenantId, ctx.tenantId),
      ];

      if (input.cursor) {
        let cursorCreatedAt: string;
        let cursorId: string;
        try {
          const decoded = JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8'));
          cursorCreatedAt = decoded.v;
          cursorId = decoded.id;
        } catch {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid cursor' });
        }

        conditions.push(
          or(
            sql`${message.createdAt} < ${cursorCreatedAt}`,
            and(
              sql`${message.createdAt} = ${cursorCreatedAt}`,
              sql`${message.id} > ${cursorId}::uuid`,
            ),
          )!,
        );
      }

      const rows = await ctx.db
        .select()
        .from(message)
        .where(and(...conditions))
        .orderBy(desc(message.createdAt), message.id)
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);

      let nextCursor: string | null = null;
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1]!;
        const createdAtStr = last.createdAt instanceof Date ? last.createdAt.toISOString() : last.createdAt;
        nextCursor = Buffer.from(JSON.stringify({ v: createdAtStr, id: last.id })).toString('base64');
      }

      return { items, nextCursor };
    }),

  'messages.send': protectedProcedure
    .input(MessageSendInput)
    .mutation(async ({ ctx, input }) => {
      const [conv] = await ctx.db
        .select({
          id:        conversation.id,
          channelId: conversation.channelId,
          contactId: conversation.contactId,
          version:   conversation.version,
        })
        .from(conversation)
        .where(and(
          eq(conversation.id, input.conversationId),
          eq(conversation.tenantId, ctx.tenantId),
          isNull(conversation.deletedAt),
        ));

      if (!conv) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
      }

      const now = new Date();

      const [msg] = await ctx.db
        .insert(message)
        .values({
          tenantId:       ctx.tenantId,
          conversationId: input.conversationId,
          direction:      'out',
          contentType:    input.contentType,
          content:        input.content,
          status:         'queued',
          senderUserId:   ctx.userId,
          createdAt:      now,
        })
        .returning();

      await ctx.db
        .update(conversation)
        .set({
          lastMessageAt: now,
          messageCount:  sql`${conversation.messageCount} + 1`,
          updatedAt:     now,
          updatedBy:     ctx.userId,
          version:       conv.version + 1,
          slaFirstResponseAt: sql`COALESCE(${conversation.slaFirstResponseAt}, ${now})`,
        })
        .where(and(
          eq(conversation.id, input.conversationId),
          eq(conversation.tenantId, ctx.tenantId),
        ));

      const queue = ctx.queues?.['inbox-send'];
      if (queue) {
        await queue.add('send', {
          messageId:  msg!.id,
          tenantId:   ctx.tenantId,
          channelId:  conv.channelId,
          contactId:  conv.contactId,
        });
      }

      return msg;
    }),

  // ---- Canned Responses ----

  'cannedResponses.list': protectedProcedure
    .input(z.object({
      search: z.string().max(200).optional(),
      limit:  z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(cannedResponse.tenantId, ctx.tenantId),
        isNull(cannedResponse.deletedAt),
      ];

      const rows = await ctx.db
        .select()
        .from(cannedResponse)
        .where(and(...conditions))
        .orderBy(asc(cannedResponse.title))
        .limit(input.limit);

      return rows;
    }),

  'cannedResponses.create': protectedProcedure
    .input(CannedResponseInput)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(cannedResponse)
        .values({
          tenantId:  ctx.tenantId,
          title:     input.title,
          body:      input.body,
          tags:      input.tags,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning();

      return created;
    }),

  'cannedResponses.update': protectedProcedure
    .input(z.object({
      id:    z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      body:  z.string().min(1).max(10000).optional(),
      tags:  z.array(z.string().max(50)).max(20).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cannedResponse)
        .where(and(
          eq(cannedResponse.id, input.id),
          eq(cannedResponse.tenantId, ctx.tenantId),
          isNull(cannedResponse.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Canned response not found' });
      }

      const updates: Partial<typeof cannedResponse.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.title !== undefined) updates.title = input.title;
      if (input.body !== undefined)  updates.body = input.body;
      if (input.tags !== undefined)  updates.tags = input.tags;

      const [updated] = await ctx.db
        .update(cannedResponse)
        .set(updates)
        .where(and(eq(cannedResponse.id, input.id), eq(cannedResponse.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  'cannedResponses.delete': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(cannedResponse)
        .where(and(
          eq(cannedResponse.id, input.id),
          eq(cannedResponse.tenantId, ctx.tenantId),
          isNull(cannedResponse.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Canned response not found' });
      }

      await ctx.db
        .update(cannedResponse)
        .set({ deletedAt: new Date(), updatedBy: ctx.userId })
        .where(eq(cannedResponse.id, input.id));

      return { success: true };
    }),

  // ---- Auto-Triage Rules ----

  'autoTriageRules.list': protectedProcedure
    .input(z.object({
      enabledOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(autoTriageRule.tenantId, ctx.tenantId),
        isNull(autoTriageRule.deletedAt),
      ];
      if (input.enabledOnly) conditions.push(eq(autoTriageRule.enabled, true));

      const rows = await ctx.db
        .select()
        .from(autoTriageRule)
        .where(and(...conditions))
        .orderBy(asc(autoTriageRule.priority));

      return rows;
    }),

  'autoTriageRules.create': protectedProcedure
    .input(AutoTriageRuleInput)
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(autoTriageRule)
        .values({
          tenantId:   ctx.tenantId,
          name:       input.name,
          conditions: input.conditions,
          action:     input.action,
          priority:   input.priority,
          enabled:    input.enabled,
          createdBy:  ctx.userId,
          updatedBy:  ctx.userId,
        })
        .returning();

      return created;
    }),

  'autoTriageRules.update': protectedProcedure
    .input(z.object({
      id:         z.string().uuid(),
      name:       z.string().min(1).max(200).optional(),
      conditions: AutoTriageRuleInput.shape.conditions.optional(),
      action:     AutoTriageRuleInput.shape.action.optional(),
      priority:   z.number().int().optional(),
      enabled:    z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(autoTriageRule)
        .where(and(
          eq(autoTriageRule.id, input.id),
          eq(autoTriageRule.tenantId, ctx.tenantId),
          isNull(autoTriageRule.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Auto-triage rule not found' });
      }

      const updates: Partial<typeof autoTriageRule.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: ctx.userId,
        version:   existing.version + 1,
      };
      if (input.name !== undefined)       updates.name = input.name;
      if (input.conditions !== undefined) updates.conditions = input.conditions;
      if (input.action !== undefined)     updates.action = input.action;
      if (input.priority !== undefined)   updates.priority = input.priority;
      if (input.enabled !== undefined)    updates.enabled = input.enabled;

      const [updated] = await ctx.db
        .update(autoTriageRule)
        .set(updates)
        .where(and(eq(autoTriageRule.id, input.id), eq(autoTriageRule.tenantId, ctx.tenantId)))
        .returning();

      return updated;
    }),

  'autoTriageRules.delete': protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(autoTriageRule)
        .where(and(
          eq(autoTriageRule.id, input.id),
          eq(autoTriageRule.tenantId, ctx.tenantId),
          isNull(autoTriageRule.deletedAt),
        ));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Auto-triage rule not found' });
      }

      await ctx.db
        .update(autoTriageRule)
        .set({ deletedAt: new Date(), updatedBy: ctx.userId })
        .where(eq(autoTriageRule.id, input.id));

      return { success: true };
    }),
});
