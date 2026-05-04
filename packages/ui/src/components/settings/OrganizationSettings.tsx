import React, { useState } from 'react';

/* ─────────────────────────────────────────────────────────
   Corredor CRM — Settings > Organization
   Sections:
   - Agency info (name, CUIT, province, phone, website)
   - Business details (license number, founding year)
   - Danger zone (delete account)
   Argentina-native fields throughout.
   ───────────────────────────────────────────────────────── */

const C = {
  bgBase:    '#070D1A',
  bgRaised:  '#0D1526',
  bgSubtle:  '#162035',
  bgOverlay: '#121D33',
  brand:     '#1654d9',
  brandHov:  '#1244b8',
  brandFaint:'rgba(22,84,217,0.12)',
  border:    '#1F2D48',
  borderStrong: '#253350',
  textPrimary:   '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary:  '#6B809E',
  textDisabled:  '#3A4E6A',
  error:    '#E83B3B',
  errorBg:  '#260C0C',
  errorBorder: '#4A1A1A',
  success:   '#18A659',
  successBg: '#0A2217',
  successBorder: '#1A4D30',
  warning:   '#E88A14',
  warningBg: '#261A07',
  warningBorder: '#4A340E',
};

const F = {
  display: "'Syne', system-ui, sans-serif",
  body:    "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', monospace",
};

const PROVINCIAS = [
  'Buenos Aires', 'Ciudad Autónoma de Buenos Aires',
  'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta',
  'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

// ─── Sub-components ───────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: C.bgRaised,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
        <h2 style={{
          fontFamily: F.display,
          fontSize: '1rem', fontWeight: 700,
          color: C.textPrimary, letterSpacing: '-0.01em',
          marginBottom: description ? 4 : 0,
        }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: '0.875rem', color: C.textTertiary, lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string; hint?: string; error?: string;
  required?: boolean; children: React.ReactNode;
  col?: '1' | '2';
}

function Field({ label, hint, error, required, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: '0.8125rem', fontWeight: 500,
        color: C.textSecondary, marginBottom: 6, letterSpacing: '0.01em',
      }}>
        {label}
        {required && <span style={{ color: C.brand, marginLeft: 3 }} aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p style={{ fontSize: '0.75rem', color: C.textTertiary, marginTop: 5 }}>{hint}</p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: '0.75rem', color: C.error, marginTop: 5 }}>{error}</p>
      )}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, disabled, type = 'text', autoComplete, error, prefix,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; type?: string; autoComplete?: string; error?: boolean; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: 12,
          fontSize: '0.9375rem', color: C.textTertiary,
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {prefix}
        </span>
      )}
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} disabled={disabled} autoComplete={autoComplete}
        style={{
          width: '100%', padding: `10px 14px 10px ${prefix ? '28px' : '14px'}`,
          background: disabled ? C.bgSubtle : C.bgBase,
          border: `1px solid ${error ? C.error : focused ? C.brand : C.border}`,
          borderRadius: 8, color: disabled ? C.textTertiary : C.textPrimary,
          fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          caretColor: C.brand,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />
    </div>
  );
}

function SelectInput({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '10px 36px 10px 14px',
        background: disabled ? C.bgSubtle : C.bgBase,
        border: `1px solid ${focused ? C.brand : C.border}`,
        borderRadius: 8, color: value ? C.textPrimary : C.textTertiary,
        fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23506180' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
      }}
    >
      {children}
    </select>
  );
}

function TextareaInput({ value, onChange, placeholder, disabled, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder={placeholder} disabled={disabled} rows={rows}
      style={{
        width: '100%', padding: '10px 14px',
        background: disabled ? C.bgSubtle : C.bgBase,
        border: `1px solid ${focused ? C.brand : C.border}`,
        borderRadius: 8, color: disabled ? C.textTertiary : C.textPrimary,
        fontSize: '0.9375rem', fontFamily: F.body, outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(22,84,217,0.2)' : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        caretColor: C.brand, resize: 'vertical', lineHeight: 1.55,
      }}
    />
  );
}

// ─── Avatar upload placeholder ────────────────────────────
function LogoUpload({ name }: { name: string }) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
      <div style={{
        width: 64, height: 64, borderRadius: 12,
        background: C.bgSubtle,
        border: `2px dashed ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {initials ? (
          <span style={{
            fontFamily: F.display, fontSize: '1.25rem', fontWeight: 700,
            color: C.brand,
          }}>
            {initials}
          </span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        )}
      </div>
      <div>
        <button type="button" style={{
          padding: '7px 14px',
          background: C.bgSubtle,
          border: `1px solid ${C.border}`,
          borderRadius: 7, color: C.textSecondary,
          fontFamily: F.body, fontSize: '0.875rem', fontWeight: 500,
          cursor: 'pointer', marginBottom: 6,
          display: 'block',
          transition: 'border-color 150ms, color 150ms',
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderStrong;
            (e.currentTarget as HTMLButtonElement).style.color = C.textPrimary;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
            (e.currentTarget as HTMLButtonElement).style.color = C.textSecondary;
          }}
        >
          Subir logo
        </button>
        <p style={{ fontSize: '0.75rem', color: C.textTertiary }}>PNG, JPG — máx. 2 MB</p>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────
function SaveToast({ visible, error }: { visible: boolean; error?: string | undefined }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      background: error ? C.errorBg : C.successBg,
      border: `1px solid ${error ? C.errorBorder : C.successBorder}`,
      borderRadius: 10, color: error ? '#F87171' : C.success,
      fontSize: '0.875rem', fontFamily: F.body,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      zIndex: 500,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
      pointerEvents: visible ? 'auto' : 'none',
    }}>
      {error ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="#E83B3B" strokeWidth="1.4"/>
          <path d="M8 5v3.5" stroke="#E83B3B" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="8" cy="11.5" r="0.75" fill="#E83B3B"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke={C.success} strokeWidth="1.4"/>
          <path d="M5 8.5L7 10.5L11 6" stroke={C.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {error ?? 'Cambios guardados correctamente'}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────
export interface OrganizationData {
  agencyName: string;
  cuit: string;
  provincia: string;
  phone: string;
  website: string;
  description: string;
  licenseNumber: string;
  foundingYear: string;
  address: string;
  city: string;
}

export interface OrganizationSettingsProps {
  initialData?: Partial<OrganizationData>;
  onSave?: (data: OrganizationData) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  tenantSlug?: string;
}

export function OrganizationSettings({
  initialData,
  onSave,
  onDeleteAccount,
  tenantSlug = 'mi-inmobiliaria',
}: OrganizationSettingsProps) {
  const [data, setData] = useState<OrganizationData>({
    agencyName:    initialData?.agencyName    ?? '',
    cuit:          initialData?.cuit          ?? '',
    provincia:     initialData?.provincia     ?? '',
    phone:         initialData?.phone         ?? '',
    website:       initialData?.website       ?? '',
    description:   initialData?.description   ?? '',
    licenseNumber: initialData?.licenseNumber ?? '',
    foundingYear:  initialData?.foundingYear  ?? '',
    address:       initialData?.address       ?? '',
    city:          initialData?.city          ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; error?: string | undefined }>({ visible: false });

  const set = (key: keyof OrganizationData) => (v: string) => setData(d => ({ ...d, [key]: v }));

  const formatCuit = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  };

  const showToast = (error?: string) => {
    setToast({ visible: true, error });
    setTimeout(() => setToast({ visible: false }), 3500);
  };

  const handleSave = async () => {
    if (!data.agencyName.trim()) return;
    setSaving(true);
    try {
      await onSave?.(data);
      showToast();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== data.agencyName) return;
    setDeleting(true);
    try {
      await onDeleteAccount?.();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes corredor-settings-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: '32px 24px 80px',
        fontFamily: F.body,
        animation: 'corredor-settings-fadein 0.3s ease-out both',
      }}>
        {/* Page header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: F.display, fontSize: '1.375rem', fontWeight: 700,
            color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 4,
          }}>
            Configuración de la organización
          </h1>
          <p style={{ fontSize: '0.9rem', color: C.textTertiary }}>
            Información de tu agencia inmobiliaria.
          </p>
        </div>

        {/* ── Agency branding ── */}
        <SectionCard title="Identidad de la agencia" description="Nombre, logo y descripción pública de tu organización.">
          <LogoUpload name={data.agencyName} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Nombre de la agencia" required>
                <TextInput
                  value={data.agencyName}
                  onChange={set('agencyName')}
                  placeholder="Inmobiliaria San Telmo"
                  autoComplete="organization"
                />
              </Field>
            </div>

            <Field label="CUIT" hint="XX-XXXXXXXX-X">
              <TextInput
                value={data.cuit}
                onChange={v => set('cuit')(formatCuit(v))}
                placeholder="30-71234567-8"
              />
            </Field>

            <Field label="N° de matrícula habilitante" hint="Opcional">
              <TextInput
                value={data.licenseNumber}
                onChange={set('licenseNumber')}
                placeholder="Mat. 0000"
                prefix="Mat."
              />
            </Field>
          </div>

          <Field label="Descripción" hint="Aparece en tu portal público. Máx. 300 caracteres.">
            <TextareaInput
              value={data.description}
              onChange={set('description')}
              placeholder="Especialistas en propiedades residenciales y comerciales en Buenos Aires desde 2005."
              rows={3}
            />
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: data.description.length > 280 ? C.warning : C.textTertiary, marginTop: 4 }}>
              {data.description.length}/300
            </div>
          </Field>
        </SectionCard>

        {/* ── Contact info ── */}
        <SectionCard title="Datos de contacto" description="Cómo te encuentran tus clientes.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Teléfono">
              <TextInput
                value={data.phone} onChange={set('phone')} type="tel"
                placeholder="+54 11 1234-5678"
              />
            </Field>

            <Field label="Sitio web">
              <TextInput
                value={data.website} onChange={set('website')} type="url"
                placeholder="inmobiliaria.com.ar" prefix="https://"
              />
            </Field>

            <Field label="Dirección">
              <TextInput
                value={data.address} onChange={set('address')}
                placeholder="Av. Corrientes 1234, Piso 3"
                autoComplete="street-address"
              />
            </Field>

            <Field label="Ciudad">
              <TextInput
                value={data.city} onChange={set('city')}
                placeholder="Buenos Aires"
                autoComplete="address-level2"
              />
            </Field>

            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Provincia">
                <SelectInput value={data.provincia} onChange={set('provincia')}>
                  <option value="" disabled>Seleccioná una provincia</option>
                  {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                </SelectInput>
              </Field>
            </div>
          </div>
        </SectionCard>

        {/* ── Portal slug ── */}
        <SectionCard title="URL del portal" description="Dirección de tu portal público de propiedades.">
          <Field label="Subdominio" hint="Solo letras, números y guiones. No se puede cambiar después de 30 días.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <input
                value={tenantSlug}
                disabled
                style={{
                  flex: 1, padding: '10px 14px',
                  background: C.bgSubtle, border: `1px solid ${C.border}`,
                  borderRight: 'none',
                  borderRadius: '8px 0 0 8px',
                  color: C.textTertiary, fontFamily: F.mono, fontSize: '0.9375rem',
                  outline: 'none',
                }}
              />
              <span style={{
                padding: '10px 14px',
                background: C.bgOverlay, border: `1px solid ${C.border}`,
                borderRadius: '0 8px 8px 0',
                color: C.textTertiary, fontSize: '0.9375rem',
                whiteSpace: 'nowrap',
              }}>
                .corredor.ar
              </span>
            </div>
          </Field>
        </SectionCard>

        {/* ── Save button ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => setData({
              agencyName: initialData?.agencyName ?? '',
              cuit: initialData?.cuit ?? '',
              provincia: initialData?.provincia ?? '',
              phone: initialData?.phone ?? '',
              website: initialData?.website ?? '',
              description: initialData?.description ?? '',
              licenseNumber: initialData?.licenseNumber ?? '',
              foundingYear: initialData?.foundingYear ?? '',
              address: initialData?.address ?? '',
              city: initialData?.city ?? '',
            })}
            style={{
              padding: '10px 18px',
              background: C.bgSubtle, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.textSecondary,
              fontFamily: F.body, fontSize: '0.9375rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 150ms',
            }}
          >
            Descartar cambios
          </button>
          <button
            type="button" onClick={handleSave} disabled={saving}
            style={{
              padding: '10px 22px',
              background: saving ? C.bgSubtle : C.brand,
              border: 'none', borderRadius: 8,
              color: saving ? C.textTertiary : 'white',
              fontFamily: F.body, fontSize: '0.9375rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 150ms', minWidth: 130,
            }}
            onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.brandHov; }}
            onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = C.brand; }}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        {/* ── Danger zone ── */}
        <div style={{
          background: C.errorBg,
          border: `1px solid ${C.errorBorder}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.errorBorder}` }}>
            <h2 style={{
              fontFamily: F.display, fontSize: '0.9375rem', fontWeight: 700,
              color: C.error, letterSpacing: '-0.01em',
            }}>
              Zona de peligro
            </h2>
          </div>
          <div style={{ padding: '18px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, color: C.textPrimary, marginBottom: 3 }}>
                  Eliminar organización
                </p>
                <p style={{ fontSize: '0.8125rem', color: C.textTertiary, lineHeight: 1.5 }}>
                  Esta acción es permanente. Se eliminarán todos los datos, propiedades, contactos y leads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '8px 16px', flexShrink: 0,
                  background: 'none',
                  border: `1px solid ${C.errorBorder}`,
                  borderRadius: 7, color: C.error,
                  fontFamily: F.body, fontSize: '0.875rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'background 150ms, border-color 150ms',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(232,59,59,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.error;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'none';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.errorBorder;
                }}
              >
                Eliminar organización
              </button>
            </div>
          </div>
        </div>

        {/* ── Delete confirmation modal ── */}
        {showDeleteConfirm && (
          <>
            <div
              role="presentation"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(7,13,26,0.85)',
                zIndex: 400,
                backdropFilter: 'blur(2px)',
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%', maxWidth: 440,
                background: C.bgRaised,
                border: `1px solid ${C.errorBorder}`,
                borderRadius: 14,
                padding: '28px 28px 24px',
                zIndex: 401,
                boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              }}
            >
              <h2 id="delete-dialog-title" style={{
                fontFamily: F.display, fontSize: '1.125rem', fontWeight: 700,
                color: C.textPrimary, marginBottom: 10,
              }}>
                ¿Eliminar organización?
              </h2>
              <p style={{ fontSize: '0.9rem', color: C.textSecondary, lineHeight: 1.55, marginBottom: 20 }}>
                Esta acción es <strong style={{ color: C.textPrimary }}>permanente e irreversible</strong>. Se eliminarán todos los datos de <strong style={{ color: C.textPrimary }}>{data.agencyName || 'tu organización'}</strong>.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: C.textSecondary, marginBottom: 6 }}>
                  Escribí <strong style={{ color: C.textPrimary, fontFamily: F.mono }}>{data.agencyName}</strong> para confirmar:
                </label>
                <input
                  type="text" value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder={data.agencyName}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: C.bgBase, border: `1px solid ${C.errorBorder}`,
                    borderRadius: 8, color: C.textPrimary,
                    fontSize: '0.9375rem', fontFamily: F.mono, outline: 'none',
                    caretColor: C.error,
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                  disabled={deleting}
                  style={{
                    flex: 1, padding: '10px 16px',
                    background: C.bgSubtle, border: `1px solid ${C.border}`,
                    borderRadius: 8, color: C.textSecondary,
                    fontFamily: F.body, fontSize: '0.9375rem', fontWeight: 500,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || deleteInput !== data.agencyName}
                  style={{
                    flex: 1, padding: '10px 16px',
                    background: (deleting || deleteInput !== data.agencyName) ? C.bgSubtle : C.error,
                    border: 'none', borderRadius: 8,
                    color: (deleting || deleteInput !== data.agencyName) ? C.textTertiary : 'white',
                    fontFamily: F.body, fontSize: '0.9375rem', fontWeight: 600,
                    cursor: (deleting || deleteInput !== data.agencyName) ? 'not-allowed' : 'pointer',
                    transition: 'background 150ms',
                  }}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <SaveToast visible={toast.visible} error={toast.error} />
    </>
  );
}
