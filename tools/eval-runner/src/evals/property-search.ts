import type { EvalCase, FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `You are a search filter extraction engine for an Argentine real estate CRM.
Given a natural language property search query (typically in Argentine Spanish), extract structured filters and return ONLY valid JSON with no additional text.

Output schema:
{
  "propertyType": string | null,       // e.g. "departamento", "casa", "PH", "local", "oficina", "terreno"
  "location": string | null,           // neighborhood, city, or zone
  "minBedrooms": number | null,        // minimum number of bedrooms (ambientes - 1, or as stated)
  "maxBedrooms": number | null,        // maximum number of bedrooms
  "minPrice": number | null,           // minimum price
  "maxPrice": number | null,           // maximum price
  "currency": "USD" | "ARS" | null,    // currency for the price filter
  "features": string[],                // e.g. ["balcon", "cochera", "pileta", "luminoso", "apto profesional"]
  "operationType": "venta" | "alquiler" | "alquiler_temporal" | null
}

Rules:
- "ambientes" in Argentine real estate refers to total rooms (living + bedrooms). Map to bedrooms: bedrooms = ambientes - 1. Example: "3 ambientes" → minBedrooms: 2, maxBedrooms: 2. "2 ambientes" → minBedrooms: 1, maxBedrooms: 1.
- "monoambiente" = 1 ambiente = 0 bedrooms. Set propertyType to "departamento", minBedrooms: 0, maxBedrooms: 0.
- If the query says "2 dormitorios" or "2 habitaciones", use that directly as bedrooms count (no subtraction).
- "alquiler temporal" or "alquiler temporario" or "temporada" → operationType: "alquiler_temporal".
- Prices in USD are typical for sales; ARS for rentals. Infer currency from context if not explicit.
- Return null for any field that cannot be determined from the query.
- Always return valid JSON, nothing else.`;

function validateSearch(
  output: string,
  expected: {
    propertyType?: string;
    location?: string;
    minBedrooms?: number;
    maxBedrooms?: number;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    features?: string[];
    operationType?: string;
  },
): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (
    !hasFields(parsed, [
      'propertyType',
      'location',
      'minBedrooms',
      'maxBedrooms',
      'minPrice',
      'maxPrice',
      'currency',
      'features',
      'operationType',
    ])
  )
    return false;

  const obj = parsed as Record<string, unknown>;

  if (expected.propertyType) {
    const pt = String(obj['propertyType'] ?? '').toLowerCase();
    if (!pt.includes(expected.propertyType.toLowerCase())) return false;
  }

  if (expected.location) {
    const loc = String(obj['location'] ?? '').toLowerCase();
    if (!loc.includes(expected.location.toLowerCase())) return false;
  }

  if (expected.minBedrooms !== undefined && obj['minBedrooms'] !== expected.minBedrooms)
    return false;
  if (expected.maxBedrooms !== undefined && obj['maxBedrooms'] !== expected.maxBedrooms)
    return false;
  if (expected.minPrice !== undefined && obj['minPrice'] !== expected.minPrice) return false;
  if (expected.maxPrice !== undefined && obj['maxPrice'] !== expected.maxPrice) return false;

  if (expected.currency) {
    if (String(obj['currency']).toUpperCase() !== expected.currency.toUpperCase()) return false;
  }

  if (expected.operationType) {
    const op = String(obj['operationType'] ?? '').toLowerCase();
    if (!op.includes(expected.operationType.toLowerCase())) return false;
  }

  if (expected.features && expected.features.length > 0) {
    const outputFeatures = (obj['features'] as string[]) ?? [];
    const outputLower = outputFeatures.map((f) => f.toLowerCase());
    for (const f of expected.features) {
      if (!outputLower.some((of) => of.includes(f.toLowerCase()))) return false;
    }
  }

  return true;
}

const cases: EvalCase[] = [
  {
    id: 'ps-01-basic-palermo',
    category: 'basic_search',
    input: 'Busco un departamento de 3 ambientes en Palermo',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        location: 'palermo',
        minBedrooms: 2,
        maxBedrooms: 2,
      }),
  },
  {
    id: 'ps-02-basic-belgrano-casa',
    category: 'basic_search',
    input: 'Quiero ver casas en Belgrano para comprar',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'casa',
        location: 'belgrano',
        operationType: 'venta',
      }),
  },
  {
    id: 'ps-03-basic-recoleta-alquiler',
    category: 'basic_search',
    input: 'Necesito alquilar un monoambiente en Recoleta',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        location: 'recoleta',
        operationType: 'alquiler',
        maxBedrooms: 0,
      }),
  },
  {
    id: 'ps-04-price-usd-sale',
    category: 'price_filter',
    input: 'Departamentos en venta en Caballito hasta 120.000 dólares',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        location: 'caballito',
        operationType: 'venta',
        maxPrice: 120000,
        currency: 'USD',
      }),
  },
  {
    id: 'ps-05-price-ars-rental',
    category: 'price_filter',
    input: 'Alquiler de 2 ambientes en Villa Crespo, hasta $500.000 por mes',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        location: 'villa crespo',
        operationType: 'alquiler',
        maxPrice: 500000,
        currency: 'ARS',
        minBedrooms: 1,
        maxBedrooms: 1,
      }),
  },
  {
    id: 'ps-06-price-range-usd',
    category: 'price_filter',
    input: 'Busco depto en Núñez entre 80.000 y 150.000 dólares',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        location: 'núñez',
        minPrice: 80000,
        maxPrice: 150000,
        currency: 'USD',
      }),
  },
  {
    id: 'ps-07-feature-balcon-cochera',
    category: 'feature_filter',
    input: 'Quiero un 3 ambientes en Palermo con balcón y cochera',
    validate: (output) =>
      validateSearch(output, {
        location: 'palermo',
        minBedrooms: 2,
        maxBedrooms: 2,
        features: ['balcon', 'cochera'],
      }),
  },
  {
    id: 'ps-08-feature-pileta-parrilla',
    category: 'feature_filter',
    input: 'Casa con pileta y parrilla en Nordelta para comprar',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'casa',
        location: 'nordelta',
        operationType: 'venta',
        features: ['pileta', 'parrilla'],
      }),
  },
  {
    id: 'ps-09-feature-luminoso-apto-prof',
    category: 'feature_filter',
    input: 'Oficina o departamento apto profesional luminoso en Microcentro',
    validate: (output) =>
      validateSearch(output, {
        location: 'microcentro',
        features: ['luminoso', 'apto profesional'],
      }),
  },
  {
    id: 'ps-10-complex-full',
    category: 'complex',
    input:
      'Estoy buscando un departamento de 4 ambientes o más en Recoleta o Barrio Norte, con cochera y baulera, entre 200.000 y 350.000 dólares para comprar',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'departamento',
        minBedrooms: 3,
        operationType: 'venta',
        minPrice: 200000,
        maxPrice: 350000,
        currency: 'USD',
        features: ['cochera', 'baulera'],
      }),
  },
  {
    id: 'ps-11-complex-temporal',
    category: 'complex',
    input:
      'Alquiler temporal de un 2 ambientes amueblado en Palermo Soho, hasta 1200 dólares por mes',
    validate: (output) =>
      validateSearch(output, {
        operationType: 'alquiler_temporal',
        location: 'palermo',
        minBedrooms: 1,
        maxBedrooms: 1,
        maxPrice: 1200,
        currency: 'USD',
      }),
  },
  {
    id: 'ps-12-complex-ph',
    category: 'complex',
    input:
      'PH reciclado de 3 dormitorios en Villa Urquiza con terraza propia, hasta 180.000 USD',
    validate: (output) =>
      validateSearch(output, {
        propertyType: 'ph',
        location: 'villa urquiza',
        minBedrooms: 3,
        maxBedrooms: 3,
        maxPrice: 180000,
        currency: 'USD',
        features: ['terraza'],
      }),
  },
];

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'property.search',
    systemPrompt: SYSTEM_PROMPT,
    cases,
    threshold: 0.8,
    maxTokens: 512,
  };
}
