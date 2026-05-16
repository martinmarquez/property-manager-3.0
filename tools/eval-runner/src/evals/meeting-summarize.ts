import { type FeatureEvalConfig, tryParseJSON, hasFields } from '../harness.js';

function validateMeetingSummary(output: string, topicKeyword: string): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed || !hasFields(parsed, ['summary', 'keyPoints', 'decisions', 'actionItems'])) {
    return false;
  }
  const obj = parsed as {
    summary: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: { description: string; assignee: string }[];
  };
  if (typeof obj.summary !== 'string' || obj.summary.trim().length === 0) return false;
  if (!Array.isArray(obj.keyPoints) || obj.keyPoints.length === 0) return false;
  if (!Array.isArray(obj.actionItems)) return false;
  if (!obj.summary.toLowerCase().includes(topicKeyword.toLowerCase())) return false;
  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'meeting.summarize',
    systemPrompt:
      'Extract key points, decisions, and action items from meeting notes or call transcripts. ' +
      'Output JSON: { summary: string, keyPoints: string[], decisions: string[], actionItems: { description: string, assignee: string }[] }',
    threshold: 0.8,
    maxTokens: 1024,
    cases: [
      {
        id: 'valuation-discussion',
        category: 'client_call',
        input:
          'Llamada con propietario Sr. Méndez sobre tasación del departamento en Recoleta.\n' +
          'Méndez: "Quiero saber el valor actual de mi propiedad en Juncal 2450, 3 ambientes, 85m²".\n' +
          'Agente: "Según comparables recientes, estimamos entre USD 185.000 y USD 195.000".\n' +
          'Méndez: "Me parece bajo, el vecino vendió a USD 210.000 el año pasado".\n' +
          'Agente: "Podemos hacer una tasación formal con un martillero matriculado para tener un valor más preciso".\n' +
          'Méndez: "Dale, agendemos la visita para la semana que viene".',
        validate: (output) => validateMeetingSummary(output, 'tasación'),
      },
      {
        id: 'pipeline-review',
        category: 'team_meeting',
        input:
          'Reunión de equipo — Revisión de pipeline semanal.\n' +
          'Laura: "Tenemos 12 operaciones activas, 3 están en etapa de reserva".\n' +
          'Martín: "La operación del PH en Palermo se cayó, el comprador no consiguió crédito hipotecario".\n' +
          'Laura: "Necesitamos reactivar esa propiedad en los portales inmediatamente".\n' +
          'Diego: "Yo tengo dos visitas agendadas para el lote en Nordelta esta semana".\n' +
          'Laura: "Perfecto. Objetivo: cerrar al menos una reserva antes del viernes".',
        validate: (output) => validateMeetingSummary(output, 'pipeline'),
      },
      {
        id: 'purchase-offer-call',
        category: 'client_call',
        input:
          'Llamada con compradora Sra. Fernández sobre oferta de compra.\n' +
          'Fernández: "Quiero ofrecer USD 320.000 por el departamento de Av. Libertador 4500".\n' +
          'Agente: "El precio publicado es USD 350.000, pero puedo presentar la oferta al propietario".\n' +
          'Fernández: "Tengo el dinero disponible y puedo escriturar en 30 días".\n' +
          'Agente: "Eso es un punto a favor. Voy a redactar la oferta formal y se la envío para que la firme".\n' +
          'Fernández: "Perfecto, necesito respuesta antes del miércoles".',
        validate: (output) => validateMeetingSummary(output, 'oferta'),
      },
      {
        id: 'lease-renewal',
        category: 'negotiation',
        input:
          'Negociación de renovación de alquiler — Inquilino Rodríguez.\n' +
          'Rodríguez: "El contrato vence en dos meses y quiero renovar pero el aumento propuesto del 45% es excesivo".\n' +
          'Agente: "El propietario aplicó el índice ICL que marca la ley de alquileres".\n' +
          'Rodríguez: "Entiendo pero mi presupuesto no da. ¿Podemos negociar un 35%?".\n' +
          'Agente: "Voy a consultarlo con el propietario. También podemos extender el plazo a 3 años para darle estabilidad".\n' +
          'Rodríguez: "Me interesa esa opción, esperaré la respuesta".',
        validate: (output) => validateMeetingSummary(output, 'renovación'),
      },
      {
        id: 'development-walkthrough',
        category: 'client_call',
        input:
          'Notas de recorrida — Emprendimiento Torres del Puerto, Puerto Madero.\n' +
          'El desarrollador mostró las unidades del piso 8 al 12, entrega estimada marzo 2027.\n' +
          'Precios desde USD 3.200/m² para unidades de 2 ambientes.\n' +
          'Amenities incluyen pileta, SUM, gimnasio y cocheras en subsuelo.\n' +
          'Financiación en pesos al costo con ajuste CAC, anticipo del 30%.\n' +
          'Quedan disponibles 8 unidades de las 45 totales.',
        validate: (output) => validateMeetingSummary(output, 'emprendimiento'),
      },
      {
        id: 'commission-split',
        category: 'negotiation',
        input:
          'Reunión con broker asociado — Discusión de comisiones.\n' +
          'Pablo: "Tengo un comprador para tu propiedad en Belgrano, ¿cómo repartimos?".\n' +
          'Agente: "La comisión total es 3% + IVA, propongo 50/50 como siempre".\n' +
          'Pablo: "En este caso yo hice toda la captación del cliente, prefiero 60/40".\n' +
          'Agente: "Acepto si firmamos el acuerdo de compartición antes de la reserva".\n' +
          'Pablo: "Dale, te mando el borrador mañana a primera hora".',
        validate: (output) => validateMeetingSummary(output, 'comisión'),
      },
      {
        id: 'maintenance-issue',
        category: 'client_call',
        input:
          'Llamada con inquilina — Problema de mantenimiento.\n' +
          'García: "Hay una pérdida de agua en el baño principal, el caño debajo de la pileta gotea".\n' +
          'Agente: "¿Desde cuándo tiene este problema?".\n' +
          'García: "Hace tres días, ya puse un balde pero necesito que lo arreglen urgente".\n' +
          'Agente: "Voy a enviar un plomero mañana entre 9 y 12. ¿Puede estar alguien en la unidad?".\n' +
          'García: "Sí, yo trabajo desde casa. Avísenme con anticipación".',
        validate: (output) => validateMeetingSummary(output, 'mantenimiento'),
      },
      {
        id: 'investment-analysis',
        category: 'team_meeting',
        input:
          'Presentación de análisis de inversión — Edificio de renta en Caballito.\n' +
          'Analista: "El edificio tiene 10 unidades, todas alquiladas, renta bruta mensual USD 8.500".\n' +
          'Analista: "Precio de venta USD 950.000, eso da un cap rate del 10.7% anual".\n' +
          'Director: "¿Cuál es el estado de los contratos de alquiler?".\n' +
          'Analista: "6 contratos vencen este año, 4 el próximo. Todos los inquilinos son estables".\n' +
          'Director: "Preparemos un informe detallado para presentar al inversor la semana próxima".',
        validate: (output) => validateMeetingSummary(output, 'inversión'),
      },
      {
        id: 'marketing-strategy',
        category: 'team_meeting',
        input:
          'Reunión de marketing — Estrategia para propiedades premium.\n' +
          'Marketing: "Las publicaciones en Zonaprop y Argenprop no generan suficientes consultas para el segmento premium".\n' +
          'Agente: "Necesitamos invertir en fotografía profesional y recorridos virtuales 360°".\n' +
          'Marketing: "Propongo destinar $500.000 mensuales a pauta en Instagram y Google Ads".\n' +
          'Director: "Aprobado, pero quiero métricas semanales de costo por lead".\n' +
          'Marketing: "Arrancamos el lunes con las primeras campañas segmentadas".',
        validate: (output) => validateMeetingSummary(output, 'marketing'),
      },
      {
        id: 'client-onboarding',
        category: 'client_call',
        input:
          'Llamada de onboarding — Nuevo cliente propietario.\n' +
          'Agente: "Bienvenido al servicio. Vamos a gestionar el alquiler de su departamento en Palermo".\n' +
          'Cliente: "Necesito que se encarguen de todo: publicación, selección de inquilino y administración".\n' +
          'Agente: "Nuestro servicio integral incluye publicación en portales, filtrado de candidatos y gestión de cobros".\n' +
          'Cliente: "¿Cuál es el honorario?".\n' +
          'Agente: "Cobramos el equivalente a un mes de alquiler por la gestión inicial y 5% mensual por administración".\n' +
          'Cliente: "Me parece bien. ¿Cuándo pueden hacer las fotos del departamento?".',
        validate: (output) => validateMeetingSummary(output, 'onboarding'),
      },
    ],
  };
}
