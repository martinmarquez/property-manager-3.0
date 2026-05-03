
// ---------------------------------------------------------------------------
// AFIP WSFE (Web Service de Facturación Electrónica) v1 Client
//
// Implements CAE (Código de Autorización Electrónica) request flow:
//   1. Authenticate via WSAA (Web Service de Autenticación y Autorización)
//   2. Call FECAESolicitar on WSFE to request invoice authorization
//
// Note OQ-4: AFIP CSD must be provisioned before WSFE calls work in production.
// In dev/staging, if AFIP credentials are not set, calls are skipped (no-op).
// ---------------------------------------------------------------------------

export interface AfipConfig {
  cuit: string;
  privateKey: string;
  certificate: string;
  sandbox: boolean;
}

export interface AfipInvoiceRequest {
  puntoVenta: number;
  invoiceType: 'A' | 'B' | 'C' | 'E';
  buyerCuit?: string | undefined;
  buyerName: string;
  buyerAddress?: string | undefined;
  buyerTaxCondition: string;
  netoGravado: number;
  ivaAmount: number;
  total: number;
  concept: number; // 1=products, 2=services, 3=both
  serviceFrom?: string | undefined;
  serviceTo?: string | undefined;
  paymentDueDate?: string | undefined;
}

export interface AfipCaeResponse {
  cae: string;
  caeExpiresAt: string; // ISO date
  cbteNumero: number;
  result: 'A' | 'R'; // Aprobado | Rechazado
  errors?: Array<{ code: string; msg: string }> | undefined;
}

const WSFE_URLS = {
  production: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
  sandbox: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
} as const;

const WSAA_URLS = {
  production: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
  sandbox: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
} as const;

// Invoice type codes per AFIP
const INVOICE_TYPE_CODES: Record<string, number> = {
  A: 1,
  B: 6,
  C: 11,
  E: 19,
};

// Buyer document type: 80=CUIT, 86=CUIL, 96=DNI, 99=Consumidor Final
function getBuyerDocType(taxCondition: string): number {
  switch (taxCondition) {
    case 'RI': return 80;   // Responsable Inscripto → CUIT
    case 'MO': return 80;   // Monotributo → CUIT
    case 'CF': return 99;   // Consumidor Final
    case 'EX': return 80;   // Exportación → CUIT
    default: return 99;
  }
}

export function isAfipConfigured(config: Partial<AfipConfig>): boolean {
  return !!(config.cuit && config.privateKey && config.certificate);
}

export class AfipWsfeClient {
  private config: AfipConfig;
  private token: string | null = null;
  private sign: string | null = null;
  private tokenExpires: Date | null = null;

  constructor(config: AfipConfig) {
    this.config = config;
  }

  private get wsfeUrl(): string {
    return this.config.sandbox ? WSFE_URLS.sandbox : WSFE_URLS.production;
  }

  private get wsaaUrl(): string {
    return this.config.sandbox ? WSAA_URLS.sandbox : WSAA_URLS.production;
  }

  private isTokenValid(): boolean {
    if (!this.token || !this.tokenExpires) return false;
    return new Date() < this.tokenExpires;
  }

  async authenticate(): Promise<void> {
    if (this.isTokenValid()) return;

    const tra = this.buildLoginTicketRequest();
    const cms = await this.signCms(tra);

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.afip.gov">
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(this.wsaaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: soapBody,
    });

    const xml = await response.text();
    this.token = this.extractXmlValue(xml, 'token');
    this.sign = this.extractXmlValue(xml, 'sign');
    const expirationStr = this.extractXmlValue(xml, 'expirationTime');
    this.tokenExpires = expirationStr ? new Date(expirationStr) : new Date(Date.now() + 11 * 3600_000);
  }

  async getLastCbteNumber(puntoVenta: number, invoiceType: string): Promise<number> {
    await this.authenticate();
    const cbteTipo = INVOICE_TYPE_CODES[invoiceType] ?? 11;

    const soapBody = this.buildSoapEnvelope('FECompUltimoAutorizado', `
      <Auth>
        <Token>${this.token}</Token>
        <Sign>${this.sign}</Sign>
        <Cuit>${this.config.cuit}</Cuit>
      </Auth>
      <PtoVta>${puntoVenta}</PtoVta>
      <CbteTipo>${cbteTipo}</CbteTipo>
    `);

    const response = await fetch(this.wsfeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: soapBody,
    });

    const xml = await response.text();
    const cbteNro = this.extractXmlValue(xml, 'CbteNro');
    return Number(cbteNro) || 0;
  }

  async requestCae(request: AfipInvoiceRequest): Promise<AfipCaeResponse> {
    await this.authenticate();

    const cbteTipo = INVOICE_TYPE_CODES[request.invoiceType] ?? 11;
    const lastCbte = await this.getLastCbteNumber(request.puntoVenta, request.invoiceType);
    const cbteDesde = lastCbte + 1;
    const docTipo = getBuyerDocType(request.buyerTaxCondition);
    const docNro = request.buyerCuit ?? '0';
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const feDetReq = `
      <FECAEDetRequest>
        <Concepto>${request.concept}</Concepto>
        <DocTipo>${docTipo}</DocTipo>
        <DocNro>${docNro}</DocNro>
        <CbteDesde>${cbteDesde}</CbteDesde>
        <CbteHasta>${cbteDesde}</CbteHasta>
        <CbteFch>${today}</CbteFch>
        <ImpTotal>${request.total.toFixed(2)}</ImpTotal>
        <ImpTotConc>0.00</ImpTotConc>
        <ImpNeto>${request.netoGravado.toFixed(2)}</ImpNeto>
        <ImpOpEx>0.00</ImpOpEx>
        <ImpIVA>${request.ivaAmount.toFixed(2)}</ImpIVA>
        <ImpTrib>0.00</ImpTrib>
        ${request.concept >= 2 ? `
        <FchServDesde>${request.serviceFrom ?? today}</FchServDesde>
        <FchServHasta>${request.serviceTo ?? today}</FchServHasta>
        <FchVtoPago>${request.paymentDueDate ?? today}</FchVtoPago>
        ` : ''}
        <MonId>PES</MonId>
        <MonCotiz>1</MonCotiz>
        ${request.ivaAmount > 0 ? `
        <Iva>
          <AlicIva>
            <Id>5</Id>
            <BaseImp>${request.netoGravado.toFixed(2)}</BaseImp>
            <Importe>${request.ivaAmount.toFixed(2)}</Importe>
          </AlicIva>
        </Iva>
        ` : ''}
      </FECAEDetRequest>
    `;

    const soapBody = this.buildSoapEnvelope('FECAESolicitar', `
      <Auth>
        <Token>${this.token}</Token>
        <Sign>${this.sign}</Sign>
        <Cuit>${this.config.cuit}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${request.puntoVenta}</PtoVta>
          <CbteTipo>${cbteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>${feDetReq}</FeDetReq>
      </FeCAEReq>
    `);

    const response = await fetch(this.wsfeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
      body: soapBody,
    });

    const xml = await response.text();

    const resultado = this.extractXmlValue(xml, 'Resultado');
    const cae = this.extractXmlValue(xml, 'CAE');
    const caeFchVto = this.extractXmlValue(xml, 'CAEFchVto');

    const errors: Array<{ code: string; msg: string }> = [];
    const errCode = this.extractXmlValue(xml, 'Code');
    const errMsg = this.extractXmlValue(xml, 'Msg');
    if (errCode) errors.push({ code: errCode, msg: errMsg ?? '' });

    const caeExpDate = caeFchVto
      ? `${caeFchVto.slice(0, 4)}-${caeFchVto.slice(4, 6)}-${caeFchVto.slice(6, 8)}T23:59:59Z`
      : new Date(Date.now() + 10 * 86_400_000).toISOString();

    return {
      cae: cae ?? '',
      caeExpiresAt: caeExpDate,
      cbteNumero: cbteDesde,
      result: (resultado === 'A' ? 'A' : 'R') as 'A' | 'R',
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private buildLoginTicketRequest(): string {
    const now = new Date();
    const generationTime = new Date(now.getTime() - 600_000).toISOString();
    const expirationTime = new Date(now.getTime() + 600_000).toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;
  }

  private async signCms(tra: string): Promise<string> {
    // In production, use the PKCS#7/CMS signing with the AFIP certificate
    // For now, return a base64 representation that would be replaced with
    // proper crypto signing using node:crypto
    const { createSign } = await import('node:crypto');
    const privateKey = Buffer.from(this.config.privateKey, 'base64').toString('utf-8');
    const signer = createSign('RSA-SHA256');
    signer.update(tra);
    const signature = signer.sign(privateKey, 'base64');
    return signature;
  }

  private buildSoapEnvelope(method: string, body: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Body>
    <ar:${method}>${body}</ar:${method}>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private extractXmlValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match?.[1] ?? null;
  }
}
