# TASK-2040 — Navegación global: contrato y primitive `efeonce.site-nav` en AXIS

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2040-site-nav.md`
- Flow: `docs/ui/flows/TASK-2040-site-nav-flow.md`
- Motion: `docs/ui/motion/TASK-2040-site-nav-motion.md`
- Backend impact: `none`
- Epic: `EPIC-055`
- Status real: `Completa el 2026-10-22: publicado en AXIS v0.7.7 (axis-tokens 0.6.8, axis-ui-contracts 0.7.7, axis-ui-registry 0.7.4, axis-ui-primitives 0.7.0) e instalación privada verificada. Sin consumidor en un sitio todavía: lo monta TASK-2042 con los datos de TASK-2041`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; el codigo vive en axis-design-system con su contrato de rama y release de paquetes; sin worktrees`

## Summary

Construye en AXIS el mecanismo portable de la navegación global del sitio, que el operador aprobó en el canvas el
2026-10-18:

- **Contrato `efeonce.site-nav`** con el esquema de datos `site-nav.v1`.
- **Primitive en `@efeoncepro/axis-ui-primitives`**, con tres piezas: render de servidor, CSS con la receta de vidrio y
  los tiempos en tokens, y JS liviano sin framework.
- **Comportamiento:** cabecera arriba, oculta y fija; mega menús de Soluciones y Recursos; desplegable de Nosotros;
  onepage; tableta y teléfono; teclado, foco y movimiento reducido.
- **Página del Lab.**

Es la pieza que WordPress usa ahora y Think después, sin rehacer nada.

## Why This Task Exists

El menú existe sólo como prototipo en un canvas. AXIS no tiene contrato ni primitive de navegación: el campo `nav` de
`efeonce.surface-composition` describe un encabezado dibujado dentro de un hero compuesto, no un menú en ejecución.

Si el menú se construye directo en el tema de WordPress:

- queda atado a ese sitio y Think tendría que reimplementarlo;
- el diseño divergiría con el primer cambio;
- se repetiría el error que el sitio ya evita con `EfeonceMention`, que vive en AXIS y cada sitio consume.

## Goal

- Un contrato y un esquema que describen el menú completo y que el plugin de WordPress puede validar.
- Un primitive que pinta el menú en HTML de servidor desde un documento válido y lo mejora con JS liviano, fiel al canvas
  en los siete anchos.
- Una versión publicada del paquete, con página en el Lab, lista para que `TASK-2042` la fije en WordPress.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (fuente técnica de esta task)
- `docs/public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md`
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md`
- `docs/public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md`
- `docs/architecture/public-site/PRIMITIVES.md` (§`EfeonceMention`, precedente de mecanismo portable)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`

Reglas obligatorias:

- **HTML de servidor primero.** Todo destino existe como enlace sin JavaScript.
- **Sin React ni framework** en lo que consume el sitio público. El JS es mejora progresiva.
- **Valores de diseño desde tokens de AXIS:** vidrio, alturas, logo y tiempos. Cero HEX o px de diseño repetidos en el
  CSS del consumidor.
- **Mecanismo, no estética** (PDR-026): el contrato fija comportamiento y estructura; la piel sale de la línea gráfica.
- **El primitive no pide datos a la red** y no conoce el agendador. Expone el hueco del CTA con `cta-location`.

## Normative Docs

- Canvas «Mega menú efeoncepro.com»: https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj (versión 67), con sus notas de
  comportamiento, accesibilidad, breakpoints, motion y construcción.
- Skills: `axis-design-system` (consumo y contratos), `efeonce-graphic-line` (La órbita), `modern-web-guidance`,
  `web-perf-design`.

## Dependencies & Impact

### Depends on

- Repo `axis-design-system`: `packages/primitives/src` (patrón `mention.ts`, `mention-css.ts`, `mention-react.ts`) y
  `packages/contracts/src` (patrón de contratos, `surface-composition.ts`).
- Tokens `axisMotion` y catálogo de íconos Trazo (`resolveIcon`) en AXIS.
- Logos oficiales en `@efeoncepro/axis-brand-assets`: Efeonce negativo y Glitch negativo.

### Blocks / Impacts

- `TASK-2041` necesita el esquema `site-nav.v1` publicado para validar el documento.
- `TASK-2042` necesita la versión publicada del primitive para montarlo en WordPress.
- Futuro adaptador de Think (follow-up de EPIC-055).

### Files owned

- `docs/ui/wireframes/TASK-2040-site-nav.md`
- `docs/ui/motion/TASK-2040-site-nav-motion.md`
- `docs/ui/flows/TASK-2040-site-nav-flow.md`
- `docs/ui/flows/EPIC-055-public-site-global-navigation-UI-FLOW.md` (flujo maestro, compartido con `TASK-2042`)
- En `axis-design-system`: `packages/contracts/src/site-nav*`, `packages/primitives/src/site-nav*` y la página del Lab
  `/patterns/efeonce.site-nav/` [verificar rutas exactas en el discovery].

## Current Repo State

### Already exists

- Prototipo funcional completo en el canvas: tableros `Completo`, `Main`, `Recursos`, `Nosotros`, `Onepage`,
  `Mega1280`, `Mega1200`, `Tableta1024`, `Tableta834`, `Movil`, `Arriba`, `Bajando` y `Subiendo`. Tiene la receta de
  vidrio homologada (versión 62), el logo a 164 px (versión 64), el hover del agendador (versiones 65 y 66) y el onepage
  cerrado a 0 px (versión 63).
- Primitive portable de referencia: `efeonce.mention` en `@efeoncepro/axis-ui-primitives` ≥ 0.6.9.
- Contrato `efeonce.surface-composition` con un campo `nav` descriptivo, que no es un menú en ejecución.

### Gap

- No existe contrato, esquema, primitive ni página del Lab de navegación.
- La receta de vidrio, las alturas de la cabecera y los tiempos del menú no son tokens; viven como literales en el canvas.
- No hay pruebas de teclado, foco, movimiento reducido ni contraste para una navegación en AXIS.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `axis-design-system/packages/primitives` y `packages/contracts` (paquetes privados en GitHub Packages)
- Future candidate home: `ui-package`
- Boundary: contrato `efeonce.site-nav` + esquema `site-nav.v1`; consumidores autorizados: adaptador WordPress
  (`TASK-2042`), plugin «EO Navegación» (sólo el esquema, `TASK-2041`) y futuros adaptadores (Think)
- Server/browser split: el render de servidor es una función pura sin acceso a red; el JS del navegador sólo agrega
  comportamiento sobre el HTML ya pintado
- Build impact: export nuevo en `axis-ui-primitives` y `axis-ui-contracts`; sin dependencias pesadas ni framework
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: visitante de `efeoncepro.com` (y de Think más adelante), con mouse, teclado, lector o tacto
- Momento del flujo: llegada a cualquier página; búsqueda de un servicio, recurso o diagnóstico
- Resultado perceptible esperado: encontrar el destino en uno o dos pasos y agendar sin salir de la página
- Friccion que debe reducir: el menú actual de Ohio no muestra líneas, servicios ni recursos con contexto; hoy hay que
  adivinar dónde está cada cosa
- No-goals UX: búsqueda dentro del menú, mega menús por landing, pie de página

### Surface & system decision

- Surface: encabezado global del sitio (cabecera, mega menús, desplegable, onepage)
- Nav placement: `none` — es la navegación del sitio público, no agrega destinos al portal Greenhouse; el presupuesto de
  `NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md` aplica al portal y no a este sitio
- Composition Shell: `no aplica` — es cromo de un sitio público fuera del portal
- Primitive decision: `new` — `efeonce.site-nav` en AXIS; no existe primitive de navegación que extender
- Adaptive density / The Seam: `no aplica` — los anchos se resuelven con los siete breakpoints del canvas
- Floating/Sidecar/Dialog decision: los mega menús son paneles flotantes; el onepage es diálogo modal (`role="dialog"`)
  a pantalla completa
- Copy source: `local one-off` — todo el texto viene del documento `site-nav.v1`; el primitive sólo trae etiquetas ARIA
  de sistema
- Access impact: `none`

### State inventory

- Default: cabecera arriba, transparente, todo cerrado
- Loading: la foto anterior se queda hasta que la nueva cargó
- Empty: formato de Recursos sin notas → destacado fijo del documento
- Error: foto que no carga → sólo texto; documento inválido → el consumidor no monta el menú
- Degraded / partial: sin JavaScript → enlaces de servidor; agendador sin superficie → enlace a `/agenda/`
- Permission denied: no aplica (sitio público)
- Long content: etiquetas con máximo dos líneas y elipsis; columna central con `overflow-y: auto`
- Mobile / compact: hamburguesa bajo 1.181 px; onepage sin foto bajo 1.024 px; `(max-height: 799px)` compacto
- Keyboard / focus: Tab, Enter, flechas y Esc según el flujo maestro; foco contenido en el onepage; foco visible `#72ded8`
- Reduced motion: cambios instantáneos, sin desplazamientos

### Interaction contract

- Primary interaction: abrir un panel (hover con 150 ms de intención o clic) y elegir un destino
- Hover / focus / active: intención de 90 ms dentro de listas; foco de servicio con anillo de acento; botón del agendador
  con elevación de 1 px
- Pending / disabled: no aplica (navegación, sin envíos)
- Escape / click-away: Esc o clic fuera cierran y devuelven el foco al disparador
- Focus restore: al disparador o a la hamburguesa; tras el agendador, al lanzador
- Latency feedback: cruce de fotos con espera de carga
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS` con `clip-path`, `transform` y `opacity`; JS sólo para estados y clases
- Enter / exit: cortina de 450 a 550 ms para los paneles; círculo de 800 ms para el onepage; cierres con
  `emphasizedAccelerate`
- Layout morph: hamburguesa a X
- Stagger: líneas cada 40 ms (mega) y cada 45 ms (onepage); ítems cada 60 ms
- Timing / easing token: `axisMotion` `emphasized` y `emphasizedAccelerate`
- Reduced-motion fallback: instantáneo, ver contrato de motion
- Non-goal motion: parallax, animación en bucle del logo, scroll reveal del contenido de la página

### Implementation mapping

- Route / surface: Lab `/patterns/efeonce.site-nav/` en AXIS; consumidor WordPress en `TASK-2042`
- Primitive / variant / kind: `efeonce.site-nav`; paneles `lines` (Soluciones), `editorial` (Recursos) y `dropdown`
  (Nosotros); onepage; estados de cabecera `top`, `hidden` y `fixed`
- Component candidates: render de servidor `siteNavHtml(doc, options)`, `site-nav.css` y `site-nav.js` (nombres finales
  en el discovery)
- Copy source: documento `site-nav.v1`
- Data reader / command: ninguno dentro del primitive; recibe el documento ya resuelto
- API parity: no aplica al primitive; la paridad de edición vive en `TASK-2041`
- Access / capability: ninguna
- States to implement: los del inventario de arriba y la tabla de estados del wireframe

### GVC scenario plan

- Scenario file: Playwright en AXIS sobre el Lab (`site-nav.spec`, nombre final en el discovery); GVC del portal no
  aplica a AXIS
- Route: `/patterns/efeonce.site-nav/`
- Viewports: 1440×900, 1366×768, 1280×720, 1180×820, 1024×768, 834×1112, 390×844 y 360×740
- Quality profile: `premium`
- Required steps: cabecera arriba → Soluciones (hover y teclado) → cambio de línea → foco de servicio → Recursos →
  Nosotros → onepage (abrir, hijo, Esc) → scroll abajo y arriba
- Required captures: un frame por paso y viewport
- Required `data-capture` markers: `site-nav-header`, `site-nav-mega`, `site-nav-dropdown`, `site-nav-onepage`
- Assertions: un solo panel abierto; `aria-expanded` correcto; foco devuelto; ningún disco tras cerrar el onepage
- Scroll-width checks: `scrollWidth == clientWidth` en todos los viewports
- Reduced-motion / focus evidence: la misma secuencia con `prefers-reduced-motion: reduce`; foco visible en cada paso
- Review dossier: adjunto a la task con frames y contraste medido
- Baseline decision / surface ID: baseline nueva, `axis-lab-site-nav`

### Design decision log

- Decision: mecanismo nuevo en AXIS, consumido por cada sitio con adaptador
- Alternatives considered: mega menú nativo de Ohio (sin fotos, líneas ni portabilidad); construir en el tema de
  WordPress (atado a un sitio); componente React (prohibido en el sitio público)
- Why this pattern: mismo camino aprobado de `EfeonceMention`; un cambio de diseño se hace una vez
- Reuse / extend / new primitive: new
- Open risks: tamaño del CSS y JS en el sitio; paridad fina con el canvas en 1181–1279; contraste sobre fotos muy claras
  (peor punto medido 4,3)

### Visual verification

- GVC scenario: ver plan de arriba
- Viewports: los ocho del plan
- Required captures: un frame por paso y viewport
- Required `data-capture` markers: los cuatro del plan
- Scroll-width check: en todos los viewports
- Accessibility/focus checks: teclado completo, lector (nombres accesibles), contraste ≥ 4,5:1 en navy, negro y una
  foto clara
- Before/after evidence: canvas (versión 67) frente al Lab, mismo viewport
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-2040-site-nav.scorecard.json`
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

### Slice 1 — Contrato, esquema y tokens

- Contrato `efeonce.site-nav` en `axis-ui-contracts`: estructura, paneles, estados de cabecera, roles ARIA, eventos
  (`site_nav_open`, `site_nav_line_view`, `site_nav_click`) y el hueco del CTA con `cta-location`.
- Esquema `site-nav.v1` exportado como JSON Schema, con límites de profundidad, texto plano, alt obligatorio y fotos por
  recorte.
- Documento de ejemplo con el contenido del canvas.
- Tokens: receta de vidrio, receta de la isla en sus dos tonos, cabecera de 96 px, isla de 61 px a 12 px del borde, anchos de logo (164 y 128) y tiempos del menú en `axisMotion`.

### Slice 2 — Render de servidor y CSS

- Función pura que pinta el HTML completo desde el documento: cabecera, cápsula, tres paneles, onepage y pie, con todos
  los enlaces.
- `site-nav.css` con los siete breakpoints, la cápsula oculta con `display:none` bajo 1.181 px, el modo compacto por
  altura, los estados de cabecera y la receta de vidrio desde tokens.

### Slice 3 — Comportamiento

- `site-nav.js`:
  - intención de 150 y 90 ms, un panel a la vez y cambio sin espera entre paneles;
  - teclado y foco contenido en el onepage;
  - bloqueo de scroll, scroll oculto y fijo, y cierre al cruzar 1.181 px;
  - tacto (`hover: none`);
  - precarga de fotos al abrir con cruce de espera;
  - eventos de medición;
  - movimiento reducido.
- Motion según el contrato: cortina, círculo de 0 a 1.720 px, cascadas y hamburguesa a X.

### Slice 4 — Lab, pruebas y release

- Página del Lab `/patterns/efeonce.site-nav/` con el documento de ejemplo y los ajustes «Contexto» y «Cabecera».
- Pruebas: render (enlaces sin JS), teclado y foco, `aria-*`, contraste, ocho viewports, movimiento reducido y
  `scrollWidth`.
- Release del paquete con versión nueva, nota de cambios y entrada en `PRIMITIVES.md` del sitio.

## Out of Scope

- Plugin, documento real, admin y fotos en el bucket: `TASK-2041`.
- Montaje en WordPress, interruptor, variantes de Ohio, superficie del agendador y alta en GTM y GA4: `TASK-2042`.
- Adaptador de Think: follow-up de EPIC-055.
- Pie de página y búsqueda del sitio.

## Detailed Spec

La especificación completa de regiones, medidas, estados, teclado, motion y datos está en:

- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`
- `docs/ui/wireframes/TASK-2040-site-nav.md`
- `docs/ui/flows/EPIC-055-public-site-global-navigation-UI-FLOW.md` y `docs/ui/flows/TASK-2040-site-nav-flow.md`
- `docs/ui/motion/TASK-2040-site-nav-motion.md`

No se duplica aquí. Si el canvas y estos documentos difieren, manda la última decisión del operador registrada en los
hilos del canvas; se corrige el documento en el mismo commit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- El esquema del Slice 1 se publica antes que el resto si `TASK-2041` lo necesita: un release intermedio de
  `axis-ui-contracts` es válido.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CSS del primitive choca con Ohio u otros consumidores | UI | medium | Prefijo propio de clases y tokens; nunca selectores que apunten a Ohio (PDR-024) | Diferencias visuales en la página del Lab frente al piloto |
| JS pesado o bloqueante en el sitio | UI | low | Sin framework; carga diferida; presupuesto de tamaño en el release | Regresión de Core Web Vitals en el piloto (`TASK-2042`) |
| Fidelidad baja frente al canvas en 1181–1279 | UI | medium | Comparación frame a frame con el tablero `Mega1200` | Scorecard bajo el umbral |
| Contraste insuficiente sobre fotos claras | UI | low | Control de contraste en la QA; oscurecido del fondo desde el token | Medición < 4,5:1 |

### Feature flags / cutover

- Sin flag en AXIS: es un export nuevo y aditivo de un paquete con versión. Ningún consumidor lo usa hasta que
  `TASK-2042` fija la versión.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Publicar versión correctiva del contrato; consumidores fijan la anterior | < 1 h | si |
| Slice 2 | Igual: versión correctiva del paquete | < 1 h | si |
| Slice 3 | Igual | < 1 h | si |
| Slice 4 | Despublicar la página del Lab y volver a la versión anterior del paquete | < 1 h | si |

### Production verification sequence

1. Pruebas del paquete en verde y página del Lab revisada en los ocho viewports.
2. Release del paquete con versión nueva; instalación privada verificada según el runbook de consumo de AXIS.
3. La verificación en un sitio real ocurre en el piloto de `TASK-2042`.

### Out-of-band coordination required

- Coordinar el release de AXIS con cualquier sesión que esté trabajando en `axis-design-system` en ese momento
  (comprobar sesiones activas antes de publicar).
- Sin cambios en WordPress, GCP ni proveedores externos en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe el contrato `efeonce.site-nav` y el esquema `site-nav.v1` en JSON Schema, con documento de ejemplo válido.
  Evidencia: `packages/contracts/src/site-nav.ts`, `dist/site-nav.v1.schema.json`, `siteNavExample`; 8 pruebas en `site-nav.test.ts`.
- [x] Vidrio, alturas, logo y tiempos del menú son tokens de AXIS y el CSS del primitive no tiene esos valores como
  literales. Evidencia: grupo `axisSiteNav`; prueba de fuente sin HEX, `rgba`, `blur(` ni milisegundos en `site-nav-css.ts`.
- [x] El render de servidor produce todos los enlaces del documento en HTML sin JavaScript (prueba automatizada).
  Evidencia: `primitives/src/site-nav.test.ts` (todos los `siteNavLinks`) y e2e «without JavaScript…».
- [x] Un solo panel abierto a la vez; el mega y el onepage nunca coexisten (prueba automatizada). Evidencia: e2e «intent…» y «the mega and the onepage never coexist…».
- [x] El teclado cumple el flujo maestro (Tab, Enter o ↓, ↑ ↓, →, ←, Esc) y el foco se devuelve al disparador
  (prueba automatizada). Evidencia: e2e «keyboard: Enter opens…».
- [x] El onepage es `role="dialog"` con `aria-modal="true"` y foco contenido; al cerrar no queda disco detrás de la
  hamburguesa. Evidencia: e2e con 60 Tab dentro del diálogo y `circle(0px…)` al cerrar, desde arriba y desde la isla.
- [x] Con `prefers-reduced-motion: reduce` no hay desplazamientos. Evidencia: e2e «reduced motion…» (duración 0, sin transform ni círculo).
- [x] `scrollWidth == clientWidth` en los ocho viewports. Evidencia: e2e «no horizontal scroll at …» cerrado y con el onepage abierto.
- [x] El contraste del texto sobre el vidrio es ≥ 4,5:1 en navy, negro y navy con resplandor. Evidencia: e2e por píxel más claro bajo la cápsula; fotos claras quedan como QA del piloto (TASK-2042).
- [x] La página del Lab muestra el menú con los ajustes «Contexto» y «Cabecera». Evidencia: `/patterns/efeonce.site-nav/` (captura `lab-patron.webp`).
- [x] Se capturó y se miró la evidencia desktop y 390 px, y el scorecard cumple el umbral. Evidencia: AXIS `docs/evidence/site-nav/` (15 frames) y `docs/ui/reviews/TASK-2040-site-nav.scorecard.json` (promedio 4,6, piso 4,5); revisión de la sesión «Rediseño de Menú».
- [x] El paquete se publicó con versión nueva y la instalación privada quedó verificada. Evidencia 2026-10-22: tag
  `v0.7.7` sobre `b23fcc0` con la CI del mismo commit en verde, y workflow «Release UI packages» en verde (pruebas de
  navegador de publicación y publicación). En un directorio limpio, con el registro privado, se instalaron tokens 0.6.8,
  contracts 0.7.7, registry 0.7.4 y primitives 0.7.0. `validateSiteNav` acepta el ejemplo y el render publicado es
  idéntico al fixture. El CSS trae el subrayado de la franja, el JS existe y el hash del esquema es `10a6a55…`, el que
  fija el plugin de TASK-2041.
- [x] `UI ready` se mantuvo en `no` hasta completar mapping, plan de captura y decision log; si pasó a `yes`,
  `pnpm task:lint --task TASK-2040` quedó sin hallazgos. Se mantiene en `no`.

## Cierre (2026-10-22)

Antes del tag, la sesión «Rediseño de Menú» actuó como contralora de fidelidad con el canvas v68. Comparó el texto
campo por campo y las medidas con `getComputedStyle`, y encontró diferencias que se corrigieron antes de publicar:

- Enlaces de texto de la franja subrayados en reposo.
- Hijos de Recursos en el onepage como en el canvas (`onepage.items` en paneles editoriales).
- «Estás aquí» con mayúscula.
- Pantallas de 700 a 799 de alto: titular de 36 px, franja de 56 y foto de 168.
- Tableta: etiquetas de 40, líneas de 18 y sin respuesta en vertical.

La CI encontró dos fallas de infraestructura, también corregidas: la suite de site-nav pedía el Chromium de Playwright,
que el runner no instala (ahora usa el Chrome real, con una guarda), y la prueba de axe medía a mitad de una transición.
La sesión del menú volvió a medir y dio el visto bueno antes del release. Commits de AXIS: `cfd4e4d`, `b787744`,
`602f53f`, `cc8b3bc` y `b23fcc0`.

## Verification

- Pruebas y lint del repo `axis-design-system` (paquetes `contracts` y `primitives`).
- Playwright sobre la página del Lab en los ocho viewports, con y sin movimiento reducido.
- `pnpm task:lint --task TASK-2040` en `greenhouse-eo`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] EPIC-055 actualizada con el estado de esta task y la versión publicada del paquete
- [x] `docs/architecture/public-site/PRIMITIVES.md` registra `efeonce.site-nav` con su versión

## Follow-ups

- Adaptador de Think (EPIC-055).
- Si aparece una necesidad nueva del menú dentro de la frontera del mecanismo, entra como slice o criterio de esta task,
  no como task nueva (regla de EPIC-055).

## Open Questions

- ~~Nombre del grupo de tokens y exports~~: resuelto 2026-10-22. Grupo `axisSiteNav`; exports `./site-nav`,
  `./site-nav.css` y `./site-nav.js` en primitives; esquema en contracts (arquitectura §Implementación en AXIS).
- ~~Render en WordPress~~: resuelto 2026-10-22, de acuerdo con la sesión «Rediseño de Menú». `siteNavHtml` es la
  única fuente de marcado; `TASK-2042` hace el port PHP y lo valida contra el fixture
  `packages/primitives/fixtures/site-nav/agencia-creativa.html`.
