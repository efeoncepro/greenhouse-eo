# TASK-2042 — Navegación global en WordPress (wireframe del host)

> Contrato de integración del mecanismo `efeonce.site-nav` en `efeoncepro.com`. El aspecto y el comportamiento del menú
> están en [`TASK-2040-site-nav.md`](TASK-2040-site-nav.md) y no se redefinen aquí. Este documento fija lo propio del
> host: dónde se monta, qué reemplaza, cómo convive con Ohio, el interruptor, el agendador y los estados de página.
>
> - Flujo maestro: [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](../flows/EPIC-055-public-site-global-navigation-UI-FLOW.md).
> - Arquitectura: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md)
>   §Adaptador WordPress.

## Host contract

- **Qué se reemplaza:** el encabezado del tema Ohio, que hoy es el menú término 61 «Menu 1» pintado como
  `nav#site-navigation ul#menu-primary` y `ul#mobile-menu`. Se reemplaza **sólo** donde el interruptor lo permite.
- **Interruptor:** opción `eo_site_nav_enabled`.

  | Valor | Comportamiento |
  |---|---|
  | `off` | Todo el sitio con Ohio. |
  | `pilot` | Sólo las páginas de la lista `eo_site_nav_pilot_pages`. |
  | `on` | Todo el sitio. |

- **Montaje:** el adaptador (`ohio-child/inc/site-nav.php`) sobrescribe `parts/headers/header-style-1..8.php`: cada
  parte imprime el menú, preparado una sola vez en el hook `wp`, o requiere la parte original de Ohio. Estado: `on` en
  todo el sitio desde el 2026-10-23 00:09 UTC, salvo `/blog/` (#18456).
- **Assets:** CSS y JS de AXIS con versión fijada en `ohio-child/assets/vendor/axis/site-nav/0.7.13/` (primitives
  0.7.13, contracts 0.7.12; `VERSION.json` con sha256; PDR-024), las fuentes del menú, `site-nav-host.css`,
  `site-nav-host.js` y `meeting-dialog.css`. Se cargan sólo en páginas con el menú nuevo.

## Layout en página

| Tipo de página | Cabecera arriba | Hero |
|---|---|---|
| Landing con hero oscuro a sangre | Transparente sobre el hero (estado «Arriba») | Sube hasta el borde, sin margen superior. |
| Página sin hero o con fondo claro (blog, post, 404, archivo) | Arranca con la isla en tono claro | El contenido empieza bajo la isla (12 + 61 px). |
| Glitch | Arranca con la isla en el tono de su cabecera | Respeta su propia cabecera editorial bajo el menú. |

**Estado inicial (resuelto con el inventario de Ohio):** hero oscuro sin el espaciador de cabecera de Ohio → `top`, en
vidrio; página con el espaciador o con hero claro (`EO_SITE_NAV_LIGHT_HERO_PAGES`: 251078, 242261, 223787, 223841,
21460 y 19820) → `fixed`, como isla clara sólida. Una página nueva de hero claro se agrega a esa lista.

**Tono de la isla:** el tema no marca secciones con `data-site-nav-tone`. La isla lee el fondo de lo que tiene debajo
(degradados por sus paradas opacas, fotos como oscuras, colores con alfa de al menos 0,5), se salta el chrome fijo o
sticky del tema y el dock de landings, y conserva su tono mientras el agendador está abierto (AXIS primitives 0.7.12 y
0.7.13; arquitectura §Isla de vidrio).

## States

| Estado | Qué se ve |
|---|---|
| Interruptor `off` o página fuera del piloto | Encabezado de Ohio, sin cambios y sin assets de AXIS cargados. |
| Documento inválido o ausente | No se monta el menú nuevo y queda Ohio; se registra en el log de PHP. Nunca una cabecera vacía. |
| JavaScript bloqueado | Cápsula y onepage como enlaces de servidor; agendador como enlace a `/agenda/`. |
| Agendador sin superficie o clave | Enlace a `/agenda/`. |
| Página con «Estás aquí» | Abre en su línea: la página cuyo `href` de servicio es la misma ruta del sitio marca ese servicio; `context.matchers` queda para excepciones y gana. |
| Usuario logueado con barra de admin | La cabecera fija se desplaza bajo la barra de 32 px (46 px en móvil). |
| Caché de Kinsta | Tras guardar el documento, cambiar el interruptor o la opción del agendador, se purga la caché; el borde se refresca entre unos 40 s y 2 min. |

## Implementation Mapping

- **Repo:** `efeonce-public-site-runtime`.
  - `wp-content/themes/ohio-child/`: override del encabezado y carga de assets.
  - Plugin de `TASK-2041`: lectura del documento.
- **Render:** `EOSN_Render` del plugin, idéntico byte a byte a `siteNavHtml` de AXIS (17 casos de paridad contra
  primitives 0.7.13 y contracts 0.7.12); `site-nav.js` se copia tal cual y sólo mejora.
- **Agendador:** un solo `<greenhouse-cta>` oculto en `wp_footer`, con la superficie del menú global
  (`csur-eb834d53-fd99-4f6b-9615-979e329e7d37`, CTA `site-nav-discovery-meeting`) desde la opción `eo_site_nav_scheduler`;
  la clave nunca entra al repo. Lleva `cta_location: site_nav` y el punto de entrada viaja en `gh_site_nav_clicked`.
  La piel del diálogo es `ohio-child/assets/css/meeting-dialog.css` (`data-eo-meeting-skin="site"`, peso `:root`).
- **Medición:** `gh_site_nav_opened`, `gh_site_nav_line_viewed` y `gh_site_nav_clicked` al `dataLayer` (desde
  `site_nav_open`, `site_nav_line_view` y `site_nav_click` del primitive). Alta en GTM (versión 9; la
  versión 10 suma `target_label` y `target_url` al clic) y GA4 el 2026-10-23. `site_nav_cta` no se empuja: el clic del CTA ya viaja en `gh_site_nav_clicked` y el agendador emite `greenhouse_cta_*`.
- **Doctrina:** se actualizan `references/native-navigation.md` y `runtime-and-discovery.md` de la skill
  `efeonce-public-site-wordpress` (`.claude` y `.codex`).

## GVC Scenario Plan

- **Superficie:** el piloto de una página se omitió por decisión del operador; en `on`, Home, una landing con «Estás aquí», un post del blog, Glitch y 404 (surface
  ID `public-site-global-nav`).
- **Viewports:** 1440×900, 1366×768, 1180×820, 834×1112 y 390×844.
- **Pasos:**
  1. Cabecera arriba.
  2. Abrir Soluciones.
  3. Abrir el onepage.
  4. Agendar desde la cabecera y desde el onepage; cerrar el diálogo y verificar el foco.
  5. Hacer scroll abajo y arriba.
  6. Poner el interruptor en `off` y verificar que vuelve Ohio.
- **Verificaciones:**
  - Sin scroll horizontal.
  - Enlaces presentes en el HTML de servidor (`curl` sin JS).
  - Eventos en `dataLayer`.
  - Core Web Vitals sin regresión frente a la medición previa (pendiente).
  - Vuelta a `off` en producción (pendiente; sólo probada en Playground).

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Interruptor con piloto | Permite medir en una página real y volver a Ohio en un paso. |
| No cargar AXIS donde no hay menú nuevo | Evita costo y conflictos de CSS en páginas que siguen con Ohio. |
| Ohio como respaldo ante documento inválido | La navegación nunca desaparece por un error de datos. |
| Estado inicial sólido en páginas sin hero oscuro | El vidrio necesita algo detrás; sobre fondo claro se pierde. |
