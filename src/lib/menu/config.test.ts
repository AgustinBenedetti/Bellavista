import { describe, expect, it } from 'vitest';
import { DEFAULT_TTL_SECONDS, parseTtlSeconds } from './config';

describe('parseTtlSeconds', () => {
  it('uses the default (5 minutes) when unset or blank', () => {
    expect(DEFAULT_TTL_SECONDS).toBe(300);
    expect(parseTtlSeconds(undefined)).toBe(300);
    expect(parseTtlSeconds('')).toBe(300);
  });

  it('parses a non-negative integer', () => {
    expect(parseTtlSeconds('60')).toBe(60);
    expect(parseTtlSeconds('0')).toBe(0);
  });

  it('falls back to the default on garbage', () => {
    expect(parseTtlSeconds('abc')).toBe(300);
    expect(parseTtlSeconds('-5')).toBe(300);
    expect(parseTtlSeconds('1.5')).toBe(300);
  });
});
