import React, { useRef, useMemo } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatMoney } from '@corredor/core';
import type { PropertyRow, PropertyStatus } from '../../routes/properties/-types.js';

const C = {
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  border:    '#1F2D48',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
};

const STATUS_COLORS: Record<PropertyStatus, string> = {
  active: '#18A659', reserved: '#F59E0B',
  sold: '#6B7FD7', paused: '#6B809E', archived: '#3A4E6A',
};

const CARD_HEIGHT = 310;
const GAP = 14;
const COLS = 4;

const messages = defineMessages({
  statusActive:   { id: 'properties.status.active' },
  statusReserved: { id: 'properties.status.reserved' },
  statusSold:     { id: 'properties.status.sold' },
  statusPaused:   { id: 'properties.status.paused' },
  statusArchived: { id: 'properties.status.archived' },
  opSale:           { id: 'properties.operation.sale.short' },
  opRent:           { id: 'properties.operation.rent.short' },
  opTempRent:       { id: 'properties.operation.temp_rent.short' },
  opCommercialRent: { id: 'properties.operation.commercial_rent.short' },
  opCommercialSale: { id: 'properties.operation.commercial_sale.short' },
  priceNone: { id: 'properties.price.none' },
  loading:   { id: 'properties.table.loading' },
  empty:     { id: 'properties.table.empty' },
  featured:  { id: 'filter.featured' },
});

interface PropertyCardsProps {
  rows: PropertyRow[];
  isLoading: boolean;
  onCardClick: (id: string) => void;
}

export function PropertyCards({ rows, isLoading, onCardClick }: PropertyCardsProps) {
  const intl = useIntl();
  const parentRef = useRef<HTMLDivElement>(null);

  const statusLabels: Record<PropertyStatus, string> = useMemo(() => ({
    active:   intl.formatMessage(messages.statusActive),
    reserved: intl.formatMessage(messages.statusReserved),
    sold:     intl.formatMessage(messages.statusSold),
    paused:   intl.formatMessage(messages.statusPaused),
    archived: intl.formatMessage(messages.statusArchived),
  }), [intl]);

  const opLabels: Record<string, string> = useMemo(() => ({
    sale:            intl.formatMessage(messages.opSale),
    rent:            intl.formatMessage(messages.opRent),
    temp_rent:       intl.formatMessage(messages.opTempRent),
    commercial_rent: intl.formatMessage(messages.opCommercialRent),
    commercial_sale: intl.formatMessage(messages.opCommercialSale),
  }), [intl]);

  const rowGroups: PropertyRow[][] = [];
  for (let i = 0; i < rows.length; i += COLS) {
    rowGroups.push(rows.slice(i, i + COLS));
  }

  const virtualizer = useVirtualizer({
    count: rowGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 320, color: C.textTertiary, fontSize: 14 }}>
        {intl.formatMessage(messages.loading)}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{ overflowY: 'auto', height: 'calc(100vh - 110px)', padding: '16px 20px' }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const group = rowGroups[vItem.index]!;
          return (
            <div
              key={vItem.key}
              style={{
                position: 'absolute', top: vItem.start, left: 0, right: 0,
                display: 'flex', gap: GAP,
              }}
            >
              {group.map((prop) => {
                const statusColor = STATUS_COLORS[prop.status];
                const priceStr =
                  prop.hasPricePublic && prop.priceAmount != null
                    ? formatMoney(intl, prop.priceCurrency ?? 'ARS', prop.priceAmount)
                    : intl.formatMessage(messages.priceNone);

                return (
                  <button
                    key={prop.id}
                    onClick={() => onCardClick(prop.id)}
                    style={{
                      flex: `0 0 calc(${100 / COLS}% - ${(GAP * (COLS - 1)) / COLS}px)`,
                      background: C.bgRaised,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = '#253350';
                      el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.borderColor = C.border;
                      el.style.boxShadow = 'none';
                    }}
                  >
                    {/* Photo */}
                    <div style={{ height: 150, background: C.bgSubtle, position: 'relative', overflow: 'hidden' }}>
                      {prop.thumbUrl ? (
                        <img src={prop.thumbUrl} alt={prop.title ?? ''} loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B809E" strokeWidth="1.2" aria-hidden="true">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                      {/* Status badge */}
                      <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(7,13,26,0.82)', backdropFilter: 'blur(4px)',
                        border: `1px solid ${statusColor}55`, borderRadius: 4,
                        padding: '2px 7px',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 500, color: statusColor,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
                        {statusLabels[prop.status]}
                      </div>
                      {prop.featured && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(245,158,11,0.15)',
                          border: '1px solid rgba(245,158,11,0.4)',
                          borderRadius: 4, padding: '2px 6px',
                          fontSize: 10, color: '#F59E0B', fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          {intl.formatMessage(messages.featured)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 3 }}>
                        {prop.operationKind ? (opLabels[prop.operationKind] ?? prop.operationKind) : ''}
                        {prop.referenceCode && ` · ${prop.referenceCode}`}
                      </div>
                      <div style={{
                        fontSize: 15, fontWeight: 600, color: C.textPrimary,
                        fontFamily: "'DM Mono', monospace", marginBottom: 6,
                      }}>
                        {priceStr}
                      </div>
                      <div style={{
                        fontSize: 12, color: C.textSecondary, marginBottom: 8,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {[prop.addressStreet, prop.addressNumber].filter(Boolean).join(' ') || '—'}
                        {prop.neighborhood && ` · ${prop.neighborhood}`}
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: C.textTertiary }}>
                        {prop.bedrooms != null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M2 4v16M22 4v16M2 12h20M6 12v4M18 12v4M6 8v4M18 8v4"/>
                            </svg>
                            {prop.bedrooms}
                          </span>
                        )}
                        {prop.bathrooms != null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M9 6l2 2-5 5a1 1 0 0 0 0 1.4l5 5a1 1 0 0 0 1.4 0l5-5-2-2"/>
                              <circle cx="7.5" cy="6.5" r="1.5"/>
                            </svg>
                            {prop.bathrooms}
                          </span>
                        )}
                        {prop.coveredAreaM2 != null && (
                          <span>{prop.coveredAreaM2} m²</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {Array.from({ length: COLS - group.length }).map((_, i) => (
                <div key={`empty-${i}`}
                  style={{ flex: `0 0 calc(${100 / COLS}% - ${(GAP * (COLS - 1)) / COLS}px)` }} />
              ))}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.textTertiary, fontSize: 14 }}>
          {intl.formatMessage(messages.empty)}
        </div>
      )}
    </div>
  );
}
