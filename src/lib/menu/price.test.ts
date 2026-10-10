import { describe, expect, it } from 'vitest';
import { formatPrice, parsePrice } from './price';

describe('formatPrice', () => {
  it('formats with es-AR thousands separators', () => {
    expect(formatPrice(14000)).toBe('$14.000');
    expect(formatPrice(800)).toBe('$800');
    expect(formatPrice(1200000)).toBe('$1.200.000');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0');
  });

  it('returns an empty string for null', () => {
    expect(formatPrice(null)).toBe('');
  });
});

describe('parsePrice', () => {
  it('parses plain integers', () => {
    expect(parsePrice('14000')).toEqual({ ok: true, value: 14000 });
  });

  it('treats blank as null', () => {
    expect(parsePrice('')).toEqual({ ok: true, value: null });
    expect(parsePrice('   ')).toEqual({ ok: true, value: null });
  });

  it('accepts values formatted by Sheets (currency symbol and separators)', () => {
    expect(parsePrice('$14.000')).toEqual({ ok: true, value: 14000 });
    expect(parsePrice('$ 14,000')).toEqual({ ok: true, value: 14000 });
    expect(parsePrice('1.200.000')).toEqual({ ok: true, value: 1200000 });
    expect(parsePrice('14000.00')).toEqual({ ok: true, value: 14000 });
  });

  it('rejects non numeric or negative values', () => {
    expect(parsePrice('gratis').ok).toBe(false);
    expect(parsePrice('-500').ok).toBe(false);
    expect(parsePrice('12.5').ok).toBe(false);
  });
});
