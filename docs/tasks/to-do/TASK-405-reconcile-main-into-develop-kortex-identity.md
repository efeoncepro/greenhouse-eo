# TASK-405 — Reconcile `main` into `develop` for Kortex Identity Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-405-reconcile-main-into-develop-kortex-identity`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`develop` y `main` en Greenhouse quedaron divergidas mientras el bridge de identidad compartida con Kortex se implemento directo en `main`. Esta task debe reconciliar ambas ramas sin perder los commits vivos de `develop`, preservando el endpoint `sister-platforms/identity`, el hardening de `integration-auth` y el handoff `Kortex Agent`.

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

- `docs/tasks/to-do/TASK-405-reconcile-main-into-develop-kortex-identity.md`
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

- `develop` todavía no incorpora el endpoint `src/app/api/integrations/v1/sister-platforms/identity/route.ts`.
- `develop` todavía no incorpora el hardening de `src/lib/integrations/integration-auth.ts` para `x-greenhouse-sister-platform-key` y `GREENHOUSE_SISTER_PLATFORM_TOKEN`.
- El sello documental `Kortex Agent` del handoff quedó solo en `main`.

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

- [ ] Existe una rama de reconciliación basada en `develop` que incorpora los commits `76255825` y `314146ad` sin perder los commits exclusivos de `develop`.
- [ ] `src/app/api/integrations/v1/sister-platforms/identity/route.ts` queda presente y funcional en la rama reconciliada.
- [ ] `src/lib/integrations/integration-auth.ts` acepta `x-greenhouse-sister-platform-key` y puede validar `GREENHOUSE_INTEGRATION_API_TOKEN` o `GREENHOUSE_SISTER_PLATFORM_TOKEN`.
- [ ] `Handoff.md` conserva el sello `Kortex Agent` y deja claro el siguiente paso de promoción.

## Verification

- `pnpm exec eslint src/lib/integrations/integration-auth.ts src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- smoke manual de preview sobre `/api/integrations/v1/sister-platforms/identity` verificando que la ruta exista y responda con la capa de auth esperada

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedó documentado si la promoción final debe ocurrir via PR `reconcile -> develop`, `develop -> main`, o ambas

## Follow-ups

- Actualizar `TASK-377` si la reconciliación cambia el carril operativo esperado de Greenhouse -> Kortex.
- Crear task espejo o PR de promoción si la rama reconciliada queda validada y lista para subir a `main`.

## Open Questions

- Si la promoción final debe hacerse primero hacia `develop` o si esta reconciliación se tomará como release-prep para `main`.
