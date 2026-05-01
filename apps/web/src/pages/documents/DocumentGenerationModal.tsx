import React, { useState } from 'react'

const C = {
  bgBase: '#070D1A',
  bgRaised: '#0D1526',
  bgElevated: '#131E33',
  bgOverlay: 'rgba(7,13,26,0.85)',
  border: '#1F2D48',
  borderSubtle: '#162038',
  brand: '#1654d9',
  brandHover: '#1248b8',
  brandSubtle: 'rgba(22,84,217,0.12)',
  ai: '#7E3AF2',
  aiSubtle: 'rgba(126,58,242,0.12)',
  success: '#16A34A',
  successSubtle: 'rgba(22,163,74,0.12)',
  warning: '#D97706',
  warningSubtle: 'rgba(217,119,6,0.12)',
  danger: '#DC2626',
  dangerSubtle: 'rgba(220,38,38,0.12)',
  textPrimary: '#EFF4FF',
  textSecondary: '#8DA0C0',
  textTertiary: '#506180',
} as const

const F = {
  display: "'Syne', system-ui, sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', monospace",
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldStatus = 'resolved' | 'missing' | 'ambiguous'

interface TemplateField {
  variable: string
  label: string
  description: string
  status: FieldStatus
  resolvedValue?: string
  source?: string
  options?: string[]
  userInput?: string
}

interface Template {
  id: string
  name: string
  category: string
  estimatedPages: number
  fields: TemplateField[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_TEMPLATES: Template[] = [
  {
    id: 'tpl_boleto',
    name: 'Boleto de Compraventa',
    category: 'Venta',
    estimatedPages: 6,
    fields: [
      {
        variable: 'property.address',
        label: 'Dirección del inmueble',
        description: 'Dirección completa con nomenclatura catastral',
        status: 'resolved',
        resolvedValue: 'Av. Santa Fe 3421, Piso 4° "B", CABA',
        source: 'Ficha de propiedad',
      },
      {
        variable: 'property.registry_number',
        label: 'Número de registro',
        description: 'Número de inscripción en el Registro de la Propiedad',
        status: 'resolved',
        resolvedValue: 'T° 123 F° 456',
        source: 'Ficha de propiedad',
      },
      {
        variable: 'buyer.full_name',
        label: 'Nombre completo del comprador',
        description: 'Nombre y apellido tal como figura en DNI',
        status: 'resolved',
        resolvedValue: 'Juan Eduardo García',
        source: 'Ficha de contacto',
      },
      {
        variable: 'buyer.dni',
        label: 'DNI del comprador',
        description: 'Documento Nacional de Identidad',
        status: 'resolved',
        resolvedValue: '28.456.789',
        source: 'Ficha de contacto',
      },
      {
        variable: 'buyer.marital_status',
        label: 'Estado civil del comprador',
        description: 'Estado civil actual para efectos jurídicos',
        status: 'ambiguous',
        options: ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión convivencial'],
      },
      {
        variable: 'seller.full_name',
        label: 'Nombre completo del vendedor',
        description: 'Nombre y apellido tal como figura en DNI',
        status: 'resolved',
        resolvedValue: 'Laura Elena Méndez',
        source: 'Ficha de contacto',
      },
      {
        variable: 'seller.dni',
        label: 'DNI del vendedor',
        description: 'Documento Nacional de Identidad',
        status: 'resolved',
        resolvedValue: '22.111.333',
        source: 'Ficha de contacto',
      },
      {
        variable: 'operation.sale_price_usd',
        label: 'Precio de venta (USD)',
        description: 'Precio pactado en dólares estadounidenses',
        status: 'resolved',
        resolvedValue: 'USD 250.000',
        source: 'Operación',
      },
      {
        variable: 'operation.earnest_amount',
        label: 'Monto de seña',
        description: 'Importe de la seña a la firma del boleto',
        status: 'missing',
        description: 'No existe registro de seña en la operación. Debe ingresarse manualmente.',
      },
      {
        variable: 'operation.escritura_date',
        label: 'Fecha de escritura',
        description: 'Fecha pactada para la escritura traslativa de dominio',
        status: 'resolved',
        resolvedValue: '15 de julio de 2026',
        source: 'Operación',
      },
      {
        variable: 'agent.matricula',
        label: 'Matrícula del corredor',
        description: 'Número de matrícula CUCICBA/CMCPRA del agente interviniente',
        status: 'missing',
        description: 'La matrícula no está cargada en el perfil del agente.',
      },
      {
        variable: 'agent.full_name',
        label: 'Nombre del corredor',
        description: 'Nombre completo del corredor inmobiliario interviniente',
        status: 'resolved',
        resolvedValue: 'María Alejandra López',
        source: 'Perfil de agente',
      },
    ],
  },
  {
    id: 'tpl_reserva',
    name: 'Contrato de Reserva',
    category: 'Venta',
    estimatedPages: 3,
    fields: [],
  },
  {
    id: 'tpl_locacion',
    name: 'Contrato de Locación (Ley 27.551)',
    category: 'Alquiler',
    estimatedPages: 5,
    fields: [],
  },
]

// ─── Field Row Component ──────────────────────────────────────────────────────

function FieldRow({
  field,
  onValueChange,
}: {
  field: TemplateField
  onValueChange: (variable: string, value: string) => void
}) {
  const [expanded, setExpanded] = useState(field.status !== 'resolved')

  const statusConfig: Record<FieldStatus, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    resolved: {
      label: 'Auto-completado',
      color: C.success,
      bg: C.successSubtle,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ),
    },
    missing: {
      label: 'Requerido',
      color: C.danger,
      bg: C.dangerSubtle,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    ambiguous: {
      label: 'Confirmar',
      color: C.warning,
      bg: C.warningSubtle,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v.01M12 8a2 2 0 00-2 2 1 1 0 002 0c0-.55.45-1 1-1a1 1 0 010 2c-.55 0-1 .45-1 1v.5" />
        </svg>
      ),
    },
  }

  const { icon, color, bg, label } = statusConfig[field.status]

  return (
    <div style={{
      border: `1px solid ${field.status === 'resolved' ? C.borderSubtle : field.status === 'missing' ? C.danger + '44' : C.warning + '44'}`,
      borderRadius: 8,
      background: field.status === 'missing' ? C.dangerSubtle : field.status === 'ambiguous' ? C.warningSubtle : 'transparent',
      overflow: 'hidden',
    }}>
      {/* Row header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
        }}
      >
        <span style={{ color, flexShrink: 0 }}>{icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.textPrimary }}>{field.label}</span>
            <code style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 3,
              background: 'rgba(255,255,255,0.05)', color: C.textTertiary,
              fontFamily: F.mono,
            }}>
              {'{{'}{field.variable}{'}}'}
            </code>
          </div>
          {field.status === 'resolved' && field.resolvedValue && (
            <div style={{ fontSize: 12, color: C.success, marginTop: 1 }}>
              {field.resolvedValue}
              {field.source && (
                <span style={{ color: C.textTertiary, marginLeft: 6 }}>
                  · via {field.source}
                </span>
              )}
            </div>
          )}
        </div>

        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
          background: bg, color, letterSpacing: '0.04em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {label}
        </span>

        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.textTertiary} strokeWidth={2}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.borderSubtle}` }}>
          <p style={{ margin: '10px 0 8px', fontSize: 12, color: C.textSecondary }}>
            {field.description}
          </p>

          {field.status === 'missing' && (
            <input
              value={field.userInput ?? ''}
              onChange={e => onValueChange(field.variable, e.target.value)}
              placeholder={`Ingrese ${field.label.toLowerCase()}…`}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '8px 12px', borderRadius: 6,
                background: C.bgRaised,
                border: `1px solid ${field.userInput ? C.success : C.danger + '88'}`,
                color: C.textPrimary, fontSize: 13,
                fontFamily: F.body, outline: 'none',
              }}
            />
          )}

          {field.status === 'ambiguous' && field.options && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {field.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => onValueChange(field.variable, opt)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${field.userInput === opt ? C.brand : C.border}`,
                    background: field.userInput === opt ? C.brandSubtle : 'transparent',
                    color: field.userInput === opt ? C.brand : C.textSecondary,
                    fontSize: 12, fontFamily: F.body, fontWeight: 500,
                    transition: 'all 0.12s',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {field.status === 'resolved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                value={field.userInput ?? field.resolvedValue ?? ''}
                onChange={e => onValueChange(field.variable, e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 10px', borderRadius: 6,
                  background: C.bgRaised, border: `1px solid ${C.border}`,
                  color: C.textPrimary, fontSize: 12, fontFamily: F.body, outline: 'none',
                }}
              />
              <button
                onClick={() => onValueChange(field.variable, field.resolvedValue ?? '')}
                style={{
                  padding: '7px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.textTertiary,
                  fontSize: 11, cursor: 'pointer', fontFamily: F.body, whiteSpace: 'nowrap',
                }}
              >
                Restaurar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DocumentGenerationModalProps {
  reservationId?: string
  propertyAddress?: string
  onClose: () => void
  onGenerated?: (documentId: string) => void
}

export function DocumentGenerationModal({
  reservationId = 'res_001',
  propertyAddress = 'Av. Santa Fe 3421, Piso 4° "B", CABA',
  onClose,
  onGenerated,
}: DocumentGenerationModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(MOCK_TEMPLATES[0])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [tab, setTab] = useState<'template' | 'fields'>('template')

  const fields = selectedTemplate.fields
  const missingFields = fields.filter(f => f.status === 'missing' && !fieldValues[f.variable])
  const ambiguousFields = fields.filter(f => f.status === 'ambiguous' && !fieldValues[f.variable])
  const resolvedCount = fields.filter(f => f.status === 'resolved' || fieldValues[f.variable]).length
  const totalCount = fields.length
  const completionPct = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100
  const canGenerate = missingFields.length === 0 && ambiguousFields.length === 0

  function handleFieldChange(variable: string, value: string) {
    setFieldValues(prev => ({ ...prev, [variable]: value }))
  }

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
      setTimeout(() => onGenerated?.('doc_new_001'), 1200)
    }, 1800)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: C.bgOverlay,
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 760,
        maxHeight: '90vh',
        background: C.bgRaised,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px 0',
          borderBottom: `1px solid ${C.borderSubtle}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <h2 style={{ margin: 0, fontSize: 17, fontFamily: F.display, fontWeight: 700, color: C.textPrimary }}>
                  Generar documento
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: C.textSecondary }}>
                {propertyAddress}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.textTertiary, padding: 4, borderRadius: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { id: 'template', label: 'Plantilla' },
              { id: 'fields', label: `Campos${missingFields.length + ambiguousFields.length > 0 ? ` (${missingFields.length + ambiguousFields.length} pendientes)` : ''}` },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: F.body,
                  color: tab === t.id ? C.textPrimary : C.textTertiary,
                  borderBottom: `2px solid ${tab === t.id ? C.brand : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Template selection tab */}
          {tab === 'template' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: C.textSecondary }}>
                Seleccioná la plantilla que querés usar para esta operación.
              </p>
              {MOCK_TEMPLATES.map(tpl => (
                <div
                  key={tpl.id}
                  onClick={() => { setSelectedTemplate(tpl); setTab('fields') }}
                  style={{
                    padding: '14px 16px',
                    border: `1px solid ${selectedTemplate.id === tpl.id ? C.brand : C.border}`,
                    borderRadius: 10,
                    background: selectedTemplate.id === tpl.id ? C.brandSubtle : 'transparent',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{
                    width: 40, height: 48, borderRadius: 4,
                    background: selectedTemplate.id === tpl.id ? C.brand : C.bgElevated,
                    border: `1px solid ${selectedTemplate.id === tpl.id ? C.brandHover : C.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={selectedTemplate.id === tpl.id ? '#fff' : C.textTertiary} strokeWidth={1.5}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 2 }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary }}>
                      {tpl.category} · {tpl.estimatedPages} páginas estimadas · {tpl.fields.length} variables
                    </div>
                  </div>

                  {selectedTemplate.id === tpl.id && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={C.brand} strokeWidth={2.5}>
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fields tab */}
          {tab === 'fields' && (
            <div>
              {/* Completion summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 10,
                background: C.bgElevated, border: `1px solid ${C.border}`,
                marginBottom: 20,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>
                      Campos completados
                    </span>
                    <span style={{ fontSize: 12, fontFamily: F.mono, color: canGenerate ? C.success : C.textSecondary }}>
                      {resolvedCount}/{totalCount} · {completionPct}%
                    </span>
                  </div>
                  <div style={{
                    height: 4, borderRadius: 2, background: C.border, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${completionPct}%`,
                      background: canGenerate ? C.success : missingFields.length > 0 ? C.danger : C.warning,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  {fields.filter(f => f.status === 'resolved').length > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontFamily: F.display, fontWeight: 700, color: C.success }}>
                        {fields.filter(f => f.status === 'resolved' || (f.status !== 'missing' && !fieldValues[f.variable])).length}
                      </div>
                      <div style={{ fontSize: 10, color: C.textTertiary, textTransform: 'uppercase' }}>Auto</div>
                    </div>
                  )}
                  {missingFields.length > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontFamily: F.display, fontWeight: 700, color: C.danger }}>
                        {missingFields.length}
                      </div>
                      <div style={{ fontSize: 10, color: C.textTertiary, textTransform: 'uppercase' }}>Faltantes</div>
                    </div>
                  )}
                  {ambiguousFields.length > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontFamily: F.display, fontWeight: 700, color: C.warning }}>
                        {ambiguousFields.length}
                      </div>
                      <div style={{ fontSize: 10, color: C.textTertiary, textTransform: 'uppercase' }}>Confirmar</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings banner */}
              {(missingFields.length > 0 || ambiguousFields.length > 0) && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: missingFields.length > 0 ? C.dangerSubtle : C.warningSubtle,
                  border: `1px solid ${missingFields.length > 0 ? C.danger + '44' : C.warning + '44'}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke={missingFields.length > 0 ? C.danger : C.warning} strokeWidth={2}
                    style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>
                    {missingFields.length > 0 && (
                      <>
                        <strong style={{ color: C.danger }}>
                          {missingFields.length} campo{missingFields.length > 1 ? 's' : ''} requerido{missingFields.length > 1 ? 's' : ''}
                        </strong>{' '}
                        sin completar.{' '}
                      </>
                    )}
                    {ambiguousFields.length > 0 && (
                      <>
                        <strong style={{ color: C.warning }}>
                          {ambiguousFields.length} campo{ambiguousFields.length > 1 ? 's' : ''}
                        </strong>{' '}
                        requieren confirmación.{' '}
                      </>
                    )}
                    No se puede generar el documento hasta completar los campos marcados.
                  </p>
                </div>
              )}

              {/* Priority: missing first, then ambiguous, then resolved */}
              {missingFields.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Campos requeridos — {missingFields.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {missingFields.map(f => (
                      <FieldRow
                        key={f.variable}
                        field={{ ...f, userInput: fieldValues[f.variable] }}
                        onValueChange={handleFieldChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              {ambiguousFields.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.warning, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Confirmar valor — {ambiguousFields.length}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ambiguousFields.map(f => (
                      <FieldRow
                        key={f.variable}
                        field={{ ...f, userInput: fieldValues[f.variable] }}
                        onValueChange={handleFieldChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.success,
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
                }}>
                  Auto-completados — {fields.filter(f => f.status === 'resolved').length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fields.filter(f => f.status === 'resolved').map(f => (
                    <FieldRow
                      key={f.variable}
                      field={{ ...f, userInput: fieldValues[f.variable] }}
                      onValueChange={handleFieldChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${C.borderSubtle}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, background: C.bgRaised,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {tab === 'fields' && !canGenerate && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: C.warning,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Completá los campos requeridos antes de continuar
              </div>
            )}
            {canGenerate && tab === 'fields' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.success }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Todos los campos están completos
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {tab === 'template' && (
              <button
                onClick={() => setTab('fields')}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: C.brand, border: 'none',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  fontFamily: F.body, cursor: 'pointer',
                }}
              >
                Continuar →
              </button>
            )}

            {tab === 'fields' && (
              <>
                <button
                  onClick={() => setTab('template')}
                  style={{
                    padding: '9px 18px', borderRadius: 8,
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.textSecondary, fontSize: 13, fontFamily: F.body, cursor: 'pointer',
                  }}
                >
                  ← Plantilla
                </button>
                <button
                  disabled={!canGenerate || generating}
                  onClick={handleGenerate}
                  style={{
                    padding: '9px 20px', borderRadius: 8,
                    background: canGenerate ? C.brand : C.border,
                    border: 'none',
                    color: canGenerate ? '#fff' : C.textTertiary,
                    fontSize: 13, fontWeight: 600,
                    fontFamily: F.body,
                    cursor: canGenerate && !generating ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 8,
                    opacity: generating ? 0.8 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  {generating ? (
                    <>
                      <span style={{
                        width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                        display: 'inline-block', animation: 'spin 0.6s linear infinite',
                      }} />
                      Generando…
                    </>
                  ) : generated ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Generado
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                      Generar documento
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}

export default DocumentGenerationModal
