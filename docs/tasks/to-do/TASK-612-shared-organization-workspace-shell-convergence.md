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

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` §4.5 (Shell vs facet content contract). Esta task implementa el shell + el `FacetContentRouter` + adopción Agency.

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

- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` ← **spec canónico vinculante**
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md` (TASK-780)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` + `DESIGN.md` (gate CI design-lint)

Reglas obligatorias:

- **Shell owns chrome, domain owns facet content** (§4.5 spec V1). Inviolable. Shell NO renderiza contenido de ningún facet.
- La vista compartida consume `OrganizationWorkspaceProjection` retornado por TASK-611. NO reimplementar permisos/tabs inline.
- **Render-prop o registry** son los dos únicos contratos válidos para inyectar facet content. El registry canónico vive en `FacetContentRouter` con `dynamic()` lazy imports per-facet.
- El shell no puede degradar la experiencia actual de `/agency/organizations/[id]` (verificado por Playwright snapshot pre/post).
- Tokens + patrones UI: base Greenhouse/Vuexy. Pasar `pnpm design:lint` strict (gate CI activo TASK-764).
- Métricas vienen del 360/materializaciones existentes; no recalcular inline.
- **Rollout flag mandatorio**: `organization_workspace_shell_agency` gobierna el cutover V1→V2. NO cambio default sin flag.
- **Degraded mode UI**: cuando `projection.degradedMode=true`, shell muestra mensaje en es-CL tuteo (greenhouse-ux-writing) NO crash, NO blank.

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
- La vista ya tiene header, KPIs y tabs cross-domain (overview, finance, people, delivery).
- El detalle de Agency ya es la surface más rica del objeto organización.
- TASK-611 (blocker) entrega `OrganizationWorkspaceProjection` + `relationship-resolver` + 11 capabilities `organization.*`.
- Patrón `home_rollout_flags` (TASK-780) reusable para gating del cutover.
- Patrón `dynamic()` para lazy imports (Next.js App Router) usado ampliamente en el repo.

### Gap

- El shell está acoplado al módulo Agency.
- No existe separación limpia entre shell compartido y contenido por facet.
- No existe soporte explícito para `entrypointContext`, `defaultFacet`, ni consumo de `OrganizationWorkspaceProjection`.
- Finance no puede reutilizar esta base sin copiarla o envolverla con lógica ad hoc.
- No existe `FacetContentRouter` con registry lazy-loaded por facet.
- No existe rollout flag para gating del cutover V1→V2 en Agency.

## Scope

### Slice 1 — Shared shell extraction (chrome only)

- Crear `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`.
- Shell renderiza ÚNICAMENTE chrome:
  - Header (logo, nombre, status, breadcrumb)
  - KPI strip base (4 KPIs derivados del 360)
  - Tab container (visibleTabs, activeFacet controlled)
  - Action bar (allowedActions filtradas por facet)
  - Drawer skeleton (slot para que el facet content abra detalles)
- API canónica:

  ```tsx
  <OrganizationWorkspaceShell
    organization={organization}
    projection={projection}
    onFacetChange={...}
    activeFacet={...}
  >
    {(activeFacet, ctx) => <FacetContentRouter facet={activeFacet} {...ctx} />}
  </OrganizationWorkspaceShell>
  ```

- Shell consume `projection` directamente — NO hace queries propias de capabilities.
- Manejo de `projection.degradedMode`: render mensaje degradado con copy en es-CL tuteo (vía skill `greenhouse-ux-writing`), NO crash.

### Slice 2 — FacetContentRouter + facet registry

- Crear `src/components/greenhouse/organization-workspace/FacetContentRouter.tsx`.
- Registry de 9 facets con `dynamic()` lazy imports:

  ```ts
  const FACET_REGISTRY: Record<OrganizationFacet, ComponentType<FacetContentProps>> = {
    identity: dynamic(() => import('@/views/greenhouse/organizations/facets/IdentityFacet')),
    finance: dynamic(() => import('@/views/greenhouse/organizations/facets/FinanceFacet')),
    delivery: dynamic(() => import('@/views/greenhouse/organizations/facets/DeliveryFacet')),
    team: dynamic(() => import('@/views/greenhouse/organizations/facets/TeamFacet')),
    crm: dynamic(() => import('@/views/greenhouse/organizations/facets/CrmFacet')),
    services: dynamic(() => import('@/views/greenhouse/organizations/facets/ServicesFacet')),
    staffAug: dynamic(() => import('@/views/greenhouse/organizations/facets/StaffAugFacet')),
    spaces: dynamic(() => import('@/views/greenhouse/organizations/facets/SpacesFacet')),
    economics: dynamic(() => import('@/views/greenhouse/organizations/facets/EconomicsFacet')),
  }
  ```

- Cada facet component recibe `FacetContentProps` con `organizationId`, `entrypointContext`, `relationship`.
- Loading state per-facet via `<Suspense>` boundary canónico Vuexy.

### Slice 3 — Facet content extraction (Agency)

- Mover el contenido actual de `OrganizationOverviewTab.tsx`, `OrganizationFinanceTab.tsx`, `OrganizationPeopleTab.tsx` a los nuevos archivos `facets/<Name>Facet.tsx`.
- Crear los facet components faltantes (delivery, crm, services, staffAug, spaces, economics) con la riqueza ya disponible en el repo (ICO, services, etc.) o stubs honestos con empty state si aún no hay data.
- Cada facet es self-contained: queries propias, drawers propios, mutations propias.

### Slice 4 — Rollout flag platform extension

- Si `feature_rollout_flags` (TASK-780 generalization) ya existe → consumir.
- Si no existe → migration que extiende CHECK constraint de `home_rollout_flags.flag_key` para incluir `'organization_workspace_shell_agency'` y `'organization_workspace_shell_finance'` (preserva backward-compat). Documentar en spec V1 que este es el path interim hasta que `feature_rollout_flags` se materialize.
- Reader canónico `isOrganizationWorkspaceShellEnabledForSubject(subject, scope: 'agency' | 'finance')`.

### Slice 5 — Agency route adoption (gated)

- `/agency/organizations/[id]/page.tsx`:
  - `requireServerSession` + `resolveOrganizationWorkspaceProjection`.
  - Si flag enabled → renderiza `<OrganizationWorkspaceShell>` con `entrypointContext='agency'`.
  - Si flag disabled → renderiza `<OrganizationView>` legacy.
- Preservar deep-links, query params, tab state.
- Suspense boundary correcto para lazy facets.

### Slice 6 — Tests + design-lint + Playwright

- Unit tests del shell (snapshot básico, render condicional por `degradedMode`, paso de props al children render-prop).
- Visual regression Playwright: `tests/e2e/smoke/organization-workspace-agency.spec.ts` con storage state de agente, snapshot del shell montado por persona × facet.
- `pnpm design:lint --strict` debe pasar (gate CI activo).
- 4-pillar score block.

### Slice 7 — Docs + Handoff

- Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con sección "Organization Workspace Shell" (chrome-vs-content contract).
- Doc funcional `docs/documentation/agency/organizaciones-workspace.md`.
- Handoff + changelog + downstream-verified marker en commits.

## Out of Scope

- Converger todavía `/finance/clients/[id]` al nuevo shell.
- Rehacer el listado de organizaciones.
- Cambiar navegación/sidebar/topology de módulos.

## Detailed Spec

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` §4.5 (Shell vs facet content contract).

### Contrato chrome-vs-content (inviolable)

| Owns                       | Renderiza                                                                       |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Shell**                  | Header, breadcrumb, KPI strip base, tab container, action bar, drawer skeleton  |
| **Domain** (facet content) | TODO el resto: queries, drawers internos, mutations, charts, KPIs específicos   |

El shell NO hace queries de dominio. El facet content NO renderiza chrome.

### El resultado debe permitir que otra route haga algo como

```tsx
// /finance/clients/[id]/page.tsx (TASK-613)
const projection = await resolveOrganizationWorkspaceProjection({
  subject, organizationId, entrypointContext: 'finance'
})

return (
  <OrganizationWorkspaceShell organization={org} projection={projection}>
    {(facet, ctx) => <FacetContentRouter facet={facet} {...ctx} />}
  </OrganizationWorkspaceShell>
)
```

sin duplicar header, cards resumen, tabs, ni wiring base del 360.

### Rollout sequence

1. Slice 1-3 mergeados → shell + router + facet extraction listos.
2. Slice 4 → flag `organization_workspace_shell_agency` creado, default disabled.
3. Slice 5 → Agency route adopta shell gated por flag.
4. Internal dogfood: enable per-user (Efeonce admins, 1 día).
5. Tenant rollout: enable per-role staged (`efeonce_admin` → `agency_lead` → `collaborator`, 1 semana).
6. Default global enabled tras soak.
7. V1 retirement (60+ días): borrar legacy `OrganizationView` + tabs anteriores.

## 4-Pillar Score

### Safety

- **Authorization**: shell consume `projection.allowedActions` filtradas. Acciones no autorizadas no se renderizan ni en DOM.
- **Server-only auth**: la `projection` viene de RSC server-side. Cliente recibe sólo facets autorizados.
- **Blast radius**: rollout flag con scope precedence (user > role > tenant > global) permite revert per-user sin redeploy.
- **Verified by**: Playwright smoke con storage state de agente por persona, snapshot pre/post extraction, lint rule `no-inline-facet-visibility-check` (de TASK-611).
- **Residual risk**: visual diff entre legacy `OrganizationView` y shell durante el cutover — mitigado por flag staged.

### Robustness

- **Idempotency**: shell es pure component. Render determinístico dado el mismo `projection`.
- **Atomicity**: facet extraction es refactor mecánico — sin cambios funcionales esperados.
- **Race protection**: rollout flag UNIQUE composite (TASK-780 pattern) bloquea duplicates.
- **Constraint coverage**: CHECK extension del flag_key whitelist (Slice 4); FK chain TASK-611.
- **Bad input**: `projection.degradedMode=true` → mensaje honesto NO crash, NO blank.
- **Verified by**: unit tests del shell con todos los estados de `projection`, FK violation test del flag.

### Resilience

- **Retry policy**: read-only render. Sin retry necesario.
- **Dead letter**: N/A.
- **Reliability signals**: heredados de TASK-611 + `home.rollout.drift` (TASK-780) cubre el flag.
- **Audit trail**: rollout flag mutations auditados via `home_rollout_flags` audit (TASK-780).
- **Recovery**: si shell falla → flag override per-user revert sin redeploy. Lazy-loaded facet falla → `<Suspense>` fallback honesto.
- **Degradación honesta**: cuatro estados explícitos en shell (`loading` / `degraded` / `empty` / `error`).

### Scalability

- **Hot path Big-O**: O(1) render del shell. Lazy-loaded facets no cargan bundle hasta tab change.
- **Bundle size**: facet content bundles separados per `dynamic()` import. Identity facet inicial < 50KB; Finance facet (más rica) carga on-demand.
- **Async paths**: lazy-load facet bundles via Next.js dynamic import + Suspense.
- **Cost at 10x**: shell render es ~constante. Latencia dominada por `projection` (TASK-611) — cacheado TTL 30s.
- **Pagination**: N/A en detalle; lista de organizaciones queda fuera de scope V1.
- **Verified by**: bundle analyzer report pre/post, Lighthouse score en `/agency/organizations/[id]`.

## Acceptance Criteria

- [ ] `OrganizationWorkspaceShell` existe en `src/components/greenhouse/organization-workspace/` con contrato chrome-vs-content explícito.
- [ ] Shell consume `OrganizationWorkspaceProjection` (TASK-611) sin queries propias de capabilities.
- [ ] Shell maneja `degradedMode=true` con mensaje en es-CL tuteo (greenhouse-ux-writing) — NO crash, NO blank.
- [ ] `FacetContentRouter` con registry lazy-loaded de los 9 facets canónicos.
- [ ] Facet content extraído a `src/views/greenhouse/organizations/facets/<Name>Facet.tsx` (uno por facet).
- [ ] Rollout flag `organization_workspace_shell_agency` declarado y consumible.
- [ ] `/agency/organizations/[id]` adopta el shell gated por el flag — sin pérdida funcional verificada por Playwright.
- [ ] Lazy-loading per-facet verificado: bundle inicial NO incluye Finance/Delivery facets hasta tab change.
- [ ] `pnpm design:lint --strict` pasa.
- [ ] 4-pillar score block presente en este task file.
- [ ] `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con sección "Organization Workspace Shell".
- [ ] Doc funcional `docs/documentation/agency/organizaciones-workspace.md` creado o actualizado.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm design:lint --strict`
- Playwright `tests/e2e/smoke/organization-workspace-agency.spec.ts` con storage state agente
- Bundle analyzer report (`ANALYZE=true pnpm build`) — verificar lazy-loading per facet
- Validación manual en `/agency/organizations/[id]` con flag enabled vs disabled (parity check)

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
