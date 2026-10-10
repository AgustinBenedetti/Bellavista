import { describe, expect, it } from 'vitest';
import { WHATSAPP_URL, buildFooterLinks, parseOptionalUrl } from './links';

describe('parseOptionalUrl', () => {
  it('returns null for undefined, blank and whitespace-only values', () => {
    expect(parseOptionalUrl(undefined)).toBeNull();
    expect(parseOptionalUrl('')).toBeNull();
    expect(parseOptionalUrl('   ')).toBeNull();
  });

  it('accepts http and https URLs and trims them', () => {
    expect(parseOptionalUrl(' https://instagram.com/bellavista ')).toBe('https://instagram.com/bellavista');
    expect(parseOptionalUrl('http://example.com/x')).toBe('http://example.com/x');
  });

  it('rejects malformed URLs and non-http schemes', () => {
    expect(parseOptionalUrl('instagram.com/bellavista')).toBeNull();
    expect(parseOptionalUrl('javascript:alert(1)')).toBeNull();
    expect(parseOptionalUrl('data:text/html,hi')).toBeNull();
    expect(parseOptionalUrl('not a url')).toBeNull();
  });
});

describe('WhatsApp constant', () => {
  it('points at the venue number through wa.me', () => {
    expect(WHATSAPP_URL).toBe('https://wa.me/5493442300170');
  });
});

describe('buildFooterLinks', () => {
  it('always includes WhatsApp, first, with an accessible name and no phone number text', () => {
    const links = buildFooterLinks({});
    expect(links).toEqual([{ id: 'whatsapp', label: 'Escríbenos por WhatsApp', href: WHATSAPP_URL }]);
    expect(links.every((l) => !/\d/.test(l.label))).toBe(true);
  });

  it('adds Instagram and location only when their URLs are valid', () => {
    const links = buildFooterLinks({
      instagramUrl: 'https://instagram.com/bellavista',
      mapsUrl: 'https://maps.app.goo.gl/abc',
    });
    expect(links.map((l) => l.id)).toEqual(['whatsapp', 'instagram', 'location']);
    expect(links[1]).toMatchObject({ label: 'Síguenos en Instagram', href: 'https://instagram.com/bellavista' });
    expect(links[2]).toMatchObject({ label: 'Abrir en Maps', href: 'https://maps.app.goo.gl/abc' });
  });

  it('never renders a dead link for blank or invalid values', () => {
    const links = buildFooterLinks({ instagramUrl: '', mapsUrl: 'javascript:void(0)' });
    expect(links.map((l) => l.id)).toEqual(['whatsapp']);
  });

  it('shows the location without Instagram while no handle is configured', () => {
    const links = buildFooterLinks({ instagramUrl: '', mapsUrl: 'https://maps.app.goo.gl/abc' });
    expect(links.map((l) => l.id)).toEqual(['whatsapp', 'location']);
  });
});
