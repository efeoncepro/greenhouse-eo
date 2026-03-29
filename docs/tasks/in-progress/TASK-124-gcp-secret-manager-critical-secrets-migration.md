# TASK-124 — GCP Secret Manager Critical Secrets Migration

## Delta 2026-03-29 — Staging rollout validado en `develop`

- Los commits de `TASK-124` ya fueron promovidos a `develop` en `497cb19`.
- `staging` ya redeployó ese commit y `dev-greenhouse.efeoncepro.com/api/internal/health` respondió `200 OK`.
- Validación real observada en `staging`:
  - `version=497cb19`
  - secretos críticos ya resueltos por `secret_manager`:
    - `NEXTAUTH_SECRET`
    - `AZURE_AD_CLIENT_SECRET`
    - `NUBOX_BEARER_TOKEN`
- Estado residual observado:
  - `GREENHOUSE_POSTGRES_PASSWORD` todavía reporta `source=env` en health
  - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` siguen `unconfigured` en posture runtime de `staging`
  - `production` ya tiene secretos y `*_SECRET_REF` preparados, pero sigue pendiente validación después de promover a `main`

## Delta 2026-03-29

- Nace como derivada directa del cierre operativo de `TASK-096`.
- `TASK-096` ya cerró el baseline WIF/OIDC en Vercel y el hardening externo de Cloud SQL.
- El remanente real ya no es auth/runtime GCP, sino la migración de secretos críticos de Vercel env vars a GCP Secret Manager.

## Delta 2026-03-29 — Lane iniciada

- `TASK-124` pasa a `in-progress`.
- Slice inicial acordado para minimizar riesgo:
  - helper canónico `src/lib/secrets/secret-manager.ts`
  - migración del primer consumer aislado con fallback a env var
  - postura básica de secretos en `GET /api/internal/health`
- Fuera de este primer lote:
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`
  - passwords PostgreSQL (`runtime`, `migrator`, `admin`)

## Delta 2026-03-29 — Slice 1 implementado

- Ya existe el helper canónico `src/lib/secrets/secret-manager.ts`.
- El helper soporta:
  - cache corta
  - fallback a env var
  - convención `<ENV_VAR>_SECRET_REF`
  - refs cortos o fully qualified sin exponer valores en logs
- `GET /api/internal/health` ahora proyecta postura de secretos críticos por `secret_manager | env | unconfigured`.
- Primer consumer migrado en runtime:
  - `src/lib/nubox/client.ts` ya resuelve `NUBOX_BEARER_TOKEN` vía helper con fallback controlado
- Sigue pendiente para slices posteriores:
  - `NEXTAUTH_SECRET`
  - `AZURE_AD_CLIENT_SECRET`

## Delta 2026-03-29 — Slice 2 implementado

- `src/lib/postgres/client.ts` ya acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF` como alternativa canónica al password legacy.
- El runtime de Cloud SQL ahora resuelve la credencial por:
  - `Secret Manager`
  - fallback a `GREENHOUSE_POSTGRES_PASSWORD`
  - `unconfigured` si no existe ninguna ruta
- `scripts/lib/load-greenhouse-tool-env.ts` ya alinea también perfiles `runtime`, `migrator` y `admin` hacia:
  - `GREENHOUSE_POSTGRES_PASSWORD`
  - `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`
- `pnpm pg:doctor --profile=runtime` ya quedó validado con este path en local.
- Sigue pendiente para slices posteriores:
  - validación real en `staging` y `production` con secretos servidos desde Secret Manager

## Delta 2026-03-29 — Slice 3 implementado

- `NEXTAUTH_SECRET` ya quedó alineado al helper vía `src/lib/auth-secrets.ts`.
- `AZURE_AD_CLIENT_SECRET` ya queda resuelto desde el mismo helper con fallback controlado.
- `GOOGLE_CLIENT_SECRET` también quedó alineado al mismo patrón para dejar ambos SSO simétricos.
- Superficies migradas:
  - `src/lib/auth.ts`
  - `src/lib/auth-tokens.ts`
  - `src/lib/admin/tenant-contact-provisioning-snapshot.ts`
  - `src/app/(blank-layout-pages)/login/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
- Contrato operativo preservado:
  - Microsoft SSO sigue disponible cuando existen `AZURE_AD_CLIENT_ID` y el secret resuelve por Secret Manager o env
  - Google SSO sigue disponible cuando existen `GOOGLE_CLIENT_ID` y el secret resuelve por Secret Manager o env
- Sigue pendiente:
  - validación real en `staging` y `production` con secretos servidos desde Secret Manager

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `in-progress` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Rollout parcial validado` |
| Rank | — |
| Domain | Infrastructure / Security |

## Summary

Separar la Fase 3 de secretos críticos en una lane propia. El objetivo es migrar los secretos de mayor blast radius a GCP Secret Manager con fallback controlado, sin reabrir la discusión de WIF ni del hardening externo de Cloud SQL ya cerrados en `TASK-096`.

## Why This Task Exists

Después de `TASK-096`, Greenhouse ya opera con WIF en `staging` y `production`, y Cloud SQL ya quedó endurecido con `authorizedNetworks` vacía y `sslMode=ENCRYPTED_ONLY`. El riesgo principal restante en esta superficie no es una SA key estática, sino secretos críticos todavía almacenados en Vercel env vars:

- `GREENHOUSE_POSTGRES_PASSWORD`
- `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
- `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
- `NEXTAUTH_SECRET`
- `AZURE_AD_CLIENT_SECRET`
- `NUBOX_BEARER_TOKEN`

Ese problema merece una task separada porque:

- tiene dependencias distintas a las de WIF
- afecta consumers distintos
- tiene rollout propio
- no debe impedir cerrar la lane ya completada de `TASK-096`

## Goal

- Mover los secretos críticos de mayor blast radius a GCP Secret Manager.
- Mantener fallback a env var durante la transición para evitar downtime.
- Exponer validación operativa suficiente para saber si el runtime realmente está leyendo desde Secret Manager.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- no reintroducir SA key ni bypasses fuera del baseline WIF ya cerrado
- no romper `staging` ni `production` por eliminar env vars demasiado pronto
- mantener fallback controlado hasta terminar la validación real por entorno

## Dependencies & Impact

### Depends on

- `TASK-096` cerrada para WIF/OIDC y hardening externo de Cloud SQL
- acceso admin a Secret Manager en `efeonce-group`
- runtime actual con `GCP_WORKLOAD_IDENTITY_PROVIDER` + `GCP_SERVICE_ACCOUNT_EMAIL`

### Impacts to

- `src/lib/postgres/client.ts`
- auth / NextAuth runtime
- integración Nubox
- health / observability de secretos

### Files owned

- `src/lib/secrets/secret-manager.ts`
- `src/lib/postgres/client.ts`
- `src/lib/auth/**` o equivalente runtime auth
- `src/lib/nubox/**`
- `src/app/api/internal/health/route.ts`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

## Current Repo State

### Ya existe

- WIF ya validado en `preview`, `staging` y `production`
- Cloud SQL ya endurecido externamente
- `src/lib/google-credentials.ts` ya resuelve auth GCP sin SA key en entornos validados
- `GET /api/internal/health` ya existe para proyectar postura cloud

### Gap actual

- secretos críticos siguen viviendo en Vercel env vars mientras dura la transición
- `production` sigue pendiente de validación real con secretos servidos desde Secret Manager
- la credencial runtime de Postgres en `staging` todavía está cayendo al env legacy

## Scope

### Slice 1 — Secret Manager helper

- crear `src/lib/secrets/secret-manager.ts`
- agregar cache corta y fallback a env var
- soportar acceso por nombre/version estable

### Slice 2 — PostgreSQL critical passwords

- migrar lectura de passwords `runtime`, `migrator` y `admin`
- mantener fallback a env var durante rollout
- validar `pnpm pg:doctor` con la ruta nueva

### Slice 3 — Auth and Nubox

- migrar `NEXTAUTH_SECRET`
- migrar `AZURE_AD_CLIENT_SECRET`
- mantener fallback transicional

### Slice 4 — Runtime visibility

- reportar en `/api/internal/health` si los secretos críticos están siendo resueltos por Secret Manager o por fallback
- dejar criterio claro para retirar env vars viejas

## Out of Scope

- reabrir WIF/OIDC
- tocar otra vez `authorizedNetworks` o `sslMode` de Cloud SQL
- migrar todos los secretos de bajo blast radius fuera de Vercel
- rotación automática o versionado avanzado de secretos

## Acceptance Criteria

- [x] Existe helper canónico `src/lib/secrets/secret-manager.ts`
- [x] PostgreSQL passwords pueden resolverse desde Secret Manager con fallback
- [x] `NEXTAUTH_SECRET` puede resolverse desde Secret Manager con fallback
- [x] `NUBOX_BEARER_TOKEN` puede resolverse desde Secret Manager con fallback
- [x] `/api/internal/health` reporta postura de secretos
- [x] `staging` validado con al menos un secreto crítico servido desde Secret Manager
- [ ] `production` validado con al menos un secreto crítico servido desde Secret Manager
- [x] documentación viva actualizada

## Verification

- `pnpm exec eslint ...`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run ...`
- smoke de `/api/internal/health`
- `pnpm pg:doctor --profile=runtime`
