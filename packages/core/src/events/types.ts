/**
 * Discriminated union of all domain events in Corredor.
 * Each event has a `type` literal and a strongly-typed `payload`.
 */

// ---------------------------------------------------------------------------
// Property events
// ---------------------------------------------------------------------------

export interface PropertyCreatedEvent {
  type: "property.created";
  payload: { tenantId: string; propertyId: string; userId: string };
}

export interface PropertyUpdatedEvent {
  type: "property.updated";
  payload: {
    tenantId: string;
    propertyId: string;
    userId: string;
    changedFields: string[];
  };
}

export interface PropertyPriceChangedEvent {
  type: "property.price_changed";
  payload: {
    tenantId: string;
    propertyId: string;
    userId: string;
    oldPrice: number;
    newPrice: number;
    currency: string;
  };
}

export interface PropertyStatusChangedEvent {
  type: "property.status_changed";
  payload: {
    tenantId: string;
    propertyId: string;
    userId: string;
    oldStatus: string;
    newStatus: string;
  };
}

export interface PropertyDeletedEvent {
  type: "property.deleted";
  payload: { tenantId: string; propertyId: string; userId: string };
}

export interface PropertyMediaAddedEvent {
  type: "property.media_added";
  payload: {
    tenantId: string;
    propertyId: string;
    userId: string;
    mediaId: string;
    mediaType: string;
  };
}

// ---------------------------------------------------------------------------
// Contact events
// ---------------------------------------------------------------------------

export interface ContactCreatedEvent {
  type: "contact.created";
  payload: { tenantId: string; contactId: string; userId: string };
}

export interface ContactUpdatedEvent {
  type: "contact.updated";
  payload: {
    tenantId: string;
    contactId: string;
    userId: string;
    changedFields: string[];
  };
}

export interface ContactMergedEvent {
  type: "contact.merged";
  payload: {
    tenantId: string;
    survivorId: string;
    mergedId: string;
    userId: string;
  };
}

export interface ContactDeletedEvent {
  type: "contact.deleted";
  payload: { tenantId: string; contactId: string; userId: string };
}

// ---------------------------------------------------------------------------
// Lead events
// ---------------------------------------------------------------------------

export interface LeadCreatedEvent {
  type: "lead.created";
  payload: { tenantId: string; leadId: string; userId: string };
}

export interface LeadStageMovedEvent {
  type: "lead.stage_moved";
  payload: {
    tenantId: string;
    leadId: string;
    userId: string;
    fromStage: string;
    toStage: string;
  };
}

export interface LeadWonEvent {
  type: "lead.won";
  payload: { tenantId: string; leadId: string; userId: string };
}

export interface LeadLostEvent {
  type: "lead.lost";
  payload: {
    tenantId: string;
    leadId: string;
    userId: string;
    reason?: string;
  };
}

// ---------------------------------------------------------------------------
// Inbox events
// ---------------------------------------------------------------------------

export interface InboxMessageReceivedEvent {
  type: "inbox.message_received";
  payload: {
    tenantId: string;
    threadId: string;
    messageId: string;
    channel: string;
  };
}

export interface InboxThreadAssignedEvent {
  type: "inbox.thread_assigned";
  payload: {
    tenantId: string;
    threadId: string;
    assigneeId: string;
    assignedById: string;
  };
}

export interface InboxSlaBreachedEvent {
  type: "inbox.sla_breached";
  payload: {
    tenantId: string;
    threadId: string;
    slaPolicyId: string;
    breachType: "first_response" | "resolution";
  };
}

// ---------------------------------------------------------------------------
// Listing events
// ---------------------------------------------------------------------------

export interface ListingPublishedEvent {
  type: "listing.published";
  payload: {
    tenantId: string;
    listingId: string;
    propertyId: string;
    portalIds: string[];
  };
}

export interface ListingUnpublishedEvent {
  type: "listing.unpublished";
  payload: {
    tenantId: string;
    listingId: string;
    propertyId: string;
    reason?: string;
  };
}

export interface ListingSyncFailedEvent {
  type: "listing.sync_failed";
  payload: {
    tenantId: string;
    listingId: string;
    portalId: string;
    error: string;
  };
}

// ---------------------------------------------------------------------------
// Document events
// ---------------------------------------------------------------------------

export interface DocumentSignedEvent {
  type: "document.signed";
  payload: {
    tenantId: string;
    documentId: string;
    signerId: string;
    signedAt: string;
  };
}

export interface DocumentExpiredEvent {
  type: "document.expired";
  payload: { tenantId: string; documentId: string };
}

// ---------------------------------------------------------------------------
// User events
// ---------------------------------------------------------------------------

export interface UserCreatedEvent {
  type: "user.created";
  payload: { tenantId: string; userId: string };
}

export interface UserInvitedEvent {
  type: "user.invited";
  payload: { tenantId: string; invitedEmail: string; invitedById: string };
}

export interface UserPasswordChangedEvent {
  type: "user.password_changed";
  payload: { tenantId: string; userId: string };
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

export type DomainEvent =
  | PropertyCreatedEvent
  | PropertyUpdatedEvent
  | PropertyPriceChangedEvent
  | PropertyStatusChangedEvent
  | PropertyDeletedEvent
  | PropertyMediaAddedEvent
  | ContactCreatedEvent
  | ContactUpdatedEvent
  | ContactMergedEvent
  | ContactDeletedEvent
  | LeadCreatedEvent
  | LeadStageMovedEvent
  | LeadWonEvent
  | LeadLostEvent
  | InboxMessageReceivedEvent
  | InboxThreadAssignedEvent
  | InboxSlaBreachedEvent
  | ListingPublishedEvent
  | ListingUnpublishedEvent
  | ListingSyncFailedEvent
  | DocumentSignedEvent
  | DocumentExpiredEvent
  | UserCreatedEvent
  | UserInvitedEvent
  | UserPasswordChangedEvent;

export type DomainEventType = DomainEvent["type"];

export type DomainEventByType<T extends DomainEventType> = Extract<
  DomainEvent,
  { type: T }
>;
