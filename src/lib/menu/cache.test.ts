import { describe, expect, it, vi } from 'vitest';
import {
  createCacheApiStore,
  createCachedFetcher,
  createLayeredStore,
  createMemoryStore,
  type CacheEntry,
  type CacheLike,
  type CacheStore,
} from './cache';

const TTL = 300_000;

function setup(overrides: Partial<Parameters<typeof createCachedFetcher>[0]> = {}) {
  let clock = 1_000_000;
  const store = createMemoryStore();
  const fetchText = vi.fn(async (_url: string) => 'fresh');
  const warn = vi.fn();
  const fetcher = createCachedFetcher({
    store,
    fetchText,
    ttlMs: TTL,
    now: () => clock,
    warn,
    ...overrides,
  });
  return { store, fetchText, warn, fetcher, advance: (ms: number) => (clock += ms) };
}

describe('createCachedFetcher', () => {
  it('fetches on a cold cache and stores the result', async () => {
    const { fetcher, fetchText, store } = setup();
    expect(await fetcher('k', 'u')).toBe('fresh');
    expect(fetchText).toHaveBeenCalledWith('u');
    expect((await store.get('k'))?.value).toBe('fresh');
  });

  it('serves from cache while fresh without refetching', async () => {
    const { fetcher, fetchText, advance } = setup();
    await fetcher('k', 'u');
    advance(TTL - 1);
    await fetcher('k', 'u');
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    const { fetcher, fetchText, advance } = setup();
    await fetcher('k', 'u');
    advance(TTL + 1);
    await fetcher('k', 'u');
    expect(fetchText).toHaveBeenCalledTimes(2);
  });

  it('serves the stale copy when the refresh fails', async () => {
    const { fetcher, fetchText, advance, warn } = setup();
    await fetcher('k', 'u');
    advance(TTL + 1);
    fetchText.mockRejectedValueOnce(new Error('boom'));
    expect(await fetcher('k', 'u')).toBe('fresh');
    expect(warn).toHaveBeenCalled();
  });

  it('throws a clear error when the fetch fails and nothing is cached', async () => {
    const { fetcher, fetchText } = setup();
    fetchText.mockRejectedValueOnce(new Error('boom'));
    await expect(fetcher('cafeteria', 'u')).rejects.toThrow(/cafeteria.*no cached copy/i);
  });

  it('deduplicates concurrent fetches for the same key', async () => {
    const { fetcher, fetchText } = setup();
    await Promise.all([fetcher('k', 'u'), fetcher('k', 'u'), fetcher('k', 'u')]);
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('stale-while-revalidate: returns stale at once and refreshes in the background', async () => {
    const pending: Promise<unknown>[] = [];
    const { fetcher, fetchText, advance, store } = setup({
      waitUntil: (p: Promise<unknown>) => void pending.push(p),
    });
    fetchText.mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    await fetcher('k', 'u');
    advance(TTL + 1);
    expect(await fetcher('k', 'u')).toBe('v1');
    await Promise.all(pending);
    expect((await store.get('k'))?.value).toBe('v2');
  });

  it('stale-while-revalidate: a failing background refresh keeps the stale copy', async () => {
    const pending: Promise<unknown>[] = [];
    const { fetcher, fetchText, advance, store, warn } = setup({
      waitUntil: (p: Promise<unknown>) => void pending.push(p),
    });
    fetchText.mockResolvedValueOnce('v1').mockRejectedValueOnce(new Error('down'));
    await fetcher('k', 'u');
    advance(TTL + 1);
    expect(await fetcher('k', 'u')).toBe('v1');
    await Promise.all(pending);
    expect((await store.get('k'))?.value).toBe('v1');
    expect(warn).toHaveBeenCalled();
  });

  it('a cache store failure never breaks the request', async () => {
    const broken: CacheStore = {
      get: async () => {
        throw new Error('cache down');
      },
      set: async () => {
        throw new Error('cache down');
      },
    };
    const { fetcher } = setup({ store: broken });
    expect(await fetcher('k', 'u')).toBe('fresh');
  });
});

describe('createLayeredStore', () => {
  it('reads from the first layer that has the entry and backfills earlier layers', async () => {
    const a = createMemoryStore();
    const b = createMemoryStore();
    const entry: CacheEntry = { value: 'x', storedAt: 5 };
    await b.set('k', entry);
    const layered = createLayeredStore([a, b]);
    expect(await layered.get('k')).toEqual(entry);
    expect(await a.get('k')).toEqual(entry);
  });

  it('writes to every layer and tolerates a failing layer', async () => {
    const a = createMemoryStore();
    const bad: CacheStore = {
      get: async () => undefined,
      set: async () => {
        throw new Error('nope');
      },
    };
    const layered = createLayeredStore([bad, a]);
    await layered.set('k', { value: 'y', storedAt: 1 });
    expect((await a.get('k'))?.value).toBe('y');
  });
});

describe('createCacheApiStore', () => {
  function fakeCache(): CacheLike & { map: Map<string, Response> } {
    const map = new Map<string, Response>();
    return {
      map,
      match: async (req) => map.get(typeof req === 'string' ? req : req.url)?.clone(),
      put: async (req, res) => void map.set(typeof req === 'string' ? req : req.url, res),
    };
  }

  it('round-trips value and storedAt', async () => {
    const store = createCacheApiStore(fakeCache());
    await store.set('cafeteria', { value: 'a,b\n1,2', storedAt: 42 });
    expect(await store.get('cafeteria')).toEqual({ value: 'a,b\n1,2', storedAt: 42 });
  });

  it('returns undefined on a miss', async () => {
    expect(await createCacheApiStore(fakeCache()).get('nope')).toBeUndefined();
  });

  it('writes with a long retention so SWR can serve stale entries', async () => {
    const cache = fakeCache();
    await createCacheApiStore(cache).set('k', { value: 'v', storedAt: 1 });
    const stored = [...cache.map.values()][0];
    expect(stored.headers.get('cache-control')).toMatch(/max-age=\d{5,}/);
  });
});
