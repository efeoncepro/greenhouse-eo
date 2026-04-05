# TASK-255 — Mi Perfil: fix identity chain so profile never shows "Perfil no disponible"

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-255-mi-perfil-identity-chain`
- Legacy ID: —
- GitHub Issue: —

## Summary

La pagina Mi Perfil (`/my/profile`) muestra "Perfil no disponible" para usuarios internos autenticados. La causa raiz es que el path BigQuery de login no selecciona `member_id` ni `identity_profile_id`, dejando el JWT sin `memberId`. Ademas, la route exige `memberId` via `requireMyTenantContext()` y no tiene fallback: si falta, devuelve 422 sin intentar datos de sesion. El fix abarca 3 capas: data (BigQuery query), auth (verificar PostgreSQL path) y view (resiliencia de la route).

## Why This Task Exists

**Diagnostico confirmado via DevTools (2026-04-05):**

1. `GET /api/my/profile` responde **422 Unprocessable Content** con body `{"error":"Member identity not linked"}`
2. `requireMyTenantContext()` en `src/lib/tenant/authorization.ts:79-83` rechaza si `tenant.memberId` es null
3. El JWT se construye en `src/lib/auth.ts` callbacks; `token.memberId` viene de `TenantAccessRecord.memberId`
4. Hay dos paths para obtener `TenantAccessRecord`:
   - **PostgreSQL** (`session_360` en `src/lib/tenant/identity-store.ts`) — SI selecciona `member_id` e `identity_profile_id`
   - **BigQuery** (fallback en `src/lib/tenant/access.ts:248-326`, funcion `getIdentityAccessRecord`) — **NO selecciona** `cu.member_id` ni `cu.identity_profile_id`
5. Para credentials login (`getTenantAccessRecordByEmail`), si PostgreSQL no tiene `password_hash`, se cae al path BigQuery (linea 360-366) y `memberId` queda null
6. Adicionalmente, `client_users.member_id` podria ser NULL si el cron `identity-reconcile` no ha corrido o matcheado por email

**Impacto:** todo usuario cuyo login resuelva por BigQuery, o cuyo `client_users.member_id` no este poblado, ve un perfil roto. Afecta la primera impresion del portal para colaboradores internos.

## Goal

- Todo usuario autenticado ve su perfil con al menos nombre, email y avatar (nunca "Perfil no disponible")
- El path BigQuery de login retorna `member_id` e `identity_profile_id` igual que el path PostgreSQL
- La route de Mi Perfil es resiliente: si `person_360` no tiene fila, degrada gracefully a datos de sesion
- Los tipos y proyecciones siguen el patron establecido de Person360 contexts (`PersonHrContext`, `PersonDeliveryContext`, etc.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — sistema de identidad y acceso
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separacion auth principal vs canonical identity
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PostgreSQL + BigQuery

Reglas obligatorias:

- Patron "Postgres first, BigQuery fallback" para session resolution
- `person_360` es una VIEW regular (no materializada); se computa on-read
- `TenantAccessRow` es el contrato canonico entre auth y JWT — cualquier campo nuevo debe ir en ambos paths (PG y BQ)
- Proyecciones de Person360 siguen patron: tipo en `src/types/`, funcion en `src/lib/person-360/`, API consume funcion

## Normative Docs

- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person <> org, poblaciones A/B/C

## Dependencies & Impact

### Depends on

- `greenhouse_serving.session_360` view — path PostgreSQL de session resolution
- `greenhouse_serving.person_360` view — vista de perfil completo
- `greenhouse.client_users` table (BigQuery) — contiene `member_id`, `identity_profile_id`
- `greenhouse_core.client_users` table (PostgreSQL) — mismos campos
- `greenhouse_core.identity_profiles` table — ancla de identidad canonico

### Blocks / Impacts

- Todo modulo "Mi Ficha" que use `requireMyTenantContext` tiene el mismo gap potencial (Mi Nomina, Mis Permisos, Mi Delivery, etc.)
- `TASK-008` (Team Identity Capacity System) — se beneficia de que `memberId` fluya correctamente
- `TASK-011` (ICO Person 360 Integration) — depende de `person_360` poblada

### Files owned

- `src/lib/tenant/access.ts` — BigQuery query SELECT (agregar columnas)
- `src/app/api/my/profile/route.ts` — route resilience
- `src/lib/person-360/get-person-profile.ts` — proyecciones `toPersonProfileSummary`, `toPersonProfileSummaryFromSession`
- `src/types/person-360.ts` — tipo `PersonProfileSummary`
- `src/views/greenhouse/my/MyProfileView.tsx` — consume tipo compartido

## Current Repo State

### Already exists

- `PersonProfileSummary` tipo en `src/types/person-360.ts` (ya creado, commit `f645d478`)
- `toPersonProfileSummary()` en `src/lib/person-360/get-person-profile.ts` (ya creado)
- `toPersonProfileSummaryFromSession()` en `src/lib/person-360/get-person-profile.ts` (ya creado)
- `MyProfileView.tsx` importa `PersonProfileSummary` del tipo compartido (ya migrado, commit `f645d478`)
- `TenantAccessRow` ya declara `member_id` e `identity_profile_id` como campos opcionales (lineas 65-66)
- `normalizeTenantAccessRow` ya mapea ambos campos (lineas 207-208)
- `session_360` PostgreSQL view ya selecciona `member_id` e `identity_profile_id`
- Route `src/app/api/my/profile/route.ts` tiene implementacion parcial con `requireTenantContext` + fallback (commit `0740b380`, necesita consolidacion)

### Gap

- BigQuery SELECT en `getIdentityAccessRecord` (lineas 250-276) no incluye `cu.member_id` ni `cu.identity_profile_id` — causa raiz del 422
- BigQuery GROUP BY (lineas 306-325) tampoco incluye ambas columnas
- Route parcialmente editada en multiples commits — necesita consolidacion limpia
- No hay verificacion de que `client_users.member_id` este poblado para el usuario afectado
- No hay test que valide que ambos paths (PG y BQ) retornan `memberId` cuando existe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — BigQuery query + credentials authorize: paridad de identity fields

- Agregar `cu.member_id` y `cu.identity_profile_id` al SELECT de `getIdentityAccessRecord` en `src/lib/tenant/access.ts` (despues de linea 262)
- Agregar ambas columnas al GROUP BY del mismo query (despues de linea 318)
- Agregar `memberId` e `identityProfileId` al return object de `authorize()` en `src/lib/auth.ts:228-254`
  - Actualmente el credentials path retorna user SIN estos campos, aunque el tenant los tiene
  - SSO paths no tienen este bug porque leen `tenant.memberId` directamente en el JWT callback
- Verificar que `normalizeTenantAccessRow` ya mapea correctamente (ya existe, lineas 207-208)
- Resultado: los 3 paths de login (credentials, Microsoft SSO, Google SSO) retornan `memberId` en el JWT

### Slice 2 — Route resiliente con fallback a sesion

- Consolidar `src/app/api/my/profile/route.ts` en version limpia:
  - Usar `requireTenantContext` (no `requireMyTenantContext`)
  - Si `tenant.memberId` existe → intentar `person_360` → `toPersonProfileSummary()`
  - Si `person_360` no tiene fila o `memberId` no existe → `toPersonProfileSummaryFromSession(session.user)`
  - Nunca retornar 404 ni 422 para un usuario autenticado
- Verificar que `toPersonProfileSummaryFromSession` recibe los campos correctos del session user

### Slice 3 — Verificacion end-to-end

- Verificar via DevTools que `GET /api/my/profile` retorna 200 con datos del perfil
- Verificar que la vista renderiza nombre, email y avatar (como minimo)
- Si `person_360` tiene fila completa, verificar que datos profesionales (cargo, depto, nivel) tambien renderizan

## Out of Scope

- Migrar `password_hash` de BigQuery a PostgreSQL (eso es una task separada de consolidacion de auth store)
- Arreglar otros modulos de Mi Ficha que usen `requireMyTenantContext` — esta task solo arregla Mi Perfil; los demas se documentan como follow-up
- Cambiar la logica de `identity-reconcile` cron o forzar reconciliacion manual
- Agregar UI de edicion de perfil o campos adicionales a la vista
- Crear tests unitarios para `getIdentityAccessRecord` (el query va contra BigQuery real)

## Detailed Spec

### Capa 1 — BigQuery SELECT fix

En `src/lib/tenant/access.ts`, funcion `getIdentityAccessRecord`, agregar al SELECT (despues de linea 276):

```sql
cu.member_id,
cu.identity_profile_id,
```

Y al GROUP BY (despues de linea 325):

```sql
cu.member_id,
cu.identity_profile_id,
```

Ambos campos ya existen en la tabla `greenhouse.client_users` de BigQuery. No requiere migracion.

### Capa 2 — Route consolidada

```
GET /api/my/profile

requireTenantContext()   -- solo exige sesion valida
  |
  +--> tenant.memberId exists?
  |       |
  |       YES --> getPersonProfileByMemberId(memberId)
  |                |
  |                +--> profile found? --> toPersonProfileSummary(profile) --> 200
  |                |
  |                +--> not found --> fallback (abajo)
  |
  +--> fallback: getServerSession() --> toPersonProfileSummaryFromSession(session.user) --> 200
```

### Nota sobre commits parciales ya en develop

Los commits `f645d478` y `0740b380` ya estan en `develop` con:
- Tipo compartido `PersonProfileSummary`
- Proyecciones `toPersonProfileSummary` y `toPersonProfileSummaryFromSession`
- Route parcialmente refactoreada

El agente debe consolidar la route a su forma final (Slice 2) sin romper lo que ya funciona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] BigQuery SELECT en `getIdentityAccessRecord` incluye `cu.member_id` y `cu.identity_profile_id`
- [ ] BigQuery GROUP BY incluye ambas columnas
- [ ] Credentials `authorize()` en `auth.ts` incluye `memberId` e `identityProfileId` en el user retornado
- [ ] `GET /api/my/profile` retorna 200 para un usuario autenticado sin `memberId` en sesion
- [ ] `GET /api/my/profile` retorna 200 con datos completos de `person_360` cuando `memberId` y fila existen
- [ ] La vista Mi Perfil nunca muestra "Perfil no disponible" para un usuario logueado
- [ ] `pnpm lint` y `npx tsc --noEmit` pasan sin errores
- [ ] No se rompe el login flow (PG path sigue funcionando igual)

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Validacion manual en staging: login con usuario afectado → `/my/profile` muestra datos

## Closing Protocol

- [ ] Consolidar route en un solo estado limpio (limpiar commits parciales previos)
- [ ] Verificar que otros paths de login (Microsoft SSO, Google SSO) tambien retornan `memberId` por BQ cuando hacen fallback

## Follow-ups

- Auditar otros endpoints que usan `requireMyTenantContext` (Mi Nomina, Mis Permisos, Mi Delivery, Mi Desempeno) — si `memberId` falta, todos fallan con 422
- Considerar migrar `password_hash` a PostgreSQL para eliminar el fallthrough a BigQuery en credentials login
- Considerar agregar test de integracion que verifique paridad de campos entre PG y BQ session resolution paths

## Delta 2026-04-05

- Discovery encontro un gap adicional: `credentials authorize()` en `auth.ts:228-254` retorna user object SIN `memberId` ni `identityProfileId`, aunque el `tenant` los tiene. Esto causa que el JWT callback (linea 399-400) lea `undefined`. SSO paths no tienen este bug porque leen `tenant` directamente. Slice 1 actualizado para incluir el fix.
- Tambien falta `spaceId`, `organizationId`, `organizationName` en el mismo return — mismo patron de bug, pero fuera del scope de TASK-255.

## Open Questions

- Confirmar: el usuario afectado usa credentials login (no SSO)? Si usa SSO, el fallthrough a BigQuery ocurre por otra razon (Microsoft OID no encontrado en PG, etc.)
- El campo `client_users.member_id` en BigQuery esta poblado para el usuario afectado? Si es NULL en ambos stores, el fix de BigQuery query no basta — habria que forzar reconciliacion o link manual
