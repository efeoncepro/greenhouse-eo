# GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1

> **Tipo de documento:** Spec de arquitectura + ADR distribuido
> **Version:** 1.0
> **Creado:** 2026-06-05
> **Estado:** Accepted; **foundation implementada (TASK-1019, 2026-06-05)** en `develop` (sin push). PDF/firma/UI consumen EPIC-001 + tasks de viewer (pendientes).
> **Owner:** HR / Legal / Payroll / Documents / Notifications / AI
> **Validated as of:** 2026-06-05
> **Related:** `EPIC-001`, `EPIC-017`, `TASK-1019`

## 0. Architecture Decision 2026-06-05 -- Workforce Contracting Studio

- **Status:** Accepted
- **Scope:** cartas oferta y contratos laborales siempre bilingues, drafting asistido por Claude, PDF institucional, firma ZapSign, viewers colaborador/admin, emails transaccionales y evidencia de firma.
- **Reversibility:** two-way but slow. El modelo puede ajustarse antes de implementar, pero una vez que documentos firmados, snapshots y webhooks externos vivan en runtime, revertir seria costoso.
- **Confidence:** medium-high. El flujo y boundaries son claros; los detalles de plantillas legales deben pasar por Legal y por discovery oficial por jurisdiccion.

### Context

Greenhouse ya tiene piezas compatibles pero no un modulo de contratacion laboral end-to-end:

- Person 360 y Unified Workforce Foundation como hub de persona.
- Workforce Activation y `WorkRelationshipOnboardingCase` como caso de alta laboral.
- Payroll contract tuple governance, incluyendo `international_internal`.
- EPIC-001 para Document Vault + Signature Orchestration Platform, con ZapSign como primer provider.
- Notification Hub como target futuro para emails/in-app/Teams.

El usuario confirmo que el modulo debe:

- generar carta oferta;
- generar contrato de trabajo;
- emitir ambos documentos siempre en espanol e ingles;
- usar IA con Claude detras para redactar desde datos capturados;
- tener visor local para colaborador;
- tener visor/admin workbench;
- generar PDF;
- enviar emails antes de firma, despues de firma y recordatorios por firma pendiente;
- manejar firma con ZapSign.

### Decision

Greenhouse adoptara un **Workforce Contracting Studio** como capa de orquestacion HR/Legal para documentos previos y finales de incorporacion laboral.

La decision central:

> La IA redacta borradores estructurados; Greenhouse valida determinisiticamente; humanos aprueban; EPIC-001 renderiza/versiona/firma; ZapSign firma como provider; Greenhouse archiva y notifica.

La carta oferta y el contrato son dos aggregates hermanos, no un mismo documento con distinto titulo:

- **Offer Letter**: propuesta previa a contratacion, aceptable/rechazable, con vigencia y condiciones.
- **Employment Contract**: instrumento legal final, con jurisdiction pack, clausulas obligatorias, PDF versionado, firma y evidencia externa.

Ambos documentos son **siempre bilingues**:

- `es-CL` y `en-US` son obligatorios para carta oferta y contrato.
- Para Chile, `es-CL` es la version legal prevalente salvo instruccion expresa de Legal; `en-US` es una version espejo operativa para lectura internacional.
- La aprobacion requiere paridad estructural: mismas secciones, clausulas, montos, fechas, nombres, entidades, condiciones, riesgos y referencias de fuente en ambos idiomas.
- Ningun visor, PDF o firma puede avanzar si falta una version o si la validacion detecta divergencia material entre idiomas.

### Alternatives Considered

1. **Usar ZapSign como source of truth documental completo.**
   - Rechazado. ZapSign debe ser provider de firma, no owner de datos laborales, plantillas, snapshots ni compliance.

2. **Dejar que Claude genere PDF/firma directo.**
   - Rechazado. Claude puede redactar, pero no decide si un documento es legalmente firmable.

3. **Crear un vault laboral propio en HR.**
   - Rechazado. EPIC-001 ya es owner de registry documental, versioning, templates, assets y firma provider-neutral.

4. **Un solo flujo "contrato" sin carta oferta separada.**
   - Rechazado. La carta oferta tiene semantica, aprobacion, vigencia y riesgo distinto del contrato final.

### Consequences

Positive:

- Reduce tiempo de redaccion sin perder control humano.
- Da trazabilidad entre datos capturados, prompt, borrador, validaciones, PDF, firma y evidencia.
- Permite Chile primero y expande a otros paises con packs legales versionados.
- Evita duplicar vault/firma/document manager.
- Reduce ambiguedad internacional al entregar el mismo instrumento en espanol e ingles desde el origen, no como traduccion manual posterior.

Negative:

- Requiere disciplina fuerte de templates, prompts y validators.
- Los contratos son high-risk: no puede haber autopublish ni autosend sin aprobacion.
- Las dependencias EPIC-001/Notification Hub pueden bloquear el cierre end-to-end.

Neutral:

- No reemplaza Payroll ni Workforce Activation.
- No convierte `contract_type` en source of truth unico.
- No hace de Greenhouse un motor legal universal por pais; cada jurisdiccion necesita pack y signoff.

## 1. Product Thesis

Workforce Contracting Studio es la fabrica documental laboral de Greenhouse:

```text
Person / Candidate
  -> Offer Letter Case
  -> Accepted Offer
  -> Employment Contract Case
  -> AI Draft
  -> Deterministic Legal/Payroll Validation
  -> HR/Legal/Finance Approval
  -> PDF Version
  -> ZapSign Signature Request
  -> Signed Artifact + Audit Trail
  -> Workforce Activation Ready
```

El modulo debe sentirse como un workbench operativo, no como un editor generico de documentos. El operador ve excepciones, datos faltantes, riesgo legal, diferencias oferta vs contrato y firmas pendientes.

### 1.1 Product Experience Direction

Workforce Contracting Studio debe ser un producto de **decision, revision y orquestacion**, no una pantalla para "generar texto con IA".

La propuesta de producto aprobada combina tres ideas:

1. **Guided Contract Builder**
   - Flujo guiado para convertir datos canonicos de persona, cargo, compensacion, entidad legal, modalidad y jurisdiction pack en una carta oferta o contrato.
   - El operador avanza por pasos: datos capturados, readiness legal, redaccion IA, revision bilingue, aprobacion, PDF/firma.
   - Cada paso muestra bloqueos concretos y evita estados ambiguos como "listo" cuando faltan datos o validacion legal.

2. **Bilingual Legal Review Desk**
   - Pantalla de revision lado a lado para `es-CL` y `en-US`.
   - Secciones alineadas por `sectionCode`, con badges de paridad y bloqueos si montos, fechas, nombres, entidades, beneficios, condiciones o riesgos no coinciden.
   - Claude puede sugerir redaccion y notas, pero Greenhouse debe explicar que datos uso, que asumio, que falta y que requiere Legal.
   - La aprobacion ocurre sobre el par bilingue completo; no existe aprobacion de un idioma por separado.

3. **Contracting Command Center**
   - Workbench administrativo para HR/Legal/Finance con cola de casos, filtros por riesgo, jurisdiccion, estado, tipo documental, firma pendiente y proxima accion.
   - Esta vista prioriza excepciones y throughput: drafts por revisar, casos bloqueados por datos, listos para firma, firmas vencidas y contratos completados.

La direccion recomendada para V1 es un hibrido: **Guided Contract Builder** como flujo principal, **Bilingual Legal Review Desk** como pantalla diferenciadora, y **Command Center** como entrada operativa para volumen.

### 1.2 Product Surfaces

Admin route:

```text
/hr/workforce/contracts
```

Expected surfaces:

- **Queue / Command Center:** lista operativa de casos con KPIs, filtros segmentados y acciones por proxima decision.
- **Case Detail:** datos capturados, readiness legal/payroll, timeline, eventos, fuentes y bloqueos.
- **AI Draft Panel:** borrador Claude, source facts, missing facts, assumptions, risk flags y reviewer notes.
- **Bilingual Review Desk:** revision `es-CL` / `en-US` lado a lado, paridad por seccion y diffs materiales.
- **Approval Rail:** aprobacion HR/Legal/Finance, readiness para PDF/firma, void/supersede y resend reminders cuando las tareas futuras lo habiliten.

Collaborator routes:

```text
/my/offers
/my/contracts
```

Expected surfaces:

- estado honesto del documento;
- visor bilingue o selector/comparador `es-CL` / `en-US`;
- CTA de firma cuando ZapSign este listo;
- descarga de PDF firmado y evidencia cuando exista;
- estados de falta de accion, pendiente de empresa, vencido o corregido;
- cero edicion de texto legal.

### 1.3 Product Principles

- **No fake green:** el producto nunca debe mostrar "listo para firma" si falta un idioma, si falla paridad, si hay blockers de jurisdiction pack o si falta aprobacion humana.
- **AI is visible but bounded:** Claude debe sentirse como copiloto de redaccion, no como autoridad legal.
- **Bilingual first:** espanol e ingles nacen juntos desde el draft; el ingles no es traduccion manual tardia.
- **Exception-led operations:** la cola debe ordenar por riesgo y proxima accion, no por fecha de creacion solamente.
- **Evidence over decoration:** cada estado critico debe poder explicar de donde viene: dato fuente, validator, reviewer, PDF version, firma o webhook.
- **Calm enterprise UI:** superficies densas pero legibles, sin landing page, sin cards decorativas anidadas y con lenguaje de trabajo.

## 2. Domain Boundary

| Capability | Owner | Contract |
| --- | --- | --- |
| Persona, identidad, documentos legales personales | Person 360 / Person Legal Profile | Workforce Contracting consume, no duplica |
| Alta laboral | Workforce Activation / WorkRelationship Onboarding | Contracting desbloquea readiness documental |
| Tipo contractual y payroll tuple | Payroll / Workforce | Contracting valida contra tuple, no recalcula payroll |
| Redaccion asistida | Workforce Contracting AI | Claude output estructurado, advisory only |
| Plantillas/versiones/PDF/firma | EPIC-001 | Document registry, rendering catalog, signature orchestration, ZapSign adapter |
| Emails y recordatorios | Notification Hub / Email delivery | Contracting emite eventos/intents; no hardcodea fan-out |
| Firma electronica | ZapSign via EPIC-001 provider adapter | ZapSign token/status/webhooks no son source of truth laboral |

## 3. Supported Document Families

### 3.1 Offer Letter

Purpose: propuesta previa a contratacion.

Minimum data:

- persona y datos de contacto;
- cargo, area, manager y seniority;
- tipo de relacion propuesta;
- entidad contratante/pagadora;
- fecha estimada de inicio;
- compensacion, moneda, periodicidad, beneficios y variable;
- modalidad, pais/residencia, lugar o remote setup;
- condiciones previas;
- vigencia de la oferta;
- jurisdiccion;
- versiones obligatorias `es-CL` y `en-US`;
- disclaimers de que la oferta no reemplaza el contrato final.

Lifecycle:

```text
draft
  -> ai_drafted
  -> pending_internal_review
  -> approved
  -> sent
  -> viewed
  -> accepted | rejected | expired | withdrawn
  -> converted_to_contract
```

### 3.2 Employment Contract

Purpose: instrumento legal final.

Minimum Chile dependent baseline, from Direccion del Trabajo official guidance:

- lugar y fecha del contrato;
- individualizacion de partes, nacionalidad, fecha de nacimiento y fecha de ingreso;
- naturaleza de servicios y lugar/ciudad donde se prestan;
- monto, forma y periodo de pago de remuneracion;
- duracion y distribucion de jornada;
- plazo del contrato;
- pactos adicionales y beneficios en especie si aplican;
- procedencia si la contratacion implica cambio de domicilio.

For foreign workers working in Chile, the pack must add migration/work authorization requirements and special clauses when applicable. The DT guidance states that foreign workers can start work only after required residence/work authorization, and contract clauses may include validity subject to visa/work permit and travel clauses for subject-to-contract visa flows.

Lifecycle:

```text
intake_pending
  -> ai_drafted
  -> validation_blocked | pending_review
  -> legal_review
  -> internal_approved
  -> pdf_generated
  -> sent_for_signature
  -> partially_signed
  -> fully_signed
  -> registered_external
  -> active
```

Branches:

```text
rejected | voided | expired | superseded | signature_failed | needs_amendment
```

## 4. Jurisdiction Packs

Jurisdiction packs are versioned deterministic policy modules. They decide what the document needs before it can be approved.

Initial packs:

| Pack | Purpose | Status |
| --- | --- | --- |
| `CL_CHILE_DEPENDENT_V1` | Chile employee, `indefinido` / `plazo_fijo` | First target |
| `CL_FOREIGNER_WORKING_IN_CHILE_V1` | Foreigner working physically in Chile | First target with Legal review required |
| `INTERNATIONAL_INTERNAL_REMOTE_V1` | Person outside Chile paid internally | First target, Legal review required |
| `CL_HONORARIOS_V1` | Chile independent services / boleta | Planned |
| `CONTRACTOR_INTERNATIONAL_V1` | International contractor direct | Planned |
| `EOR_DEEL_V1` | Deel/EOR rail | Planned |

Each pack declares:

- supported `contractType`, `payRegime`, `payrollVia`;
- authoritative language and required companion languages;
- required person fields;
- required compensation fields;
- required clauses;
- prohibited clauses;
- required evidence;
- required approvals;
- signature order;
- external registration requirement;
- retention class;
- validation severity.

## 5. AI Architecture

### 5.1 Claude as Drafting Engine

Claude is used for drafting only. The AI lane must be structured, observable and reversible.

Canonical flow:

```text
capture data
  -> build deterministic context packet
  -> call Claude with template + jurisdiction pack + allowed facts
  -> receive structured output
  -> validate output schema
  -> run deterministic legal/payroll validators
  -> persist draft + AI run metadata
  -> human review
```

Claude may produce:

- sectioned draft text in `es-CL` and `en-US`;
- clause list;
- missing fields;
- legal assumptions;
- risk flags;
- suggested reviewer notes;
- diff vs prior draft;
- translation/parity notes between language versions;
- confidence metadata.

Claude must not:

- send emails;
- create ZapSign requests;
- mark a document approved;
- bypass jurisdiction validators;
- invent compensation, dates, entity identity or tax/payroll facts;
- expose secrets, raw provider tokens or non-needed sensitive data.

### 5.2 Structured Output Contract

The AI response should be a schema-constrained shape:

```ts
type WorkforceContractingAiDraft = {
  contractVersion: 'workforce_contracting_ai_draft.v1'
  documentKind: 'offer_letter' | 'employment_contract'
  jurisdictionPack: string
  requiredLanguages: ['es-CL', 'en-US']
  authoritativeLanguage: 'es-CL' | 'en-US'
  localizedDrafts: Record<'es-CL' | 'en-US', {
    title: string
    sections: Array<{
      sectionCode: string
      heading: string
      body: string
      sourceFactRefs: string[]
      clauseRisk: 'none' | 'low' | 'medium' | 'high'
    }>
  }>
  languageParity: {
    status: 'pass' | 'warning' | 'fail'
    notes: string[]
  }
  missingFacts: Array<{
    factCode: string
    severity: 'blocking' | 'warning'
    reason: string
  }>
  assumptions: string[]
  reviewerNotes: string[]
  prohibitedContentDetected: boolean
}
```

Persist metadata:

- model/provider;
- prompt version;
- prompt hash;
- input snapshot hash;
- output hash;
- token/cost metadata when available;
- actor/correlation id;
- validation result.
- bilingual parity result.

## 6. Data Model, Conceptual

This architecture intentionally does not prescribe final DDL for every table. TASK-1019 owns the first executable schema proposal.

Expected aggregates:

### `workforce_contracting_cases`

Root case for offer or contract.

Key fields:

- `case_id`
- `case_kind`: `offer_letter | employment_contract`
- `subject_identity_profile_id`
- `member_id` nullable pre-hire
- `work_relationship_onboarding_case_id` nullable
- `source_offer_case_id` nullable
- `jurisdiction_pack_code`
- `required_languages`: always `['es-CL', 'en-US']` for offer letters and employment contracts
- `authoritative_language`: jurisdiction-defined, `es-CL` for Chile unless Legal overrides
- `status`
- `target_start_date`
- `contract_type_snapshot`
- `pay_regime_snapshot`
- `payroll_via_snapshot`
- `operating_entity_organization_id`
- `legal_review_reference`
- `created_by_user_id`
- `metadata_json`

### `workforce_contracting_drafts`

Versioned drafts before EPIC-001 final document versioning.

Key fields:

- `draft_id`
- `case_id`
- `draft_version`
- `source`: `manual | claude_ai | imported`
- `status`: `draft | superseded | approved_for_pdf`
- `structured_content_json`
- `validation_snapshot_json`
- `language_parity_snapshot_json`
- `content_hash`
- `created_by_user_id`

### `workforce_contracting_ai_runs`

AI run ledger.

Key fields:

- `ai_run_id`
- `case_id`
- `draft_id`
- `provider`
- `model`
- `prompt_version`
- `input_snapshot_hash`
- `output_hash`
- `status`
- `usage_json`
- `error_summary`

### Document registry links

When EPIC-001 is available:

- final PDF versions live in document registry;
- signature requests live in signature orchestration;
- ZapSign tokens/status live behind provider adapter;
- signed assets are linked back to the case.

No provider URL should be shown as source of truth.

## 7. PDF and Signature Architecture

The signable artifact is a Greenhouse/Efeonce-rendered file, then ZapSign signs it.

**Signable format (investigated 2026-06-05):** ZapSign accepts **both PDF and DOCX** on document creation via upload (`base64_pdf`/`url_pdf`, `base64_docx`/`url_docx`, plus `markdown_text`), 10MB max — PDF is NOT blocked. ZapSign also exposes a separate DOCX **template** feature (`POST /api/v1/templates/create`, `{{field}}` placeholders) whose official guidance is to **avoid images and tables**. Because our contracts use a side-by-side bilingual table layout and an embedded legal-representative signature image (`@/lib/legal-signatures`, TASK-863), Greenhouse does **not** use ZapSign's template feature. Canonical strategy: **Greenhouse/EPIC-001 renders the final signable file (DOCX or PDF) from approved structured content and uploads it via `base64_*` direct upload**; ZapSign is only the collaborator-signature provider. The render target is a dimension (`signable_format ∈ {docx, pdf}`) declared by the jurisdiction pack, not hardcoded. Chile V1 recommended default: `pdf` (reuses the proven `@react-pdf/renderer` + Efeonce footer/slogan + legal-signature PNG pipeline); `docx` stays available per pack. TASK-1019 only reserves this dimension + the `workforce.contracting.generate_document` capability; it renders nothing.

Rules:

- Institutional legal documents use **Efeonce** branding, not Greenhouse app branding.
- The PDF content is rendered from approved structured content, not from ad hoc text concatenation.
- Offer letter and employment contract PDFs render both `es-CL` and `en-US` in the same controlled artifact or in a paired artifact set governed by the same document version/hash policy.
- The renderer must preserve section alignment between languages and show which language is authoritative.
- The PDF asset stores content hash, template version, jurisdiction pack, render timestamp and status-at-render.
- ZapSign receives the approved PDF via EPIC-001 signature orchestration.
- ZapSign webhook updates signature status through canonical webhook inbox/provider adapter.
- The signed PDF and audit report are ingested as private assets and linked to the document version.

ZapSign sources validated 2026-06-05:

- Create document via upload: `https://docs.zapsign.com.br/english/documentos/criar-documento`
- Detail document: `https://docs.zapsign.com.br/english/documentos/detalhar-documento`
- Webhook document events: `https://docs.zapsign.com.br/english/webhooks/eventos/document/doc_created`
- Public product API/iFrame positioning: `https://zapsign.mx/`

## 8. Viewer Architecture

### Collaborator Viewer

Target route:

```text
/my/contracts
/my/offers
```

Capabilities:

- read own offer/contract;
- switch or compare Spanish/English versions;
- see honest status;
- open signing link/iframe when ready;
- download signed PDF after completion;
- see missing-action states;
- never edit legal text.

### Admin Viewer

Target route:

```text
/hr/workforce/contracts
```

Capabilities:

- queue of drafts, approvals, signatures pending and exceptions;
- case detail with facts, validation, AI draft, reviewer notes and timeline;
- bilingual parity view for Spanish/English clauses;
- diff offer vs contract;
- approve for PDF/signature;
- resend reminders;
- void/supersede;
- download original/signed/audit artifacts.

Views and entitlements:

- visible surface uses `views`/route groups.
- sensitive actions use capabilities:
  - `workforce.contracting.read`
  - `workforce.contracting.manage`
  - `workforce.contracting.ai_draft`
  - `workforce.contracting.approve`
  - `workforce.contracting.send_signature`
  - `workforce.contracting.void`
  - `workforce.contracting.reveal_sensitive`

## 9. Notification Contract

Emails are event-driven. Contracting emits domain events; Notification Hub/email adapters deliver.

Required communication families:

| Email | Trigger | Recipient |
| --- | --- | --- |
| Pre-signature | PDF/signature request ready | collaborator + required signers |
| Post-signature | all signers completed | collaborator + HR/legal admins |
| Pending signature reminder | signer overdue | pending signer + owner admin |
| Rejected/needs correction | signer rejects or admin voids | owner admin + collaborator if appropriate |

Emails must use canonical copy and avoid legal overclaiming. "Firmado" means ZapSign/adapter confirmed completion and Greenhouse ingested evidence.

Email bodies may be localized by recipient, but any attached/rendered offer letter or contract must remain bilingual. If an email includes a legal-summary snippet, the snippet must either be bilingual or clearly direct the recipient to the bilingual document viewer/PDF.

## 10. Reliability Signals

Expected signals:

- `workforce.contracting.ai_draft_failed`
- `workforce.contracting.validation_blocked_overdue`
- `workforce.contracting.approved_without_pdf`
- `workforce.contracting.signature_pending_overdue`
- `workforce.contracting.zapsign_webhook_lag`
- `workforce.contracting.signed_artifact_missing`
- `workforce.contracting.pdf_status_drift`
- `workforce.contracting.activation_blocked_by_contract`

Steady state for production should be zero for drift/error signals and bounded for overdue signals.

## 11. Security and Compliance

Hard rules:

- AI prompts use least-needed facts. Do not send secrets, provider tokens, raw bank data or unrelated payroll history.
- Sensitive fields are masked unless needed for drafting and explicitly allowed by policy.
- Every AI run is auditable and reproducible from prompt version + input snapshot hash.
- Both language versions are reviewed as one approval unit; approving only the Spanish or only the English text is invalid.
- Human approval is required before PDF/signature.
- Legal review is required for `international_internal`, foreigners working in Chile, and any unsupported jurisdiction pack.
- Signature links are never persisted as permanent source of truth.
- Signed artifacts are private assets, not public URLs.
- Any external registration evidence, such as DT/REL in Chile, is stored as evidence, not assumed from signature alone.

## 12. Implementation Order

1. **TASK-1019** -- Workforce Contracting Studio Foundation + Claude Drafting V1.
2. EPIC-001 foundations:
   - `TASK-489` document registry;
   - `TASK-493` rendering/template catalog;
   - `TASK-490` signature orchestration;
   - `TASK-491` ZapSign adapter.
3. Workforce Contracting PDF + Signature consumer task.
4. Admin and collaborator viewers with GVC.
5. Notification Hub/email templates and reminders.
6. External registration evidence lane for Chile.

## 13. First Task Boundary

`TASK-1019` must not try to ship the entire module.

It should deliver:

- domain aggregate foundation;
- AI drafting contract;
- Chile/international validation packs V0;
- bilingual `es-CL` + `en-US` output and parity validation contract;
- event and API contracts;
- no final ZapSign signing until EPIC-001 signature foundations are available.

## 14. Sources / Evidence

Official/public sources consulted 2026-06-05:

- Direccion del Trabajo, Contrato Individual de Trabajo: `https://dt.gob.cl/portal/1626/w3-article-100172.html`
- Direccion del Trabajo, Registro de Contrato de Trabajo: `https://www.dt.gob.cl/portal/1626/w3-article-121013.html`
- Direccion del Trabajo, Contrato de Trabajo Electronico: `https://dt.gob.cl/portal/1626/w3-article-117244.html`
- Direccion del Trabajo, Trabajador y Trabajadora Extranjero: `https://www.dt.gob.cl/portal/1626/w3-article-99357.html`
- ZapSign API docs listed in section 7.
- Anthropic Claude structured outputs/tool use docs, validated via official docs 2026-06-05.

## 15. Revisit When

- Chile legal counsel approves or changes the first clause pack.
- EPIC-001 foundations ship and expose concrete runtime contracts.
- ZapSign API/webhook contract changes materially.
- Greenhouse opens a new legal entity outside Chile.
- A non-Chile employee/employer-of-record flow becomes active.
- AI drafting is allowed to move beyond advisory into stronger automation, which would require a separate ADR.

## Delta 2026-06-05 — TASK-1019 foundation implementada (en `develop`, sin push)

Foundation entregada (5 slices, commits `19b5069c1`→`ff8429f25`). NO incluye PDF/firma/emails/UI runtime (esos consumen EPIC-001 + tasks de viewer).

- **Migración** `20260605132850083` (+ `…133159761` capabilities): 4 tablas en `greenhouse_hr` (`workforce_contracting_{cases,drafts,ai_runs,case_events}`) con state-machine transition-guard por `case_kind`, append-only audit triggers, CHECK bilingüe + `signable_format` + status-by-kind, FKs a `identity_profiles`/`members`/`organizations`/`client_users`/`work_relationship_onboarding_cases`. Aplicada al Cloud SQL `greenhouse-pg-dev` (compartido).
- **Dominio** `src/lib/workforce/contracting/`: types puros + state machine (2 matrices, espejo del trigger DB) + store dual-mode + 5 commands atómicos (createCase, createOffer/EmploymentContractDraft, approveDraft, voidCase) con outbox v1 + audit in-tx. Barrel pure-only (store/commands server-only, TASK-827).
- **Validators V0** (`jurisdiction-packs/`): 3 packs (`CL_CHILE_DEPENDENT_V1`, `CL_FOREIGNER_WORKING_IN_CHILE_V1`, `INTERNATIONAL_INTERNAL_REMOTE_V1`) fail-closed + paridad bilingüe + `legalReviewReference` (TASK-894).
- **AI adapter** (`ai/`): cliente Claude canónico `src/lib/ai/anthropic.ts`, flag `WORKFORCE_CONTRACTING_AI_ENABLED=false` (default), schema `workforce_contracting_ai_draft.v1`, allowlist anti-leak, ai_run ledger, advisory-only (nunca auto-approve/PDF/email/sign), eval golden fixtures.
- **Readers + projection + API**: readers product-shaped (Command Center / Bilingual Review Desk / collaborator), 6 rutas `/api/hr/workforce/contracting/**` + `/api/my/{contracts,offers}` (anti-IDOR). 6 capabilities `workforce.contracting.*` (approve = `EFEONCE_ADMIN` unilateral V0).
- **Reliability** (moduleKey `workforce`, Sentry domain `workforce`): 3 signals steady=0. EVENT_CATALOG v1: 6 eventos `workforce.contracting.*`.
- **Verificación**: tsc 0, eslint 0, ~94 tests focales + 414 reliability + live smoke (tx rolled-back: triggers + state machine + append-only + FKs reales).
- **Decisiones del operador (2026-06-05)**: secret `greenhouse-anthropic-api-key` creado (rotar post-impl); aprobación unilateral `EFEONCE_ADMIN`; firma legal del representante ya en repo; dominio `workforce`; formato firmable ZapSign PDF+DOCX (render propio, no template feature).
- **Pendiente (rollout)**: push `develop` + deploy Vercel/workers + flip de flags (cuando aplique) son decisión del operador (instrucción "mantente en develop"). El secret Anthropic debe rotarse antes de habilitar el flag en cualquier ambiente.
