import type { ESignProvider, SignatureAdapter } from './types.js';

const adapters = new Map<ESignProvider, SignatureAdapter>();

export function registerAdapter(adapter: SignatureAdapter): void {
  adapters.set(adapter.provider, adapter);
}

export function getAdapter(provider: ESignProvider): SignatureAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No e-sign adapter registered for provider: ${provider}`);
  }
  return adapter;
}

export function hasAdapter(provider: ESignProvider): boolean {
  return adapters.has(provider);
}
