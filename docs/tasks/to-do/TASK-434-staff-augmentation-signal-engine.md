# TASK-434 — Staff Augmentation Assignment Economics Signal Engine

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-434-staff-augmentation-signal-engine`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (Eje 1)

## Summary

Agrega un Signal Engine scoped a nivel `assignment_id` para Staff Augmentation, reusando el stack Finance. Detecta placements con margen debajo de umbral, assignments con trend negativo y riesgo de renewal. Effort menor que Payroll porque el detector Finance ya soporta escalas distintas a `client_id`; esta task principalmente conecta dimensiones nuevas y agrega la surface.

## Why This Task Exists

Staff Augmentation tiene economía por placement que hoy se consume en agregado (Finance dashboard por cliente). Cuando un assignment individual está en pérdida o por debajo de margen esperado, se detecta tarde — cuando el problema ya escaló al cliente o ya se perdió el período de renewal.

Razones adicionales:

- Placements tienen ciclo contractual propio (renewal date, rate, duración).
- Una pérdida por placement puede ocultarse en el agregado por cliente si otros placements del mismo cliente compensan.
- El detector Finance actual opera a `client_id`; extenderlo a `assignment_id` es cambio de dimensión, no de modelo.

## Goal

- Detector operando sobre métricas de assignment: `assignment_margin_pct`, `assignment_revenue`, `assignment_cost`, `days_to_renewal`.
- Materialización + enrichment siguiendo el pattern canónico.
- Reader scoped por `assignment_id` y por `client_id` (agregado a nivel staff aug).
- Surface en `/agency/staff-augmentation` o equivalente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — Eje 1.
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — patrón.
- Spec relevante de Staff Augmentation (validar en planning qué doc canónico existe).

Reglas obligatorias:

- Reusar el detector `src/lib/finance/ai/anomaly-detector.ts` parametrizando la dimensión (no duplicar código).
- No crear tabla paralela si el Finance Signal schema permite agregar `assignment_id` nullable al schema existente. Decisión en planning.
- Integrar con entitlements: solo roles con acceso a staff aug ven estos insights.
- Advisory-only.

## Normative Docs

- `src/lib/finance/ai/anomaly-detector.ts`
- `src/views/greenhouse/agency/staff-augmentation/` (si existe; validar path actual)
- `src/lib/agency/staff-augmentation/` (si existe)

## Dependencies & Impact

### Depends on

- Finance Signal Engine estable (TASK-245, cerrado).
- Modelo de assignment con economics tracked a nivel row (confirmar en planning).

### Blocks / Impacts

- Agency Pulse global puede consumir estos signals en un futuro roll-up.
- TASK-436 (push) puede escalar assignments críticos a responsable de cuenta.

### Files owned

- Migración PG: decisión entre (a) extender `finance_ai_signals` con `assignment_id` nullable + CHECK constraint, o (b) crear `staff_aug_ai_signals` dedicada. Recomendación: **(a)** si el agregado tiene > 80% de columnas en común; **(b)** si no.
- `src/lib/agency/staff-augmentation/ai/` (nuevo) — detector wrapper, reader, worker
- Prompt: `staff_aug_signal_enrichment_v1.ts`
- API: `GET /api/agency/staff-augmentation/nexa-insights`
- UI: tab/sección en staff augmentation view

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema decision

- Evaluar columnas en común entre Finance y Staff Aug signals. Si el diff es menor (<20% columnas nuevas), extender tabla existente con `assignment_id` nullable + índice parcial.
- Si el diff es mayor, crear `staff_aug_ai_signals` dedicada siguiendo el patrón de naming.
- Documentar la decisión en el comentario de la migración.

### Slice 2 — Detector extension

- Parametrizar el detector Finance para aceptar dimensión (`client_id`, `organization_id`, o `assignment_id`) como argumento.
- Si el refactor rompe cosas, crear un wrapper específico en `src/lib/agency/staff-augmentation/ai/` sin tocar Finance.
- Métricas soportadas (validar en planning): `margin_pct`, `revenue`, `cost`, `days_to_renewal` (signal: renewal proxima sin acción).

### Slice 3 — Worker y reader

- Worker LLM con prompt dedicado: vocabulario "placement", "renewal", "rate", "utilization", "margen del asignment".
- Reader:
  - `readStaffAugAiLlmSummary(year, month, limit)` — portfolio
  - `readAssignmentAiLlmSummary(assignmentId, year, month)` — scoped

### Slice 4 — API endpoints

- `GET /api/agency/staff-augmentation/nexa-insights` — guard con entitlement `agency.staff_augmentation.view`.
- Query params: `client_id?`, `period_year`, `period_month`.

### Slice 5 — UI surface

- Tab/sección en staff augmentation renderiza `NexaInsightsBlock`.
- Mentions: `@[name](assignment:ASSIGNMENT_ID)` → link a detalle de assignment.
- Para severity critical de `days_to_renewal`, el CTA natural es "Abrir assignment" — integra con TASK-435 (CTAs) cuando esté listo.

### Slice 6 — Outbox events

- `staff_aug.ai_signals.materialized`
- `staff_aug.ai_llm_enrichments.materialized`

## Out of Scope

- Notificación automática al account manager — follow-on con TASK-436.
- Predictor de renewal (probability of renewal) — eso es modelo ML más complejo, no Z-score. Follow-on.
- Integration con HubSpot deals asociados al placement — follow-on cuando el bridge CRM esté maduro.

## Acceptance Criteria

- [ ] Schema decision documentada en la migración.
- [ ] Detector opera sobre dimensión `assignment_id` sin romper Finance existente.
- [ ] Reader devuelve insights scoped por assignment y agregados.
- [ ] UI renderiza insights en staff aug surface, mentions a assignment funcionan.
- [ ] Outbox events emitidos.
- [ ] Dry-run sobre assignments históricos genera signals plausibles (validación manual con lead de staff aug).
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.

## Verification

- Validación manual con lead de staff augmentation sobre N=10 signals históricos.
- Test de integración: detector con dimensión assignment_id no se confunde con client_id.
- Verificación en staging con assignments reales.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con delta.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con estado Eje 1.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El detector actual de Finance soporta la extensión a `assignment_id` sin refactor, o es necesario generalizar la dimensión? Decidir en planning con prototipo.
- ¿Staff Aug tiene su propia tabla de economics mensual o reusa `client_economics` con filtro? Confirmar.
- ¿Los signals de `days_to_renewal` son Z-score (no tiene sentido) o umbral fijo (p.ej. <30 días + no acción registrada)? Recomendación: **umbral fijo**, no Z-score, para esta métrica.
