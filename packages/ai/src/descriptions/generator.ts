import Anthropic from '@anthropic-ai/sdk';
import {
  type Portal,
  type Tone,
  type PropertyAttributes,
  buildPrompt,
  buildRetryPrompt,
  isWithinPortalLength,
} from './promptBuilder.js';

export interface DescriptionGenerateResult {
  body: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  retried: boolean;
}

export interface DescriptionGenerateOptions {
  attrs: PropertyAttributes;
  tone: Tone;
  portal: Portal;
  extraInstructions?: string | undefined;
  anthropicApiKey: string;
}

const MODEL = 'claude-sonnet-4-6-20250514';
const MAX_TOKENS = 2048;

async function callLLM(
  client: Anthropic,
  system: string,
  userMessage: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number; model: string }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return {
    text: text.trim(),
    promptTokens: response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    model: response.model,
  };
}

export async function generateDescription(opts: DescriptionGenerateOptions): Promise<DescriptionGenerateResult> {
  const client = new Anthropic({ apiKey: opts.anthropicApiKey });

  const { system, user } = buildPrompt(opts.attrs, opts.tone, opts.portal, opts.extraInstructions);
  const first = await callLLM(client, system, user);

  if (opts.portal === 'general' || isWithinPortalLength(first.text, opts.portal)) {
    return {
      body: first.text,
      model: first.model,
      promptTokens: first.promptTokens,
      completionTokens: first.completionTokens,
      retried: false,
    };
  }

  const retryUser = buildRetryPrompt(user, first.text, opts.portal);
  const second = await callLLM(client, system, retryUser);

  return {
    body: second.text,
    model: second.model,
    promptTokens: first.promptTokens + second.promptTokens,
    completionTokens: first.completionTokens + second.completionTokens,
    retried: true,
  };
}
