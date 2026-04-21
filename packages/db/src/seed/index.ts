/**
 * Corredor seed script — Phase A
 *
 * Provisions two isolated test tenants with:
 *   - 1 admin user each
 *   - System roles (owner, admin, manager, agent, assistant, read-only)
 *   - 1 default branch each
 *   - Sample feature flags
 *
 * Run: pnpm --filter @corredor/db seed
 *
 * NOTE: Seed inserts bypass RLS by using the database owner role.
 * Application queries must always go through setTenantContext().
 */

import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../schema/index.js';

const DATABASE_URL =
  process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required for seed');
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// System roles shared across all tenants (seeded per-tenant since role is
// tenant-scoped, but slug + permissions are standardised).
// ---------------------------------------------------------------------------
const SYSTEM_ROLES = [
  {
    slug: 'owner',
    name: 'Owner',
    description: 'Full control, including billing and tenant deletion',
    isSystem: true,
    permissions: [
      'tenant:manage', 'user:manage', 'role:manage', 'billing:manage',
      'property:manage', 'contact:manage', 'lead:manage', 'inbox:manage',
      'document:manage', 'report:view', 'ai:use', 'api_key:manage',
      'webhook:manage', 'feature_flag:manage',
    ],
  },
  {
    slug: 'admin',
    name: 'Admin',
    description: 'Full access except billing and tenant deletion',
    isSystem: true,
    permissions: [
      'user:manage', 'role:manage',
      'property:manage', 'contact:manage', 'lead:manage', 'inbox:manage',
      'document:manage', 'report:view', 'ai:use', 'api_key:manage',
      'webhook:manage',
    ],
  },
  {
    slug: 'manager',
    name: 'Manager',
    description: 'Can manage agents and view all data within their branch',
    isSystem: true,
    permissions: [
      'property:manage', 'contact:manage', 'lead:manage', 'inbox:manage',
      'document:manage', 'report:view', 'ai:use',
    ],
  },
  {
    slug: 'agent',
    name: 'Agent',
    description: 'Standard real estate agent',
    isSystem: true,
    permissions: [
      'property:write', 'contact:write', 'lead:write', 'inbox:write',
      'document:write', 'ai:use',
    ],
  },
  {
    slug: 'assistant',
    name: 'Assistant',
    description: 'Can view and reply in inbox, limited property access',
    isSystem: true,
    permissions: ['property:read', 'contact:read', 'lead:read', 'inbox:write'],
  },
  {
    slug: 'read-only',
    name: 'Read Only',
    description: 'View-only access across all modules',
    isSystem: true,
    permissions: ['property:read', 'contact:read', 'lead:read', 'report:view'],
  },
] as const;

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedTenant(opts: {
  slug: string;
  name: string;
  adminEmail: string;
  adminName: string;
}) {
  console.log(`\n→ Seeding tenant: ${opts.name} (${opts.slug})`);

  // 1. Tenant
  const [ten] = await db
    .insert(schema.tenant)
    .values({
      slug: opts.slug,
      name: opts.name,
      planCode: 'trial',
    })
    .onConflictDoNothing()
    .returning();

  if (!ten) {
    // Already exists — fetch it
    const existing = await db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, opts.slug))
      .limit(1);
    if (!existing[0]) throw new Error(`Tenant ${opts.slug} not found after conflict`);
    console.log(`  ✓ tenant already exists (id: ${existing[0].id})`);
    return existing[0].id;
  }

  console.log(`  ✓ tenant created (id: ${ten.id})`);

  // 2. Admin user (password placeholder — real hash generated at auth time)
  const [adminUser] = await db
    .insert(schema.user)
    .values({
      tenantId: ten.id,
      email: opts.adminEmail,
      fullName: opts.adminName,
      // Argon2id hash of "Corredor2024!" — placeholder for seed only
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$PLACEHOLDER_SEED_HASH',
      active: true,
      emailVerifiedAt: new Date(),
      locale: 'es-AR',
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    console.log(`  ✓ admin user created (id: ${adminUser.id})`);
  }

  const userId = adminUser?.id ?? (
    await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, opts.adminEmail))
      .limit(1)
  )[0]?.id;

  if (!userId) throw new Error(`Admin user not found for ${opts.slug}`);

  // 3. Default branch
  const [defaultBranch] = await db
    .insert(schema.branch)
    .values({
      tenantId: ten.id,
      name: 'Casa Central',
      slug: 'casa-central',
      createdBy: userId,
      updatedBy: userId,
    })
    .onConflictDoNothing()
    .returning();

  if (defaultBranch) {
    console.log(`  ✓ default branch created (id: ${defaultBranch.id})`);
  }

  // 4. System roles
  for (const roleDef of SYSTEM_ROLES) {
    const [r] = await db
      .insert(schema.role)
      .values({
        tenantId: ten.id,
        name: roleDef.name,
        slug: roleDef.slug,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        permissions: JSON.stringify(roleDef.permissions),
        createdBy: userId,
        updatedBy: userId,
      })
      .onConflictDoNothing()
      .returning();

    if (r && roleDef.slug === 'owner') {
      // Assign admin user the owner role
      await db
        .insert(schema.userRole)
        .values({
          tenantId: ten.id,
          userId,
          roleId: r.id,
          grantedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        })
        .onConflictDoNothing();
      console.log(`  ✓ owner role assigned to admin`);
    }
  }
  console.log(`  ✓ system roles seeded`);

  // 5. Sample feature flags
  await db
    .insert(schema.featureFlag)
    .values([
      {
        tenantId: ten.id,
        key: 'ai_description_generator',
        enabled: true,
        rolloutPct: 100,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        tenantId: ten.id,
        key: 'ai_copilot',
        enabled: false,
        rolloutPct: 0,
        createdBy: userId,
        updatedBy: userId,
      },
      {
        tenantId: ten.id,
        key: 'portal_zonaprop',
        enabled: true,
        rolloutPct: 100,
        createdBy: userId,
        updatedBy: userId,
      },
    ])
    .onConflictDoNothing();
  console.log(`  ✓ feature flags seeded`);

  return ten.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seed() {
  console.log('🌱  Starting Corredor seed (Phase A — Tenancy + Auth)\n');

  // Tenant A — simulates a mid-size Buenos Aires agency
  await seedTenant({
    slug: 'inmobiliaria-del-sur',
    name: 'Inmobiliaria del Sur',
    adminEmail: 'admin@delsur.test',
    adminName: 'Admin Del Sur',
  });

  // Tenant B — simulates a small solo broker
  await seedTenant({
    slug: 'corredor-solo',
    name: 'Corredor Solo',
    adminEmail: 'admin@solo.test',
    adminName: 'Admin Solo',
  });

  console.log('\n✅  Seed complete\n');
  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
