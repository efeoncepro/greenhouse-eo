# TASK-2042 — Navegación global en WordPress: flujo del host

> Nodo del flujo maestro [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> Esta task lleva los nodos **N1 a N8** a `efeoncepro.com`. Agrega lo que el primitive de `TASK-2040` no puede saber:
> en qué páginas aplica, con qué estado arranca la cabecera, cómo se abre el agendador del sitio, cómo se mide y cómo se
> vuelve a Ohio.

## Flow Goal

Que el menú nuevo aparezca en las páginas que el interruptor permite, funcione igual que en el Lab, abra el agendador
nativo del sitio y se pueda apagar en un paso.

## Flujo de una página

1. **Request.** El adaptador lee `eo_site_nav_enabled` y la lista del piloto.
   - Si la página no aplica, sale el encabezado de Ohio y termina el flujo.
2. **Documento.** Lee el documento publicado del plugin (`TASK-2041`).
   - Si falta o no valida, sale Ohio y queda registro en el log.
3. **Estado inicial.** Sale del inventario de Ohio (2026-10-22): la página con el espaciador de cabecera de Ohio
   (`page_header_add_cap`) arranca `fixed` y sólida; la que no lo tiene arranca `top` sobre su hero, en tono oscuro salvo
   las seis páginas de hero claro del inventario. El filtro `eo_site_nav_page_profile` permite corregir una página.
4. **Contexto.** Resuelve «Estás aquí» con `context.matchers` contra la ruta actual.
5. **Datos dinámicos.** Resuelve el centro y el destacado de Recursos desde WordPress o Think, con caché corta. Si
   falla, usa el destacado fijo.
6. **Render.** Pinta el HTML del primitive; encola el CSS y el JS de AXIS con versión fijada y el renderer de Growth CTA.
7. **Agendador (N7).** Un solo `<greenhouse-cta>` de la superficie del encabezado global, montado una vez por página;
   el evento cancelable `axis-site-nav:cta` lo abre desde la cabecera, el mega o el onepage. El punto de entrada se mide
   en `gh_site_nav_clicked` (`target_type: cta`, `target` `menu_header`, `menu_mega` o `menu_onepage`), porque el
   renderer lee `cta-location` al montar y no al hacer clic.
   - El primitive cierra el panel y suelta el scroll.
   - El renderer abre el diálogo con la piel compartida y devuelve el foco al lanzador.
8. **Medición.** El módulo del anfitrión empuja `gh_site_nav_opened`, `gh_site_nav_line_viewed` y
   `gh_site_nav_clicked` al `dataLayer`; GTM los envía a GA4. `site_nav_cta` no se empuja.

## Recovery Branches del host

| Situación | Comportamiento |
|---|---|
| Interruptor `off` | Todo el sitio con Ohio; sin assets de AXIS. |
| Página fuera del piloto | Ohio en esa página. |
| Documento inválido | Ohio + log; nunca una cabecera vacía. |
| Superficie del agendador ausente o clave inválida | Enlace a `/agenda/`. |
| Barra de admin (usuario logueado) | `--axis-site-nav-offset` toma el alto de la barra y toda la parte fija baja esa medida. |
| Plugin inactivo o error al renderizar | Ohio + log; el menú se prepara antes de imprimir nada. |
| Cambio del documento o del interruptor | Purga de Kinsta; el siguiente request pinta lo nuevo. |

## Focus and Navigation

Se hereda del flujo maestro. Lo propio del host:

- El enlace «Saltar al contenido» queda antes de la cabecera, si el tema lo tiene [verificar en Ohio].
- El foco tras cerrar el agendador vuelve al lanzador del punto de entrada que lo abrió.

## GVC Scenario Plan

- **Piloto:** la página elegida en 1440×900 y 390×844, con N1 → N8, agendar desde la cabecera y desde el onepage, y
  apagar y prender el interruptor.
- **En `on`:** Home, una landing con «Estás aquí», un post del blog, Glitch y 404, en 1440, 1366, 1180, 834 y 390.
- **Verificaciones:** HTML de servidor con enlaces (`curl` sin JS), sin scroll horizontal, eventos en `dataLayer` y
  Core Web Vitals sin regresión.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| El respaldo es Ohio | La navegación nunca desaparece por un error de datos o de despliegue. |
| Estado inicial por tipo de página | El vidrio necesita un fondo oscuro detrás; sobre páginas claras arranca sólido. |
| Superficie del agendador propia del encabezado | Medición separada de las landings y una allowlist que cubre todo el sitio. |
| La aislación de estilos vive en AXIS, no en el tema | El piloto mostró estilos de Ohio dentro del menú (hover rojo, cierre rojo, filas 4 px más altas). Corregirlo en el tema habría sido una copia de valores; AXIS primitives 0.7.8 da a cada regla peso de id y restablece lo que un tema aplica a todo, con una prueba que inyecta una hoja hostil. |
| El adaptador carga las fuentes del menú | Cada página de Ohio carga un juego distinto (la home no tiene Bricolage ni Poppins 300). Se pide el juego del Lab sin el eje de ancho, que el menú no usa: así el archivo de Bricolage es el que ya cargan las landings. |
| `site_nav_cta` no se empuja | El clic ya viaja en `gh_site_nav_clicked` y el agendador emite `greenhouse_cta_*`; un tercer evento contaría dos veces y reviviría `gh_cta_clicked`. |
