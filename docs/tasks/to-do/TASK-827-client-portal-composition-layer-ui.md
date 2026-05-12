# TASK-827 — Client Portal Composition Layer: Menú Dinámico + Page Guards + Empty States

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (TASK-824 cerrada 2026-05-12; bloqueada por TASK-825 resolver)`
- Rank: `TBD`
- Domain: `client_portal / ui`
- Blocked by: `TASK-825`
- Branch: `task/TASK-827-client-portal-composition`

## Delta 2026-05-12 — TASK-824 cerrada, parity view_codes responsibility heredada

TASK-824 cerró el sustrato DB. Esta task hereda **responsabilidad explícita** de la parity test live `view_codes[]` TS↔DB:

- `client_portal.modules.view_codes[]` seed declara 16 view_codes (4 existen hoy en `VIEW_REGISTRY`: `cliente.pulse`, `cliente.proyectos`, `cliente.equipo`, `cliente.campanas`; 11 forward-looking: `cliente.creative_hub`, `cliente.reviews`, `cliente.roi_reports`, `cliente.exports`, `cliente.cvr_quarterly`, `cliente.staff_aug`, `cliente.brand_intelligence`, `cliente.csc_pipeline`, `cliente.crm_command`, `cliente.web_delivery`, `cliente.home`).
- Cuando esta task materialice los 11 view_codes faltantes en `src/lib/admin/view-access-catalog.ts` `VIEW_REGISTRY`, debe agregar parity test `src/lib/client-portal/view-codes/parity.{ts,test.ts,live.test.ts}` replicando shape canónico TASK-611 + patrón TASK-824 Slice 2.
- Comparator pattern: el seed `modules.view_codes[]` debe ⊆ del set de viewCode strings del `VIEW_REGISTRY`. Drift detection bloqueante.
- Spec V1.4 §5.5 documenta este contract.

## Summary

Materializa la **single source of truth** del resolver canónico en la UI cliente: menú navegación dinámico (en lugar de hardcoded per business_line), page guards en cada ruta cliente (`requireViewCodeAccess`), empty states honestos cuando módulo no asignado, y mockup builder paso previo. Reemplaza branching por `tenant_type` / `business_line` / `tenant_capabilities` en componentes con consumo del resolver.

## Why This Task Exists

El resolver (TASK-825) sin consumer no agrega valor — los componentes seguirían branchando por business_line legacy. Esta task es donde la abstracción se hace concreta: el menú compone view_codes desde resolver, cada page valida acceso, empty states distinguen "sin datos" de "módulo no asignado". Sin esto, V1.0 no entrega el valor de "módulos on-demand" — el cliente seguiría viendo lo mismo.

## Goal

- Mockup builder iterado y aprobado paso previo
- `<ClientPortalNavigation>` componente que compone menú desde `resolveClientPortalModulesForOrganization`
- Page guards en todas las rutas client-facing (`requireViewCodeAccess`)
- Empty states honestos: "Este módulo no está activado para tu cuenta"
- Reemplazo de branching legacy por consumo del resolver (audit + grep)
- Microcopy via skill `greenhouse-ux-writing` (es-CL)
- Tests visual regression
- Lint rule `greenhouse/no-untokenized-business-line-branching` (warn) que detecta `tenant_type === 'client'` en code paths client-facing

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12 (UI Composition)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `DESIGN.md` (CI gate)
- CLAUDE.md sección "Microcopy / UI copy — regla canónica (TASK-265)"

Reglas obligatorias:

- Skill `greenhouse-mockup-builder` ANTES de implementar real
- Skill `greenhouse-ux` para layout
- Skill `greenhouse-ui-review` ANTES de commit final
- Skill `greenhouse-ux-writing` para todo string visible
- Skill `greenhouse-microinteractions-auditor` para audit
- Tokens-only: CERO hex, CERO border-radius off-scale
- `requireServerSession` + `dynamic = 'force-dynamic'` en pages
- Page guards via `hasViewCodeAccess(orgId, viewCode)` desde resolver
- Empty state: distinguir `loading | empty | not_assigned | degraded | error` (5 estados explícitos, nunca ambiguo)
- Lint rule warn level (TASK-265 pattern) para detectar branching legacy

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12

## Dependencies & Impact

### Depends on

- TASK-825 (resolver + helpers)
- TASK-822 (`src/lib/client-portal/`)
- Microcopy infrastructure `src/lib/copy/` (TASK-265) ✅
- Vuexy primitives ✅
- Skills greenhouse-* ✅

### Blocks / Impacts

- Cierre estructural del valor on-demand de V1.0
- Cohort de clientes activos NO ven cambio de UX (back-compat preservado vía cascade default modules de TASK-828)

### Files owned

- `src/views/greenhouse/client-portal/navigation/ClientPortalNavigation.tsx` (nuevo)
- `src/lib/client-portal/composition/menu-builder.ts` (compose view_codes → nav items)
- `src/lib/client-portal/guards/require-view-code-access.ts`
- `src/lib/copy/dictionaries/es-CL/client-portal.ts` (microcopy nuevo)
- `src/views/greenhouse/client-portal/empty-states/ModuleNotAssignedEmpty.tsx`
- Reemplazo de branching legacy en componentes consumers (audit list)
- `eslint-plugins/greenhouse/rules/no-untokenized-business-line-branching.mjs`
- `tests/visual/client-portal-composition.spec.ts`
- `src/app/(dashboard)/cliente-portal-mockup/page.tsx` (mockup)

## Current Repo State

### Already exists

- Resolver + cache (TASK-825)
- Vuexy primitives, microcopy infra, skills
- Componentes existentes hardcoded por business_line (auditar y refactorear)

### Gap

- Menú cliente es estático per route group
- Pages client-facing NO validan view_codes (validación implícita via routeGroups)
- No hay empty states honestos para módulo no asignado
- Branching legacy en componentes (grep `tenant_type` y `businessLine`)

## Scope

### Slice 1 — Mockup builder + UX validation

- Skill `greenhouse-mockup-builder` para construir `/cliente-portal-mockup` con mock data tipada
- 3 estados del menú: cliente Globe full bundle, cliente Wave standard, cliente con addon enabled
- 1 estado page guard rechazo (módulo no asignado)
- 1 estado empty state honesto
- Iterar con usuario ANTES de implementar real
- Aprobado documentado en commit message: `[mockup-approved-by-user]`

### Slice 2 — Microcopy declarado

- `src/lib/copy/dictionaries/es-CL/client-portal.ts`:
  - Nav labels (mapping view_code → label, fallback)
  - Empty states: `module_not_assigned_title`, `module_not_assigned_body`, `module_not_assigned_cta`
  - Loading: `loading_modules`
  - Errors: `resolver_failed_title`, `resolver_failed_body`
- Skill `greenhouse-ux-writing` valida tono cálido + tuteo

### Slice 3 — Menu builder + Navigation component

- `src/lib/client-portal/composition/menu-builder.ts`:
  - `composeNavItemsFromModules(modules: ResolvedClientPortalModule[]): NavItem[]`
  - Mapping view_code → { label, route, icon, group }
  - Dedup, sort by group + tier
- `<ClientPortalNavigation>` component:
  - Server component
  - Llama `resolveClientPortalModulesForOrganization(session.user.organizationId)`
  - Compose nav items
  - Render Vuexy nav primitives

### Slice 4 — Page guards

- `requireViewCodeAccess(viewCode)` helper que combina `requireClientSession` + `hasViewCodeAccess`
- Aplicar en cada page client-facing:
  - `/proyectos`, `/campanas`, `/sprints`, `/equipo`, `/reviews`, `/updates`, etc.
- Si rejected: redirect to `/home` con query `?denied_module=<module_key>` para que home pueda mostrar empty state contextual

### Slice 5 — Empty states honestos

- `<ModuleNotAssignedEmpty>` component:
  - Recibe `viewCode` como prop
  - Resuelve qué módulo lo provee (lookup catálogo)
  - Renderiza copy cálido + CTA "Solicitar acceso" (V1.1 wire; V1.0 link a `mailto:account_manager`)
- Distinguir 5 estados visualmente: loading skeleton, empty (sin datos), not_assigned (módulo no provisto), degraded (resolver parcial), error (resolver falló)

### Slice 6 — Refactor branching legacy

- Audit grep:
  - `session.user.tenantType === 'client'` en surfaces UI
  - `businessLines.includes(...)` en code paths cliente
  - `tenant_capabilities.serviceModules.includes(...)`
- Reemplazar por `hasModuleAccess(orgId, moduleKey)` o `hasViewCodeAccess(orgId, viewCode)`
- Documentar TODOs si refactor full requiere V1.1

### Slice 7 — Lint rule

- `eslint-plugins/greenhouse/rules/no-untokenized-business-line-branching.mjs` modo `warn`
- Detecta:
  - `session.user.tenantType === 'client'` en `src/app/(dashboard)/**` excepto `_layout.tsx` foundation
  - `businessLines.includes` en components
- Exempt overrides: `// client-portal-allowed: <reason>` adyacente

### Slice 8 — Tests

- Visual regression: 5 estados componentes (mockup approved)
- Smoke E2E con Playwright + agent auth: cliente con bundle reducido NO ve menu items de addons no asignados
- Skill `greenhouse-ui-review` audit
- Skill `greenhouse-microinteractions-auditor` audit

## Out of Scope

- Self-service "Solicitar módulo" flow real (V1.1)
- Real-time updates al cambiar assignments (V1.0 polling on action complete)
- Cliente portal con múltiples organizations (V2)
- Cliente self-admin de users (V1.2)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12 para guidelines composition. Patrón canónico:

```tsx
// src/views/greenhouse/client-portal/navigation/ClientPortalNavigation.tsx
import 'server-only'
import { requireClientSession } from '@/lib/client-portal/api/auth-guard'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal/modules/resolver'
import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'

export async function ClientPortalNavigation() {
  const { organizationId } = await requireClientSession()
  const modules = await resolveClientPortalModulesForOrganization(organizationId)
  const navItems = composeNavItemsFromModules(modules)

  return <NavList items={navItems} />
}
```

```tsx
// Page guard pattern
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

export default async function ProyectosPage() {
  await requireViewCodeAccess('cliente.proyectos')
  return <ProyectosView />
}
```

## Acceptance Criteria

- [ ] Mockup aprobado por usuario antes de implementar real
- [ ] `<ClientPortalNavigation>` compone menú desde resolver (no hardcoded)
- [ ] Cliente Globe full bundle: ve TODOS los nav items del bundle
- [ ] Cliente Wave standard: NO ve nav items Globe
- [ ] Cliente con addon enabled: ve nav item del addon
- [ ] Page guards en mínimo 6 rutas client-facing
- [ ] Page guard rechaza con redirect to `/home?denied_module=...`
- [ ] Empty states distinguen 5 estados explícitos
- [ ] Lint rule `no-untokenized-business-line-branching` registrada en modo warn
- [ ] Audit grep documenta TODOs del refactor restante (si los hay)
- [ ] Microcopy 100% via dictionary; skill `greenhouse-ux-writing` validó
- [ ] Visual regression test pasa (5+ estados)
- [ ] Skill `greenhouse-ui-review` checklist passes
- [ ] Skill `greenhouse-microinteractions-auditor` audit passes
- [ ] E2E Playwright: cliente con bundle limitado NO accede page con view_code no asignado
- [ ] DESIGN.md CI gate `pnpm design:lint` strict verde
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde

## Verification

- `pnpm dev` + open `/cliente-portal-mockup` para iterate
- `pnpm playwright test tests/visual/client-portal-composition.spec.ts`
- `pnpm playwright test tests/e2e/smoke/client-portal-composition.spec.ts --project=chromium` (con `AGENT_AUTH_SECRET`)
- `pnpm design:lint`
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`
- Skills: ux, ui-review, microinteractions-auditor, ux-writing

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings UX + audit refactor pending
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-828 puede tomar
- [ ] Mockup aprobado documentado
- [ ] Visual regression baseline capturado

## Follow-ups

- Self-service "Solicitar módulo" V1.1
- Promover lint rule de `warn` a `error` cuando todos los callsites legacy migren
- Real-time updates V1.1

## Open Questions

- ¿Mobile menu vs desktop tienen mismo comportamiento? Recomendación: sí (single source of truth resolver), responsive del componente.
- ¿Empty state CTA "Solicitar acceso" V1.0 abre mailto o link a Teams del account manager? Recomendación: mailto en V1.0 con `account_manager_email` desde tenant_capabilities; Teams link V1.1 con notification hub.
