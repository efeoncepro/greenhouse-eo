# TASK-964 — Person Workforce Documents Rail + EPIC-001 Alignment

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
- Domain: `cross-domain` (`people|hr|documents|identity|ui|platform`)
- Blocked by: `TASK-961`, `TASK-489`, `TASK-492`, `TASK-494`
- Branch: `task/TASK-964-person-workforce-documents-rail-epic001-alignment`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Conectar la vision People/Workforce de EPIC-017 con la plataforma documental existente de EPIC-001. La ficha persona debe poder mostrar documentos laborales, contractuales, payroll-linked y firma/e-signature como una rail de evidencia, sin crear un document vault paralelo.

Esta task no implementa el registry documental ni e-signature desde cero: alinea `TASK-489`/`TASK-490`/`TASK-492`/`TASK-494` con Person 360 Workforce y define el contrato de consumo desde People.

## Why This Task Exists

El articulo de Deel incluye documentos y e-signature como parte del mismo sistema workforce: contratos, policy documents, audit trail y documentos firmados viven junto al perfil del worker. Greenhouse ya tiene un programa documental robusto (`EPIC-001`) con registry, signature orchestration, document manager y HR vault convergence. El riesgo es que EPIC-017 cree una rail documental local en People y duplique esa plataforma.

La forma correcta es conectar ambos epics: People/Person 360 muestra documentos como evidencia del journey laboral, mientras EPIC-001 sigue siendo owner de storage, versioning, access, signature requests, templates y lifecycle documental.

## Goal

- Definir como Person 360 Workforce consumira documentos desde EPIC-001.
- Vincular/replantear backlog documental existente para soportar la experiencia People-first.
- Evitar un document manager paralelo en People.
- Separar documentos como evidencia read-only en People de workflows documentales/firma owned by EPIC-001.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`

Reglas obligatorias:

- EPIC-001 owns document registry, versions, assets, signature orchestration, templates and document manager UI.
- EPIC-017/Person 360 may surface documents as workforce evidence, but must not become source of truth for documents.
- No duplicated upload/storage/signature state machine in People.
- No raw GCS/provider URLs in People UI.
- Confidential docs use EPIC-001/TASK-492 reveal/redaction patterns.
- E-signature status is evidence unless the user enters a dedicated signature workflow owned by EPIC-001.

## Normative Docs

- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `docs/tasks/to-do/TASK-489-document-registry-versioning-foundation.md`
- `docs/tasks/to-do/TASK-490-signature-orchestration-foundation.md`
- `docs/tasks/to-do/TASK-491-zapsign-adapter-webhook-convergence.md`
- `docs/tasks/to-do/TASK-492-document-manager-access-model-ui-foundation.md`
- `docs/tasks/to-do/TASK-493-document-rendering-template-catalog-foundation.md`
- `docs/tasks/to-do/TASK-494-hr-document-vault-convergence.md`
- `docs/tasks/to-do/TASK-495-commercial-legal-document-chain-convergence.md`
- `docs/tasks/to-do/TASK-868-payroll-receipt-documents-aggregate.md`
- `docs/tasks/to-do/TASK-961-person-360-workforce-facet-read-only-promotion.md`

## Dependencies & Impact

### Depends on

- `TASK-961` — Person 360 Workforce placement.
- `TASK-489` — document registry/versioning foundation.
- `TASK-492` — document manager/access model UI foundation.
- `TASK-494` — HR document vault convergence for `/my/documents`, `/hr/documents`, People documents facet.
- Optional for e-signature status:
  - `TASK-490`
  - `TASK-491`
  - `TASK-493`

### Blocks / Impacts

- Person 360 documents rail.
- `TASK-963` if People List later shows documents-needing-attention counts.
- Unified Worker Create/Edit workflow if onboarding documents/signatures are in scope.
- Future employee/contractor onboarding and contract amendment flows.

### Files owned

- `docs/tasks/to-do/TASK-964-person-workforce-documents-rail-epic001-alignment.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `docs/tasks/to-do/TASK-489-document-registry-versioning-foundation.md`
- `docs/tasks/to-do/TASK-490-signature-orchestration-foundation.md`
- `docs/tasks/to-do/TASK-492-document-manager-access-model-ui-foundation.md`
- `docs/tasks/to-do/TASK-494-hr-document-vault-convergence.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

Runtime files are not owned by this task unless the executing plan explicitly converts this alignment task into implementation after dependencies close.

## Current Repo State

### Already exists

- `EPIC-001` is the canonical document vault + signature orchestration platform.
- `TASK-489` defines document registry/versioning.
- `TASK-490` defines provider-neutral signature orchestration.
- `TASK-492` defines document manager/access model UI.
- `TASK-494` defines HR document vault convergence and already mentions People 360 documents tab.
- `TASK-868` covers payroll receipt documents as linked aggregate.
- `TASK-961` defines Person 360 Workforce as the People-first hub.

### Gap

- EPIC-017 does not yet explicitly depend on EPIC-001 for documents/e-signature.
- The Deel-inspired People profile vision needs a documents rail, but the ownership boundary is not documented in EPIC-017.
- Existing EPIC-001 tasks do not yet cite EPIC-017 as a consumer/driver for People Workforce.
- No task states how signed documents, pending signatures, contracts, addenda, payroll receipts and final settlements appear in Person 360 without duplicating source of truth.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Backlog Alignment

- Update EPIC-017 to list Document Rail as an EPIC-001 dependency.
- Update EPIC-001 to list Person 360 Workforce as a consumer of document registry/signature states.
- Add explicit cross-links in `TASK-489`, `TASK-492` and `TASK-494`.
- Mark `TASK-490`/`TASK-491` as optional for display-only signature status and required only for new signing workflows.

### Slice 2 — Person Documents Rail Contract

- Define the People/Person 360 read-only document rail shape:
  - labor contracts;
  - labor addenda;
  - NDAs/policy acknowledgements;
  - final settlement linked documents;
  - payroll receipts/remittance advice links;
  - identity documents as redacted references only;
  - signature status if available.
- Define what fields are redacted for each audience.
- Define links from People to dedicated document manager/signature flows.

### Slice 3 — Task Disposition Matrix

- Produce a disposition table for existing document/e-signature tasks:
  - `TASK-489` foundational blocker.
  - `TASK-492` required UI/access substrate.
  - `TASK-494` primary HR/People documents execution lane.
  - `TASK-490`/`TASK-491` required only when Greenhouse initiates new signatures.
  - `TASK-493` required only for template-generated docs.
  - `TASK-868`/`TASK-960` linked evidence, not Person-owned generators.
- Add the matrix to EPIC-017 or research appendix.

### Slice 4 — Optional Runtime Follow-up Decision

- Decide whether this task remains documentation-only alignment or should spawn a later implementation task after EPIC-001 foundations close.
- If runtime is needed, do not implement it here unless dependencies are already complete and the plan explicitly narrows the scope.

## Out of Scope

- Implementing document registry.
- Implementing signature orchestration.
- Implementing ZapSign adapter.
- Implementing upload UI.
- Implementing template rendering.
- Mutating or moving `TASK-960` remittance work.
- Duplicating `TASK-494` HR vault convergence.

## Detailed Spec

Person 360 may eventually display:

```ts
type PersonWorkforceDocumentRail = {
  summary: {
    totalVisible: number
    pendingSignature: number
    expiringSoon: number
    needsReview: number
  }
  items: Array<{
    documentId: string
    documentTypeLabel: string
    title: string
    status: 'available' | 'pending_review' | 'pending_signature' | 'signed' | 'expired' | 'redacted'
    source: 'document_registry' | 'linked_aggregate'
    signedAt: string | null
    expiresAt: string | null
    redacted: boolean
    href: string | null
  }>
}
```

This shape is advisory until `TASK-489`/`TASK-492`/`TASK-494` close.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4. Do not create runtime code before the ownership matrix is accepted.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| People creates parallel document vault | documents/platform/ui | medium | Explicit EPIC-001 ownership and blockers | Review finds new document tables/helpers under People |
| Signature workflow starts without provider-neutral foundation | documents/webhooks/legal | medium | Block signing workflows on `TASK-490`/`TASK-491` | Direct ZapSign calls in People diff |
| Sensitive document metadata leaks | identity/documents/security | medium | Use TASK-492 reveal/redaction rules | Redaction tests / review |
| TASK-960/remittance becomes Person-owned | finance/contractor/documents | low | Treat remittance as linked evidence only | Person code recalculates or generates remittance |

### Feature flags / cutover

N/A for documentation-only alignment. Any later runtime rail must decide flagging in its own execution plan.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert doc cross-links | <5 min | si |
| Slice 2 | Revert rail contract docs | <5 min | si |
| Slice 3 | Revert disposition matrix | <5 min | si |
| Slice 4 | Revert follow-up decision docs | <5 min | si |

### Production verification sequence

No production verification for documentation-only alignment. If converted to runtime later, require GVC and access/redaction tests.

## Acceptance Criteria

- [ ] EPIC-017 explicitly treats documents/e-signature as EPIC-001-owned rails.
- [ ] EPIC-001 explicitly names Person 360 Workforce as a consumer.
- [ ] `TASK-489`, `TASK-492` and `TASK-494` are linked to the People Workforce documents rail.
- [ ] `TASK-490`/`TASK-491` are positioned as signing workflow dependencies, not blockers for read-only document evidence.
- [ ] No runtime code or DB schema is changed unless a later approved plan narrows the scope.

## Verification

- `pnpm task:lint --task TASK-964`
- `pnpm docs:context-check`
- `git diff --check`
- Manual review of cross-links and disposition matrix.

## Closing Protocol

- [ ] Move file to `docs/tasks/in-progress/` when taking ownership and `docs/tasks/complete/` only when complete.
- [ ] Keep `Lifecycle` aligned with folder.
- [ ] Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update EPIC-017 and EPIC-001.
- [ ] Update `Handoff.md`.
