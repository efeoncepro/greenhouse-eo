# TASK-195 - Space Identity Consolidation: Organization-First Admin Entry & Space Onboarding

## Delta 2026-04-03

- `TASK-208` agregó señal operativa adicional dentro de `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`:
  - estado `healthy / degraded / broken`
  - findings recientes
  - historial corto del monitor recurrente de data quality
- Implicación:
  - `/admin/tenants/[id]` sigue acumulando governance residual útil para la transición
  - esta task debe considerar explícitamente ese panel de calidad al reubicar ownership hacia surfaces `organization-first` y `space-first`
  - el objetivo no cambia: esa surface legacy no debe seguir siendo el home conceptual del onboarding de Notion

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- GitHub Project: `[pending]`
- GitHub Issue: `[pending]`

## Summary

Formalizar `Space` como la unidad operativa visible de Greenhouse y reorganizar la surface administrativa alrededor de `Organization` como entrypoint principal de cuenta.

Esta task define el cutover conceptual y de surfaces para dejar de usar `/admin/tenants/[id]` como lugar por defecto para onboarding, governance e integraciones nuevas. El onboarding de Notion y la configuración operativa deben partir desde la cuenta (`Organization`) y ejecutarse sobre un `Space` hijo, mientras `Space 360` se trata explícitamente como una vista del objeto `Space`, no como un objeto paralelo.

## Why This Task Exists

El repo ya evolucionó más allá del modelo visible actual, pero la experiencia todavía no lo refleja.

Estado actual verificado:

- `Organization` ya existe como objeto canónico de cuenta
- `Space` ya existe como objeto runtime real en PostgreSQL
- `Space 360` ya existe como surface operativa fuerte
- la integración de Notion ya opera conceptualmente por `space`
- `/admin/tenants/[id]` sigue actuando como ficha legacy `client/tenant-first`

Eso deja varios problemas abiertos:

- el usuario no sabe con claridad dónde onboardear una cuenta nueva
- `tenant`, `client`, `organization` y `space` se usan como si fueran casi lo mismo
- onboarding de Notion, governance y creación de `Space` viven dentro de una vista legacy
- `/admin/tenants/[id]` y `/agency/spaces/[id]` compiten por ser la “ficha real”
- `Space 360` corre el riesgo de leerse como otro objeto en vez de la vista rica del mismo `Space`

La meta de esta task no es solo rediseñar UI. Es alinear arquitectura visible, navegación y ownership de surfaces con el dominio real ya materializado en runtime.

## Goal

- Formalizar `Organization` como entrypoint administrativo principal de la cuenta.
- Formalizar `Space` como child object operativo de la cuenta y boundary principal de onboarding, integraciones y configuración.
- Sacar onboarding de `Space` y Notion fuera de `/admin/tenants/[id]`.
- Declarar que `Space 360` es una vista del objeto `Space`, no una identidad paralela.
- Dejar `/admin/tenants/*` como carril legacy/transicional de compatibilidad y governance residual mientras se migra la arquitectura visible.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/tasks/complete/TASK-142-agency-space-360-view.md`
- `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
- `docs/research/RESEARCH-004-space-identity-consolidation.md`

Reglas obligatorias:

- `Organization` es la cuenta canónica y debe ser la puerta de entrada admin para gestión de cuenta.
- `Space` es el objeto operativo hijo de la cuenta; onboarding, integraciones y readiness deben configurarse sobre `space`.
- `Space 360` es una vista del objeto `Space`, no una segunda entidad.
- Ningún flujo nuevo debe usar `/admin/tenants/[id]` como surface primaria si el trabajo real ocurre a nivel `space`.
- No abrir dos shells maestras nuevas para el mismo objeto.
- No recalcular métricas inline en la nueva surface; seguir consumiendo ICO Engine / marts / serving existentes.

## Dependencies & Impact

### Depends on

- `docs/research/RESEARCH-004-space-identity-consolidation.md`
- `docs/tasks/complete/TASK-142-agency-space-360-view.md`
- `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
- `docs/tasks/complete/TASK-193-person-organization-synergy-activation.md`
- `greenhouse_core.organizations`
- `greenhouse_core.spaces`
- `greenhouse_core.space_notion_sources`
- `greenhouse_sync.integration_registry`

### Impacts to

- `TASK-142` Agency Space 360 View
- `TASK-187` Notion Integration Formalization
- `TASK-188` Native Integrations Layer
- `TASK-181` Finance Clients canonical org-first lane
- `TASK-193` Person ↔ Organization synergy
- `docs/research/RESEARCH-004-space-identity-consolidation.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/tasks/complete/CODEX_TASK_Portal_View_Surface_Consolidation.md`

### Files owned

- `docs/research/RESEARCH-004-space-identity-consolidation.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `src/views/greenhouse/organizations/**`
- `src/views/greenhouse/agency/space-360/**`
- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
- `src/app/(dashboard)/admin/**`
- `src/app/(dashboard)/agency/organizations/**`
- `src/app/api/admin/spaces/**`
- `src/app/api/integrations/notion/**`

## Current Repo State

### Ya existe

- `Organization` como objeto canónico de cuenta
- `Space` como objeto runtime persistido
- `Space 360` como lectura operativa real
- onboarding básico de Notion por `space`
- governance de Notion por `space` con snapshots, drift y readiness
- control plane admin genérico de sync por integración

### Gap actual

- admin sigue siendo `tenant/client-first`
- `/admin/tenants/[id]` concentra demasiadas responsabilidades
- el onboarding nuevo vive dentro de una surface considerada legacy/deprecada
- no existe una surface admin clara `organization -> spaces -> onboarding`
- `Space 360` y admin tenant detail todavía compiten por ownership del objeto visible
- la navegación no explica bien la jerarquía:
  - `Organization` cuenta
  - `Space` objeto operativo
  - `Space 360` vista del objeto

## Scope

### Slice 1 - Formalización arquitectónica y nomenclatura

- Documentar oficialmente:
  - `Organization` como entrypoint admin principal
  - `Space` como child object operativo
  - `Space 360` como vista del mismo objeto
- Actualizar arquitectura y nomenclatura para que `tenant` quede como término técnico/legacy, no como surface principal de producto.
- Dejar decisión explícita sobre qué superficies quedan como legacy y cuáles pasan a ser troncales.

### Slice 2 - Surface admin organization-first

- Diseñar e implementar una surface admin de cuenta basada en `Organization`.
- La ficha de cuenta debe exponer al menos:
  - overview de la cuenta
  - lista de `Spaces`
  - CTAs para crear/configurar spaces
  - lectura de readiness / integración por `space`
- Definir si la ruta canónica nueva vive como:
  - `/admin/accounts`
  - `/admin/accounts/[organizationId]`
  - o equivalente aceptado por nomenclatura final

### Slice 3 - Space onboarding dedicado

- Crear una surface dedicada para onboarding de `Space`.
- El flujo debe cubrir como mínimo:
  - creación del `Space`
  - capacidades/configuración base
  - binding de Notion
  - readiness / governance inicial
- Reutilizar la lógica existente en vez de reimplementarla:
  - `POST /api/admin/spaces`
  - `POST /api/integrations/notion/register`
  - governance por `space`
  - trigger manual de sync de integración

### Slice 4 - Decomposición del admin tenant legacy

- Dejar `/admin/tenants/*` como carril de compatibilidad.
- Sacar de esa surface el ownership principal de onboarding nuevo.
- Reemplazar el patrón actual de “tab Notion como entrypoint” por CTAs/links a la surface correcta.
- Definir qué partes de la vista legacy sobreviven como governance residual y cuáles deben migrarse.

### Slice 5 - Alineación de surfaces `Space` vs `Space 360`

- Definir si el modelo final converge a:
  - una sola ficha principal de `Space` con tabs, o
  - `Space admin` + `Space 360` como vistas hermanas del mismo objeto
- En ambos casos, la task debe dejar explícito que no son dos objetos distintos.
- Ajustar naming, breadcrumbs y affordances para que el usuario entienda:
  - gestiona la cuenta en `Organization`
  - configura el `Space`
  - opera el `Space` en `Space 360`

## Out of Scope

- Reescribir toda la lane de Agency o Finance
- Eliminar físicamente `client` del modelo de datos
- Rehacer toda la integración de Notion desde cero
- Cambiar métricas o cálculos de ICO / Finance inline
- Hacer en esta misma lane una migración total de todos los consumers `clientId -> spaceId`
- Reemplazar `Space 360` por una vista nueva sin justificación arquitectónica

## Acceptance Criteria

- [ ] La arquitectura viva documenta explícitamente que `Organization` es el entrypoint admin principal de cuenta.
- [ ] La arquitectura viva documenta explícitamente que `Space` es el child object operativo de esa cuenta.
- [ ] La documentación y la task dejan explícito que `Space 360` es una vista del objeto `Space`, no una entidad paralela.
- [ ] Existe una propuesta concreta y ejecutable de surface admin organization-first.
- [ ] Existe una propuesta concreta y ejecutable de onboarding dedicado de `Space`.
- [ ] `Notion onboarding` deja de tener como home conceptual `/admin/tenants/[id]`.
- [ ] `/admin/tenants/*` queda tratado como surface legacy/transicional con ownership acotado.
- [ ] La navegación resultante reduce, y no aumenta, la cantidad de vistas maestras para la misma necesidad.
- [ ] La task deja definidos los boundaries entre:
  - cuenta (`Organization`)
  - objeto operativo (`Space`)
  - vista operativa (`Space 360`)

## Verification

- Revisión documental del modelo resultante contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `Greenhouse_Nomenclatura_Portal_v3.md`
- Validación UX/IA:
  - un operador debe poder responder sin ambigüedad dónde onboardear una cuenta o un space nuevo
  - un admin debe poder explicar la diferencia entre `Organization`, `Space` y `Space 360`
- `pnpm lint`
- `pnpm build`

## Open Questions

- ¿La route admin primaria debe llamarse `accounts`, `organizations` o conservar otro naming de transición?
- ¿Qué parte de capabilities sigue siendo `client-first` y cuál debe migrar a `space-first`?
- ¿La surface final de `Space` converge a una sola ficha unificada con tabs o a dos vistas hermanas del mismo objeto?
- ¿Qué data de governance debería vivir a nivel cuenta y cuál estrictamente a nivel `space`?

## Follow-ups

- Crear la surface admin `organization-first`
- Crear la surface dedicada de `space onboarding`
- Reubicar Notion onboarding a esa surface
- Definir el futuro de `/admin/tenants` y sus redirects/aliases
