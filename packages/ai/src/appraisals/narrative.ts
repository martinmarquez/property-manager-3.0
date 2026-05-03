import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6-20250514';
const MAX_TOKENS = 4096;

export interface CompInput {
  address: string;
  distanceM: number | null;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  priceAmount: string | null;
  priceCurrency: string;
  pricePerM2: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  listingStatus: string | null;
}

export interface NarrativeInput {
  subject: {
    address: string;
    propertyType: string;
    operationKind: string;
    coveredAreaM2: number | null;
    totalAreaM2: number | null;
    rooms: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    garages: number | null;
    ageYears: number | null;
    locality: string | null;
    province: string | null;
  };
  comps: CompInput[];
  purpose: string;
  currency: string;
  locale?: string;
}

export interface NarrativeResult {
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  narrativeMd: string;
  compsSummary: string;
  methodologyNote: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  rawOutput: unknown;
}

function buildSystemPrompt(locale: string): string {
  const lang = locale.startsWith('es') ? 'español' : 'English';
  return `You are an expert real estate appraiser in Latin America. You produce professional appraisal narratives.

Output ONLY valid JSON matching this exact schema — no markdown fences, no extra text:
{
  "estimated_value_min": <number>,
  "estimated_value_max": <number>,
  "currency": "<ISO 4217 code>",
  "narrative_md": "<markdown narrative>",
  "comps_summary": "<markdown summary of comparables analysis>",
  "methodology_note": "<brief methodology explanation>"
}

Rules:
- Write the narrative_md, comps_summary, and methodology_note in ${lang}.
- The value range should reflect market conditions based on the comparable analysis.
- Keep estimated_value_min and estimated_value_max as numbers (no currency symbols).
- Use the comparable properties to justify the valuation range.
- Be professional, concise, and data-driven.`;
}

function buildUserPrompt(input: NarrativeInput): string {
  const s = input.subject;
  const lines = [
    `## Subject Property`,
    `- Address: ${s.address}`,
    `- Type: ${s.propertyType}, Operation: ${s.operationKind}`,
    `- Covered area: ${s.coveredAreaM2 ?? 'N/A'} m², Total area: ${s.totalAreaM2 ?? 'N/A'} m²`,
    `- Rooms: ${s.rooms ?? 'N/A'}, Bedrooms: ${s.bedrooms ?? 'N/A'}, Bathrooms: ${s.bathrooms ?? 'N/A'}`,
    `- Garages: ${s.garages ?? 'N/A'}, Age: ${s.ageYears ?? 'N/A'} years`,
    `- Location: ${s.locality ?? ''}, ${s.province ?? ''}`,
    `- Purpose: ${input.purpose}`,
    `- Currency: ${input.currency}`,
    ``,
    `## Comparable Properties (${input.comps.length} total)`,
  ];

  for (const [i, c] of input.comps.entries()) {
    lines.push(`### Comp ${i + 1}`);
    lines.push(`- Address: ${c.address}`);
    lines.push(`- Distance: ${c.distanceM != null ? `${Math.round(c.distanceM)}m` : 'N/A'}`);
    lines.push(`- Area: ${c.coveredAreaM2 ?? 'N/A'} m² covered, ${c.totalAreaM2 ?? 'N/A'} m² total`);
    lines.push(`- Price: ${c.priceCurrency} ${c.priceAmount ?? 'N/A'} (${c.pricePerM2 ?? 'N/A'}/m²)`);
    lines.push(`- Rooms: ${c.rooms ?? 'N/A'}, Beds: ${c.bedrooms ?? 'N/A'}, Baths: ${c.bathrooms ?? 'N/A'}`);
    lines.push(`- Status: ${c.listingStatus ?? 'N/A'}`);
  }

  lines.push('');
  lines.push('Generate the appraisal narrative with value estimation based on the comparable properties above.');

  return lines.join('\n');
}

export async function generateNarrative(
  input: NarrativeInput,
  anthropicApiKey: string,
): Promise<NarrativeResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });
  const locale = input.locale ?? 'es-AR';

  const startMs = Date.now();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(locale),
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  });

  const latencyMs = Date.now() - startMs;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  const parsed = JSON.parse(text.trim()) as {
    estimated_value_min: number;
    estimated_value_max: number;
    currency: string;
    narrative_md: string;
    comps_summary: string;
    methodology_note: string;
  };

  return {
    estimatedValueMin: parsed.estimated_value_min,
    estimatedValueMax: parsed.estimated_value_max,
    currency: parsed.currency,
    narrativeMd: parsed.narrative_md,
    compsSummary: parsed.comps_summary,
    methodologyNote: parsed.methodology_note,
    model: response.model,
    latencyMs,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    rawOutput: parsed,
  };
}
