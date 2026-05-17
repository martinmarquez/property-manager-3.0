import type { EvalCase, FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `You are a portal listing optimization expert for Argentine real estate portals (ZonaProp, MercadoLibre, Argenprop). Given a property listing, suggest specific optimizations to improve visibility and engagement. Output JSON: { suggestions: { category: string, suggestion: string, impact: "high"|"medium"|"low", currentIssue: string }[], overallScore: number }

Rules:
- overallScore is 0-100 representing current listing quality.
- Suggestion categories must be one of: "title", "description", "photos", "pricing", "features", "keywords".
- Each suggestion must identify a specific issue and provide an actionable recommendation.
- Return ONLY valid JSON, nothing else.`;

function validateOptimization(output: string, opts: { minSuggestions?: number; scoreRange?: [number, number]; requiredCategories?: string[] }): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['suggestions', 'overallScore'])) return false;

  const obj = parsed as Record<string, unknown>;

  const suggestions = obj['suggestions'];
  if (!Array.isArray(suggestions)) return false;
  if (suggestions.length === 0) return false;
  if (opts.minSuggestions && suggestions.length < opts.minSuggestions) return false;

  const validCategories = ['title', 'description', 'photos', 'pricing', 'features', 'keywords'];
  const validImpacts = ['high', 'medium', 'low'];

  for (const s of suggestions) {
    if (!hasFields(s, ['category', 'suggestion', 'impact', 'currentIssue'])) return false;
    const sug = s as Record<string, unknown>;
    if (!validCategories.includes(String(sug['category']))) return false;
    if (!validImpacts.includes(String(sug['impact']))) return false;
    if (typeof sug['suggestion'] !== 'string' || sug['suggestion'] === '') return false;
    if (typeof sug['currentIssue'] !== 'string' || sug['currentIssue'] === '') return false;
  }

  const score = obj['overallScore'];
  if (typeof score !== 'number' || score < 0 || score > 100) return false;

  if (opts.scoreRange) {
    if (score < opts.scoreRange[0] || score > opts.scoreRange[1]) return false;
  }

  if (opts.requiredCategories) {
    const foundCategories = new Set(suggestions.map((s: Record<string, unknown>) => String(s['category'])));
    for (const cat of opts.requiredCategories) {
      if (!foundCategories.has(cat)) return false;
    }
  }

  return true;
}

const cases: EvalCase[] = [
  {
    id: 'po-01-generic-title-short-desc',
    category: 'residential',
    input: `Listing to optimize:
Title: "Departamento en venta"
Description: "Lindo depto en Palermo. 3 ambientes. Llamar."
Price: USD 195.000
Type: Departamento
Location: Palermo, CABA
Area: 78 m²
Rooms: 3 ambientes
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [0, 40], requiredCategories: ['title', 'description'] }),
  },
  {
    id: 'po-02-missing-features',
    category: 'residential',
    input: `Listing to optimize:
Title: "3 ambientes en Belgrano"
Description: "Departamento de 3 ambientes en Belgrano. Buena ubicación. Cerca de todo. Consulte."
Price: USD 160.000
Type: Departamento
Location: Belgrano, CABA
Area: 72 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Amenities: (not listed)
Portal: Argenprop`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [10, 50], requiredCategories: ['features'] }),
  },
  {
    id: 'po-03-pricing-strategy',
    category: 'residential',
    input: `Listing to optimize:
Title: "Venta depto Caballito 2 amb"
Description: "Departamento de 2 ambientes en Caballito, piso alto, luminoso, balcón corrido, lavadero independiente. Edificio con seguridad 24hs. Ideal inversión."
Price: USD 347.500
Type: Departamento
Location: Caballito, CABA
Area: 48 m²
Rooms: 2 ambientes
Bedrooms: 1
Bathrooms: 1
Amenities: Balcón, lavadero, seguridad 24hs
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { minSuggestions: 2, scoreRange: [30, 65], requiredCategories: ['pricing'] }),
  },
  {
    id: 'po-04-poor-keywords',
    category: 'residential',
    input: `Listing to optimize:
Title: "Propiedad disponible"
Description: "Se vende propiedad ubicada en zona residencial. Tiene habitaciones y baño. Cocina equipada. Buen estado general. Se escuchan ofertas."
Price: USD 210.000
Type: Casa
Location: Olivos, Vicente López
Area: 140 m²
Bedrooms: 3
Bathrooms: 2
Amenities: Garage, patio
Portal: MercadoLibre`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [0, 40], requiredCategories: ['keywords', 'title'] }),
  },
  {
    id: 'po-05-well-optimized',
    category: 'residential',
    input: `Listing to optimize:
Title: "Luminoso 3 ambientes con balcón terraza en Palermo Soho - 85m²"
Description: "Excelente departamento de 3 ambientes en el corazón de Palermo Soho, sobre calle arbolada. Living-comedor con salida a balcón terraza de 12m². Cocina integrada con mesada de granito. 2 dormitorios amplios, el principal con placard empotrado. Baño completo con bañera y vanitory. Lavadero independiente. Piso de porcelanato. Aire acondicionado frío/calor en todos los ambientes. Edificio de categoría con seguridad 24hs, SUM y parrilla en terraza. A 2 cuadras de Plaza Serrano. Ideal para vivir o renta temporal."
Price: USD 195.000
Type: Departamento
Location: Palermo Soho, CABA
Area: 85 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Amenities: Balcón terraza, lavadero, aire acondicionado, seguridad 24hs, SUM, parrilla
Photos: 25 professional photos including floor plan
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { scoreRange: [60, 100] }),
  },
  {
    id: 'po-06-info-overload',
    category: 'residential',
    input: `Listing to optimize:
Title: "OPORTUNIDAD ÚNICA!!! DEPARTAMENTO 4 AMB RECOLETA LUMINOSO IMPECABLE RECICLADO COCHERA BAULERA BALCÓN VISTA PANORÁMICA NO APTO CRÉDITO"
Description: "VENDO DEPARTAMENTO DE 4 AMBIENTES EN RECOLETA!!! MUY LUMINOSO!!! TOTALMENTE RECICLADO!!! TIENE 3 DORMITORIOS AMPLÍSIMOS CON PLACARDS GIGANTES DE MADERA DE CEDRO!!! LIVING COMEDOR DE 30 METROS!!! COCINA COMPLETAMENTE NUEVA CON ELECTRODOMÉSTICOS DE PRIMERA MARCA!!! 2 BAÑOS COMPLETOS CON GRIFERÍAS IMPORTADAS DE ITALIA!!! PISOS DE ROBLE FRANCÉS!!! CALEFACCIÓN CENTRAL!!! AIRE ACONDICIONADO EN TODOS LOS AMBIENTES!!! BALCÓN CON VISTA PANORÁMICA AL PARQUE!!! COCHERA FIJA CUBIERTA!!! BAULERA AMPLIA!!! EDIFICIO DE CATEGORÍA CON VIGILANCIA LAS 24 HORAS!!! PILETA CLIMATIZADA!!! GIMNASIO!!! SUM!!! LAVADERO!!! NO APTO CRÉDITO!!! ESCRITURA INMEDIATA!!! APTO PROFESIONAL!!! IDEAL FAMILIA GRANDE O CONSULTORIO!!! LLAME YA!!! NO SE LO PIERDA!!!"
Price: USD 520.000
Type: Departamento
Location: Recoleta, CABA
Area: 160 m²
Rooms: 4 ambientes
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [10, 65], requiredCategories: ['title', 'description'] }),
  },
  {
    id: 'po-07-missing-photos',
    category: 'residential',
    input: `Listing to optimize:
Title: "Departamento 2 ambientes Villa Urquiza"
Description: "Departamento de 2 ambientes en Villa Urquiza, a 3 cuadras del subte B. Piso alto con buena vista. Cocina separada. Baño completo. Expensas bajas."
Price: USD 105.000
Type: Departamento
Location: Villa Urquiza, CABA
Area: 42 m²
Rooms: 2 ambientes
Bedrooms: 1
Bathrooms: 1
Amenities: Vista, subte cercano
Photos: 2 photos (living room and bathroom, taken with phone, poor lighting)
Portal: Argenprop`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [15, 50], requiredCategories: ['photos'] }),
  },
  {
    id: 'po-08-outdated-content',
    category: 'residential',
    input: `Listing to optimize:
Title: "Depto 3 amb Nuñez - Oportunidad"
Description: "Departamento de 3 ambientes en Nuñez. Recientemente refaccionado en 2019. A estrenar cocina nueva. Expensas de $15.000 mensuales. Muy buena conectividad con colectivos. Barrio en crecimiento, ideal inversión. Precio reducido por esta semana solamente."
Price: USD 175.000
Type: Departamento
Location: Nuñez, CABA
Area: 68 m²
Rooms: 3 ambientes
Bedrooms: 2
Bathrooms: 1
Portal: ZonaProp
Listed: March 2024`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [15, 70], requiredCategories: ['description'] }),
  },
  {
    id: 'po-09-luxury-positioning',
    category: 'luxury',
    input: `Listing to optimize:
Title: "Casa grande en Nordelta"
Description: "Casa en Nordelta, barrio Los Castores. 5 dormitorios. Pileta. Jardín. Cochera para 3 autos. Linda casa."
Price: USD 850.000
Type: Casa
Location: Nordelta, Tigre
Area: 420 m²
Lot: 900 m²
Bedrooms: 5
Bathrooms: 4
Amenities: Pileta, jardín, cochera triple, quincho, home cinema, bodega
Photos: 8 photos
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [15, 65], requiredCategories: ['description', 'title'] }),
  },
  {
    id: 'po-10-commercial',
    category: 'commercial',
    input: `Listing to optimize:
Title: "Oficina en alquiler"
Description: "Oficina en microcentro. Bien ubicada. Lista para usar."
Price: USD 3.200/mes
Type: Oficina
Location: Microcentro, CABA
Area: 95 m²
Bathrooms: 2
Amenities: Aire acondicionado, recepción compartida
Portal: Argenprop`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [0, 40], requiredCategories: ['title', 'description', 'features'] }),
  },
  {
    id: 'po-11-temporal-rental',
    category: 'rental',
    input: `Listing to optimize:
Title: "Alquiler temporario Palermo"
Description: "Departamento amueblado para alquiler temporario en Palermo Hollywood. 1 dormitorio. WiFi. Disponible."
Price: USD 800/mes
Type: Departamento
Location: Palermo Hollywood, CABA
Area: 40 m²
Rooms: 2 ambientes
Bedrooms: 1
Bathrooms: 1
Amenities: Amueblado, WiFi
Photos: 5 photos
Portal: MercadoLibre`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [20, 55], requiredCategories: ['description', 'keywords'] }),
  },
  {
    id: 'po-12-development-presale',
    category: 'residential',
    input: `Listing to optimize:
Title: "Emprendimiento Villa Devoto"
Description: "Unidades en pozo en Villa Devoto. Entrega 2027. 1, 2 y 3 ambientes disponibles. Consultar financiación."
Price: From USD 75.000
Type: Departamento (pre-venta)
Location: Villa Devoto, CABA
Developer: Constructora del Oeste S.A.
Project: "Devoto Park Residences"
Units available: 1 amb (35m²), 2 amb (50m²), 3 amb (72m²)
Amenities: SUM, pileta, solarium, coworking, bicicletero
Delivery: Q2 2027
Portal: ZonaProp`,
    validate: (o) => validateOptimization(o, { minSuggestions: 3, scoreRange: [15, 50], requiredCategories: ['description'] }),
  },
];

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'portal.optimizer',
    systemPrompt: SYSTEM_PROMPT,
    cases,
    threshold: 0.8,
    maxTokens: 1024,
  };
}
