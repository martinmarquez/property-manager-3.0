/**
 * Demo environment seeder for Phase H sales demos (RENA-208)
 *
 * Inserts 50 properties, 200 contacts, 30 deals, 5 inbox conversations,
 * calendar events, 5 tasación reports, and 6 months of analytics data
 * into the demo tenant with realistic Argentine data.
 *
 * Run: pnpm --filter @corredor/seeder seed:demo
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, eq } from 'drizzle-orm';
import * as schema from '@corredor/db';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../');
config({ path: resolve(repoRoot, '.env.local') });
config({ path: resolve(repoRoot, '.env') });
config();

const DATABASE_URL =
  process.env['DATABASE_URL_UNPOOLED']?.includes('REPLACE_ME')
    ? process.env['DATABASE_URL']
    : (process.env['DATABASE_URL_UNPOOLED'] ?? process.env['DATABASE_URL']);

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is required');
}

const client = postgres(DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_TENANT_SLUG = 'demo';
const DEMO_TENANT_NAME = 'Corredor Demo';
const PLAN_CODE = 'pro';

const PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$PLACEHOLDER_SEED_HASH';

// Deterministic seed for reproducible IDs
let seqCounter = 0;
function nextSeq(): number {
  return ++seqCounter;
}

// ---------------------------------------------------------------------------
// Realistic Argentine data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES_M = ['Martín', 'Juan', 'Carlos', 'Diego', 'Federico', 'Sebastián', 'Nicolás', 'Alejandro', 'Pablo', 'Matías', 'Lucas', 'Gabriel', 'Andrés', 'Fernando', 'Rodrigo', 'Javier', 'Gonzalo', 'Emiliano', 'Tomás', 'Agustín'];
const FIRST_NAMES_F = ['María', 'Laura', 'Lucía', 'Ana', 'Carolina', 'Valeria', 'Florencia', 'Camila', 'Victoria', 'Romina', 'Natalia', 'Daniela', 'Paula', 'Sofía', 'Julieta', 'Mariana', 'Cecilia', 'Andrea', 'Gabriela', 'Mercedes'];
const LAST_NAMES = ['González', 'Rodríguez', 'López', 'Martínez', 'García', 'Fernández', 'Pérez', 'Sánchez', 'Romero', 'Díaz', 'Torres', 'Álvarez', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Medina', 'Benítez', 'Herrera', 'Suárez', 'Castro', 'Ríos', 'Giménez', 'Molina', 'Vargas', 'Moreno', 'Ortiz', 'Silva', 'Bustos', 'Aguirre'];

const NEIGHBORHOODS_CABA = [
  { name: 'Palermo', lat: -34.5795, lng: -58.4219 },
  { name: 'Recoleta', lat: -34.5877, lng: -58.3932 },
  { name: 'Belgrano', lat: -34.5617, lng: -58.4562 },
  { name: 'Caballito', lat: -34.6196, lng: -58.4398 },
  { name: 'Núñez', lat: -34.5459, lng: -58.4579 },
  { name: 'Villa Urquiza', lat: -34.5719, lng: -58.4887 },
  { name: 'Colegiales', lat: -34.5717, lng: -58.4477 },
  { name: 'Almagro', lat: -34.6097, lng: -58.4191 },
  { name: 'San Telmo', lat: -34.6213, lng: -58.3696 },
  { name: 'Puerto Madero', lat: -34.6157, lng: -58.3618 },
  { name: 'Villa Crespo', lat: -34.5984, lng: -58.4369 },
  { name: 'Flores', lat: -34.6344, lng: -58.4630 },
  { name: 'Devoto', lat: -34.5987, lng: -58.5135 },
  { name: 'Saavedra', lat: -34.5529, lng: -58.4857 },
  { name: 'Barrio Norte', lat: -34.5946, lng: -58.4019 },
];

const NEIGHBORHOODS_GBA = [
  { name: 'Vicente López', lat: -34.5305, lng: -58.4766 },
  { name: 'Olivos', lat: -34.5115, lng: -58.4973 },
  { name: 'San Isidro', lat: -34.4708, lng: -58.5275 },
  { name: 'Martínez', lat: -34.4915, lng: -58.5086 },
  { name: 'Tigre', lat: -34.4261, lng: -58.5784 },
  { name: 'Nordelta', lat: -34.4079, lng: -58.6497 },
  { name: 'Pilar', lat: -34.4588, lng: -58.9145 },
  { name: 'Avellaneda', lat: -34.6628, lng: -58.3653 },
  { name: 'Quilmes', lat: -34.7203, lng: -58.2548 },
  { name: 'Banfield', lat: -34.7444, lng: -58.3968 },
];

const ALL_NEIGHBORHOODS = [...NEIGHBORHOODS_CABA, ...NEIGHBORHOODS_GBA];

const STREET_NAMES = ['Av. Santa Fe', 'Av. Corrientes', 'Av. Libertador', 'Av. Callao', 'Av. Cabildo', 'Av. Rivadavia', 'Juncal', 'Arenales', 'Uriarte', 'Thames', 'Gorriti', 'Honduras', 'Costa Rica', 'Borges', 'Salguero', 'Bulnes', 'Coronel Díaz', 'Güemes', 'Pacheco de Melo', 'Posadas', 'Alvear', 'French', 'Malabia', 'Serrano', 'Ravignani'];

const COMPANY_NAMES = ['Grupo Inmobiliario Sur', 'Torres del Plata SA', 'Constructora Andes', 'RAGHSA', 'Inversiones Río de la Plata', 'Desarrollos Urbanos SA', 'Megacons SA', 'Fideicomiso Patagonia', 'Landmark Realty Argentina', 'BW Group ARG'];

const PROPERTY_TITLES_APT = ['Departamento luminoso con vista al río', 'Piso exclusivo en torre premium', 'Monoambiente moderno reciclado', 'Semipiso de categoría con cochera', 'Departamento 3 ambientes a estrenar', 'Piso alto con balcón terraza', 'Departamento con amenities completos', 'Dúplex en planta alta', 'Loft industrial reciclado', 'Penthouse con terraza propia'];

const PROPERTY_TITLES_HOUSE = ['Casa con jardín y pileta', 'Chalet estilo inglés en lote propio', 'Casa de 4 dormitorios con quincho', 'Propiedad en barrio cerrado', 'Casa reciclada con patio', 'Residencia de categoría con pileta climatizada'];

const PROPERTY_TITLES_OFFICE = ['Oficina premium en microcentro', 'Espacio coworking equipado', 'Oficina corporativa piso completo', 'Consultorio profesional'];

const PROPERTY_TITLES_COMMERCIAL = ['Local comercial sobre avenida', 'Galpón logístico techado', 'Local gastronómico habilitado'];

const DEAL_TITLES = [
  'Venta depto 3 amb Palermo', 'Alquiler oficina Microcentro', 'Reserva casa San Isidro',
  'Venta PH Belgrano', 'Alquiler temporal Recoleta', 'Venta terreno Nordelta',
  'Pre-venta torre Puerto Madero', 'Alquiler local Caballito', 'Venta chalet Olivos',
  'Reserva semipiso Núñez', 'Negociación depto Barrio Norte', 'Venta dúplex Villa Urquiza',
  'Alquiler galpón Avellaneda', 'Consulta inversión Pilar', 'Venta penthouse Palermo',
  'Reserva monoambiente Almagro', 'Alquiler 2 amb Colegiales', 'Venta oficina Retiro',
  'Pre-venta lotes Tigre', 'Negociación casa Flores',
  'Venta depto 4 amb Recoleta', 'Alquiler cochera Puerto Madero', 'Reserva local San Telmo',
  'Venta casa quinta Pilar', 'Alquiler depto amoblado Palermo',
  'Venta PH reciclado Villa Crespo', 'Consulta financiamiento Quilmes',
  'Venta edificio completo Belgrano', 'Reserva depto pozo Devoto',
  'Alquiler comercial Saavedra',
];

const LEAD_SOURCES = ['zonaprop', 'mercadolibre', 'sitio_web', 'referido', 'whatsapp', 'instagram', 'llamada', 'walk-in'];

const CALENDAR_EVENT_TITLES = [
  'Visita propiedad', 'Reunión con cliente', 'Tasación presencial', 'Firma de boleto',
  'Entrega de llaves', 'Reunión de equipo', 'Capacitación portal', 'Seguimiento cliente',
  'Visita obra en construcción', 'Presentación inversores', 'Revisión contratos',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDni(): string {
  return String(randomInt(20000000, 45000000));
}

function randomCuit(): string {
  const prefix = pick(['20', '23', '24', '27', '30', '33']);
  const body = String(randomInt(10000000, 45000000));
  const check = String(randomInt(0, 9));
  return `${prefix}-${body}-${check}`;
}

function randomPhone(): string {
  const area = pick(['11', '11', '11', '221', '351', '261']);
  const num = String(randomInt(40000000, 69999999));
  return `+549${area}${num}`;
}

function randomEmail(first: string, last: string, domain?: string): string {
  const clean = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');
  const d = domain ?? pick(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.ar', 'live.com.ar']);
  return `${clean(first)}.${clean(last)}${randomInt(1, 99)}@${d}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function randomPastDate(maxDaysAgo: number): Date {
  return daysAgo(randomInt(1, maxDaysAgo));
}

function randomFutureDate(maxDaysFromNow: number): Date {
  return daysFromNow(randomInt(1, maxDaysFromNow));
}

function jitter(base: number, pct: number): number {
  const range = base * pct;
  return base + (Math.random() * range * 2 - range);
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function seedDemo() {
  console.log('🌱 Starting demo tenant seed (RENA-208)\n');

  // -----------------------------------------------------------------------
  // 1. Tenant
  // -----------------------------------------------------------------------
  console.log('→ Creating demo tenant...');

  const [existingTenant] = await db
    .select()
    .from(schema.tenant)
    .where(eq(schema.tenant.slug, DEMO_TENANT_SLUG))
    .limit(1);

  let tenantId: string;
  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log(`  ✓ tenant already exists (id: ${tenantId})`);
  } else {
    const [ten] = await db
      .insert(schema.tenant)
      .values({
        slug: DEMO_TENANT_SLUG,
        name: DEMO_TENANT_NAME,
        planCode: PLAN_CODE,
        countryCode: 'AR',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        locale: 'es-AR',
      })
      .returning();
    tenantId = ten!.id;
    console.log(`  ✓ tenant created (id: ${tenantId})`);
  }

  // -----------------------------------------------------------------------
  // 2. Demo users
  // -----------------------------------------------------------------------
  console.log('→ Creating demo users...');

  const demoUsers = [
    { email: 'demo@corredor.app', fullName: 'Demo Admin', roleSlug: 'owner' },
    { email: 'maria@demo.corredor.app', fullName: 'María López', roleSlug: 'agent' },
    { email: 'carlos@demo.corredor.app', fullName: 'Carlos Fernández', roleSlug: 'agent' },
    { email: 'julieta@demo.corredor.app', fullName: 'Julieta Ramírez', roleSlug: 'manager' },
    { email: 'pablo@demo.corredor.app', fullName: 'Pablo García', roleSlug: 'agent' },
  ];

  const userIds: string[] = [];
  for (const u of demoUsers) {
    const [inserted] = await db
      .insert(schema.user)
      .values({
        tenantId,
        email: u.email,
        fullName: u.fullName,
        passwordHash: PASSWORD_HASH,
        active: true,
        emailVerifiedAt: new Date(),
        locale: 'es-AR',
        timezone: 'America/Argentina/Buenos_Aires',
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      userIds.push(inserted.id);
      console.log(`  ✓ user ${u.email} (id: ${inserted.id})`);
    } else {
      const [existing] = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, u.email))
        .limit(1);
      if (existing) userIds.push(existing.id);
    }
  }

  const adminUserId = userIds[0]!;
  const agentUserIds = userIds.slice(1);

  // -----------------------------------------------------------------------
  // 3. Branch
  // -----------------------------------------------------------------------
  console.log('→ Creating branches...');
  const branches: string[] = [];

  const branchData = [
    { name: 'Casa Central', slug: 'casa-central', address: 'Av. Santa Fe 1234, Palermo' },
    { name: 'Sucursal Belgrano', slug: 'belgrano', address: 'Av. Cabildo 2456, Belgrano' },
  ];

  for (const b of branchData) {
    const [inserted] = await db
      .insert(schema.branch)
      .values({
        tenantId,
        name: b.name,
        slug: b.slug,
        address: b.address,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      branches.push(inserted.id);
      console.log(`  ✓ branch ${b.name} (id: ${inserted.id})`);
    }
  }

  // -----------------------------------------------------------------------
  // 4. System roles + assignment
  // -----------------------------------------------------------------------
  console.log('→ Creating roles...');

  const SYSTEM_ROLES = [
    { slug: 'owner', name: 'Owner', description: 'Full control', isSystem: true, permissions: ['tenant:manage', 'user:manage', 'role:manage', 'billing:manage', 'property:manage', 'contact:manage', 'lead:manage', 'inbox:manage', 'document:manage', 'report:view', 'ai:use', 'api_key:manage', 'webhook:manage', 'feature_flag:manage'] },
    { slug: 'admin', name: 'Admin', description: 'Full access except billing', isSystem: true, permissions: ['user:manage', 'role:manage', 'property:manage', 'contact:manage', 'lead:manage', 'inbox:manage', 'document:manage', 'report:view', 'ai:use', 'api_key:manage', 'webhook:manage'] },
    { slug: 'manager', name: 'Manager', description: 'Branch manager', isSystem: true, permissions: ['property:manage', 'contact:manage', 'lead:manage', 'inbox:manage', 'document:manage', 'report:view', 'ai:use'] },
    { slug: 'agent', name: 'Agent', description: 'Real estate agent', isSystem: true, permissions: ['property:write', 'contact:write', 'lead:write', 'inbox:write', 'document:write', 'ai:use'] },
    { slug: 'assistant', name: 'Assistant', description: 'Limited access', isSystem: true, permissions: ['property:read', 'contact:read', 'lead:read', 'inbox:write'] },
    { slug: 'read-only', name: 'Read Only', description: 'View only', isSystem: true, permissions: ['property:read', 'contact:read', 'lead:read', 'report:view'] },
  ];

  const roleMap: Record<string, string> = {};
  for (const roleDef of SYSTEM_ROLES) {
    const [r] = await db
      .insert(schema.role)
      .values({
        tenantId,
        name: roleDef.name,
        slug: roleDef.slug,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
        permissions: JSON.stringify(roleDef.permissions),
        createdBy: adminUserId,
        updatedBy: adminUserId,
      })
      .onConflictDoNothing()
      .returning();
    if (r) roleMap[roleDef.slug] = r.id;
  }

  // Assign roles to demo users
  for (let i = 0; i < demoUsers.length; i++) {
    const roleSlug = demoUsers[i]!.roleSlug;
    const roleId = roleMap[roleSlug];
    if (roleId && userIds[i]) {
      await db
        .insert(schema.userRole)
        .values({
          tenantId,
          userId: userIds[i]!,
          roleId,
          grantedBy: adminUserId,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        })
        .onConflictDoNothing();
    }
  }
  console.log('  ✓ roles created and assigned');

  // -----------------------------------------------------------------------
  // 5. Feature flags (all enabled for Pro demo)
  // -----------------------------------------------------------------------
  console.log('→ Creating feature flags...');

  const flags = [
    'ai_description_generator', 'ai_copilot', 'portal_zonaprop', 'portal_mercadolibre',
    'portal_argenprop', 'esign_signaturit', 'esign_docusign', 'whatsapp_inbox',
    'appraisal_ai_narrative', 'site_builder', 'reports_digest', 'referral_program',
  ];

  await db
    .insert(schema.featureFlag)
    .values(flags.map((key) => ({
      tenantId,
      key,
      enabled: true,
      rolloutPct: 100,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })))
    .onConflictDoNothing();
  console.log(`  ✓ ${flags.length} feature flags enabled`);

  // -----------------------------------------------------------------------
  // 6. Contacts (200)
  // -----------------------------------------------------------------------
  console.log('→ Creating 200 contacts...');

  const contactIds: string[] = [];

  // 160 person contacts
  for (let i = 0; i < 160; i++) {
    const isFemale = i % 2 === 0;
    const firstName = pick(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const lastName = pick(LAST_NAMES);
    const [c] = await db
      .insert(schema.contact)
      .values({
        tenantId,
        kind: 'person',
        firstName,
        lastName,
        nationalIdType: pick(['DNI', 'CUIT', 'CUIL'] as const),
        nationalId: randomDni(),
        gender: isFemale ? 'female' : 'male',
        phones: JSON.stringify([{ type: 'mobile', number: randomPhone() }]),
        emails: JSON.stringify([{ type: 'personal', address: randomEmail(firstName, lastName) }]),
        addresses: JSON.stringify([{
          street: pick(STREET_NAMES),
          number: String(randomInt(100, 5000)),
          city: 'CABA',
          province: 'Buenos Aires',
          country: 'AR',
        }]),
        leadScore: randomInt(0, 100),
        source: pick(LEAD_SOURCES),
        ownerUserId: pick(agentUserIds),
        createdAt: randomPastDate(180),
        createdBy: pick(agentUserIds),
        updatedBy: pick(agentUserIds),
      })
      .returning();
    if (c) contactIds.push(c.id);
  }

  // 40 company contacts
  for (let i = 0; i < 40; i++) {
    const companyName = i < COMPANY_NAMES.length ? COMPANY_NAMES[i]! : `Empresa ${i + 1} SA`;
    const [c] = await db
      .insert(schema.contact)
      .values({
        tenantId,
        kind: 'company',
        legalName: companyName,
        cuit: randomCuit(),
        industry: pick(['real_estate', 'construction', 'finance', 'retail', 'hospitality', 'tech']),
        phones: JSON.stringify([{ type: 'work', number: randomPhone() }]),
        emails: JSON.stringify([{ type: 'work', address: `contacto@${companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com.ar` }]),
        leadScore: randomInt(20, 100),
        source: pick(LEAD_SOURCES),
        ownerUserId: pick(agentUserIds),
        createdAt: randomPastDate(180),
        createdBy: pick(agentUserIds),
        updatedBy: pick(agentUserIds),
      })
      .returning();
    if (c) contactIds.push(c.id);
  }
  console.log(`  ✓ ${contactIds.length} contacts created`);

  // -----------------------------------------------------------------------
  // 7. Properties (50) with listings and media
  // -----------------------------------------------------------------------
  console.log('→ Creating 50 properties...');

  const propertyIds: string[] = [];
  const branchId = branches[0] ?? null;

  const propertyConfigs: Array<{
    type: 'apartment' | 'ph' | 'house' | 'office' | 'commercial' | 'land';
    titles: string[];
    count: number;
    priceRange: [number, number];
    coveredArea: [number, number];
    totalArea: [number, number];
    rooms: [number, number];
    bedrooms: [number, number];
    bathrooms: [number, number];
    operationKinds: Array<'sale' | 'rent' | 'temp_rent' | 'commercial_rent'>;
  }> = [
    { type: 'apartment', titles: PROPERTY_TITLES_APT, count: 25, priceRange: [80000, 450000], coveredArea: [35, 180], totalArea: [35, 200], rooms: [1, 5], bedrooms: [1, 4], bathrooms: [1, 3], operationKinds: ['sale', 'rent', 'temp_rent'] },
    { type: 'ph', titles: PROPERTY_TITLES_APT, count: 5, priceRange: [120000, 350000], coveredArea: [60, 160], totalArea: [80, 200], rooms: [2, 5], bedrooms: [1, 3], bathrooms: [1, 2], operationKinds: ['sale', 'rent'] },
    { type: 'house', titles: PROPERTY_TITLES_HOUSE, count: 8, priceRange: [200000, 800000], coveredArea: [120, 400], totalArea: [200, 1000], rooms: [3, 8], bedrooms: [2, 5], bathrooms: [2, 4], operationKinds: ['sale'] },
    { type: 'office', titles: PROPERTY_TITLES_OFFICE, count: 5, priceRange: [60000, 300000], coveredArea: [30, 200], totalArea: [30, 200], rooms: [1, 4], bedrooms: [0, 0], bathrooms: [1, 2], operationKinds: ['sale', 'commercial_rent'] },
    { type: 'commercial', titles: PROPERTY_TITLES_COMMERCIAL, count: 4, priceRange: [50000, 250000], coveredArea: [40, 300], totalArea: [40, 350], rooms: [1, 3], bedrooms: [0, 0], bathrooms: [1, 2], operationKinds: ['sale', 'commercial_rent'] },
    { type: 'land', titles: ['Lote en barrio cerrado', 'Terreno con medianera', 'Fracción sobre ruta'], count: 3, priceRange: [60000, 400000], coveredArea: [0, 0], totalArea: [300, 2000], rooms: [0, 0], bedrooms: [0, 0], bathrooms: [0, 0], operationKinds: ['sale'] },
  ];

  let propertyNum = 0;
  for (const cfg of propertyConfigs) {
    for (let i = 0; i < cfg.count; i++) {
      propertyNum++;
      const hood = pick(ALL_NEIGHBORHOODS);
      const status = pick(['active', 'active', 'active', 'active', 'reserved', 'sold', 'paused'] as const);
      const ownerAgent = pick(agentUserIds);
      const createdDate = randomPastDate(180);

      const [prop] = await db
        .insert(schema.property)
        .values({
          tenantId,
          branchId,
          referenceCode: `DEMO-${String(propertyNum).padStart(4, '0')}`,
          title: pick(cfg.titles),
          description: `Excelente propiedad ubicada en ${hood.name}. Ideal para inversión o vivienda. Consulte por financiación.`,
          propertyType: cfg.type,
          status,
          coveredAreaM2: cfg.coveredArea[0] > 0 ? randomInt(cfg.coveredArea[0], cfg.coveredArea[1]) : null,
          totalAreaM2: randomInt(cfg.totalArea[0], cfg.totalArea[1]),
          rooms: randomInt(cfg.rooms[0], cfg.rooms[1]),
          bedrooms: randomInt(cfg.bedrooms[0], cfg.bedrooms[1]),
          bathrooms: randomInt(cfg.bathrooms[0], cfg.bathrooms[1]),
          toilets: randomInt(0, 1),
          garages: randomInt(0, 2),
          ageYears: cfg.type === 'land' ? null : randomInt(0, 40),
          country: 'AR',
          province: 'Buenos Aires',
          locality: hood.name.includes('Vicente') || hood.name.includes('Olivos') || hood.name.includes('San Isidro') || hood.name.includes('Martínez') || hood.name.includes('Tigre') || hood.name.includes('Nordelta') || hood.name.includes('Pilar') || hood.name.includes('Avellaneda') || hood.name.includes('Quilmes') || hood.name.includes('Banfield') ? 'Gran Buenos Aires' : 'CABA',
          neighborhood: hood.name,
          addressStreet: pick(STREET_NAMES),
          addressNumber: String(randomInt(100, 5000)),
          lat: hood.lat + (Math.random() * 0.01 - 0.005),
          lng: hood.lng + (Math.random() * 0.01 - 0.005),
          featured: i < 3,
          hasPricePublic: Math.random() > 0.2,
          createdAt: createdDate,
          createdBy: ownerAgent,
          updatedBy: ownerAgent,
        })
        .returning();

      if (!prop) continue;
      propertyIds.push(prop.id);

      // Property listings (price per operation kind)
      const ops = pickN(cfg.operationKinds, randomInt(1, Math.min(2, cfg.operationKinds.length)));
      for (const kind of ops) {
        const isRent = kind.includes('rent');
        const priceAmount = isRent
          ? String(randomInt(200000, 1500000))
          : String(randomInt(cfg.priceRange[0], cfg.priceRange[1]));
        const currency = isRent ? 'ARS' : 'USD';

        await db
          .insert(schema.propertyListing)
          .values({
            tenantId,
            propertyId: prop.id,
            kind,
            priceAmount,
            priceCurrency: currency,
            commissionPct: isRent ? randomInt(3, 5) : randomInt(2, 4),
          })
          .onConflictDoNothing();
      }
    }
  }
  console.log(`  ✓ ${propertyIds.length} properties created with listings`);

  // -----------------------------------------------------------------------
  // 8. Pipelines & Leads (30 deals)
  // -----------------------------------------------------------------------
  console.log('→ Creating pipelines and 30 leads...');

  // Ventas pipeline
  const [ventasPipeline] = await db
    .insert(schema.pipeline)
    .values({
      tenantId,
      name: 'Ventas',
      type: 'ventas',
      isDefault: true,
      position: 0,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  // Alquileres pipeline
  const [alqPipeline] = await db
    .insert(schema.pipeline)
    .values({
      tenantId,
      name: 'Alquileres',
      type: 'alquileres',
      position: 1,
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  const ventasStages = [
    { name: 'Consulta inicial', kind: 'open' as const, color: '#94a3b8', position: 0, slaHours: 24 },
    { name: 'Visita agendada', kind: 'open' as const, color: '#60a5fa', position: 1, slaHours: 48 },
    { name: 'Oferta presentada', kind: 'open' as const, color: '#fbbf24', position: 2, slaHours: 72 },
    { name: 'Negociación', kind: 'open' as const, color: '#f97316', position: 3, slaHours: 120 },
    { name: 'Reserva firmada', kind: 'open' as const, color: '#a78bfa', position: 4, slaHours: null },
    { name: 'Ganado', kind: 'won' as const, color: '#22c55e', position: 5, slaHours: null },
    { name: 'Perdido', kind: 'lost' as const, color: '#ef4444', position: 6, slaHours: null },
  ];

  const alqStages = [
    { name: 'Consulta', kind: 'open' as const, color: '#94a3b8', position: 0, slaHours: 24 },
    { name: 'Visita', kind: 'open' as const, color: '#60a5fa', position: 1, slaHours: 48 },
    { name: 'Documentación', kind: 'open' as const, color: '#fbbf24', position: 2, slaHours: 72 },
    { name: 'Contrato', kind: 'open' as const, color: '#a78bfa', position: 3, slaHours: null },
    { name: 'Firmado', kind: 'won' as const, color: '#22c55e', position: 4, slaHours: null },
    { name: 'Perdido', kind: 'lost' as const, color: '#ef4444', position: 5, slaHours: null },
  ];

  const ventasStageIds: string[] = [];
  const alqStageIds: string[] = [];

  if (ventasPipeline) {
    for (const s of ventasStages) {
      const [stage] = await db
        .insert(schema.pipelineStage)
        .values({
          tenantId,
          pipelineId: ventasPipeline.id,
          name: s.name,
          kind: s.kind,
          color: s.color,
          position: s.position,
          slaHours: s.slaHours,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        })
        .returning();
      if (stage) ventasStageIds.push(stage.id);
    }
  }

  if (alqPipeline) {
    for (const s of alqStages) {
      const [stage] = await db
        .insert(schema.pipelineStage)
        .values({
          tenantId,
          pipelineId: alqPipeline.id,
          name: s.name,
          kind: s.kind,
          color: s.color,
          position: s.position,
          slaHours: s.slaHours,
          createdBy: adminUserId,
          updatedBy: adminUserId,
        })
        .returning();
      if (stage) alqStageIds.push(stage.id);
    }
  }

  // 30 leads distributed across pipelines
  const leadIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const isVentas = i < 20;
    const pipelineId = isVentas ? ventasPipeline?.id : alqPipeline?.id;
    const stageIds = isVentas ? ventasStageIds : alqStageIds;
    if (!pipelineId || stageIds.length === 0) continue;

    const stageIdx = randomInt(0, stageIds.length - 1);
    const stageId = stageIds[stageIdx]!;
    const ownerAgent = pick(agentUserIds);
    const contactId = pick(contactIds);
    const propertyId = Math.random() > 0.3 ? pick(propertyIds) : null;
    const expectedValue = isVentas
      ? String(randomInt(80000, 500000))
      : String(randomInt(200000, 1500000));

    const wonStageIdx = isVentas ? 5 : 4;
    const lostStageIdx = isVentas ? 6 : 5;
    const isWon = stageIdx === wonStageIdx;
    const isLost = stageIdx === lostStageIdx;

    const [l] = await db
      .insert(schema.lead)
      .values({
        tenantId,
        pipelineId,
        stageId,
        contactId,
        propertyId,
        title: DEAL_TITLES[i] ?? `Oportunidad ${i + 1}`,
        expectedValue,
        expectedCurrency: isVentas ? 'USD' : 'ARS',
        expectedCloseDate: randomFutureDate(90).toISOString().split('T')[0]!,
        score: randomInt(10, 100),
        ownerUserId: ownerAgent,
        lostReason: isLost ? pick(['Precio fuera de presupuesto', 'Eligió otra propiedad', 'No responde', 'Desistió de la operación']) : null,
        wonAt: isWon ? randomPastDate(30) : null,
        lostAt: isLost ? randomPastDate(30) : null,
        stageEnteredAt: randomPastDate(60),
        createdAt: randomPastDate(120),
        createdBy: ownerAgent,
        updatedBy: ownerAgent,
      })
      .returning();
    if (l) leadIds.push(l.id);
  }
  console.log(`  ✓ ${leadIds.length} leads created across 2 pipelines`);

  // -----------------------------------------------------------------------
  // 9. Calendar events
  // -----------------------------------------------------------------------
  console.log('→ Creating calendar events...');

  // Create event types
  const eventTypeConfigs = [
    { name: 'Visita', color: '#3b82f6', icon: 'eye', defaultDurationMin: 30, builtIn: true },
    { name: 'Reunión', color: '#8b5cf6', icon: 'users', defaultDurationMin: 60, builtIn: true },
    { name: 'Tasación', color: '#f59e0b', icon: 'calculator', defaultDurationMin: 90, builtIn: true },
    { name: 'Firma', color: '#10b981', icon: 'file-signature', defaultDurationMin: 60, builtIn: true },
    { name: 'Seguimiento', color: '#6366f1', icon: 'phone', defaultDurationMin: 15, builtIn: true },
  ];

  const eventTypeIds: string[] = [];
  for (const et of eventTypeConfigs) {
    const [inserted] = await db
      .insert(schema.calendarEventType)
      .values({
        tenantId,
        name: et.name,
        color: et.color,
        icon: et.icon,
        defaultDurationMin: et.defaultDurationMin,
        builtIn: et.builtIn,
        sortOrder: eventTypeIds.length,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted) eventTypeIds.push(inserted.id);
  }

  // Create 20 calendar events (mix of past and future)
  let eventsCreated = 0;
  for (let i = 0; i < 20; i++) {
    const isFuture = i < 12;
    const eventTypeId = pick(eventTypeIds);
    if (!eventTypeId) continue;

    const baseDate = isFuture ? randomFutureDate(30) : randomPastDate(30);
    baseDate.setHours(randomInt(8, 18), randomInt(0, 3) * 15, 0, 0);
    const endDate = new Date(baseDate);
    endDate.setMinutes(endDate.getMinutes() + pick([30, 60, 90]));

    const ownerAgent = pick(agentUserIds);
    const linkedProperty = Math.random() > 0.4 ? pick(propertyIds) : null;

    await db
      .insert(schema.calendarEvent)
      .values({
        tenantId,
        eventTypeId,
        title: pick(CALENDAR_EVENT_TITLES),
        description: linkedProperty ? 'Consultar detalles en la ficha de la propiedad' : null,
        location: `${pick(STREET_NAMES)} ${randomInt(100, 5000)}, ${pick(ALL_NEIGHBORHOODS).name}`,
        startAt: baseDate,
        endAt: endDate,
        allDay: false,
        linkedEntityType: linkedProperty ? 'property' : null,
        linkedEntityId: linkedProperty,
        createdByUserId: ownerAgent,
        createdBy: ownerAgent,
        updatedBy: ownerAgent,
      });
    eventsCreated++;
  }
  console.log(`  ✓ ${eventsCreated} calendar events created`);

  // -----------------------------------------------------------------------
  // 10. Inbox channels & conversations (5 conversations)
  // -----------------------------------------------------------------------
  console.log('→ Creating inbox channels and conversations...');

  const [whatsappChannel] = await db
    .insert(schema.inboxChannel)
    .values({
      tenantId,
      type: 'whatsapp',
      name: 'WhatsApp Business',
      config: JSON.stringify({ phoneNumberId: 'demo-wa-id', accessToken: 'demo-token' }),
      status: 'active',
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  const [emailChannel] = await db
    .insert(schema.inboxChannel)
    .values({
      tenantId,
      type: 'email',
      name: 'Email principal',
      config: JSON.stringify({ address: 'info@demo.corredor.app' }),
      status: 'active',
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing()
    .returning();

  const channelIds = [whatsappChannel?.id, emailChannel?.id].filter(Boolean) as string[];

  // 5 conversations with messages
  for (let i = 0; i < 5; i++) {
    const channelId = pick(channelIds);
    if (!channelId) continue;

    const contactId = contactIds[i]!;
    const agentId = pick(agentUserIds);
    const msgCount = randomInt(3, 8);
    const convCreated = randomPastDate(14);

    const [conv] = await db
      .insert(schema.conversation)
      .values({
        tenantId,
        channelId,
        contactId,
        assignedAgentId: agentId,
        status: pick(['open', 'assigned', 'pending'] as const),
        subject: pick(['Consulta por propiedad', 'Información sobre alquileres', 'Solicitud de visita', 'Presupuesto', 'Consulta general']),
        lastMessageAt: new Date(),
        messageCount: msgCount,
        createdAt: convCreated,
        createdBy: agentId,
        updatedBy: agentId,
      })
      .returning();

    if (!conv) continue;

    // Generate messages for this conversation
    const messageTemplatesIn = [
      'Hola, vi una propiedad publicada y me interesa. ¿Podrían darme más información?',
      '¿Cuándo podría visitarla?',
      'Me interesa. ¿Cuál es el precio?',
      '¿Aceptan financiación?',
      'Perfecto, confirmamos la visita entonces.',
      '¿Tienen algo similar en la zona de Palermo?',
      'Gracias por la información.',
    ];

    const messageTemplatesOut = [
      '¡Hola! Claro, con gusto. La propiedad cuenta con excelentes terminaciones y una ubicación privilegiada.',
      'Podemos coordinar una visita para esta semana. ¿Le queda bien miércoles o jueves por la tarde?',
      'El precio publicado es en USD. Le envío la ficha completa por este medio.',
      'Sí, trabajamos con varias opciones de financiación. Le cuento los detalles en la visita.',
      'Perfecto, queda agendada. Le envío la ubicación.',
      'Tenemos varias opciones en esa zona. Le armo un listado personalizado.',
    ];

    for (let m = 0; m < msgCount; m++) {
      const isInbound = m % 2 === 0;
      const msgDate = new Date(convCreated);
      msgDate.setHours(msgDate.getHours() + m * randomInt(1, 12));

      await db
        .insert(schema.message)
        .values({
          tenantId,
          conversationId: conv.id,
          direction: isInbound ? 'in' : 'out',
          contentType: 'text',
          content: JSON.stringify({ text: isInbound ? pick(messageTemplatesIn) : pick(messageTemplatesOut) }),
          status: isInbound ? 'delivered' : 'read',
          senderUserId: isInbound ? null : agentId,
          createdAt: msgDate,
        });
    }
  }
  console.log('  ✓ 5 conversations with messages created');

  // -----------------------------------------------------------------------
  // 11. Tasación reports (5)
  // -----------------------------------------------------------------------
  console.log('→ Creating 5 appraisal reports...');

  const appraisalStatuses: Array<'draft' | 'in_progress' | 'in_review' | 'approved' | 'delivered'> = ['delivered', 'approved', 'in_review', 'in_progress', 'draft'];

  for (let i = 0; i < 5; i++) {
    const hood = pick(ALL_NEIGHBORHOODS);
    const propType = pick(['apartment', 'house', 'ph'] as const);
    const coveredArea = randomInt(50, 250);
    const totalArea = coveredArea + randomInt(0, 100);
    const estimatedMin = randomInt(80000, 300000);
    const estimatedMax = estimatedMin + randomInt(10000, 50000);
    const contactForAppraisal = contactIds[i + 10]!;
    const firstName = pick(FIRST_NAMES_M);
    const lastName = pick(LAST_NAMES);
    const appraiser = pick(agentUserIds);

    const [appr] = await db
      .insert(schema.appraisal)
      .values({
        tenantId,
        clientName: `${firstName} ${lastName}`,
        clientEmail: randomEmail(firstName, lastName),
        clientPhone: randomPhone(),
        addressStreet: pick(STREET_NAMES),
        addressNumber: String(randomInt(100, 5000)),
        locality: hood.name,
        province: 'Buenos Aires',
        country: 'AR',
        lat: hood.lat + (Math.random() * 0.01 - 0.005),
        lng: hood.lng + (Math.random() * 0.01 - 0.005),
        propertyType: propType,
        operationKind: 'sale',
        coveredAreaM2: coveredArea,
        totalAreaM2: totalArea,
        rooms: randomInt(2, 5),
        bedrooms: randomInt(1, 4),
        bathrooms: randomInt(1, 3),
        garages: randomInt(0, 2),
        ageYears: randomInt(0, 30),
        purpose: pick(['sale', 'guarantee', 'inheritance'] as const),
        status: appraisalStatuses[i]!,
        referenceCode: `TAS-${String(i + 1).padStart(4, '0')}`,
        estimatedValueMin: String(estimatedMin),
        estimatedValueMax: String(estimatedMax),
        valueCurrency: 'USD',
        appraiserName: pick(demoUsers.slice(1)).fullName,
        createdAt: randomPastDate(60),
        createdBy: appraiser,
        updatedBy: appraiser,
      })
      .returning();

    if (!appr) continue;

    // Add 3 comparables per appraisal
    for (let c = 0; c < 3; c++) {
      await db
        .insert(schema.appraisalComp)
        .values({
          tenantId,
          appraisalId: appr.id,
          address: `${pick(STREET_NAMES)} ${randomInt(100, 5000)}, ${hood.name}`,
          coveredAreaM2: randomInt(40, 200),
          totalAreaM2: randomInt(50, 250),
          rooms: randomInt(1, 5),
          bedrooms: randomInt(1, 4),
          bathrooms: randomInt(1, 3),
          priceAmount: String(randomInt(70000, 350000)),
          priceCurrency: 'USD',
        });
    }

    // Add report narrative for delivered/approved ones
    if (['delivered', 'approved'].includes(appraisalStatuses[i]!)) {
      await db
        .insert(schema.appraisalReport)
        .values({
          tenantId,
          appraisalId: appr.id,
          estimatedValueMin: String(estimatedMin),
          estimatedValueMax: String(estimatedMax),
          valueCurrency: 'USD',
          narrativeMd: `# Tasación — ${hood.name}\n\n## Análisis de mercado\n\nLa zona presenta una demanda sostenida con valores estables en los últimos 6 meses. Se observa una tendencia alcista moderada del 3-5% interanual en propiedades similares.\n\n## Conclusión\n\nValor estimado de mercado: USD ${estimatedMin.toLocaleString()} – USD ${estimatedMax.toLocaleString()}. El inmueble se encuentra en buen estado de conservación y en una ubicación con alta demanda.`,
          compsSummary: 'Se analizaron 3 comparables de la zona con características similares en superficie, antigüedad y ubicación.',
          methodologyNote: 'Método comparativo de mercado (ASVS L2). Se asume estado de conservación normal, libre de gravámenes, y condiciones normales de mercado.',
        });
    }
  }
  console.log('  ✓ 5 appraisals with comparables created');

  // -----------------------------------------------------------------------
  // 12. Analytics events (6 months)
  // -----------------------------------------------------------------------
  console.log('→ Creating 6 months of analytics data...');

  const analyticsEventTypes: Array<'property.created' | 'property.viewed' | 'property.lead_generated' | 'lead.created' | 'lead.contacted' | 'lead.qualified' | 'lead.closed_won' | 'lead.closed_lost' | 'message.received' | 'message.sent' | 'contact.created' | 'user.login'> = [
    'property.created', 'property.viewed', 'property.lead_generated',
    'lead.created', 'lead.contacted', 'lead.qualified', 'lead.closed_won', 'lead.closed_lost',
    'message.received', 'message.sent', 'contact.created', 'user.login',
  ];

  type AnalyticsEntityType = 'property' | 'lead' | 'opportunity' | 'portal' | 'message' | 'contact' | 'user' | 'import_job' | 'tenant' | 'referral' | 'subscription' | 'site' | 'appraisal' | 'report';

  const eventBatch: Array<{
    tenantId: string;
    eventType: typeof analyticsEventTypes[number];
    entityType: AnalyticsEntityType | null;
    entityId: string | null;
    actorId: string | null;
    properties: unknown;
    occurredAt: Date;
  }> = [];

  for (let daysBack = 180; daysBack >= 0; daysBack--) {
    const day = daysAgo(daysBack);
    const eventsPerDay = randomInt(8, 30);

    for (let e = 0; e < eventsPerDay; e++) {
      const eventType = pick(analyticsEventTypes);
      const hour = randomInt(8, 20);
      const minute = randomInt(0, 59);
      const eventTime = new Date(day);
      eventTime.setHours(hour, minute, 0, 0);

      let entityType: AnalyticsEntityType = 'property';
      let entityId: string | null = pick(propertyIds);

      if (eventType.startsWith('lead.')) {
        entityType = 'lead';
        entityId = leadIds.length > 0 ? pick(leadIds) : null;
      } else if (eventType.startsWith('contact.')) {
        entityType = 'contact';
        entityId = pick(contactIds);
      } else if (eventType.startsWith('message.')) {
        entityType = 'message';
        entityId = null;
      } else if (eventType === 'user.login') {
        entityType = 'user';
        entityId = pick(userIds);
      }

      eventBatch.push({
        tenantId,
        eventType,
        entityType,
        entityId,
        actorId: pick(userIds),
        properties: { source: pick(['web', 'mobile', 'api']), demo: true },
        occurredAt: eventTime,
      });
    }
  }

  // Batch insert analytics events (500 at a time)
  for (let i = 0; i < eventBatch.length; i += 500) {
    const batch = eventBatch.slice(i, i + 500);
    await db.insert(schema.analyticsEvent).values(batch);
  }
  console.log(`  ✓ ${eventBatch.length} analytics events created (6 months)`);

  // -----------------------------------------------------------------------
  // 13. KPI daily snapshots (6 months)
  // -----------------------------------------------------------------------
  console.log('→ Creating KPI daily snapshots...');

  const kpiMetrics: Array<'active_properties_count' | 'leads_created_count' | 'lead_conversion_rate' | 'avg_days_to_close' | 'revenue_pipeline_amount' | 'portal_reach_count'> = [
    'active_properties_count', 'leads_created_count', 'lead_conversion_rate',
    'avg_days_to_close', 'revenue_pipeline_amount', 'portal_reach_count',
  ];

  const kpiBatch: Array<{
    tenantId: string;
    snapshotDate: string;
    dimensionType: 'agency';
    metric: typeof kpiMetrics[number];
    value: string;
  }> = [];

  for (let daysBack = 180; daysBack >= 0; daysBack--) {
    const day = daysAgo(daysBack);
    const dateStr = day.toISOString().split('T')[0]!;

    for (const metric of kpiMetrics) {
      let value: number;
      switch (metric) {
        case 'active_properties_count':
          value = Math.round(jitter(42, 0.1));
          break;
        case 'leads_created_count':
          value = randomInt(1, 8);
          break;
        case 'lead_conversion_rate':
          value = Math.round(jitter(22, 0.15) * 100) / 100;
          break;
        case 'avg_days_to_close':
          value = Math.round(jitter(45, 0.2));
          break;
        case 'revenue_pipeline_amount':
          value = Math.round(jitter(2500000, 0.15));
          break;
        case 'portal_reach_count':
          value = randomInt(500, 3000);
          break;
      }

      kpiBatch.push({
        tenantId,
        snapshotDate: dateStr,
        dimensionType: 'agency',
        metric,
        value: String(value),
      });
    }
  }

  for (let i = 0; i < kpiBatch.length; i += 500) {
    const batch = kpiBatch.slice(i, i + 500);
    await db.insert(schema.kpiSnapshotDaily).values(batch);
  }
  console.log(`  ✓ ${kpiBatch.length} KPI snapshots created`);

  // -----------------------------------------------------------------------
  // 14. Subscription (Pro plan)
  // -----------------------------------------------------------------------
  console.log('→ Creating Pro subscription...');

  await db
    .insert(schema.subscription)
    .values({
      tenantId,
      planCode: PLAN_CODE,
      status: 'active',
      billingProvider: 'stripe',
      currency: 'USD',
      priceAmount: '99.00',
      currentPeriodStart: daysAgo(15),
      currentPeriodEnd: daysFromNow(15),
      createdBy: adminUserId,
      updatedBy: adminUserId,
    })
    .onConflictDoNothing();
  console.log('  ✓ Pro subscription active');

  // -----------------------------------------------------------------------
  // Done
  // -----------------------------------------------------------------------
  console.log('\n✅ Demo seed complete!');
  console.log(`   Tenant: ${DEMO_TENANT_NAME} (${DEMO_TENANT_SLUG})`);
  console.log(`   Properties: ${propertyIds.length}`);
  console.log(`   Contacts: ${contactIds.length}`);
  console.log(`   Leads: ${leadIds.length}`);
  console.log(`   Calendar events: ${eventsCreated}`);
  console.log(`   Appraisals: 5`);
  console.log(`   Analytics events: ${eventBatch.length}`);
  console.log(`   KPI snapshots: ${kpiBatch.length}`);
  console.log(`\n   Credentials:`);
  console.log(`   - demo@corredor.app (Owner)`);
  console.log(`   - maria@demo.corredor.app (Agent)`);
  console.log(`   - carlos@demo.corredor.app (Agent)`);

  await client.end();
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
