import { describe, it, expect, vi } from "vitest";
import {
  setTenantContext,
  getCurrentTenant,
  assertTenantAccess,
  TenantAccessError,
  type DbClient,
  type TenantContext,
} from "./tenant.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const USER_ID = "a3bb189e-8bf9-3888-9912-ace4e6543002";
const OTHER_TENANT_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

// ---------------------------------------------------------------------------
// Mock DbClient
// ---------------------------------------------------------------------------

function makeMockDb(): DbClient & { lastSql: string | null } {
  let lastSql: string | null = null;
  return {
    get lastSql() { return lastSql; },
    execute: vi.fn(async ({ sql }: { sql: string }) => {
      lastSql = sql;
      return [];
    }),
  };
}

// ---------------------------------------------------------------------------
// setTenantContext
// ---------------------------------------------------------------------------

describe("setTenantContext", () => {
  it("executes set_config with tenantId and userId", async () => {
    const db = makeMockDb();
    await setTenantContext(db, TENANT_ID, USER_ID);

    expect(db.execute).toHaveBeenCalledOnce();
    const firstCall = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(firstCall).toBeDefined();
    const { sql } = firstCall?.[0] as { sql: string };
    expect(sql).toContain(TENANT_ID);
    expect(sql).toContain(USER_ID);
    expect(sql).toContain("set_config");
  });

  it("throws on non-UUID tenantId", async () => {
    const db = makeMockDb();
    await expect(
      setTenantContext(db, "not-a-uuid", USER_ID)
    ).rejects.toThrow(TenantAccessError);
  });

  it("throws on non-UUID userId", async () => {
    const db = makeMockDb();
    await expect(
      setTenantContext(db, TENANT_ID, "not-a-uuid")
    ).rejects.toThrow(TenantAccessError);
  });

  it("does not execute when tenantId is invalid (prevents SQL injection)", async () => {
    const db = makeMockDb();
    const malicious = "'; DROP TABLE users; --";
    await expect(setTenantContext(db, malicious, USER_ID)).rejects.toThrow();
    expect(db.execute).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getCurrentTenant
// ---------------------------------------------------------------------------

describe("getCurrentTenant", () => {
  it("extracts tenantId and userId from top-level context fields", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID, userId: USER_ID };
    const identity = getCurrentTenant(ctx);
    expect(identity.tenantId).toBe(TENANT_ID);
    expect(identity.userId).toBe(USER_ID);
  });

  it("falls back to session.tenantId / session.userId", () => {
    const ctx: TenantContext = {
      session: { tenantId: TENANT_ID, userId: USER_ID },
    };
    const identity = getCurrentTenant(ctx);
    expect(identity.tenantId).toBe(TENANT_ID);
    expect(identity.userId).toBe(USER_ID);
  });

  it("falls back to session.user.tenantId / session.user.id", () => {
    const ctx: TenantContext = {
      session: {
        user: { tenantId: TENANT_ID, id: USER_ID },
      },
    };
    const identity = getCurrentTenant(ctx);
    expect(identity.tenantId).toBe(TENANT_ID);
    expect(identity.userId).toBe(USER_ID);
  });

  it("throws TenantAccessError when tenantId is absent", () => {
    const ctx: TenantContext = { userId: USER_ID };
    expect(() => getCurrentTenant(ctx)).toThrow(TenantAccessError);
  });

  it("throws TenantAccessError when userId is absent", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID };
    expect(() => getCurrentTenant(ctx)).toThrow(TenantAccessError);
  });

  it("throws TenantAccessError when context is empty", () => {
    expect(() => getCurrentTenant({})).toThrow(TenantAccessError);
  });
});

// ---------------------------------------------------------------------------
// assertTenantAccess
// ---------------------------------------------------------------------------

describe("assertTenantAccess", () => {
  it("passes silently when tenants match", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID, userId: USER_ID };
    expect(() => assertTenantAccess(ctx, TENANT_ID)).not.toThrow();
  });

  it("throws TenantAccessError when tenants do not match", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID, userId: USER_ID };
    expect(() => assertTenantAccess(ctx, OTHER_TENANT_ID)).toThrow(TenantAccessError);
  });

  it("error message includes both tenant IDs", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID, userId: USER_ID };
    let caught: TenantAccessError | undefined;
    try {
      assertTenantAccess(ctx, OTHER_TENANT_ID);
    } catch (e) {
      caught = e as TenantAccessError;
    }
    expect(caught?.message).toContain(OTHER_TENANT_ID);
    expect(caught?.message).toContain(TENANT_ID);
  });

  it("error has code TENANT_ACCESS_DENIED", () => {
    const ctx: TenantContext = { tenantId: TENANT_ID, userId: USER_ID };
    let caught: TenantAccessError | undefined;
    try {
      assertTenantAccess(ctx, OTHER_TENANT_ID);
    } catch (e) {
      caught = e as TenantAccessError;
    }
    expect(caught?.code).toBe("TENANT_ACCESS_DENIED");
  });
});
