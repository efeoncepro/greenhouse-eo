# TASK-406 — Promote Reconciled Kortex Identity Bridge to `main`

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
- Branch: `main`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La promoción posterior a `TASK-405` quedó cerrada: `main` absorbió el estado reconciliado, el bridge de identidad Kortex vive en la línea productiva del repo y el dominio canónico responde con la capa de auth esperada.

## Why This Task Exists

Resolver `TASK-405` evita que el bridge viva solo en `main`, pero no cierra el ciclo operativo. Mientras `develop` y `main` no vuelvan a converger con una promoción controlada, Greenhouse puede seguir exponiendo contratos distintos por rama o por deployment, y Kortex quedaría dependiendo de una surface reconciliada que todavía no es la línea de producción formal del repo.

## Goal

- Promover el resultado reconciliado de `TASK-405` desde `develop` hacia `main`.
- Verificar que `greenhouse.efeoncepro.com` y la alias productiva sirvan el bridge correcto.
- Dejar documentado el siguiente paso bilateral Greenhouse -> Kortex para el rollout runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- No promover a `main` un estado distinto del que `TASK-405` haya validado en la rama reconciliada.
- La validación productiva debe hacerse sobre el dominio canónico correcto (`greenhouse.efeoncepro.com`) y el proyecto Vercel canónico (`efeonce-7670142f/greenhouse-eo`).
- No mezclar esta task con cambios nuevos de producto o refactors no relacionados.
- El handoff final debe dejar claro que el deploy del backend Kortex vive fuera de Greenhouse.

## Normative Docs

- `docs/documentation/plataforma/sister-platform-bindings.md`
- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`
- `docs/tasks/complete/TASK-405-reconcile-main-into-develop-kortex-identity.md`
- `Handoff.md`
- `README.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-405-reconcile-main-into-develop-kortex-identity.md`
- `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `src/lib/integrations/integration-auth.ts`

### Blocks / Impacts

- promoción `develop -> main` del carril sister-platform / Kortex
- verificación productiva del bridge Greenhouse-side
- handoff hacia el rollout posterior de Kortex backend/runtime

### Files owned

- `docs/tasks/complete/TASK-406-promote-kortex-identity-bridge-to-main.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `src/lib/integrations/integration-auth.ts`

## Current Repo State

### Already exists

- `TASK-405` define la reconciliación correcta de `main` dentro de `develop`.
- Greenhouse ya tiene foundation reusable de sister-platforms y un endpoint de identidad en `main`.
- Se confirmó previamente que el dominio canónico de producción vive en el proyecto Vercel `efeonce-7670142f/greenhouse-eo`, no en el proyecto duplicado del scope `efeonce`.

### Gap

- Cerrado 2026-04-15. `main` quedó convergida en contenido con `develop`, el bridge reconciliado ya vive en la rama productiva y la verificación del dominio canónico devolvió `401` en `POST /api/integrations/v1/sister-platforms/identity`, confirmando existencia de la ruta y protección auth server-to-server.

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

### Slice 1 — Promotion from reconciled `develop`

- Tomar el resultado validado de `TASK-405`.
- Ejecutar el camino aprobado de promoción hacia `main` (PR o merge governance compatible con el repo).
- Confirmar que `main` contiene el endpoint de identidad, el hardening de `integration-auth` y el bloque `Kortex Agent`.

### Slice 2 — Canonical production validation

- Verificar que `greenhouse.efeoncepro.com` y su alias productiva apunten al deployment correcto.
- Verificar que la ruta `/api/integrations/v1/sister-platforms/identity` exista en el deployment canónico.
- Confirmar que la capa de protección/auth esperada sea consistente para consumo server-to-server.

### Slice 3 — Bilateral handoff after Greenhouse closeout

- Actualizar `Handoff.md` con el estado final Greenhouse-side.
- Dejar explícito que el siguiente paso operativo es desplegar/validar el runtime Kortex que consume esta surface.
- Referenciar commits, deployment y dominio efectivo para que el siguiente agente no reabra diagnóstico de Vercel desde cero.

## Out of Scope

- Implementar cambios nuevos de negocio en `develop` o `main`.
- Eliminar el proyecto Vercel duplicado si no existe autorización explícita.
- Desplegar Cloud Run / backend Kortex dentro de esta task.

## Detailed Spec

Esta task solo se ejecuta después de que `TASK-405` esté realmente cerrada y validada.

El output esperado no es una rama más, sino un cierre operativo:

1. `develop` y `main` vuelven a converger sobre el bridge de identidad Kortex
2. el dominio canónico de Greenhouse sirve esa versión
3. el repo deja un handoff claro de que el próximo paso vive en Kortex runtime, no en otro loop de Greenhouse branch surgery

Si hay diferencia entre alias Vercel, proyecto enlazado localmente y dominio canónico, resolver usando el proyecto real `efeonce-7670142f/greenhouse-eo` y documentar cualquier residuo sin borrarlo destructivamente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `TASK-405` quedó absorbida en la promoción hacia `main` sin perder el bridge de identidad Kortex.
- [x] `src/app/api/integrations/v1/sister-platforms/identity/route.ts` y `src/lib/integrations/integration-auth.ts` viven ya en `main`.
- [x] `greenhouse.efeoncepro.com` apunta al deployment canónico que incluye ese bridge.
- [x] `Handoff.md` deja claro que el siguiente paso operativo vive del lado Kortex runtime/backend.

## Verification

- `pnpm exec eslint src/lib/integrations/integration-auth.ts src/app/api/integrations/v1/sister-platforms/identity/route.ts`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `vercel inspect greenhouse.efeoncepro.com --scope efeonce-7670142f`
- smoke manual o CLI de `/api/integrations/v1/sister-platforms/identity` en el deployment canónico

### Execution Notes

- `origin/main` y `origin/develop` quedaron sin diferencias de contenido (`git diff --name-only origin/main origin/develop` -> `0`).
- Commit de cierre documentado en `main`: `c4a57c78`.
- Verificación operativa: `POST https://greenhouse.efeoncepro.com/api/integrations/v1/sister-platforms/identity` con body vacío devolvió `401`, consistente con la presencia del endpoint bajo capa de auth.
- El cierre Greenhouse-side quedó registrado en `Handoff.md`; el siguiente paso ya no es reconciliación de ramas sino rollout/consumo desde el runtime Kortex.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado con el cierre operativo
- [x] `changelog.md` no requirió cambio adicional porque el cierre no introdujo comportamiento nuevo
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (`TASK-405`, `TASK-377`)
- [x] quedó referenciado el commit/deployment exacto que Kortex debe consumir después del cierre Greenhouse-side

## Follow-ups

- Task o rollout en Kortex para desplegar el backend/runtime que consume la identity surface ya publicada.
- Limpieza posterior del proyecto Vercel duplicado si el equipo decide hacer higiene de plataforma.

## Open Questions

- Cerrado. La promoción Greenhouse-side ya quedó absorbida; el trabajo pendiente vive del lado del runtime Kortex y su rollout bilateral.
