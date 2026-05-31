# TASK-338 — CompensationProfile Read Model Foundation (reframe of Compensation Arrangement)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Reframe requerido — no ejecutar el framing CompensationArrangement as-is`
- Rank: `TBD`
- Domain: `cross-domain` (`people|hr|payroll|finance|data`)
- Blocked by: `TASK-961`, `TASK-962`
- Branch: `task/TASK-338-compensation-arrangement-canonical-runtime-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reescribir esta task alrededor de `CompensationProfile`: un read model/foundation persona-centrico, relationship/assignment-aware y no mutante para explicar compensación vigente e histórica antes de cualquier bridge a Payroll.

El framing anterior `CompensationArrangement` queda como antecedente útil, pero no debe ejecutarse literalmente porque ahora la espina canónica de EPIC-017 es `Person -> WorkRelationship -> WorkAssignment -> CompensationProfile -> ComplianceRail -> PaymentRail -> WorkforceTimeline`.

## Why This Task Exists

Hoy `greenhouse_payroll.compensation_versions` funciona como snapshot de nómina formal sobre `member_id`, pero `TASK-959` demostró que el problema ya no es solo "acuerdo ejecutivo previo a payroll": es que Greenhouse necesita una lectura persona-centrica de compensación que pueda explicar:

- qué compensación vigente existe para una persona/relación/assignment;
- qué parte es fuente payroll (`compensation_versions`) y qué parte es evidencia de workforce;
- por qué 4 de 9 activos reales no tienen current compensation en el mapa;
- qué gaps son lifecycle/intake normal vs deuda de datos vs gap de modelo;
- cómo presentar la compensación en Person 360 sin convertir Payroll en root.

Sin este reframe, ejecutar el diseño viejo consolidaría un objeto paralelo (`CompensationArrangement`) antes de validar si `CompensationProfile` debe ser un alias, una proyección o un contrato nuevo.

## Goal

- Formalizar `CompensationProfile` como read model/foundation no mutante sobre fuentes existentes.
- Declarar si `CompensationArrangement` queda superseded, alias histórico o sub-concepto de `CompensationProfile`.
- Separar compensación workforce/persona-centrica de la materialización formal de nómina.
- Dejar base runtime y readers para que Person 360, Payroll, Finance y Costs consuman evidencia consistente sin reescribir montos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

Reglas obligatorias:

- `CompensationProfile` no reemplaza el ownership de `Payroll` sobre `compensation_versions`
- La primera entrega debe ser read-model/projection-only salvo checkpoint arquitectónico explícito.
- No crear write path ni migration que cambie montos antes de `TASK-962` y un plan aprobado.
- Payroll calcula payroll; Person 360 muestra estado/evidencia/redaction.
- `member.contract_type` no es source of truth universal de current workforce state.
- no mezclar compensación ejecutiva con CCA o préstamos
- si un futuro profile se proyecta a nómina formal, la faceta operativa de payroll sigue siendo `member_id`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`
- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-337-person-legal-entity-relationship-runtime-foundation.md`
- `docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`
- `docs/tasks/to-do/TASK-962-workforce-coverage-readiness-remediation-plan.md`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/types/payroll.ts`

### Blocks / Impacts

- `TASK-340` (must remain frozen until this reframe is complete)
- `TASK-341`
- `TASK-342`
- futura compensación ejecutiva fuera de payroll

### Files owned

- `migrations/[verificar]`
- `src/lib/payroll/compensation-versioning.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/types/payroll.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `greenhouse_payroll.compensation_versions`
- `greenhouse_payroll.payroll_entries`
- servicios de versionado y lectura en:
  - `src/lib/payroll/compensation-versioning.ts`
  - `src/lib/payroll/postgres-store.ts`
  - `src/lib/payroll/get-compensation.ts`

### Gap

- no existe objeto explícito previo a payroll para acuerdos de compensación persona ↔ entidad legal
- toda compensación queda forzada al lenguaje y lifecycle de nómina

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — CompensationProfile read model contract

- Diseñar `CompensationProfile` como contrato/read model no mutante sobre fuentes existentes.
- Cubrir al menos:
  - persona
  - entidad legal
  - work relationship
  - assignment scope
  - tipo/modalidad de compensación
  - moneda
  - periodicidad
  - vigencia
  - estado
  - source evidence
  - gap codes from `TASK-959`
  - metadata de source of truth
- Declarar explícitamente si `CompensationArrangement` queda superseded, alias o sub-concepto.

### Slice 2 — Runtime services + readers

- Publicar servicios/readers read-only para consultar el profile vigente.
- Reusar `WorkforceFoundationMap` y `compensation_versions` sin recalcular montos.
- Definir cómo se relaciona con `member_id` cuando la persona además es colaborador interno.
- Exponer redaction/sensitivity hints para Person 360.

### Slice 3 — Compatibility with payroll snapshots

- Definir y documentar cómo convive con `compensation_versions`
- Dejar claro qué campos quedan en `CompensationProfile` y cuáles siguen viviendo como snapshot payroll-only.
- No escribir bridge a payroll en esta task.

## Out of Scope

- cálculo de payroll por período
- bridge/write-path hacia payroll (`TASK-340`, frozen)
- backfill o actualización de compensation versions
- pagos de compensación
- CCA
- analytics de costos completos

## Detailed Spec

La task debe dejar respondido:

- qué fuentes componen `CompensationProfile`
- cuándo un cambio futuro modificaría un profile vs cuándo exigiría una nueva `compensation_version`
- qué consumers pueden leer profile directamente
- qué consumers deben seguir leyendo `compensation_versions`
- qué gaps de `TASK-962` bloquean write paths

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un contrato runtime explícito para `CompensationProfile`
- [ ] La task declara si `CompensationArrangement` queda superseded, alias o sub-concepto
- [ ] La documentación deja claro que `Payroll` materializa, pero no agota, la semántica de compensación
- [ ] La convivencia entre `CompensationProfile` y `compensation_versions` queda explícita y no ambigua
- [ ] El profile puede vincularse a persona, work relationship y assignment sin depender de `user`
- [ ] No hay writes, migrations de monto ni payroll recalculation en la primera entrega

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm build`
- revisión manual de readers y schema contra la spec

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- [ ] Actualizar `project_context.md` con el contrato final de arrangement vs payroll

## Follow-ups

- `TASK-340`
- `TASK-342`

## Open Questions

- si `CompensationArrangement` debe desaparecer como término, quedar alias legacy o representar solo un sub-tipo contractual dentro de `CompensationProfile`
- si el profile debe soportar desde el día 1 múltiples modalidades además de sueldo fijo recurrente
