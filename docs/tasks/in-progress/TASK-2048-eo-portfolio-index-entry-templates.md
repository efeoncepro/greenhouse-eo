# TASK-2048 — EO Portfolio: portada y entrada

## Delta 2026-10-30 — en producción (eo-portfolio v0.4.1)

- `EOP_Render` sirve `/portafolio/` y `/portafolio/<slug>/` con el menú y el pie del sitio, desde la proyección pública:
  hero con lente y órbita, cifras de la agencia con el muro de piezas, índice filtrable con filas que se abren,
  testimonio sólo si hay uno aprobado, entrada con ficha, reto/idea/ejecución, resultados sólo con cifras aprobadas,
  galería, equipo, caso completo, cierre y siguiente proyecto. JSON-LD, título, descripción, canónica y OG del
  documento. Interruptor `eo_portfolio_enabled` = `1` desde el 2026-10-30 (antes, vista previa con token).
- Runtime 4eccf0f + 7fbd94a; pruebas 219 puras y 18 de render en Playground; revisado en vivo a 1440 y 390.
- Pendiente para cerrar: reproducción de video con `eo-axis-video` (ningún proyecto publicado trae video; hoy un video
  se mostraría sólo como su póster) y el scorecard GVC del plan.

## Delta 2026-10-29 — tipos de proyecto y de pieza (eo-portfolio v0.3.0, local)

- El esquema distingue `kind` del proyecto (campaign, website, web-section, ugc, system, other) y `role` de cada pieza
  (campaign, web, section, ugc, in-situ, diagram, answer), con sus campos: `device`, `longCapture`, `liveUrl` (web);
  `sectionName`, `position` (section); `creator` {handle, platform, consentRef} (ugc). Alcance nuevo `creators`.
- La proyección ya entrega `kind`, `roles` en la tarjeta y por pieza `role` y sus campos; los videos de creador sólo
  con `pieces` + `creators`. Las plantillas de entrada web y UGC del canvas (`EntradaWeb`, `EntradaUGC`) leen eso.
- Runtime d583a97, sin desplegar: el paquete de esta task debe llevar v0.3.0. Fixture ficticio
  `tests/fixtures/portfolio/cordillera.json` cubre sitio, parte y creador.

## Delta 2026-10-29 — TASK-2047 cerrada

- El plugin `eo-portfolio` v0.2.0 está en producción sin proyectos. Lectura para las plantillas: `EOP_Store::served()` /
  `EOP_Store::published()` y la proyección `EOP_Projection::entry()` / `summary()` (con `format`, `formats`, `measure`,
  `cover`), en el servidor, no por la REST.
- Mientras nadie enganche `eo_portfolio_render_entry`, toda entrada responde 404 y queda fuera del sitemap: esta task
  enciende ambas cosas al engancharlo. La adivinanza de 404 ya está apagada bajo `/project/` y `/portafolio/`.
- Los videos viven sólo en el bucket público de AXIS (`schema/media-hosts.v1.json`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2048-eo-portfolio-index-entry.md`
- Flow: `docs/ui/flows/TASK-2048-eo-portfolio-index-entry-flow.md`
- Motion: `docs/ui/motion/TASK-2048-eo-portfolio-index-entry-motion.md`
- Backend impact: `none`
- Epic: `EPIC-056`
- Status real: `Portada y entrada en producción desde 2026-10-30 (v0.4.1); faltan reproducción de video y scorecard GVC`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; el codigo vive en efeonce-public-site-runtime con su contrato de rama y release acotado por SSH; sin worktrees`

## Summary

Construye las dos páginas visibles del portafolio: la portada `/portafolio/` (índice de proyectos con la lente sobre el
video de un proyecto) y la entrada `/portafolio/<slug>/` (ficha, reto, idea y ejecución, resultados con fuente, piezas
por capítulo en su formato real, testimonio, equipo y siguiente proyecto). Las dos se renderizan en el servidor desde el
documento de `TASK-2047`, sobre AXIS en versión fija y el reproductor `efeonce.video-player` mediante `eo-axis-video`.

## Why This Task Exists

Hoy `/portafolio/` es un slider de Ohio sin H1 que muestra 5 de 15 proyectos, abre un lightbox en vez de la entrada,
sólo muestra imágenes recortadas y no cuenta para quién se hizo cada trabajo ni qué pasó
([PDR-028](../../public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md) §Contexto). `TASK-2047` crea el
contenido estructurado; falta la superficie que lo muestre con video, formatos nativos y la línea gráfica La órbita, y
que cumpla accesibilidad (pausa de video) y SEO (H1, datos estructurados), que la página actual no cumple.

## Goal

- La portada lista todos los proyectos publicados con su contexto mínimo y vista previa de piezas en su proporción real.
- La entrada muestra el proyecto completo y cada sección desaparece si su dato no existe o no tiene aprobación.
- Todo video autoplay tiene pausa visible, respeta «reducir movimiento» y sólo corre en pantalla.
- La página sale detrás de un interruptor y vuelve a la versión anterior en un paso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md` (decisión, invariantes §3, medios §4,
  render §5)
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md` (AXIS en versión fija, encolado
  sólo donde se usa)
- `docs/public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md`
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md` (el menú global ya está en vivo; la
  plantilla no pinta cabecera propia)
- `docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md` §4.3 (el caso largo es canónico en el blog)
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (estado inicial de la isla sobre hero oscuro)
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` y la skill `efeonce-graphic-line` (lente, órbita de
  medida, esfera, un acento por página)

Reglas obligatorias:

- Ninguna plantilla decide por nombre de cliente o campaña: capítulos, foco de la lente, cifras y testimonio son datos
  del documento (PDR-028 §3.5).
- Una órbita por sección: la lente de la portada o la órbita de medida de la entrada; el titular de esa sección no suma
  otra esfera.
- Sin React en el sitio público; JavaScript liviano que sólo mejora (PDR-024, PDR-027).
- Valores de La órbita desde tokens de AXIS en versión fija, nunca HEX ni tiempos transcritos del canvas.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/public-site/LA_ORBITA_SITE_MIGRATION_PLAN_V1.md` §2 («terminado por página») y §Oleada 5
- `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-axis-video/README.md` (estado del bloque del
  reproductor)
- Skill `efeonce-public-site-wordpress` (carril SSH acotado, purga de Kinsta, Yoast)

## Dependencies & Impact

### Depends on

- `TASK-2047` — plugin `eo-portfolio`: tipo `eo_project`, documento validado, servicio de lectura y aprobación del
  cliente por alcance. Esta task sólo lee.
- `efeonce-public-site-runtime/wp-content/plugins/eo-axis-video/` — bundle del reproductor, hoy construido sobre AXIS
  primitives 0.6.5 y sin activar; se regenera con la versión fijada vigente antes de usarlo.
- Menú global de `EPIC-055` en producción (cabecera sobre hero oscuro).
- Canvas de diseño «Portafolio Efeonce — concepto», página «EO Portfolio»
  ([claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm)), con aprobación
  del operador pendiente (PDR-028, pendiente 1).

### Blocks / Impacts

- `TASK-2049` (migración y salida): necesita estas plantillas para publicar las entradas migradas.
- Home «Cases», pie «Casos de éxito» y la entrada «Portafolio» del menú global apuntan a `/portafolio/`.
- Página 247116 (`/portafolio/`, Elementor + widget `ohio_recent_projects`) queda reemplazada detrás del interruptor.

### Files owned

- `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/templates/` [verificar: la estructura final la fija
  `TASK-2047`]
- `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/assets/css/portfolio.css` [verificar]
- `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/assets/js/portfolio.js` [verificar]
- `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/assets/vendor/axis/` [verificar]
- `efeonce-public-site-runtime/wp-content/plugins/eo-axis-video/assets/` (bundle regenerado)
- `docs/ui/wireframes/TASK-2048-eo-portfolio-index-entry.md`
- `docs/ui/flows/TASK-2048-eo-portfolio-index-entry-flow.md`
- `docs/ui/motion/TASK-2048-eo-portfolio-index-entry-motion.md`
- `docs/ui/flows/EPIC-056-eo-portfolio-UI-FLOW.md`

## Current Repo State

### Already exists

- Diseño en canvas: artboards `Portada.dc.html` y `Entrada.dc.html` con piezas y videos reales de Sky, Berel, Gobierno
  de Santiago, Bresler y PabellonToGo, y el copy revisado con las skills de copywriting y UX writing (2026-10-23).
- `eo-axis-video` 0.2.0: bloque Gutenberg `efeonce/axis-video`, renderer `mount.js`, `video-player.js`,
  `video-player.css`, `host-compat.css` (README: no activado ni desplegado).
- Patrón de vendor de AXIS en versión fija: `wp-content/themes/ohio-child/assets/vendor/axis/site-nav/0.7.13/`.
- Menú global (`efeonce.site-nav`) en producción en todo el sitio salvo `/blog/`.

### Gap

- No existen plantillas de portada ni de entrada para `eo_project`.
- El reproductor no está activo ni actualizado.
- La página actual no tiene H1, `alt`, datos estructurados ni pausa de video.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/` (WordPress en Kinsta)
- Future candidate home: `public`
- Boundary: lector del documento de `TASK-2047` (servicio PHP del plugin); consumidores: plantilla de portada,
  plantilla de entrada, JSON-LD y etiquetas OG. Las plantillas no escriben.
- Server/browser split: el HTML completo (textos, enlaces, filtros, JSON-LD) sale del servidor; el navegador sólo
  mejora: reproducción en pantalla, pausa, expandir filas y la lente con video
- Build impact: assets de AXIS copiados con versión fijada; bundle de `eo-axis-video` regenerado con `--package-root`
- Extraction blocker: `none` — el JSON público de `TASK-2047` permite rehacer las plantillas en Astro sin migrar datos

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: gerente o directora de marketing que evalúa a Efeonce; llega desde el menú, la Home, el pie o un enlace
  directo a un proyecto
- Momento del flujo: comparación de agencias, antes de agendar un diagnóstico
- Resultado perceptible esperado: ver trabajo real en movimiento y entender para quién se hizo, qué resolvía y qué pasó
- Friccion que debe reducir: hoy sólo hay imágenes recortadas en un slider, sin contexto ni video
- No-goals UX: galería de imágenes sin narrativa, lightbox, carrusel automático, precios, buscador de texto

### Surface & system decision

- Surface: `/portafolio/` (portada) y `/portafolio/<slug>/` (entrada) en `efeoncepro.com`
- Nav placement: `none` — sitio público; el destino ya existe en el menú global («Portafolio») y no se agrega otro
- Composition Shell: `no aplica` — sitio público WordPress, no portal Greenhouse
- Primitive decision: `reuse` — `efeonce.video-player` (AXIS) por `eo-axis-video`, tokens y órbita de La órbita;
  `one-off` para la fila del índice y la galería justificada, candidatas a primitive de AXIS cuando exista un segundo
  consumidor
- Adaptive density / The Seam: `no aplica` — páginas fluidas; la galería se adapta por proporción, no por densidad
- Floating/Sidecar/Dialog decision: sin diálogos propios; el agendador nativo del menú global se reusa para «Agenda tu
  diagnóstico»
- Copy source: `local one-off` — los textos fijos viven en las plantillas del plugin (dominio de traducción del
  plugin); el contenido de cada proyecto es dato del documento. No aplica `src/lib/copy/*` (no es el portal)
- Access impact: `none` — páginas públicas; sólo se listan proyectos publicados con aprobación del cliente

### State inventory

- Default: proyectos publicados en orden editorial; la portada con el proyecto destacado en la lente
- Loading: HTML completo desde el servidor; los videos muestran su póster hasta que cargan
- Empty: sin proyectos publicados → la portada muestra el hero sin lente y «Pronto vas a ver aquí nuestros proyectos.»
  con el CTA al diagnóstico
- Error: documento inválido → se sirve la última versión válida; sin versión válida el proyecto no se lista (PDR-028 §3.6)
- Degraded / partial: proyecto sin video, sin cifras, sin testimonio o sin aprobación de logo → cada sección se oculta y
  el resto se sostiene (Sky completo, PabellonToGo mínimo, ANAM sólo texto)
- Permission denied: no aplica; un proyecto no publicado responde 404 y su URL antigua redirige (`TASK-2049`)
- Long content: títulos largos parten pesos en Bricolage; filas largas envuelven; capítulos con muchas piezas parten en
  varias filas justificadas
- Mobile / compact: a 390 la lente usa el póster, las filas del índice apilan, la galería pasa a una o dos columnas sin
  scroll horizontal de página
- Keyboard / focus: filtros, filas, controles de video y enlaces alcanzables con Tab y con foco visible
- Reduced motion: sin autoplay (sólo póster con botón «Reproducir»), sin animación de entrada de la lente ni de la órbita

### Interaction contract

- Primary interaction: abrir una fila del índice y entrar al proyecto
- Hover / focus / active: fila con fondo tenue; en escritorio, pasar el cursor abre la fila con vista previa (además del
  clic); siguiente proyecto escala la imagen
- Pending / disabled: no hay escrituras; los videos muestran estado de carga del reproductor
- Escape / click-away: Escape cierra la fila abierta y devuelve el foco a su botón
- Focus restore: tras filtrar, el foco va al primer resultado; tras cerrar una fila, a su botón
- Latency feedback: póster inmediato; el reproductor indica carga
- Toast / alert behavior: no hay avisos

### Motion & microinteractions

- Motion primitive: `CSS` (y el reproductor de AXIS)
- Enter / exit: la lente aparece con anillo, arco y esfera; la fila se abre y cierra con altura y opacidad
- Layout morph: ninguno
- Stagger: las piezas de una fila abierta entran una tras otra
- Timing / easing token: `ease-emphasized` para llegar, `ease-standard` para transformar, duraciones de AXIS
- Reduced-motion fallback: estado final sin animación y sin autoplay
- Non-goal motion: parallax, carruseles automáticos, scroll hijacking

### Implementation mapping

- Route / surface: archivo del tipo `eo_project` en `/portafolio/` y single en `/portafolio/<slug>/` (plantillas del
  plugin vía `template_include`)
- Primitive / variant / kind: `efeonce.video-player` skin `cinema`, presentación `embedded`; órbita de La órbita (lente y
  medida) desde tokens de AXIS
- Component candidates: hero con lente, fila del índice, galería justificada, ficha `dl`, pasos, cifras, capítulo,
  testimonio, cierre de voz, banda del siguiente proyecto
- Copy source: plantillas del plugin + documento del proyecto
- Data reader / command: servicio de lectura de `TASK-2047`; sin escrituras
- API parity: el mismo documento sale por el JSON público de `TASK-2047`; las plantillas no tienen lógica propia sobre él
- Access / capability: público; filtrado por estado publicado y alcance de aprobación
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: Playwright sobre staging o local de WordPress (nombre final en discovery); GVC del portal no aplica
- Route: `/portafolio/`, `/portafolio/<sky>/`, `/portafolio/<pabellontogo>/`, `/portafolio/<anam>/`
- Viewports: 1440×900, 1280×800 y 390×844
- Quality profile: `premium`
- Required steps: portada arriba → filtrar Brand → abrir fila → entrar → recorrer secciones → pausar un video →
  siguiente proyecto
- Required captures: un frame por paso y por proyecto de prueba
- Required `data-capture` markers: `eo-portfolio-hero`, `eo-portfolio-index`, `eo-portfolio-row-open`,
  `eo-portfolio-entry-hero`, `eo-portfolio-ficha`, `eo-portfolio-results`, `eo-portfolio-chapters`,
  `eo-portfolio-next`
- Assertions: un H1 por página; filtros presentes en el HTML de servidor; sin secciones vacías; pausa en cada video
  autoplay; JSON-LD válido
- Scroll-width checks: sin scroll horizontal de página en 1440 y 390
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` (sólo pósters) y recorrido con Tab
- Review dossier: adjunto a la task
- Baseline decision / surface ID: baseline nueva, `public-site-portfolio`

### Design decision log

- Decision: índice con contexto + entrada con ficha y capítulos, piezas en proporción real, render del servidor
- Alternatives considered: muro de formatos de la ronda 1 (bonito, sin contexto), slider de Ohio, una página de
  Elementor por proyecto
- Why this pattern: el operador pidió ver para quién y qué se hizo; la proporción real resuelve video y formatos
- Reuse / extend / new primitive: reuse del reproductor y la órbita; fila y galería son one-off con extracción posible
- Open risks: diseño sin aprobación final; el par «¿Y ahora qué sigue? Empecemos» viene del deck y fuera de su lámina
  necesita el visto bueno del operador

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: 1440×900, 1280×800 y 390×844
- Required captures: las del plan
- Required `data-capture` markers: los del plan
- Scroll-width check: 1440 y 390
- Accessibility/focus checks: pausa con teclado, foco en filas y filtros, `alt` en todas las imágenes
- Before/after evidence: captura de `/portafolio/` actual (Ohio) y nueva
- Known visual debt: falta exportar el diseño aprobado a un archivo durable del repo
- Visual scorecard: `docs/ui/reviews/TASK-2048-eo-portfolio-index-entry.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reproductor y assets

- Regenerar el bundle de `eo-axis-video` con la versión fijada vigente de `@efeoncepro/axis-ui-primitives` y registrar
  `VERSION.json` con sha256, como el vendor del menú.
- Copiar tokens y piezas de la órbita (lente y medida) de AXIS en versión fija al plugin.
- Exponer un helper de render del reproductor reutilizable desde las plantillas (mismo camino que el bloque).

### Slice 2 — Plantilla de entrada

- `single-eo_project`: breadcrumb, logo del cliente (si el alcance lo permite), H1, bajada, etiquetas, composición
  de formatos nativos, banda del spot, ficha, pasos, resultados (órbita de medida sólo con porcentaje y fuente), cifras
  con fuente, capítulos con galería justificada, testimonio, equipo, servicios, caso completo, cierre de voz, siguiente
  proyecto.
- JSON-LD `CreativeWork` + `VideoObject`, título, descripción y OG desde el documento.
- Cada sección se omite si su dato está vacío o fuera del alcance de aprobación.

### Slice 3 — Plantilla de portada

- Archivo `eo_project`: hero con lente (proyecto destacado y `lensFocus`), logos con alcance `logo`, índice con filtro de
  línea por `?linea=`, filas con vista previa, cierre con CTA al agendador del menú.
- JSON-LD `ItemList`, H1 único, estados vacíos.

### Slice 4 — Comportamiento y accesibilidad

- `portfolio.js`: reproducción sólo en pantalla, pausa visible, sin autoplay con «reducir movimiento», expandir filas
  con botón y `aria-expanded`, Escape y restauración de foco.
- Pruebas de GVC del plan y scorecard.

### Slice 5 — Interruptor y puesta en el sitio

- Opción `eo_portfolio_enabled` (`off`/`on`): en `off`, `/portafolio/` sigue siendo la página 247116; en `on`, el
  archivo del plugin toma la ruta.
- Publicación por el carril SSH, purga de Kinsta y QA en vivo a 1440 y 390.

## Out of Scope

- El plugin, el esquema, el admin, WP-CLI y la aprobación del cliente (`TASK-2047`).
- La migración de las 15 entradas, las redirecciones de `/project/*`, la subida de videos al bucket y la desactivación
  de Ohio Portfolio (`TASK-2049`).
- La limpieza de los demos de Ohio (`TASK-2046`).
- El widget de Elementor del reproductor y la activación de `eo-axis-video` en artículos del blog.
- HLS y video largo (PDR-028, pendiente 6).

## Detailed Spec

El diseño, regiones, copy, estados y mapeo a datos viven en
[`TASK-2048-eo-portfolio-index-entry.md`](../../ui/wireframes/TASK-2048-eo-portfolio-index-entry.md); la navegación
entre superficies en [`TASK-2048-eo-portfolio-index-entry-flow.md`](../../ui/flows/TASK-2048-eo-portfolio-index-entry-flow.md)
y en el flujo maestro [`EPIC-056-eo-portfolio-UI-FLOW.md`](../../ui/flows/EPIC-056-eo-portfolio-UI-FLOW.md); el
movimiento en [`TASK-2048-eo-portfolio-index-entry-motion.md`](../../ui/motion/TASK-2048-eo-portfolio-index-entry-motion.md).

Reglas de render que no se negocian:

- Galería justificada: cada pieza ocupa `flex: <proporción> 1 0` con `aspect-ratio` derivado de sus dimensiones reales;
  una fila se cierra cuando la suma de proporciones llega a 2,6; una pieza de proporción ≥ 2,5 (OOH) ocupa su propia
  fila; la última fila corta se limita a `suma / 2,8` del ancho para no agigantarse.
- La lente usa el video destacado dos veces sólo en escritorio (fondo apagado y ventana a color); bajo 760 px la ventana
  muestra el póster.
- La órbita de medida se dibuja con la geometría de La órbita: partida a las 12, esfera en `valor × 360°`, estela corta y
  camino recorrido al 60 % y 0,75 del trazo; nunca se llena como un loader.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reproductor y assets) → Slice 2 (entrada) → Slice 3 (portada) → Slice 4 (comportamiento) → Slice 5
  (interruptor y puesta).
- Slice 5 MUST ship AFTER `TASK-2047` tenga al menos un proyecto publicado con aprobación; sin datos la portada nueva
  sale vacía en producción.
- El interruptor nace en `off`; pasa a `on` sólo con QA verde a 1440 y 390.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Portada vacía o rota en producción al encender | UI / WordPress | medium | interruptor `eo_portfolio_enabled` en `off` por defecto; QA en staging con tres proyectos | no signal — QA manual y log `[eo-portfolio]` |
| Video autoplay sin pausa (falla WCAG 2.2.2) | UI / a11y | medium | control de pausa obligatorio en el render; aserción en el escenario GVC | no signal — aserción del escenario |
| LCP alto por videos y dos decodificaciones en la lente | performance | medium | póster como LCP, `preload=none`, segunda decodificación sólo en escritorio, reproducción en pantalla | Core Web Vitals en Search Console |
| Bundle del reproductor desactualizado | UI / AXIS | high | regenerar con la versión fijada en Slice 1 y registrar sha256 | diferencia en `VERSION.json` |
| Proyecto sin aprobación de logo o cifras muestra esos datos | contenido / legal | low | las plantillas sólo leen lo que el servicio de `TASK-2047` entrega filtrado por alcance | no signal — prueba con un proyecto sin alcance `metrics` |
| Conflicto de estilos con Ohio | UI | medium | CSS con prefijo propio y encolado sólo en `eo_project` | captura de GVC |

### Feature flags / cutover

- Opción `eo_portfolio_enabled` (`off` por defecto). En `off`, `/portafolio/` sigue sirviendo la página 247116 y las
  entradas nuevas no se enlazan desde la portada. En `on`, el archivo del plugin toma `/portafolio/`. Revert: volver a
  `off` con `wp option update` por el carril gobernado y purgar Kinsta. Tiempo de revert: menos de 5 minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | restaurar el bundle anterior de `eo-axis-video` desde el backup `.tar` del deploy | 10 min | si |
| Slice 2 | interruptor en `off`; revert del commit del runtime | 5 min | si |
| Slice 3 | interruptor en `off` | 5 min | si |
| Slice 4 | revert de `portfolio.js` (el HTML del servidor sigue funcionando sin JS) | 10 min | si |
| Slice 5 | `wp option update eo_portfolio_enabled off` + purga de Kinsta | 5 min | si |

### Production verification sequence

1. Staging o local: tres proyectos de prueba (completo, mínimo y sólo texto) y escenario GVC completo.
2. Deploy del plugin a producción con el interruptor en `off`; verificar que `/portafolio/` no cambió.
3. Verificar una entrada publicada directamente por su URL (sin enlazarla) a 1440 y 390.
4. Encender `on`, purgar Kinsta, recorrer el escenario en vivo y validar JSON-LD.
5. Monitorear Core Web Vitals y errores PHP durante 7 días.

### Out-of-band coordination required

- Aprobación del diseño del canvas por el operador (PDR-028, pendiente 1) y del par «¿Y ahora qué sigue? Empecemos».
- Purga de caché de Kinsta tras encender.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `/portafolio/` y `/portafolio/<slug>/` se renderizan desde el documento de `TASK-2047`, sin lógica por cliente. — `EOP_Render` sobre `EOP_Projection`; la guarda de nombres de `tests/eo-portfolio.test.php` cubre el render.
- [ ] Cada página tiene exactamente un H1 y el HTML de servidor contiene los filtros como enlaces `?linea=`. — Pendiente: un H1 verificado; los filtros son botones que filtran en el navegador y el servidor respeta `?linea=`, pero no son enlaces.
- [x] Toda sección con dato vacío o fuera del alcance de aprobación no aparece (verificado con Sky, PabellonToGo y ANAM). — `tests/playground/eo-portfolio-render.check.php` sobre todos los fixtures publicados (galería, resultados y creadores).
- [ ] Todo video que se reproduce solo tiene un control de pausa visible y operable con teclado.
- [ ] Con `prefers-reduced-motion: reduce` ningún video se reproduce solo.
- [ ] Los videos fuera de pantalla quedan en pausa.
- [ ] La órbita de medida sólo aparece con una cifra de tipo porcentaje que tiene fuente.
- [ ] La portada publica JSON-LD `ItemList` y la entrada `CreativeWork` y `VideoObject` válidos. — Pendiente: `ItemList` y `CreativeWork` publicados; `VideoObject` llega con la reproducción de video.
- [x] No hay scroll horizontal de página a 1440 ni a 390. — medido en producción a 1440 y en Playground a 390 (`scrollWidth` = ancho de la ventana).
- [x] El interruptor `eo_portfolio_enabled` en `off` devuelve la página 247116 sin cambios. — verificado en vivo tras el despliegue de 0.4.0 y 0.4.1, antes de encenderlo.
- [x] Se declaró `Execution profile: ui-ux` y `UI impact: flow`, y `UI ready` sigue en `no` hasta tener mapping, plan GVC y decision log completos con el diseño aprobado.
- [x] Wireframe, flow y motion declarados existen.
- [ ] GVC desktop y 390 capturado y revisado, con scorecard.

## Verification

- `pnpm task:lint --task TASK-2048`
- Escenario Playwright/GVC del plan a 1440, 1280 y 390
- Validador de datos estructurados (Rich Results Test o equivalente) sobre portada y entrada
- `curl` de `/portafolio/` sin JavaScript: enlaces de filtros y filas presentes
- Gates del runtime para plantillas PHP (patrón `verify-source-led-render.php`) [verificar nombre final]

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre — sincronizado con el estado in-progress.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la skill `efeonce-public-site-wordpress` documenta las plantillas del portafolio y el interruptor
- [ ] `docs/public-site/README.md` y EPIC-056 reflejan el estado real del portafolio

## Follow-ups

- Primitive de AXIS para la galería justificada y la fila del índice cuando exista un segundo consumidor (Think).
- Widget de Elementor del reproductor (`eo-axis-video` README) si una landing lo necesita.

## Open Questions

- ¿El par «¿Y ahora qué sigue? Empecemos» queda aprobado para la portada o se usa otro cierre?
- ¿La fila del índice se abre al pasar el cursor en escritorio o sólo con clic?
