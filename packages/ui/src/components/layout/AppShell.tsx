import React, { useState, useCallback } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — App Shell
   Layout: fixed sidebar (220px / 64px collapsed) + topbar (56px) + content
   Mobile: sidebar becomes a slide-over drawer
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgOverlay: '#121D33',
  bgSubtle:  '#162035',
  brand:     '#1654d9',
  brandLight:'#4669ff',
  brandFaint:'rgba(22,84,217,0.12)',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  textDisabled:  '#3A4E6A',
  success:   '#18A659',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

// ─── Nav module definitions ────────────────────────────
export type NavModule =
  | 'dashboard'
  | 'properties'
  | 'contacts'
  | 'leads'
  | 'documents'
  | 'reservations'
  | 'calendar'
  | 'messages'
  | 'appraisals'
  | 'site'
  | 'reports'
  | 'settings';

interface NavItem {
  key: NavModule;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  /** Greyed out — not yet available in this phase */
  disabled?: boolean;
}

// ─── Icons ───────────────────────────────────────────────
const Icon = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Properties: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Contacts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Leads: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Messages: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Reports: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  Documents: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Reservations: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Appraisals: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  Site: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
};

// ─── Corredor logo mark ──────────────────────────────────
function CorredorMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={C.brand} />
      <path d="M7 30 L13 14 L20 24 L26 18 L33 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="33" cy="26" r="2.5" fill="white" />
    </svg>
  );
}

// ─── Avatar initials ─────────────────────────────────────
function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const hue = Array.from(name).reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: `hsl(${hue}, 50%, 30%)`,
      border: `1.5px solid hsl(${hue}, 50%, 45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      color: `hsl(${hue}, 70%, 90%)`,
      fontFamily: F.body,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────
export interface AppShellUser {
  name: string;
  email: string;
  tenantName: string;
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';

export interface AppShellProps {
  children?: React.ReactNode;
  activeModule?: NavModule;
  onNavigate?: (module: NavModule) => void;
  user?: AppShellUser;
  /** Notification count for bell icon */
  notificationCount?: number;
  breadcrumb?: React.ReactNode;
  /** Days remaining in trial — shows a countdown banner when set */
  trialDaysLeft?: number | null;
  /** Current subscription status — shows read-only overlay when expired */
  subscriptionStatus?: SubscriptionStatus;
}

// ─── Nav items config ────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',    label: 'Inicio',        icon: <Icon.Dashboard /> },
  { key: 'properties',   label: 'Propiedades',   icon: <Icon.Properties />,   disabled: true },
  { key: 'contacts',     label: 'Contactos',     icon: <Icon.Contacts />,     disabled: true },
  { key: 'leads',        label: 'Leads',         icon: <Icon.Leads />,        disabled: true },
  { key: 'documents',    label: 'Documentos',    icon: <Icon.Documents /> },
  { key: 'reservations', label: 'Reservas',      icon: <Icon.Reservations /> },
  { key: 'calendar',     label: 'Agenda',        icon: <Icon.Calendar />,     disabled: true },
  { key: 'messages',     label: 'Mensajes',      icon: <Icon.Messages />,     disabled: true },
  { key: 'appraisals',   label: 'Tasaciones',    icon: <Icon.Appraisals /> },
  { key: 'site',         label: 'Sitio web',     icon: <Icon.Site /> },
  { key: 'reports',      label: 'Reportes',      icon: <Icon.Reports /> },
];

const NAV_BOTTOM: NavItem[] = [
  { key: 'settings', label: 'Configuración', icon: <Icon.Settings /> },
];

// ─── Component ───────────────────────────────────────────
export function AppShell({
  children,
  activeModule = 'dashboard',
  onNavigate,
  user = { name: 'Usuario', email: 'usuario@corredor.ar', tenantName: 'Mi Inmobiliaria' },
  notificationCount = 0,
  breadcrumb,
  trialDaysLeft,
  subscriptionStatus,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const sidebarWidth = collapsed ? 64 : 220;

  const handleNav = useCallback((module: NavModule, disabled?: boolean) => {
    if (disabled) return;
    setMobileOpen(false);
    onNavigate?.(module);
  }, [onNavigate]);

  const NavItemEl = ({ item }: { item: NavItem }) => {
    const isActive = item.key === activeModule;
    const color = item.disabled
      ? C.textDisabled
      : isActive
      ? C.textPrimary
      : C.textSecondary;

    return (
      <button
        key={item.key}
        type="button"
        role="menuitem"
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={item.disabled}
        title={collapsed ? item.label : undefined}
        onClick={() => handleNav(item.key, item.disabled)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: collapsed ? '10px 0' : '9px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: isActive && !item.disabled ? C.brandFaint : 'none',
          border: `1px solid ${isActive && !item.disabled ? 'rgba(22,84,217,0.2)' : 'transparent'}`,
          borderRadius: 8,
          color,
          fontSize: '0.875rem',
          fontFamily: F.body,
          fontWeight: isActive ? 600 : 400,
          cursor: item.disabled ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
          transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
          position: 'relative',
          flexShrink: 0,
          marginBottom: 2,
        }}
        onMouseEnter={e => {
          if (!item.disabled && !isActive) {
            (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
            (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
          }
        }}
        onMouseLeave={e => {
          if (!item.disabled && !isActive) {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = color;
          }
        }}
      >
        <span style={{ flexShrink: 0, opacity: item.disabled ? 0.4 : 1 }}>
          {item.icon}
        </span>
        {!collapsed && (
          <span style={{
            opacity: item.disabled ? 0.4 : 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {item.label}
          </span>
        )}
        {!collapsed && item.disabled && (
          <span style={{
            fontSize: '0.625rem',
            background: C.bgSubtle,
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            padding: '1px 5px',
            color: C.textTertiary,
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}>
            PRONTO
          </span>
        )}
        {!collapsed && item.badge && !item.disabled && (
          <span style={{
            background: C.brand,
            color: 'white',
            fontSize: '0.6875rem',
            fontWeight: 600,
            borderRadius: '10px',
            padding: '1px 7px',
            minWidth: 20,
            textAlign: 'center',
          }}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: collapsed ? '16px 8px' : '16px 12px',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '6px 0 20px' : '6px 4px 20px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
      }}>
        <CorredorMark size={28} />
        {!collapsed && (
          <span style={{
            fontFamily: F.display,
            fontSize: '1.0625rem',
            fontWeight: 700,
            color: C.textPrimary,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
          }}>
            Corredor
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.border, marginBottom: 12 }} />

      {/* Main nav */}
      <div style={{ flex: 1 }}>
        {NAV_ITEMS.map(item => <NavItemEl key={item.key} item={item} />)}
      </div>

      {/* Bottom divider */}
      <div style={{ height: 1, background: C.border, margin: '8px 0 10px' }} />

      {/* Bottom nav */}
      {NAV_BOTTOM.map(item => <NavItemEl key={item.key} item={item} />)}

      {/* Collapse toggle (desktop) */}
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '8px 0',
          background: 'none',
          border: 'none',
          borderRadius: 8,
          color: C.textTertiary,
          cursor: 'pointer',
          transition: 'color 150ms ease, background 150ms ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
          (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'none';
          (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary;
        }}
      >
        <span style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease', display: 'flex' }}>
          <Icon.ChevronLeft />
        </span>
      </button>
    </nav>
  );

  return (
    <>
      <style>{`
        @keyframes corredor-slide-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes corredor-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .corredor-shell-desktop-sidebar {
          display: flex !important;
        }
        .corredor-shell-mobile-toggle {
          display: none !important;
        }
        @media (max-width: 767px) {
          .corredor-shell-desktop-sidebar {
            display: none !important;
          }
          .corredor-shell-mobile-toggle {
            display: flex !important;
          }
          .corredor-shell-main {
            margin-left: 0 !important;
          }
        }
      `}</style>

      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: F.body,
        backgroundColor: C.bgBase,
      }}>
        {/* ── Desktop sidebar ── */}
        <aside
          className="corredor-shell-desktop-sidebar"
          style={{
            width: sidebarWidth,
            minWidth: sidebarWidth,
            height: '100vh',
            background: C.bgRaised,
            borderRight: `1px solid ${C.border}`,
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 200,
            transition: 'width 200ms cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}
          aria-label="Menú lateral"
        >
          <SidebarContent />
        </aside>

        {/* ── Mobile overlay ── */}
        {mobileOpen && (
          <>
            <div
              role="presentation"
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(7,13,26,0.8)',
                zIndex: 298,
                animation: 'corredor-fade-in 200ms ease',
              }}
            />
            <aside
              style={{
                position: 'fixed',
                top: 0, left: 0,
                width: 260, height: '100vh',
                background: C.bgRaised,
                borderRight: `1px solid ${C.border}`,
                zIndex: 299,
                animation: 'corredor-slide-in 250ms cubic-bezier(0.16,1,0.3,1)',
              }}
              aria-label="Menú lateral móvil"
            >
              <SidebarContent />
            </aside>
          </>
        )}

        {/* ── Main area ── */}
        <div
          className="corredor-shell-main"
          style={{
            flex: 1,
            marginLeft: sidebarWidth,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            transition: 'margin-left 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* ── Topbar ── */}
          <header style={{
            height: 56,
            minHeight: 56,
            background: C.bgRaised,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px 0 20px',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}>
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="corredor-shell-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer',
                color: C.textSecondary,
                padding: 6, borderRadius: 6,
                display: 'none', // overridden by media query via className
                alignItems: 'center',
              }}
            >
              <Icon.Menu />
            </button>

            {/* Breadcrumb / page title */}
            <div style={{
              flex: 1,
              fontSize: '0.875rem',
              color: C.textSecondary,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}>
              {breadcrumb ?? (
                <span style={{ color: C.textTertiary }}>
                  {NAV_ITEMS.find(i => i.key === activeModule)?.label ?? 'Inicio'}
                </span>
              )}
            </div>

            {/* Search pill */}
            <button
              type="button"
              aria-label="Buscar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: C.bgBase,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.textTertiary,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontFamily: F.body,
                transition: 'border-color 150ms ease, background 150ms ease',
                minWidth: 180,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong;
                (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.background = C.bgBase;
              }}
            >
              <Icon.Search />
              <span>Buscar...</span>
              <kbd style={{
                marginLeft: 'auto',
                fontSize: '0.6875rem',
                fontFamily: F.mono,
                color: C.textDisabled,
                background: C.bgSubtle,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: '1px 5px',
              }}>
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <button
              type="button"
              aria-label={`Notificaciones${notificationCount > 0 ? ` (${notificationCount} nuevas)` : ''}`}
              style={{
                position: 'relative',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: C.textSecondary,
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease, color 150ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
                (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
                (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
              }}
            >
              <Icon.Bell />
              {notificationCount > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 5,
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: C.brand,
                  border: `2px solid ${C.bgRaised}`,
                }} />
              )}
            </button>

            {/* User menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(v => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="Menú de usuario"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  background: userMenuOpen ? C.bgSubtle : 'none',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={e => { if (!userMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle; }}
                onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
              >
                <Avatar name={user.name} size={30} />
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: C.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                  }}>
                    {user.name}
                  </div>
                  <div style={{
                    fontSize: '0.6875rem',
                    color: C.textTertiary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 120,
                  }}>
                    {user.tenantName}
                  </div>
                </div>
                <Icon.ChevronDown />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <>
                  <div
                    role="presentation"
                    onClick={() => setUserMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                  />
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: 220,
                      background: C.bgOverlay,
                      border: `1px solid ${C.borderStrong}`,
                      borderRadius: 10,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                      zIndex: 100,
                      overflow: 'hidden',
                      animation: 'corredor-fade-in 150ms ease',
                    }}
                  >
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: C.textPrimary }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: C.textTertiary, marginTop: 2 }}>
                        {user.email}
                      </div>
                    </div>
                    {[
                      { label: 'Mi perfil', action: () => onNavigate?.('settings') },
                      { label: 'Configuración', action: () => onNavigate?.('settings') },
                    ].map(({ label, action }) => (
                      <button
                        key={label}
                        type="button"
                        role="menuitem"
                        onClick={() => { action(); setUserMenuOpen(false); }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '9px 14px',
                          background: 'none', border: 'none',
                          textAlign: 'left', cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: C.textSecondary,
                          fontFamily: F.body,
                          transition: 'background 100ms ease, color 100ms ease',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle;
                          (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'none';
                          (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: C.border }} />
                    <button
                      type="button"
                      role="menuitem"
                      style={{
                        display: 'block', width: '100%',
                        padding: '9px 14px',
                        background: 'none', border: 'none',
                        textAlign: 'left', cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: '#E83B3B',
                        fontFamily: F.body,
                        transition: 'background 100ms ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.bgSubtle; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* ── Trial banner ── */}
          {trialDaysLeft != null && trialDaysLeft > 0 && (
            <div style={{
              background: trialDaysLeft <= 3 ? 'rgba(232,58,59,0.08)' : 'rgba(232,138,20,0.08)',
              borderBottom: `1px solid ${trialDaysLeft <= 3 ? 'rgba(232,58,59,0.25)' : 'rgba(232,138,20,0.25)'}`,
              padding: '8px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.8125rem',
              fontFamily: F.body,
            }}>
              <span>{trialDaysLeft <= 3 ? '⚠️' : '⚡'}</span>
              <span style={{ color: C.textPrimary, flex: 1 }}>
                Te quedan <strong>{trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''}</strong> de prueba
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.('settings')}
                style={{
                  background: trialDaysLeft <= 3 ? '#E83B3B' : '#E88A14',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  fontFamily: F.body,
                  cursor: 'pointer',
                }}
              >
                Elegir plan
              </button>
            </div>
          )}

          {/* ── Content ── */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              background: C.bgBase,
              position: 'relative',
            }}
            id="main-content"
            tabIndex={-1}
          >
            {children}
            {/* ── Expired overlay ── */}
            {subscriptionStatus === 'expired' && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(7,13,26,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 300,
              }}>
                <div style={{
                  background: C.bgRaised,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: 480,
                  padding: 40,
                  textAlign: 'center',
                  fontFamily: F.body,
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>{'🔒'}</div>
                  <h2 style={{
                    fontFamily: F.display,
                    fontSize: '1.375rem',
                    fontWeight: 800,
                    color: C.textPrimary,
                    marginBottom: 8,
                  }}>
                    Tu suscripción venció
                  </h2>
                  <p style={{
                    fontSize: '0.875rem',
                    color: C.textSecondary,
                    marginBottom: 24,
                    lineHeight: 1.6,
                  }}>
                    Tu cuenta está en modo solo lectura. Para recuperar el acceso completo, elegí un plan.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('settings')}
                    style={{
                      background: C.brand,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 32px',
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      fontFamily: F.body,
                      cursor: 'pointer',
                    }}
                  >
                    Elegir plan
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
