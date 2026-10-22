# EPIC-055 — Navegación global del sitio: flujo maestro

> Flujo de programa de [EPIC-055](../../epics/in-progress/EPIC-055-public-site-global-navigation.md). Lo usan `TASK-2040`
> (mecanismo) y `TASK-2042` (puesta en el sitio).
>
> - Fuente: notas «Cómo se comporta», «Accesible y medible», «Movimiento», «Cómo se construye» y «Agendar desde el menú»
>   del canvas [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj)
>   (versión 67).
> - Arquitectura: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).

## Flow Goal

Que una persona llegue a cualquier página del sitio y encuentre en uno o dos pasos el servicio, el recurso o la acción
que busca:

- explorar una línea en el mega menú;
- recorrer todo el sitio en el onepage;
- agendar un diagnóstico sin salir de la página.

El menú se comporta igual en `efeoncepro.com` y en cualquier sitio que lo adopte.

## Actors and Surfaces

| Actor | Superficie | Nodo de este flujo |
|---|---|---|
| Visitante (mouse) | Cabecera, mega menús, desplegable, onepage | N1–N6 |
| Visitante (teclado o lector) | Las mismas, con roles ARIA y foco | N1–N6 |
| Visitante (tacto) | Hamburguesa y onepage bajo 1.181 px; el toque reemplaza al hover | N1, N5, N6 |
| Agendador nativo | Diálogo `<efeonce-meeting-scheduler>` abierto por `<greenhouse-cta>` | N7 |
| Editor (persona) | Admin del plugin «EO Navegación» (`TASK-2041`) | E1 |
| Agente | `wp eo-nav` por `pnpm public-website:wpcli` (`TASK-2041`) | E2 |
| Otro sitio (Think) | Lee la copia pública del documento | E3 |

## Happy Path

1. **N1 · Cabecera arriba.** La cápsula, el logo, la hamburguesa y el agendador quedan sobre el hero, en vidrio.
2. **N2 · Abrir un mega menú.** Al pasar el mouse por Soluciones (150 ms) o con clic, cae el panel y el fondo se atenúa.
   Desde otro panel abierto, el cambio es sin espera.
3. **N3 · Explorar.** Al pasar por una línea (90 ms de intención) cambian servicios, foto, respuesta y caso. Al pasar
   por un servicio cambia la columna derecha a ese servicio.
4. **N4 · Elegir destino.** Un clic en un servicio, caso o lectura navega a esa página. El menú se cierra y emite
   `site_nav_click`.
5. **N5 · Abrir el onepage.** La hamburguesa abre el menú completo en círculo y bloquea el scroll. Si había un mega
   abierto, se cierra antes.
6. **N6 · Recorrer el onepage.** Ítems, líneas y servicios, con hijos en Recursos y Nosotros. Al elegir un destino,
   navega y cierra.
7. **N7 · Agendar.** «Agenda tu diagnóstico», en la cabecera, la franja del mega o el pie del onepage:
   1. cierra el panel abierto y suelta el bloqueo de scroll;
   2. abre el diálogo del agendador con su `cta-location` (`menu_header`, `menu_mega` o `menu_onepage`);
   3. al cerrar el diálogo, el foco vuelve al lanzador.
8. **Scroll.** Al bajar, la cabecera se oculta (estado «Bajando»). Al subir, vuelve como isla de vidrio flotante
   (estado «Subiendo»), en tono oscuro o claro según la sección que tiene debajo, y cambia de tono al cruzar de una
   sección a otra. Si hay un panel abierto y el scroll se mueve más de 48 px, se cierra (decidido en el Lab, `TASK-2040`).

## Recovery Branches

| Situación | Comportamiento |
|---|---|
| Salir del panel con el mouse | Cierra 300 ms después. Volver antes lo mantiene abierto. |
| Clic fuera o Esc | Cierra y devuelve el foco al disparador. |
| Ventana cruza 1.181 px con un menú abierto | Se cierra y el foco va al botón visible: cápsula o hamburguesa. |
| Foto que no carga | Se mantiene la anterior o sólo texto. Nunca un hueco. |
| Datos dinámicos de Recursos que fallan | Se muestra el destacado fijo del documento. |
| Agendador sin JavaScript o sin superficie | El botón es un enlace a `/agenda/`. |
| JavaScript del menú que falla | La cápsula y el onepage siguen siendo enlaces en el HTML: el sitio navega igual, sin paneles. |
| Documento del menú inválido o ausente (en el sitio) | El adaptador no pinta el menú nuevo y deja el encabezado de Ohio (`TASK-2042`). |

## Focus and Navigation

- **Disparadores con `aria-expanded` y `aria-controls`.**
  - Teclado: Tab llega al disparador; Enter o ↓ abre; ↑ ↓ recorren las líneas; → entra a los servicios; ← vuelve a
    las líneas; Esc cierra y vuelve al disparador.
- **Onepage como diálogo** (`role="dialog"`, `aria-modal="true"`).
  - El foco entra al primer ítem y queda contenido dentro del diálogo.
  - Esc o la X cierran y devuelven el foco a la hamburguesa.
- **Contenido cerrado:** `aria-hidden="true"` y `tabindex="-1"` en sus enlaces.
- **Un solo panel abierto a la vez.** El mega y el onepage nunca coexisten.
- **Enlaces de la página actual:** `aria-current="page"`. La marca «estás aquí» es visual y su texto es legible por
  lector de pantalla.

## Editing Flow

- **E1 · Editor.** Abre «EO Navegación» en el admin, edita y guarda. El plugin valida contra `site-nav.v1`, crea una
  revisión con autor y fecha, publica la copia y el sitio pinta el documento nuevo en el siguiente request (tras la
  purga de caché que corresponda).
- **E2 · Agente.**
  1. Exporta el documento con `wp eo-nav export`.
  2. Lo modifica y lo valida con `wp eo-nav validate --file`.
  3. Lo aplica con `wp eo-nav apply --file --message`.

  Es el mismo command de guardado que usa el admin. Si falla la validación, no cambia nada.
- **E3 · Otro sitio.** Lee `GET /wp-json/eo/v1/site-nav` con `ETag` y pinta con su adaptador y su propia superficie
  de agendador.
- **Vuelta atrás:** `wp eo-nav restore <revisión>` o «Restaurar» en el historial del admin. Crea una revisión nueva;
  nunca borra historia.

## Measurement

| Evento | Dónde |
|---|---|
| `site_nav_open` (`panel`) | N2, N5 |
| `site_nav_line_view` (`line`) | N3 |
| `site_nav_click` (`target_type`, `target`) | N4, N6, N7 |

Sin PII. Los nombres finales se cierran en `TASK-2042` con la skill de medición.

## GVC Scenario Plan

- **AXIS** (`TASK-2040`): Lab `/patterns/efeonce.site-nav/`, pasos N1→N8 en los ocho viewports de la nota «Cómo se
  construye», con mouse y con tacto.
- **WordPress** (`TASK-2042`): página piloto y, al pasar a `on`, Home, una landing con «Estás aquí», un post del blog,
  Glitch y 404. Desktop 1440 y 390.
- **Verificaciones comunes:** sin scroll horizontal; foco visible y devuelto; agendador que abre y devuelve el foco;
  eventos en `dataLayer`.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Un flujo para dos tasks | El mecanismo (`TASK-2040`) y su puesta en el sitio (`TASK-2042`) describen la misma experiencia; dos flujos divergirían. |
| Cerrar el panel antes de abrir el agendador | Los dos atrapan el foco y bloquean el scroll; abrirlos juntos deja el foco perdido al cerrar. |
| Disparadores con destino real sin JavaScript | Los destinos existen para buscadores y lectores aunque falle el JS (PDR-027, invariante SEO). |
| Edición de personas y agentes sobre el mismo command | Full API Parity: dos clientes del mismo primitive, nunca dos implementaciones. |
