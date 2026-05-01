export type EntityType =
  | 'property'
  | 'contact_note'
  | 'conversation_message'
  | 'document_page'
  | 'property_description';

export interface Chunk {
  content: string;
  chunkIndex: number;
  sourceField: string;
  metadata: Record<string, unknown>;
}

export interface ChunkInput {
  entityType: EntityType;
  entityId: string;
  tenantId: string;
  data: Record<string, unknown>;
}

const MAX_CHUNK_TOKENS = 500;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * APPROX_CHARS_PER_TOKEN;

function splitByParagraph(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.trim()];
}

function chunkProperty(data: Record<string, unknown>): Chunk[] {
  const chunks: Chunk[] = [];

  const structured = [
    data.referenceCode && `Ref: ${data.referenceCode}`,
    data.propertyType && `Tipo: ${data.propertyType}`,
    data.subtype && `Subtipo: ${data.subtype}`,
    data.status && `Estado: ${data.status}`,
    data.coveredAreaM2 && `Superficie cubierta: ${data.coveredAreaM2}m²`,
    data.totalAreaM2 && `Superficie total: ${data.totalAreaM2}m²`,
    data.bedrooms != null && `Dormitorios: ${data.bedrooms}`,
    data.bathrooms != null && `Baños: ${data.bathrooms}`,
    data.garages != null && `Cocheras: ${data.garages}`,
    data.province && `Provincia: ${data.province}`,
    data.locality && `Localidad: ${data.locality}`,
    data.neighborhood && `Barrio: ${data.neighborhood}`,
    data.addressStreet && `Dirección: ${data.addressStreet} ${data.addressNumber || ''}`.trim(),
  ]
    .filter(Boolean)
    .join(' | ');

  if (structured) {
    chunks.push({
      content: structured,
      chunkIndex: 0,
      sourceField: 'structured',
      metadata: { propertyType: data.propertyType, status: data.status },
    });
  }

  const description = String(data.description || '');
  if (description.trim()) {
    const descChunks = splitByParagraph(description, MAX_CHUNK_CHARS);
    for (const descChunk of descChunks) {
      chunks.push({
        content: descChunk,
        chunkIndex: chunks.length,
        sourceField: 'description',
        metadata: {},
      });
    }
  }

  const title = String(data.title || '');
  if (title.trim() && !description.includes(title)) {
    chunks.push({
      content: title,
      chunkIndex: chunks.length,
      sourceField: 'title',
      metadata: {},
    });
  }

  return chunks.length > 0 ? chunks : [];
}

function chunkContactNote(data: Record<string, unknown>): Chunk[] {
  const notes = String(data.notes || '');
  if (!notes.trim()) return [];

  const paragraphs = splitByParagraph(notes, MAX_CHUNK_CHARS);
  return paragraphs.map((content, i) => ({
    content,
    chunkIndex: i,
    sourceField: 'notes',
    metadata: { contactName: data.contactName ?? '' },
  }));
}

function chunkConversationMessage(data: Record<string, unknown>): Chunk[] {
  const messages = data.messages as Array<{ content: string; role?: string; timestamp?: string }> | undefined;
  if (!messages?.length) return [];

  const windowSize = 5;
  const chunks: Chunk[] = [];

  for (let i = 0; i < messages.length; i += windowSize) {
    const window = messages.slice(i, i + windowSize);
    const content = window
      .map((m) => `[${m.role || 'user'}] ${m.content}`)
      .join('\n');

    chunks.push({
      content,
      chunkIndex: chunks.length,
      sourceField: 'messages',
      metadata: {
        windowStart: i,
        windowEnd: Math.min(i + windowSize, messages.length),
      },
    });
  }

  return chunks;
}

function chunkDocumentPage(data: Record<string, unknown>): Chunk[] {
  const pages = data.pages as string[] | undefined;
  if (!pages?.length) {
    const content = String(data.content || '');
    if (!content.trim()) return [];
    return [{
      content,
      chunkIndex: 0,
      sourceField: 'content',
      metadata: { pageNumber: data.pageNumber },
    }];
  }

  return pages.map((page, i) => ({
    content: page,
    chunkIndex: i,
    sourceField: 'page',
    metadata: { pageNumber: i + 1 },
  }));
}

function chunkPropertyDescription(data: Record<string, unknown>): Chunk[] {
  const body = String(data.body || '');
  if (!body.trim()) return [];

  return [{
    content: body,
    chunkIndex: 0,
    sourceField: 'body',
    metadata: {
      locale: data.locale,
      tone: data.tone,
      targetPortal: data.targetPortal,
    },
  }];
}

const CHUNKERS: Record<EntityType, (data: Record<string, unknown>) => Chunk[]> = {
  property: chunkProperty,
  contact_note: chunkContactNote,
  conversation_message: chunkConversationMessage,
  document_page: chunkDocumentPage,
  property_description: chunkPropertyDescription,
};

export function chunkEntity(input: ChunkInput): Chunk[] {
  const chunker = CHUNKERS[input.entityType];
  return chunker(input.data);
}
