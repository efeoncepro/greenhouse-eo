# Identity, Access y Admin Center end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Identity / Access / Admin Center
> **Rutas principales:** `/admin/users`, `/admin/roles`, `/admin/views`, `/admin/tenants`, `/admin/identity`, `/admin/identity/drift-reconciliation`, `/admin/scim-tenant-mappings`, `/admin/responsibilities`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`, `docs/architecture/GREENHOUSE_PERMISSION_SETS_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`, `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`

## Para que sirve

Identity y Access gobiernan quien entra, que ve y que puede ejecutar. Admin Center es la superficie para usuarios, roles, views, tenants, permission sets, SCIM y reconciliacion.

Greenhouse separa dos planos:

- **Views:** que superficies puede ver una persona.
- **Entitlements/capabilities:** que acciones o comandos puede ejecutar.

Ver una pantalla no implica poder mutar datos.

## Evidencia revisada

Codigo y rutas:

- APIs `src/app/api/admin/users/**`, `roles`, `views`, `entitlements`, `tenants`, `scim-tenant-mappings`, `identity/reconciliation`, `api/scim/v2/**`.
- Librerias `src/lib/admin/**`, `src/lib/tenant/**`, `src/lib/scim/**`, `src/lib/identity/**`, `src/lib/people/permissions.ts`, `src/lib/capabilities/**`.
- Vistas `/admin/users`, `/admin/roles`, `/admin/views`, `/admin/identity`, `/admin/identity/drift-reconciliation`, `/admin/tenants`.

DB agregada sin PII:

- `client_users`: 84.
- `identity_profiles`: 183; `members`: 176.
- `roles`: 16; `user_role_assignments`: 101.
- `view_registry`: 107; `role_view_assignments`: 553; `view_access_log`: 410.
- `capabilities_registry`: 200; `entitlement_governance_audit_log`: 1120.
- `permission_sets` existe; `user_permission_set_assignments`: 5.
- `scim_tenant_mappings`: 1; `scim_group_memberships`: 12.
- `first_party_app_sessions`: 0 en la muestra actual.

## Mapa funcional

| Capa | Entidades | Que gobierna |
|---|---|---|
| Usuario | `client_users` | Login, estado, email, credenciales, sesiones |
| Identidad/persona | `identity_profiles`, `members`, source links | Persona canonica y relacion con sistemas externos |
| Roles | `roles`, `user_role_assignments` | Paquetes amplios de responsabilidad |
| Views | `view_registry`, `role_view_assignments`, overrides | Superficies visibles |
| Entitlements | `capabilities_registry`, overrides, audit | Acciones/comandos |
| Permission sets | `permission_sets`, assignments | Conjuntos reutilizables de vistas/permisos |
| SCIM/Entra | SCIM mappings/groups/provisioning | Provisioning automatico desde Microsoft Entra |
| Reconciliation | identity proposals/source links | Resolver duplicados/drift de identidad |

## Flujo end-to-end de acceso

1. Una identidad entra por invitacion, login, SCIM o backoffice autorizado.
2. Greenhouse resuelve `client_user`, `identity_profile` y `member` cuando aplica.
3. Roles y assignments determinan defaults.
4. View registry y role assignments determinan navegacion visible.
5. Capabilities/entitlements determinan acciones permitidas.
6. La UI muestra solo rutas autorizadas; APIs revalidan server-side.
7. Drift reconciliation corrige enlaces entre fuentes sin borrar historia.

## Que hace automatico Greenhouse

- Sincroniza/provisiona identidades via SCIM cuando esta configurado.
- Resuelve route groups y portal home.
- Calcula access overview y view governance.
- Registra audit de governance/entitlements.
- Protege mutaciones sensibles como password hash con guardrails.

## Que hace el operador

- Asigna roles y permission sets.
- Revisa tenants y mappings SCIM.
- Resuelve drift de identidad.
- Aplica overrides solo cuando hay motivo.
- Revisa logs/audits antes de ampliar acceso.

## Fronteras importantes

- No dar rol broad para resolver un problema puntual de workflow.
- No confundir `approval_delegate` generico con autoridad real de aprobacion.
- No mutar passwords desde batch/sync.
- No confiar en UI visibility como autorizacion de API.
- No exponer capabilities a apps externas sin binding/gobernanza.

## Preguntas que Nexa debe responder

- Como doy acceso a una vista?
- Que diferencia hay entre rol, view y entitlement?
- Como reviso por que alguien no ve una ruta?
- Como funciona SCIM con Entra?
- Que hago si hay drift de identidad?
- Por que no debo dar admin broad para arreglar un caso?

## Documentacion relacionada

- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `docs/documentation/identity/scim-entra-provisioning.md`
- `docs/documentation/identity/sistema-auth-resiliente.md`
- `docs/documentation/admin-center/sets-de-permisos.md`
- `docs/manual-de-uso/identity/scim-entra-provisioning.md`
- `docs/manual-de-uso/identity/organization-workspace-projection.md`
