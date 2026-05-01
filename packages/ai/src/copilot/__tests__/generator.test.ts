import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateResponse } from '../generator.js';
import type { GenerateOptions } from '../generator.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate, stream: vi.fn() },
    })),
  };
});

function mockResponse(text: string, inputTokens = 100, outputTokens = 50) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  });
}

describe('generateResponse', () => {
  let client: any;

  const baseOpts: GenerateOptions = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    intent: 'property_search',
    message: '¿Propiedades en Belgrano?',
    history: [],
    retrievedChunks: [],
    locale: 'es-AR',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    client = new Anthropic({ apiKey: 'test' });
  });

  it('generates a response and returns token counts', async () => {
    mockResponse('Encontré 12 propiedades en Belgrano.', 150, 80);

    const result = await generateResponse(client, baseOpts);

    expect(result.content).toBe('Encontré 12 propiedades en Belgrano.');
    expect(result.inputTokens).toBe(150);
    expect(result.outputTokens).toBe(80);
    expect(result.citations).toEqual([]);
    expect(result.actionSuggestion).toBeNull();
  });

  it('uses claude-haiku-4-5 for property_search', async () => {
    mockResponse('Response');

    await generateResponse(client, baseOpts);

    expect(mockCreate.mock.calls[0]![0].model).toBe('claude-haiku-4-5-20251001');
  });

  it('uses claude-sonnet-4-6 for document_qa', async () => {
    mockResponse('Response');

    await generateResponse(client, { ...baseOpts, intent: 'document_qa' });

    expect(mockCreate.mock.calls[0]![0].model).toBe('claude-sonnet-4-6');
  });

  it('uses claude-sonnet-4-6 for market_analysis', async () => {
    mockResponse('Response');

    await generateResponse(client, { ...baseOpts, intent: 'market_analysis' });

    expect(mockCreate.mock.calls[0]![0].model).toBe('claude-sonnet-4-6');
  });

  it('extracts action suggestions from response', async () => {
    mockResponse('Voy a crear la tarea: [ACTION:create_task|Llamar propietario|Lunes 10am|{"propertyId":"BEL-001"}]');

    const result = await generateResponse(client, { ...baseOpts, intent: 'schedule' });

    expect(result.actionSuggestion).not.toBeNull();
    expect(result.actionSuggestion!.type).toBe('create_task');
    expect(result.actionSuggestion!.summary).toBe('Llamar propietario');
    expect(result.actionSuggestion!.detail).toBe('Lunes 10am');
    expect(result.actionSuggestion!.payload).toEqual({ propertyId: 'BEL-001' });
    expect(result.content).not.toContain('[ACTION:');
  });

  it('includes tenant context in system prompt', async () => {
    mockResponse('Response');

    await generateResponse(client, baseOpts);

    const systemPrompt = mockCreate.mock.calls[0]![0].system as string;
    expect(systemPrompt).toContain('tenant-1');
    expect(systemPrompt).toContain('Corredor');
  });

  it('uses sliding window for history', async () => {
    mockResponse('Response');
    const longHistory = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i}`,
    }));

    await generateResponse(client, { ...baseOpts, history: longHistory });

    const messages = mockCreate.mock.calls[0]![0].messages;
    // 20 from sliding window + 1 current = 21
    expect(messages.length).toBe(21);
  });

  it('extracts citations from matching chunks', async () => {
    const chunks = [
      {
        id: 'chunk-1',
        entityType: 'property',
        entityId: 'prop-123',
        chunkIndex: 0,
        content: 'Belgrano 3 ambientes USD 285k',
        sourceField: null,
        metadata: {},
        score: 0.9,
      },
    ];

    mockResponse('Encontré prop-123 con 3 ambientes en Belgrano.');

    const result = await generateResponse(client, { ...baseOpts, retrievedChunks: chunks });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.entityId).toBe('prop-123');
    expect(result.citations[0]!.entityType).toBe('property');
  });
});
