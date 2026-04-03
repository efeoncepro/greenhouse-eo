# Greenhouse Internal Roles & Hierarchies V1

## Purpose

Definir el contrato canónico para roles internos y jerarquías en Greenhouse.

Este documento separa explícitamente cuatro conceptos que hoy existen en el repo, pero distribuidos entre HR, Identity, People y Agency:

- roles de acceso
- jerarquía de supervisoría
- jerarquía estructural
- ownership operativo sobre cuentas, spaces y proyectos

Su objetivo no es reemplazar `GREENHOUSE_IDENTITY_ACCESS_V2.md` ni `Greenhouse_HRIS_Architecture_v1.md`, sino cerrar la semántica que faltaba entre ambos.

Usar junto con:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

## Status

- Versión: `V1`
- Fecha: `2026-04-03`
- Origen: `TASK-225`
- Estado: contrato arquitectónico nuevo; describe foundations ya existentes y formaliza la dirección target

## Delta 2026-04-03 — separacion formal de roles y jerarquias

Regla nueva:

- Greenhouse ya no debe leer `departments` como si fuera la jerarquía universal de approvals, ownership de cuentas y liderazgo operativo.

La arquitectura interna se separa en cuatro planos:

1. `Access Role`
2. `Reporting Hierarchy`
3. `Structural Hierarchy`
4. `Operational Responsibility`

## Core Thesis

Greenhouse no necesita una única jerarquía interna; necesita varias relaciones explícitas con source of truth distinto.

La confusión actual aparece cuando se mezclan preguntas distintas:

- "¿qué puede ver esta persona?" → RBAC
- "¿a quién le reporta esta persona?" → supervisoría
- "¿en qué área está esta persona?" → estructura
- "¿de qué cuenta/space/proyecto responde esta persona?" → ownership operativo

Cada una debe responderse con una tabla o relación distinta.

## 1. Plano de Access Role

### Qué resuelve

Qué puede hacer una persona en el portal.

### Source of truth

- `greenhouse_core.roles`
- `greenhouse_core.user_role_assignments`
- `src/config/role-codes.ts`

### Regla

Los roles son composables. No son una jerarquía de personas.

`efeonce_admin` es el único override global permitido a nivel de acceso.
Su nombre visible recomendado en Greenhouse es `Superadministrador`.

### Role codes internos actuales

| `role_code` | Nombre visible recomendado | Uso visible recomendado | Estado |
|-------------|----------------------------|-------------------------|--------|
| `collaborator` | `Colaborador` | Experiencia personal del miembro en Greenhouse | Canónico |
| `efeonce_account` | `Líder de Cuenta` | Responsabilidad comercial y salud de cuentas | Canónico |
| `efeonce_operations` | `Operaciones` | Visibilidad operativa cross-space y cross-tenant | Canónico |
| `people_viewer` | `Lectura de Personas` | Lectura de People, capacidad, assignments y memberships | Canónico |
| `hr_manager` | `Gestión HR` | Gestión HR de personas, estructura y approvals de dominio | Canónico |
| `hr_payroll` | `Nómina` | Gestión de payroll, compensaciones y períodos | Canónico |
| `finance_analyst` | `Analista de Finanzas` | Operación financiera del día a día | Canónico |
| `finance_admin` | `Administrador de Finanzas` | Configuración y operaciones financieras sensibles | Canónico |
| `ai_tooling_admin` | `Administrador de Herramientas AI` | Gobierno de catálogo, licencias y wallets AI | Canónico |
| `efeonce_admin` | `Superadministrador` | Control total de Greenhouse, usuarios, roles, settings y vistas | Canónico |
| `employee` | `Empleado` | Alias técnico legacy del carril self-service interno | Legacy / deprecado |
| `finance_manager` | `Responsable de Finanzas` | Alias técnico legacy del carril finance extendido | Legacy / deprecado |

### Matriz visible recomendada

| Nombre visible | Qué debería entender un usuario | Relación con el sistema |
|----------------|----------------------------------|-------------------------|
| `Superadministrador` | puede hacer prácticamente todo dentro de Greenhouse | override global de acceso |
| `Colaborador` | usa su experiencia personal: perfil, permisos, asistencia, nómina y herramientas | self-service interno |
| `Líder de Cuenta` | responde por clientes y su contexto operativo/comercial | ownership de cuentas |
| `Operaciones` | ve y gestiona la operación transversal de la agencia | oversight operativo |
| `Lectura de Personas` | puede revisar perfiles, memberships, assignments y capacidad | lectura de personas |
| `Gestión HR` | administra personas, estructura y flujos HR | operador de dominio HR |
| `Nómina` | gestiona compensaciones y payroll | operador de dominio payroll |
| `Analista de Finanzas` | opera ingresos, egresos, conciliación y lectura financiera | operador de dominio finance |
| `Administrador de Finanzas` | además de operar, puede tocar configuración y acciones críticas de finanzas | admin de dominio finance |
| `Administrador de Herramientas AI` | gobierna herramientas, licencias y créditos AI | admin de dominio AI |

### Naming policy

- `role_code`:
  - técnico
  - estable
  - `snake_case`
  - no se renombra por preferencia visual
- `role_name` visible:
  - legible por humanos
  - Title Case
  - sin prefijos técnicos como `efeonce_`

Regla adicional:

- el rol visible más amplio de Greenhouse debe presentarse como `Superadministrador`
- su `role_code` técnico sigue siendo `efeonce_admin` mientras no exista una migración explícita

### Regla

Un cambio de copy o de legibilidad no implica renombrar `role_code`.

## 1.5 Login Route Groups & View Catalog

### Propósito

Documentar la baseline actual de "qué ve un usuario al entrar" sin mezclar:

- `role_code`
- `routeGroups` derivados al login
- catálogo de vistas
- fallback hardcoded de gobernanza
- overrides persistidos por vista

### Source of truth actual

- `src/config/role-codes.ts`
- `src/lib/tenant/role-route-mapping.ts`
- `src/lib/tenant/access.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`

### Regla

La experiencia base al login se deriva desde `role_code -> routeGroups -> vistas del catálogo`.

Eso no impide que:

- existan overrides persistidos por vista
- la gobernanza use un fallback más amplio en algunos casos

Pero el contrato base debe partir por esta matriz y no por excepciones implícitas.

### Matriz base `rol -> routeGroups -> bloques de vistas`

| Nombre visible | `role_code` | `routeGroups` base | Bloques visibles base |
|----------------|-------------|--------------------|------------------------|
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

### Catálogo visible actual por bloque

| Bloque visible | `routeGroup` | Vistas |
|----------------|-------------|--------|
| `Gestión` | `internal` | `Agencia`, `Organizaciones`, `Servicios`, `Staff Augmentation`, `Spaces`, `Economía`, `Equipo de agencia`, `Delivery`, `Campañas`, `Operaciones`, `Capacidad` |
| `Administración` | `admin` | `Admin Center`, `Spaces`, `Usuarios`, `Roles y permisos`, `Vistas y acceso`, `Ops Health`, `Cloud & Integrations`, `Email delivery`, `Notificaciones`, `Calendario operativo`, `Equipo admin` |
| `Finanzas` | `finance` | `Resumen financiero`, `Ventas`, `Compras`, `Conciliación`, `Clientes`, `Proveedores`, `Inteligencia financiera`, `Asignaciones de costos`, `Cotizaciones`, `Órdenes de compra`, `HES` |
| `Equipo/HR` | `hr` | `Nómina`, `Permisos`, `Departamentos`, `Asistencia`, `Nómina proyectada` |
| `Personas` | `people` | `Personas` |
| `IA` | `ai_tooling` | `Herramientas IA` |
| `Mi Ficha` | `my` | `Mi Perfil`, `Mi Nómina`, `Mi Greenhouse`, `Mis asignaciones`, `Mi desempeño`, `Mi delivery`, `Mis permisos`, `Mi organización` |
| `Portal cliente` | `client` | `Pulse`, `Proyectos`, `Ciclos`, `Configuración`, `Equipo`, `Analytics`, `Revisiones`, `Novedades`, `Campañas`, `Módulos`, `Notificaciones` |

### Drift actual

#### 1. El fallback hardcoded de gobernanza amplía accesos

Hoy el fallback de gobernanza mantiene reglas adicionales para:

- `people` para `efeonce_operations`
- `people` para `hr_payroll`

Para `efeonce_admin`, el mapping base ya debe considerarse total.

#### 2. El catálogo cliente tiene duplicados

El registry actual repite algunos `view_code` client-facing:

- `cliente.equipo`
- `cliente.revisiones`
- `cliente.analytics`
- `cliente.campanas`
- `cliente.notificaciones`

La arquitectura target debe converger a un catálogo sin duplicados antes de tratarlo como contrato UI definitivo.

#### 3. `employee` sigue existiendo, pero sin bloque propio de vistas

`employee` todavía deriva `internal`, pero no tiene una semántica limpia como familia de vistas. Debe tratarse como legacy hasta converger a `collaborator`.

### Regla target

La arquitectura futura debe converger a:

1. una sola matriz base `role_code -> routeGroups`
2. un catálogo de vistas sin duplicados
3. mantener a `Superadministrador` como acceso total efectivo a todas las vistas posibles del portal
4. overrides persistidos solo como excepción documentada, no como sustituto del contrato base

## 2. Plano de Reporting Hierarchy

### Qué resuelve

Quién supervisa directamente a quién.

### Source of truth

- `greenhouse_core.members.reports_to_member_id`

### Casos de uso

- aprobación de permisos
- aprobación de gastos
- evaluaciones manager/direct report
- vista "mis reportes directos"
- colas de aprobación por supervisor

### Regla

`supervisor` no es un role code global. Es una relación entre miembros.

Si una persona puede aprobar una solicitud por supervisoría, eso ocurre porque:

- el solicitante apunta a ella en `reports_to_member_id`, o
- existe una delegación explícita documentada en un modelo scoped de responsabilidades

No debe existir un rol genérico `supervisor` con semántica global.

### Aprobaciones

Contrato vigente:

- leave:
  - `requester -> supervisor -> HR`
- expense report:
  - `requester -> supervisor -> Finance`

Al momento del submit, el sistema debería congelar el aprobador efectivo como snapshot del workflow, en vez de reevaluarlo en cada render.

## 2.5 Jerarquía visible de personas

### Propósito

Greenhouse puede necesitar una jerarquía visible y simple para UI, organigrama, approvals y lectura humana.

Esa jerarquía visible NO reemplaza:

- `role_code`
- `route_group`
- ownership operativo scoped

Es una capa de lectura humana encima de relaciones ya existentes.

### Jerarquía visible recomendada

| Nivel visible | Qué significa | Cómo se resuelve |
|---------------|---------------|------------------|
| `Superadministrador` | persona con el alcance más amplio de todo Greenhouse | `role_code = efeonce_admin` |
| `Responsable de Área` | persona que lidera formalmente un área/departamento | `departments.head_member_id` |
| `Supervisor` | persona a la que otros miembros reportan directamente | aparece como target de `reports_to_member_id` |
| `Colaborador` | miembro interno sin una responsabilidad jerárquica visible superior en esa lectura | miembro activo interno sin labels superiores aplicables |

### Reglas

- esta jerarquía visible es derivada; no requiere nuevos `role_code`
- una misma persona puede tener más de un label visible al mismo tiempo
- prioridad visual recomendada:
  1. `Superadministrador`
  2. `Responsable de Área`
  3. `Supervisor`
  4. `Colaborador`
- `Líder de Cuenta`, `Operaciones` y roles de dominio no deben forzarse dentro de esta jerarquía humana si el problema a resolver es liderazgo formal o approvals

### Casos de uso

- chips o badges de jerarquía en `People`
- lectura rápida de organigrama
- filtros de approvals
- directorio interno
- configuración de delegaciones futuras

### Anti-regla

No debe asumirse que:

- todo `Responsable de Área` es supervisor directo de todos los miembros del área
- todo `Supervisor` tiene permisos HR
- todo `Líder de Cuenta` es superior jerárquico del equipo asignado

Cada afirmación anterior pertenece a un plano distinto.

## 3. Plano de Structural Hierarchy

### Qué resuelve

Dónde vive una persona dentro de la estructura formal de la empresa.

### Source of truth

- `greenhouse_core.departments.parent_department_id`
- `greenhouse_core.departments.head_member_id`
- `greenhouse_core.members.department_id`

### Casos de uso

- organigrama
- navegación por área
- ownership administrativo del departamento
- taxonomía HR
- goals / policies por departamento

### Regla

`departments` describe estructura formal, no ownership operativo universal.

Por lo tanto:

- el `head_member_id` de un departamento no debe ser el aprobador por defecto de permisos si existe `reports_to_member_id`
- pertenecer al mismo departamento no debe otorgar ownership automático de una cuenta
- `departments` no reemplaza a assignments, account ownership ni route permissions

## 4. Plano de Operational Responsibility

### Qué resuelve

Quién responde por una cuenta, un space, un proyecto o una cola operativa.

### Estado actual

Existe de forma parcial y fragmentada:

- `client_team_assignments`
- `owner_member_id` en objetos operativos
- roles internos como `efeonce_account`
- readers que ya filtran por ownership o por route groups

### Gap actual

No existe todavía un registry canónico único para responsabilidades operativas scoped.

### Casos de uso que debería cubrir

- account lead de una organización cliente
- delivery lead de un space
- owner de un proyecto
- revisor financiero scoped
- delegaciones temporales
- colas operativas por cuenta o por módulo

### Regla

La responsabilidad operativa no debe inferirse desde:

- `department_id`
- `head_member_id`
- `reports_to_member_id`

si el problema real es ownership de cliente/space/proyecto.

### Target recomendado

Converger a un registry scoped, preferentemente en `greenhouse_core`, con una forma equivalente a:

| Campo | Propósito |
|-------|-----------|
| `responsibility_id` | PK |
| `member_id` | miembro responsable |
| `scope_type` | `organization` / `space` / `project` / `department` |
| `scope_id` | entidad responsable |
| `responsibility_type` | `account_lead` / `delivery_lead` / `finance_reviewer` / `approval_delegate` / etc |
| `is_primary` | owner principal |
| `effective_from` / `effective_to` | vigencia |

El nombre físico final puede variar, pero la semántica target no.

## 5. Decision Matrix

| Necesidad | Plano correcto | Source of truth |
|-----------|----------------|-----------------|
| Qué superficies puede ver un usuario | Access Role | `roles` + `user_role_assignments` |
| Quién aprueba un permiso | Reporting Hierarchy | `members.reports_to_member_id` |
| Quién aprueba un gasto | Reporting Hierarchy + Domain reviewer | `members.reports_to_member_id` + rol/registry financiero |
| Quién es jefe de un área | Structural Hierarchy | `departments.head_member_id` |
| Quién aparece en el organigrama | Structural Hierarchy | `departments` + `members.department_id` + `reports_to_member_id` |
| Quién ve sus reportes directos | Reporting Hierarchy | `members.reports_to_member_id` |
| Quién responde por una cuenta | Operational Responsibility | registry scoped / ownership explícito |
| Quién ve métricas de una cuenta | Operational Responsibility + Access Role | ownership scoped + permissions |
| Qué equipo está asignado a un cliente | Assignments + Operational Responsibility | `client_team_assignments` + ownership explícito |

## 6. Guidance for Current Modules

### HR

- leave y expense approvals deben seguir leyendo supervisoría desde `reports_to_member_id`
- HR puede actuar como validador final de dominio
- `departments` no debe reemplazar supervisoría directa

### People

- "Mi equipo" debe poder distinguir:
  - direct reports
  - equipo operativo asignado
- no debe mezclar ambos universos como si fueran la misma relación

### Agency

- account health, delivery metrics y staff visibility deben apoyarse en ownership operativo explícito
- no deben inferirse desde el departamento del colaborador

### Finance

- reviewers o approvers financieros scoped deben modelarse como responsabilidad operativa o rol de dominio, no como jerarquía departamental implícita

## 7. Legacy and Convergence

### Drift actual reconocido

- `employee` sigue vivo en runtime tipado, pero el contrato visible ya privilegia `collaborator`
- `finance_manager` sigue vivo en runtime tipado, pero la taxonomía target distingue `finance_analyst` y `finance_admin`
- `efeonce_admin` debe sostener el mismo alcance en docs, seeds y TypeScript

### Convergencia recomendada

1. congelar `role_code` actuales como contratos técnicos
2. limpiar `role_name` visible primero
3. marcar legacy codes explícitamente
4. alinear seeds, docs y TypeScript
5. recién después decidir si conviene una migración real de `role_code`

## 8. Non-Negotiable Rules

- un role code no reemplaza una relación de supervisoría
- `departments` no reemplaza ownership operativo
- ownership operativo debe ser explícito y scoped
- la UI debe usar nombres visibles amigables; el backend debe preservar códigos técnicos estables
- cualquier nuevo módulo que necesite "manager", "lead", "owner" o "approver" debe declarar qué plano usa antes de implementar

## 9. Follow-ons

- `TASK-225` — formalización de la lane y blueprint de convergencia
- `TASK-161` — permissions y onboarding Agency deben alinearse a esta spec
- `TASK-028` — expense approvals deben consumir esta separación de planos
- `TASK-031` — performance evaluations ya dependen de `reports_to_member_id`
- follow-on futuro recomendado:
  - registry scoped de responsabilidades operativas
