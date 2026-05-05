# TASK-339 — Shareholder Account Legal Entity Alignment

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
- Domain: `finance`
- Blocked by: `none` (TASK-337 completada — desbloqueada 2026-05-05)
- Branch: `task/TASK-339-shareholder-account-legal-entity-alignment`
- Legacy ID: `follow-on de TASK-284 y TASK-306`
- GitHub Issue: `none`

## Summary

Realinear `Finance > Cuenta accionista` para que su semántica primaria sea `persona ↔ entidad legal`, endureciendo además la taxonomía de movimientos para no mezclar préstamos, dividendos, aportes, compensación ejecutiva y ajustes manuales.

## Why This Task Exists

La `CCA` ya existe y ya quedó endurecida con `source_type` / `source_id`, pero todavía su contrato principal se lee demasiado desde `profile_id`, `member_id` y `space_id`. Eso sirve como runtime, pero no alcanza para fijar:

- cuál es la contraparte económica real
- qué representa cada movimiento
- cuándo un movimiento toca sueldo, préstamo, dividendo o aporte

## Goal

- Anclar semánticamente la CCA a `person ↔ legal entity`
- Separar tipologías de movimiento incompatibles
- Evitar compensaciones implícitas con compensación ejecutiva

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`

Reglas obligatorias:

- `Finance` sigue siendo owner del instrumento, ledger, settlement y balances
- la CCA no puede convertirse en una identidad financiera paralela desligada de la persona canónica o de la entidad legal
- `executive compensation` y `shareholder current account` son carriles distintos

## Normative Docs

- `docs/tasks/complete/TASK-284-shareholder-current-account.md`
- `docs/tasks/complete/TASK-306-shareholder-account-canonical-traceability.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-337-person-legal-entity-relationship-runtime-foundation.md`
- `migrations/20260409002455606_shareholder-current-account-schema.sql`
- `migrations/20260410005343119_shareholder-account-canonical-traceability.sql`
- `src/lib/finance/shareholder-account/store.ts`
- `src/lib/finance/shareholder-account/source-links.ts`
- `src/app/api/finance/shareholder-account/**`

### Blocks / Impacts

- `TASK-341`
- cualquier future UI de executive economics
- reporting financiero empresa ↔ accionista

### Files owned

- `migrations/20260409002455606_shareholder-current-account-schema.sql`
- `migrations/20260410005343119_shareholder-account-canonical-traceability.sql`
- `migrations/[verificar]`
- `src/lib/finance/shareholder-account/store.ts`
- `src/lib/finance/shareholder-account/source-links.ts`
- `src/app/api/finance/shareholder-account/route.ts`
- `src/app/api/finance/shareholder-account/[id]/movements/route.ts`
- `src/views/greenhouse/finance/shareholder-account/**`

## Current Repo State

### Already exists

- `greenhouse_finance.shareholder_accounts`
- `greenhouse_finance.shareholder_account_movements`
- source linkage canónica con `source_type` / `source_id`
- UI operativa en `/finance/shareholder-account`

### Gap

- la CCA todavía no expresa claramente `legal_entity_id` como contraparte económica primaria
- `movement_type` no está formalizado desde la nueva semántica de préstamos/dividendos/compensación
- no existe regla runtime explícita que prohíba compensación implícita con remuneración ejecutiva

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Legal entity alignment

- Extender schema/store para que la CCA pueda expresar la entidad legal contraparte de forma explícita
- Documentar cómo convive eso con `profile_id`, `member_id` opcional y `space_id`

### Slice 2 — Movement taxonomy hardening

- Formalizar y materializar la taxonomía mínima de movimientos:
  - préstamo accionista → empresa
  - préstamo empresa → accionista
  - aporte de capital
  - dividendo
  - compensación ejecutiva devengada/pagada
  - reembolso
  - ajuste manual

### Slice 3 — Runtime guards

- Bloquear o dejar explícitamente prohibidos los cruces implícitos con compensación ejecutiva
- Ajustar APIs y UI mínimas para que no sigan capturando movimientos ambiguos

## Out of Scope

- rediseño visual completo de la vista CCA
- asientos contables generales
- payroll bridge

## Detailed Spec

La task debe dejar explícito:

- cuál es el ancla económica primaria de una cuenta corriente accionista
- qué movimiento_types quedan permitidos
- cuáles de esos movimientos pueden enlazarse con documentos/pagos/settlement
- cuáles requieren source_type manual pero semántica estructurada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La CCA puede expresar una entidad legal contraparte de forma explícita
- [ ] La taxonomía de movimientos distingue préstamos, dividendos, aportes, compensación ejecutiva y ajustes
- [ ] El runtime deja explícito que no existe compensación automática con remuneración ejecutiva
- [ ] La documentación de Finance queda alineada con la nueva semántica

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- validación manual de creación/edición de movimiento en `/finance/shareholder-account`

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- [ ] Actualizar `project_context.md` con el nuevo contrato de anclas CCA

## Follow-ups

- `TASK-341`

## Open Questions

- si la CCA debe admitir más de una cuenta por persona y entidad legal o mantenerse 1:1 en esta etapa
