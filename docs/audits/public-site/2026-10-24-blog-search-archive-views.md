# Búsqueda y archivos del blog — estado en vivo y propuesta (2026-10-24)

> **Tipo:** Auditoría de superficie en vivo + propuesta · **Fecha:** 2026-10-24 · **Autor:** Claude (sesión «Portada del
> blog v3»), a pedido del operador · **Contrato:** [PUBLIC_MISCELLANEOUS_SURFACES_V1](../../architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md)
> (slices 4–6) · **Discovery previo:** [2026-08-31](2026-08-31-wordpress-miscellaneous-surfaces-discovery.md) ·
> **Capturas:** [carpeta](2026-10-24-blog-search-archive-views/)

## Por qué

Desde el 2026-10-24 la portada v3 de `/blog/` manda su buscador a `?s=` y sus temas a los archivos de categoría. Esas
vistas siguen siendo la plantilla de archivo de Ohio sin adaptar: el visitante pasa de la portada nueva a una página
de demo en inglés. El contrato de superficies misceláneas ya define el destino (slices 4–6), pero **ninguna task es
dueña de implementarlo**.

## Método

Playwright contra producción, 1440 y 390 px, sin sesión: `/?s=Inbound`, `/?s=zzqxw`, `/category/hubspot/`,
`/category/glitch/`, `/category/marketing-digital/social/` (0 entradas), `/tag/inbound/`, `/author/jreysgo/`,
`/author/greenhouse-integration/`; más dos capturas del operador (`/category/loop-marketing/`, `/tag/branding/`).
Lectura de `title`, `h1`, `robots`, `canonical`, cantidad de `article`, textos en inglés y ancho del documento.

## Hallazgos (observados)

Las cuatro clases de vista —búsqueda, categoría, etiqueta, autor— usan la misma plantilla de archivo de Ohio.

| # | Hallazgo | Dónde | Gravedad |
|---|---|---|---|
| 1 | Recuadro de la demo del tema: «Looking For Customization? Hire us! We are WordPress specialists…» | búsqueda, categoría, etiqueta, autor | **P0 marca**: Efeonce parece vender desarrollo WordPress |
| 2 | Barra lateral de demo: «Staff Picks», «Recent Comments», «Recommended Topics» | las mismas | P1 |
| 3 | Textos en inglés: «Results for:», «Category», «Tag:», «Author:», «Showing 1-5 of 5 results», filtros «Categories / Tags / Authors», «min read», «Follow Us», «Home» | todas | P1 |
| 4 | Una categoría sobre el H1 que no corresponde: «Loop Marketing» sobre la búsqueda «Inbound» y sobre la etiqueta «branding»; «Glitch» sobre el autor «Julio Reyes» (toma la del primer resultado) | búsqueda, etiqueta, autor | P1 |
| 5 | Archivo vacío con copy de búsqueda: «Sorry, but nothing matched your search terms. Try using other search criteria» + «Search…» | categoría sin entradas, búsqueda sin resultados | P1 (el contrato lo prohíbe) |
| 6 | Categoría vacía **indexable** (`index, follow`, 0 entradas): página delgada en Google | `/category/marketing-digital/social/` | P1 SEO |
| 7 | Desborde horizontal a 390 px (documento 407 y 414 px) | `/category/glitch/`, `/tag/inbound/` | P1 |
| 8 | Archivo de autor público del usuario de integración «Greenhouse» (`noindex`, 0 entradas) y usuarios listados por `/wp-json/wp/v2/users` | `/author/greenhouse-integration/` | P2 higiene |
| 9 | Interruptor Dark/Light, rail «Follow Us» y punto de órbita decorativo suelto | todas | P2 |
| 10 | Mucho aire sobre el H1 en móvil; el banner de cookies tapa el primer resultado | 390 px | P2 |

Lo que sí está bien: búsqueda `noindex, follow` con HTTP 200; etiquetas `noindex`; autor real indexable con H1 propio;
sin errores 5xx.

## Propuesta

**Paso 1 — contención en vivo (horas; child theme / opciones; requiere visto bueno):** quitar el recuadro de la demo y
la barra lateral de demo de los archivos; traducir los textos de la plantilla; ocultar Dark/Light, rail y punto suelto
en búsqueda y archivos; `noindex` en archivos vacíos; deshabilitar el archivo de autor de usuarios sin entradas
editoriales (o 404); corregir el desborde a 390. Snapshot y rollback por archivo, purga y lectura en vivo.

**Paso 2 — rediseño: una sola plantilla «Archivo del blog» en el sistema v3** (canvas aprobado primero, después
implementación con gate de fidelidad ≤ 1 %, como la portada). Sirve las cuatro vistas con variantes de cabecera:

| Vista | Cabecera | Indexación |
|---|---|---|
| Tema (categoría) | nombre + descripción editorial del tema + cantidad | indexable sólo con descripción y ≥ N entradas; vacía `noindex` |
| Etiqueta | nombre | `noindex, follow` (como hoy) |
| Autor | foto y bio del perfil de WordPress (el mismo origen que usa la portada) + redes | indexable sólo para autores editoriales, con `Person` |
| Búsqueda | «Resultados para "…"» con el campo editable y la cantidad | `noindex, follow`, `view_search_results` sin el término en eventos propios |

Comunes: mismas tarjetas y chips de formato/tema de la portada, filtros por formato y tema, paginación, migas en
español, estado vacío contextual (nunca copy de búsqueda en un archivo: temas, último Glitch, lecturas recomendadas),
sin barra lateral de demo. Alcance de la búsqueda: entradas y recursos del blog, nunca páginas comerciales sueltas.

Recomendación: paso 1 ya (el texto de la demo daña la marca) y paso 2 en una sesión nueva, con su task propia.

## Resuelto (2026-10-24, TASK-2055)

Contención y rediseño salieron juntos: la plantilla «Archivo del blog» (dirección D aprobada) está en producción para
búsqueda, temas, etiquetas y autores. Hallazgos 1–9 cerrados (sin recuadro ni barra lateral de demo, en español, sin la
categoría del primer resultado sobre el H1, estados vacíos propios, categoría vacía `noindex`, sin desborde a 390,
Greenhouse 404, sin switcher/riel/cursor). Hallazgo 10: el aire sobre el H1 en móvil es el del diseño; el banner de cookies
es del sitio. Matriz y evidencia: [BLOG_ARCHIVE_RUNTIME_V1](../../architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md).

## Pendiente (histórico)

- **Decisión del operador (2026-10-24):** no contener por separado; la contención del paso 1 sale junto con el
  rediseño del paso 2, en una sesión nueva.
- Crear la task (reservar ID barriendo por dominio y superficie) y su canvas.
