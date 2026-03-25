# TASK-052 - Person 360 Finance Access Alignment

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `40`
- Domain: `people`
- GitHub Project: `Greenhouse Delivery`

## Summary

Alinear permisos, route groups y tabs de `Person 360` para que los roles naturales de Finance puedan consumir la ficha financiera por persona sin depender de HR u Operations ni abrir acceso innecesario al resto de la ficha.

La proyección `person_finance_360` ya existe; la brecha actual es de acceso y orquestación de surfaces.

## Why This Task Exists

El portal ya expone una ficha financiera por persona:

- `src/app/api/people/[memberId]/finance/route.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/lib/person-360/get-person-finance.ts`

Pero el modelo de permisos no está alineado con ese contrato:

- `canAccessPeopleModule()` no permite roles de Finance
- `getPersonAccess()` habilita la tab `finance` solo para `admin`, `ops` y `hr_payroll`

Eso deja a Finance fuera de una de las superficies donde más sentido tiene consumir contexto financiero por persona.

## Goal

- Permitir a Finance consumir la ficha financiera por persona con un modelo de acceso mínimo y explícito
- Alinear `requirePeopleTenantContext`, `canAccessPeopleModule` y `getPersonAccess` con ese caso de uso
- Evitar sobreotorgar acceso a tabs sensibles no necesarias para Finance
- Formalizar la tab o endpoint financiero de persona como consumer oficial del módulo Finance

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

Reglas obligatorias:

- `Person 360` sigue siendo la ficha humana canónica; no crear una ficha paralela de persona dentro de Finance
- abrir acceso a Finance no implica exponer automáticamente payroll, HR profile, identidad o memberships
- la autorización debe seguir siendo server-side y basada en route groups y roles, no en hiding de tabs solamente

## Dependencies & Impact

### Depends on

- `src/lib/tenant/authorization.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-detail.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `src/app/api/people/[memberId]/hr/route.ts`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

### Impacts to

- `TASK-043 - Person 360 Runtime Consolidation`
- `TASK-050 - Finance Client Canonical Runtime Cutover`
- `TASK-051 - Finance Payroll Bridge Postgres Alignment`
- `People` UI y cualquier surface de investigación financiera por colaborador

### Files owned

- `src/lib/tenant/authorization.ts`
- `src/lib/people/permissions.ts`
- `src/lib/people/get-person-detail.ts`
- `src/app/api/people/[memberId]/finance/route.ts`
- `src/views/greenhouse/people/**`
- `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md`

## Current Repo State

### Ya existe

- `person_finance_360` como proyección canónica de finanzas por persona
- endpoint dedicado `/api/people/[memberId]/finance`
- composición de `financeSummary` dentro de `Person 360`

### Gap actual

- roles de Finance no pueden entrar a `People` ni ver la tab financiera
- el modelo de acceso trata la ficha financiera por persona como si fuera solo concern de HR y Ops
- se obliga a investigar contexto financiero humano fuera de la surface canónica

## Scope

### Slice 1 - Modelo de acceso

- definir qué roles de Finance pueden acceder a `People` y con qué alcance
- alinear `canAccessPeopleModule()` o introducir una variante segura para consumo financiero de persona
- decidir si el acceso será por route group existente o por capability o permiso específico

### Slice 2 - Tabs y endpoints

- permitir la tab `finance` a los roles definidos sin abrir tabs no necesarias
- asegurar que endpoints de persona respeten el nuevo contrato de autorización
- cubrir fallos de autorización coherentes entre UI y API

### Slice 3 - UX mínima y validación

- validar que la ficha muestre a Finance solo el contexto permitido
- revisar empty states o mensajes cuando el perfil no tenga contexto financiero
- agregar tests de permisos y access matrix

## Out of Scope

- rediseñar completa la experiencia de `People`
- abrir a Finance tabs de payroll, HR profile o identidad por defecto
- crear un módulo paralelo `Finance People`
- rehacer el sistema completo de roles del portal

## Acceptance Criteria

- [ ] existe un contrato explícito para que roles de Finance consuman la ficha financiera por persona
- [ ] `People` y `/api/people/[memberId]/finance` respetan ese nuevo contrato de autorización
- [ ] la tab `finance` deja de depender de ser `admin`, `ops` u `hr_payroll` solamente
- [ ] los roles de Finance no reciben acceso accidental a tabs no incluidas en el alcance aprobado
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre access matrix y autorización server-side
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual con un rol financiero validando acceso a `People` y a la tab financiera sin sobreexposición de otras tabs
