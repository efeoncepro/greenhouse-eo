# TASK-2042 — Navegación global en WordPress: flujo del host

> Nodo del flujo maestro [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> Esta task lleva los nodos **N1 a N8** a `efeoncepro.com`. Agrega lo que el primitive de `TASK-2040` no puede saber:
> en qué páginas aplica, con qué estado arranca la cabecera, cómo se abre el agendador del sitio, cómo se mide y cómo se
> vuelve a Ohio.
>
> Estado: **en `on` en todo el sitio desde el 2026-10-23 00:09 UTC**, sin piloto de una página por decisión del
> operador. `/blog/` (#18456) conserva Ohio.

## Flow Goal

Que el menú nuevo aparezca en las páginas que el interruptor permite, funcione igual que en el Lab, abra el agendador
nativo del sitio y se pueda apagar en un paso.

## Flujo de una página

1. **Request.** En el hook `wp`, el adaptador (`inc/site-nav.php`) lee `eo_site_nav_enabled` y
   `eo_site_nav_pilot_pages`, y excluye `/blog/`.
   - Si la página no aplica, sale el encabezado de Ohio y termina el flujo.
2. **Documento.** Lee el documento publicado del plugin (`TASK-2041`).
   - Si el plugin falta, el documento falta o no valida, o el render falla, sale Ohio y queda en el log como
     `[eo-site-nav] …`. El menú se prepara una sola vez, antes de imprimir nada.
3. **Estado inicial.** Sale del inventario de Ohio (2026-10-22):
   - hero oscuro sin el espaciador de cabecera de Ohio (`page_header_add_cap`): arranca `top`, en vidrio;
   - página con el espaciador, o con hero claro (`EO_SITE_NAV_LIGHT_HERO_PAGES`: 251078, 242261, 223787, 223841, 21460
     y 19820): arranca `fixed`, como isla clara sólida.

   Corrección del 2026-10-23: los héroes claros arrancaban en la barra de vidrio y el logo blanco no se leía en
   `/servicios/posicionamiento-seo/`. El filtro `eo_site_nav_page_profile` permite corregir una página.
4. **Contexto.** Resuelve «Estás aquí» contra la ruta actual: el servicio cuyo enlace es esa página (misma ruta en el
   sitio; otro host nunca marca; dos servicios con la misma URL no marcan nada), o el matcher de `context.matchers`
   cuando hay una excepción, que gana.
5. **Datos dinámicos.** Resuelve el centro y el destacado de Recursos desde WordPress o Think, con caché corta. Si
   falla, usa el destacado fijo.
6. **Render.** La parte de cabecera de Ohio (`header-style-1..8`, sobrescritas) imprime el HTML ya preparado. Sólo en
   esas páginas se encolan los archivos de AXIS fijados en `assets/vendor/axis/site-nav/0.7.10/`, las fuentes del menú,
   `site-nav-host.css` (sólo el desplazamiento por la barra de admin) y `site-nav-host.js`.
7. **Agendador (N7).** Un solo `<greenhouse-cta>` oculto, impreso en `wp_footer` cuando la opción
   `eo_site_nav_scheduler` tiene un `{cta, surface, key}` válido (CTA `site-nav-discovery-meeting`). El evento
   cancelable `axis-site-nav:cta` lo abre desde la cabecera, el mega o el onepage. El lanzador lleva
   `cta_location: site_nav`; el punto de entrada se mide en `gh_site_nav_clicked` (`target_type: cta`, `target`
   `menu_header`, `menu_mega` o `menu_onepage`), porque el renderer lee `cta-location` al montar y no al hacer clic.
   - El renderer (`renderer-latest.js`) se carga cuando el navegador está ocioso o cuando el visitante se dirige al
     CTA; en las landings que ya lo cargan queda una sola copia. Si no está listo, el clic espera hasta 2,5 s.
   - El primitive cierra el panel y suelta el scroll.
   - El diálogo lleva `data-eo-meeting-skin="site"` y la piel `assets/css/meeting-dialog.css`: el marco aprobado para
     Inbound el 2026-10-18 (sin contenedor, agendador flotando sobre la página difuminada, un botón redondo para
     cerrar) con la paleta de `/agenda/`. Su peso `:root` le gana a la piel de una landing; el CTA propio de una
     landing conserva la suya.
   - Al cerrar, el foco vuelve al control que lo abrió o, si ya no se ve, a uno visible.
8. **Medición.** El módulo del anfitrión empuja `gh_site_nav_opened`, `gh_site_nav_line_viewed` y
   `gh_site_nav_clicked` al `dataLayer`; GTM los envía a GA4. `site_nav_cta` no se empuja.

## Recovery Branches del host

| Situación | Comportamiento |
|---|---|
| Interruptor `off` | Todo el sitio con Ohio; sin assets de AXIS. |
| Página fuera del piloto | Ohio en esa página. |
| Documento inválido | Ohio + log; nunca una cabecera vacía. |
| Opción `eo_site_nav_scheduler` vacía o inválida | No se imprime lanzador; el botón es enlace a `/agenda/`. |
| Lanzador vacío (`data-ghc-state="empty"`: CTA pausado, origen equivocado) | El enlace va de inmediato a `/agenda/`. |
| Barra de admin (usuario logueado) | `--axis-site-nav-offset` toma el alto de la barra y toda la parte fija baja esa medida. |
| Plugin inactivo o error al renderizar | Ohio + log; el menú se prepara antes de imprimir nada. |
| Cambio del documento, del interruptor o del agendador | Purga de Kinsta; el borde se refresca entre unos 40 s y 2 min. Un PHP existente que cambió puede tardar 1 a 2 min más por OPcache. |
| Volver a Ohio | `set-site-nav-switch.php` con `{"mode":"off"}` y purga. Probado en Playground; falta comprobarlo en producción. |

## Focus and Navigation

Se hereda del flujo maestro. Lo propio del host:

- El enlace «Saltar al contenido» queda antes de la cabecera, si el tema lo tiene [verificar en Ohio].
- El foco tras cerrar el agendador vuelve al control del punto de entrada que lo abrió o, si ya no se ve, a uno
  visible.

## GVC Scenario Plan

- **Piloto:** omitido por decisión del operador (2026-10-23).
- **En `on` (hecho 2026-10-23):** 52 páginas publicadas y 3 posts de Glitch en 1440 y 390: todas 200, menú nuevo
  presente, cabecera de Ohio ausente, panel y onepage abren y `gh_site_nav_opened` llega al `dataLayer`. Agendador
  verificado desde cabecera, mega y onepage de teléfono, con Escape y cerrar. Fuera del menú quedaron como estaban
  recursos 404 de páginas antiguas y desborde de Elementor en cinco páginas antiguas o de demo.
- **Fidelidad (sesión «Rediseño de Menú»):** 1440, 1280, 1200, 1024, 834 y 390; círculo del onepage en 1440, 1680,
  1920, 2000 y 2560; «Estás aquí» en 10 páginas de servicio.
- **Pendiente:** Core Web Vitals contra la cabecera anterior.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| El respaldo es Ohio | La navegación nunca desaparece por un error de datos o de despliegue. |
| Estado inicial por tipo de página | El vidrio necesita un fondo oscuro detrás; sobre páginas claras arranca sólido. |
| Superficie del agendador propia del encabezado | Medición separada de las landings y una allowlist que cubre todo el sitio. |
| La aislación de estilos vive en AXIS, no en el tema | El piloto mostró estilos de Ohio dentro del menú (hover rojo, cierre rojo, filas 4 px más altas). Corregirlo en el tema habría sido una copia de valores; AXIS primitives 0.7.8 da a cada regla peso de id y restablece lo que un tema aplica a todo, con una prueba que inyecta una hoja hostil. |
| El adaptador carga las fuentes del menú | Cada página de Ohio carga un juego distinto (la home no tiene Bricolage ni Poppins 300). Se pide el juego del Lab sin el eje de ancho, que el menú no usa: así el archivo de Bricolage es el que ya cargan las landings. |
| Hero claro arranca como isla clara | Sobre un hero claro la barra de vidrio deja ilegible el logo blanco (`/servicios/posicionamiento-seo/`, 2026-10-23). |
| Un solo lanzador oculto en `wp_footer` | El renderer lee `cta-location` al montar, no al hacer clic; el punto de entrada viaja en `gh_site_nav_clicked`. |
| Piel del diálogo propia del sitio con peso `:root` | Le gana a la piel de la landing donde se abre; el CTA propio de esa landing conserva la suya. |
| `site_nav_cta` no se empuja | El clic ya viaja en `gh_site_nav_clicked` y el agendador emite `greenhouse_cta_*`; un tercer evento contaría dos veces y reviviría `gh_cta_clicked`. |
