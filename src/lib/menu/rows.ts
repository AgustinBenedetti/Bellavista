import { parseCsv } from './csv';
import { parsePrice } from './price';
import type { MenuItem } from './types';

export interface RowIssue {
  /** 1-based CSV record number (the header is line 1). */
  line: number;
  message: string;
}

export interface ParseOptions {
  /** Tab name, only used to label warnings. */
  tab?: string;
  warn?: (message: string) => void;
}

export interface ParseResult {
  rows: MenuItem[];
  issues: RowIssue[];
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

const TRUE_VALUES = new Set(['true', 'verdadero', 'si', 'yes', '1']);
const FALSE_VALUES = new Set(['false', 'falso', 'no', '0']);

function parseBool(raw: string, fallback: boolean): boolean | undefined {
  const v = normalize(raw);
  if (v === '') return fallback;
  if (TRUE_VALUES.has(v)) return true;
  if (FALSE_VALUES.has(v)) return false;
  return undefined;
}

/**
 * Parses one category tab. Invalid rows are skipped and reported (never thrown),
 * so a typo in the sheet cannot take the whole menu down.
 */
export function parseMenuRows(csvText: string, options: ParseOptions = {}): ParseResult {
  const { tab = '?', warn = (m: string) => console.warn(m) } = options;
  const records = parseCsv(csvText);
  const rows: MenuItem[] = [];
  const issues: RowIssue[] = [];
  if (records.length === 0) return { rows, issues };

  const report = (line: number, message: string) => {
    issues.push({ line, message });
    warn(`[menu:${tab}] line ${line}: ${message}`);
  };

  const header = records[0].map(normalize);
  const col = (name: string) => header.indexOf(name);
  const idx = {
    name: col('nombre'),
    description: col('descripcion'),
    price: col('precio'),
    available: col('disponible'),
    glutenFree: col('sin_tacc'),
    subcategory: col('subcategoria'),
  };
  if (idx.name === -1) {
    report(1, 'Missing required column "nombre"; tab ignored');
    return { rows, issues };
  }
  const cell = (record: string[], i: number) => (i === -1 ? '' : (record[i] ?? '').trim());

  for (let n = 1; n < records.length; n++) {
    const record = records[n];
    const line = n + 1;
    if (record.every((c) => c.trim() === '')) continue;

    const name = cell(record, idx.name);
    if (!name) {
      report(line, 'Missing "nombre"');
      continue;
    }
    const price = parsePrice(cell(record, idx.price));
    if (!price.ok) {
      report(line, `Invalid "precio" value "${cell(record, idx.price)}"`);
      continue;
    }
    const available = parseBool(cell(record, idx.available), true);
    if (available === undefined) {
      report(line, `Invalid "disponible" value "${cell(record, idx.available)}"`);
      continue;
    }
    const glutenFree = parseBool(cell(record, idx.glutenFree), false);
    if (glutenFree === undefined) {
      report(line, `Invalid "sin_tacc" value "${cell(record, idx.glutenFree)}"`);
      continue;
    }
    rows.push({
      name,
      description: cell(record, idx.description),
      price: price.value,
      available,
      glutenFree,
      subcategory: cell(record, idx.subcategory),
    });
  }
  return { rows, issues };
}

export const visibleItems = (rows: MenuItem[]): MenuItem[] => rows.filter((r) => r.available);
