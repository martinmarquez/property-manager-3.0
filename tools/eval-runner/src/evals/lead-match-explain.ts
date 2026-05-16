import type { EvalCase, FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `You are a lead-property matching engine for an Argentine real estate CRM.
Given a lead's requirements and a property's attributes, evaluate the match quality and return ONLY valid JSON with no additional text.

Output schema:
{
  "matchScore": number,          // 0-100, where 100 is a perfect match
  "strengths": string[],         // reasons this property is a good fit for the lead
  "weaknesses": string[],        // reasons this property is NOT a good fit
  "recommendation": "show" | "skip" | "maybe"
}

Rules:
- "show": matchScore >= 70 and no critical mismatches (e.g. budget, location, property type)
- "skip": matchScore < 40 or critical mismatch on a must-have requirement
- "maybe": everything in between, or when there are trade-offs worth discussing
- strengths and weaknesses must each contain at least one item
- Be specific: reference actual values from the lead and property data
- Prices in Argentine real estate: sales are typically in USD, rentals in ARS
- "ambientes" = total rooms (living + bedrooms); bedrooms = ambientes - 1
- Always return valid JSON, nothing else.`;

function validateMatch(
  output: string,
  expected: {
    recommendation: 'show' | 'skip' | 'maybe';
    minScore?: number;
    maxScore?: number;
  },
): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['matchScore', 'strengths', 'weaknesses', 'recommendation'])) return false;

  const obj = parsed as Record<string, unknown>;

  const score = Number(obj['matchScore']);
  if (isNaN(score) || score < 0 || score > 100) return false;

  if (!Array.isArray(obj['strengths']) || obj['strengths'].length === 0) return false;
  if (!Array.isArray(obj['weaknesses']) || obj['weaknesses'].length === 0) return false;

  const rec = String(obj['recommendation']).toLowerCase();
  if (rec !== expected.recommendation) return false;

  if (expected.minScore !== undefined && score < expected.minScore) return false;
  if (expected.maxScore !== undefined && score > expected.maxScore) return false;

  return true;
}

const cases: EvalCase[] = [
  {
    id: 'lm-01-strong-exact',
    category: 'strong_match',
    input: `Lead: Busca departamento de 3 ambientes en Palermo, presupuesto USD 150.000, necesita cochera.
Property: Departamento 3 ambientes en Palermo Chico, 75 m², 2 dormitorios, cochera incluida, USD 145.000, 5to piso con balcón, edificio con seguridad 24hs.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'show', minScore: 70 }),
  },
  {
    id: 'lm-02-strong-upgrade',
    category: 'strong_match',
    input: `Lead: Familia con 2 hijos, busca casa en Nordelta, presupuesto USD 300.000, necesita pileta y jardín.
Property: Casa 5 ambientes en Nordelta - Lago Escondido, 220 m² cubiertos, 380 m² terreno, 4 dormitorios, pileta, parrilla, jardín amplio, USD 285.000.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'show', minScore: 75 }),
  },
  {
    id: 'lm-03-strong-rental',
    category: 'strong_match',
    input: `Lead: Profesional joven, busca alquiler de 2 ambientes en Villa Crespo o Palermo, presupuesto ARS 450.000/mes, necesita luminoso y cerca de subte.
Property: Departamento 2 ambientes en Villa Crespo, 42 m², 1 dormitorio, muy luminoso, a 2 cuadras de subte B (Malabia), ARS 420.000/mes, cocina integrada.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'show', minScore: 70 }),
  },
  {
    id: 'lm-04-weak-wrong-zone',
    category: 'weak_match',
    input: `Lead: Busca departamento en Recoleta, presupuesto USD 200.000, quiere zona residencial tranquila.
Property: Departamento 3 ambientes en Constitución, 68 m², USD 85.000, planta baja, sin balcón, sobre avenida ruidosa.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'skip', maxScore: 40 }),
  },
  {
    id: 'lm-05-weak-over-budget',
    category: 'weak_match',
    input: `Lead: Busca 2 ambientes para inversión en Belgrano, presupuesto máximo USD 90.000.
Property: Departamento 2 ambientes en Belgrano R, 55 m², USD 165.000, a estrenar, amenities completos, cochera.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'skip', maxScore: 40 }),
  },
  {
    id: 'lm-06-weak-wrong-type',
    category: 'weak_match',
    input: `Lead: Busca casa con jardín en zona norte para familia, presupuesto USD 250.000.
Property: Monoambiente 28 m² en Microcentro, piso 12, USD 62.000, ideal inversión, alquiler temporal.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'skip', maxScore: 25 }),
  },
  {
    id: 'lm-07-partial-size-tradeoff',
    category: 'partial_match',
    input: `Lead: Busca 3 ambientes en Caballito, presupuesto USD 130.000, necesita balcón.
Property: Departamento 2 ambientes en Caballito, 48 m², 1 dormitorio, balcón aterrazado, USD 105.000, muy buen estado, cerca parque Rivadavia.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'maybe', minScore: 35, maxScore: 70 }),
  },
  {
    id: 'lm-08-partial-location-close',
    category: 'partial_match',
    input: `Lead: Busca departamento 4 ambientes en Palermo, presupuesto USD 250.000, necesita cochera y baulera.
Property: Departamento 4 ambientes en Villa Crespo (límite con Palermo), 95 m², 3 dormitorios, cochera, sin baulera, USD 230.000, reciclado a nuevo.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'maybe', minScore: 40, maxScore: 75 }),
  },
  {
    id: 'lm-09-partial-budget-stretch',
    category: 'partial_match',
    input: `Lead: Busca PH en Villa Urquiza, presupuesto USD 150.000, quiere terraza y parrilla propias.
Property: PH 3 ambientes en Villa Urquiza, 85 m², terraza propia con parrilla, USD 178.000, 2 dormitorios, reciclado, sin expensas.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'maybe', minScore: 40, maxScore: 75 }),
  },
  {
    id: 'lm-10-partial-features-mixed',
    category: 'partial_match',
    input: `Lead: Busca departamento 3 ambientes en Belgrano con pileta y gimnasio en el edificio, presupuesto USD 180.000.
Property: Departamento 3 ambientes en Belgrano C, 72 m², 2 dormitorios, edificio con pileta y SUM pero sin gimnasio, USD 172.000, muy buena vista, 8vo piso.`,
    validate: (output) =>
      validateMatch(output, { recommendation: 'maybe', minScore: 45, maxScore: 80 }),
  },
];

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'lead.match_explain',
    systemPrompt: SYSTEM_PROMPT,
    cases,
    threshold: 0.8,
    maxTokens: 1024,
  };
}
