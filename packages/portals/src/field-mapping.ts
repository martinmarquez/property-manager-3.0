import type { NormalizedListing } from './types.js';

// ---------------------------------------------------------------------------
// Property type mapping — Corredor internal type → portal-specific strings
// ---------------------------------------------------------------------------

const MELI_PROPERTY_TYPES: Record<string, string> = {
  apartment: 'MLA1473',
  ph: 'MLA1477',
  house: 'MLA1472',
  quinta: 'MLA1478',
  land: 'MLA1474',
  office: 'MLA1475',
  commercial: 'MLA1476',
  garage: 'MLA395126',
  warehouse: 'MLA1479',
  farm: 'MLA1480',
  hotel: 'MLA1481',
  building: 'MLA1482',
  business_fund: 'MLA1483',
  development: 'MLA1484',
};

const PROPPIT_PROPERTY_TYPES: Record<string, string> = {
  apartment: 'flat',
  ph: 'penthouse',
  house: 'house',
  quinta: 'countryHouse',
  land: 'land',
  office: 'office',
  commercial: 'premises',
  garage: 'garage',
  warehouse: 'storageRoom',
  farm: 'land',
  hotel: 'building',
  building: 'building',
  business_fund: 'premises',
  development: 'newDevelopment',
};

// ---------------------------------------------------------------------------
// Operation type mapping
// ---------------------------------------------------------------------------

const MELI_OPERATION_TYPES: Record<string, string> = {
  sale: 'sell',
  rent: 'rent',
  temp_rent: 'temporary_rent',
};

const PROPPIT_OPERATION_TYPES: Record<string, string> = {
  sale: 'sale',
  rent: 'rent',
  temp_rent: 'rent',
};

// ---------------------------------------------------------------------------
// Argentine province → MeLi location ID mapping (top provinces)
// ---------------------------------------------------------------------------

const MELI_PROVINCE_IDS: Record<string, string> = {
  'Buenos Aires': 'TUxBUENBUGw3M2E1',
  'Capital Federal': 'TUxBUENBUGZlZG1sYQ',
  'CABA': 'TUxBUENBUGZlZG1sYQ',
  'Córdoba': 'TUxBUENPUnMxMjR6Mw',
  'Santa Fe': 'TUxBUFNBTnM5OWMx',
  'Mendoza': 'TUxBUE1FTmE5OWQ4',
  'Tucumán': 'TUxBUFRVQ244MTFi',
};

// ---------------------------------------------------------------------------
// Mapping functions
// ---------------------------------------------------------------------------

export function toMeliListing(listing: NormalizedListing): Record<string, unknown> {
  return {
    title: listing.title.substring(0, 60),
    category_id: MELI_PROPERTY_TYPES[listing.propertyType] ?? 'MLA1473',
    listing_type_id: 'gold_special',
    buying_mode: 'classified',
    currency_id: listing.priceCurrency,
    price: listing.priceAmount,
    available_quantity: 1,
    condition: 'not_specified',
    pictures: listing.images.map((img) => ({ source: img.url })),
    description: { plain_text: listing.description },
    attributes: [
      { id: 'OPERATION', value_name: MELI_OPERATION_TYPES[listing.operationType] ?? 'sell' },
      { id: 'PROPERTY_TYPE', value_name: MELI_PROPERTY_TYPES[listing.propertyType] ?? 'MLA1473' },
      ...(listing.coveredAreaM2 ? [{ id: 'COVERED_AREA', value_name: String(listing.coveredAreaM2), value_struct: { number: listing.coveredAreaM2, unit: 'm²' } }] : []),
      ...(listing.totalAreaM2 ? [{ id: 'TOTAL_AREA', value_name: String(listing.totalAreaM2), value_struct: { number: listing.totalAreaM2, unit: 'm²' } }] : []),
      ...(listing.rooms ? [{ id: 'ROOMS', value_name: String(listing.rooms) }] : []),
      ...(listing.bedrooms ? [{ id: 'BEDROOMS', value_name: String(listing.bedrooms) }] : []),
      ...(listing.bathrooms ? [{ id: 'BATHROOMS', value_name: String(listing.bathrooms) }] : []),
      ...(listing.garages ? [{ id: 'PARKING_LOTS', value_name: String(listing.garages) }] : []),
      ...(listing.ageYears !== undefined ? [{ id: 'ITEM_CONDITION', value_name: listing.ageYears === 0 ? 'Nuevo' : `${listing.ageYears} años` }] : []),
    ],
    location: {
      ...(listing.lat && listing.lng ? { latitude: listing.lat, longitude: listing.lng } : {}),
      address_line: [listing.addressStreet, listing.addressNumber].filter(Boolean).join(' '),
      ...(listing.province && MELI_PROVINCE_IDS[listing.province] ? { state: { id: MELI_PROVINCE_IDS[listing.province] } } : {}),
      ...(listing.neighborhood ? { neighborhood: { name: listing.neighborhood } } : {}),
    },
  };
}

export function toProppitListing(listing: NormalizedListing): Record<string, unknown> {
  return {
    reference: listing.referenceCode,
    propertyType: PROPPIT_PROPERTY_TYPES[listing.propertyType] ?? 'flat',
    operation: PROPPIT_OPERATION_TYPES[listing.operationType] ?? 'sale',
    title: listing.title,
    description: listing.description,
    price: {
      amount: listing.priceAmount,
      currency: listing.priceCurrency,
    },
    address: {
      street: [listing.addressStreet, listing.addressNumber].filter(Boolean).join(' '),
      city: listing.locality,
      province: listing.province,
      country: listing.country,
      ...(listing.lat && listing.lng ? { latitude: listing.lat, longitude: listing.lng } : {}),
    },
    features: {
      ...(listing.coveredAreaM2 ? { builtArea: listing.coveredAreaM2 } : {}),
      ...(listing.totalAreaM2 ? { plotArea: listing.totalAreaM2 } : {}),
      ...(listing.rooms ? { rooms: listing.rooms } : {}),
      ...(listing.bedrooms ? { bedrooms: listing.bedrooms } : {}),
      ...(listing.bathrooms ? { bathrooms: listing.bathrooms } : {}),
      ...(listing.garages ? { garages: listing.garages } : {}),
      ...(listing.ageYears !== undefined ? { antiquity: listing.ageYears } : {}),
    },
    images: listing.images.map((img) => ({
      url: img.url,
      title: img.caption ?? '',
      order: img.sortOrder,
    })),
    ...(listing.contactName || listing.contactPhone || listing.contactEmail ? {
      contact: {
        name: listing.contactName,
        phone: listing.contactPhone,
        email: listing.contactEmail,
      },
    } : {}),
  };
}
