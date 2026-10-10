export interface CacheEntry {
  value: string;
  /** Epoch milliseconds when the value was fetched. */
  storedAt: number;
}

/** Tiny storage interface so the caching policy is testable without Workers. */
export interface CacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
}

/** The subset of the Workers Cache API we use. */
export interface CacheLike {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

export function createMemoryStore(): CacheStore {
  const map = new Map<string, CacheEntry>();
  return {
    get: async (key) => map.get(key),
    set: async (key, entry) => void map.set(key, entry),
  };
}

/** Per-isolate memory. Survives between requests while the isolate stays warm. */
export const sharedMemoryStore: CacheStore = createMemoryStore();

const CACHE_URL_PREFIX = 'https://bellavista-menu.invalid/cache/';
/** Long retention: freshness is decided by `storedAt`, not by the Cache API TTL. */
const CACHE_API_RETENTION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Store backed by the Workers Cache API. Entries are retained for a week so a
 * stale copy is still around when Google is down. Note: the Cache API only
 * works on custom domains, so on *.workers.dev this layer is a silent no-op.
 */
export function createCacheApiStore(cache: CacheLike): CacheStore {
  return {
    async get(key) {
      const res = await cache.match(CACHE_URL_PREFIX + encodeURIComponent(key));
      if (!res) return undefined;
      const storedAt = Number(res.headers.get('x-stored-at'));
      if (!Number.isFinite(storedAt)) return undefined;
      return { value: await res.text(), storedAt };
    },
    async set(key, entry) {
      await cache.put(
        CACHE_URL_PREFIX + encodeURIComponent(key),
        new Response(entry.value, {
          headers: {
            'cache-control': `public, max-age=${CACHE_API_RETENTION_SECONDS}`,
            'x-stored-at': String(entry.storedAt),
          },
        }),
      );
    },
  };
}

/** Reads layers in order (backfilling the faster ones), writes to all; layer errors are ignored. */
export function createLayeredStore(layers: CacheStore[]): CacheStore {
  return {
    async get(key) {
      for (let i = 0; i < layers.length; i++) {
        let entry: CacheEntry | undefined;
        try {
          entry = await layers[i].get(key);
        } catch {
          continue;
        }
        if (entry) {
          await Promise.all(layers.slice(0, i).map((l) => l.set(key, entry!).catch(() => {})));
          return entry;
        }
      }
      return undefined;
    },
    async set(key, entry) {
      await Promise.all(layers.map((l) => l.set(key, entry).catch(() => {})));
    },
  };
}

/** Default store: warm-isolate memory plus the Cache API when the runtime exposes it. */
export function createDefaultStore(): CacheStore {
  const workersCache = (globalThis as { caches?: { default?: CacheLike } }).caches?.default;
  return workersCache
    ? createLayeredStore([sharedMemoryStore, createCacheApiStore(workersCache)])
    : sharedMemoryStore;
}

export interface CachedFetcherOptions {
  store: CacheStore;
  fetchText: (url: string) => Promise<string>;
  ttlMs: number;
  now?: () => number;
  warn?: (message: string) => void;
  /** When given, stale entries are returned at once and refreshed in the background. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Cache policy:
 * - fresh entry (< ttl): served as is;
 * - stale entry: served immediately and revalidated in the background when
 *   `waitUntil` exists, otherwise refreshed inline; if the refresh fails the
 *   stale copy is served;
 * - no entry: fetched inline; failure throws a clear error.
 * Concurrent refreshes of the same key are deduplicated.
 */
export function createCachedFetcher(options: CachedFetcherOptions) {
  const { store, fetchText, ttlMs, now = Date.now, warn = console.warn, waitUntil } = options;
  const inflight = new Map<string, Promise<string>>();

  const refresh = (key: string, url: string): Promise<string> => {
    const existing = inflight.get(key);
    if (existing) return existing;
    const promise = (async () => {
      const value = await fetchText(url);
      try {
        await store.set(key, { value, storedAt: now() });
      } catch (e) {
        warn(`[menu:cache] could not store "${key}": ${errorMessage(e)}`);
      }
      return value;
    })().finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  };

  const readEntry = async (key: string): Promise<CacheEntry | undefined> => {
    try {
      return await store.get(key);
    } catch (e) {
      warn(`[menu:cache] could not read "${key}": ${errorMessage(e)}`);
      return undefined;
    }
  };

  return async function fetchCached(key: string, url: string): Promise<string> {
    const entry = await readEntry(key);
    if (entry && now() - entry.storedAt < ttlMs) return entry.value;

    if (entry) {
      const background = () =>
        refresh(key, url).catch((e) => {
          warn(`[menu:cache] refresh of "${key}" failed, serving stale copy: ${errorMessage(e)}`);
          return entry.value;
        });
      if (waitUntil) {
        waitUntil(background());
        return entry.value;
      }
      return background();
    }

    try {
      return await refresh(key, url);
    } catch (e) {
      throw new Error(
        `Could not load "${key}" from Google Sheets and there is no cached copy: ${errorMessage(e)}`,
        { cause: e },
      );
    }
  };
}
