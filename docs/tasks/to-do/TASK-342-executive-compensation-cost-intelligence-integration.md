# TASK-342 — Executive Compensation Cost Intelligence Integration

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-340`
- Branch: `task/TASK-342-executive-compensation-cost-intelligence-integration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar la compensación ejecutiva formalizada al backbone de `Costs` y `Cost Intelligence`, para que el costo empresa pueda imputarse correctamente sin depender únicamente de `payroll_entries` legacy ni mezclar CCA con costo laboral.

## Why This Task Exists

Hoy la mayor parte del costo laboral viaja por `Payroll -> payroll_entries -> payroll expenses / cost attribution`, pero si Greenhouse pasa a modelar `CompensationArrangement` como contrato previo, también necesita una regla explícita para que el costo empresa:

- siga siendo consistente
- no dependa de heurísticas por fuera del contrato canónico
- no trate CCA como si fuera costo laboral

## Goal

- Extender `Costs` para consumir compensación ejecutiva desde el nuevo backbone canónico
- Mantener paridad y trazabilidad con costos laborales ya materializados por payroll
- Evitar contaminación semántica entre compensación, préstamo y CCA

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- `Costs` consume contratos y snapshots canónicos; no redefine identidad ni relaciones base
- la CCA no debe entrar al pipeline de costo laboral como si fuera compensación
- si un costo sigue dependiendo de nómina formal, `member_id` se preserva como llave operativa

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
- `docs/tasks/complete/TASK-279-labor-cost-attribution-client-economics-pipeline.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-340-compensation-arrangement-payroll-bridge.md`
- `src/lib/finance/payroll-cost-allocation.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`

### Blocks / Impacts

- costo empresa de compensación ejecutiva
- `client_economics`
- `operational_pl`
- futuros readers ejecutivos y finance analytics

### Files owned

- `src/lib/finance/payroll-cost-allocation.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/commercial-cost-attribution/store.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `migrations/[verificar]`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- pipeline de costo laboral basado en payroll
- materialización de `commercial_cost_attribution`
- serving de `client_economics` y `operational_pl`

### Gap

- no existe contrato explícito para que `CompensationArrangement` alimente costos antes o junto a su materialización payroll
- no está formalizada la exclusión semántica de movimientos CCA del costo laboral

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cost semantics

- Definir cómo `CompensationArrangement` impacta costo empresa
- Definir qué parte del costo sigue viniendo exclusivamente de payroll formal
- Dejar explícito qué movimientos CCA jamás entran como costo laboral

### Slice 2 — Materialization / attribution

- Ajustar attribution/materializers para consumir la nueva semántica cuando corresponda
- Mantener trazabilidad por persona, entidad legal, período y `member_id` si aplica

### Slice 3 — Consumer parity

- Validar paridad en readers/snapshots de `client_economics`, `operational_pl` y serving relacionado
- Documentar contratos para consumers downstream

## Out of Scope

- rediseño UI de dashboards financieros
- presupuesto
- contabilidad general

## Detailed Spec

La task debe responder:

- qué se considera costo laboral canónico
- qué parte viene de arrangement
- qué parte viene de payroll snapshot
- qué nunca debe entrar desde CCA

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una regla explícita de cómo la compensación ejecutiva impacta `Costs`
- [ ] El pipeline de costo no trata CCA como costo laboral
- [ ] `member_id` se preserva cuando el costo depende de nómina formal por colaborador
- [ ] `client_economics` / `operational_pl` pueden consumir la nueva semántica sin drift

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- revisión manual de snapshots/readers de costo afectados

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- [ ] Registrar en `project_context.md` la nueva política de costo empresa si cambia contrato visible

## Follow-ups

- ajustes de dashboards financieros si la nueva semántica cambia KPIs visibles

## Open Questions

- si el costo arrangement-first debe entrar solo cuando exista member formal o también para relaciones ejecutivas no payrollizadas
