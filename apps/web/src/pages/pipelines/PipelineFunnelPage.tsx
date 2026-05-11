import React, { useState } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useNavigate } from '@tanstack/react-router';

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
  title:       { id: 'pipelines.funnel.title' },
  back:        { id: 'pipelines.funnel.back' },
  colStage:    { id: 'pipelines.funnel.col.stage' },
  colCount:    { id: 'pipelines.funnel.col.count' },
  colConv:     { id: 'pipelines.funnel.col.conv' },
  colDays:     { id: 'pipelines.funnel.col.days' },
  colValue:    { id: 'pipelines.funnel.col.value' },
  totals:      { id: 'pipelines.funnel.totals' },
  hovDaysLabel:{ id: 'pipelines.funnel.hov.days' },
  hovValue:    { id: 'pipelines.funnel.hov.value' },
  period:      { id: 'pipelines.funnel.period' },
  period30:    { id: 'pipelines.funnel.period.30' },
  period90:    { id: 'pipelines.funnel.period.90' },
  periodAll:   { id: 'pipelines.funnel.period.all' },
});

interface FunnelStage {
  id: string;
  name: string;
  color: string;
  count: number;
  conversionPct: number | null;
  avgDays: number;
  totalValueUSD: number;
}

const MOCK_FUNNEL: FunnelStage[] = [
  { id: 's1', name: 'Nuevo Contacto',  color: '#5577FF', count: 48, conversionPct: null,  avgDays: 1.2,  totalValueUSD: 8_420_000 },
  { id: 's2', name: 'Calificado',      color: '#18A659', count: 31, conversionPct: 64.6,  avgDays: 2.8,  totalValueUSD: 6_975_000 },
  { id: 's3', name: 'Visita Agendada', color: '#E88A14', count: 22, conversionPct: 71.0,  avgDays: 4.1,  totalValueUSD: 5_340_000 },
  { id: 's4', name: 'Oferta',          color: '#9B59B6', count: 14, conversionPct: 63.6,  avgDays: 3.5,  totalValueUSD: 4_150_000 },
  { id: 's5', name: 'Negociación',     color: '#E83B3B', count: 9,  conversionPct: 64.3,  avgDays: 6.2,  totalValueUSD: 2_870_000 },
  { id: 's6', name: 'Cierre',          color: '#14B8C8', count: 6,  conversionPct: 66.7,  avgDays: 1.8,  totalValueUSD: 2_150_000 },
];

export function PipelineFunnelPage() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('30');

  const maxCount = Math.max(...MOCK_FUNNEL.map((s) => s.count));
  const totalValue = MOCK_FUNNEL[MOCK_FUNNEL.length - 1]!.totalValueUSD;
  const topCount = MOCK_FUNNEL[0]!.count;

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
            style={ghostBtn}
          >
            ← {intl.formatMessage(msgs.back)}
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
            {intl.formatMessage(msgs.title)}
          </h1>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 4, background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {(['30', '90', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 13px', borderRadius: 6, cursor: 'pointer', border: 'none',
                background: period === p ? C.brand : 'transparent',
                color: period === p ? '#fff' : C.textSecondary,
                fontSize: 12, fontFamily: F.body, fontWeight: 500,
                transition: 'background 0.15s',
              }}
            >
              {p === '30' ? intl.formatMessage(msgs.period30)
               : p === '90' ? intl.formatMessage(msgs.period90)
               : intl.formatMessage(msgs.periodAll)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Leads totales', value: topCount.toString(), sub: 'en el período' },
            { label: 'Cierres', value: MOCK_FUNNEL[MOCK_FUNNEL.length-1]!.count.toString(), sub: `${((MOCK_FUNNEL[MOCK_FUNNEL.length-1]!.count / topCount) * 100).toFixed(1)}% conversión total` },
            { label: 'Valor cerrado', value: `USD ${(totalValue / 1_000_000).toFixed(1)}M`, sub: 'promedio USD ' + Math.round(totalValue / MOCK_FUNNEL[MOCK_FUNNEL.length-1]!.count).toLocaleString('es-AR') },
            { label: 'Ciclo promedio', value: `${MOCK_FUNNEL.reduce((s, f) => s + f.avgDays, 0).toFixed(0)} días`, sub: 'de lead a cierre' },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1, padding: '16px 20px',
              background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 12,
            }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: C.textTertiary, fontFamily: F.body, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {stat.label}
              </p>
              <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
                {stat.value}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: C.textSecondary, fontFamily: F.body }}>
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Funnel chart */}
        <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 28px' }}>
          <p style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 600, fontFamily: F.display, color: C.textPrimary }}>
            Embudo de conversión
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MOCK_FUNNEL.map((stage, i) => {
              const widthPct = (stage.count / maxCount) * 100;
              const isHovered = hoveredId === stage.id;

              return (
                <div key={stage.id}>
                  {/* Conversion arrow between stages */}
                  {i > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0 2px 8px', marginBottom: 2 }}>
                      <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>↓</span>
                      <span style={{ fontSize: 11, fontFamily: F.mono, color: stage.conversionPct! >= 70 ? C.success : stage.conversionPct! >= 50 ? C.warning : C.error }}>
                        {stage.conversionPct?.toFixed(1)}% conversión
                      </span>
                    </div>
                  )}
                  <div
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(stage.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Bar */}
                    <div style={{
                      height: 44, borderRadius: 8,
                      width: `${widthPct}%`,
                      background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}99 100%)`,
                      display: 'flex', alignItems: 'center', paddingLeft: 14,
                      gap: 12, transition: 'opacity 0.15s',
                      opacity: isHovered ? 1 : 0.88,
                      boxShadow: isHovered ? `0 0 0 2px ${stage.color}60` : 'none',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F.body, color: '#fff', whiteSpace: 'nowrap' }}>
                        {stage.name}
                      </span>
                      <span style={{ fontSize: 22, fontWeight: 800, fontFamily: F.display, color: '#fff', lineHeight: 1 }}>
                        {stage.count}
                      </span>
                    </div>

                    {/* Hover tooltip */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', left: `${widthPct}%`, top: '50%',
                        transform: 'translateY(-50%)',
                        marginLeft: 10,
                        background: C.bgOverlay, border: `1px solid ${stage.color}60`,
                        borderRadius: 8, padding: '8px 12px', zIndex: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        whiteSpace: 'nowrap',
                      }}>
                        <p style={{ margin: '0 0 3px', fontSize: 12, fontFamily: F.body, color: C.textSecondary }}>
                          Días promedio: <strong style={{ color: C.textPrimary }}>{stage.avgDays}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: 12, fontFamily: F.body, color: C.textSecondary }}>
                          Valor total: <strong style={{ color: C.textPrimary }}>USD {(stage.totalValueUSD / 1_000_000).toFixed(2)}M</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats table */}
        <div style={{ background: C.bgRaised, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.body }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {[
                  intl.formatMessage(msgs.colStage),
                  intl.formatMessage(msgs.colCount),
                  intl.formatMessage(msgs.colConv),
                  intl.formatMessage(msgs.colDays),
                  intl.formatMessage(msgs.colValue),
                ].map((h) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: C.textTertiary,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_FUNNEL.map((stage, i) => (
                <tr
                  key={stage.id}
                  style={{
                    borderBottom: i < MOCK_FUNNEL.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: hoveredId === stage.id ? C.bgOverlay : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setHoveredId(stage.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: C.textPrimary }}>{stage.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
                    {stage.count}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {stage.conversionPct ? (
                      <span style={{
                        fontSize: 12, fontFamily: F.mono, fontWeight: 500,
                        color: stage.conversionPct >= 70 ? C.success : stage.conversionPct >= 50 ? C.warning : C.error,
                        background: stage.conversionPct >= 70 ? `${C.success}18` : stage.conversionPct >= 50 ? `${C.warning}18` : `${C.error}18`,
                        padding: '2px 8px', borderRadius: 10,
                      }}>
                        {stage.conversionPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, fontFamily: F.mono }}>
                    {stage.avgDays} días
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, fontFamily: F.mono }}>
                    USD {(stage.totalValueUSD / 1_000_000).toFixed(2)}M
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${C.border}`, background: C.bgBase }}>
                <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {intl.formatMessage(msgs.totals)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, fontFamily: F.display, color: C.textPrimary }}>
                  {topCount}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: F.mono, color: C.brandLight }}>
                  {((MOCK_FUNNEL[MOCK_FUNNEL.length-1]!.count / topCount) * 100).toFixed(1)}% total
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary, fontFamily: F.mono }}>
                  {MOCK_FUNNEL.reduce((s, f) => s + f.avgDays, 0).toFixed(0)} días
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: F.mono, color: C.textPrimary, fontWeight: 600 }}>
                  USD {(totalValue / 1_000_000).toFixed(2)}M
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: `1px solid ${C.border}`,
  color: C.textSecondary, fontSize: 13, fontFamily: F.body, fontWeight: 500,
};
