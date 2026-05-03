import type { IntentType } from './copilot/classifier.js';

export type Provider = 'anthropic' | 'openai' | 'gemini';
export type Capability = 'chat' | 'embed' | 'transcribe' | 'rerank';

export interface ModelChoice {
  provider: Provider;
  model: string;
  fallback?: ModelChoice;
}

export type FeatureId =
  | 'property.search'
  | 'lead.match_explain'
  | 'property.description'
  | 'inbox.draft'
  | 'meeting.summarize'
  | 'document.qa'
  | 'appraisal.assist'
  | 'pipeline.insights'
  | 'portal.optimizer'
  | 'duplicate.detect'
  | 'appraisal.narrative'
  | 'copilot'
  | 'copilot.classify';

export const ROUTES: Partial<Record<FeatureId, Partial<Record<Capability, ModelChoice>>>> = {
  'appraisal.narrative': {
    chat: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6-20250514',
      fallback: { provider: 'openai', model: 'gpt-4.1' },
    },
  },
  'property.description': {
    chat: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6-20250514',
      fallback: { provider: 'openai', model: 'gpt-4.1-mini' },
    },
  },
  'copilot': {
    chat: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      fallback: { provider: 'openai', model: 'gpt-4.1-mini' },
    },
  },
  'copilot.classify': {
    chat: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      fallback: { provider: 'openai', model: 'gpt-4.1-mini' },
    },
  },
};

const COPILOT_INTENT_MODELS: Partial<Record<IntentType, ModelChoice>> = {
  document_qa: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    fallback: { provider: 'openai', model: 'gpt-4.1' },
  },
  market_analysis: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    fallback: { provider: 'openai', model: 'gpt-4.1' },
  },
};

export function getCopilotModelForIntent(intent: IntentType): ModelChoice {
  return COPILOT_INTENT_MODELS[intent] ?? ROUTES['copilot']!.chat!;
}

export function resolveModel(featureId: FeatureId, capability: Capability = 'chat'): ModelChoice | undefined {
  return ROUTES[featureId]?.[capability];
}
