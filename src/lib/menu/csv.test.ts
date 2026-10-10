import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('x,"Batido de helado, chocolate",5500')).toEqual([
      ['x', 'Batido de helado, chocolate', '5500'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('"dice ""hola""",b')).toEqual([['dice "hola"', 'b']]);
  });

  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('"line1\nline2",b\nc,d')).toEqual([
      ['line1\nline2', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles CRLF line endings and a missing trailing newline', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('preserves empty fields', () => {
    expect(parseCsv('a,,c,')).toEqual([['a', '', 'c', '']]);
  });

  it('strips a leading BOM', () => {
    expect(parseCsv('﻿a,b')).toEqual([['a', 'b']]);
  });

  it('returns no rows for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
