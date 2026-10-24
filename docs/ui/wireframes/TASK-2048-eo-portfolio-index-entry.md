# TASK-2048 — EO Portfolio: portada y entrada (wireframe)

> Contrato visual y de datos de `/portafolio/` y `/portafolio/<slug>/` en `efeoncepro.com`. Nodos P1–P6 y E1–E11 del
> flujo maestro [`EPIC-056-eo-portfolio-UI-FLOW.md`](../flows/EPIC-056-eo-portfolio-UI-FLOW.md).
>
> - Decisión: [PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md).
> - Datos: documento del proyecto de `TASK-2047`. Los nombres de campo de este wireframe son los de trabajo; los
>   definitivos los fija el esquema `portfolio-entry.v1` de `TASK-2047` [verificar al tomar la task].
> - Visual direction mode: `source-led`
> - Product Design asset: canvas «Portafolio Efeonce — concepto», página «EO Portfolio»,
>   [claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm) (versión 13 al
>   2026-10-23), artboards `Portada.dc.html` y `Entrada.dc.html`. **Falta una copia durable en el repo** (export PNG por
>   artboard en `docs/ui/visual-directions/`) y la aprobación del operador; por eso `UI ready` sigue en `no`.

## Desktop Target

Página fluida, contenedor de 1440 px con margen lateral `clamp(16px, 5.5vw, 80px)`, fondo `ground` oscuro de La órbita.
La cabecera es el menú global (`efeonce.site-nav`, EPIC-055) en vidrio sobre el hero; la plantilla no pinta cabecera
propia.

**Portada `/portafolio/`**

| Región | Contenido | Datos |
|---|---|---|
| P1 · Hero con lente (mín. 880 px de alto) | Video destacado a sangre, en gris y navy (filtro gris + multiplicación navy al 80 %); arriba a la derecha, la lente: ventana circular con el mismo spot a color encuadrado en su sujeto, con su órbita (anillo, arco corto arriba a la izquierda y esfera en la punta, acento Growth). Abajo a la izquierda: eyebrow, H1, bajada y dos CTA. Abajo a la derecha: «TRABAJAMOS CON» + logos en blanco. | `hero.featuredProject` (el más reciente con video si no se elige), `hero.lensFocus {x, y}` del medio, logos de los proyectos con alcance `logo` |
| P2 · Índice | H2 «Proyectos con nombre y apellido» con la esfera; filtros de línea a la derecha. Lista numerada (`ol`) con una fila por proyecto. | proyectos publicados en orden editorial |
| P3 · Fila cerrada | Número · cliente en Bricolage grande (peso 420, tinta al 72 %) · título del proyecto · línea y servicio, para quién, periodo y formatos · tres miniaturas en su proporción. | `client.name`, `title`, `line`, `services`, `audience`, `period.label`, `formatsLabel`, primeras piezas |
| P4 · Fila abierta | Cliente en peso 760 y blanco; galería justificada con las piezas en proporción real (video corre, imagen fija) y etiqueta de formato; resumen y CTA. | `chapters[].media[]` (hasta 4), `summary`, `links.blogCase` |
| P5 · Cierre | Pregunta «¿Y ahora qué sigue?» con anillo, respuesta «Empecemos» con esfera; botón «Agenda tu diagnóstico». | fijo |

**Entrada `/portafolio/<slug>/`**

| Región | Contenido | Datos |
|---|---|---|
| E1 · Apertura | Columna izquierda: breadcrumb, logo del cliente, H1 con peso partido y esfera en el acento de la línea, bajada, etiquetas. Columna derecha (720 px de alto): composición de formatos nativos, un 9:16 a la derecha a todo el alto, un 4:5 abajo a la izquierda y un 1:1 arriba a la izquierda. | `client.logo` (alcance `logo`), `title` + `titleLead`, `summary`, `industry`, `services`, `hero.composition[]` |
| E2 · Banda del spot | Video 16:9 a sangre (máx. 860 px de alto); bajo él, pie con nombre y duración, y «Ver con sonido». | `hero.spot` |
| E3 · Ficha | `dl` en grilla de hasta cuatro columnas: Cliente, Para quién, Qué necesitaba, Línea y servicio, Periodo, Entregables, Formatos, Equipo. | `client`, `audience`, `need`, `line`, `services`, `period`, `deliverables`, formatos derivados, `teamSummary` |
| E4 · Del brief a la pieza | H2 con esfera; tres pasos: 01 · EL RETO, 02 · LA IDEA, 03 · CÓMO FUNCIONA, cada uno con título en Bricolage y párrafo. | `story.challenge`, `story.idea`, `story.execution` |
| E5 · Lo que pasó. | Órbita de medida con la cifra al centro (sólo si hay un porcentaje con fuente) + H2 «Lo que pasó.» con punto tipeado + grilla de cifras + línea de fuente. | `metrics[]` (alcance `metrics`), `metrics[].source` |
| E6 · Las campañas | H2 con esfera; un capítulo por campaña: nombre y nota, galería justificada con pie por pieza. | `chapters[]` |
| E7 · Testimonio | Cita en Bricolage 500 y firma. | `testimonial` (alcance `testimonial`) |
| E8 · Créditos | Tres columnas: EQUIPO, SERVICIOS EN ESTE PROYECTO, EL CASO COMPLETO. | `credits[]`, `services`, `links.blogCase[]`, `links.experience` |
| E9 · Cierre de voz | «¿Conversamos?» con anillo + «Cuando quieras» con esfera; botón «Agenda tu diagnóstico» en el acento de la línea. | fijo |
| E10 · Siguiente proyecto | Imagen a sangre de 560 px y «SIGUIENTE PROYECTO» + cliente y título. | proyecto siguiente en orden editorial |
| E11 · Pie | Pie global del sitio. | — |

## Mobile Target

Viewport de 390 px, sin scroll horizontal de página.

- **P1:** la lente sube (centro en 60 %, 27 %) con radio de 33vw y muestra el **póster** del video, no una segunda
  decodificación; el texto empieza bajo la lente (padding superior 440 px); logos envuelven en dos filas.
- **P2–P4:** los filtros envuelven; cada fila apila número, cliente, metadatos y miniaturas; la fila abierta muestra la
  galería en una o dos columnas (mínimo 120 px por pieza) y el CTA a ancho completo.
- **E1:** la composición de formatos pasa debajo del texto, con alto de 480 px [verificar en GVC]; el 9:16 conserva su
  proporción.
- **E3, E4, E8:** una columna. **E5:** la órbita arriba (mín. 260 px), cifras en dos columnas. **E6:** galerías en dos
  columnas; el 3:1 a ancho completo.
- Toques de al menos 44 px en filtros, botones de fila, controles del reproductor y enlaces.

## Action Hierarchy

1. **Portada:** «Ver los proyectos» (relleno, acento Growth) baja al índice; «Ver el proyecto de [cliente destacado]»
   (contorno) entra al proyecto de la lente. En cada fila abierta: «Ver el proyecto →» (relleno blanco) o «Leer el caso
   en el blog →» cuando el proyecto no tiene piezas. Al cierre: «Agenda tu diagnóstico» (relleno, acento Growth) abre el
   agendador del menú global.
2. **Entrada:** «Agenda tu diagnóstico» en el cierre de voz (relleno, acento de la línea, texto `ground`); «Ver con
   sonido» (contorno) en la banda del spot; enlaces de servicios y del caso completo; el siguiente proyecto como enlace
   grande al final.
3. Nunca dos botones de relleno en la misma región.

## Visual Fidelity Mapping

| Elemento del canvas | Token / fuente en el sitio |
|---|---|
| Fondo `#001a33` | `ground` (oscuro) de La órbita |
| Texto de apoyo `#cfe4fa` | `ink-soft` |
| Acento Growth `#36c8bf` (portada) | `accent-growth` oscuro |
| Acento Brand `#ff6500` (entrada de Sky) | `accent-brand` oscuro; cambia con `line` del proyecto |
| Anillo de la lente al 28 % | `lens-ring` |
| Navy apagado fuera de la lente al 80 % | `lens-outside` |
| Esfera del titular de 0,2 em | `sphere-diameter` |
| Bricolage 780/740/620 y Poppins 300–600 | estilos `ideaImpact`, `ideaShort`, `ideaMedium`, `question`, `structureLabel` de AXIS |
| Duraciones y curvas | `ease-emphasized`, `ease-standard`, duraciones de AXIS ([motion](../motion/TASK-2048-eo-portfolio-index-entry-motion.md)) |
| Reproductor | `efeonce.video-player`, skin `cinema`, `embedded`, línea del proyecto |

Ningún HEX del canvas se copia a la plantilla: todos salen de los tokens fijados en el vendor del plugin.

## Copy Ledger

Copy fijo de las plantillas (es-CL, tuteo; revisado con copywriting y UX writing el 2026-10-23):

| Id | Texto | Dónde |
|---|---|---|
| `index.eyebrow` | PORTAFOLIO | P1 (sin año: el portafolio es atemporal) |
| `index.h1` | Trabajo a la vista. | P1 (punto tipeado: la lente ya pone la esfera) |
| `index.lead` | Una pieza bonita no prueba nada. Por eso cada proyecto cuenta para quién era, qué tenía que resolver y qué pasó después. | P1 |
| `index.ctaPrimary` | Ver los proyectos | P1 |
| `index.ctaFeatured` | Ver el proyecto de {cliente} | P1 |
| `index.clientsLabel` | TRABAJAMOS CON | P1 |
| `index.h2` | Proyectos con nombre y apellido | P2 («Proyectos» en peso 330, resto 740, esfera) |
| `index.filterAll` | Todas | P2 |
| `index.filterAria` | Filtrar por línea de servicio | P2 |
| `index.rowCta` | Ver el proyecto → | P4 |
| `index.rowCtaBlog` | Leer el caso en el blog → | P4, proyecto sin piezas |
| `index.closeQuestion` | ¿Y ahora qué sigue? | P5 (par del deck, pendiente de aprobación para esta pieza) |
| `index.closeAnswer` | Empecemos | P5 |
| `cta.meeting` | Agenda tu diagnóstico | P5, E9 |
| `entry.breadcrumbRoot` | Portafolio | E1 |
| `entry.fichaLabel` | FICHA DEL PROYECTO | E3 |
| `entry.ficha.*` | CLIENTE · PARA QUIÉN · QUÉ NECESITABA · LÍNEA Y SERVICIO · PERIODO · ENTREGABLES · FORMATOS · EQUIPO | E3 |
| `entry.storyH2` | Del brief a la pieza | E4 («Del brief» en 330, esfera) |
| `entry.story.steps` | 01 · EL RETO · 02 · LA IDEA · 03 · CÓMO FUNCIONA | E4 |
| `entry.resultsH2` | Lo que pasó. | E5 |
| `entry.sourcePrefix` | Fuente: | E5 |
| `entry.chaptersH2` | Las campañas | E6 |
| `entry.credits.*` | EQUIPO · SERVICIOS EN ESTE PROYECTO · EL CASO COMPLETO | E8 |
| `entry.closeQuestion` | ¿Conversamos? | E9 (par aprobado de contraportada) |
| `entry.closeAnswer` | Cuando quieras | E9 |
| `entry.nextLabel` | SIGUIENTE PROYECTO | E10 |
| `video.withSound` | Ver con sonido | E2 |
| `video.pause` / `video.play` | Pausar video · Reproducir video | controles (aria-label) |
| `index.empty` | Pronto vas a ver aquí nuestros proyectos. | P2 vacío |

El texto de cada proyecto (título, bajada, ficha, pasos, cifras, notas de capítulo, cita) es dato del documento y pasa
por la revisión de copy al cargarlo (`TASK-2049`).

## State Copy

| Estado | Copy visible | Recuperación |
|---|---|---|
| ready | Portada y entrada completas con los datos publicados. | — |
| loading | Sin texto de carga: el HTML llega completo; cada video muestra su póster hasta reproducir. | El reproductor indica carga propia. |
| empty | Portada sin proyectos: hero sin lente + «Pronto vas a ver aquí nuestros proyectos.» + «Agenda tu diagnóstico». Filtro sin resultados: «No hay proyectos de esta línea todavía.» + enlace «Ver todos». | Enlace «Ver todos» quita el filtro. |
| partial | Proyecto sin video, cifras, testimonio o logo aprobado: la sección no aparece, sin mensaje. Video que no carga: queda el póster con «Reproducir video». | El resto de la página se sostiene. |
| error | Documento inválido: se sirve la última versión válida, sin mensaje al visitante; sin versión válida, el proyecto no se lista y su URL responde 404. | Log `[eo-portfolio]` para el operador. |
| denied | Proyecto no publicado o sin aprobación del cliente: 404 del sitio; la URL antigua `/project/<slug>/` redirige a `/portafolio/` (`TASK-2049`). | Enlace a la portada desde el 404. |

## Accessibility Contract

- Un H1 por página; jerarquía H2 por región y H3 por capítulo.
- Índice como `ol`; cada fila tiene un `button` con `aria-expanded` y `aria-controls` hacia su panel; Escape cierra y
  devuelve el foco al botón.
- Filtros como enlaces reales con `aria-current="page"` en el activo, dentro de un `nav` con
  `aria-label="Filtrar por línea de servicio"`.
- **WCAG 2.2.2:** todo video que se reproduce solo y dura más de 5 s tiene un control visible de pausa, alcanzable con
  Tab y con nombre accesible («Pausar video» / «Reproducir video»).
- Con `prefers-reduced-motion: reduce` ningún video arranca solo; se muestra el póster con «Reproducir video».
- Videos fuera de pantalla quedan en pausa (IntersectionObserver).
- Videos con voz llevan subtítulos VTT; el esquema de `TASK-2047` los exige.
- Toda imagen tiene `alt` del documento; las miniaturas decorativas de filas cerradas llevan `alt=""` y
  `aria-hidden="true"` porque la fila ya nombra el proyecto.
- Contraste: texto de apoyo `ink-soft` sobre `ground` ≥ 4,5:1; el acento nunca en texto menor de 24 px.
- Esferas y órbitas decorativas con `aria-hidden="true"`; la órbita de medida lleva `role="img"` y `aria-label` con la
  cifra y su etiqueta.
- Foco visible en todos los controles; objetivos de al menos 44 px.

## Implementation Mapping

- **Repo:** `efeonce-public-site-runtime`.
  - `wp-content/plugins/eo-portfolio/templates/archive-eo_project.php` y `single-eo_project.php` [verificar nombres],
    servidas por `template_include` cuando `eo_portfolio_enabled` es `on`.
  - `wp-content/plugins/eo-portfolio/assets/css/portfolio.css` y `assets/js/portfolio.js` [verificar].
  - Vendor de AXIS en versión fija (patrón `ohio-child/assets/vendor/axis/site-nav/0.7.13/` con `VERSION.json` y
    sha256).
  - Reproductor: `wp-content/plugins/eo-axis-video/` (`mount.js`, `video-player.js`, `video-player.css`,
    `host-compat.css`), con bundle regenerado a la versión fijada vigente; la plantilla usa el mismo camino de render que
    el bloque (`eo_axis_video_model`, `eo_axis_video_options`).
- **Datos:** servicio de lectura de `TASK-2047`, filtrado por estado publicado y alcance de aprobación. Las plantillas no
  consultan `post_meta` directo.
- **SEO:** JSON-LD `ItemList` (portada) y `CreativeWork` + `VideoObject` (entrada) desde el documento; título,
  descripción y OG por entrada vía Yoast o filtro propio [verificar convivencia con Yoast].
- **Agendador:** el CTA «Agenda tu diagnóstico» dispara el agendador nativo del menú global (evento `axis-site-nav:cta`
  o el `<greenhouse-cta>` del menú) [verificar API del host en `TASK-2042`].
- **Medición:** `gh_portfolio_filter`, `gh_portfolio_row_open`, `gh_portfolio_entry_view`, `gh_portfolio_video_play`
  al `dataLayer` [verificar nombres con la convención de GTM del sitio].

## GVC Scenario Plan

- **Superficie:** surface ID `public-site-portfolio`; baseline nueva (no hay baseline de la página actual que comparar;
  se guarda una captura de la versión de Ohio como antes).
- **Rutas:** `/portafolio/`, `/portafolio/?linea=brand`, entrada completa (Sky), mínima (PabellonToGo) y sólo texto
  (ANAM).
- **Viewports:** desktop 1440×900, 1280×800 y mobile 390×844.
- **Quality profile: premium.**
- **Pasos:** hero arriba → bajar al índice → filtrar Brand → abrir una fila con teclado → entrar → recorrer las secciones
  → pausar un video con teclado → siguiente proyecto.
- **Aserciones:** un H1; filtros y filas en el HTML sin JS; sin secciones vacías; cada video autoplay con pausa; con
  `prefers-reduced-motion` ningún video arranca solo; JSON-LD válido.
- **scroll-width:** `document.documentElement.scrollWidth <= innerWidth` en 1440 y 390.
- **Review dossier:** dossier de revisión con capturas por paso, adjunto a la task, más scorecard en
  `docs/ui/reviews/TASK-2048-eo-portfolio-index-entry.scorecard.json`.
- **Baseline decision:** se congela la baseline tras la aprobación visual del operador.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Índice con contexto en vez de galería | El operador pidió ver para quién y qué se hizo; una galería sólo muestra piezas. |
| Proporción derivada de las dimensiones reales | Resuelve video y formatos sin recortar, y no depende de una etiqueta escrita a mano. |
| Lente con póster en móvil | Evita dos decodificaciones de video en el teléfono. |
| Cada sección se oculta sin dato | El render no depende del cliente; los proyectos tienen formas distintas. |
| Órbita de medida sólo con porcentaje y fuente | La órbita mide un dato real o no existe (línea gráfica). |
| Filtros como enlaces | Rastreables y funcionales sin JavaScript. |
| Menú global en vez de cabecera propia | El menú de EPIC-055 ya está en todo el sitio. |
| Lente de la ronda 1 encuadrada en el sujeto | La primera versión recortaba el mismo cuadro del fondo y no se leía (comentario del operador, 2026-10-23). |
