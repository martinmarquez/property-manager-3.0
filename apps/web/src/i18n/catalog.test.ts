// @vitest-environment node
import { describe, it, expect } from 'vitest';
import esAR from '@corredor/core/i18n/messages/es-AR.json';
import es from '@corredor/core/i18n/messages/es.json';
import en from '@corredor/core/i18n/messages/en.json';
import ptBR from '@corredor/core/i18n/messages/pt-BR.json';
import esMX from '@corredor/core/i18n/messages/es-MX.json';

const PRIMARY = esAR as Record<string, string>;
const STUBS = { es, en, 'pt-BR': ptBR, 'es-MX': esMX } as Record<string, Record<string, string>>;
const primaryKeys = Object.keys(PRIMARY);

describe('i18n message catalogs', () => {
  it('es-AR has no empty string values', () => {
    const empty = primaryKeys.filter((k) => PRIMARY[k] === '');
    expect(empty, `Missing translations in es-AR: ${empty.join(', ')}`).toHaveLength(0);
  });

  for (const [locale, catalog] of Object.entries(STUBS)) {
    it(`${locale} stub has all keys present in es-AR`, () => {
      const stubKeys = Object.keys(catalog);
      const missing = primaryKeys.filter((k) => !stubKeys.includes(k));
      expect(missing, `Keys missing in ${locale}: ${missing.join(', ')}`).toHaveLength(0);
    });

    it(`${locale} stub has no extra keys absent from es-AR`, () => {
      const extra = Object.keys(catalog).filter((k) => !primaryKeys.includes(k));
      expect(extra, `Orphaned keys in ${locale}: ${extra.join(', ')}`).toHaveLength(0);
    });
  }
});
