import type { GroupDef, MenuCategory } from '../menu';

export interface NavEntry {
  /** Valid HTML id, shared by the nav link and the section it points to. */
  id: string;
  label: string;
  href: string;
}

const toAnchorId = (slug: string) =>
  slug
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** One nav entry per category, in menu order. */
export function buildNav(menu: readonly MenuCategory[]): NavEntry[] {
  return menu.map((category) => {
    const id = toAnchorId(category.slug);
    return { id, label: category.title, href: `#${id}` };
  });
}

export interface GroupNavEntry {
  slug: string;
  label: string;
  /** Clean URL of the group page. */
  href: string;
  /** True for the page being viewed. */
  current: boolean;
}

/** Top navigation: one entry per group page. `currentSlug` is undefined on the landing and the 404. */
export function buildGroupNav(groups: readonly GroupDef[], currentSlug: string | undefined): GroupNavEntry[] {
  return groups.map((group) => ({
    slug: group.slug,
    label: group.navLabel,
    href: `/${group.slug}`,
    current: group.slug === currentSlug,
  }));
}
