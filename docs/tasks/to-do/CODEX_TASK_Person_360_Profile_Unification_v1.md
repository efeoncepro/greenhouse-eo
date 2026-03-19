# CODEX TASK — Person 360 Profile Unification (v1)

## Resumen

Greenhouse ya tiene piezas reales de identidad, pero sigue mostrando a la misma persona como si fueran objetos distintos en superficies distintas:
- `People`
- `Users`
- `CRM Contact`
- `Member / Collaborator`

Esta task formaliza el siguiente paso:
- dejar `identity_profile` como ancla canónica de persona
- tratar `People` y `Users` como vistas contextuales del mismo `Person 360`
- reconciliar `member`, `client_user` y `crm_contact` como facetas, no como raíces paralelas

## Objetivo

Cerrar la ambigüedad de identidad en el portal para que:
- exista una sola identidad de persona
- cambien las vistas según contexto, no el objeto
- toda superficie exponga el `identity_profile_id`
- las relaciones con `member_id`, `user_id` y `contact_record_id` queden como facetas del mismo perfil

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:
- `identity_profile` es el ancla canónica de persona
- `member` es faceta laboral/interna
- `client_user` es faceta de acceso
- `crm_contact` es faceta comercial
- `People` y `Users` no deben seguir tratándose como identidades distintas

## Problema actual

Hoy la misma persona puede aparecer duplicada o fragmentada porque:
- `People` sigue muy centrado en `team_members`
- `Users` sigue muy centrado en `client_users`
- la reconciliación entre ambas vistas no siempre es explícita en runtime
- `identity_profile` existe en arquitectura y modelo, pero todavía no domina las superficies de producto

## Resultado esperado

### Arquitectura de perfil único

`Person 360` debe servir:
- vista humana/operativa (`People`)
- vista de acceso y permisos (`Users`)
- vista laboral (`HR` / `Payroll`)
- vista comercial/tenant (`CRM Contact` y participación cliente)

### Contrato mínimo de datos

Toda API o view nueva de persona debe exponer:
- `identityProfileId`
- `memberId` cuando exista
- `userId` o `userIds` cuando existan
- `crmContactId` cuando exista
- source links relevantes

### Serving esperado

Objetivo recomendado:
- `greenhouse_serving.person_360`

Campos mínimos sugeridos:
- identidad:
  - `identity_profile_id`
  - `display_name`
  - `avatar_url`
  - emails principales/secundarios
- faceta member:
  - `member_id`
  - `employment_status`
  - `primary_role`
  - `department`
- faceta user:
  - `primary_user_id`
  - `route_groups`
  - `role_codes`
  - `feature_flags`
- faceta CRM:
  - `primary_contact_record_id`
  - `hubspot_contact_id`
  - `client_ids`
- faceta operational:
  - `space_ids`
  - `project_ids`

### Delta 2026-03-15 — auditoría real y primer serving materializado

- Ya existe el primer serving real:
  - `greenhouse_serving.person_360`
- La vista quedó materializada sobre:
  - `greenhouse_core.identity_profiles`
  - `greenhouse_core.members`
  - `greenhouse_core.client_users`
  - `greenhouse_crm.contacts`
- También quedó creado el comando reusable:
  - `pnpm audit:person-360`

Resultado validado en Cloud SQL:
- cobertura base:
  - `members_total = 7`
  - `members_linked = 7`
  - `users_total = 39`
  - `users_linked = 37`
  - `users_with_member = 7`
  - `internal_users_total = 8`
  - `internal_users_with_member = 7`
  - `contacts_total = 63`
  - `contacts_linked_profile = 29`
  - `contacts_linked_user = 29`
  - `profiles_total = 38`
- cobertura por facetas:
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
  - `profiles_without_any_facet = 1`
- gaps principales:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`

Lectura operativa:
- el backbone de `Person 360` ya existe y ya sirve perfiles unificados con facetas
- el mayor gap real no está en `People` ni `Users`, sino en reconciliación de `CRM Contact -> identity_profile`
- el siguiente trabajo crítico no es crear otra vista, sino subir la cobertura de perfil para contactos y cerrar el único usuario interno sin relación laboral explícita

## Fases recomendadas

### Fase 1 — auditoría y reconciliación

- medir cobertura:
  - `client_users` con `identity_profile_id`
  - `members` con `identity_profile_id`
  - `crm_contacts` con `linked_identity_profile_id`
- detectar:
  - personas duplicadas
  - users sin profile
  - members sin profile
  - contactos con match ambiguo

Estado:
- completada parcialmente
- la auditoría base ya existe y puede rerunearse con `pnpm audit:person-360`

### Fase 2 — serving

- crear `person_360`
- dejar `People` y `Users` consumiendo el mismo backbone
- exponer facetas en vez de duplicar payloads incompatibles

Estado:
- `greenhouse_serving.person_360` ya existe como primer serving base
- el contrato runtime ya evolucionó a una versión enriquecida con `EO-ID`, resolved fields y facetas expandidas
- el comando canónico de setup debe ser `pnpm setup:postgres:person-360` apuntando a `setup-postgres-person-360-v2.ts`
- `person_360 v2` ya quedó aplicado en Cloud SQL para alinear el serving con los consumers nuevos de `Admin Users` y `Person 360`
- pendiente:
  - integrar `route_groups` / `role_codes` cuando Identity V2 quede completamente materializado
  - integrar participación operacional (`spaces`, `projects`)
  - cortar consumers de `People` y `Users`

### Fase 3 — UX

- redefinir `People` como vista 360 de persona
- redefinir `Users` como vista de acceso/permisos del mismo perfil
- evitar que el usuario perciba dos entidades distintas

## Archivos y zonas probables

- `src/lib/people/*`
- `src/lib/tenant/identity-store.ts`
- `src/lib/admin/get-admin-user-detail.ts`
- `src/lib/admin/get-admin-team*`
- `src/lib/postgres/*`
- `scripts/backfill-postgres-identity-v2.ts`
- `scripts/sync-source-runtime-projections.ts`
- `docs/architecture/*`

## Fuera de alcance

- cambiar de golpe todo el portal a una sola pantalla nueva
- borrar `People` o `Users`
- provisionar usuarios automáticamente desde CRM sin reglas explícitas
- reemplazar `Identity & Access V2`

## Criterios de aceptación

- queda documentado `Person 360` como objeto canónico
- existe medición real de reconciliación entre `member`, `user` y `crm_contact`
- existe plan de serving unificado
- toda nueva superficie de persona debe usar `identity_profile_id` como raíz
