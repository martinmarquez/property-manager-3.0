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
  Heading,
} from '@react-email/components';
import * as React from 'react';

export interface BetaAppreciationEmailProps {
  recipientName: string | null;
  unsubscribeUrl: string;
  earlyAccessUrl: string;
}

export function BetaAppreciationEmail({
  recipientName,
  unsubscribeUrl,
  earlyAccessUrl,
}: BetaAppreciationEmailProps) {
  const greeting = recipientName ? `Hola ${recipientName}` : 'Hola';

  return (
    <Html lang="es">
      <Head />
      <Preview>Gracias por ser parte de la beta de Corredor — vos lo hiciste posible.</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
          {/* Header */}
          <Section style={{ backgroundColor: '#1a1a2e', borderRadius: 12, padding: '32px 32px 24px' }}>
            <Heading as="h1" style={{ color: '#ffffff', fontSize: 28, margin: 0, lineHeight: 1.3 }}>
              Vos lo hiciste posible.
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: '32px', marginTop: 16 }}>
            <Text style={{ fontSize: 16, color: '#374151', lineHeight: 1.7 }}>
              {greeting},
            </Text>
            <Text style={{ fontSize: 16, color: '#374151', lineHeight: 1.7 }}>
              Hoy lanzamos Corredor al público general — y este momento no existiría sin tu participación en la beta.
              Tu feedback fue más que datos: fue dirección. Gracias por creer en esto cuando todavía era borrador.
            </Text>

            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

            {/* Features from beta */}
            <Heading as="h2" style={{ fontSize: 18, color: '#111827', marginBottom: 8 }}>
              3 funcionalidades que nacieron de tu feedback
            </Heading>

            <Section style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: '#166534', margin: 0, fontWeight: 600 }}>
                ✓ Reportes personalizables
              </Text>
              <Text style={{ fontSize: 14, color: '#374151', margin: '4px 0 0' }}>
                Múltiples usuarios pidieron poder elegir qué columnas mostrar. Hoy está disponible para todos.
              </Text>
            </Section>

            <Section style={{ backgroundColor: '#eff6ff', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: '#1e40af', margin: 0, fontWeight: 600 }}>
                ✓ Notificaciones de vencimiento anticipadas
              </Text>
              <Text style={{ fontSize: 14, color: '#374151', margin: '4px 0 0' }}>
                Pediste más tiempo para actuar. Ahora podés configurar alertas con hasta 30 días de anticipación.
              </Text>
            </Section>

            <Section style={{ backgroundColor: '#fdf4ff', borderRadius: 8, padding: '16px 20px', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, color: '#7e22ce', margin: 0, fontWeight: 600 }}>
                ✓ Panel multi-propiedad
              </Text>
              <Text style={{ fontSize: 14, color: '#374151', margin: '4px 0 0' }}>
                El feedback más repetido. Ahora podés ver y gestionar todas tus propiedades desde una sola vista.
              </Text>
            </Section>

            <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0' }} />

            {/* GA sneak peek */}
            <Heading as="h2" style={{ fontSize: 18, color: '#111827', marginBottom: 8 }}>
              Lo que viene (solo para GA)
            </Heading>
            <Text style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>
              En las próximas semanas vamos a liberar el asistente de IA para contratos, integración con firma electrónica,
              y el módulo de pagos automatizados. Como participante de la beta, tenés acceso anticipado.
            </Text>

            {/* CTA */}
            <Section style={{ textAlign: 'center', marginTop: 32 }}>
              <Link
                href={earlyAccessUrl}
                style={{
                  backgroundColor: '#4f46e5',
                  color: '#ffffff',
                  padding: '14px 32px',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Activar acceso anticipado →
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ padding: '24px 0', textAlign: 'center' }}>
            <Text style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
              Corredor · Buenos Aires, Argentina
            </Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
              <Link href={unsubscribeUrl} style={{ color: '#9ca3af' }}>
                Cancelar suscripción
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default BetaAppreciationEmail;
