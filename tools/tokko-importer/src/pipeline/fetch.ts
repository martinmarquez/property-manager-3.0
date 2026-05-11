// Collects all pages from Tokko API (or CSV) into memory-resident arrays.

import type { CliOptions, TokkoProperty, TokkoContact, TokkoLead, TokkoUser, TokkoBranch } from '../types.js';
import {
  fetchProperties,
  fetchContacts,
  fetchLeads,
  fetchUsers,
  fetchBranches,
  isPhotoAlive,
} from '../adapters/tokko-api.js';

function createLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = (): void => {
        active++;
        fn().then(resolve, reject).finally(() => {
          active--;
          const next = queue.shift();
          if (next) next();
        });
      };
      if (active < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

export async function fetchAllProperties(opts: CliOptions): Promise<TokkoProperty[]> {
  const all: TokkoProperty[] = [];
  for await (const page of fetchProperties(opts.tokkoApiKey)) {
    all.push(...page);
  }
  return all;
}

export async function fetchAllContacts(opts: CliOptions): Promise<TokkoContact[]> {
  const all: TokkoContact[] = [];
  for await (const page of fetchContacts(opts.tokkoApiKey)) {
    all.push(...page);
  }
  return all;
}

export async function fetchAllLeads(opts: CliOptions): Promise<TokkoLead[]> {
  const all: TokkoLead[] = [];
  for await (const page of fetchLeads(opts.tokkoApiKey)) {
    all.push(...page);
  }
  return all;
}

export async function fetchAllUsers(opts: CliOptions): Promise<TokkoUser[]> {
  return fetchUsers(opts.tokkoApiKey);
}

export async function fetchAllBranches(opts: CliOptions): Promise<TokkoBranch[]> {
  return fetchBranches(opts.tokkoApiKey);
}

export async function headCheckPhotos(
  urls: string[],
  concurrency = 10,
): Promise<Map<string, boolean>> {
  const limit = createLimit(concurrency);
  const entries = await Promise.all(
    urls.map((url) =>
      limit(async () => {
        const alive = await isPhotoAlive(url);
        return [url, alive] as const;
      }),
    ),
  );
  return new Map(entries);
}
