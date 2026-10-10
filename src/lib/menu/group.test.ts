import { describe, expect, it } from 'vitest';
import { groupBySubcategory } from './group';
import type { MenuItem } from './types';

const item = (name: string, subcategory: string): MenuItem => ({
  name,
  description: '',
  price: 1,
  available: true,
  glutenFree: false,
  subcategory,
});

describe('groupBySubcategory', () => {
  it('groups by first appearance preserving item order', () => {
    const sections = groupBySubcategory([
      item('a', 'Fríos'),
      item('b', 'Calientes'),
      item('c', 'Fríos'),
      item('d', 'Calientes'),
    ]);
    expect(sections.map((s) => s.title)).toEqual(['Fríos', 'Calientes']);
    expect(sections[0].items.map((i) => i.name)).toEqual(['a', 'c']);
    expect(sections[1].items.map((i) => i.name)).toEqual(['b', 'd']);
  });

  it('uses an empty title for items without subcategory', () => {
    const sections = groupBySubcategory([item('a', ''), item('b', '')]);
    expect(sections).toEqual([{ title: '', items: [item('a', ''), item('b', '')] }]);
  });

  it('returns no sections for no items', () => {
    expect(groupBySubcategory([])).toEqual([]);
  });
});
