# TASK-405 — Reconcile `main` into `develop` for Kortex Identity Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete`
- Rank: `N/A`
- Domain: `ops`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`develop` y `main` quedaron reconciliadas a nivel de contenido sin perder el bridge de identidad Kortex ni el trabajo vivo que existia en `develop`. El endpoint `sister-platforms/identity`, el hardening de `integration-auth` y el handoff `Kortex Agent` quedaron absorbidos dentro del estado convergido.

## Why This Task Exists

Al 2026-04-14, `origin/develop` va por delante de `origin/main`, pero `origin/main` contiene commits exclusivos del bridge de identidad con Kortex (`76255825` y `314146ad`) que todavia no viven en `develop`. Si no se absorben de forma controlada, Greenhouse puede seguir evolucionando en `develop` mientras el contrato real consumido por Kortex queda solo en `main`, abriendo drift entre la rama viva, el dominio canónico y la surface de integración.

## Goal

- Traer el bridge de identidad Kortex desde `main` a una reconciliación basada en `develop`.
- Preservar simultáneamente los commits exclusivos actuales de `develop`.
- Dejar un handoff claro para la promoción posterior `develop -> main` sin rediseñar el contrato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- No perder commits exclusivos de `origin/develop` al absorber `origin/main`.
- El contrato de identidad Greenhouse -> Kortex debe seguir siendo tenant-safe y server-to-server.
- La reconciliación debe preservar el endpoint `POST /api/integrations/v1/sister-platforms/identity` y el soporte de `x-greenhouse-sister-platform-key`.
- No convertir esta task en rollout infra ni en cambio de dominio canónico de Vercel.

## Normative Docs

- `docs/documentation/plataforma/sister-platform-bindings.md`
- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`
- `Handoff.md`
- `README.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-375-sister-platforms-identity-tenancy-binding-foundation.md`
- `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
- `src/lib/tenant/access.ts`

### Blocks / Impacts

- promoción futura `develop -> main`
- validación del bridge de identidad compartida entre Greenhouse y Kortex
- follow-ons de `TASK-377`

### Files owned

- `docs/tasks/complete/TASK-405-reconcile-main-into-develop-kortex-identity.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `src/lib/integrations/integration-auth.ts`
- `Handoff.md`

## Current Repo State

### Already exists

- `origin/develop` va por delante de `origin/main` y concentra trabajo vivo no promocionado.
- `origin/main` contiene el bridge de identidad Kortex introducido por:
  - `76255825` — `feat: expose sister platform identity endpoint`
  - `314146ad` — `docs: record kortex identity bridge handoff`
- Ya existen foundations sister-platform reutilizables en:
  - `src/lib/sister-platforms/external-auth.ts`
  - `src/app/api/integrations/v1/sister-platforms/context/route.ts`
  - `src/app/api/integrations/v1/sister-platforms/readiness/route.ts`
  - `src/app/api/integrations/v1/sister-platforms/catalog/capabilities/route.ts`

### Gap

- Cerrado 2026-04-15. `develop` absorbio el endpoint `src/app/api/integrations/v1/sister-platforms/identity/route.ts`, el hardening de `src/lib/integrations/integration-auth.ts` y el bloque documental `Kortex Agent` sin perder los commits vivos de la rama.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reconciliation branch from `develop`

- Crear una rama desde `origin/develop`.
- Mergear `origin/main` dentro de esa rama, preservando historia y detectando conflictos reales.
- Documentar explícitamente qué commits exclusivos de `main` se estaban trayendo.

### Slice 2 — Preserve Kortex identity bridge

- Confirmar que sobreviven en la rama reconciliada:
  - `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
  - `src/lib/integrations/integration-auth.ts`
  - bloque `Kortex Agent` en `Handoff.md`
- Resolver conflictos sin degradar el contrato sister-platform existente en `develop`.

### Slice 3 — Validation and promotion handoff

- Validar lint/build/typecheck del surface tocado.
- Verificar en preview que la ruta de identidad exista y responda por la capa de auth esperada.
- Dejar documentado si la siguiente acción es PR hacia `develop`, promoción `develop -> main` o ambas.

## Out of Scope

- Deploy manual de Cloud Run o Kortex runtime.
- Eliminación del proyecto Vercel duplicado creado en el scope equivocado.
- Cambios de producto fuera del carril de reconciliación y preservación del bridge.

## Detailed Spec

La reconciliación debe tratar `develop` como base viva. No corresponde resetearla a `main`.

El deliverable esperado es una rama reconciliada que:

1. conserva el trabajo exclusivo de `develop`
2. incorpora los commits de `main` necesarios para el bridge de identidad Kortex
3. deja evidencia verificable de que el endpoint y el guard de auth siguen correctos
4. explicita el camino seguro de promoción posterior

Si aparece conflicto sobre `Handoff.md` o docs/tasks, resolver manteniendo el bloque `Kortex Agent` y cualquier delta nuevo de `develop` sin borrar contexto operativo previo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe una reconciliación basada en `develop` que incorporó los commits `76255825` y `314146ad` sin perder los commits exclusivos de `develop`.
- [x] `src/app/api/integrations/v1/sister-platforms/identity/route.ts` quedó presente y funcional en el estado reconciliado.
- [x] `src/lib/integrations/integration-auth.ts` acepta `x-greenhouse-sister-platform-key` y puede validar `GREENHOUSE_INTEGRATION_API_TOKEN` o `GREENHOUSE_SISTER_PLATFORM_TOKEN`.
- [x] `Handoff.md` conserva el sello `Kortex Agent` y deja claro el siguiente paso de promoción.

## Verification

- `pnpm exec eslint src/lib/integrations/integration-auth.ts src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- smoke manual de preview sobre `/api/integrations/v1/sister-platforms/identity` verificando que la ruta exista y responda con la capa de auth esperada

### Execution Notes

- La absorción del bridge Kortex en `develop` quedó registrada dentro de la reconciliación 2026-04-15.
- Commit de cierre documentado en `develop`: `6ce4cf8e`.
- La paridad de contenido entre `origin/main` y `origin/develop` quedó validada con `git diff --name-only origin/main origin/develop` -> `0`.
- El cierre documental quedó reflejado en `Handoff.md` y en el índice de tasks.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado con el cierre operativo
- [x] `changelog.md` no requirió cambio adicional porque este cierre no introdujo comportamiento nuevo sobre runtime
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (`TASK-406`)
- [x] quedó documentado que la promoción posterior hacia `main` fue absorbida en la reconciliación cerrada por `TASK-406`

## Follow-ups

- Actualizar `TASK-377` solo si el rollout posterior de Kortex runtime cambia el carril operativo esperado de Greenhouse -> Kortex.

## Open Questions

- Cerrado. La reconciliación se ejecutó sobre `develop` y luego se absorbió en la convergencia final con `main`.
