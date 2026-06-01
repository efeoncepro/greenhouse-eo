# TASK-797 — Contractor Closure + Transition Controls

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Implementacion`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-790, TASK-793` (ambas complete)
- Branch: `develop` (trabajo directo en develop por instrucción del operador 2026-06-01)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar cierre contractor como lifecycle propio: no finiquito, no payroll dependent, con checks de invoices/submissions pendientes, provider termination refs, access handoff, assets/documentos y pagos futuros.

> **Alineación dimensión Entidad Contratante (2026-05-30):** el cierre depende de la **entidad contratante** (`legal_entity_organization_id`): cierre de honorario CL (Efeonce SpA) ≠ cierre de provider/EOR (termination ref del provider). NUNCA es finiquito (`final_settlements`), regardless de la entidad. La provider termination ref solo aplica al carril EOR/provider (minoría). SSOT del modelo: `GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` Delta 2026-05-30.

> **Alineación EPIC-017 (2026-05-31):** esta task se mantiene separada del Unified Workforce Foundation. Contractor closure es lifecycle contractor, no hub People ni payroll. Cuando se ejecute, puede consumir estado de Person/Workforce (`TASK-961`) para visibilidad y gap context, pero no debe mover su ownership ni bloquear el read-only workforce hub.

## Why This Task Exists

Terminar una relacion contractor no debe disparar finiquito laboral. Pero tampoco puede ser solo desactivar usuario: quedan invoices, work submissions, provider refs, documentos, access handoff y payment obligations pendientes.

## Goal

- Crear contractor closure state/checklist.
- Block closure or mark exceptions for open financial/operational items.
- Prevent future payables after closure unless explicitly allowed as post-closure invoice.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md` (solo como contexto; no convierte esta task en child EPIC-017)

Reglas obligatorias:

- Contractor closure does not trigger `final_settlements`.
- Access offboarding remains separate from contractual closure.
- Open invoices and approved post-closure invoices must be explicit.
- Person 360/Workforce may display closure state later, but closure command/readiness remains contractor-owned.

## Dependencies & Impact

### Depends on

- `TASK-790`
- `TASK-793`

### Blocks / Impacts

- Impacts People 360, HR contractor workbench and access handoff.

### Files owned

- `src/lib/contractor-engagements/closure/**`
- `src/lib/workforce/offboarding/**`
- `src/views/greenhouse/people/**`
- `migrations/**`

## Current Repo State

### Already exists

- Workforce offboarding foundation for employee relationships.
- Identity/access docs distinguish startup policy and permissions.

### Gap

- No contractor-specific closure/readiness.
- No blocker preventing accidental final settlement lane for contractors.

## Scope

### Slice 1 — Closure schema/state

- Add contractor closure fields/table/events as local pattern dictates.
- Track closure reason, effective date and provider termination refs.

### Slice 2 — Closure readiness

- Check open invoices, submissions, payables, obligations/orders, assets/docs and access handoff.

### Slice 3 — Post-closure payment policy

- Allow documented post-closure invoices only when service period/evidence policy permits.
- Prevent new work submissions after closure.

## Payroll Non-Regression Guardrails (hard rules)

797 implementa cierre contractor y toca `src/lib/workforce/offboarding/**`, compartido con el exit de payroll dependiente (TASK-890). Doble cuidado: no disparar finiquito y no romper la exclusión de nómina. Auditado con `greenhouse-payroll-auditor`.

- **NUNCA** disparar `final_settlements` / `final_settlement_documents` ni el flujo "Calcular finiquito" desde el cierre contractor. El cierre contractor es lifecycle propio (`contractor_closure`), no finiquito laboral dependiente.
- **NUNCA** usar causales DT ni documento de finiquito para contractor/honorarios.
- **NUNCA** alterar las lanes de `work_relationship_offboarding_cases` (`relationship_transition`, `internal_payroll`, `external_payroll`, `non_payroll`, `identity_only`) que consume el exit eligibility resolver de TASK-890. Agregar el closure contractor sin romper la clasificación de lanes existente.
- **NUNCA** reactivar la relación dependiente cerrada al cerrar la contractor.
- **SIEMPRE** correr `pnpm vitest run src/lib/payroll` + los tests de offboarding al cierre, para probar que el exit eligibility (890) y el roster de nómina siguen intactos.

## Out of Scope

- Automated provider termination API.
- Device/asset management full automation.
- Employee finiquito.

## Acceptance Criteria

- [ ] Contractor closure never exposes "Calcular finiquito".
- [ ] Exit eligibility (TASK-890) lanes intactas: closure contractor no altera la clasificación de `work_relationship_offboarding_cases` ni reactiva relación dependiente.
- [ ] Open invoice/submission/payable blockers are visible.
- [ ] Post-closure invoice path is explicit and audited.
- [ ] New work submissions are blocked after closure.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
- Unit tests for closure readiness and post-closure policy.
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` — finiquito boundary + exit eligibility (890) non-regression gate.
- UI smoke if closure surface is implemented.

## Closing Protocol

- [ ] Lifecycle and folder synchronized.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `Handoff.md` updated.
