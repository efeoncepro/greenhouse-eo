# TASK-225 - Internal Roles, Hierarchies & Approval Ownership Model

## Delta 2026-04-05 — task cerrada

- Todos los acceptance criteria cumplidos:
  - Spec canónica: `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` (474 líneas, 9 secciones)
  - 4 planos separados: Access Role, Reporting Hierarchy, Structural Hierarchy, Operational Responsibility
  - Jerarquía visible de personas definida (§2.5)
  - Naming policy formalizada (§1)
  - Matriz login `rol → routeGroups → vistas` documentada (§1.5)
  - 3 drifts documentados (§1.5: fallback, catálogo duplicados, employee legacy)
  - Referencias cruzadas en ARCHITECTURE_V1, IDENTITY_ACCESS_V2, project_context.md
- Follow-ons spawned: TASK-226, TASK-227, TASK-228, TASK-229
- TASK-227 ya implementado como primer follow-on

## Delta 2026-04-03 — matriz base de vistas por rol al login

- Se documenta en esta task la matriz base `rol -> route groups -> catálogo de vistas` que hoy deriva el runtime al login.
- La baseline actual debe leerse desde:
  - `src/lib/tenant/role-route-mapping.ts`
  - `src/lib/admin/view-access-catalog.ts`
  - `src/lib/admin/get-admin-view-access-governance.ts`
- Regla nueva:
  - la lane debe distinguir entre:
    - contrato base de login por `routeGroups`
    - overrides persistidos por vista
    - fallback hardcoded de gobernanza
- Gap explícito a cerrar:
  - `Superadministrador` debe consolidarse como acceso efectivo a todas las vistas posibles del portal
  - el catálogo cliente tiene duplicados
  - el fallback de gobernanza expande permisos más allá del mapping base para algunos roles

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Completada 2026-04-05`
- Rank: `41`
- Domain: `identity / hr / agency / platform`

## Summary

Formalizar el contrato canónico de roles internos y jerarquías en Greenhouse para separar claramente:

- RBAC y nombres visibles de roles
- jerarquía de supervisoría (`reports_to_member_id`)
- estructura organizacional (`departments`)
- ownership operativo sobre cuentas, spaces y aprobaciones especializadas

La lane no busca reabrir HR ni Agency como backlog paralelo; busca dejar una semántica institucional única para approvals, team visibility y métricas por cuenta.

## Why This Task Exists

Hoy el repo ya tiene foundations válidas, pero distribuidas:

- `greenhouse_core.members.reports_to_member_id` ya resuelve supervisoría directa
- `greenhouse_core.departments.parent_department_id` y `head_member_id` ya resuelven estructura formal
- `client_team_assignments`, `owner_member_id` y roles internos ya modelan ownership operativo parcial

El gap actual no es falta total de modelo, sino falta de una capa canónica que diga cuándo usar cada relación.

Síntomas visibles:

- se intenta leer `departments` como si cubriera approvals, liderazgo operativo y ownership comercial al mismo tiempo
- la taxonomía de roles internos tiene drift entre docs y runtime (`collaborator` vs `employee`, `finance_analyst` vs `finance_manager`)
- la noción de `supervisor` aparece en HR approvals como relación válida, pero no como contrato reusable para otros módulos
- no existe una regla única para responder:
  - quién aprueba un permiso
  - quién ve su equipo
  - quién responde por una cuenta o un space
  - quién puede recibir colas, alerts o métricas operativas

## Goal

- Dejar un contrato canónico de roles internos y nombres visibles amigables.
- Incluir explícitamente un rol visible de `Superadministrador` como el alcance más amplio dentro de Greenhouse.
- Separar formalmente las jerarquías de reporting, estructura y ownership operativo.
- Definir cómo approvals, team visibility y métricas por cuenta deben resolver responsables sin abusar de `departments`.
- Preparar un plan de convergencia para legacy roles y para un registry explícito de responsabilidades operativas por scope.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`

Reglas obligatorias:

- `departments` no debe convertirse en jerarquía universal de aprobaciones, ownership comercial y visibilidad de equipo.
- `supervisor` no debe modelarse como un role code global; debe seguir siendo una relación entre miembros.
- los nombres visibles de roles deben ser amigables, pero los `role_code` deben permanecer estables mientras no exista un plan de migración explícito.
- ownership operativo sobre cliente/space/proyecto debe vivir en relaciones explícitas scoped, no inferirse desde el departamento del colaborador.

## Dependencies & Impact

### Depends on

- `TASK-170` — leave approvals ya formalizó el flujo `supervisor -> HR`
- `TASK-171` — access model hardening y route groups
- `TASK-193` — person ↔ organization synergy activation
- `greenhouse_core.members`
- `greenhouse_core.departments`
- `greenhouse_core.client_team_assignments`

### Impacts to

- `TASK-161` — Agency permissions, onboarding y glossary operativo
- `TASK-028` — expense reports con aprobación `supervisor -> finance`
- `TASK-031` — performance evaluations basadas en `reports_to_member_id`
- `TASK-157` — staffing y team visibility operativa
- futuras surfaces de approvals, inbox, notifications y ownership de cuentas/spaces

### Files owned

- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `src/config/role-codes.ts`
- `src/lib/tenant/role-route-mapping.ts`
- futuros readers/stores de responsabilidades operativas scoped

## Current Repo State

### Ya existe

- `reports_to_member_id` en `greenhouse_core.members`
- `parent_department_id` y `head_member_id` en `greenhouse_core.departments`
- `team_member` memberships como proyección de assignments
- role codes tipados en `src/config/role-codes.ts`
- base válida para approvals:
  - leave: `supervisor -> HR`
  - expense reports: `supervisor -> Finance`

### Gap actual

- no existe una spec canónica que diga cuándo usar cada jerarquía
- los docs y el runtime no están completamente alineados en nombres y alcance de roles
- falta un contrato explícito para ownership operativo de cuenta/space/proyecto
- no hay política institucional para nombres visibles amigables de roles internos

## Current Login View Matrix

### Baseline de runtime al login

La resolución base de acceso al entrar hoy deriva `routeGroups` desde roles con `deriveRouteGroupsFromRoles(...)` y luego proyecta esas superficies contra el catálogo de vistas.

Fuente canónica vigente:

- `src/lib/tenant/role-route-mapping.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/tenant/access.ts`

### Matriz `rol -> route groups -> vistas`

| Nombre visible | `role_code` | `routeGroups` base | Bloques del catálogo visibles al login |
| --- | --- | --- | --- |
| `Superadministrador` | `efeonce_admin` | `internal`, `admin`, `client`, `finance`, `hr`, `employee`, `people`, `my`, `ai_tooling` | `Gestión`, `Administración`, `Portal cliente`, `Finanzas`, `Equipo/HR`, `Personas`, `Mi Ficha`, `IA` |
| `Líder de Cuenta` | `efeonce_account` | `internal` | `Gestión` |
| `Operaciones` | `efeonce_operations` | `internal` | `Gestión` |
| `Nómina` | `hr_payroll` | `internal`, `hr` | `Gestión`, `Equipo/HR` |
| `Gestión HR` | `hr_manager` | `hr` | `Equipo/HR` |
| `Analista de Finanzas` | `finance_analyst` | `finance` | `Finanzas` |
| `Administrador de Finanzas` | `finance_admin` | `finance` | `Finanzas` |
| `Lectura de Personas` | `people_viewer` | `people` | `Personas` |
| `Administrador de Herramientas AI` | `ai_tooling_admin` | `ai_tooling` | `IA` |
| `Colaborador` | `collaborator` | `my` | `Mi Ficha` |
| `Empleado` `legacy` | `employee` | `internal`, `employee` | `Gestión` |
| `Responsable de Finanzas` `legacy` | `finance_manager` | `internal`, `finance` | `Gestión`, `Finanzas` |
| `Cliente Ejecutivo` | `client_executive` | `client` | `Portal cliente` |
| `Cliente Manager` | `client_manager` | `client` | `Portal cliente` |
| `Cliente Specialist` | `client_specialist` | `client` | `Portal cliente` |

### Catálogo por bloque

| Bloque visible | `routeGroup` | Vistas incluidas hoy |
| --- | --- | --- |
| `Gestión` | `internal` | `Agencia`, `Organizaciones`, `Servicios`, `Staff Augmentation`, `Spaces`, `Economía`, `Equipo de agencia`, `Delivery`, `Campañas`, `Operaciones`, `Capacidad` |
| `Administración` | `admin` | `Admin Center`, `Spaces`, `Usuarios`, `Roles y permisos`, `Vistas y acceso`, `Ops Health`, `Cloud & Integrations`, `Email delivery`, `Notificaciones`, `Calendario operativo`, `Equipo admin` |
| `Finanzas` | `finance` | `Resumen financiero`, `Ventas`, `Compras`, `Conciliación`, `Clientes`, `Proveedores`, `Inteligencia financiera`, `Asignaciones de costos`, `Cotizaciones`, `Órdenes de compra`, `HES` |
| `Equipo/HR` | `hr` | `Nómina`, `Permisos`, `Departamentos`, `Asistencia`, `Nómina proyectada` |
| `Personas` | `people` | `Personas` |
| `IA` | `ai_tooling` | `Herramientas IA` |
| `Mi Ficha` | `my` | `Mi Perfil`, `Mi Nómina`, `Mi Greenhouse`, `Mis asignaciones`, `Mi desempeño`, `Mi delivery`, `Mis permisos`, `Mi organización` |
| `Portal cliente` | `client` | `Pulse`, `Proyectos`, `Ciclos`, `Configuración`, `Equipo`, `Analytics`, `Revisiones`, `Novedades`, `Campañas`, `Módulos`, `Notificaciones` |

### Drift actual a corregir

- `Superadministrador` debe tratarse como acceso total efectivo a todas las vistas posibles del portal.
- el fallback hardcoded también permite `people` para `efeonce_operations` y `hr_payroll`.
- el catálogo de vistas cliente tiene duplicados y debe consolidarse antes de usarse como contrato UI definitivo.
- `employee` sigue proyectando `internal`, pero no existe un bloque de catálogo propio para `employee`; hoy queda como rol legacy semánticamente ambiguo.

## Scope

### Slice 1 - Taxonomía de roles internos

- congelar el set canónico de roles internos activos
- declarar roles legacy/deprecated
- definir `role_code` técnico vs `role_name` visible
- alinear naming guidance para UI y docs

### Slice 2 - Modelo de jerarquías

- definir 3 planos explícitos:
  - reporting hierarchy
  - structural hierarchy
  - operational ownership hierarchy
- definir además una jerarquía visible de personas para UI/organigrama:
  - `Superadministrador`
  - `Responsable de Área`
  - `Supervisor`
  - `Colaborador`
- documentar source of truth y casos de uso por cada plano
- prohibir inferencias cruzadas no explícitas

### Slice 3 - Approvals y visibilidad de equipo

- documentar cómo resolver:
  - leave approvals
  - expense approvals
  - direct reports
  - team visibility operativa
  - account/space metrics ownership
- formalizar el principio `supervisor is a relationship, not a role`

### Slice 4 - Blueprint de convergencia runtime

- identificar drift actual:
  - `employee`
  - `finance_manager`
  - duplicados en el catálogo `client`
  - reglas fallback especiales de `people` para `efeonce_operations` y `hr_payroll`
  - route-group overrides
- proponer ruta de convergencia sin renombrados destructivos inmediatos
- recomendar registry scoped de responsabilidades operativas

## Out of Scope

- implementar runtime completo de delegaciones
- migrar inmediatamente todos los `role_code` existentes
- rediseñar completo `Agency Permissions`
- introducir un nuevo módulo UI entero de organigrama o approvals

## Acceptance Criteria

- [ ] existe una spec canónica nueva para roles y jerarquías internas
- [ ] la spec separa explícitamente rol de acceso, supervisoría, estructura y ownership operativo
- [ ] la spec define una jerarquía visible de personas distinta de los `role_code`
- [ ] la spec deja claro que `departments` no es la fuente universal de approvals ni de ownership comercial
- [ ] la spec define nombres visibles recomendados para roles internos y declara legacy codes vigentes
- [ ] la spec deja explícito que el rol visible más amplio de Greenhouse es `Superadministrador`, manteniendo `efeonce_admin` como código técnico actual
- [ ] la task documenta explícitamente la matriz base `rol -> route groups -> vistas` usada hoy al login
- [ ] la task documenta el drift actual entre mapping base, catálogo y fallback de gobernanza
- [ ] `TASK-225` deja slices implementables y dependencias claras para follow-ons
- [ ] `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V2.md` y `project_context.md` referencian la nueva fuente canónica

## Verification

- revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
- `rg -n "reports_to_member_id|head_member_id|finance_manager|employee|collaborator" docs src`
