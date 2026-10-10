# Proyecto — Carta web Bella Vista

Aplicación web que reemplaza la carta física (laminada, con precios escritos a mano) de **Bella Vista café & resto**. Se accede desde el celular (por ejemplo con un código QR) y los precios y platos se editan desde Google Sheets.

- **WhatsApp del local:** 3442 300170

## Archivos del proyecto

| Archivo | Contenido |
|---|---|
| `../referencia/Carta-bellavista.pdf` | Carta original (4 páginas, imagen con precios manuscritos). Fuera del repo. |
| `../referencia/IMG_2045–2048.JPG` | Fotos de la carta física. Son más nítidas que el PDF y sirvieron para corregir precios. Fuera del repo. |
| `carta.md` | Transcripción completa de la carta, con precios. |
| `estilo.md` | Estilo visual: paleta, tipografías y elementos gráficos. |
| `proyecto.md` | Este archivo: decisiones, arquitectura y plan. |

## Objetivo

1. Que los clientes vean la carta en el celular, rápido y con la identidad visual del local.
2. Que el dueño o el personal editen precios, agreguen o saquen platos **sin tocar código** y sin un backend con ABMC.

## Decisiones tomadas

| Tema | Decisión | Motivo |
|---|---|---|
| Framework | **Astro** | Contenido casi estático, mobile-first, carga rápida. |
| Fuente de datos | **Google Sheets** como "base de datos" | El cliente edita precios y platos fácilmente, sin backend. |
| Organización de la planilla | **Una pestaña por categoría** | Es más cómodo para el cliente. Se resuelve en el código. |
| Hosting | **Cloudflare** (Workers), con el dominio que da Cloudflare | Cuenta propia con otros dos proyectos. Sin dominio propio por ahora. |
| Renderizado | **SSR con caché corta** | Los cambios aparecen solos y no consumen builds. |
| Páginas | **Cuatro páginas por grupo** (`/desayunos`, `/comidas`, `/postres`, `/bebidas`) más una portada | Cada página carga solo su sección. Una barra de 16 enlaces no se usa bien en el celular. |

### Verificado en la documentación de Cloudflare

- Plan gratis: hasta **100 Workers** y **100 proyectos de Pages** por cuenta. Tener otros dos proyectos no es problema.
- Plan gratis de Workers: **100.000 requests por día**.
- Pages gratis: **500 builds por mes**. Por eso se prefiere SSR con caché sobre rebuild en cada edición de la planilla.

Fuentes: <https://developers.cloudflare.com/workers/platform/limits/> y <https://developers.cloudflare.com/pages/platform/limits/>

## Arquitectura

```
Google Sheets (una pestaña por categoría)
        │  CSV (endpoint gviz, por nombre de pestaña)
        ▼
Astro SSR en Cloudflare Workers
        │  parseo + validación + caché de unos minutos
        ▼
Carta web (mobile-first)
```

- La planilla se comparte como "cualquiera con el enlace puede ver". Se lee cada pestaña **por nombre**, sin publicar cada una por separado. Verificado contra la planilla real.
- Las categorías y los grupos están en una lista del código (`src/lib/menu/categories.ts` y `groups.ts`). Se quitó la pestaña opcional `config`.
- Si Google falla, se sirve la última versión cacheada.
- Cada página consulta solo las pestañas de su grupo, más una consulta de control para detectar pestañas renombradas (Google devuelve la primera pestaña cuando se pide una que no existe). La portada no consulta la planilla.

## Páginas

| Ruta | Pestañas |
|---|---|
| `/` | Portada con cuatro tarjetas. Sin consultas a la planilla. |
| `/desayunos` (Desayunos y café) | cafeteria, desayunos-meriendas, brunch |
| `/comidas` | sandwicheria, burgers-caseras, pizza, comidas, ensaladas, tartas-y-tortillas |
| `/postres` (Postres y tortas) | postres, tortas |
| `/bebidas` | refrescos, cervezas, vinos, aperitivos, whisky |

Cualquier otra ruta responde 404. Las rutas aceptan barra final y no distinguen mayúsculas.

## Planilla creada

- **Nombre:** Carta Bella Vista (en el Drive de la cuenta del proyecto).
- **ID (`SHEET_ID`):** `1r1sTQGrcuropIE_wlD7Nv3UXYqio-3bN3gfo6IsABog`
- **Pestañas:** 16, con el nombre en minúsculas y con guiones, igual que los archivos de `csv/` (`cafeteria`, `desayunos-meriendas`, `burgers-caseras`, etc.). El código las lee por ese nombre exacto.
- **Formato:** encabezado fijo y en negrita, y casillas en `disponible` y `sin_tacc` en las filas cargadas.
- **Acceso:** abierto como "cualquiera con el enlace puede ver" (verificado leyendo las pestañas desde la app).
- **Precio:** dejar la columna en formato numérico simple, sin símbolo `$`. La web agrega el formato.
- **Filas nuevas:** copiar una fila existente para que traiga las casillas. Una fila sin tilde en `disponible` no se muestra.

## Estructura de cada pestaña

Igual en todas las pestañas:

| Columna | Descripción |
|---|---|
| `nombre` | Nombre del plato o bebida. |
| `descripcion` | Ingredientes o detalle (opcional). |
| `precio` | Número en pesos. |
| `disponible` | Tilde. Si está apagado, el ítem se oculta sin borrar la fila. |
| `sin_tacc` | Tilde. Muestra el sello "Sin TACC". |
| `subcategoria` | Opcional. Agrupa dentro de la pestaña (por ejemplo, sándwiches fríos y calientes, cervezas en botella y en lata). |

El **orden** es el de las filas de la planilla.

## Categorías (pestañas)

Según `carta.md`:

1. Cafetería
2. Desayunos / Meriendas
3. Brunch
4. Sandwichería (subcategorías: tostados, fríos, calientes)
5. Burgers (incluye "Para acompañar")
6. Pizza
7. Comidas (milanesas y supremas, pastas, salsas, menú kids)
8. Ensaladas
9. Tartas y tortillas
10. Postres
11. Tortas
12. Refrescos
13. Cervezas (subcategorías: botella, lata)
14. Vinos
15. Aperitivos
16. Whisky

## Estilo visual

Detalle completo en `estilo.md`. Resumen:

- Estilo botánico-collage, artesanal y cálido.
- Paleta: papel blanco, carbón, verde salvia y bosque, azul periwinkle y azul cinta.
- Elementos: hojas dibujadas a línea, cintas washi, manchas orgánicas, logo circular.
- Tipografías usadas en la web (5 familias, Google Fonts): Montserrat (logo y navegación), Playfair Display (títulos), Courier Prime (platos y descripciones), Caveat (precios manuscritos) y Sacramento (acentos script). Se eligió Courier Prime en lugar de Special Elite porque se lee mejor en descripciones largas.
- Los colores y tipografías están como variables CSS en `src/styles/global.css`.

## Pendientes de verificar (precios dudosos)

Estos precios no se leen del todo en las fotos. Van en la planilla con la mejor lectura y se corrigen directo ahí:

- Chocolatada (~$4.000)
- Pizza sin TACC (~$1.300, quizá un adicional)
- Rogel (~$6.800) y Selva Negra (~$7.500)
- Omelette del menú kids ($11.000 o $12.000)
- Vinos: la carta no tiene precios.

## Plan

1. **CSVs por categoría** generados desde `carta.md` con la estructura de arriba, listos para importar a Google Sheets.
2. **Proyecto Astro** con el adapter de Cloudflare y la capa de datos: lectura de cada pestaña, parseo del CSV, validación de filas y caché.
3. **UI** con el estilo de `estilo.md`: mobile-first, sello sin TACC. **Hecho.** Incluye la validación de pestañas (encabezado esperado y detección de pestañas inexistentes) y la división en cuatro páginas por grupo con portada.
4. **Deploy** a Cloudflare. Pendiente.

## Footer

Va en todas las páginas, con tres elementos:

- **WhatsApp:** botón redondo solo con ícono, que abre `wa.me` con el número del local. No muestra la palabra ni el número como texto.
- **Instagram:** botón redondo con el mismo estilo que el de WhatsApp. El local todavía no tiene cuenta, así que el ícono no aparece hasta que se defina la variable `INSTAGRAM_URL`.
- **Ubicación:** ícono de pin y el texto "Abrir en Maps". Usa `MAPS_URL`, ya cargada con el enlace de Google Maps del local (`https://maps.app.goo.gl/opYPXY3vWRQANcw18`, que lleva a la ficha "Bella Vista" en Concepción del Uruguay).

Nunca se muestra un enlace vacío o inválido. No habrá botón flotante de WhatsApp ni de pedido.

## Decisiones cerradas

- **Dominio:** el que da Cloudflare (`*.workers.dev` o `*.pages.dev`). Sin dominio propio por ahora.
- **Fotos de platos:** no se van a agregar. La estructura de la planilla queda sin columna de foto.
- **Contacto:** en el footer, con íconos de WhatsApp e Instagram y la ubicación como en la carta de referencia.
- **Estructura:** una página por grupo de categorías (opción A), no una por categoría.

## Preguntas abiertas

- ¿Cuál es el usuario de Instagram del local? Cuando exista, se carga en `INSTAGRAM_URL` y aparece el ícono.
