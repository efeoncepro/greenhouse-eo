# EO Portfolio — limpieza de Ohio, migración y operación del portafolio (TASK-2046, TASK-2049)

Scripts y evidencia de la limpieza del tipo `ohio_portfolio` en `efeoncepro.com` antes del portafolio nuevo
(PDR-028, EPIC-056). Todo corre por el carril gobernado (`pnpm public-website:ssh-check` primero).

| Archivo | Qué hace |
|---|---|
| `inventory-ohio-portfolio.php` | Slice 1. Sólo lee: inventario y foto completa de las entradas `ohio_portfolio`, sonda de la API de redirects de Yoast y redirects existentes bajo `/project/`. |
| `retire-ohio-demos.php` | Slice 2. Con la allowlist como entrada: 410 por Yoast para cada `/project/<slug>/` demo, demo a borrador (nunca se borra) y comentarios y pings cerrados en las 59. `dryRun` por defecto; aborta sin escribir si la allowlist no calza con el sitio, si un post cambió desde la foto o si un origen ya redirige a otro lado. |
| `clean-ohio-real-entries.php` | Slice 3. Vacía con el guardado de Elementor el documento de las 15 reales sólo si cada texto e URL que contiene también está en algún demo (más tres textos exactos de la plantilla de CTA de Ohio); vacía `project_link` donde apunta al afiliado de Envato y borra las filas `_wp_old_slug` con slugs demo. `dryRun` por defecto. |
| `gsc-project-urls.ts` | Slice 1. Sólo lee: clics e impresiones de Search Console bajo `/project/` y `/portfolio-category/` (16 meses). |
| `allowlist-2026-10-23.json` | Lista versionada por ID: 15 reales y 44 demo, con `post_modified` de la foto. Es la entrada de los Slices 2 y 3. |
| `snapshots/ohio-portfolio-2026-10-29.json.gz` | Foto posterior al Slice 2 y previa al Slice 3 (rollback del Slice 3). `sha256` del JSON sin comprimir: `f54085fdc51daf99fff82ce598c7cd9963476579ce806aeb0f6e8ae6b6c49b55`. |
| `snapshots/ohio-portfolio-2026-10-23.json.gz` | Foto previa para rollback (estado, comentarios, contenido y todos los metadatos de las 59 entradas). |
| `evidence/gsc-project-urls-2026-10-23.json` | Salida de Search Console del 2026-10-23. |
| `export-ohio-real-entries.php` | TASK-2049 Slice 1. Sólo lee: las 15 entradas reales de Ohio con sus campos, categorías, título y descripción de Yoast e imágenes con dimensiones reales de la biblioteca. IDs desde la allowlist; nada por nombre. |
| `migration-map-2026-10-29.json` | Mapa versionado de la migración: texto de cada proyecto escrito con lo que ya publicaba, slug nuevo, aprobación del operador del 2026-10-29 (alcance logo y piezas, sin cifras). |
| `build-migration-documents.cjs` | TASK-2049 Slice 2. Del export y el mapa arma el lote `portfolio-entry.v1` y el mapa de redirecciones. Sin cifras inventadas. El título SEO se escribe entero (≤ 65 caracteres): `whole()` hace fallar el armado en vez de recortarlo con «…» (un título recortado llegó a Google en 10 proyectos el 2026-10-30); si falla, escribe un `seoTitle` más corto en el mapa. |
| `apply-portfolio-bundle.php` | Carga un lote `{ "projects": [...] }` por `wp eo-portfolio apply` (todo o nada). Se niega si un proyecto ya existe, salvo con `"update": true` (cada documento lleva la `revision` de la que partió; un conflicto hace fallar el lote entero). Con `"publish": true` publica, compuerta de aprobación incluida. |
| `set-portfolio-switch.php` | Interruptor de las páginas (`enabled` `0` / `preview` / `1`), orden editorial, cifras de la portada y token de vista previa. Imprime el estado antes y después (entrada de rollback) y purga la caché al cambiar el interruptor. |
| `cutover-ohio-to-portfolio.php` | TASK-2049 Slice 4. 301 de Yoast de cada `/project/<slug>/` a su página nueva, reencadena los redirects que terminaban ahí y pasa la entrada de Ohio a borrador (nunca la borra). `dryRun` por defecto. |
| `redirect-portfolio-categories.php` | Una redirección regex 301 de Yoast de `/portfolio-category/…` a `/portafolio/`. `dryRun` por defecto. |
| `import-portfolio-media.php` | Sube a la biblioteca piezas que el sitio ya servía desde los assets de un plugin, para referenciarlas por `mediaId`. Idempotente por `_eop_source`; nada se descarga de fuera. |
| `upload-portfolio-images.php` | Sube imágenes nuevas desde archivos locales (`--input-file`, después del manifiesto `{ source, files: [{ file, alt, title }] }`) y devuelve `mediaId`, ancho y alto. Idempotente por `_eop_source` = `<source>/<file>`. Primer uso: las 7 imágenes de Sky (2026-10-30, ids 252318–252324). |
| `redirect-retired-entry.php` | Cuando un proyecto sale del portafolio: 301 de su URL al proyecto que tiene ese trabajo y reapunta las redirecciones que terminaban en ella (sin cadenas). Plan con `"apply": false`; se niega si el retirado sigue publicado. |
| `batches/` | Lotes aplicados el 2026-10-30 (Sky y Berel, piezas sumadas, orden editorial). |
| `purge-portfolio-cache.php` | Purga la caché de páginas (la misma de un guardado, `EOP_Cache::purge`) e imprime la versión activa del plugin. Correrla después de desplegar código que cambia el marcado: un despliegue no purga solo. La caché perimetral tarda 1–2 minutos más. |

```bash
pnpm public-website:ssh-check
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/purge-portfolio-cache.php --wp-user 12
pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/inventory-ohio-portfolio.php --wp-user 12 > <snapshot.json>
# GSC: requiere el proxy de Cloud SQL (pnpm pg:connect) y la configuración OAuth de Search Console en el entorno
# (GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID desde el env de producción de Vercel, sin escribirlo a disco del repo, y
# GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF=greenhouse-search-console-oauth-client-secret).
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/public-website/eo-portfolio/gsc-project-urls.ts <salida.json>
```

## Foto del 2026-10-23 (Slice 1)

- Tomada a las 22:46 UTC por WP-CLI con `--wp-user 12`; sin escrituras en el sitio.
- `sha256` del JSON sin comprimir: `42fc18f89688dc155d6b04d71be8fe1ccddb8be7a8f91c872562c6997609745f`.
- 59 entradas `ohio_portfolio`, las 59 en `publish` y con comentarios abiertos.

### Clasificación por ID

El criterio fue el slug de las 15 entradas de trabajo de Efeonce (auditoría del sitio y PDR-028) y, para el resto, las
huellas del demo: cliente «Envato», enlace de afiliado `1.envato.market`, enlaces a `ohio.clbthemes.com` o imágenes
del CDN de Colabrio, o slugs del catálogo del tema (`about-ver*`, `contact-ver*`, `hamburger-menu-*`, `corporate`,
`digital-agency`…). La entrada real `lifestyle-app-elementor` (223620, Eusari) y el demo `lifestyle-app` (19296) se
distinguen por ID; nunca por texto.

- **Reales (15):** 223615 `social-media-nutribait`, 223616 `fivest-branding`, 223617 `pabellotogo-design`,
  223618 `motogas-social-media`, 223619 `dmark-social-media`, 223620 `lifestyle-app-elementor` (Eusari),
  223623 `ssilva-campaign`, 223787 `bighouse-design`, 223841 `beebot-social-media`, 246154 `sky-airlines-propuesta`,
  246155 `flick-identity`, 246156 `ghamadent-design`, 248334 `gobierno-de-santiago`, 248347 `marca-chile`,
  248783 `bresler`.
- **Demo (44):** 78, 79, 80, 96, 97, 98, 99, 100, 101, 18271, 18272, 18273, 18274, 18276, 19291, 19292, 19293, 19294,
  19295, 19296, 19297, 19298, 19299, 19300, 20660, 46097, 46140, 46142, 46143, 46145, 46166, 46172, 46173, 46174,
  46175, 46202, 46219, 46220, 75369, 88947, 88994, 223840, 223842, 223843.

### Hallazgos que cambian los Slices 2 y 3

1. **Yoast SEO Premium 27.7 acepta 410 por API** (`WPSEO_Redirect_Types`: 301, 302, 307, 410, 451). No hace falta la
   regla alternativa en un mu-plugin.
2. **Ya existen 12 redirects 301 bajo `/project/`**, de slugs viejos de demos hacia entradas reales (por ejemplo
   `project/stickers-pack-elementor-2` → `project/sky-airlines-propuesta`, `project/marca-chile-2` →
   `project/marca-chile`). Ninguno sale de un slug demo actual, así que los 410 no chocan con ellos; no se tocan aquí y
   `TASK-2049` los reencadena a `/portafolio/<slug>/` para evitar dos saltos.
3. **12 de las 15 entradas reales tienen metadatos duplicados**: el set completo de Ohio y `_elementor_data` guardados
   dos veces (tres en `ssilva-campaign`). Sólo `social-media-nutribait`, `fivest-branding` y `lifestyle-app-elementor`
   tienen una fila. El Slice 3 debe limpiar el bloque del demo en **todas** las filas (o dejar una sola, documentado),
   leer y comparar cada fila contra la foto, y verificar el HTML servido.
4. **Search Console (2025-06-23 a 2026-10-23):** las 44 URLs demo suman **0 clics y 81 impresiones** (la que más,
   `/project/corporate/` con 20). El 410 no pierde tráfico. Las 15 reales suman **18 clics y 2.431 impresiones**
   (`lifestyle-app-elementor` 643, `fivest-branding` 554, `motogas-social-media` 387): sus 301 en `TASK-2049`
   importan. Los enlaces externos no salen por la API; se revisan en la interfaz de Search Console antes del Slice 2.
5. **`cms.efeoncepro.com` también aparece indexado** con URLs `/project/` (`contact-ver3`, `beebot-social-media`). Es un
   segundo host del mismo WordPress; queda como hallazgo para revisar fuera de esta task.

## Rollback

- La foto contiene, por ID, `status`, `commentStatus`, `pingStatus`, `postContent` y todos los metadatos (incluidas las
  filas duplicadas). Los Slices 2 y 3 restauran desde ella sólo los IDs que tocaron.
- Los redirects 410 que cree el Slice 2 quedan listados en su salida; el rollback los borra con
  `WPSEO_Redirect_Manager::delete_redirects`, sin restaurar la opción entera de Yoast.

## Slice 2 — `dryRun` del 2026-10-23

- Entrada: la allowlist con `"dryRun": true`. Salida en `evidence/retire-ohio-demos-dryrun-2026-10-23.json`.
- Resultado: la allowlist calza exactamente con las 59 entradas vivas, ningún post cambió desde la foto y ningún origen
  demo choca con un redirect existente. Plan: **44 redirects 410 a crear, 44 demos a borrador, comentarios a cerrar en
  las 59** (los pings ya estaban cerrados). Las 15 reales no cambian de estado.
- Línea base HTTP antes de aplicar: las 59 URLs `/project/<slug>/` responden 200 y `ohio_portfolio-sitemap.xml` lista 59
  URLs (`evidence/http-baseline-2026-10-23.csv`).
- Aplicar: la misma entrada con `"dryRun": false`, después del OK del operador y de la revisión de enlaces externos en
  Search Console. Si una aplicación queda a medias, cerrar comentarios cambia el `post_modified` de las reales: antes de
  reintentar, regenerar la allowlist desde un inventario nuevo (el script trata como hechos los demos ya en borrador y los
  410 ya creados).

## Slice 2 — aplicado el 2026-10-29

- Con OK del operador en chat. Salida en `evidence/retire-ohio-demos-apply-2026-10-29.json`: 44 redirects 410 creados y
  leídos de vuelta, 44 demos a borrador, comentarios cerrados en las 59, sin fallas de readback, caché de Kinsta purgada.
- HTTP después de aplicar (`evidence/http-after-apply-2026-10-29.csv`): 15 reales en 200 y 35 demos en 410. El sitemap
  `ohio_portfolio-sitemap.xml` lista sólo las 15 reales.
- **Verificar sin query string.** Yoast compara la URL pedida completa: `/project/corporate/?nc=123` no calza con la regla
  y cae en 404. Las visitas y los buscadores piden la URL limpia.
- **9 demos no llegan al 410.** WordPress los redirige antes de que Yoast responda: 8 porque su slug quedó como
  `_wp_old_slug` en otras entradas (las reales nacieron duplicando demos y se renombraron), y terminan en 404 tras un
  salto a `?post_type=ohio_portfolio&p=<id>`; `lifestyle-app` por la adivinanza de 404 de WordPress, que lo lleva a la
  entrada real de Eusari (`lifestyle-app-elementor`, 200). El Slice 3 borra esas filas `_wp_old_slug`; la adivinanza se
  puede apagar con `do_redirect_guess_404_permalink` en el plugin de `TASK-2047`.
- Hallazgo fuera de alcance, corregido el 2026-10-29 a pedido del operador: el ícono social «YouTube» del encabezado
  enlazaba a `facebook.com/colabrio` en todas las páginas (opción ACF de Ohio
  `global_header_menu_social_links`, fila 3). Ahora apunta a `https://www.youtube.com/@efeoncepro`
  (`scripts/public-website/site-options/fix-ohio-header-youtube.php`). Quedan latentes, sin publicarse hoy, los enlaces
  sociales del autor 1 en las opciones de Ohio (Threads y Twitter a Colabrio).

## Slice 3 — `dryRun` del 2026-10-29

- Entrada armada desde la foto del 2026-10-29 (las fechas de modificación de las reales cambiaron al cerrar comentarios).
  Salida en `evidence/clean-ohio-real-entries-dryrun-2026-10-29.json`.
- Las 15 entradas reales tienen un documento de Elementor 100 % demo: el CTA «Got a project? / Get a Quote» hacia
  `ohio.clbthemes.com` y el texto en inglés sobre fin-tech; en Beebot y Big House, además, el caso de estudio completo del
  demo (imágenes de Colabrio, equipo y premios ficticios). La galería de cada proyecto vive en `project_content` de Ohio y
  no se toca.
- Plan: 15 documentos a vaciar, 3 `project_link` de Envato a vaciar (Bresler, Flick, Ghamadent; Ohio oculta «Open
  Project» cuando el campo está vacío) y 71 filas `_wp_old_slug` en 8 slugs demo.

## Slice 3 — aplicado el 2026-10-29

- Con OK del operador en chat. Salida en `evidence/clean-ohio-real-entries-apply-2026-10-29.json`: 15 documentos de
  Elementor vaciados con el guardado de Elementor (todas las filas duplicadas quedaron en `[]`; `post_content` no
  necesitó limpieza aparte), 3 `project_link` de Envato vaciados y 71 filas `_wp_old_slug` borradas (listadas con
  `meta_id`, `post_id` y valor para rollback). Sin fallas de readback; cachés de Elementor y Kinsta purgadas.
- HTTP en vivo (`evidence/http-after-slice3-2026-10-29.csv`): 43 demos en 410, 15 reales en 200 sin huellas del demo.
  «Open Project» sólo queda donde el enlace es de Behance. `lifestyle-app` sigue en 301 hacia
  `lifestyle-app-elementor` por la adivinanza de 404 de WordPress (`TASK-2047`).
- Rollback: `_elementor_data`, `post_content` y `project_link` por ID desde `snapshots/ohio-portfolio-2026-10-29.json.gz`
  (o la revisión que Elementor creó al guardar); re-agregar las filas de `applied.oldSlugsDeleted`.
