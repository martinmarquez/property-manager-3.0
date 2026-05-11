// Checkpoint persistence for --resume support.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Checkpoint, CliOptions, EntityKind } from './types.js';

const CHECKPOINT_DIR = '.tokko-import/checkpoints';

function checkpointPath(runId: string): string {
  return join(CHECKPOINT_DIR, `${runId}.json`);
}

export function loadCheckpoint(runId: string): Checkpoint | null {
  const filePath = checkpointPath(runId);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Checkpoint;
  } catch {
    return null;
  }
}

export function saveCheckpoint(cp: Checkpoint): void {
  mkdirSync(CHECKPOINT_DIR, { recursive: true });
  writeFileSync(checkpointPath(cp.run_id), JSON.stringify(cp, null, 2), 'utf-8');
}

export function createCheckpoint(runId: string, opts: CliOptions): Checkpoint {
  const now = new Date().toISOString();
  return {
    run_id: runId,
    started_at: now,
    last_updated: now,
    options: opts,
    completed_entities: [],
    entity_progress: {},
    id_map: { users: {}, properties: {}, contacts: {}, branches: {} },
  };
}

export function markEntityComplete(cp: Checkpoint, entity: EntityKind): void {
  if (!cp.completed_entities.includes(entity)) {
    cp.completed_entities.push(entity);
  }
  cp.last_updated = new Date().toISOString();
}
