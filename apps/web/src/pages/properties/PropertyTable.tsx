import React, { useRef, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useIntl, defineMessages } from 'react-intl';
import { formatMoney } from '@corredor/core';
import type { PropertyRow, PropertyStatus } from '../../routes/properties/-types.js';

const C = {
  bgBase:       '#070D1A',
  bgRaised:     '#0D1526',
  border:       '#1F2D48',
  textPrimary:  '#EFF4FF',
  textSecondary:'#8DA0C0',
  textTertiary: '#506180',
  brand:        '#1654d9',
};

const ROW_HEIGHT = 52;

const STATUS_COLORS: Record<PropertyStatus, string> = {
  active:   '#18A659',
  reserved: '#F59E0B',
  sold:     '#6B7FD7',
  paused:   '#506180',
  archived: '#3A4E6A',
};

const messages = defineMessages({
  statusActive:   { id: 'properties.status.active' },
  statusReserved: { id: 'properties.status.reserved' },
  statusSold:     { id: 'properties.status.sold' },
  statusPaused:   { id: 'properties.status.paused' },
  statusArchived: { id: 'properties.status.archived' },
  opSale:         { id: 'properties.operation.sale.short' },
  opRent:         { id: 'properties.operation.rent.short' },
  opTempRent:     { id: 'properties.operation.temp_rent.short' },
  opCommercialRent: { id: 'properties.operation.commercial_rent.short' },
  opCommercialSale: { id: 'properties.operation.commercial_sale.short' },
  colRef:         { id: 'properties.table.ref' },
  colAddress:     { id: 'properties.table.address' },
  colOperation:   { id: 'properties.table.operation' },
  colBedrooms:    { id: 'properties.table.bedrooms' },
  colBathrooms:   { id: 'properties.table.bathrooms' },
  colArea:        { id: 'properties.table.area' },
  colStatus:      { id: 'properties.table.status' },
  colAgent:       { id: 'properties.table.agent' },
  priceNone:      { id: 'properties.price.none' },
  loading:        { id: 'properties.table.loading' },
  empty:          { id: 'properties.table.empty' },
  selectAll:      { id: 'properties.table.selectAll' },
  selectRow:      { id: 'properties.table.selectRow' },
  ariaLabel:      { id: 'properties.list.ariaLabel' },
});

const col = createColumnHelper<PropertyRow>();

interface PropertyTableProps {
  rows: PropertyRow[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

export function PropertyTable({ rows, isLoading, onRowClick }: PropertyTableProps) {
  const intl = useIntl();
  const [sorting, setSorting] = React.useState<SortingState>([]);
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

  const columns = useMemo(() => [
    col.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label={intl.formatMessage(messages.selectAll)}
          style={{ cursor: 'pointer' }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          aria-label={intl.formatMessage(messages.selectRow)}
          style={{ cursor: 'pointer' }}
        />
      ),
      size: 44,
      enableSorting: false,
    }),
    col.display({
      id: 'thumb',
      header: '',
      cell: ({ row }) => {
        const { thumbUrl, title } = row.original;
        return thumbUrl ? (
          <img src={thumbUrl} alt={title ?? ''} width={48} height={36}
            style={{ objectFit: 'cover', borderRadius: 4, display: 'block', background: '#162035' }}
            loading="lazy" />
        ) : (
          <div style={{ width: 48, height: 36, borderRadius: 4, background: '#162035',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#506180" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        );
      },
      size: 68,
      enableSorting: false,
    }),
    col.accessor('referenceCode', {
      header: intl.formatMessage(messages.colRef),
      size: 80,
      cell: (info) => (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textSecondary }}>
          {info.getValue()}
        </span>
      ),
    }),
    col.display({
      id: 'address',
      header: intl.formatMessage(messages.colAddress),
      size: 220,
      cell: ({ row }) => {
        const p = row.original;
        const addr = [p.addressStreet, p.addressNumber].filter(Boolean).join(' ');
        const loc = [p.neighborhood, p.locality].filter(Boolean).join(', ');
        return (
          <div>
            <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{addr || '—'}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{loc || '—'}</div>
          </div>
        );
      },
    }),
    col.display({
      id: 'operation_price',
      header: intl.formatMessage(messages.colOperation),
      size: 170,
      cell: ({ row }) => {
        const p = row.original;
        const priceText = p.hasPricePublic && p.priceAmount != null
          ? formatMoney(intl, p.priceCurrency ?? 'ARS', p.priceAmount)
          : intl.formatMessage(messages.priceNone);
        return (
          <div>
            <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>
              {p.operationKind ? (opLabels[p.operationKind] ?? p.operationKind) : '—'}
            </div>
            <span style={{
              fontFamily: p.hasPricePublic ? "'DM Mono', monospace" : undefined,
              fontSize: p.hasPricePublic ? 13 : 12,
              color: p.hasPricePublic ? C.textPrimary : '#506180',
            }}>
              {priceText}
            </span>
          </div>
        );
      },
    }),
    col.accessor('bedrooms', {
      header: intl.formatMessage(messages.colBedrooms),
      size: 64,
      cell: (info) => <span style={{ fontSize: 13 }}>{info.getValue() ?? '—'}</span>,
    }),
    col.accessor('bathrooms', {
      header: intl.formatMessage(messages.colBathrooms),
      size: 64,
      cell: (info) => <span style={{ fontSize: 13 }}>{info.getValue() ?? '—'}</span>,
    }),
    col.accessor('coveredAreaM2', {
      header: intl.formatMessage(messages.colArea),
      size: 80,
      cell: (info) => {
        const v = info.getValue();
        return v != null
          ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v} m²</span>
          : <span style={{ fontSize: 13 }}>—</span>;
      },
    }),
    col.accessor('status', {
      header: intl.formatMessage(messages.colStatus),
      size: 115,
      cell: (info) => {
        const status = info.getValue();
        const label = statusLabels[status];
        const color = STATUS_COLORS[status];
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 500, color,
            background: `${color}1a`, border: `1px solid ${color}40`,
            borderRadius: 4, padding: '2px 7px', whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </span>
        );
      },
    }),
    col.display({
      id: 'agent',
      header: intl.formatMessage(messages.colAgent),
      size: 150,
      cell: ({ row }) => {
        const { agentName, agentAvatarUrl } = row.original;
        if (!agentName) return <span style={{ color: C.textTertiary, fontSize: 13 }}>—</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {agentAvatarUrl ? (
              <img src={agentAvatarUrl} alt="" width={20} height={20}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#1654d9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#EFF4FF', fontWeight: 600, flexShrink: 0,
              }}>
                {agentName.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 12, color: '#C8D6EE', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {agentName}
            </span>
          </div>
        );
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [intl.locale]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const { rows: tableRows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom = virtualItems.length > 0
    ? totalSize - (virtualItems[virtualItems.length - 1]!.end ?? 0)
    : 0;

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
      style={{ overflowY: 'auto', height: 'calc(100vh - 110px)', background: C.bgBase }}
      role="region"
      aria-label={intl.formatMessage(messages.ariaLabel)}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: C.bgRaised }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    padding: '0 12px',
                    height: 38,
                    textAlign: 'left',
                    fontSize: 11, fontWeight: 600,
                    color: C.textTertiary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: `1px solid ${C.border}`,
                    whiteSpace: 'nowrap',
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={header.column.getToggleSortingHandler()}
                  aria-sort={
                    header.column.getIsSorted() === 'asc' ? 'ascending'
                    : header.column.getIsSorted() === 'desc' ? 'descending'
                    : undefined
                  }
                >
                  {header.isPlaceholder ? null : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M5 2l4 6H1z"/></svg>
                      )}
                      {header.column.getIsSorted() === 'desc' && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><path d="M5 8L1 2h8z"/></svg>
                      )}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr><td style={{ height: paddingTop }} colSpan={columns.length} /></tr>
          )}
          {virtualItems.map((vItem) => {
            const row = tableRows[vItem.index]!;
            return (
              <tr
                key={row.id}
                style={{
                  height: ROW_HEIGHT,
                  background: row.getIsSelected() ? `${C.brand}18` : 'transparent',
                  borderBottom: `1px solid ${C.border}`,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!row.getIsSelected()) {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.bgRaised;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!row.getIsSelected()) {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }
                }}
                onClick={() => onRowClick(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: '0 12px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                      color: C.textPrimary,
                      verticalAlign: 'middle',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr><td style={{ height: paddingBottom }} colSpan={columns.length} /></tr>
          )}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          color: C.textTertiary, fontSize: 14,
        }}>
          {intl.formatMessage(messages.empty)}
        </div>
      )}
    </div>
  );
}
