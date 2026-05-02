import type { IntentType } from '../classifier.js';

export interface EvalSample {
  query: string;
  expectedIntent: IntentType;
  context?: string;
  tag?: string;
}

export const evalDataset: EvalSample[] = [
  // ── property_search (10) ──────────────────────────────────────────
  { query: '¿Cuántas propiedades hay en Belgrano?', expectedIntent: 'property_search' },
  { query: 'Mostrame departamentos de 3 ambientes en Palermo', expectedIntent: 'property_search' },
  { query: '¿Qué precio tiene el lote en Nordelta?', expectedIntent: 'property_search' },
  { query: 'Quiero ver las fotos de BEL-00142', expectedIntent: 'property_search' },
  { query: '¿Hay algún PH disponible en Villa Urquiza?', expectedIntent: 'property_search' },
  { query: 'Listame todo lo que tenemos en venta en zona norte', expectedIntent: 'property_search' },
  { query: '¿Cuántos metros tiene la propiedad de Recoleta?', expectedIntent: 'property_search' },
  { query: 'Buscá propiedades con pileta y parrilla', expectedIntent: 'property_search' },
  { query: 'Filtrá departamentos de menos de 100.000 USD', expectedIntent: 'property_search' },
  { query: 'Necesito un monoambiente cerca del subte', expectedIntent: 'property_search' },

  // ── lead_info (8) ─────────────────────────────────────────────────
  { query: '¿Cuándo fue el último contacto con Juan García?', expectedIntent: 'lead_info' },
  { query: 'Dame los datos del lead de Av. Libertador', expectedIntent: 'lead_info' },
  { query: '¿Cuántos leads nuevos entraron esta semana?', expectedIntent: 'lead_info' },
  { query: 'Mostrame el historial de María Pérez', expectedIntent: 'lead_info' },
  { query: '¿Quién es el propietario de PAL-00231?', expectedIntent: 'lead_info' },
  { query: '¿En qué etapa del pipeline está la operación de Caballito?', expectedIntent: 'lead_info' },
  { query: 'Necesito el teléfono del dueño de BEL-00142', expectedIntent: 'lead_info' },
  { query: '¿Cuántas operaciones cerramos este mes?', expectedIntent: 'lead_info' },

  // ── schedule (7) ──────────────────────────────────────────────────
  { query: 'Crea una tarea para llamar al propietario de BEL-00142', expectedIntent: 'schedule' },
  { query: 'Agendame una visita para mañana a las 10', expectedIntent: 'schedule' },
  { query: 'Recordame seguir con el lead de Belgrano el lunes', expectedIntent: 'schedule' },
  { query: 'Programá un call con María Pérez para el viernes', expectedIntent: 'schedule' },
  { query: 'Creá un recordatorio para renovar el contrato en 30 días', expectedIntent: 'schedule' },
  { query: 'Agendá la tasación de la propiedad en Villa Crespo', expectedIntent: 'schedule' },
  { query: 'Poneme una alarma para el vencimiento del boleto', expectedIntent: 'schedule' },

  // ── document_qa (7) ───────────────────────────────────────────────
  { query: '¿Qué dice la cláusula de penalidad del contrato?', expectedIntent: 'document_qa' },
  { query: '¿Cuándo vence el contrato de alquiler de Belgrano?', expectedIntent: 'document_qa' },
  { query: 'Mostrá el detalle de comisiones del acuerdo', expectedIntent: 'document_qa' },
  { query: '¿Qué garantía exige el contrato?', expectedIntent: 'document_qa' },
  { query: '¿Hay alguna cláusula de rescisión anticipada?', expectedIntent: 'document_qa' },
  { query: 'Resumime el boleto de compraventa', expectedIntent: 'document_qa' },
  { query: '¿Cuál es el monto de las expensas según el reglamento?', expectedIntent: 'document_qa' },

  // ── market_analysis (7) ───────────────────────────────────────────
  { query: 'Compará precios entre Belgrano y Palermo', expectedIntent: 'market_analysis' },
  { query: '¿Cómo viene el mercado de departamentos en CABA?', expectedIntent: 'market_analysis' },
  { query: '¿Cuál es el precio promedio del m² en Recoleta?', expectedIntent: 'market_analysis' },
  { query: 'Tendencia de precios en zona norte últimos 6 meses', expectedIntent: 'market_analysis' },
  { query: '¿Conviene invertir en Caballito o Almagro?', expectedIntent: 'market_analysis' },
  { query: 'Dame un análisis de oferta vs demanda en Palermo', expectedIntent: 'market_analysis' },
  { query: '¿Cómo evolucionó el precio de los PHs en Villa Urquiza?', expectedIntent: 'market_analysis' },

  // ── action_confirm (6) ────────────────────────────────────────────
  { query: 'Sí, confirmá la tarea', expectedIntent: 'action_confirm' },
  { query: 'Dale, mandá el mensaje', expectedIntent: 'action_confirm' },
  { query: 'No, cancelá eso', expectedIntent: 'action_confirm' },
  { query: 'Sí, agendá la visita', expectedIntent: 'action_confirm' },
  { query: 'Confirmado, procedé con el envío', expectedIntent: 'action_confirm' },
  { query: 'No, mejor no hagas nada', expectedIntent: 'action_confirm' },

  // ── general (5 standard + 7 edge cases) ───────────────────────────
  { query: 'Hola, ¿cómo estás?', expectedIntent: 'general' },
  { query: '¿Qué podés hacer?', expectedIntent: 'general' },
  { query: 'Gracias por la ayuda', expectedIntent: 'general' },
  { query: 'No entendí, ¿podés explicar de nuevo?', expectedIntent: 'general' },
  { query: '¿Quién te creó?', expectedIntent: 'general' },
  // edge cases — should fall to general
  { query: 'Contame un chiste', expectedIntent: 'general', tag: 'edge' },
  { query: '¿Cuál es la capital de Francia?', expectedIntent: 'general', tag: 'edge' },
  { query: '¿Funciona bien el sistema?', expectedIntent: 'general', tag: 'edge' },
  { query: '¿Me podés ayudar con algo?', expectedIntent: 'general', tag: 'edge' },
  { query: 'Buenos días equipo', expectedIntent: 'general', tag: 'edge' },
  { query: 'Pasame la receta de empanadas', expectedIntent: 'general', tag: 'edge' },
  { query: '¿Está lloviendo afuera?', expectedIntent: 'general', tag: 'edge' },

  // ── context-dependent queries (3) ─────────────────────────────────
  {
    query: 'Mostrá más',
    expectedIntent: 'property_search',
    context: 'user: ¿Propiedades en Belgrano?\nassistant: Encontré 12 propiedades.',
  },
  {
    query: 'Sí, dale',
    expectedIntent: 'action_confirm',
    context: 'assistant: ¿Querés que agende la visita para mañana a las 15?',
  },
  {
    query: '¿Y el precio?',
    expectedIntent: 'property_search',
    context: 'user: Mostrame BEL-00142\nassistant: Es un depto de 3 ambientes en Belgrano, 85m².',
  },
];
