# TASK-1247 — Admin Review UI Flow Contract (nodo S13 · release gate)

> Nodo **S13 / Journey F** del master flow `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`. Gate humano de `review_required` antes del release público. Dirección **Review Command Center** (aprobada 2026-06-25).

## Meta

- Status: `draft`
- Owner task: `TASK-1247 — Admin Review UI`
- Related wireframe: [docs/ui/wireframes/TASK-1247-growth-ai-visibility-admin-review-ui.md](../wireframes/TASK-1247-growth-ai-visibility-admin-review-ui.md)
- Intended route / surface: `/admin/growth/ai-visibility` (+ `/review` child)
- Flow type: `command-backed`
- Primary primitives: CompositionShell `leadPlusContext`, AdaptiveSidecar `reconciler`, `GreenhouseAsyncActionButton`
- Copy source: `src/lib/copy/growth.ts`

## Flow Brief

- Primary user: revisor interno (capability `report.review`)
- Entry moment: hay reportes en `review_required`
- Successful outcome: aprueba (→ publica) o rechaza con razón, auditable
- Primary decision/action: aprobar/rechazar tras leer evidencia
- Non-goals: editar scoring, reescribir provider, prompt packs

## Surfaces Involved

| Surface | Role | Desktop | Compact | Primitive |
|---|---|---|---|---|
| Queue lane | entry + contexto | lane lead in-flow | apilado/drawer | DataTableShell + card-density |
| Reconciler detail | revisión + decisión | AdaptiveSidecar `reconciler` in-flow | drawer | AdaptiveSidecar |
| Reject confirm | confirmación de consecuencia | Dialog | Dialog | Dialog |

## Flow Map

1. Entry: cola `/admin/growth/ai-visibility` con pendientes (counts/SLA/risk).
2. Primary action: selecciona un reporte → reconciler detail (preview público exacto + razones internas acotadas + evidence ledger).
3. Transition: revisa publish-readiness checklist (DTO público, disclaimer, evidencia completa o explícitamente parcial).
4. User decision: **Aprobar y publicar** (→ report/publish) o **Rechazar** (→ Dialog confirma → reject con razón capturada).
5. Completion: comando OK (aria-live) → fila sale de la cola → foco vuelve a la cola.
6. Recovery / exit: conflicto multi-revisor → refresca; evidencia incompleta → bloquea aprobación silenciosa.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Seleccionar fila | queue row | reconciler detail | Enter | abre sidecar in-flow |
| Aprobar | botón | publish command | foco+Enter | balanceado, no pre-focuseado |
| Rechazar | botón | Dialog confirm | foco+Enter | razón obligatoria |
| Cerrar detail | esc/click-away | queue | Esc | solo si no hay comando pending |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | sin selección | entrar a la cola | seleccionar | cola |
| open | detalle abierto | seleccionar | acción/cierre | reconciler + ledger |
| loading | cargando cola/detalle | navegar | data lista | skeleton |
| pending | comando en vuelo | aprobar/rechazar | OK/error | botones disabled, command feedback |
| error | comando/reader falló | error | reintentar | feedback persistente |
| stale/conflict | otro revisor accionó | guard de versión | refresh | "ya fue revisado por X", NO error genérico |
| complete | aprobado/rechazado | comando OK | — | sale de cola, foco a cola |

## Routing Contract

- Route changes: `path/segment` (`/admin/growth/ai-visibility` + `/review` + selección por query/segment)
- Canonical URL: `/admin/growth/ai-visibility`
- Deep-link behavior: deep-link a un review específico abre su detalle
- Back button behavior: cierra el detalle → cola
- Reload behavior: re-fetch de cola (estado actual)
- Shareability: interno (capability); link a review específico

## Focus & Accessibility

- Initial focus: primera fila pendiente (o detalle si deep-link)
- Escape behavior: cierra el sidecar si no hay comando pending
- Click-away behavior: igual que escape
- Focus restore: vuelve a la fila revisada tras acción/cierre
- Modal vs non-modal: detalle NO modal (in-flow sidecar); SOLO el reject-confirm es Dialog modal
- Screen reader announcement: resultado del comando vía aria-live; conflicto anunciado
- Keyboard traversal: cola → detalle → ledger → decisión
- Reduced motion: sin stagger/morph obligatorio

## Data & Command Boundaries

- Readers: cola de reviews + run detail/evidence (TASK-1244) — `/api/admin/growth/ai-visibility/reviews` + `runs/[runId]`
- Commands: `approveAiVisibilityReport` · `rejectAiVisibilityReport` · `report/publish` (TASK-1244) — con **guard de versión/estado** (conflicto multi-revisor)
- API routes: `runs/[runId]/review/approve` · `…/review/reject` · `…/report/publish`
- Optimistic updates: NO (decisión de consecuencia; esperar confirmación del comando)
- Cache / invalidation: refrescar la cola tras acción + en conflicto
- Audit / signals: audit del approve/reject (TASK-1244); feedback persistente
- Tenant / access boundary: capability `report.review`; interno, NUNCA `client_*`

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | sin capability → permission denied | — | no `growth_*` real |
| not found / empty | "Sin reportes pendientes" | — | cola vacía |
| partial / degraded | **"Evidencia incompleta / Pendiente"** | no aprobar en silencio | riesgo #1 |
| stale data | "ya fue revisado por X" | refrescar | guard de versión |
| timeout / API error | feedback persistente de error | reintentar | no toast efímero |
| dirty exit | esc bloqueado si comando pending | esperar | anti pérdida |

## GVC Scenario Plan

- Scenario: admin review release gate
- Scenario file: `scripts/frontend/scenarios/growth-ai-visibility-admin-review.scenario.ts`
- Route: `/admin/growth/ai-visibility` (o mockup)
- Viewports: desktop + mobile
- Required steps: cola → seleccionar → ledger → aprobar (pending→success) / rechazar (Dialog) / conflicto
- Required captures: empty, cola+detalle, pending/success/error, conflicto
- Required `data-capture` markers: `admin-review-queue`, `admin-review-detail`, `admin-review-actions`
- Assertions: noLoginRedirect, noErrorBoundary; sin evidencia cruda en DOM
- Scroll-width checks: desktop + 390
- Accessibility/focus checks: focus order, aria-live, reject-confirm Dialog
- Reduced-motion evidence: sin morph obligatorio

## Design Decision Log

- Decision: release gate workbench con razones internas acotadas JUNTO al DTO público exacto; reconciler sidecar in-flow; reject = Dialog
- Alternatives considered: modal/drawer custom (rechazado); preview público como única evidencia (rechazado: el revisor necesita razones internas)
- Why this pattern: seguridad de release (no aprobar sobre evidencia incompleta) + concurrencia multi-revisor first-class
- Reuse / extend / new primitive: reuse total
- Open risks: guard de versión en commands de 1244; capability grant real

## Acceptance Checklist

- [ ] The owning task declares this file in `Flow`.
- [ ] Every surface has desktop and compact behavior.
- [ ] Opening, closing, escape and focus restore are specified.
- [ ] Route/deep-link/back-button behavior is explicit.
- [ ] Data readers/commands are named and UI-only business logic is avoided.
- [ ] Failure paths are user-safe (evidencia incompleta + conflicto multi-revisor).
- [ ] GVC sequence captures prove the flow, not only static screens.
- [ ] Design decision log explains why the flow uses these surfaces/routes.
