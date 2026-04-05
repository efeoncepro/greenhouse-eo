# ISSUE-014 — person_360 VIEW faltaba columnas enriched (avatar, job_title, phone)

## Ambiente

staging

## Detectado

2026-04-05, reporte de usuario: Mi Perfil muestra `hasMemberFacet: true` pero todos los campos enriched (avatar, cargo, telefono, departamento) son `null`.

## Sintoma

- Mi Perfil muestra nombre y email pero sin avatar, cargo, departamento ni datos profesionales
- La API `/api/my/profile` retorna `resolvedAvatarUrl: null`, `resolvedJobTitle: null`, `departmentName: null` a pesar de que `hasMemberFacet: true`
- El Entra sync reporta exito (`avatarsSynced: 7`, `profilesLinked: 7`) pero los datos no se reflejan en el perfil

## Causa raiz

La VIEW `greenhouse_serving.person_360` en la base de datos era la **version antigua** (rollup-based) que no exponia las columnas enriched que el codigo TypeScript esperaba.

Cadena del problema:

1. El Entra sync (TASK-256) escribia correctamente a `client_users.avatar_url` y `identity_profiles.job_title` — los datos estaban en la DB
2. El codigo TypeScript en `src/lib/person-360/get-person-profile.ts` hacia `SELECT * FROM person_360` esperando columnas como `resolved_avatar_url`, `resolved_job_title`, `resolved_phone`, `department_name`
3. La VIEW en produccion era la version antigua que NO tenia estas columnas — usaba rollups con `primary_member_id`, `primary_user_id`, etc.
4. El script v2 (`scripts/setup-postgres-person-360-v2.sql`) existia con la VIEW correcta (LATERAL joins + resolved fields) pero **nunca se habia aplicado como migracion**
5. PostgreSQL retornaba `NULL` para todas las columnas que no existian en la VIEW

## Impacto

- **TODOS los usuarios internos** veian Mi Perfil vacio (sin avatar, cargo, departamento, telefono, sistemas vinculados) a pesar de que los datos existian en la base de datos
- La seccion "Mi Ficha" completa estaba degradada: los datos estaban sincronizados pero no eran accesibles a traves de `person_360`
- Afectaba cualquier consumer de `person_360` que esperara las columnas v2

## Solucion

Migracion `20260405164846570_person-360-v2-enriched-view.sql` que reemplaza la VIEW con la version v2:

- `DROP VIEW IF EXISTS greenhouse_serving.person_360`
- `CREATE OR REPLACE VIEW greenhouse_serving.person_360 AS ...` con LATERAL joins para resolucion deterministica
- Nuevas columnas: `resolved_avatar_url`, `resolved_email`, `resolved_phone`, `resolved_job_title`, `department_name`, `job_level`, `employment_type`, `hire_date`, `contract_end_date`, `daily_required`, `member_phone`, `avatar_url`, `auth_mode`, `user_timezone`, `default_portal_home_path`, `microsoft_oid`, `google_sub`, `password_hash_algorithm`, `crm_*` fields, `linked_systems`, `active_role_codes`
- Grants para `greenhouse_runtime`, `greenhouse_migrator`, `greenhouse_app`

## Verificacion

1. Migracion aplicada con `pnpm migrate:up` — OK
2. Query directa confirmada:
   ```sql
   SELECT resolved_avatar_url, resolved_job_title, resolved_display_name
   FROM greenhouse_serving.person_360
   WHERE user_id = 'user-efeonce-admin-julio-reyes';
   -- resolved_avatar_url = gs://efeonce-group-greenhouse-public-media-staging/...
   -- resolved_job_title = 'Managing Director & GTM'
   ```
3. 7/8 usuarios internos tienen avatar, todos tienen cargo y member facet
4. `npx tsc --noEmit` — OK (tipos regenerados por `kysely-codegen`)
5. `pnpm lint` — OK (error pre-existente en ico-diagnostics, no relacionado)

## Estado

resolved

## Relacionado

- TASK-256 (Entra Profile Completeness) — la task que implemento avatar sync + identity link. Los datos estaban escritos correctamente, pero la VIEW no los exponia.
- TASK-255 (Mi Perfil identity chain fix) — implemento el fallback a sesion y los tipos `PersonProfileSummary`. El fallback funcionaba, pero el path "feliz" (person_360 con datos enriched) no.
- `scripts/setup-postgres-person-360-v2.sql` — script que contenia la VIEW correcta pero que nunca se habia ejecutado como migracion formal
- `migrations/20260405164846570_person-360-v2-enriched-view.sql` — migracion que aplica la VIEW v2
- `src/lib/person-360/get-person-profile.ts` — consumer principal de `person_360` que esperaba columnas v2
