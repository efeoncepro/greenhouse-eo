# TASK-2043 — Dock inferior de las landings: flujo

> Nodo **D1–D4** del flujo maestro [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> El dock es el segundo cromo del sitio después del menú: convive con él, se retira cuando el menú se abre y comparte su
> vidrio y su agendador. Wireframe: [`TASK-2043-landing-dock.md`](../wireframes/TASK-2043-landing-dock.md).

## Flow Goal

Que una persona que lee una landing tenga siempre a mano el siguiente paso de esa landing (agendar o ir al
formulario) sin que el dock tape el hero, el formulario, el menú abierto ni el banner de cookies.

## Nodos

| Nodo | Qué pasa | Qué hace el primitive | Qué hace el sitio |
|---|---|---|---|
| D1 · Hero | La persona llega y lee el hero. | Dock oculto, fuera del orden de tabulación. | Marca el hero con `data-landing-dock-start`. |
| D2 · Lectura | Baja más allá de la mitad del hero. | Sube el dock en el tono de lo que tiene detrás; emite `landing_dock_view` una vez. | Declara el tono de secciones ambiguas con `data-site-nav-tone`. |
| D3 · Agendar | Pulsa la acción principal de agendar. | Emite `landing_dock_click` y `axis-landing-dock:cta` (cancelable) con `location: landing_dock`. | Cancela el evento y abre el diálogo del agendador nativo desde un `<greenhouse-cta cta-location="landing_dock">` oculto; al cerrar, el foco vuelve al botón del dock. |
| D3' · Ir al formulario | Pulsa la acción secundaria o un enlace. | Emite `landing_dock_click`; el enlace navega solo. | — |
| D4 · Final | Llega al formulario o al CTA final. | Se retira (120 px antes). | Marca el formulario y el CTA final con `data-landing-dock-end`. |
| N2/N5 del menú | Abre un mega o el onepage. | Se retira mientras estén abiertos y vuelve al cerrarlos. | — |

## Recovery Branches

| Situación | Comportamiento |
|---|---|
| JavaScript no carga | El dock queda visible y fijo; cada acción es un enlace (el agendador va a su respaldo). |
| Superficie del agendador ausente o vacía | El botón sigue su enlace de respaldo de la landing. |
| Renderer lento | Se espera hasta 2,5 s; si no llega, el enlace de respaldo. |
| Banner de cookies visible | El dock espera a que se cierre. |
| Documento inválido | El port PHP no pinta nada y registra el error; la landing queda sin dock, nunca con el viejo y el nuevo a la vez. |

## Focus and Navigation

- `aside` con nombre accesible; enlaces nativos. Oculto, `visibility:hidden` lo saca del orden y del lector.
- El agendador es un diálogo modal del renderer; al cerrarlo, el foco vuelve al botón que lo abrió (o a uno visible).
- Foco visible con el halo del menú (`#72ded8` en oscuro, `#0375db` en claro).

## GVC Scenario Plan

Lab: D1 → D2 (tono claro, navy y foto) → D3 (intención registrada) → D3' → D4, con el mega y el onepage, con banner de
cookies, a 1440 y 390. Sitio: la misma secuencia en las siete landings reales, más el diálogo del agendador abierto
desde el dock con `cta-location="landing_dock"`.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| El dock no abre el agendador | Igual que el menú: cada sitio tiene su superficie y su clave. |
| Se retira con el menú abierto | Dos superficies flotantes de vidrio compitiendo; el menú manda. |
| Espera al banner de cookies | El consentimiento va primero y el dock no debe taparlo. |
| `cta-location="landing_dock"` en todas | Mide el dock aparte del menú y del CTA propio de cada landing. |
