import type { MenuItem, MenuSection } from './types';

/** Groups items by subcategory, keeping first-appearance order of sections and items. */
export function groupBySubcategory(items: MenuItem[]): MenuSection[] {
  const sections = new Map<string, MenuSection>();
  for (const item of items) {
    let section = sections.get(item.subcategory);
    if (!section) {
      section = { title: item.subcategory, items: [] };
      sections.set(item.subcategory, section);
    }
    section.items.push(item);
  }
  return [...sections.values()];
}
