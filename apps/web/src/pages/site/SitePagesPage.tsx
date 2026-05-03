import React, { useState } from 'react';
import { C, F } from '../../components/copilot/tokens.js';

type PageStatus = 'published' | 'draft' | 'unpublished';

const PAGES: Array<{ id: string; slug: string; title: string; status: PageStatus; lastEdit: string; blocks: number }> = [
  { id: 'p1', slug: '/',               title: 'Home',              status: 'published',   lastEdit: 'hace 2h',  blocks: 5 },
  { id: 'p2', slug: '/propiedades',    title: 'Propiedades',       status: 'published',   lastEdit: 'ayer',     blocks: 3 },
  { id: 'p3', slug: '/contacto',       title: 'Contacto',          status: 'draft',       lastEdit: 'hace 3d',  blocks: 2 },
  { id: 'p4', slug: '/nosotros',       title: 'Nosotros',          status: 'draft',       lastEdit: 'hace 1s',  blocks: 4 },
  { id: 'p5', slug: '/blog',           title: 'Blog',              status: 'unpublished', lastEdit: 'hace 2s',  blocks: 1 },
];

const STATUS_COLORS = {
  published:   C.success,
  draft:       C.warning,
  unpublished: C.textTertiary,
} as const;

const STATUS_LABELS = {
  published:   'Publicada',
  draft:       'Borrador',
  unpublished: 'Sin publicar',
} as const;

export default function SitePagesPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800, fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Páginas
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '4px 0 0' }}>
            {PAGES.length} páginas · 2 publicadas
          </p>
        </div>
        <button type="button" style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: C.brand, color: '#fff', fontFamily: F.body,
          fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>
          + Nueva página
        </button>
      </div>

      {/* Page list */}
      <div style={{
        background: C.bgRaised, borderRadius: 12, border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
          padding: '10px 16px', borderBottom: `1px solid ${C.border}`,
          background: C.bgBase,
        }}>
          {['Título', 'Slug', 'Estado', 'Última edición', ''].map(h => (
            <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </span>
          ))}
        </div>

        {PAGES.map((page, idx) => {
          const isSelected = selected === page.id;
          return (
            <div
              key={page.id}
              onClick={() => setSelected(isSelected ? null : page.id)}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                padding: '12px 16px', cursor: 'pointer',
                background: isSelected ? C.brandFaint : idx % 2 === 0 ? C.bgRaised : C.bgBase,
                borderBottom: idx < PAGES.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                  {page.title}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, marginLeft: 8 }}>
                  {page.blocks} bloques
                </span>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary }}>
                {page.slug}
              </span>
              <div>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, padding: '2px 8px', borderRadius: 20,
                  background: `${STATUS_COLORS[page.status]}18`,
                  color: STATUS_COLORS[page.status],
                  border: `1px solid ${STATUS_COLORS[page.status]}40`,
                }}>
                  {STATUS_LABELS[page.status]}
                </span>
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>
                {page.lastEdit}
              </span>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button type="button" onClick={e => e.stopPropagation()} style={{
                  padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.textSecondary, fontSize: 11, cursor: 'pointer',
                }}>
                  ✏️
                </button>
                <button type="button" onClick={e => e.stopPropagation()} style={{
                  padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.textSecondary, fontSize: 11, cursor: 'pointer',
                }}>
                  ⋯
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
