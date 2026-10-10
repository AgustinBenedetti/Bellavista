import { describe, expect, it, vi } from 'vitest';
import { parseMenuRows, visibleItems } from './rows';

const HEADER = 'nombre,descripcion,precio,disponible,sin_tacc,subcategoria';

describe('parseMenuRows', () => {
  it('maps a valid row to a typed item', () => {
    const { rows, issues } = parseMenuRows(
      `${HEADER}\nPizza,Con jamón,18000,TRUE,FALSE,Clásicas\n`,
    );
    expect(issues).toEqual([]);
    expect(rows).toEqual([
      {
        name: 'Pizza',
        description: 'Con jamón',
        price: 18000,
        available: true,
        glutenFree: false,
        subcategory: 'Clásicas',
      },
    ]);
  });

  it('accepts booleans case-insensitively and common aliases', () => {
    const csv = `${HEADER}\nA,,1,true,True,\nB,,1,FALSE,false,\nC,,1,sí,no,\nD,,1,0,1,\n`;
    const { rows } = parseMenuRows(csv);
    expect(rows.map((r) => [r.available, r.glutenFree])).toEqual([
      [true, true],
      [false, false],
      [true, false],
      [false, true],
    ]);
  });

  it('defaults blank disponible to true and blank sin_tacc to false', () => {
    const { rows } = parseMenuRows(`${HEADER}\nA,,1,,,\n`);
    expect(rows[0]).toMatchObject({ available: true, glutenFree: false });
  });

  it('allows a blank price (null)', () => {
    const { rows, issues } = parseMenuRows(`${HEADER}\nChampagne,,,TRUE,FALSE,\n`);
    expect(issues).toEqual([]);
    expect(rows[0].price).toBeNull();
  });

  it('skips and reports rows with a missing name', () => {
    const { rows, issues } = parseMenuRows(`${HEADER}\n,desc,100,TRUE,FALSE,\nOk,,100,TRUE,FALSE,\n`);
    expect(rows.map((r) => r.name)).toEqual(['Ok']);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ line: 2 });
  });

  it('skips and reports rows with an invalid price', () => {
    const { rows, issues } = parseMenuRows(`${HEADER}\nBad,,mucho,TRUE,FALSE,\n`);
    expect(rows).toEqual([]);
    expect(issues[0].message).toMatch(/precio/i);
  });

  it('skips and reports rows with an invalid boolean', () => {
    const { rows, issues } = parseMenuRows(`${HEADER}\nBad,,100,quizas,FALSE,\n`);
    expect(rows).toEqual([]);
    expect(issues[0].message).toMatch(/disponible/i);
  });

  it('ignores completely blank lines silently', () => {
    const { rows, issues } = parseMenuRows(`${HEADER}\n,,,,,\nOk,,1,TRUE,FALSE,\n`);
    expect(rows).toHaveLength(1);
    expect(issues).toEqual([]);
  });

  it('matches headers regardless of case, accents and order', () => {
    const { rows } = parseMenuRows('Precio,NOMBRE,Descripción\n500,Café,Largo\n');
    expect(rows[0]).toMatchObject({ name: 'Café', price: 500, description: 'Largo' });
  });

  it('reports a malformed tab (no nombre column) without throwing', () => {
    const { rows, issues } = parseMenuRows('foo,bar\n1,2\n');
    expect(rows).toEqual([]);
    expect(issues[0].message).toMatch(/nombre/i);
  });

  it('does not throw on empty input', () => {
    expect(parseMenuRows('')).toEqual({ rows: [], issues: [] });
  });

  it('warns through the provided logger', () => {
    const warn = vi.fn();
    parseMenuRows(`${HEADER}\n,x,1,TRUE,FALSE,\n`, { tab: 'pizza', warn });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('pizza');
  });

  it('keeps row order', () => {
    const { rows } = parseMenuRows(`${HEADER}\nC,,1,TRUE,FALSE,\nA,,1,TRUE,FALSE,\nB,,1,TRUE,FALSE,\n`);
    expect(rows.map((r) => r.name)).toEqual(['C', 'A', 'B']);
  });
});

describe('visibleItems', () => {
  it('filters out unavailable rows', () => {
    const { rows } = parseMenuRows(`${HEADER}\nA,,1,TRUE,FALSE,\nB,,1,FALSE,FALSE,\n`);
    expect(visibleItems(rows).map((r) => r.name)).toEqual(['A']);
  });
});
