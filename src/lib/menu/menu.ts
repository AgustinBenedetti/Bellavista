import { CATEGORIES } from './categories';
import { createCachedFetcher, createDefaultStore, type CacheStore } from './cache';
import { DEFAULT_TTL_SECONDS } from './config';
import { groupBySubcategory } from './group';
import { parseCsv } from './csv';
import { parseMenuRows, visibleItems } from './rows';
import type { CategoryDef, MenuCategory } from './types';

export interface LoadCategoriesOptions {
  /** Google Sheet id. When blank, the bundled csv/ files are used (dev only). */
  sheetId?: string;
  fetch?: typeof fetch;
  store?: CacheStore;
  ttlSeconds?: number;
  now?: () => number;
  warn?: (message: string) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
}

/** Tab whose CSV Google serves for any unknown tab name; probed to detect renamed tabs. */
export const MISSING_TAB_PROBE = '__bellavista_missing_tab__';

export function sheetCsvUrl(sheetId: string, tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const EXPECTED_COLUMNS = ['nombre', 'descripcion', 'precio', 'disponible', 'sin_tacc', 'subcategoria'] as const;

/** Returns the expected columns missing from the tab's header row (case, accents and order are ignored). */
function missingColumns(csv: string): string[] {
  const header = (parseCsv(csv)[0] ?? []).map(norm);
  return EXPECTED_COLUMNS.filter((column) => !header.includes(column));
}

function buildCategory(def: CategoryDef, csv: string, warn: (m: string) => void): MenuCategory {
  const { rows } = parseMenuRows(csv, { tab: def.tab, warn });
  const items = visibleItems(rows);
  return { slug: def.tab, title: def.title, sections: groupBySubcategory(items), itemCount: items.length };
}


/** The tab Google itself serves for unknown names: the sheet's first tab, which is the first built-in category. */
const FIRST_TAB = CATEGORIES[0].tab;

/**
 * Loads the given categories (by tab slug), in the order requested. Empty
 * categories are dropped. Only the requested tabs are fetched, plus one cached
 * "missing tab" probe used to detect renamed tabs (see below).
 *
 * A single broken tab degrades the page; the call only throws when every
 * requested tab failed (an outage) or a slug is unknown (a programming error).
 */
export async function loadCategories(
  slugs: readonly string[],
  options: LoadCategoriesOptions = {},
): Promise<MenuCategory[]> {
  const warn = options.warn ?? ((m: string) => console.warn(m));
  const defs = slugs.map((slug) => {
    const def = CATEGORIES.find((c) => c.tab === slug);
    if (!def) throw new Error(`Unknown category "${slug}"`);
    return def;
  });
  if (defs.length === 0) return [];

  if (!options.sheetId) {
    if (!import.meta.env.DEV) {
      throw new Error('SHEET_ID is not configured. Set it as a Worker variable (see README).');
    }
    const { readLocalCsv } = await import('./local-source');
    return defs.map((def) => buildCategory(def, readLocalCsv(def.tab), warn)).filter((c) => c.itemCount > 0);
  }

  const { sheetId } = options;
  const fetchFn = options.fetch ?? fetch;
  const fetchCached = createCachedFetcher({
    store: options.store ?? createDefaultStore(),
    ttlMs: (options.ttlSeconds ?? DEFAULT_TTL_SECONDS) * 1000,
    now: options.now,
    warn,
    waitUntil: options.waitUntil,
    fetchText: async (url) => {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
  });
  const readTab = (tab: string) => fetchCached(`${sheetId}:${tab}`, sheetCsvUrl(sheetId, tab));

  // Google answers a request for an unknown tab with the sheet's FIRST tab instead of an error.
  // Requesting a name that cannot exist returns exactly that fallback, so a requested tab (other
  // than the real first one) whose CSV equals it is a renamed or deleted tab. The probe is cached
  // like any tab, so it costs one request per TTL, shared by every page, and it works for any subset.
  const [probe, ...results] = await Promise.allSettled([
    readTab(MISSING_TAB_PROBE),
    ...defs.map((def) => readTab(def.tab)),
  ]);
  const fallbackCsv = probe.status === 'fulfilled' ? probe.value : undefined;
  if (fallbackCsv === undefined) {
    warn('[menu] missing-tab probe failed, so renamed tabs cannot be detected on this request');
  }

  const categories: MenuCategory[] = [];
  let firstError: unknown;
  results.forEach((result, i) => {
    const def = defs[i];
    if (result.status === 'rejected') {
      firstError ??= result.reason;
      warn(`[menu] skipping tab "${def.tab}": ${result.reason instanceof Error ? result.reason.message : result.reason}`);
      return;
    }
    if (def.tab !== FIRST_TAB && fallbackCsv !== undefined && result.value === fallbackCsv) {
      warn(`[menu] skipping tab "${def.tab}": it returned the same data as the first tab, so the tab probably does not exist`);
      return;
    }
    const missing = missingColumns(result.value);
    if (missing.length > 0) {
      warn(`[menu] skipping tab "${def.tab}": header row is missing column(s) ${missing.join(', ')}`);
      return;
    }
    categories.push(buildCategory(def, result.value, warn));
  });
  // A single broken tab degrades the page; every requested tab failing is a real outage.
  if (categories.length === 0 && firstError) throw firstError;
  return categories.filter((c) => c.itemCount > 0);
}
