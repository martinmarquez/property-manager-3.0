import type { FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `You are an expert real estate appraiser in Argentina. Given a subject property and comparable properties, estimate the property value and provide analysis. Output JSON: { "estimatedMin": number, "estimatedMax": number, "currency": string, "narrative": string, "methodology": string }

Rules:
- estimatedMin and estimatedMax must be plain numbers with no currency symbols.
- currency must be "USD" or "ARS".
- estimatedMin must be strictly less than estimatedMax.
- narrative must explain the valuation rationale in detail (at least 50 characters).
- methodology must describe the approach used (e.g. comparative market analysis).
- Base your estimate on the comparable properties provided, adjusting for differences in area, location, age, and amenities.`;

function avgPricePerM2(comps: { area: number; price: number }[]): number {
  const total = comps.reduce((sum, c) => sum + c.price / c.area, 0);
  return total / comps.length;
}

function validateAppraisal(
  output: string,
  subjectArea: number,
  comps: { area: number; price: number }[],
  expectedCurrency: string,
): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['estimatedMin', 'estimatedMax', 'currency', 'narrative', 'methodology']))
    return false;

  const obj = parsed as Record<string, unknown>;

  const min = Number(obj['estimatedMin']);
  const max = Number(obj['estimatedMax']);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
  if (min >= max) return false;
  if (min <= 0 || max <= 0) return false;

  const currency = String(obj['currency']).toUpperCase();
  if (currency !== 'USD' && currency !== 'ARS') return false;
  if (currency !== expectedCurrency) return false;

  const narrative = String(obj['narrative'] ?? '');
  if (narrative.length < 50) return false;

  const methodology = String(obj['methodology'] ?? '');
  if (methodology.length < 10) return false;

  const ppm2 = avgPricePerM2(comps);
  const roughValue = ppm2 * subjectArea;
  if (min > roughValue * 2 || max < roughValue * 0.5) return false;

  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'appraisal.assist',
    systemPrompt: SYSTEM_PROMPT,
    threshold: 0.8,
    maxTokens: 1024,
    cases: [
      {
        id: 'aa-01-palermo-2bd-apt',
        category: 'apartment',
        input: `Subject property:
Address: Gurruchaga 1850, Palermo, CABA
Type: Apartment
Area: 72 m2
Rooms: 3
Bedrooms: 2
Age: 15 years
Location: Palermo Soho, close to Plaza Serrano

Comparable properties:
1. Honduras 5200, Palermo — 400m away — 68 m2 — USD 170,000 — 3 rooms
2. Thames 1600, Palermo — 350m away — 78 m2 — USD 202,000 — 3 rooms
3. Serrano 1400, Palermo — 500m away — 65 m2 — USD 175,500 — 3 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            72,
            [
              { area: 68, price: 170000 },
              { area: 78, price: 202000 },
              { area: 65, price: 175500 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-02-recoleta-luxury-apt',
        category: 'apartment',
        input: `Subject property:
Address: Av. Alvear 1500, Recoleta, CABA
Type: Apartment
Area: 180 m2
Rooms: 5
Bedrooms: 3
Age: 40 years (renovated)
Location: Recoleta, facing the park, premium building with doorman

Comparable properties:
1. Posadas 1200, Recoleta — 300m away — 165 m2 — USD 560,000 — 5 rooms
2. Av. Quintana 600, Recoleta — 250m away — 195 m2 — USD 650,000 — 6 rooms
3. Guido 1800, Recoleta — 400m away — 170 m2 — USD 578,000 — 5 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            180,
            [
              { area: 165, price: 560000 },
              { area: 195, price: 650000 },
              { area: 170, price: 578000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-03-belgrano-studio',
        category: 'apartment',
        input: `Subject property:
Address: Cabildo 2400, Belgrano, CABA
Type: Apartment (studio)
Area: 38 m2
Rooms: 1
Bedrooms: 0
Age: 8 years
Location: Belgrano, near Barrancas de Belgrano station

Comparable properties:
1. Juramento 2100, Belgrano — 300m away — 35 m2 — USD 62,000 — 1 room
2. Echeverria 2500, Belgrano — 500m away — 42 m2 — USD 78,000 — 1 room
3. Cabildo 2800, Belgrano — 400m away — 40 m2 — USD 72,000 — 1 room`,
        validate: (o) =>
          validateAppraisal(
            o,
            38,
            [
              { area: 35, price: 62000 },
              { area: 42, price: 78000 },
              { area: 40, price: 72000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-04-caballito-3bd-apt',
        category: 'apartment',
        input: `Subject property:
Address: Av. Rivadavia 5200, Caballito, CABA
Type: Apartment
Area: 95 m2
Rooms: 4
Bedrooms: 3
Age: 25 years
Location: Caballito, near Parque Rivadavia, on main avenue

Comparable properties:
1. Rojas 400, Caballito — 350m away — 88 m2 — USD 132,000 — 4 rooms
2. Av. Rivadavia 5600, Caballito — 300m away — 100 m2 — USD 155,000 — 4 rooms
3. Yerbal 600, Caballito — 600m away — 92 m2 — USD 140,000 — 4 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            95,
            [
              { area: 88, price: 132000 },
              { area: 100, price: 155000 },
              { area: 92, price: 140000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-05-nordelta-house',
        category: 'house',
        input: `Subject property:
Address: Barrio Los Castores, Nordelta, Tigre
Type: House
Area: 320 m2 (lot: 650 m2)
Rooms: 6
Bedrooms: 4
Age: 10 years
Location: Nordelta gated community, lake view, pool

Comparable properties:
1. Barrio La Isla, Nordelta — 1.2km away — 290 m2 — USD 480,000 — 5 rooms
2. Barrio Los Sauces, Nordelta — 800m away — 340 m2 — USD 550,000 — 6 rooms
3. Barrio Yachting, Nordelta — 1.5km away — 310 m2 — USD 520,000 — 6 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            320,
            [
              { area: 290, price: 480000 },
              { area: 340, price: 550000 },
              { area: 310, price: 520000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-06-san-isidro-house',
        category: 'house',
        input: `Subject property:
Address: Diego Palma 1200, San Isidro
Type: House
Area: 210 m2 (lot: 400 m2)
Rooms: 5
Bedrooms: 3
Age: 35 years
Location: San Isidro, residential area near the cathedral

Comparable properties:
1. Belgrano 800, San Isidro — 600m away — 195 m2 — USD 340,000 — 4 rooms
2. 9 de Julio 500, San Isidro — 450m away — 230 m2 — USD 395,000 — 5 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            210,
            [
              { area: 195, price: 340000 },
              { area: 230, price: 395000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-07-puerto-madero-apt',
        category: 'apartment',
        input: `Subject property:
Address: Juana Manso 1600, Puerto Madero, CABA
Type: Apartment
Area: 130 m2
Rooms: 4
Bedrooms: 2
Age: 12 years
Location: Puerto Madero, high-rise tower, river view, gym, pool, 24h security

Comparable properties:
1. Olga Cossettini 1200, Puerto Madero — 500m away — 120 m2 — USD 390,000 — 3 rooms
2. Azucena Villaflor 500, Puerto Madero — 700m away — 140 m2 — USD 462,000 — 4 rooms
3. Pierina Dealessi 1800, Puerto Madero — 400m away — 125 m2 — USD 410,000 — 4 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            130,
            [
              { area: 120, price: 390000 },
              { area: 140, price: 462000 },
              { area: 125, price: 410000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-08-microcentro-commercial',
        category: 'commercial',
        input: `Subject property:
Address: Av. Corrientes 1300, Microcentro, CABA
Type: Commercial office
Area: 150 m2
Rooms: 4 (open plan + 3 offices)
Bedrooms: 0
Age: 50 years (recently renovated)
Location: Microcentro, 8th floor with city views, close to Obelisco

Comparable properties:
1. Av. Corrientes 900, Microcentro — 400m away — 130 m2 — USD 195,000 — office
2. Suipacha 600, Microcentro — 350m away — 160 m2 — USD 240,000 — office
3. Maipú 400, Microcentro — 500m away — 145 m2 — USD 210,000 — office`,
        validate: (o) =>
          validateAppraisal(
            o,
            150,
            [
              { area: 130, price: 195000 },
              { area: 160, price: 240000 },
              { area: 145, price: 210000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-09-san-telmo-commercial',
        category: 'commercial',
        input: `Subject property:
Address: Defensa 800, San Telmo, CABA
Type: Commercial local (street-level retail)
Area: 85 m2
Rooms: 2
Bedrooms: 0
Age: 80 years (heritage building)
Location: San Telmo, tourist area near Plaza Dorrego, high foot traffic

Comparable properties:
1. Bolívar 700, San Telmo — 300m away — 75 m2 — USD 150,000 — retail
2. Defensa 1100, San Telmo — 350m away — 90 m2 — USD 185,000 — retail`,
        validate: (o) =>
          validateAppraisal(
            o,
            85,
            [
              { area: 75, price: 150000 },
              { area: 90, price: 185000 },
            ],
            'USD',
          ),
      },
      {
        id: 'aa-10-villa-urquiza-house',
        category: 'house',
        input: `Subject property:
Address: Bauness 2300, Villa Urquiza, CABA
Type: PH (horizontal property house)
Area: 140 m2
Rooms: 4
Bedrooms: 3
Age: 45 years (recycled)
Location: Villa Urquiza, quiet residential block, private terrace, no common expenses

Comparable properties:
1. Bucarelli 2100, Villa Urquiza — 300m away — 130 m2 — USD 195,000 — 4 rooms
2. Triunvirato 5400, Villa Urquiza — 500m away — 150 m2 — USD 225,000 — 4 rooms
3. Mendoza 4800, Villa Urquiza — 400m away — 135 m2 — USD 202,000 — 3 rooms`,
        validate: (o) =>
          validateAppraisal(
            o,
            140,
            [
              { area: 130, price: 195000 },
              { area: 150, price: 225000 },
              { area: 135, price: 202000 },
            ],
            'USD',
          ),
      },
    ],
  };
}
