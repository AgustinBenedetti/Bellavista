/** One page of the menu: a set of categories that share a URL (`/<slug>`). */
export interface GroupDef {
  slug: string;
  /** Page title (h1 and <title>). */
  title: string;
  /** Short label for the top nav, where space is tight. */
  navLabel: string;
  /** Script-font line shown on the landing card and under the page title. */
  tagline: string;
  /** Meta description of the page. */
  description: string;
  /** Category tabs shown on the page, in order. Every tab belongs to exactly one group. */
  categories: readonly string[];
}

export const GROUPS: readonly GroupDef[] = [
  {
    slug: 'desayunos',
    title: 'Desayunos y café',
    navLabel: 'Desayunos',
    tagline: 'cafetería, desayunos y brunch',
    description: 'Cafetería, desayunos, meriendas y brunch de Bella Vista café & resto.',
    categories: ['cafeteria', 'desayunos-meriendas', 'brunch'],
  },
  {
    slug: 'comidas',
    title: 'Comidas',
    navLabel: 'Comidas',
    tagline: 'sándwiches, burgers, pizzas y más',
    description: 'Sandwichería, burgers caseras, pizzas, milanesas, pastas, ensaladas y tartas de Bella Vista café & resto.',
    categories: ['sandwicheria', 'burgers-caseras', 'pizza', 'comidas', 'ensaladas', 'tartas-y-tortillas'],
  },
  {
    slug: 'postres',
    title: 'Postres y tortas',
    navLabel: 'Postres',
    tagline: 'helados, tortas y algo dulce',
    description: 'Postres, copas heladas y tortas de Bella Vista café & resto.',
    categories: ['postres', 'tortas'],
  },
  {
    slug: 'bebidas',
    title: 'Bebidas',
    navLabel: 'Bebidas',
    tagline: 'refrescos, cervezas, vinos y tragos',
    description: 'Refrescos, cervezas, vinos, aperitivos y whisky de Bella Vista café & resto.',
    categories: ['refrescos', 'cervezas', 'vinos', 'aperitivos', 'whisky'],
  },
];

export function getGroup(slug: string): GroupDef | undefined {
  return GROUPS.find((group) => group.slug === slug);
}

/**
 * Maps the `[group]` route param to a group. Case, surrounding spaces and
 * surrounding slashes are ignored, so `/bebidas`, `/Bebidas` and `/bebidas/` all
 * resolve. Returns null for anything else, which the page renders as a 404.
 */
export function resolveGroup(param: string | undefined): GroupDef | null {
  const slug = param?.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!slug) return null;
  return getGroup(slug) ?? null;
}
