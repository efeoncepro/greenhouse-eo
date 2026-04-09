# TASK-307 — Partnership Schema + Partner Programs Foundation

## Status
- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-307-partnership-schema-partner-programs`
- GitHub Issue: `—`

## Summary

Create the `greenhouse_partnership` schema with the `partner_programs` table as the canonical anchor for all partnership relationships. This is the foundational task — every other partnership task depends on this. Includes schema creation, migration, seed data for 20+ existing partnerships, CRUD API, list/detail UI, and navigation entry.

## Why This Task Exists

Efeonce manages 20+ active partnerships (HubSpot, Salesforce, Google Cloud, Azure, Aircall, Figma, NUA, DDSoft, etc.) with no formal registry in the portal. Partnership programs exist only in contracts and spreadsheets. Without a canonical registry, revenue tracking, profitability analysis, and contact management have no anchor point.

## Goal
- `greenhouse_partnership` schema created and owned by `greenhouse_ops`
- `partner_programs` table operational with full structure (direction, category, model, tier, hierarchy)
- CRUD API for programs
- Programs list view with TanStack table + filters
- Program detail view (overview tab)
- Navigation entry under new "Alianzas" section
- Seed data for all known partnerships (to be confirmed with Finance/Commercial)
- Access control registered for `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin`
- Outbox events: `partnership.program.created`, `partnership.program.status_changed`

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` — spec maestra
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — no crear identidad paralela de organización
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — migration framework

Reglas obligatorias:
- Partner programs reference `greenhouse_core.organizations` — no duplicar org identity
- `organization_type` enum NO se muta — la existencia de un `partner_program` activo define al partner
- Schema `greenhouse_partnership` aislado — no agregar columnas a tablas de otros schemas en esta task
- ID format: `ppg-{uuid}`

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.1 — DDL completo
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — access control pattern
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox event pattern

## Dependencies & Impact

### Depends on
- `greenhouse_core.organizations` table (exists)
- Outbox infrastructure (exists)
- Access control / view code system (exists)

### Blocks / Impacts
- `TASK-308` (revenue entries) — depends on `partner_programs` table
- `TASK-309` (serving views + dashboard) — depends on programs + revenue
- `TASK-310` (costs + profitability) — depends on programs
- `TASK-311` (contacts) — depends on programs
- `TASK-312` (automation) — depends on all above

### Files owned
- `migrations/YYYYMMDD_create-partnership-schema-and-programs.sql`
- `src/app/api/partnership/programs/route.ts`
- `src/app/api/partnership/programs/[programId]/route.ts`
- `src/lib/partnership/programs.ts`
- `src/views/greenhouse/partnership/ProgramsListView.tsx`
- `src/views/greenhouse/partnership/ProgramDetailView.tsx`
- `src/app/(dashboard)/partnership/programs/page.tsx`
- `src/app/(dashboard)/partnership/programs/[programId]/page.tsx`

## Current Repo State

### Already exists
- `greenhouse_core.organizations` table with org identity — programs will FK here
- Outbox infrastructure (`greenhouse_sync.outbox_events`) — reuse for partnership events
- Access control system with view codes — register new codes
- Navigation config — extend with Alianzas section
- `greenhouse_finance.income.partner_id`, `partner_name`, `partner_share_*` columns — supplementary, not replaced

### Gap
- No `greenhouse_partnership` schema
- No `partner_programs` table
- No partnership API routes
- No partnership UI views
- No partnership navigation section
- No formal registry of which organizations are partners

## Scope

### Slice 1 — Schema + Migration
- Create `greenhouse_partnership` schema
- Create `partner_programs` table per spec §4.1
- All indexes
- Grant ownership to `greenhouse_ops`
- Regenerate Kysely types

### Slice 2 — Store + API
- `src/lib/partnership/programs.ts` — CRUD functions (list, get, create, update, soft-delete)
- `src/app/api/partnership/programs/route.ts` — GET (list with filters) + POST
- `src/app/api/partnership/programs/[programId]/route.ts` — GET + PATCH + DELETE (soft: status → terminated)
- Outbox event publishing on create and status change

### Slice 3 — UI
- Programs list view with TanStack table
  - Columns: org name, program name, direction, category, model, tier, status, effective date
  - Filters: status, direction, category
  - Row click → detail
- Program detail view (overview tab only — revenue/costs tabs come in later tasks)
  - Header: program name, org name, status chip, tier badge
  - Info grid: direction, category, model, dates, renewal, frequency, contract ref
  - Parent program link if child
  - Children programs list if parent
- Create program drawer with org selector (autocomplete from organizations)

### Slice 4 — Navigation + Access Control
- Register view codes: `alianzas.programas`
- Add Alianzas section to navigation config
- Wire access control for allowed roles

### Slice 5 — Seed Data
- Seed script for known partnerships (confirm list with Finance/Commercial before running)
- Create organizations for partners not yet in the system
- Link parent-child relationships (HubSpot → Aircall, etc.)

## Out of Scope
- Revenue entries (TASK-308)
- Cost tracking (TASK-310)
- Serving views and dashboard (TASK-309)
- Partner contacts / role_label (TASK-311)
- Automation and alerts (TASK-312)
- Nomenclature additions (bundle with first UI task that needs them)

## Acceptance Criteria
- [ ] `greenhouse_partnership` schema exists in PostgreSQL
- [ ] `partner_programs` table created with all columns, constraints, and indexes per spec
- [ ] Kysely types regenerated and include `GreenhousePartnershipPartnerPrograms`
- [ ] API: GET /api/partnership/programs returns paginated list with filters
- [ ] API: POST /api/partnership/programs creates a program linked to an organization
- [ ] API: GET /api/partnership/programs/[id] returns program detail
- [ ] API: PATCH /api/partnership/programs/[id] updates program fields
- [ ] API: DELETE /api/partnership/programs/[id] sets status to terminated
- [ ] UI: Programs list renders with TanStack table, filterable by status/direction/category
- [ ] UI: Program detail view shows all program fields + parent/children links
- [ ] UI: Create program drawer with org autocomplete works
- [ ] Navigation: Alianzas section visible for authorized roles
- [ ] Access control: only `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin` can access
- [ ] Outbox events published on create and status change
- [ ] Seed data loaded for known partnerships (after confirmation)

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: navigate to /partnership/programs, verify CRUD operations

## Closing Protocol
- [ ] Update `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta noting implementation details
- [ ] Add partnership schema to `docs/architecture/schema-snapshot-baseline.sql` if maintained
- [ ] Verify seed data matches reality with Finance/Commercial team

## Follow-ups
- TASK-308: Revenue registration (next priority)
- TASK-309: Serving views + dashboard
- TASK-310: Cost tracking + profitability
- Nomenclature entries in `greenhouse-nomenclature.ts`

## Open Questions
1. Exact list of organizations to seed — need confirmation from Finance/Commercial
2. Navigation placement — top-level "Alianzas" or sub-section under Finance?
