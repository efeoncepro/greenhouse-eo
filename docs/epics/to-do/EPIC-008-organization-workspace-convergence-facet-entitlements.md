# EPIC-008 — Organization Workspace Convergence & Facet Entitlements

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-008-organization-workspace-convergence-facet-entitlements`
- GitHub Issue: `—`

## Summary

Coordina la convergencia de `Organizaciones` y `Clientes` hacia una experiencia canónica basada en `organization`, donde las rutas actuales siguen existiendo como entrypoints, pero las facetas visibles y las acciones disponibles pasan a derivarse desde entitlements finos y proyección de workspace. El objetivo es robustecer el modelo actual sin romper Finance ni Agency.

## Why This Epic Exists

Greenhouse ya tiene una base técnica fuerte para un `organization-first runtime`:

- `greenhouse_core.organizations` es la entidad B2B canónica
- `Account Complete 360` ya expone facets federadas (`identity`, `team`, `delivery`, `finance`, `crm`, etc.)
- `account-360/facet-authorization.ts` ya controla visibilidad por facet
- `Finance Clients` ya avanzó en `TASK-181` y `TASK-191` hacia lectura org-first

El problema es que la experiencia del portal sigue dividida entre dos superficies que compiten por representar la misma cuenta:

- `/agency/organizations/[id]` como organization workspace rico
- `/finance/clients/[id]` como detalle financiero separado y más pobre

Eso genera drift en:

- patrones de UI
- enriquecimiento de datos
- ownership de identidad
- semántica de permisos
- costo de mantenimiento

El trabajo ya no cabe bien en una sola task porque mezcla:

- `views` / `authorizedViews` / navegación
- `entitlements` / capabilities / scopes
- read models compartidos
- shell UI reutilizable
- compatibilidad transicional con `clientProfileId`

## Outcome

- `organization` queda formalizada como aggregate canónico de la experiencia cross-domain.
- `Clientes` y `Organizaciones` pasan a ser entrypoints/superficies de acceso a un mismo workspace base, no experiencias rivales.
- Los tabs, KPIs y acciones de una organización pasan a derivarse desde facets + entitlements finos.
- `client_profiles` queda explícitamente como overlay financiero especializado sobre organización.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

## Child Tasks

- `TASK-611` — foundation de entitlements finos + proyección de facets/tabs/acciones del Organization Workspace
- `TASK-612` — extraer y consolidar el shared shell del Organization Workspace para Agency/Finance
- `TASK-613` — converger `/finance/clients/[id]` al mismo Organization Workspace preservando compatibilidad con `clientProfileId`

## Existing Related Work

- `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md`
- `docs/tasks/in-progress/TASK-191-finance-organization-first-downstream-consumers-cutover.md`
- `docs/tasks/in-progress/TASK-274-account-complete-360-federated-serving-layer.md`
- `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md`
- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`
- `src/lib/account-360/account-complete-360.ts`
- `src/lib/account-360/facet-authorization.ts`
- `src/views/greenhouse/organizations/OrganizationView.tsx`
- `src/views/greenhouse/finance/ClientDetailView.tsx`

## Exit Criteria

- [ ] Existe un contrato canónico para derivar facets, tabs y acciones del Organization Workspace desde entitlements finos y no desde hardcodes por módulo.
- [ ] `Agency Organizations` y `Finance Clients` pueden aterrizar en un mismo shell base de organización con distinto facet por defecto.
- [ ] `client_profiles` queda tratado explícitamente como overlay financiero de `organization` en vez de surface competidora.
- [ ] La convergencia preserva compatibilidad transicional con rutas e identificadores existentes mientras se cierran consumers legacy.

## Non-goals

- Eliminar inmediatamente `clientId` o `clientProfileId` del runtime completo de Finance.
- Reescribir en esta misma fase todo el directorio/listado de clientes o proveedores.
- Introducir un cambio masivo de sidebar o startup policy en un solo lote.
- Colapsar `views` dentro de `entitlements`; las views siguen existiendo como surfaces/entrypoints.

## Delta 2026-04-25

Epic creado para convertir una intuición de producto en un programa ejecutable y seguro. La decisión canónica es:

- `organization` como aggregate cross-domain
- `client_profile` como overlay financiero
- `views` como entrypoints
- `entitlements` como owner de facets, tabs y acciones
