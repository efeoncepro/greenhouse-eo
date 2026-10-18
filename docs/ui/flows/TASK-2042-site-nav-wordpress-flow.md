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
3. **Estado inicial.** Elige `top` en páginas con hero oscuro a sangre y `fixed` en blog, post, 404, archivo y páginas
   claras. Aplica el inventario de variantes de Ohio.
4. **Contexto.** Resuelve «Estás aquí» con `context.matchers` contra la ruta actual.
5. **Datos dinámicos.** Resuelve el centro y el destacado de Recursos desde WordPress o Think, con caché corta. Si
   falla, usa el destacado fijo.
6. **Render.** Pinta el HTML del primitive; encola el CSS y el JS de AXIS con versión fijada y el renderer de Growth CTA.
7. **Agendador (N7).** El hueco del CTA se llena con `<greenhouse-cta>` de la superficie del encabezado global, con
   `cta-location` `menu_header`, `menu_mega` o `menu_onepage`.
   - El primitive cierra el panel y suelta el scroll.
   - El renderer abre el diálogo con la piel compartida y devuelve el foco al lanzador.
8. **Medición.** Los eventos del primitive pasan al `dataLayer`; GTM los envía a GA4.

## Recovery Branches del host

| Situación | Comportamiento |
|---|---|
| Interruptor `off` | Todo el sitio con Ohio; sin assets de AXIS. |
| Página fuera del piloto | Ohio en esa página. |
| Documento inválido | Ohio + log; nunca una cabecera vacía. |
| Superficie del agendador ausente o clave inválida | Enlace a `/agenda/`. |
| Barra de admin (usuario logueado) | La cabecera fija se desplaza bajo la barra. |
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
