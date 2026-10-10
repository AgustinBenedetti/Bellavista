export type PriceParse = { ok: true; value: number | null } | { ok: false };

/**
 * Parses a price cell. Accepts plain integers and the formatted variants Google
 * Sheets may export ("$14.000", "14,000", "14000.00"). Blank means "no price".
 */
export function parsePrice(raw: string): PriceParse {
  const text = raw.replace(/[$\s]/g, '');
  if (text === '') return { ok: true, value: null };
  if (/^\d+$/.test(text)) return { ok: true, value: Number(text) };
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return { ok: true, value: Number(text.replace(/[.,]/g, '')) };
  const zeroDecimals = /^(\d+)[.,]0+$/.exec(text);
  if (zeroDecimals) return { ok: true, value: Number(zeroDecimals[1]) };
  return { ok: false };
}

/** Formats whole pesos the way the paper menu does: 14000 -> "$14.000". */
export function formatPrice(price: number | null): string {
  if (price === null) return '';
  return `$${String(price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
