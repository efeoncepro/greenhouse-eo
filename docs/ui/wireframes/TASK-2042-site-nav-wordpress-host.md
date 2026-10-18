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

- **Montaje:** el adaptador pinta el HTML del primitive desde el documento del plugin en el punto de encabezado del tema
  hijo y apaga el de Ohio en esas páginas. El gancho exacto del header de Ohio es **[verificar]** en el discovery.
- **Assets:** CSS y JS de AXIS con versión fijada en `ohio-child/assets/vendor/axis/<versión>/` (PDR-024). Se cargan
  sólo en páginas con el menú nuevo.

## Layout en página

| Tipo de página | Cabecera arriba | Hero |
|---|---|---|
| Landing con hero oscuro a sangre | Transparente sobre el hero (estado «Arriba») | Sube hasta el borde, sin margen superior. |
| Página sin hero o con fondo claro (blog, post, 404, archivo) | Arranca con la isla en tono claro | El contenido empieza bajo la isla (12 + 61 px). |
| Glitch | Arranca con la isla en el tono de su cabecera | Respeta su propia cabecera editorial bajo el menú. |

**Tono de la isla:** cada plantilla marca sus secciones con `data-site-nav-tone="light|dark"` para que la isla cambie de
tono al pasar sobre ellas (arquitectura §Isla de vidrio). El inventario de variantes de Ohio incluye qué secciones son
claras u oscuras en cada plantilla.

La regla final por tipo sale del **inventario de variantes de Ohio** que hace la task: metas de página (encabezado
transparente u oscuro), logo fijo de ACF y plantillas especiales. Cada variante queda mapeada a un estado del primitive
o documentada como excepción.

## States

| Estado | Qué se ve |
|---|---|
| Interruptor `off` o página fuera del piloto | Encabezado de Ohio, sin cambios y sin assets de AXIS cargados. |
| Documento inválido o ausente | No se monta el menú nuevo y queda Ohio; se registra en el log de PHP. Nunca una cabecera vacía. |
| JavaScript bloqueado | Cápsula y onepage como enlaces de servidor; agendador como enlace a `/agenda/`. |
| Agendador sin superficie o clave | Enlace a `/agenda/`. |
| Página con «Estás aquí» | Abre en su línea según `context.matchers` del documento. |
| Usuario logueado con barra de admin | La cabecera fija se desplaza bajo la barra de 32 px (46 px en móvil). |
| Caché de Kinsta | Tras guardar el documento o cambiar el interruptor, se purga la caché. |

## Implementation Mapping

- **Repo:** `efeonce-public-site-runtime`.
  - `wp-content/themes/ohio-child/`: override del encabezado y carga de assets.
  - Plugin de `TASK-2041`: lectura del documento.
- **Render:** función de servidor del primitive (vendorizada) o su equivalente PHP generado desde el contrato. La task
  decide cuál y lo documenta.
- **Agendador:** `<greenhouse-cta>` con la superficie del encabezado global, la clave fuera del repo y `cta-location` por
  punto de entrada. La piel del diálogo de `scripts/public-website/inbound-source/page.css` pasa a una primitive
  compartida del sitio.
- **Medición:** `site_nav_open`, `site_nav_line_view` y `site_nav_click` al `dataLayer`, con su alta en GTM y GA4.
- **Doctrina:** se actualizan `references/native-navigation.md` y `runtime-and-discovery.md` de la skill
  `efeonce-public-site-wordpress` (`.claude` y `.codex`).

## GVC Scenario Plan

- **Superficie:** página piloto y, en `on`, Home, una landing con «Estás aquí», un post del blog, Glitch y 404 (surface
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
  - Core Web Vitals sin regresión frente a la medición previa.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Interruptor con piloto | Permite medir en una página real y volver a Ohio en un paso. |
| No cargar AXIS donde no hay menú nuevo | Evita costo y conflictos de CSS en páginas que siguen con Ohio. |
| Ohio como respaldo ante documento inválido | La navegación nunca desaparece por un error de datos. |
| Estado inicial sólido en páginas sin hero oscuro | El vidrio necesita algo detrás; sobre fondo claro se pierde. |
