/**
 * Calendar entity group
 *
 * Tables: calendar_event_type, calendar_event, calendar_event_attendee
 *
 * RLS policy (apply via migration 0005_calendar.sql):
 *   alter table <t> enable row level security;
 *   create policy tenant_isolation on <t>
 *     using (tenant_id = current_setting('app.tenant_id', true)::uuid)
 *     with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
 */

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './tenancy.js';
import { contact } from './contacts.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const attendeeStatusEnum = pgEnum('attendee_status', [
  'pending',
  'accepted',
  'declined',
  'tentative',
]);

export const calendarSyncStatusEnum = pgEnum('calendar_sync_status', [
  'local_only',
  'synced',
  'conflict',
  'pending_push',
  'pending_pull',
]);

export const linkedEntityTypeEnum = pgEnum('linked_entity_type', [
  'contact',
  'property',
  'lead',
]);

export const recurrenceFrequencyEnum = pgEnum('recurrence_frequency', [
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

// ---------------------------------------------------------------------------
// calendar_event_type — tenant-scoped event type definitions
// ---------------------------------------------------------------------------

export const calendarEventType = pgTable('calendar_event_type', {
  id:                  uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:            uuid('tenant_id').notNull(),
  name:                text('name').notNull(),
  color:               text('color').notNull(),
  icon:                text('icon').notNull(),
  defaultDurationMin:  integer('default_duration_min').notNull().default(60),
  descriptionTemplate: text('description_template'),
  builtIn:             boolean('built_in').notNull().default(false),
  sortOrder:           integer('sort_order').notNull().default(0),
  deletedAt:  timestamp('deleted_at', { withTimezone: true }),
  deletedBy:  uuid('deleted_by').references(() => user.id),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy:  uuid('created_by').references(() => user.id),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy:  uuid('updated_by').references(() => user.id),
  version:    integer('version').notNull().default(1),
}, (t) => ({
  uniqName: unique().on(t.tenantId, t.name),
}));

export type CalendarEventType = typeof calendarEventType.$inferSelect;
export type NewCalendarEventType = typeof calendarEventType.$inferInsert;

// ---------------------------------------------------------------------------
// calendar_event — core event record
// ---------------------------------------------------------------------------

export const calendarEvent = pgTable('calendar_event', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:    uuid('tenant_id').notNull(),
  eventTypeId: uuid('event_type_id').notNull().references(() => calendarEventType.id),
  title:       text('title').notNull(),
  description: text('description'),
  location:    text('location'),
  startAt:     timestamp('start_at', { withTimezone: true }).notNull(),
  endAt:       timestamp('end_at', { withTimezone: true }).notNull(),
  allDay:      boolean('all_day').notNull().default(false),
  // Recurrence: { frequency, interval, until?, count?, byDay? }
  recurrenceRule:   jsonb('recurrence_rule'),
  // Linked entity (contact, property, or lead)
  linkedEntityType: linkedEntityTypeEnum('linked_entity_type'),
  linkedEntityId:   uuid('linked_entity_id'),
  // Creator
  createdByUserId: uuid('created_by_user_id').references(() => user.id),
  // External sync
  externalProvider: text('external_provider'),
  externalId:       text('external_id'),
  externalEtag:     text('external_etag'),
  syncStatus: calendarSyncStatusEnum('sync_status').notNull().default('local_only'),
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by').references(() => user.id),
  // Audit
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedBy: uuid('updated_by').references(() => user.id),
  version:   integer('version').notNull().default(1),
});

export type CalendarEvent = typeof calendarEvent.$inferSelect;
export type NewCalendarEvent = typeof calendarEvent.$inferInsert;

// ---------------------------------------------------------------------------
// calendar_event_attendee — event participants
// ---------------------------------------------------------------------------

export const calendarEventAttendee = pgTable('calendar_event_attendee', {
  id:        uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId:  uuid('tenant_id').notNull(),
  eventId:   uuid('event_id').notNull().references(() => calendarEvent.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').references(() => user.id),
  contactId: uuid('contact_id').references(() => contact.id),
  status:    attendeeStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  createdBy: uuid('created_by').references(() => user.id),
}, (t) => ({
  uniqUserEvent:    unique().on(t.eventId, t.userId),
  uniqContactEvent: unique().on(t.eventId, t.contactId),
}));

export type CalendarEventAttendee = typeof calendarEventAttendee.$inferSelect;
export type NewCalendarEventAttendee = typeof calendarEventAttendee.$inferInsert;
