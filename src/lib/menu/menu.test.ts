import { describe, expect, it, vi } from 'vitest';
import { CATEGORIES } from './categories';
import { createMemoryStore } from './cache';
import { loadCategories, MISSING_TAB_PROBE } from './menu';

const HEADER = 'nombre,descripcion,precio,disponible,sin_tacc,subcategoria';

/** Fake gviz endpoint: tab name -> CSV text. Unknown tabs return the first tab (like Google). */
function fakeSheets(tabs: Record<string, string>) {
  const first = Object.values(tabs)[0];
  return vi.fn(async (url: string | URL | Request) => {
    const u = new URL(String(url));
    const tab = u.searchParams.get('sheet') ?? '';
    return new Response(tabs[tab] ?? first, { status: 200 });
  });
}

const requestedTabs = (fetchFn: ReturnType<typeof fakeSheets>) =>
  fetchFn.mock.calls.map((c) => new URL(String(c[0])).searchParams.get('sheet'));

describe('CATEGORIES', () => {
  it('lists the 16 categories in menu order with unique tabs', () => {
    expect(CATEGORIES).toHaveLength(16);
    expect(new Set(CATEGORIES.map((c) => c.tab)).size).toBe(16);
    expect(CATEGORIES[0].tab).toBe('cafeteria');
    expect(CATEGORIES.at(-1)?.tab).toBe('whisky');
    expect(CATEGORIES.every((c) => c.title.length > 0)).toBe(true);
  });
});

describe('loadCategories (Google Sheets source)', () => {
  const sheetTabs = Object.fromEntries(
    CATEGORIES.map((c) => [c.tab, `${HEADER}\n${c.title} item,,1000,TRUE,FALSE,\nHidden,,1,FALSE,FALSE,\n`]),
  );
  const base = () => ({ sheetId: 'SHEET123', store: createMemoryStore(), warn: vi.fn() });

  it('requests only the asked tabs (plus one probe) through the gviz CSV endpoint', async () => {
    const fetchFn = fakeSheets(sheetTabs);
    const result = await loadCategories(['pizza', 'tortas'], { ...base(), fetch: fetchFn });
    expect(result.map((c) => c.slug)).toEqual(['pizza', 'tortas']);
    expect([...requestedTabs(fetchFn)].sort()).toEqual([MISSING_TAB_PROBE, 'pizza', 'tortas'].sort());
    expect(fetchFn.mock.calls.map((c) => String(c[0]))).toContain(
      'https://docs.google.com/spreadsheets/d/SHEET123/gviz/tq?tqx=out:csv&sheet=pizza',
    );
  });

  it('builds categories with visible items only and keeps the requested order', async () => {
    const result = await loadCategories(['tortas', 'pizza'], { ...base(), fetch: fakeSheets(sheetTabs) });
    expect(result.map((c) => c.slug)).toEqual(['tortas', 'pizza']);
    expect(result[1].sections[0].items.map((i) => i.name)).toEqual(['Pizza item']);
    expect(result[1].title).toBe('Pizza');
  });

  it('drops categories that end up empty', async () => {
    const tabs = { ...sheetTabs, whisky: `${HEADER}\n` };
    const result = await loadCategories(['vinos', 'whisky'], { ...base(), fetch: fakeSheets(tabs) });
    expect(result.map((c) => c.slug)).toEqual(['vinos']);
  });

  it('throws on an unknown category slug', async () => {
    const fetchFn = fakeSheets(sheetTabs);
    await expect(loadCategories(['nope'], { ...base(), fetch: fetchFn })).rejects.toThrow(/unknown category/i);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('does not touch the network when no categories are requested', async () => {
    const fetchFn = fakeSheets(sheetTabs);
    expect(await loadCategories([], { ...base(), fetch: fetchFn })).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('skips a tab whose header row lacks the expected columns, with a warning', async () => {
    const tabs = { ...sheetTabs, pizza: 'foo,bar\nMozzarella,16000\n' };
    const opts = base();
    const result = await loadCategories(['pizza', 'ensaladas'], { ...opts, fetch: fakeSheets(tabs) });
    expect(result.map((c) => c.slug)).toEqual(['ensaladas']);
    expect(opts.warn).toHaveBeenCalledWith(expect.stringMatching(/pizza.*header/i));
  });

  it('accepts headers with different case, accents, spacing and extra columns', async () => {
    const tabs = {
      ...sheetTabs,
      pizza: 'Nombre, Descripción ,PRECIO,disponible,sin_tacc,subcategoria,notas\nMozzarella,,16000,TRUE,FALSE,,x\n',
    };
    const result = await loadCategories(['pizza'], { ...base(), fetch: fakeSheets(tabs) });
    expect(result[0].itemCount).toBe(1);
  });

  describe('missing-tab detection (Google answers unknown tabs with the first tab)', () => {
    it('skips a renamed tab even when the first tab is not part of the request', async () => {
      const tabs: Record<string, string> = { ...sheetTabs };
      delete tabs.whisky; // renamed in the sheet -> Google serves the first tab's CSV
      const opts = base();
      const result = await loadCategories(['refrescos', 'whisky'], { ...opts, fetch: fakeSheets(tabs) });
      expect(result.map((c) => c.slug)).toEqual(['refrescos']);
      expect(opts.warn).toHaveBeenCalledWith(expect.stringMatching(/whisky.*first tab/i));
    });

    it('does not flag the real first tab, whose data legitimately equals the fallback', async () => {
      const opts = base();
      const result = await loadCategories(['cafeteria', 'brunch'], { ...opts, fetch: fakeSheets(sheetTabs) });
      expect(result.map((c) => c.slug)).toEqual(['cafeteria', 'brunch']);
      expect(opts.warn).not.toHaveBeenCalled();
    });

    it('still loads the tabs when the probe request fails, with a warning', async () => {
      const fetchFn = vi.fn(async (url: string | URL | Request) => {
        const tab = new URL(String(url)).searchParams.get('sheet') ?? '';
        if (tab === MISSING_TAB_PROBE) throw new Error('network');
        return new Response(sheetTabs[tab], { status: 200 });
      });
      const opts = base();
      const result = await loadCategories(['pizza'], { ...opts, fetch: fetchFn });
      expect(result.map((c) => c.slug)).toEqual(['pizza']);
      expect(opts.warn).toHaveBeenCalledWith(expect.stringMatching(/probe|missing-tab/i));
    });
  });

  describe('caching and failures', () => {
    it('reuses cached tabs (and the probe) across calls within the TTL', async () => {
      const fetchFn = fakeSheets(sheetTabs);
      const opts = { ...base(), fetch: fetchFn, now: () => 0, ttlSeconds: 60 };
      await loadCategories(['pizza', 'tortas'], opts);
      const callsAfterFirst = fetchFn.mock.calls.length;
      await loadCategories(['pizza'], opts);
      expect(fetchFn.mock.calls.length).toBe(callsAfterFirst);
    });

    it('serves the last cached copy when Google fails later', async () => {
      const store = createMemoryStore();
      let clock = 0;
      const shared = { sheetId: 's', store, now: () => clock, ttlSeconds: 60, warn: vi.fn() };
      await loadCategories(['pizza', 'tortas'], { ...shared, fetch: fakeSheets(sheetTabs) });
      clock += 120_000;
      const down = vi.fn(async () => new Response('nope', { status: 500 }));
      const result = await loadCategories(['pizza', 'tortas'], { ...shared, fetch: down });
      expect(result.map((c) => c.slug)).toEqual(['pizza', 'tortas']);
    });

    it('degrades to the tabs that work when one requested tab fails', async () => {
      const fetchFn = vi.fn(async (url: string | URL | Request) => {
        const tab = new URL(String(url)).searchParams.get('sheet') ?? '';
        if (tab === 'tortas') return new Response('nope', { status: 500 });
        return new Response(sheetTabs[tab] ?? sheetTabs.cafeteria, { status: 200 });
      });
      const opts = base();
      const result = await loadCategories(['postres', 'tortas'], { ...opts, fetch: fetchFn });
      expect(result.map((c) => c.slug)).toEqual(['postres']);
      expect(opts.warn).toHaveBeenCalledWith(expect.stringMatching(/tortas/));
    });

    it('throws a clear error when every requested tab fails and nothing is cached', async () => {
      const down = vi.fn(async () => new Response('nope', { status: 500 }));
      await expect(loadCategories(['pizza', 'tortas'], { ...base(), fetch: down })).rejects.toThrow(/no cached copy/i);
    });
  });
});

describe('loadCategories (local fallback source)', () => {
  it('reads the bundled csv/ files when no sheetId is given in dev', async () => {
    const fetchFn = vi.fn();
    const result = await loadCategories(['pizza', 'whisky'], { fetch: fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.map((c) => c.slug)).toEqual(['pizza', 'whisky']);
    expect(result[0].itemCount).toBe(11);
  });
});
