# TASK-924 — Golden Template canónico de tenant Notion (artefacto versionado)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (foundation del ADR GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|platform`
- Blocked by: `Nada estructural. Conviene esperar a que el set de propiedades [GH] esté estable (hoy [GH] RpA v2 existe; [GH] OTD bucket emerge con la migración OTD) para no versionar un template que cambia semana a semana.`
- Branch: `task/TASK-924-notion-golden-template-canonical-artifact`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Formalizar el **Golden Template canónico** de un tenant Notion (DB Tareas/Proyectos/Sprints) como un **artefacto versionado** — la lista declarativa de qué **propiedades primitivas** y qué **propiedades `[GH]` read-only** debe tener un teamspace para participar del motor ICO/delivery. Hoy el template existe solo como "clone del Demo Greenhouse" (decisión en `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1`); esta task lo convierte en un **contrato explícito en código** contra el cual `provision-tenant` (TASK-925) verifica e instala.

NO crea fórmulas de cómputo ICO (el motor es Greenhouse). NO toca tenants existentes.

## Why This Task Exists

El ADR `GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1` §4 define el Golden Template, pero "clone del Demo Greenhouse" es frágil como contrato: no hay una fuente declarativa de **qué propiedades exactas** debe tener un tenant. Sin eso, `provision-tenant` no tiene contra qué verificar el schema ni qué `[GH]` props instalar, y el drift entre teamspaces (el problema que cerró TASK-742 para estados) puede reaparecer en las propiedades. Esta task es la **foundation declarativa** del onboarding control plane.

## Goal

- Artefacto canónico en código (`src/lib/notion-tenant-template/canonical-schema.ts` o similar): declara
  - **propiedades primitivas requeridas** (property `Estado` con 11 estados V1, `Fecha límite`, `Fecha de Completado`, `Fecha límite original`, asignado/responsable, tipo de entregable, etc.) con su tipo Notion esperado.
  - **propiedades `[GH]` read-only** (targets de writeback) condicionadas a qué métricas tienen writeback live (hoy `[GH] RpA v2`; `[GH] OTD bucket`/`Días de retraso` cuando shipee la migración OTD).
  - reusa `task-status-canonical.ts` (11 estados) como single source of truth de estados — NO duplica.
- Función pura `diffTenantSchemaVsCanonical(actualSchema, canonical) → { missingPrimitives, missingGhProps, statusDrift, propTypeDrift }` (consumida por TASK-925 verify).
- Tests del diff (schema OK / falta primitiva / falta `[GH]` prop / estado custom / tipo de prop divergente).
- Doc: el Golden Template canónico + cómo se mantiene cuando emerge una métrica nueva con writeback.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1.md` §4 (Golden Template) + §12 hard rules
- `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1` — onboarding = clone; vocabulary canónico (NO aliases per-cliente)
- `task-status-canonical.ts` — 11 estados V1 (reusar, no duplicar)
- notion-platform skill — data source schema, property types, Notion-Version

Reglas obligatorias:

- **NUNCA** declarar fórmulas de cómputo ICO en el template — solo primitivas + `[GH]` targets read-only.
- **NUNCA** duplicar el vocabulary de estados — reusar `task-status-canonical.ts`.
- **NUNCA** versionar `[GH]` props de métricas cuyo writeback aún no shippeó (sería target muerto).

## Dependencies & Impact

### Depends on
- `task-status-canonical.ts` (existe)
- Set estable de `[GH]` props (RpA v2 existe; OTD emerge con la migración)

### Blocks / Impacts
- **TASK-925** (`provision-tenant`) consume el artefacto + el diff helper.

### Files owned (estimado)
- `src/lib/notion-tenant-template/canonical-schema.ts` (+ tests) — NEW
- `src/lib/notion-tenant-template/diff.ts` (+ tests) — NEW
- doc del template canónico

## Current Repo State

### Already exists
- `task-status-canonical.ts` (11 estados)
- Demo Greenhouse como clone vivo (TASK-910)
- `[GH] RpA v2` property (TASK-916)

### Gap
- No existe contrato declarativo en código de qué props debe tener un tenant
- No existe diff schema-vs-canónico

## Out of Scope
- El `provision-tenant` runtime (verify/install/register/subscribe/smoke) → TASK-925.
- Crear/instalar propiedades en Notion → TASK-925.
- Migrar tenants existentes → fuera; el artefacto es para onboarding + drift detection.

## Acceptance Criteria
- [ ] `canonical-schema.ts` declara primitivas + `[GH]` targets (reusa estados canónicos)
- [ ] `diffTenantSchemaVsCanonical` + tests (5+ casos)
- [ ] Doc del template canónico + protocolo de mantenimiento al agregar métrica con writeback
- [ ] `pnpm test` + `pnpm build` verde
- [ ] Task movida a `complete/`

## Follow-ups
- TASK-925 consume este artefacto.
