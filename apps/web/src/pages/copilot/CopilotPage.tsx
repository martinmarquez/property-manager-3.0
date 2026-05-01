import React, { useState, useRef, useEffect } from 'react';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  ai:            '#7E3AF2',
  aiFaint:       'rgba(126,58,242,0.12)',
  aiLight:       '#9B59FF',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
type EntityType = 'propiedad' | 'contacto' | 'operacion' | 'documento' | 'tarea';

interface Citation {
  entityType: EntityType;
  code: string;
  label: string;
}

interface ActionCard {
  type: 'send_message' | 'create_task';
  summary: string;
  detail: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'editing';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  actionCard?: ActionCard;
  timestamp: string;
}

interface Session {
  id: string;
  title: string;
  date: string;
  preview: string;
}

/* ─── Mock data ─────────────────────────────────────────────── */
const SESSIONS: Session[] = [
  { id: 's1', title: 'Análisis de propiedad BEL-00142', date: 'Hoy',  preview: 'Consulté el precio por m² de Belgrano…' },
  { id: 's2', title: 'Borrador email a Juan García',    date: 'Hoy',  preview: 'Redacté un seguimiento para el interesado…' },
  { id: 's3', title: 'Pipeline Q2 insights',            date: 'Ayer', preview: 'Operaciones cerradas este trimestre…' },
  { id: 's4', title: 'Contactos duplicados',            date: 'Ayer', preview: 'Encontré 3 pares de contactos duplicados…' },
  { id: 's5', title: 'Tasación 3 ambientes Palermo',    date: '28 abr', preview: 'Comparé con 8 propiedades similares…' },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'm1',
    role: 'user',
    text: '¿Cuántas propiedades en Belgrano tienen más de 3 ambientes disponibles?',
    timestamp: '14:23',
  },
  {
    id: 'm2',
    role: 'assistant',
    text: 'Encontré **12 propiedades** en Belgrano con 3 ambientes o más en estado disponible. La más reciente ingresó hace 2 días. El precio promedio es **USD 285.000** (rango: USD 220k – USD 410k).',
    citations: [
      { entityType: 'propiedad', code: 'BEL-00142', label: 'Av. Cabildo 1850' },
      { entityType: 'propiedad', code: 'BEL-00137', label: 'Echeverría 2340' },
      { entityType: 'propiedad', code: 'BEL-00129', label: 'Zabala 1620' },
    ],
    timestamp: '14:23',
  },
  {
    id: 'm3',
    role: 'user',
    text: 'Crea una tarea para llamar al propietario de BEL-00142 el lunes a las 10am',
    timestamp: '14:24',
  },
  {
    id: 'm4',
    role: 'assistant',
    text: 'Voy a crear la tarea de seguimiento:',
    actionCard: {
      type: 'create_task',
      summary: 'Llamar a propietario BEL-00142',
      detail: 'Lunes 4 de mayo · 10:00 AM · Asignada a ti',
      status: 'pending',
    },
    timestamp: '14:24',
  },
];

const SUGGESTED_PROMPTS = [
  '¿Qué propiedades vencen de publicación esta semana?',
  'Muéstrame las operaciones cerradas en abril',
  'Redacta un seguimiento para Juan García',
  'Analiza los precios del corredor norte de Belgrano',
];

/* ─── Entity icons ──────────────────────────────────────────── */
const ENTITY_ICONS: Record<EntityType, string> = {
  propiedad:  '🏠',
  contacto:   '👤',
  operacion:  '📋',
  documento:  '📄',
  tarea:      '✅',
};

const ACTION_ICONS: Record<ActionCard['type'], string> = {
  send_message: '✉️',
  create_task:  '✅',
};

/* ─── Sub-components ────────────────────────────────────────── */

function CitationPill({ citation }: { citation: Citation }) {
  return (
    <button
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
      <span style={{ fontSize: 11 }}>{ENTITY_ICONS[citation.entityType]}</span>
      <span>{citation.code}</span>
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
          width:        36,
          height:       36,
          borderRadius: 8,
          background:   C.aiFaint,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     18,
          flexShrink:   0,
        }}>
          {ACTION_ICONS[card.type]}
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
          <span>Tarea creada exitosamente</span>
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
        width:        32,
        height:       32,
        borderRadius: '50%',
        background:   C.aiFaint,
        border:       `1px solid ${C.ai}40`,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        fontSize:     14,
        flexShrink:   0,
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
      <style>{`
        @keyframes copilot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({
  message,
  onActionConfirm,
  onActionCancel,
  onActionEdit,
}: {
  message: Message;
  onActionConfirm?: () => void;
  onActionCancel?: () => void;
  onActionEdit?: () => void;
}) {
  const isUser = message.role === 'user';

  const renderText = (text: string) => {
    // Bold markdown **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );
  };

  return (
    <div style={{
      display:        'flex',
      flexDirection:  isUser ? 'row-reverse' : 'row',
      alignItems:     'flex-start',
      gap:            12,
      marginBottom:   20,
    }}>
      {/* Avatar */}
      {!isUser && (
        <div style={{
          width:        32,
          height:       32,
          borderRadius: '50%',
          background:   C.aiFaint,
          border:       `1px solid ${C.ai}40`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     14,
          flexShrink:   0,
          color:        C.ai,
          fontFamily:   F.display,
        }}>
          ✦
        </div>
      )}

      <div style={{ maxWidth: '75%', minWidth: 0 }}>
        {/* Bubble */}
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
          {renderText(message.text)}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        6,
            marginTop:  8,
          }}>
            {message.citations.map(c => (
              <CitationPill key={c.code} citation={c} />
            ))}
          </div>
        )}

        {/* Action card */}
        {message.actionCard && onActionConfirm && onActionCancel && onActionEdit && (
          <ActionConfirmCard
            card={message.actionCard}
            onConfirm={onActionConfirm}
            onCancel={onActionCancel}
            onEdit={onActionEdit}
          />
        )}

        {/* Timestamp */}
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

      {/* User avatar */}
      {isUser && (
        <div style={{
          width:        32,
          height:       32,
          borderRadius: '50%',
          background:   C.brandFaint,
          border:       `1px solid ${C.brand}50`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          fontSize:     13,
          fontWeight:   700,
          color:        C.brandLight,
          fontFamily:   F.display,
          flexShrink:   0,
        }}>
          MM
        </div>
      )}
    </div>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      flex:           1,
      padding:        48,
      gap:            32,
    }}>
      {/* Logo mark */}
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
          fontSize:   22,
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
        gridTemplateColumns: '1fr 1fr',
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

function SessionSidebar({
  collapsed,
  activeSession,
  onSelect,
  onNew,
}: {
  collapsed: boolean;
  activeSession: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  if (collapsed) return null;

  const groups: Record<string, Session[]> = {};
  SESSIONS.forEach(s => {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  });

  return (
    <div style={{
      width:          280,
      flexShrink:     0,
      background:     C.bgRaised,
      borderRight:    `1px solid ${C.border}`,
      display:        'flex',
      flexDirection:  'column',
      overflowY:      'auto',
      height:         '100%',
    }}>
      <div style={{ padding: '16px 16px 8px' }}>
        <button
          onClick={onNew}
          style={{
            width:        '100%',
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
      </div>

      <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
        {Object.entries(groups).map(([date, sessions]) => (
          <div key={date}>
            <div style={{
              padding:    '6px 16px 4px',
              fontSize:   11,
              fontFamily: F.mono,
              color:      C.textTertiary,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              {date}
            </div>
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
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
                <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.title}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.preview}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Compact Sheet (floating 400×600 variant) ──────────────── */
function CompactSheet({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');

  return (
    <div style={{
      position:     'fixed',
      bottom:       80,
      right:        24,
      width:        400,
      height:       600,
      borderRadius: 16,
      background:   C.bgRaised,
      border:       `1px solid ${C.border}`,
      boxShadow:    `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${C.ai}20`,
      display:      'flex',
      flexDirection: 'column',
      overflow:     'hidden',
      zIndex:       9999,
    }}>
      {/* Header */}
      <div style={{
        padding:        '14px 16px',
        borderBottom:   `1px solid ${C.border}`,
        display:        'flex',
        alignItems:     'center',
        gap:            10,
      }}>
        <div style={{
          width:          28,
          height:         28,
          borderRadius:   8,
          background:     C.aiFaint,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       13,
          color:          C.ai,
        }}>
          ✦
        </div>
        <span style={{ fontFamily: F.display, fontWeight: 600, fontSize: 14, color: C.textPrimary, flex: 1 }}>
          Copilot
        </span>
        <button onClick={onClose} style={{
          background: 'transparent',
          border:     'none',
          color:      C.textTertiary,
          cursor:     'pointer',
          fontSize:   16,
          padding:    4,
        }}>
          ✕
        </button>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', color: C.textTertiary, fontSize: 12, fontFamily: F.body, marginBottom: 16 }}>
          Inicia una nueva conversación
        </div>
        <TypingIndicator />
      </div>

      {/* Input */}
      <div style={{
        padding:      '12px 14px',
        borderTop:    `1px solid ${C.border}`,
        display:      'flex',
        gap:          8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta algo…"
          style={{
            flex:         1,
            padding:      '9px 12px',
            borderRadius: 8,
            background:   C.bgElevated,
            border:       `1px solid ${C.border}`,
            color:        C.textPrimary,
            fontFamily:   F.body,
            fontSize:     13,
            outline:      'none',
          }}
        />
        <button style={{
          padding:      '9px 14px',
          borderRadius: 8,
          background:   C.ai,
          border:       'none',
          color:        '#fff',
          cursor:       'pointer',
          fontSize:     14,
        }}>
          ↑
        </button>
      </div>
    </div>
  );
}

/* ─── Floating button ───────────────────────────────────────── */
function FloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Abrir Copilot IA"
      style={{
        position:       'fixed',
        bottom:         24,
        right:          24,
        width:          52,
        height:         52,
        borderRadius:   '50%',
        background:     `linear-gradient(135deg, ${C.ai}, ${C.brand})`,
        border:         'none',
        boxShadow:      `0 8px 24px ${C.ai}50`,
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       22,
        color:          '#fff',
        zIndex:         9998,
        transition:     'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${C.ai}70`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${C.ai}50`;
      }}
    >
      ✦
    </button>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function CopilotPage() {
  const [messages, setMessages]           = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput]                 = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSession, setActiveSession] = useState('s1');
  const [isTyping, setIsTyping]           = useState(false);
  const [isEmpty, setIsEmpty]             = useState(false);
  const [showCompact, setShowCompact]     = useState(false);
  const [viewMode, setViewMode]           = useState<'full' | 'demo'>('full');
  const messagesEndRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;
    setInput('');
    setIsEmpty(false);
    const userMsg: Message = {
      id:        `m${Date.now()}`,
      role:      'user',
      text:      msg,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id:        `m${Date.now() + 1}`,
        role:      'assistant',
        text:      `Entendido. Estoy procesando tu consulta: "${msg}". Aquí hay información relevante que encontré.`,
        citations: [
          { entityType: 'propiedad', code: 'PAL-00201', label: 'Thames 1440' },
        ],
        timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, reply]);
    }, 1800);
  };

  const updateActionCard = (messageId: string, status: ActionCard['status']) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId && m.actionCard
        ? { ...m, actionCard: { ...m.actionCard, status } }
        : m
    ));
  };

  const handleNewSession = () => {
    setMessages([]);
    setIsEmpty(true);
    setActiveSession('');
  };

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      height:         '100vh',
      background:     C.bgBase,
      fontFamily:     F.body,
    }}>
      {/* Demo mode toggle (wireframe-only) */}
      <div style={{
        background:  C.bgRaised,
        borderBottom: `1px solid ${C.border}`,
        padding:     '8px 20px',
        display:     'flex',
        alignItems:  'center',
        gap:         16,
        fontSize:    12,
        fontFamily:  F.mono,
        color:       C.textTertiary,
      }}>
        <span style={{ color: C.ai, fontWeight: 600 }}>✦ WIREFRAME · RENA-78</span>
        <span style={{ marginLeft: 'auto' }}>Modo:</span>
        {(['full', 'demo'] as const).map(m => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            style={{
              padding:      '3px 10px',
              borderRadius: 6,
              background:   viewMode === m ? C.ai : 'transparent',
              border:       `1px solid ${viewMode === m ? C.ai : C.border}`,
              color:        viewMode === m ? '#fff' : C.textTertiary,
              cursor:       'pointer',
              fontFamily:   F.mono,
              fontSize:     11,
            }}
          >
            {m === 'full' ? 'Página completa' : 'Botón flotante'}
          </button>
        ))}
      </div>

      {/* Full page layout */}
      {viewMode === 'full' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Session sidebar */}
          <SessionSidebar
            collapsed={sidebarCollapsed}
            activeSession={activeSession}
            onSelect={setActiveSession}
            onNew={handleNewSession}
          />

          {/* Main chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Topbar */}
            <div style={{
              padding:      '12px 20px',
              borderBottom: `1px solid ${C.border}`,
              display:      'flex',
              alignItems:   'center',
              gap:          12,
              background:   C.bgBase,
            }}>
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                style={{
                  background: 'transparent',
                  border:     `1px solid ${C.border}`,
                  borderRadius: 6,
                  color:      C.textSecondary,
                  cursor:     'pointer',
                  padding:    '5px 8px',
                  fontSize:   14,
                }}
                title={sidebarCollapsed ? 'Mostrar historial' : 'Ocultar historial'}
              >
                ☰
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, color: C.ai }}>✦</span>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: C.textPrimary }}>
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
              flex:       1,
              overflowY:  'auto',
              padding:    '24px 20px',
              display:    'flex',
              flexDirection: 'column',
            }}>
              <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {isEmpty || messages.length === 0 ? (
                  <EmptyState onPrompt={handleSend} />
                ) : (
                  <>
                    {messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        onActionConfirm={msg.actionCard ? () => updateActionCard(msg.id, 'confirmed') : undefined}
                        onActionCancel={msg.actionCard  ? () => updateActionCard(msg.id, 'cancelled') : undefined}
                        onActionEdit={msg.actionCard    ? () => updateActionCard(msg.id, 'editing')   : undefined}
                      />
                    ))}
                    {isTyping && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </div>

            {/* Input area */}
            <div style={{
              padding:      '16px 20px',
              borderTop:    `1px solid ${C.border}`,
              background:   C.bgBase,
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
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Pregunta sobre propiedades, contactos, operaciones… (Enter para enviar)"
                    rows={1}
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
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = `${C.ai}60`; }}
                    onBlur={e  => { (e.target as HTMLElement).style.borderColor = C.border; }}
                  />
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  style={{
                    padding:      '12px 20px',
                    borderRadius: 12,
                    background:   input.trim() ? C.ai : C.bgElevated,
                    border:       'none',
                    color:        input.trim() ? '#fff' : C.textTertiary,
                    cursor:       input.trim() ? 'pointer' : 'default',
                    fontFamily:   F.body,
                    fontSize:     16,
                    transition:   'all 0.15s',
                    flexShrink:   0,
                  }}
                >
                  ↑
                </button>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* Floating button demo */}
      {viewMode === 'demo' && (
        <div style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          color:          C.textTertiary,
          fontFamily:     F.body,
          fontSize:       14,
          position:       'relative',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p>Vista de cualquier página de la app</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>El botón flotante aparece abajo a la derecha</p>
          </div>
          {showCompact
            ? <CompactSheet onClose={() => setShowCompact(false)} />
            : <FloatingButton onClick={() => setShowCompact(true)} />
          }
        </div>
      )}
    </div>
  );
}
