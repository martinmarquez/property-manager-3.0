import React, { useState, useEffect } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  brand:         '#1654d9',
  brandLight:    '#5577FF',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  error:         '#E83B3B',
  success:       '#18A659',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const msgs = defineMessages({
  title:        { id: 'pipelines.config.title' },
  subtitle:     { id: 'pipelines.config.subtitle' },
  stageName:    { id: 'pipelines.config.stageName' },
  slaHours:     { id: 'pipelines.config.slaHours' },
  color:        { id: 'pipelines.config.color' },
  addStage:     { id: 'pipelines.config.addStage' },
  save:         { id: 'pipelines.config.save' },
  cancel:       { id: 'pipelines.config.cancel' },
  deleteStage:  { id: 'pipelines.config.deleteStage' },
  back:         { id: 'pipelines.config.back' },
  saved:        { id: 'pipelines.config.saved' },
});

const PRESET_COLORS = [
  '#5577FF', '#18A659', '#E88A14', '#9B59B6',
  '#E83B3B', '#14B8C8', '#F59E0B', '#EC4899',
];

const STAGE_KINDS = ['open', 'won', 'lost'] as const;
type StageKind = typeof STAGE_KINDS[number];

interface StageConfig {
  id: string;
  name: string;
  color: string;
  slaHours: number;
  kind: StageKind;
}

function StageRow({
  stage,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  stage: StageConfig;
  index: number;
  total: number;
  onUpdate: (id: string, field: keyof StageConfig, value: string | number) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  const intl = useIntl();
  const [showColorPicker, setShowColorPicker] = useState(false);

  const kindLabels: Record<StageKind, string> = {
    open: 'Abierta',
    won:  'Ganada',
    lost: 'Perdida',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 12px 1fr 80px 110px 120px 32px',
      gap: 10, alignItems: 'center',
      padding: '12px 14px',
      background: C.bgOverlay,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      position: 'relative',
    }}>
      {/* Reorder controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          disabled={index === 0}
          onClick={() => onMoveUp(stage.id)}
          style={{ ...iconBtn, opacity: index === 0 ? 0.3 : 1 }}
          title="Mover arriba"
        >▲</button>
        <button
          disabled={index === total - 1}
          onClick={() => onMoveDown(stage.id)}
          style={{ ...iconBtn, opacity: index === total - 1 ? 0.3 : 1 }}
          title="Mover abajo"
        >▼</button>
      </div>

      {/* Color swatch */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          style={{
            width: 22, height: 22, borderRadius: '50%',
            background: stage.color, border: `2px solid ${C.border}`,
            cursor: 'pointer', display: 'block',
          }}
          title={intl.formatMessage(msgs.color)}
        />
        {showColorPicker && (
          <div style={{
            position: 'absolute', top: 28, left: 0, zIndex: 20,
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: 10,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { onUpdate(stage.id, 'color', c); setShowColorPicker(false); }}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c,
                  border: stage.color === c ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name input */}
      <input
        value={stage.name}
        onChange={(e) => onUpdate(stage.id, 'name', e.target.value)}
        placeholder={intl.formatMessage(msgs.stageName)}
        style={{
          padding: '7px 11px', borderRadius: 8,
          background: C.bgBase, border: `1px solid ${C.border}`,
          color: C.textPrimary, fontSize: 13, fontFamily: F.body,
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = C.brand)}
        onBlur={(e) => (e.target.style.borderColor = C.border)}
      />

      {/* Kind selector */}
      <select
        value={stage.kind}
        onChange={(e) => onUpdate(stage.id, 'kind', e.target.value)}
        style={{
          padding: '6px 8px', borderRadius: 8,
          background: C.bgBase, border: `1px solid ${C.border}`,
          color: stage.kind === 'won' ? C.success : stage.kind === 'lost' ? C.error : C.textPrimary,
          fontSize: 12, fontFamily: F.mono, cursor: 'pointer', outline: 'none',
        }}
      >
        {STAGE_KINDS.map((k) => (
          <option key={k} value={k}>{kindLabels[k]}</option>
        ))}
      </select>

      {/* SLA hours */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          min={1}
          value={stage.slaHours}
          onChange={(e) => onUpdate(stage.id, 'slaHours', Number(e.target.value))}
          style={{
            padding: '7px 10px', borderRadius: 8, width: 64,
            background: C.bgBase, border: `1px solid ${C.border}`,
            color: C.textPrimary, fontSize: 13, fontFamily: F.mono,
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = C.brand)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, whiteSpace: 'nowrap' }}>hs SLA</span>
      </div>

      {/* Stage label preview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontFamily: F.mono, fontWeight: 500,
          color: stage.color,
          background: `${stage.color}18`, border: `1px solid ${stage.color}40`,
          borderRadius: 10, padding: '2px 9px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: stage.color }} />
          {stage.name || '—'}
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(stage.id)}
        style={{ ...iconBtn, color: C.error }}
        title={intl.formatMessage(msgs.deleteStage)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.error}20`)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
      >
        ✕
      </button>
    </div>
  );
}

export function PipelineConfigPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: pipelines, isLoading } = trpc.pipelines.list.useQuery();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const activePipeline = pipelines?.find((p) => p.id === selectedPipelineId)
    ?? pipelines?.find((p) => p.isDefault)
    ?? pipelines?.[0];

  useEffect(() => {
    if (activePipeline && !dirty) {
      setSelectedPipelineId(activePipeline.id);
      setStages(
        activePipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color ?? '#5577FF',
          slaHours: s.slaHours ?? 48,
          kind: (s.kind as StageKind) ?? 'open',
        })),
      );
    }
  }, [activePipeline, dirty]);

  const updateMut = trpc.pipelines.update.useMutation({
    onSuccess: () => {
      void utils.pipelines.list.invalidate();
      setSaved(true);
      setDirty(false);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleUpdate = (id: string, field: keyof StageConfig, value: string | number) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
    setSaved(false);
    setDirty(true);
  };

  const handleDelete = (id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
    setSaved(false);
    setDirty(true);
  };

  const handleMoveUp = (id: string) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const a = next[idx - 1] as StageConfig;
      const b = next[idx] as StageConfig;
      next[idx - 1] = b;
      next[idx] = a;
      return next;
    });
    setSaved(false);
    setDirty(true);
  };

  const handleMoveDown = (id: string) => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      const a = next[idx] as StageConfig;
      const b = next[idx + 1] as StageConfig;
      next[idx] = b;
      next[idx + 1] = a;
      return next;
    });
    setSaved(false);
    setDirty(true);
  };

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        color: PRESET_COLORS[prev.length % PRESET_COLORS.length] ?? '#5577FF',
        slaHours: 48,
        kind: 'open' as StageKind,
      },
    ]);
    setSaved(false);
    setDirty(true);
  };

  const handleSave = () => {
    if (!activePipeline) return;
    updateMut.mutate({
      id: activePipeline.id,
      stages: stages.map((s, idx) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        color: s.color,
        slaHours: s.slaHours || null,
        position: idx,
      })),
    });
  };

  const handlePipelineChange = (id: string) => {
    setSelectedPipelineId(id);
    setDirty(false);
    setSaved(false);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', background: C.bgBase }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `3px solid ${C.border}`, borderTopColor: C.brand,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: C.bgBase }}>
      {/* Header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => navigate({ to: '/pipelines' })}
            style={{ ...ghostBtn, padding: '6px 12px', fontSize: 13 }}
          >
            ← {intl.formatMessage(msgs.back)}
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
              {intl.formatMessage(msgs.title)}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.textSecondary, fontFamily: F.body }}>
              {intl.formatMessage(msgs.subtitle)}
            </p>
          </div>
          {pipelines && pipelines.length > 1 && (
            <select
              value={activePipeline?.id ?? ''}
              onChange={(e) => handlePipelineChange(e.target.value)}
              style={{
                padding: '6px 28px 6px 12px',
                background: C.bgRaised, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.textPrimary, fontSize: 13,
                fontFamily: F.body, cursor: 'pointer', outline: 'none',
              }}
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {saved && (
            <span style={{ fontSize: 13, color: C.success, fontFamily: F.body, display: 'flex', alignItems: 'center', gap: 5 }}>
              ✓ {intl.formatMessage(msgs.saved)}
            </span>
          )}
          {updateMut.error && (
            <span style={{ fontSize: 12, color: C.error, fontFamily: F.body, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {updateMut.error.message}
            </span>
          )}
          <button onClick={() => navigate({ to: '/pipelines' })} style={ghostBtn}>
            {intl.formatMessage(msgs.cancel)}
          </button>
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            style={{
              ...primaryBtn,
              opacity: updateMut.isPending ? 0.6 : 1,
            }}
          >
            {updateMut.isPending ? '...' : intl.formatMessage(msgs.save)}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px', maxWidth: 840, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Column labels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '32px 12px 1fr 80px 110px 120px 32px',
          gap: 10, padding: '0 14px 8px',
        }}>
          {['', '', intl.formatMessage(msgs.stageName), 'Tipo', intl.formatMessage(msgs.slaHours), intl.formatMessage(msgs.color), ''].map((label, i) => (
            <span key={i} style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </span>
          ))}
        </div>

        {/* Stage list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stages.map((stage, i) => (
            <StageRow
              key={stage.id}
              stage={stage}
              index={i}
              total={stages.length}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          ))}
        </div>

        {/* Add stage */}
        <button
          onClick={handleAddStage}
          style={{
            marginTop: 12, width: '100%', padding: '11px',
            background: 'transparent', border: `1.5px dashed ${C.border}`,
            borderRadius: 10, cursor: 'pointer',
            color: C.textTertiary, fontSize: 13, fontFamily: F.body,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
            (e.currentTarget as HTMLButtonElement).style.color = C.brandLight;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
          }}
        >
          <span style={{ fontSize: 16 }}>+</span>
          {intl.formatMessage(msgs.addStage)}
        </button>

        {/* Pipeline flow preview */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
            Vista previa del flujo
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {stages.map((stage, i) => (
              <React.Fragment key={stage.id}>
                <div style={{
                  padding: '6px 14px', borderRadius: 20,
                  background: `${stage.color}18`, border: `1px solid ${stage.color}40`,
                  fontSize: 12, fontFamily: F.body, fontWeight: 500,
                  color: stage.color, whiteSpace: 'nowrap',
                }}>
                  {stage.name || `Etapa ${i + 1}`}
                </div>
                {i < stages.length - 1 && (
                  <span style={{ color: C.textTertiary, fontSize: 16, lineHeight: 1 }}>→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared button styles ── */
const ghostBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 13, fontFamily: F.body, fontWeight: 500,
};

const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
  background: C.brand, border: 'none',
  color: '#fff', fontSize: 13, fontFamily: F.body, fontWeight: 600,
};

const iconBtn: React.CSSProperties = {
  width: 24, height: 14, borderRadius: 4, cursor: 'pointer',
  background: 'transparent', border: 'none',
  color: C.textTertiary, fontSize: 10, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  padding: 0, lineHeight: 1,
};
