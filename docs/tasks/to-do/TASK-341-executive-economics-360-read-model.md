# TASK-341 — Executive Economics 360 Read Model

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
- Domain: `identity`
- Blocked by: `TASK-340`
- Branch: `task/TASK-341-executive-economics-360-read-model`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un read model privado para consumir de forma unificada relaciones `persona ↔ entidad legal`, `CompensationArrangement`, `Payroll` y `Cuenta accionista`, sin mezclar ownership ni abrir una vista ejecutiva final antes de tiempo.

## Why This Task Exists

Después de fijar schema y puentes, el sistema necesita una forma reusable de leer el caso “persona con múltiples relaciones económicas con la misma entidad”. Hoy `Person 360` y `Account 360` no tienen un reader canónico para eso, por lo que cualquier futura surface ejecutiva o privada terminaría recomponiendo joins ad hoc.

## Goal

- Publicar un read model reusable para economía ejecutiva/persona ↔ entidad legal
- Reunir relación legal, compensación, payroll y CCA sin duplicar ownership
- Preparar surfaces privadas futuras sin forzar todavía una UI final

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `360` lee y compone; no asume ownership de `Finance` o `Payroll`
- el read model debe ser privado/internal-only salvo policy explícita posterior
- no recomponer identidad desde `user`

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-273-person-complete-360-federated-serving-layer.md`
- `docs/tasks/in-progress/TASK-274-account-complete-360-federated-serving-layer.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-337-person-legal-entity-relationship-runtime-foundation.md`
- `docs/tasks/to-do/TASK-338-compensation-arrangement-canonical-runtime-foundation.md`
- `docs/tasks/to-do/TASK-339-shareholder-account-legal-entity-alignment.md`
- `docs/tasks/to-do/TASK-340-compensation-arrangement-payroll-bridge.md`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/person-360/get-person-finance.ts`
- `src/lib/account-360/account-complete-360.ts`
- `src/lib/account-360/facets/finance.ts`

### Blocks / Impacts

- futura vista privada ejecutiva/founder
- futuros consumers admin/finance/person detail

### Files owned

- `src/lib/person-360/[verificar]`
- `src/lib/account-360/[verificar]`
- `src/types/person-360.ts`
- `src/app/api/person/[id]/360/route.ts`
- `src/app/api/organizations/360/route.ts`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`

## Current Repo State

### Already exists

- `Person Complete 360`
- `Account Complete 360`
- readers de persona y finance
- organization/account readers con contexto org-first

### Gap

- no existe reader canónico para relaciones económicas ejecutivas cross-module
- cualquier surface futura tendría que recomponer payroll + CCA + relación legal manualmente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader contract

- Diseñar un read model reusable para:
  - relaciones legales activas
  - arrangement vigente
  - snapshot payroll relevante
  - saldo/resumen CCA

### Slice 2 — 360 integration

- Integrar ese reader en `Person 360`, `Account 360` o en una lane shared intermedia sin duplicar lógica
- Definir autorización/scoping explícito

### Slice 3 — API exposure mínima

- Publicar el payload en una API/reader reutilizable para futuros consumers privados
- No abrir todavía una UI final si no es estrictamente necesaria

## Out of Scope

- dashboard ejecutivo final
- surfacing cliente
- edición mutante de relaciones

## Detailed Spec

El read model debe dejar responder, para una persona dada:

- qué relaciones mantiene con la entidad legal
- qué compensación vigente tiene
- qué snapshot payroll formal aplica
- cuál es su saldo o resumen CCA

sin obligar a un consumer a conocer todos los schemas subyacentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un read model reusable para economía ejecutiva/persona ↔ entidad legal
- [ ] El payload compone relación legal, compensación, payroll y CCA sin duplicar ownership
- [ ] La autorización queda explícita y private/internal-only por defecto
- [ ] La integración con 360 no reintroduce roots paralelos de identidad

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- revisión manual del payload en endpoint/reader resultante

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md` y/o `GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- [ ] Registrar en `project_context.md` el nuevo reader/faceta si cambia contrato visible

## Follow-ups

- vista privada ejecutiva/founder

## Open Questions

- si esta lane vive mejor como faceta nueva de `Person 360` o como reader shared consumido por varias surfaces
