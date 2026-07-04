# TASK-1336 — Growth Forms Tokenized Report Success Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|forms|api`
- Blocked by: `verificar contrato actual tokenized_report + TASK-1335 para smoke browser desde Think`
- Branch: `task/TASK-1336-growth-forms-tokenized-report-success-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el contrato gobernado que permite que un submit del `<greenhouse-form>` del AI Visibility / Brand Visibility Grader entregue al host publico un camino browser-safe desde `accepted` hasta el reporte en pantalla: `run handle`/`status URL` y, cuando este listo, `reportToken`/`reportUrl` o un `successBehavior` equivalente. TASK-1327 no puede cerrar su UX con un simple email ni con polling inventado en Think: Greenhouse debe seguir siendo SSOT del submit, estado del run, token y URL publica.

## Program State — No Redescubrir

- `TASK-1325` ya esta **complete/live**: el hub Think y el render publico `/brand-visibility/r/<token>` existen y son el destino base de este contrato.
- `TASK-1330` ya esta **lista/shippeada como capacidad de short links**, con el flag `GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED` pendiente para activacion en el paso a produccion. No bloquea este contrato: `reportUrl` puede resolver al link largo canonico `/brand-visibility/r/<token>` y luego preferir `/s/<code>` cuando el flag este activo.
- El trabajo vivo aqui es solo el handoff gobernado del form: submit aceptado -> handle/status -> token/URL de reporte cuando este listo.

## Why This Task Exists

TASK-1327 construye la landing publica `think.efeoncepro.com/brand-visibility`, donde el usuario deja sus datos para iniciar el lead magnet y espera ver el reporte en pantalla en `/brand-visibility/r/<token>`. El runtime del grader ya tiene piezas publicas importantes: `POST /api/public/growth/ai-visibility/run`, `GET /api/public/growth/ai-visibility/run/[handle]`, `reportToken` cuando el snapshot esta listo y `buildPublicReportUrl(reportToken)`. Pero el embed gobernado de Growth Forms puede terminar en una success card `accepted` sin exponer al host el handle/status necesario para iniciar el loader de analisis y navegar al reporte.

El gap es de contrato, no de UI. Si el renderer del form no entrega un handle/status/token/URL gobernado, Think quedaria tentado a cerrar con "te enviaremos un email" o a inventar polling local. Ambas opciones rompen el loop esperado de EPIC-020: `landing -> form -> grader async -> loader/análisis -> reporte en pantalla`.

## Goal

- Verificar el `successBehavior.kind='tokenized_report'` actual y su relacion real con el submit del form `fdef-ai-visibility-grader`.
- Extender, si falta, el contrato publico de Growth Forms para que el host reciba un outcome seguro: `runHandle`, `statusUrl`, `reportToken`, `reportUrl` o equivalente gobernado.
- Definir un state model publico para `accepted -> queued/processing -> ready -> failed/expired/unavailable` sin filtrar PII ni detalles internos.
- Mantener Greenhouse como SSOT del submit/status/token y Think como host/renderer tonto.
- Dejar tests, smokes y documentacion que prueben compatibilidad con success behaviors existentes y no-leak.

## Delta 2026-07-04 — Arch review (arch-architect): el backbone YA existe, el gap es chico y preciso

> Revisión con `arch-architect` sobre el código real (Slice 0 de Discovery hecho acá). El backbone del
> handoff **ya está construido**; la task se reencuadra de "construir el contrato" a "cablear la etiqueta
> `tokenized_report` a un handoff auto-descriptivo, reusando lo existente".

### Lo que YA EXISTE (verificado en código)

- **El submit YA devuelve `submissionId` al browser:** `PublicSubmitResult { outcome, submissionId? }`
  (contracts.ts:543) y la ruta serializa `{ outcome, submissionId, message }` (submit route). El browser
  recibe el handle en `accepted`.
- **`submission_id` ES un handle público válido y async-safe:** `readPublicGraderRunStatus(handle)`
  (status-reader.ts) resuelve `poll_token` **o** `submission_id` → lead → run → report; maneja el path
  convergente (`queued` = "submission aceptado, run no encolado", flag `submissionSeen`) → **NO da
  `not_found` tras accepted** (el riesgo #3 de la matriz ya está mitigado). `ready` → `reportToken`.
- **El renderer YA emite `gh_form_submission_accepted`** con `correlation_id: submissionId` +
  `success_behavior: kind` (renderer.ts:1605).
- **`buildPublicReportUrl(reportToken)`** ya arma la URL pública del hub.

→ El loop `submit → handle → poll → ready → token → reporte` **ya funciona con piezas existentes**. La
premisa de la task ("puede terminar accepted-only sin exponer el handle") es **parcialmente incorrecta**:
el `submissionId` SÍ se expone; lo que falta es empaquetarlo como un handoff explícito.

### El GAP real (chico y preciso)

- **`tokenized_report` es una etiqueta de enum SIN comportamiento cableado.** En `successBehaviorSchema`
  (contracts.ts:366-382) el `kind='tokenized_report'` existe pero el schema **no tiene campos de handoff**
  (`runHandle`/`statusUrl`/`reportToken`/`retryAfterSeconds`): todos los campos son success-CARD
  (message/title/body/steps/reward/actions/redirectUrl). → cuando el form es `tokenized_report`, el
  renderer hoy pintaría una success card, NO le entrega al host un handoff pollable auto-descriptivo.
- **El handoff no es self-describing:** el host recibe `submissionId` + `kind`, pero **no un `statusUrl`
  explícito** → tendría que hardcodear la ruta del status endpoint y "saber" que es un grader. Eso es lo
  que la task quiere evitar (Think inventando/hardcodeando).

### Fix mínimo (arch-clean, reusa todo)

Cuando `successBehavior.kind === 'tokenized_report'`, el renderer emite en el evento `accepted` un detail
explícito **`tokenizedReport: { runHandle: submissionId, statusUrl }`** (statusUrl = endpoint público
canónico `GET /api/public/growth/ai-visibility/run/[submissionId]`). **Sin nuevo backend, sin tablas, sin
minteo de handle nuevo** — reusa `submissionId` (ya devuelto) + el status reader + `reportToken` + el
reportUrl helper existentes. Luego: **publicar la config `successBehavior.kind='tokenized_report'` en
`fdef-ai-visibility-grader`** (publish additive, reversible) si hoy es `success_card`/`review_pending`.

### Precisión arquitectónica (corregir el Detailed Spec)

El Detailed Spec propone un `PublicTokenizedReportOutcome` fat con `status`/`reportToken`/`reportUrl`
**devuelto por el SUBMIT**. Eso es incorrecto: al momento del submit **el run no existe todavía** (intake
async), así que el submit NO puede traer `status`/`reportToken`. Separar dos payloads:

- **Handoff de entrada (submit / evento accepted):** `{ runHandle: submissionId, statusUrl }` — el punto
  de partida. Nada de status/token (aún no existen).
- **Status (polling `GET /run/[handle]`):** el DTO existente de `readPublicGraderRunStatus` (status
  bounded + `reportToken` cuando `ready`). Es el que evoluciona `queued→processing→ready`.

NO meter status/token en la respuesta del submit.

### Reframe del alcance (las 6 slices colapsan)

- **Slice 0 (Discovery): HECHO acá.**
- **Slice 1/2 (contrato + renderer handoff):** el único trabajo real = emitir el `tokenizedReport
  {runHandle, statusUrl}` explícito en el evento accepted para ese kind. Chico.
- **Slice 3 (status/report):** reusar tal cual `readPublicGraderRunStatus` + `buildPublicReportUrl`. Cero código nuevo.
- **Slice 4 (activación grader form):** publish additive de la config si falta.
- **Slice 5 (tests/docs):** parity + no-leak del nuevo detail + documentar el contrato para TASK-1327.
- Sin migración, sin tabla, sin handle nuevo. El async race ya está resuelto.

### Decisión de las Open Questions

- `tokenized_report` fue **solo etiqueta**, no el handoff pensado → hay que cablearlo (mínimo).
- **Ampliar `gh_form_submission_accepted`** con el `tokenizedReport` detail (no un evento nuevo).
- **`reportToken` + ruta relativa aprobada basta** (Think ya arma `/brand-visibility/r/[token]`); el
  `reportUrl` completo desde el status es opcional (usar el helper canónico si se decide server-side).
- **Basta runtime/schema + publish de config** del form; no una tabla nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- El submit aceptado no significa reporte listo. El contrato debe distinguir `accepted`/`queued`/`processing` de `ready`.
- El browser nunca recibe PII, raw provider text, prompts, destination mapping, HubSpot internals, ids internos sensibles ni errores crudos.
- `reportToken`/`reportUrl` solo se exponen cuando el snapshot publico esta listo y permitido.
- Think no puede consultar endpoints privados, reconstruir el form, inventar status local ni duplicar logica de intake.
- El email queda como recuperacion/refuerzo secundario, no como completion principal para TASK-1327.
- No tocar scoring, probes, normalizer ni `executeClaimedGraderRun`.

## Normative Docs

- `docs/tasks/to-do/TASK-1327-public-lead-magnet-landing-form-embed.md`
- `docs/tasks/to-do/TASK-1335-growth-forms-public-cors-surface-allowlist-governance.md`
- `docs/tasks/complete/TASK-1319-growth-forms-success-card-capability.md`
- `docs/tasks/in-progress/TASK-1320-growth-forms-success-card-renderer.md`
- `docs/tasks/complete/TASK-1239-growth-ai-visibility-public-report-snapshot-token-reader.md`
- `docs/tasks/complete/TASK-1245-growth-ai-visibility-public-run-status-delivery-orchestrator.md`
- `docs/tasks/in-progress/TASK-1251-growth-forms-grader-intake-convergence.md`
- `docs/tasks/complete/TASK-1280-growth-ai-visibility-public-report-model-contract.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms public API foundation.
- `TASK-1239` public report snapshot + token reader.
- `TASK-1245` public delivery status reader / poll contract.
- `TASK-1251` grader intake convergence over Growth Forms.
- `TASK-1319` success behavior schema foundation.
- `TASK-1320` renderer success handling, if host events need extension.

### Blocks / Impacts

- Blocks `TASK-1327` Slice 3 until the embedded form can hand off to the on-screen report loop.
- Coordinates with `TASK-1335`: CORS/surface allowlist is required for browser smoke from Think, but this task owns the success/status contract itself.
- Impacts Growth Forms render/submit contracts, renderer event payloads and public AI Visibility run status consumption.

### Files owned

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/readers.ts`
- `src/growth-forms-renderer/contract.ts`
- `src/growth-forms-renderer/api-client.ts`
- `src/growth-forms-renderer/renderer.ts`
- `src/app/api/public/growth/forms/[formSlug]/route.ts`
- `src/app/api/public/growth/forms/[formSlug]/submit/route.ts`
- `src/app/api/public/growth/ai-visibility/run/[handle]/route.ts`
- `src/lib/growth/ai-visibility/public-delivery/status-reader.ts`
- `src/lib/growth/ai-visibility/public-report-url.ts`
- focal tests under `src/lib/growth/forms/__tests__`, `src/growth-forms-renderer/__tests__` and `src/lib/growth/ai-visibility/__tests__`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/tasks/to-do/TASK-1327-public-lead-magnet-landing-form-embed.md`

## Current Repo State

### Already exists

- `successBehaviorSchema` supports legacy kinds including `tokenized_report`.
- Public grader intake route: `POST /api/public/growth/ai-visibility/run`.
- Public grader status route: `GET /api/public/growth/ai-visibility/run/[handle]`.
- Public status reader returns bounded states and `reportToken` only when a public snapshot exists.
- Public report route/token contract exists and Think renders `/brand-visibility/r/[token]` server-side.
- `buildPublicReportUrl(reportToken)` points to the public hub path.

### Gap

- The Growth Forms submit/render contract does not yet have a verified end-to-end guarantee that a `<greenhouse-form>` host receives the safe run handle/status/report handoff needed by TASK-1327.
- `success_card` can confirm accepted state, but accepted-only UX is not enough for the lead magnet landing.
- If no governed handle/event exists, the host cannot show a truthful analysis loader or navigate to the on-screen report.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: Growth Forms `successBehavior` + public AI Visibility delivery/status contract
- Consumidores afectados: `<greenhouse-form>` renderer, Think `/brand-visibility`, verifier scripts, future public lead magnets
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar:
  - `GET /api/public/growth/forms/[formRef]`
  - `POST /api/public/growth/forms/[formRef]/submit`
  - `POST /api/public/growth/ai-visibility/run`
  - `GET /api/public/growth/ai-visibility/run/[handle]`
  - `GET /api/public/growth/ai-visibility/report/[token]`
- Contrato nuevo o modificado:
  - browser-safe `tokenized_report` outcome for Growth Forms, or equivalent governed `successBehavior`, that gives the host enough data to poll/navigate without private APIs.
  - renderer success event/callback payload that forwards only allowlisted public fields.
- Backward compatibility: `compatible` — existing `inline_message`, `redirect`, `asset_access`, `review_pending`, `success_card` and accepted-only forms must continue to behave.
- Full API parity: the same public contract must work for renderer, server verifier and future host surfaces; no Think-only bridge.

### Data model and invariants

- Entidades/tablas/views afectadas: none expected unless discovery proves a missing durable handle projection.
- Invariantes que no se pueden romper:
  - A successful form submit may return `accepted` before any report exists.
  - `runHandle`/`statusUrl` are public-safe handles, not raw run ids unless already designed as public handles.
  - `reportToken`/`reportUrl` are absent/null until status is `ready`.
  - `failed`, `expired`, `unavailable`, `in_review` and `not_found` remain bounded and non-enumerating.
  - No PII, prompts, provider raw text, full evidence URLs, destination mapping, HubSpot properties or internal exception detail in public payloads or telemetry.
  - Status reads are read-only; a public GET never triggers writes.
- Tenant/space boundary: public anonymous surface; token/handle are the auth boundary for public read.
- Idempotency/concurrency: submit/idempotency remains owned by Growth Forms/public intake; status polling must be safe for repeated browser reads.
- Audit/outbox/history: no new business event unless a new public-success-handoff event is required; any event payload must be PII-free.

### Migration, backfill and rollout

- Migration posture: `none|additive` after discovery.
- Default state: feature compatible; forms without `tokenized_report` keep current success behavior.
- Backfill plan: none expected. If `fdef-ai-visibility-grader` needs a new published form version/config, do it as additive publish, never mutate immutable versions.
- Rollback path: revert schema/renderer extension or publish previous success behavior; status endpoint remains unchanged.
- External coordination: `TASK-1327` implementation in `efeonce-think` consumes this only after contract is verified; `TASK-1335` needed for browser smoke from Think.

### Security and access

- Auth/access gate: public form submit + public handle/status + token-auth report read.
- Sensitive data posture: PII lives server-side; browser payload exposes only the minimum public state.
- Error contract: canonical, bounded codes such as `not_ready`, `in_review`, `expired`, `not_found`, `unavailable`, `rate_limited`, `invalid_success_behavior`; no raw stack traces.
- Abuse/rate-limit posture: status polling must respect existing public rate limits and retry hints; renderer should honor `retryAfterSeconds` when present.

### Runtime evidence

- Local checks: schema/unit tests for valid/invalid `tokenized_report` success behavior and renderer parity.
- Integration checks:
  - submit fixture for `fdef-ai-visibility-grader` returns accepted + public handoff data when configured.
  - status poll returns `queued|processing|ready|in_review|unavailable|not_found` bounded DTO.
  - `ready` includes report token/URL only when snapshot exists.
  - renderer emits success event with allowlisted fields only.
  - legacy success behaviors remain byte-compatible.
- Browser/staging checks after TASK-1335:
  - Think origin can submit the form.
  - submit -> handle/status -> ready -> report URL/token -> Think report route loads.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery del contrato actual

- Inspeccionar `successBehaviorSchema`, `tokenized_report`, submit response, renderer success handling y eventos `gh_form_submission_accepted`.
- Confirmar si el submit del form del grader ya produce `runHandle`, `statusUrl`, `reportToken`, `reportUrl` o equivalente.
- Confirmar si el path forms-engine del grader reutiliza `POST /api/public/growth/ai-visibility/run` o si necesita mapear el handle desde la submission aceptada.
- Documentar el gap exacto antes de editar runtime.

### Slice 1 — Contrato Growth Forms

- Extender el schema/DTO si el `tokenized_report` actual no alcanza.
- Mantener bounds y allowlist de campos browser-safe.
- Garantizar que el render contract y submit response compilan el behavior sin exponer server-only config.
- Asegurar compatibilidad con success-card metadata de TASK-1319/TASK-1320.

### Slice 2 — Renderer handoff

- Hacer que el renderer exponga al host el outcome gobernado en un evento/callback documentado.
- Payload permitido: status publico, `runHandle`, `statusUrl`, `reportToken`, `reportUrl`, `retryAfterSeconds`, `successBehavior.kind`; nada de PII ni ids internos sensibles.
- El renderer puede seguir mostrando success card accepted, pero debe permitir que el host cambie a loader/analysis cuando el contract lo indique.

### Slice 3 — Public AI Visibility status/report handoff

- Reusar `readPublicGraderRunStatus(handle)` y `buildPublicReportUrl(reportToken)`.
- Si falta `reportUrl` en status ready, derivarlo server-side desde el helper canonico o documentar que el host lo arma con ruta relativa aprobada.
- Mantener `GET /run/[handle]` read-only y bounded.

### Slice 4 — Activation para `fdef-ai-visibility-grader`

- Verificar/publish de configuracion si el grader form necesita `successBehavior.kind='tokenized_report'`.
- No cambiar campos, validation, consent, Turnstile ni destino del form salvo lo necesario para el success/status contract.
- Dry-run primero; no hacer release productivo sin confirmacion explicita.

### Slice 5 — Tests, smokes y docs

- Agregar tests focales de schema, compiler, renderer event, no-leak y status ready/not-ready.
- Actualizar docs de Growth Forms y TASK-1327 con el contrato final.
- Preparar un smoke script/curl matrix que TASK-1327 pueda consumir.

## Out of Scope

- **NO** implementar la landing Think (TASK-1327).
- **NO** arreglar CORS/surface allowlist (TASK-1335).
- **NO** renderizar el reporte publico (TASK-1325/TASK-1331 ya son base disponible).
- **NO** cambiar scoring, probes, normalizer ni `executeClaimedGraderRun`.
- **NO** modificar provider adapters, prompt packs o formulas.
- **NO** crear endpoints privados para Think ni proxy local para saltarse Greenhouse.
- **NO** convertir email en cierre primario de la UX.
- **NO** exponer PII, raw evidence, full provider payloads, HubSpot internals ni destination mapping al browser.

## Detailed Spec

Contrato deseado, conceptual y sujeto a Discovery:

```ts
type PublicTokenizedReportOutcome = {
  kind: 'tokenized_report'
  status: 'accepted' | 'queued' | 'processing' | 'ready' | 'in_review' | 'unavailable' | 'expired' | 'not_found'
  runHandle?: string
  statusUrl?: string
  reportToken?: string
  reportUrl?: string
  retryAfterSeconds?: number
}
```

Reglas:

- `runHandle`/`statusUrl` aparecen cuando el submit fue aceptado y hay un run publico rastreable.
- `reportToken`/`reportUrl` aparecen solo con `status='ready'`.
- `in_review` y `unavailable` son finales honestos para el browser; no revelan motivo interno sensible.
- `statusUrl` debe apuntar a la API publica canonical de Greenhouse, no a un endpoint de Think.
- `reportUrl` debe usar el helper publico canonico o una ruta relativa aprobada hacia `/brand-visibility/r/<token>`.
- Eventos del renderer deben ser allowlisted y testeados:

```ts
type GreenhouseFormAcceptedDetail = {
  formId: string
  formKey?: string
  successBehavior: { kind: 'tokenized_report' | string }
  tokenizedReport?: PublicTokenizedReportOutcome
}
```

La forma final puede variar si el runtime ya tiene un contrato equivalente; la aceptacion exige que TASK-1327 pueda implementar el loader y la navegacion sin conocimiento privado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Discovery -> contract -> renderer handoff -> grader activation -> smoke.** No publicar la landing TASK-1327 como completa mientras el handoff sea accepted-only.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se expone PII o internal ids en payload publico | growth/forms | medium | allowlist estricta + tests no-leak | snapshots/event payloads con email/name/runId interno |
| Se rompe success behavior existente | growth/forms | medium | compat tests para legacy kinds | forms AEO/lead-gen cambian UX |
| Host recibe handle pero status no puede resolver | ai-visibility/status | medium | smoke submit->poll con fixture real | `not_found` tras accepted |
| UI inventa progreso | Think/TASK-1327 | medium | state model bounded + retry hints | progress percent sin status real |
| Report token sale antes del publish | report snapshot | low | reader actual solo ready con snapshot | token 404 o reporte incompleto |
| Polling genera abuso | public API | medium | rate limit/retryAfter + bounded response | spike status route |

### Feature flags / cutover

- Mantener flags existentes del intake convergente (`GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED`) sin cambiar su semantica.
- Si se agrega activacion por success behavior, publicar nueva version/config del form del grader como rollout separado y reversible.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert schema/DTO extension o dejar behavior sin nuevos campos | <10 min | si |
| Slice 2 | renderer deja de emitir tokenized report detail, mantiene success card | <10 min | si |
| Slice 4 | publicar version previa del form/config o desactivar behavior | <10 min | si |
| Slice 5 | retirar smoke/docs sin tocar runtime | <5 min | si |

### Production verification sequence

1. Unit/schema/compiler tests verdes.
2. Renderer parity tests verdes.
3. Local/staging submit del grader devuelve handoff publico.
4. Poll status devuelve estados bounded y `ready -> reportToken/reportUrl`.
5. Browser smoke desde Think origin despues de TASK-1335.
6. TASK-1327 consume el contrato sin proxy ni polling local privado.

### Out-of-band coordination required

- Confirmar con el operador antes de publicar o activar en produccion el form behavior nuevo.
- Coordinar con repo `efeonce-think` para que la landing use el evento/status final, no una variante provisional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El contrato actual `tokenized_report` queda verificado y documentado: existe y alcanza, o se extiende de forma compatible.
- [ ] El submit del `<greenhouse-form>` del grader entrega al host un handoff gobernado hacia status/reporte: `runHandle`, `statusUrl`, `reportToken`, `reportUrl` o equivalente.
- [ ] `accepted` no se trata como `ready`; el state model publico distingue pending, ready y finales honestos.
- [ ] `GET /api/public/growth/ai-visibility/run/[handle]` se consume como read-only y bounded; `reportToken` solo aparece cuando hay snapshot publicable.
- [ ] `reportUrl` usa el helper/ruta publica canonica y conduce a `think.efeoncepro.com/brand-visibility/r/<token>` o ruta equivalente aprobada.
- [ ] Renderer/event payload no contiene PII, prompts, raw provider text, destination mapping, HubSpot internals ni ids internos sensibles.
- [ ] Legacy success behaviors siguen compatibles y testeados.
- [ ] `fdef-ai-visibility-grader` queda configurado para el behavior correcto solo mediante publish/config gobernado y reversible.
- [ ] TASK-1327 queda desbloqueada para implementar loader/análisis/reporte en pantalla sin workaround local.
- [ ] No se toca scoring, probes, normalizer ni `executeClaimedGraderRun`.

## Verification

- `pnpm task:lint --task TASK-1336`
- `pnpm test -- --runInBand src/lib/growth/forms/__tests__/policy-compiler.test.ts`
- `pnpm test -- --runInBand src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts`
- `pnpm test -- --runInBand src/growth-forms-renderer/__tests__/renderer.test.ts`
- `pnpm test -- --runInBand src/growth-forms-renderer/__tests__/api-client.test.ts`
- `pnpm test -- --runInBand src/lib/growth/ai-visibility/__tests__/public-run-status-reader.test.ts`
- `pnpm test -- --runInBand src/lib/growth/ai-visibility/__tests__/report-public-leak.test.ts`
- `pnpm type-check`
- `pnpm build`
- smoke staging/curl:
  - submit grader form through Growth Forms;
  - extract public handoff;
  - poll status until `ready|in_review|unavailable`;
  - load report route when `ready`;
  - assert no PII/no raw leakage.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [ ] `docs/architecture/growth-public-forms-runtime-contract.md` actualizado si cambia contrato publico
- [ ] `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` actualizado si cambia status/outcome
- [ ] `docs/tasks/to-do/TASK-1327-public-lead-magnet-landing-form-embed.md` actualizado con el contrato final
- [ ] `Handoff.md` actualizado si se implementa runtime
- [ ] `changelog.md` actualizado si cambia comportamiento observable

## Follow-ups

- TASK-1327 consume el contrato en la landing Think.
- Tracking/analytics del funnel landing -> submit -> ready -> report.
- UX de fallback para `in_review`/`unavailable` en Think si el reporte no queda listo en la sesion.

## Open Questions

- ¿El `tokenized_report` existente ya fue pensado para este exacto handoff o solo como etiqueta de success behavior?
- ¿El renderer debe emitir un evento nuevo o ampliar `gh_form_submission_accepted`?
- ¿`reportUrl` debe venir completo desde Greenhouse o basta con `reportToken` + path relativo documentado para el hub?
- ¿Hay que publicar una nueva version de `fdef-ai-visibility-grader` o basta con runtime/schema para el behavior ya publicado?
