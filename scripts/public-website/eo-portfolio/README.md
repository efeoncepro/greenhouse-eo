# EO Portfolio — operación sobre el portafolio de Ohio (TASK-2046)

Scripts y evidencia de la limpieza del tipo `ohio_portfolio` en `efeoncepro.com` antes del portafolio nuevo
(PDR-028, EPIC-056). Todo corre por el carril gobernado (`pnpm public-website:ssh-check` primero).

| Archivo | Qué hace |
|---|---|
| `inventory-ohio-portfolio.php` | Slice 1. Sólo lee: inventario y foto completa de las entradas `ohio_portfolio`, sonda de la API de redirects de Yoast y redirects existentes bajo `/project/`. |
| `retire-ohio-demos.php` | Slice 2. Con la allowlist como entrada: 410 por Yoast para cada `/project/<slug>/` demo, demo a borrador (nunca se borra) y comentarios y pings cerrados en las 59. `dryRun` por defecto; aborta sin escribir si la allowlist no calza con el sitio, si un post cambió desde la foto o si un origen ya redirige a otro lado. |
| `gsc-project-urls.ts` | Slice 1. Sólo lee: clics e impresiones de Search Console bajo `/project/` y `/portfolio-category/` (16 meses). |
| `allowlist-2026-10-23.json` | Lista versionada por ID: 15 reales y 44 demo, con `post_modified` de la foto. Es la entrada de los Slices 2 y 3. |
| `snapshots/ohio-portfolio-2026-10-23.json.gz` | Foto previa para rollback (estado, comentarios, contenido y todos los metadatos de las 59 entradas). |
| `evidence/gsc-project-urls-2026-10-23.json` | Salida de Search Console del 2026-10-23. |

```bash
pnpm public-website:ssh-check
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
