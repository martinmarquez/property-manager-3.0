import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components';
import * as React from 'react';

export interface DigestEmailProps {
  reportTitle: string;
  reportSlug: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipientName: string | null;
  rows: Record<string, unknown>[];
  unsubscribeUrl: string;
  reportUrl: string;
}

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'diario',
  weekly: 'semanal',
  monthly: 'mensual',
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (v instanceof Date) return v.toLocaleDateString('es-AR');
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toLocaleString('es-AR');
    return v.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  }
  return String(v);
}

function formatColumnHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const EXCLUDED_COLUMNS = new Set([
  'tenant_id',
  'refreshed_at',
  'agent_id',
]);

export function DigestEmail({
  reportTitle,
  frequency,
  recipientName,
  rows,
  unsubscribeUrl,
  reportUrl,
}: DigestEmailProps) {
  const greeting = recipientName ? `Hola ${recipientName},` : 'Hola,';
  const freqLabel = FREQUENCY_LABEL[frequency] ?? frequency;
  const previewText = `Tu resumen ${freqLabel} de ${reportTitle}`;

  const columns = rows.length > 0
    ? Object.keys(rows[0]!).filter((k) => !EXCLUDED_COLUMNS.has(k))
    : [];
  const displayRows = rows.slice(0, 20);

  return (
    <Html lang="es">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={logoStyle}>Corredor</Text>
            <Text style={subtitleStyle}>Resumen {freqLabel} de reportes</Text>
          </Section>

          <Hr style={hrStyle} />

          {/* Greeting */}
          <Section style={contentStyle}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={paragraphStyle}>
              Aquí está tu resumen {freqLabel} del reporte <strong>{reportTitle}</strong>.
            </Text>
          </Section>

          {/* Data table */}
          {displayRows.length > 0 && (
            <Section style={contentStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} style={thStyle}>
                        {formatColumnHeader(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, i) => (
                    <tr key={i} style={i % 2 === 0 ? trEvenStyle : undefined}>
                      {columns.map((col) => (
                        <td key={col} style={tdStyle}>
                          {formatValue(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <Text style={moreRowsStyle}>
                  ...y {rows.length - 20} filas más
                </Text>
              )}
            </Section>
          )}

          {displayRows.length === 0 && (
            <Section style={contentStyle}>
              <Text style={paragraphStyle}>
                No hay datos disponibles para este período.
              </Text>
            </Section>
          )}

          {/* CTA */}
          <Section style={ctaSection}>
            <Link href={reportUrl} style={ctaStyle}>
              Ver reporte completo
            </Link>
          </Section>

          <Hr style={hrStyle} />

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Recibís este email porque estás suscripto a resúmenes {freqLabel}es de reportes en Corredor.
            </Text>
            <Text style={footerTextStyle}>
              <Link href={unsubscribeUrl} style={unsubLinkStyle}>
                Cancelar suscripción
              </Link>
              {' '}— Conforme a la Ley 25.326 de Protección de Datos Personales.
            </Text>
            <Text style={copyrightStyle}>
              © {new Date().getFullYear()} Corredor. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  padding: '24px 32px',
  textAlign: 'center' as const,
};

const logoStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 700,
  margin: '0 0 4px 0',
  letterSpacing: '-0.5px',
};

const subtitleStyle: React.CSSProperties = {
  color: '#a0a0b0',
  fontSize: '14px',
  margin: '0',
};

const hrStyle: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '0',
};

const contentStyle: React.CSSProperties = {
  padding: '24px 32px',
};

const greetingStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#18181b',
  margin: '0 0 12px 0',
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '13px',
};

const thStyle: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  color: '#71717a',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  padding: '8px 10px',
  textAlign: 'left' as const,
  borderBottom: '2px solid #e4e4e7',
  whiteSpace: 'nowrap' as const,
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f4f4f5',
  color: '#3f3f46',
  whiteSpace: 'nowrap' as const,
};

const trEvenStyle: React.CSSProperties = {
  backgroundColor: '#fafafa',
};

const moreRowsStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#a1a1aa',
  textAlign: 'center' as const,
  margin: '8px 0 0 0',
};

const ctaSection: React.CSSProperties = {
  padding: '8px 32px 24px 32px',
  textAlign: 'center' as const,
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#1a1a2e',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
};

const footerStyle: React.CSSProperties = {
  padding: '24px 32px',
  backgroundColor: '#fafafa',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#a1a1aa',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
};

const unsubLinkStyle: React.CSSProperties = {
  color: '#71717a',
  textDecoration: 'underline',
};

const copyrightStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#d4d4d8',
  margin: '12px 0 0 0',
};
