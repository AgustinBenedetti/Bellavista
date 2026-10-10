/** A single dish or drink, as read from one row of a category tab. */
export interface MenuItem {
  name: string;
  description: string;
  /** Whole pesos. `null` when the sheet leaves the price blank (e.g. wines). */
  price: number | null;
  available: boolean;
  glutenFree: boolean;
  /** Empty string when the row has no subcategory. */
  subcategory: string;
}

/** Items sharing a subcategory. `title` is empty for items without one. */
export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export interface MenuCategory {
  /** Tab name in the sheet (also used as URL anchor). */
  slug: string;
  title: string;
  sections: MenuSection[];
  itemCount: number;
}

/** Declares a category: which tab to read and how to display it. */
export interface CategoryDef {
  tab: string;
  title: string;
}
