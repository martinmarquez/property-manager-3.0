export type ESignProvider = 'signaturit' | 'docusign';
export type ESignFlowKind = 'sequential' | 'parallel';
export type SignerStatus = 'pending' | 'signed' | 'declined' | 'expired';
export type RequestStatus = 'pending' | 'completed' | 'declined' | 'expired' | 'cancelled';

// ---------------------------------------------------------------------------
// Job data — shared between API webhook routes and worker
// ---------------------------------------------------------------------------

export interface EsignWebhookJobData {
  provider: ESignProvider;
  payload: Record<string, unknown>;
  receivedAt: string;
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

export interface SignerInput {
  name: string;
  email: string;
  order: number;
  roleLabel?: string | undefined;
}

export interface CreateSignatureRequestParams {
  fileUrl: string;
  fileName: string;
  signers: SignerInput[];
  flowKind: ESignFlowKind;
  expiresInDays?: number | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  customMessage?: string | undefined;
  callbackUrl?: string | undefined;
}

export interface CreateSignatureRequestResult {
  externalId: string;
  providerMetadata: Record<string, unknown>;
  signerExternalIds: string[];
}

export interface WebhookEvent {
  externalId: string;
  eventType: string;
  signerExternalId?: string | undefined;
  signerStatus?: SignerStatus | undefined;
  requestStatus?: RequestStatus | undefined;
  signedFileUrl?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  geolocation?: Record<string, unknown> | undefined;
  biometricConsent?: boolean | undefined;
  certificateSerial?: string | undefined;
  certificateUrl?: string | undefined;
  providerEventId?: string | undefined;
  occurredAt: string;
  rawPayload: Record<string, unknown>;
}

export interface SignatureAdapter {
  readonly provider: ESignProvider;
  createSignatureRequest(params: CreateSignatureRequestParams): Promise<CreateSignatureRequestResult>;
  getStatus(externalId: string): Promise<{ status: RequestStatus; signers: Array<{ externalId: string; status: SignerStatus; signedAt?: string | undefined }> }>;
  sendReminder(externalId: string): Promise<void>;
  cancel(externalId: string): Promise<void>;
  downloadSignedFile(externalId: string): Promise<{ url: string }>;
  parseWebhook(payload: Record<string, unknown>): WebhookEvent;
}
