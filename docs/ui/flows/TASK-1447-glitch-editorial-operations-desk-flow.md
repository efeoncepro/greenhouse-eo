# TASK-1447 — Glitch Editorial Operations Desk Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1447 — Glitch Editorial Operations Desk`
- Related wireframe: [TASK-1447-glitch-editorial-operations-desk.md](../wireframes/TASK-1447-glitch-editorial-operations-desk.md)
- Intended route / surface: `/growth/glitch`
- Flow type: `command-backed`
- Primary primitives: `CompositionShell`, `ContextualSidecar`, `DataTableShell`
- Copy source: `src/lib/copy/glitch.ts`

## Flow Brief

- Primary user: editor/a u operador/a de contenidos Efeonce.
- Entry moment: revisa Weekly, una candidata Daily/Flash o un run con excepción.
- Successful outcome: comprende evidencia/decisión y completa una acción gobernada sin abrir un bypass.
- Primary decision/action: revisar candidata, proponer/confirmar Glitch Flash o recuperar run.
- Non-goals: editar WordPress, publicar, modificar calendario estructural o cambiar prompts.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Glitch Desk | Entry/context | regiones lead/primary/dock | regions stack con tab activa | `CompositionShell` |
| Evidence inspector | fuentes, claims y actions | lane in-flow no modal | Drawer temporal | `ContextualSidecar` |
| Confirm promotion | consecuencia explícita | Dialog sólo para confirm final si policy lo exige | Dialog | MUI Dialog/Greenhouse actions existentes |
| Notion/WP external | destino auxiliar | link en nueva pestaña | link externo | no embedded UI |

## Flow Map

1. Entry: abre `/growth/glitch`; Weekly activa por defecto y muestra excepciones primero.
2. Primary action: selecciona historia/candidata/run; abre evidence inspector.
3. Transition: cambia tab o selección sin perder filtros; URL usa query estable para deep link no sensible.
4. User decision: propone Glitch Flash, confirma promoción, reemplaza candidata Weekly o reintenta run según capability.
5. Completion: command devuelve estado/audit; lista e inspector se invalidan y anuncian resultado.
6. Recovery / exit: error conserva contexto; Escape/cerrar restaura foco; dirty state no existe en V1 salvo nota de promoción editable futura.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| seleccionar row | queue | inspector open | Enter/Space | selection visible |
| cerrar inspector | inspector | closed | Escape | restore row focus |
| proponer Flash | inspector | promotion proposed | button Enter/Space | no write WordPress |
| confirmar promoción | inspector/dialog | promotion confirmed | button Enter/Space | habilita private draft adapter |
| retry run | run dock | pending -> complete/error | button Enter/Space | idempotent command |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | sin selección contextual | route/tab entry | select row | queue conserva foco |
| opening | carga detalle | select/deep link | reader resolved | skeleton in-flow |
| open | evidencia visible | reader success | close/replace | non-modal desktop |
| loading | command/read pendiente | action | success/error | disable only conflicting action |
| error | fallo seguro | reader/command error | retry/close | recovery + no raw error |
| dirty | no usado V1 | n/a | n/a | evitar formularios locales |
| complete | acción confirmada | command success | next selection | live status + audit ref |

## Routing Contract

- Route changes: `query`
- Canonical URL: `/growth/glitch`
- Deep-link behavior: query puede identificar tab y entity opaque id; subject/access se revalida server-side.
- Back button behavior: restaura selección/tab anterior antes de salir de la route.
- Reload behavior: reader rehidrata estado válido; command pending se reconcilia, no se repite automáticamente.
- Shareability: sólo entre operadores con acceso; URL no concede autorización.

## Focus & Accessibility

- Initial focus: H1 o first exception summary; no autofocus agresivo.
- Escape behavior: cierra sidecar/drawer o Dialog superior.
- Click-away behavior: desktop sidecar no cierra por click-away; mobile Drawer sí si no hay command pending.
- Focus restore: row/action que abrió la superficie.
- Modal vs non-modal semantics: inspector `complementary`; sólo confirm final puede ser modal.
- Screen reader announcement: command result y cambio de evidence completeness mediante status live region.
- Keyboard traversal: tabs -> queue -> inspector -> actions; sin focus trap en desktop.
- Reduced motion: transitions instantáneas con significado/state intacto.

## Data & Command Boundaries

- Readers: Glitch candidate/edition/run/evidence/promotion readers TASK-1442/1448.
- Commands: promotion propose/confirm/execute TASK-1448; run recovery TASK-1445; Weekly composition commands existentes del dominio.
- API routes: adapters API Platform definidos por tasks backend; UI no accede DB/providers.
- Optimistic updates: sólo selection local; business state espera confirmación server.
- Cache / invalidation: invalidar entity/list tras command; reconciliar pending al reload.
- Audit / signals: command result incluye audit reference; failures capturados por dominio.
- Tenant / access boundary: sesión operador + view/capabilities; query IDs no sustituyen auth.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | pantalla denied sin datos parciales | volver/pedir acceso | fail closed |
| not found / empty | estado vacío contextual | limpiar deep link | |
| partial / degraded | conserva datos confiables y marca faltantes | revisar evidencia/run | no complete falso |
| stale data | bloquea confirm y pide refrescar | refresh reader | preserves proposal |
| timeout / API error | mantiene selection y muestra recovery | retry idempotente | |
| dirty exit | N/A V1 | none | no local authoring |

## GVC Scenario Plan

- Scenario: `glitch-editorial-operations-desk`
- Scenario file: `scripts/frontend/scenarios/glitch-editorial-operations-desk.scenario.ts`
- Route: `/growth/glitch`
- Viewports: 2048x1280, 1440x900, 390x844.
- Required steps: open candidate, close/restore focus, propose, confirm disclosure, command result, run retry/error.
- Required captures: queue+inspector, modal consequence, success audit, error recovery, mobile Drawer.
- Required `data-capture` markers: `glitch-desk`, `glitch-candidate-queue`, `glitch-evidence-inspector`, `glitch-promotion-confirm`, `glitch-run-dock`.
- Assertions: no public publish action; Daily/Flash action label is promote; focus restoration; status live region.
- Scroll-width checks: desktop/mobile document widths and accessible local table scroll.
- Accessibility/focus checks: tab order, Escape, non-modal semantics, modal focus trap only confirm.
- Reduced-motion evidence: same flow with reduced motion and no lost focus/status.

## Design Decision Log

- Decision: single route with query-addressable queue + inspector and modal only at the consequential confirmation boundary.
- Alternatives considered: cross-route candidate detail; permanent three-column custom grid; drawer for all desktop review.
- Why this pattern: preserves comparison context and makes evidence/action relationship explicit.
- Reuse / extend / new primitive: reuse CompositionShell and ContextualSidecar.
- Open risks: confirm may be safe enough inline if backend preview is complete; decide during Plan Mode.
- Follow-up: no multi-step composer until real editorial need appears.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided.
- [x] Failure paths are user-safe and do not expose internals.
- [x] GVC sequence captures prove the flow, not only static screens.
- [x] Design decision log explains why the flow uses these surfaces/routes.

