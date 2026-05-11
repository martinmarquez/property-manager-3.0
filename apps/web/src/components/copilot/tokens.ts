export const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#5577FF',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.12)',
  error:         '#E83B3B',
  brandHover:    '#1244b8',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  aiLight:       '#9B59FF',
} as const;

export const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
} as const;

export type EntityType = 'property' | 'contact' | 'deal' | 'document' | 'task';

export interface Citation {
  entityType: EntityType;
  entityId: string;
  code: string;
  label: string;
}

export interface ActionCard {
  type: 'send_message' | 'create_task';
  summary: string;
  detail: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'editing';
  turnId: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  actionCard?: ActionCard;
  timestamp: string;
  isStreaming?: boolean;
}

export const ENTITY_ICONS: Record<string, string> = {
  property:  '🏠',
  contact:   '👤',
  deal:      '📋',
  document:  '📄',
  task:      '✅',
};

export const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  property:  (id) => `/properties/${id}/edit`,
  contact:   (id) => `/contacts/${id}`,
  deal:      (id) => `/pipelines?deal=${id}`,
  document:  (id) => `/documents/${id}`,
  task:      (id) => `/calendar?task=${id}`,
};

export const ACTION_ICONS: Record<string, string> = {
  send_message: '✉️',
  create_task:  '✅',
};

export const SUGGESTED_PROMPTS = [
  'Ver propiedades disponibles en Palermo',
  'Cuántos leads no contactados tengo esta semana',
  'Resumé el pipeline del mes actual',
  'Buscar contactos con consultas sobre 3 ambientes',
] as const;

export const SESSION_KEY = 'copilot:activeSession';
