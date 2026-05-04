import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

const C = {
  bgBase: '#070D1A',
  bgRaised: '#0D1526',
  bgElevated: '#131E33',
  border: '#1F2D48',
  borderSubtle: '#162038',
  brand: '#1654d9',
  brandHover: '#1248b8',
  brandSubtle: 'rgba(22,84,217,0.12)',
  success: '#16A34A',
  successSubtle: 'rgba(22,163,74,0.12)',
  warning: '#D97706',
  warningSubtle: 'rgba(217,119,6,0.12)',
  danger: '#DC2626',
  dangerSubtle: 'rgba(220,38,38,0.12)',
  textPrimary: '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary: '#6B809E',
  accent: '#38BDF8',
  accentSubtle: 'rgba(56,189,248,0.10)',
} as const

const F = {
  display: "'Syne', system-ui, sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', monospace",
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

type ReservaStage = 'reserva' | 'boleto' | 'escritura'
type ReservaStatus = 'activa' | 'completada' | 'cancelada' | 'vencida'

interface ReservaRow {
  id: string
  propertyAddress: string
  propertyType: 'departamento' | 'casa' | 'local' | 'terreno' | 'ph'
  buyerName: string
  sellerName: string
  stage: ReservaStage
  status: ReservaStatus
  salePrice: number
  saleCurrency: 'USD' | 'ARS'
  escrituraDate: string | null
  agentName: string
  lastActivity: string
  overdueCount: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RESERVAS: ReservaRow[] = [
  {
    id: 'r1',
    propertyAddress: 'Av. Santa Fe 3421, Piso 4° "B", CABA',
    propertyType: 'departamento',
    buyerName: 'Juan García',
    sellerName: 'Laura Méndez',
    stage: 'boleto',
    status: 'activa',
    salePrice: 250000,
    saleCurrency: 'USD',
    escrituraDate: '2026-07-15',
    agentName: 'María López',
    lastActivity: 'hace 2 horas',
    overdueCount: 0,
  },
  {
    id: 'r2',
    propertyAddress: 'Palermo Soho — Gorriti 4872 PB',
    propertyType: 'ph',
    buyerName: 'Carlos Ramos',
    sellerName: 'Ana Torres',
    stage: 'reserva',
    status: 'activa',
    salePrice: 180000,
    saleCurrency: 'USD',
    escrituraDate: null,
    agentName: 'Rodrigo Fernández',
    lastActivity: 'hace 1 día',
    overdueCount: 0,
  },
  {
    id: 'r3',
    propertyAddress: 'Belgrano R — Mendoza 2341, 7° "A"',
    propertyType: 'departamento',
    buyerName: 'Patricia Silva',
    sellerName: 'Martín Bustos',
    stage: 'escritura',
    status: 'activa',
    salePrice: 320000,
    saleCurrency: 'USD',
    escrituraDate: '2026-04-30',
    agentName: 'María López',
    lastActivity: 'hace 3 horas',
    overdueCount: 1,
  },
  {
    id: 'r4',
    propertyAddress: 'Recoleta — Libertad 1580 "12C"',
    propertyType: 'departamento',
    buyerName: 'Diego Herrera',
    sellerName: 'Claudia Vega',
    stage: 'boleto',
    status: 'activa',
    salePrice: 420000,
    saleCurrency: 'USD',
    escrituraDate: '2026-06-20',
    agentName: 'Lucas Martínez',
    lastActivity: 'hace 5 días',
    overdueCount: 2,
  },
  {
    id: 'r5',
    propertyAddress: 'Villa Urquiza — Triunvirato 3850 PB',
    propertyType: 'casa',
    buyerName: 'Fernando Álvarez',
    sellerName: 'Susana Gómez',
    stage: 'boleto',
    status: 'vencida',
    salePrice: 95000000,
    saleCurrency: 'ARS',
    escrituraDate: null,
    agentName: 'Rodrigo Fernández',
    lastActivity: 'hace 8 días',
    overdueCount: 3,
  },
  {
    id: 'r6',
    propertyAddress: 'Microcentro — Florida 760, Piso 11',
    propertyType: 'local',
    buyerName: 'Inversiones Del Sur SA',
    sellerName: 'Prop. Center SRL',
    stage: 'escritura',
    status: 'completada',
    salePrice: 680000,
    saleCurrency: 'USD',
    escrituraDate: '2026-04-20',
    agentName: 'María López',
    lastActivity: 'hace 6 días',
    overdueCount: 0,
  },
]

// ─── KPI Data ─────────────────────────────────────────────────────────────────

const KPI_DATA = {
  activeReservas: MOCK_RESERVAS.filter(r => r.status === 'activa').length,
  pipelineValue: MOCK_RESERVAS.filter(r => r.status === 'activa' && r.saleCurrency === 'USD')
    .reduce((sum, r) => sum + r.salePrice, 0),
  escriturasPending: MOCK_RESERVAS.filter(r => r.escrituraDate && r.status === 'activa' &&
    new Date(r.escrituraDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length,
  overdueMilestones: MOCK_RESERVAS.reduce((sum, r) => sum + r.overdueCount, 0),
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StageChip({ stage }: { stage: ReservaStage }) {
  const cfg: Record<ReservaStage, { label: string; color: string; bg: string }> = {
    reserva: { label: 'Reserva', color: C.accent, bg: C.accentSubtle },
    boleto: { label: 'Boleto', color: C.brand, bg: C.brandSubtle },
    escritura: { label: 'Escritura', color: C.success, bg: C.successSubtle },
  }
  const { label, color, bg } = cfg[stage]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 4, background: bg,
      fontSize: 11, fontWeight: 600, color, fontFamily: F.body,
      letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      {label}
    </span>
  )
}

function StatusDot({ status }: { status: ReservaStatus }) {
  const cfg: Record<ReservaStatus, { label: string; color: string }> = {
    activa: { label: 'Activa', color: C.success },
    completada: { label: 'Completada', color: C.textSecondary },
    cancelada: { label: 'Cancelada', color: C.danger },
    vencida: { label: 'Vencida', color: C.warning },
  }
  const { label, color } = cfg[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color, fontSize: 12, fontFamily: F.body }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function PropertyTypeIcon({ type }: { type: ReservaRow['propertyType'] }) {
  const icons: Record<string, React.ReactNode> = {
    departamento: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </svg>
    ),
    casa: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    local: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <rect x="9" y="13" width="6" height="9" />
      </svg>
    ),
    terreno: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 20h18M5 20V8l7-5 7 5v12" />
      </svg>
    ),
    ph: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="7" width="20" height="15" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  }
  return <span style={{ color: C.textTertiary }}>{icons[type]}</span>
}

function KpiCard({
  label, value, subtext, color, trend,
}: {
  label: string
  value: string
  subtext?: string
  color?: string
  trend?: { dir: 'up' | 'down'; text: string; positive?: boolean }
}) {
  return (
    <div style={{
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      flex: 1,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.body, fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 26, fontFamily: F.display, fontWeight: 700,
        color: color ?? C.textPrimary, letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>{value}</span>
      {(subtext || trend) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {subtext && (
            <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.body }}>{subtext}</span>
          )}
          {trend && (
            <span style={{
              fontSize: 11, fontFamily: F.body, fontWeight: 600,
              color: trend.positive ? C.success : C.warning,
            }}>
              {trend.dir === 'up' ? '↑' : '↓'} {trend.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReservationListPage() {
  const navigate = useNavigate()
  const [stageFilter, setStageFilter] = useState<'all' | ReservaStage>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ReservaStatus>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'lastActivity' | 'escrituraDate' | 'salePrice'>('lastActivity')
  const [sortDir] = useState<'asc' | 'desc'>('desc')

  const agents = Array.from(new Set(MOCK_RESERVAS.map(r => r.agentName))).sort()

  const filtered = MOCK_RESERVAS.filter(r => {
    if (stageFilter !== 'all' && r.stage !== stageFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (agentFilter !== 'all' && r.agentName !== agentFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.propertyAddress.toLowerCase().includes(q) ||
        r.buyerName.toLowerCase().includes(q) ||
        r.sellerName.toLowerCase().includes(q) ||
        r.agentName.toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => {
    if (sortBy === 'lastActivity') return sortDir === 'desc' ? -1 : 1
    if (sortBy === 'salePrice') {
      const aUSD = a.saleCurrency === 'USD' ? a.salePrice : a.salePrice / 1000
      const bUSD = b.saleCurrency === 'USD' ? b.salePrice : b.salePrice / 1000
      return sortDir === 'desc' ? bUSD - aUSD : aUSD - bUSD
    }
    if (sortBy === 'escrituraDate') {
      const aD = a.escrituraDate ?? '9999'
      const bD = b.escrituraDate ?? '9999'
      return sortDir === 'desc' ? bD.localeCompare(aD) : aD.localeCompare(bD)
    }
    return 0
  })

  const formatPrice = (r: ReservaRow) =>
    r.saleCurrency === 'USD'
      ? `USD ${r.salePrice.toLocaleString('es-AR')}`
      : `$ ${(r.salePrice / 1_000_000).toFixed(1)}M`

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: C.bgBase, fontFamily: F.body, color: C.textPrimary,
      overflow: 'hidden',
    }}>
      {/* ── Page Header ── */}
      <div style={{
        padding: '20px 28px 0',
        borderBottom: `1px solid ${C.borderSubtle}`,
        background: C.bgBase,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: F.display, fontWeight: 700, color: C.textPrimary }}>
              Reservas
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textSecondary }}>
              Seguimiento de operaciones activas y pipeline de ventas
            </p>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 8,
            background: C.brand, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: F.body,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva reserva
          </button>
        </div>

        {/* ── KPI Bar ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <KpiCard
            label="Reservas activas"
            value={String(KPI_DATA.activeReservas)}
            subtext="operaciones en curso"
            trend={{ dir: 'up', text: '+2 este mes', positive: true }}
          />
          <KpiCard
            label="Pipeline total"
            value={`USD ${(KPI_DATA.pipelineValue / 1000).toFixed(0)}K`}
            subtext="valor de boletos activos"
            color={C.brand}
            trend={{ dir: 'up', text: '+USD 45K vs. mes anterior', positive: true }}
          />
          <KpiCard
            label="Escrituras este mes"
            value={String(KPI_DATA.escriturasPending)}
            subtext="próximas 30 días"
            color={KPI_DATA.escriturasPending > 0 ? C.success : C.textSecondary}
          />
          <KpiCard
            label="Cuotas vencidas"
            value={String(KPI_DATA.overdueMilestones)}
            subtext="requieren atención"
            color={KPI_DATA.overdueMilestones > 0 ? C.warning : C.success}
            trend={KPI_DATA.overdueMilestones > 0
              ? { dir: 'up', text: `${KPI_DATA.overdueMilestones} pendientes`, positive: false }
              : undefined}
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 28px',
        borderBottom: `1px solid ${C.borderSubtle}`,
        background: C.bgBase,
        flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth={2}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar propiedad, comprador…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px 7px 32px',
              background: C.bgRaised, border: `1px solid ${C.border}`,
              borderRadius: 7, color: C.textPrimary, fontSize: 13,
              fontFamily: F.body, outline: 'none',
            }}
          />
        </div>

        {/* Stage filter */}
        {(['all', 'reserva', 'boleto', 'escritura'] as const).map(s => (
          <button key={s} onClick={() => setStageFilter(s)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: F.body,
            background: stageFilter === s ? C.brandSubtle : 'transparent',
            color: stageFilter === s ? C.brand : C.textSecondary,
          }}>
            {s === 'all' ? 'Todas las etapas' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{
            padding: '6px 10px', background: C.bgRaised,
            border: `1px solid ${C.border}`, borderRadius: 7,
            color: C.textSecondary, fontSize: 12, fontFamily: F.body,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="completada">Completada</option>
          <option value="vencida">Vencida</option>
          <option value="cancelada">Cancelada</option>
        </select>

        {/* Agent filter */}
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          style={{
            padding: '6px 10px', background: C.bgRaised,
            border: `1px solid ${C.border}`, borderRadius: 7,
            color: C.textSecondary, fontSize: 12, fontFamily: F.body,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="all">Todos los agentes</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '6px 10px', background: C.bgRaised,
            border: `1px solid ${C.border}`, borderRadius: 7,
            color: C.textSecondary, fontSize: 12, fontFamily: F.body,
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="lastActivity">Ordenar: Actividad</option>
          <option value="escrituraDate">Ordenar: Escritura</option>
          <option value="salePrice">Ordenar: Monto</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
          <thead>
            <tr>
              {[
                'Propiedad', 'Comprador', 'Vendedor', 'Etapa', 'Estado',
                'Precio', 'Escritura', 'Agente', 'Actividad',
              ].map(col => (
                <th key={col} style={{
                  padding: '10px 12px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: C.textTertiary,
                  fontFamily: F.body, letterSpacing: '0.05em', textTransform: 'uppercase',
                  borderBottom: `1px solid ${C.border}`,
                  position: 'sticky', top: 0, background: C.bgBase, zIndex: 1,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const isOverdue = r.overdueCount > 0
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate({ to: '/reservations/$reservationId', params: { reservationId: r.id } })}
                  style={{
                    cursor: 'pointer',
                    borderBottom: `1px solid ${C.borderSubtle}`,
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background = C.bgRaised
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)'
                  }}
                >
                  {/* Property */}
                  <td style={{ padding: '12px 12px', maxWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ marginTop: 2, flexShrink: 0 }}>
                        <PropertyTypeIcon type={r.propertyType} />
                      </div>
                      <div>
                        <div style={{
                          fontSize: 13, color: C.textPrimary, fontWeight: 500,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          maxWidth: 200,
                        }}>
                          {r.propertyAddress}
                        </div>
                        <div style={{ fontSize: 11, color: C.textTertiary, textTransform: 'capitalize', marginTop: 1 }}>
                          {r.propertyType}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Buyer */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontSize: 13, color: C.textSecondary }}>{r.buyerName}</span>
                  </td>

                  {/* Seller */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontSize: 13, color: C.textSecondary }}>{r.sellerName}</span>
                  </td>

                  {/* Stage */}
                  <td style={{ padding: '12px 12px' }}>
                    <StageChip stage={r.stage} />
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusDot status={r.status} />
                      {isOverdue && (
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4,
                          background: C.warningSubtle, color: C.warning, fontWeight: 700,
                        }}>
                          {r.overdueCount} vencida{r.overdueCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Price */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      fontSize: 13, color: C.textPrimary, fontFamily: F.mono,
                      fontWeight: 600,
                    }}>
                      {formatPrice(r)}
                    </span>
                  </td>

                  {/* Escritura date */}
                  <td style={{ padding: '12px 12px' }}>
                    {r.escrituraDate ? (
                      <div>
                        <div style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.mono }}>
                          {new Date(r.escrituraDate + 'T00:00:00').toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </div>
                        {(() => {
                          const days = Math.ceil((new Date(r.escrituraDate).getTime() - Date.now()) / 86400000)
                          if (days < 0) return (
                            <div style={{ fontSize: 10, color: C.warning, fontWeight: 600 }}>Pasada</div>
                          )
                          if (days <= 14) return (
                            <div style={{ fontSize: 10, color: C.warning, fontWeight: 600 }}>en {days}d</div>
                          )
                          return (
                            <div style={{ fontSize: 10, color: C.textTertiary }}>en {days}d</div>
                          )
                        })()}
                      </div>
                    ) : (
                      <span style={{ color: C.textTertiary, fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Agent */}
                  <td style={{ padding: '12px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: C.brandSubtle, border: `1px solid ${C.brand}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: C.brand, flexShrink: 0,
                      }}>
                        {r.agentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{r.agentName}</span>
                    </div>
                  </td>

                  {/* Last activity */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontSize: 12, color: C.textTertiary }}>{r.lastActivity}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: C.textTertiary, fontSize: 14, fontFamily: F.body,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke={C.border} strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            No se encontraron reservas con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div style={{
        padding: '8px 28px',
        borderTop: `1px solid ${C.borderSubtle}`,
        background: C.bgBase,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.body }}>
          {filtered.length} de {MOCK_RESERVAS.length} reservas
          {stageFilter !== 'all' && ` · etapa: ${stageFilter}`}
          {statusFilter !== 'all' && ` · estado: ${statusFilter}`}
        </span>
        <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>
          Actualizado hace 2 min
        </span>
      </div>
    </div>
  )
}

export default ReservationListPage
