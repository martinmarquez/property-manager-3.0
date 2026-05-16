import type { FeatureEvalConfig } from '../harness.js';

const SYSTEM_PROMPT = `Sos un redactor inmobiliario profesional argentino. Tu trabajo es escribir descripciones de propiedades inmobiliarias en español rioplatense.

Instrucciones:
- Usá español rioplatense con voseo (vos tenés, vos podés).
- Mantené un tono profesional adaptado al estilo solicitado (formal, casual o lujo).
- Describí ÚNICAMENTE los atributos provistos en la entrada. No inventes detalles que no estén en el input.
- No uses hashtags ni emojis bajo ninguna circunstancia.
- Respondé SOLAMENTE con el texto de la descripción. Sin JSON, sin encabezados, sin formato adicional.`;

const SPANISH_MARKERS = ['ubicado', 'cuenta', 'ambientes', 'dormitorios', 'superficie', 'propiedad', 'barrio', 'inmueble', 'espacios', 'metros', 'dispone', 'ideal', 'ofrece'];

function validateDescription(output: string, requiredTerms: string[]): boolean {
  const text = output.toLowerCase();
  const len = output.trim().length;

  if (len < 200 || len > 3000) return false;

  const spanishHits = SPANISH_MARKERS.filter((w) => text.includes(w));
  if (spanishHits.length < 2) return false;

  const termHits = requiredTerms.filter((t) => text.includes(t.toLowerCase()));
  if (termHits.length < Math.ceil(requiredTerms.length * 0.5)) return false;

  if (text.includes('#') || /[\u{1F600}-\u{1F6FF}]/u.test(text)) return false;

  return true;
}

export function createEval(): FeatureEvalConfig {
  return {
    featureId: 'property.description',
    systemPrompt: SYSTEM_PROMPT,
    threshold: 0.75,
    maxTokens: 1024,
    cases: [
      {
        id: 'apt-palermo-formal',
        category: 'apartment',
        input: `Tipo: Departamento
Ubicación: Palermo, CABA
Superficie: 85 m²
Ambientes: 3
Dormitorios: 2
Baños: 1
Precio: USD 185.000
Operación: Venta
Amenities: Balcón, parrilla en terraza
Tono: formal`,
        validate: (o) => validateDescription(o, ['Palermo', '85', 'dormitorios', 'balcón']),
      },
      {
        id: 'apt-belgrano-casual',
        category: 'apartment',
        input: `Tipo: Departamento
Ubicación: Belgrano, CABA
Superficie: 52 m²
Ambientes: 2
Dormitorios: 1
Baños: 1
Precio: USD 120.000
Operación: Venta
Amenities: Luminoso, apto profesional
Tono: casual`,
        validate: (o) => validateDescription(o, ['Belgrano', '52', 'luminoso']),
      },
      {
        id: 'apt-recoleta-luxury',
        category: 'luxury',
        input: `Tipo: Departamento
Ubicación: Recoleta, CABA
Superficie: 220 m²
Ambientes: 6
Dormitorios: 4
Baños: 3
Precio: USD 680.000
Operación: Venta
Amenities: Dependencia de servicio, cochera doble, baulera, vista al parque
Tono: lujo`,
        validate: (o) => validateDescription(o, ['Recoleta', '220', 'dormitorios', 'cochera', 'vista']),
      },
      {
        id: 'house-nordelta-formal',
        category: 'house',
        input: `Tipo: Casa
Ubicación: Nordelta, Tigre
Superficie: 350 m²
Terreno: 600 m²
Dormitorios: 4
Baños: 3
Precio: USD 520.000
Operación: Venta
Amenities: Pileta climatizada, quincho, jardín parquizado
Tono: formal`,
        validate: (o) => validateDescription(o, ['Nordelta', '350', 'pileta', 'jardín']),
      },
      {
        id: 'house-martinez-casual',
        category: 'house',
        input: `Tipo: Casa
Ubicación: Martínez, San Isidro
Superficie: 180 m²
Terreno: 300 m²
Dormitorios: 3
Baños: 2
Precio: USD 320.000
Operación: Venta
Amenities: Garage, patio con parrilla
Tono: casual`,
        validate: (o) => validateDescription(o, ['Martínez', '180', 'garage', 'parrilla']),
      },
      {
        id: 'house-pilar-luxury',
        category: 'luxury',
        input: `Tipo: Casa
Ubicación: La Lomada, Pilar
Superficie: 480 m²
Terreno: 1200 m²
Dormitorios: 5
Baños: 4
Precio: USD 890.000
Operación: Venta
Amenities: Pileta infinity, cancha de tenis, home cinema, bodega
Tono: lujo`,
        validate: (o) => validateDescription(o, ['Pilar', '480', 'pileta', 'bodega']),
      },
      {
        id: 'commercial-microcentro-formal',
        category: 'commercial',
        input: `Tipo: Oficina
Ubicación: Microcentro, CABA
Superficie: 120 m²
Plantas: 1
Baños: 2
Precio: USD 4.500/mes
Operación: Alquiler
Amenities: Recepción, sala de reuniones, aire acondicionado central
Tono: formal`,
        validate: (o) => validateDescription(o, ['Microcentro', '120', 'oficina', 'reuniones']),
      },
      {
        id: 'commercial-puerto-madero-luxury',
        category: 'luxury',
        input: `Tipo: Oficina premium
Ubicación: Puerto Madero, CABA
Superficie: 300 m²
Plantas: 1
Baños: 3
Precio: USD 12.000/mes
Operación: Alquiler
Amenities: Vista al río, piso de categoría, seguridad 24hs, cocheras
Tono: lujo`,
        validate: (o) => validateDescription(o, ['Puerto Madero', '300', 'vista', 'seguridad']),
      },
      {
        id: 'apt-caballito-rental-formal',
        category: 'apartment',
        input: `Tipo: Departamento
Ubicación: Caballito, CABA
Superficie: 65 m²
Ambientes: 3
Dormitorios: 2
Baños: 1
Precio: ARS 450.000/mes
Operación: Alquiler
Amenities: Lavadero, balcón corrido
Tono: formal`,
        validate: (o) => validateDescription(o, ['Caballito', '65', 'dormitorios', 'balcón']),
      },
      {
        id: 'commercial-local-san-telmo-casual',
        category: 'commercial',
        input: `Tipo: Local comercial
Ubicación: San Telmo, CABA
Superficie: 90 m²
Plantas: 1
Baños: 1
Precio: USD 2.800/mes
Operación: Alquiler
Amenities: Vidriera a la calle, sótano de depósito
Tono: casual`,
        validate: (o) => validateDescription(o, ['San Telmo', '90', 'local', 'vidriera']),
      },
      {
        id: 'house-la-plata-formal',
        category: 'house',
        input: `Tipo: Casa
Ubicación: City Bell, La Plata
Superficie: 200 m²
Terreno: 450 m²
Dormitorios: 3
Baños: 2
Precio: USD 230.000
Operación: Venta
Amenities: Galería, fondo libre, calefacción central
Tono: formal`,
        validate: (o) => validateDescription(o, ['City Bell', '200', 'dormitorios', 'galería']),
      },
      {
        id: 'apt-nuñez-casual',
        category: 'apartment',
        input: `Tipo: Monoambiente
Ubicación: Núñez, CABA
Superficie: 35 m²
Ambientes: 1
Dormitorios: 0
Baños: 1
Precio: USD 78.000
Operación: Venta
Amenities: SUM, laundry, bicicletero
Tono: casual`,
        validate: (o) => validateDescription(o, ['Núñez', '35', 'monoambiente']),
      },
    ],
  };
}
