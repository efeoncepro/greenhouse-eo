# Greenhouse EO — Partnership Module Architecture V1

> **Version:** 1.0
> **Created:** 2026-04-09
> **Audience:** Backend engineers, finance/commercial product owners, agents implementing partnership features
> **Status:** Design — no implementation yet

---

## 1. Purpose

This document defines the architecture for the Partnership module in Greenhouse EO.

Efeonce Group manages 20+ active partnerships across multiple categories (cloud providers, CRM platforms, integration ecosystems, technology vendors) with diverse revenue models (license resale, white label, referral, revenue share, implementation). Partnership revenue is currently untracked in the portal — this module institutionalizes the registration, measurement, and governance of partnerships as a first-class operational domain.

Use this document together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`

---

## 2. Core Thesis

A partnership is a **formalized business relationship** between Efeonce and an external organization, governed by an agreement with defined commercial terms.

Partnerships are NOT:
- A new type of organization — they are a **relationship layer** on top of existing organizations
- A replacement for the provider/supplier model — a partner may also be a supplier, client, or both
- An isolated module — partnership revenue flows into the Finance P&L, costs feed profitability analysis, and contacts reuse the canonical person model

### 2.1 Key Principles

1. **Organization identity is canonical** — the partner org lives in `greenhouse_core.organizations`. The partnership is a relationship record (`partner_programs`), not a mutation of `organization_type`.
2. **Bidirectional** — Efeonce can be a partner OF someone (outbound: HubSpot, Google Cloud) or someone can operate THROUGH Efeonce (inbound: NUA, DDSoft white-label).
3. **Ecosystem hierarchy** — partnerships can derive from parent partnerships (Aircall derives from HubSpot Solutions Partner).
4. **Revenue-first** — the primary operational goal is institutionalizing revenue registration. Profitability and relationship management follow.
5. **Holding-level, cross-BU** — partnerships exist at the Efeonce Group level and can benefit multiple business lines simultaneously.

---

## 3. Domain Model

### 3.1 Entity Relationship Overview

```
greenhouse_core.organizations
    │
    │  1:N
    ▼
greenhouse_partnership.partner_programs ◄── self-FK (parent_program_id)
    │
    │  1:N                    1:N
    ▼                         ▼
partner_revenue_entries    partner_costs
    │                         │
    │  optional FK            │  optional FK
    ▼                         ▼
greenhouse_finance.income  greenhouse_finance.suppliers
```

Contact layer reuses existing model:
```
greenhouse_core.identity_profiles
    │
    │  via person_memberships (membership_type = 'partner', role_label = 'Account Manager')
    ▼
greenhouse_core.organizations (where org has active partner_programs)
```

---

## 4. Schema: `greenhouse_partnership`

Dedicated schema, following the same pattern as `greenhouse_finance`, `greenhouse_hr`, `greenhouse_ai`, etc.

```sql
CREATE SCHEMA IF NOT EXISTS greenhouse_partnership;
```

Ownership: `greenhouse_ops` (consistent with all schemas).

### 4.1 `partner_programs` — The partnership agreement

This is the canonical anchor for a partnership. One organization can have multiple programs (e.g., Google Cloud Partner + Google Workspace Reseller).

```sql
CREATE TABLE greenhouse_partnership.partner_programs (
  program_id              TEXT PRIMARY KEY,
  organization_id         TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  parent_program_id       TEXT REFERENCES greenhouse_partnership.partner_programs(program_id),

  -- Identity
  program_name            TEXT NOT NULL,
  program_code            TEXT UNIQUE,          -- slug for references (e.g., 'hubspot-solutions-partner')

  -- Classification
  direction               TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  partner_category        TEXT NOT NULL CHECK (partner_category IN (
                            'cloud', 'crm', 'integration', 'technology',
                            'agency', 'financial', 'other'
                          )),
  partnership_model       TEXT NOT NULL CHECK (partnership_model IN (
                            'license_resale', 'white_label', 'referral',
                            'revenue_share', 'implementation', 'hybrid'
                          )),
  partnership_tier        TEXT,                  -- 'registered', 'silver', 'gold', 'platinum', 'premier', 'elite', etc.

  -- Lifecycle
  status                  TEXT NOT NULL DEFAULT 'negotiation' CHECK (status IN (
                            'negotiation', 'active', 'suspended', 'terminated', 'expired'
                          )),
  effective_date          DATE NOT NULL,
  expiration_date         DATE,
  renewal_type            TEXT DEFAULT 'manual' CHECK (renewal_type IN ('auto', 'manual', 'none')),

  -- Revenue expectations
  revenue_frequency       TEXT CHECK (revenue_frequency IN (
                            'monthly', 'quarterly', 'semi_annual', 'annual', 'per_event'
                          )),

  -- References
  contract_reference      TEXT,                 -- link or ID of the contract/agreement
  owning_business_unit    TEXT,                 -- primary BU, but cross-BU by nature

  -- Metadata
  notes                   TEXT,
  metadata_json           JSONB DEFAULT '{}',
  created_by              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partner_programs_org ON greenhouse_partnership.partner_programs(organization_id);
CREATE INDEX idx_partner_programs_parent ON greenhouse_partnership.partner_programs(parent_program_id) WHERE parent_program_id IS NOT NULL;
CREATE INDEX idx_partner_programs_status ON greenhouse_partnership.partner_programs(status);
CREATE INDEX idx_partner_programs_direction ON greenhouse_partnership.partner_programs(direction);
```

**ID format:** `ppg-{uuid}` (partner program).

#### Direction semantics

| Direction | Who sells | Who executes | Who invoices the end client | Payment flow |
|---|---|---|---|---|
| `outbound` | Efeonce sells to its clients | Efeonce or vendor | Efeonce | Vendor → Efeonce (commission, margin, rebate) |
| `inbound` | Partner sells to their clients | Efeonce executes | Partner | Partner → Efeonce (execution fee, subcontract) |

**Outbound examples:** HubSpot Solutions Partner, Google Cloud Partner, Salesforce Partner, Azure Partner, Aircall resale, Figma resale, Truora resale.

**Inbound examples:** NUA white-label (NUA sells, Efeonce executes), DDSoft white-label.

#### Ecosystem hierarchy via `parent_program_id`

```
HubSpot Solutions Partner (outbound, license_resale, monthly)
├── Aircall Resale (outbound, license_resale, quarterly)
├── Onesignal Resale (outbound, license_resale, quarterly)
└── Truora Resale (outbound, license_resale, quarterly)

Google Cloud Partner (outbound, hybrid, monthly)
└── (future GCP ecosystem sub-partnerships)

Salesforce Partner (outbound, hybrid, quarterly)

Azure Partner (outbound, hybrid, monthly)

Figma Resale (outbound, license_resale, quarterly)

NUA White Label (inbound, white_label, monthly)
DDSoft White Label (inbound, white_label, monthly)
```

This hierarchy enables consolidated profitability: the HubSpot partnership ROI includes not just direct HubSpot commissions but the entire ecosystem it enables.

### 4.2 `partner_revenue_entries` — Revenue registration (Priority 1)

Append-only revenue ledger per partnership per period.

```sql
CREATE TABLE greenhouse_partnership.partner_revenue_entries (
  entry_id                TEXT PRIMARY KEY,
  program_id              TEXT NOT NULL REFERENCES greenhouse_partnership.partner_programs(program_id),

  -- Period
  period_year             INT NOT NULL,
  period_month            INT NOT NULL,

  -- Classification
  revenue_type            TEXT NOT NULL CHECK (revenue_type IN (
                            'license_fee',
                            'resale_margin',
                            'referral_commission',
                            'implementation_fee',
                            'white_label_margin',
                            'rebate',
                            'incentive',
                            'mdf',
                            'white_label_execution',
                            'subcontract_fee',
                            'other'
                          )),
  description             TEXT,

  -- Amounts
  gross_amount            NUMERIC(14,2) NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'CLP',
  exchange_rate           NUMERIC(14,6),         -- if foreign currency
  amount_clp              NUMERIC(14,2) NOT NULL, -- normalized to CLP

  -- Attribution
  client_id               TEXT,                   -- FK to greenhouse.clients if attributable to a specific client
  business_line_id        TEXT,                   -- BU that benefits from this revenue

  -- Payment tracking
  invoice_reference       TEXT,
  payment_status          TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
                            'pending', 'invoiced', 'received', 'overdue', 'cancelled'
                          )),
  payment_date            DATE,

  -- Bridge to Finance module
  income_id               TEXT,                   -- FK to greenhouse_finance.income if also registered there

  -- Metadata
  notes                   TEXT,
  metadata_json           JSONB DEFAULT '{}',
  created_by              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partner_revenue_program ON greenhouse_partnership.partner_revenue_entries(program_id);
CREATE INDEX idx_partner_revenue_period ON greenhouse_partnership.partner_revenue_entries(period_year, period_month);
CREATE INDEX idx_partner_revenue_status ON greenhouse_partnership.partner_revenue_entries(payment_status);
CREATE INDEX idx_partner_revenue_client ON greenhouse_partnership.partner_revenue_entries(client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX idx_partner_revenue_income_bridge ON greenhouse_partnership.partner_revenue_entries(income_id) WHERE income_id IS NOT NULL;
```

**ID format:** `pre-{uuid}` (partner revenue entry).

#### Revenue type semantics by direction

| Revenue type | Direction | Description |
|---|---|---|
| `license_fee` | outbound | Fee per license sold to client |
| `resale_margin` | outbound | Margin between purchase price and resale price |
| `referral_commission` | outbound | Commission for referring a client to the vendor |
| `implementation_fee` | outbound | Fee Efeonce charges for implementing the vendor's product |
| `white_label_margin` | outbound | Margin when Efeonce resells under own brand |
| `rebate` | outbound | Volume-based rebate from vendor |
| `incentive` | outbound | Performance incentive from vendor program |
| `mdf` | outbound | Market Development Funds from vendor |
| `white_label_execution` | inbound | Fee partner pays Efeonce for executing under their brand |
| `subcontract_fee` | inbound | Fee partner pays for subcontracted services |
| `other` | both | Catch-all for edge cases |

### 4.3 `partner_costs` — Investment tracking (Priority 2)

Tracks what Efeonce invests in each partnership.

```sql
CREATE TABLE greenhouse_partnership.partner_costs (
  cost_id                 TEXT PRIMARY KEY,
  program_id              TEXT NOT NULL REFERENCES greenhouse_partnership.partner_programs(program_id),

  -- Period
  period_year             INT NOT NULL,
  period_month            INT NOT NULL,

  -- Classification
  cost_type               TEXT NOT NULL CHECK (cost_type IN (
                            'certification',
                            'membership_fee',
                            'training',
                            'dedicated_hours',
                            'tooling',
                            'co_marketing',
                            'travel',
                            'event',
                            'infrastructure',
                            'other'
                          )),
  description             TEXT,

  -- Amounts
  amount                  NUMERIC(14,2) NOT NULL,
  currency                TEXT NOT NULL DEFAULT 'CLP',
  exchange_rate           NUMERIC(14,6),
  amount_clp              NUMERIC(14,2) NOT NULL,

  -- Labor attribution
  hours_invested          NUMERIC(8,2),           -- if cost_type = 'dedicated_hours'
  team_member_id          TEXT,                    -- who invested the hours

  -- Supplier attribution
  supplier_id             TEXT,                    -- FK to greenhouse_finance.suppliers

  -- Bridge to Finance module
  expense_id              TEXT,                    -- FK to greenhouse_finance.expenses if also registered there

  -- Metadata
  notes                   TEXT,
  metadata_json           JSONB DEFAULT '{}',
  created_by              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_partner_costs_program ON greenhouse_partnership.partner_costs(program_id);
CREATE INDEX idx_partner_costs_period ON greenhouse_partnership.partner_costs(period_year, period_month);
CREATE INDEX idx_partner_costs_type ON greenhouse_partnership.partner_costs(cost_type);
```

**ID format:** `pco-{uuid}` (partner cost).

### 4.4 Contact layer — Extension of `person_memberships`

No new table. We extend the existing `person_memberships` with a `role_label` column:

```sql
ALTER TABLE greenhouse_core.person_memberships
  ADD COLUMN IF NOT EXISTS role_label TEXT;

COMMENT ON COLUMN greenhouse_core.person_memberships.role_label IS
  'Free-text label describing the contact role within the membership context. '
  'Primary use: partner contacts (Account Manager, Technical Contact, etc.)';
```

When `membership_type = 'partner'` and the organization has active `partner_programs`, `role_label` describes the contact's function:

| role_label | Use case |
|---|---|
| `Account Manager` | Day-to-day relationship manager from the partner side |
| `Executive Sponsor` | C-level or strategic sponsor |
| `Technical Contact` | Integrations, technical support |
| `Billing Contact` | Invoicing and settlements |
| `Sales Contact` | Co-selling, referral management |
| `Partner Manager` | Person at Efeonce who manages this relationship |
| `Support Contact` | Operational support and escalation |

Free text — not an enum. Each partnership has its own org structure; constraining this would create maintenance burden without value.

---

## 5. Serving Views

### 5.1 `partner_program_360` — Consolidated program view

```sql
CREATE VIEW greenhouse_serving.partner_program_360 AS
SELECT
  pp.program_id,
  pp.program_name,
  pp.program_code,
  pp.direction,
  pp.partner_category,
  pp.partnership_model,
  pp.partnership_tier,
  pp.status,
  pp.effective_date,
  pp.expiration_date,
  pp.renewal_type,
  pp.revenue_frequency,
  pp.owning_business_unit,

  -- Organization context
  o.organization_id,
  o.organization_name,
  o.organization_type,

  -- Parent program
  pp.parent_program_id,
  parent.program_name AS parent_program_name,

  -- Revenue summary (all time)
  COALESCE(rev.total_revenue_clp, 0) AS total_revenue_clp,
  COALESCE(rev.entry_count, 0) AS revenue_entry_count,
  rev.last_revenue_period,

  -- Cost summary (all time)
  COALESCE(cost.total_cost_clp, 0) AS total_cost_clp,
  COALESCE(cost.cost_entry_count, 0) AS cost_entry_count,

  -- Profitability
  COALESCE(rev.total_revenue_clp, 0) - COALESCE(cost.total_cost_clp, 0) AS margin_clp,
  CASE
    WHEN COALESCE(rev.total_revenue_clp, 0) > 0
    THEN ROUND(
      (COALESCE(rev.total_revenue_clp, 0) - COALESCE(cost.total_cost_clp, 0))
      / rev.total_revenue_clp * 100, 2
    )
  END AS margin_percent,
  CASE
    WHEN COALESCE(cost.total_cost_clp, 0) > 0
    THEN ROUND(rev.total_revenue_clp / cost.total_cost_clp, 2)
  END AS roi_ratio,

  -- Contact count
  COALESCE(contacts.contact_count, 0) AS contact_count,

  -- Ecosystem
  COALESCE(children.child_count, 0) AS child_program_count,

  pp.notes,
  pp.created_at,
  pp.updated_at

FROM greenhouse_partnership.partner_programs pp
JOIN greenhouse_core.organizations o ON o.organization_id = pp.organization_id
LEFT JOIN greenhouse_partnership.partner_programs parent ON parent.program_id = pp.parent_program_id
LEFT JOIN LATERAL (
  SELECT
    SUM(amount_clp) AS total_revenue_clp,
    COUNT(*) AS entry_count,
    MAX(period_year * 100 + period_month) AS last_revenue_period
  FROM greenhouse_partnership.partner_revenue_entries
  WHERE program_id = pp.program_id
) rev ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(amount_clp) AS total_cost_clp,
    COUNT(*) AS cost_entry_count
  FROM greenhouse_partnership.partner_costs
  WHERE program_id = pp.program_id
) cost ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS contact_count
  FROM greenhouse_core.person_memberships pm
  WHERE pm.organization_id = pp.organization_id
    AND pm.membership_type = 'partner'
    AND pm.end_date IS NULL
) contacts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS child_count
  FROM greenhouse_partnership.partner_programs child
  WHERE child.parent_program_id = pp.program_id
) children ON true;
```

### 5.2 `partner_revenue_summary` — Period aggregation

```sql
CREATE VIEW greenhouse_serving.partner_revenue_summary AS
SELECT
  pp.program_id,
  pp.program_name,
  pp.direction,
  pp.partner_category,
  pp.parent_program_id,
  o.organization_name,
  pre.period_year,
  pre.period_month,
  pre.revenue_type,
  COUNT(*) AS entry_count,
  SUM(pre.amount_clp) AS total_clp,
  SUM(CASE WHEN pre.payment_status = 'received' THEN pre.amount_clp ELSE 0 END) AS received_clp,
  SUM(CASE WHEN pre.payment_status = 'pending' THEN pre.amount_clp ELSE 0 END) AS pending_clp,
  SUM(CASE WHEN pre.payment_status = 'overdue' THEN pre.amount_clp ELSE 0 END) AS overdue_clp
FROM greenhouse_partnership.partner_revenue_entries pre
JOIN greenhouse_partnership.partner_programs pp ON pp.program_id = pre.program_id
JOIN greenhouse_core.organizations o ON o.organization_id = pp.organization_id
GROUP BY pp.program_id, pp.program_name, pp.direction, pp.partner_category,
         pp.parent_program_id, o.organization_name,
         pre.period_year, pre.period_month, pre.revenue_type;
```

### 5.3 `partner_profitability` — Revenue vs Cost

```sql
CREATE VIEW greenhouse_serving.partner_profitability AS
WITH revenue AS (
  SELECT program_id, period_year, period_month,
         SUM(amount_clp) AS revenue_clp
  FROM greenhouse_partnership.partner_revenue_entries
  GROUP BY program_id, period_year, period_month
),
costs AS (
  SELECT program_id, period_year, period_month,
         SUM(amount_clp) AS cost_clp,
         SUM(hours_invested) AS total_hours
  FROM greenhouse_partnership.partner_costs
  GROUP BY program_id, period_year, period_month
)
SELECT
  pp.program_id,
  pp.program_name,
  pp.direction,
  pp.partner_category,
  pp.parent_program_id,
  o.organization_name,
  COALESCE(r.period_year, c.period_year) AS period_year,
  COALESCE(r.period_month, c.period_month) AS period_month,
  COALESCE(r.revenue_clp, 0) AS revenue_clp,
  COALESCE(c.cost_clp, 0) AS cost_clp,
  COALESCE(r.revenue_clp, 0) - COALESCE(c.cost_clp, 0) AS margin_clp,
  CASE
    WHEN COALESCE(r.revenue_clp, 0) > 0
    THEN ROUND(
      (COALESCE(r.revenue_clp, 0) - COALESCE(c.cost_clp, 0))
      / r.revenue_clp * 100, 2
    )
  END AS margin_percent,
  COALESCE(c.total_hours, 0) AS hours_invested
FROM greenhouse_partnership.partner_programs pp
JOIN greenhouse_core.organizations o ON o.organization_id = pp.organization_id
LEFT JOIN revenue r ON r.program_id = pp.program_id
LEFT JOIN costs c ON c.program_id = pp.program_id
  AND c.period_year = r.period_year
  AND c.period_month = r.period_month
WHERE r.program_id IS NOT NULL OR c.program_id IS NOT NULL;
```

### 5.4 Ecosystem-level profitability

For consolidated reporting (HubSpot + all child programs), consumers query `partner_profitability` with:

```sql
WHERE program_id = :root_program_id
   OR program_id IN (
     SELECT program_id FROM greenhouse_partnership.partner_programs
     WHERE parent_program_id = :root_program_id
   )
```

This is intentionally a query pattern, not a materialized view — the tree is shallow (max 2 levels) and the dataset is small (20-30 programs).

---

## 6. Integration with Existing Modules

### 6.1 Finance Module — P&L Bridge

Partnership revenue must appear in the Finance P&L. Two strategies:

**Option A — Dual entry (recommended for Phase 1):**
When registering a partner revenue entry, optionally also create a corresponding `greenhouse_finance.income` record. The `partner_revenue_entries.income_id` links back. This leverages the existing P&L engine, payment tracking, and reconciliation without changes.

**Option B — Direct aggregation (future):**
The P&L query directly aggregates from `partner_revenue_entries` as a separate revenue line item. Requires P&L engine changes.

Phase 1 uses Option A. The `income_id` bridge enables migration to Option B later without data loss.

The existing `income.partner_share_*` columns (`partner_id`, `partner_name`, `partner_share_percent`, `partner_share_amount`, `net_after_partner`) remain functional but are **supplementary** to the Partnership module. They capture the partner's cut at the income level; the Partnership module captures the full relationship, revenue streams, costs, and profitability.

### 6.2 Business Lines — Cross-BU Attribution

`partner_revenue_entries.business_line_id` allows attributing revenue to a specific BU. Since partnerships are holding-level, a single program can generate revenue entries attributed to different BUs.

Example: HubSpot Solutions Partner generates:
- License resale revenue → attributed to `crm_solutions` BU
- Implementation fees → attributed to `globe` BU or `wave` BU depending on who executes

### 6.3 Account 360 — Organization enrichment

When an organization has active `partner_programs`, the Account/Organization 360 view should include a "Partnership" facet showing:
- Active programs with the org
- Revenue history
- Key contacts (`membership_type = 'partner'`)

This follows the existing facet pattern in `src/lib/person-360/facets/` and the planned Account 360 (TASK-274).

### 6.4 Commercial Cost Attribution

For `outbound` partnerships where revenue is attributable to a client (`client_id` on revenue entries), this data can feed `commercial_cost_attribution` to enrich client-level margin analysis with partnership-derived revenue.

### 6.5 Outbox Events

Following the event catalog pattern (`docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`):

| Event | Trigger |
|---|---|
| `partnership.program.created` | New partner program registered |
| `partnership.program.status_changed` | Status transitions (negotiation → active, etc.) |
| `partnership.revenue.recorded` | New revenue entry created |
| `partnership.revenue.payment_received` | Payment status → received |
| `partnership.cost.recorded` | New cost entry created |

These events enable reactive projections (e.g., rematerialize partner_program_360 on revenue/cost changes).

---

## 7. API Design

### 7.1 Routes

```
/api/partnership/programs
  GET    — List programs (filters: status, direction, category, parent)
  POST   — Create program

/api/partnership/programs/[programId]
  GET    — Program detail (with 360 summary)
  PATCH  — Update program
  DELETE — Soft delete (status → terminated)

/api/partnership/programs/[programId]/revenue
  GET    — Revenue entries for program (filters: period, type, status)
  POST   — Register revenue entry

/api/partnership/programs/[programId]/revenue/[entryId]
  GET    — Entry detail
  PATCH  — Update entry (e.g., payment status)

/api/partnership/programs/[programId]/costs
  GET    — Cost entries for program
  POST   — Register cost entry

/api/partnership/programs/[programId]/costs/[costId]
  PATCH  — Update cost entry

/api/partnership/dashboard
  GET    — Aggregated dashboard data (total revenue, top partners, overdue, etc.)

/api/partnership/dashboard/profitability
  GET    — Profitability data (per program, per period)
```

### 7.2 Access Control

Following Greenhouse identity model (`docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`):

| View code | Access |
|---|---|
| `alianzas.programas` | `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin` |
| `alianzas.ingresos` | `efeonce_admin`, `finance_admin`, `finance_analyst` |
| `alianzas.costos` | `efeonce_admin`, `finance_admin` |
| `alianzas.rentabilidad` | `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin` |
| `alianzas.dashboard` | `efeonce_admin`, `finance_admin`, `finance_analyst`, `commercial_admin` |

Future `partnership_manager` role can be added when the dedicated position exists.

---

## 8. UI Surfaces

### 8.1 Navigation

Under main nav, new section **Alianzas** (or under Finance as a sub-section — TBD based on UX review):

```
Alianzas
├── Dashboard          — KPIs, top partners, revenue trend, overdue alerts
├── Programas          — List/detail of all partnership programs
├── Ingresos           — Revenue registration and tracking
├── Costos             — Cost tracking (Phase 2)
└── Rentabilidad       — Profitability analysis (Phase 2)
```

### 8.2 Dashboard KPIs

| KPI | Formula |
|---|---|
| Revenue total (periodo) | SUM(amount_clp) for current period |
| Revenue acumulado (YTD) | SUM(amount_clp) for current year |
| Partners activos | COUNT(programs WHERE status = 'active') |
| Revenue pendiente | SUM(amount_clp) WHERE payment_status IN ('pending', 'overdue') |
| Top partner (periodo) | Program with highest revenue in current period |
| Margen promedio | AVG(margin_percent) across active programs (Phase 2) |
| ROI promedio | AVG(roi_ratio) across active programs (Phase 2) |

### 8.3 Key Views

**Programs list:** TanStack table with filters by status, direction, category. Shows org name, model, tier, status, revenue summary, margin (Phase 2).

**Program detail:** Header with program identity + org context. Tabs: Overview, Revenue, Costs (P2), Contacts (P3). Overview shows the 360 summary.

**Revenue registration:** Form or drawer to register revenue entries. Fields: program (select), period, revenue type, amount, currency, client (optional), BU (optional), payment status.

**Profitability view (Phase 2):** Table with program × period showing revenue, cost, margin, ROI. Chart with trend over time. Ecosystem rollup for parent programs.

---

## 9. Implementation Phases

### Phase 1 — Revenue Registration (Priority)

**Goal:** Efeonce can register, track, and report partnership revenue.

Scope:
- Schema `greenhouse_partnership` creation
- Table `partner_programs` with full structure
- Table `partner_revenue_entries` with full structure
- View `partner_program_360` (revenue-only, no cost data yet)
- View `partner_revenue_summary`
- API: programs CRUD + revenue CRUD + dashboard
- UI: Programs list + Program detail + Revenue registration + Dashboard (revenue KPIs)
- Seed initial programs for existing partnerships (HubSpot, Google, Salesforce, Azure, etc.)
- Bridge to `greenhouse_finance.income` via `income_id`
- Outbox events for programs and revenue
- Access control registration
- Navigation entry

### Phase 2 — Profitability

**Goal:** Efeonce can measure ROI per partnership.

Scope:
- Table `partner_costs` with full structure
- View `partner_profitability`
- Extend `partner_program_360` with cost and margin data
- API: costs CRUD + profitability dashboard
- UI: Costs tab in program detail + Profitability view + margin KPIs
- Ecosystem-level consolidated profitability

### Phase 3 — Relationship & Contacts

**Goal:** Structured partner contact directory with named roles.

Scope:
- `role_label` column on `person_memberships`
- Partner contacts management in program detail (link persons with role_label)
- Partner tab in Organization 360 / Account 360
- Contact directory view filtered by partner orgs

### Phase 4 — Automation & Intelligence

**Goal:** Proactive alerts and advanced reporting.

Scope:
- Renewal alerts (program expiring within N days)
- Missing revenue alerts (no entry registered for expected period based on `revenue_frequency`)
- Overdue payment alerts
- Trend analysis and forecasting
- Consolidated BU-level partnership revenue reporting
- Optional: partnership pipeline for prospective partnerships

---

## 10. Open Design Questions

1. **Navigation placement:** Should Alianzas be a top-level nav section or a sub-section under Finance? The module serves both Finance and Commercial teams.

2. **Revenue ↔ Income dual entry:** In Phase 1, should revenue registration automatically create an `income` record in Finance, or should this be a manual step? Automatic is cleaner operationally but creates coupling.

3. **Historical backfill:** Do we need to backfill historical partnership revenue from before the module exists? If so, what's the source of truth (spreadsheets, HubSpot, manual)?

4. **Multi-currency normalization:** Should `amount_clp` use the economic indicator sync already in Finance (`resolveExchangeRateToClp`), or is a simpler manual exchange rate sufficient for partnerships?

5. **Cost allocation from existing expenses:** Should `partner_costs.expense_id` bridge to existing `greenhouse_finance.expenses` (same pattern as revenue → income), or are partnership costs always registered independently?

6. **Ecosystem depth:** Current model supports 2 levels (parent → child). Is this sufficient, or could there be deeper hierarchies (parent → child → grandchild)?

---

## 11. Non-Negotiable Rules

1. **No parallel organization identity.** The partner organization lives in `greenhouse_core.organizations`. The partnership is a relationship record, not a new org entity.
2. **No mutation of `organization_type` enum.** The existence of an active `partner_program` is what defines a partner. An org can be a supplier AND a partner without type conflict.
3. **Revenue entries are append-only.** Corrections create new entries with negative amounts or adjusting entries, not mutations of existing records.
4. **Bridge, don't duplicate.** Partnership revenue links to Finance income via `income_id`. It does not duplicate the financial transaction. Same for costs → expenses via `expense_id`.
5. **Holding-level ownership.** Partnerships belong to Efeonce Group, not to a specific BU. Individual revenue entries can be attributed to BUs.
6. **Schema isolation.** All partnership tables live in `greenhouse_partnership`. No new columns on `greenhouse_finance` or `greenhouse_core` tables except `role_label` on `person_memberships`.

---

## Appendix A: Nomenclature Additions

Entries to add to `src/config/greenhouse-nomenclature.ts`:

```typescript
// Partnership module
partnership_programs: 'Programas de Partnership',
partnership_revenue: 'Ingresos de Partnership',
partnership_costs: 'Costos de Partnership',
partnership_profitability: 'Rentabilidad de Partnership',
partnership_dashboard: 'Dashboard de Alianzas',

// Partner categories
partner_category_cloud: 'Cloud',
partner_category_crm: 'CRM',
partner_category_integration: 'Integración',
partner_category_technology: 'Tecnología',
partner_category_agency: 'Agencia',
partner_category_financial: 'Financiero',

// Partnership models
partnership_model_license_resale: 'Reventa de Licencias',
partnership_model_white_label: 'White Label',
partnership_model_referral: 'Referral',
partnership_model_revenue_share: 'Revenue Share',
partnership_model_implementation: 'Implementación',
partnership_model_hybrid: 'Híbrido',

// Direction
partnership_direction_outbound: 'Efeonce como Partner',
partnership_direction_inbound: 'Partner de Efeonce',
```

## Appendix B: Seed Data — Known Partnerships

Initial programs to seed on Phase 1 deployment:

| Organization | Program | Direction | Category | Model | Frequency |
|---|---|---|---|---|---|
| HubSpot | HubSpot Solutions Partner | outbound | crm | license_resale | monthly |
| Salesforce | Salesforce Partner | outbound | crm | hybrid | quarterly |
| Google Cloud | Google Cloud Partner | outbound | cloud | hybrid | monthly |
| Microsoft | Azure Partner | outbound | cloud | hybrid | monthly |
| Aircall | Aircall Resale | outbound | integration | license_resale | quarterly |
| Onesignal | Onesignal Resale | outbound | integration | license_resale | quarterly |
| Truora | Truora Resale | outbound | integration | license_resale | quarterly |
| Figma | Figma Resale | outbound | technology | license_resale | quarterly |
| NUA | NUA White Label | inbound | agency | white_label | monthly |
| DDSoft | DDSoft White Label | inbound | agency | white_label | monthly |

*This list is illustrative. Complete seed data to be confirmed with Finance/Commercial before deployment.*
