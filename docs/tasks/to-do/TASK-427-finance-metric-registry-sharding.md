# TASK-427 — Finance Metric Registry Sharding (trigger-based debt)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `refactor`
- Status real: `Trigger-based — activar cuando registry supere 30 entradas`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-416`
- Branch: `task/TASK-427-finance-metric-registry-sharding`

## Summary

Dividir el archivo monolítico de definiciones del Finance Metric Registry en sub-archivos por dominio (`revenue.ts`, `costs.ts`, `working-capital.ts`, `productivity.ts`) cuando el total supere 30 entradas, preservando el contrato público inmutable. Trigger activation, no scheduled.

## Why This Task Exists

v1 arranca con 18 entradas en un solo archivo. A 30+ entradas un file único se vuelve ilegible y reviews son tediosos. Sharding temprano (antes de llegar a 50) es barato; tardío causa rewrites dolorosos. Esta task está declarada explícitamente para que cuando el trigger se cumpla, haya un flujo pre-pensado.

**Trigger de activación:** `FINANCE_METRIC_REGISTRY.length + FINANCE_INDICATOR_REGISTRY.length >= 30`. Un lint rule o PR hook puede detectarlo y sugerir abrir esta task.

## Goal

- Split de definiciones por sub-dominio funcional
- Barrel re-export desde `index.ts` para consumers externos (no cambia contrato público)
- Lint actualizado para verificar sharding consistente
- Documentación de cómo elegir el shard para una métrica nueva

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md` §11 (debt #6)

Reglas obligatorias:

- Contrato público no cambia; consumers siguen importando de `@/lib/finance/metric-registry`
- Cada shard mantiene su propio sub-dominio (no cross-shard imports internos)
- Tests unitarios existentes siguen pasando sin modificación

## Dependencies & Impact

### Depends on

- TASK-416 (foundation)

### Blocks / Impacts

- DX mejora: PRs de métricas nuevas tocan solo un shard
- Ninguna regresión funcional esperada

### Files owned

- `src/lib/finance/metric-registry/definitions/revenue.ts`
- `src/lib/finance/metric-registry/definitions/costs.ts`
- `src/lib/finance/metric-registry/definitions/margins.ts`
- `src/lib/finance/metric-registry/definitions/working-capital.ts`
- `src/lib/finance/metric-registry/definitions/productivity.ts`
- `src/lib/finance/metric-registry/definitions/index.ts` (barrel)

## Current Repo State

### Already exists (al activar)

- Registry canónico con 30+ entradas

### Gap

- Archivo único se vuelve unwieldy

## Scope

### Slice 1 — Plan de shards

- Agrupar entries existentes por dominio funcional
- Validar con owner (Finance Product) que el split refleja mental model

### Slice 2 — Split mecánico

- Mover entries a archivos por shard
- Barrel re-export desde `definitions/index.ts`
- Top-level `index.ts` sin cambios externos

### Slice 3 — Lint update

- Si existe lint-metric-registry.ts, actualizar para leer todos los shards
- Opcional: regla que alerta si un shard excede 15 entradas (sub-trigger)

### Slice 4 — Docs

- Guía en `docs/documentation/finance/` sobre cómo decidir el shard para una métrica nueva

## Out of Scope

- Cambios en contrato público del registry
- Refactor de reader o validator

## Acceptance Criteria

- [ ] Entries divididas por shard funcional
- [ ] Barrel export mantiene API pública
- [ ] Tests existentes pasan sin cambio
- [ ] Guía de sharding publicada
- [ ] `pnpm build`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` limpios

## Verification

- Import desde consumer externo no cambia
- `git diff` muestra solo movimiento de código (no cambios semánticos)

## Closing Protocol

- [ ] Delta en spec marcando sharding completed
- [ ] Lifecycle + carpeta sincronizados

## Follow-ups

- Si un shard supera 15 entradas, sub-shard (ej: `costs-payroll.ts`, `costs-infrastructure.ts`)
