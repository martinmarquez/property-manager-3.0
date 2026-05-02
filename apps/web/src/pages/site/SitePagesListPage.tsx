import React, { useState } from 'react';
import {
  FileText, Home, Edit3, Copy, MoreHorizontal, Plus, Globe,
  Check, Search, ExternalLink, Trash2, Send, ChevronDown,
  BarChart2, Upload,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Corredor — Website Builder: SitePagesListPage
   Route: /site
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:        '#070D1A',
  bgRaised:      '#0D1526',
  bgElevated:    '#131E33',
  bgSubtle:      '#162035',
  brand:         '#1654d9',
  brandHover:    '#1244b8',
  brandLight:    '#4669ff',
  brandFaint:    'rgba(22,84,217,0.12)',
  border:        '#1F2D48',
  borderStrong:  '#253350',
  success:       '#18A659',
  successFaint:  'rgba(24,166,89,0.12)',
  warning:       '#E88A14',
  warningFaint:  'rgba(232,138,20,0.12)',
  error:         '#E83B3B',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#506180',
  textDisabled:  '#3A4E6A',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

// ─── Types ────────────────────────────────────────────────

type SiteTab = 'pages' | 'themes' | 'domain' | 'forms';

type PageStatus = 'published' | 'draft';

interface SitePage {
  id: string;
  name: string;
  slug: string;
  status: PageStatus;
  lastModified: string;
  isHome: boolean;
}

interface Theme {
  id: string;
  name: string;
  accent: string;
  bg: string;
  preview: { header: string; body: string; cta: string };
  active: boolean;
}

interface FormSubmission {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  status: 'new' | 'read' | 'replied';
}

// ─── Mock data ────────────────────────────────────────────

const PAGES: SitePage[] = [
  { id: 'p1', name: 'Inicio',       slug: '/',           status: 'published', lastModified: 'Hace 2 días',    isHome: true },
  { id: 'p2', name: 'Propiedades',  slug: '/properties', status: 'published', lastModified: 'Hace 1 semana',  isHome: false },
  { id: 'p3', name: 'Nosotros',     slug: '/about',      status: 'published', lastModified: 'Hace 2 semanas', isHome: false },
  { id: 'p4', name: 'Blog',         slug: '/blog',       status: 'draft',     lastModified: 'Hace 1 día',     isHome: false },
  { id: 'p5', name: 'Contacto',     slug: '/contact',    status: 'published', lastModified: 'Hace 3 semanas', isHome: false },
  { id: 'p6', name: 'Tasaciones',   slug: '/appraisals', status: 'draft',     lastModified: 'Hace 5 días',    isHome: false },
];

const THEMES: Theme[] = [
  { id: 'modern',  name: 'Modern',   accent: '#1654d9', bg: '#070D1A',
    preview: { header: '#0D1526', body: '#070D1A', cta: '#1654d9' }, active: true },
  { id: 'minimal', name: 'Minimal',  accent: '#18A659', bg: '#F8FAFB',
    preview: { header: '#FFFFFF', body: '#F8FAFB', cta: '#18A659' }, active: false },
  { id: 'luxury',  name: 'Luxury',   accent: '#C9A227', bg: '#1A1208',
    preview: { header: '#24180A', body: '#1A1208', cta: '#C9A227' }, active: false },
  { id: 'bold',    name: 'Bold',     accent: '#E83B3B', bg: '#0F0F0F',
    preview: { header: '#1A1A1A', body: '#0F0F0F', cta: '#E83B3B' }, active: false },
  { id: 'natural', name: 'Natural',  accent: '#3DAB7B', bg: '#F4F2EE',
    preview: { header: '#EAE8E4', body: '#F4F2EE', cta: '#3DAB7B' }, active: false },
];

const SUBMISSIONS: FormSubmission[] = [
  { id: 's1', date: '02/05/2026', name: 'Laura Rodríguez', email: 'laura@email.com', phone: '+54 11 5555-1234', property: 'Palermo 3amb',  status: 'new' },
  { id: 's2', date: '01/05/2026', name: 'Carlos Méndez',   email: 'carlos@email.com', phone: '+54 11 5555-5678', property: 'Belgrano PH', status: 'read' },
  { id: 's3', date: '01/05/2026', name: 'Ana Torres',      email: 'ana@email.com',    phone: '+54 11 5555-9012', property: 'Villa Crespo 2amb', status: 'replied' },
  { id: 's4', date: '30/04/2026', name: 'Martín Silva',    email: 'martin@email.com', phone: '+54 11 5555-3456', property: '—',           status: 'replied' },
  { id: 's5', date: '29/04/2026', name: 'Sofía López',     email: 'sofia@email.com',  phone: '+54 9 351 555-7890', property: 'Recoleta Monoambiente', status: 'read' },
];

// ─── Shared ───────────────────────────────────────────────

function PageHeader({ title, subtitle, cta }: { title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div style={{
      padding:      '24px 28px 20px',
      borderBottom: `1px solid ${C.border}`,
      display:      'flex',
      alignItems:   'flex-end',
      justifyContent: 'space-between',
    }}>
      <div>
        <h1 style={{ fontFamily: F.display, fontSize: '1.375rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: subtitle ? 4 : 0 }}>
          {title}
        </h1>
        {subtitle && <p style={{ fontFamily: F.body, fontSize: '0.875rem', color: C.textTertiary }}>{subtitle}</p>}
      </div>
      {cta}
    </div>
  );
}

function PrimaryButton({ label, onClick }: { label: string; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          6,
        padding:      '9px 18px',
        background:   hover ? '#1244b8' : C.brand,
        border:       'none',
        borderRadius: 8,
        color:        'white',
        fontFamily:   F.body,
        fontSize:     '0.875rem',
        fontWeight:   600,
        cursor:       'pointer',
        transition:   'background 150ms ease',
        whiteSpace:   'nowrap',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <line x1="8" y1="2" x2="8" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2" y1="8" x2="14" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {label}
    </button>
  );
}

// ─── Tab nav ──────────────────────────────────────────────

function SiteTabNav({ active, onChange }: { active: SiteTab; onChange: (t: SiteTab) => void }) {
  const tabs: { key: SiteTab; label: string; icon: React.ReactNode }[] = [
    { key: 'pages',  label: 'Páginas',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { key: 'themes', label: 'Temas',      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    { key: 'domain', label: 'Dominio',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    { key: 'forms',  label: 'Formularios', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ];

  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 28px' }}>
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '12px 16px',
            background:   'transparent',
            border:       'none',
            borderBottom: `2px solid ${active === t.key ? C.brand : 'transparent'}`,
            color:        active === t.key ? C.textPrimary : C.textTertiary,
            fontFamily:   F.body,
            fontSize:     13,
            fontWeight:   active === t.key ? 600 : 400,
            cursor:       'pointer',
            transition:   'all 120ms ease',
            marginBottom: -1,
          }}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Pages tab ────────────────────────────────────────────

function StatusBadge({ status }: { status: PageStatus }) {
  const isPublished = status === 'published';
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          4,
      padding:      '2px 8px',
      borderRadius: 20,
      fontFamily:   F.body,
      fontSize:     11,
      fontWeight:   500,
      background:   isPublished ? C.successFaint : C.bgSubtle,
      color:        isPublished ? C.success : C.textTertiary,
      border:       `1px solid ${isPublished ? 'rgba(24,166,89,0.3)' : C.border}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isPublished ? C.success : C.textDisabled }} />
      {isPublished ? 'Publicada' : 'Borrador'}
    </span>
  );
}

function PageCardKebab() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        aria-label="Opciones de página"
        style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', border: `1px solid ${C.border}`,
          color: C.textTertiary, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 32, zIndex: 10,
          background: C.bgRaised, border: `1px solid ${C.border}`,
          borderRadius: 8, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          {[{ label: 'Editar', icon: '✏️' }, { label: 'Duplicar', icon: '⧉' }, { label: 'Ver en vivo', icon: '↗' }, { label: 'Eliminar', icon: '🗑', danger: true }].map(item => (
            <button
              key={item.label}
              type="button"
              style={{
                width: '100%', padding: '9px 14px', background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: F.body, fontSize: 13,
                color: (item as {danger?: boolean}).danger ? '#E83B3B' : C.textSecondary,
                display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PagesTab() {
  return (
    <div style={{ padding: 28 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {PAGES.map(page => (
          <PageCard key={page.id} page={page} />
        ))}
        {/* New page card */}
        <button
          type="button"
          style={{
            background: 'transparent',
            border: `2px dashed ${C.border}`,
            borderRadius: 12,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 160,
            color: C.textTertiary,
            fontFamily: F.body,
            fontSize: 13,
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand; (e.currentTarget as HTMLButtonElement).style.color = C.brand; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textTertiary; }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva página
        </button>
      </div>
    </div>
  );
}

function PageCard({ page }: { page: SitePage }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   C.bgRaised,
        border:       `1px solid ${hover ? C.borderStrong : C.border}`,
        borderRadius: 12,
        overflow:     'hidden',
        cursor:       'pointer',
        transition:   'border-color 150ms ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height:     140,
        background: page.status === 'published' ? C.bgElevated : C.bgSubtle,
        borderBottom: `1px solid ${C.border}`,
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position:   'relative',
      }}>
        {/* Mock page wireframe */}
        <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 20, background: C.bgBase, borderRadius: 3 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={{ height: 40, background: C.bgBase, borderRadius: 3 }} />
            <div style={{ height: 40, background: C.bgBase, borderRadius: 3 }} />
          </div>
          <div style={{ height: 8, background: C.bgBase, borderRadius: 3, width: '60%' }} />
        </div>
        {page.isHome && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            fontFamily: F.mono, fontSize: 9, color: C.brand,
            background: C.brandFaint, padding: '2px 6px', borderRadius: 4,
            border: `1px solid rgba(22,84,217,0.3)`,
          }}>
            INICIO
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily:   F.body,
            fontSize:     13,
            fontWeight:   600,
            color:        C.textPrimary,
            marginBottom: 2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {page.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={page.status} />
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>{page.lastModified}</span>
          </div>
        </div>
        <PageCardKebab />
      </div>
    </div>
  );
}

// ─── Themes tab ───────────────────────────────────────────

function ThemesTab() {
  const [themes, setThemes] = useState(THEMES);
  const [confirmTheme, setConfirmTheme] = useState<string | null>(null);

  const applyTheme = (id: string) => {
    setThemes(prev => prev.map(t => ({ ...t, active: t.id === id })));
    setConfirmTheme(null);
  };

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            onApply={() => theme.active ? undefined : setConfirmTheme(theme.id)}
          />
        ))}
      </div>

      {/* Confirm modal */}
      {confirmTheme && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(7,13,26,0.85)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: C.bgRaised, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 28, maxWidth: 380, width: '90%',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ fontFamily: F.display, fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
              Cambiar tema visual
            </h3>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 20 }}>
              Esto aplicará el tema a todas las páginas de tu sitio. ¿Querés continuar?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirmTheme(null)} style={{
                padding: '8px 16px', borderRadius: 7, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textSecondary,
                fontFamily: F.body, fontSize: 13, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button type="button" onClick={() => applyTheme(confirmTheme)} style={{
                padding: '8px 16px', borderRadius: 7, border: 'none',
                background: C.brand, color: 'white',
                fontFamily: F.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Aplicar tema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeCard({ theme, onApply }: { theme: Theme; onApply: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   C.bgRaised,
        border:       `2px solid ${theme.active ? theme.accent : hover ? C.borderStrong : C.border}`,
        borderRadius: 12,
        overflow:     'hidden',
        transition:   'border-color 150ms ease',
      }}
    >
      {/* Theme preview */}
      <div style={{ height: 140, background: theme.preview.body, position: 'relative', overflow: 'hidden' }}>
        <div style={{ height: 32, background: theme.preview.header, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
          <div style={{ width: 48, height: 8, background: theme.accent, borderRadius: 3 }} />
          <div style={{ flex: 1 }} />
          {[1,2,3].map(i => <div key={i} style={{ width: 30, height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3 }} />)}
        </div>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 3, width: '70%' }} />
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }} />
          <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 3, width: '80%' }} />
          <div style={{ height: 28, background: theme.accent, borderRadius: 5, width: 80, marginTop: 4, opacity: 0.9 }} />
        </div>
        {theme.active && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: theme.accent, borderRadius: 20, padding: '3px 8px',
            fontFamily: F.mono, fontSize: 9, color: 'white', fontWeight: 700,
          }}>
            ACTIVO
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{theme.name}</span>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: theme.accent }} />
            <div style={{ width: 12, height: 12, borderRadius: 2, background: theme.preview.header }} />
          </div>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={theme.active}
          style={{
            padding:    '5px 12px',
            borderRadius: 6,
            border:     `1px solid ${theme.active ? C.border : theme.accent}`,
            background: theme.active ? 'transparent' : `${theme.accent}20`,
            color:      theme.active ? C.textDisabled : theme.accent,
            fontFamily: F.body,
            fontSize:   12,
            fontWeight: 500,
            cursor:     theme.active ? 'default' : 'pointer',
          }}
        >
          {theme.active ? 'Activo' : 'Aplicar'}
        </button>
      </div>
    </div>
  );
}

// ─── Domain tab ───────────────────────────────────────────

type DomainStep = 0 | 1 | 2;

function DomainTab() {
  const [step, setStep] = useState<DomainStep>(0);
  const [domain, setDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = () => {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerified(true); }, 2000);
  };

  const dnsRecords = [
    { type: 'CNAME', name: 'www',  value: 'sites.corredor.app' },
    { type: 'A',     name: '@',    value: '76.76.21.21' },
  ];

  return (
    <div style={{ padding: '28px 28px', maxWidth: 600 }}>
      {/* Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {[{ label: 'Ingresar dominio', idx: 0 }, { label: 'Configurar DNS', idx: 1 }, { label: 'Verificación', idx: 2 }].map((s, i) => (
          <React.Fragment key={s.idx}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width:        24,
                height:       24,
                borderRadius: 12,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                background:   step > s.idx ? C.success : step === s.idx ? C.brand : C.bgSubtle,
                border:       `2px solid ${step > s.idx ? C.success : step === s.idx ? C.brand : C.border}`,
                fontFamily:   F.mono,
                fontSize:     11,
                color:        step >= s.idx ? 'white' : C.textTertiary,
                fontWeight:   700,
                flexShrink:   0,
              }}>
                {step > s.idx ? '✓' : s.idx + 1}
              </div>
              <span style={{
                fontFamily: F.body,
                fontSize:   13,
                color:      step === s.idx ? C.textPrimary : step > s.idx ? C.success : C.textTertiary,
                fontWeight: step === s.idx ? 600 : 400,
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > i ? C.success : C.border, margin: '0 8px' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && (
        <div>
          <label style={{ display: 'block', fontFamily: F.body, fontSize: 13, color: C.textSecondary, marginBottom: 8 }}>
            Dominio personalizado
          </label>
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder="miinmobiliaria.com"
            aria-label="Dominio personalizado"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bgBase,
              color: C.textPrimary, fontFamily: F.mono, fontSize: 14,
            }}
          />
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, marginTop: 8 }}>
            Ingresá el dominio raíz sin "www". Podés usar un dominio propio o uno comprado en cualquier registrador.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={() => domain && setStep(1)}
              disabled={!domain}
              style={{
                padding: '9px 20px', borderRadius: 7, border: 'none',
                background: domain ? C.brand : C.bgSubtle,
                color: domain ? 'white' : C.textDisabled,
                fontFamily: F.body, fontSize: 13, fontWeight: 600,
                cursor: domain ? 'pointer' : 'default',
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
            Agregá estos registros DNS en tu panel de administración de dominio para <strong style={{ color: C.textPrimary }}>{domain || 'miinmobiliaria.com'}</strong>:
          </p>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 36px', padding: '8px 14px', background: C.bgSubtle, borderBottom: `1px solid ${C.border}` }}>
              {['Tipo', 'Nombre', 'Valor', ''].map(h => (
                <span key={h} style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {dnsRecords.map(r => (
              <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '80px 100px 1fr 36px', padding: '10px 14px', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.brand, fontWeight: 600 }}>{r.type}</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textPrimary }}>{r.name}</span>
                <span style={{ fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{r.value}</span>
                <button
                  type="button"
                  aria-label={`Copiar valor ${r.value}`}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textTertiary, padding: 4 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary }}>
            Los cambios de DNS pueden tardar hasta 48h en propagarse.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button type="button" onClick={() => setStep(0)} style={{ padding: '9px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer' }}>
              ← Atrás
            </button>
            <button type="button" onClick={() => setStep(2)} style={{ padding: '9px 20px', borderRadius: 7, border: 'none', background: C.brand, color: 'white', fontFamily: F.body, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Verificar →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {!verified ? (
            <>
              <div style={{
                padding: 20, background: C.bgSubtle, borderRadius: 10,
                border: `1px solid ${C.border}`, marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bgElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>
                    Verificando propagación de DNS…
                  </p>
                  <p style={{ fontFamily: F.body, fontSize: 12, color: C.textSecondary }}>
                    Verificando <strong style={{ fontFamily: F.mono }}>{domain || 'miinmobiliaria.com'}</strong> — puede tardar algunos minutos.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => setStep(1)} style={{ padding: '9px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer' }}>
                  ← Atrás
                </button>
                <button type="button" onClick={handleVerify} disabled={verifying} style={{
                  padding: '9px 20px', borderRadius: 7, border: 'none',
                  background: verifying ? C.bgSubtle : C.brand,
                  color: verifying ? C.textDisabled : 'white',
                  fontFamily: F.body, fontSize: 13, fontWeight: 600,
                  cursor: verifying ? 'default' : 'pointer',
                }}>
                  {verifying ? 'Verificando…' : 'Comprobar ahora'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 28,
                background: C.successFaint, border: `2px solid ${C.success}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: F.display, fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
                ¡Dominio configurado!
              </h3>
              <p style={{ fontFamily: F.mono, fontSize: 14, color: C.success, marginBottom: 4 }}>
                {domain || 'miinmobiliaria.com'}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>
                SSL configurado automáticamente. Tu sitio ya está disponible en tu dominio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Forms tab ────────────────────────────────────────────

function SubmissionStatusBadge({ status }: { status: FormSubmission['status'] }) {
  const config = {
    new:     { label: 'Nuevo',      bg: 'rgba(22,84,217,0.12)',    color: '#4669ff',  border: 'rgba(22,84,217,0.3)' },
    read:    { label: 'Leído',      bg: C.bgSubtle,                color: C.textTertiary, border: C.border },
    replied: { label: 'Respondido', bg: 'rgba(24,166,89,0.12)',    color: C.success,  border: 'rgba(24,166,89,0.3)' },
  }[status];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontFamily: F.body, fontSize: 11,
      background: config.bg, color: config.color, border: `1px solid ${config.border}`,
    }}>
      {config.label}
    </span>
  );
}

function FormsTab() {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar envíos"
            style={{
              padding: '8px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
              background: C.bgBase, color: C.textPrimary, fontFamily: F.body, fontSize: 13,
              width: 260,
            }}
          />
          <select aria-label="Filtrar por estado" style={{ padding: '8px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.bgBase, color: C.textSecondary, fontFamily: F.body, fontSize: 13 }}>
            <option>Todos los estados</option>
            <option>Nuevo</option>
            <option>Leído</option>
            <option>Respondido</option>
          </select>
        </div>
        <button type="button" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 7,
          border: `1px solid ${C.border}`, background: 'transparent',
          color: C.textSecondary, fontFamily: F.body, fontSize: 13, cursor: 'pointer',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.bgSubtle }}>
              {['Fecha', 'Nombre', 'Email', 'Teléfono', 'Propiedad', 'Estado', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontFamily: F.mono, fontSize: 10, color: C.textTertiary,
                  fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SUBMISSIONS.map((sub, i) => (
              <tr
                key={sub.id}
                style={{ background: i % 2 === 0 ? 'transparent' : C.bgRaised }}
              >
                <td style={{ padding: '12px 14px', fontFamily: F.mono, fontSize: 12, color: C.textTertiary }}>{sub.date}</td>
                <td style={{ padding: '12px 14px', fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{sub.name}</td>
                <td style={{ padding: '12px 14px', fontFamily: F.body, fontSize: 13, color: C.textSecondary }}>{sub.email}</td>
                <td style={{ padding: '12px 14px', fontFamily: F.mono, fontSize: 12, color: C.textSecondary }}>{sub.phone}</td>
                <td style={{ padding: '12px 14px', fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>{sub.property}</td>
                <td style={{ padding: '12px 14px' }}><SubmissionStatusBadge status={sub.status} /></td>
                <td style={{ padding: '12px 14px' }}>
                  <button type="button" aria-label="Ver detalle" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textTertiary, padding: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <span style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary }}>
          Mostrando 5 de 5 envíos
        </span>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────

export function SitePagesListPage() {
  const [tab, setTab] = useState<SiteTab>('pages');

  const ctaByTab: Partial<Record<SiteTab, React.ReactNode>> = {
    pages: <PrimaryButton label="Nueva página" />,
    forms: undefined,
  };

  const titleByTab: Record<SiteTab, string> = {
    pages:  'Sitio Web',
    themes: 'Sitio Web',
    domain: 'Sitio Web',
    forms:  'Sitio Web',
  };

  return (
    <div style={{ minHeight: '100%', fontFamily: F.body, background: C.bgBase }}>
      <PageHeader
        title={titleByTab[tab]}
        subtitle="Gestioná tu sitio web para clientes"
        cta={ctaByTab[tab]}
      />

      <SiteTabNav active={tab} onChange={setTab} />

      {tab === 'pages'  && <PagesTab />}
      {tab === 'themes' && <ThemesTab />}
      {tab === 'domain' && <DomainTab />}
      {tab === 'forms'  && <FormsTab />}
    </div>
  );
}
