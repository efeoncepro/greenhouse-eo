---
name: info-architecture-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global info-architecture skill defaults. Load this first whenever info-architecture is invoked inside this repo.
type: overlay
overrides: info-architecture
---

# info-architecture — Greenhouse Overlay

Load global `info-architecture/SKILL.md` first → then read this overlay. Where they disagree, **this overlay wins**.

## Modular placement gate

For `TASK-1376+`, route and navigation placement must agree with the task's `## Modular Placement Contract` and `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`. A URL or menu location identifies the current product surface; it does not by itself establish a permanent deployable boundary or authorize extraction.

## Pinned decisions

### 1. Top-level nav — canonical module set

Greenhouse modules (CLAUDE.md authoritative):

- `/home` — Mi Greenhouse (personal home)
- `/agency` — operations, sample sprints
- `/finance` — bank, cash-out, expenses, income, reconciliation
- `/hr` — payroll, core, offboarding
- `/people` — directorio
- `/delivery` — projects, tasks, ICO
- `/ai-tooling` — licencias, créditos
- `/admin` — governance, users, tenants, releases, operations
- **Portal cliente (Globe / clientes externos): NO tiene prefijo de módulo.** Sus rutas son
  **top-level** con slug es-CL: `/proyectos`, `/campanas`, `/equipo`, `/reviews`, `/sprints`,
  `/analytics`, `/notifications`, `/settings`, `/updates`. `client-portal` es un prefijo de **API**
  (`/api/client-portal/**`) y un directorio de librería (`src/lib/client-portal/**`), **no** una
  URL visible. Verificado contra el filesystem 2026-08-09.

NEVER invent a parallel module. NEVER deep-link a feature outside its module without a strong reason. Extensions go inside the module that owns the domain.

**Internal sidebar structure (TASK-1388/1686, 2026-08-10):** the internal rail has 3 `isSection` zones — **Operación** (dominios Agencia / Comercial / Finanzas / Personas), **Administración** (Admin Center), **Recursos** (Knowledge + Design System) — with Vuexy default accordion. **`/my/*` leaves for internal users do NOT live in the sidebar**: they live in the avatar `UserDropdown` (reachability `via: 'avatar-dropdown'` in `route-reachability-manifest.ts`). The canonical builder for personal nav is `buildMyNavItems` in `src/lib/navigation/my-nav-items.ts` — consumed by `UserDropdown` (internal users) and by the pure-collaborator rail. Pure collaborator (`routeGroups=['my']`) gets its own projection (predicate `isPureCollaborator` in `VerticalMenu.tsx` / `UserDropdown.tsx`). Nav labels SoT: `GH_INTERNAL_NAV` in `greenhouse-nomenclature.ts`. `src/data/navigation/verticalMenuData.tsx` was deleted — never reference it.

**Navigation surface allocation — contract + budget gate (TASK-1389, 2026-08-10):** every NEW navigation destination declares its surface — operativo → sidebar dentro de una zona · personal → avatar `UserDropdown` · cola larga → ⌘K `CommandPalette` · frecuente → shortcuts. NEVER duplicate one destination across two surfaces; NEVER hang a first-level rail item outside a zone (only the pinned Home). The budget is a REAL constraint when designing Greenhouse nav IA, enforced against the real tree: `MAX_TOP_LEVEL_SLOTS=8` / `MAX_INTERACTIVE_DEPTH=2`, gate `pnpm nav:budget` at `error` severity (runs in the test suite and in `design-contract.yml`) — an item that breaks the budget BREAKS the build; adding a top-level slot means removing another or justifying the increase in the contract. Tasks that add a visible destination must declare `Nav placement: sidebar|avatar|command-palette|shortcuts|none` in their `## UI/UX Contract` (TASK_UI_UX_ADDENDUM §Surface & system decision). Contract: `docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md`.

### 2. URL design — REST hierarchy + es-CL slugs

```
/finance/cash-out
/finance/clients/[id]
/finance/clients/[id]/invoices/[invoiceId]
/agency/organizations/[id]
/hr/payroll/[periodId]
/admin/releases
/admin/operations
```

- Kebab-case in es-CL (`/cash-out`, NOT `/cashOut` or `/cash_out`).
- Query params for filters / sort / page / tab (URL state).
- Stable IDs for entities; slugs for SEO-friendly public pages (rare in product UI).

### 3. Route groups — `(dashboard)` es el único grupo de app

Estructura real (verificada contra `src/app/` el 2026-08-09):

```
app/
├── (dashboard)/            # TODA la app protegida: interna Y portal cliente
│   ├── layout.tsx          # sidebar + header
│   ├── home/ agency/ finance/ hr/ admin/ …          ← interno
│   └── proyectos/ campanas/ equipo/ reviews/ …      ← portal cliente (top-level)
├── (blank-layout-pages)/   # pantallas sin chrome
├── auth/                   # login / signin (SIN paréntesis: es un segmento real)
├── public/  q/  assessment/  api/
```

⚠️ **NUNCA crear un route group `(client-portal)`.** No existe y no debe existir: el portal cliente
vive dentro de `(dashboard)` y se diferencia por **guard**, no por topología —
`requireViewCodeAccess(viewCode)` en cada page (`src/lib/client-portal/guards/`). Un grupo paralelo
traería su propio `layout.tsx`, duplicaría el shell y sacaría esas páginas del alcance de
`pnpm route-reachability-gate`, que barre `(dashboard)/**`. Es exactamente el carril paralelo que
`GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` existe para evitar.

### 4. Active state — Vuexy sidebar handles it

Vuexy sidebar reads `usePathname()` and highlights matching items. NEVER re-implement.

Active item shows: bold weight + brand-accent left border + `aria-current="page"`.

### 5. Breadcrumbs — `<Breadcrumb>` primitive

Use `src/components/greenhouse/Breadcrumb/`. Shows path from module root → current. Skip the root layout segment (`(dashboard)` is invisible). Last item is non-clickable.

Hide on home pages (root of module).

### 6. Nomenclature canónica — `src/config/greenhouse-nomenclature.ts`

NEVER rename a module / surface / KPI without updating nomenclature.ts. Validate with `greenhouse-ux-writing`. Examples:

- Mi Greenhouse, NOT "Home"
- Pulse, NOT "Activity Feed"
- Spaces, NOT "Workspaces"
- Ciclos, NOT "Iterations"

### 7. Command palette ⌘K — SHIPPED (TASK-1388/1686)

Greenhouse SHIPS ⌘K today. The only palette is `CommandPalette` (`src/components/greenhouse/CommandPalette/`), mounted globally via `GlobalCommandPalette` (`src/components/layout/shared/GlobalCommandPalette.tsx`): audience filter by routeGroup + authorizedViews, recents in localStorage, salir action. **TASK-1685 nuance:** entries with `routeGroup === 'client'` are NOT filtered by `authorizedViews` — they go through `canSeeClientView(viewCode)` from the client-portal visibility primitive (`useClientPortalViewVisibility`, backed by `src/lib/client-portal/visibility/resolve-client-portal-visibility.ts`: contracted modules + per-person `user_view_overrides` revocations; the role claim does NOT govern `cliente.*`). All other routeGroups keep the claim-based `authorizedViews` filter. GVC marker: `cmdk-open`. NEVER build a second palette or a parallel global search — the old `NavSearch` (`src/components/layout/shared/search/`) was DELETED; never resurrect it.

### 8. Search — module-scoped, NOT global

Each module has its own list filter + search (e.g., `/finance/clients?q=foo`). NO global cross-module DATA search — Greenhouse is operational, not exploratory. (The ⌘K `CommandPalette` of §7 is navigation/commands, not a data search — do not grow it into one.)

### 9. Mega menu — NO

Greenhouse uses Vuexy sidebar (vertical, collapsible). Mega menus belong to marketing sites. NEVER introduce them in product UI.

### 10. Wayfinding — 5-point check per page

Every page MUST show:

1. **Tab title** — `<title>` via `generateMetadata()` per route.
2. **Page heading** — `<h1>` (only one per page).
3. **Active sidebar item** highlighted.
4. **Breadcrumb** showing hierarchical path (if depth > 2).
5. **Browser back button** works correctly (URL is source of truth for state).

## Compose with (Greenhouse skills)

- `greenhouse-ux-writing` — owns labels / nomenclature.
- `frontend-architect-greenhouse-overlay` — Next.js route topology.
- `a11y-architect-greenhouse-overlay` — skip link + nav a11y.
- `modern-ui-greenhouse-overlay` — sidebar / breadcrumb visual.

## Version

- **v1.3** — 2026-08-11 — TASK-1685 sync: ⌘K client entries (`routeGroup === 'client'`) filter via the client-portal visibility primitive (`canSeeClientView`), not `authorizedViews`; role claim no longer governs `cliente.*`.
- **v1.2** — 2026-08-10 — TASK-1389 sync: navigation surface allocation contract + `pnpm nav:budget` gate (8 top-level slots / depth 2, severity `error`) as a real IA constraint; `Nav placement` field in the UI/UX addendum.
- **v1.1** — 2026-08-10 — TASK-1388/1686 sync: 3-zone internal sidebar + `/my/*` re-homed to avatar dropdown (`buildMyNavItems`); ⌘K `CommandPalette` shipped (NavSearch deleted).
- **v1.0** — 2026-05-11 — Initial overlay.
