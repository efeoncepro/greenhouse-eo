# TASK-311 — Partner Contacts + Role Label

## Status
- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-307`
- Branch: `task/TASK-311-partnership-contacts-role-label`
- GitHub Issue: `—`

## Summary

Add `role_label` column to `person_memberships`, build the partner contacts management UI within program detail, and create a partner contact directory view. This enables Efeonce to know who to call at each partner organization (Account Manager, Technical Contact, etc.) with named roles.

## Why This Task Exists

With 20+ partnerships, knowing the right contact at each partner org is critical. Today contact information lives in personal knowledge, emails, and spreadsheets. The `person_memberships` table already supports `membership_type = 'partner'` but has no way to describe what role that contact plays in the partnership (Account Manager vs Billing Contact vs Technical Lead).

## Goal
- `role_label` column added to `greenhouse_core.person_memberships`
- Contacts tab in program detail view
- Add/link person to partner org with role label
- Partner contact directory view (all partner contacts across all programs)
- Contacts visible in `partner_program_360` enrichment

## Architecture Alignment
Revisar y respetar:
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.4 — role_label spec
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — person_memberships model
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — don't create parallel identity

Reglas obligatorias:
- `role_label` is free text, NOT an enum — each partnership has unique org structure
- Reuse `person_memberships` with `membership_type = 'partner'` — no new table
- Persons must exist in `identity_profiles` before linking — don't create parallel identity
- `role_label` applies to ALL membership types (generic extension), not just partners

## Normative Docs
- `docs/architecture/GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` §4.4
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `src/lib/account-360/` — existing membership CRUD

## Dependencies & Impact

### Depends on
- `TASK-307` — partner programs (to show contacts tab in detail view)
- `greenhouse_core.person_memberships` table (exists)
- `greenhouse_core.identity_profiles` table (exists)
- Account 360 membership CRUD (exists in `src/lib/account-360/`)

### Blocks / Impacts
- `role_label` column is generic — benefits ALL membership types, not just partners
  - client_contact with role_label "CFO" or "Marketing Director"
  - team_member with role_label "Tech Lead" or "Project Manager"
- TASK-274 (Account 360) — enriched with partner contacts when the org has programs

### Files owned
- `migrations/YYYYMMDD_add-role-label-to-person-memberships.sql`
- `src/views/greenhouse/partnership/ProgramContactsTab.tsx`
- `src/views/greenhouse/partnership/LinkPartnerContactDrawer.tsx`
- `src/views/greenhouse/partnership/PartnerContactDirectoryView.tsx`
- `src/app/(dashboard)/partnership/contacts/page.tsx`

## Current Repo State

### Already exists
- `greenhouse_core.person_memberships` with `membership_type = 'partner'` — schema ready
- `greenhouse_core.identity_profiles` — person identity layer
- Account 360 membership CRUD in `src/lib/account-360/organization-store.ts`
- Person search/autocomplete patterns in existing UIs (shareholder account, team management)

### Gap
- No `role_label` column on `person_memberships`
- No partner contacts UI in partnership module
- No partner contact directory
- No way to describe what a person does within a partnership

## Scope

### Slice 1 — Migration
- Add `role_label TEXT` column to `greenhouse_core.person_memberships`
- Add SQL comment explaining the column purpose
- Regenerate Kysely types
- No constraint — free text by design

### Slice 2 — Contacts Tab in Program Detail
- Contacts tab in Program Detail view
  - List of persons with `membership_type = 'partner'` linked to the program's organization
  - Columns: name, email, role_label, phone, linked since (start_date)
  - Edit role_label inline
  - Remove link (end_date the membership)
- Link Partner Contact drawer
  - Person search (autocomplete from identity_profiles)
  - Role label input (free text with suggestions: Account Manager, Technical Contact, etc.)
  - If person doesn't exist, option to create new identity_profile + membership in one step
  - Organization pre-filled from the program

### Slice 3 — Partner Contact Directory
- New page `/partnership/contacts`
- All persons with `membership_type = 'partner'` across all partner orgs
- Table: person name, email, organization, role_label, programs (via org), phone
- Filters: organization, role_label search, program
- Navigation: add "Contactos" under Alianzas

### Slice 4 — Access Control
- Register view code: `alianzas.contactos`
- Same roles as programs: `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin`

## Out of Scope
- Extending `role_label` usage to other membership types (natural follow-up but not in scope)
- Partner portal / self-service for partner contacts
- Contact activity log (meetings, emails, calls)
- Notifications to partner contacts

## Acceptance Criteria
- [ ] `role_label` column added to `person_memberships`
- [ ] Kysely types regenerated
- [ ] Contacts tab renders in program detail showing partner contacts
- [ ] Link Partner Contact drawer can search persons and assign role_label
- [ ] Role_label is editable inline in contacts list
- [ ] Partner Contact Directory page renders with all partner contacts
- [ ] Directory filterable by organization, role_label, program
- [ ] Access control enforced for `alianzas.contactos`

## Verification
- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: link contacts to a partner program with roles, verify directory

## Closing Protocol
- [ ] Update `GREENHOUSE_PARTNERSHIP_ARCHITECTURE_V1.md` with Delta
- [ ] Update `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` noting `role_label` column addition

## Follow-ups
- Extend `role_label` usage to `client_contact` memberships (e.g., "CFO", "Marketing Director")
- Partner tab in Organization 360 / Account 360 (TASK-274)
- Contact activity tracking (future)
