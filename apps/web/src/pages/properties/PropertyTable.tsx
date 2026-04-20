import React, { useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
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

const STATUS_META: Record<PropertyStatus, { label: string; color: string }> = {
  active:   { label: 'Disponible', color: '#18A659' },
  reserved: { label: 'Reservado',  color: '#F59E0B' },
  sold:     { label: 'Vendido',    color: '#6B7FD7' },
  paused:   { label: 'Pausado',    color: '#506180' },
  archived: { label: 'Archivado',  color: '#3A4E6A' },
};

const OP_LABELS: Record<string, string> = {
  sale: 'Venta', rent: 'Alquiler', temp_rent: 'Alq. temp.',
  commercial_rent: 'Alq. com.', commercial_sale: 'Vta. com.',
};

function StatusBadge({ status }: { status: PropertyStatus }) {
  const { label, color } = STATUS_META[status];
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
}

function PriceCell({ row }: { row: PropertyRow }) {
  if (!row.hasPricePublic || row.priceAmount == null) {
    return <span style={{ color: '#506180', fontSize: 12 }}>Sin precio</span>;
  }
  const amt = Number(row.priceAmount);
  const fmt = row.priceCurrency === 'ARS'
    ? `$ ${amt.toLocaleString('es-AR')}`
    : `USD ${amt.toLocaleString('en-US')}`;
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{fmt}</span>;
}

const col = createColumnHelper<PropertyRow>();

const columns = [
  col.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Seleccionar todo"
        style={{ cursor: 'pointer' }}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        aria-label="Seleccionar fila"
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
    header: 'Ref.',
    size: 80,
    cell: (info) => (
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.textSecondary }}>
        {info.getValue()}
      </span>
    ),
  }),
  col.display({
    id: 'address',
    header: 'Dirección / Barrio',
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
    header: 'Operación / Precio',
    size: 170,
    cell: ({ row }) => (
      <div>
        <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 2 }}>
          {row.original.operationKind ? OP_LABELS[row.original.operationKind] : '—'}
        </div>
        <PriceCell row={row.original} />
      </div>
    ),
  }),
  col.accessor('bedrooms', {
    header: 'Dorm.',
    size: 64,
    cell: (info) => <span style={{ fontSize: 13 }}>{info.getValue() ?? '—'}</span>,
  }),
  col.accessor('bathrooms', {
    header: 'Baños',
    size: 64,
    cell: (info) => <span style={{ fontSize: 13 }}>{info.getValue() ?? '—'}</span>,
  }),
  col.accessor('coveredAreaM2', {
    header: 'M² cub.',
    size: 80,
    cell: (info) => {
      const v = info.getValue();
      return v != null
        ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{v} m²</span>
        : <span style={{ fontSize: 13 }}>—</span>;
    },
  }),
  col.accessor('status', {
    header: 'Estado',
    size: 115,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.display({
    id: 'agent',
    header: 'Agente',
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
];

interface PropertyTableProps {
  rows: PropertyRow[];
  isLoading: boolean;
  onRowClick: (id: string) => void;
}

export function PropertyTable({ rows, isLoading, onRowClick }: PropertyTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

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
        Cargando propiedades…
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{ overflowY: 'auto', height: 'calc(100vh - 110px)', background: C.bgBase }}
      role="region"
      aria-label="Lista de propiedades"
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
          No se encontraron propiedades con los filtros aplicados.
        </div>
      )}
    </div>
  );
}
