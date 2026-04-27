import type {
  SignatureAdapter,
  CreateSignatureRequestParams,
  CreateSignatureRequestResult,
  RequestStatus,
  SignerStatus,
  WebhookEvent,
} from '../types.js';

interface DocuSignConfig {
  integrationKey: string;
  secretKey: string;
  accountId: string;
}

const STATUS_MAP: Record<string, RequestStatus> = {
  completed: 'completed',
  declined: 'declined',
  voided: 'cancelled',
};

const SIGNER_STATUS_MAP: Record<string, SignerStatus> = {
  completed: 'signed',
  declined: 'declined',
  autoresponded: 'expired',
};

export class DocuSignAdapter implements SignatureAdapter {
  readonly provider = 'docusign' as const;
  private readonly integrationKey: string;
  private readonly secretKey: string;
  private readonly accountId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: DocuSignConfig) {
    this.integrationKey = config.integrationKey;
    this.secretKey = config.secretKey;
    this.accountId = config.accountId;
  }

  private async ensureToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.integrationKey}:${this.secretKey}`).toString('base64');
    const res = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=signature',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DocuSign OAuth failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async apiFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.ensureToken();
    const baseUrl = `https://demo.docusign.net/restapi/v2.1/accounts/${this.accountId}`;
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  }

  async createSignatureRequest(params: CreateSignatureRequestParams): Promise<CreateSignatureRequestResult> {
    const fileResponse = await fetch(params.fileUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString('base64');

    const signers = params.signers.map((s, i) => ({
      email: s.email,
      name: s.name,
      recipientId: String(i + 1),
      routingOrder: params.flowKind === 'sequential' ? String(s.order + 1) : '1',
    }));

    const envelope = {
      emailSubject: params.customMessage ?? `Please sign: ${params.fileName}`,
      documents: [
        {
          documentBase64: base64File,
          name: params.fileName,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: { signers },
      status: 'sent',
    };

    const res = await this.apiFetch('/envelopes', {
      method: 'POST',
      body: JSON.stringify(envelope),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DocuSign createEnvelope failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { envelopeId: string };
    return {
      externalId: data.envelopeId,
      providerMetadata: data as unknown as Record<string, unknown>,
      signerExternalIds: signers.map((s) => s.recipientId),
    };
  }

  async getStatus(externalId: string): Promise<{ status: RequestStatus; signers: Array<{ externalId: string; status: SignerStatus; signedAt?: string | undefined }> }> {
    const res = await this.apiFetch(`/envelopes/${externalId}/recipients`);
    if (!res.ok) throw new Error(`DocuSign getRecipients failed (${res.status})`);

    const data = await res.json() as {
      signers: Array<{
        recipientId: string;
        status: string;
        signedDateTime?: string;
      }>;
    };

    const envelopeRes = await this.apiFetch(`/envelopes/${externalId}`);
    const envelopeData = await envelopeRes.json() as { status: string };
    const requestStatus = STATUS_MAP[envelopeData.status] ?? 'pending';

    const signers = (data.signers ?? []).map((s) => ({
      externalId: s.recipientId,
      status: SIGNER_STATUS_MAP[s.status] ?? ('pending' as SignerStatus),
      signedAt: s.signedDateTime,
    }));

    return { status: requestStatus, signers };
  }

  async sendReminder(externalId: string): Promise<void> {
    const res = await this.apiFetch(`/envelopes/${externalId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'sent' }),
    });
    if (!res.ok) throw new Error(`DocuSign sendReminder failed (${res.status})`);
  }

  async cancel(externalId: string): Promise<void> {
    const res = await this.apiFetch(`/envelopes/${externalId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'voided', voidedReason: 'Cancelled by user' }),
    });
    if (!res.ok) throw new Error(`DocuSign cancel failed (${res.status})`);
  }

  async downloadSignedFile(externalId: string): Promise<{ url: string }> {
    const res = await this.apiFetch(`/envelopes/${externalId}/documents/combined`);
    if (!res.ok) throw new Error(`DocuSign downloadSigned failed (${res.status})`);
    return { url: res.url };
  }

  parseWebhook(payload: Record<string, unknown>): WebhookEvent {
    const data = payload as Record<string, unknown>;
    const envelopeId = (data['envelopeId'] ?? (data['data'] as Record<string, unknown> | undefined)?.['envelopeId'] ?? '') as string;
    const eventType = (data['event'] ?? 'unknown') as string;

    const recipientData = (data['data'] as Record<string, unknown> | undefined)?.['recipientId'] as string | undefined;
    const recipientStatus = (data['data'] as Record<string, unknown> | undefined)?.['recipientStatus'] as string | undefined;

    return {
      externalId: envelopeId,
      eventType,
      signerExternalId: recipientData,
      signerStatus: recipientStatus ? SIGNER_STATUS_MAP[recipientStatus] : undefined,
      requestStatus: STATUS_MAP[eventType.replace('envelope-', '')] ?? undefined,
      signedFileUrl: undefined,
      ipAddress: undefined,
      userAgent: undefined,
      geolocation: undefined,
      biometricConsent: undefined,
      certificateSerial: undefined,
      certificateUrl: undefined,
      providerEventId: (data['eventId'] ?? '') as string,
      occurredAt: (data['generatedDateTime'] ?? new Date().toISOString()) as string,
      rawPayload: payload,
    };
  }
}
