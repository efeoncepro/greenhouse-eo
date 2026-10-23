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
| Agendador nativo | Diálogo `<efeonce-meeting-scheduler>` abierto por el `<greenhouse-cta>` oculto del menú | N7 |
| Editor (persona) | Admin del plugin «EO Navegación» (`TASK-2041`, pendiente de construir) | E1 |
| Agente u operador | `pnpm public-website:site-nav` (Greenhouse); por debajo, el servicio de guardado del plugin | E2 |
| Otro sitio (Think) | Lee la copia pública del documento | E3 |
| Visitante de una landing | Dock inferior de vidrio (`efeonce.landing-dock`, `TASK-2043`) | D1–D4 |

## Happy Path

1. **N1 · Cabecera arriba.** La cápsula, el logo, la hamburguesa y el agendador quedan sobre el hero, en vidrio. El
   estado inicial lo decide el anfitrión: sobre un hero oscuro arranca `top` en vidrio; en una página con el espaciador
   de Ohio o con hero claro arranca `fixed`, como isla clara sólida, para que el logo se lea (corrección del
   2026-10-23).
2. **N2 · Abrir un mega menú.** Al pasar el mouse por Soluciones (150 ms) o con clic, cae el panel y el fondo se atenúa.
   Desde otro panel abierto, el cambio es sin espera.
3. **N3 · Explorar.** Al pasar por una línea (90 ms de intención) cambian servicios, foto, respuesta y caso. Al pasar
   por un servicio cambia la columna derecha a ese servicio.
4. **N4 · Elegir destino.** Un clic en un servicio, caso o lectura navega a esa página. El menú se cierra y emite
   `site_nav_click`.
5. **N5 · Abrir el onepage.** La hamburguesa abre el menú completo en círculo y bloquea el scroll. Si había un mega
   abierto, se cierra antes. El círculo crece hasta la esquina más lejana de la ventana, calculada al abrir y al cambiar
   de tamaño (`150vmax` sin JS; AXIS primitives 0.7.10), así que ninguna esquina queda sin cubrir en pantallas
   anchas.
6. **N6 · Recorrer el onepage.** Ítems, líneas y servicios, con hijos en Recursos y Nosotros. Al elegir un destino,
   navega y cierra.
7. **N7 · Agendar.** «Agenda tu diagnóstico», en la cabecera, la franja del mega o el pie del onepage (en vivo desde
   el 2026-10-23):
   1. el menú registra el clic en `gh_site_nav_clicked` con `target_type: cta` y el punto de entrada en `target`
      (`menu_header`, `menu_mega` o `menu_onepage`);
   2. cierra el panel abierto y suelta el bloqueo de scroll;
   3. el `<greenhouse-cta>` oculto de la página (uno solo, con `cta_location: site_nav`) abre el diálogo del agendador.
      Si el renderer todavía no cargó, el clic espera hasta 2,5 s;
   4. el diálogo usa la piel del sitio (`data-eo-meeting-skin="site"`): sin contenedor, el agendador flotando sobre la
      página difuminada y un solo botón redondo para cerrar;
   5. Escape o el botón cierran, y el foco vuelve al control que lo abrió o, si ya no se ve, a uno visible.
8. **Scroll.** Al bajar, la cabecera se oculta (estado «Bajando»). Al subir, vuelve como isla de vidrio flotante
   (estado «Subiendo»), en tono oscuro o claro según lo que tiene debajo, y cambia de tono al cruzar de una sección a
   otra. El tono sale de `data-site-nav-tone` o del fondo (degradados por sus paradas opacas, fotos como oscuras), se
   salta el chrome fijo del sitio y se conserva mientras el agendador está abierto (AXIS primitives 0.7.13; regla
   completa en la arquitectura §Isla de vidrio). Si hay un panel abierto y el scroll se mueve más de 48 px, se cierra (decidido en el Lab, `TASK-2040`).

9. **D1–D4 · Dock de la landing** (`TASK-2043`, flujo en [`TASK-2043-landing-dock-flow.md`](TASK-2043-landing-dock-flow.md)).
   En una landing, el dock de vidrio sube tras el hero con el siguiente paso de esa landing, se retira cerca del
   formulario o del CTA final, mientras el banner de cookies está a la vista y **siempre que un mega o el onepage estén
   abiertos** (el menú manda). Su botón de agendar abre el mismo agendador nativo con `cta-location="landing_dock"`.

## Recovery Branches

| Situación | Comportamiento |
|---|---|
| Salir del panel con el mouse | Cierra 300 ms después. Volver antes lo mantiene abierto. |
| Clic fuera o Esc | Cierra y devuelve el foco al disparador. |
| Ventana cruza 1.181 px con un menú abierto | Se cierra y el foco va al botón visible: cápsula o hamburguesa. |
| Foto que no carga | Se mantiene la anterior o sólo texto. Nunca un hueco. |
| Datos dinámicos de Recursos que fallan | Se muestra el destacado fijo del documento. |
| Agendador sin JavaScript o sin superficie | El botón es un enlace a `/agenda/`. |
| Lanzador vacío (`data-ghc-state="empty"`: CTA pausado, origen equivocado) | El enlace va de inmediato a `/agenda/`. |
| Renderer del agendador todavía cargando | El clic espera hasta 2,5 s a que esté listo. |
| Agendador abierto sobre la página | La isla conserva su tono detrás del diálogo y al cerrarlo (la página queda inerte; AXIS primitives 0.7.13). |
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

- **E1 · Editor (pendiente).** Abre «EO Navegación» en el admin, edita y guarda. El plugin valida contra `site-nav.v1`, crea una
  revisión con autor y fecha, publica la copia y el sitio pinta el documento nuevo en el siguiente request (tras la
  purga de caché que corresponda).
- **E2 · Agente u operador** con `pnpm public-website:site-nav` (forma vigente de cambiar el menú; primer uso real:
  revisión 4):
  1. `pull` trae el documento vivo como base.
  2. `set`, `add`, `move`, `remove`, `patch`, `glyph` o `photo` lo cambian por selectores.
  3. `check`, `fit`, `diff` y `preview` lo revisan: validador del plugin, enlaces y fotos que respondan, textos que
     caben y capturas de escritorio y teléfono.
  4. `apply --message` hace un ensayo en el servidor y guarda contra la revisión base; un guardado concurrente nunca se
     pisa. Purga.
  5. `verify` revisa el menú publicado.

  Las escrituras en producción necesitan el go del operador. Por debajo están los comandos del plugin (`wp eo-nav
  export|validate|apply|revisions|restore`), el mismo command de guardado que usará el admin. Si falla la validación,
  no cambia nada.
- **E3 · Otro sitio.** Lee `GET /wp-json/eo/v1/site-nav` con `ETag` y pinta con su adaptador y su propia superficie
  de agendador.
- **Vuelta atrás del documento:** `site-nav restore <n> --message` (o `wp eo-nav restore`, o «Restaurar» en el admin
  cuando exista). Crea una revisión nueva; nunca borra historia.
- **Vuelta atrás del menú completo:** el interruptor en `off` devuelve el encabezado de Ohio.

## Measurement

| Evento del primitive | En el `dataLayer` de efeoncepro.com | Dónde |
|---|---|---|
| `site_nav_open` (`panel`) | `gh_site_nav_opened` | N2, N5 |
| `site_nav_line_view` (`line`) | `gh_site_nav_line_viewed` | N3 |
| `site_nav_click` (`target_type`, `target`) | `gh_site_nav_clicked` | N4, N6, N7 |
| `site_nav_cta` (`cta_location`) | No se empuja | N7 |

Sin PII. Los nombres del sitio siguen la convención `gh_<objeto>_<acción>` en pasado (`TASK-2042`, 2026-10-22). El
clic en «Agenda tu diagnóstico» ya viaja como `gh_site_nav_clicked` con `target_type: cta` y el punto de entrada en
`target` (`menu_header`, `menu_mega` o `menu_onepage`); el agendador que abre emite su propia familia
`greenhouse_cta_*`. Por eso `site_nav_cta` no se empuja: contaría el clic dos veces y reviviría el rail legado
`gh_cta_clicked`.

## GVC Scenario Plan

- **AXIS** (`TASK-2040`): Lab `/patterns/efeonce.site-nav/`, pasos N1→N8 en los ocho viewports de la nota «Cómo se
  construye», con mouse y con tacto.
- **WordPress** (`TASK-2042`): el piloto de una página se omitió por decisión del operador y el menú pasó a `on` el
  2026-10-23. Barrido: 52 páginas publicadas y 3 posts de Glitch en 1440 y 390 (`/blog/` conserva Ohio). La sesión de
  fidelidad midió 1440, 1280, 1200, 1024, 834 y 390; el círculo del onepage en 1440, 1680, 1920, 2000 y 2560; y «Estás
  aquí» en 10 páginas de servicio.
- **Verificaciones comunes:** sin scroll horizontal; foco visible y devuelto; agendador que abre y devuelve el foco;
  eventos en `dataLayer`. Siempre en un navegador en primer plano (Playwright headless sirve): un panel de navegador
  oculto corre la página en segundo plano, sin `requestAnimationFrame` ni eventos de scroll, y el tono de la isla no se
  actualiza.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Un flujo para dos tasks | El mecanismo (`TASK-2040`) y su puesta en el sitio (`TASK-2042`) describen la misma experiencia; dos flujos divergirían. |
| Cerrar el panel antes de abrir el agendador | Los dos atrapan el foco y bloquean el scroll; abrirlos juntos deja el foco perdido al cerrar. |
| Un solo lanzador oculto con `cta_location: site_nav` | El renderer lee `cta-location` al montar, no al hacer clic; el punto de entrada viaja en `gh_site_nav_clicked`. |
| Radio del onepage calculado en JS | Un radio fijo (1720 px, la medida del tablero de 1440) dejaba una esquina sin cubrir sobre unos 1.500 px de ancho. |
| Hero claro arranca como isla clara | Sobre un hero claro la barra de vidrio deja el logo blanco ilegible. |
| El tono de la isla lee el fondo, no sólo marcas | efeoncepro.com no marca sus secciones; un degradado navy (franja E-E-A-T de `/servicios/posicionamiento-seo/`) dejaba la isla clara antes de 0.7.12. |
| El tono se conserva con un diálogo modal | Un anfitrión que pinta `<html>` volvía clara la isla detrás del agendador y al cerrarlo (0.7.13; misma guarda que el dock). |
| Disparadores con destino real sin JavaScript | Los destinos existen para buscadores y lectores aunque falle el JS (PDR-027, invariante SEO). |
| Edición de personas y agentes sobre el mismo command | Full API Parity: dos clientes del mismo primitive, nunca dos implementaciones. |
