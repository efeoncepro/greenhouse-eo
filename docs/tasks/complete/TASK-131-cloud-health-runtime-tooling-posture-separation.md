# TASK-131 - Cloud Health Runtime vs Tooling Posture Separation

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `53`
- Domain: `cloud`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Delta 2026-03-29

- `TASK-131` quedó cerrada con una corrección semántica en la capa `cloud/*`.
- `src/lib/cloud/secrets.ts` ahora clasifica los secretos tracked entre:
  - `runtime`
  - `tooling`
- `src/lib/cloud/health.ts` ya evalúa `postureChecks.secrets` solo con secretos runtime-críticos.
- `migrator/admin` siguen visibles vía `postgresAccessProfiles` y `toolingSummary`, pero ya no degradan el significado del runtime principal.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/health.ts src/lib/cloud/secrets.ts src/lib/cloud/postgres.ts src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

## Summary

El `GET /api/internal/health` del portal ya separa conceptualmente el runtime Postgres del posture de perfiles `migrator` y `admin`, pero el `overallStatus` sigue degradándose por una mezcla semántica en `postureChecks.secrets`. El efecto práctico es que `production` aparece como `degraded` aunque el runtime real esté sano y el único gap sea tooling privilegiado no cargado en el portal.

Esta task corrige esa frontera de manera explícita: el health runtime del portal debe reflejar únicamente lo que afecta tráfico real, mientras que la readiness de `migrator/admin` debe seguir visible como postura operativa separada, sin forzar a inyectar credenciales privilegiadas en el runtime productivo solo para “poner verde” el panel.

## Why This Task Exists

Hoy existe una contradicción entre arquitectura y comportamiento observado:

- La arquitectura de acceso Postgres ya define que:
  - `runtime` sirve requests del portal
  - `migrator` sirve setup/migraciones
  - `admin` sirve bootstrap/acceso privilegiado
- La postura cloud ya documenta que `migrator/admin` no deben degradar el significado del runtime principal.
- Sin embargo, `src/lib/cloud/secrets.ts` sigue agrupando todos los secretos tracked en un único posture `secrets`, y `src/lib/cloud/health.ts` degrada `overallStatus` si cualquier secreto tracked está `unconfigured`.

Resultado:

- `production` puede quedar con `postgres=ok`, `bigquery=ok`, `observability=ok`
- pero `overallStatus=degraded`
- solo porque faltan `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD(_SECRET_REF)` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD(_SECRET_REF)` en el runtime del portal

Eso incentiva el comportamiento equivocado: cargar credenciales privilegiadas en el portal solo para silenciar un warning que no representa un outage real.

## Goal

- Separar formalmente secretos runtime-críticos de secretos de tooling/operación dentro del health institucional.
- Evitar que la ausencia de `migrator/admin` degrade `overallStatus` cuando el runtime del portal está sano.
- Mantener visibilidad explícita de `runtime`, `migrator` y `admin` en una sección separada y legible para operaciones.
- Alinear contrato, UI y documentación para que el panel de `Ops Health` no mezcle disponibilidad con governance de acceso privilegiado.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- El runtime del portal solo debe depender del perfil Postgres `runtime`.
- `migrator` y `admin` deben seguir visibles para operaciones, pero no redefinir el significado de disponibilidad runtime.
- No introducir credenciales privilegiadas en `production` solo para corregir un semáforo del health.
- El `overallStatus` del health interno debe seguir degradándose solo por fallos reales de runtime o posture verdaderamente runtime-crítica.

## Dependencies & Impact

### Depends on

- `TASK-122` — baseline del dominio Cloud institucionalizado
- `TASK-124` — helper/contract de Secret Manager y posture de secretos críticos
- `TASK-098` — health endpoint y posture operativa en `Admin Center`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

### Impacts to

- `GET /api/internal/health`
- `Admin Center > Ops Health`
- lectura operativa de `production` y `staging`
- `TASK-127` — consolidación arquitectónica Cloud
- follow-ons futuros donde se agreguen secretos tracked al posture institucional

### Files owned

- `src/lib/cloud/health.ts`
- `src/lib/cloud/secrets.ts`
- `src/lib/cloud/postgres.ts`
- `src/lib/cloud/contracts.ts`
- `src/app/api/internal/health/route.ts`
- `src/views/greenhouse/admin/**`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/tasks/to-do/TASK-131-cloud-health-runtime-tooling-posture-separation.md`

## Current Repo State

### Ya existe

- `src/lib/cloud/postgres.ts` ya expone `postgresAccessProfiles` con:
  - `runtime`
  - `migrator`
  - `admin`
- `src/lib/cloud/health.ts` ya distingue:
  - `runtimeChecks`
  - `postureChecks`
  - `overallStatus`
- `production` ya valida runtime sano:
  - `postgres=ok`
  - `bigquery=ok`
  - `observability=ok`
- La arquitectura ya documenta que `migrator/admin` no forman parte del runtime principal del portal.

### Gap actual

- El gap original ya quedó resuelto en repo:
  - `secrets` distingue `runtimeSummary` y `toolingSummary`
  - la degradación del health ya no se activa solo por `migrator/admin`
  - `postgresAccessProfiles` sigue exponiendo los perfiles privilegiados por separado
- El remanente externo es solo validar este comportamiento en `staging` y `production` tras deploy del nuevo commit.

## Scope

### Slice 1 - Contrato semántico del health

- Definir en código y docs qué secretos pertenecen a:
  - runtime crítico
  - tooling/admin posture
- Decidir si `CloudSecretsPosture` se separa en subgrupos o si `CloudHealth` deja de degradar por ciertos entries.
- Mantener compatibilidad hacia atrás razonable en el payload donde sea posible.

### Slice 2 - Runtime-only degradation

- Ajustar `buildCloudHealthSnapshot()` y/o `getCloudPostureChecks()` para que el `overallStatus` no se degrade por `migrator/admin` faltantes.
- Conservar degradación para:
  - `postgres_runtime_password`
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - otros secretos runtime-críticos definidos como tales

### Slice 3 - Tooling posture explícita

- Reforzar `postgresAccessProfiles` como sección separada de readiness operativa.
- Si hace falta, introducir un bloque adicional tipo:
  - `toolingChecks`
  - `accessPosture`
  - `privilegedProfiles`
- Asegurar que el payload siga mostrando claramente:
  - qué perfil está configurado
  - vía `Secret Manager`, `env` o `unconfigured`
  - sin exponer valores

### Slice 4 - UI y documentación viva

- Alinear `Ops Health` para que el copy y semáforos no sugieran outage donde hay solo backlog de tooling.
- Actualizar arquitectura y task docs para reflejar la nueva semántica.
- Registrar explícitamente que el portal productivo no requiere `migrator/admin` para estar sano.

## Out of Scope

- Provisionar `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` en `production` solo para silenciar el warning.
- Provisionar `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` en `production` solo para silenciar el warning.
- Cambiar el modelo de acceso Postgres o los roles existentes.
- Reescribir `pg:doctor`, bootstrap SQL o scripts de migración.
- Mezclar este ajuste con nuevos secretos, budgets GCP o follow-ons de webhooks.

## Acceptance Criteria

- [x] `GET /api/internal/health` ya no degrada `overallStatus` solo porque `migrator/admin` estén sin configurar y el runtime esté sano.
- [x] La ausencia de `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD(_SECRET_REF)` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD(_SECRET_REF)` sigue visible en una postura separada.
- [x] `postgresAccessProfiles` mantiene detalle explícito por perfil `runtime`, `migrator` y `admin`.
- [x] `postureChecks.secrets` deja de mezclar secretos runtime-críticos con tooling-only sin perder visibilidad.
- [x] La semántica esperada para `Ops Health` queda alineada desde el contrato del endpoint interno.
- [x] Arquitectura y documentación viva quedan alineadas con el comportamiento final del repo.

## Verification

- `pnpm exec vitest run src/lib/cloud/*.test.ts`
- `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/health.ts src/lib/cloud/secrets.ts src/lib/cloud/postgres.ts src/app/api/internal/health/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- validación manual o `vercel curl /api/internal/health` en `staging`
- validación manual o `vercel curl /api/internal/health` en `production`

## Open Questions

- ¿Conviene que el bloque separado se llame `postgresAccessProfiles`, `toolingChecks` o `accessPosture` para que sea semánticamente estable a futuro?
- ¿Otros secretos tracked hoy deberían pasar también a clasificación runtime vs tooling, por ejemplo futuros secrets de backfill o mantenimiento?
- ¿La UI de `Ops Health` debe mostrar un estado `attention`/`warning` independiente del `overallStatus` para backlog de tooling privilegiado?

## Rollout Notes

- Implementar primero en `develop/staging`.
- Verificar que `overallStatus` cambie a `ok` sin perder señal sobre `migrator/admin`.
- Recién después promover a `main/production`.
- No cargar credenciales nuevas en Vercel/GCP como workaround antes de cerrar esta task.

## Follow-ups

- Si el patrón resulta útil, extender clasificación runtime vs tooling al resto de `CloudSecretsPosture`.
- Evaluar si `TASK-127` debe absorber una auditoría posterior de todos los checks que hoy degradan por governance en vez de availability.
