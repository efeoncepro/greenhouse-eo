# Account 360 — Implementation Guide

**Version 1.0 — March 2026**

## Overview

Account 360 extends the Greenhouse 360 pattern to client-side entities: organizations, spaces (tenant operativo), and person memberships. It provides a unified view of B2B relationships across all systems (HubSpot CRM, Notion, Auth, Finance).

### Object Hierarchy

```
Organization (EO-ORG-XXXX)
  └── Space (EO-SPC-XXXX) — tenant operativo, linked to greenhouse_core.clients
        └── Person Membership (EO-MBR-XXXX) — links Identity Profile to Organization
              └── Identity Profile (EO-IDNNNN) — canonical person record
```

---

## Database Schema

### Core Tables

All tables live in `greenhouse_core` schema, owned by `migrator` role.

#### `organizations`
| Column | Type | Notes |
|--------|------|-------|
| organization_id | TEXT PK | `org-{uuid}` |
| public_id | TEXT UNIQUE | `EO-ORG-XXXX` (auto via sequence) |
| organization_name | TEXT NOT NULL | Display name |
| legal_name | TEXT | Razón social |
| tax_id / tax_id_type | TEXT | RUT, NIT, etc. |
| industry / country | TEXT | Segmentation |
| hubspot_company_id | TEXT | CRM FK |
| status | TEXT | active, inactive, prospect, churned |
| active | BOOLEAN | Soft delete flag |

#### `spaces`
| Column | Type | Notes |
|--------|------|-------|
| space_id | TEXT PK | `spc-{uuid}` |
| public_id | TEXT UNIQUE | `EO-SPC-XXXX` (auto via sequence) |
| organization_id | TEXT FK → organizations | Parent org |
| space_name | TEXT NOT NULL | Display name |
| space_type | TEXT | client_managed, internal_ops, sandbox |
| client_id | TEXT FK → clients | Links to existing tenant system |
| status | TEXT | active, inactive |

#### `person_memberships`
| Column | Type | Notes |
|--------|------|-------|
| membership_id | TEXT PK | `mbr-{uuid}` |
| public_id | TEXT UNIQUE | `EO-MBR-XXXX` (auto via sequence) |
| profile_id | TEXT FK → identity_profiles | The person |
| organization_id | TEXT FK → organizations | The org |
| space_id | TEXT FK → spaces | Optional space scope |
| membership_type | TEXT | team_member, client_user, contact, billing |
| role_label / department | TEXT | Human-readable role |
| is_primary | BOOLEAN | Primary contact flag |
| status / active | TEXT / BOOLEAN | Lifecycle |

### Serving View

`greenhouse_serving.organization_360` — denormalized read view for the API layer:

```sql
SELECT
  o.*,
  COUNT(DISTINCT s.space_id) AS space_count,
  COUNT(DISTINCT pm.membership_id) AS membership_count,
  COUNT(DISTINCT pm.profile_id) AS unique_person_count,
  json_agg(DISTINCT jsonb_build_object('spaceId', s.space_id, ...)) AS spaces,
  json_agg(DISTINCT jsonb_build_object('membershipId', pm.membership_id, ...)) AS people
FROM greenhouse_core.organizations o
LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id
LEFT JOIN greenhouse_core.person_memberships pm ON pm.organization_id = o.organization_id
GROUP BY o.organization_id
```

### Finance Bridge

`greenhouse_finance.client_profiles.organization_id` — FK to organizations, backfilled via `spaces.client_id`. Enables cross-entity finance queries.

---

## API Endpoints

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/organizations` | GET | internal | Paginated list with search/filter |
| `/api/organizations/[id]` | GET, PUT | GET: internal, PUT: admin | Detail + update |
| `/api/organizations/[id]/memberships` | GET, POST | GET: internal, POST: admin | Org memberships |
| `/api/people/[memberId]/memberships` | GET | internal | Person's org memberships |

### Query Parameters (GET /api/organizations)

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| page | number | 1 | Page number |
| pageSize | number | 50 | Max 200 |
| search | string | — | ILIKE on name, legal_name, public_id |
| status | string | all | Filter by status |

### Response Format

```json
{
  "items": [{ "organizationId": "org-...", "publicId": "EO-ORG-0001", ... }],
  "total": 11,
  "page": 1,
  "pageSize": 50
}
```

---

## Store Layer

`src/lib/account-360/organization-store.ts` — server-only module.

| Function | Returns |
|----------|---------|
| `getOrganizationList({ page, pageSize, search, status })` | Paginated list from `organization_360` view |
| `getOrganizationDetail(id)` | Single org with spaces + people arrays |
| `updateOrganization(id, data)` | Dynamic UPDATE on core table |
| `getOrganizationMemberships(orgId)` | People linked to org |
| `createMembership(input)` | INSERT with auto-generated IDs |
| `getPersonMemberships(profileId)` | Orgs linked to person |

---

## Frontend Views

### Organization List (`/agency/organizations`)

- **Component**: `OrganizationListView.tsx`
- **Pattern**: Server-side pagination via API, debounced search
- **KPI row**: Total orgs, spaces, memberships, unique people
- **Table**: Name (link), public_id, country, status chip, space_count, person_count, industry
- **Pagination**: MUI TablePagination with rows-per-page selector

### Organization Detail (`/agency/organizations/[id]`)

- **Component**: `OrganizationView.tsx` — Grid 4/8 split
- **Left sidebar** (`OrganizationLeftSidebar.tsx`):
  - Avatar with initial, name, industry, status chip, country
  - Stats: spaces, memberships, people
  - Fiscal section: legal name, tax ID
  - Identifiers: public_id, HubSpot ID
  - Notes (if any)
- **Tabs** (`OrganizationTabs.tsx`):
  - URL-driven via `?tab=` query param
  - **Resumen**: Spaces table with type, status, client_id links
  - **Personas**: Fetches memberships from API, shows name, type, role, primary flag
  - **Finanzas**: Placeholder for finance bridge integration

### Person 360 Memberships Tab

- **Tab**: "Organizaciones" in Person 360 tabs
- **Component**: `PersonMembershipsTab.tsx`
- **Data**: Fetches from `/api/people/[memberId]/memberships`
- **Table**: Organization name (link to detail), membership type, role, primary flag
- **Permissions**: Visible to `efeonce_admin` and `efeonce_operations`

### Navigation

"Organizaciones" added to agency section in sidebar (`VerticalMenu.tsx`), with icon `tabler-building-community`.

---

## Scripts

### Identity Reconciliation (`scripts/reconcile-identity-profiles.ts`)

Fixes the gap where `client_users.identity_profile_id` is NULL because BigQuery doesn't have the link populated.

**Logic**:
1. Find `client_users WHERE identity_profile_id IS NULL AND active = TRUE`
2. Match by email against `identity_profiles.canonical_email`
3. Match found → UPDATE `client_users.identity_profile_id`
4. No match → INSERT new `identity_profile` (trigger auto-assigns serial + public_id)
5. For each reconciled user → create `person_membership` via space lookup

**Run**: `npx tsx scripts/reconcile-identity-profiles.ts`

### Finance Bridge (`scripts/setup-postgres-finance-bridge-m33.ts`)

Adds `organization_id` FK column to `greenhouse_finance.client_profiles` and backfills via `spaces.client_id` JOIN.

**Run**: `npx tsx scripts/setup-postgres-finance-bridge-m33.ts`

---

## ID Generation

| Entity | Format | Generator |
|--------|--------|-----------|
| Organization | `org-{uuid}` | `crypto.randomUUID()` |
| Space | `spc-{uuid}` | `crypto.randomUUID()` |
| Membership | `mbr-{uuid}` | `generateMembershipId()` |
| Identity Profile | `identity-{system}-{type}-{id}` | `buildIdentityProfileId()` |
| Public IDs | `EO-ORG-XXXX`, `EO-SPC-XXXX`, `EO-MBR-XXXX` | PostgreSQL sequences via `nextPublicId()` |

---

## Migration History

| Migration | Script | Profile | Status |
|-----------|--------|---------|--------|
| M0: DDL (tables, sequences, triggers) | `setup-postgres-account-360-m0.ts` | migrator | Deployed |
| M1: Backfill orgs + spaces from clients | `backfill-account-360-m1.ts` | migrator | Deployed |
| M2: Backfill memberships from CRM contacts | `backfill-account-360-m2.ts` | migrator | Deployed |
| M3: Organization 360 serving view | `setup-postgres-organization-360.ts` | migrator | Deployed |
| M3.3: Finance bridge | `setup-postgres-finance-bridge-m33.ts` | admin | Deployed |
| Reconciliation: Identity profiles | `reconcile-identity-profiles.ts` | migrator | Deployed |

---

## Verification

```bash
# Table counts
npx tsx scripts/verify-account-360.ts

# API check
curl -s localhost:3000/api/organizations | jq '.total'
curl -s localhost:3000/api/organizations/{org-id} | jq '.organizationName'

# Finance bridge
psql -c "SELECT count(*) FROM greenhouse_finance.client_profiles WHERE organization_id IS NOT NULL"
```

---

## File Inventory

### New Files (28)

| File | Layer | Purpose |
|------|-------|---------|
| `scripts/reconcile-identity-profiles.ts` | Script | Identity reconciliation |
| `scripts/setup-postgres-finance-bridge-m33.sql` | Script | Finance bridge DDL |
| `scripts/setup-postgres-finance-bridge-m33.ts` | Script | Finance bridge runner |
| `src/lib/account-360/organization-store.ts` | Backend | Store layer (CRUD) |
| `src/app/api/organizations/route.ts` | API | Organization list |
| `src/app/api/organizations/[id]/route.ts` | API | Organization detail + update |
| `src/app/api/organizations/[id]/memberships/route.ts` | API | Org memberships |
| `src/app/api/people/[memberId]/memberships/route.ts` | API | Person memberships |
| `src/app/(dashboard)/agency/organizations/page.tsx` | Page | List page route |
| `src/app/(dashboard)/agency/organizations/[id]/page.tsx` | Page | Detail page route |
| `src/views/greenhouse/organizations/OrganizationListView.tsx` | View | List with table + KPIs |
| `src/views/greenhouse/organizations/OrganizationView.tsx` | View | Detail layout |
| `src/views/greenhouse/organizations/OrganizationLeftSidebar.tsx` | View | Sidebar card |
| `src/views/greenhouse/organizations/OrganizationTabs.tsx` | View | Tab container |
| `src/views/greenhouse/organizations/types.ts` | View | TypeScript types |
| `src/views/greenhouse/organizations/tabs/OrganizationOverviewTab.tsx` | View | Spaces tab |
| `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx` | View | People tab |
| `src/views/greenhouse/organizations/tabs/OrganizationFinanceTab.tsx` | View | Finance placeholder |
| `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx` | View | Person orgs tab |

### Modified Files (7)

| File | Change |
|------|--------|
| `src/types/people.ts` | Added `'memberships'` to PersonTab |
| `src/views/greenhouse/people/helpers.ts` | Tab config + permissions for memberships |
| `src/views/greenhouse/people/PersonTabs.tsx` | TabPanel for memberships |
| `src/lib/people/permissions.ts` | `canViewMemberships` access control |
| `src/lib/people/get-people-meta.ts` | `'memberships'` in supportedTabs |
| `src/components/layout/vertical/VerticalMenu.tsx` | Organizaciones nav item |
| `src/config/greenhouse-nomenclature.ts` | `organizations` in GH_AGENCY_NAV |
