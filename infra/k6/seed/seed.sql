-- k6 load test data seeding script
-- Seeds: 1,000,000 listings + 100,000 contacts in staging DB
--
-- Usage (Neon staging branch):
--   psql "$STAGING_DATABASE_URL" -f infra/k6/seed/seed.sql
--
-- Prerequisites:
--   - Run this AFTER running DB migrations (pnpm --filter @corredor/db migrate)
--   - The tenant 'load-test-tenant' must exist (INSERT below creates it if missing)
--   - Estimated execution time: 5–10 minutes on Neon free tier
--
-- WARNING: Do NOT run against production. Uses a dedicated load-test tenant.

BEGIN;

-- ── 1. Load-test tenant ───────────────────────────────────────────────────────

INSERT INTO tenant (id, slug, name, plan, created_at)
VALUES (
  'tenant_loadtest_01',
  'load-test',
  'Corredor Load Test',
  'enterprise',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Seed user (for authenticated k6 sessions) ─────────────────────────────

INSERT INTO "user" (id, tenant_id, email, name, role, password_hash, created_at)
VALUES (
  'user_loadtest_01',
  'tenant_loadtest_01',
  'k6@corredor.ar',
  'k6 Load Tester',
  'admin',
  -- bcrypt hash of 'LoadTest2026!' — DO NOT use in production
  '$2b$10$K9M8H3V2d5fL0wR7nQ4OuuNzL3Xp9R6kJ0Y8mT1hA5gB2cD4eF6g',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ── 3. 1,000,000 properties ───────────────────────────────────────────────────
-- Uses generate_series for performance; real-looking Argentine addresses.

INSERT INTO property (
  id,
  tenant_id,
  external_id,
  title,
  property_type,
  operation_type,
  price,
  currency,
  surface_total,
  surface_covered,
  rooms,
  bedrooms,
  bathrooms,
  address_street,
  address_number,
  address_city,
  address_province,
  address_country,
  latitude,
  longitude,
  status,
  show_price,
  created_at,
  updated_at
)
SELECT
  'prop_' || lpad(i::text, 8, '0')                          AS id,
  'tenant_loadtest_01'                                        AS tenant_id,
  'ext_' || i                                                AS external_id,
  CASE (i % 4)
    WHEN 0 THEN 'Departamento en ' || city_name
    WHEN 1 THEN 'Casa en ' || city_name
    WHEN 2 THEN 'PH en ' || city_name
    ELSE 'Local comercial en ' || city_name
  END                                                        AS title,
  CASE (i % 4)
    WHEN 0 THEN 'apartment'
    WHEN 1 THEN 'house'
    WHEN 2 THEN 'ph'
    ELSE 'commercial'
  END                                                        AS property_type,
  CASE (i % 2) WHEN 0 THEN 'sale' ELSE 'rent' END           AS operation_type,
  (50000 + (i % 500000))::numeric                            AS price,
  CASE (i % 2) WHEN 0 THEN 'USD' ELSE 'ARS' END             AS currency,
  (30 + (i % 400))::numeric                                  AS surface_total,
  (25 + (i % 300))::numeric                                  AS surface_covered,
  (1 + (i % 6))                                              AS rooms,
  (i % 4)                                                    AS bedrooms,
  (1 + (i % 3))                                             AS bathrooms,
  'Av. ' || street_name || ' ' || (i % 9999 + 1)           AS address_street,
  (i % 9999 + 1)::text                                      AS address_number,
  city_name                                                  AS address_city,
  province_name                                              AS address_province,
  'Argentina'                                                AS address_country,
  (-34.6 + (random() * 1.5 - 0.75))::double precision       AS latitude,
  (-58.4 + (random() * 1.5 - 0.75))::double precision       AS longitude,
  CASE (i % 10)
    WHEN 0 THEN 'sold'
    WHEN 1 THEN 'rented'
    ELSE 'active'
  END                                                        AS status,
  (i % 5 != 0)                                              AS show_price,
  NOW() - ((random() * 365 * 2)::int || ' days')::interval AS created_at,
  NOW() - ((random() * 30)::int || ' days')::interval      AS updated_at
FROM generate_series(1, 1000000) AS i,
  LATERAL (
    SELECT
      (ARRAY['Corrientes','Santa Fe','Córdoba','Rivadavia','Callao','Cabildo','Las Heras','Libertador','Palermo','Belgrano'])[(i % 10) + 1] AS street_name,
      (ARRAY['Buenos Aires','Rosario','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Salta','Santa Fe','Bahía Blanca'])[(i % 10) + 1] AS city_name,
      (ARRAY['Buenos Aires','Santa Fe','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Salta','Santa Fe','Buenos Aires'])[(i % 10) + 1] AS province_name
  ) AS lkp
ON CONFLICT (id) DO NOTHING;

-- ── 4. 100,000 contacts ───────────────────────────────────────────────────────

INSERT INTO contact (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  contact_type,
  created_at,
  updated_at
)
SELECT
  'contact_' || lpad(i::text, 7, '0')                  AS id,
  'tenant_loadtest_01'                                   AS tenant_id,
  (ARRAY['Juan','María','Carlos','Ana','Luis','Laura','Miguel','Paula','Diego','Sofía'])[(i % 10) + 1] AS first_name,
  (ARRAY['García','López','Martínez','González','Rodríguez','Fernández','Sánchez','Díaz','Pérez','Álvarez'])[(i % 10) + 1] AS last_name,
  'contact.' || i || '@loadtest.corredor.ar'            AS email,
  '+549' || (11000000 + i)::text                        AS phone,
  CASE (i % 3)
    WHEN 0 THEN 'buyer'
    WHEN 1 THEN 'seller'
    ELSE 'tenant'
  END                                                   AS contact_type,
  NOW() - ((random() * 365)::int || ' days')::interval AS created_at,
  NOW() - ((random() * 7)::int || ' days')::interval   AS updated_at
FROM generate_series(1, 100000) AS i
ON CONFLICT (id) DO NOTHING;

-- ── 5. Summary ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  prop_count  bigint;
  cont_count  bigint;
BEGIN
  SELECT COUNT(*) INTO prop_count FROM property WHERE tenant_id = 'tenant_loadtest_01';
  SELECT COUNT(*) INTO cont_count FROM contact  WHERE tenant_id = 'tenant_loadtest_01';
  RAISE NOTICE 'Seeded: % properties, % contacts', prop_count, cont_count;
END $$;

COMMIT;
