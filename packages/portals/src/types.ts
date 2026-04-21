export type PortalId =
  | 'zonaprop'
  | 'argenprop'
  | 'mercadolibre'
  | 'remax'
  | 'inmuebles24'
  | 'properati'
  | 'idealista'
  | 'generic_xml';

export interface PublishResult {
  portalId: PortalId;
  externalId: string;
  url: string;
  publishedAt: Date;
}

export interface PortalAdapter {
  id: PortalId;
  displayName: string;
  publish(listing: unknown): Promise<PublishResult>;
  unpublish(externalId: string): Promise<void>;
  fetchInboundLeads(since: Date): Promise<unknown[]>;
}
