import type { FeatureEvalConfig } from '../harness.js';
import { tryParseJSON, hasFields } from '../harness.js';

const SYSTEM_PROMPT = `Sos un agente inmobiliario profesional argentino. Tu trabajo es redactar comunicaciones profesionales en español rioplatense para un CRM inmobiliario.

Dado un escenario con tipo (email o whatsapp), contexto, destinatario y propósito, respondé ÚNICAMENTE con un JSON válido con este formato:
{
  "subject": "string o null (null para WhatsApp)",
  "body": "string con el mensaje completo",
  "tone": "string describiendo el tono usado"
}

Reglas:
- Usá español rioplatense con voseo.
- El campo "subject" debe ser null para mensajes de WhatsApp y un string descriptivo para emails.
- El tono debe ser siempre profesional y cordial.
- No uses emojis en emails. Podés usar emojis moderados en WhatsApp.
- Respondé SOLO con el JSON, sin texto adicional.`;

const SPANISH_BODY_MARKERS = ['propiedad', 'inmueble', 'saludo', 'cordial', 'atentamente', 'gracias', 'consulta', 'interés', 'disponible', 'contacto', 'visita', 'oportunidad', 'gusto', 'cualquier'];

function validateDraft(output: string, type: 'email' | 'whatsapp'): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed) return false;
  if (!hasFields(parsed, ['subject', 'body', 'tone'])) return false;

  const draft = parsed as { subject: string | null; body: string; tone: string };

  if (typeof draft.body !== 'string' || draft.body.trim().length < 20) return false;
  if (typeof draft.tone !== 'string' || draft.tone.trim().length === 0) return false;

  if (type === 'email') {
    if (typeof draft.subject !== 'string' || draft.subject.trim().length === 0) return false;
  } else {
    if (draft.subject !== null) return false;
  }

  const bodyLower = draft.body.toLowerCase();
  const spanishHits = SPANISH_BODY_MARKERS.filter((w) => bodyLower.includes(w));
  if (spanishHits.length < 1) return false;

  const toneLower = draft.tone.toLowerCase();
  if (!toneLower.includes('profesional') && !toneLower.includes('cordial') && !toneLower.includes('formal') && !toneLower.includes('cálid') && !toneLower.includes('amable') && !toneLower.includes('cerc')) return false;

  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'inbox.draft',
    systemPrompt: SYSTEM_PROMPT,
    threshold: 0.8,
    maxTokens: 1024,
    cases: [
      {
        id: 'email-followup-visit',
        category: 'email',
        input: `Tipo: email
Destinatario: María González (compradora potencial)
Contexto: María visitó ayer un departamento de 3 ambientes en Palermo con precio USD 195.000. Mostró interés pero pidió tiempo para pensarlo.
Propósito: Seguimiento post-visita, reforzar interés y ofrecer disponibilidad para consultas.`,
        validate: (o) => validateDraft(o, 'email'),
      },
      {
        id: 'whatsapp-new-listing',
        category: 'whatsapp',
        input: `Tipo: whatsapp
Destinatario: Carlos Ruiz (lead activo buscando casa en zona norte)
Contexto: Carlos busca una casa de 4 dormitorios en Nordelta o alrededores, presupuesto USD 400.000-500.000. Acaba de entrar una nueva casa que coincide con su búsqueda.
Propósito: Notificar nueva publicación que matchea su búsqueda y proponer coordinación de visita.`,
        validate: (o) => validateDraft(o, 'whatsapp'),
      },
      {
        id: 'email-price-reduction',
        category: 'email',
        input: `Tipo: email
Destinatario: Lista de leads interesados en Recoleta
Contexto: Un departamento de 4 ambientes en Recoleta bajó de USD 350.000 a USD 310.000. Hay 8 leads que consultaron por esta propiedad en los últimos 60 días.
Propósito: Comunicar la baja de precio y generar urgencia para coordinar visitas.`,
        validate: (o) => validateDraft(o, 'email'),
      },
      {
        id: 'whatsapp-rental-renewal',
        category: 'whatsapp',
        input: `Tipo: whatsapp
Destinatario: Luciana Fernández (inquilina actual)
Contexto: El contrato de alquiler de Luciana en un departamento de Belgrano vence en 45 días. El propietario quiere renovar con actualización de precio según índice ICL.
Propósito: Recordar vencimiento del contrato y proponer reunión para discutir renovación.`,
        validate: (o) => validateDraft(o, 'whatsapp'),
      },
      {
        id: 'email-commission-request',
        category: 'email',
        input: `Tipo: email
Destinatario: Roberto Méndez (propietario vendedor)
Contexto: La venta del departamento de Roberto en Puerto Madero se escrituró la semana pasada por USD 520.000. La comisión pactada es del 3% (USD 15.600) y aún no fue abonada.
Propósito: Solicitar de forma profesional el pago de la comisión acordada, adjuntando datos de transferencia.`,
        validate: (o) => validateDraft(o, 'email'),
      },
      {
        id: 'whatsapp-thank-you-closing',
        category: 'whatsapp',
        input: `Tipo: whatsapp
Destinatario: Ana y Martín Suárez (compradores)
Contexto: Ana y Martín acaban de firmar la escritura de su nueva casa en Olivos. Fue un proceso de 4 meses con negociación compleja.
Propósito: Agradecer la confianza, felicitar por la compra y pedir referidos.`,
        validate: (o) => validateDraft(o, 'whatsapp'),
      },
      {
        id: 'email-availability-response',
        category: 'email',
        input: `Tipo: email
Destinatario: Diego Martínez (consulta entrante por portal)
Contexto: Diego consultó por un PH en San Telmo de 4 ambientes publicado a USD 210.000 a través de ZonaProp. La propiedad sigue disponible.
Propósito: Responder confirmando disponibilidad, dar información adicional y proponer visita.`,
        validate: (o) => validateDraft(o, 'email'),
      },
      {
        id: 'whatsapp-schedule-viewing',
        category: 'whatsapp',
        input: `Tipo: whatsapp
Destinatario: Patricia López (compradora potencial)
Contexto: Patricia mostró interés en un departamento en Caballito de 2 dormitorios a USD 145.000. Pidió coordinar una visita. Los horarios disponibles son martes y jueves de 10 a 14hs.
Propósito: Coordinar día y horario para la visita al departamento.`,
        validate: (o) => validateDraft(o, 'whatsapp'),
      },
      {
        id: 'email-offer-negotiation',
        category: 'email',
        input: `Tipo: email
Destinatario: Fernando Gutiérrez (propietario vendedor)
Contexto: Un comprador ofreció USD 270.000 por el departamento de Fernando en Núñez, publicado a USD 310.000. El comprador tiene la plata disponible y puede escriturar en 30 días.
Propósito: Presentar la oferta al propietario, destacar las fortalezas del comprador y sugerir una contraoferta.`,
        validate: (o) => validateDraft(o, 'email'),
      },
      {
        id: 'whatsapp-welcome-new-lead',
        category: 'whatsapp',
        input: `Tipo: whatsapp
Destinatario: Valentina Romero (nueva lead)
Contexto: Valentina se registró en el sitio web de la inmobiliaria buscando departamentos en alquiler en Palermo o Villa Crespo, presupuesto ARS 350.000-500.000/mes. Es su primer contacto.
Propósito: Mensaje de bienvenida, presentarse como asesor asignado y preguntar criterios de búsqueda detallados.`,
        validate: (o) => validateDraft(o, 'whatsapp'),
      },
    ],
  };
}
