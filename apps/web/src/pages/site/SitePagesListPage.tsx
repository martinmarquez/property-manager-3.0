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
  display: "'Syne', sans-serif",
  body:    "'DM Sans', sans-serif",
  mono:    "'DM Mono', monospace",
};

// ─── Types ────────────────────────────────────────────────

type TabId = 'paginas' | 'temas' | 'dominio' | 'formularios';
type PageStatus = 'publicada' | 'borrador';
type StatusFilter = 'todas' | 'publicada' | 'borrador';
type DomainStep = 1 | 2 | 3;
type SubmissionStatus = 'nuevo' | 'leido' | 'archivado';

interface PageItem {
  id: string;
  name: string;
  slug: string;
  status: PageStatus;
  lastModified: string;
  isHome: boolean;
}

interface ThemeOption {
  id: string;
  label: string;
  bg: string;
  accent: string;
  text: string;
  desc: string;
}

interface Submission {
  id: string;
  fecha: string;
  nombre: string;
  email: string;
  telefono: string;
  formulario: string;
  estado: SubmissionStatus;
}

// ─── Mock data ────────────────────────────────────────────

const PAGES: PageItem[] = [
  { id: 'p1', name: 'Inicio',      slug: '/',             status: 'publicada', lastModified: 'hace 2h',    isHome: true  },
  { id: 'p2', name: 'Servicios',   slug: '/servicios',    status: 'publicada', lastModified: 'ayer',       isHome: false },
  { id: 'p3', name: 'Propiedades', slug: '/propiedades',  status: 'borrador',  lastModified: 'hace 3d',    isHome: false },
  { id: 'p4', name: 'Contacto',    slug: '/contacto',     status: 'borrador',  lastModified: 'hace 1 sem', isHome: false },
];

const THEMES_SHOWCASE: ThemeOption[] = [
  { id: 'clasico', label: 'Clásico',  bg: C.bgElevated, accent: C.brand,    text: C.textPrimary, desc: 'Elegante y profesional'  },
  { id: 'oscuro',  label: 'Oscuro',   bg: '#0A0A0A',    accent: '#E0E0E0',  text: '#FFFFFF',     desc: 'Minimalismo oscuro'       },
  { id: 'tierra',  label: 'Tierra',   bg: '#2C1810',    accent: '#8B5E3C',  text: '#F5EDE0',     desc: 'Cálido y cercano'         },
  { id: 'moderno', label: 'Moderno',  bg: '#0A1628',    accent: '#0ED2A0',  text: '#EFF4FF',     desc: 'Fresco y tecnológico'     },
  { id: 'minimal', label: 'Minimal',  bg: '#F8F9FA',    accent: '#1A1A1A',  text: '#1A1A1A',     desc: 'Limpio y ordenado'        },
];

const SUBMISSIONS: Submission[] = [
  { id: 's1', fecha: '02/05/2026', nombre: 'Carlos Pérez',    email: 'cperez@gmail.com',     telefono: '11 4523-1987', formulario: 'Contacto',   estado: 'nuevo'     },
  { id: 's2', fecha: '02/05/2026', nombre: 'Ana Giménez',     email: 'agimenez@yahoo.com',   telefono: '11 3341-6602', formulario: 'Newsletter', estado: 'nuevo'     },
  { id: 's3', fecha: '01/05/2026', nombre: 'Marcelo Torres',  email: 'mtorres@gmail.com',    telefono: '11 5567-4421', formulario: 'Búsqueda',   estado: 'leido'     },
  { id: 's4', fecha: '30/04/2026', nombre: 'Lucía Fernández', email: 'lfernandez@gmail.com', telefono: '11 2214-9087', formulario: 'Contacto',   estado: 'leido'     },
  { id: 's5', fecha: '29/04/2026', nombre: 'Roberto Suárez',  email: 'rsuarez@hotmail.com',  telefono: '11 6698-3345', formulario: 'Contacto',   estado: 'archivado' },
];

const DNS_RECORDS = [
  { type: 'A',     name: '@',   value: '76.76.21.21'      },
  { type: 'CNAME', name: 'www', value: 'proxy.corredor.ar'},
];

// ─── Shared helpers ───────────────────────────────────────

function Badge({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontFamily: F.mono, fontSize: 10, fontWeight: 600,
      color, background: bg, border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  );
}

function PrimaryBtn({ children, onClick, small }: { children: React.ReactNode; onClick?: () => void; small?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 12px' : '8px 16px', borderRadius: 8, border: 'none',
        background: hov ? C.brandHover : C.brand, color: '#fff',
        fontFamily: F.body, fontSize: small ? 12 : 13, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
        boxShadow: '0 2px 8px rgba(22,84,217,0.25)',
      }}>
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`,
        background: hov ? C.bgElevated : C.bgRaised, color: C.textSecondary,
        fontFamily: F.body, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.15s',
      }}>
      {children}
    </button>
  );
}

// ─── Páginas tab ──────────────────────────────────────────

function PaginasTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const filtered = PAGES.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todas' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColors: Record<PageStatus, { color: string; bg: string }> = {
    publicada: { color: C.success, bg: C.successFaint },
    borrador:  { color: C.textTertiary, bg: C.bgElevated },
  };
  const statusLabels: Record<PageStatus, string> = {
    publicada: 'Publicada', borrador: 'Borrador',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color={C.textTertiary} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar páginas…"
            onFocus={() => setFocusedSearch(true)} onBlur={() => setFocusedSearch(false)}
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
              border: `1px solid ${focusedSearch ? C.brand : C.border}`,
              background: C.bgRaised, color: C.textPrimary,
              fontFamily: F.body, fontSize: 13, outline: 'none',
              boxSizing: 'border-box', transition: 'border-color 0.15s',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['todas', 'publicada', 'borrador'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 12px', borderRadius: 7,
                border: `1px solid ${statusFilter === s ? C.brand : C.border}`,
                background: statusFilter === s ? C.brandFaint : C.bgRaised,
                color: statusFilter === s ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
              {s === 'todas' ? 'Todas' : s === 'publicada' ? 'Publicada' : 'Borrador'}
            </button>
          ))}
        </div>
        <PrimaryBtn><Plus size={14} /> Nueva página</PrimaryBtn>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: C.bgRaised, borderRadius: 12, border: `1px solid ${C.border}`,
        }}>
          <FileText size={40} color={C.textTertiary} style={{ display: 'block', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: F.display, fontSize: 16, color: C.textSecondary, margin: '0 0 6px' }}>
            Aún no tenés páginas
          </p>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: '0 0 20px' }}>
            Creá tu primera página para empezar a construir tu sitio
          </p>
          <PrimaryBtn><Plus size={14} /> Creá tu primera</PrimaryBtn>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {filtered.map(page => {
            const st = statusColors[page.status];
            const isMenuOpen = openMenu === page.id;
            return (
              <div key={page.id} style={{
                background: C.bgRaised, borderRadius: 12,
                border: `1px solid ${C.border}`, overflow: 'hidden',
                position: 'relative', transition: 'border-color 0.15s',
              }}>
                {/* Thumbnail */}
                <div style={{
                  height: 160, background: C.bgElevated,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: `1px solid ${C.border}`, position: 'relative',
                }}>
                  <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: 6, opacity: 0.4 }}>
                    <div style={{ height: 20, background: C.bgSubtle, borderRadius: 3 }} />
                    <div style={{ height: 8, background: C.bgSubtle, borderRadius: 3, width: '70%' }} />
                    <div style={{ height: 8, background: C.bgSubtle, borderRadius: 3, width: '90%' }} />
                    <div style={{ height: 8, background: C.bgSubtle, borderRadius: 3, width: '60%' }} />
                    <div style={{ height: 14, background: C.brand, borderRadius: 3, width: '35%', opacity: 0.6 }} />
                  </div>
                  {page.isHome && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: C.brandFaint, border: `1px solid ${C.brand}40`,
                      borderRadius: 6, padding: '3px 7px',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Home size={10} color={C.brand} />
                      <span style={{ fontFamily: F.mono, fontSize: 9, color: C.brand }}>Inicio</span>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: C.bgRaised, border: `1px solid ${C.border}`,
                    borderRadius: 6, padding: '4px 8px',
                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  }}>
                    <Edit3 size={11} color={C.textSecondary} />
                    <span style={{ fontFamily: F.body, fontSize: 11, color: C.textSecondary }}>Editar</span>
                  </div>
                </div>
                {/* Body */}
                <div style={{ padding: '12px 14px 0' }}>
                  <p style={{ fontFamily: F.display, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: '0 0 3px' }}>
                    {page.name}
                  </p>
                  <p style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary, margin: 0 }}>
                    {page.slug}
                  </p>
                </div>
                {/* Footer */}
                <div style={{
                  padding: '8px 14px 12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                  borderTop: `1px solid ${C.border}`, marginTop: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge color={st.color} bg={st.bg}>{statusLabels[page.status]}</Badge>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.textTertiary }}>{page.lastModified}</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setOpenMenu(isMenuOpen ? null : page.id)}
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid ${isMenuOpen ? C.border : 'transparent'}`,
                        background: isMenuOpen ? C.bgElevated : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textTertiary,
                      }}>
                      <MoreHorizontal size={14} />
                    </button>
                    {isMenuOpen && (
                      <div style={{
                        position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                        background: C.bgRaised, border: `1px solid ${C.border}`,
                        borderRadius: 8, overflow: 'hidden', minWidth: 170,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50,
                      }}>
                        {[
                          { icon: <Edit3 size={12} />, label: 'Editar' },
                          { icon: <Copy size={12} />, label: 'Duplicar' },
                          { icon: <Home size={12} />, label: 'Establecer como inicio' },
                        ].map((item, i) => (
                          <button key={i} onClick={() => setOpenMenu(null)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              width: '100%', padding: '9px 12px',
                              border: 'none', borderBottom: `1px solid ${C.border}`,
                              background: 'transparent', cursor: 'pointer',
                              fontFamily: F.body, fontSize: 12, color: C.textSecondary, textAlign: 'left',
                            }}>
                            <span style={{ color: C.textTertiary }}>{item.icon}</span>
                            {item.label}
                          </button>
                        ))}
                        <button onClick={() => setOpenMenu(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '9px 12px',
                            border: 'none', background: 'transparent',
                            cursor: 'pointer', fontFamily: F.body, fontSize: 12, color: C.error, textAlign: 'left',
                          }}>
                          <Trash2 size={12} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Temas tab ────────────────────────────────────────────

function TemasTab() {
  const [selectedTheme, setSelectedTheme] = useState('clasico');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
          Elegí un tema
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          El tema define el estilo visual de todo tu sitio
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {THEMES_SHOWCASE.map(theme => {
          const isActive = selectedTheme === theme.id;
          return (
            <div key={theme.id} style={{
              background: C.bgRaised, borderRadius: 10,
              border: `1px solid ${isActive ? C.brand : C.border}`,
              overflow: 'hidden',
              borderTop: isActive ? `3px solid ${C.brand}` : `3px solid transparent`,
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                height: 140, background: theme.bg,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                position: 'relative',
              }}>
                <div style={{ width: '75%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ height: 4, background: theme.accent, borderRadius: 2, width: '50%' }} />
                  <span style={{
                    fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700,
                    color: theme.text, lineHeight: 1,
                  }}>
                    Aa
                  </span>
                  <div style={{ height: 3, background: theme.text, borderRadius: 2, width: '90%', opacity: 0.2 }} />
                  <div style={{ height: 3, background: theme.text, borderRadius: 2, width: '70%', opacity: 0.15 }} />
                  <div style={{ marginTop: 4, height: 18, width: '40%', borderRadius: 3, background: theme.accent, opacity: 0.9 }} />
                </div>
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8, width: 20, height: 20,
                    borderRadius: '50%', background: C.brand, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Check size={11} color="#fff" />
                  </div>
                )}
              </div>
              <div style={{
                padding: '10px 12px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderTop: `1px solid ${C.border}`,
              }}>
                <div>
                  <p style={{ fontFamily: F.display, fontSize: 13, fontWeight: 600, color: C.textPrimary, margin: 0 }}>
                    {theme.label}
                  </p>
                  <p style={{ fontFamily: F.body, fontSize: 11, color: C.textTertiary, margin: '2px 0 0' }}>
                    {theme.desc}
                  </p>
                </div>
                {isActive ? (
                  <Badge color={C.brand} bg={C.brandFaint}>Activo</Badge>
                ) : (
                  <button onClick={() => setSelectedTheme(theme.id)}
                    style={{
                      padding: '5px 10px', borderRadius: 6,
                      border: `1px solid ${C.border}`, background: C.bgElevated,
                      color: C.textSecondary, fontFamily: F.body, fontSize: 11, cursor: 'pointer',
                    }}>
                    Aplicar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dominio tab ──────────────────────────────────────────

function DominioTab() {
  const [step, setStep] = useState<DomainStep>(1);
  const [domain, setDomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [domFocused, setDomFocused] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleVerify = () => {
    if (!domain.includes('.')) return;
    setChecking(true);
    setTimeout(() => { setChecking(false); setStep(2); }, 1200);
  };

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(val);
    setTimeout(() => setCopied(null), 1800);
  };

  const steps = [
    { n: 1 as DomainStep, label: 'Ingresá tu dominio' },
    { n: 2 as DomainStep, label: 'Configurá DNS'      },
    { n: 3 as DomainStep, label: 'Verificación'       },
  ];

  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
          Dominio personalizado
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Conectá tu propio dominio al sitio de Corredor
        </p>
      </div>
      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
        {steps.map((s, idx) => {
          const done   = s.n < step;
          const active = s.n === step;
          const last   = idx === steps.length - 1;
          return (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: F.mono, fontSize: 12, fontWeight: 700,
                  border: `2px solid ${done ? C.success : active ? C.brand : C.border}`,
                  background: done ? C.success : active ? C.brandFaint : 'transparent',
                  color: done ? '#fff' : active ? C.brand : C.textTertiary,
                  transition: 'all 0.2s',
                }}>
                  {done ? <Check size={13} /> : s.n}
                </div>
                <span style={{ fontFamily: F.body, fontSize: 11, color: active ? C.textPrimary : C.textTertiary, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {!last && <div style={{ flex: 1, height: 2, marginBottom: 18, background: done ? C.success : C.border, transition: 'background 0.3s' }} />}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ background: C.bgRaised, borderRadius: 12, border: `1px solid ${C.border}`, padding: '24px 28px' }}>
        {step === 1 && (
          <div>
            <p style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
              Ingresá tu dominio
            </p>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 20px' }}>
              El dominio debe estar ya registrado en NIC.ar, GoDaddy, o similar.
            </p>
            <label style={{ display: 'block', fontFamily: F.body, fontSize: 11, color: C.textTertiary, marginBottom: 6 }}>Nombre de dominio</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="tudominio.com.ar"
              onFocus={() => setDomFocused(true)} onBlur={() => setDomFocused(false)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: `1px solid ${domFocused ? C.brand : C.border}`,
                background: C.bgBase, color: C.textPrimary, fontFamily: F.mono,
                fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 20,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <PrimaryBtn onClick={handleVerify}>{checking ? 'Verificando…' : 'Verificar'}</PrimaryBtn>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <p style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
              Configurá los DNS
            </p>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 18px' }}>
              En el panel de DNS de <strong style={{ color: C.textPrimary }}>{domain || 'tu dominio'}</strong>, agregá estos registros:
            </p>
            <div style={{ background: C.bgBase, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 18, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 70px 1fr 50px', padding: '8px 14px', borderBottom: `1px solid ${C.border}`, background: C.bgElevated }}>
                {['Tipo', 'Nombre', 'Valor', ''].map(h => (
                  <span key={h} style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                ))}
              </div>
              {DNS_RECORDS.map((rec, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 70px 1fr 50px', padding: '11px 14px', alignItems: 'center', borderBottom: i < DNS_RECORDS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.brand }}>{rec.type}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary }}>{rec.name}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textPrimary }}>{rec.value}</span>
                  <button onClick={() => handleCopy(rec.value)}
                    style={{
                      width: 28, height: 28, borderRadius: 6,
                      border: `1px solid ${copied === rec.value ? C.success : C.border}`,
                      background: copied === rec.value ? C.successFaint : C.bgElevated,
                      color: copied === rec.value ? C.success : C.textTertiary,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {copied === rec.value ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '0 0 20px' }}>
              Los cambios DNS pueden demorar hasta 48 horas en propagarse.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <PrimaryBtn onClick={() => setStep(3)}>Continuar</PrimaryBtn>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
              Verificación
            </p>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: '0 0 24px' }}>
              Estamos verificando la propagación del DNS para{' '}
              <strong style={{ color: C.textPrimary, fontFamily: F.mono }}>{domain || 'tu dominio'}</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 10, background: C.bgBase, border: `1px solid ${C.border}`, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.brand, animation: 'spin 1s linear infinite' }} />
              <div>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0 }}>Verificando propagación DNS…</p>
                <p style={{ fontFamily: F.body, fontSize: 12, color: C.textTertiary, margin: '3px 0 0' }}>Puede tardar hasta 48 horas</p>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SecondaryBtn>Verificar ahora</SecondaryBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Formularios tab ──────────────────────────────────────

function FormulariosTab() {
  const [formFilter, setFormFilter] = useState('todos');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const statusConfig: Record<SubmissionStatus, { label: string; color: string; bg: string }> = {
    nuevo:     { label: 'Nuevo',     color: C.brand,        bg: C.brandFaint  },
    leido:     { label: 'Leído',     color: C.textTertiary, bg: C.bgElevated  },
    archivado: { label: 'Archivado', color: C.textTertiary, bg: C.bgElevated  },
  };

  const formTypes = ['todos', 'Contacto', 'Newsletter', 'Búsqueda'];
  const filtered = SUBMISSIONS.filter(s => formFilter === 'todos' || s.formulario === formFilter);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
          Envíos de formularios
        </h2>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          {SUBMISSIONS.length} envíos en total · {SUBMISSIONS.filter(s => s.estado === 'nuevo').length} nuevos
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: C.bgRaised, color: C.textSecondary, fontFamily: F.body, fontSize: 12, cursor: 'pointer' }}>
          Últimos 7 días <ChevronDown size={12} />
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {formTypes.map(type => (
            <button key={type} onClick={() => setFormFilter(type)}
              style={{
                padding: '6px 11px', borderRadius: 6,
                border: `1px solid ${formFilter === type ? C.brand : C.border}`,
                background: formFilter === type ? C.brandFaint : C.bgRaised,
                color: formFilter === type ? C.brand : C.textSecondary,
                fontFamily: F.body, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              }}>
              {type === 'todos' ? 'Todos' : type}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <SecondaryBtn><BarChart2 size={13} /> Exportar CSV</SecondaryBtn>
        </div>
      </div>
      <div style={{ background: C.bgRaised, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px 100px 90px', padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: C.bgElevated }}>
          {['Fecha', 'Nombre', 'Email', 'Teléfono', 'Formulario', 'Estado'].map(h => (
            <span key={h} style={{ fontFamily: F.mono, fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer' }}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center' }}>
            <Send size={28} color={C.textTertiary} style={{ display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textTertiary, margin: 0 }}>No hay envíos para este filtro</p>
          </div>
        ) : (
          filtered.map((sub, idx) => {
            const st = statusConfig[sub.estado];
            const isHov = hoveredRow === sub.id;
            return (
              <div key={sub.id}
                onMouseEnter={() => setHoveredRow(sub.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'grid', gridTemplateColumns: '110px 1fr 1fr 110px 100px 90px',
                  padding: '11px 16px', alignItems: 'center',
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: isHov ? C.bgElevated : 'transparent', transition: 'background 0.1s', cursor: 'pointer',
                }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textTertiary }}>{sub.fecha}</span>
                <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{sub.nombre}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary }}>{sub.email}</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: C.textSecondary }}>{sub.telefono}</span>
                <span style={{ fontFamily: F.body, fontSize: 11, color: C.textSecondary }}>{sub.formulario}</span>
                <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────

export default function SitePagesListPage() {
  const [activeTab, setActiveTab] = useState<TabId>('paginas');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'paginas',     label: 'Páginas'      },
    { id: 'temas',       label: 'Temas'        },
    { id: 'dominio',     label: 'Dominio'      },
    { id: 'formularios', label: 'Formularios'  },
  ];

  return (
    <div style={{ padding: '28px 32px', fontFamily: F.body, minHeight: '100%', background: C.bgBase }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: C.textPrimary, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Sitio web
            </h1>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.textSecondary, margin: 0 }}>
              Administrá el contenido, diseño y configuración de tu sitio
            </p>
          </div>
          <a href="#" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
            background: C.bgRaised, color: C.textSecondary, fontFamily: F.mono,
            fontSize: 11, textDecoration: 'none', transition: 'all 0.15s',
          }}>
            <Globe size={12} />
            misitio.corredor.ar
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: F.body, fontSize: 13, fontWeight: 500,
              color: activeTab === tab.id ? C.textPrimary : C.textTertiary,
              borderBottom: `2px solid ${activeTab === tab.id ? C.brand : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'paginas'     && <PaginasTab     />}
      {activeTab === 'temas'       && <TemasTab       />}
      {activeTab === 'dominio'     && <DominioTab     />}
      {activeTab === 'formularios' && <FormulariosTab />}
    </div>
  );
}
