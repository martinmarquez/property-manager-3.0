-- k6 load test data seeding script
-- Seeds: 1,000,000 properties + 100,000 contacts in staging DB
--
-- Usage (Neon staging branch):
--   psql "$STAGING_DATABASE_URL" -f infra/k6/seed/seed.sql
--
-- Prerequisites:
--   - Run this AFTER running DB migrations (pnpm --filter @corredor/db migrate)
--   - The load-test tenant will be created if it does not exist
--   - Estimated execution time: 5–10 minutes on Neon free tier
--
-- WARNING: Do NOT run against production. Uses a dedicated load-test tenant.

BEGIN;

-- ── 1. Load-test tenant ───────────────────────────────────────────────────────

INSERT INTO tenant (id, slug, name, plan_code, created_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'load-test',
  'Corredor Load Test',
  'empresa',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Seed user (for authenticated k6 sessions) ─────────────────────────────
-- Password: LoadTest2026!  (bcrypt cost 10 — DO NOT use in production)

INSERT INTO "user" (id, tenant_id, email, full_name, password_hash, created_at, updated_at)
VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'k6@corredor.ar',
  'k6 Load Tester',
  '$2b$10$K9M8H3V2d5fL0wR7nQ4OuuNzL3Xp9R6kJ0Y8mT1hA5gB2cD4eF6g',
  NOW(),
  NOW()
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ── 3. 1,000,000 properties ───────────────────────────────────────────────────
-- IDs follow pattern 00000000-0000-4000-8000-<12-digit-seq> for deterministic lookup.

INSERT INTO property (
  id,
  tenant_id,
  reference_code,
  title,
  property_type,
  total_area_m2,
  covered_area_m2,
  rooms,
  bedrooms,
  bathrooms,
  address_street,
  address_number,
  locality,
  province,
  country,
  lat,
  lng,
  status,
  has_price_public,
  created_at,
  updated_at
)
SELECT
  ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid  AS id,
  'a0000000-0000-4000-8000-000000000001'::uuid                   AS tenant_id,
  'LOAD-' || lpad(i::text, 7, '0')                              AS reference_code,
  CASE (i % 4)
    WHEN 0 THEN 'Departamento en ' || city_name
    WHEN 1 THEN 'Casa en ' || city_name
    WHEN 2 THEN 'PH en ' || city_name
    ELSE 'Local comercial en ' || city_name
  END                                                           AS title,
  CASE (i % 4)
    WHEN 0 THEN 'apartment'::property_type
    WHEN 1 THEN 'house'::property_type
    WHEN 2 THEN 'ph'::property_type
    ELSE 'commercial'::property_type
  END                                                           AS property_type,
  (30 + (i % 400))::real                                        AS total_area_m2,
  (25 + (i % 300))::real                                        AS covered_area_m2,
  (1 + (i % 6))                                                AS rooms,
  (i % 4)                                                       AS bedrooms,
  (1 + (i % 3))                                                AS bathrooms,
  'Av. ' || street_name || ' ' || (i % 9999 + 1)              AS address_street,
  (i % 9999 + 1)::text                                         AS address_number,
  city_name                                                     AS locality,
  province_name                                                 AS province,
  'AR'                                                          AS country,
  (-34.6 + (random() * 1.5 - 0.75))::real                     AS lat,
  (-58.4 + (random() * 1.5 - 0.75))::real                     AS lng,
  CASE (i % 10)
    WHEN 0 THEN 'sold'::property_status
    WHEN 1 THEN 'archived'::property_status
    ELSE 'active'::property_status
  END                                                          AS status,
  (i % 5 != 0)                                                AS has_price_public,
  NOW() - ((random() * 365 * 2)::int || ' days')::interval    AS created_at,
  NOW() - ((random() * 30)::int || ' days')::interval         AS updated_at
FROM generate_series(1, 1000000) AS i,
  LATERAL (
    SELECT
      (ARRAY['Corrientes','Santa Fe','Córdoba','Rivadavia','Callao','Cabildo','Las Heras','Libertador','Palermo','Belgrano'])[(i % 10) + 1]     AS street_name,
      (ARRAY['Buenos Aires','Rosario','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Salta','Santa Fe','Bahía Blanca'])[(i % 10) + 1] AS city_name,
      (ARRAY['Buenos Aires','Santa Fe','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Salta','Santa Fe','Buenos Aires'])[(i % 10) + 1] AS province_name
  ) AS lkp
ON CONFLICT (id) DO NOTHING;

-- ── 4. 100,000 contacts ───────────────────────────────────────────────────────

INSERT INTO contact (
  id,
  tenant_id,
  kind,
  first_name,
  last_name,
  phones,
  emails,
  addresses,
  created_at,
  updated_at
)
SELECT
  ('c0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid  AS id,
  'a0000000-0000-4000-8000-000000000001'::uuid                   AS tenant_id,
  'person'::contact_kind                                         AS kind,
  (ARRAY['Juan','María','Carlos','Ana','Luis','Laura','Miguel','Paula','Diego','Sofía'])[(i % 10) + 1]  AS first_name,
  (ARRAY['García','López','Martínez','González','Rodríguez','Fernández','Sánchez','Díaz','Pérez','Álvarez'])[(i % 10) + 1] AS last_name,
  jsonb_build_array(jsonb_build_object('label', 'mobile', 'number', '+549' || (11000000 + i)::text))           AS phones,
  jsonb_build_array(jsonb_build_object('label', 'personal', 'address', 'contact.' || i || '@loadtest.corredor.ar')) AS emails,
  '[]'::jsonb                                                    AS addresses,
  NOW() - ((random() * 365)::int || ' days')::interval          AS created_at,
  NOW() - ((random() * 7)::int || ' days')::interval            AS updated_at
FROM generate_series(1, 100000) AS i
ON CONFLICT (id) DO NOTHING;

-- ── 5. Summary ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  prop_count  bigint;
  cont_count  bigint;
BEGIN
  SELECT COUNT(*) INTO prop_count FROM property WHERE tenant_id = 'a0000000-0000-4000-8000-000000000001';
  SELECT COUNT(*) INTO cont_count FROM contact  WHERE tenant_id = 'a0000000-0000-4000-8000-000000000001';
  RAISE NOTICE 'Seeded: % properties, % contacts', prop_count, cont_count;
END $$;

COMMIT;
