# TASK-1247 / Admin Review UI — Wireframe (nodo S13 · "Review Command Center")

> Nodo **S13 / Journey F** del master flow `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`: el **gate humano de calidad** antes de publicar un reporte (`review_required`). Dirección Product Design **aprobada por el operador (2026-06-25): "Review Command Center"** + evidence ledger de "Evidence Ledger Review" + checklist público-safe de "Reconciler Studio".
> Referencias durables: `docs/assets/product-design/task-1247-ai-visibility-admin-review/review-command-center.png` (base), `…/evidence-ledger-review.png`, `…/reconciler-studio.png`.

## Meta

- Status: `draft`
- Owner task: TASK-1247
- Product Design asset: Review Command Center (PNGs ↑) + master flow EPIC-020 Journey F
- Intended consumers: operador interno Growth/Marketing Ops o admin Efeonce (capability `growth.ai_visibility.report.review`) — NUNCA `client_*`
- Copy source: menú `greenhouse-nomenclature.ts`/`greenhouse-navigation-copy.ts`; funcional `src/lib/copy/growth.ts`
- Primitive decision: `reuse` — CompositionShell (`leadPlusContext`), AdaptiveSidecar variant **`reconciler`**, `GreenhouseAsyncActionButton`, `GreenhouseCommandFeedback`, tables/cards
- UI ready target: `no`

## Brief

- Primary user: revisor interno (release gate)
- User moment: un reporte escaló a `review_required` antes del release público
- Job to be done: entender el riesgo, comparar evidencia, aprobar/rechazar con feedback auditable
- Primary decision signal: completitud de evidencia + razón del gate + DTO público exacto
- Non-goals: editar scoring, reescribir respuestas de provider, configurar prompt packs

## Layout Skeleton (release gate workbench, NO dashboard)

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | breadcrumb + título + counts/SLA/risk summary + postura de acción capability-safe | `GreenhouseBreadcrumbs` + summary | reviews reader |
| 1 (lead) | **Queue lane** | filtros/búsqueda + filas densas: marca, score, razón del gate, tipo de riesgo, completitud de evidencia, edad, reviewer/lock, conflicto | `DataTableShell` + `card-density` | `/api/admin/.../reviews` |
| 2 (context) | **Reconciler/detail lane** (AdaptiveSidecar `reconciler`) | preview WYSIWYG del reporte público + razones internas acotadas + warning de evidencia + audit trail + controles de decisión | AdaptiveSidecar `reconciler` | run detail (1244) |
| 2a | **Evidence ledger** | checklist cronológico: score gate · accuracy detector · public snapshot check · provider coverage · publish readiness (status + detalle acotado + impacto + timestamp; evidence peeks acotados, NUNCA dumps crudos) | ledger list | run evidence (1244) |
| 2b | **Publish readiness checklist** | DTO público exacto · sin evidencia cruda · disclaimer presente · evidencia completa o explícitamente parcial · razón de rechazo capturada | checklist | derived |
| 3 | **Decision area** | aprobar/rechazar **balanceados** (sin CTA aprobar pre-focuseada, sin sesgo a publicar) | `GreenhouseAsyncActionButton` ×2 | approve/reject (1244) |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.aeo.review.queue.title` | 0 | Cola de revisión AEO | counts | release gate |
| `growth.aeo.review.evidence.incomplete` | 2a | Evidencia incompleta | — | NUNCA aprobar silenciosamente sobre slice fallido |
| `growth.aeo.review.conflict` | 1/2 | Este reporte ya fue revisado por {operador} — actualizando cola | operador | conflicto multi-revisor, no error genérico |
| `growth.aeo.review.approve` | 3 | Aprobar y publicar | — | balanceado |
| `growth.aeo.review.reject` | 3 | Rechazar | — | dispara Dialog de confirmación (consecuencia) |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| default | — | cola + detalle seleccionado | — | |
| loading | — | skeleton de cola y detalle | — | |
| empty | Sin reportes pendientes | nada que revisar | — | |
| error | No pudimos cargar la cola | — | reintentar | reader/command |
| degraded/partial | **Evidencia incompleta / Pendiente** | qué slice faltó | — | **riesgo de seguridad #1: nunca render confiado sobre slice fallido** |
| stale/conflicto | Este reporte ya fue revisado por {X} | actualizando cola | refrescar | guard de versión (1244); NO error genérico |
| permission denied | — | sin capability `report.review` | — | |

## Accessibility Contract

- Heading order: h1 (cola) → h2 (detalle) → h3 (evidence ledger / checklist)
- Chart/table alternatives: el preview público hereda las del report-artifact; ledger es texto
- Aria labels: filas de cola + acciones; resultado de comando vía aria-live
- Focus notes: foco al detalle al seleccionar; vuelve a la fila revisada tras acción/cierre
- Color-independent: riesgo/completitud como texto + ícono, no solo color
- Reject = Dialog con confirmación explícita (acción de consecuencia legal/pública)

## Implementation Mapping

- Route / surface: `/admin/growth/ai-visibility` (menú Growth → AEO Grader); `/review` child/deep-link. routeGroup `admin`, NUNCA `client_*`
- Primitives: CompositionShell `leadPlusContext` + AdaptiveSidecar `reconciler` + `GreenhouseAsyncActionButton` + `GreenhouseCommandFeedback` + `DataTableShell` + `card-density`
- Variants / kinds: `leadPlusContext`, AdaptiveSidecar `reconciler`
- Component candidates: queue lane + reconciler detail + evidence ledger + publish-readiness checklist + decision area
- Copy source: `growth.ts` (funcional) + nomenclatura (menú)
- Data reader / command: cola reader + `approveAiVisibilityReport` / `rejectAiVisibilityReport` + `report/publish` (TASK-1244) — endpoints `/api/admin/growth/ai-visibility/reviews` + `runs/[runId]/review/{approve,reject}` + `report/publish`
- API parity: la UI es cliente de los commands de 1244; cero lógica de aprobación local
- Access / capability: viewCode `administracion.growth_ai_visibility` (seed mismo PR, TASK-827) + capability `growth.ai_visibility.report.review` (cross-check: 1244 la granteó a ≥1 ROLE_CODE interno real — no existe `growth_*`) + route-reachability (TASK-982)
- States to implement: default/loading/empty/error/partial/stale-conflict/denied/mobile
- GVC markers: `admin-review-queue`, `admin-review-detail`, `admin-review-actions`

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-ai-visibility-admin-review.scenario.ts`
- Route: `/admin/growth/ai-visibility` (o mockup)
- Viewports: desktop 1440 + mobile 390
- Required steps: cola → seleccionar reporte → evidence ledger → decisión (pending/success/error)
- Required captures: empty, cola+detalle, command pending/success/error, conflicto
- Required `data-capture` markers: `admin-review-queue`, `admin-review-detail`, `admin-review-actions`
- Assertions: noLoginRedirect, noErrorBoundary; ninguna evidencia cruda de provider en el DOM
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390
- Accessibility/focus checks: focus order, aria-live del comando, keyboard action, reject-confirm Dialog
- Reduced-motion evidence: sin stagger/morph obligatorio

## Design Decision Log

- Decision: **Review Command Center** (release gate workbench) + evidence ledger (checklist cronológico) + publish-readiness checklist público-safe; `leadPlusContext` + AdaptiveSidecar `reconciler`
- Alternatives considered: landing/hero público / gradientes-orbs / vanity tiles / tabla de transcript crudo / muro de logos / modal o drawer custom para review (todas **rechazadas**)
- Why this pattern: superficie interna safety-oriented; el revisor necesita las razones internas acotadas JUNTO al artefacto público exacto, no solo el preview
- Reuse / extend / new primitive: reuse total (CompositionShell + AdaptiveSidecar `reconciler` + async action/feedback) — sin primitive nueva
- Open risks: conflicto multi-revisor exige guard de versión en el command de 1244; capability grant real (no `growth_*`); el preview público debe ser el DTO público EXACTO

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit (**evidencia incompleta nunca aprobable en silencio**).
- [ ] Conflicto multi-revisor es first-class (refresh, no error genérico).
- [ ] Charts/preview tienen alternativa; ledger sin dumps crudos de provider.
- [ ] State and aria copy ready; reject con Dialog de confirmación.
- [ ] Implementation mapping nombra primitive, copy source, commands (1244) y route/surface.
- [ ] GVC scenario plan específico para `pnpm fe:capture`.
- [ ] Design decision log explica reuse + direcciones rechazadas.
