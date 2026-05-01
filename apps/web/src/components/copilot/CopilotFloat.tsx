import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';
import { useCopilotStream } from '../../hooks/useCopilotStream.js';
import type { StreamCitation, StreamActionSuggestion } from '../../hooks/useCopilotStream.js';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  border:        '#1F2D48',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
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
interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  timestamp: string;
}

const ENTITY_ICONS: Record<string, string> = {
  property: '🏠', contact: '👤', deal: '📋', document: '📄', task: '✅',
};

const ENTITY_ROUTES: Record<string, (id: string) => string> = {
  property: (id) => `/properties/${id}/edit`,
  contact:  (id) => `/contacts/${id}`,
  deal:     (id) => `/pipelines?deal=${id}`,
  document: (id) => `/documents/${id}`,
  task:     (id) => `/calendar?task=${id}`,
};

/* ─── Inline markdown (bold + inline code) ─────────────────── */
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

/* ─── Compact Sheet ─────────────────────────────────────────── */
function CompactSheet({
  onClose,
  onOpenFull,
  context,
}: {
  onClose: () => void;
  onOpenFull: () => void;
  context?: Record<string, unknown>;
}) {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const { isStreaming, sendMessage } = useCopilotStream();
  const createSession = trpc.copilot.createSession.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
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
      id:         streamMsgId,
      role:       'assistant',
      text:       '',
      isStreaming: true,
      timestamp:  new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    }]);

    try {
      let sid = sessionId;
      if (!sid) {
        const session = await createSession.mutateAsync({ context });
        sid = session.id;
        setSessionId(sid);
      }

      const result = await sendMessage(sid, msg, (streamedText) => {
        setMessages(prev => prev.map(m =>
          m.id === streamMsgId ? { ...m, text: streamedText } : m,
        ));
      });

      setMessages(prev => prev.map(m =>
        m.id === streamMsgId
          ? { ...m, id: result.turnId ?? streamMsgId, text: result.text, isStreaming: false }
          : m,
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamMsgId
          ? { ...m, text: 'Error al procesar tu mensaje.', isStreaming: false }
          : m,
      ));
    }
  }, [input, isStreaming, sessionId, createSession, context, sendMessage]);

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label="Copilot IA"
      style={{
        position:      'fixed',
        bottom:        80,
        right:         24,
        width:         400,
        height:        600,
        borderRadius:  16,
        background:    C.bgRaised,
        border:        `1px solid ${C.border}`,
        boxShadow:     `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${C.ai}20`,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        zIndex:        9999,
      }}
    >
      {/* Header */}
      <div style={{
        padding:      '14px 16px',
        borderBottom: `1px solid ${C.border}`,
        display:      'flex',
        alignItems:   'center',
        gap:          10,
        flexShrink:   0,
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
        <span style={{
          fontFamily: F.display,
          fontWeight: 600,
          fontSize:   14,
          color:      C.textPrimary,
          flex:       1,
        }}>
          Copilot
        </span>
        <button
          onClick={onOpenFull}
          title="Abrir en página completa"
          style={{
            background: 'transparent',
            border:     'none',
            color:      C.textTertiary,
            cursor:     'pointer',
            fontSize:   13,
            padding:    4,
            fontFamily: F.mono,
          }}
        >
          ⤢
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar Copilot"
          style={{
            background: 'transparent',
            border:     'none',
            color:      C.textTertiary,
            cursor:     'pointer',
            fontSize:   16,
            padding:    4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div style={{
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            height:         '100%',
            gap:            16,
          }}>
            <div style={{
              width:          48,
              height:         48,
              borderRadius:   14,
              background:     C.aiFaint,
              border:         `1px solid ${C.ai}40`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       22,
              color:          C.ai,
            }}>
              ✦
            </div>
            <div style={{
              textAlign:  'center',
              color:      C.textSecondary,
              fontSize:   13,
              fontFamily: F.body,
              lineHeight: 1.5,
            }}>
              ¿En qué puedo ayudarte?
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display:       'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems:    'flex-start',
              gap:           8,
              marginBottom:  12,
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{
                width:          24,
                height:         24,
                borderRadius:   '50%',
                background:     C.aiFaint,
                border:         `1px solid ${C.ai}40`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       10,
                flexShrink:     0,
                color:          C.ai,
              }}>
                ✦
              </div>
            )}
            <div style={{
              maxWidth:     '80%',
              padding:      '8px 12px',
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              background:   msg.role === 'user' ? C.brand : C.bgElevated,
              border:       msg.role === 'user' ? 'none' : `1px solid ${C.border}`,
              fontFamily:   F.body,
              fontSize:     13,
              lineHeight:   1.5,
              color:        C.textPrimary,
            }}>
              {msg.role === 'user' ? msg.text : renderInline(msg.text)}
              {msg.isStreaming && msg.text === '' && (
                <span style={{ color: C.textTertiary }}>…</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding:   '12px 14px',
        borderTop: `1px solid ${C.border}`,
        display:   'flex',
        gap:       8,
        flexShrink: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Pregunta algo…"
          disabled={isStreaming}
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
            opacity:      isStreaming ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          aria-label="Enviar mensaje"
          style={{
            padding:      '9px 14px',
            borderRadius: 8,
            background:   input.trim() && !isStreaming ? C.ai : C.bgElevated,
            border:       'none',
            color:        input.trim() && !isStreaming ? '#fff' : C.textTertiary,
            cursor:       input.trim() && !isStreaming ? 'pointer' : 'default',
            fontSize:     14,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

/* ─── Floating button ───────────────────────────────────────── */

export default function CopilotFloat({ context }: { context?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenFull = useCallback(() => {
    setOpen(false);
    navigate({ to: '/copilot' });
  }, [navigate]);

  return (
    <>
      {open ? (
        <CompactSheet
          onClose={() => setOpen(false)}
          onOpenFull={handleOpenFull}
          context={context}
        />
      ) : (
        <button
          onClick={() => setOpen(true)}
          title="Abrir Copilot IA"
          aria-label="Abrir Copilot IA"
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
      )}
    </>
  );
}
