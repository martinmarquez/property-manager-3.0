/**
 * Analytics event taxonomy and KPI framework — transport-agnostic constants
 *
 * This module defines the canonical event names, KPI metric keys, and typed
 * property shapes used across API, worker, and web layers.
 * The corresponding DB enums (analytics_event_type, kpi_metric_type, …) are
 * defined in packages/db/src/schema/analytics.ts and must stay in sync.
 */

// ---------------------------------------------------------------------------
// Event taxonomy — all trackable event names (dot-namespaced: entity.action)
// ---------------------------------------------------------------------------

export const ANALYTICS_EVENTS = {
  // Property lifecycle
  PROPERTY_CREATED:      'property.created',
  PROPERTY_UPDATED:      'property.updated',
  PROPERTY_DELETED:      'property.deleted',
  PROPERTY_RESTORED:     'property.restored',
  PROPERTY_PUBLISHED:    'property.published',
  PROPERTY_UNPUBLISHED:  'property.unpublished',
  PROPERTY_PRICE_CHANGED: 'property.price_changed',
  PROPERTY_STATUS_CHANGED: 'property.status_changed',
  PROPERTY_VIEWED:       'property.viewed',
  PROPERTY_LEAD_GENERATED: 'property.lead_generated',
  PROPERTY_IMPORTED:     'property.imported',
  // Lead lifecycle
  LEAD_CREATED:      'lead.created',
  LEAD_ASSIGNED:     'lead.assigned',
  LEAD_CONTACTED:    'lead.contacted',
  LEAD_QUALIFIED:    'lead.qualified',
  LEAD_DISQUALIFIED: 'lead.disqualified',
  LEAD_CONVERTED:    'lead.converted',
  LEAD_CLOSED_WON:   'lead.closed_won',
  LEAD_CLOSED_LOST:  'lead.closed_lost',
  // Opportunity (deal pipeline)
  OPPORTUNITY_CREATED:      'opportunity.created',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity.stage_changed',
  OPPORTUNITY_CLOSED_WON:   'opportunity.closed_won',
  OPPORTUNITY_CLOSED_LOST:  'opportunity.closed_lost',
  // Portal syndication
  PORTAL_PUBLISHED:       'portal.published',
  PORTAL_UNPUBLISHED:     'portal.unpublished',
  PORTAL_PROPERTY_SYNCED: 'portal.property_synced',
  PORTAL_LEAD_RECEIVED:   'portal.lead_received',
  PORTAL_SYNC_ERROR:      'portal.sync_error',
  // Unified inbox / messaging
  MESSAGE_SENT:     'message.sent',
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_READ:     'message.read',
  MESSAGE_REPLIED:  'message.replied',
  // Contacts
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_MERGED:  'contact.merged',
  // Users / agents
  USER_LOGIN:   'user.login',
  USER_LOGOUT:  'user.logout',
  USER_INVITED: 'user.invited',
  // Bulk import jobs
  IMPORT_STARTED:   'import.started',
  IMPORT_COMPLETED: 'import.completed',
  IMPORT_FAILED:    'import.failed',
} as const;

// ---------------------------------------------------------------------------
// KPI metric keys
// ---------------------------------------------------------------------------

export const KPI_METRICS = {
  // Agency-level
  ACTIVE_PROPERTIES_COUNT:  'active_properties_count',
  LEADS_CREATED_COUNT:      'leads_created_count',
  LEADS_CONVERTED_COUNT:    'leads_converted_count',
  LEAD_CONVERSION_RATE:     'lead_conversion_rate',
  AVG_DAYS_TO_CLOSE:        'avg_days_to_close',
  REVENUE_PIPELINE_AMOUNT:  'revenue_pipeline_amount',
  PORTAL_REACH_COUNT:       'portal_reach_count',
  NEW_CONTACTS_COUNT:       'new_contacts_count',
  // Agent-level
  LEADS_ASSIGNED_COUNT:         'leads_assigned_count',
  AVG_LEAD_RESPONSE_TIME_HOURS: 'avg_lead_response_time_hours',
  DEALS_CLOSED_COUNT:           'deals_closed_count',
  COMMISSION_EARNED_AMOUNT:     'commission_earned_amount',
  // Property-level
  DAYS_ON_MARKET:           'days_on_market',
  PROPERTY_VIEWS_COUNT:     'property_views_count',
  PROPERTY_INQUIRIES_COUNT: 'property_inquiries_count',
  PRICE_CHANGE_COUNT:       'price_change_count',
  // Channel-level
  CHANNEL_LEADS_COUNT:              'channel_leads_count',
  COST_PER_LEAD_AMOUNT:             'cost_per_lead_amount',
  CHANNEL_AVG_RESPONSE_TIME_HOURS:  'channel_avg_response_time_hours',
  // Inbox / messaging (Phase D)
  INBOX_MESSAGES_RECEIVED_COUNT:    'inbox_messages_received_count',
  INBOX_MESSAGES_SENT_COUNT:        'inbox_messages_sent_count',
  INBOX_AVG_FIRST_RESPONSE_MINUTES: 'inbox_avg_first_response_minutes',
  INBOX_SLA_COMPLIANCE_RATE:        'inbox_sla_compliance_rate',
  // Portal performance (Phase D)
  PORTAL_PUBLICATIONS_COUNT:    'portal_publications_count',
  PORTAL_SYNC_ERROR_COUNT:      'portal_sync_error_count',
  PORTAL_LEAD_CONVERSION_RATE:  'portal_lead_conversion_rate',
  // Lead attribution (Phase D)
  LEAD_PORTAL_ATTRIBUTION_COUNT: 'lead_portal_attribution_count',
} as const;

export const REPORT_DEFINITIONS = [
  {
    id: 'agency_monthly',
    title: 'Monthly Performance Dashboard',
    description: 'Agency-wide KPI overview: active listings, lead funnel, pipeline value.',
    dimensionType: 'agency',
    metrics: [
      KPI_METRICS.ACTIVE_PROPERTIES_COUNT,
      KPI_METRICS.LEADS_CREATED_COUNT,
      KPI_METRICS.LEADS_CONVERTED_COUNT,
      KPI_METRICS.LEAD_CONVERSION_RATE,
      KPI_METRICS.REVENUE_PIPELINE_AMOUNT,
      KPI_METRICS.NEW_CONTACTS_COUNT,
    ],
    defaultDays: 30,
  },
  {
    id: 'agent_leaderboard',
    title: 'Agent Leaderboard',
    description: 'Per-agent ranking by configurable KPI metric.',
    dimensionType: 'agent',
    metrics: [
      KPI_METRICS.DEALS_CLOSED_COUNT,
      KPI_METRICS.LEADS_ASSIGNED_COUNT,
      KPI_METRICS.AVG_LEAD_RESPONSE_TIME_HOURS,
      KPI_METRICS.COMMISSION_EARNED_AMOUNT,
    ],
    defaultDays: 30,
  },
  {
    id: 'portal_effectiveness',
    title: 'Portal Effectiveness',
    description: 'Leads and views per portal channel.',
    dimensionType: 'channel',
    metrics: [
      KPI_METRICS.CHANNEL_LEADS_COUNT,
      KPI_METRICS.PORTAL_REACH_COUNT,
      KPI_METRICS.COST_PER_LEAD_AMOUNT,
      KPI_METRICS.CHANNEL_AVG_RESPONSE_TIME_HOURS,
    ],
    defaultDays: 30,
  },
  {
    id: 'pipeline_velocity',
    title: 'Pipeline Velocity',
    description: 'Average time per deal stage and bottleneck detection.',
    dimensionType: 'agency',
    metrics: [
      KPI_METRICS.AVG_DAYS_TO_CLOSE,
      KPI_METRICS.LEADS_CONVERTED_COUNT,
      KPI_METRICS.LEAD_CONVERSION_RATE,
    ],
    defaultDays: 90,
  },
  {
    id: 'property_market_time',
    title: 'Property Market Time Analysis',
    description: 'Days on market, price changes, and inquiry rate per property.',
    dimensionType: 'property',
    metrics: [
      KPI_METRICS.DAYS_ON_MARKET,
      KPI_METRICS.PROPERTY_VIEWS_COUNT,
      KPI_METRICS.PROPERTY_INQUIRIES_COUNT,
      KPI_METRICS.PRICE_CHANGE_COUNT,
    ],
    defaultDays: 90,
  },
  {
    id: 'inbox_channel_performance',
    title: 'Inbox Channel Performance',
    description: 'Inbound message volume, SLA compliance rate, and response times by channel.',
    dimensionType: 'channel',
    metrics: [
      KPI_METRICS.INBOX_MESSAGES_RECEIVED_COUNT,
      KPI_METRICS.INBOX_SLA_COMPLIANCE_RATE,
    ],
    defaultDays: 30,
  },
  {
    id: 'inbox_agent_workload',
    title: 'Inbox Agent Workload',
    description: 'Outbound messages sent and average first-response time per agent.',
    dimensionType: 'agent',
    metrics: [
      KPI_METRICS.INBOX_MESSAGES_SENT_COUNT,
      KPI_METRICS.INBOX_AVG_FIRST_RESPONSE_MINUTES,
    ],
    defaultDays: 30,
  },
  {
    id: 'portal_performance',
    title: 'Portal Performance',
    description: 'Active publications, lead conversion rate, and sync error count per portal.',
    dimensionType: 'channel',
    metrics: [
      KPI_METRICS.PORTAL_PUBLICATIONS_COUNT,
      KPI_METRICS.PORTAL_LEAD_CONVERSION_RATE,
      KPI_METRICS.PORTAL_SYNC_ERROR_COUNT,
    ],
    defaultDays: 30,
  },
  {
    id: 'lead_attribution',
    title: 'Lead Attribution',
    description: 'Lead source breakdown — which portal or channel generated each opportunity.',
    dimensionType: 'channel',
    metrics: [
      KPI_METRICS.CHANNEL_LEADS_COUNT,
      KPI_METRICS.LEAD_PORTAL_ATTRIBUTION_COUNT,
      KPI_METRICS.PORTAL_LEAD_CONVERSION_RATE,
    ],
    defaultDays: 30,
  },
] as const;
