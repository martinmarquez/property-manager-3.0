import type { EvalCase, FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `Determine if two property listings refer to the same physical property. Consider address similarity, area, rooms, price, and distinguishing features. Output JSON: { isDuplicate: boolean, confidence: number, matchingFields: string[], differingFields: string[] }

Rules:
- confidence is 0-1 representing how confident you are in the determination.
- matchingFields: list of field names that match between the two listings (e.g. "address", "area", "rooms", "price", "floor", "amenities").
- differingFields: list of field names that differ between the two listings.
- Consider that the same property may appear with slight formatting differences, different brokers, or minor price variations.
- Argentine address conventions: "Av." = "Avenida", "amb" = "ambientes", "dorm" = "dormitorios".
- Return ONLY valid JSON, nothing else.`;

function validateDuplicate(output: string, expectedDuplicate: boolean): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['isDuplicate', 'confidence', 'matchingFields', 'differingFields'])) return false;

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['isDuplicate'] !== 'boolean') return false;
  if (obj['isDuplicate'] !== expectedDuplicate) return false;

  const confidence = obj['confidence'];
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) return false;

  if (!Array.isArray(obj['matchingFields'])) return false;
  if (!Array.isArray(obj['differingFields'])) return false;

  return true;
}

const cases: EvalCase[] = [
  {
    id: 'dd-01-address-formatting',
    category: 'duplicate',
    input: `Listing A:
Address: Av. Santa Fe 2100
Type: Departamento
Area: 65 m²
Rooms: 3 ambientes
Price: USD 155.000
Floor: 6° A

Listing B:
Address: Avenida Santa Fe 2100, Recoleta, CABA
Type: Departamento
Area: 65 m²
Rooms: 3 ambientes
Price: USD 155.000
Floor: Piso 6, Depto A`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-02-different-portals',
    category: 'duplicate',
    input: `Listing A (ZonaProp):
Address: Juncal 1580, Recoleta
Type: Departamento
Area: 88 m²
Rooms: 4 ambientes
Price: USD 198.000
Amenities: Balcón, cochera
Agent: Inmobiliaria López

Listing B (MercadoLibre):
Address: Juncal 1580, Recoleta, CABA
Type: Depto 4 amb
Area: 88 m²
Rooms: 4 ambientes
Price: USD 195.000
Amenities: Balcón terraza, cochera cubierta
Agent: RE/MAX Puerto Norte`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-03-different-brokers',
    category: 'duplicate',
    input: `Listing A:
Address: Av. Cabildo 1425, Belgrano
Type: Departamento
Area: 52 m²
Rooms: 2 ambientes
Price: USD 115.000
Description: "Hermoso 2 ambientes a estrenar, piso alto, vista abierta."

Listing B:
Address: Cabildo 1425, Belgrano, CABA
Type: Departamento
Area: 52 m²
Rooms: 2 ambientes
Price: USD 118.000
Description: "Moderno depto 2 amb, excelente ubicación sobre Cabildo. Luminoso."`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-04-price-updated',
    category: 'duplicate',
    input: `Listing A (posted January 2026):
Address: Gorriti 4200, Palermo Soho
Type: Departamento
Area: 73 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Price: USD 185.000
Floor: 3° B

Listing B (posted April 2026):
Address: Gorriti 4200, Palermo Soho, CABA
Type: Departamento
Area: 73 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Price: USD 172.000
Floor: 3° B`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-05-floor-detail-missing',
    category: 'duplicate',
    input: `Listing A:
Address: Arenales 1850, Piso 4, Depto A, Recoleta
Type: Departamento
Area: 95 m²
Rooms: 4 ambientes
Bedrooms: 3
Price: USD 230.000

Listing B:
Address: Arenales 1850, Recoleta
Type: Departamento
Area: 95 m²
Rooms: 4 ambientes
Bedrooms: 3
Price: USD 230.000`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-06-abbreviations',
    category: 'duplicate',
    input: `Listing A:
Address: Av. Corrientes 3400, Almagro
Type: Depto
Area: 58 m²
Specs: 3 amb, 2 dorm, 1 baño
Price: USD 125.000
Amenities: Balc., lavarr.

Listing B:
Address: Avenida Corrientes 3400, Almagro, CABA
Type: Departamento
Area: 58 m²
Specs: 3 ambientes, 2 dormitorios, 1 baño completo
Price: USD 125.000
Amenities: Balcón, lavarropas`,
    validate: (o) => validateDuplicate(o, true),
  },
  {
    id: 'dd-07-same-street-diff-number',
    category: 'non_duplicate',
    input: `Listing A:
Address: Av. Santa Fe 2100, Recoleta
Type: Departamento
Area: 65 m²
Rooms: 3 ambientes
Price: USD 155.000

Listing B:
Address: Av. Santa Fe 2800, Palermo
Type: Departamento
Area: 62 m²
Rooms: 3 ambientes
Price: USD 148.000`,
    validate: (o) => validateDuplicate(o, false),
  },
  {
    id: 'dd-08-same-building-diff-unit',
    category: 'non_duplicate',
    input: `Listing A:
Address: Juncal 1580, Piso 3, Depto B, Recoleta
Type: Departamento
Area: 45 m²
Rooms: 2 ambientes
Price: USD 110.000
Bathrooms: 1

Listing B:
Address: Juncal 1580, Piso 8, Depto A, Recoleta
Type: Departamento
Area: 88 m²
Rooms: 4 ambientes
Price: USD 198.000
Bathrooms: 2`,
    validate: (o) => validateDuplicate(o, false),
  },
  {
    id: 'dd-09-same-neighborhood-diff-address',
    category: 'non_duplicate',
    input: `Listing A:
Address: Honduras 4800, Palermo Soho
Type: Departamento
Area: 70 m²
Rooms: 3 ambientes
Price: USD 165.000
Floor: 5° C

Listing B:
Address: Thames 1600, Palermo Soho
Type: Departamento
Area: 72 m²
Rooms: 3 ambientes
Price: USD 170.000
Floor: 4° A`,
    validate: (o) => validateDuplicate(o, false),
  },
  {
    id: 'dd-10-same-address-diff-operation',
    category: 'non_duplicate',
    input: `Listing A:
Address: Gurruchaga 1200, Villa Crespo
Type: Departamento
Operation: Venta
Area: 55 m²
Rooms: 2 ambientes
Price: USD 120.000
Floor: 2° A

Listing B:
Address: Gurruchaga 1200, Villa Crespo
Type: Departamento
Operation: Alquiler
Area: 38 m²
Rooms: 1 ambiente
Price: ARS 350.000/mes
Floor: 7° B`,
    validate: (o) => validateDuplicate(o, false),
  },
  {
    id: 'dd-11-similar-specs-diff-neighborhood',
    category: 'non_duplicate',
    input: `Listing A:
Address: Av. Rivadavia 5200, Caballito
Type: Departamento
Area: 75 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Price: USD 145.000
Floor: 4° B

Listing B:
Address: Av. Rivadavia 8500, Floresta
Type: Departamento
Area: 75 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Price: USD 130.000
Floor: 4° A`,
    validate: (o) => validateDuplicate(o, false),
  },
  {
    id: 'dd-12-same-street-name-diff-city',
    category: 'non_duplicate',
    input: `Listing A:
Address: Calle 7 N° 1250, La Plata, Buenos Aires
Type: Departamento
Area: 60 m²
Rooms: 2 ambientes
Price: USD 85.000

Listing B:
Address: Calle 7 N° 450, Mar del Plata, Buenos Aires
Type: Departamento
Area: 58 m²
Rooms: 2 ambientes
Price: USD 78.000`,
    validate: (o) => validateDuplicate(o, false),
  },
];

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'duplicate.detect',
    systemPrompt: SYSTEM_PROMPT,
    cases,
    threshold: 0.8,
    maxTokens: 512,
  };
}
