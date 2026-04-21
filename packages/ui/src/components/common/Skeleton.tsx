import React from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Skeleton loading components
   Use to avoid blank-wait states everywhere.
   Matches design system: dark bg, subtle shimmer.
   ───────────────────────────────────────────────────────── */

const C = {
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  shimmer:   '#1B2640',
};

// ─── Base skeleton block ──────────────────────────────────
export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes corredor-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{
          width,
          height,
          borderRadius,
          background: `linear-gradient(90deg, ${C.bgSubtle} 25%, ${C.shimmer} 50%, ${C.bgSubtle} 75%)`,
          backgroundSize: '800px 100%',
          animation: 'corredor-shimmer 1.6s ease-in-out infinite',
          flexShrink: 0,
          ...style,
        }}
      />
    </>
  );
}

// ─── Skeleton text lines ──────────────────────────────────
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }: {
  lines?: number;
  lastLineWidth?: string | number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div style={{
      background: C.bgRaised,
      border: '1px solid #1F2D48',
      borderRadius: 12,
      padding: 20,
      height,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton height={14} width="55%" />
          <Skeleton height={12} width="35%" />
        </div>
      </div>
      <Skeleton height={12} />
      <Skeleton height={12} width="80%" />
    </div>
  );
}

// ─── Skeleton table row ───────────────────────────────────
export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  const widths = ['40%', '25%', '20%', '15%', '10%'];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '14px 16px',
      borderBottom: '1px solid #1F2D48',
    }}>
      <Skeleton width={32} height={32} borderRadius="50%" style={{ flexShrink: 0 }} />
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ flex: widths[i] ? undefined : 1, width: widths[i] }}>
          <Skeleton height={13} width="80%" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton table ───────────────────────────────────────
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{
      background: C.bgRaised,
      border: '1px solid #1F2D48',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', gap: 16,
        padding: '12px 16px',
        borderBottom: '1px solid #1F2D48',
        background: '#0A1220',
      }}>
        <Skeleton width={32} height={12} style={{ flexShrink: 0 }} />
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={12} width="15%" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} cols={cols} />
      ))}
    </div>
  );
}

// ─── Skeleton stat card ───────────────────────────────────
export function SkeletonStatCard() {
  return (
    <div style={{
      background: C.bgRaised,
      border: '1px solid #1F2D48',
      borderRadius: 12,
      padding: '20px 20px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <Skeleton width={90} height={13} />
        <Skeleton width={32} height={32} borderRadius={8} />
      </div>
      <Skeleton width={80} height={32} borderRadius={6} style={{ marginBottom: 8 }} />
      <Skeleton width={120} height={12} />
    </div>
  );
}

// ─── Dashboard skeleton ───────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div style={{ padding: '28px 24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <Skeleton width={220} height={28} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={300} height={14} />
      </div>

      {/* Stat cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 14,
        marginBottom: 28,
      }}>
        {[0, 1, 2, 3].map(i => <SkeletonStatCard key={i} />)}
      </div>

      {/* Two column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <SkeletonCard height={300} />
        <SkeletonCard height={300} />
      </div>
    </div>
  );
}
