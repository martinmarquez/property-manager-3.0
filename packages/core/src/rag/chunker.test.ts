import { describe, it, expect } from 'vitest';
import { chunkEntity } from './chunker.js';

describe('chunkEntity — property', () => {
  it('produces a structured chunk and description chunks', () => {
    const chunks = chunkEntity({
      entityType: 'property',
      entityId: 'prop-1',
      tenantId: 'tenant-1',
      data: {
        referenceCode: 'ABC-123',
        propertyType: 'Departamento',
        status: 'En venta',
        bedrooms: 3,
        bathrooms: 2,
        locality: 'Palermo',
        description: 'Hermoso departamento con vista al parque.',
      },
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const structured = chunks.find((c) => c.sourceField === 'structured');
    expect(structured).toBeDefined();
    expect(structured!.content).toContain('ABC-123');
    expect(structured!.content).toContain('Palermo');

    const desc = chunks.find((c) => c.sourceField === 'description');
    expect(desc).toBeDefined();
    expect(desc!.content).toContain('Hermoso');
  });

  it('appends title chunk when title is not in description', () => {
    const chunks = chunkEntity({
      entityType: 'property',
      entityId: 'prop-2',
      tenantId: 'tenant-1',
      data: {
        title: 'Exclusivo piso alto',
        description: 'Amplio y luminoso.',
      },
    });

    const titleChunk = chunks.find((c) => c.sourceField === 'title');
    expect(titleChunk).toBeDefined();
    expect(titleChunk!.content).toBe('Exclusivo piso alto');
  });

  it('does not add title chunk when title appears in description', () => {
    const title = 'Exclusivo piso alto';
    const chunks = chunkEntity({
      entityType: 'property',
      entityId: 'prop-3',
      tenantId: 'tenant-1',
      data: { title, description: `${title} en Recoleta.` },
    });

    expect(chunks.filter((c) => c.sourceField === 'title')).toHaveLength(0);
  });

  it('splits long descriptions into multiple chunks', () => {
    const paragraph = 'x'.repeat(2100);
    const longDesc = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = chunkEntity({
      entityType: 'property',
      entityId: 'prop-4',
      tenantId: 'tenant-1',
      data: { description: longDesc },
    });

    const descChunks = chunks.filter((c) => c.sourceField === 'description');
    expect(descChunks.length).toBeGreaterThan(1);
  });

  it('returns empty array when no data provided', () => {
    const chunks = chunkEntity({
      entityType: 'property',
      entityId: 'prop-5',
      tenantId: 'tenant-1',
      data: {},
    });
    expect(chunks).toHaveLength(0);
  });
});

describe('chunkEntity — contact_note', () => {
  it('returns paragraph chunks from notes', () => {
    const chunks = chunkEntity({
      entityType: 'contact_note',
      entityId: 'note-1',
      tenantId: 'tenant-1',
      data: { notes: 'Primera reunión.\n\nSeguimiento pendiente.', contactName: 'Ana López' },
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0]!.sourceField).toBe('notes');
    expect(chunks[0]!.metadata).toMatchObject({ contactName: 'Ana López' });
  });

  it('returns empty array for empty notes', () => {
    const chunks = chunkEntity({
      entityType: 'contact_note',
      entityId: 'note-2',
      tenantId: 'tenant-1',
      data: { notes: '' },
    });
    expect(chunks).toHaveLength(0);
  });
});

describe('chunkEntity — conversation_message', () => {
  it('windows messages into groups of 5', () => {
    const messages = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Mensaje ${i + 1}`,
    }));

    const chunks = chunkEntity({
      entityType: 'conversation_message',
      entityId: 'conv-1',
      tenantId: 'tenant-1',
      data: { messages },
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.metadata).toMatchObject({ windowStart: 0, windowEnd: 5 });
    expect(chunks[1]!.metadata).toMatchObject({ windowStart: 5, windowEnd: 10 });
    expect(chunks[2]!.metadata).toMatchObject({ windowStart: 10, windowEnd: 12 });
  });

  it('returns empty array when no messages', () => {
    const chunks = chunkEntity({
      entityType: 'conversation_message',
      entityId: 'conv-2',
      tenantId: 'tenant-1',
      data: {},
    });
    expect(chunks).toHaveLength(0);
  });
});

describe('chunkEntity — document_page', () => {
  it('creates one chunk per page when pages array provided', () => {
    const chunks = chunkEntity({
      entityType: 'document_page',
      entityId: 'doc-1',
      tenantId: 'tenant-1',
      data: { pages: ['Página uno', 'Página dos', 'Página tres'] },
    });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]!.content).toBe('Página uno');
    expect(chunks[0]!.metadata).toMatchObject({ pageNumber: 1 });
    expect(chunks[2]!.metadata).toMatchObject({ pageNumber: 3 });
  });

  it('falls back to content field when no pages array', () => {
    const chunks = chunkEntity({
      entityType: 'document_page',
      entityId: 'doc-2',
      tenantId: 'tenant-1',
      data: { content: 'Contenido del documento', pageNumber: 5 },
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe('Contenido del documento');
    expect(chunks[0]!.metadata).toMatchObject({ pageNumber: 5 });
  });

  it('returns empty array when no content', () => {
    const chunks = chunkEntity({
      entityType: 'document_page',
      entityId: 'doc-3',
      tenantId: 'tenant-1',
      data: {},
    });
    expect(chunks).toHaveLength(0);
  });
});

describe('chunkEntity — property_description', () => {
  it('creates one chunk from body', () => {
    const chunks = chunkEntity({
      entityType: 'property_description',
      entityId: 'pd-1',
      tenantId: 'tenant-1',
      data: { body: 'Texto generado por IA.', locale: 'es-AR', tone: 'formal', targetPortal: 'zonaprop' },
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe('Texto generado por IA.');
    expect(chunks[0]!.metadata).toMatchObject({ locale: 'es-AR', tone: 'formal', targetPortal: 'zonaprop' });
  });

  it('returns empty array for empty body', () => {
    const chunks = chunkEntity({
      entityType: 'property_description',
      entityId: 'pd-2',
      tenantId: 'tenant-1',
      data: { body: '' },
    });
    expect(chunks).toHaveLength(0);
  });
});
