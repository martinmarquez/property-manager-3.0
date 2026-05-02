import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';
import { useCopilotStream } from '../../hooks/useCopilotStream.js';
import { useMediaQuery, BREAKPOINTS } from '../../hooks/useMediaQuery.js';
import type { StreamCitation, StreamActionSuggestion } from '../../hooks/useCopilotStream.js';
import {
  C, F,
  ENTITY_ICONS, ENTITY_ROUTES, ACTION_ICONS,
  SUGGESTED_PROMPTS, SESSION_KEY,
} from '../../components/copilot/tokens.js';
import type { Citation, ActionCard, Message, EntityType } from '../../components/copilot/tokens.js';

/* ─── Markdown renderer ───────────────────────────────────── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      nodes.push(
        <pre key={`code-${i}`} style={{
          background:   C.bgBase,
          border:       `1px solid ${C.border}`,
          borderRadius: 8,
          padding:      '10px 14px',
          fontFamily:   F.mono,
          fontSize:     12,
          lineHeight:   1.6,
          overflowX:    'auto',
          margin:       '8px 0',
          color:        C.textSecondary,
        }}>
          {codeLines.join('\n')}
        </pre>,
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [line.slice(2)];
      while (i + 1 < lines.length && (lines[i + 1]!.startsWith('- ') || lines[i + 1]!.startsWith('* '))) {
        i++;
        listItems.push(lines[i]!.slice(2));
      }
      nodes.push(
        <ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: 20 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [line.replace(/^\d+\.\s/, '')];
      while (i + 1 < lines.length && /^\d+\.\s/.test(lines[i + 1]!)) {
        i++;
        listItems.push(lines[i]!.replace(/^\d+\.\s/, ''));
      }
      nodes.push(
        <ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: 20 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ marginBottom: 2 }}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.trim() === '') {
      nodes.push(<br key={`br-${i}`} />);
      continue;
    }

    nodes.push(<p key={`p-${i}`} style={{ margin: '2px 0' }}>{renderInline(line)}</p>);
  }

  return nodes;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background:   C.bgBase,
          border:       `1px solid ${C.border}`,
          borderRadius: 4,
          padding:      '1px 5px',
          fontFamily:   F.mono,
          fontSize:     '0.9em',
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/* ─── Sub-components ────────────────────────────────────────── */

function CitationPill({ citation, onClick }: { citation: Citation; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           6,
        padding:       '3px 10px',
        borderRadius:  20,
        background:    C.aiFaint,
        border:        `1px solid ${C.ai}40`,
        color:         C.aiLight,
        fontSize:      12,
        fontFamily:    F.mono,
        cursor:        'pointer',
        transition:    'all 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = `${C.ai}25`;
        (e.currentTarget as HTMLElement).style.borderColor = `${C.ai}80`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = C.aiFaint;
        (e.currentTarget as HTMLElement).style.borderColor = `${C.ai}40`;
      }}
    >
      <span style={{ fontSize: 11 }}>{ENTITY_ICONS[citation.entityType] ?? '📎'}</span>
      <span>{citation.code || citation.label}</span>
    </button>
  );
}

function ActionConfirmCard({
  card,
  onConfirm,
  onCancel,
  onEdit,
}: {
  card: ActionCard;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: () => void;
}) {
  return (
    <div style={{
      marginTop:    12,
      padding:      16,
      borderRadius: 12,
      background:   C.bgElevated,
      border:       `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width:          36,
          height:         36,
          borderRadius:   8,
          background:     C.aiFaint,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       18,
          flexShrink:     0,
        }}>
          {ACTION_ICONS[card.type] ?? '⚡'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F.body, fontWeight: 600, color: C.textPrimary, fontSize: 14 }}>
            {card.summary}
          </div>
          <div style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
            {card.detail}
          </div>
        </div>
      </div>

      {card.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onConfirm} style={{
            padding:      '6px 16px',
            borderRadius: 8,
            background:   C.brand,
            color:        '#fff',
            border:       'none',
            fontFamily:   F.body,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
          }}>
            Confirmar
          </button>
          <button onClick={onEdit} style={{
            padding:      '6px 16px',
            borderRadius: 8,
            background:   'transparent',
            color:        C.textSecondary,
            border:       `1px solid ${C.border}`,
            fontFamily:   F.body,
            fontSize:     13,
            cursor:       'pointer',
          }}>
            Editar
          </button>
          <button onClick={onCancel} style={{
            padding:      '6px 16px',
            borderRadius: 8,
            background:   'transparent',
            color:        C.textSecondary,
            border:       'none',
            fontFamily:   F.body,
            fontSize:     13,
            cursor:       'pointer',
          }}>
            Cancelar
          </button>
        </div>
      )}

      {card.status === 'confirmed' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: C.success, fontSize: 13, fontFamily: F.body }}>
          <span>✓</span>
          <span>{card.type === 'create_task' ? 'Tarea creada exitosamente' : 'Mensaje enviado'}</span>
        </div>
      )}

      {card.status === 'cancelled' && (
        <div style={{ marginTop: 10, color: C.textTertiary, fontSize: 13, fontFamily: F.body }}>
          Acción cancelada
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        12,
      padding:    '12px 0',
    }}>
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   '50%',
        background:     C.aiFaint,
        border:         `1px solid ${C.ai}40`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       14,
        flexShrink:     0,
        color:          C.ai,
      }}>
        ✦
      </div>
      <div style={{
        padding:      '10px 14px',
        borderRadius: 12,
        background:   C.bgElevated,
        border:       `1px solid ${C.border}`,
        display:      'flex',
        alignItems:   'center',
        gap:          4,
      }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width:        6,
              height:       6,
              borderRadius: '50%',
              background:   C.ai,
              animation:    `copilot-bounce 1.2s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
  onActionConfirm,
  onActionCancel,
  onActionEdit,
}: {
  message: Message;
  onCitationClick?: (c: Citation) => void;
  onActionConfirm?: () => void;
  onActionCancel?: () => void;
  onActionEdit?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display:        'flex',
      flexDirection:  isUser ? 'row-reverse' : 'row',
      alignItems:     'flex-start',
      gap:            12,
      marginBottom:   20,
      animation:      'copilot-fadeIn 0.25s ease-out',
    }}>
      {!isUser && (
        <div style={{
          width:          32,
          height:         32,
          borderRadius:   '50%',
          background:     C.aiFaint,
          border:         `1px solid ${C.ai}40`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       14,
          flexShrink:     0,
          color:          C.ai,
          fontFamily:     F.display,
        }}>
          ✦
        </div>
      )}

      <div style={{ maxWidth: '75%', minWidth: 0 }}>
        <div style={{
          padding:      '12px 16px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background:   isUser ? C.brand : C.bgElevated,
          border:       isUser ? 'none' : `1px solid ${C.border}`,
          fontFamily:   F.body,
          fontSize:     14,
          lineHeight:   1.6,
          color:        C.textPrimary,
        }}>
          {isUser ? message.text : renderMarkdown(message.text)}
          {message.isStreaming && (
            <span style={{
              display:       'inline-block',
              width:         6,
              height:        16,
              background:    C.ai,
              marginLeft:    2,
              animation:     'copilot-cursor 0.8s infinite',
              verticalAlign: 'text-bottom',
            }} />
          )}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        6,
            marginTop:  8,
          }}>
            {message.citations.map((c, i) => (
              <CitationPill
                key={`${c.entityId}-${i}`}
                citation={c}
                onClick={() => onCitationClick?.(c)}
              />
            ))}
          </div>
        )}

        {message.actionCard && onActionConfirm && onActionCancel && onActionEdit && (
          <ActionConfirmCard
            card={message.actionCard}
            onConfirm={onActionConfirm}
            onCancel={onActionCancel}
            onEdit={onActionEdit}
          />
        )}

        <div style={{
          marginTop:  4,
          fontSize:   11,
          color:      C.textTertiary,
          fontFamily: F.mono,
          textAlign:  isUser ? 'right' : 'left',
        }}>
          {message.timestamp}
        </div>
      </div>

      {isUser && (
        <div style={{
          width:          32,
          height:         32,
          borderRadius:   '50%',
          background:     C.brandFaint,
          border:         `1px solid ${C.brand}50`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       13,
          fontWeight:     700,
          color:          C.brandLight,
          fontFamily:     F.display,
          flexShrink:     0,
        }}>
          MM
        </div>
      )}
    </div>
  );
}

function EmptyState({ onPrompt, isMobile }: { onPrompt: (p: string) => void; isMobile: boolean }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      flex:           1,
      padding:        isMobile ? 24 : 48,
      gap:            32,
    }}>
      <div style={{
        width:          72,
        height:         72,
        borderRadius:   20,
        background:     C.aiFaint,
        border:         `1px solid ${C.ai}40`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       32,
        color:          C.ai,
      }}>
        ✦
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontFamily: F.display,
          fontSize:   isMobile ? 18 : 22,
          fontWeight: 700,
          color:      C.textPrimary,
          margin:     0,
        }}>
          ¿En qué puedo ayudarte?
        </h2>
        <p style={{
          fontFamily: F.body,
          fontSize:   14,
          color:      C.textSecondary,
          marginTop:  8,
        }}>
          Pregunta sobre propiedades, contactos, operaciones o pide que redacte mensajes.
        </p>
      </div>

      <div style={{
        display:             'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap:                 12,
        width:               '100%',
        maxWidth:            560,
      }}>
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onPrompt(prompt)}
            style={{
              padding:      '12px 16px',
              borderRadius: 10,
              background:   C.bgElevated,
              border:       `1px solid ${C.border}`,
              color:        C.textSecondary,
              fontFamily:   F.body,
              fontSize:     13,
              textAlign:    'left',
              cursor:       'pointer',
              lineHeight:   1.4,
              transition:   'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = `${C.ai}60`;
              (e.currentTarget as HTMLElement).style.color = C.textPrimary;
              (e.currentTarget as HTMLElement).style.background = C.aiFaint;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = C.border;
              (e.currentTarget as HTMLElement).style.color = C.textSecondary;
              (e.currentTarget as HTMLElement).style.background = C.bgElevated;
            }}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Session sidebar ──────────────────────────────────────── */

interface SessionItem {
  id: string;
  title: string | null;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function groupSessionsByDate(sessions: SessionItem[]): Record<string, SessionItem[]> {
  const groups: Record<string, SessionItem[]> = {};
  for (const s of sessions) {
    const key = formatSessionDate(s.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return groups;
}

function SessionSidebar({
  collapsed,
  sessions,
  activeSession,
  onSelect,
  onNew,
  onClose,
  isLoading,
  isOverlay,
}: {
  collapsed: boolean;
  sessions: SessionItem[];
  activeSession: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
  isLoading: boolean;
  isOverlay: boolean;
}) {
  if (collapsed && !isOverlay) return null;

  const groups = groupSessionsByDate(sessions);

  const sidebar = (
    <div style={{
      width:          280,
      flexShrink:     0,
      background:     C.bgRaised,
      borderRight:    isOverlay ? 'none' : `1px solid ${C.border}`,
      display:        'flex',
      flexDirection:  'column',
      overflowY:      'auto',
      height:         '100%',
      animation:      isOverlay ? 'copilot-slideIn 0.2s ease-out' : undefined,
    }}>
      <div style={{ padding: '16px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onNew}
          style={{
            flex:         1,
            padding:      '10px 16px',
            borderRadius: 8,
            background:   C.brandFaint,
            border:       `1px solid ${C.brand}40`,
            color:        C.brandLight,
            fontFamily:   F.body,
            fontSize:     13,
            fontWeight:   600,
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          8,
          }}
        >
          <span>+</span>
          <span>Nueva conversación</span>
        </button>
        {isOverlay && (
          <button
            onClick={onClose}
            aria-label="Cerrar historial"
            style={{
              background:   'transparent',
              border:       `1px solid ${C.border}`,
              borderRadius: 6,
              color:        C.textSecondary,
              cursor:       'pointer',
              padding:      '8px 10px',
              fontSize:     14,
              flexShrink:   0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
        {isLoading && (
          <div style={{ padding: '16px', textAlign: 'center', color: C.textTertiary, fontSize: 12, fontFamily: F.mono }}>
            Cargando…
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: C.textTertiary, fontSize: 12, fontFamily: F.body }}>
            Sin conversaciones previas
          </div>
        )}

        {Object.entries(groups).map(([date, groupSessions]) => (
          <div key={date}>
            <div style={{
              padding:        '6px 16px 4px',
              fontSize:       11,
              fontFamily:     F.mono,
              color:          C.textTertiary,
              fontWeight:     600,
              letterSpacing:  '0.06em',
              textTransform:  'uppercase',
            }}>
              {date}
            </div>
            {groupSessions.map(session => (
              <button
                key={session.id}
                onClick={() => {
                  onSelect(session.id);
                  if (isOverlay) onClose();
                }}
                style={{
                  width:        '100%',
                  padding:      '10px 16px',
                  background:   activeSession === session.id ? C.bgElevated : 'transparent',
                  border:       'none',
                  borderLeft:   activeSession === session.id
                    ? `2px solid ${C.ai}`
                    : '2px solid transparent',
                  cursor:       'pointer',
                  textAlign:    'left',
                  transition:   'all 0.12s',
                }}
                onMouseEnter={e => {
                  if (activeSession !== session.id)
                    (e.currentTarget as HTMLElement).style.background = C.bgElevated;
                }}
                onMouseLeave={e => {
                  if (activeSession !== session.id)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={{
                  fontFamily:    F.body,
                  fontSize:      13,
                  fontWeight:    500,
                  color:         C.textPrimary,
                  whiteSpace:    'nowrap',
                  overflow:      'hidden',
                  textOverflow:  'ellipsis',
                }}>
                  {session.title || 'Nueva conversación'}
                </div>
                <div style={{
                  fontFamily:    F.body,
                  fontSize:      11,
                  color:         C.textTertiary,
                  marginTop:     2,
                }}>
                  {session.turnCount} mensajes
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (!isOverlay) return sidebar;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(7,13,26,0.7)',
          zIndex:     100,
          animation:  'copilot-fadeIn 0.15s ease-out',
        }}
      />
      {/* Floating sidebar */}
      <div style={{
        position:     'fixed',
        top:          0,
        left:         0,
        bottom:       0,
        zIndex:       101,
        boxShadow:    `4px 0 32px rgba(0,0,0,0.5)`,
      }}>
        {sidebar}
      </div>
    </>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

function turnToMessage(turn: {
  id: string;
  role: string;
  content: string;
  toolCalls?: unknown;
  actionType: string | null;
  actionConfirmed: boolean | null;
  createdAt: string | Date;
}): Message | null {
  if (turn.role !== 'user' && turn.role !== 'assistant') return null;

  const msg: Message = {
    id:        turn.id,
    role:      turn.role,
    text:      turn.content,
    timestamp: new Date(turn.createdAt as string | number).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  if (turn.role === 'assistant' && turn.actionType && turn.actionConfirmed !== null) {
    const toolCalls = turn.toolCalls as StreamActionSuggestion[] | null;
    const suggestion = toolCalls?.[0];
    msg.actionCard = {
      type:    (turn.actionType as 'send_message' | 'create_task') ?? 'create_task',
      summary: suggestion?.summary ?? turn.actionType,
      detail:  suggestion?.detail ?? '',
      payload: suggestion?.payload ?? {},
      status:  turn.actionConfirmed === true ? 'confirmed' : turn.actionConfirmed === false ? 'pending' : 'cancelled',
      turnId:  turn.id,
    };
  }

  return msg;
}

function mapStreamCitations(citations: StreamCitation[]): Citation[] {
  return citations.map((c) => ({
    entityType: c.entityType as EntityType,
    entityId:   c.entityId,
    code:       c.content.slice(0, 20),
    label:      c.content,
  }));
}

export default function CopilotPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const isTablet = useMediaQuery(BREAKPOINTS.tablet);
  const useOverlaySidebar = isMobile || isTablet;

  const [input, setInput]                       = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(useOverlaySidebar);
  const [activeSessionId, setActiveSessionId]   = useState<string>(
    () => localStorage.getItem(SESSION_KEY) ?? '',
  );
  const [messages, setMessages]                 = useState<Message[]>([]);
  const messagesEndRef                          = useRef<HTMLDivElement>(null);
  const textareaRef                             = useRef<HTMLTextAreaElement>(null);

  const { isStreaming, sendMessage } = useCopilotStream();

  // Collapse sidebar when switching to mobile/tablet
  useEffect(() => {
    if (useOverlaySidebar) setSidebarCollapsed(true);
  }, [useOverlaySidebar]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  const sessionsQuery = trpc.copilot.listSessions.useQuery(
    { limit: 30 },
    { staleTime: 10_000 },
  );

  const sessionQuery = trpc.copilot.getSession.useQuery(
    { sessionId: activeSessionId },
    {
      enabled: !!activeSessionId,
      staleTime: 5_000,
    },
  );

  useEffect(() => {
    if (sessionQuery.data?.turns) {
      const msgs = sessionQuery.data.turns
        .map(turnToMessage)
        .filter((m): m is Message => m !== null);
      setMessages(msgs);
    }
  }, [sessionQuery.data?.turns]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const createSession = trpc.copilot.createSession.useMutation();
  const confirmAction = trpc.copilot.confirmAction.useMutation();
  const cancelAction  = trpc.copilot.cancelAction.useMutation();

  const ensureSession = useCallback(async (context?: Record<string, unknown>): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const session = await createSession.mutateAsync({ context });
    setActiveSessionId(session.id);
    sessionsQuery.refetch();
    return session.id;
  }, [activeSessionId, createSession, sessionsQuery]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || isStreaming) return;
    setInput('');

    const userMsg: Message = {
      id:        `tmp-${Date.now()}`,
      role:      'user',
      text:      msg,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);

    const streamMsgId = `stream-${Date.now()}`;
    setMessages(prev => [...prev, {
      id:          streamMsgId,
      role:        'assistant',
      text:        '',
      timestamp:   new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      isStreaming:  true,
    }]);

    try {
      const sessionId = await ensureSession();
      const result = await sendMessage(sessionId, msg, (streamedText) => {
        setMessages(prev => prev.map(m =>
          m.id === streamMsgId ? { ...m, text: streamedText } : m,
        ));
      });

      setMessages(prev => prev.map(m => {
        if (m.id !== streamMsgId) return m;
        const finalMsg: Message = {
          ...m,
          id:          result.turnId ?? streamMsgId,
          text:        result.text,
          isStreaming:  false,
          citations:   result.citations.length > 0
            ? mapStreamCitations(result.citations)
            : undefined,
        };
        if (result.actionSuggestion) {
          finalMsg.actionCard = {
            type:    result.actionSuggestion.type,
            summary: result.actionSuggestion.summary,
            detail:  result.actionSuggestion.detail,
            payload: result.actionSuggestion.payload,
            status:  'pending',
            turnId:  result.turnId,
          };
        }
        return finalMsg;
      }));

      sessionsQuery.refetch();
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamMsgId
          ? { ...m, text: 'Error al procesar tu mensaje. Intentá de nuevo.', isStreaming: false }
          : m,
      ));
    }
  }, [input, isStreaming, ensureSession, sendMessage, sessionsQuery]);

  const handleActionConfirm = useCallback(async (messageId: string, turnId: string | null) => {
    if (!turnId) return;
    setMessages(prev => prev.map(m =>
      m.id === messageId && m.actionCard
        ? { ...m, actionCard: { ...m.actionCard, status: 'confirmed' as const } }
        : m,
    ));
    try {
      await confirmAction.mutateAsync({ turnId });
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === messageId && m.actionCard
          ? { ...m, actionCard: { ...m.actionCard, status: 'pending' as const } }
          : m,
      ));
    }
  }, [confirmAction]);

  const handleActionCancel = useCallback(async (messageId: string, turnId: string | null) => {
    if (!turnId) return;
    setMessages(prev => prev.map(m =>
      m.id === messageId && m.actionCard
        ? { ...m, actionCard: { ...m.actionCard, status: 'cancelled' as const } }
        : m,
    ));
    try {
      await cancelAction.mutateAsync({ turnId });
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === messageId && m.actionCard
          ? { ...m, actionCard: { ...m.actionCard, status: 'pending' as const } }
          : m,
      ));
    }
  }, [cancelAction]);

  const handleCitationClick = useCallback((c: Citation) => {
    const routeFn = ENTITY_ROUTES[c.entityType];
    if (routeFn) {
      navigate({ to: routeFn(c.entityId) });
    }
  }, [navigate]);

  const handleNewSession = useCallback(() => {
    setMessages([]);
    setActiveSessionId('');
    localStorage.removeItem(SESSION_KEY);
    textareaRef.current?.focus();
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const sessions: SessionItem[] = (sessionsQuery.data?.items ?? []).map((s) => ({
    id:        s.id,
    title:     s.title,
    turnCount: s.turnCount,
    createdAt: String(s.createdAt),
    updatedAt: String(s.updatedAt),
  }));

  const isEmpty = !activeSessionId && messages.length === 0;

  return (
    <div style={{
      display:        'flex',
      height:         '100%',
      background:     C.bgBase,
      fontFamily:     F.body,
      position:       'relative',
    }}>
      <style>{`
        @keyframes copilot-cursor {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }
        @keyframes copilot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes copilot-fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes copilot-slideIn {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      {/* Session sidebar — inline on desktop, overlay on tablet/mobile */}
      {!useOverlaySidebar && (
        <SessionSidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          activeSession={activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onClose={() => setSidebarCollapsed(true)}
          isLoading={sessionsQuery.isLoading}
          isOverlay={false}
        />
      )}

      {useOverlaySidebar && !sidebarCollapsed && (
        <SessionSidebar
          collapsed={false}
          sessions={sessions}
          activeSession={activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onClose={() => setSidebarCollapsed(true)}
          isLoading={sessionsQuery.isLoading}
          isOverlay={true}
        />
      )}

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          padding:      isMobile ? '10px 12px' : '12px 20px',
          borderBottom: `1px solid ${C.border}`,
          display:      'flex',
          alignItems:   'center',
          gap:          12,
          background:   C.bgBase,
          flexShrink:   0,
        }}>
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            style={{
              background:   'transparent',
              border:       `1px solid ${C.border}`,
              borderRadius: 6,
              color:        C.textSecondary,
              cursor:       'pointer',
              padding:      '5px 8px',
              fontSize:     14,
            }}
            title={sidebarCollapsed ? 'Mostrar historial' : 'Ocultar historial'}
            aria-label={sidebarCollapsed ? 'Mostrar historial' : 'Ocultar historial'}
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: C.ai }}>✦</span>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: isMobile ? 14 : 16, color: C.textPrimary }}>
              Copilot IA
            </span>
            <span style={{
              padding:      '2px 8px',
              borderRadius: 20,
              background:   C.aiFaint,
              color:        C.ai,
              fontSize:     11,
              fontFamily:   F.mono,
              fontWeight:   600,
            }}>
              BETA
            </span>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex:           1,
          overflowY:      'auto',
          padding:        isMobile ? '16px 12px' : '24px 20px',
          display:        'flex',
          flexDirection:  'column',
        }}>
          <div style={{
            maxWidth:       800,
            width:          '100%',
            margin:         '0 auto',
            flex:           1,
            display:        'flex',
            flexDirection:  'column',
          }}>
            {isEmpty ? (
              <EmptyState onPrompt={handleSend} isMobile={isMobile} />
            ) : (
              <>
                {messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onCitationClick={handleCitationClick}
                    onActionConfirm={
                      msg.actionCard
                        ? () => handleActionConfirm(msg.id, msg.actionCard!.turnId)
                        : undefined
                    }
                    onActionCancel={
                      msg.actionCard
                        ? () => handleActionCancel(msg.id, msg.actionCard!.turnId)
                        : undefined
                    }
                    onActionEdit={
                      msg.actionCard
                        ? () => setMessages(prev => prev.map(m =>
                            m.id === msg.id && m.actionCard
                              ? { ...m, actionCard: { ...m.actionCard, status: 'editing' as const } }
                              : m,
                          ))
                        : undefined
                    }
                  />
                ))}
                {isStreaming && messages[messages.length - 1]?.text === '' && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <div style={{
          padding:      isMobile ? '12px' : '16px 20px',
          borderTop:    `1px solid ${C.border}`,
          background:   C.bgBase,
          flexShrink:   0,
        }}>
          <div style={{
            maxWidth:     800,
            margin:       '0 auto',
            display:      'flex',
            gap:          10,
            alignItems:   'flex-end',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isMobile
                  ? 'Pregunta algo…'
                  : 'Pregunta sobre propiedades, contactos, operaciones… (Enter para enviar)'}
                rows={1}
                disabled={isStreaming}
                style={{
                  width:        '100%',
                  padding:      '12px 16px',
                  borderRadius: 12,
                  background:   C.bgRaised,
                  border:       `1px solid ${C.border}`,
                  color:        C.textPrimary,
                  fontFamily:   F.body,
                  fontSize:     14,
                  outline:      'none',
                  resize:       'none',
                  boxSizing:    'border-box',
                  lineHeight:   1.5,
                  opacity:      isStreaming ? 0.5 : 1,
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = `${C.ai}60`; }}
                onBlur={e  => { (e.target as HTMLElement).style.borderColor = C.border; }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isStreaming}
              aria-label="Enviar mensaje"
              style={{
                padding:      '12px 20px',
                borderRadius: 12,
                background:   input.trim() && !isStreaming ? C.ai : C.bgElevated,
                border:       'none',
                color:        input.trim() && !isStreaming ? '#fff' : C.textTertiary,
                cursor:       input.trim() && !isStreaming ? 'pointer' : 'default',
                fontFamily:   F.body,
                fontSize:     16,
                transition:   'all 0.15s',
                flexShrink:   0,
              }}
            >
              ↑
            </button>
          </div>
          {!isMobile && (
            <div style={{
              maxWidth:   800,
              margin:     '6px auto 0',
              fontSize:   11,
              color:      C.textTertiary,
              fontFamily: F.mono,
              textAlign:  'right',
            }}>
              Enter para enviar · Shift+Enter nueva línea
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
