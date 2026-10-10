export const WHATSAPP_URL = 'https://wa.me/5493442300170';

export interface FooterLink {
  id: 'whatsapp' | 'instagram' | 'location';
  /** Accessible name of the link (the WhatsApp and Instagram buttons are icon-only). */
  label: string;
  href: string;
}

/** Returns a trimmed http(s) URL, or null for blank/invalid values (so no dead link is ever rendered). */
export function parseOptionalUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

export interface FooterLinkInput {
  instagramUrl?: string;
  mapsUrl?: string;
}

/** WhatsApp is always present; Instagram and location appear only when configured. */
export function buildFooterLinks({ instagramUrl, mapsUrl }: FooterLinkInput): FooterLink[] {
  const links: FooterLink[] = [{ id: 'whatsapp', label: 'Escríbenos por WhatsApp', href: WHATSAPP_URL }];
  const instagram = parseOptionalUrl(instagramUrl);
  if (instagram) links.push({ id: 'instagram', label: 'Síguenos en Instagram', href: instagram });
  const maps = parseOptionalUrl(mapsUrl);
  if (maps) links.push({ id: 'location', label: 'Abrir en Maps', href: maps });
  return links;
}
