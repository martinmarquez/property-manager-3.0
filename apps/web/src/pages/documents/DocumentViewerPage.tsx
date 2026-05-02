import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  bgSubtle:      '#162035',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    '#1654d918',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  successFaint:  '#18A65920',
  warning:       '#E88A14',
  warningFaint:  '#E88A1420',
  error:         '#E83B3B',
  errorFaint:    '#E83B3B20',
  ai:            '#7E3AF2',
  aiFaint:       '#7E3AF220',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types ─────────────────────────────────────────────────── */
export type DocStatus = 'borrador' | 'pendiente_firma' | 'firmado' | 'vencido' | 'cancelado';

interface Signer {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  signedAt?: string;
  declinedReason?: string;
  order: number;
}

interface QAMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citation?: { page: number; snippet: string };
}

/* ─── Mock data ─────────────────────────────────────────────── */
const MOCK_SIGNERS_PENDING: Signer[] = [
  { id: 's1', name: 'Juan García',   role: 'Comprador', email: 'juan@example.com',    status: 'signed',  signedAt: '2026-04-24 11:32', order: 1 },
  { id: 's2', name: 'Carlos Ramos',  role: 'Vendedor',  email: 'carlos@example.com',  status: 'pending', order: 2 },
  { id: 's3', name: 'María López',   role: 'Corredor',  email: 'maria@belgrano.com',  status: 'pending', order: 3 },
];

const MOCK_SIGNERS_SIGNED: Signer[] = [
  { id: 's1', name: 'Juan García',   role: 'Comprador', email: 'juan@example.com',    status: 'signed',  signedAt: '2026-04-24 11:32', order: 1 },
  { id: 's2', name: 'Carlos Ramos',  role: 'Vendedor',  email: 'carlos@example.com',  status: 'signed',  signedAt: '2026-04-25 14:08', order: 2 },
  { id: 's3', name: 'María López',   role: 'Corredor',  email: 'maria@belgrano.com',  status: 'signed',  signedAt: '2026-04-25 16:21', order: 3 },
];

const MOCK_QA: QAMessage[] = [
  {
    id: 'q1',
    role: 'user',
    text: '¿Cuál es la fecha límite para la escritura?',
  },
  {
    id: 'a1',
    role: 'assistant',
    text: 'La fecha límite para la escritura es el **30 de junio de 2026**.',
    citation: { page: 2, snippet: '"Las partes se obligan a firmar el Boleto de Compraventa antes del 30 de junio de 2026."' },
  },
];

/* ─── Status Badge ───────────────────────────────────────────── */
const STATUS_META: Record<DocStatus, { label: string; bg: string; color: string }> = {
  borrador:         { label: 'Borrador',          bg: C.bgSubtle,       color: C.textSecondary },
  pendiente_firma:  { label: 'Pendiente de firma', bg: C.warningFaint,   color: C.warning },
  firmado:          { label: 'Firmado',            bg: C.successFaint,   color: C.success },
  vencido:          { label: 'Vencido',            bg: C.errorFaint,     color: C.error },
  cancelado:        { label: 'Cancelado',          bg: C.errorFaint,     color: C.error },
};

function StatusBadge({ status }: { status: DocStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 6, fontSize: 13, fontWeight: 700,
      background: m.bg, color: m.color, letterSpacing: '0.03em',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: m.color, flexShrink: 0,
      }} />
      {m.label}
    </span>
  );
}

/* ─── Signer Row ─────────────────────────────────────────────── */
function SignerRow({ signer, showReminder, docStatus }: { signer: Signer; showReminder: boolean; docStatus: DocStatus }) {
  const [reminderSent, setReminderSent] = useState(false);

  const statusIcon = {
    signed: (
      <span style={{ color: C.success, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      </span>
    ),
    pending: (
      <span style={{ color: C.warning, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
        </svg>
      </span>
    ),
    declined: (
      <span style={{ color: C.error, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
    ),
    expired: (
      <span style={{ color: C.textTertiary, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </span>
    ),
  }[signer.status];

  return (
    <div style={{
      padding: '12px 0',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      {/* Order + status */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 2 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: signer.status === 'signed' ? C.success : signer.status === 'declined' ? C.error : C.bgSubtle,
          border: `2px solid ${signer.status === 'signed' ? C.success : signer.status === 'declined' ? C.error : C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700,
          color: signer.status === 'signed' || signer.status === 'declined' ? '#fff' : C.textTertiary,
        }}>
          {signer.status === 'signed' ? '✓' : signer.order}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{signer.name}</span>
          <span style={{ fontSize: 11, color: C.textTertiary }}>{signer.role}</span>
          {statusIcon}
        </div>
        <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: signer.signedAt ? 4 : 0 }}>
          {signer.email}
        </div>
        {signer.signedAt && (
          <div style={{ fontSize: 11, color: C.success }}>Firmó el {signer.signedAt}</div>
        )}
        {signer.declinedReason && (
          <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>
            Rechazó: &ldquo;{signer.declinedReason}&rdquo;
          </div>
        )}
      </div>

      {/* Reminder button */}
      {showReminder && signer.status === 'pending' && (
        <button
          type="button"
          disabled={reminderSent}
          onClick={() => setReminderSent(true)}
          title={reminderSent ? 'Recordatorio enviado. Disponible en 24h.' : 'Enviar recordatorio'}
          style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: 'transparent',
            border: `1px solid ${reminderSent ? C.border : C.brand}`,
            color: reminderSent ? C.textTertiary : C.brand,
            cursor: reminderSent ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            opacity: reminderSent ? 0.6 : 1,
          }}
        >
          {reminderSent ? 'Enviado' : 'Recordatorio'}
        </button>
      )}
    </div>
  );
}

/* ─── Action buttons per status ──────────────────────────────── */
function ActionButtons({ status, onSendForSign }: { status: DocStatus; onSendForSign: () => void }) {
  const btnPrimary = (label: string, onClick?: () => void) => (
    <button type="button" onClick={onClick} style={{
      width: '100%', padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 700,
      background: C.brand, border: 'none', color: '#fff', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      {label}
    </button>
  );

  const btnSecondary = (label: string, icon?: React.ReactNode) => (
    <button type="button" style={{
      width: '100%', padding: '8px 0', borderRadius: 7, fontSize: 13, fontWeight: 600,
      background: 'transparent', border: `1px solid ${C.border}`,
      color: C.textSecondary, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      {icon}
      {label}
    </button>
  );

  const btnDanger = (label: string) => (
    <button type="button" style={{
      width: '100%', padding: '8px 0', borderRadius: 7, fontSize: 13, fontWeight: 600,
      background: 'transparent', border: `1px solid ${C.error}40`,
      color: C.error, cursor: 'pointer',
    }}>
      {label}
    </button>
  );

  const downloadIcon = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {status === 'borrador' && <>
        {btnPrimary('Enviar para firma →', onSendForSign)}
        {btnSecondary('Descargar borrador', downloadIcon)}
        {btnSecondary('Regenerar documento')}
      </>}
      {status === 'pendiente_firma' && <>
        {btnPrimary('Ver estado de firmas')}
        {btnSecondary('Enviar recordatorio general')}
        {btnDanger('Cancelar solicitud de firma')}
      </>}
      {status === 'firmado' && <>
        {btnPrimary('Descargar PDF firmado', undefined)}
        {btnSecondary('Descargar auditoría', downloadIcon)}
        {btnSecondary('Ver trazabilidad completa')}
      </>}
      {(status === 'vencido' || status === 'cancelado') && <>
        {btnPrimary('Crear nueva versión')}
        {btnSecondary('Archivar documento')}
      </>}
    </div>
  );
}

/* ─── Document Q&A ───────────────────────────────────────────── */
function DocumentQA() {
  const [messages, setMessages] = useState<QAMessage[]>(MOCK_QA);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: QAMessage = { id: `u-${Date.now()}`, role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => {
      const aiMsg: QAMessage = {
        id: `a-${Date.now()}`, role: 'assistant',
        text: 'La comisión del corredor es del **3% del precio de venta**.',
        citation: { page: 3, snippet: '"El corredor percibirá una comisión equivalente al 3% del precio pactado..."' },
      };
      setMessages(prev => [...prev, aiMsg]);
      setThinking(false);
    }, 1400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* AI label */}
      <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: C.aiFaint, color: C.ai, letterSpacing: '0.08em',
        }}>IA</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>Consultar el documento</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map(msg => (
          <div key={msg.id}>
            <div style={{
              maxWidth: '90%', padding: '8px 12px', borderRadius: 8,
              marginLeft: msg.role === 'user' ? 'auto' : 0,
              background: msg.role === 'user' ? C.brandFaint : C.bgSubtle,
              border: `1px solid ${msg.role === 'user' ? C.brand + '30' : C.border}`,
              fontSize: 13, color: C.textPrimary, lineHeight: 1.5,
            }}>
              {msg.text.replace(/\*\*([^*]+)\*\*/g, '$1')}
            </div>
            {msg.citation && (
              <div style={{
                marginTop: 6, padding: '6px 10px', borderRadius: 6,
                background: C.aiFaint, border: `1px solid ${C.ai}30`,
                fontSize: 11, color: C.ai,
              }}>
                <span style={{ fontWeight: 700 }}>p. {msg.citation.page}</span>
                {' '}— <em>{msg.citation.snippet}</em>
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: C.bgSubtle, border: `1px solid ${C.border}`,
            fontSize: 13, color: C.textTertiary,
            display: 'flex', gap: 4, alignItems: 'center',
          }}>
            <span style={{ animation: 'pulse 1s infinite' }}>●</span>
            <span style={{ animation: 'pulse 1s 0.2s infinite' }}>●</span>
            <span style={{ animation: 'pulse 1s 0.4s infinite' }}>●</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Preguntá sobre el contrato…"
          style={{
            flex: 1, background: C.bgSubtle, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '7px 10px', color: C.textPrimary,
            fontSize: 12, fontFamily: F.body, outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          style={{
            padding: '7px 12px', borderRadius: 6, background: C.ai,
            border: 'none', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22,2 15,22 11,13 2,9"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── PDF Viewer — real react-pdf when url provided, mock otherwise ─ */
function PDFViewer({ status, url }: { status: DocStatus; url?: string }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [numPages, setNumPages] = useState(3);
  const totalPages = numPages;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.bgSubtle }}>
      {/* PDF toolbar */}
      <div style={{
        padding: '8px 16px', background: C.bgRaised, borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{
          width: 28, height: 28, borderRadius: 4, background: 'transparent',
          border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          opacity: page <= 1 ? 0.4 : 1,
        }}>‹</button>
        <span style={{ fontSize: 12, color: C.textSecondary }}>
          {page} / {totalPages}
        </span>
        <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{
          width: 28, height: 28, borderRadius: 4, background: 'transparent',
          border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          opacity: page >= totalPages ? 0.4 : 1,
        }}>›</button>

        <div style={{ width: 1, height: 20, background: C.border }} />

        <button type="button" onClick={() => setZoom(z => Math.max(50, z - 25))} style={{
          width: 28, height: 28, borderRadius: 4, background: 'transparent',
          border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16,
        }}>−</button>
        <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 40, textAlign: 'center' }}>{zoom}%</span>
        <button type="button" onClick={() => setZoom(z => Math.min(200, z + 25))} style={{
          width: 28, height: 28, borderRadius: 4, background: 'transparent',
          border: `1px solid ${C.border}`, color: C.textSecondary, cursor: 'pointer', fontSize: 16,
        }}>+</button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>
          boleto-2026-0042.pdf
        </span>
      </div>

      {/* PDF page */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', justifyContent: 'center' }}>
        {url ? (
          <Document
            file={url}
            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
            loading={<div style={{ color: C.textSecondary, padding: 40 }}>Cargando PDF…</div>}
            error={<div style={{ color: C.error, padding: 40 }}>Error al cargar el PDF.</div>}
          >
            <Page
              pageNumber={page}
              width={794 * zoom / 100}
              renderTextLayer
              renderAnnotationLayer
            />
          </Document>
        ) : (
        <div style={{
          width: `${794 * zoom / 100}px`,
          minHeight: `${1123 * zoom / 100}px`,
          background: '#fff', color: '#111827',
          padding: `${60 * zoom / 100}px ${72 * zoom / 100}px`,
          boxShadow: '0 4px 24px #00000060',
          borderRadius: 2,
          fontFamily: 'Georgia, serif',
          fontSize: `${14 * zoom / 100}px`, lineHeight: 1.8,
          position: 'relative',
          transition: 'all 150ms',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: `${11 * zoom / 100}px`, color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Inmobiliaria Belgrano</div>
              <div style={{ fontSize: `${10 * zoom / 100}px`, color: '#9ca3af' }}>CUCICBA 09876 · Av. Cabildo 2000</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: `${10 * zoom / 100}px`, color: '#9ca3af' }}>
              <div>DOC-2026-0042</div>
              <div>25/04/2026</div>
            </div>
          </div>

          <h1 style={{ textAlign: 'center', fontSize: `${20 * zoom / 100}px`, fontWeight: 700, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            BOLETO DE COMPRAVENTA
          </h1>

          {page === 1 && <>
            <p>En la ciudad de <strong>Buenos Aires</strong>, a los <strong>25 de abril de 2026</strong>, entre:</p>
            <p><strong>PARTE VENDEDORA:</strong> Carlos Ramos, DNI 22.345.678, con domicilio en Av. del Libertador 5000, CABA; en adelante &ldquo;EL VENDEDOR&rdquo;.</p>
            <p><strong>PARTE COMPRADORA:</strong> Juan García, DNI 30.456.789, con domicilio en Thames 2200, Palermo; en adelante &ldquo;EL COMPRADOR&rdquo;.</p>
            <p>Convienen lo siguiente con relación al inmueble sito en <strong>Av. Corrientes 1234, CABA</strong> (Matrícula 1-12345, Folio Real 8765, Tomo 234, Folio 45).</p>
            <p><strong>ARTÍCULO 1 — PRECIO Y CONDICIONES DE PAGO.</strong> La operación se pactó en la suma de <strong>USD 250.000 (dólares estadounidenses doscientos cincuenta mil)</strong>, que el COMPRADOR pagará al VENDEDOR de la siguiente forma:</p>
            <p>a) USD 11.000 entregados en concepto de seña al suscribirse la Reserva de fecha 10/04/2026; b) USD 50.000 al firmarse el presente instrumento; c) USD 189.000 saldo de precio en el acto de escritura.</p>
          </>}
          {page === 2 && <>
            <p><strong>ARTÍCULO 2 — PLAZO PARA ESCRITURAR.</strong> Las partes acuerdan otorgar la escritura traslativa de dominio antes del <strong>30 de junio de 2026</strong>.</p>
            <p><strong>ARTÍCULO 3 — INTERVENCIÓN DEL CORREDOR.</strong> El suscripto Corredor Inmobiliario Matrícula CUCICBA 09876, María López, interviene en la presente operación en carácter de intermediario, percibiendo el 3% del precio pactado.</p>
            <p><strong>ARTÍCULO 4 — CLÁUSULA PENAL.</strong> En caso de incumplimiento de cualquiera de las partes, la parte incumplidora deberá abonar el 10% del valor total como penalidad, en los términos del art. 1086 del C.C.C.N.</p>
          </>}
          {page === 3 && <>
            <p><strong>ARTÍCULO 5 — DECLARACIÓN AFIP.</strong> Las partes declaran bajo juramento que los fondos utilizados son de origen lícito, conforme Resolución UIF 30/2017.</p>
            <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, textAlign: 'center' }}>
              {['Juan García\nComprador', 'Carlos Ramos\nVendedor', 'María López\nCorredor'].map((party, i) => (
                <div key={i}>
                  <div style={{ height: 60, borderBottom: '1px solid #374151', marginBottom: 8 }} />
                  <div style={{ fontSize: `${11 * zoom / 100}px`, whiteSpace: 'pre-line', color: '#374151' }}>{party}</div>
                </div>
              ))}
            </div>
          </>}

          {/* Footer */}
          <div style={{
            position: 'absolute', bottom: `${20 * zoom / 100}px`, left: `${72 * zoom / 100}px`, right: `${72 * zoom / 100}px`,
            fontSize: `${9 * zoom / 100}px`, color: '#9ca3af',
            display: 'flex', justifyContent: 'space-between',
            borderTop: '1px solid #e5e7eb', paddingTop: `${8 * zoom / 100}px`,
          }}>
            <span>DOC-2026-0042 · Inmobiliaria Belgrano</span>
            <span>Página {page} / {totalPages}</span>
          </div>

          {/* Draft watermark */}
          {status === 'borrador' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', overflow: 'hidden',
            }}>
              <span style={{
                fontSize: `${120 * zoom / 100}px`, fontWeight: 900,
                color: '#0000001A', transform: 'rotate(-40deg)',
                letterSpacing: '0.2em', userSelect: 'none', whiteSpace: 'nowrap',
              }}>BORRADOR</span>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

/* ─── Metadata Panel ─────────────────────────────────────────── */
function MetadataPanel({
  status,
  signers,
  onSendForSign,
}: {
  status: DocStatus;
  signers: Signer[];
  onSendForSign: () => void;
}) {
  const [rightTab, setRightTab] = useState<'info' | 'signers' | 'qa'>('info');

  const rightTabs = [
    { key: 'info',    label: 'Detalles' },
    { key: 'signers', label: `Firmantes (${signers.length})` },
    { key: 'qa',      label: 'Consultar IA' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Status + title */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <StatusBadge status={status} />
          <button type="button" style={{
            background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.textTertiary, fontSize: 12, padding: '4px 8px', cursor: 'pointer',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        <h2 style={{ fontFamily: F.display, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>
          Boleto de Compraventa
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>
          DOC-2026-0042 · Av. Corrientes 1234, CABA
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', padding: '8px 20px 0', borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 4 }}>
        {rightTabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setRightTab(t.key)}
            style={{
              padding: '6px 12px', borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 600,
              background: rightTab === t.key ? C.bgSubtle : 'transparent',
              border: `1px solid ${rightTab === t.key ? C.border : 'transparent'}`,
              borderBottom: 'none',
              color: rightTab === t.key ? C.textPrimary : C.textSecondary,
              cursor: 'pointer',
            }}
          >
            {t.key === 'qa' ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.ai, fontSize: 9, fontWeight: 900 }}>IA</span>
                {t.label}
              </span>
            ) : t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rightTab === 'info' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {/* Key metadata */}
            {[
              { label: 'Plantilla', value: 'Boleto de compraventa' },
              { label: 'Versión', value: 'v2' },
              { label: 'Generado', value: '25 abr 2026, 10:15' },
              { label: 'Generado por', value: 'María López' },
              { label: 'Propiedad', value: 'Av. Corrientes 1234, CABA' },
              { label: 'Comprador', value: 'Juan García' },
              { label: 'Vendedor', value: 'Carlos Ramos' },
              { label: 'Firma digital req.', value: 'Sí (firma_digital)' },
              { label: 'Proveedor e-sign', value: 'Signaturit' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: `1px solid ${C.border}20`,
                alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 12, color: C.textTertiary, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 12, color: C.textPrimary, textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <ActionButtons status={status} onSendForSign={onSendForSign} />
            </div>
          </div>
        )}

        {rightTab === 'signers' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0' }}>
            {/* Progress indicator */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: C.textSecondary, fontWeight: 600 }}>
                  {signers.filter(s => s.status === 'signed').length} de {signers.length} firmas completadas
                </span>
                <span style={{ color: status === 'firmado' ? C.success : C.warning, fontWeight: 700 }}>
                  {status === 'firmado' ? '100%' : `${Math.round(signers.filter(s => s.status === 'signed').length / signers.length * 100)}%`}
                </span>
              </div>
              <div style={{ height: 6, background: C.bgSubtle, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: status === 'firmado' ? C.success : C.brand,
                  width: `${signers.filter(s => s.status === 'signed').length / signers.length * 100}%`,
                  transition: 'width 400ms ease',
                }} />
              </div>
              {status === 'pendiente_firma' && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: C.textTertiary }}>
                  Flujo secuencial · Vence 9 may 2026 · Recordatorio cada 2 días
                </p>
              )}
            </div>

            {signers.map(s => (
              <SignerRow
                key={s.id}
                signer={s}
                showReminder={status === 'pendiente_firma'}
                docStatus={status}
              />
            ))}

            {status === 'pendiente_firma' && (
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <ActionButtons status={status} onSendForSign={onSendForSign} />
              </div>
            )}
          </div>
        )}

        {rightTab === 'qa' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DocumentQA />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export interface DocumentViewerPageProps {
  documentId: string;
  /** Signed R2/storage URL — renders real PDF via react-pdf when provided */
  pdfUrl?: string;
  /** For wireframe demo, pass a status */
  previewStatus?: DocStatus;
  onSendForSign?: () => void;
}

export function DocumentViewerPage({
  documentId: _id,
  pdfUrl,
  previewStatus = 'pendiente_firma',
  onSendForSign,
}: DocumentViewerPageProps) {
  const [status, setStatus] = useState<DocStatus>(previewStatus);
  const signers = status === 'firmado' ? MOCK_SIGNERS_SIGNED : MOCK_SIGNERS_PENDING;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bgBase, fontFamily: F.body }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 20px', borderBottom: `1px solid ${C.border}`,
        background: C.bgRaised, flexShrink: 0,
      }}>
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.textSecondary, fontSize: 13, padding: '5px 10px', cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Documentos
        </button>

        <div style={{ width: 1, height: 20, background: C.border }} />

        <div>
          <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>
            Boleto de Compraventa
          </span>
          <span style={{ marginLeft: 8, fontSize: 12, color: C.textTertiary }}>DOC-2026-0042</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Status switcher (demo only) */}
        <div style={{ display: 'flex', gap: 4, fontSize: 11, color: C.textTertiary }}>
          <span>Demo:</span>
          {(['borrador', 'pendiente_firma', 'firmado', 'cancelado'] as DocStatus[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              style={{
                padding: '3px 8px', borderRadius: 4, fontSize: 11,
                background: status === s ? C.bgSubtle : 'transparent',
                border: `1px solid ${status === s ? C.border : 'transparent'}`,
                color: status === s ? C.textPrimary : C.textTertiary,
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: PDF viewer + metadata panel ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: PDF viewer */}
        <div style={{ flex: '0 0 62%', overflow: 'hidden', borderRight: `1px solid ${C.border}` }}>
          <PDFViewer status={status} url={pdfUrl} />
        </div>

        {/* Right: metadata + actions */}
        <div style={{ flex: '0 0 38%', background: C.bgRaised, overflow: 'hidden' }}>
          <MetadataPanel
            status={status}
            signers={signers}
            onSendForSign={onSendForSign ?? (() => alert('Abrir modal de firma'))}
          />
        </div>
      </div>
    </div>
  );
}
