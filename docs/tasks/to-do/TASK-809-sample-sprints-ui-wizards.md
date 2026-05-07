# TASK-809 — Sample Sprints UI + Wizards (Declaration / Approval / Progress / Outcome)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado`
- Domain: `commercial / ui`
- Blocked by: `TASK-801, TASK-802, TASK-803, TASK-804, TASK-805, TASK-806, TASK-807, TASK-808`
- Branch: `task/TASK-809-sample-sprints-ui-wizards`

## Summary

UI completa del Epic en módulo Agency: `/agency/sample-sprints` (lista con conversion rate trailing + agrupación per-cliente) + 4 wizards (declaración, approval con capacity warning, progress weekly snapshot, outcome con upload reporte). Sub-tipos visibles ("Operations Sprint" / "Extension Sprint" / "Validation Sprint" / "Discovery Sprint"). 6 reliability signals visibles en `/admin/operations` subsystem `Commercial Health`.

## Approved Mockup Context

- Mockup del programa aprobado por usuario el 2026-05-07.
- Ruta: `/agency/sample-sprints/mockup`.
- Artefactos: `src/app/(dashboard)/agency/sample-sprints/mockup/page.tsx` y `src/views/greenhouse/agency/sample-sprints/mockup/SampleSprintsMockupView.tsx`.
- Esta task debe convertir el mockup aprobado en UI real: reemplazar mock data por readers/API/helpers reales, no reinterpretar layout, flujo ni jerarquía visual. Desviaciones significativas requieren update del mockup y re-aprobación.

## Why This Task Exists

Sin UI, las primitivas de los slices anteriores son inaccesibles para operadores. Este es el último slice antes del CHECK constraint anti-zombie (TASK-810). Operators necesitan: declarar Sample Sprints, ver capacity warning antes de aprobar, registrar snapshots weekly, cerrar con outcome + reporte. La UI cierra el loop end-to-end del Epic.

## Goal

- Path `/agency/sample-sprints` lista activos + históricos con filtros por cliente, engagement_kind, status, conversion outcome.
- Conversion rate trailing 6m visible en header (consume helper de TASK-807).
- Agrupación visual per-cliente (Sky con 2 Sprints simultáneos visible junto).
- 4 wizards canónicos:
  - **Declaración** (`/agency/sample-sprints/new`): cliente, engagement_kind, equipo propuesto, expected_internal_cost_clp, decision_deadline, success_criteria. Crea service `pending_approval`.
  - **Approval** (`/agency/sample-sprints/[id]/approve`): muestra capacity warning soft. Si > 100%, requiere `capacity_override_reason`. Approval flip a `status='active'`.
  - **Progress** (`/agency/sample-sprints/[id]/progress`): wizard semanal con metrics_json + qualitative_notes. UNIQUE per `(service_id, snapshot_date)` — UI maneja error gracefully.
  - **Outcome** (`/agency/sample-sprints/[id]/outcome`): selección de outcome_kind (5 valores), decision_rationale, opcional upload reporte (asset uploader canónico TASK-721), opcional `next_quotation_id` selector. Si `converted` → dispara `convertEngagement` helper de TASK-808.
- Página detalle `/agency/sample-sprints/[id]`: fases timeline, equipo asignado, costo acumulado vs budget, días hasta decisión, audit log feed.
- Capability gating UI: usuarios sin `commercial.engagement.*` no ven los menús.

## Architecture Alignment

Spec: `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` §7 + §7.1.

Reglas obligatorias:

- UI label "Sample Sprint" + sub-tipos ("Operations Sprint" / "Extension Sprint" / "Validation Sprint" / "Discovery Sprint").
- Schema interno usa `engagement_*` — UI traduce para mostrar.
- Capability gating con `commercial.engagement.*` (NO reusar admin genérico).
- Asset uploader canónico TASK-721 para upload reporte (NO ad-hoc).
- Wizards usan helpers TS de slices previos — NO query directos a tablas.
- Conversion wizard dispara `convertEngagement` helper de TASK-808 (transacción atómica).

Skills a invocar antes de escribir UI:

- `greenhouse-ux-writing` — todos los strings visibles (labels, helper text, error messages, empty states).
- `greenhouse-ui-review` — pre-commit token compliance.
- `greenhouse-microinteractions-auditor` — feedback states, transitions, loading.

## Slice Scope

Routes:

- `src/app/(dashboard)/agency/sample-sprints/page.tsx` — lista
- `src/app/(dashboard)/agency/sample-sprints/new/page.tsx` — wizard declaración
- `src/app/(dashboard)/agency/sample-sprints/[serviceId]/page.tsx` — detalle
- `src/app/(dashboard)/agency/sample-sprints/[serviceId]/approve/page.tsx` — approval
- `src/app/(dashboard)/agency/sample-sprints/[serviceId]/progress/page.tsx` — snapshot wizard
- `src/app/(dashboard)/agency/sample-sprints/[serviceId]/outcome/page.tsx` — outcome wizard

API routes:

- `src/app/api/agency/sample-sprints/route.ts` — list + create
- `src/app/api/agency/sample-sprints/[serviceId]/route.ts` — detail
- `src/app/api/agency/sample-sprints/[serviceId]/approve/route.ts` — approve
- `src/app/api/agency/sample-sprints/[serviceId]/progress/route.ts` — record progress
- `src/app/api/agency/sample-sprints/[serviceId]/outcome/route.ts` — record outcome
- `src/app/api/admin/commercial/engagement-approvals/route.ts` — admin overview

Componentes:

- `EngagementListView` (con grouping per-cliente)
- `EngagementDeclareWizard`
- `EngagementApprovalWizard` (con CapacityWarningBanner)
- `EngagementProgressWizard`
- `EngagementOutcomeWizard` (con AssetUploader integration)
- `EngagementDetailView` (fases timeline + audit log feed)

Tests:

- E2E Playwright + agent auth: declarar Sample Sprint → aprobar → registrar 4 snapshots → cerrar con outcome=converted → verificar lifecycle flip.
- E2E: declarar → aprobar con capacity warning + override → verificar audit log row.
- E2E: outcome=cancelled_by_client → verificar cancellation_reason required.
- Visual regression Playwright: 4 viewports (desktop/tablet/mobile) por wizard.
- Capability tests: usuario sin `commercial.engagement.read` → 403.

## Acceptance Criteria

- 6 routes UI funcionales bajo `/agency/sample-sprints/`.
- 6 API routes con capability gating + helpers TS de slices previos.
- 6 componentes principales con tests unitarios.
- 5 E2E tests Playwright verde.
- Visual regression baseline establecida.
- `pnpm build` verde sin warnings de UI.
- skill `greenhouse-ux-writing` invocada para validar tono es-CL.
- skill `greenhouse-ui-review` invocada pre-commit (token compliance).

## Dependencies

- Blocked by: TASK-801 a TASK-808 (todos los slices anteriores).
- Bloquea: TASK-810 (CHECK anti-zombie debe aplicar después que la UI esté funcionando para validar que pilotos legítimos no son falsos positivos).

## References

- Spec: §7 + §7.1 (sub-tipos UI mapping)
- Skills: `greenhouse-ux-writing`, `greenhouse-ui-review`, `greenhouse-microinteractions-auditor`, `modern-ui` (greenhouse overlay)
- Epic: `docs/epics/to-do/EPIC-014-sample-sprints-engagement-platform.md`
