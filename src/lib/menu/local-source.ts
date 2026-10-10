/**
 * Dev/test-only source: the seed CSVs bundled with the repo. Uses Vite's raw
 * glob import (no Node `fs`), so it also works inside the workerd dev runtime.
 * It is only imported behind `import.meta.env.DEV`, so production builds drop it.
 */
const files = import.meta.glob('/csv/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function readLocalCsv(tab: string): string {
  return files[`/csv/${tab}.csv`] ?? '';
}
