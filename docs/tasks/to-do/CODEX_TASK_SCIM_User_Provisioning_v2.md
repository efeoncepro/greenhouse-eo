# CODEX TASK -- SCIM User Provisioning v2: Entra ID -> Greenhouse

## Delta 2026-03-22
- Dependencia `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` cerrada — People consumers ahora Postgres-first
- Implicación para SCIM: el bridge `identity_profile_id` ahora es el path primario de lectura en People; nuevos usuarios provisionados por SCIM que creen o reconcilien un `identity_profile` serán visibles inmediatamente en People sin depender de BigQuery sync
- Script `backfill-orphan-member-profiles.ts` disponible como referencia de patrón para reconciliación de auth principals con identity profiles

## Estado

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la intencion funcional del brief original de SCIM, pero reescribe su base tecnica sobre la arquitectura viva del proyecto:
- `Identity & Access V2` como referencia principal
- `PostgreSQL` como target store para provisioning y auth principals
- `identity_profile` como capa canonica de persona cuando aplique
- `BigQuery` solo como compatibilidad temporal o auditoria, no como write path principal

## Resumen

Implementar provisioning automatico de usuarios desde Microsoft Entra ID hacia Greenhouse usando `SCIM 2.0`.

Cuando un usuario entra al scope de provisioning de la Enterprise App:
- Greenhouse crea o reconcilia el auth principal
- enlaza el principal al tenant y contexto operativo correcto
- aplica el estado activo/inactivo de la cuenta
- deja preparado el bridge hacia la identidad canonica cuando corresponda

Greenhouse no delega autorizacion fina a Entra.

Regla central:
- Entra es fuente de verdad para existencia y estado de cuenta
- Greenhouse sigue siendo fuente de verdad para roles, scopes y contexto operativo

## Decision de arquitectura

### Principios

- el principal de acceso vive en `greenhouse_core.client_users`
- nuevos writes de SCIM aterrizan en PostgreSQL
- `client_users` no reemplaza a `identity_profile`; el primero es auth principal, el segundo es persona canonica
- SCIM no debe reintroducir `greenhouse.clients` ni `greenhouse.client_users` en BigQuery como store principal de provisioning
- la reconciliacion con `identity_profile_id` y source links debe contemplarse desde el inicio, aunque el MVP la deje en modo conservador

### Scope funcional del provisioning

SCIM debe cubrir:
- alta
- update basico de atributos
- desactivacion
- reconciliacion/listado para Entra

SCIM no debe decidir:
- escalacion de roles internos
- project scopes manuales complejos
- campaign scopes
- reglas de acceso fuera del contrato de Greenhouse

## Alineacion con Identity & Access V2

Esta implementacion se apoya en:
- `greenhouse_core.client_users`
- `greenhouse_core.roles`
- `greenhouse_core.user_role_assignments`
- tablas de scopes en PostgreSQL cuando apliquen

Regla derivada de `Identity & Access V2`:
- usuarios provisionados por SCIM reciben un baseline de acceso controlado
- la escalacion posterior de roles o scopes queda en manos de Greenhouse

## Fuente de verdad

| Dominio | Fuente de verdad |
| --- | --- |
| existencia de cuenta | Microsoft Entra |
| estado activo/inactivo | Microsoft Entra |
| auth principal | Greenhouse PostgreSQL |
| roles y scopes | Greenhouse PostgreSQL |
| identidad canonica de persona | Greenhouse `identity_profiles` |

## Modelo de datos recomendado

### A1. Auth principal

Tabla objetivo:
- `greenhouse_core.client_users`

Campos relevantes:
- `user_id`
- `client_id`
- `identity_profile_id`
- `email`
- `full_name`
- `microsoft_oid`
- `microsoft_tenant_id`
- `microsoft_email`
- `auth_mode`
- `status`
- `active`

### A2. SCIM mapping

En lugar de depender de una tabla solo en BigQuery, modelar el control plane de SCIM en PostgreSQL.

Tabla sugerida:
- `greenhouse_core.scim_tenant_mappings`

Campos sugeridos:
- `scim_tenant_mapping_id`
- `microsoft_tenant_id`
- `tenant_name`
- `client_id`
- `space_id` nullable
- `default_role_code`
- `allowed_email_domains`
- `auto_provision`
- `active`
- `created_at`
- `updated_at`

Notas:
- `client_id` sigue siendo el home tenant del auth principal
- `space_id` puede complementar el contexto operativo cuando el tenant necesite bajar el provisioning a un boundary mas concreto

### A3. External identity bridge

Si el principal provisionado puede enlazarse a una persona canonica:
- poblar `identity_profile_id` cuando ya exista un match confiable
- o crear source links posteriores via reconciliation

No exigir de entrada que todo provisioning SCIM cree una persona canonica completa si el contexto no es suficiente, pero tampoco ignorar esa capa.

## API surface SCIM

### Endpoints

- `GET /api/scim/v2/ServiceProviderConfig`
- `GET /api/scim/v2/Schemas`
- `GET /api/scim/v2/Users`
- `POST /api/scim/v2/Users`
- `GET /api/scim/v2/Users/[id]`
- `PATCH /api/scim/v2/Users/[id]`
- `DELETE /api/scim/v2/Users/[id]` como soft delete

### Auth

- bearer token dedicado `SCIM_BEARER_TOKEN`
- validacion explicita en helper server-side
- no usar sesion NextAuth
- no usar `middleware.ts` como boundary principal para SCIM

## Provisioning flow

### Create

1. validar bearer token
2. parsear payload SCIM
3. resolver tenant mapping por `microsoft_tenant_id` o dominio permitido
4. verificar si ya existe principal por `microsoft_oid` o email
5. crear o reconciliar `client_user` en PostgreSQL
6. asignar rol baseline en `user_role_assignments`
7. registrar metadata de provisioning
8. retornar recurso SCIM

### Update

1. validar bearer token
2. buscar principal por `user_id` o `scim_id` externo estable
3. aplicar cambios permitidos:
   - `active`
   - `displayName`
   - `givenName`
   - `familyName`
   - `email`
4. no sobreescribir roles/scopes finos salvo politica explicita

### Deactivate

1. soft delete
2. `active = false`
3. `status` consistente con el contrato de auth actual
4. opcionalmente revocar acceso operativo derivado

## Identificador externo estable

La `v2` recomienda guardar un identificador SCIM externo estable sin reemplazar `user_id`.

Campo sugerido:
- `scim_id` en `greenhouse_core.client_users`

Reglas:
- `user_id` sigue siendo la PK y ancla interna
- `scim_id` sirve para conversaciones con el cliente/proveedor SCIM
- `client_id` nunca debe usarse como identificador de usuario

## Reglas de autorizacion

SCIM no debe modelar autorizacion como un solo `role` en la fila del usuario.

Se debe escribir en:
- `client_users`
- `user_role_assignments`
- tablas de scopes solo si existe una politica automatica clara

Regla MVP:
- asignar un rol baseline, por ejemplo `collaborator` para internos o un rol cliente basico cuando el mapping lo indique
- dejar escalaciones y scopes detallados a administracion posterior en Greenhouse

## Compatibilidad con BigQuery

Durante rollout:
- puede existir mirror o compatibilidad temporal con BigQuery
- puede existir logging o auditoria en BQ

Pero la implementacion nueva no debe tratar BigQuery como write path principal de SCIM.

## Seguridad

- bearer token dedicado y rotatable
- soft delete, no hard delete real
- auditoria de operaciones SCIM
- no auto-provisionar solo porque el dominio coincide si el mapping no lo autoriza
- no mezclar provisioning con login interactivo

## Fases recomendadas

### Fase 1

- `ServiceProviderConfig`
- `Schemas`
- helper de auth SCIM
- create/update/deactivate sobre PostgreSQL
- baseline role assignment

### Fase 2

- `scim_tenant_mappings`
- reconciliation mas robusta con `identity_profile_id`
- auditoria y observabilidad

### Fase 3

- soporte mas rico para groups o atributos enterprise
- governance avanzada de scopes

## Criterios de aceptacion

- provisioning write path en PostgreSQL
- `client_users` tratado como auth principal canonico
- no se usa `greenhouse.clients` como principal de login
- no se modela autorizacion con un unico `role` embebido
- existe bridge razonable hacia `identity_profile` cuando aplica
- SCIM puede desactivar cuentas sin depender de mutaciones manuales

## Nota final

La task original de SCIM sigue siendo util como framing de integracion con Entra.

La `v2` es la referencia operativa de implementacion porque alinea SCIM con:
- `Identity & Access V2`
- `Postgres-first`
- `client_users` como auth principal
- `identity_profile` como persona canonica
- el runtime real de Greenhouse a marzo de 2026

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.client_users` (auth principal — ya implementado)
  - `greenhouse_core.roles`, `greenhouse_core.user_role_assignments` (Identity & Access V2 — ya implementado)
  - `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` — bridge a `identity_profile` depende de cobertura de reconciliación
- **Impacta a:**
  - `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1` — nuevos usuarios SCIM deben reconciliarse con `identity_profiles`
  - `CODEX_TASK_Greenhouse_Home_Nexa_v2` — usuarios SCIM deben poder aterrizar en `/home`
- **Archivos owned:**
  - `src/app/api/scim/v2/**` (endpoints SCIM)
  - DDL de `greenhouse_core.scim_tenant_mappings`
  - Helper de auth SCIM (bearer token validation)
