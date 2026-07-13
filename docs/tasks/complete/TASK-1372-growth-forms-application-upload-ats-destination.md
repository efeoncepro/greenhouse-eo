# TASK-1372 — Growth Forms Application Upload + ATS Destination Foundation

## Delta 2026-07-10 — El escaneo de archivos YA EXISTE y es obligatorio (cerrado por TASK-1362)

**Cambia el Slice 2 y responde la Open Question del `scanPolicy`.** TASK-1362 implementó el scan/quarantine
real, así que este slice ya NO puede describirse como "PDF-only V1 hasta que 1362 complete full scan".

- **`scanPolicy='pdf_only_v1'` está MUERTO como opción.** Nunca fue una verificación: `validatePublicCareersCvUpload`
  sólo miraba `file.type`, el MIME que declara el navegador. Un ejecutable renombrado a `.pdf` pasaba.
- **El helper a usar NO es `createPrivatePendingAsset` + `attachAssetToAggregate` a secas.** Entre ambos va
  `scanAndGateUploadedAsset` (`src/lib/storage/asset-scan/gate.ts`), que opera sobre **bytes + assetId** —no sobre
  un `File`— precisamente para que el upload síncrono de esta task lo pueda reusar tal cual. Si el veredicto
  bloquea, el asset queda en cuarentena y **no se adjunta**.
- **Red de seguridad estructural:** `attachAssetToAggregate` ahora RECHAZA los contextos
  `hiring_application_cv` / `hiring_candidate_portfolio_file` sin un veredicto `clean` registrado
  (`asset_scan_required` / `asset_scan_blocking:<verdict>`). Es decir: si el Slice 2 se cablea sin llamar al gate,
  **el attach falla en runtime**, no pasa silenciosamente. No hay forma de abrir un segundo camino sin escanear.
- **Consecuencia para el Slice 3 (projection reactiva):** el consumer del worker sólo ve JSON de PG, nunca un
  `File`. Por eso el escaneo DEBE ocurrir en el submit síncrono (Vercel, donde están los bytes) y el worker se
  limita a adjuntar un asset ya escaneado. `submitPublicHiringApplication` sin `cvFile` NO escanea nada — su
  `attachCv` es un no-op. No confiar en que reusarlo arrastra el scan: no lo hace.
- **Riesgo de la matriz "CV accepted without scan posture" → mitigado, pero sólo si se usa el gate.** El flag
  `ASSET_MALWARE_SCAN_ENABLED` suma ClamAV encima; el escáner estructural corre siempre, prendido o no.

Invariantes duros: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` →
§`Invariantes operativos para agentes — Candidate document capture`.

## Delta 2026-07-08 — Revisión 3-lentes + skill `greenhouse-growth-forms`

Hechos verificados contra el repo real + el contrato canónico de Growth Forms. Ajustes (uno de fondo):

- **⚠️ HALLAZGO DE FONDO — "destination" vs "projection" (revisar Slice 3):** el patrón canónico de Growth Forms (lección TASK-1327 del grader) es explícito: **un `form_destination` entrega LEADS a sistemas externos (HubSpot); crear un objeto de dominio INTERNO es projection reactiva, no un destination.** El grader NO usa un destination falso — usa el reactive consumer `growth_grader_run_from_submission` sobre el outbox `growth.forms.submission_accepted`. Crear un `hiring_application` es exactamente ese caso (objeto interno). → **El "ATS destination adapter" (`greenhouse_hiring_application` provider) debería re-encuadrarse como una projection reactiva** (`growth_hiring_application_from_submission`) sobre `submission_accepted`, que llama `submitPublicHiringApplication`. `DESTINATIONS: []` puede ser correcto para el form de application. Esto disuelve la Open Question del "provider key name" y alinea con el patrón outbox+reactive de CLAUDE.md. Reconciliar Slice 3 + el título de la task.
- **Async, no inline:** el submit de Growth Forms **solo persiste `accepted`**; la creación del `hiring_application` ocurre **async** (projection sobre el evento), NUNCA inline en la ruta de submit (regla dura de la skill: "NUNCA call HubSpot inline from submit").
- **Gap recalibrado (parcialmente stale):** el contrato de Growth Forms **ya declara** el field kind `document_upload` + data class `uploaded_file` (`src/lib/growth/forms/contracts.ts`). El gap real NO es "no existe el campo" sino: (a) el **handling de submit del archivo** (multipart/upload-token) + el **puente a assets privados**, y (b) la projection ATS. Recalibrar el gap.
- **⚠️ Overlap de Files owned con TASK-1362 (deconflictar):** ambas listan `src/lib/storage/greenhouse-assets.ts` + `src/types/assets.ts`. **1362 owns** los hiring asset contexts + el scan/quarantine (net-new); **1372 los CONSUME** (el file field usa los contextos + el scan de 1362), no los redefine. 1372 no debe crear contextos de asset ni scan propios.
- **Scan acoplado a 1362 (`Blocked by: none` subestima):** el upload público de archivos necesita el scan que 1362 owns (su Slice 4). Coordinar: 1372 ship con PDF-only V1 + quarantine como compensating control (el mismo que 1362 usa) y el scan de 1362 lo endurece después; declararlo como dependencia de coordinación, no blocker duro.
- **ops-worker deploy paths:** la projection ATS corre en el ops-worker (como el dispatcher) → asegurar que `src/lib/growth/forms/**` + cualquier path nuevo de la projection estén en las 3 listas de `ops-worker-deploy.yml` (clase de bug recurrente de la skill).
- **Reuse `submitPublicHiringApplication` (1367):** la reconciliación Person→facet→application + dedupe se mantiene canónica; la projection la llama, no la duplica. El endpoint directo `/api/public/hiring/applications` (1367) queda legacy cuando 1373 migra la UI.
- **⚠️ CONTRATO DE RIQUEZA ESTÉTICA (HARD — 1372 debe PROVEER lo que 1373 consume):** 1372 owns el render contract + el renderer, así que **debe exponer como capacidades gobernadas** todo lo que el apply rico de Careers necesita para NO degradarse al migrar (directiva del operador, ver TASK-1373 §`Contrato de paridad estética`): (1) **field policy con `field.presentation.icon`** (allowlist de iconos por campo) para preservar los iconos actuales; (2) **presentación premium vía `styleVariant`** (patrón `diagnostic_premium` de AEO: input look/foco/error tokenizados, **combobox custom de selects** sin popup nativo del SO, motion CTA, copy field-level) reutilizable por careers; (3) **phone-country UI** (bandera/código) como capacidad del renderer, no del host. Si el renderer no soporta alguna, **se extiende el renderer** — NUNCA se acepta un downgrade visual del apply. El file/CV field debe tener su propio visual language gobernado (no un input file crudo). Estas capacidades son parte del contrato que 1373 declara como bloqueante de su paridad; 1372 no está completa si el renderer no puede reproducir la riqueza actual de Careers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Complete / staging live / production pendiente`
- Rank: `TBD`
- Domain: `growth|hr|data`
- Blocked by: `none`
- Branch: `develop` (operator override)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir Growth Forms en el source of truth real para formularios de postulacion: soporte de campos de archivo/CV, validacion, almacenamiento privado y proyeccion reactiva hacia Hiring/ATS. Esto elimina el form custom de careers como write path especial y deja `application` como una capability reusable de Growth Forms.

## Why This Task Exists

`TASK-354` usa un contrato browser de Growth Forms, pero el formulario de postulacion todavia implementa submit, validacion de CV y handoff ATS de forma local. Eso rompe la promesa de Growth Forms como motor gobernado y obliga a repetir capacidades por host. La raiz era que Growth Forms no tenia aun soporte completo para `application` con upload privado y projection reactiva a `hiring_application`.

## Goal

- Agregar soporte de archivo/CV a Growth Forms sin exponer URLs publicas ni secretos.
- Permitir que un Growth Form `formKind='application'` entregue accepted submissions al ATS mediante una projection reactiva gobernada.
- Mantener Turnstile, rate-limit, consent snapshot, PII posture y telemetry de Growth Forms como unico camino.
- Dejar listo el contrato que `TASK-1373` consumira para reemplazar el form local de careers por `<greenhouse-form>`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/complete/TASK-1231-growth-forms-portable-renderer-host-surfaces.md`
- `docs/tasks/complete/TASK-1232-growth-forms-admin-cockpit-first-migration.md`
- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md`
- `docs/tasks/to-do/TASK-1362-candidate-document-capture.md`
- `docs/tasks/in-progress/TASK-354-public-careers-landing-apply-intake.md`

Reglas obligatorias:

- El renderer, Careers, Nexa y futuros hosts consumen el mismo Growth Form contract; no se acepta otro submit local paralelo.
- HubSpot sigue siendo un destination adapter, no el source of truth del formulario ni del ATS.
- El ATS se escribe por command/projection gobernado, no por SQL ni por tabla expuesta a Growth Forms.
- CV/archivos deben usar assets privados, consent, audit, retention y policy de scan/quarantine proporcional al estado real de `TASK-1362`.
- El browser nunca recibe mapping de destination, internal IDs no publicables, secretos ni URLs privadas.

## Normative Docs

- `.codex/skills/greenhouse-growth-forms/SKILL.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/hr/operar-careers-publicas.md`
- `docs/documentation/hr/careers-publicas.md`

## Dependencies & Impact

### Depends on

- Growth Forms engine runtime: `src/lib/growth/forms/**`, `src/growth-forms-renderer/**`, `/api/public/growth/forms/**`.
- Hiring apply command: `src/lib/hiring/public-careers/submit-application.ts`.
- Private asset foundation: `src/lib/storage/greenhouse-assets.ts`, `src/types/assets.ts`.
- **TASK-1362 completo como dependencia consumida:** 1362 owns los hiring asset contexts + el scan/quarantine que el upload público de 1372 necesita. 1372 consume `scanAndGateUploadedAsset`; no redefine contexts ni escaner.
- CV upload contract currently used by careers: `src/lib/hiring/public-careers/cv-upload-contract.ts`.

### Blocks / Impacts

- Blocks `TASK-1373` native Careers apply migration.
- Impacts Growth Forms renderer contract parity tests and public submit API.
- Provides reusable foundation for future application forms beyond Careers.
- Reduces custom form code in `src/components/greenhouse/careers/CareersApplyClient.tsx`.

### Files owned

- `src/lib/growth/forms/**`
- `src/growth-forms-renderer/**`
- `src/app/api/public/growth/forms/**`
- `src/lib/hiring/public-careers/**`
- `src/lib/sync/projections/**` (solo la projection `growth_hiring_application_from_submission`)
- `src/lib/storage/greenhouse-assets.ts` / `src/types/assets.ts` (**consumir** los hiring asset contexts + scan de TASK-1362 — NO redefinirlos; overlap deconflictado: 1362 owns, 1372 consume)
- `docs/manual-de-uso/hr/operar-careers-publicas.md`
- `docs/documentation/hr/careers-publicas.md`
- `Handoff.md`
- `changelog.md`
- `project_context.md`

## Current Repo State

### Already exists

- Growth Forms supports `formKind='application'`, render contracts, Turnstile, consent, telemetry, validators, phone masks and destination dispatch.
- Careers has a first-party form contract in `src/lib/hiring/public-careers/growth-form-contract.ts`.
- Careers currently posts directly to `/api/public/hiring/applications` and can attach a PDF CV as private asset.
- `submitPublicHiringApplication` reconciles Person -> candidate facet -> hiring application with safe dedupe.

### Gap

- El field kind `document_upload` + data class `uploaded_file` **ya existen** en el contrato (`contracts.ts`), pero **falta el handling de submit del archivo** (multipart/upload-token) + el **puente a assets privados** (los contextos/scan los owns TASK-1362; 1372 los consume).
- Growth Forms no tiene una **projection reactiva** que cree un `hiring_application` desde una accepted submission (patrón grader, NO destination adapter).
- CV handling is route-local to Careers instead of reusable platform behavior.
- The current Careers form duplicates field validation and submit orchestration that should belong to Growth Forms.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/forms/**`, `src/growth-forms-renderer/**`, `src/app/api/public/growth/forms/**`, `src/lib/sync/projections/**` y `src/lib/hiring/public-careers/**` dentro del runtime Greenhouse actual; ops-worker drena la projection `growth` existente.
- Future candidate home: `domain-package`
- Boundary: Growth Forms owns the browser-safe render/submit contract and private upload bridge; Hiring owns `submitPublicHiringApplication` and candidate document attachment; renderer, Careers, Nexa/MCP and future hosts consume the same contract and never write ATS tables directly.
- Server/browser split: `contracts.ts`/`src/growth-forms-renderer/contract.ts` expose only browser-safe field policy and presentation metadata; multipart parsing, asset upload, scan, PG persistence, ATS projection and asset attach remain server-only.
- Build impact: no new heavy dependency or filesystem input; changes must keep the portable renderer light and keep `src/lib/growth/forms/**` plus the new projection covered by ops-worker deploy path filters.
- Extraction blocker: a single submit spans Vercel public API, private asset bucket, `greenhouse_growth.form_submission`, outbox, ops-worker reactive processing and Hiring command idempotency; extraction requires preserving those transaction/event boundaries.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.form_submission`, Growth Forms render contract, private assets, Hiring/ATS application command.
- Consumidores afectados: public renderer, Careers, future application forms, Growth Forms cockpit, Nexa/MCP form tooling.
- Runtime target: `local`, `staging`, `production`.

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts`, `src/growth-forms-renderer/contract.ts`, `submitPublicHiringApplication`.
- Contrato nuevo o modificado: file/upload field policy + projection `growth_hiring_application_from_submission` sobre `growth.forms.submission_accepted`.
- Backward compatibility: `compatible|gated` — existing forms must keep rendering/submitting unchanged.
- Full API parity: application submissions are accepted by Growth Forms and delivered to ATS through a single server-side projection; renderer/UI/Nexa do not implement ATS writes.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_submission`, `greenhouse_core.assets`, `greenhouse_core.asset_scan_results`, `greenhouse_hiring.hiring_application`; `greenhouse_growth.form_destination` debe permanecer en `0` para application forms internos.
- Invariantes que no se pueden romper:
  - Uploaded files never expose public storage URLs.
  - File policy is declared in the published form contract and enforced server-side.
  - Accepted submission and file attachment are retry-safe and auditable.
  - The ATS **projection** (`growth_hiring_application_from_submission`, reactive consumer sobre `growth.forms.submission_accepted` — NO un `form_destination`) uses `submitPublicHiringApplication`, never duplicate SQL, never inline en submit.
  - Duplicate form submits must still resolve to generic accepted/dedupe behavior.
  - File fields are omitted from browser telemetry and never logged raw.
- Tenant/space boundary: public anonymous submit writes only through the authorized public form surface; ATS internal access remains downstream in the server-only projection.
- Idempotency/concurrency: submission id/correlation id + ATS dedupe fingerprint + asset pending->attached transition must be retry-safe.
- Audit/outbox/history: Growth Forms submission ledger + outbox accepted event + private asset scan/audit; ATS emits existing hiring events.

### Migration, backfill and rollout

- Migration posture: no new migration; contract-only plus projection registration and private asset reuse.
- Default state: feature gated by form version/file policy; no existing form gains upload behavior automatically.
- Backfill plan: `N/A` for existing form submissions; no historical files to migrate.
- Rollback path: republish previous form version without file field, disable the application form, or remove the projection from worker registration before rollout.
- External coordination: Turnstile config stays existing; no HubSpot requirement for ATS destination.

### Security and access

- Auth/access gate: public form surface + Turnstile + CORS/surface allowlist; admin authoring via Growth Forms capabilities.
- Sensitive data posture: candidate PII + uploaded file metadata; no identity docs in public apply V1.
- Error contract: generic public errors, sanitized projection failures, no raw provider/storage/SQL errors.
- Abuse/rate-limit posture: existing Growth Forms public submit controls plus file size/type limits; no unlimited multipart endpoint.

### Runtime evidence

- Local checks: renderer contract parity, file policy validation, ATS projection unit/integration tests.
- DB/runtime checks: accepted application form submission creates/uses private asset and Hiring application in staging or local PG.
- Integration checks: accepted submission event can be replayed by `growth_hiring_application_from_submission` without duplicate applications.
- Reliability signals/logs: Growth Forms upload/projection failures are observable without PII.
- Production verification sequence: publish test application form version -> submit with small PDF -> verify Growth submission, asset, ATS application, and generic success response.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan

### Audit

=== AUDIT: TASK-1372 ===

SUPUESTOS CORRECTOS:
- Growth Forms is the source of truth for public form definition, published render contract, public submit, consent snapshot, submission ledger and outbox event `growth.forms.submission_accepted`.
- Creating a Hiring application from an accepted application form is a reactive domain projection, not a `form_destination`; `form_destination` remains for external delivery such as HubSpot/email/webhook.
- TASK-1362 already owns the scan/quarantine invariant. TASK-1372 must call `scanAndGateUploadedAsset` while the public submit route still has file bytes, then let the worker attach only a clean private asset.

SUPUESTOS DESACTUALIZADOS:
- The original spec's `scanPolicy='pdf_only_v1'` and "destination adapter" language are stale. Runtime now has a mandatory structural scanner and the canonical pattern is `growth_hiring_application_from_submission`.
- The contract already has `formKind='application'`, `document_upload`, `uploaded_file`, `styleVariant` and phone-country UI support in pieces. The gap is submit handling, upload policy, file renderer, asset bridge and projection registration.
- The task predated `## Modular Placement Contract`; this execution adds it before implementation per EPIC-026 enforcement.

ARQUITECTURA / DOCS OBLIGATORIOS:
- `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — Growth Forms source-of-truth, browser leak boundary, public submit and async delivery.
- `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` — Hiring owns application creation, candidate documents and handoff boundaries.
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — UI/renderer/Nexa consume primitives; no UI-only application write path.
- `MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — build in current runtime, extraction-ready, no opportunistic `apps/*`/`packages/*`.
- `TASK-1362`, `TASK-1367`, `TASK-1373` — scan invariant, public Hiring command, and downstream Careers UI consumer.

CÓDIGO EXISTENTE PARA REUTILIZAR:
- `submitForm` + `persistAcceptedSubmission` + `FORM_SUBMISSION_ACCEPTED_EVENT` for public Growth Forms acceptance.
- `createPrivatePendingAsset`, `scanAndGateUploadedAsset`, `attachAssetToAggregate` and the TASK-1362 attach guard for CV assets.
- `submitPublicHiringApplication` and `parsePublicHiringApplication` for Person/facet/application reconciliation and dedupe.
- Existing reactive projections `growth_grader_run_from_submission` and `growth_ebook_delivery_from_submission` as the outbox consumer pattern.
- Renderer `styleVariant`, premium select and phone-country UI as reusable visual capabilities for TASK-1373.

SCHEMA / RUNTIME REAL:
- `greenhouse_growth.form_submission.normalized_fields_json` stores the accepted submission and emits `growth.forms.submission_accepted`.
- `greenhouse_core.assets` supports `hiring_application_cv_draft` pending/quarantined and final `hiring_application_cv` attachment.
- `greenhouse_core.asset_scan_results` is append-only; final attach contexts reject missing/blocking scans.
- `ops-reactive-growth` drains growth-domain projections in the ops-worker.

ACCESS MODEL:
- Public submit remains anonymous but gated by Growth Forms flag, CORS/surface, Turnstile, consent and rate limits.
- The projection uses server-only commands and does not expose internal Hiring IDs, asset IDs, private URLs, destination mapping or file names to the browser.

SKILLS A USAR:
- `greenhouse-task-execution-hook` — hook/goal contract.
- `greenhouse-growth-forms` — Growth Forms engine, renderer and leak-boundary rules.
- `greenhouse-agent` — repo/runtime boundaries and Greenhouse implementation conventions.
- `greenhouse-task-planner` — task lifecycle/doc format while editing the formal task.
- `greenhouse-qa-release-auditor` and `greenhouse-documentation-governor` at closure.

SUBAGENTES:
- `sequential` — subagents were not authorized; slices touch overlapping Growth Forms contract/renderer/submit/projection boundaries.

RIESGOS / BLAST RADIUS:
- Public file upload abuse, file-name/PII telemetry leaks, duplicate Hiring applications, ops-worker stale deploy filters, and existing non-file form regressions.

OPEN QUESTIONS RESUELTAS:
- Multipart vs token flow -> multipart in the generic public submit route for this slice: Vercel has the bytes and can scan before persistence; no long-lived pre-submit upload token is introduced.
- PDF-only V1 -> resolved as declared MIME/size policy plus mandatory structural scan/quarantine; scanner result, not browser MIME, decides attachability.
- ATS destination key -> no provider key; implement `growth_hiring_application_from_submission` projection.

===

### Plan de ejecucion

1. **Task/docs intake:** keep execution on `develop` per operator override, no worktree/subagents; move task to `in-progress`, add Modular Placement Contract and handoff note.
2. **Contract + compiler:** extend the Growth Forms field contract with browser-safe file upload policy and field presentation icon metadata; remove the V1 blocker for correctly declared file fields; keep renderer contract parity.
3. **Renderer file field:** add governed file/CV visual language, client validation for declared policy, multipart submit only when a file is present, and preserve telemetry no-values/no-file-name.
4. **Public submit + asset bridge:** parse JSON or multipart, enforce declared file policy server-side, create private pending asset, scan/gate bytes immediately, persist only safe file descriptors in `normalized_fields_json`, and accept quarantined assets without exposing details.
5. **Hiring projection:** add `growth_hiring_application_from_submission`, scoped to application forms, re-read the submission, call `submitPublicHiringApplication`, then attach/link clean scanned CV assets idempotently; no ATS SQL or inline creation from submit route.
6. **Seed/contract support:** update the Careers application form contract/foundation so TASK-1373 can consume icon policy, `careers-html-fidelity`, phone-country and CV field capability without migrating the UI yet.
7. **Ops/release filters:** ensure the new projection path and Growth Forms runtime paths are included in ops-worker deploy filters.
8. **Verification:** focused unit tests for contract/compiler, renderer multipart/no-leak, submit asset bridge, projection mapping/idempotency and existing Hiring submit; DB smoke for submission+PDF+asset+application where runtime credentials allow.
9. **Closure:** update manuals/docs/changelog/project context/Handoff, run `task:lint`, `ops:lint`, lint/typecheck/tests/QA/docs gates, move to `complete` only with evidence; otherwise leave code complete / rollout pending.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract and validation

- Extend Growth Forms field/render contract to represent file upload policy for application forms.
- Define accepted MIME/types, max size, optional/required behavior, data classification, retention and scan policy.
- Keep renderer contract parity between `src/lib/growth/forms/contracts.ts` and `src/growth-forms-renderer/contract.ts`.
- Add tests for policy compilation and invalid file configs.

### Slice 2 — Public submit + private asset bridge

- Add multipart/upload handling or an upload token flow to public Growth Forms submit without weakening Turnstile/CORS/rate-limit.
- Reuse private asset helpers and the current CV PDF constraints where applicable.
- Ensure pending assets attach only after submission acceptance and are not left publicly readable.
- Record file metadata safely in submission payload/attachments without leaking file contents.

### Slice 3 — ATS application projection (reactive consumer, NO destination adapter)

- **Patrón canónico (grader precedent):** crear el `hiring_application` es **domain projection**, no delivery. Implementar un **reactive consumer** `growth_hiring_application_from_submission` (espejo de `growth_grader_run_from_submission`) que consume el outbox `growth.forms.submission_accepted` para forms `formKind='application'` y llama `submitPublicHiringApplication` (1367) con mapping server-only. `DESTINATIONS: []` es correcto para el form de application.
- Preserve ATS dedupe, consent y generic response semantics (los da `submitPublicHiringApplication`).
- Async (ops-worker), NUNCA inline en submit; idempotente por submission id + ATS dedupe fingerprint; fallos observables sin PII (reliability signal). Asegurar `src/lib/growth/forms/**` + el path de la projection en las 3 listas de `ops-worker-deploy.yml`.
- **NO** crear un `form_destination` provider `greenhouse_hiring_application` (ese patrón es para delivery externo tipo HubSpot).

### Slice 4 — Operational evidence and docs

- Add fixture form/version for `efeonce-careers-application` or update the existing contract seed path.
- Run local/staging submit with PDF and verify Growth submission + private asset + ATS application.
- Update Growth Forms and Careers manuals so new application forms use the platform path.

## Out of Scope

- Migrating the Careers UI to `<greenhouse-form>`; that is `TASK-1373`.
- Building the Hiring Desk UI.
- Identity document capture after decision; that remains `TASK-1362`.
- Creating a HubSpot destination for candidate applications unless explicitly approved.
- Publishing a real candidate application to production without operator-approved smoke data.

## Detailed Spec

### Required contract capabilities

- File field policy:
  - `type: 'file'` or final approved enum.
  - `acceptedMimeTypes[]`.
  - `maxBytes`.
  - `required`.
  - `multiple=false` for Careers V1.
  - `dataClass='uploaded_file'`.
  - `storageContext='hiring_application_cv_draft'`.
  - `scanPolicy='scan_required'`.
- Reactive ATS projection:
  - Consumer key: `growth_hiring_application_from_submission`.
  - Server-only mapping from accepted normalized fields to `submitPublicHiringApplication`.
  - Opening binding by public id in the accepted submission, not browser-supplied internal IDs.
  - Idempotent delivery using submission replay safety + ATS dedupe.

### Guards

- Existing forms without file fields render exactly as before.
- File upload endpoint rejects unsupported MIME, oversized files, empty files and missing consent.
- Browser telemetry never includes file names, phone, email or free text values.
- Destination mapping stays server-only and does not appear in render contract.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 contract must land before submit/runtime changes.
- Slice 2 file bridge must land before ATS projection.
- Slice 3 projection must land before any Careers migration.
- Slice 4 evidence/docs closes only after runtime smoke or explicit blocker is documented.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| File endpoint becomes abuse vector | Growth/Public API | medium | size/type/rate limits, Turnstile, no public URL | rejected upload counts |
| Duplicate ATS applications | Hiring | medium | ATS dedupe + projection replay safety | duplicate application smoke |
| PII/file name leaks in telemetry | Data/Privacy | low | telemetry allowlist tests | telemetry payload tests |
| Existing Growth Forms regress | Growth renderer | medium | contract parity + existing fixture tests | renderer test failures |
| CV accepted without scan posture | Security | medium | PDF-only V1 + scan policy marker + TASK-1362 hook | scanStatus/asset metadata |

### Feature flags / cutover

- Prefer form-version/destination gating over global flag.
- If endpoint behavior changes globally, guard with a Growth Forms feature flag default off until staging smoke.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| Slice 1 | Revert contract extension before publish | yes |
| Slice 2 | Disable file field policy / revert submit handling | yes |
| Slice 3 | Remove projection registration / republish form without file field | yes |
| Slice 4 | Correct docs and disable test form | yes |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Growth Forms supports a governed file/CV field in the published render/submit contract.
- [x] Public submit accepts file payloads only under declared file policy and stores them as private assets.
- [x] The reactive projection creates a Hiring application through the ATS command path.
- [x] The browser receives no destination mapping, no internal ATS IDs, no private file URLs and no secrets.
- [x] Existing non-file Growth Forms keep passing renderer contract and submit tests.
- [x] Submit with a PDF creates Growth submission, private asset and ATS application in a controlled smoke.
- [x] **Capacidades de riqueza expuestas (bloqueante de la paridad de TASK-1373):** el render contract/renderer soporta (a) `field.presentation.icon` (iconos por campo), (b) `careers-html-fidelity`/premium select existente reutilizable por Careers, (c) phone-country UI existente, y (d) file/CV field con visual language gobernado. 1372 NO está completa si el renderer no puede reproducir la riqueza actual del apply de Careers.
- [x] The implementation is documented for Growth Forms and Careers operators.

## Verification

- `pnpm test src/lib/growth/forms/__tests__/policy-compiler.test.ts src/growth-forms-renderer/__tests__/api-client.test.ts src/growth-forms-renderer/__tests__/renderer.test.ts src/lib/sync/projections/__tests__/growth-hiring-application-from-submission.test.ts` -> PASS, 4 files / 83 tests.
- `pnpm typecheck` -> PASS.
- `pnpm lint` -> PASS.
- `pnpm build` -> PASS; warning residual historico en `src/lib/roadmap/work-item-index/reader.ts` por patron amplio, no introducido por TASK-1372.
- `pnpm worker:runtime-deps-gate` -> PASS, 3 workers.
- `pnpm pg:connect:status` -> PASS, `No migrations to run!`.
- `pnpm qa:gates --changed --agent codex --task TASK-1372 --runtime --data --integration --security --docs` -> advisory high-risk domains identified; required gates executed.
- `pnpm task:lint --task TASK-1372` -> PASS (`errors=0`, `warnings=0`).
- `pnpm ops:lint --changed` -> PASS (`errors=0`, `warnings=0`).
- Runtime smoke with application form + PDF + ATS projection in Cloud SQL dev via proxy -> PASS:
  - submission `fsub-460f074e-5f47-403e-97b5-725f18c3fef2`
  - application `happ-a2637a89-3bf1-499b-9693-fb63ea7ab257`
  - asset `asset-1a0adc1c-ecc3-46d1-ac43-e32627a385ca`
  - asset `private`, `attached`, scan verdict `clean`, destinations `0`.
- Rollout staging on `develop` SHA `25c7e246cbf059847639b5f82ac5c431192685f8` -> PASS:
  - Vercel staging deployment `greenhouse-os2okrbyn-efeonce-7670142f.vercel.app` / `dpl_6eeZa7TE9ptXTzdnUAcBYGsWmszQ` -> `Ready`, alias `dev-greenhouse.efeoncepro.com`.
  - GitHub checks -> PASS: `CI`, `Playwright E2E smoke`, `Task Contract`, `CLAUDE.md governance`, `Artifact Worker Deploy`, `Commercial Cost Worker Deploy`, `Ops Worker Deploy`.
  - Cloud Run `ops-worker` revision `ops-worker-00486-n96` -> `Ready`, `GIT_SHA=25c7e246cbf059847639b5f82ac5c431192685f8`.
  - Exact deployment render -> `200` for `/public/careers`, `/public/careers/EO-OPN-0009/apply` and synthetic `GET /api/public/growth/forms/task-1372-application-smoke-1783972561941?...`.
  - Target apply contract includes `efeonce-careers-application`, `cvFile`, `accept="application/pdf"` and `uploadPolicy.scanPolicy="scan_required"`.
  - Multipart submit without token -> expected `403 captcha_failed/missing_token`.
  - Multipart submit with staging dummy token -> `202 accepted`, submission `fsub-324c40a5-3ab3-4c7a-be1e-871b76c9398e`.
  - Worker projection -> `coalesced:growth_hiring_application` to application `happ-072a61fc-dfda-4278-8955-af12dbb35b42`.
  - Asset `asset-74e85693-916f-4dd4-8a5e-86d934d05cd8` -> `private`, `attached`, owner `hiring_application_cv`, scan verdict `clean`, destinations `0`.

## Closing Protocol

- [x] `Lifecycle` and folder are synchronized.
- [x] `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` are synchronized.
- [x] `Handoff.md`, `changelog.md` and `project_context.md` reflect the new application form capability.
- [x] Manuals and Growth Forms/talent docs tell operators to use Growth Forms, not a custom form path.

## Follow-ups

- `TASK-1373` migrates Careers apply UI to native `<greenhouse-form>` using this contract.
- `TASK-1378` decides whether to provision the optional ClamAV service; structural scan already runs and gates attach.
- Production rollout remains a separate release step. Staging is live and smoked; production was not touched. Before switching Careers UI, `TASK-1373` must publish/consume the real `efeonce-careers-application` form by the governed lifecycle.

## Open Questions

- **[RESUELTA 2026-07-08]** "Provider key name for the ATS destination" → disuelta: NO es un destination. Es una projection reactiva `growth_hiring_application_from_submission` sobre `growth.forms.submission_accepted` (patrón grader). `DESTINATIONS: []`.
- **[RESUELTA 2026-07-13]** File upload flow -> multipart submit for this slice. The public route has the bytes and can scan before persisting the accepted submission; no pre-submit upload token was introduced.
- **[RESUELTA 2026-07-13]** PDF-only V1 -> replaced by declared MIME/size policy plus mandatory structural scan/quarantine from TASK-1362. `scanPolicy='scan_required'`; clean scan is required before final attach.
