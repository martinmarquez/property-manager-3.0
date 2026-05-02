import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const toneSchema = z.enum(['formal', 'casual', 'lujo']);
export type Tone = z.infer<typeof toneSchema>;

export const portalSchema = z.enum(['zonaprop', 'mercadolibre', 'argenprop', 'general']);
export type Portal = z.infer<typeof portalSchema>;

export const generateInputSchema = z.object({
  propertyId: z.string().uuid(),
  tone: toneSchema.default('formal'),
  portal: portalSchema.default('general'),
  extraInstructions: z.string().max(500).optional(),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

// ---------------------------------------------------------------------------
// Portal length constraints (character count)
// ---------------------------------------------------------------------------

export const PORTAL_LENGTH: Record<Portal, { min: number; max: number } | null> = {
  zonaprop:     { min: 1500, max: 2000 },
  mercadolibre: { min: 800,  max: 1200 },
  argenprop:    { min: 1000, max: 1500 },
  general:      null,
};

const TOLERANCE = 0.10;

export function isWithinPortalLength(text: string, portal: Portal): boolean {
  const constraint = PORTAL_LENGTH[portal];
  if (!constraint) return true;
  const len = text.length;
  return len >= constraint.min * (1 - TOLERANCE) && len <= constraint.max * (1 + TOLERANCE);
}

// ---------------------------------------------------------------------------
// Property attributes for prompt assembly
// ---------------------------------------------------------------------------

export interface PropertyAttributes {
  referenceCode: string;
  title: string | null;
  propertyType: string;
  subtype: string | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  garages: number | null;
  ageYears: number | null;
  province: string | null;
  locality: string | null;
  neighborhood: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  status: string;
  featured: boolean;
  // From property_listing join
  operations: Array<{
    kind: string;
    priceAmount: string | null;
    priceCurrency: string;
  }>;
}

// ---------------------------------------------------------------------------
// Tone instructions (Argentine Spanish, vos form)
// ---------------------------------------------------------------------------

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  formal: `Escribí en un tono profesional y formal, usando "usted" de manera implícita.
Usá vocabulario inmobiliario preciso. Evitá coloquialismos.
Estructura: párrafo de apertura destacando lo mejor, detalles del inmueble, ubicación y cierre con llamado a acción.`,

  casual: `Escribí en un tono cercano y amigable, usando el voseo rioplatense ("vos", "podés", "disfrutá").
Hacé que el lector se imagine viviendo ahí. Usá frases cortas y directas.
Estructura: gancho inicial atractivo, recorrido por los espacios, barrio y entorno, cierre motivador.`,

  lujo: `Escribí en un tono de lujo y exclusividad, sofisticado pero no pretencioso.
Usá adjetivos que evoquen calidad superior: "exquisito", "excepcional", "privilegiado".
Mencioná acabados, materiales y detalles premium. Transmití un estilo de vida aspiracional.
Estructura: apertura que evoque exclusividad, tour por los espacios premium, ubicación de prestigio, cierre exclusivo.`,
};

// ---------------------------------------------------------------------------
// Property type labels (Spanish)
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  ph: 'PH',
  house: 'Casa',
  quinta: 'Quinta',
  land: 'Terreno',
  office: 'Oficina',
  commercial: 'Local comercial',
  garage: 'Cochera',
  warehouse: 'Depósito',
  farm: 'Campo',
  hotel: 'Hotel',
  building: 'Edificio',
  business_fund: 'Fondo de comercio',
  development: 'Emprendimiento',
};

const OPERATION_LABELS: Record<string, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  temp_rent: 'Alquiler temporario',
  commercial_rent: 'Alquiler comercial',
  commercial_sale: 'Venta comercial',
};

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function formatAttributes(attrs: PropertyAttributes): string {
  const lines: string[] = [];

  const typeLabel = PROPERTY_TYPE_LABELS[attrs.propertyType] ?? attrs.propertyType;
  lines.push(`Tipo: ${typeLabel}${attrs.subtype ? ` (${attrs.subtype})` : ''}`);

  const locationParts = [attrs.neighborhood, attrs.locality, attrs.province].filter(Boolean);
  if (locationParts.length > 0) {
    lines.push(`Ubicación: ${locationParts.join(', ')}`);
  }
  if (attrs.addressStreet) {
    const addr = attrs.addressNumber
      ? `${attrs.addressStreet} ${attrs.addressNumber}`
      : attrs.addressStreet;
    lines.push(`Dirección: ${addr}`);
  }

  if (attrs.coveredAreaM2) lines.push(`Superficie cubierta: ${attrs.coveredAreaM2} m²`);
  if (attrs.totalAreaM2) lines.push(`Superficie total: ${attrs.totalAreaM2} m²`);
  if (attrs.rooms) lines.push(`Ambientes: ${attrs.rooms}`);
  if (attrs.bedrooms) lines.push(`Dormitorios: ${attrs.bedrooms}`);
  if (attrs.bathrooms) lines.push(`Baños: ${attrs.bathrooms}`);
  if (attrs.toilets) lines.push(`Toilettes: ${attrs.toilets}`);
  if (attrs.garages) lines.push(`Cocheras: ${attrs.garages}`);
  if (attrs.ageYears !== null && attrs.ageYears !== undefined) {
    lines.push(attrs.ageYears === 0 ? 'Antigüedad: A estrenar' : `Antigüedad: ${attrs.ageYears} años`);
  }
  if (attrs.featured) lines.push('Propiedad destacada');

  if (attrs.operations.length > 0) {
    for (const op of attrs.operations) {
      const kindLabel = OPERATION_LABELS[op.kind] ?? op.kind;
      if (op.priceAmount) {
        lines.push(`Operación: ${kindLabel} — ${op.priceCurrency} ${op.priceAmount}`);
      } else {
        lines.push(`Operación: ${kindLabel} — Consultar precio`);
      }
    }
  }

  return lines.join('\n');
}

// Strip Markdown heading markers and known prompt-override patterns from user-supplied text
// before inserting into a system prompt. Defense against direct prompt injection via the
// Destacar extra-instructions field.
function sanitizeExtraInstructions(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\b(ignore|ignorá|forget|olvida|system\s*:|instrucciones del sistema)\b/gi, '')
    .trim()
    .slice(0, 500);
}

export interface PromptParts {
  system: string;
  user: string;
}

export function buildPrompt(
  attrs: PropertyAttributes,
  tone: Tone,
  portal: Portal,
  extraInstructions?: string,
): PromptParts {
  const constraint = PORTAL_LENGTH[portal];
  const lengthInstruction = constraint
    ? `La descripción debe tener entre ${constraint.min} y ${constraint.max} caracteres.`
    : 'No hay restricción de largo.';

  const portalLabel = portal === 'general' ? 'uso general' : portal;

  const system = [
    `Sos un redactor inmobiliario experto en el mercado argentino.`,
    `Generás descripciones de propiedades para publicar en portales inmobiliarios.`,
    '',
    `## Tono`,
    TONE_INSTRUCTIONS[tone],
    '',
    `## Largo`,
    lengthInstruction,
    '',
    `## Reglas`,
    `- Usá SOLO los datos proporcionados. No inventes información que no esté en los atributos.`,
    `- No menciones el código de referencia ni datos internos.`,
    `- Escribí en español rioplatense (argentino).`,
    `- No uses hashtags ni emojis.`,
    `- Devolvé SOLO el texto de la descripción, sin títulos ni encabezados.`,
  ].join('\n');

  const userParts = [
    `Generá una descripción de propiedad para publicar en ${portalLabel}.`,
    '',
    `## Datos de la propiedad`,
    formatAttributes(attrs),
  ];

  if (extraInstructions) {
    const safe = sanitizeExtraInstructions(extraInstructions);
    if (safe) {
      userParts.push('', `Instrucciones adicionales del agente (Destacar):`, safe);
    }
  }

  return { system, user: userParts.join('\n') };
}

export function buildRetryPrompt(
  originalUser: string,
  generatedText: string,
  portal: Portal,
): string {
  const constraint = PORTAL_LENGTH[portal]!;
  return [
    originalUser,
    '',
    `## Corrección de largo`,
    `La descripción anterior tenía ${generatedText.length} caracteres pero el rango permitido es ${constraint.min}–${constraint.max}.`,
    `Reescribí la descripción ajustando el largo al rango indicado. Mantené el mismo tono y contenido.`,
    '',
    `Descripción anterior:`,
    generatedText,
  ].join('\n');
}
