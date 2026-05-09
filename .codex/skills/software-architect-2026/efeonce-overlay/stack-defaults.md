# Efeonce Stack Defaults

> Validated stack choices per product. The skill applies these as defaults when designing within an Efeonce product, instead of evaluating from scratch each time.
>
> **Validated as of**: 2026-05-08. Re-validate quarterly.

## Universal stack defaults across Efeonce products

These apply to all Efeonce products unless explicitly overridden.

| Layer | Default | Notes |
|---|---|---|
| Language | TypeScript 5.9+ | Strict mode |
| Runtime | Node.js 22 LTS | Bun considered for new tools, not yet default |
| Package manager | pnpm | Across all repos |
| Source control | Git on GitHub (`efeoncepro` org) | Branch + PR for all changes |
| CI | GitHub Actions | |
| Hosting (web) | Vercel Pro (team `efeonce-7670142f`) | Standard build machine, NOT Turbo |
| Hosting (backend services) | Cloud Run on GCP (`efeonce-group`, `us-central1` / `us-east4`) | |
| Hosting (long-running workers) | Cloud Run + Cloud Scheduler | For heavy pipelines |
| Database (OLTP) | PostgreSQL 16 (Cloud SQL) | |
| Database (OLAP) | BigQuery | `efeonce-group.<product>_*` datasets |
| Object storage | GCS | |
| Secrets | GCP Secret Manager | |
| Monorepo (where applicable) | Single-repo per product | Not a Turborepo; each product is its own repo |

## Per-product stack details

### Greenhouse (`greenhouse-eo`)

The flagship internal platform. Most opinionated stack.

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js 16.1.1 | App Router, Turbopack default |
| React | React 19 | |
| UI components | MUI v7 + Vuexy template | Custom theming on top |
| Utility CSS | Tailwind 4 | |
| Icons | Tabler Icons | |
| Fonts | Poppins (headings/nav/numbers), DM Sans (body/labels) | |
| Toasts | Sonner | |
| Animations | Framer Motion | |
| Forms | React Hook Form + Zod | |
| Database | PostgreSQL 16 on Cloud SQL `greenhouse-pg-dev` (us-east4) | |
| Migrations | `node-pg-migrate` | Profile uses `greenhouse_ops` role |
| Query builder | Kysely (typed) | Direct `pg` for runtime; no ORM |
| DB connection | Singleton at `@/lib/db` | NEVER `new Pool()` elsewhere |
| Type generation | `pnpm db:generate-types` after schema changes | |
| Auth | NextAuth.js + Microsoft Entra ID multi-tenant + Google SSO | |
| RBAC | 13 composable roles across 5 families; `greenhouse_core` PG tables | |
| Multi-tenancy | Pool with `space_id` boundary; RLS policies | |
| Email | Resend + React Email | Tokens: Midnight Navy `#022a4e`, Core Blue `#0375db`; Poppins / DM Sans |
| Notifications | `greenhouse_notifications` schema; SSE for real-time; Resend for email | |
| AI (Nexa) | Vertex AI (Gemini 2.5 Flash) | NOT Anthropic |
| Observability | OTel → backend (TBD per ADR) | |
| Cron / scheduled work | Cloud Scheduler + Cloud Run for heavy; Vercel crons (13 of them) for light | Ignored Build Step limits builds to `main` and `develop` branches |
| Domain schemas | `greenhouse_core`, `greenhouse_hr`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_delivery`, `greenhouse_crm`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_ai`, `greenhouse_notifications`, `greenhouse_audit` | |

#### Pipeline schedule

- 03:00 UTC: notion-bq-sync
- 03:30 UTC: hubspot-bq-sync (also handles Greenhouse portal sync)
- 03:45 UTC: sync-conformed
- 04:00 UTC: frameio-bq-sync (when implemented)
- 04:00 UTC: freeze-period (Notion data immutability)
- ~06:15 UTC: ico-materialize (ICO Engine daily)

### Kortex (`kortex`)

Standalone CRM Intelligence Platform.

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js (Vuexy frontend) | Standalone — does NOT share Greenhouse frontend |
| Backend | Next.js API routes / standalone Next.js backend | |
| Database | PostgreSQL on Cloud SQL | Separate from Greenhouse DB |
| Auth | Standalone (NextAuth or similar) | |
| Multi-tenancy | Pattern: TBD per ADR — likely tiered (pool + silo for enterprise agencies) | Multi-portal from day one |
| Chat UI | `assistant-ui` library | Styled with Kortex tokens (Electric Teal `#00D4AA`, Midnight Navy `#022a4e`) |
| AI | Claude via Anthropic API directly | NOT Vertex AI |
| HubSpot integration | Developer Platform 2025.2+ | v2025.1 deprecates 2026-08-01; legacy CRM cards stop 2026-10-31 |
| HubSpot Breeze | 4 Agent Tools specced in `CODEX_TASK_Kortex_Breeze_Agent_Tools.md` | `kortex_crm_diagnosis`, `kortex_pipeline_health`, `kortex_next_action`, `kortex_deploy_schema` |
| Brand tokens | Electric Teal `#00D4AA`, Midnight Navy `#022a4e` | |

### Verk (in development)

Content + Distribution Operating System.

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js | |
| Backend | Next.js + Cloud Run for agent layer | |
| Database | PostgreSQL + BigQuery | OLTP for ops layer, BigQuery for analytics |
| SEO/AEO infra | DataForSEO + Google Search Console API + GA4 | |
| AI (Verk Agent P1) | Multi-model via Google ADK: Claude (Anthropic) for content generation, Gemini (Vertex AI) for research | |
| Brand tokens | Deep Cyan Teal `#0099A8` (Verk Cyan), Forge Black `#003F47` | |
| Typography | DM Sans + Grift Bold (wordmark) | |
| TASK naming | "TASK" (not "CODEX TASK") | e.g., `TASK_Verk_Ops_Layer_Core.md` |

### Efeonce Web (`efeonce-web`)

Public marketing site.

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro 6 | Static + island interactivity |
| CMS | WordPress on Kinsta (headless) | Subdomain `cms.efeoncepro.com` |
| Hosting | Vercel | |
| Typography | Bricolage Grotesque (variable font) + DM Sans | |
| SEO | Yoast SEO exposing `yoast_head_json` via REST API | |
| Forms | HubSpot Forms via JS embed API | |
| Analytics | GA4 | |

#### Pending unblocks (as of 2026-05-08)

- HubSpot Portal ID
- GA4 Measurement ID
- Approximate WordPress post count (for Astro static generation strategy)

### AXIS Design System

Q2 2026 deliverable. Visual source of truth for Greenhouse, Kortex, Verk.

| Layer | Choice |
|---|---|
| Tool | Figma |
| Owner | Andrés Carlosama |
| Phases | Foundation (April), Components (May), Patterns + Docs (June) |
| Target completion | 2026-06-30 |
| Base | MUI / Vuexy + custom tokens |

## Tooling beyond stack

| Tool | Purpose | Notes |
|---|---|---|
| Notion | Project management, task tracking | Tasks DB `5126d7d8-bf3f-454c-80f4-be31d1ca38d4`; Proyectos `abaeb422-...`; Comercial Tareas `2a539c2f-...` |
| HubSpot | CRM (Sales Hub Pro, Service Hub Pro) | Source of truth for customer data |
| Frame.io V4 | Video review for creative production | Pipeline to BigQuery specced |
| Microsoft Entra ID | SSO + tenant `a80bf6c1-7c45-4d70-b043-51389622a0e4` | |
| Nubox | Chilean payroll/accounting | |
| Deel | International contractors + EOR | |
| Resend | Transactional email | |
| Figma + MCP integration | Design + handoff | |

## Repos (GitHub `efeoncepro` org)

- `greenhouse-eo` — Greenhouse platform
- `kortex` — Kortex CRM Intelligence
- `efeonce-web` — Public website (Astro)
- `notion-bigquery` — Notion → BQ pipeline (Cloud Function)
- `github.com/cesargrowth11/hubspot-bigquery` — HubSpot → BQ (also Greenhouse portal sync)

## When to deviate from defaults

The skill should respect the defaults unless:

1. The user explicitly asks for fresh evaluation
2. A genuine new requirement makes the default wrong (e.g., a new product needs edge-first hosting and Vercel can't deliver — Cloudflare Workers is on the table)
3. A vendor change forces re-evaluation (e.g., Anthropic deprecates a model that's central to Kortex; alternatives must be considered)

When deviating, the skill should:

1. Name the deviation explicitly
2. Document the rationale as an ADR
3. Flag whether the deviation should propagate to other products or stay scoped

## Re-validation cadence

This file is a snapshot. Re-validate at minimum every 90 days, immediately after:

- A vendor announces deprecation or major version change (Next.js, Anthropic models, Vertex AI capabilities)
- An ADR supersedes a stack choice
- Pricing changes that would shift the cost model

The skill's research protocol (see `references/12-research-protocol.md`) catches stale assumptions when the user makes a query that depends on them.
