# PREVIRED_VALIDATOR_CASCADE_AUDIT_2026-05-10

## Status

- Date: 2026-05-10
- Scope: Previred planilla upload for payroll period `2026-04`
- Auditor: Codex using `greenhouse-payroll-auditor`
- Runtime: dev/staging `https://dev-greenhouse.efeoncepro.com`
- Affected worker: Valentina Hoyos, RUT `20557199-K`
- Result: accepted by Previred; upload reached calculation/acceptance screen

## Executive Summary

Previred does not validate the full planilla contract in a single pass. It reveals a cascade:

1. structural/person fields;
2. institution codes and movement codes;
3. formula/rate checks;
4. warnings that become visible only after prior blockers are resolved;
5. final calculation summary.

The robust fix was to stop treating Previred as a receipt clone. Greenhouse now generates Previred as a
regulatory projection over closed payroll entries plus periodized Previred snapshots. Payroll receipts and LRE
continue to reflect closed payroll entries; Previred receives statutory bases and amounts expected by its validator.

## Evidence

Final accepted calculation in Previred showed:

- Seguro Social / expectativa: `4851`
- AFP UNO: `81820`
- Isapre Colmena: `162475`
- ISL: `5013`
- Total remuneraciones: `254159`

Staging export verification for the accepted row returned:

- field 13, Previred worked days: `30`
- field 26, AFP code: `35`
- field 27, AFP taxable base: `539000`
- field 28, AFP contribution: `56918`
- field 29, SIS: `8732`
- field 64/77/100, statutory bases: `539000`
- field 71, ISL: `5013`
- field 75, Isapre code: `04`
- field 79, Isapre pactada: `162475`
- field 80, Isapre obligatoria: `37730`
- field 81, Isapre adicional: `124745`
- field 93, jornada: `1`
- field 94, expectativa de vida: `4851`
- fields 97/98, mutual base/contribution: `0`
- fields 101/102, AFC employee/employer: `3234` / `12936`
- field count: `105`

## Findings

### 1. Previred planilla is a regulatory projection, not a receipt clone

Persisted `payroll_entries` are the audit source for the closed payroll receipt. Previred expects a different
regulatory representation for some fields: periodized AFP/SIS rates, minimum taxable base, statutory health split,
AFC split, ISL contribution, jornada and expectation-of-life contribution.

Resolution:

- Keep the closed payroll entry immutable.
- Generate a Previred-specific projection in `src/lib/payroll/compliance-exports/previred.ts`.
- Fail closed when required periodized data is missing.

### 2. Person 360 identity is the anchor for Previred profiles

Valentina's active Payroll identity is `greenhouse_core.members.identity_profile_id`, currently
`identity-hubspot-crm-owner-82653513`. The Previred profile reads from
`greenhouse_payroll.chile_previred_worker_profiles.profile_id`.

Resolution:

- Do not patch HubSpot-only fields.
- Do not delete or overwrite Valentina's Person 360 data.
- Store explicit Previred legal codes in the profile table.

### 3. Full-time statutory base uses at least IMM

Previred warned that field 27 (`436815`) was below the period minimum taxable income (`539000`).
The IMM already lives in `greenhouse_payroll.chile_previred_indicators.imm_clp`.

Resolution:

- For full-time entries, Previred statutory bases use `max(chileTaxableBase, imm_clp)`.
- Receipts and LRE remain based on the closed payroll entry.

### 4. Attendance working days are not Previred worked days

Greenhouse attendance for April 2026 used `22` working days. Previred expects field 13 as statutory worked days
unless a formal movement of personnel is declared. With no movement, field 13 must be `30`.

Resolution:

- V1 emits field 13 as `30`.
- Future movement support must be explicit and profile/period based; never infer it from attendance working days.

### 5. ISL is calculated from the statutory base

Previred rejected the persisted accident amount and accepted the ISL amount calculated from the statutory base
using the canonical Chile accident insurance rate `0.93%`.

Resolution:

- Extract `CHILE_ACCIDENT_INSURANCE_ISL_RATE = 0.0093`.
- Reuse it in employer-cost helpers and Previred projection.

## Implementation References

- `src/lib/payroll/compliance-exports/previred.ts`
- `src/lib/payroll/compliance-exports/store.ts`
- `src/lib/payroll/compliance-exports/types.ts`
- `src/lib/payroll/chile-statutory-rates.ts`
- `docs/documentation/hr/payroll-compliance-exports-chile.md`

## Verification

- `pnpm vitest run src/lib/payroll/compliance-exports/previred.test.ts src/lib/payroll/compliance-exports/lre.test.ts`
- `pnpm exec eslint src/lib/payroll/compliance-exports/previred.ts src/lib/payroll/compliance-exports/store.ts src/lib/payroll/compliance-exports/types.ts src/lib/payroll/compliance-exports/previred.test.ts src/lib/payroll/compliance-exports/lre.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm staging:request /api/hr/payroll/periods/2026-04/export/previred`
- Manual Previred upload accepted and reached calculation/acceptance screen.

## Follow-ups

- Model movement-of-personnel fields explicitly before supporting non-30 Previred worked days.
- Model supported mutual institution codes explicitly before emitting mutual fields 96-98.
- Consider a fixture-based validator test built from accepted Previred CSV/error cycles to prevent regressions.
