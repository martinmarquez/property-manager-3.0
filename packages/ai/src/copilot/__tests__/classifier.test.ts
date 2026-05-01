import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyIntent } from '../classifier.js';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

function mockResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: 'text', text }],
  });
}

describe('classifyIntent', () => {
  let client: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    client = new Anthropic({ apiKey: 'test' });
  });

  it('classifies a property search query', async () => {
    mockResponse('{"type":"property_search","entities_mentioned":["BEL-00142"],"action_required":false,"confidence":0.95}');

    const result = await classifyIntent(client, '¿Cuántas propiedades hay en Belgrano?');

    expect(result.type).toBe('property_search');
    expect(result.entitiesMentioned).toContain('BEL-00142');
    expect(result.actionRequired).toBe(false);
    expect(result.confidence).toBe(0.95);
  });

  it('classifies a lead query', async () => {
    mockResponse('{"type":"lead_info","entities_mentioned":["Juan García"],"action_required":false,"confidence":0.9}');

    const result = await classifyIntent(client, '¿Cuándo fue el último contacto con Juan García?');

    expect(result.type).toBe('lead_info');
    expect(result.entitiesMentioned).toContain('Juan García');
  });

  it('classifies an action request', async () => {
    mockResponse('{"type":"schedule","entities_mentioned":["BEL-00142"],"action_required":true,"confidence":0.92}');

    const result = await classifyIntent(client, 'Crea una tarea para llamar al propietario de BEL-00142');

    expect(result.type).toBe('schedule');
    expect(result.actionRequired).toBe(true);
  });

  it('classifies a document question', async () => {
    mockResponse('{"type":"document_qa","entities_mentioned":[],"action_required":false,"confidence":0.88}');

    const result = await classifyIntent(client, '¿Qué dice la cláusula de penalidad del contrato?');

    expect(result.type).toBe('document_qa');
  });

  it('classifies chitchat as general', async () => {
    mockResponse('{"type":"general","entities_mentioned":[],"action_required":false,"confidence":0.98}');

    const result = await classifyIntent(client, 'Hola, ¿cómo estás?');

    expect(result.type).toBe('general');
  });

  it('classifies market analysis', async () => {
    mockResponse('{"type":"market_analysis","entities_mentioned":["Belgrano","Palermo"],"action_required":false,"confidence":0.87}');

    const result = await classifyIntent(client, 'Compará precios entre Belgrano y Palermo');

    expect(result.type).toBe('market_analysis');
    expect(result.entitiesMentioned).toEqual(['Belgrano', 'Palermo']);
  });

  it('classifies action confirmation', async () => {
    mockResponse('{"type":"action_confirm","entities_mentioned":[],"action_required":true,"confidence":0.99}');

    const result = await classifyIntent(client, 'Sí, confirmá la tarea');

    expect(result.type).toBe('action_confirm');
    expect(result.actionRequired).toBe(true);
  });

  it('falls back to general on invalid JSON', async () => {
    mockResponse('I cannot classify this');

    const result = await classifyIntent(client, 'random text');

    expect(result.type).toBe('general');
    expect(result.confidence).toBe(0.3);
  });

  it('falls back to general on unknown intent type', async () => {
    mockResponse('{"type":"unknown_intent","entities_mentioned":[],"action_required":false,"confidence":0.8}');

    const result = await classifyIntent(client, 'something weird');

    expect(result.type).toBe('general');
  });

  it('uses conversation context when provided', async () => {
    mockResponse('{"type":"property_search","entities_mentioned":[],"action_required":false,"confidence":0.85}');

    await classifyIntent(client, 'Mostrá más', 'user: ¿Propiedades en Belgrano?\nassistant: Encontré 12.');

    const callArgs = mockCreate.mock.calls[0]![0];
    expect(callArgs.messages[0].content).toContain('Recent conversation context');
    expect(callArgs.messages[0].content).toContain('Propiedades en Belgrano');
  });
});
