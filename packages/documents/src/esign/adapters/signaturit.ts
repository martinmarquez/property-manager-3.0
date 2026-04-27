import type {
  SignatureAdapter,
  CreateSignatureRequestParams,
  CreateSignatureRequestResult,
  RequestStatus,
  SignerStatus,
  WebhookEvent,
} from '../types.js';

interface SignaturitConfig {
  apiKey: string;
  baseUrl: string;
}

const STATUS_MAP: Record<string, RequestStatus> = {
  completed: 'completed',
  declined: 'declined',
  expired: 'expired',
  canceled: 'cancelled',
};

const SIGNER_STATUS_MAP: Record<string, SignerStatus> = {
  completed: 'signed',
  declined: 'declined',
  expired: 'expired',
};

export class SignaturitAdapter implements SignatureAdapter {
  readonly provider = 'signaturit' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SignaturitConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  async createSignatureRequest(params: CreateSignatureRequestParams): Promise<CreateSignatureRequestResult> {
    const fileResponse = await fetch(params.fileUrl);
    if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
    const fileBlob = await fileResponse.blob();

    const form = new FormData();
    form.append('files[0]', fileBlob, params.fileName);

    for (let i = 0; i < params.signers.length; i++) {
      const s = params.signers[i]!;
      form.append(`recipients[${i}][name]`, s.name);
      form.append(`recipients[${i}][email]`, s.email);
      if (params.flowKind === 'sequential') {
        form.append(`recipients[${i}][order]`, String(s.order));
      }
    }

    form.append('delivery_type', params.flowKind === 'sequential' ? 'ordered' : 'all_at_once');

    if (params.expiresInDays) {
      form.append('expire_time', String(params.expiresInDays));
    }
    if (params.customMessage) {
      form.append('body', params.customMessage);
    }
    if (params.senderName) {
      form.append('brand_name', params.senderName);
    }
    if (params.callbackUrl) {
      form.append('events_url', params.callbackUrl);
    }

    const res = await fetch(`${this.baseUrl}/v3/signatures.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Signaturit createSignature failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { id: string; documents: Array<{ id: string; events: unknown[] }> };
    const signerExternalIds = (data.documents?.[0] as { id: string } | undefined)
      ? params.signers.map((_, i) => `${data.id}:${i}`)
      : params.signers.map((_, i) => `${data.id}:${i}`);

    return {
      externalId: data.id,
      providerMetadata: data as unknown as Record<string, unknown>,
      signerExternalIds,
    };
  }

  async getStatus(externalId: string): Promise<{ status: RequestStatus; signers: Array<{ externalId: string; status: SignerStatus; signedAt?: string | undefined }> }> {
    const res = await fetch(`${this.baseUrl}/v3/signatures/${externalId}.json`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Signaturit getStatus failed (${res.status})`);

    const data = await res.json() as {
      status: string;
      documents: Array<{
        events: Array<{ type: string; created_at: string }>;
      }>;
    };

    const requestStatus = STATUS_MAP[data.status] ?? 'pending';
    const signers = (data.documents?.[0]?.events ?? []).map((ev, i) => ({
      externalId: `${externalId}:${i}`,
      status: SIGNER_STATUS_MAP[ev.type] ?? ('pending' as SignerStatus),
      signedAt: ev.type === 'completed' ? ev.created_at : undefined,
    }));

    return { status: requestStatus, signers };
  }

  async sendReminder(externalId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v3/signatures/${externalId}/reminder.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Signaturit sendReminder failed (${res.status})`);
  }

  async cancel(externalId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v3/signatures/${externalId}/cancel.json`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Signaturit cancel failed (${res.status})`);
  }

  async downloadSignedFile(externalId: string): Promise<{ url: string }> {
    const res = await fetch(`${this.baseUrl}/v3/signatures/${externalId}/download/signed`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Signaturit downloadSigned failed (${res.status})`);
    return { url: res.url };
  }

  parseWebhook(payload: Record<string, unknown>): WebhookEvent {
    const data = payload as Record<string, unknown>;
    const eventData = (data['document'] ?? data) as Record<string, unknown>;
    const signatureId = (data['signature_id'] ?? (eventData['signature'] as Record<string, unknown> | undefined)?.['id'] ?? '') as string;
    const eventType = (data['type'] ?? data['event_type'] ?? 'unknown') as string;

    const signerData = eventData['signer'] as Record<string, unknown> | undefined;
    const geoData = signerData?.['geolocation'] as Record<string, unknown> | undefined;

    return {
      externalId: signatureId,
      eventType,
      signerExternalId: signerData?.['id'] as string | undefined,
      signerStatus: SIGNER_STATUS_MAP[eventType],
      requestStatus: STATUS_MAP[eventType],
      signedFileUrl: eventData['signed_file_url'] as string | undefined,
      ipAddress: signerData?.['ip'] as string | undefined,
      userAgent: signerData?.['user_agent'] as string | undefined,
      geolocation: geoData,
      biometricConsent: signerData?.['biometric_consent'] as boolean | undefined,
      certificateSerial: (eventData['certificate'] as Record<string, unknown> | undefined)?.['serial'] as string | undefined,
      certificateUrl: (eventData['certificate'] as Record<string, unknown> | undefined)?.['url'] as string | undefined,
      providerEventId: (data['id'] ?? '') as string,
      occurredAt: (data['created_at'] ?? new Date().toISOString()) as string,
      rawPayload: payload,
    };
  }
}
