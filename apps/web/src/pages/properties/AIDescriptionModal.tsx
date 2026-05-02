import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { trpc } from '../../trpc.js';

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgOverlay:     'rgba(7,13,26,0.85)',
  border:        '#1F2D48',
  borderHover:   '#2A3D5C',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  ai:            '#7E3AF2',
  aiLight:       '#9B59FF',
  aiFaint:       'rgba(126,58,242,0.12)',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  error:         '#E83B3B',
  errorFaint:    'rgba(232,59,59,0.10)',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

/* ─── Types (aligned with backend) ─────────────────────────── */
type Tone   = 'formal' | 'casual' | 'lujo';
type Portal = 'zonaprop' | 'mercadolibre' | 'argenprop' | 'general';
type Step   = 'idle' | 'generating' | 'streaming' | 'done';

/* ─── i18n ─────────────────────────────────────────────────── */
const m = defineMessages({
  title:              { id: 'aiDescription.title' },
  toneLabel:          { id: 'aiDescription.tone.label' },
  toneFormal:         { id: 'aiDescription.tone.formal' },
  toneFormalDesc:     { id: 'aiDescription.tone.formal.desc' },
  toneCasual:         { id: 'aiDescription.tone.casual' },
  toneCasualDesc:     { id: 'aiDescription.tone.casual.desc' },
  toneLuxury:         { id: 'aiDescription.tone.luxury' },
  toneLuxuryDesc:     { id: 'aiDescription.tone.luxury.desc' },
  portalLabel:        { id: 'aiDescription.portal.label' },
  portalAll:          { id: 'aiDescription.portal.all' },
  portalHint:         { id: 'aiDescription.portal.hint' },
  highlightLabel:     { id: 'aiDescription.highlight.label' },
  highlightPh:        { id: 'aiDescription.highlight.placeholder' },
  button:             { id: 'aiDescription.button' },
  generating:         { id: 'aiDescription.generating' },
  generated:          { id: 'aiDescription.generated' },
  editingHint:        { id: 'aiDescription.editing.hint' },
  charCount:          { id: 'aiDescription.charCount' },
  save:               { id: 'aiDescription.save' },
  regenerate:         { id: 'aiDescription.regenerate' },
  cancel:             { id: 'aiDescription.cancel' },
  comparison:         { id: 'aiDescription.comparison' },
  comparisonBack:     { id: 'aiDescription.comparison.back' },
  error:              { id: 'aiDescription.error' },
  overwriteTitle:     { id: 'aiDescription.overwrite.title' },
  overwriteBody:      { id: 'aiDescription.overwrite.body' },
  overwriteConfirm:   { id: 'aiDescription.overwrite.confirm' },
  overwriteCancel:    { id: 'aiDescription.overwrite.cancel' },
  draftsTitle:        { id: 'aiDescription.drafts.title' },
  draftsEmpty:        { id: 'aiDescription.drafts.empty' },
  draftsUse:          { id: 'aiDescription.drafts.use' },
  draftsDelete:       { id: 'aiDescription.drafts.delete' },
  draftsActive:       { id: 'aiDescription.drafts.active' },
  draftSaved:         { id: 'aiDescription.draft.saved' },
  diffCurrent:        { id: 'aiDescription.diff.current' },
  diffGenerated:      { id: 'aiDescription.diff.generated' },
  close:              { id: 'aiDescription.close' },
});

/* ─── Tone / Portal config ─────────────────────────────────── */
const TONE_CONFIG: { key: Tone; icon: string }[] = [
  { key: 'formal', icon: '🏛️' },
  { key: 'casual', icon: '😊' },
  { key: 'lujo',   icon: '✨' },
];

const PORTAL_OPTIONS: { key: Portal; label: string }[] = [
  { key: 'zonaprop',     label: 'ZonaProp' },
  { key: 'mercadolibre', label: 'MercadoLibre' },
  { key: 'argenprop',    label: 'Argenprop' },
  { key: 'general',      label: 'General' },
];

const TONE_MSG: Record<Tone, { label: keyof typeof m; desc: keyof typeof m }> = {
  formal: { label: 'toneFormal', desc: 'toneFormalDesc' },
  casual: { label: 'toneCasual', desc: 'toneCasualDesc' },
  lujo:   { label: 'toneLuxury', desc: 'toneLuxuryDesc' },
};

/* ─── Streaming typewriter hook ────────────────────────────── */
function useStreamingText(target: string, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !target) return;
    setDisplayed('');
    setDone(false);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx += Math.floor(Math.random() * 4) + 2;
      if (idx >= target.length) {
        setDisplayed(target);
        setDone(true);
        clearInterval(intervalRef.current!);
      } else {
        setDisplayed(target.slice(0, idx));
      }
    }, 25);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [target, active]);

  return { displayed, done };
}

/* ─── Overwrite warning ────────────────────────────────────── */
function OverwriteWarning({
  onConfirm,
  onCancel,
  intl,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  intl: ReturnType<typeof useIntl>;
}) {
  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(2,6,18,0.6)', backdropFilter: 'blur(2px)',
        }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 1101,
        width: 380, background: C.bgRaised,
        border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(232,138,20,0.12)', border: '1px solid rgba(232,138,20,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>⚠️</div>
          <div>
            <div style={{
              fontFamily: F.display, fontWeight: 700, fontSize: 15, color: C.textPrimary,
            }}>
              {intl.formatMessage(m.overwriteTitle)}
            </div>
            <div style={{
              fontFamily: F.body, fontSize: 12, color: C.textSecondary,
              marginTop: 4, lineHeight: 1.5,
            }}>
              {intl.formatMessage(m.overwriteBody)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '9px 0', borderRadius: 8,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
          }}>
            {intl.formatMessage(m.overwriteCancel)}
          </button>
          <button type="button" onClick={onConfirm} style={{
            flex: 1, padding: '9px 0', borderRadius: 8,
            background: C.error, border: 'none',
            color: '#fff', fontFamily: F.body, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {intl.formatMessage(m.overwriteConfirm)}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Diff view ────────────────────────────────────────────── */
function DiffView({ original, generated, intl }: { original: string; generated: string; intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{ display: 'grid', gap: 12 }} data-ai-diff>
      <div>
        <div style={{
          padding: '6px 12px', borderRadius: '8px 8px 0 0',
          background: C.bgElevated, border: `1px solid ${C.border}`, borderBottom: 'none',
          fontFamily: F.mono, fontSize: 11, fontWeight: 600,
          color: C.textTertiary, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
        }}>
          {intl.formatMessage(m.diffCurrent)}
        </div>
        <div style={{
          padding: 14, borderRadius: '0 0 8px 8px',
          background: C.errorFaint, border: `1px solid ${C.error}25`,
          fontFamily: F.body, fontSize: 13, color: C.textSecondary,
          lineHeight: 1.6, minHeight: 120, whiteSpace: 'pre-wrap' as const,
        }}>
          {original}
        </div>
      </div>
      <div>
        <div style={{
          padding: '6px 12px', borderRadius: '8px 8px 0 0',
          background: C.aiFaint, border: `1px solid ${C.ai}30`, borderBottom: 'none',
          fontFamily: F.mono, fontSize: 11, fontWeight: 600,
          color: C.ai, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>✦</span>
          {intl.formatMessage(m.diffGenerated)}
        </div>
        <div style={{
          padding: 14, borderRadius: '0 0 8px 8px',
          background: C.aiFaint, border: `1px solid ${C.ai}30`,
          fontFamily: F.body, fontSize: 13, color: C.textPrimary,
          lineHeight: 1.6, minHeight: 120, whiteSpace: 'pre-wrap' as const,
        }}>
          {generated}
        </div>
      </div>
    </div>
  );
}

/* ─── Draft row ────────────────────────────────────────────── */
function DraftRow({
  draft,
  onUse,
  onDelete,
  deleting,
  intl,
}: {
  draft: {
    id: string;
    tone: string;
    targetPortal: string | null;
    body: string;
    isDraft: boolean;
    createdAt: Date | string;
  };
  onUse: () => void;
  onDelete: () => void;
  deleting: boolean;
  intl: ReturnType<typeof useIntl>;
}) {
  const isActive = !draft.isDraft;
  const date = new Date(draft.createdAt);
  const portalLabel = PORTAL_OPTIONS.find(p => p.key === draft.targetPortal)?.label ?? draft.targetPortal ?? 'General';

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: isActive ? C.successFaint : C.bgElevated,
      border: `1px solid ${isActive ? `${C.success}30` : C.border}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontFamily: F.mono, fontSize: 11, fontWeight: 600,
          color: C.textTertiary, textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
        }}>
          {draft.tone} · {portalLabel}
        </span>
        <span style={{
          fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
        }}>
          {date.toLocaleDateString()}
        </span>
        {isActive && (
          <span style={{
            marginLeft: 'auto', padding: '2px 8px', borderRadius: 6,
            background: C.successFaint, border: `1px solid ${C.success}40`,
            fontFamily: F.mono, fontSize: 10, fontWeight: 700,
            color: C.success, textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}>
            {intl.formatMessage(m.draftsActive)}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: F.body, fontSize: 12, color: C.textSecondary,
        lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
      }}>
        {draft.body}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {draft.isDraft && (
          <button type="button" onClick={onUse} style={{
            padding: '5px 12px', borderRadius: 6,
            background: C.brandFaint, border: `1px solid ${C.brand}40`,
            color: C.brandLight, fontFamily: F.body, fontSize: 11,
            fontWeight: 600, cursor: 'pointer',
          }}>
            {intl.formatMessage(m.draftsUse)}
          </button>
        )}
        <button type="button" onClick={onDelete} disabled={deleting} style={{
          padding: '5px 12px', borderRadius: 6,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textTertiary, fontFamily: F.body, fontSize: 11,
          cursor: deleting ? 'default' : 'pointer',
          opacity: deleting ? 0.5 : 1,
        }}>
          {intl.formatMessage(m.draftsDelete)}
        </button>
      </div>
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────── */
interface AIDescriptionModalProps {
  open:                 boolean;
  onClose:              () => void;
  onSave?:              (text: string) => void;
  propertyId:           string;
  propertyRef?:         string;
  existingDescription?: string;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function AIDescriptionModal({
  open,
  onClose,
  onSave,
  propertyId,
  propertyRef,
  existingDescription,
}: AIDescriptionModalProps) {
  const intl = useIntl();

  const [tone, setTone]                   = useState<Tone>('formal');
  const [portal, setPortal]               = useState<Portal>('zonaprop');
  const [destacar, setDestacar]           = useState('');
  const [step, setStep]                   = useState<Step>('idle');
  const [editableText, setEditableText]   = useState('');
  const [streamTarget, setStreamTarget]   = useState('');
  const [showDiff, setShowDiff]           = useState(false);
  const [showOverwrite, setShowOverwrite] = useState(false);
  const [showDrafts, setShowDrafts]       = useState(false);
  const [genError, setGenError]           = useState('');
  const [savedToast, setSavedToast]       = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);

  const [genMeta, setGenMeta] = useState<{
    model: string;
    promptTokens: number;
    completionTokens: number;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // tRPC mutations
  const generateMut  = trpc.propertyDescription.generate.useMutation();
  const saveMut      = trpc.propertyDescription.save.useMutation();
  const deleteMut    = trpc.propertyDescription.delete.useMutation();

  // tRPC query for drafts
  const draftsQuery = trpc.propertyDescription.list.useQuery(
    { propertyId },
    { enabled: open && !!propertyId },
  );

  // Streaming typewriter
  const { displayed: streamText, done: streamDone } = useStreamingText(
    streamTarget,
    step === 'streaming',
  );

  // Transition from streaming → done when typewriter finishes
  useEffect(() => {
    if (streamDone && step === 'streaming') {
      setStep('done');
      setEditableText(streamTarget);
    }
  }, [streamDone, step, streamTarget]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('idle');
      setStreamTarget('');
      setEditableText('');
      setShowDiff(false);
      setShowOverwrite(false);
      setShowDrafts(false);
      setGenError('');
      setSavedToast(false);
      setGenMeta(null);
      setDeletingId(null);
    }
  }, [open]);

  // Escape key to close (blocked during generation/streaming)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showOverwrite && step !== 'generating' && step !== 'streaming') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose, showOverwrite, step]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus modal on open, restore focus on close
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => { prev?.focus(); };
  }, [open]);

  // Auto-resize textarea
  useEffect(() => {
    if (step === 'done' && textareaRef.current) {
      const ta = textareaRef.current;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [editableText, step]);

  const handleGenerate = useCallback(async () => {
    setStep('generating');
    setGenError('');
    setShowDiff(false);
    try {
      const result = await generateMut.mutateAsync({
        propertyId,
        tone,
        portal,
        extraInstructions: destacar.trim() || undefined,
      });
      setGenMeta({
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      });
      setStreamTarget(result.body);
      setStep('streaming');
    } catch {
      setGenError(intl.formatMessage(m.error));
      setStep('idle');
    }
  }, [propertyId, tone, portal, destacar, generateMut, intl]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleSave = useCallback(async () => {
    const textToSave = editableText.trim();
    if (!textToSave) return;

    if (existingDescription && !showOverwrite) {
      setShowOverwrite(true);
      return;
    }

    try {
      await saveMut.mutateAsync({
        propertyId,
        body: textToSave,
        tone,
        portal,
        extraInstructions: destacar.trim() || undefined,
        model: genMeta?.model ?? 'claude-sonnet-4-6-20250514',
        promptTokens: genMeta?.promptTokens ?? 0,
        completionTokens: genMeta?.completionTokens ?? 0,
        setActive: true,
      });
      draftsQuery.refetch();
      onSave?.(textToSave);
      setSavedToast(true);
      setTimeout(() => onClose(), 800);
    } catch {
      setGenError(intl.formatMessage(m.error));
    }
  }, [editableText, existingDescription, showOverwrite, propertyId, tone, portal, destacar, genMeta, saveMut, draftsQuery, onSave, onClose, intl]);

  const handleConfirmOverwrite = useCallback(() => {
    setShowOverwrite(false);
    handleSave();
  }, [handleSave]);

  const handleDeleteDraft = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMut.mutateAsync({ id });
      draftsQuery.refetch();
    } catch { /* swallow */ }
    setDeletingId(null);
  }, [deleteMut, draftsQuery]);

  const handleUseDraft = useCallback((body: string) => {
    setEditableText(body);
    setStep('done');
    setShowDrafts(false);
  }, []);

  if (!open) return null;

  const displayText = step === 'streaming' ? streamText : editableText;
  const isWorking = step === 'generating' || step === 'streaming';
  const drafts = draftsQuery.data ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={isWorking ? undefined : onClose}
        style={{
          position: 'fixed', inset: 0,
          background: C.bgOverlay, backdropFilter: 'blur(4px)',
          zIndex: 1000, cursor: isWorking ? 'default' : 'pointer',
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={intl.formatMessage(m.title)}
        tabIndex={-1}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%', maxWidth: 680, maxHeight: '90vh',
          overflowY: 'auto',
          background: C.bgRaised,
          border: `1px solid ${C.border}`, borderRadius: 16,
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${C.ai}15`,
          zIndex: 1001,
        }}
        data-ai-modal
      >
        {/* ── Header ── */}
        <div style={{
          padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, background: C.bgRaised, zIndex: 1,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.aiFaint, border: `1px solid ${C.ai}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, color: C.ai,
          }}>
            ✦
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: F.display, fontWeight: 700, fontSize: 16,
              color: C.textPrimary, margin: 0,
            }}>
              {intl.formatMessage(m.title)}
            </h2>
            {propertyRef && (
              <p style={{
                fontFamily: F.mono, fontSize: 11,
                color: C.textTertiary, margin: '2px 0 0',
              }}>
                {propertyRef}
              </p>
            )}
          </div>

          {/* Drafts toggle */}
          <button
            type="button"
            onClick={() => setShowDrafts(!showDrafts)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: showDrafts ? C.aiFaint : 'transparent',
              border: `1px solid ${showDrafts ? `${C.ai}40` : C.border}`,
              color: showDrafts ? C.aiLight : C.textTertiary,
              fontFamily: F.mono, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              letterSpacing: '0.04em',
            }}
          >
            {intl.formatMessage(m.draftsTitle)}
            {drafts.length > 0 && (
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: C.ai, color: '#fff',
                fontSize: 10, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {drafts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={isWorking ? undefined : onClose}
            disabled={isWorking}
            aria-label={intl.formatMessage(m.close)}
            style={{
              background: 'transparent', border: 'none',
              color: isWorking ? C.textTertiary : C.textTertiary,
              cursor: isWorking ? 'default' : 'pointer',
              fontSize: 18, padding: 6, lineHeight: 1, borderRadius: 6,
              opacity: isWorking ? 0.3 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: 24 }}>
          {/* Drafts panel */}
          {showDrafts && (
            <div style={{
              marginBottom: 22, padding: 16, borderRadius: 12,
              background: C.bgElevated, border: `1px solid ${C.border}`,
            }}>
              <h3 style={{
                fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                color: C.textTertiary, marginTop: 0, marginBottom: 12,
              }}>
                {intl.formatMessage(m.draftsTitle)}
              </h3>
              {drafts.length === 0 ? (
                <p style={{
                  fontFamily: F.body, fontSize: 13, color: C.textTertiary,
                  margin: 0, fontStyle: 'italic',
                }}>
                  {intl.formatMessage(m.draftsEmpty)}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {drafts.map((draft) => (
                    <DraftRow
                      key={draft.id}
                      draft={draft}
                      onUse={() => handleUseDraft(draft.body)}
                      onDelete={() => handleDeleteDraft(draft.id)}
                      deleting={deletingId === draft.id}
                      intl={intl}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tone selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={{
              display: 'block', fontFamily: F.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.07em', textTransform: 'uppercase' as const,
              color: C.textTertiary, marginBottom: 10,
            }}>
              {intl.formatMessage(m.toneLabel)}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TONE_CONFIG.map(({ key, icon }) => {
                const selected = tone === key;
                const msgs = TONE_MSG[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTone(key)}
                    disabled={isWorking}
                    style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: selected ? C.aiFaint : C.bgElevated,
                      border: `1px solid ${selected ? C.ai : C.border}`,
                      cursor: isWorking ? 'default' : 'pointer',
                      textAlign: 'left' as const,
                      transition: 'all 0.15s',
                      opacity: isWorking ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                    <div style={{
                      fontFamily: F.body, fontWeight: 600, fontSize: 13,
                      color: selected ? C.textPrimary : C.textSecondary,
                    }}>
                      {intl.formatMessage(m[msgs.label])}
                    </div>
                    <div style={{
                      fontFamily: F.body, fontSize: 11,
                      color: selected ? C.aiLight : C.textTertiary, marginTop: 2,
                    }}>
                      {intl.formatMessage(m[msgs.desc])}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portal selector */}
          <div style={{ marginBottom: 22 }}>
            <label style={{
              display: 'block', fontFamily: F.mono, fontSize: 11, fontWeight: 600,
              letterSpacing: '0.07em', textTransform: 'uppercase' as const,
              color: C.textTertiary, marginBottom: 10,
            }}>
              {intl.formatMessage(m.portalLabel)}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {PORTAL_OPTIONS.map(({ key, label }) => {
                const selected = portal === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPortal(key)}
                    disabled={isWorking}
                    style={{
                      padding: '7px 16px', borderRadius: 8,
                      background: selected ? C.brandFaint : C.bgElevated,
                      border: `1px solid ${selected ? `${C.brand}60` : C.border}`,
                      color: selected ? C.brandLight : C.textSecondary,
                      fontFamily: F.body, fontSize: 13,
                      fontWeight: selected ? 600 : 400,
                      cursor: isWorking ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: isWorking ? 0.6 : 1,
                    }}
                  >
                    {key === 'general' ? intl.formatMessage(m.portalAll) : label}
                  </button>
                );
              })}
            </div>
            <p style={{
              fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 6,
            }}>
              {intl.formatMessage(m.portalHint)}
            </p>
          </div>

          {/* Destacar */}
          <div style={{ marginBottom: 22 }}>
            <label
              htmlFor="ai-desc-destacar"
              style={{
                display: 'block', fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                color: C.textTertiary, marginBottom: 8,
              }}
            >
              {intl.formatMessage(m.highlightLabel)}
            </label>
            <input
              id="ai-desc-destacar"
              value={destacar}
              onChange={e => setDestacar(e.target.value)}
              disabled={isWorking}
              maxLength={500}
              placeholder={intl.formatMessage(m.highlightPh)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                background: C.bgElevated, border: `1px solid ${C.border}`,
                color: C.textPrimary, fontFamily: F.body, fontSize: 13,
                outline: 'none', boxSizing: 'border-box' as const,
                opacity: isWorking ? 0.6 : 1,
              }}
              onFocus={e => { e.target.style.borderColor = `${C.ai}60`; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </div>

          {/* Error */}
          {genError && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: C.errorFaint, border: `1px solid ${C.error}30`,
              fontFamily: F.body, fontSize: 13, color: C.error,
            }}>
              {genError}
            </div>
          )}

          {/* Generate button (idle state) */}
          {step === 'idle' && (
            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%', padding: '12px 20px', borderRadius: 10,
                background: `linear-gradient(135deg, ${C.ai}, ${C.brand})`,
                border: 'none', color: '#fff',
                fontFamily: F.display, fontWeight: 700, fontSize: 15,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span>✦</span>
              {intl.formatMessage(m.button)}
            </button>
          )}

          {/* Generating spinner */}
          {step === 'generating' && (
            <div style={{
              padding: 24, textAlign: 'center' as const,
              display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: C.aiFaint, border: `1px solid ${C.ai}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'ai-desc-spin 2s linear infinite',
              }}>
                <span style={{ fontSize: 20, color: C.ai }}>✦</span>
              </div>
              <span style={{
                fontFamily: F.body, fontSize: 14, color: C.textSecondary,
              }}>
                {intl.formatMessage(m.generating)}
              </span>
            </div>
          )}

          {/* Streaming / done: preview area */}
          {(step === 'streaming' || step === 'done') && !showDiff && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 8,
              }}>
                <label style={{
                  fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                  color: step === 'done' ? C.ai : C.textTertiary,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {step === 'streaming' && (
                    <span style={{ animation: 'ai-desc-pulse 1s ease-in-out infinite' }}>●</span>
                  )}
                  {step === 'streaming'
                    ? intl.formatMessage(m.generating)
                    : `✦ ${intl.formatMessage(m.generated)}`}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {step === 'done' && existingDescription && (
                    <button
                      type="button"
                      onClick={() => setShowDiff(true)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: C.textTertiary, fontFamily: F.body, fontSize: 12,
                        cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      {intl.formatMessage(m.comparison)}
                    </button>
                  )}
                </div>
              </div>

              {step === 'streaming' ? (
                /* Read-only streaming preview */
                <>
                  <div style={{
                    padding: 16, borderRadius: 10,
                    background: C.aiFaint, border: `1px solid ${C.ai}30`,
                    fontFamily: F.body, fontSize: 13, color: C.textPrimary,
                    lineHeight: 1.7, minHeight: 100, position: 'relative' as const,
                    whiteSpace: 'pre-wrap' as const,
                  }}>
                    {displayText}
                    <span style={{
                      display: 'inline-block', width: 2, height: 14,
                      background: C.ai, marginLeft: 2, verticalAlign: 'text-bottom',
                      animation: 'ai-desc-cursor 0.8s step-end infinite',
                    }} />
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', marginTop: 4,
                  }}>
                    <span style={{
                      fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
                    }}>
                      {intl.formatMessage(m.charCount, { count: displayText.length })}
                    </span>
                  </div>
                </>
              ) : (
                /* Editable textarea in done state */
                <>
                  <textarea
                    ref={textareaRef}
                    value={editableText}
                    onChange={e => setEditableText(e.target.value)}
                    style={{
                      width: '100%', padding: 16, borderRadius: 10,
                      background: C.aiFaint, border: `1px solid ${C.ai}30`,
                      fontFamily: F.body, fontSize: 13, color: C.textPrimary,
                      lineHeight: 1.7, minHeight: 120,
                      outline: 'none', resize: 'vertical' as const,
                      boxSizing: 'border-box' as const,
                    }}
                    onFocus={e => { e.target.style.borderColor = C.ai; }}
                    onBlur={e => { e.target.style.borderColor = `${C.ai}30`; }}
                  />
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginTop: 4,
                  }}>
                    <span style={{
                      fontFamily: F.body, fontSize: 11, color: C.textTertiary,
                      fontStyle: 'italic',
                    }}>
                      {intl.formatMessage(m.editingHint)}
                    </span>
                    <span style={{
                      fontFamily: F.mono, fontSize: 11, color: C.textTertiary,
                    }}>
                      {intl.formatMessage(m.charCount, { count: editableText.length })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Diff / comparison view */}
          {showDiff && step === 'done' && existingDescription && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 10,
              }}>
                <label style={{
                  fontFamily: F.mono, fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.07em', textTransform: 'uppercase' as const,
                  color: C.textTertiary,
                }}>
                  {intl.formatMessage(m.comparison)}
                </label>
                <button
                  type="button"
                  onClick={() => setShowDiff(false)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: C.textTertiary, fontFamily: F.body, fontSize: 12,
                    cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  {intl.formatMessage(m.comparisonBack)}
                </button>
              </div>
              <DiffView original={existingDescription} generated={editableText} intl={intl} />
            </div>
          )}

          {/* Saved toast */}
          {savedToast && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: C.successFaint, border: `1px solid ${C.success}30`,
              fontFamily: F.body, fontSize: 13, color: C.success,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>✓</span>
              {intl.formatMessage(m.draftSaved)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 24px', borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 10, alignItems: 'center',
          position: 'sticky', bottom: 0, background: C.bgRaised,
        }}>
          {step === 'done' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMut.isPending || !editableText.trim()}
              style={{
                padding: '10px 24px', borderRadius: 8,
                background: C.brand, border: 'none',
                color: '#fff', fontFamily: F.body,
                fontWeight: 700, fontSize: 14,
                cursor: saveMut.isPending ? 'default' : 'pointer',
                opacity: saveMut.isPending || !editableText.trim() ? 0.5 : 1,
              }}
            >
              {intl.formatMessage(m.save)}
            </button>
          )}

          {(step === 'done' || step === 'generating') && (
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isWorking}
              style={{
                padding: '10px 18px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: isWorking ? C.textTertiary : C.textSecondary,
                fontFamily: F.body, fontSize: 14,
                cursor: isWorking ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>↺</span>
              {intl.formatMessage(m.regenerate)}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto', padding: '10px 18px', borderRadius: 8,
              background: 'transparent', border: 'none',
              color: C.textTertiary, fontFamily: F.body, fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {intl.formatMessage(m.cancel)}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ai-desc-pulse {
          0%, 100% { opacity: 1; color: ${C.ai}; }
          50%       { opacity: 0.4; }
        }
        @keyframes ai-desc-cursor {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes ai-desc-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        [data-ai-diff] { grid-template-columns: 1fr 1fr; }
        @media (max-width: 767px) {
          [data-ai-diff] { grid-template-columns: 1fr !important; }
          [data-ai-modal] {
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            max-width: 100% !important;
            max-height: 100vh !important;
            height: 100vh !important;
            border-radius: 0 !important;
            border: none !important;
          }
        }
      `}</style>

      {showOverwrite && (
        <OverwriteWarning
          intl={intl}
          onConfirm={handleConfirmOverwrite}
          onCancel={() => setShowOverwrite(false)}
        />
      )}
    </>
  );
}
