# TASK-969 — Person Workforce Documents Rail Mockup Approval

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `cross-domain` (`people|documents|signature|hr|identity|ui`)
- Blocked by: `TASK-964`
- Branch: `task/TASK-969-person-workforce-documents-rail-mockup-approval`
- Legacy ID: `M04`
- GitHub Issue: `optional`

## Summary

Construir y aprobar el mockup `M04 - Person Workforce Documents & Signature Rail` en `/people/mockup/workforce-documents`, como contrato visual/UX para conectar People/Person 360 con EPIC-001 sin crear un document vault paralelo.

## Why This Task Exists

EPIC-017 necesita mostrar documentos laborales, contractuales, payroll-linked y estados de firma en el journey de la persona. El riesgo es que un implementador cree una rail documental local en People y duplique EPIC-001. Este mockup bloquea ese drift antes de runtime.

## Goal

- Crear la ruta mockup real dentro del portal.
- Mostrar documentos como evidencia read-only con lineage y redaction.
- Dejar claro que EPIC-001 owns storage, versioning, templates, signatures and document manager workflows.
- Obtener aprobacion visual con GVC desktop/laptop/mobile.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `DESIGN.md`

Reglas obligatorias:

- Mockup-only. No APIs, DB writes, migrations, signature requests, uploads or document lifecycle mutations.
- EPIC-001 remains owner of document registry, assets, templates, versions and e-signature state.
- Person 360 shows evidence, status, lineage and links only.
- Payroll receipts, remittance advice and final settlement docs are linked evidence; People must not generate or recalculate them.
- Confidential documents must render locked/redacted states with capability reason.

## Normative Docs

- `docs/tasks/to-do/TASK-964-person-workforce-documents-rail-epic001-alignment.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-964` for EPIC-001 alignment.
- Existing approved mockup pattern:
  - `src/app/(dashboard)/people/mockup/daniela-workforce/page.tsx`
  - `src/app/(dashboard)/people/mockup/workforce-command/page.tsx`
  - `src/app/(dashboard)/people/mockup/workforce-readiness/page.tsx`

### Blocks / Impacts

- Runtime Person Workforce Documents rail.
- Future `TASK-965` create/edit workflow document step.
- EPIC-001 implementation agents that need People as consumer.

### Files owned

- `docs/tasks/to-do/TASK-969-person-workforce-documents-rail-mockup-approval.md`
- `src/app/(dashboard)/people/mockup/workforce-documents/page.tsx`
- `src/views/greenhouse/people/mockup/workforce-documents/*`
- `scripts/frontend/scenarios/person-workforce-documents-rail.scenario.ts`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `Handoff.md`

## Current Repo State

### Already exists

- EPIC-001 owns document vault/signature orchestration.
- `TASK-964` defines the alignment contract.
- M01, M02 and M03 mockups are approved and built.

### Gap

- No approved visual contract exists for how Person 360 displays workforce documents, signature state, redaction and evidence lineage.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Route, Data and IA

- Create `/people/mockup/workforce-documents`.
- Create typed mock data for contracts, addenda, policy acknowledgement, payroll receipt, remittance advice and final settlement evidence.
- Include states: signed, pending signature, pending review, missing, redacted and expired.

### Slice 2 — Visual Surface

- Build header, evidence timeline, document groups and signature detail drawer.
- Show source owner, version, last event, signer/pending owner and canonical EPIC-001 link.
- Show missing-document state as an evidence gap, not an upload workaround.

### Slice 3 — GVC and Approval Docs

- Add `person-workforce-documents-rail` GVC scenario.
- Capture desktop, laptop and mobile.
- After approval, mark M04 as `approved and built as mockup` in RESEARCH-008 and add `Approved Mockup Lock` to `TASK-964`.

## Out of Scope

- Runtime document registry implementation.
- Uploads, document generation, signature orchestration or webhooks.
- Any payroll/remittance/finiquito generation.
- Any People-owned document storage.

## Detailed Spec

Approved route target:

```txt
/people/mockup/workforce-documents
```

Expected first-fold model:

- worker identity and document readiness;
- document readiness / signature readiness / confidential state;
- evidence timeline;
- document rail grouped by employment, contractor/payment and compliance;
- signature drawer for detailed state.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3. Do not ask for approval before GVC captures exist.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mockup implies People owns documents | documents/ui | medium | Boundary copy and EPIC-001 links | Review flags local upload/sign controls |
| Confidential docs leak in mockup pattern | identity/documents | medium | Redacted/locked states | GVC shows sensitive sample values |
| Payroll docs imply recalculation | payroll/documents | low | Evidence-only labels | Review catches generation language |

### Feature flags / cutover

Repo-only mockup route under `/people/mockup/**`; no production nav entry, no feature flag and no cutover. Mitigation is route isolation plus GVC approval before any runtime task consumes the pattern.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert route/data files | <5 min | si |
| Slice 2 | Revert view files | <10 min | si |
| Slice 3 | Revert scenario/docs | <5 min | si |

### Production verification sequence

No production rollout. Local approval route only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/people/mockup/workforce-documents` renders inside dashboard shell.
- [ ] Mock data covers signed, pending, missing and redacted document states.
- [ ] UI makes EPIC-001 ownership explicit and avoids People-owned uploads/signing.
- [ ] GVC evidence exists for desktop, laptop and mobile.
- [ ] After human approval, owning docs are updated with an approved mockup lock.

## Verification

- `pnpm exec eslint <created-files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture person-workforce-documents-rail --env=local`
- `pnpm fe:capture:review <capture-dir>`
- `git diff --check`

## Closing Protocol

- [ ] Keep task in `to-do` unless explicitly executing/closing it.
- [ ] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` if lifecycle moves.
- [ ] Update EPIC-017 and RESEARCH-008 approval docs.
- [ ] Update `Handoff.md`.
