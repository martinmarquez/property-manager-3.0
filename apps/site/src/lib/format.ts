const OPERATION_LABELS: Record<string, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  temp_rent: 'Alquiler temporal',
  commercial_rent: 'Alquiler comercial',
  commercial_sale: 'Venta comercial',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  ph: 'PH',
  house: 'Casa',
  quinta: 'Quinta',
  land: 'Terreno',
  office: 'Oficina',
  commercial: 'Local comercial',
  garage: 'Cochera',
  warehouse: 'Galpón',
  farm: 'Campo',
  hotel: 'Hotel',
  building: 'Edificio',
  business_fund: 'Fondo de comercio',
  development: 'Emprendimiento',
};

export function translateOperation(kind: string): string {
  return OPERATION_LABELS[kind] ?? kind;
}

export function translatePropertyType(type: string): string {
  return PROPERTY_TYPE_LABELS[type] ?? type;
}

export function formatPrice(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency === 'ARS' ? 'ARS' : 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatArea(m2: number): string {
  return `${Math.round(m2)} m²`;
}
