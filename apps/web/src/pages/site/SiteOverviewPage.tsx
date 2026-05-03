import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useIntl, defineMessages } from 'react-intl';
import { C, F } from '../../components/copilot/tokens.js';
import {
  ExternalLink,
  Pencil,
  Eye,
  FileText,
  Palette,
  Globe,
  BookOpen,
  TrendingUp,
  ArrowUpRight,
  Inbox,
} from 'lucide-react';

const messages = defineMessages({
  title: { id: 'website.overview.title' },
  viewSite: { id: 'website.overview.viewSite' },
  editSite: { id: 'website.overview.editSite' },
  statusPublished: { id: 'website.overview.status.published' },
  statusDraft: { id: 'website.overview.status.draft' },
  visits7d: { id: 'website.overview.stats.visits7d' },
  visits30d: { id: 'website.overview.stats.visits30d' },
  formSubmissions: { id: 'website.overview.stats.formSubmissions' },
  unread: { id: 'website.overview.stats.unread' },
  topPages: { id: 'website.overview.topPages' },
  colPage: { id: 'website.overview.topPages.col.page' },
  colVisits: { id: 'website.overview.topPages.col.visits' },
  colBounce: { id: 'website.overview.topPages.col.bounceRate' },
  period: { id: 'website.overview.topPages.period' },
  quickActionsPages: { id: 'website.overview.quickActions.pages' },
  quickActionsThemes: { id: 'website.overview.quickActions.themes' },
  quickActionsDomain: { id: 'website.overview.quickActions.domain' },
  quickActionsBlog: { id: 'website.overview.quickActions.blog' },
  quickActionsPagesDesc: { id: 'website.overview.quickActions.pages.desc' },
  quickActionsThemesDesc: { id: 'website.overview.quickActions.themes.desc' },
  quickActionsDomainDesc: { id: 'website.overview.quickActions.domain.desc' },
  quickActionsBlogDesc: { id: 'website.overview.quickActions.blog.desc' },
});

/* ─── Mock data ───────────────────────────────────────────────── */

const SITE = {
  name: 'Mi Inmobiliaria',
  url: 'miinmobiliaria.corredor.io',
  status: 'published' as const,
  lastPublished: '02/05/2026 14:38',
  theme: 'Moderno Oscuro',
};

const STATS = [
  { label: 'Visitas (7d)', value: '1.247', delta: '+12%', deltaType: 'positive' as const },
  { label: 'Visitas (30d)', value: '4.891', delta: '+8%', deltaType: 'positive' as const },
  { label: 'Envios de formulario', value: '23', badge: '5 sin leer', badgeType: 'info' as const },
];

const TOP_PAGES = [
  { page: 'Inicio',       visits: '892', bounce: '34%' },
  { page: 'Propiedades',  visits: '423', bounce: '45%' },
  { page: 'Contacto',     visits: '189', bounce: '28%' },
  { page: 'Servicios',    visits: '156', bounce: '52%' },
  { page: 'Blog',         visits: '87',  bounce: '61%' },
];

const QUICK_ACTIONS = [
  {
    icon: FileText,
    labelMsg: messages.quickActionsPages,
    descMsg: messages.quickActionsPagesDesc,
    to: '/site/pages',
  },
  {
    icon: Palette,
    labelMsg: messages.quickActionsThemes,
    descMsg: messages.quickActionsThemesDesc,
    to: '/site/themes',
  },
  {
    icon: Globe,
    labelMsg: messages.quickActionsDomain,
    descMsg: messages.quickActionsDomainDesc,
    to: '/site/domains',
  },
  {
    icon: BookOpen,
    labelMsg: messages.quickActionsBlog,
    descMsg: messages.quickActionsBlogDesc,
    to: '/site/blog',
  },
] as const;

/* ─── Shared focus ring style ─────────────────────────────────── */

const focusRing: React.CSSProperties = {
  outline: 'none',
};

function withFocusHandlers(el: HTMLElement | null) {
  if (!el) return;
  el.addEventListener('focus', () => {
    el.style.outline = `2px solid ${C.brand}`;
    el.style.outlineOffset = '2px';
  });
  el.addEventListener('blur', () => {
    el.style.outline = 'none';
  });
}

/* ─── Sub-components ──────────────────────────────────────────── */

function StatusBadge({ status }: { status: 'published' | 'draft' }) {
  const color = status === 'published' ? C.success : C.warning;
  const label = status === 'published' ? 'Publicado' : 'Borrador';
  return (
    <span
      role="status"
      aria-label={`Estado del sitio: ${label}`}
      style={{
        fontFamily: F.mono,
        fontSize: 11,
        padding: '3px 10px',
        borderRadius: 20,
        background: `${color}18`,
        color,
        border: `1px solid ${color}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: string }) {
  return (
    <span
      aria-label={`Cambio: ${delta}`}
      style={{
        fontFamily: F.mono,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
        background: C.successFaint,
        color: C.success,
        border: `1px solid ${C.success}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <ArrowUpRight size={11} aria-hidden="true" />
      {delta}
    </span>
  );
}

function InfoBadge({ text }: { text: string }) {
  return (
    <span
      aria-label={text}
      style={{
        fontFamily: F.mono,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 20,
        background: C.brandFaint,
        color: C.brand,
        border: `1px solid ${C.brand}40`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Inbox size={11} aria-hidden="true" />
      {text}
    </span>
  );
}

/* ─── Main ────────────────────────────────────────────────────── */

export default function SiteOverviewPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, fontFamily: F.body }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <h1 style={{
          fontFamily: F.display,
          fontSize: 22,
          fontWeight: 700,
          color: C.textPrimary,
          margin: 0,
        }}>
          {intl.formatMessage(messages.title)}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={`https://${SITE.url}`}
            target="_blank"
            rel="noreferrer"
            ref={withFocusHandlers}
            aria-label="Ver sitio en nueva pestana"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              minHeight: 44,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bgElevated,
              color: C.textSecondary,
              fontFamily: F.body,
              fontWeight: 500,
              fontSize: 13,
              textDecoration: 'none',
              cursor: 'pointer',
              ...focusRing,
            }}
          >
            <ExternalLink size={14} aria-hidden="true" />
            {intl.formatMessage(messages.viewSite)}
          </a>
          <button
            type="button"
            ref={withFocusHandlers}
            aria-label="Editar sitio en el constructor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 20px',
              minHeight: 44,
              borderRadius: 8,
              border: 'none',
              background: C.brand,
              color: '#fff',
              fontFamily: F.body,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              ...focusRing,
            }}
          >
            <Pencil size={14} aria-hidden="true" />
            {intl.formatMessage(messages.editSite)}
          </button>
        </div>
      </div>

      {/* ── Site status card ───────────────────────────────────── */}
      <div style={{
        background: C.bgRaised,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        padding: '24px 28px',
        marginBottom: 20,
        display: 'flex',
        gap: 28,
        alignItems: 'flex-start',
      }}>
        {/* Mini preview thumbnail */}
        <div
          aria-label="Vista previa del sitio"
          style={{
            width: 200,
            height: 140,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bgBase,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Mock browser chrome */}
          <div style={{
            height: 20,
            background: C.bgElevated,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#28c840' }} />
            <span style={{
              marginLeft: 6,
              flex: 1,
              height: 10,
              borderRadius: 3,
              background: C.bgBase,
            }} />
          </div>
          {/* Mock page content lines */}
          <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ width: '60%', height: 8, borderRadius: 2, background: C.bgElevated }} />
            <div style={{ width: '90%', height: 5, borderRadius: 2, background: C.bgSubtle }} />
            <div style={{ width: '75%', height: 5, borderRadius: 2, background: C.bgSubtle }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <div style={{ width: 36, height: 24, borderRadius: 3, background: C.brandFaint }} />
              <div style={{ width: 36, height: 24, borderRadius: 3, background: C.brandFaint }} />
              <div style={{ width: 36, height: 24, borderRadius: 3, background: C.brandFaint }} />
            </div>
          </div>
        </div>

        {/* Site details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h2 style={{
              fontFamily: F.display,
              fontSize: 18,
              fontWeight: 700,
              color: C.textPrimary,
              margin: 0,
            }}>
              {SITE.name}
            </h2>
            <StatusBadge status={SITE.status} />
          </div>

          <a
            href={`https://${SITE.url}`}
            target="_blank"
            rel="noreferrer"
            ref={withFocusHandlers}
            aria-label={`Abrir ${SITE.url} en nueva pestana`}
            style={{
              fontFamily: F.mono,
              fontSize: 13,
              color: C.brand,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              minHeight: 44,
              ...focusRing,
            }}
          >
            {SITE.url}
            <ExternalLink size={12} aria-hidden="true" />
          </a>

          <div style={{
            display: 'flex',
            gap: 24,
            marginTop: 14,
          }}>
            <div>
              <span style={{
                fontFamily: F.mono,
                fontSize: 10,
                color: C.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: 3,
              }}>
                Ultima publicacion
              </span>
              <span style={{ fontFamily: F.mono, fontSize: 13, color: C.textSecondary }}>
                {SITE.lastPublished}
              </span>
            </div>
            <div>
              <span style={{
                fontFamily: F.mono,
                fontSize: 10,
                color: C.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: 3,
              }}>
                Tema
              </span>
              <span style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                {SITE.theme}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14,
        marginBottom: 20,
      }}>
        {STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: C.bgRaised,
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: '20px 22px',
            }}
          >
            <span style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'block',
              marginBottom: 8,
            }}>
              {stat.label}
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
            }}>
              <span style={{
                fontFamily: F.mono,
                fontSize: 28,
                fontWeight: 700,
                color: C.textPrimary,
                lineHeight: 1,
              }}>
                {stat.value}
              </span>
              {stat.delta && <DeltaBadge delta={stat.delta} />}
              {stat.badge && <InfoBadge text={stat.badge} />}
            </div>
          </div>
        ))}
      </div>

      {/* ── Top pages table ────────────────────────────────────── */}
      <div style={{
        background: C.bgRaised,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={15} color={C.textTertiary} aria-hidden="true" />
            <h3 style={{
              fontFamily: F.display,
              fontSize: 14,
              fontWeight: 700,
              color: C.textPrimary,
              margin: 0,
            }}>
              {intl.formatMessage(messages.topPages)}
            </h3>
          </div>
          <span style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.textTertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {intl.formatMessage(messages.period)}
          </span>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          padding: '8px 20px',
          borderBottom: `1px solid ${C.border}`,
          background: C.bgBase,
        }}>
          {[intl.formatMessage(messages.colPage), intl.formatMessage(messages.colVisits), intl.formatMessage(messages.colBounce)].map((h) => (
            <span key={h} style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {TOP_PAGES.map((row, idx) => (
          <div
            key={row.page}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              padding: '11px 20px',
              alignItems: 'center',
              background: idx % 2 === 0 ? C.bgRaised : C.bgBase,
              borderBottom: idx < TOP_PAGES.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <span style={{
              fontFamily: F.body,
              fontSize: 13,
              fontWeight: 500,
              color: C.textPrimary,
            }}>
              {row.page}
            </span>
            <span style={{
              fontFamily: F.mono,
              fontSize: 13,
              color: C.textSecondary,
            }}>
              {row.visits}
            </span>
            <span style={{
              fontFamily: F.mono,
              fontSize: 13,
              color: C.textSecondary,
            }}>
              {row.bounce}
            </span>
          </div>
        ))}
      </div>

      {/* ── Quick actions grid ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 14,
      }}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const label = intl.formatMessage(action.labelMsg);
          const desc = intl.formatMessage(action.descMsg);
          return (
            <button
              type="button"
              key={action.to}
              ref={withFocusHandlers}
              onClick={() => void navigate({ to: action.to as never })}
              aria-label={`${label}: ${desc}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '20px 22px',
                minHeight: 44,
                background: C.bgRaised,
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
                ...focusRing,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.borderHover;
                e.currentTarget.style.background = C.bgElevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.bgRaised;
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.brandFaint,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={18} color={C.brand} aria-hidden="true" />
              </div>
              <div>
                <span style={{
                  fontFamily: F.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.textPrimary,
                  display: 'block',
                  marginBottom: 3,
                }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: F.body,
                  fontSize: 12,
                  color: C.textSecondary,
                  lineHeight: 1.4,
                }}>
                  {desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
