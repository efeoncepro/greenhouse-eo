# TASK-2040 — Navegación global: flujo del mecanismo

> Nodo del flujo maestro [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](EPIC-055-public-site-global-navigation-UI-FLOW.md).
> Esta task implementa en AXIS los nodos **N1 a N8** (cabecera, paneles, onepage, scroll y el hueco del agendador) como
> comportamiento del primitive `efeonce.site-nav`. Los nodos de edición (E1 a E3) son de `TASK-2041`, y el montaje en
> WordPress, de `TASK-2042`.

## Flow Goal

Que el primitive, recibiendo un documento `site-nav.v1` válido, reproduzca el flujo maestro completo en cualquier
sitio, sin conocer el sitio ni pedir datos a la red.

## Nodos que implementa

| Nodo | Qué hace el primitive | Qué entrega al sitio |
|---|---|---|
| N1 · Cabecera arriba | Pinta logo, hamburguesa, cápsula y el hueco del CTA en estado `top`. | Atributo de estado inicial (`top` o `fixed`) que el sitio elige por página. |
| N2 · Abrir panel | Intención de 150 ms, un panel a la vez, cambio sin espera, fondo atenuado. | Evento `site_nav_open`. |
| N3 · Explorar | Intención de 90 ms en líneas y servicios; cruce de fotos con espera de carga. | Evento `site_nav_line_view`. |
| N4 · Elegir destino | Navegación nativa del enlace y cierre del panel. | Evento `site_nav_click`. |
| N5 · Abrir onepage | Círculo desde la hamburguesa, bloqueo de scroll y cierre de cualquier mega abierto. | Evento `site_nav_open` (`panel: onepage`). |
| N6 · Recorrer onepage | Dos niveles, foco contenido y Esc o X para cerrar. | Evento `site_nav_click`. |
| N7 · Agendar | Al activar el hueco del CTA, cierra el panel y suelta el scroll **antes** de que el sitio abra el diálogo. | Evento de intención del CTA con `cta-location`; el diálogo lo abre el `<greenhouse-cta>` del sitio. |
| N8 · Scroll | Oculta la cabecera al bajar y la muestra fija al subir; cierra el panel abierto si el scroll se mueve más de 48 px (decidido en el Lab). | — |

## Recovery Branches del mecanismo

| Situación | Comportamiento del primitive |
|---|---|
| JS no carga | El HTML de servidor deja todos los destinos como enlaces; los disparadores apuntan a su página índice. |
| Foto que no carga | Mantiene la anterior o sólo texto; nunca una imagen rota. |
| Ventana cruza 1.181 px con un panel abierto | Cierra y lleva el foco al control visible. |
| Documento que no cumple el esquema | El render lanza un error tipado; el sitio decide el respaldo (en WordPress, Ohio). |

## Focus and Navigation

Se implementa exactamente §Focus and Navigation del flujo maestro: teclado, `aria-expanded` y `aria-controls`, diálogo
del onepage, `aria-current="page"` y contenido cerrado fuera del orden de tabulación.

## GVC Scenario Plan

Lab `/patterns/efeonce.site-nav/`: N1 → N2 → N3 → N4 (sin navegar, con evento verificado) → N5 → N6 → N7 (con un CTA
de prueba que registra la intención) → N8. Ocho viewports, mouse y tacto, con y sin movimiento reducido. Detalle en
`docs/ui/wireframes/TASK-2040-site-nav.md` §GVC Scenario Plan.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| El primitive no abre el agendador | Cada sitio tiene su superficie y su clave; el mecanismo sólo libera foco y scroll y avisa la intención. |
| El estado inicial de la cabecera lo elige el sitio | Depende del tipo de página (hero oscuro o fondo claro), que el primitive no conoce. |
| Error tipado ante documento inválido | El respaldo depende del sitio; el primitive no debe pintar un menú a medias. |
