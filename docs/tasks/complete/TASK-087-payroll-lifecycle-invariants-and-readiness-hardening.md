# TASK-087 - Payroll Lifecycle Invariants and Readiness Hardening

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `3`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Hardening del lifecycle oficial de Payroll para que `draft -> calculated -> approved -> exported` se cumpla también en la capa de persistencia, no solo en los routes.

La task además conecta la aprobación con el readiness canónico y define si `approved` es un freeze real o un checkpoint editable con reopen explícito.

## Why This Task Exists

La auditoría mostró que el modelo de negocio está bien descrito, pero la protección de transiciones sigue dividida entre routes y helpers sueltos.

Hoy un caller interno podría saltarse la secuencia esperada si usa stores directamente, y la aprobación todavía no consume el preflight de readiness como gate obligatorio.

## Goal

- Enforzar invariantes de transición en la capa de store.
- Hacer que la aprobación consuma readiness o una variante explícita de preflight.
- Definir y aplicar la semántica de `approved` frente a drift de compensación y edición posterior.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- el lifecycle oficial de nómina sigue siendo `draft -> calculated -> approved -> exported`
- `approved` no puede quedar semánticamente ambiguo entre checkpoint editable y freeze real
- la aprobación no debe depender solo de validaciones de UI o route; el contrato tiene que vivir en dominio

## Dependencies & Impact

### Depends on

- `TASK-074` - promotion projected → official ya existe como contexto de origen
- `TASK-077` - receipts y export final ya existen como downstream del cierre
- `TASK-086` - selector de período actual y cut-off operativo ya quedaron documentados
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/period-lifecycle.ts`

### Impacts to

- `TASK-088` - la robustez reactiva depende de que el cierre oficial sea consistente
- `TASK-089` - la UI de aprobación y edición debe reflejar la semántica canónica
- routes y stores de payroll oficial

### Files owned

- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/period-lifecycle.ts`
- `src/lib/payroll/payroll-readiness.test.ts`
- `src/lib/payroll/period-lifecycle.test.ts`
- `src/lib/payroll/postgres-store.test.ts`
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- lifecycle canónico de períodos
- route de approval con validación básica de estado
- helper de readiness con blockers y warnings
- export final y cierre de período

### Gap actual

- los guards de transición no están centralizados en el store
- `approved` sigue sin una semántica explícita de freeze
- readiness no es parte del contrato de aprobación
- faltan tests de transición e inconsistencias temporales

## Scope

### Slice 1 - Lifecycle invariants

- mover o duplicar guards críticos al store layer
- bloquear transiciones inválidas y definir reopen cuando corresponda
- preservar el comportamiento esperado para routes existentes

### Slice 2 - Readiness gate

- exigir readiness o una variante explícita antes de aprobar
- mantener blockers y warnings visibles para el operador
- documentar qué condiciones son bloqueantes y cuáles solo informativas

### Slice 3 - Freeze semantics

- decidir si `approved` bloquea cambios o solo marca un checkpoint editable
- si hay reopen, dejarlo explícito y testeado
- cerrar la ventana de drift entre compensación, cálculo y aprobación

## Out of Scope

- rediseño visual completo de Payroll
- cambios al motor proyectado
- refactor general de compensación fuera del contrato de estado

## Acceptance Criteria

- [ ] Las transiciones de lifecycle no pueden ejecutarse fuera de secuencia desde la capa de dominio.
- [ ] La aprobación rechaza períodos que no cumplen el readiness requerido por la policy.
- [ ] La semántica de `approved` queda documentada y testeada.
- [ ] Los tests cubren guards de transición, readiness y drift de compensación.

## Verification

- `pnpm exec vitest run src/lib/payroll/period-lifecycle.test.ts src/lib/payroll/payroll-readiness.test.ts src/lib/payroll/postgres-store.test.ts`
- `pnpm lint`
- `pnpm build`
- validación manual en staging del flujo calculate → approve → export
