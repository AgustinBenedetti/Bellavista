# Bella Vista — carta web

Carta digital de **Bella Vista café & resto**, hecha con Astro (SSR) para Cloudflare Workers.
Los platos y precios se leen desde Google Sheets: no hay backend ni panel de administración.

Contexto, decisiones y plan del proyecto: [`info/proyecto.md`](info/proyecto.md).

## Cómo funciona

```
Google Sheets (una pestaña por categoría)
        │  CSV (endpoint gviz, por nombre de pestaña)
        ▼
src/lib/menu  → parseo + validación + caché
        ▼
src/pages/[group].astro (SSR en Cloudflare Workers)
```

Estado actual: la capa de datos y la interfaz están listas, con la carta dividida en cuatro páginas. Falta el deploy (paso 4).

## Páginas

Cada página carga solo las pestañas de su sección (más una consulta de control, ver "Validación de pestañas"). La portada no consulta Google Sheets.

| Ruta | Contenido (pestañas) |
|---|---|
| `/` | Portada con cuatro tarjetas. No lee la planilla. |
| `/desayunos` | `cafeteria`, `desayunos-meriendas`, `brunch` |
| `/comidas` | `sandwicheria`, `burgers-caseras`, `pizza`, `comidas`, `ensaladas`, `tartas-y-tortillas` |
| `/postres` | `postres`, `tortas` |
| `/bebidas` | `refrescos`, `cervezas`, `vinos`, `aperitivos`, `whisky` |

- Funcionan con y sin barra final (`/bebidas` y `/bebidas/`) y sin distinguir mayúsculas.
- Cualquier otra ruta responde 404 con una página amable.
- Los grupos se definen en `src/lib/menu/groups.ts`. Cada pestaña pertenece a un único grupo (hay un test que lo comprueba).
- Arriba hay una barra con las cuatro secciones (la actual lleva `aria-current="page"`) y, debajo, atajos a las categorías de la página.

Estilo visual: ver [`info/estilo.md`](info/estilo.md). Los colores y tipografías están como variables CSS en `src/styles/global.css`.

## Configurar la planilla de Google Sheets

1. Creá una planilla e importá los archivos de `csv/` (Archivo → Importar → Insertar hoja nueva), **una pestaña por archivo**.
2. El **nombre de cada pestaña es el nombre del archivo, sin `.csv`**: `cafeteria`, `desayunos-meriendas`, `brunch`, `sandwicheria`, `burgers-caseras`, `pizza`, `comidas`, `ensaladas`, `tartas-y-tortillas`, `postres`, `tortas`, `refrescos`, `cervezas`, `vinos`, `aperitivos`, `whisky`.
3. Compartí la planilla como **"Cualquier persona con el enlace puede ver"** (Compartir → Acceso general).
4. Copiá el id de la planilla (lo que está entre `/d/` y `/edit` en la URL) y ponelo en `SHEET_ID`.

### Columnas de cada pestaña

| Columna | Descripción |
|---|---|
| `nombre` | Obligatoria. |
| `descripcion` | Opcional. |
| `precio` | Número entero en pesos (`14000`). Vacío = sin precio (se muestra sin importe). |
| `disponible` | Tilde. Apagado = el ítem se oculta. Vacío = disponible. |
| `sin_tacc` | Tilde. Vacío = no. |
| `subcategoria` | Opcional. Agrupa ítems dentro de la pestaña. |

- El orden es el de las filas.
- Una fila inválida (sin nombre, precio con texto, etc.) **se omite y se registra una advertencia**; nunca rompe la carta.
- Si Google no responde, se sirve la última copia en caché. Si no hay ninguna, la página responde 503 con un mensaje amable.
- **Validación de pestañas:** una pestaña se omite (con una advertencia en los logs) si su fila de encabezado no tiene las seis columnas esperadas. Google responde con los datos de la **primera pestaña** cuando se pide una que no existe. Para detectarlo en cualquier página, cada carga pide también una pestaña imposible (`__bellavista_missing_tab__`), que devuelve justamente esa respuesta de reemplazo. Si una pestaña (que no es `cafeteria`, la primera) devuelve exactamente lo mismo, se omite. Así, renombrar una pestaña por error oculta esa categoría en vez de mostrar datos de otra. Esa consulta de control también se cachea, así que cuesta un pedido por cada período de caché, compartido entre todas las páginas.
- Si falla una pestaña, la página se muestra sin ella. Solo responde 503 cuando fallan todas las pestañas de esa sección.
- **Las categorías y los grupos están en el código** (`src/lib/menu/categories.ts` y `groups.ts`). Ya no existe la pestaña opcional `config`. Para sumar o mover una categoría, hay que cambiar el código.

## Desarrollo local

Requiere Node 22.12 o superior.

```bash
npm install
npm run dev        # http://localhost:4321
```

- **Sin `SHEET_ID`** (por defecto), la página lee los archivos de `csv/`. Solo funciona en desarrollo.
- **Con Google Sheets:** copiá `.env.example` a `.dev.vars` y completá `SHEET_ID`. Cloudflare lee `.dev.vars`, no `.env`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (corre sobre workerd). |
| `npm test` | Tests (Vitest). |
| `npm run check` | Chequeo de tipos de Astro/TypeScript. |
| `npm run build` | Compila para Cloudflare Workers en `dist/`. |
| `npm run preview` | Sirve el build localmente. |
| `npm run cf-typegen` | Regenera `worker-configuration.d.ts` tras cambiar `wrangler.jsonc`. |

## Variables

| Variable | Descripción | Por defecto |
|---|---|---|
| `SHEET_ID` | Id de la planilla de Google Sheets. | vacío (usa `csv/` en dev) |
| `CACHE_TTL_SECONDS` | Segundos que una pestaña se sirve desde caché antes de refrescarse. | `300` |
| `INSTAGRAM_URL` | URL completa (`https://…`) del Instagram del local. Si está vacía o no es una URL http(s) válida, no se muestra el enlace. | vacío |
| `MAPS_URL` | URL completa de Google Maps con la ubicación. Misma regla que `INSTAGRAM_URL`. | enlace de Maps de Bella Vista (ya cargado en `wrangler.jsonc`) |

El pie de página muestra botones redondos solo con ícono (WhatsApp, y también Instagram cuando `INSTAGRAM_URL` tiene un valor) y el enlace "Abrir en Maps". No muestra el número como texto. El WhatsApp está fijo en `src/lib/site/links.ts`.

En producción se definen en `vars` de `wrangler.jsonc` (no son secretos: la planilla solo necesita ser visible con el enlace).

## Caché

Cada pestaña (y la consulta de control) se cachea `CACHE_TTL_SECONDS`. Pasado ese tiempo se sirve la copia vieja al instante y se actualiza en segundo plano (stale-while-revalidate). Si Google falla, se mantiene la última copia.

> **Importante:** la caché persistente usa la Cache API de Cloudflare, que **solo funciona en dominios propios**, no en `*.workers.dev`. En `workers.dev` la caché queda en la memoria de cada instancia del Worker (se pierde cuando la instancia se recicla). Para esta carta alcanza, pero hay más pedidos a Google.
