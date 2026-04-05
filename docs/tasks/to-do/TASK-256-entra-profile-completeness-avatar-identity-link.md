# TASK-256 — Entra Profile Completeness: avatar sync + identity link for all internal users

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-256-entra-profile-completeness`
- Legacy ID: —
- GitHub Issue: —

## Summary

Mi Perfil muestra nombre y email (fallback de sesion via TASK-255) pero sin avatar, cargo, departamento ni datos profesionales para TODOS los usuarios internos. Dos gaps sistemicos: (A) el Entra sync no fetcha fotos de Microsoft Graph, y (B) muchos `client_users` no tienen `identity_profile_id` linkeado, por lo que `person_360` no tiene fila y los datos profesionales no fluyen. Esta task cierra ambos gaps para que Mi Perfil (y toda la capa "Mi Ficha") funcione completa.

## Why This Task Exists

TASK-255 resolvio que ningun usuario vea "Perfil no disponible" — pero el perfil sigue vacio en la practica:

1. **Avatar**: `src/lib/entra/graph-client.ts` solicita campos de usuario de Microsoft Graph (`displayName`, `jobTitle`, `department`, etc.) pero NO solicita fotos. La API de Graph expone fotos en un endpoint separado (`/users/{id}/photo/$value`, retorna binario). `client_users.avatar_url` es `NULL` para todos. El header del portal SI muestra el avatar (viene del token SSO de Microsoft en login), pero Mi Perfil lee de la DB.

2. **Identity link roto**: Usuarios provisionados por SCIM o invite manual tienen `client_users.identity_profile_id = NULL`. El cron `identity-reconcile` solo linkea si YA existe un `identity_profiles` record con matching `canonical_email`. Si no existe, el cron no puede hacer match. Sin `identity_profile_id`, `person_360` no tiene fila y los datos profesionales (cargo, departamento, nivel, fecha de ingreso, sistemas vinculados) no se muestran.

3. **Entra sync no cierra el ciclo**: `profile-sync.ts` sincroniza `displayName`, `jobTitle`, `department` a `identity_profiles`, pero si `client_users` no tiene `identity_profile_id`, el usuario no se beneficia. El sync deberia asegurar que el link exista — crear identity_profile si no existe, y linkear.

**Impacto**: afecta a TODOS los usuarios internos, no solo un usuario. Toda la seccion "Mi Ficha" depende de `person_360` para datos completos.

## Goal

- Todo usuario interno ve su avatar en Mi Perfil (sincronizado desde Microsoft Entra)
- Todo usuario interno con datos en Entra ve cargo, departamento y demas datos profesionales en Mi Perfil
- `client_users.identity_profile_id` esta poblado para todo usuario interno activo despues del Entra sync
- `person_360` retorna fila para todo usuario interno activo con identity_profile linkeado
- El cron de Entra sync cierra el ciclo: fetch → create/update identity_profile → link client_users → sync avatar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — sistema de identidad y acceso, session resolution
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` — separacion auth principal vs canonical identity
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL, person_360 view
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — desacople de fuentes externas (Notion, HubSpot, Entra)
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person <> org

Reglas obligatorias:

- `identity_profiles` es el ancla canonico de identidad — nunca crear identidades paralelas
- `person_360` es una VIEW regular (no materializada), se computa on-read
- Fotos de Microsoft Graph requieren endpoint separado (`/users/{id}/photo/$value`) — no vienen en bulk user list
- Patron "Postgres first, BigQuery fallback" para session resolution — cambios deben mantener paridad PG/BQ
- Database access via `import { query, getDb, withTransaction } from '@/lib/db'` o `runGreenhousePostgresQuery`

## Normative Docs

- `docs/tasks/complete/TASK-255-mi-perfil-identity-chain-fix.md` — trabajo previo, tipos y proyecciones ya existentes

## Dependencies & Impact

### Depends on

- `greenhouse_core.identity_profiles` table — ancla de identidad
- `greenhouse_core.client_users` table — `avatar_url`, `identity_profile_id`, `microsoft_oid`
- `greenhouse_core.members` table — `identity_profile_id` link
- `greenhouse_serving.person_360` view — consume `identity_profiles` + `client_users` + `members`
- Microsoft Graph API — `/users`, `/users/{id}/photo/$value`
- TASK-255 completada — route resiliente con fallback ya implementada

### Blocks / Impacts

- Todo modulo "Mi Ficha" que dependa de `person_360` (Mi Nomina, Mis Permisos, Mi Delivery, Mi Desempeno, Mis Asignaciones)
- `TASK-008` (Team Identity Capacity System) — se beneficia de identity_profile linkeado
- `TASK-011` (ICO Person 360 Integration) — depende de person_360 poblada
- Admin Center → Personas — datos mas completos si identity_profile esta linkeado

### Files owned

- `src/lib/entra/graph-client.ts` — agregar fetch de fotos
- `src/lib/entra/profile-sync.ts` — agregar avatar sync + ensure identity_profile link
- `src/app/api/cron/entra-profile-sync/route.ts` — posibles cambios al cron

## Current Repo State

### Already exists

- `PersonProfileSummary` tipo y proyecciones — `src/types/person-360.ts`, `src/lib/person-360/get-person-profile.ts` (TASK-255)
- Route Mi Perfil resiliente con fallback a sesion — `src/app/api/my/profile/route.ts` (TASK-255)
- Entra graph client con bulk user fetch — `src/lib/entra/graph-client.ts`
- Entra profile sync que actualiza `identity_profiles` y `members` — `src/lib/entra/profile-sync.ts`
- Cron de Entra sync — `src/app/api/cron/entra-profile-sync/route.ts`
- Cron de identity reconcile — `src/app/api/cron/identity-reconcile/route.ts`
- Scripts de backfill existentes — `scripts/backfill-orphan-member-profiles.ts`, `scripts/reconcile-identity-profiles.ts`
- Identity profile creation logic en `src/lib/account-360/organization-store.ts`
- `client_users.avatar_url` column ya existe en PostgreSQL (nullable, actualmente NULL para todos)
- `client_users.identity_profile_id` column ya existe en PostgreSQL (nullable, NULL para muchos)
- `GRAPH_USER_FIELDS` en `graph-client.ts` incluye `displayName`, `jobTitle`, `department` pero NO foto

### Gap

- `GRAPH_USER_FIELDS` no incluye foto — Microsoft Graph requiere endpoint separado para fotos
- No hay logica para fetchear `/users/{id}/photo/$value` y almacenar el resultado
- `profile-sync.ts` no actualiza `client_users.avatar_url`
- `profile-sync.ts` no crea `identity_profiles` cuando no existe — solo actualiza si ya hay link
- `profile-sync.ts` no linkea `client_users.identity_profile_id` cuando el identity_profile existe pero el link falta
- `identity-reconcile` cron solo linkea si identity_profile ya existe — no lo crea
- No hay test que valide que todos los usuarios internos activos tienen `identity_profile_id` poblado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Entra sync: ensure identity_profile link para todo usuario interno

- En `profile-sync.ts`, despues de sincronizar datos a `identity_profiles`, verificar que `client_users.identity_profile_id` este poblado
- Si `client_users.identity_profile_id` es NULL pero existe un `identity_profiles` record con matching `canonical_email`:
  - UPDATE `client_users SET identity_profile_id = <matched_profile_id>`
- Si `client_users.identity_profile_id` es NULL y NO existe identity_profile:
  - INSERT un nuevo `identity_profiles` record con los datos del Entra user (email, name, job_title)
  - UPDATE `client_users SET identity_profile_id = <new_profile_id>`
- Resultado: despues de cada corrida del cron, todo usuario interno activo tiene `identity_profile_id` poblado
- Verificar que `person_360` retorna fila para estos usuarios despues del link

### Slice 2 — Entra sync: fetch y almacenar avatar desde Microsoft Graph

- En `graph-client.ts`, agregar funcion para fetchear foto de perfil: `GET /users/{oid}/photo/$value`
  - Retorna binario (image/jpeg o image/png)
  - Opciones de almacenamiento a evaluar en Discovery: (a) convertir a data URI y guardar en `avatar_url`, (b) subir a Cloud Storage y guardar URL publica, (c) usar endpoint proxy `/api/media/avatar/{oid}` que sirva la foto desde Graph on-demand
- En `profile-sync.ts`, despues de sincronizar datos, actualizar `client_users.avatar_url` con la URL/data del avatar
- Resultado: `client_users.avatar_url` poblado para todo usuario que tenga foto en Entra

### Slice 3 — Verificacion end-to-end y hardening

- Verificar que `person_360.resolved_avatar_url` retorna la URL del avatar para usuarios linkeados
- Verificar que Mi Perfil muestra avatar, cargo, departamento, y demas datos profesionales
- Verificar que el cron es idempotente — correr multiples veces no duplica identity_profiles ni corrompe datos
- Agregar logs operativos al cron: cuantos usuarios procesados, cuantos linkeados, cuantos avatars sincronizados

## Out of Scope

- Sincronizar fotos para usuarios NO internos (clientes externos)
- Edicion de perfil desde Mi Perfil (lectura only)
- Sincronizar fotos desde fuentes que no sean Microsoft Entra (Google, HubSpot)
- Crear/modificar la vista de Mi Perfil (UI) — ya funciona con los tipos existentes de TASK-255
- Migrar password_hash de BigQuery a PostgreSQL
- Cambios a la vista `person_360` — ya consume `client_users.avatar_url` correctamente
- BigQuery sync de avatares — solo PostgreSQL por ahora

## Detailed Spec

### Microsoft Graph Photo API

```
GET https://graph.microsoft.com/v1.0/users/{id}/photo/$value
Authorization: Bearer {token}
→ Response: binary image (image/jpeg or image/png)
→ 404 if user has no photo
```

Alternativa sin binario:
```
GET https://graph.microsoft.com/v1.0/users/{id}/photo
→ Response: { "@odata.mediaContentType": "image/jpeg", "width": 648, "height": 648 }
```

La foto de Microsoft Graph NO tiene URL publica estable — requiere token de acceso. Opciones:

**Opcion A — Data URI (simple, sin storage):**
- Fetchear binario, convertir a base64, guardar como `data:image/jpeg;base64,...` en `avatar_url`
- Pro: sin infraestructura extra. Con: columna puede crecer (fotos ~50-100KB encoded)

**Opcion B — Cloud Storage (escalable):**
- Subir a GCS bucket, guardar URL publica
- Pro: escalable, cacheable. Con: requiere bucket + IAM + cleanup

**Opcion C — Proxy on-demand (sin storage):**
- Endpoint `/api/media/avatar/{oid}` que fetcha de Graph en cada request
- Pro: siempre fresco. Con: latencia, dependencia de Graph API en runtime

Recomendacion: evaluar en Discovery. Opcion A es la mas rapida de implementar; Opcion B es mejor a largo plazo.

### Identity Profile Ensure Logic

```
Para cada usuario Entra:
  1. Buscar client_users por microsoft_oid
  2. Si client_users.identity_profile_id IS NOT NULL → ya linkeado, skip
  3. Si client_users.identity_profile_id IS NULL:
     a. Buscar identity_profiles WHERE canonical_email = user.email
     b. Si existe → UPDATE client_users SET identity_profile_id = found.profile_id
     c. Si no existe → INSERT identity_profiles con datos del Entra user
        → UPDATE client_users SET identity_profile_id = new.profile_id
  4. Actualizar identity_profiles con datos frescos de Entra (name, job_title, department)
  5. Si avatar disponible → UPDATE client_users SET avatar_url = avatar_data
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Todo usuario interno activo tiene `client_users.identity_profile_id` poblado despues de correr el cron de Entra sync
- [ ] `person_360` retorna fila para todo usuario interno activo con identity_profile linkeado
- [ ] Usuarios con foto en Entra tienen `client_users.avatar_url` poblado despues del cron
- [ ] Mi Perfil muestra avatar para usuarios con foto sincronizada
- [ ] Mi Perfil muestra cargo, departamento y datos profesionales para usuarios linkeados
- [ ] El cron es idempotente — correr multiples veces no duplica ni corrompe datos
- [ ] `pnpm lint` y `npx tsc --noEmit` pasan sin errores
- [ ] No se rompe el login flow existente

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Validacion manual en staging: correr cron → verificar Mi Perfil muestra datos completos para multiples usuarios

## Closing Protocol

- [ ] Verificar que el cron de Entra sync esta programado en `vercel.json`
- [ ] Verificar que los logs del cron muestran metricas operativas (usuarios procesados, linkeados, avatars)
- [ ] Actualizar `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` con el nuevo flujo de Entra sync

## Follow-ups

- Sincronizar fotos desde Google Workspace para usuarios que usen Google SSO
- Considerar Cloud Storage para avatares si el patron de data URI resulta pesado
- Auditar otros modulos de Mi Ficha que dependan de `person_360` — con identity link cerrado, deberian funcionar
- Considerar webhook de Microsoft Graph para cambios de perfil en tiempo real (en lugar de solo cron)

## Open Questions

- Estrategia de almacenamiento de avatar: data URI vs Cloud Storage vs proxy on-demand? Evaluar en Discovery
- Hay usuarios internos que NO estan en Entra (e.g. cuentas de servicio, bots)? Si si, deben excluirse del ensure link
- El cron actual de Entra sync corre cada cuanto? Verificar en `vercel.json`
- Existen usuarios con identity_profile pero sin member record? Si si, person_360 tendra fila pero memberFacet sera null — verificar que Mi Perfil maneja esto gracefully (ya deberia por TASK-255)
