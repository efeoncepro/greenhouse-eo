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

- Lifecycle: `to-do`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|hr|data`
- Blocked by: `none`
- Branch: `task/TASK-1372-growth-forms-application-upload-ats-destination`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir Growth Forms en el source of truth real para formularios de postulacion: soporte de campos de archivo/CV, validacion y almacenamiento privado, y destination adapter hacia Hiring/ATS. Esto elimina el form custom de careers como write path especial y deja `application` como una capability reusable de Growth Forms.

## Why This Task Exists

`TASK-354` usa un contrato browser de Growth Forms, pero el formulario de postulacion todavia implementa submit, validacion de CV y handoff ATS de forma local. Eso rompe la promesa de Growth Forms como motor gobernado y obliga a repetir capacidades por host. La raiz es que Growth Forms no tiene aun soporte completo para `application` con upload privado y destination interna `hiring_application`.

## Goal

- Agregar soporte de archivo/CV a Growth Forms sin exponer URLs publicas ni secretos.
- Permitir que un Growth Form `formKind='application'` entregue accepted submissions al ATS mediante un destination/command adapter gobernado.
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
- El ATS se escribe por command/adapter gobernado, no por SQL ni por tabla expuesta a Growth Forms.
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
- **Coordinación con `TASK-1362`** (no blocker duro pero acoplado): 1362 owns los hiring asset contexts + el scan/quarantine (su Slice 4) que el upload público de 1372 necesita. 1372 consume; PDF-only V1 + quarantine = compensating control compartido hasta que 1362 endurezca el scan.
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

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.form_submission`, Growth Forms render contract, private assets, Hiring/ATS application command.
- Consumidores afectados: public renderer, Careers, future application forms, Growth Forms cockpit, Nexa/MCP form tooling.
- Runtime target: `local`, `staging`, `production`.

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts`, `src/growth-forms-renderer/contract.ts`, `submitPublicHiringApplication`.
- Contrato nuevo o modificado: file/upload field policy + Growth Forms destination adapter `greenhouse_hiring_application` or final approved name.
- Backward compatibility: `compatible|gated` — existing forms must keep rendering/submitting unchanged.
- Full API parity: application submissions are accepted by Growth Forms and delivered to ATS through a single server-side adapter; renderer/UI/Nexa do not implement ATS writes.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_submission`, `greenhouse_growth.form_destination`, `greenhouse_growth.form_destination_attempt`, `greenhouse_core.assets`, `greenhouse_hiring.hiring_application`.
- Invariantes que no se pueden romper:
  - Uploaded files never expose public storage URLs.
  - File policy is declared in the published form contract and enforced server-side.
  - Accepted submission and file attachment are retry-safe and auditable.
  - The ATS **projection** (`growth_hiring_application_from_submission`, reactive consumer sobre `growth.forms.submission_accepted` — NO un `form_destination`) uses `submitPublicHiringApplication`, never duplicate SQL, never inline en submit.
  - Duplicate form submits must still resolve to generic accepted/dedupe behavior.
  - File fields are omitted from browser telemetry and never logged raw.
- Tenant/space boundary: public anonymous submit writes only through the authorized public form surface and destination adapter; ATS internal access remains downstream.
- Idempotency/concurrency: submission id/correlation id + ATS dedupe fingerprint + asset pending->attached transition must be retry-safe.
- Audit/outbox/history: Growth Forms submission ledger + destination attempt ledger + asset access/audit; ATS emits existing hiring events.

### Migration, backfill and rollout

- Migration posture: `additive` if a file attachment relation or destination type needs persistence; otherwise contract-only plus destination adapter.
- Default state: feature gated by form version/destination config; no existing form gains upload behavior automatically.
- Backfill plan: `N/A` for existing form submissions; no historical files to migrate.
- Rollback path: disable/deprecate the form destination, republish previous form version, or flag off the new adapter.
- External coordination: Turnstile config stays existing; no HubSpot requirement for ATS destination.

### Security and access

- Auth/access gate: public form surface + Turnstile + CORS/surface allowlist; admin authoring via Growth Forms capabilities.
- Sensitive data posture: candidate PII + uploaded file metadata; no identity docs in public apply V1.
- Error contract: generic public errors, canonical destination attempt errors, no raw provider/storage/SQL errors.
- Abuse/rate-limit posture: existing Growth Forms public submit controls plus file size/type limits; no unlimited multipart endpoint.

### Runtime evidence

- Local checks: renderer contract parity, file policy validation, ATS adapter unit/integration tests.
- DB/runtime checks: accepted application form submission creates/uses private asset and Hiring application in staging or local PG.
- Integration checks: destination attempt status reflects accepted/delivered/retry/dead-letter.
- Reliability signals/logs: Growth Forms destination failures and ATS adapter failures are observable without PII.
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
  - `storageContext` or destination-owned asset context.
  - `scanPolicy='pdf_only_v1' | 'quarantine_required' | final approved enum`.
- Destination adapter:
  - Provider key: `greenhouse_hiring_application` or final approved key.
  - Server-only mapping from form field keys to ATS input.
  - Opening binding by public id or destination config, not browser-supplied internal IDs.
  - Idempotent delivery using submission id + ATS dedupe.

### Guards

- Existing forms without file fields render exactly as before.
- File upload endpoint rejects unsupported MIME, oversized files, empty files and missing consent.
- Browser telemetry never includes file names, phone, email or free text values.
- Destination mapping stays server-only and does not appear in render contract.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 contract must land before submit/runtime changes.
- Slice 2 file bridge must land before ATS adapter.
- Slice 3 adapter must land before any Careers migration.
- Slice 4 evidence/docs closes only after runtime smoke or explicit blocker is documented.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| File endpoint becomes abuse vector | Growth/Public API | medium | size/type/rate limits, Turnstile, no public URL | rejected upload counts |
| Duplicate ATS applications | Hiring | medium | ATS dedupe + destination idempotency | duplicate destination outcome |
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
| Slice 3 | Disable destination adapter / republish form without destination | yes |
| Slice 4 | Correct docs and disable test form | yes |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Growth Forms supports a governed file/CV field in the published render/submit contract.
- [ ] Public submit accepts file payloads only under declared file policy and stores them as private assets.
- [ ] A Growth Forms destination adapter can create a Hiring application through the ATS command path.
- [ ] The browser receives no destination mapping, no internal ATS IDs, no private file URLs and no secrets.
- [ ] Existing non-file Growth Forms keep passing renderer contract and submit tests.
- [ ] Submit with a PDF creates Growth submission, private asset and ATS application in a controlled smoke.
- [ ] **Capacidades de riqueza expuestas (bloqueante de la paridad de TASK-1373):** el render contract/renderer soporta (a) `field.presentation.icon` (iconos por campo), (b) un `styleVariant` premium reutilizable por careers (input/foco/error tokenizados + combobox custom de selects + motion CTA + copy field-level), (c) phone-country UI, y (d) file/CV field con visual language gobernado. 1372 NO está completa si el renderer no puede reproducir la riqueza actual del apply de Careers.
- [ ] The implementation is documented for Growth Forms and Careers operators.

## Verification

- `pnpm task:lint --task TASK-1372`
- `pnpm ops:lint --changed`
- Growth Forms contract parity tests.
- Growth Forms renderer tests.
- Hiring public careers application tests.
- Runtime smoke with application form + PDF + ATS destination in local/staging.

## Closing Protocol

- [ ] `Lifecycle` and folder are synchronized.
- [ ] `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md` are synchronized.
- [ ] `Handoff.md`, `changelog.md` and `project_context.md` reflect the new application form capability.
- [ ] Manuals and Growth Forms/talent docs tell operators to use Growth Forms, not a custom form path.

## Follow-ups

- `TASK-1373` migrates Careers apply UI to native `<greenhouse-form>`.
- `TASK-1362` continues broader candidate document capture, identity docs and formal scan/quarantine.

## Open Questions

- **[RESUELTA 2026-07-08]** "Provider key name for the ATS destination" → disuelta: NO es un destination. Es una projection reactiva `growth_hiring_application_from_submission` sobre `growth.forms.submission_accepted` (patrón grader). `DESTINATIONS: []`.
- Whether file upload should be multipart submit or a pre-submit upload token flow.
- Whether PDF-only V1 is sufficient until `TASK-1362` completes full scan/quarantine (coordinar el compensating control con 1362, que owns el scan).
