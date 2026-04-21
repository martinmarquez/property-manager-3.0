import type Anthropic from '@anthropic-ai/sdk';

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
  | 'copilot';

export const ROUTES: Partial<Record<FeatureId, Partial<Record<Capability, ModelChoice>>>> = {
  'property.description': {
    chat: {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      fallback: { provider: 'openai', model: 'gpt-4.1-mini' },
    },
  },
  'copilot': {
    chat: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      fallback: { provider: 'openai', model: 'gpt-4.1' },
    },
  },
};
