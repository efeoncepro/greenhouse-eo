# Plan — TASK-640 Nubox V2 Enterprise Enrichment Program

## Discovery summary

`TASK-640` is an umbrella. The executable scope for this turn is Slice 1:
confirm gaps, correct outdated assumptions, and split Nubox V2 into child tasks
that can be implemented without duplicating `TASK-212` or `TASK-399`.

Confirmed foundations:

- Nubox runtime already has `raw -> conformed -> PostgreSQL` lanes for sales,
  purchases, incomes and expenses.
- Quotes have a separate hot lane via `sync-nubox-quotes-hot.ts`.
- `income_line_items` and `quote_line_items` already exist, but Nubox does not
  feed them yet.
- Income-side Nubox bank movements already use `recordPayment()`.
- Expense-side Nubox bank movements still update document payment state directly
  instead of using `recordExpensePayment()`.
- VAT foundations exist through `TASK-531`, `TASK-532` and `TASK-533`; Nubox V2
  must enrich evidence and quality, not recreate the VAT ledger.
- `greenhouse_core.assets` and quote PDF asset caching already provide the
  durable artifact pattern for Nubox PDF/XML.

Discrepancies:

- `docs/architecture/schema-snapshot-baseline.sql` is stale for recent Finance
  and Nubox runtime. Use migrations and runtime code as source of recent truth
  until the snapshot is regenerated.
- The original task was too broad to implement as one runtime slice.
- `Blocked by: none` is only true for Slice 1. Enterprise-grade runtime slices
  depend on child tasks and on `TASK-212` / `TASK-399`.

## Access model

This slice does not change portal access.

- `routeGroups`: no change.
- `views` / `authorizedViews`: no change.
- `entitlements`: no change.
- `startup policy`: no change.
- Design decision: any future UI for enrichment review or ops replay must
  document its access plane in the relevant child task before implementation.

## Skills

- Slice 1 documentation/task planning: `greenhouse-task-planner`.
- Future backend/schema/API work: `greenhouse-agent`, and `vercel:nextjs` when
  App Router handlers are added.
- Future UI/review surfaces: `greenhouse-agent`, `greenhouse-ui-orchestrator`,
  plus `greenhouse-vuexy-ui-expert` or `greenhouse-portal-ui-implementer` for
  Vuexy-heavy pages.
- Future UI copy: `greenhouse-ux-content-accessibility`.

## Subagent strategy

`fork` for discovery only. Three explorer agents investigated:

- Nubox runtime and ETL.
- Finance payment/VAT/artifact/master-data surfaces.
- Schema snapshot, migrations and DDL gaps.

Implementation is sequential in this turn because the output is a coherent
documentary plan and child backlog.

## Execution order

1. Move `TASK-640` to `in-progress` and correct stale assumptions.
2. Create this plan file.
3. Create child tasks:
   - `TASK-662` Nubox Document Graph Foundation
   - `TASK-663` Nubox Durable PDF/XML Artifact Persistence
   - `TASK-664` Nubox Payment Graph & Expense Ledger Reconciliation
   - `TASK-665` Nubox Tax Graph & VAT Data Quality Enrichment
   - `TASK-666` Nubox Master Data Enrichment Governance
   - `TASK-667` Nubox Additional Hot Lanes
   - `TASK-668` Nubox Ops Replay & Enterprise Promotion
4. Update task indices and handoff/changelog.

## Files to create

- `docs/tasks/plans/TASK-640-plan.md`
- `docs/tasks/to-do/TASK-662-nubox-document-graph-foundation.md`
- `docs/tasks/to-do/TASK-663-nubox-durable-pdf-xml-artifacts.md`
- `docs/tasks/to-do/TASK-664-nubox-payment-graph-expense-ledger-reconciliation.md`
- `docs/tasks/to-do/TASK-665-nubox-tax-graph-vat-data-quality.md`
- `docs/tasks/to-do/TASK-666-nubox-master-data-enrichment-governance.md`
- `docs/tasks/to-do/TASK-667-nubox-additional-hot-lanes.md`
- `docs/tasks/to-do/TASK-668-nubox-ops-replay-enterprise-promotion.md`

## Files to modify

- `docs/tasks/in-progress/TASK-640-nubox-v2-enterprise-enrichment.md` — update
  lifecycle and real repo state.
- `docs/tasks/README.md` — index `TASK-640` and child tasks.
- `docs/tasks/TASK_ID_REGISTRY.md` — reserve `TASK-662` through `TASK-668`.
- `Handoff.md` — record findings and next execution order.
- `changelog.md` — record the operational planning change.

## Files to delete

- None.

## Risk flags

- Do not implement line items inside `TASK-640` directly; coordinate with
  `TASK-212`.
- Do not declare Nubox enterprise-grade until `TASK-399`-style replay,
  adapter hardening and promotion criteria are in place.
- Do not trust `schema-snapshot-baseline.sql` alone for recent Finance/Nubox
  columns.
- Do not add new Nubox direct-to-Postgres shortcuts; every child task must keep
  raw/conformed evidence before PostgreSQL projection.

## Open questions

- Which Nubox New API endpoints are enabled for references and purchase details
  in the production account?
- What rate limits apply to detail-heavy calls?
- Should historical PDF/XML backfill cover all history or only a cutover date?
- What auto-reconciliation threshold is acceptable before human review?
