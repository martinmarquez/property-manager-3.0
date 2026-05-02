import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkFeatureFlag, FeatureDisabledError } from '../lib/feature-flags.js';

function createMockDb(rows: Record<string, unknown>[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
  } as any;
}

describe('checkFeatureFlag', () => {
  const tenantId = 'tenant-1';

  it('throws FeatureDisabledError when flag row does not exist', async () => {
    const db = createMockDb([]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_copilot'))
      .rejects.toThrow(FeatureDisabledError);
  });

  it('throws FeatureDisabledError when enabled is false', async () => {
    const db = createMockDb([{ enabled: false, rolloutPct: 100 }]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_copilot'))
      .rejects.toThrow(FeatureDisabledError);
  });

  it('throws FeatureDisabledError when rolloutPct is 0', async () => {
    const db = createMockDb([{ enabled: true, rolloutPct: 0 }]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_copilot'))
      .rejects.toThrow(FeatureDisabledError);
  });

  it('passes when enabled is true and rolloutPct > 0', async () => {
    const db = createMockDb([{ enabled: true, rolloutPct: 100 }]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_copilot'))
      .resolves.toBeUndefined();
  });

  it('passes when rolloutPct is partial (1–99)', async () => {
    const db = createMockDb([{ enabled: true, rolloutPct: 50 }]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_copilot'))
      .resolves.toBeUndefined();
  });

  it('error message includes the flag key', async () => {
    const db = createMockDb([]);
    await expect(checkFeatureFlag(db, tenantId, 'ai_descriptions'))
      .rejects.toThrow(/ai_descriptions/);
  });

  it('error has statusCode 403', async () => {
    const db = createMockDb([]);
    try {
      await checkFeatureFlag(db, tenantId, 'ai_copilot');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FeatureDisabledError);
      expect((e as FeatureDisabledError).statusCode).toBe(403);
    }
  });

  it('error includes upgradePrompt string', async () => {
    const db = createMockDb([]);
    try {
      await checkFeatureFlag(db, tenantId, 'ai_copilot');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FeatureDisabledError);
      expect((e as FeatureDisabledError).upgradePrompt).toContain('upgrade');
    }
  });
});
