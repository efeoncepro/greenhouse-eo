# TASK-827 — Client Portal Composition Layer: Menú Dinámico + Page Guards + Empty States

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Muy Alto` (era `Alto` pre-adjust 2026-05-13 — sube por Slice 0 parity view_codes + boundary explícito legacy↔resolver + 5-state matrix completo)
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (TASK-824/825 cerradas 2026-05-12; lista para arrancar con ajustes spec 2026-05-13)`
- Rank: `TBD`
- Domain: `client_portal / ui`
- Blocked by: `none` (TASK-825 cerrada 2026-05-12)
- Branch: `task/TASK-827-client-portal-composition`

## Delta 2026-05-13 — Ajustes spec post audit 4-lens (arch-architect + info-architecture + state-design + greenhouse-ux)

Audit canónico con 4 lentes (skill `arch-architect` overlay Greenhouse + `info-architecture` + `state-design` + `greenhouse-ux`) identificó 7 hallazgos que se integran a la spec antes de arrancar:

- **H1 — Doble fuente de verdad de gating sin boundary declarado** [BLOQUEANTE]: hoy coexisten legacy `session.user.authorizedViews[]` + `canSeeView()`/`hasAuthorizedViewCode()` (TASK-136 view_access_catalog) y nuevo resolver TASK-825. TASK-827 declara boundary explícito en §Architecture Alignment: **`isInternalPortalUser=false` consume SOLO resolver; `isInternalPortalUser=true` mantiene legacy `authorizedViews[]`**. Enforced via menu-builder + page guards.
- **H2 — Scope oculto parity 11 view_codes** [SCOPE INFLADO]: spec V1.4 §5.5 declara que TASK-826/827 hereda materialización de los 11 view_codes faltantes en `VIEW_REGISTRY` (hoy 4 de 16 declarados en `modules.view_codes[]` seed). Se promueve a **Slice 0 explícito** con parity test live + CI gate (pattern TASK-611 `capabilities_registry`).
- **H3 — Orden de slices invertido** [PROCESO]: microcopy ANTES de mockup, no después. Pattern canónico TASK-758/863: dictionary declarativo → consumer (mockup o real) lo consume. Slices 1↔2 reordenados.
- **H4 — 5 estados explícitos con anatomía 5-elementos** [STATE-DESIGN]: empty states distinguen `loading | empty (zero-state) | not_assigned | degraded | error`. Cada uno con anatomía declarada (icon + title + description + primary CTA + secondary CTA) + ARIA contract. Detalle nuevo en §13 (5-State Contract).
- **H5 — `/home` como terminator garantizado** [ROBUSTNESS]: spec declara explícitamente que `/home` (o ruta equivalente declarada per tenant) es **siempre accesible para `tenant_type='client'`** independiente de `modules.length`. Page guards de otras rutas redirigen a `/home` (terminator garantizado, no-loop).
- **H6 — Cache TTL contract explícito** [SCALABILITY]: resolver cache TTL 60s in-process per org es **best-effort**. Mutaciones que el cliente debe ver inmediato pasan `bypassCache: true`. NO propagamos invalidación cross-instance en V1.0 (overkill). Documentado en §15 Hard Rules.
- **H7 — Sweep follow-up explícito** [PROCESO]: lint rule `no-untokenized-business-line-branching` nace en `warn` pero requiere TASK derivada V1.1 (`client-portal-legacy-branching-sweep`) que promueva a `error` post sweep + ≥30 días steady. Documentado en §Follow-ups.

Plus 4-pilar score (mandatory) + Hard Rules nuevas + 7 Open Questions explícitas — escalar antes de arrancar Slice 4.

## Delta 2026-05-12 — TASK-825 cerrada, resolver listo para consumo UI

TASK-825 cerró 2026-05-12 con `resolveClientPortalModulesForOrganization` + 3 helpers + endpoint. Cuando esta task arranque:

- **`ClientPortalNavigation` server component** consume `resolveClientPortalModulesForOrganization(session.user.organizationId)` directo (server-only). Compose menú dinámico desde `modules[].viewCodes` flatten. NO branchear por `business_line` / `tenant_capabilities` inline (hard rule spec V1.4 §16).
- **Page guards** en cada ruta cliente usan `hasViewCodeAccess(orgId, 'cliente.creative_hub')` → si false, redirect a `/home` o render empty state honesto.
- **API gates** usan `hasCapabilityViaModule(orgId, 'client_portal.creative_hub.read')` para gates específicos.
- **Cache TTL 60s warm** — múltiples consumers en el mismo render reusan la query DB ⇒ 1 round-trip por page load.
- **Endpoint `GET /api/client-portal/modules` ya shipped** — frontend puede consumirlo desde client components si necesita refresh dinámico (SWR / React Query); pero el path canónico es server component + resolver directo (no roundtrip HTTP innecesario).

## Delta 2026-05-12 — TASK-824 cerrada, parity view_codes responsibility heredada

TASK-824 cerró el sustrato DB. Esta task hereda **responsabilidad explícita** de la parity test live `view_codes[]` TS↔DB (ahora materializada en Slice 0):

- `client_portal.modules.view_codes[]` seed declara 16 view_codes (4 existen hoy en `VIEW_REGISTRY`: `cliente.pulse`, `cliente.proyectos`, `cliente.equipo`, `cliente.campanas`; 11 forward-looking: `cliente.creative_hub`, `cliente.reviews`, `cliente.roi_reports`, `cliente.exports`, `cliente.cvr_quarterly`, `cliente.staff_aug`, `cliente.brand_intelligence`, `cliente.csc_pipeline`, `cliente.crm_command`, `cliente.web_delivery`, `cliente.home`).
- Slice 0 materializa los 11 view_codes faltantes en `src/lib/admin/view-access-catalog.ts` `VIEW_REGISTRY` + parity test `src/lib/client-portal/view-codes/parity.{ts,test.ts,live.test.ts}` replicando shape canónico TASK-611 + patrón TASK-824 Slice 2.
- Comparator pattern: el seed `modules.view_codes[]` debe ⊆ del set de viewCode strings del `VIEW_REGISTRY`. Drift detection bloqueante via CI gate.
- Spec V1.4 §5.5 documenta este contract.

## Summary

Materializa la **single source of truth** del resolver canónico en la UI cliente: menú navegación dinámico (en lugar de hardcoded per business_line), page guards en cada ruta cliente (`requireViewCodeAccess`), empty states honestos cuando módulo no asignado, y mockup builder paso previo. Reemplaza branching por `tenant_type` / `business_line` / `tenant_capabilities` en componentes con consumo del resolver — **solo para clientes**; internos mantienen path legacy `authorizedViews[]`.

## Why This Task Exists

El resolver (TASK-825) sin consumer no agrega valor — los componentes seguirían branchando por business_line legacy. Esta task es donde la abstracción se hace concreta: el menú compone view_codes desde resolver, cada page valida acceso, empty states distinguen "sin datos" de "módulo no asignado" de "loading" de "degraded" de "error". Sin esto, V1.0 no entrega el valor de "módulos on-demand" — el cliente seguiría viendo lo mismo.

## Goal

- Slice 0: parity view_codes seed ⊆ `VIEW_REGISTRY` + CI gate
- Microcopy declarado (dictionary) **antes** de implementar UI
- Mockup builder iterado y aprobado paso previo
- `<ClientPortalNavigation>` server component que compone menú desde `resolveClientPortalModulesForOrganization`
- Boundary explícito legacy `authorizedViews[]` (internos) vs resolver (clientes)
- Page guards canónicos en todas las rutas client-facing (`requireViewCodeAccess`)
- `/home` declarado como terminator garantizado (always accessible para `tenant_type='client'`)
- 5 estados honestos con anatomía 5-elementos: `loading | empty (zero-state) | not_assigned | degraded | error`
- Reemplazo de branching legacy por consumo del resolver (audit + grep + refactor)
- Lint rule `greenhouse/no-untokenized-business-line-branching` (warn)
- TASK derivada V1.1 explícita para sweep + promote rule a `error`
- Reliability signal `client_portal.composition.resolver_failure_rate` (coordinado con TASK-829)
- Tests visual regression + E2E con agent auth (3 perfiles)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12 (UI Composition), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `DESIGN.md` (CI gate)
- CLAUDE.md sección "Microcopy / UI copy — regla canónica (TASK-265)"

### Boundary explícito legacy `authorized_views` vs nuevo resolver (H1)

Hoy coexisten 2 sistemas de gating que TASK-827 reconcilia con un boundary duro:

| Caller | Sistema | Read API |
|---|---|---|
| `isInternalPortalUser === true` (EFEONCE_ADMIN, internal roles) | Legacy TASK-136 | `session.user.authorizedViews[]` + `canSeeView()` / `hasAuthorizedViewCode()` |
| `isInternalPortalUser === false` (CLIENT_EXECUTIVE/MANAGER/SPECIALIST) | Nuevo TASK-825 | `resolveClientPortalModulesForOrganization()` + `hasViewCodeAccess()` |

Reglas duras del boundary:

- **NUNCA** llamar al resolver desde code paths internos. `requireViewCodeAccess` debe hacer `if (isInternalPortalUser) return` antes de invocar el resolver (admin/support legítimo accediendo surface cliente para soporte queda permitido sin asignar módulos).
- **NUNCA** dejar `canSeeView('cliente.*', true)` en `VerticalMenu` para `!isInternalPortalUser`. Para clientes, consumir resolver via prop server-side `clientNavItems`.
- **NUNCA** combinar ambos sistemas en una misma decisión (e.g. "permitido si está en authorizedViews O en resolver"). Boundary atomic — un caller, un sistema.
- Sentry domain `client_portal` para todos los errores del nuevo path; legacy mantiene su domain actual.

### Reglas obligatorias

- Skill `greenhouse-mockup-builder` ANTES de implementar real
- Skill `greenhouse-ux` para layout
- Skill `greenhouse-ui-review` ANTES de commit final
- Skill `greenhouse-ux-writing` para todo string visible — **invocar en Slice 1 antes de Slice 2 mockup**
- Skill `greenhouse-microinteractions-auditor` para audit
- Tokens-only: CERO hex, CERO border-radius off-scale
- `requireServerSession` + `dynamic = 'force-dynamic'` en pages
- Page guards via `hasViewCodeAccess(orgId, viewCode)` desde resolver
- Empty state: distinguir 5 estados explícitos (`loading | empty | not_assigned | degraded | error`) con anatomía 5-elementos
- Lint rule warn level (TASK-265 pattern) para detectar branching legacy + sweep follow-up

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §12, §16
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- CLAUDE.md sección microcopy + reliability signals

## Dependencies & Impact

### Depends on

- TASK-825 (resolver + helpers) ✅
- TASK-822 (`src/lib/client-portal/`) ✅
- TASK-824 (DDL + seed 10 modules + 16 view_codes declarados) ✅
- Microcopy infrastructure `src/lib/copy/` (TASK-265) ✅
- Vuexy primitives ✅
- Skills greenhouse-* ✅

### Blocks / Impacts

- Cierre estructural del valor on-demand de V1.0
- Cohort de clientes activos NO ven cambio de UX (back-compat preservado vía cascade default modules de TASK-828)
- TASK-829 reliability signals (signal `resolver_failure_rate` coordinado acá)
- TASK derivada V1.1 sweep + lint-promote-to-error

### Files owned

- `src/lib/client-portal/view-codes/parity.{ts,test.ts,live.test.ts}` (Slice 0 — NUEVO)
- `src/lib/admin/view-access-catalog.ts` (extender con 11 entries faltantes — Slice 0)
- `src/lib/copy/dictionaries/es-CL/client-portal.ts` (microcopy nuevo — Slice 1)
- `src/app/(dashboard)/cliente-portal-mockup/page.tsx` (mockup — Slice 2)
- `src/lib/client-portal/composition/menu-builder.ts` (compose view_codes → nav items — Slice 3)
- `src/views/greenhouse/client-portal/navigation/ClientPortalNavigation.tsx` (server component — Slice 3)
- `src/lib/client-portal/guards/require-view-code-access.ts` (Slice 4)
- `src/lib/client-portal/composition/view-code-public-slug.ts` (mapping `module_key` → user-facing slug — Slice 4)
- `src/views/greenhouse/client-portal/empty-states/ModuleNotAssignedEmpty.tsx` (Slice 5)
- `src/views/greenhouse/client-portal/empty-states/ClientPortalZeroStateEmpty.tsx` (Slice 5)
- `src/views/greenhouse/client-portal/empty-states/ClientPortalDegradedBanner.tsx` (Slice 5)
- `src/components/layout/vertical/VerticalMenu.tsx` (refactor cliente section — Slice 6)
- Reemplazo de branching legacy en componentes consumers (audit list — Slice 6)
- `eslint-plugins/greenhouse/rules/no-untokenized-business-line-branching.mjs` (Slice 7)
- `src/lib/reliability/queries/client-portal-resolver-failure-rate.ts` (Slice 8 — coordinado TASK-829)
- `tests/visual/client-portal-composition.spec.ts` (Slice 8)
- `tests/e2e/smoke/client-portal-composition.spec.ts` (Slice 8)

## Current Repo State

### Already exists

- Resolver + cache + helpers `hasModuleAccess/hasViewCodeAccess/hasCapabilityViaModule` (TASK-825) ✅
- Schema `greenhouse_client_portal.modules` + `module_assignments` + seed 10 modules (TASK-824) ✅
- Vuexy primitives, microcopy infra, skills ✅
- `src/lib/client-portal/` BFF foundation (TASK-822) ✅
- Componentes existentes hardcoded por business_line (auditar y refactorear)

### Gap

- 11 view_codes declarados en `modules.view_codes[]` seed NO existen en `VIEW_REGISTRY` (drift latente)
- Menú cliente es estático per route group con `canSeeView('cliente.*', true)` desde `authorizedViews[]`
- Pages client-facing validan via `hasAuthorizedViewCode` (legacy) — NO via resolver
- No hay empty states honestos para módulo no asignado, zero-state, degraded ni error
- Branching legacy en componentes (grep `tenant_type`, `businessLines`, `serviceModules`)
- Reliability signal del resolver path NO existe
- Slug mapping `module_key` → user-facing NO existe (leak de internal keys via query param)
- `/home` para clientes NO está declarada como terminator garantizado

## Scope

### Slice 0 — Parity view_codes seed ⊆ VIEW_REGISTRY [NUEVO]

- Extender `src/lib/admin/view-access-catalog.ts` `VIEW_REGISTRY` con 11 entries faltantes + `cliente.home` (con label, description, route_group `cliente`, route mapping)
- Decidir qué pages reales mapean a cada viewCode forward-looking:
  - `cliente.creative_hub` → `/creative-hub` (placeholder route si no existe)
  - `cliente.reviews` → `/reviews` (ya existe)
  - `cliente.roi_reports` → `/roi-reports` (placeholder)
  - `cliente.exports` → `/exports` (placeholder)
  - `cliente.cvr_quarterly` → `/cvr-quarterly` (placeholder)
  - `cliente.staff_aug` → `/staff-augmentation` (placeholder)
  - `cliente.brand_intelligence` → `/brand-intelligence` (placeholder)
  - `cliente.csc_pipeline` → `/csc-pipeline` (placeholder)
  - `cliente.crm_command` → `/crm-command` (placeholder)
  - `cliente.web_delivery` → `/web-delivery` (placeholder)
  - `cliente.home` → `/home` (terminator garantizado)
- Helper `assertViewCodesParity(seedViewCodes: string[], registryViewCodes: string[]): {missing: string[], orphan: string[]}` en `src/lib/client-portal/view-codes/parity.ts`
- Test `src/lib/client-portal/view-codes/parity.test.ts` con fixtures sintéticos
- Test live `src/lib/client-portal/view-codes/parity.live.test.ts` con `describe.skipIf(!hasPgConfig)` (pattern TASK-611 `capabilities_registry`)
- CI gate: agregar a `.github/workflows/ci.yml` step `pnpm test src/lib/client-portal/view-codes/parity`
- Decisión documentada: pages placeholder se crean en TASK-derivada (no acá) — solo declarar el viewCode + route en registry para que parity pase. Page guards en Slice 4 manejan `/home` redirect cuando page no existe aún.

### Slice 1 — Microcopy declarado [reordenado: ANTES de mockup]

`src/lib/copy/dictionaries/es-CL/client-portal.ts`:

```ts
export const GH_CLIENT_PORTAL_COMPOSITION = {
  emptyState: {
    notAssigned: {
      title: (moduleName: string) => `${moduleName} aún no está activo en tu cuenta`,
      body: (moduleName: string, bundleHint: string) =>
        `${moduleName} ${bundleHint}. Si te interesa, escribinos y te contamos.`,
      primaryCta: 'Solicitar acceso',
      secondaryCta: 'Volver al inicio',
      icon: 'tabler-lock'
    },
    zeroState: {
      title: 'Bienvenido a Greenhouse',
      body: 'Tu cuenta está activada. Tu account manager está configurando tus accesos. Te avisaremos por email cuando esté listo.',
      primaryCta: 'Hablar con mi account manager',
      icon: 'tabler-seedling'
    }
  },
  loading: {
    ariaLabel: 'Cargando tu portal'
  },
  degraded: {
    banner: 'Algunos módulos no están disponibles temporalmente. Estamos trabajando en ello.',
    retryCta: 'Volver a intentar'
  },
  error: {
    toast: 'No pudimos cargar tu portal. Volvé a intentar en unos segundos.',
    fallbackTitle: 'No pudimos cargar todo',
    fallbackBody: 'Llevanos al inicio mientras lo resolvemos.',
    fallbackCta: 'Ir al inicio'
  },
  modulePublicLabels: {
    // mapping module_key → user-facing comercial name + bundle hint
    'creative_hub_globe_v1': {
      name: 'Creative Hub',
      bundleHint: 'se incluye en planes Globe'
    },
    'brand_intelligence_globe': {
      name: 'Brand Intelligence',
      bundleHint: 'se incluye en planes Globe Enterprise'
    }
    // ... resto de modules
  }
}
```

- Skill `greenhouse-ux-writing` valida tono cálido + tuteo es-CL + alineación con `greenhouse-nomenclature.ts` ANTES de Slice 2
- Sin overlap con `GH_CLIENT_NAV` existente (que es nav labels operacionales)
- Public labels NUNCA leak `module_key` técnico (slug mapping)

### Slice 2 — Mockup builder [reordenado: DESPUÉS de microcopy]

- Ruta `/cliente-portal-mockup` (server component que NO toca PG)
- Skill `greenhouse-mockup-builder` invocado obligatoriamente
- 5 fixtures hardcoded como mock data tipada (`ResolvedClientPortalModule[]` desde DTO TASK-825):
  - **Fixture A**: Cliente Globe full bundle (5 modules: pulse, proyectos, equipo, campanas, creative_hub)
  - **Fixture B**: Cliente Wave standard (2 modules: pulse, proyectos)
  - **Fixture C**: Cliente Globe + addon `brand_intelligence` enabled
  - **Fixture D**: Cliente recién onboarded (zero assignments, lifecycle_stage='active_client')
  - **Fixture E**: Resolver degraded (3 modules OK, 2 con resolver fail simulado)
- Mockup consume `GH_CLIENT_PORTAL_COMPOSITION` dictionary — CERO strings hardcoded
- Iterar con usuario ANTES de implementar real
- Aprobado documentado en commit message: `[mockup-approved-by-user]`

### Slice 3 — Menu builder + Navigation component

**Menu builder canónico**:

```ts
// src/lib/client-portal/composition/menu-builder.ts
import 'server-only'

export interface ClientNavItem {
  readonly viewCode: string
  readonly label: string                              // displayLabelClient (cálido), NO displayLabel operator
  readonly route: string                              // mapping viewCode → route desde VIEW_REGISTRY
  readonly icon: string                               // tabler-*
  readonly group: 'primary' | 'capabilities' | 'account'
  readonly tier: 'standard' | 'addon' | 'pilot'
}

export const composeNavItemsFromModules = (
  modules: readonly ResolvedClientPortalModule[]
): readonly ClientNavItem[] => {
  // 1. Flatten modules → viewCodes (un viewCode puede aparecer en N modules: pilot + standard concurrent)
  // 2. Dedup por viewCode. Ganador por tier: standard > addon > pilot
  // 3. Lookup en VIEW_REGISTRY para label/route/icon/group
  // 4. Filter: ocultar viewCodes que NO existen en VIEW_REGISTRY (defensive — emit reliability signal en parity)
  // 5. Sort canonical: group order ('primary', 'capabilities', 'account') > tier > displayLabelClient alfabético
}
```

Pure function, server-only, testeable sin DB. Tests anti-regresión con fixtures.

**`<ClientPortalNavigation>` server component**:

```tsx
// src/views/greenhouse/client-portal/navigation/ClientPortalNavigation.tsx
import 'server-only'
import { requireClientSession } from '@/lib/client-portal/api/auth-guard'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal'
import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'

export async function ClientPortalNavigation() {
  const { organizationId } = await requireClientSession()
  const modules = await resolveClientPortalModulesForOrganization(organizationId)
  const navItems = composeNavItemsFromModules(modules)

  return <NavList items={navItems} />
}
```

Server component renderea; Client component (`NavList`) solo recibe props. NUNCA llamar el resolver desde un Client Component.

### Slice 4 — Page guards canónicos

**`requireViewCodeAccess` helper**:

```ts
// src/lib/client-portal/guards/require-view-code-access.ts
import 'server-only'
import { redirect } from 'next/navigation'
import { hasViewCodeAccess } from '@/lib/client-portal'
import { captureWithDomain } from '@/lib/observability/capture'
import { mapViewCodeToPublicSlug } from '../composition/view-code-public-slug'

export const requireViewCodeAccess = async (viewCode: string): Promise<void> => {
  const session = await requireServerSession()

  // Boundary explícito (H1): internos bypass resolver
  if (session.user.isInternalPortalUser) return

  const organizationId = session.user.organizationId
  if (!organizationId) redirect('/home')

  try {
    const allowed = await hasViewCodeAccess(organizationId, viewCode)
    if (!allowed) {
      const slug = mapViewCodeToPublicSlug(viewCode)
      redirect(`/home?denied=${slug}`)
    }
  } catch (err) {
    captureWithDomain(err, 'client_portal', {
      tags: { source: 'page_guard', viewCode },
      extra: { organizationId }
    })
    redirect(`/home?error=resolver_unavailable`)
  }
}
```

**Aplicar en mínimo 6 pages client-facing**:
- `/proyectos` (cliente.proyectos)
- `/sprints` (cliente.ciclos)
- `/equipo` (cliente.equipo)
- `/campanas` (cliente.campanas)
- `/reviews` (cliente.revisiones)
- `/analytics` (cliente.analytics)
- Plus: `/updates`, `/notifications`, `/settings` con sus viewCodes

**`/home` declarado como terminator garantizado (H5)**:
- `/home` es **siempre accesible para `tenant_type='client'`** independiente de `modules.length`
- Si `modules.length === 0`, `/home` renderea `<ClientPortalZeroStateEmpty>` honesto
- Si `?denied=<slug>` en query, `/home` renderea banner + `<ModuleNotAssignedEmpty>` contextual
- Si `?error=resolver_unavailable` en query, `/home` renderea `<ClientPortalDegradedBanner>` + nav reducido o solo identidad

**Slug mapping (NUNCA leak `module_key` técnico)**:

```ts
// src/lib/client-portal/composition/view-code-public-slug.ts
// Mapping viewCode → user-facing slug. Server-only, pure.
// Ej: 'cliente.brand_intelligence' → 'brand-intelligence'
//     'cliente.creative_hub' → 'creative-hub'
```

### Slice 5 — Empty states honestos con anatomía 5-elementos

Ver §13 (5-State Contract) para tabla canónica + anatomía + ARIA.

3 components canónicos a crear:

- `<ModuleNotAssignedEmpty>` — para state `not_assigned`. Recibe `viewCode` como prop; resuelve nombre comercial + bundle hint via `GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels`. CTA primary `mailto:account_manager` con subject prefilled; secondary "Volver al inicio"
- `<ClientPortalZeroStateEmpty>` — para state `empty (zero-state)`. Cliente válido sin assignments
- `<ClientPortalDegradedBanner>` — para state `degraded`. Banner sticky-top con retry CTA

Tokens canónicos Greenhouse-ux:
- Card outlined `elevation={0}`, `border: '1px solid divider'`, `borderRadius: customBorderRadius.md` (6)
- Padding `spacing(8)` outer; Stack `spacing(3)` interno
- Icon: `CustomAvatar variant='rounded' skin='light' color='warning' size={52}`
- Title: `Typography variant='h5'` (18px/500)
- Description: `Typography variant='body1' color='text.secondary'`
- Primary CTA: `Button variant='contained' color='primary'` + icon `tabler-mail-forward`
- Secondary CTA: `Button variant='tonal'` + icon `tabler-arrow-back`
- Mobile: stack vertical, CTAs full-width
- ARIA: `role='status' aria-live='polite'` en container; `aria-label` en buttons

### Slice 6 — Refactor branching legacy

**Audit grep canónico** (ejecutar y documentar):

```bash
rg "tenantType === 'client'" src/views src/components --type tsx
rg "businessLines\.includes" src/views src/components --type tsx
rg "tenant_capabilities\." src/views src/components --type tsx
rg "session\.user\.businessLines" src/views src/components --type tsx
rg "session\.user\.serviceModules" src/views src/components --type tsx
rg "canSeeView\('cliente\." src/components/layout --type tsx
```

**Refactor priorizado**:
- `src/components/layout/vertical/VerticalMenu.tsx` líneas 612-622: filter `canSeeView('cliente.*', true)` legacy → reemplazar por `clientNavItems` prop server-side via `ClientPortalNavigation`
- `src/components/layout/vertical/VerticalMenu.tsx` líneas 109-112 (`capabilityModules` desde `resolveCapabilityModules`): **DECISIÓN explícita** — migrar al resolver en TASK-827 (si Q2 confirma scope), O documentar TODO con TASK-derivada V1.1
- Surface client-side que necesite info compositiva → ConsumeServerProps pattern (props pasados desde server component)

**NO refactorear en TASK-827** (out of scope V1.0):
- `isInternalPortalUser=true` paths legacy authorizedViews — quedan intactos
- Admin/operator surfaces que validan via `tenant_capabilities` (boundary distinto, no es cliente-facing)

### Slice 7 — Lint rule warn + sweep follow-up

`eslint-plugins/greenhouse/rules/no-untokenized-business-line-branching.mjs` modo `warn`. Detecta:

- `session.user.tenantType === 'client'` en `src/views/**`, `src/components/**` (excepto `_layout.tsx` foundation)
- `businessLines.includes(...)` en cualquier path no exempted
- `tenant_capabilities.serviceModules.includes(...)`
- `session.user.businessLines` access en client-facing surfaces

**Override block** en `eslint.config.mjs` exime:
- `src/lib/auth/**` (legítimamente necesita tenant_type para session routing)
- `src/app/api/auth/**`
- `src/app/_layout.tsx` foundation
- `tests/**`
- Casos puntuales con comentario `// client-portal-allowed: <reason>` adyacente

**Sweep follow-up explícito** (NUEVO):
- TASK derivada `client-portal-legacy-branching-sweep` V1.1 registrada en §Follow-ups
- Trigger: zero drift en producción ≥30 días post TASK-829 cierre
- Promueve lint rule a `error`
- Sin esto, warn queda permanente → noise creep

### Slice 8 — Tests + reliability signal coordinado

**Reliability signal nuevo (coordinado con TASK-829)**:
- `client_portal.composition.resolver_failure_rate` (kind=drift, severity=error si > 1% req/5min, steady=0)
- Subsystem rollup `Client Portal Health`
- Reader: `src/lib/reliability/queries/client-portal-resolver-failure-rate.ts`
- Pattern fuente: cualquier rate-based signal del registry

**Visual regression**:
- 5 fixtures × 5 estados = 25 snapshots Playwright (mockup approved)
- Tokens canónicos validados (`borderRadius`, `spacing`, typography variants, colors)

**E2E Playwright + agent auth**:
- 3 perfiles de usuario reales (Globe full, Wave standard, addon enabled)
- 6 rutas client-facing accedidas por cada perfil
- Assertions: menu items matchean fixture; page guards redirigen cuando deben; empty states aparecen con copy correcto
- Setup: `AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs`

**Tests anti-regresión adicionales**:
- Snapshot menu builder pure function con fixtures (`composeNavItemsFromModules`)
- Test parity `view-codes/parity.live.test.ts` heredado de Slice 0
- Test slug mapping `mapViewCodeToPublicSlug` (cobertura 100%)

**Skills audit**:
- `greenhouse-ui-review` checklist passes
- `greenhouse-microinteractions-auditor` audit passes
- `greenhouse-ux-writing` valida copy final

## Out of Scope

- Self-service "Solicitar módulo" flow real (V1.1)
- Real-time updates al cambiar assignments (V1.0 polling on action complete; TTL 60s acceptable)
- Cliente portal con múltiples organizations (V2)
- Cliente self-admin de users (V1.2)
- Migración del legacy `authorizedViews[]` para internos (V2 — separate task; boundary preservado)
- Cross-instance cache invalidation (V1.0 acepta lag 60s; Redis/etc. queda V2 si emerge necesidad)
- Materialización real de los 11 pages placeholder declarados en VIEW_REGISTRY (Slice 0 solo declara registry entries; pages se crean en TASKs derivadas por capability)

## Detailed Spec

### Patrón canónico ClientPortalNavigation

```tsx
// src/views/greenhouse/client-portal/navigation/ClientPortalNavigation.tsx
import 'server-only'
import { requireClientSession } from '@/lib/client-portal/api/auth-guard'
import { resolveClientPortalModulesForOrganization } from '@/lib/client-portal'
import { composeNavItemsFromModules } from '@/lib/client-portal/composition/menu-builder'

export async function ClientPortalNavigation() {
  const { organizationId } = await requireClientSession()
  const modules = await resolveClientPortalModulesForOrganization(organizationId)
  const navItems = composeNavItemsFromModules(modules)

  return <NavList items={navItems} />
}
```

### Page guard pattern (con boundary internal/client)

```tsx
// src/app/(dashboard)/proyectos/page.tsx
import { requireViewCodeAccess } from '@/lib/client-portal/guards/require-view-code-access'

export const dynamic = 'force-dynamic'

export default async function ProyectosPage() {
  await requireViewCodeAccess('cliente.proyectos')
  return <ProyectosView />
}
```

`requireViewCodeAccess` internamente:
- Bypass para `isInternalPortalUser=true` (admin/support legítimo)
- Resolver-based gate para clientes
- Redirect a `/home?denied=<slug>` o `/home?error=resolver_unavailable` en caso degraded

### Home page (terminator garantizado)

```tsx
// src/app/(dashboard)/home/page.tsx — siempre accesible para tenant_type='client'
export const dynamic = 'force-dynamic'

export default async function HomePage({ searchParams }) {
  const { organizationId } = await requireClientSession()
  const modules = await resolveClientPortalModulesForOrganization(organizationId)

  // 5-state contract (ver §13)
  if (searchParams.error === 'resolver_unavailable') {
    return <ClientPortalDegradedBanner /* + reducido home */ />
  }

  if (searchParams.denied) {
    return <ModuleNotAssignedEmpty publicSlug={searchParams.denied} />
  }

  if (modules.length === 0) {
    return <ClientPortalZeroStateEmpty />
  }

  return <ClientHomeView modules={modules} />
}
```

## 5-State Contract

Mandatory per state-design skill. Cada surface client-facing distingue 5 estados visualmente + ARIA:

| Estado | Cuándo | UI | Copy tone | ARIA |
|---|---|---|---|---|
| **Loading** | First resolver fetch (raro: TTL warm cache hit típico) | Skeleton match nav layout (CLS-safe) o render directo si < 50ms | — | `aria-busy='true'` en container |
| **Empty (zero-state)** | Cliente válido con `modules.length === 0` y `lifecycle_stage='active_client'` (estado válido per spec §13 signal) | Banner full-width con icono `tabler-seedling` (cálido) + CTA contacto AM | Bienvenida, esperanza | `role='status' aria-live='polite'` |
| **Not_assigned** | Cliente intentó acceder ruta cuyo viewCode no está en su set | Empty state 5-elementos canónico con nombre comercial del módulo (NUNCA `module_key`) | Cálido, no-blame | `role='status'` |
| **Degraded** | Resolver parcial (algunos modules failed silently, no todos) | Banner sticky-top "Algunos módulos no están disponibles temporalmente" + retry CTA + render parcial de lo que SÍ resolvió | Honesto, recoverable | `role='status' aria-live='polite'` |
| **Error** | Resolver falló completo (caught en `requireViewCodeAccess`) | Redirect `/home?error=resolver_unavailable` + toast `role='alert'` | Recoverable | `role='alert'` toast |

### Anatomía 5-elementos para Not_assigned

```
┌──────────────────────────────────────────────┐
│                                              │
│            ┌─────────┐                       │
│            │   🔒    │  ← CustomAvatar       │
│            └─────────┘    rounded, light,    │
│                           warning, 52px      │
│                                              │
│       Brand Intelligence aún no              │
│       está activo en tu cuenta               │  ← Typography h5
│                                              │
│   Brand Intelligence se incluye en planes    │  ← body1
│   Globe Enterprise. Si te interesa,          │     text.secondary
│   escribinos y te contamos.                  │
│                                              │
│   [📧 Solicitar acceso]  [← Volver]          │  ← Button contained
│                                              │     + Button tonal
└──────────────────────────────────────────────┘
```

1. **Icon**: `tabler-lock` (visual anchor, no decorative — `aria-hidden='true'`)
2. **Title**: nombre comercial del módulo + estado ("Brand Intelligence aún no está activo en tu cuenta")
3. **Description**: contexto comercial + por qué llegó acá ("Se incluye en planes Globe Enterprise. Si te interesa...")
4. **Primary CTA**: "Solicitar acceso" → `mailto:<account_manager_email>` con subject prefilled `Solicitud de acceso — <Brand Intelligence>`
5. **Secondary CTA**: "Volver al inicio" → `/home`

## 4-Pilar Score (mandatory arch-architect)

### Safety
- **Qué puede salir mal**: cliente ve menu items de addon no comprado (revenue leak); cross-tenant leak si `organization_id` se lee mal; page guard bypass cuando resolver falla; leak de `module_key` interno via query param
- **Gates**: server-only resolver (`'server-only'` import enforced), capability via resolver no via roles, `requireViewCodeAccess` boundary explícito internal/client, slug mapping antes de query param (`?denied=brand-intelligence` NUNCA `?denied=creative_hub_globe_v1.brand_intelligence`), `redactErrorForResponse` en captureWithDomain
- **Blast radius**: un cliente. Cross-tenant imposible (resolver filtra por `organization_id` desde session)
- **Verificado por**: tests Playwright 3 perfiles, visual regression 25 snapshots, lint rule, parity test live, slug mapping coverage 100%
- **Riesgo residual**: cache TTL 60s puede mostrar módulo cancelado por hasta 1 minuto post-churn. Acceptable trade-off — no propagamos invalidación cross-instance en V1.0

### Robustness
- **Idempotencia**: read-only path; resolver puro; menu-builder pure function
- **Atomicidad**: N/A (sin writes en TASK-827; los writes viven en TASK-826)
- **Race protection**: Map cache thread-safe en Node; dos requests concurrentes ven el mismo snapshot. Boundary internal/client enforced en helper, no por convention
- **Constraint coverage**: lint warn rule (mecánica), parity test live (schema), tests E2E (runtime), empty state CTA validado contra `tenant_capabilities.account_manager_email` con fallback genérico cuando null
- **Verificado por**: tests parity (rompe build si drift), E2E 3 perfiles, unit tests menu builder con fixtures, integration tests page guards con mock session

### Resilience
- **Retry policy**: resolver falla → `requireViewCodeAccess` redirect a `/home?error=resolver_unavailable` (NO retry loop). Cliente puede manualmente reload
- **Dead letter**: N/A (read path puro; mutaciones de assignment viven en TASK-826 con su propio dead letter)
- **Reliability signal**: `client_portal.composition.resolver_failure_rate` (kind=drift, severity=error si > 1% req/5min, steady=0, subsystem `Client Portal Health`). Coordinado con TASK-829
- **Audit**: viewCode denials NO se persisten V1.0 (read-only); si emerge necesidad legal post-cutover, agregar `client_portal.access.denied_attempts` (kind=data_quality, append-only ledger)
- **Recovery**: cliente con assignments huérfanos cubierto por `client_portal.assignment.orphan_module_key` (TASK-829). `/home` terminator garantizado evita loop. Fallback graceful en cada estado
- **Degradación honesta**: 5 estados distinguibles visualmente (§13); NUNCA blank screen, NUNCA $0 ambiguo, NUNCA mensaje genérico tipo "Sin datos"

### Scalability
- **Hot path Big-O**: O(1) cache hit (Map.get), O(log n) cache miss (PG JOIN con composite indexes ya existentes)
- **Cardinalidad**: ~200 clients × 5 modules avg = 1K assignments steady. Resolver returns ≤10 modules per call. Trivial
- **Async paths**: invalidación via outbox (TASK-826 ya wired). Page guards síncronos pero cache-hit dominado
- **Cost a 10x**: lineal trivial. Map size 1-2K orgs × 60s TTL ≤ 1MB memory por instance
- **Pagination**: N/A — resolver returns full set; cliente típico tiene ≤10 modules
- **Cache**: TTL 60s in-process per org, pattern mirror TASK-780 home_rollout_flags. `bypassCache: true` para mutaciones críticas que el cliente debe ver inmediato

## Hard Rules (anti-regression — TASK-827 specific)

- **NUNCA** importar `resolveClientPortalModulesForOrganization` desde un Client Component (`'use client'`). Server-only enforced via `import 'server-only'` en el módulo
- **NUNCA** branchear menu items por `session.user.businessLines`, `session.user.serviceModules` ni `session.user.tenantType` directo en code paths client-facing. Single source: resolver via prop server
- **NUNCA** dejar `VerticalMenu` llamando `canSeeView('cliente.*', true)` legacy para `!isInternalPortalUser`. Para internos OK; para clientes consumir resolver via prop server-side
- **NUNCA** combinar legacy `authorizedViews[]` + resolver en una misma decisión. Boundary atomic — un caller, un sistema. `isInternalPortalUser` lo determina
- **NUNCA** persistir `module_key` raw en query param `?denied=`. Mapear siempre a slug user-facing via `mapViewCodeToPublicSlug`
- **NUNCA** redirect a una ruta que no sea `/home` desde un page guard de TASK-827. `/home` es el único terminator garantizado accesible para `tenant_type='client'`
- **NUNCA** mostrar empty state con `module_key` técnico. Usar `displayLabelClient` (cliente-facing, tono cálido) desde `GH_CLIENT_PORTAL_COMPOSITION.modulePublicLabels` o desde `modules.display_label_client`
- **NUNCA** dedupear viewCodes en cliente (React). Resolver/menu-builder server-side hace la dedup canónica
- **NUNCA** invocar `Sentry.captureException` directo en code paths TASK-827. Usar `captureWithDomain(err, 'client_portal', { tags: { source: '<...>' } })`
- **NUNCA** hardcodear strings es-CL en JSX. Todo copy visible pasa por `GH_CLIENT_PORTAL_COMPOSITION` dictionary + skill `greenhouse-ux-writing` validada en Slice 1
- **NUNCA** propagar invalidación de cache cross-instance en V1.0 (overkill). TTL 60s in-process es best-effort acceptable; `bypassCache: true` para casos críticos demo
- **SIEMPRE** consumir `displayLabelClient` (no `displayLabel` operator-facing) cuando se renderice surface cliente
- **SIEMPRE** que un cliente acceda con `modules.length === 0` y `lifecycle_stage='active_client'`, renderizar `<ClientPortalZeroStateEmpty>` honesto. Reliability signal `client_active_without_modules > 14d` ya cubre escalation (TASK-829)
- **SIEMPRE** que emerja un viewCode en `modules.view_codes[]` que NO está en `VIEW_REGISTRY`, fail-loud en parity test (no silent skip). CI gate bloquea merge
- **SIEMPRE** dedupear viewCodes en `composeNavItemsFromModules` con prioridad por tier (standard > addon > pilot) cuando un viewCode aparece en N modules concurrent
- **SIEMPRE** wrap el resolver call en `try/catch + captureWithDomain` cuando el caller es un page guard. Redirect to `/home?error=resolver_unavailable` es la degradación canónica

## Acceptance Criteria

- [ ] Slice 0 — Parity test live `view-codes/parity.live.test.ts` registrada + CI gate verde
- [ ] Slice 0 — 11 view_codes faltantes materializados en `VIEW_REGISTRY` con label/description/route_group/route mapping
- [ ] Slice 1 — Microcopy declarado en `GH_CLIENT_PORTAL_COMPOSITION` dictionary; skill `greenhouse-ux-writing` validó tono es-CL tuteo cálido
- [ ] Slice 2 — Mockup aprobado por usuario antes de implementar real; 5 fixtures distintos cubren los 5 estados
- [ ] Slice 3 — `<ClientPortalNavigation>` server component compone menú desde resolver (no hardcoded)
- [ ] Slice 3 — Cliente Globe full bundle: ve TODOS los nav items del bundle
- [ ] Slice 3 — Cliente Wave standard: NO ve nav items Globe
- [ ] Slice 3 — Cliente con addon enabled: ve nav item del addon
- [ ] Slice 3 — Menu builder dedupea viewCodes por tier (standard > addon > pilot)
- [ ] Slice 4 — Page guards en mínimo 6 rutas client-facing (`/proyectos`, `/sprints`, `/equipo`, `/campanas`, `/reviews`, `/analytics`)
- [ ] Slice 4 — Boundary explícito: `isInternalPortalUser=true` bypass resolver; `=false` consume resolver
- [ ] Slice 4 — Page guard rechaza con redirect a `/home?denied=<slug>` con slug user-facing (no `module_key` raw)
- [ ] Slice 4 — `/home` declarado y verificado como terminator garantizado para `tenant_type='client'`
- [ ] Slice 5 — 5 estados visualmente distinguibles con anatomía 5-elementos para `not_assigned`
- [ ] Slice 5 — `<ModuleNotAssignedEmpty>`, `<ClientPortalZeroStateEmpty>`, `<ClientPortalDegradedBanner>` shipped con tokens canónicos
- [ ] Slice 6 — Audit grep documenta TODOs del refactor restante (decisión Q2 sobre `capabilityModules` documentada)
- [ ] Slice 7 — Lint rule `no-untokenized-business-line-branching` registrada en modo `warn` + override block declarado
- [ ] Slice 7 — TASK derivada V1.1 `client-portal-legacy-branching-sweep` registrada en `docs/tasks/to-do/` con condiciones de promote-to-error
- [ ] Slice 8 — Reliability signal `client_portal.composition.resolver_failure_rate` shipped + wired a `getReliabilityOverview` (coordinado TASK-829)
- [ ] Slice 8 — Visual regression test pasa (25 snapshots: 5 fixtures × 5 estados)
- [ ] Slice 8 — E2E Playwright + agent auth: 3 perfiles × 6 rutas con assertions correctas
- [ ] Skills passing: `greenhouse-ui-review` checklist, `greenhouse-microinteractions-auditor` audit, `greenhouse-ux-writing` validation
- [ ] DESIGN.md CI gate `pnpm design:lint` strict verde
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde
- [ ] Hard rules §15 audit pasado: cero `module_key` leak en query params, cero `Sentry.captureException` directo, cero strings es-CL hardcoded en JSX cliente-facing

## Verification

- `pnpm dev` + open `/cliente-portal-mockup` para iterate (Slice 2)
- `pnpm test src/lib/client-portal/view-codes/parity` (Slice 0)
- `pnpm test src/lib/client-portal/composition/menu-builder` (Slice 3)
- `pnpm test src/lib/client-portal/guards` (Slice 4)
- `pnpm playwright test tests/visual/client-portal-composition.spec.ts` (Slice 8 visual)
- `pnpm playwright test tests/e2e/smoke/client-portal-composition.spec.ts --project=chromium` con `AGENT_AUTH_SECRET` (Slice 8 E2E)
- `pnpm design:lint` strict (CI gate)
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (full)
- Skills: ux, ui-review, microinteractions-auditor, ux-writing

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings UX + boundary internal/client + audit refactor pending + cache TTL contract
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-828 puede tomar; TASK-829 reliability signal `resolver_failure_rate` coordinado
- [ ] TASK derivada V1.1 sweep registrada en `docs/tasks/to-do/`
- [ ] Mockup aprobado documentado (`[mockup-approved-by-user]`)
- [ ] Visual regression baseline capturado (25 snapshots)
- [ ] Spec V1 Domain §12 (UI Composition) verificada implementada end-to-end

## Follow-ups

- **TASK-derivada V1.1 `client-portal-legacy-branching-sweep`** [NUEVO]: audit completo + refactor restante de branching legacy en surfaces no-cliente que aún consumen `tenant_capabilities.businessLines/serviceModules`. Trigger: zero drift en producción ≥30 días post TASK-829 cierre. Promueve `greenhouse/no-untokenized-business-line-branching` lint rule de `warn` a `error`. Bloquea hasta confirmar steady state.
- **TASK-derivada V1.1 `capability-modules-resolver-migration`** [NUEVO si Q2 queda V1.1]: migrar `capabilityModules` (VerticalMenu líneas 109-112, `resolveCapabilityModules({businessLines, serviceModules})`) al resolver canónico. Hoy es hardcoded path legacy.
- **TASK-derivada V1.1 `client-portal-pages-placeholder-materialization`**: pages declaradas en VIEW_REGISTRY Slice 0 pero no implementadas (`/creative-hub`, `/roi-reports`, `/brand-intelligence`, etc.). Crear stubs con empty state apropiado para casos en que cliente lo tiene asignado pero page no existe aún.
- Self-service "Solicitar módulo" flow V1.1 (con approval workflow operator-side via Teams)
- Real-time updates via cross-instance cache invalidation V2 (si emerge necesidad demostrada — Redis o equivalente)
- Audit log `client_portal.access.denied_attempts` post-cutover (si compliance lo escala)

## Open Questions (escalar antes de arrancar Slice 4 page guards)

1. **`isInternalPortalUser=true` viendo `/proyectos` de un cliente** (e.g. admin haciendo soporte): el resolver es N/A porque scope es `organizationId` del cliente, no del admin. Recomendación: `requireViewCodeAccess` hace early-return `if (session.user.isInternalPortalUser) return` ANTES de invocar resolver. Confirmar con product: ¿internos ven el menu cliente cuando navegan surface cliente, o ven menu interno con un "switcher de contexto"?

2. **`capabilityModules` (VerticalMenu líneas 109-112)**: hoy `resolveCapabilityModules({businessLines, serviceModules})` es hardcoded path legacy desde `session.user.businessLines/serviceModules`. Decisión bloqueante:
   - **Opción A** — migrar al resolver EN TASK-827 (Slice 6 explota a ~Muy Alto effort)
   - **Opción B** — documentar TODO + TASK derivada V1.1 (effort TASK-827 queda Alto)
   - Recomendación: Opción B (preserva alcance + permite ship V1.0).

3. **`/home` para clientes — ruta canónica exacta**: `dashboardHref` en VerticalMenu es variable. ¿Es `/`, `/home`, `/pulse`? Spec V1 §12 referencia `/home` pero la convención del codebase no está pin-eada. Confirmar antes de Slice 4 (todos los redirects dependen).

4. **`account_manager_email` source**: CTA "Solicitar acceso" del `<ModuleNotAssignedEmpty>` usa `mailto:` con account manager. Source canónica:
   - **Opción A**: `tenant_capabilities.account_manager_email` (legacy HubSpot-derived)
   - **Opción B**: `organizations.account_manager_user_id → users.email` (canonical 360)
   - Recomendación: Opción B con fallback a `support@efeoncepro.com` cuando null. Confirmar.

5. **Mobile responsive del menú**: spec dice "responsive del componente" sin declarar paridad. Recomendación: paridad exacta de viewCodes (mismo set en mobile y desktop), pattern Drawer responsive ya canónico en Vuexy. Confirmar UX.

6. **Skeleton del menu durante cache miss**: cache miss típicamente < 50ms (Postgres JOIN con composite indexes). Recomendación: NO skeleton para nav chrome — render directo. Skeleton aplica para data tables, no para navegación. Confirmar greenhouse-ux.

7. **Reliability signal del resolver — owner**: `client_portal.composition.resolver_failure_rate` lógicamente pertenece a TASK-829 (subsystem `Client Portal Health`), pero TASK-827 introduce el code path que lo emite. Decisión: coordinar entrega — el reader vive acá (Slice 8), pero el wire-up en `getReliabilityOverview` y el subsystem rollup se cierra en TASK-829. Confirmar handoff.

## Effort Reasoning

- `Alto` → `Muy Alto` (era Alto pre-adjust 2026-05-13):
  - +Slice 0 parity 11 view_codes + CI gate (effort medio)
  - +Boundary explícito internal/client + helper `requireViewCodeAccess` con bypass (effort bajo, pero requiere claridad)
  - +5-state matrix completo con 3 components empty state distintos (effort medio — antes era 1 component)
  - +Slug mapping `mapViewCodeToPublicSlug` con tests cobertura 100% (effort bajo)
  - +Reliability signal coordinado (effort bajo)
  - +TASK derivadas explícitas (overhead documental, no implementación)

Si Q2 (Opción A `capabilityModules` migration) entra en scope, effort escala a `Crítico`. Recomendación: cerrar Q2 antes de arrancar Slice 1.
