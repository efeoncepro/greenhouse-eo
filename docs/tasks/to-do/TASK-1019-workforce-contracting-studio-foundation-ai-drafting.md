# TASK-1019 — Workforce Contracting Studio Foundation + AI Drafting

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-017`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr|workforce|ai|documents|notifications|identity`
- Blocked by: `none`
- Branch: `task/TASK-1019-workforce-contracting-studio-foundation-ai-drafting`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear la foundation del Workforce Contracting Studio: casos de carta oferta/contrato siempre bilingues (`es-CL` + `en-US`), borradores versionados, drafting asistido por Claude, validadores deterministas por jurisdiction pack y contrato de APIs/events para viewers, PDF, firma ZapSign y emails posteriores.

Esta task no envia documentos a firma ni genera el PDF productivo final: prepara el dominio para consumir EPIC-001 (`TASK-489`, `TASK-490`, `TASK-491`, `TASK-493`) sin crear un vault/firma paralelo.

## Why This Task Exists

Greenhouse necesita dos modulos complementarios para Workforce: carta oferta previa a contratacion y contrato de trabajo. Ambos documentos deben estar siempre en espanol e ingles. El flujo debe usar IA para redactar desde datos capturados, pero el riesgo legal/laboral impide que Claude sea source of truth o que ZapSign gobierne el documento.

Hoy existen Person 360, Workforce Activation, `WorkRelationshipOnboardingCase`, `international_internal`, Document Vault EPIC-001 y Notification Hub, pero falta el aggregate que conecte datos laborales + AI drafting + validacion + approval + futura firma. Sin esta foundation, futuras UI/PDF/ZapSign tasks tenderian a inventar helpers y tablas locales.

## Goal

- Materializar el aggregate `WorkforceContractingCase` para cartas oferta y contratos.
- Implementar borradores versionados bilingues y ledger de corridas Claude como advisory layer.
- Agregar validators V0 para Chile dependiente, extranjero trabajando en Chile e internacional remoto/internal.
- Enforcear que toda carta oferta y contrato tenga `es-CL` y `en-US` antes de aprobacion, PDF o firma.
- Exponer readers/commands internos para que UI/admin y future API parity consuman primitives, no handlers visuales.
- Dejar eventos/outbox y contracts preparados para PDF, ZapSign y emails sin ejecutarlos en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- `docs/epics/to-do/EPIC-017-unified-workforce-foundation-iterative-program.md`

Reglas obligatorias:

- Claude redacta borradores; Greenhouse valida y humanos aprueban.
- Carta oferta y contrato son siempre bilingues: `es-CL` + `en-US`. Para Chile, `es-CL` es version legal prevalente salvo override de Legal.
- No crear ZapSign calls directos en esta task.
- No crear document vault paralelo. PDF/firma final consumen EPIC-001.
- No mutar Payroll, compensation amounts, contractor payables ni final settlements.
- No usar `members.contract_type` como unica verdad de estado laboral vigente.
- New visible copy must go through canonical copy layer if UI is added.
- Full API parity: commands/readers first; UI/future app lanes consume primitives.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/tasks/to-do/TASK-489-document-registry-versioning-foundation.md`
- `docs/tasks/to-do/TASK-490-signature-orchestration-foundation.md`
- `docs/tasks/to-do/TASK-491-zapsign-adapter-webhook-convergence.md`
- `docs/tasks/to-do/TASK-493-document-rendering-template-catalog-foundation.md`

## Dependencies & Impact

### Depends on

- Existing Person 360 / Workforce / Payroll foundations.
- Claude provider availability and secret configuration, to be discovered during execution.
- EPIC-001 only for future PDF/signature completion, not for this task foundation.

### Blocks / Impacts

- Future Workforce Contracting PDF + ZapSign signature task.
- Future admin workbench `/hr/workforce/contracts`.
- Future collaborator viewers `/my/offers` and `/my/contracts`.
- Workforce Activation readiness once contract signed/registered becomes blocker.
- Notification Hub templates for pre/post/pending signature.

### Files owned

- `docs/tasks/to-do/TASK-1019-workforce-contracting-studio-foundation-ai-drafting.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md`
- `src/lib/workforce/contracting/**`
- `src/app/api/hr/workforce/contracting/**`
- `src/app/api/my/contracts/**` only if read-only self endpoint is included in plan
- `src/config/entitlements-catalog.ts`
- `src/lib/copy/workforce-contracting.ts`
- `migrations/*workforce-contracting*.sql`
- `docs/documentation/hr/**`
- `docs/manual-de-uso/hr/**`

## Current Repo State

### Already exists

- `TASK-875` foundation for `WorkRelationshipOnboardingCase`.
- `TASK-874`/`TASK-876` Workforce Activation readiness and remediation.
- `TASK-894` `international_internal` contract type with legal review reference.
- EPIC-001 defines document registry, signature orchestration, ZapSign adapter and template rendering.
- Notification Hub architecture defines future intent/delivery model.
- Person 360 can become the user-facing evidence hub.
- Product Design mockup route exists at `/hr/workforce/contracts/mockup` with three approved modes: Centro operativo, Flujo guiado and Revisión bilingüe. It is mock data only and must not be treated as runtime implementation.

### Gap

- No `WorkforceContractingCase` aggregate exists.
- No canonical bilingual AI drafting contract exists for HR/legal documents.
- No deterministic jurisdiction pack validators exist for offer/contract readiness.
- No bridge exists between accepted offer -> employment contract -> workforce activation readiness.
- No canonical event vocabulary exists for pre-signature/post-signature/pending-signature emails.

## Product Direction

This task must shape the domain primitives for the approved product direction, even though it does not build the full UI.

The target product is **Workforce Contracting Studio**: a decision, review and orchestration workbench for bilingual offer letters and employment contracts.

Approved product model:

- **Guided Contract Builder:** guided flow from canonical person/workforce facts to readiness, Claude draft, bilingual review, approval and future PDF/signature.
- **Bilingual Legal Review Desk:** side-by-side `es-CL` / `en-US` review with section alignment, parity validation, material divergence blockers, source facts and reviewer notes.
- **Contracting Command Center:** admin queue for HR/Legal/Finance with drafts, blockers, legal risk, signatures pending, exceptions and next action.
- **Collaborator Viewer:** simple self-service experience for `/my/offers` and `/my/contracts`: read, compare languages, sign when ready, download signed artifacts and see honest status.

Design/product constraints:

- No fake-green status: ready states require both languages, parity pass, jurisdiction pack validation and required human approvals.
- Claude is visible but bounded: the UI may show AI notes, source facts and assumptions, but the commands must never treat AI output as approval.
- Every list/detail reader should expose next-action metadata so future UI can sort by operational urgency.
- Every draft/detail reader should expose bilingual parity metadata so future UI can render the review desk without re-running business logic in JSX.
- Future visible copy must use `src/lib/copy/workforce-contracting.ts` and Greenhouse nomenclature; do not hardcode reusable labels in UI.

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

### Slice 1 — Domain Foundation + Migration

- Create schema/table foundation for:
  - `workforce_contracting_cases`;
  - `workforce_contracting_drafts`;
  - `workforce_contracting_ai_runs`;
  - append-only `workforce_contracting_case_events`.
- Add TypeScript domain types and state machine definitions in `src/lib/workforce/contracting/`.
- Persist required document languages as `['es-CL', 'en-US']` and authoritative language per jurisdiction pack.
- Seed capabilities in entitlements catalog:
  - `workforce.contracting.read`;
  - `workforce.contracting.manage`;
  - `workforce.contracting.ai_draft`;
  - `workforce.contracting.approve`;
  - `workforce.contracting.reveal_sensitive`.
- Add idempotent command skeletons:
  - `createWorkforceContractingCase`;
  - `createOfferDraft`;
  - `createEmploymentContractDraft`;
  - `approveWorkforceContractingDraft`;
  - `voidWorkforceContractingCase`.

### Slice 2 — Jurisdiction Pack Validators V0

- Implement pure validators for:
  - `CL_CHILE_DEPENDENT_V1`;
  - `CL_FOREIGNER_WORKING_IN_CHILE_V1`;
  - `INTERNATIONAL_INTERNAL_REMOTE_V1`.
- Validators return structured blockers/warnings and source refs.
- Include minimum Chile contract clause checks from the architecture doc.
- Add bilingual readiness checks:
  - both `es-CL` and `en-US` exist;
  - section codes align across languages;
  - amounts, dates, names, entities and conditions match;
  - authoritative language is present and explicit.
- Enforce `legalReviewReference` for `international_internal` and foreigners working in Chile.
- Add unit tests covering missing facts, unsupported tuple and valid happy path.

### Slice 3 — Claude AI Drafting Adapter

- Add provider wrapper for Claude drafting under a feature flag:
  - `WORKFORCE_CONTRACTING_AI_ENABLED=false` default.
  - Secret resolution via `ANTHROPIC_API_KEY_SECRET_REF` or existing project-approved secret pattern discovered during plan.
- Build deterministic input packet from allowed facts only.
- Use structured output schema `workforce_contracting_ai_draft.v1`.
- Require Claude output to include both `localizedDrafts['es-CL']` and `localizedDrafts['en-US']` plus `languageParity` metadata.
- Persist AI run metadata: provider, model, prompt version/hash, input snapshot hash, output hash, usage/error.
- Persist bilingual parity result in draft validation snapshots.
- Never auto-approve, auto-PDF, auto-send email or auto-sign.
- Add tests for schema validation, bilingual completeness/parity and no-secret/no-provider-token prompt contract.

### Slice 4 — Commands, Readers and API Routes

- Add server-only readers:
  - list contracting cases for admin queue;
  - read case detail with drafts, validation snapshot and event timeline;
  - read own contract/offer summary for collaborator.
- Include product-shaped fields in readers:
  - `nextActionCode`;
  - `riskLevel`;
  - `missingFactsSummary`;
  - `languageParityStatus`;
  - `authoritativeLanguage`;
  - `signatureReadinessStatus` as future no-op/derived status only.
- Add internal product API routes for admin actions using command primitives.
- Add a read-only self route or reader for future `/my/offers` and `/my/contracts`.
- Map errors with sanitized domain errors.
- Ensure every write has audit/event row and idempotency where applicable.

### Slice 5 — Event Vocabulary + Future Integration Contracts

- Emit outbox events for:
  - `workforce.contracting.case_opened`;
  - `workforce.contracting.ai_draft_created`;
  - `workforce.contracting.draft_approved`;
  - `workforce.contracting.ready_for_pdf`;
  - `workforce.contracting.ready_for_signature`;
  - `workforce.contracting.signature_pending_overdue` as future scheduler event contract only.
- Document how future tasks will connect:
  - EPIC-001 rendering/template;
  - EPIC-001 signature/ZapSign;
  - Notification Hub emails;
  - Workforce Activation readiness.

## Out of Scope

- Calling ZapSign.
- Creating signature requests.
- Generating final production PDF.
- Building full admin UI or collaborator viewer.
- Building visual mockup routes for `/hr/workforce/contracts`, `/my/offers` or `/my/contracts`.
- Sending emails.
- Deferring English/Spanish generation to a later task.
- Registering contracts in DT/REL or automating Mi DT.
- Recalculating payroll, compensation or contractor payable amounts.
- Replacing EPIC-001 document registry, template rendering or signature orchestration.
- Creating legal counsel-approved final clause library.

## Detailed Spec

### Suggested status vocabulary

Offer cases:

```ts
type OfferCaseStatus =
  | 'draft'
  | 'ai_drafted'
  | 'pending_internal_review'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'withdrawn'
  | 'converted_to_contract'
```

Contract cases:

```ts
type EmploymentContractCaseStatus =
  | 'intake_pending'
  | 'ai_drafted'
  | 'validation_blocked'
  | 'pending_review'
  | 'legal_review'
  | 'internal_approved'
  | 'ready_for_pdf'
  | 'ready_for_signature'
  | 'sent_for_signature'
  | 'partially_signed'
  | 'fully_signed'
  | 'registered_external'
  | 'active'
  | 'rejected'
  | 'voided'
  | 'expired'
  | 'superseded'
  | 'signature_failed'
  | 'needs_amendment'
```

### Validation output

```ts
type WorkforceContractingValidationResult = {
  jurisdictionPackCode: string
  requiredLanguages: ['es-CL', 'en-US']
  authoritativeLanguage: 'es-CL' | 'en-US'
  readyForReview: boolean
  readyForPdf: boolean
  languageParity: {
    status: 'pass' | 'warning' | 'fail'
    comparedSectionCodes: string[]
    notes: string[]
  }
  blockers: Array<{
    code: string
    severity: 'blocking'
    message: string
    sourceRef: string
  }>
  warnings: Array<{
    code: string
    severity: 'warning'
    message: string
    sourceRef: string
  }>
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.

Do not call Claude before deterministic input packet and validation shape exist. Do not expose write API routes before commands write audit/events. Do not introduce ZapSign/PDF/email behavior in this task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Claude inventa hechos contractuales | ai/hr/legal | medium | allowed-facts packet + sourceFactRefs + deterministic validators + human approval | `workforce.contracting.ai_draft_failed` / validation blockers |
| Version inglesa y espanola divergen | ai/hr/legal | medium | sectionCode alignment + bilingual parity validators + approval as one unit | languageParity fail / validation blockers |
| Contrato se aprueba sin campos minimos Chile | hr/legal/payroll | medium | jurisdiction pack fail-closed | validation test failures |
| Se crea vault/firma paralelo | documents/platform | medium | explicit out-of-scope + EPIC-001 dependency | direct ZapSign calls or new assets helper in diff |
| PII sensible va al prompt sin necesidad | identity/security/ai | medium | prompt contract tests + redaction/allowlist | AI run audit review |
| Write path afecta payroll | payroll/hr | low | no payroll writes, tests around read-only boundaries | payroll tests / code review |
| API bypass de UI sin auth fina | api/identity | medium | capabilities + tenant-safe commands + sanitized errors | auth tests |

### Feature flags / cutover

- `WORKFORCE_CONTRACTING_AI_ENABLED=false` default. Controls only Claude drafting.
- Any UI visibility, PDF generation, ZapSign sending and Notification Hub delivery require separate flags/tasks.
- Cutover for foundation commands can be additive but must not expose nav entry until viewer task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert migration/code before production use; if applied, leave additive tables dormant or drop only with explicit approval | <30 min if dormant | parcial |
| Slice 2 | Revert validators or disable affected jurisdiction pack | <10 min | si |
| Slice 3 | Set `WORKFORCE_CONTRACTING_AI_ENABLED=false` + redeploy | <5 min | si |
| Slice 4 | Revert API routes or remove grants/capabilities | <15 min | si |
| Slice 5 | Stop consuming events; events are additive/no-op until consumers exist | <5 min | si |

### Production verification sequence

1. Apply migration in staging and verify tables, constraints and append-only event guard.
2. Run command tests and API auth tests locally.
3. Keep `WORKFORCE_CONTRACTING_AI_ENABLED=false`; verify draft commands work without Claude.
4. Flip AI flag only in staging with non-real/safe fixture data; verify no secrets in persisted prompt/run metadata.
5. Review one generated draft with HR/Legal before any production AI flag.
6. Production rollout keeps AI flag OFF until operator/Legal approval.

### Out-of-band coordination required

- Legal review of jurisdiction pack language and clause checklist.
- Claude/Anthropic secret provisioning if no existing approved secret exists.
- HR decision on first real pilot person/case.
- EPIC-001 sequencing for PDF/ZapSign future tasks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Contracting aggregate tables exist and are additive, tenant-safe and append-only for events.
- [ ] Domain commands/readers exist under `src/lib/workforce/contracting/**`.
- [ ] Jurisdiction pack validators V0 fail closed for missing Chile minimum facts, legal-review-required flows and missing/misaligned bilingual content.
- [ ] Claude AI drafting is feature-flagged OFF by default, emits `es-CL` + `en-US` structured drafts and persists auditable run metadata.
- [ ] Draft approval cannot proceed unless both languages exist and bilingual parity validation has no blocking divergence.
- [ ] No code calls ZapSign, sends emails or generates production PDFs in this task.
- [ ] API routes consume command/read primitives and enforce capabilities.
- [ ] Readers expose product-shaped metadata for future Command Center, Guided Builder, Bilingual Legal Review Desk and collaborator viewer.
- [ ] Outbox event vocabulary is documented and emitted only for foundation lifecycle events.
- [ ] Documentation explains future connection to EPIC-001, Notification Hub and Workforce Activation.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm task:lint --changed`
- `pnpm docs:closure-check`
- Migration verification against local/dev Postgres if DDL is included
- Focused tests for `src/lib/workforce/contracting/**`
- Focused tests for bilingual draft schema and Spanish/English parity validators

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` quedo sincronizado con el runtime entregado
- [ ] EPIC-001 / EPIC-017 cross-links quedaron actualizados si las dependencias cambiaron

## Follow-ups

- Promote approved mockup direction from `/hr/workforce/contracts/mockup` into runtime after foundation readers/commands exist, keeping GVC parity against the mockup.
- Workforce Contracting PDF + Template Rendering consumer, blocked by `TASK-489` + `TASK-493`.
- Workforce Contracting ZapSign signature consumer, blocked by `TASK-490` + `TASK-491`.
- Admin workbench `/hr/workforce/contracts` with GVC loop.
- Collaborator viewers `/my/offers` and `/my/contracts` with GVC loop.
- Notification Hub templates for pre-signature, post-signature and pending signature reminders.
- Chile external registration evidence lane for DT/REL.

## Open Questions

- Which Anthropic secret naming convention is already approved in Greenhouse, if any?
- What is the first legal entity/pilot cohort for production trial?
- Should offer acceptance happen in Greenhouse self-service before ZapSign, or should the offer itself also be signed through ZapSign in V1?
- Who are the required internal signers for Chile dependent contracts: legal representative only, HR, or dual signer?
- Should the future PDF render both languages sequentially in one artifact, or as a paired artifact set under one document version?
