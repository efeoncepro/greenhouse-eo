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

### 7. Command palette ⌘K — eventually, not V1

Greenhouse does NOT ship ⌘K today. When it lands, follow the global skill's pattern + use Vuexy modal primitive + es-CL copy via `getMicrocopy('aria.commandPalette*')`.

### 8. Search — module-scoped, NOT global

Each module has its own list filter + search (e.g., `/finance/clients?q=foo`). NO global cross-module search V1 — Greenhouse is operational, not exploratory.

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

- **v1.0** — 2026-05-11 — Initial overlay.
