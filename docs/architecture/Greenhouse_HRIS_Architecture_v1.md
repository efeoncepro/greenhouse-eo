# Greenhouse HRIS Architecture V1

## Purpose

This document defines the architecture of the Human Resource Information System (HRIS) embedded in Greenhouse EO. It establishes the contract type taxonomy, module composition, data model extensions, navigation structure, and phased implementation roadmap.

Any agent, engineer, or contributor working on HR-related modules should:
- read this document before changing HR schemas, routes, types, or payroll logic
- treat this document as the authoritative source when it conflicts with earlier CODEX TASKs
- update this document when architecture-changing HR work lands

Use together with:
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — RBAC, roles, route groups
- `GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — canonical schemas and serving views
- `GREENHOUSE_ARCHITECTURE_V1.md` — master architecture reference
- `Greenhouse_Nomenclatura_Portal_v3.md` — design tokens, labels, constants
- `CODEX_TASK_HR_Core_Module.md` — HR Core implementation spec
- `CODEX_TASK_HR_Payroll_Module_v2.md` — Payroll implementation spec

## Status

This is the target HRIS architecture. Phases 0A (HR Core) and 0B (Payroll) are already specified in CODEX TASKs and partially implemented. Phases 1–3 are defined here at architecture level; each will produce its own CODEX TASK(s) when implementation begins.

---

## 1. HRIS scope within Greenhouse

Greenhouse HRIS is an internal operations module — it serves Efeonce Group's own team, not clients. It lives under two route groups:

- **`my`** (route prefix `/my/*`) — collaborator self-service. Every Efeonce internal user with the `collaborator` role sees their own HR data.
- **`hr`** (route prefix `/hr/*`) — HR management. Users with `hr_manager`, `hr_payroll`, or `efeonce_admin` roles manage team-wide HR data.

The HRIS does not replace external providers (Deel for international payroll, Nubox for Chilean tax reporting). It is the operational layer that consolidates people data, tracks workflows, and feeds Finance and People 360 modules.

### What the HRIS owns

- Contract and compensation lifecycle per collaborator
- Leave management with approval workflows
- Attendance tracking (Teams webhook integration)
- Organizational structure (departments, reporting hierarchy)
- Collaborator profiles (personal data, professional profile, performance history)
- Document vault (contracts, certificates, compliance docs)
- Onboarding and offboarding checklists
- Expense reports with approval workflows
- Goals and OKRs
- Performance evaluation cycles (360°)

### What the HRIS does NOT own

- Operational task assignment → Notion (system of work)
- ICO metric calculation → BigQuery ICO Engine (scheduled queries)
- Client-facing delivery → Spaces, Capabilities, Creative Hub modules
- Financial accounting → Finance Module
- Identity and access → `greenhouse_core` (canonical identity graph)
- International payroll execution → Deel
- Chilean tax reporting → Nubox (future integration)

---

## 2. Contract type taxonomy

### 2.1 The problem with the current model

The current model has three separate fields that partially overlap:

| Field | Location | Values | Governs |
|---|---|---|---|
| `employment_type` | `greenhouse_core.members` | `full_time`, `part_time`, `contractor` | Jornada (work schedule) |
| `contract_type` | `greenhouse_payroll.compensation_versions` | `indefinido`, `plazo_fijo` | Chilean legal deductions (cesantía rate) |
| `pay_regime` | `greenhouse_payroll.compensation_versions` | `chile`, `international` | Whether Chilean deductions apply |

This fails to capture:
- Honorarios Chile (civil contract, not labor — different tax treatment)
- The distinction between Deel contractors and Deel EOR
- Whether a contractor participates in daily operations (schedule required)
- Which payroll system handles the payment (Greenhouse internal vs. Deel)

### 2.2 Canonical contract type model

The contract type is a property of the collaborator, not of a single compensation version. It lives in `greenhouse_core.members` as the authoritative field. `compensation_versions` snapshots it for auditability.

**Five contract types:**

| contract_type | pay_regime | payroll_via | Legal framework | Who calculates payroll |
|---|---|---|---|---|
| `indefinido` | `chile` | `internal` | Código del Trabajo — contrato indefinido | Greenhouse (AFP + salud + cesantía 0.6% + impuesto) |
| `plazo_fijo` | `chile` | `internal` | Código del Trabajo — contrato a plazo fijo (max 1 año, 2 si profesional) | Greenhouse (AFP + salud + cesantía 3% + impuesto) |
| `honorarios` | `chile` | `internal` | Código Civil — prestación de servicios. Emite boleta de honorarios | Greenhouse (bruto → retención SII 14.5% → neto) |
| `contractor` | `international` | `deel` | Deel contractor agreement — civil/commercial contract under local law | Deel (Greenhouse registers amount only) |
| `eor` | `international` | `deel` | Deel EOR — Deel is legal employer, Efeonce directs work | Deel (Greenhouse registers amount only) |

### 2.3 Fields added to `greenhouse_core.members`

```sql
-- Contract classification
contract_type       VARCHAR(20) NOT NULL DEFAULT 'indefinido'
  -- CHECK (contract_type IN ('indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'))
pay_regime          VARCHAR(20) NOT NULL DEFAULT 'chile'
  -- CHECK (pay_regime IN ('chile', 'international'))
payroll_via         VARCHAR(20) NOT NULL DEFAULT 'internal'
  -- CHECK (payroll_via IN ('internal', 'deel'))
schedule_required   BOOLEAN NOT NULL DEFAULT TRUE
deel_contract_id    TEXT  -- Deel contract identifier (null for non-Deel)
contract_end_date   DATE  -- Required for plazo_fijo; optional for others
```

### 2.4 Derivation rules

| If contract_type = | Then pay_regime must be | Then payroll_via must be |
|---|---|---|
| `indefinido` | `chile` | `internal` |
| `plazo_fijo` | `chile` | `internal` |
| `honorarios` | `chile` | `internal` |
| `contractor` | `international` | `deel` |
| `eor` | `international` | `deel` |

These derivations are enforced at the API layer, not at the database constraint level, to allow future flexibility (e.g., a Chilean contractor paid via Deel, or an international EOR paid internally if Efeonce opens a local entity).

### 2.5 `schedule_required` semantics

This field determines whether a collaborator appears in attendance tracking (Teams webhook, daily dashboard, team calendar).

| contract_type | schedule_required default | Override allowed |
|---|---|---|
| `indefinido` | `true` | No (labor law requires attendance) |
| `plazo_fijo` | `true` | No |
| `honorarios` | `false` | Yes — set to `true` if they participate in dailies |
| `contractor` | `false` | Yes — set to `true` if assigned to a project with daily sync |
| `eor` | `false` | Yes — set to `true` if integrated into operational team |

### 2.6 Payroll calculation branches

The payroll calculator (`calculate-payroll.ts`) has three branches:

**Branch 1: Chile laboral** (`contract_type IN ('indefinido', 'plazo_fijo')`)
- Renta imponible = base_salary + bonuses
- AFP deduction = renta_imponible × afp_rate
- Salud deduction = renta_imponible × 7% (Fonasa) or UF plan (Isapre)
- Seguro cesantía = renta_imponible × rate (0.6% indefinido, 3% plazo fijo)
- Impuesto único = manual input by HR (MVP)
- Asignación teletrabajo = non-taxable addition
- Net = gross - deductions + non-taxable additions

**Branch 2: Honorarios Chile** (`contract_type = 'honorarios'`)
- Bruto = agreed fee amount
- Retención SII = bruto × 14.5% (2025 rate, increasing to 17% by 2028)
- Net = bruto - retención
- No AFP, no salud, no cesantía
- No vacaciones legales, no indemnización

**Branch 3: International via Deel** (`payroll_via = 'deel'`)
- Greenhouse records: agreed USD amount, bonus (if any)
- No deduction calculation — Deel handles compliance
- Entry created with `kpi_data_source: 'external'` if KPIs are tracked
- `deel_contract_id` links to Deel for reference

### 2.7 TypeScript types (updated)

```typescript
// src/types/hr-contracts.ts

export type ContractType = 'indefinido' | 'plazo_fijo' | 'honorarios' | 'contractor' | 'eor'
export type PayRegime = 'chile' | 'international'
export type PayrollVia = 'internal' | 'deel'

export interface MemberContractInfo {
  contract_type: ContractType
  pay_regime: PayRegime
  payroll_via: PayrollVia
  schedule_required: boolean
  deel_contract_id: string | null
  contract_end_date: string | null  // ISO date, required if plazo_fijo
}
```

---

## 3. Module inventory

### 3.1 Existing modules (Phase 0)

| Module | CODEX TASK | PostgreSQL schema | Status |
|---|---|---|---|
| HR Core | `CODEX_TASK_HR_Core_Module.md` | `greenhouse_hr` | Specified, partially built |
| Payroll | `CODEX_TASK_HR_Payroll_Module_v2.md` | `greenhouse_payroll` | Specified, partially built |

### 3.2 New modules (Phases 1–3)

All new modules use `greenhouse_hr` as their PostgreSQL schema. No new schema is created.

| Module | Phase | Schema | Tables (new) |
|---|---|---|---|
| Document Vault | 1 | `greenhouse_hr` | `member_documents` |
| Onboarding/Offboarding | 1 | `greenhouse_hr` | `onboarding_templates`, `onboarding_template_items`, `onboarding_instances`, `onboarding_instance_items` |
| Expense Reports | 2 | `greenhouse_hr` | `expense_categories`, `expense_reports`, `expense_items` |
| Goals / OKRs | 2 | `greenhouse_hr` | `goal_cycles`, `goals`, `goal_key_results`, `goal_progress` |
| Performance Evaluations | 3 | `greenhouse_hr` | `eval_cycles`, `eval_competencies`, `eval_assignments`, `eval_responses`, `eval_summaries` |

---

## 4. Data model extensions

### 4.1 Phase 1: Document Vault

```sql
CREATE TABLE greenhouse_hr.member_documents (
  document_id         TEXT PRIMARY KEY,           -- UUID
  member_id           TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  document_type       VARCHAR(30) NOT NULL,
    -- 'contrato' | 'anexo_contrato' | 'nda' | 'licencia_medica' |
    -- 'certificado' | 'cedula_identidad' | 'titulo' | 'otro'
  file_name           TEXT NOT NULL,
  file_url            TEXT NOT NULL,              -- GCS bucket URL
  file_size_bytes     INTEGER,
  mime_type           VARCHAR(100),
  description         TEXT,
  expires_at          DATE,                       -- For certificates/licenses with expiry
  is_confidential     BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by         TEXT NOT NULL,              -- member_id of uploader
  verified_by         TEXT,                       -- member_id of HR who verified
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_documents_member ON greenhouse_hr.member_documents(member_id);
CREATE INDEX idx_member_documents_type ON greenhouse_hr.member_documents(document_type);
CREATE INDEX idx_member_documents_expires ON greenhouse_hr.member_documents(expires_at)
  WHERE expires_at IS NOT NULL;
```

### 4.2 Phase 1: Onboarding/Offboarding

```sql
CREATE TABLE greenhouse_hr.onboarding_templates (
  template_id         TEXT PRIMARY KEY,
  template_name       TEXT NOT NULL,
  template_type       VARCHAR(20) NOT NULL,       -- 'onboarding' | 'offboarding'
  applicable_contract_types TEXT[] DEFAULT '{}',   -- Empty = applies to all
  description         TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.onboarding_template_items (
  item_id             TEXT PRIMARY KEY,
  template_id         TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_templates(template_id),
  sort_order          INTEGER NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  assigned_role       VARCHAR(30) NOT NULL,        -- 'hr' | 'it' | 'supervisor' | 'collaborator'
  due_days_offset     INTEGER NOT NULL DEFAULT 0,  -- Days from start_date (onb) or end_date (offb)
  is_required         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.onboarding_instances (
  instance_id         TEXT PRIMARY KEY,
  template_id         TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_templates(template_id),
  member_id           TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  instance_type       VARCHAR(20) NOT NULL,       -- 'onboarding' | 'offboarding'
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active' | 'completed' | 'cancelled'
  start_date          DATE NOT NULL,              -- hire_date for onboarding, last_day for offboarding
  completed_at        TIMESTAMPTZ,
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.onboarding_instance_items (
  instance_item_id    TEXT PRIMARY KEY,
  instance_id         TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_instances(instance_id),
  template_item_id    TEXT NOT NULL REFERENCES greenhouse_hr.onboarding_template_items(item_id),
  assigned_to         TEXT,                       -- member_id of person responsible
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'completed' | 'skipped'
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Phase 2: Expense Reports

```sql
CREATE TABLE greenhouse_hr.expense_categories (
  category_id         TEXT PRIMARY KEY,
  category_name       TEXT NOT NULL,
  description         TEXT,
  requires_receipt    BOOLEAN NOT NULL DEFAULT TRUE,
  max_amount          NUMERIC(12,2),              -- Per-item limit (null = no limit)
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.expense_reports (
  report_id           TEXT PRIMARY KEY,
  member_id           TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  report_period       VARCHAR(7) NOT NULL,        -- 'YYYY-MM' format
  title               TEXT NOT NULL,
  status              VARCHAR(30) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'submitted' | 'pending_supervisor' | 'pending_finance' |
    -- 'approved' | 'rejected' | 'reimbursed'
  currency            VARCHAR(3) NOT NULL DEFAULT 'CLP',
  total_amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  submitted_at        TIMESTAMPTZ,
  supervisor_id       TEXT,                       -- Derived from reports_to at submission time
  supervisor_action_at TIMESTAMPTZ,
  supervisor_notes    TEXT,
  finance_reviewer_id TEXT,
  finance_action_at   TIMESTAMPTZ,
  finance_notes       TEXT,
  rejection_reason    TEXT,
  reimbursed_at       TIMESTAMPTZ,
  finance_record_id   TEXT,                       -- FK to greenhouse_finance when reimbursed
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.expense_items (
  item_id             TEXT PRIMARY KEY,
  report_id           TEXT NOT NULL REFERENCES greenhouse_hr.expense_reports(report_id),
  category_id         TEXT NOT NULL REFERENCES greenhouse_hr.expense_categories(category_id),
  description         TEXT NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'CLP',
  expense_date        DATE NOT NULL,
  receipt_url         TEXT,                       -- GCS bucket URL
  receipt_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 Phase 2: Goals / OKRs

```sql
CREATE TABLE greenhouse_hr.goal_cycles (
  cycle_id            TEXT PRIMARY KEY,
  cycle_name          TEXT NOT NULL,               -- e.g., "Q2 2026", "S1 2026"
  cycle_type          VARCHAR(20) NOT NULL,        -- 'quarterly' | 'semester' | 'annual'
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'active' | 'review' | 'closed'
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.goals (
  goal_id             TEXT PRIMARY KEY,
  cycle_id            TEXT NOT NULL REFERENCES greenhouse_hr.goal_cycles(cycle_id),
  owner_type          VARCHAR(20) NOT NULL,        -- 'individual' | 'department' | 'company'
  owner_member_id     TEXT REFERENCES greenhouse_core.members(member_id),
  owner_department_id TEXT REFERENCES greenhouse_core.departments(department_id),
  title               TEXT NOT NULL,
  description         TEXT,
  progress_percent    NUMERIC(5,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'on_track',
    -- 'on_track' | 'at_risk' | 'behind' | 'completed' | 'cancelled'
  parent_goal_id      TEXT REFERENCES greenhouse_hr.goals(goal_id),  -- Cascade from company → dept → individual
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.goal_key_results (
  kr_id               TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL REFERENCES greenhouse_hr.goals(goal_id),
  title               TEXT NOT NULL,
  target_value        NUMERIC(12,2),
  current_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit                VARCHAR(30),                 -- 'percent' | 'count' | 'currency' | 'score' | null
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.goal_progress (
  progress_id         TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL REFERENCES greenhouse_hr.goals(goal_id),
  recorded_by         TEXT NOT NULL,
  recorded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress_percent    NUMERIC(5,2) NOT NULL,
  notes               TEXT
);
```

### 4.5 Phase 3: Performance Evaluations

```sql
CREATE TABLE greenhouse_hr.eval_competencies (
  competency_id       TEXT PRIMARY KEY,
  competency_name     TEXT NOT NULL,
  description         TEXT,
  category            VARCHAR(30) NOT NULL,        -- 'technical' | 'soft_skill' | 'leadership' | 'values'
  applicable_levels   TEXT[],                      -- Job levels where this applies (empty = all)
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.eval_cycles (
  eval_cycle_id       TEXT PRIMARY KEY,
  cycle_name          TEXT NOT NULL,                -- e.g., "Evaluación S1 2026"
  cycle_type          VARCHAR(20) NOT NULL,        -- 'semester' | 'annual' | 'probation'
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  self_eval_deadline  DATE,
  peer_eval_deadline  DATE,
  manager_deadline    DATE,
  status              VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft' | 'self_eval' | 'peer_eval' | 'manager_review' | 'calibration' | 'closed'
  competency_ids      TEXT[] NOT NULL,             -- Which competencies apply to this cycle
  min_tenure_days     INTEGER NOT NULL DEFAULT 180, -- Minimum days since hire_date to participate
  created_by          TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.eval_assignments (
  assignment_id       TEXT PRIMARY KEY,
  eval_cycle_id       TEXT NOT NULL REFERENCES greenhouse_hr.eval_cycles(eval_cycle_id),
  evaluatee_id        TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  evaluator_id        TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  eval_type           VARCHAR(20) NOT NULL,        -- 'self' | 'peer' | 'manager' | 'direct_report'
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'submitted'
  submitted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.eval_responses (
  response_id         TEXT PRIMARY KEY,
  assignment_id       TEXT NOT NULL REFERENCES greenhouse_hr.eval_assignments(assignment_id),
  competency_id       TEXT NOT NULL REFERENCES greenhouse_hr.eval_competencies(competency_id),
  rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE greenhouse_hr.eval_summaries (
  summary_id          TEXT PRIMARY KEY,
  eval_cycle_id       TEXT NOT NULL REFERENCES greenhouse_hr.eval_cycles(eval_cycle_id),
  member_id           TEXT NOT NULL REFERENCES greenhouse_core.members(member_id),
  overall_rating      NUMERIC(3,2),                -- Weighted average across all evaluators
  self_rating         NUMERIC(3,2),
  peer_rating         NUMERIC(3,2),
  manager_rating      NUMERIC(3,2),
  ico_rpa_avg         NUMERIC(5,2),                -- From member_performance_snapshots
  ico_otd_percent     NUMERIC(5,2),                -- From member_performance_snapshots
  strengths           TEXT,                        -- HR-written summary
  development_areas   TEXT,                        -- HR-written summary
  hr_notes            TEXT,
  finalized_by        TEXT,
  finalized_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Module eligibility by contract type

Not every HRIS module applies equally to every contract type. The following matrix defines default eligibility:

| Module | indefinido | plazo_fijo | honorarios | contractor | eor |
|---|---|---|---|---|---|
| Leave management (vacaciones) | Full: 15d/year | Proportional | Not applicable | Not applicable | Deel policy |
| Leave management (other types) | All types | All types | Only if contractual | Only if contractual | Deel policy |
| Attendance tracking | Required | Required | If `schedule_required` | If `schedule_required` | If `schedule_required` |
| Payroll (internal calc) | Full Chilean calc | Full Chilean calc | Honorarios calc | Not applicable | Not applicable |
| Payroll (registration) | Not applicable | Not applicable | Not applicable | Register Deel amount | Register Deel amount |
| Document vault | Full access | Full access | Limited (contract, NDA) | Limited (contract, NDA) | Full access |
| Onboarding | Full checklist | Full checklist | Abbreviated | Abbreviated | Full checklist |
| Offboarding | Full checklist | Auto on expiry | Abbreviated | Abbreviated | Full checklist |
| Expense reports | Full | Full | Project-scoped only | Via Deel | Via Deel |
| Goals / OKRs | Full | Full if >3 months | Not applicable | If >6 months | Full |
| Performance evaluations (360°) | Full | If >6 months | Not applicable | If >6 months | Full |
| Bonos KPI (OTD%, RpA) | Threshold-based | Threshold-based | Discretionary | Discretionary | Discretionary |

Eligibility is resolved at runtime by checking `members.contract_type` and relevant date thresholds. No hardcoded lists per module — the eligibility function reads from a configuration table or constant.

---

## 6. Navigation architecture

### 6.1 "Mi Greenhouse" section (route group `my`)

Self-service views for every Efeonce internal user with the `collaborator` role.

| Nav item | Path | Icon | Phase | Visibility |
|---|---|---|---|---|
| Mi perfil | `/my/profile` | `tabler-user` | 0 | All collaborators |
| Mis permisos | `/my/leave` | `tabler-calendar-event` | 0 | All collaborators |
| Mi asistencia | `/my/attendance` | `tabler-clock-check` | 0 | All collaborators |
| Mi nómina | `/my/payroll` | `tabler-receipt-2` | 0 | All collaborators |
| Mis documentos | `/my/documents` | `tabler-folder-open` | 1 | All collaborators |
| Mi onboarding | `/my/onboarding` | `tabler-list-check` | 1 | Collaborators with active onboarding instance |
| Mis gastos | `/my/expenses` | `tabler-cash` | 2 | `contract_type IN ('indefinido', 'plazo_fijo')` |
| Mis objetivos | `/my/goals` | `tabler-target` | 2 | Collaborators with goals assigned in active cycle |
| Mi evaluación | `/my/evaluation` | `tabler-star` | 3 | Collaborators assigned in active eval cycle |
| Mis herramientas | `/my/tools` | `tabler-tool` | 0 | All collaborators |

### 6.2 "HR" section (route group `hr`)

Management views for `hr_manager`, `hr_payroll`, and `efeonce_admin`.

| Nav item | Path | Icon | Phase | Visibility |
|---|---|---|---|---|
| Gestión de permisos | `/hr/leave` | `tabler-file-check` | 0 | `hr`, `admin` |
| Asistencia | `/hr/attendance` | `tabler-user-check` | 0 | `hr`, `admin` |
| Aprobaciones | `/hr/approvals` | `tabler-checklist` | 0 | Users with direct reports OR `hr`, `admin`. Badge shows pending count (leave + expenses) |
| Calendario de equipo | `/hr/team-calendar` | `tabler-calendar-stats` | 0 | All collaborators, `hr`, `admin` |
| Organigrama | `/hr/org-chart` | `tabler-hierarchy-3` | 0 | All collaborators, `hr`, `admin` |
| Nómina | `/hr/payroll` | `tabler-receipt-2` | 0 | `hr`, `admin` |
| Documentos equipo | `/hr/documents` | `tabler-folders` | 1 | `hr`, `admin` |
| Onboarding | `/hr/onboarding` | `tabler-list-check` | 1 | `hr`, `admin` |
| — Plantillas onboarding | `/hr/onboarding/templates?type=onboarding` | — | 1 | `hr`, `admin` |
| — Plantillas offboarding | `/hr/onboarding/templates?type=offboarding` | — | 1 | `hr`, `admin` |
| — Instancias activas | `/hr/onboarding/instances` | — | 1 | `hr`, `admin` |
| Gastos y reembolsos | `/hr/expenses` | `tabler-cash` | 2 | `hr`, `admin` |
| Objetivos (OKRs) | `/hr/goals` | `tabler-target` | 2 | `hr`, `admin` |
| — Ciclos de objetivos | `/hr/goals/cycles` | — | 2 | `hr`, `admin` |
| — Seguimiento global | `/hr/goals/tracking` | — | 2 | `hr`, `admin` |
| Evaluaciones | `/hr/evaluations` | `tabler-star` | 3 | `hr`, `admin` |
| — Ciclos de evaluación | `/hr/evaluations/cycles` | — | 3 | `hr`, `admin` |
| — Competencias | `/hr/evaluations/competencies` | — | 3 | `hr`, `admin` |
| — Resultados consolidados | `/hr/evaluations/results` | — | 3 | `hr`, `admin` |
| Configuración HR | `/hr/settings` | `tabler-settings` | 0+ | `hr`, `admin` |
| — Tipos de permiso | `/hr/settings/leave-types` | — | 0 | `hr`, `admin` |
| — Departamentos | `/hr/settings/departments` | — | 0 | `hr`, `admin` |
| — Feriados | `/hr/settings/holidays` | — | 0 | `hr`, `admin` |
| — Categorías de gasto | `/hr/settings/expense-categories` | — | 2 | `hr`, `admin` |
| — Competencias | `/hr/settings/competencies` | — | 3 | `hr`, `admin` |

### 6.3 Route group registry update

Add to `GREENHOUSE_IDENTITY_ACCESS_V2.md` route group registry:

```
my:  /my/documents, /my/onboarding, /my/expenses, /my/goals, /my/evaluation
hr:  /hr/documents, /hr/onboarding, /hr/onboarding/*, /hr/expenses, /hr/goals, /hr/goals/*, /hr/evaluations, /hr/evaluations/*,  /hr/settings/expense-categories, /hr/settings/competencies
```

---

## 7. Shared engines

### 7.1 Approvals engine (already exists)

The generic approvals engine in `greenhouse_hr` handles leave requests today. It extends to handle expense reports in Phase 2 with no structural changes.

The approval flow pattern:
```
Collaborator submits → Supervisor reviews → Domain validator reviews → Done
```

For leave requests: Collaborator → Supervisor → HR
For expense reports: Collaborator → Supervisor → Finance

The `approval_actions` table records every action with actor, timestamp, and notes. The state machine is the same — only the `request_type` discriminator and the final validator role change.

### 7.2 Goals engine (new in Phase 2)

Goals cascade from company → department → individual. Each goal has key results with measurable targets. Progress is recorded as point-in-time entries (append-only).

Goals connect to evaluations in Phase 3: the eval summary pulls goal completion percentage as one input alongside ICO metrics and qualitative ratings.

---

## 8. Integration points

### 8.1 Finance Module

- Expense reports: when an expense report reaches `reimbursed` status, a record is created in `greenhouse_finance` expense tables via the `finance_record_id` link.
- Payroll entries feed the cost allocation model in Finance Intelligence Layer.

### 8.2 People 360

- `/people/[memberId]` already has tabs for HR, payroll, and performance. New modules add tabs/sections:
  - "Documentos" tab (from Document Vault)
  - "Objetivos" tab (from Goals)
  - "Evaluaciones" tab (from Performance Evaluations)
  - Onboarding status card in the "Actividad" tab

### 8.3 ICO Engine

- Performance evaluations in Phase 3 consume `member_performance_snapshots` from BigQuery (RpA, OTD%, throughput) as quantitative inputs to the evaluation summary.
- Goals do NOT consume ICO metrics directly — they are complementary tracks (goals = strategic, ICO = operational).

### 8.4 Deel (future)

- Deel API integration is out of scope for Phases 1–3.
- The `deel_contract_id` field and `payroll_via = 'deel'` flag prepare the data model for future sync.
- When built, the Deel integration would: sync contract status, sync payment records into payroll entries, and surface Deel-managed leave balances for EOR employees.

### 8.5 SCIM provisioning

- When a new user is provisioned via SCIM from Microsoft Entra ID, the HRIS can auto-trigger onboarding:
  1. SCIM creates `client_users` record
  2. `members` record is created or linked
  3. If `members.status` transitions to `active` and an onboarding template matches the `contract_type`, an onboarding instance is auto-created.

### 8.6 Staff Augmentation Module

Staff Augmentation is the most tightly coupled external module. A placement IS a member with `contract_type IN ('contractor', 'eor')` assigned to a client Space with `assignment_type = 'staff_augmentation'`. The HRIS owns the person's HR lifecycle; Staff Aug owns the commercial relationship with the client.

Reference: `CODEX_TASK_Staff_Augmentation_Module.md`

**6 integration points:**

**8.6.1 Contract types (bidirectional)**

The canonical `contract_type`, `payroll_via`, and `deel_contract_id` fields in `greenhouse_core.members` (defined by HRIS Phase 0.5) are the source of truth for Staff Aug placements. Staff Aug's `staff_aug_placements` table has its own `contract_type` and `deel_contract_id` fields — these are snapshots at placement creation time, not canonical. The canonical fields on `members` prevail.

Rule: when creating a placement, copy `members.contract_type`, `members.deel_contract_id`, and derive `eor_provider` from `members.payroll_via`. Do not allow the placement to override these — if the contract type changes, it changes in `members` first (via HRIS), then the placement reflects the update.

**8.6.2 Onboarding (sequential, not overlapping)**

HRIS onboarding (`greenhouse_hr.onboarding_instances`) handles the person's entry into Efeonce: accounts, contracts, internal access. Staff Aug onboarding (`placement_onboarding_checklists`) handles the person's placement into a client: client stack access, client team intro, client communication setup.

Sequence: HRIS onboarding runs first (or concurrently), Staff Aug onboarding runs when the placement is created. They are separate checklist instances with separate templates, but both reference the same `member_id`.

Future opportunity: an HRIS onboarding template item could reference a Staff Aug placement ("Completar onboarding de placement en [cliente]") with a link to the placement instance.

**8.6.3 Payroll / cost rate (HRIS is source of truth)**

The member's compensation lives in `greenhouse_payroll.compensation_versions`. Staff Aug's `cost_rate_amount` in `staff_aug_placements` should be derived from or validated against the current `compensation_versions.base_salary` for the member. The margin calculation is `billing_rate - cost_rate`, where:
- `billing_rate` = what the client pays Efeonce (owned by Staff Aug)
- `cost_rate` = what Efeonce pays the member/Deel (owned by Payroll)

Rule: Staff Aug should read `cost_rate` from the current compensation version at placement creation and on period calculation. If HR updates compensation, Staff Aug's margin recalculates automatically.

**8.6.4 Performance evaluations + ICO (shared source, different scope)**

Both HRIS evaluations and Staff Aug performance tabs consume `member_performance_snapshots` from BigQuery (ICO Engine). The difference is scope:
- HRIS eval: global member performance across all spaces
- Staff Aug: performance filtered to the placement's Space (tasks assigned to that client only)

Additionally, Staff Aug has client satisfaction data (NPS/CSAT via HubSpot surveys) that the HRIS evaluation does not. A future enrichment could include the client NPS as an input to the 360° eval summary for placed members, under a field like `client_satisfaction_score`.

**8.6.5 Document vault → compliance transparency**

Staff Aug's client-facing "Compliance" view (Phase 3 of Staff Aug) reads from `greenhouse_hr.member_documents` to surface compliance status to the client: active contract with Deel, signed NDA, valid certifications. The Document Vault API supports this via the existing `GET /api/hr/documents` endpoint filtered by `member_id` and `document_type`.

Rule: only non-confidential documents of types `contrato`, `nda`, and `certificado` are exposed to the client-facing Staff Aug view. The HRIS Document Vault controls `is_confidential` — Staff Aug respects it.

**8.6.6 Member profile / skills → talent matching**

The `MemberProfile` in HRIS (skills, tools, AI suites, output type) feeds Staff Aug's talent matching. When creating a placement, the `CreatePlacementDrawer` should:
1. Load the member's `skills_highlighted` from `MemberProfile`
2. Compare against the `required_skills` specified for the placement
3. Auto-populate `matched_skills` as the intersection

This also feeds the future talent pool view: "which available members match the skills this client needs?"

**8.6.7 Implementation sequencing**

HRIS Phase 0.5 (contract type consolidation) is a prerequisite for Staff Augmentation P0. The dependency chain:

```
HRIS Phase 0.5 (contract types)
  ├── Staff Aug P0 (can reference members.contract_type, payroll_via, deel_contract_id)
  ├── HRIS Phase 1A (document vault — Staff Aug P3 reads from it)
  └── HRIS Phase 1B (onboarding — runs before Staff Aug onboarding)
```

If Staff Aug is implemented before HRIS Phase 0.5, the following fields in `staff_aug_placements` become orphaned from the canonical model: `contract_type`, `deel_contract_id`, `eor_provider`. They would need to be reconciled later.

---

## 9. Implementation roadmap

### Phase 0 — Foundation (done)

Already specified and partially implemented:
- HR Core (org structure, leave management, attendance, member profiles)
- Payroll (compensation versions, period lifecycle, Chilean deductions, KPI bonuses)
- RBAC with `hr_manager`, `hr_payroll`, `collaborator` roles
- PostgreSQL schemas: `greenhouse_hr`, `greenhouse_payroll`
- Approvals engine (generic, used for leave requests)

### Phase 0.5 — Contract type consolidation

Before starting Phase 1, consolidate the contract type model:
- Add `contract_type`, `payroll_via`, `schedule_required`, `deel_contract_id` columns to `greenhouse_core.members`
- Migrate existing `employment_type` and `compensation_versions.contract_type` data into the new canonical fields
- Add Branch 2 (honorarios) to `calculate-payroll.ts`
- Add Branch 3 (Deel registration) to `calculate-payroll.ts`
- Update `CompensationDrawer` to show contract type derivation rules

Estimated effort: 1 CODEX TASK, ~1 week.

### Phase 1 — Document Vault + Onboarding/Offboarding

Two modules with low complexity and high immediate value.

- Document Vault: CRUD for member documents, GCS upload, expiry tracking, self-service + admin views
- Onboarding/Offboarding: template management, auto-instantiation on status change, checklist tracking with assigned owners

Estimated effort: 2 CODEX TASKs, ~3 weeks.

### Phase 2 — Expense Reports + Goals/OKRs

- Expense Reports: extends approvals engine with finance flow, receipt upload, reimbursement tracking, Finance Module integration
- Goals/OKRs: cycle management, cascading goals, key results with progress tracking

Estimated effort: 2 CODEX TASKs, ~4 weeks.

### Phase 3 — Performance Evaluations 360°

The most complex module. Consumes from Goals (Phase 2) and ICO Engine performance snapshots.

- Evaluation cycles with multi-phase flow (self → peer → manager → calibration)
- Competency catalog configuration
- Assignment matrix (who evaluates whom)
- Rating collection and consolidation
- Summary generation with ICO metrics integration

Estimated effort: 1 CODEX TASK, ~4 weeks.

### Phase 4 — Future (not planned)

These are explicitly out of scope but documented for completeness:
- ATS / Recruitment pipeline (recommend external tool for <20 people)
- Time tracking (active start/stop — ICO Engine already derives passive metrics)
- Benefits management
- Training / LMS (partially covered by AI Tooling Credit System for tool licenses)
- Deel API bidirectional sync

---

## 10. Decisions locked by this document

1. **Contract type taxonomy is 5 values:** `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`
2. **`contract_type` canonical field lives in `greenhouse_core.members`**, not in `compensation_versions`
3. **`payroll_via` field distinguishes internal calculation from Deel registration**
4. **`schedule_required` determines attendance tracking eligibility**, independent of contract type
5. **All new HRIS modules use `greenhouse_hr` schema** — no new PostgreSQL schema
6. **Approvals engine is generic** — leave requests and expense reports use the same state machine
7. **Goals and ICO metrics are complementary, not overlapping** — goals are strategic; ICO is operational
8. **Performance evaluations consume but do not modify ICO data** — evaluations read from `member_performance_snapshots`, never write to ICO tables
9. **Module eligibility is runtime-resolved by contract type**, not hardcoded per module
10. **Deel integration is data-model-ready but implementation is deferred** — `deel_contract_id` and `payroll_via` exist now; API sync is Phase 4+
11. **Staff Aug reads contract type from `greenhouse_core.members`, not from its own placement table** — `staff_aug_placements.contract_type` is a snapshot, not canonical
12. **Staff Aug cost_rate derives from Payroll compensation, not an independent field** — margin = billing_rate (Staff Aug) - cost_rate (Payroll)
13. **HRIS onboarding and Staff Aug onboarding are sequential, not overlapping** — HRIS = entry to Efeonce, Staff Aug = placement into client
14. **Document Vault controls confidentiality; Staff Aug respects it** — only non-confidential docs of types `contrato`, `nda`, `certificado` surface in client-facing compliance view

---

## Changelog

| Date | Version | Change |
|---|---|---|
| 2026-03-21 | v1.0 | Initial architecture — contract taxonomy, module inventory, data model, navigation, roadmap |
| 2026-03-21 | v1.1 | Added §8.6 Staff Augmentation integration (6 points), added decisions 11-14 |

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
*Documento técnico interno para agentes de desarrollo. Referencia normativa para implementación.*
