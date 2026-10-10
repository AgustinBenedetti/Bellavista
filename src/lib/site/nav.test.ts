import { describe, expect, it } from 'vitest';
import { GROUPS, type MenuCategory } from '../menu';
import { buildGroupNav, buildNav } from './nav';

const category = (slug: string, title: string): MenuCategory => ({ slug, title, sections: [], itemCount: 1 });

describe('buildNav', () => {
  it('maps each category to an anchor entry, keeping menu order', () => {
    const nav = buildNav([category('pizza', 'Pizza'), category('tortas', 'Tortas')]);
    expect(nav).toEqual([
      { id: 'pizza', label: 'Pizza', href: '#pizza' },
      { id: 'tortas', label: 'Tortas', href: '#tortas' },
    ]);
  });

  it('returns an empty list for an empty menu', () => {
    expect(buildNav([])).toEqual([]);
  });

  it('sanitises slugs so anchors are always valid ids', () => {
    const nav = buildNav([category('Café & Té!', 'Café')]);
    expect(nav[0].id).toBe('cafe-te');
    expect(nav[0].href).toBe('#cafe-te');
  });
});

describe('buildGroupNav', () => {
  it('lists the four groups with clean URLs, in order', () => {
    const nav = buildGroupNav(GROUPS, undefined);
    expect(nav.map((e) => [e.label, e.href])).toEqual([
      ['Desayunos', '/desayunos'],
      ['Comidas', '/comidas'],
      ['Postres', '/postres'],
      ['Bebidas', '/bebidas'],
    ]);
  });

  it('marks only the current group', () => {
    const nav = buildGroupNav(GROUPS, 'bebidas');
    expect(nav.filter((e) => e.current).map((e) => e.slug)).toEqual(['bebidas']);
  });

  it('marks nothing when there is no current group (landing, 404)', () => {
    expect(buildGroupNav(GROUPS, undefined).some((e) => e.current)).toBe(false);
    expect(buildGroupNav(GROUPS, 'unknown').some((e) => e.current)).toBe(false);
  });
});
