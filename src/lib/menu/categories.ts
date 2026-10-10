import type { CategoryDef } from './types';

/**
 * Built-in category list, in menu order. The sheet tab name is the file name of
 * the matching `csv/` seed file. A `config` tab in the sheet overrides this list.
 */
export const CATEGORIES: readonly CategoryDef[] = [
  { tab: 'cafeteria', title: 'Cafetería' },
  { tab: 'desayunos-meriendas', title: 'Desayunos y meriendas' },
  { tab: 'brunch', title: 'Brunch' },
  { tab: 'sandwicheria', title: 'Sandwichería' },
  { tab: 'burgers-caseras', title: 'Burgers caseras' },
  { tab: 'pizza', title: 'Pizza' },
  { tab: 'comidas', title: 'Comidas' },
  { tab: 'ensaladas', title: 'Ensaladas' },
  { tab: 'tartas-y-tortillas', title: 'Tartas y tortillas' },
  { tab: 'postres', title: 'Postres' },
  { tab: 'tortas', title: 'Tortas' },
  { tab: 'refrescos', title: 'Refrescos' },
  { tab: 'cervezas', title: 'Cervezas' },
  { tab: 'vinos', title: 'Vinos' },
  { tab: 'aperitivos', title: 'Aperitivos' },
  { tab: 'whisky', title: 'Whisky' },
];
