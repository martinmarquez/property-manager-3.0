import Anthropic from '@anthropic-ai/sdk';
import type { IntentType } from './classifier.js';
import type { RetrievalResult } from './types.js';

export interface TurnMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  tenantId: string;
  userId: string;
  intent: IntentType;
  message: string;
  history: TurnMessage[];
  retrievedChunks: RetrievalResult[];
  locale?: string;
}

export interface StreamEvent {
  type: 'text_delta' | 'citations' | 'action_suggestion' | 'done' | 'error';
  data: string;
}

export interface GenerateResult {
  content: string;
  citations: Citation[];
  actionSuggestion: ActionSuggestion | null;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface Citation {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
}

export interface ActionSuggestion {
  type: 'send_message' | 'create_task';
  summary: string;
  detail: string;
  payload: Record<string, unknown>;
}

const SLIDING_WINDOW = 20;

function selectModel(intent: IntentType): string {
  if (intent === 'document_qa' || intent === 'market_analysis') {
    return 'claude-sonnet-4-6';
  }
  return 'claude-haiku-4-5-20251001';
}

function buildSystemPrompt(
  chunks: RetrievalResult[],
  locale: string,
): string {
  const chunkContext = chunks.length > 0
    ? `\n\nRetrieved context (cite ONLY from these):\n${chunks
        .map((c, i) => `[${i + 1}] (${c.entityType}/${c.entityId}) ${c.content}`)
        .join('\n')}`
    : '';

  return `You are Copilot, an AI assistant for Corredor — a real-estate CRM used by Argentine brokers.

Rules:
- Respond in ${locale === 'en' ? 'English' : 'Spanish (Argentine)'}.
- Be concise and professional. Use markdown for formatting.
- Only cite entities from the retrieved context below. Never fabricate property codes or contact names.
- When you reference an entity, include its type and ID so the frontend can render a citation pill.
- If the user asks to perform an action (send message, create task, schedule call), propose it as an action suggestion — do NOT execute it directly. Wait for user confirmation.
- Format action suggestions as: [ACTION:type|summary|detail|payload_json]${chunkContext}`;
}

function buildMessages(
  history: TurnMessage[],
  currentMessage: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const windowedHistory = history.slice(-SLIDING_WINDOW);
  return [
    ...windowedHistory.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: currentMessage },
  ];
}

function extractCitations(
  text: string,
  chunks: RetrievalResult[],
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const key = `${chunk.entityType}:${chunk.entityId}`;
    if (seen.has(key)) continue;
    if (text.includes(chunk.entityId) || text.includes(chunk.content.slice(0, 40))) {
      seen.add(key);
      citations.push({
        entityType: chunk.entityType,
        entityId: chunk.entityId,
        content: chunk.content.slice(0, 120),
        score: chunk.score,
      });
    }
  }
  return citations;
}

function extractActionSuggestion(text: string): {
  cleaned: string;
  action: ActionSuggestion | null;
} {
  const actionPattern = /\[ACTION:([^|]+)\|([^|]+)\|([^|]+)\|([^\]]+)\]/;
  const match = text.match(actionPattern);
  if (!match) return { cleaned: text, action: null };

  const [fullMatch, type, summary, detail, payloadStr] = match;
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(payloadStr!);
  } catch {
    // payload parse failed, keep empty
  }

  return {
    cleaned: text.replace(fullMatch!, '').trim(),
    action: {
      type: (type === 'send_message' || type === 'create_task') ? type : 'create_task',
      summary: summary!,
      detail: detail!,
      payload,
    },
  };
}

export async function generateResponse(
  client: Anthropic,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const model = selectModel(opts.intent);
  const locale = opts.locale ?? 'es-AR';
  const system = buildSystemPrompt(opts.retrievedChunks, locale);
  const messages = buildMessages(opts.history, opts.message);

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages,
  });

  const rawContent = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const { cleaned, action } = extractActionSuggestion(rawContent);
  const citations = extractCitations(cleaned, opts.retrievedChunks);

  return {
    content: cleaned,
    citations,
    actionSuggestion: action,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

export async function* generateResponseStream(
  client: Anthropic,
  opts: GenerateOptions,
): AsyncGenerator<StreamEvent> {
  const model = selectModel(opts.intent);
  const locale = opts.locale ?? 'es-AR';
  const system = buildSystemPrompt(opts.retrievedChunks, locale);
  const messages = buildMessages(opts.history, opts.message);

  const stream = client.messages.stream({
    model,
    max_tokens: 2048,
    system,
    messages,
  });

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
      yield { type: 'text_delta', data: event.delta.text };
    }
    if (event.type === 'message_delta' && event.usage) {
      outputTokens = event.usage.output_tokens;
    }
  }

  const finalMessage = await stream.finalMessage();
  inputTokens = finalMessage.usage.input_tokens;
  outputTokens = finalMessage.usage.output_tokens;

  const citations = extractCitations(fullText, opts.retrievedChunks);
  if (citations.length > 0) {
    yield { type: 'citations', data: JSON.stringify(citations) };
  }

  const { action } = extractActionSuggestion(fullText);
  if (action) {
    yield { type: 'action_suggestion', data: JSON.stringify(action) };
  }

  yield {
    type: 'done',
    data: JSON.stringify({ inputTokens, outputTokens, model }),
  };
}
