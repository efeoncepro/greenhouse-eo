# TASK-1665 — Workbench de keyword discovery · Motion Contract

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1665 — Growth SEO: workbench diario de keyword discovery`
- Related wireframe: [TASK-1665 wireframe](../wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md)
- Related flow: [TASK-1665 flow](../flows/TASK-1665-growth-seo-keyword-discovery-workbench-flow.md)
- Motion type: `microinteraction`
- Primary primitive / library: `CSS + MUI` para todo lo estructural; `AnimatePresence + motion.div` (vía `@/libs/FramerMotion`) SÓLO para la entrada de filas del canvas; `AdaptiveSidecarLayout` posee su propia transición
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS.discovery`

## Motion Brief

- Primary user: operador interno de Growth haciendo keyword mining diario.
- Motion intent: hacer visible una **cadena causal que ocurre fuera de la pantalla** —
  `seed → costo → confirmación → corrida async → candidatos`— sin fingir progreso que el worker no
  reporta.
- Uncertainty reduced: tres incertidumbres concretas, y ninguna es estética.
  1. *"¿Mi cambio de seed ya se reflejó en el costo?"* — el preview se recalcula con debounce, así que
     sin acuse el operador no sabe si está mirando el costo viejo.
  2. *"¿La corrida quedó encolada o se perdió mi clic?"* — el command responde 202 y el resultado llega
     después; sin transición visible, un `queued` se lee como "no pasó nada".
  3. *"¿Esta fila ya es mía o sigue siendo una sugerencia?"* — el cambio de estado tras una acción
     gobernada tiene que verse en la fila que el operador tocó, no en un toast genérico.
- User decision supported: decidir si confirma un gasto y, después, qué hace con cada candidato.
- Non-goals: **no** hay barra de progreso porcentual (el worker no entrega progreso confiable), **no**
  hay entrada cinemática del builder, **no** se anima el estado de error ni la confirmación de gasto,
  **no** se usa motion para dar sensación premium a una tabla que ya es densa por diseño.

## Motion Inventory

| Elemento | Trigger | Motion / feedback | Primitive | ¿Requerido? |
|---|---|---|---|---|
| Conmutador de lentes | click / `Enter` en `Descubrir` | ninguno propio: es navegación real (`next/link`), el cambio de ruta es el feedback | `CustomTabsNav` + `Tab component={Link}` | no |
| Banda de costo | cambio de seeds/métodos/alcance (debounce) | cross-fade del bloque numérico + `role='status'` que anuncia el costo nuevo | CSS `opacity` sobre `motionCss.duration.short` | **sí** |
| CTA `Descubrir keywords` | submit | estado `loading` del botón con label propio, ancho reservado | `GreenhouseAsyncActionButton` (`reserveWidth`) | **sí** |
| Banda de estado de corrida | transición `queued → running → succeeded\|partial\|…` | cambio de contenido con cross-fade + `role='status'`; **sin** spinner infinito ni porcentaje | CSS `opacity` + `motionCss.duration.standard` | **sí** |
| Indicador de `running` | status `running` | `LinearProgress` **indeterminado** (`easing linear`), uno solo, con texto que nombra la etapa si el reader la entrega | MUI `LinearProgress` | **sí** |
| Filas de candidatos | primera materialización de un run | entrada por opacidad, **sin desplazamiento y sin stagger** | `AnimatePresence` + `motion.div` gated por `useReducedMotion` | opcional |
| Fila con acción pendiente | click en una acción gobernada | la fila baja a estado `pending`: botón con spinner local, resto de la fila intacto | `GreenhouseAsyncActionButton` | **sí** |
| Fila con outcome | respuesta del command | el chip de estado cambia de valor; `aria-live` anuncia el outcome POR keyword | `GreenhouseChip` + `role='status'` | **sí** |
| Drawer de candidato | abrir / cerrar | transición del primitive, sin override local | `AdaptiveSidecarLayout` | **sí** |
| Confirmación de gasto | abrir | **sin animación de entrada**: una decisión de dinero no se presenta con una flourish | MUI `Dialog` (default) | **sí** |

## Microinteraction States

| Elemento | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Tab de lente | label + ícono | subrayado/tono del primitive | anillo visible del theme | — | `aria-current='page'` + estado activo | — | — |
| Textarea de seeds | contador `N/10` | borde del theme | anillo visible | — | — | — | error inline en el campo, texto válido preservado |
| Chip de método | outlined | tono del theme | anillo visible | — | filled + `aria-pressed` | — | error si 0 métodos |
| CTA descubrir | enabled/disabled con motivo | elevación del primitive | anillo visible | — | — | spinner + `loadingLabel` | outcome en la banda de estado, no en el botón |
| Fila de candidato | densidad de tabla | fondo hover del theme | anillo visible en la celda accionable | — | fondo `selected` semántico | acción con spinner local | chip de estado nuevo + anuncio por keyword |

## Transition Specs

| Transición | From | To | Timing / easing token | Comportamiento | Reduced-motion fallback |
|---|---|---|---|---|---|
| Recalcular costo | costo previo | costo nuevo | `short` (150 ms) · `standard` | cross-fade del bloque numérico; el layout **no** salta porque la banda reserva su alto | cambio inmediato; el `role='status'` sigue anunciando |
| Estado de corrida | `queued` | `running` | `standard` (200 ms) · `emphasized` | cross-fade del titular + detalle | cambio inmediato |
| Estado de corrida | `running` | `succeeded\|partial\|no_results\|budget_blocked\|provider_error` | `standard` (200 ms) · `emphasized` | cross-fade; el `LinearProgress` se retira | cambio inmediato |
| Entrada de filas | sin candidatos | candidatos materializados | `standard` (200 ms) · `emphasized` | fade-in del bloque, **sin stagger y sin `y`** | render directo |
| Drawer | cerrado | abierto | del primitive (`medium`, 300 ms) | slide/fade que posee `AdaptiveSidecarLayout` | transición instantánea del propio primitive |
| Confirmación | cerrada | abierta | ninguna | aparece sin escala ni desplazamiento | idéntico |

🔴 **Por qué no hay stagger.** El wireframe lo prohíbe explícitamente y la razón es de producto, no de
gusto: un stagger sobre una lista de candidatos sugiere que llegan de a poco —como si el proveedor
siguiera respondiendo— cuando en realidad el run ya terminó y el reader devolvió todo junto. Sería
motion que **miente sobre el estado del sistema**.

## Primitive & Token Mapping

- Primitive: `GreenhouseAsyncActionButton`, `GreenhouseChip`, `DataTableShell`,
  `AdaptiveSidecarLayout` + `ContextualSidecar`, MUI `LinearProgress`, MUI `Dialog`.
- Imports permitidos: `@/libs/FramerMotion` (`motion`, `AnimatePresence`),
  `@/hooks/useReducedMotion`, `@/components/greenhouse/motion/core/tokens`.
- Imports prohibidos: `framer-motion` directo, `gsap` directo, `lottie-react` directo, cualquier
  contenedor de toasts adicional.
- Timing tokens: `MOTION_DURATION_MS.short` (150) para el costo; `.standard` (200) para estado y
  entrada de filas; `.medium` (300) lo aporta el drawer.
- Easing tokens: `MOTION_EASE.emphasized` para entradas y cambios de estado;
  `MOTION_EASE.linear` **sólo** para el `LinearProgress` indeterminado.
- Layout animation: ninguna. No hay `layout` de Framer: reordenar filas al filtrar con animación de
  layout haría que una tabla densa se sienta inestable.
- CSS properties: sólo `opacity` (y `transform` dentro del drawer, que lo posee el primitive).
- GSAP/Lottie: **no aplica**. Nada acá justifica una timeline; usarlo sería el anti-patrón explícito
  de la skill.

## Reduced Motion Contract

- Detección: `useReducedMotion` de `@/hooks/useReducedMotion` para lo custom; el drawer aplica su
  propio contrato.
- Replacement behavior: se eliminan los cross-fades y la entrada de filas; los cambios de contenido
  ocurren de inmediato.
- Meaning preserved: **el estado final y su anuncio son idénticos.** El `role='status'` de la banda de
  costo y del estado de corrida **no** depende de motion — es el canal primario, no el respaldo.
- Animations removed: cross-fade de costo, cross-fade de estado, fade-in de filas.
- Animations retained: el `LinearProgress` indeterminado del estado `running`. Es el único indicador de
  que algo sigue corriendo fuera de la pantalla, y quitarlo dejaría un `running` indistinguible de un
  `queued` congelado. Es continuo y no direccional, que es exactamente el caso que `prefers-reduced-motion`
  no pretende eliminar.

## Accessibility & Feedback

- Focus visibility: anillo del theme en todo control; el drawer atrapa foco y lo devuelve al trigger.
- Keyboard activation: tabs, chips de método, filas accionables y menú de acciones son alcanzables por
  teclado. **Ninguna acción vive detrás de hover.**
- Live region / status behavior: `role='status'` (implica `aria-live='polite'`) en la banda de costo y
  en la banda de estado de corrida. El contenedor se monta **antes** de que llegue el contenido — si
  apareciera junto con el texto, el lector de pantalla no anunciaría nada. El costo se anuncia sólo
  tras un cambio del usuario, **nunca por keystroke**.
- Color-independent state: `◑` estimado y `●` medido llevan texto y etiqueta accesible; el estado de la
  corrida y el del candidato son texto, no sólo tono de chip.
- Motion-independent meaning: cada transición tiene su equivalente textual; con motion apagado no se
  pierde ninguna información.
- Intermediate-frame contrast: `AA preserved` — el único frame intermedio es un cross-fade de opacidad
  entre dos textos que ya cumplen contraste sobre la misma superficie; no hay estado intermedio con
  fondo distinto.
- Error/destructive stability: el error de proveedor y la confirmación de gasto recurrente **no se
  animan**. Animar una decisión de dinero la vuelve más liviana de lo que es.

## Performance Guardrails

- Compositor-only properties: sólo `opacity` fuera del drawer.
- Layout reads/writes: ninguno en el path de motion; el alto de la banda de costo se reserva por CSS
  para que recalcular no desplace el CTA.
- Animation scope: acotado a la banda de costo, la banda de estado y el bloque de filas. El chrome del
  header nunca se anima.
- Chart/counter constraints: **no hay chart** en esta lente (decisión de la dirección visual) y **no se
  usa `AnimatedCounter` para el costo**: un contador que corre hacia un monto de dinero invita a leerlo
  antes de que termine, y el número intermedio es un costo que nadie va a pagar.
- Mobile constraints: a 390px se conserva exactamente el mismo contrato; ninguna animación adicional
  compensa el cambio de layout.

## GVC / Micro Evidence

- Scenario: `growth-seo-keyword-discovery`
- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`
- Route: `/admin/growth/seo/keywords?view=discovery`
- Viewports: desktop 1440×900 y mobile 390×844
- Required steps: builder vacío → builder válido con costo → `queued` → `running` → `succeeded` →
  `partial` → drawer abierto → outcome de acción → `Escape` con foco restaurado
- Required captures: `default`, `builder`, `cost`, `status-queued`, `status-running`, `results`,
  `candidate-drawer`, `reduced-motion`
- Required frame labels: los mismos, en ambos viewports
- Required `data-capture` markers: `seo-keyword-discovery-builder`, `seo-keyword-discovery-cost`,
  `seo-keyword-discovery-status`, `seo-keyword-discovery-results`,
  `seo-keyword-discovery-candidate-drawer`
- Assertions: sin redirect a login, sin error boundary, sin request al proveedor desde el browser, sin
  texto de error crudo, `scrollWidth === clientWidth`, markers visibles, foco restaurado
- Intermediate-frame axe/contrast evidence: captura del cross-fade de la banda de estado
- Reduced-motion evidence: pasada con `prefers-reduced-motion` que muestra el mismo estado final y el
  `LinearProgress` conservado

## Design Decision Log

- **Decision:** el canal primario de feedback es `role='status'` + texto; el motion es refuerzo.
  **Alternativas:** confiar en la animación para comunicar la transición de estado.
  **Por qué:** la corrida es async y su resultado puede llegar cuando el operador está en otra lente o
  con motion reducido. Un contrato que depende de una animación pierde el evento.
- **Decision:** `LinearProgress` **indeterminado**, nunca porcentual.
  **Alternativas:** barra con porcentaje estimado por etapa.
  **Por qué:** el worker no entrega progreso confiable; un porcentaje inventado es una afirmación falsa
  sobre cuánto falta, y el flow lo prohíbe explícitamente.
- **Decision:** sin stagger en las filas.
  **Alternativas:** entrada escalonada, que es el patrón bonito por defecto.
  **Por qué:** sugeriría llegada progresiva de datos cuando el run ya cerró. Motion que miente.
- **Decision:** el costo no usa `AnimatedCounter`.
  **Alternativas:** reusar el primitive de KPI, que existe y sería trivial.
  **Por qué:** los valores intermedios de un contador son montos que nadie va a pagar; en una banda
  cuyo propósito es autorizar gasto, eso es exactamente el número que no debe mostrarse.
- **Decision:** la confirmación de gasto y el error de proveedor no se animan.
  **Por qué:** anti-patrón explícito de la skill; una decisión de dinero no se presenta con flourish.
- **Reuse / extend / new primitive:** `reuse` total. No se crea primitive de motion.
- **Open risks:** si el reader llegara a exponer progreso real por etapa, la barra indeterminada podría
  pasar a determinada — requiere volver a este contrato, no decidirlo en JSX.
- **Follow-up:** ninguno.

## Acceptance Checklist

- [x] La task declara este archivo en `Motion`.
- [x] El motion está atado a feedback, orientación, reducción de incertidumbre o prevención de error.
- [x] El comportamiento con motion reducido preserva el mismo significado.
- [x] Foco, selección, pendiente y error no dependen de motion.
- [x] Los imports usan los wrappers canónicos de Greenhouse.
- [x] Los guardrails de performance evitan layout thrash.
- [ ] La evidencia GVC/micro prueba la interacción, no sólo un screenshot estático.
- [x] El decision log explica por qué existe este motion y qué se rechazó.
