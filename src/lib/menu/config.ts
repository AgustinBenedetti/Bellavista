export const DEFAULT_TTL_SECONDS = 300;

/** Parses CACHE_TTL_SECONDS; anything that is not a non-negative integer yields the default. */
export function parseTtlSeconds(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return DEFAULT_TTL_SECONDS;
  return Number(raw.trim());
}
