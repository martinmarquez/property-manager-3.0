import type { PortalAdapter, PortalId } from './types.js';

const adapters = new Map<PortalId, PortalAdapter>();

export function registerAdapter(adapter: PortalAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getAdapter(portalId: PortalId): PortalAdapter {
  const adapter = adapters.get(portalId);
  if (!adapter) {
    throw new Error(`No adapter registered for portal: ${portalId}`);
  }
  return adapter;
}

export function listAdapters(): PortalAdapter[] {
  return Array.from(adapters.values());
}

export function hasAdapter(portalId: PortalId): boolean {
  return adapters.has(portalId);
}
