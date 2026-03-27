# TASK-051 - Finance Payroll Bridge Postgres Alignment

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `39`
- Domain: `finance`
- GitHub Project: `Greenhouse Delivery`

## Summary

Alinear todos los reads de Finance que dependen de Payroll para que consuman el runtime canónico de `greenhouse_payroll` y `greenhouse_core.members`, eliminando referencias legacy en BigQuery y corrigiendo rutas que hoy apuntan al schema equivocado.

Esta lane cierra el puente `Finance <-> Payroll` a nivel de correctness, no solo a nivel de arquitectura aspiracional.

## Why This Task Exists

El codebase ya tiene un bridge funcional entre gastos y nómina, pero todavía arrastra paths divergentes:

- `src/app/api/finance/analytics/trends/route.ts` consulta `greenhouse_hr.payroll_entries` y `greenhouse_hr.payroll_periods`
- `src/app/api/finance/expenses/payroll-candidates/route.ts` sigue leyendo `projectId.greenhouse.payroll_entries`, `payroll_periods` y `team_members`
- `src/lib/finance/canonical.ts` resuelve `payrollEntryId` y `memberId` desde tablas legacy de BigQuery

Eso crea un puente híbrido donde una parte de Finance mira el source of truth actual y otra parte mira un runtime heredado o directamente un schema incorrecto.

## Goal

- Hacer Postgres-first todos los reads de Finance que dependen de Payroll
- Corregir referencias erróneas a `greenhouse_hr.payroll_*`
- Unificar el linking de payroll-linked expenses sobre `greenhouse_payroll` y `greenhouse_core.members`
- Reducir riesgo de datos vacíos, conflicts o trends inconsistentes en surfaces financieras

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- `Payroll` runtime canónico vive en `greenhouse_payroll`, no en `greenhouse_hr` ni en tablas legacy de BigQuery
- `member_id` sigue siendo la ancla común entre gastos, payroll y persona
- los reads financieros de payroll no deben reintroducir BigQuery como source of truth silencioso cuando la data ya vive en PostgreSQL
- cualquier fallback legacy restante debe ser explícito, controlado y temporal

## Dependencies & Impact

### Depends on

- `src/app/api/finance/analytics/trends/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/payroll/personnel-expense.ts`
- `src/lib/payroll/postgres-store.ts`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-001 - HR Payroll Operational Hardening`
- `TASK-015 - Financial Intelligence Layer`
- `TASK-043 - Person 360 Runtime Consolidation`
- `TASK-044 - Organization Executive Snapshot`
- payroll-linked expenses, personnel expense reporting y analytics trends de Finance

### Files owned

- `src/app/api/finance/analytics/trends/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`
- `src/lib/finance/canonical.ts`
- `src/lib/payroll/personnel-expense.ts`
- `src/lib/payroll/postgres-store.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- `Personnel expense` ya usa `greenhouse_payroll` cuando Payroll Postgres está habilitado
- `Person Finance Overview` ya consume `greenhouse_payroll.payroll_entries`
- Finance ya soporta expenses ligados a `payroll_entry_id`

### Gap actual

- analytics y candidate routes siguen apoyadas en payroll/team legacy de BigQuery
- existe al menos una ruta consultando el schema equivocado `greenhouse_hr.payroll_*`
- la resolución `payrollEntryId -> memberId` no converge todavía sobre el grafo canónico de PostgreSQL

## Scope

### Slice 1 - Corrección de schema y resolver

- corregir consultas que hoy usan `greenhouse_hr.payroll_*`
- mover `resolveFinanceMemberContext()` a un path Postgres-first
- validar conflictos `memberId` y `payrollEntryId` contra el source canónico

### Slice 2 - Candidate and linking runtime

- refactorizar payroll candidates para leer `greenhouse_payroll` y `greenhouse_core.members`
- revisar surfaces que ligan expenses a entries de payroll
- asegurar que linked/unlinked status se calcule sobre el write path actual

### Slice 3 - Trends y consumers

- alinear analytics trends y cualquier consumer financiero de payroll con el mismo source of truth
- cubrir errores de schema, períodos y headcount con tests
- dejar fallback explícito solo si sigue siendo imprescindible por compatibilidad

## Out of Scope

- rediseñar dashboards financieros
- rehacer el motor de payroll
- introducir contabilidad completa de costos laborales fuera del alcance actual
- mover todo Finance a PostgreSQL en una sola lane

## Acceptance Criteria

- [ ] ninguna ruta viva de Finance consulta `greenhouse_hr.payroll_*`
- [ ] `resolveFinanceMemberContext()` y payroll candidates operan Postgres-first
- [ ] analytics trends de payroll leen el schema canónico `greenhouse_payroll`
- [ ] el linking entre expenses y payroll entries usa la misma identidad canónica `member_id` y `payroll_entry_id`
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre al menos resolver, candidates y analytics trends
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual sobre `/api/finance/expenses/payroll-candidates` y `/api/finance/analytics/trends?type=payroll`
