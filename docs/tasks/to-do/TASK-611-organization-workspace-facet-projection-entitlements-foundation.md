# TASK-611 — Organization Workspace Facet Projection & Fine-Grained Entitlements Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-611-organization-workspace-facet-projection-entitlements-foundation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Crear la foundation canónica para que el Organization Workspace derive facets, tabs y acciones desde entitlements finos en vez de hardcodes por módulo. Esta task no colapsa rutas ni mezcla Agency/Finance todavía; establece el contrato reusable que permite hacerlo de forma segura y escalable.

## Why This Task Exists

Greenhouse ya tiene las piezas importantes, pero todavía no están alineadas:

- `Account 360` ya expone facets cross-domain
- `facet-authorization.ts` ya resuelve una primera política de visibilidad por facet
- el runtime de entitlements ya existe (`TASK-403`, `TASK-404`)
- las views del portal todavía se gobiernan en gran parte con `authorizedViews` y checks broad (`finance.workspace`, `agency.workspace`)

El gap actual es que todavía no existe una capa explícita que responda:

- qué facets de una organización puede ver un usuario
- qué tabs renderizar en cada entrypoint
- qué acciones habilitar por facet
- cómo mapear eso a `views` actuales sin duplicar lógica entre Agency y Finance

Sin esta foundation, cualquier intento de converger `Organizaciones` y `Clientes` termina en:

- tabs hardcodeados por ruta
- checks locales no reutilizables
- experiencias divergentes para la misma organización
- riesgo de abrir facets incorrectas al compartir un shell

## Goal

- Definir capabilities finas para facets del Organization Workspace.
- Crear una capa de proyección que derive tabs, KPIs y acciones desde entitlements + relación con la organización.
- Alinear esa capa con el `Account 360` y con `facet-authorization.ts` en vez de inventar un segundo modelo paralelo.
- Dejar una base reusable por Agency, Finance y futuros entrypoints organization-first.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `organization` sigue siendo la entidad B2B canónica; esta task no debe reintroducir `client_profile` como owner del workspace.
- `views` / `authorizedViews` siguen existiendo como surfaces de UI; no se reemplazan por entitlements, se derivan desde ellos cuando corresponda.
- La autorización fina debe expresarse en `module + capability + action + scope`, no en checks sueltos por pathname o tab.
- La visibilidad final de facets debe respetar tanto entitlements como la relación efectiva del usuario con la organización.
- No abrir un segundo modelo de facets paralelo al `Account 360`; la proyección debe reutilizar sus contracts.

## Normative Docs

- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md`
- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`

## Dependencies & Impact

### Depends on

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/account-360/facet-authorization.ts`
- `src/lib/account-360/account-complete-360.ts`
- `src/types/account-complete-360.ts`
- `src/lib/admin/view-access-catalog.ts`

### Blocks / Impacts

- `TASK-612` shared shell de Organization Workspace
- `TASK-613` convergencia de `/finance/clients/[id]`
- futuros entrypoints organization-first fuera de Agency/Finance
- gobernanza de permisos desde Admin Center para vistas organization-centric

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/account-360/facet-authorization.ts`
- `src/types/account-complete-360.ts`
- `src/lib/admin/view-access-catalog.ts`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `Account 360` ya expone facets como `identity`, `team`, `economics`, `delivery`, `finance`, `crm`, `services` y `staffAug`.
- `facet-authorization.ts` ya implementa una política inicial de visibilidad por rol/relación.
- El runtime de entitlements ya es code-versioned y Admin Center ya gobierna defaults/overrides.
- `authorizedViews` y `routeGroups` siguen siendo surfaces broad del portal.

### Gap

- no existe capability-level modeling específico para facets de organización
- no existe un mapper canónico `entitlements -> workspace facets/tabs/actions`
- Agency y Finance no comparten una proyección común del mismo objeto
- la semántica de visibilidad sigue repartida entre runtime broad, view codes y checks UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability model for organization facets

- Definir capabilities finas por facet del workspace (`organization.identity`, `organization.finance`, `organization.delivery`, `organization.team`, `organization.crm`, etc.) con acciones y scopes claros.
- Reconciliar esas capabilities con el runtime actual de `routeGroups` y `authorizedViews` para no romper acceso existente.
- Registrar el mapeo canónico `view -> facet capabilities` para Agency y Finance.

### Slice 2 — Workspace projection layer

- Crear un helper/shared contract que derive `visibleFacets`, `visibleTabs`, `allowedActions` y `defaultFacet` para una organización dada.
- Hacer que esta proyección combine:
  - entitlements runtime
  - relación efectiva del usuario con la organización
  - policies ya expresadas en `facet-authorization.ts`
- Evitar que la UI tenga que reimplementar reglas de visibilidad por módulo.

### Slice 3 — Admin/access governance alignment

- Extender la gobernanza documental y runtime para que Admin Center pueda explicar el acceso por facet de organización.
- Dejar explícito qué parte vive en:
  - `routeGroups`
  - `authorizedViews`
  - `entitlements`
  - `workspace facet projection`

### Slice 4 — Tests and docs

- Agregar tests unitarios para el resolver de proyección y para combinaciones críticas de access model.
- Actualizar documentación de arquitectura para que la convergencia no dependa de memoria tribal.

## Out of Scope

- Migrar en esta task el layout o shell visual del detalle de organización.
- Converger todavía `/finance/clients/[id]` al workspace compartido.
- Eliminar `authorizedViews` o `routeGroups` del runtime.
- Rediseñar el sidebar completo del portal.

## Detailed Spec

El contrato nuevo debe responder, como mínimo:

- `visibleFacets[]`
- `visibleTabs[]`
- `defaultFacet`
- `allowedActions[]`
- `entrypointContext` (`agency` | `finance` | futuros)

La regla de diseño es:

1. `views` deciden por dónde entras
2. `entitlements` deciden qué puedes ver/hacer
3. la proyección del workspace traduce eso a tabs/facets/acciones
4. el `Account 360` sigue siendo el contrato de datos subyacente

La task debe evaluar si `facet-authorization.ts` se absorbe dentro de la proyección o si sigue como helper reusable consumido por ella, pero no debe dejar dos fuentes paralelas divergentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un catálogo explícito de capabilities finas para facets del Organization Workspace.
- [ ] Existe un resolver compartido que derive facets/tabs/acciones del workspace desde entitlements + relación con la organización.
- [ ] Agency y Finance pueden consumir el mismo contrato de proyección sin reimplementar lógica de visibilidad.
- [ ] La documentación de access model deja explícito qué vive en `views`, qué vive en `entitlements` y qué vive en la proyección del workspace.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` quedo alineada con el contrato final

## Follow-ups

- `TASK-612` — shared shell del Organization Workspace
- `TASK-613` — convergencia de Finance Clients al workspace compartido

## Open Questions

- ¿La familia de capabilities debe vivir bajo `organization.*` o bajo un namespace por módulo con facet overlays? La recomendación inicial es `organization.*` como capa transversal.
