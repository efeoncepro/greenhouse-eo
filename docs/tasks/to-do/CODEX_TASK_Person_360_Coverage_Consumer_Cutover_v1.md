# CODEX TASK -- Person 360 Coverage and Consumer Cutover (v1)

## Estado

Follow-up operativo creado el `2026-03-19` despues de cerrar la task fundacional:
- `docs/tasks/complete/CODEX_TASK_Person_360_Profile_Unification_v1.md`

La base ya existe:
- `greenhouse_core.identity_profiles`
- `greenhouse_serving.person_360`
- reconciliacion inicial entre `member`, `client_user` y `crm_contact`

Lo que queda ya no es "crear Person 360", sino cerrar cobertura y consumer cutover.

## Resumen

Completar la adopcion real de `Person 360` en Greenhouse sobre dos frentes:

1. subir cobertura de reconciliacion para que menos personas queden fuera del perfil canonico
2. cortar consumers vivos de `People`, `Users`, `Admin` y otras superficies al backbone `person_360` / `identity_profile_id`

## Scope

### 1. Cobertura de reconciliacion

- reducir `users_without_profile`
- reducir `contacts_without_profile`
- cerrar el caso restante de usuario interno sin relacion laboral explicita
- endurecer bridges `crm_contact -> identity_profile`

### 2. Consumer cutover

- revisar consumers que todavia lean `member`, `client_user` o `crm_contact` como raices separadas
- migrarlos a `identity_profile_id` o a `greenhouse_serving.person_360` cuando corresponda
- evitar payloads nuevos que vuelvan a fragmentar identidad

### 3. Facetas pendientes

- exponer mejor `role_codes` / `route_groups` cuando el runtime de identidad ya los tenga disponibles
- evaluar inclusion estable de `space_ids` / `project_ids` como facetas operativas si el consumer lo necesita

## Fuera de alcance

- rediseñar desde cero `People`
- reabrir `Identity & Access V2`
- auto-provisionar usuarios desde CRM

## Criterios de aceptacion

- baja medible en perfiles incompletos o no reconciliados
- consumers nuevos o migrados usan `identity_profile_id` como raiz
- `person_360` queda explicitamente reconocido como backbone de lectura de persona

---

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.identity_profiles` (ya implementado)
  - `greenhouse_serving.person_360` (ya implementado)
  - `CODEX_TASK_Person_360_Profile_Unification_v1` (completada)
- **Impacta a:**
  - `CODEX_TASK_People_360_Enrichments_v1` — enrichments requieren cobertura alta de `person_360` para ser útiles
  - `CODEX_TASK_Admin_Team_Postgres_Runtime_Migration_v1` — convergencia memberships/assignments depende de identidad resuelta
  - `CODEX_TASK_SCIM_User_Provisioning_v2` — SCIM bridge a `identity_profile` depende de cobertura de reconciliación
- **Archivos owned:**
  - Consumers en `src/lib/people/` que lean de fuentes fragmentadas
  - `greenhouse_serving.person_360` view (extensiones de reconciliación)
  - Queries que resuelven `member`, `client_user`, `crm_contact` como raíces separadas
