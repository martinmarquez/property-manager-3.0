import { type FeatureEvalConfig, tryParseJSON, hasFields } from '../harness.js';

const VALID_CONFIDENCE = ['high', 'medium', 'low'];

function validateDocumentQA(output: string, expectedKeyword: string): boolean {
  const parsed = tryParseJSON(output);
  if (!parsed || !hasFields(parsed, ['answer', 'confidence', 'relevantQuote'])) {
    return false;
  }
  const obj = parsed as { answer: string; confidence: string; relevantQuote: string };
  if (typeof obj.answer !== 'string' || obj.answer.trim().length === 0) return false;
  if (!VALID_CONFIDENCE.includes(obj.confidence)) return false;
  if (!obj.answer.toLowerCase().includes(expectedKeyword.toLowerCase())) return false;
  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'document.qa',
    systemPrompt:
      'Answer questions about real estate documents based on the provided excerpt. ' +
      'Output JSON: { answer: string, confidence: "high"|"medium"|"low", relevantQuote: string }',
    threshold: 0.8,
    maxTokens: 1024,
    cases: [
      {
        id: 'rental-penalty-clause',
        category: 'contract',
        input:
          'Documento: "CLÁUSULA OCTAVA — RESCISIÓN ANTICIPADA: En caso de que el LOCATARIO rescinda ' +
          'el presente contrato antes del vencimiento del plazo pactado, deberá abonar una indemnización ' +
          'equivalente a un mes y medio de alquiler si la rescisión ocurre durante el primer año, o un mes ' +
          'de alquiler si ocurre después del primer año, conforme al artículo 1221 del Código Civil y Comercial."\n\n' +
          'Pregunta: ¿Cuál es la penalidad por rescisión anticipada después del primer año?',
        validate: (output) => validateDocumentQA(output, 'un mes'),
      },
      {
        id: 'rental-duration',
        category: 'contract',
        input:
          'Documento: "CLÁUSULA SEGUNDA — PLAZO: El presente contrato de locación se celebra por el ' +
          'plazo de VEINTICUATRO (24) meses, comenzando a regir el día 1° de marzo de 2026 y finalizando ' +
          'el día 28 de febrero de 2028, fecha en la cual el LOCATARIO deberá restituir el inmueble libre ' +
          'de ocupantes y en las mismas condiciones en que lo recibió."\n\n' +
          'Pregunta: ¿Cuál es la duración del contrato?',
        validate: (output) => validateDocumentQA(output, '24'),
      },
      {
        id: 'rental-deposit',
        category: 'contract',
        input:
          'Documento: "CLÁUSULA QUINTA — DEPÓSITO EN GARANTÍA: El LOCATARIO entrega en este acto al ' +
          'LOCADOR la suma equivalente a un mes de alquiler, es decir PESOS CUATROCIENTOS CINCUENTA MIL ' +
          '($450.000), en concepto de depósito de garantía. Dicho importe será devuelto al finalizar el ' +
          'contrato, actualizado mediante el Índice de Contratos de Locación (ICL) publicado por el BCRA."\n\n' +
          'Pregunta: ¿Cuál es el monto del depósito de garantía?',
        validate: (output) => validateDocumentQA(output, '450.000'),
      },
      {
        id: 'rental-renewal',
        category: 'contract',
        input:
          'Documento: "CLÁUSULA DÉCIMA — RENOVACIÓN: Las partes acuerdan que, en caso de renovación del ' +
          'presente contrato, el canon locativo se ajustará anualmente según el Índice de Contratos de ' +
          'Locación (ICL) publicado por el Banco Central de la República Argentina. El LOCATARIO deberá ' +
          'manifestar su voluntad de renovar con una antelación mínima de SESENTA (60) días al vencimiento."\n\n' +
          'Pregunta: ¿Con cuánta antelación debe el inquilino avisar si quiere renovar?',
        validate: (output) => validateDocumentQA(output, '60'),
      },
      {
        id: 'purchase-price',
        category: 'agreement',
        input:
          'Documento: "BOLETO DE COMPRAVENTA — PRECIO Y FORMA DE PAGO: El precio total de la compraventa ' +
          'se fija en la suma de DÓLARES ESTADOUNIDENSES DOSCIENTOS OCHENTA MIL (USD 280.000), que el ' +
          'COMPRADOR abonará de la siguiente forma: a) USD 28.000 en este acto en concepto de seña confirmatoria; ' +
          'b) USD 252.000 al momento de la escritura traslativa de dominio."\n\n' +
          'Pregunta: ¿Cuál es el monto de la seña?',
        validate: (output) => validateDocumentQA(output, '28.000'),
      },
      {
        id: 'purchase-deadline',
        category: 'agreement',
        input:
          'Documento: "BOLETO DE COMPRAVENTA — ESCRITURACIÓN: Las partes se obligan a otorgar la ' +
          'escritura traslativa de dominio dentro de un plazo máximo de NOVENTA (90) días corridos contados ' +
          'a partir de la fecha de firma del presente boleto, ante el Escribano designado por el COMPRADOR. ' +
          'Los gastos de escrituración serán soportados conforme a los usos y costumbres de la Ciudad Autónoma de Buenos Aires."\n\n' +
          'Pregunta: ¿Cuál es el plazo máximo para escriturar?',
        validate: (output) => validateDocumentQA(output, '90'),
      },
      {
        id: 'purchase-conditions',
        category: 'agreement',
        input:
          'Documento: "CONDICIONES SUSPENSIVAS: La presente operación queda sujeta a las siguientes ' +
          'condiciones: 1) Obtención del certificado de dominio e inhibiciones libre de gravámenes; ' +
          '2) Aprobación del crédito hipotecario del COMPRADOR por parte del Banco Nación Argentina; ' +
          '3) Verificación de la inexistencia de deudas de expensas, impuestos y servicios. El incumplimiento ' +
          'de cualquiera de estas condiciones habilitará la resolución del boleto."\n\n' +
          'Pregunta: ¿Qué banco debe aprobar el crédito hipotecario?',
        validate: (output) => validateDocumentQA(output, 'Nación'),
      },
      {
        id: 'building-expensas',
        category: 'regulation',
        input:
          'Documento: "REGLAMENTO DE COPROPIEDAD Y ADMINISTRACIÓN — EXPENSAS: Los propietarios deberán ' +
          'abonar las expensas comunes ordinarias dentro de los primeros DIEZ (10) días de cada mes. La mora ' +
          'será automática y devengará un interés punitorio del 2% mensual sobre el monto adeudado. Las ' +
          'expensas extraordinarias serán aprobadas por asamblea con mayoría de dos tercios (2/3) de los copropietarios."\n\n' +
          'Pregunta: ¿Cuál es el interés por mora en el pago de expensas?',
        validate: (output) => validateDocumentQA(output, '2%'),
      },
      {
        id: 'building-regulations',
        category: 'regulation',
        input:
          'Documento: "REGLAMENTO DE COPROPIEDAD — RESTRICCIONES DE USO: Las unidades funcionales están ' +
          'destinadas exclusivamente a vivienda familiar. Queda prohibido el uso comercial, profesional o ' +
          'industrial de las unidades. El horario de silencio se establece entre las 22:00 y las 08:00 horas. ' +
          'Las mascotas están permitidas con un máximo de DOS (2) animales por unidad, debiendo circular por ' +
          'las áreas comunes con correa y/o transportín."\n\n' +
          'Pregunta: ¿Cuántas mascotas se permiten por unidad?',
        validate: (output) => validateDocumentQA(output, '2'),
      },
      {
        id: 'appraisal-value',
        category: 'appraisal',
        input:
          'Documento: "INFORME DE TASACIÓN — Inmueble: Av. Corrientes 3456, Piso 7°A, CABA. ' +
          'Superficie cubierta: 72 m². Antigüedad: 35 años. Estado de conservación: Bueno. ' +
          'Metodología aplicada: Comparativo de mercado con análisis de 8 operaciones recientes en la zona. ' +
          'VALOR DE TASACIÓN: DÓLARES ESTADOUNIDENSES CIENTO CUARENTA Y CINCO MIL (USD 145.000). ' +
          'Valor por metro cuadrado: USD 2.014/m². Fecha de tasación: 15 de abril de 2026."\n\n' +
          'Pregunta: ¿Cuál es el valor por metro cuadrado del inmueble?',
        validate: (output) => validateDocumentQA(output, '2.014'),
      },
      {
        id: 'appraisal-methodology',
        category: 'appraisal',
        input:
          'Documento: "INFORME DE TASACIÓN — METODOLOGÍA: Para la determinación del valor del inmueble ' +
          'se utilizó el método comparativo de mercado, analizando OCHO (8) operaciones de compraventa ' +
          'concretadas en los últimos SEIS (6) meses dentro de un radio de 500 metros del inmueble tasado. ' +
          'Se aplicaron coeficientes de homogeneización por superficie, antigüedad, orientación y estado ' +
          'de conservación. El desvío estándar de los comparables fue del 4,2%."\n\n' +
          'Pregunta: ¿Cuántas operaciones comparables se utilizaron en la tasación?',
        validate: (output) => validateDocumentQA(output, '8'),
      },
      {
        id: 'property-title',
        category: 'contract',
        input:
          'Documento: "ESCRITURA PÚBLICA N° 1247 — DESCRIPCIÓN DEL INMUEBLE: Departamento ubicado en ' +
          'la calle Tucumán 1890, Piso 5°, Unidad Funcional N° 12, de la Ciudad Autónoma de Buenos Aires, ' +
          'inscripto en la Matrícula Folio Real N° 45-23891/12 del Registro de la Propiedad Inmueble de la ' +
          'Capital Federal. Superficie según título: 92,50 m² cubiertos y 8,30 m² de balcón. Porcentual de ' +
          'dominio: 3,47% sobre el total del edificio."\n\n' +
          'Pregunta: ¿Cuál es la superficie cubierta según el título de propiedad?',
        validate: (output) => validateDocumentQA(output, '92,50'),
      },
    ],
  };
}
