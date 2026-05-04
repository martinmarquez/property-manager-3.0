// Tokko Broker API adapter — paginates all entities.

const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 30000;
const PHOTO_HEAD_TIMEOUT_MS = 5000;

interface TokkoApiResponse<T> {
  meta: { total_count: number; limit: number; offset: number };
  objects: T[];
}

async function tokkoGet<T>(
  apiKey: string,
  path: string,
  params: Record<string, string | number> = {},
): Promise<TokkoApiResponse<T>> {
  const base = 'https://tokkobroker.com/api/v1';
  const qs = new URLSearchParams({
    key: apiKey,
    format: 'json',
    limit: String(PAGE_SIZE),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${base}${path}?${qs}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Tokko API ${res.status}: ${path}`);
  return res.json() as Promise<TokkoApiResponse<T>>;
}

import type {
  TokkoProperty,
  TokkoContact,
  TokkoLead,
  TokkoUser,
  TokkoBranch,
} from '../types.js';

export async function* fetchProperties(
  apiKey: string,
  startOffset = 0,
): AsyncGenerator<TokkoProperty[]> {
  let offset = startOffset;
  while (true) {
    const data = await tokkoGet<TokkoProperty>(apiKey, '/property/search/', {
      offset,
      order_by: 'id',
    });
    if (!data.objects.length) break;
    yield data.objects;
    offset += data.objects.length;
    if (offset >= data.meta.total_count) break;
  }
}

export async function* fetchContacts(
  apiKey: string,
  startOffset = 0,
): AsyncGenerator<TokkoContact[]> {
  let offset = startOffset;
  while (true) {
    const data = await tokkoGet<TokkoContact>(apiKey, '/contact/', { offset });
    if (!data.objects.length) break;
    yield data.objects;
    offset += data.objects.length;
    if (offset >= data.meta.total_count) break;
  }
}

export async function* fetchLeads(
  apiKey: string,
  startOffset = 0,
): AsyncGenerator<TokkoLead[]> {
  let offset = startOffset;
  while (true) {
    const data = await tokkoGet<TokkoLead>(apiKey, '/lead/', { offset });
    if (!data.objects.length) break;
    yield data.objects;
    offset += data.objects.length;
    if (offset >= data.meta.total_count) break;
  }
}

export async function fetchUsers(apiKey: string): Promise<TokkoUser[]> {
  const data = await tokkoGet<TokkoUser>(apiKey, '/user/', { limit: 500 });
  return data.objects;
}

export async function fetchBranches(apiKey: string): Promise<TokkoBranch[]> {
  const data = await tokkoGet<TokkoBranch>(apiKey, '/branch/', { limit: 200 });
  return data.objects;
}

export async function isPhotoAlive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(PHOTO_HEAD_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
