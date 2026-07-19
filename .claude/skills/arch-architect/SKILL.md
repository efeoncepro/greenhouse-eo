---
name: arch-architect-greenhouse-overlay
description: Greenhouse-specific pinned decisions that OVERRIDE the global arch-architect skill defaults. Load this first whenever arch-architect is invoked inside this repo. Specializes in canonical 360 extension, Greenhouse domain boundaries, dual-store (PG+BQ), outbox + reactive consumer patterns, defense-in-depth (TASK-742 7-layer), and the canonized patterns from TASK-571/699/700/703/708/720/721/728/742/758/765/766/768/771/773/774.
type: overlay
overrides: arch-architect
user-invocable: true
argument-hint: "[area or question]"
---

# arch-architect — Greenhouse Overlay

This file **overrides** the global `arch-architect` skill's defaults when working inside the `greenhouse-eo` repository. When there's a conflict between the global skill and this overlay, **this overlay wins**.

**Load order**: read global `arch-architect/SKILL.md` first → then read this overlay → then apply rules.

## Why this overlay exists

The global arch-architect is good for greenfield decisions. Greenhouse is not greenfield: it's a Next.js 16 + MUI 7.x + PostgreSQL + BigQuery + Cloud Run platform with ~80 architecture specs in `docs/architecture/` and a strict canonical 360 model. Most architectural questions in this repo have a precedent — and the precedent is enforced.

This overlay pins the Greenhouse decisions so the global skill's "boring tech preference" lands on **the specific boring tech this repo uses**.

## Canonical authoritative sources (read first when relevant)

- **`CLAUDE.md`** at repo root — the operative contract for all agents. Contains hard rules.
- **`docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`** — the 6 canonical objects. Extension pattern is mandatory.
- **`docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`** — master architecture document.
- **`docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`** — PG + BQ dual-store strategy.
- **`docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`** — Commercial vs Finance ownership.
- **`docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`** — reliability registry.
- **`docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`** + Platform Health V1.
- **`docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`** — TASK-742 7-layer defense template.
- **`docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`** — Full API parity (UI is a client of governed contracts; Duncan Lennox / HubSpot principle). See pinned decision #16.
- **`docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`** — EPIC-026 contract for continuing product work extraction-ready without pre-creating target apps/packages.

## Compose with the `astro` skill (Astro / static-site / efeonce-think work)

When a design or review touches an **Astro** property — `efeonce-think` (the AI
Visibility report hub), `efeonce-web` (public marketing), or any static/island
front-end — **compose directly with the `astro` skill**. Bidirectional handoff
contract:

- **This skill decides the SHAPE** — reversibility / blast-radius, 4-pillar
  scoring, SSOT & domain boundaries (the *dumb-render* line: efeonce-think
  renders, the Greenhouse headless model computes — never invert it), canonical
  primitive vs new entity, schema/migration, multi-tenant exposure, and whether a
  capability needs a governed contract (Full API Parity — e.g. the AEO grader form
  as a governed write-path). "Static vs SSR" as a structural call is decided here.
- **The `astro` skill fills the IMPLEMENTATION** — rendering mode
  (`output`/`prerender`), island boundaries + `client:*`, Content Layer modeling,
  Astro Actions/endpoints, adapter + deploy, View Transitions, perf/cache wiring.

Flow: **decide the shape here → hand to `astro` for the Astro-specific structure →
it hands back up if a new shape decision surfaces.** Don't re-derive Astro
mechanics here, and don't let the `astro` skill make an SSOT / blast-radius call
alone. (Codex mirrors this contract: `software-architect-2026` ↔ `astro` under
`.codex/skills/`.)

## Compose with the `greenhouse-globe` skill (Efeonce Globe / Creative Studio / EPIC-028)

When a design or review touches **Efeonce Globe** — the sibling creative-production
platform (`efeonce-globe` repo, governed by Greenhouse under EPIC-028) — **compose
with the `greenhouse-globe` skill**. It owns the Globe-specific runtime: the Node 24
native-TS monorepo, the API Contract Spine (TASK-1481: trusted context vs untrusted
payload, `CapabilityRegistry`, three-state coverage, canonical errors, conformance
harness), the capability-extension flow (TASK-1457…1480), the provider boundary
(`provider-contract` → `creative-runner`), and the Globe↔Greenhouse ownership line.

Bidirectional handoff:

- **This skill decides the SHAPE** — reversibility / blast-radius, 4-pillar scoring,
  domain boundaries and the sister-platform line (Greenhouse owns identity/desired
  access/governance and the `TASK-###`/EPIC control plane; Globe owns
  code/runtime/data/creative evidence — never share DB/session/bucket/provider
  secret/admin role), canonical primitive vs new entity, whether a capability needs a
  governed contract (Full API Parity by birth). "Sister platform vs Greenhouse module"
  is decided here (it's already decided: Globe is a peer — see the Creative Studio ADR).
- **The `greenhouse-globe` skill fills the IMPLEMENTATION** — how to extend the spine
  (schemas in `packages/contracts` → `registry.registerCommand` → flip coverage
  policy-blocked→available → handler via `provider-contract`/`creative-runner` → typed
  SDK method → grant → manifest-driven harness), the build/toolchain (`pnpm check` /
  `pnpm build` in `efeonce-globe`, `node --test`, import-extension convention), and the
  trusted-context / dispatch mechanics.

**Two worked examples now live on the spine, and the second is an architecture pattern
worth stealing.** The Model Lab (TASK-1457) is the first — a capability with external state
+ a provider behind it. The **Evaluation Harness** (TASK-1458, SPEC-003,
`EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`, capability `globe.lab.evaluation.run`) is the
second, and it demonstrates **capability-consumes-capability**: it never reimplements
experiment execution — it reuses the Lab through an exported domain helper
(`runModelLabExperiment`, the real `prepare→execute` path with every guardrail), never
re-dispatching through the registry from inside a handler and never duplicating the logic.
Its golden briefs + rubrics are **versioned data** flowing through one engine (no `switch`
per fixture — two distinct fidelity contracts, one engine). And it draws the line the eval
discipline demands: `objectiveChecks` (automatic, deterministic) stay separate from
`humanCriteria` (declared, never auto-scored); the verdict is only
`objective_fail | objective_pass_pending_human` — never a creative "passed", never "model X
is globally better" — and reports are versioned, workspace-scoped, with limitations
declared. **This is framework #10 (eval-driven AI design) as a Globe primitive:** promoting
a model route to production is a gate SEPARATE from running it in the Lab, and the evidence
for that promotion is an evaluation report per fidelity contract.

**The provider stack behind the runner is itself a pattern worth stealing (TASK-1486…1488, 1459).**
A `CreativeProviderAdapter` is minted **per vendor** behind the `creative-runner`: `VertexCreativeAdapter`
(TASK-1486, Google-native via Vertex, **keyless** through ADC/WIF, verified live) and `FalCreativeAdapter`
(TASK-1487, non-Google, queue API), exposing capabilities verified against **live provider accounts, not marketing
claims** (TASK-1488: Seedream 5 / Recraft / Topaz / Seedance / Seed Audio / ElevenLabs / Rodin 3D — with vendor
quirks like ByteDance model IDs carrying no `fal-ai/` prefix). Two shape rules generalize to any provider design:
(a) **capability→model routing lives INSIDE the adapter, never in domain policy** — a template/agent selects a stable
semantic capability and the adapter resolves the concrete model + vendor quirk; and (b) `actualRoute` is the
**fidelity-contract route, not the raw provider slug** (a `route_stable` bug fixed in TASK-1459). Secrets follow the
sister-platform line: **keyless for Google-native (own project's ADC/WIF), keyed-with-its-own-secret for everything
else — never a secret shared between Globe and Greenhouse** (the shared Fal canary key is a declared, temporary
exception). The **`CompositeProviderAdapter`** (TASK-1487) is the router: it fans a capability across adapters by
`supports()` + provider policy (Google-native → Vertex, non-Google → Fal). This is where **eval-driven design
(framework #10) turns concrete for creative work**: the Still Model Lab **recommendation matrix** (TASK-1459) compares
engines *objectively* — Vertex Nano Banana vs Fal Seedream by cost/latency/objective — yet craft stays a human call and
**the harness never auto-elects a creative winner**; the matrix informs the human, it never promotes a route (route
promotion to production stays the separate gate from framework #10 above).

Flow: **decide the shape here → hand to `greenhouse-globe` for the Globe-specific
structure → it hands back up if a new shape decision surfaces.** Canonical specs:
`efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001) +
Greenhouse `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_{DECISION,ARCHITECTURE}_V1.md`
+ `docs/epics/in-progress/EPIC-028-*.md`. (Codex mirrors this: `software-architect-2026`
↔ `greenhouse-globe` under `.codex/skills/`.)

## Pinned decisions (OVERRIDES global arch-architect)

### 1. Canonical 360 extension is mandatory

Greenhouse has 6 canonical objects. **NEVER** create parallel identities for them.

- `Cliente` → `greenhouse.clients.client_id`
- `Colaborador` → `greenhouse.team_members.member_id`
- `Persona` → `greenhouse_core.identity_profiles.identity_profile_id`
- `Proveedor` → `greenhouse_core.providers.provider_id`
- `Space` → `greenhouse_core.spaces.space_id`
- `Servicio` → `greenhouse.service_modules.module_id`

Domain modules **extend** these via FK + supplementary tables. They never paralelize.

### 2. PostgreSQL first, BigQuery fallback

- **Postgres** = OLTP, runtime-first, mutations. Cloud SQL `greenhouse-pg-dev`, `us-east4`.
- **BigQuery** = analytical OLAP, raw snapshots, conformed marts.
- New write paths land on Postgres. BigQuery is downstream.
- Reads default Postgres; BQ fallback is explicit and degraded.

### 3. Outbox + reactive consumer is the canonical async path

Any state change that must propagate to projections / BQ / external systems goes through:
1. INSERT into `greenhouse_sync.outbox_events` in the same transaction as the state change.
2. Cloud Scheduler → ops-worker drains pending → publishes to BQ + reactive projection consumers.
3. State machine: `pending → publishing → published | failed → dead_letter`.

**Vercel cron is reserved for prod-only / tooling tasks** (see `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md`). Async-critical paths run in Cloud Scheduler + ops-worker.

Spec: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`.

### 4. Canonical "VIEW + helper + reliability signal" pattern

When an aggregation has drift risk (FX, settlement, payments, projections):

- **One canonical VIEW** owns the calculation.
- **One canonical TS helper** wraps the VIEW.
- **One reliability signal** detects drift (steady = 0).
- **Lint rule** (when regression-prone) forbids re-derivation.

Established by TASK-571 (income settlement reconciliation), TASK-699 (FX P&L breakdown), TASK-766 (CLP reader), TASK-774 (account_balances FX). Replicate, don't deviate.

### 5. Defense-in-depth = 7-layer template (TASK-742)

For any safety-critical surface (auth, payment writes, reveal-sensitive, irreversible mutations):

- DB constraint (CHECK / UNIQUE / FK / EXCLUSION).
- Application guard (capability check, validators).
- UI affordance (disable / hide).
- Reliability signal (steady = 0 detection).
- Audit log (append-only, anti-UPDATE/DELETE trigger).
- Approval workflow (when applicable).
- Outbox event versioned v1 (when applicable).

No critical decision lives on a single layer.

### 6. State machine + CHECK + audit trio

For any transition-heavy entity (payment_orders, expenses, services, approvals):

- Allowed transitions enumerated in code + DB.
- CHECK constraint forbids invalid states.
- Anti-zombie CHECK forbids "active" without progress beyond N days.
- Append-only audit table with anti-UPDATE / anti-DELETE triggers.
- Outbox event per transition.

Established by TASK-700 (account number registry) + TASK-765 (payment order state machine). Replicate.

### 7. Capabilities granular, not coarse

Any new write surface gets a **dedicated capability** (`<module>.<entity>.<action>`). NEVER reuse `<module>.admin` as a catch-all.

Exception path requires explicit ADR.

### 8. Reliability signals everywhere

Every async path (cron, projection, sync, materializer) ships with a reliability signal in `src/lib/reliability/queries/`. Signal is wired to `getReliabilityOverview` and shows on `/admin/operations`.

Subsystem rollups: `Finance Data Quality`, `Identity & Access`, `Event Bus & Sync Infrastructure`, `Commercial Health`, `Notion Sync`.

### 9. Canonical asset uploader for evidence (TASK-721)

Any evidence upload (reconciliation snapshot, finiquito attachment, audit screenshot) goes through `<GreenhouseFileUploader contextType=...>` + `/api/assets/private`. **NEVER** ad-hoc uploads.

### 10. Domain boundaries

- **Commercial** owns: quotes, deals, services (catalog + instances), agreements. UI in `/agency/*`.
- **Finance** owns: income, expenses, payments, reconciliation, FX, P&L. UI in `/finance/*`.
- **HR** owns: payroll, contracts, benefits. UI in `/hr/*`.
- **Identity** owns: auth, capabilities, organizations lifecycle. UI in `/admin/*`.
- **Delivery** owns: tasks, projects, sprints, ICO. UI in `/agency/*` for delivery views.

`docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` is canonical for commercial vs finance.

### 11. Tasks pipeline + lifecycle

New tasks live in `docs/tasks/to-do/TASK-###-*.md` following `docs/tasks/TASK_TEMPLATE.md`. Move to `in-progress/` and `complete/` per `docs/tasks/TASK_PROCESS.md`.

Any architecture spec from this skill that requires implementation creates a TASK-### file via the `greenhouse-task-planner` skill.

Every new canonical task also completes `## Modular Placement Contract`: current home, future candidate home, canonical boundary, server/browser split, build impact and extraction blocker. `Topology impact: none` is the proportional fast-path. Candidate homes do not authorize `apps/*`/`packages/*` until an EPIC-026 child task does.

### 12. Migration discipline

- **node-pg-migrate** is canonical. `pnpm migrate:create <slug>` ALWAYS (never hand-edit timestamps).
- Every migration starts with `-- Up Migration` marker.
- `NOT VALID + VALIDATE` two-step for constraints on populated tables.
- `CREATE INDEX CONCURRENTLY` in production.
- Verify DDL applied via `information_schema` after `pnpm migrate:up` (silent failures detected in TASK-768 Slice 1).

### 13. Secret hygiene (TASK-742 layer)

- `*_SECRET_REF` resolves from GCP Secret Manager.
- `validateSecretFormat` for critical secrets before publishing.
- `pnpm secrets:rotate` for rotation (verify-before-cutover).
- Never raw `process.env.X_SECRET` for critical secrets in production paths.

### 14. Sentry + reliability rollup

- `captureWithDomain(err, '<domain>', { extra })` instead of `Sentry.captureException` directly.
- Domains: `finance`, `identity`, `commercial`, `delivery`, `integrations.notion`, `integrations.hubspot`, `home`.
- Each module's incidents tagged → roll up in registry → visible at `/admin/operations`.

### 15. Output redaction

`redactErrorForResponse` and `redactSensitive` from `src/lib/observability/redact.ts` for any error / response that crosses a security boundary. NEVER raw `error.message` or `error.stack` in HTTP responses.

### 16. Full API Parity — the UI is a client, not the source of truth

Canonical Greenhouse decision (`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`, CLAUDE.md §"Full API Parity Principle"). Operating principle adopted from **Duncan Lennox (HubSpot)**: *everything doable inside the product must be doable — or have a planned path to be doable — through a governed programmatic contract.* The UI is **not** the source of truth of a capability; it is a client of server-side commands, readers, projections and API contracts.

When designing any capability, this skill must:

- **Model the aggregate / command / reader FIRST, the UI second.** Never put business logic (state changes, permissions, approvals, exports, recoveries, reports, config) inside a UI component if it affects state. Extract the canonical primitive into `src/lib/**` and expose it through a contract.
- **Never design endpoints that are "remote click handlers"** coupled to a visible component. Model the resource/command and its stable contract — the same reader/command serves the UI, Nexa, MCP, CLI/runbooks and ecosystem consumers (this is the SSOT-reader pattern: one reader, many surfaces).
- **Declare the programmatic path** for every new visible action: internal Product API, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, or an explicit follow-up task if deferred. "UI-only for now" is acceptable only with a documented planned path.
- **Read endpoints model `resource`/`search`, not visual handlers.** Write endpoints get command semantics + tenant-safe authz + audit/outbox + idempotency + sanitized errors.

**Full API Parity is the base; Nexa total operability is its consequence and North Star (CEO directive 2026-06-19).** The hard requirement is a governed contract at the capability level (one canonical primitive, many consumers). Because that contract exists, **Nexa Agent can operate the ENTIRE portal from the Conversational Experience by construction** — nothing Nexa-specific is built. Every **new UI** and every **new capability/entitlement** must be born with that contract — reads direct, writes via the governed-action loop `propose → confirm → execute` (the LLM never executes a write directly; mutation only at the human confirmation endpoint). Mandatory design-time question: **"does this capability have a governed contract at the capability level?"** If yes, Nexa and every consumer operate it end-to-end; if no, it is not complete. Verify parity at the capability level; Nexa-operability follows — do not design a Nexa-specific integration.

**Canonical consumers (declared — all clients of the SAME primitive, never parallel impls):** (1) UI web portal, (2) Nexa Agent, (3) MCP / downstream agents (`api/platform/ecosystem`), (4) first-party apps (`api/platform/app`), (5) ecosystem / sister platforms (Kortex, `efeonce-web`, `notion-bigquery`), (6) inbound integrations/webhooks (HubSpot/Notion/Teams/ZapSign/Entra-SCIM → command), (7) Teams Bot, (8) async runtime (ops-worker/Cloud Scheduler/outbox/reactive/materializers/recovery), (9) CLI/runbooks/scripts, (10) E2E/verification harness. If a behavior is reachable by ANY of these, the logic lives in the canonical primitive and is exposed via a governed contract — never duplicated per consumer; a new consumer class inherits the contract automatically. Full list in `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` §"Canonical consumers".

This composes with #5 (read vs write separation): the read API serves shape+latency for many clients; the write command serves correctness+audit. Source: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (§North Star + §Canonical consumers) + `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`.

### 17. Frontend surfaces — routing, i18n, public pages, caching (VERIFIED 2026-07-08)

Front-end architecture facts of THIS repo. Verify against these before proposing a routing/i18n/caching shape — do NOT reason from Next.js generic defaults.

- **i18n is REAL and BILINGUAL (`es-CL` + `en-US`) — but COOKIE/HEADER-based, NOT URL-segment.** The repo uses **`next-intl` (`^4.11.0`)** configured via `src/i18n/request.ts` → `resolveLocaleFromRequest({ userLocale: session.user.effectiveLocale, cookieLocale: cookies['gh_locale'], acceptLanguage })`. **There is NO `[lang]`/`[locale]` URL segment and NO locale-routing middleware.** `SUPPORTED_LOCALES = ['es-CL','en-US']` (`src/i18n/locales.ts`).
  - **NEVER propose `src/app/[lang]/...`** — it does not exist and adding a `[lang]` root segment is a one-way door across all routing.
  - A server component reads the locale with **`const locale = (await getLocale()) as Locale`** (`next-intl/server`) and pulls copy via **`getMicrocopy(locale).<namespace>`**. Reference page: `src/app/(blank-layout-pages)/coming-soon/page.tsx`.
  - Copy lives in **per-locale dictionaries `src/lib/copy/dictionaries/{es-CL,en-US}/<namespace>.ts`** (public API `getMicrocopy(locale)` from `@/lib/copy`), NOT a single `es-CL` file. A new surface's copy is a **new namespace present in BOTH locales**. (`greenhouse-ux-writing` owns the strings; this is the architecture of where they live.)
  - **Any new user-facing surface is bilingual by construction** — never scope a surface "es-CL only" or defer i18n; the machinery already exists. `hreflang`/per-URL-locale SEO does NOT apply (one URL per page, locale varies by cookie/header; the crawler indexes the resolved default locale).
- **Public (no-session) surfaces:** the canonical home is **`src/app/public/**`** (e.g. `src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx`) or the **`(blank-layout-pages)`** route group. The authenticated app is the **`(dashboard)`** route group. NEVER invent a new top-level public routing scheme; extend `src/app/public/**` or `(blank-layout-pages)`. Public API routes live under `src/app/api/public/**`.
- **Caching / read-path scalability (CQRS-lite for read surfaces):** a public, indexable page that reads DB data must be **RSC + ISR** (`export const revalidate`) with **on-demand `revalidatePath(...)`** fired by the write that changes the data (e.g. a publish command) — **never `force-dynamic`** for a cacheable public listing (that hits PG on every bot/candidate request and doesn't absorb traffic). `force-dynamic` is correct only for token-gated/personalized public pages (the existing `public/quote` is `force-dynamic` because it's per-token). This is the read-vs-write separation (#5) applied to the edge: cached read path, governed write path.
- **Route reachability gate** (`route-reachability-manifest.ts`, TASK-982) applies to **`(dashboard)/**` pages only** — public/auth routes are out of its scope. Don't cite it for a public surface.
- **RSC vs client boundary:** default to **RSC** for read/display (SEO, cacheable, server-fetched); make **client components** only for genuine interactivity (forms, Turnstile, client-side filtering over already-fetched data). A public form posts to the existing governed **public API endpoint via client fetch** (one contract, many consumers — Full API Parity, #16), not a bespoke Server Action, when the endpoint already exists.

**Source of the correction:** a careers-landing (TASK-354) review first wrongly added `[lang]` URL routing, then wrongly "corrected" to es-CL-only. Both wrong: no URL segment, but real bilingual cookie/header i18n. Pinned here so it doesn't recur.

## Greenhouse-canonical patterns inventory

When designing in this repo, the 3-most-relevant-patterns step (from the global skill's investigation protocol) starts with this set:

| Need | Reference task | Pattern |
|---|---|---|
| Aggregation with drift risk | TASK-571, TASK-699, TASK-766, TASK-774 | VIEW canónica + helper + reliability signal + lint rule |
| State machine entity | TASK-700, TASK-765 | enumerated transitions + CHECK + audit log + outbox events v1 |
| Defense in depth | TASK-742 | 7-layer pattern (DB + app + UI + signal + audit + workflow + outbox) |
| Async projection | TASK-771, TASK-773 | outbox + reactive consumer + dead_letter + reliability lag signal |
| Decoupling Vercel cron from infra-critical work | TASK-775 | Cloud Scheduler + ops-worker + 3 cron categories (async_critical / prod_only / tooling) |
| Evidence upload | TASK-721 | canonical asset uploader + dedup + retention class |
| Analytical dimension separate from fiscal | TASK-768 | dimension column + resolver + reclassification endpoint + manual queue + audit log |
| Health contract for agents/tools | TASK-672 | Platform Health V1 + 4-pillar safe-modes + recommended checks |
| Time-versioned terms | TASK-700 | terms table with `effective_from/to` + UNIQUE active partial index |
| Canonical helper enforcement | TASK-721 | lint rule + helper module + override block for legitimate exceptions |
| Declarative flag platform | TASK-780 | scope precedence (user > role > tenant > global) + reliability signal for drift |

## Hard rules (Greenhouse-specific)

- **NEVER** create a parallel identity for a 360 object.
- **NEVER** put a business capability (state change, permission, approval, export, recovery, report, config) only inside a UI component — extract the canonical command/reader in `src/lib/**` and expose a governed contract first (Full API parity, decision #16). The UI is a client, never the source of truth.
- **NEVER** read or write canonical aggregations (FX, settlement, P&L, ICO) outside their canonical VIEW + helper.
- **NEVER** put async-critical work on Vercel cron. Use Cloud Scheduler + ops-worker.
- **NEVER** ship a write surface without: capability + DB constraint + reliability signal + audit log.
- **NEVER** mix orthogonal dimensions in a single enum (e.g. engagement_kind + commercial_terms).
- **NEVER** delete data. Use supersede / archive / soft-tombstone with explicit retention.
- **NEVER** invoke Sentry directly when a domain rollup exists. Use `captureWithDomain`.
- **NEVER** invent primitives the canonized patterns inventory already covers.
- **SIEMPRE** crear el TASK-### file (via `greenhouse-task-planner`) cuando un spec requiere implementación.
- **SIEMPRE** declarar `Domain boundary` en el spec.
- **SIEMPRE** scoring 4-pilar explícito.
- **SIEMPRE** citar 3 patrones canonizados existentes que el diseño extiende o de los que diverge.

## Synergies with other skills

- `greenhouse-postgres` — when designing Postgres schemas, this skill decides the shape; `greenhouse-postgres` validates the migration mechanics.
- `greenhouse-finance-accounting-operator` — when the design touches accounting/finance, invoke this for tax/regulatory/IFRS correctness.
- `greenhouse-task-planner` — once a spec is written here, generate the TASK-### file.
- `greenhouse-cron-sync-ops` — for async cron / outbox / projection design.
- `greenhouse-secret-hygiene` — for any design touching secrets.
- `claude-api` — for prompt + agent SDK implementation after this skill decides the agent topology.
- `modern-ui` (Greenhouse overlay) — for UI architecture + token discipline.

## Output convention

All architecture specs go in `docs/architecture/GREENHOUSE_<TOPIC>_V<N>.md`. Numbering and template follow existing specs there.

ADRs (if/when adopted) go in `docs/adr/ADR-NNNN-*.md`. (Greenhouse currently embeds decisions in V1 specs rather than separate ADRs; consult with user before introducing the ADR pattern broadly.)

Reading order in `docs/architecture/` is documented in `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.
