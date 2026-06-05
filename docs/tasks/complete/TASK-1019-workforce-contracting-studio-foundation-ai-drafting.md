# TASK-1019 — Workforce Contracting Studio Foundation + AI Drafting

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Product Design mockup **ya commiteado** (pase Codex 2026-06-05), mock data only, no debe tratarse como runtime:
  - Ruta: `src/app/(dashboard)/hr/workforce/contracts/mockup/page.tsx`.
  - Vista + data: `src/views/greenhouse/hr/workforce-contracting/mockup/{WorkforceContractingStudioMockupView.tsx,data.ts}`.
  - Copy: `src/lib/copy/workforce-contracting.ts` (`GH_WORKFORCE_CONTRACTING`).
  - Scenario GVC: `scripts/frontend/scenarios/workforce-contracting-studio-mockup.scenario.ts`.
  - Tres modos aprobados (Centro operativo / Flujo guiado / Revisión bilingüe) + preview colaborador. Es la dirección visual de referencia para los readers product-shaped de Slice 4 (los campos `nextActionCode`, `riskLevel`, `languageParityStatus`, `missingFactsSummary`, `authoritativeLanguage` deben alimentar exactamente lo que el mockup pinta — copy-and-patch + paridad GVC al promoverlo, ver TASK-1018).

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
  - `workforce.contracting.generate_document`;
  - `workforce.contracting.reveal_sensitive`.
- **Capability → runtime grant (mismo PR, invariante TASK-873/935):** sembrar una capability en el catalog SIN grant en `src/lib/entitlements/runtime.ts` = 403 para todos + rompe el guard `capability-grant-coverage.test.ts`. Matriz **decidida (operador 2026-06-05)** — aprobación unilateral del operador en V0:

  | Capability | Roles (grant runtime) | Notas |
  | --- | --- | --- |
  | `workforce.contracting.read` | route_group `hr` ∪ `HR_MANAGER` ∪ `HR_PAYROLL` ∪ `EFEONCE_ADMIN` ∪ `FINANCE_ADMIN` | lectura cola/casos |
  | `workforce.contracting.manage` | route_group `hr` ∪ `HR_MANAGER` ∪ `EFEONCE_ADMIN` | crear/editar drafts |
  | `workforce.contracting.ai_draft` | `HR_MANAGER` ∪ `EFEONCE_ADMIN` | disparar draft Claude |
  | `workforce.contracting.approve` | **`EFEONCE_ADMIN`** (V0 — aprobación unilateral del operador) | aprobación del par bilingüe completo. NO multi-firma en V0; HR/Finance gates = follow-up si el volumen lo pide. |
  | `workforce.contracting.generate_document` | `EFEONCE_ADMIN` | **gate de la acción** de generar el artefacto firmable (DOCX/PDF). Reservada en la foundation, ejercida por el render/signature consumer futuro (TASK-493). El formato (`docx`/`pdf`) es un parámetro, NO una capability aparte — se gatea la acción, no el formato. |
  | `workforce.contracting.reveal_sensitive` | `EFEONCE_ADMIN` ∪ `HR_MANAGER` | PII para drafting |

  Toda capability que se chequee vía `can()` en un endpoint DEBE estar en la matriz. Verificar que los roles citados existen en `src/config/role-codes.ts` antes de mergear (NO usar `DEVOPS_OPERATOR`, `HR_ADMIN` ni roles fantasma).
- **Firma legal del representante:** el contrato/PDF (follow-up, no esta task) lleva la firma legal del operador, **ya presente en el repo** (`src/assets/signatures/77357182-1.png`, Efeonce Group SpA RUT 77.357.182-1), resuelta por el helper canónico `@/lib/legal-signatures` (TASK-863). No re-implementar resolución de firma.
- **Observabilidad (decisión operador 2026-06-05):** agregar `'workforce'` a `CaptureDomain` (`src/lib/observability/capture.ts`, additivo) + subsystem rollup nuevo en el Reliability Control Plane para los signals `workforce.contracting.*`. Usar siempre `captureWithDomain(err, 'workforce', ...)`, nunca `Sentry.captureException` directo.
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
- Cada jurisdiction pack declara `signableFormat: 'docx' | 'pdf'` y `signatureProvider: 'zapsign'` (ver Detailed Spec → "Signable render format + ZapSign"). Los validators NO renderizan, pero exponen los requisitos de formato firmable para que el render/signature consumer futuro no quede boxed-in.
- Include minimum Chile contract clause checks from the architecture doc.
- Add bilingual readiness checks:
  - both `es-CL` and `en-US` exist;
  - section codes align across languages;
  - amounts, dates, names, entities and conditions match;
  - authoritative language is present and explicit.
- Enforce `legalReviewReference` for `international_internal` and foreigners working in Chile. Aplicar el invariante canónico TASK-894: `legalReviewReference` >= 10 chars, NUNCA loggear ni publicar el valor crudo en outbox/Sentry; el evento usa solo `hasLegalReviewReference`. Fail-closed si falta.
- No usar `members.contract_type` como verdad única de estado laboral; resolver clasificación vigente vía el resolver canónico (TASK-957 `resolveCurrentWorkClassification`) o los snapshots del caso. La validación contrasta contra la tupla `(contract_type, pay_regime, payroll_via)`, no recalcula payroll.
- Add unit tests covering missing facts, unsupported tuple and valid happy path.

### Slice 3 — Claude AI Drafting Adapter

- **Cliente Anthropic canónico, NO paralelo:** el wrapper de Claude vive en `src/lib/ai/anthropic.ts`, junto a `src/lib/ai/google-genai.ts` (Gemini/Vertex) y `src/lib/ai/openai-image.ts` (OpenAI) — los tres providers conviven en `src/lib/ai/`. El módulo `src/lib/workforce/contracting/` **consume** ese cliente, no instancia su propio SDK. Patrón: `import 'server-only'`, secret server-only vía `resolveSecretByRef`, mirror de la forma de `openai-image.ts`/`google-genai.ts`.
- Add provider wrapper for Claude drafting under a feature flag:
  - `WORKFORCE_CONTRACTING_AI_ENABLED=false` default.
  - Secret **ya creado** `greenhouse-anthropic-api-key` (GCP Secret Manager, project `efeonce-group`), ref `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` (registrar en Vercel en este slice). Resolución server-only vía `resolveSecretByRef`.
  - Modelo: agregar id(s) Anthropic al shape `provider/model@version` (`anthropic/claude-*@default`) en `src/config/nexa-models.ts` (o config drafting dedicada si no debe aparecer en el picker Nexa de usuario). Para drafting legal preferir un modelo de mayor capacidad (p.ej. Opus/Sonnet 4.x) sobre Haiku.
- Build deterministic input packet from allowed facts only.
- Use structured output schema `workforce_contracting_ai_draft.v1`.
- Require Claude output to include both `localizedDrafts['es-CL']` and `localizedDrafts['en-US']` plus `languageParity` metadata.
- Persist AI run metadata: provider, model, prompt version/hash, input snapshot hash, output hash, usage/error.
- Persist bilingual parity result in draft validation snapshots.
- Never auto-approve, auto-PDF, auto-send email or auto-sign.
- **Eval baseline (invariante arch-architect):** ningún cambio de prompt/agente sin baseline. Agregar un set de golden fixtures por jurisdiction pack (`CL_CHILE_DEPENDENT_V1`, `CL_FOREIGNER_WORKING_IN_CHILE_V1`, `INTERNATIONAL_INTERNAL_REMOTE_V1`) con input packet determinista + output esperado, ejercidos como regresión sin llamar al provider real (fixture/replay). Los validators deterministas + el schema parity actúan como gate del eval.
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
- Building NEW visual mockup routes, or wiring the existing committed mockup (`/hr/workforce/contracts/mockup`) to runtime data/commands. El mockup ya existe y queda intacto como referencia; promoverlo a runtime es follow-up post-foundation.
- Sending emails.
- Deferring English/Spanish generation to a later task.
- Registering contracts in DT/REL or automating Mi DT.
- Recalculating payroll, compensation or contractor payable amounts.
- Replacing EPIC-001 document registry, template rendering or signature orchestration.
- Creating legal counsel-approved final clause library.

## Detailed Spec

> **Status vocabulary es source of truth ejecutable.** El arch doc §6 declara que TASK-1019 owns el primer schema ejecutable; cuando estos enums diverjan del lifecycle textual del arch doc §3.2, **este enum prevalece** y el arch doc se sincroniza al cierre. Mapeo del único punto de divergencia: arch doc `pdf_generated` ≅ este enum `ready_for_signature` (PDF rendereado, pendiente de envío a firma). El reliability signal `workforce.contracting.approved_without_pdf` discrimina `internal_approved`/`ready_for_pdf` vs `ready_for_signature`, así que la granularidad de este enum es la correcta.

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

### Signable render format + ZapSign (investigado 2026-06-05)

**Hallazgo (corrige la premisa "ZapSign solo firma DOCX"):** ZapSign acepta **PDF *y* DOCX** (no solo DOCX) al crear documento vía upload, más `markdown_text`. Parámetros verbatim:

- PDF: `url_pdf` o `base64_pdf`.
- DOCX: `url_docx` o `base64_docx`.
- Texto: `markdown_text`.
- Límite: 10MB por archivo.

Existe además el **DOCX template feature** (distinto del upload directo): subir un `.docx` con placeholders `{{campo}}` vía `POST /api/v1/templates/create` (`docx_url` o `base64_docx`) y luego generar el documento firmable con los datos llenados. **Caveat oficial de ZapSign para templates: "Avoid images and tables in the DOCX document, as they may interfere with proper functionality."**

**Implicancia arquitectónica (por qué NO usamos el template feature de ZapSign):** nuestro contrato bilingüe usa (a) layout ES/EN lado a lado (tablas) y (b) la **firma legal del representante como imagen** (`src/assets/signatures/77357182-1.png`, TASK-863). Ambos chocan con el caveat "avoid images and tables". Por eso la estrategia canónica es:

> **Greenhouse / EPIC-001 renderiza el artefacto firmable final** (DOCX o PDF) desde el structured content aprobado, y lo sube a ZapSign vía `base64_docx` / `base64_pdf` (upload directo, NO el template feature). Greenhouse mantiene control total de layout bilingüe + firma legal pre-estampada; ZapSign es solo provider de firma del colaborador.

**Firma del documento (modelo V0):** la firma legal del representante (operador) va **pre-estampada** por el renderer (imagen PNG embebida, helper `@/lib/legal-signatures`); el colaborador firma electrónicamente vía ZapSign como signer. No hay rol `legal` separado (TASK-935): el operador es el firmante legal de la empresa.

**Qué reserva la foundation (esta task) — sin renderizar ni llamar ZapSign:**

- **Dimensión de formato firmable** en el contrato de caso/draft: campo `signable_format` enum `'docx' | 'pdf'` (declarado por el jurisdiction pack, no hardcodeado). Esto evita que el render/signature consumer futuro quede boxed-in a PDF.
- **`signatureProvider`** reservado (`'zapsign'`) a nivel pack para que el adapter EPIC-001 (TASK-491) lo resuelva.
- **Capability `workforce.contracting.generate_document`** (gate de la acción de generar; el formato es parámetro). Sembrada + grant `EFEONCE_ADMIN`, **dormant** hasta el render consumer.
- Validators format-aware: exponen como warning/blocker si para el `signable_format` declarado faltan inputs de render (p.ej. firma legal ausente, secciones sin `sectionCode`), sin renderizar.

**Decisión de formato para Chile V1 (a confirmar en el render consumer, NO en esta task):** `docx` es editable y ZapSign-friendly, pero hoy el render institucional Efeonce (TASK-863, finiquitos) es **PDF vía `@react-pdf/renderer`** y ya resuelve firma legal + branding + tablas. Recomendación: **default `pdf`** para Chile V1 (reusa el pipeline `@react-pdf/renderer` + footer/eslogan Efeonce + firma legal PNG ya probados), y dejar `docx` disponible vía la dimensión `signable_format` para jurisdicciones/casos que lo requieran. Si se elige `docx`, el render consumer necesita una lib DOCX nueva (p.ej. `docx` npm) — no existe en el repo hoy.

**Out of scope reafirmado:** TASK-1019 NO genera DOCX ni PDF, NO sube nada a ZapSign, NO crea signature requests. Solo reserva la dimensión de formato, la capability y el contrato para que el consumer futuro (TASK-489/490/491/493) lo ejerza.

**Fuentes ZapSign (validadas 2026-06-05):**

- Create document via upload (formatos `base64_pdf`/`url_pdf`/`base64_docx`/`url_docx`/`markdown_text`, 10MB): `https://docs.zapsign.com.br/english/documentos/criar-documento`
- Add document base64 DOCX (SDK): `https://docs.zapsign.com.br/facilitadores/sdks/sdk-em-go/requisicoes-para-documentos/adicionar-documento-base64-docx`
- Create template (DOCX) — placeholders `{{campo}}`, `POST /api/v1/templates/create`, caveat "avoid images and tables": `https://docs.zapsign.com.br/english/templates/create-template-docx`

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

- ~~Anthropic secret naming~~ → **Resuelto 2026-06-05:** secret `greenhouse-anthropic-api-key` **creado** en GCP Secret Manager (project `efeonce-group`, version 1, probado HTTP 200 contra `claude-haiku-4-5-20251001`). Consumir server-only vía `resolveSecretByRef` con `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` (registrar en Vercel al llegar a Slice 3). ⚠️ La key se pegó en chat → **rotar** y subir nueva version (`gcloud secrets versions add`).
- ~~Composición de aprobadores~~ → **Resuelto 2026-06-05:** V0 aprobación unilateral del operador (`workforce.contracting.approve` = `EFEONCE_ADMIN`). Firma legal del representante ya en repo (`src/assets/signatures/77357182-1.png`). Multi-firma HR/Finance = follow-up.
- ~~Dominio de observabilidad~~ → **Resuelto 2026-06-05:** agregar `'workforce'` a `CaptureDomain` + subsystem rollup propio.
- What is the first legal entity/pilot cohort for production trial?
- Should offer acceptance happen in Greenhouse self-service before ZapSign, or should the offer itself also be signed through ZapSign in V1?
- Who are the required internal signers for Chile dependent contracts: legal representative only, HR, or dual signer?
- Should the future PDF render both languages sequentially in one artifact, or as a paired artifact set under one document version?
