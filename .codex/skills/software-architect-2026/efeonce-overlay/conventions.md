# Efeonce Conventions

> Invariants that apply across Greenhouse, Kortex, Verk, and other Efeonce repos. The skill loads these when the overlay is active, and treats them as ground truth — designs must respect them or explicitly justify deviation.
>
> These derive from the per-repo `CONSTITUTION.md` files plus patterns established across the ecosystem. When repo-level CONSTITUTION evolves, this file should be updated.

## Cross-repo invariants

### 1. ICO Engine is the sole source of truth for metrics

No module calculates business metrics inline. Every metric flows through:

1. Source data lands in PostgreSQL (OLTP) or BigQuery (raw layer)
2. ICO Engine materializes computed metrics in BigQuery (`greenhouse_ico.*` or equivalent)
3. Application layers query the materialized metrics, never re-compute

**Why**: prevents metric drift across modules; one number for OTD%, one for RpA, one for Cycle Time, one for FTR%.

**Implication for design**: any new feature that needs "active client count", "churn rate", "engagement score", etc., extends the ICO Engine — it doesn't compute alongside.

### 2. Domain-per-schema in PostgreSQL

Each functional domain has its own Postgres schema. No cross-schema joins outside designated views. Examples in Greenhouse:

- `greenhouse_core` (orgs, users, services, tenants)
- `greenhouse_hr` (HR records, contracts, attendance)
- `greenhouse_payroll` (payroll runs, deductions, KPI bonuses)
- `greenhouse_finance` (invoices, payments, reconciliation)
- `greenhouse_delivery` (projects, tasks, delivery state)
- `greenhouse_crm` (CRM-related data)
- `greenhouse_serving` (cached/derived data for serving APIs)
- `greenhouse_sync` (sync state from external systems)
- `greenhouse_ai` (AI-related state, prompts, traces)
- `greenhouse_notifications` (notifications)
- `greenhouse_audit` (audit log)

**Why**: clean module boundaries; easier to reason about ownership; migrations don't sprawl.

**Implication for design**: new functional areas get a new schema, not a new column in `core`.

### 3. `@/lib/db` is the only connection entry point (Greenhouse)

In Greenhouse, the singleton at `@/lib/db` is the ONLY place a `Pool`, `Client`, or Kysely instance is created. Application code imports query helpers; it does not create connections.

**Why**: connection pool exhaustion is a real production risk; one place to enforce.

**Implication for design**: new modules query through `@/lib/db`, not via their own Pool.

### 4. Reuse-before-create

Before introducing a new table, view, helper, component, or module, check if existing code does this work or is close enough to extend. The agent system corrects toward this consistently.

**Why**: cognitive debt prevention; consistency; less surface area.

**Implication for design**: spec explicitly enumerates "this reuses X, Y, Z" sections — not just "creates A, B, C".

### 5. Fix-mínimo

When fixing an issue or implementing a change, change only what's necessary. Don't refactor adjacent code "while you're there". Don't extend scope.

**Why**: PRs are reviewable; rollbacks are surgical; scope creep is contained.

**Implication for design**: specs are bounded; the agent doesn't speculate beyond the stated scope.

### 6. Agent branch + PR discipline

Agents (Claude Code, Codex) **always** create their own branch and open a PR. They never merge directly to `main` or `develop`. Human review approves merge.

**Why**: guardrail against agent-generated code shipping unreviewed; preserves human-in-the-loop on the architectural surface.

**Implication for design**: handoff to agent says "create branch `task/TASK-XXX-name`, open PR against `develop`"; never "deploy this directly".

### 7. AI stack separation

Different products use different AI providers — by design, not by accident:

- **Kortex**: Anthropic API directly (Claude). The intelligence layer is Claude-first.
- **Greenhouse Nexa**: Vertex AI (Gemini). The intelligence layer is GCP-native.
- **Verk Agent (P1)**: multi-model. Anthropic for content generation, Gemini for research, both via ADK orchestration.

**Why**: each product's economics, latency profile, and team capacity favor different providers. Don't conflate.

**Implication for design**: when designing AI features, name the provider explicitly per product, and don't assume "AI = Anthropic" or "AI = Gemini" universally.

### 8. Notion is input; truth lives in BigQuery

Notion has no field-level permissions and no audit trail. Trust requires immutability at the BigQuery layer.

**Why**: Notion edits can rewrite history silently. Audit-grade processes need immutable snapshots.

**Implication for design**: features that depend on closed-period data read from `*_frozen` tables in BigQuery, not from Notion live state.

### 9. TASK naming convention

All implementation work tracked as TASK docs (not "CODEX TASK"). Format: `TASK_<scope>_<short-description>.md` (e.g., `TASK_HR_Payroll_Module_v2.md`, `TASK_Verk_Ops_Layer_Core.md`).

**Why**: consistency across repos; agent-agnostic naming.

**Implication for handoff**: skill output for handoff is a TASK doc, not an "ADR" or "spec" labeled differently.

### 10. Plan Mode Protocol with STOP Checkpoint

For P0/P1 / Effort-High work, the agent runs Plan Mode and stops at the `human` checkpoint before executing. `plan.md` is committed to `docs/tasks/plans/TASK-NNN-plan.md`.

**Why**: high-risk work gets human review of the plan, not just the result.

**Implication for design**: when the architect identifies a P0/P1 task, the spec calls out that Plan Mode + STOP Checkpoint applies.

### 11. `[NEEDS CLARIFICATION]` is a hard stop

Inline marker in any spec or TASK doc. Agent does not proceed past it. Resolution requires the architect / human to fill in the gap.

**Why**: prevents agent from making architectural decisions silently when the spec is ambiguous.

**Implication for design**: skill output uses `[NEEDS CLARIFICATION]` instead of guessing when an input is missing.

### 12. Acceptance criteria in Given/When/Then

Format:
```
- Given [precondition], When [trigger], Then [expected outcome]
```

**Why**: precise, testable, agent-comprehensible.

**Implication for handoff**: skill output produces acceptance criteria in this format for any feature spec.

## Per-repo notes

### Greenhouse (`greenhouse-eo`)

- Stack pinned: Next.js 16.1.1, React 19, MUI v7 + Vuexy template, Tailwind 4, TypeScript 5.9, PostgreSQL 16 (Cloud SQL `greenhouse-pg-dev`, `us-east4`), BigQuery (`efeonce-group.greenhouse_*`), Vercel Pro
- Migrations: `node-pg-migrate` for migrations, `pg` direct for runtime, Kysely as typed query builder
- Migration profile uses `greenhouse_ops` role (owns all tables)
- Multi-tenant boundary: `space_id`
- ID convention: `EO-XXX-XXXX` format (e.g., `EO-ORG-0001`); reuse-before-create
- Auth: NextAuth.js + Microsoft Entra ID multi-tenant + Google SSO
- ICO Engine schedule: ~06:15 AM UTC daily materialization
- Notion freeze cron: 04:00 AM UTC

### Kortex (`kortex`)

- Standalone platform: own Vuexy frontend, Next.js backend, Cloud SQL, full auth
- HubSpot UI Extensions are one surface; the platform also has a conversational chat interface
- AI stack: Claude via Anthropic API directly (NOT Vertex AI)
- Multi-portal architecture from day one: multiple HubSpot partners each managing N client portals
- HubSpot Developer Platform 2025.2+; v2025.1 deprecates August 1, 2026
- Chat UI: `assistant-ui` library
- Brand: Electric Teal `#00D4AA`, Midnight Navy `#022a4e`

### Verk (`efeonce-web` and TBD)

- TASK naming uses "TASK" not "CODEX TASK"
- P0: Ops Layer; P1: Verk Agent (ADK + multi-model)
- SEO/AEO infra: DataForSEO + Google Search Console API + GA4
- Brand: Deep Cyan Teal `#0099A8`, Forge Black `#003F47`, DM Sans + Grift Bold

### Efeonce Web (`efeonce-web`)

- Astro 6 on Vercel + WordPress on Kinsta (subdomain `cms.efeoncepro.com`)
- Bricolage Grotesque (variable font) + DM Sans
- HubSpot Forms via JS embed API; Yoast SEO via REST API

## When conventions conflict with universal best practice

Sometimes the Efeonce convention is more conservative or more specific than the universal recommendation. **The Efeonce convention wins** within the Efeonce overlay scope, unless the architect explicitly invokes a fresh evaluation.

If a user proposes deviating from a convention, the skill should:

1. Note the convention exists and where it comes from
2. Surface the trade-offs of deviation
3. Recommend documenting the deviation as an ADR if it goes forward
4. Flag whether the deviation should propagate (update the CONSTITUTION) or stay scoped to one feature

## When the convention isn't documented yet

Sometimes the right answer is to write the convention, not to violate it. If the design surfaces a pattern that should be a convention going forward (e.g., "every new module must declare its schema in the migrations directory before any other code"), the skill should:

1. Recommend adding it to the CONSTITUTION
2. Reference this overlay file as the place to capture it for cross-repo concerns
