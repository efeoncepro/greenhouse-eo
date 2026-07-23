# TASK-1530 — Globe Model-Aware Prompt Enhancement

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1530`
- Product Design asset: `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- Visual direction mode: `source-led`
- Intended consumers: Globe Producer operators on desktop and mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — existing prompt bar, capability button and inline enhancement proposal
- UI ready target: `yes`

## Brief

- Primary user: operador creativo autenticado con acceso a Producer.
- User moment: escribió una intención y quiere mejorarla antes de estimar o generar.
- Job to be done: obtener una propuesta más útil para la ruta generativa seleccionada sin perder restricciones ni sustituir el texto original sin consentimiento.
- Primary decision signal: propuesta lista, perfil/ruta aplicada y cambios relevantes preservados o advertidos.
- Non-goals: crear un chat, abrir una superficie nueva, elegir providers desde el browser o prometer que toda generación mejorará.

## Desktop Target — 1440×1000

El composer conserva la lectura aprobada `prompt → referencias → ajustes → ruta → output → estimate`. Al pulsar
`Mejorar`, el CTA mantiene su posición y entra en estado pendiente con texto `Analizando…`; debajo del textarea
aparece una banda inline estable, sin desplazar controles fuera del primer fold. La banda presenta la propuesta,
el modelo/ruta objetivo client-safe, un resumen corto de lo preservado y las acciones `Usar propuesta` y
`Descartar`. El prompt original permanece visible hasta la aceptación.

## Mobile Target — 390×844

El CTA pendiente mantiene un target táctil mínimo de 44 px y no ensancha el prompt bar. La banda inline recompone
metadata, propuesta y acciones en una columna; el texto largo hace wrap y nunca introduce scroll horizontal. El
foco permanece en el botón durante la espera, pasa al heading de la propuesta cuando termina y vuelve al textarea
al aceptar. Cambiar prompt, modalidad o ruta invalida visualmente una respuesta tardía.

## Action Hierarchy

- Primary: `Mejorar` cuando idle; `Usar propuesta` cuando existe una propuesta revisable.
- Secondary: `Descartar`.
- Destructive: none.
- Selection vs action: elegir ruta/modelo configura el target; nunca acepta la propuesta implícitamente.
- Pending / disabled: `Analizando…` con `aria-busy=true`; un segundo click no crea otra reserva ni otro request.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Prompt-first composer de TASK-1505 | Pattern propio `Producer Console` de Globe | La mejora vive junto al texto que transforma | Modal/chat separado |
| CTA `Mejorar` con sparkle | Capability button existente | Acción reconocible y estable | Spinner global o CTA que desaparece |
| Propuesta inline aprobada | `data-producer-enhancement` existente, extendido | Revisión humana antes de aplicar | Reemplazo automático del textarea |
| Profundidad azul y estados honestos | Tokens runtime Globe/AXIS | Continuidad visual y semántica | HEX, sombras o timings copiados |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Prompt field | Mantener intención original editable | `#producer-prompt` | browser presentation state |
| 1 | Prompt actions | Iniciar y comunicar pending | capability button existente | `GlobeProducerClient.command` |
| 2 | Enhancement band | Revisar propuesta y evidencia client-safe | `[data-producer-enhancement]` extendido | `PromptEnhancementProposalV2` |
| 3 | Proposal actions | Aceptar o rechazar explícitamente | capability buttons existentes | governed accept/reject commands |
| 4 | Live region | Anunciar pending, success y recovery | `#producer-live-region` corregido | controller state |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `producer.promptEnhancement.pending` | CTA/status | `Analizando tu prompt…` | none | No implica éxito |
| `producer.promptEnhancement.ready` | proposal | `Propuesta lista para {model}` | `model` | Nombre client-safe del catálogo |
| `producer.promptEnhancement.preserved` | proposal | `Conservamos tus restricciones explícitas.` | none | Sólo si el validator lo confirma |
| `producer.promptEnhancement.accept` | action | `Usar propuesta` | none | Primary dentro de la propuesta |
| `producer.promptEnhancement.reject` | action | `Descartar` | none | Conserva original |
| `producer.promptEnhancement.timeout` | error | `La mejora está tardando más de lo esperado.` | none | Ofrece reintento seguro |
| `producer.promptEnhancement.unavailable` | error | `No pudimos preparar una mejora ahora.` | none | Error sanitizado |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Mejorar` | none | `Mejorar` | Prompt no vacío |
| loading | `Analizando tu prompt…` | `Puedes seguir revisando la configuración.` | none | `aria-busy`, dedupe |
| empty | `Escribe una idea primero` | none | focus textarea | No request |
| partial | `Propuesta lista con advertencias` | Explica restricciones no verificables | `Usar propuesta` / `Descartar` | No oculta incertidumbre |
| error | `No pudimos preparar una mejora ahora` | Mensaje canónico + correlation id | `Reintentar` | Original intacto |
| denied | `Mejora no habilitada` | Razón de capability/policy | none | El CTA no aparenta disponibilidad |

## Accessibility Contract

- Heading order: la banda usa un heading contextual no mayor que el heading del composer.
- Chart/table alternatives: not applicable.
- Aria labels: CTA pendiente, propuesta, aceptar, descartar y reintentar tienen labels completos.
- Focus notes: no se roba foco durante loading; al completar se anuncia por live region y el usuario puede
  navegar a la propuesta; aceptar devuelve foco al textarea.
- Color-independent state labels: `Analizando`, `Lista`, `Con advertencias` y `No disponible` son texto visible.

## Implementation Mapping

- Route / surface: `https://globe.efeoncepro.com/producer`; `../efeonce-globe/apps/studio-web`.
- Primitives: capability button, prompt field, inline enhancement proposal y live region existentes.
- Variants / kinds: extend existing Producer patterns; no new platform primitive.
- Component candidates: `producer-ui.ts`, `producer-controller.ts`, `producer-client.ts`.
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`.
- Data reader / command: `globe.lab.prompt.enhance`, `.enhancement.accept`, `.enhancement.reject`, `.prompt.history`.
- API parity: el browser envía contexto client-safe; domain resuelve catálogo/perfil y el enhancer corre server-side.
- Access / capability: `globe.lab.experiment.run` mediante trusted context; descriptors `globe.lab.prompt.*`.
- Runtime consumers: UI, HTTP, SDK, CLI, worker y E2E según coverage canónico; MCP conserva su gate vigente.
- Print/email/PDF considerations: not applicable.
- GVC markers: `producer-prompt-bar`, `producer-prompt-enhancement-pending`,
  `producer-prompt-enhancement-ready`, `producer-prompt-enhancement-error`.

## GVC Scenario Plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` extendido con estados de TASK-1530.
- Route: `/producer?gvc=task-1530-prompt-enhancement`
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`
- Required steps: escribir prompt; seleccionar rutas Image/Video/Audio; pulsar Mejorar; capturar pending; esperar
  propuesta; aceptar; repetir con error/timeout y con cambio de ruta durante request.
- Required captures: idle, pending, ready, warning, error y accepted en desktop/mobile.
- Required `data-capture` markers: los cuatro markers de Implementation Mapping.
- Assertions: un request por idempotency key; original intacto antes de aceptar; propuesta aplicada sólo tras
  aceptación; respuesta tardía no pisa prompt/ruta nueva.
- Scroll-width checks: `scrollWidth === clientWidth` en ambos viewports.
- Accessibility/focus checks: teclado completo, live announcement, focus restore y disabled/busy semánticos.
- Reduced-motion evidence: pending y transición de propuesta conservan significado sin animación.
- Review dossier: `required`
- Baseline surface ID: `globe.creative-producer-surface`; registrar delta TASK-1530 tras aprobación.

## Design Decision Log

- Decision: extender el prompt bar y la propuesta inline aprobada con un estado de latencia honesto y contexto de
  modelo/ruta.
- Alternatives considered: modal de propuesta; toast-only; reemplazo automático; chat multi-turn.
- Why this pattern: mantiene visible la relación fuente→propuesta, preserva el prompt original y evita una nueva
  superficie para una operación atómica.
- Reuse / extend / new primitive: `extend`; no nace primitive paralela.
- Open risks: latencia del LLM, perfiles obsoletos tras cambios de catálogo y propuestas que agreguen detalles no
  solicitados.
- Follow-up: un agente conversacional multi-turn, si se justifica, requiere task/flujo separado.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives or are not applicable.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for the existing fixture.
- [x] Design decision log explains reuse/extend/new before implementation starts.
