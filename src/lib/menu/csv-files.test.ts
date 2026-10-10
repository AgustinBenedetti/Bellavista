import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { parseMenuRows } from './rows';

const EXPECTED_ROWS: Record<string, number> = {
  cafeteria: 16,
  'desayunos-meriendas': 5,
  brunch: 6,
  sandwicheria: 17,
  'burgers-caseras': 13,
  pizza: 11,
  comidas: 31,
  ensaladas: 10,
  'tartas-y-tortillas': 5,
  postres: 9,
  tortas: 11,
  refrescos: 13,
  cervezas: 17,
  vinos: 4,
  aperitivos: 7,
  whisky: 2,
};

describe('real csv/ files', () => {
  it('covers every category exactly once', () => {
    expect(CATEGORIES.map((c) => c.tab).sort()).toEqual(Object.keys(EXPECTED_ROWS).sort());
  });

  for (const [tab, count] of Object.entries(EXPECTED_ROWS)) {
    it(`${tab}.csv parses to ${count} rows with no skipped rows`, () => {
      const text = readFileSync(resolve(process.cwd(), 'csv', `${tab}.csv`), 'utf-8');
      const { rows, issues } = parseMenuRows(text, { tab, warn: () => {} });
      expect(issues).toEqual([]);
      expect(rows).toHaveLength(count);
    });
  }
});
