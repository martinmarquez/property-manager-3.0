import Anthropic from '@anthropic-ai/sdk';

export type IntentType =
  | 'property_search'
  | 'lead_info'
  | 'schedule'
  | 'document_qa'
  | 'market_analysis'
  | 'general'
  | 'action_confirm';

export interface ClassificationResult {
  type: IntentType;
  entitiesMentioned: string[];
  actionRequired: boolean;
  confidence: number;
}

const CLASSIFICATION_PROMPT = `You are an intent classifier for a real-estate CRM copilot used by Argentine real-estate brokers.

Classify the user message into exactly ONE of these intents:
- property_search: queries about properties (listings, availability, price, features, comparisons)
- lead_info: queries about contacts, leads, pipeline, deals, operations, follow-ups
- schedule: scheduling tasks, reminders, calls, meetings, calendar items
- document_qa: questions about uploaded documents, contracts, legal clauses
- market_analysis: market trends, price analysis, comparisons across zones
- general: chitchat, greetings, help requests, anything else
- action_confirm: user confirming or cancelling a previously proposed action

Also extract any entity references (property codes like BEL-00142, contact names, zone names).

Respond ONLY with valid JSON, no markdown:
{"type":"<intent>","entities_mentioned":["entity1"],"action_required":false,"confidence":0.95}

action_required is true only for schedule and action_confirm intents.`;

export async function classifyIntent(
  client: Anthropic,
  message: string,
  conversationContext?: string,
): Promise<ClassificationResult> {
  const userContent = conversationContext
    ? `Recent conversation context:\n${conversationContext}\n\nCurrent message: ${message}`
    : message;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: CLASSIFICATION_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';

  try {
    const parsed = JSON.parse(text) as {
      type?: string;
      entities_mentioned?: string[];
      action_required?: boolean;
      confidence?: number;
    };

    const validIntents: IntentType[] = [
      'property_search', 'lead_info', 'schedule', 'document_qa',
      'market_analysis', 'general', 'action_confirm',
    ];

    const type = validIntents.includes(parsed.type as IntentType)
      ? (parsed.type as IntentType)
      : 'general';

    return {
      type,
      entitiesMentioned: Array.isArray(parsed.entities_mentioned) ? parsed.entities_mentioned : [],
      actionRequired: parsed.action_required === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch {
    return {
      type: 'general',
      entitiesMentioned: [],
      actionRequired: false,
      confidence: 0.3,
    };
  }
}
