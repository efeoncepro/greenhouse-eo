# CODEX TASK — Staff Augmentation Module: Addendum HRIS Integration

## Purpose

This addendum documents how the Staff Augmentation module connects to the HRIS architecture defined in `Greenhouse_HRIS_Architecture_v1.md`. It specifies which fields in `staff_aug_placements` are snapshots of canonical HRIS fields, which data flows are bidirectional, and how the implementation sequence should be coordinated.

This addendum supplements `CODEX_TASK_Staff_Augmentation_Module.md`. It does not replace any section — it adds integration rules.

---

## 1. New prerequisite: HRIS Phase 0.5

Add to the "DEBE existir" section of dependencies:

```
- [ ] HRIS Phase 0.5 completed (CODEX_TASK_HRIS_Contract_Type_Consolidation.md)
      Fields required: members.contract_type, members.pay_regime, members.payroll_via,
      members.schedule_required, members.deel_contract_id
```

**If Staff Aug is implemented before HRIS Phase 0.5:** the placement must define its own `contract_type` and `deel_contract_id` independently. When Phase 0.5 lands, a reconciliation script must migrate these to reference `members.*` canonical fields. This is avoidable by sequencing correctly.

---

## 2. Field mapping: placement snapshot vs. HRIS canonical

The following fields in `staff_aug_placements` are **snapshots** of canonical HRIS fields. They are copied at placement creation time for auditability, but the canonical source is always `greenhouse_core.members`.

| Placement field | Canonical source | Rule |
|---|---|---|
| `contract_type` | `members.contract_type` | Copy at creation. If member's contract_type changes, update the placement snapshot via a reconciliation query or trigger |
| `deel_contract_id` | `members.deel_contract_id` | Copy at creation. Same reconciliation rule |
| `eor_provider` | Derived from `members.payroll_via` | If `payroll_via = 'deel'` → `eor_provider = 'deel'`. If future providers are added, map accordingly |
| `contractor_country` | `members.nationality` or manual | If member has `nationality` set, use it as default. Allow override on placement for cases where the contractor works from a different country |
| `cost_rate_amount` | `greenhouse_payroll.compensation_versions` (current) | Read `base_salary` from the current compensation version at placement creation. If compensation changes, recalculate margin |
| `cost_rate_currency` | `greenhouse_payroll.compensation_versions.currency` | Same as above |

### Implementation: `CreatePlacementDrawer` pre-fill

When the operator selects a member in the `CreatePlacementDrawer`:

```typescript
// After member is selected, pre-fill from HRIS canonical data
const member = await getMember(memberId)
const compensation = await getCurrentCompensation(memberId)
const profile = await getMemberProfile(memberId)

// Pre-fill placement fields from HRIS
const prefill = {
  contractType: member.contract_type,         // From HRIS Phase 0.5
  deelContractId: member.deel_contract_id,    // From HRIS Phase 0.5
  eorProvider: member.payroll_via === 'deel' ? 'deel' : 'direct',
  contractorCountry: member.nationality,
  costRateAmount: compensation?.base_salary,
  costRateCurrency: compensation?.currency,
  matchedSkills: intersect(profile.skills_highlighted, requiredSkills),
}
```

---

## 3. Onboarding coordination

### Current state in Staff Aug spec

Staff Aug has its own `placement_onboarding_checklists` table with items specific to client placement (client stack access, client team intro, etc.).

### HRIS adds a parallel track

HRIS Phase 1B adds `greenhouse_hr.onboarding_instances` with items specific to Efeonce entry (create accounts, sign contract, configure internal access, etc.).

### Coordination rule

For a newly placed member (first time at Efeonce), **both** checklists run:
1. HRIS onboarding instance (triggered by `members.status → active`)
2. Staff Aug placement onboarding (triggered by placement creation)

For an existing member getting a new placement (already at Efeonce), **only** the Staff Aug onboarding runs — the HRIS onboarding was already completed.

### Template enhancement

Add the following item to the HRIS "Onboarding — Equipo Efeonce" template (from `CODEX_TASK_HRIS_Onboarding_Offboarding.md` §C1):

```
14. [supervisor, day 1] Verificar onboarding de placement en cliente (si aplica)
    — Link: /internal/staff-augmentation/{placementId}
    — Condition: only shown if member has an active placement with status = 'onboarding'
```

This creates a cross-reference from HRIS onboarding to Staff Aug onboarding without duplicating items.

---

## 4. Payroll cost rate synchronization

### Current state in Staff Aug spec

`cost_rate_amount` in `staff_aug_placements` is set manually at creation and updated via `PATCH`.

### HRIS enrichment

With HRIS Phase 0.5 + Payroll, the cost rate has a canonical source: `compensation_versions.base_salary` for the member's current version.

### Synchronization rules

1. **At placement creation:** pre-fill `cost_rate_amount` from current `compensation_versions.base_salary`
2. **On compensation change:** when HR creates a new `compensation_version` via the CompensationDrawer, trigger a recalculation of `margin_percent` on all active placements for that member
3. **Override allowed:** the operator can manually set a different `cost_rate_amount` on the placement if the actual cost to Efeonce differs from base salary (e.g., includes Deel fees, benefits overhead). When overridden, the placement stores both `cost_rate_amount` (manual) and `cost_rate_source` (`'payroll' | 'manual'`)

### New field on `staff_aug_placements`

```sql
ALTER TABLE greenhouse_core.staff_aug_placements
ADD COLUMN IF NOT EXISTS cost_rate_source VARCHAR(20) DEFAULT 'manual';
-- Values: 'payroll' (auto-synced from compensation_versions) | 'manual' (operator override)
```

---

## 5. Performance evaluation enrichment

### Current state

Staff Aug has a "Performance" tab that reads ICO metrics scoped to the placement's Space. HRIS Phase 3 has 360° evaluations with competency ratings.

### Enrichment: client satisfaction in eval summary

For members with an active Staff Aug placement, the 360° eval summary (`eval_summaries`) can include client satisfaction as an additional input:

```sql
-- Add to greenhouse_hr.eval_summaries
ALTER TABLE greenhouse_hr.eval_summaries
ADD COLUMN IF NOT EXISTS staff_aug_client_nps NUMERIC(3,1);
-- Populated from staff_aug_placements satisfaction surveys (HubSpot)
-- Only for members with active placements during the eval cycle period
```

The summary generator (`summary-generator.ts` in HRIS Phase 3) should:
1. Check if the member has an active placement during the eval cycle period
2. If yes, query `placement_satisfaction_surveys` for the latest NPS
3. Store in `staff_aug_client_nps`
4. Display in the eval results as "Satisfacción del cliente: X/10"

This field is **informational only** — it does not affect the `overall_rating` calculation (which remains Manager 40%, Peers 30%, Self 20%, Direct Reports 10%).

---

## 6. Document vault → compliance view

### Integration path

Staff Aug P3 (client-facing) has a "Compliance" section showing that the placed resource has proper documentation. This reads from the HRIS Document Vault:

```typescript
// In Staff Aug: fetch compliance docs for a placement
async function getPlacementComplianceDocs(memberId: string) {
  const docs = await fetch(`/api/hr/documents?member_id=${memberId}&document_type=contrato,nda,certificado`)
  // Filter: only non-confidential, only verified
  return docs.filter(d => !d.is_confidential && d.is_verified)
}
```

### Client-facing display rules

| Document type | Client sees | Client does NOT see |
|---|---|---|
| `contrato` | "Contrato vigente ✓" with expiry date | Contract details, salary, terms |
| `nda` | "NDA firmado ✓" with signature date | NDA content |
| `certificado` | Certificate name, expiry date, verification status | Certificate file itself (unless HR flags it as shareable) |

The client sees status indicators (checkmarks, expiry warnings), never the actual documents. HR controls what surfaces via `is_confidential` and a future `is_client_visible` flag on `member_documents`.

### Suggested field addition to Document Vault schema

```sql
ALTER TABLE greenhouse_hr.member_documents
ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN NOT NULL DEFAULT FALSE;
-- When TRUE, document status (not content) can be surfaced in Staff Aug client-facing compliance view
-- Only HR can set this flag
```

---

## 7. Skills / talent matching

### Integration path

When creating a placement, the skills matching works as follows:

```typescript
// In CreatePlacementDrawer — after member is selected
const profile = await getMemberProfile(memberId)  // HRIS: MemberProfile with skills_highlighted

// requiredSkills comes from the placement form input
const matched = profile.skills_highlighted.filter(
  skill => requiredSkills.some(req => 
    skill.toLowerCase().includes(req.toLowerCase()) || 
    req.toLowerCase().includes(skill.toLowerCase())
  )
)

// Pre-fill matched_skills on the placement
setFieldValue('matched_skills', matched)
```

### Future: talent pool view

Staff Aug could expose a "Talent Pool" view that queries HRIS member profiles to find available members matching client requirements:

```sql
-- Find members with matching skills who are available (FTE < max)
SELECT m.member_id, m.display_name, mp.skills_highlighted, mp.output_type,
       COALESCE(SUM(cta.fte_allocation), 0) as current_fte_allocated
FROM greenhouse_core.members m
LEFT JOIN greenhouse_hr.member_profiles mp ON mp.member_id = m.member_id
LEFT JOIN greenhouse_core.client_team_assignments cta 
  ON cta.member_id = m.member_id AND cta.active = TRUE
WHERE m.status = 'active'
  AND m.contract_type IN ('contractor', 'eor')
GROUP BY m.member_id, m.display_name, mp.skills_highlighted, mp.output_type
HAVING COALESCE(SUM(cta.fte_allocation), 0) < 1.0  -- Has available capacity
```

This is a future feature, not in current scope.

---

## 8. Updated dependency chain

```
HRIS Phase 0.5 (contract types) ← PREREQUISITE
  │
  ├── Staff Aug P0 (placement model, assignment enrichment)
  │     Uses: members.contract_type, members.payroll_via, members.deel_contract_id
  │     Uses: compensation_versions.base_salary for cost_rate pre-fill
  │
  ├── HRIS Phase 1A (document vault)
  │     │
  │     └── Staff Aug P3 (compliance view reads member_documents)
  │
  ├── HRIS Phase 1B (onboarding)
  │     │
  │     └── Staff Aug P0 (placement onboarding runs after HRIS onboarding)
  │
  ├── HRIS Phase 2A (expense reports) — no Staff Aug dependency
  │
  ├── HRIS Phase 2B (goals) — no direct Staff Aug dependency
  │
  └── HRIS Phase 3 (evaluations)
        │
        └── Staff Aug enrichment: client NPS in eval_summaries
```

---

## 9. Agent notes

- **Do not duplicate HRIS fields in Staff Aug.** If a field exists canonically in `greenhouse_core.members` or `greenhouse_payroll.compensation_versions`, Staff Aug snapshots it at creation but never treats its copy as source of truth.
- **The `cost_rate_source` field is critical.** It tells the system whether to auto-update the cost rate when compensation changes (`'payroll'`) or to leave it alone (`'manual'`).
- **`is_client_visible` on member_documents is a future addition.** Until it exists, Staff Aug compliance view uses `is_confidential = FALSE` as the proxy.
- **This addendum should be read alongside the main CODEX TASK.** It does not change the schema or API routes defined there — it specifies how those routes consume HRIS data.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
*Addendum técnico interno. Complementa CODEX_TASK_Staff_Augmentation_Module.md*
