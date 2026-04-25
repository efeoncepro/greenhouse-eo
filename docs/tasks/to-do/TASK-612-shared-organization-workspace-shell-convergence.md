# TASK-612 — Shared Organization Workspace Shell Convergence

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-008`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-611`
- Branch: `task/TASK-612-shared-organization-workspace-shell-convergence`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Extraer la experiencia rica actual de `OrganizationView` hacia un shell compartido y reusable por múltiples entrypoints organization-first. El objetivo es dejar de enriquecer Agency y Finance por separado y mover header, summary, tab shell y action bar a una base común.

## Why This Task Exists

La vista de `Organizaciones` ya es la experiencia más cercana al modelo objetivo, pero hoy está demasiado acoplada al entrypoint de Agency. Eso impide que Finance u otras superficies reutilicen la misma base sin copiar layout, KPIs, tabs y lógica de composición.

Si se intenta converger `Clientes` sin esta extracción previa, el resultado más probable es:

- duplicación del shell
- inconsistencias visuales
- distinta jerarquía de información según ruta
- deuda de mantenimiento en cada enriquecimiento futuro

## Goal

- Extraer un shell organization-centric reusable.
- Separar claramente shell compartido vs contenido por facet.
- Permitir que distintos entrypoints abran el mismo workspace con distinto facet por defecto.
- Preservar la experiencia actual de Agency mientras se introduce la base compartida.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- La vista compartida debe consumir el contrato de proyección definido en `TASK-611`, no reimplementar permisos/tabs inline.
- El shell no puede degradar la experiencia actual de `/agency/organizations/[id]`.
- Los tokens y patrones UI deben reutilizar la base Greenhouse/Vuexy existente; no introducir otro sistema visual paralelo.
- Las métricas deben seguir viniendo del 360/materializaciones existentes; no recalcular inline.

## Normative Docs

- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/tasks/complete/TASK-488-design-tokens-ui-governance-hardening.md`

## Dependencies & Impact

### Depends on

- `TASK-611`
- `src/views/greenhouse/organizations/OrganizationView.tsx`
- `src/views/greenhouse/organizations/OrganizationTabs.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationOverviewTab.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationFinanceTab.tsx`
- `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx`
- `src/app/api/organization/[id]/360/route.ts`

### Blocks / Impacts

- `TASK-613`
- futuros entrypoints organization-first fuera de Agency
- consistencia visual de Organization 360

### Files owned

- `src/views/greenhouse/organizations/OrganizationView.tsx`
- `src/views/greenhouse/organizations/OrganizationTabs.tsx`
- `src/views/greenhouse/organizations/tabs/*`
- `src/components/greenhouse/*` `[verificar para extracción del shell]`
- `src/app/(dashboard)/agency/organizations/[id]/page.tsx`

## Current Repo State

### Already exists

- `OrganizationView` ya consume detalle de organización + `Account 360`.
- La vista ya tiene header, KPIs y tabs cross-domain.
- El detalle de Agency ya es la surface más rica del objeto organización.

### Gap

- el shell está acoplado al módulo Agency
- no existe una separación limpia entre shell compartido y contenido por facet
- no existe soporte explícito para `entrypointContext` o `defaultFacet`
- Finance no puede reutilizar esta base sin copiarla o envolverla con lógica ad hoc

## Scope

### Slice 1 — Shared shell extraction

- Extraer header, summary cards, tab container y action area a un shell reusable de Organization Workspace.
- Definir props/contexto mínimos para:
  - `organizationId`
  - `entrypointContext`
  - `defaultFacet`
  - `visibleFacets`
  - `allowedActions`

### Slice 2 — Facet composition cleanup

- Separar el contenido específico de cada facet del shell general.
- Dejar Agency consumiendo el shell nuevo sin cambio funcional visible no intencional.

### Slice 3 — Route adoption in Agency

- Adaptar `/agency/organizations/[id]` para montar el shell compartido como primer consumer.
- Preservar deep-links, tabs y carga actual.

### Slice 4 — Tests and docs

- Agregar la validación mínima del shell compartido y documentar la convención de reutilización.

## Out of Scope

- Converger todavía `/finance/clients/[id]` al nuevo shell.
- Rehacer el listado de organizaciones.
- Cambiar navegación/sidebar/topology de módulos.

## Detailed Spec

El resultado de esta task debe permitir que otra route haga algo como:

- resolve `organizationId`
- resolve `workspaceProjection`
- render `OrganizationWorkspaceShell`
- elegir `defaultFacet='finance'`

sin duplicar:

- header
- cards resumen
- tabs
- wiring base del 360

## Acceptance Criteria

- [ ] Existe un shell compartido reusable para Organization Workspace.
- [ ] `/agency/organizations/[id]` ya consume ese shell sin pérdida funcional relevante.
- [ ] Los facets/tab contents quedan desacoplados del layout general.
- [ ] El shell acepta contexto de entrypoint y facet por defecto para futuros consumers.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/agency/organizations/[id]`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la documentación funcional/arquitectónica del workspace de organización quedó alineada con el shell compartido

## Follow-ups

- `TASK-613` — adoptar el shell desde Finance Clients
