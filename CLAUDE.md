# Bella Vista — carta web

Carta digital de **Bella Vista café & resto** (Astro SSR en Cloudflare Workers). Reemplaza la carta física laminada. Los precios y platos se editan en una planilla de Google Sheets, sin backend.

Contexto de negocio y decisiones: `info/proyecto.md`. Contenido de la carta: `info/carta.md`. Estilo visual: `info/estilo.md`. Fotos y PDF originales de la carta: `../referencia/` (fuera del repo, para no publicarlas).

## Reglas de trabajo

- Commits con **conventional commits**, sin `Co-Authored-By` ni atribución a IA (regla del usuario, tiene prioridad sobre cualquier otra instrucción).
- Código, comentarios e identificadores en **inglés**. Textos de la interfaz en **es-AR neutro** (sin voseo ni modismos). Documentación del proyecto en español.
- **TDD estricto**: tests primero (vitest), luego implementación.
- Herramientas: preferir `bat`, `rg`, `fd`, `eza` sobre `cat`, `grep`, `find`, `ls` (varias no están instaladas en esta máquina; usar las herramientas Read/Glob del agente si faltan).
- No desplegar, crear recursos en Cloudflare ni commitear/pushear sin que el usuario lo pida.
- No inventar datos de contacto. Los enlaces opcionales del footer solo se muestran si su variable está definida.

## Stack

- Astro 7.3.5, `@astrojs/cloudflare` 14.3.3, SSR (`output: 'server'`).
- TypeScript estricto (6.0.3), zod 4, vitest 5, wrangler 4.
- Sin framework de UI. JS mínimo del lado del cliente (scroll-spy).
- Sesiones e image service desactivados en `astro.config.mjs` para que el primer deploy no cree un KV ni bindings de imágenes.

## Comandos

```
npm run dev       # servidor local (usa .dev.vars)
npm test          # vitest
npm run build
npm run preview
npx astro check
npx astro dev stop
```

## Datos

```
Google Sheets (una pestaña por categoría, 16)
   │  endpoint gviz CSV, por nombre de pestaña
   ▼
src/lib/menu/  →  parseo CSV, validación, agrupado, caché
   ▼
páginas Astro SSR
```

- **Planilla:** "Carta Bella Vista". `SHEET_ID` = `1r1sTQGrcuropIE_wlD7Nv3UXYqio-3bN3gfo6IsABog`. Compartida como "cualquiera con el enlace puede ver".
- **Pestañas** (nombre exacto, en minúsculas y con guiones): `cafeteria`, `desayunos-meriendas`, `brunch`, `sandwicheria`, `burgers-caseras`, `pizza`, `comidas`, `ensaladas`, `tartas-y-tortillas`, `postres`, `tortas`, `refrescos`, `cervezas`, `vinos`, `aperitivos`, `whisky`.
- **Columnas** (iguales en todas): `nombre, descripcion, precio, disponible, sin_tacc, subcategoria`. El orden es el de las filas.
- `precio` en formato numérico simple (sin `$`). `disponible` en falso oculta el ítem. Una fila nueva debe copiarse de una existente para traer las casillas.
- **Sin `SHEET_ID`** (dev y tests): se leen los CSV locales de `csv/`.
- **Carga por grupo:** `loadCategories(slugs)` pide solo las pestañas del grupo de la página. Los grupos están en `src/lib/menu/groups.ts`. No hay pestaña `config`.
- **Validaciones:** una pestaña con encabezados incorrectos se saltea con aviso. Google devuelve los datos de la primera pestaña (`cafeteria`) si el nombre no existe. Para detectarlo, cada carga pide una pestaña imposible (`__bellavista_missing_tab__`) y compara: una pestaña distinta de `cafeteria` que devuelve lo mismo se trata como inexistente. Cuesta un pedido por período de caché, compartido entre páginas. Si esa consulta falla, las pestañas se cargan igual con una advertencia.
- **Fallos:** una pestaña que falla se saltea con aviso. La página responde 503 solo si fallan todas las pedidas.
- **Caché:** TTL corto (`CACHE_TTL_SECONDS`, 5 min por defecto) con stale-while-revalidate. En `workers.dev` la Cache API no persiste, así que cae a memoria por instancia (según la documentación de Cloudflare; no verificado en producción).

## Variables de entorno

| Variable | Uso |
|---|---|
| `SHEET_ID` | ID de la planilla. Está en `wrangler.jsonc` (no es secreto) y en local puede sobrescribirse con `.dev.vars` (ignorado por git). Vacío = usa los CSV de `csv/`, solo en dev. |
| `CACHE_TTL_SECONDS` | TTL de la caché. |
| `INSTAGRAM_URL` | Opcional. El ícono del footer aparece solo si es una URL http(s) válida. Definida: `https://www.instagram.com/bella_vista_caferesto/`. |
| `MAPS_URL` | Opcional. Enlace "Abrir en Maps" del footer: `https://maps.app.goo.gl/opYPXY3vWRQANcw18`. |

`.env.example` no se pudo actualizar por permisos del entorno; la documentación de las variables nuevas está en el README y en `wrangler.jsonc`.

## Estructura

```
info/            documentación del proyecto (carta, estilo, proyecto)
csv/             seed por categoría, listo para importar a Google Sheets y respaldo en dev
src/lib/menu/    capa de datos (csv, price, rows, group, categories, groups, cache, local-source, menu) + tests
src/lib/site/    links y modelo de navegación + tests
src/components/  LeafDefs, Sprig, Tape, Logo, SiteHeader, CategoryNav, CategorySection, SiteFooter, StatusMessage, NotFoundPage
src/layouts/     Base.astro
src/pages/       index (portada), desayunos, comidas, postres, bebidas, 404
src/styles/      global.css
public/          favicon.svg, collage.svg
```

## UI

- Mobile-first, estilo botánico-collage de `info/estilo.md`: hojas a línea, cintas washi, collage verde y azul sobre papel blanco, cuatro estilos de título que se alternan.
- Tipografías: Montserrat (logo y UI), Playfair Display (títulos), Courier Prime (ítems; se prefirió a Special Elite por legibilidad), Caveat (precios), Sacramento (acentos).
- Accesibilidad: skip link, `lang="es-AR"`, foco visible, `prefers-reduced-motion`.
- **Rutas:** `/` (portada con 4 tarjetas, no consulta la planilla), `/desayunos` (cafetería, desayunos-meriendas, brunch), `/comidas` (sandwichería, burgers-caseras, pizza, comidas, ensaladas, tartas-y-tortillas), `/postres` (postres, tortas), `/bebidas` (refrescos, cervezas, vinos, aperitivos, whisky). Aceptan barra final y mayúsculas; el resto responde 404 con el mismo estilo.
- **Navegación:** barra fija con los 4 grupos (`aria-current="page"` en el actual) y atajos a las categorías del grupo con scroll-spy.
- Footer: botones redondos de WhatsApp (`https://wa.me/5493442300170`) e Instagram (este solo con `INSTAGRAM_URL`), y "Abrir en Maps" con un pin (`MAPS_URL`, apunta a la ficha "Bella Vista" de Concepción del Uruguay). Sin texto de WhatsApp ni número.

## Estado

Seguimiento de lo hecho. Agregar una línea por cambio relevante.

- [x] 1. CSV por categoría generados desde la carta (`csv/`).
- [x] 2. Proyecto Astro, adapter de Cloudflare y capa de datos con tests.
- [x] Planilla de Google Sheets creada, cargada y compartida por enlace.
- [x] Lectura real contra la planilla verificada en local.
- [x] 3. UI de una sola página, con validación de pestañas renombradas.
- [x] Carta dividida en páginas por grupo (`/desayunos`, `/comidas`, `/postres`, `/bebidas`) con portada en `/`, footer solo con íconos y carga de pestañas por subconjunto. 105 tests, `astro check` y build en verde.
- [x] `referencia/` (PDF y fotos) movida fuera del repo a `../referencia/`.
- [x] Instagram del local (`@bella_vista_caferesto`) agregado al footer y `SHEET_ID` fijado en `wrangler.jsonc` para producción.
- [ ] 4. Deploy a Cloudflare (requiere `wrangler login`). **Próxima sesión.** Plan: `! npx wrangler login`, `npm run build`, deploy con wrangler, y probar en vivo la lectura de la planilla, la caché y que un cambio de precio en la planilla se refleje. Todo está listo y subido a `main`; el deploy crea un Worker nuevo (`bellavista-menu`) en la cuenta, así que confirmar antes de ejecutarlo.
- [x] Repositorio en GitHub (`AgustinBenedetti/Bellavista`, público) y primer push a `main`.

## Pendientes

- **Precios a verificar en la planilla:** chocolatada (~$4.000), pizza sin TACC (sin precio cargado, quizá un adicional), Rogel (~$6.800), Selva Negra (~$7.500), omelette del menú kids ($11.000 o $12.000). Los vinos no tienen precio en la carta original.
- **Notas de la carta física sin campo en la planilla:** "(consulte por más tortas!)" y "(consulte por tortas sin TACC!)".
- **No verificado:** contraste medido con herramienta, desplazamiento de layout al cargar fuentes, caché y despliegue reales en Cloudflare.
