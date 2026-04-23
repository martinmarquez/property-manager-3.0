import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';
import { trpc } from '../../trpc.js';
import { OpportunityDrawer } from './OpportunityDrawer.js';

/* ── Design tokens ── */
const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgOverlay:     '#121D33',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  brand:         '#1654d9',
  brandLight:    '#4669ff',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  success:       '#18A659',
  warning:       '#E88A14',
  error:         '#E83B3B',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const msgs = defineMessages({
  title:         { id: 'pages.pipelines.title' },
  configBtn:     { id: 'pipelines.kanban.configBtn' },
  funnelBtn:     { id: 'pipelines.kanban.funnelBtn' },
  addOpp:        { id: 'pipelines.kanban.addOpp' },
  emptyTitle:    { id: 'pipelines.kanban.empty.title' },
  emptyBody:     { id: 'pipelines.kanban.empty.body' },
  slaOnTime:     { id: 'pipelines.sla.onTime' },
  slaWarning:    { id: 'pipelines.sla.warning' },
  slaOverdue:    { id: 'pipelines.sla.overdue' },
  daysInStage:   { id: 'pipelines.card.daysInStage' },
  noProperty:    { id: 'pipelines.card.noProperty' },
  addCard:       { id: 'pipelines.column.addCard' },
  deals:         { id: 'pipelines.column.deals' },
});

/* ── Types ── */
export type SlaStatus = 'ok' | 'warning' | 'overdue';

export interface Opportunity {
  id: string;
  contactName: string;
  contactAvatarInitials: string;
  contactAvatarHue: number;
  propertyRef: string | null;
  stageId: string;
  daysInStage: number;
  sla: SlaStatus;
  totalValue: number;
  currency: string;
  agentInitials: string;
  score: number;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  slaHours: number;
  kind: string;
  count: number;
  totalValue: string;
  opportunities: Opportunity[];
}

/* ── Helpers ── */
function getInitials(firstName: string | null, lastName: string | null, legalName: string | null): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (legalName) return legalName.slice(0, 2).toUpperCase();
  return '??';
}

function getContactName(firstName: string | null, lastName: string | null, legalName: string | null): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (legalName) return legalName;
  return '—';
}

function hashToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function computeSlaStatus(stageEnteredAt: Date | string | null, slaHours: number | null): SlaStatus {
  if (!stageEnteredAt || !slaHours) return 'ok';
  const entered = new Date(stageEnteredAt);
  const now = new Date();
  const hoursInStage = (now.getTime() - entered.getTime()) / (1000 * 60 * 60);
  if (hoursInStage > slaHours) return 'overdue';
  if (hoursInStage > slaHours * 0.75) return 'warning';
  return 'ok';
}

function computeDaysInStage(stageEnteredAt: Date | string | null): number {
  if (!stageEnteredAt) return 0;
  const entered = new Date(stageEnteredAt);
  return Math.max(0, Math.floor((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24)));
}

function avatarStyle(hue: number) {
  return {
    backgroundColor: `hsl(${hue} 55% 22%)`,
    color: `hsl(${hue} 80% 75%)`,
    border: `1.5px solid hsl(${hue} 55% 35%)`,
  };
}

/* ── SLA badge ── */
function SlaBadge({ status, intl }: { status: SlaStatus; intl: ReturnType<typeof useIntl> }) {
  const map: Record<SlaStatus, { color: string; label: string }> = {
    ok:      { color: C.success, label: intl.formatMessage(msgs.slaOnTime) },
    warning: { color: C.warning, label: intl.formatMessage(msgs.slaWarning) },
    overdue: { color: C.error,   label: intl.formatMessage(msgs.slaOverdue) },
  };
  const { color, label } = map[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontFamily: F.mono, fontWeight: 500,
      color, padding: '1px 7px', borderRadius: 10,
      background: `${color}18`, border: `1px solid ${color}40`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}

/* ── Opportunity card ── */
function OpportunityCard({
  opp, onOpen, onDragStart,
}: {
  opp: Opportunity;
  onOpen: (opp: Opportunity) => void;
  onDragStart: (oppId: string, fromStageId: string) => void;
}) {
  const intl = useIntl();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(opp.id, opp.stageId);
      }}
      onClick={() => onOpen(opp)}
      style={{
        background: C.bgOverlay,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '11px 13px',
        cursor: 'grab',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.borderStrong;
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Contact row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, fontFamily: F.body, flexShrink: 0,
          ...avatarStyle(opp.contactAvatarHue),
        }}>
          {opp.contactAvatarInitials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: F.body, lineHeight: 1.2 }}>
          {opp.contactName}
        </span>
      </div>

      {/* Property ref */}
      {opp.propertyRef ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: `${C.brand}18`, border: `1px solid ${C.brand}40`,
          borderRadius: 6, padding: '2px 8px', marginBottom: 8,
        }}>
          <span style={{ fontSize: 10, color: C.brandLight, fontFamily: F.mono, fontWeight: 500 }}>
            #{opp.propertyRef}
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body, fontStyle: 'italic' }}>
            {intl.formatMessage(msgs.noProperty)}
          </span>
        </div>
      )}

      {/* Bottom row: SLA + days + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlaBadge status={opp.sla} intl={intl} />
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>
            {intl.formatMessage(msgs.daysInStage, { days: opp.daysInStage })}
          </span>
        </div>
        {opp.score > 0 && (
          <div style={{
            minWidth: 22, height: 22, borderRadius: '50%',
            background: opp.score >= 70 ? `${C.success}25` : opp.score >= 40 ? `${C.warning}25` : C.bgRaised,
            border: `1px solid ${opp.score >= 70 ? C.success : opp.score >= 40 ? C.warning : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: opp.score >= 70 ? C.success : opp.score >= 40 ? C.warning : C.textSecondary,
            fontFamily: F.mono, flexShrink: 0,
          }}>
            {opp.score}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stage column ── */
function StageColumn({
  stage,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardOpen,
  onDragStart,
}: {
  stage: Stage;
  isDragOver: boolean;
  onDragOver: (stageId: string) => void;
  onDragLeave: () => void;
  onDrop: (toStageId: string) => void;
  onCardOpen: (opp: Opportunity) => void;
  onDragStart: (oppId: string, fromStageId: string) => void;
}) {
  const intl = useIntl();

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(stage.id); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(stage.id); }}
      style={{
        width: 280, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: C.bgRaised,
        border: `1px solid ${isDragOver ? stage.color : C.border}`,
        borderTop: `3px solid ${stage.color}`,
        borderRadius: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        boxShadow: isDragOver ? `0 0 0 2px ${stage.color}40` : 'none',
      }}
    >
      {/* Column header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: stage.color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: F.display }}>
              {stage.name}
            </span>
          </div>
          <span style={{
            fontSize: 11, fontFamily: F.mono, fontWeight: 500,
            color: C.textTertiary,
            background: C.bgBase, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '1px 8px',
          }}>
            {stage.count}
          </span>
        </div>
        {stage.count > 0 && (
          <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>
            USD {Number(stage.totalValue).toLocaleString('es-AR')}
          </span>
        )}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 10px 6px',
        display: 'flex', flexDirection: 'column', gap: 8,
        minHeight: 80,
      }}>
        {stage.opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opp={opp}
            onOpen={onCardOpen}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      {/* Footer add button */}
      <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.border}` }}>
        <button style={{
          width: '100%', padding: '7px',
          background: 'transparent', border: `1px dashed ${C.border}`,
          borderRadius: 8, cursor: 'pointer',
          color: C.textTertiary, fontSize: 12, fontFamily: F.body,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
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
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
          {intl.formatMessage(msgs.addCard)}
        </button>
      </div>
    </div>
  );
}

/* ── Empty state ── */
function KanbanEmpty({ intl }: { intl: ReturnType<typeof useIntl> }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: 48, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: `${C.brand}15`, border: `1.5px solid ${C.brand}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32,
      }}>
        📊
      </div>
      <div>
        <p style={{ fontSize: 18, fontWeight: 700, fontFamily: F.display, color: C.textPrimary, margin: '0 0 6px' }}>
          {intl.formatMessage(msgs.emptyTitle)}
        </p>
        <p style={{ fontSize: 14, color: C.textSecondary, fontFamily: F.body, maxWidth: 380, margin: 0 }}>
          {intl.formatMessage(msgs.emptyBody)}
        </p>
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */
function KanbanSkeleton() {
  return (
    <div style={{
      flex: 1, display: 'flex', gap: 16, padding: '20px 28px',
      alignItems: 'flex-start', overflowX: 'auto',
    }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          width: 280, flexShrink: 0, height: 300,
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${C.border}`, borderRadius: 10,
          animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 0.5,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}

/* ── Pipeline selector ── */
function PipelineSelector({
  pipelines,
  selectedId,
  onSelect,
}: {
  pipelines: Array<{ id: string; name: string; isDefault: boolean }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (pipelines.length <= 1) return null;

  return (
    <select
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      style={{
        padding: '6px 28px 6px 12px',
        background: C.bgRaised, border: `1px solid ${C.border}`,
        borderRadius: 8, color: C.textPrimary, fontSize: 13,
        fontFamily: F.body, cursor: 'pointer', outline: 'none',
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238DA0C0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {pipelines.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

/* ── Main page ── */
export function PipelineKanbanPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [draggingOppId, setDraggingOppId] = useState<string | null>(null);
  const [draggingFromStage, setDraggingFromStage] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [openOpp, setOpenOpp] = useState<Opportunity | null>(null);
  const dragLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: pipelines, isLoading: pipelinesLoading } = trpc.pipelines.list.useQuery();

  const activePipelineId = selectedPipelineId
    ?? pipelines?.find((p) => p.isDefault)?.id
    ?? pipelines?.[0]?.id
    ?? null;

  const { data: kanbanData, isLoading: kanbanLoading } = trpc.leads.kanban.useQuery(
    { pipelineId: activePipelineId! },
    { enabled: !!activePipelineId },
  );

  const moveMut = trpc.leads.moveStage.useMutation({
    onSuccess: () => {
      if (activePipelineId) {
        void utils.leads.kanban.invalidate({ pipelineId: activePipelineId });
      }
    },
  });

  const stages: Stage[] = useMemo(() => {
    if (!kanbanData) return [];
    return kanbanData.map((col) => ({
      id: col.stage.id,
      name: col.stage.name,
      color: col.stage.color ?? '#4669ff',
      slaHours: col.stage.slaHours ?? 0,
      kind: col.stage.kind,
      count: col.count,
      totalValue: col.totalValue,
      opportunities: col.leads.map((row) => {
        const contactName = getContactName(row.contactFirstName, row.contactLastName, row.contactLegalName);
        return {
          id: row.lead.id,
          contactName,
          contactAvatarInitials: getInitials(row.contactFirstName, row.contactLastName, row.contactLegalName),
          contactAvatarHue: hashToHue(row.lead.contactId),
          propertyRef: row.propertyRef ?? null,
          stageId: row.lead.stageId,
          daysInStage: computeDaysInStage(row.lead.stageEnteredAt),
          sla: computeSlaStatus(row.lead.stageEnteredAt, col.stage.slaHours),
          totalValue: Number(row.lead.expectedValue ?? 0),
          currency: row.lead.expectedCurrency ?? 'USD',
          agentInitials: '',
          score: row.lead.score ?? 0,
        };
      }),
    }));
  }, [kanbanData]);

  const hasAnyOpps = stages.some((s) => s.opportunities.length > 0);

  const handleDragStart = useCallback((oppId: string, fromStageId: string) => {
    setDraggingOppId(oppId);
    setDraggingFromStage(fromStageId);
  }, []);

  const handleDragOver = useCallback((stageId: string) => {
    if (dragLeaveTimerRef.current) clearTimeout(dragLeaveTimerRef.current);
    setDragOverStage(stageId);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragLeaveTimerRef.current = setTimeout(() => setDragOverStage(null), 80);
  }, []);

  const handleDrop = useCallback((toStageId: string) => {
    setDragOverStage(null);
    if (!draggingOppId || !draggingFromStage || draggingFromStage === toStageId) return;

    moveMut.mutate({ id: draggingOppId, targetStageId: toStageId });

    setDraggingOppId(null);
    setDraggingFromStage(null);
  }, [draggingOppId, draggingFromStage, moveMut]);

  const handleMoveStage = useCallback((oppId: string, toStageId: string) => {
    moveMut.mutate(
      { id: oppId, targetStageId: toStageId },
      { onSuccess: () => setOpenOpp(null) },
    );
  }, [moveMut]);

  const isLoading = pipelinesLoading || kanbanLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bgBase }}>
      {/* Page header */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            {intl.formatMessage(msgs.title)}
          </h1>
          {pipelines && activePipelineId && (
            <PipelineSelector
              pipelines={pipelines}
              selectedId={activePipelineId}
              onSelect={setSelectedPipelineId}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate({ to: '/pipelines/funnel' })}
            style={ghostBtn}
          >
            {intl.formatMessage(msgs.funnelBtn)}
          </button>
          <button
            onClick={() => navigate({ to: '/pipelines/config' })}
            style={ghostBtn}
          >
            {intl.formatMessage(msgs.configBtn)}
          </button>
          <button style={primaryBtn}>
            + {intl.formatMessage(msgs.addOpp)}
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <KanbanSkeleton />
      ) : !activePipelineId || !pipelines?.length ? (
        <KanbanEmpty intl={intl} />
      ) : !hasAnyOpps ? (
        <KanbanEmpty intl={intl} />
      ) : (
        <div style={{
          flex: 1, overflowX: 'auto', overflowY: 'hidden',
          display: 'flex', gap: 16, padding: '20px 28px',
          alignItems: 'flex-start',
        }}>
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              isDragOver={dragOverStage === stage.id}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onCardOpen={setOpenOpp}
              onDragStart={handleDragStart}
            />
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {openOpp && (
        <OpportunityDrawer
          opp={openOpp}
          stages={stages}
          onClose={() => setOpenOpp(null)}
          onMoveStage={handleMoveStage}
        />
      )}
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
