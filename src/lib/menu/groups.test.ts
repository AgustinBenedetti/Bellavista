import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './categories';
import { GROUPS, getGroup, resolveGroup } from './groups';

describe('GROUPS', () => {
  it('defines the four pages in navigation order', () => {
    expect(GROUPS.map((g) => g.slug)).toEqual(['desayunos', 'comidas', 'postres', 'bebidas']);
  });

  it('covers every built-in category exactly once', () => {
    const grouped = GROUPS.flatMap((g) => g.categories);
    expect(grouped).toHaveLength(16);
    expect(new Set(grouped).size).toBe(16);
    expect([...grouped].sort()).toEqual(CATEGORIES.map((c) => c.tab).sort());
  });

  it('only references known category tabs', () => {
    const known = new Set(CATEGORIES.map((c) => c.tab));
    for (const group of GROUPS) {
      for (const tab of group.categories) expect(known.has(tab)).toBe(true);
    }
  });

  it('keeps categories in menu order inside each group', () => {
    const order = CATEGORIES.map((c) => c.tab);
    for (const group of GROUPS) {
      const positions = group.categories.map((tab) => order.indexOf(tab));
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it('groups the categories as agreed with the venue', () => {
    expect(getGroup('desayunos')?.categories).toEqual(['cafeteria', 'desayunos-meriendas', 'brunch']);
    expect(getGroup('comidas')?.categories).toEqual([
      'sandwicheria',
      'burgers-caseras',
      'pizza',
      'comidas',
      'ensaladas',
      'tartas-y-tortillas',
    ]);
    expect(getGroup('postres')?.categories).toEqual(['postres', 'tortas']);
    expect(getGroup('bebidas')?.categories).toEqual(['refrescos', 'cervezas', 'vinos', 'aperitivos', 'whisky']);
  });

  it('gives every group display copy', () => {
    for (const group of GROUPS) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.navLabel.length).toBeGreaterThan(0);
      expect(group.tagline.length).toBeGreaterThan(0);
      expect(group.description.length).toBeGreaterThan(0);
    }
  });
});

describe('getGroup', () => {
  it('returns the group for a known slug and undefined otherwise', () => {
    expect(getGroup('bebidas')?.title).toBe('Bebidas');
    expect(getGroup('nope')).toBeUndefined();
  });
});

describe('resolveGroup (route param -> group, null means 404)', () => {
  it('resolves known slugs, ignoring case, spaces and slashes', () => {
    expect(resolveGroup('bebidas')?.slug).toBe('bebidas');
    expect(resolveGroup('Bebidas')?.slug).toBe('bebidas');
    expect(resolveGroup(' comidas/ ')?.slug).toBe('comidas');
    expect(resolveGroup('/postres/')?.slug).toBe('postres');
  });

  it('returns null for unknown, empty or missing params', () => {
    expect(resolveGroup('pizza')).toBeNull();
    expect(resolveGroup('')).toBeNull();
    expect(resolveGroup(undefined)).toBeNull();
    expect(resolveGroup('bebidas/extra')).toBeNull();
    expect(resolveGroup('__proto__')).toBeNull();
  });
});
