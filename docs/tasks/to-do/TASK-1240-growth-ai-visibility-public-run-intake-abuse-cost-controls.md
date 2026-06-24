# TASK-1240 — Growth AI Visibility: Public Run Intake + Abuse/Cost Controls

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1234`
- Branch: `task/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el **write path público** del lead magnet: `createPublicGraderRun(input, idempotencyKey)` que toma el input público (§9.2: marca, sitio, país, industria, descripción, **work email + consent**), crea perfil + run (`kind=public_diagnostic`, `mode=light`), persiste consent + email (lead), y **encola** al worker async (TASK-1234) — con **control de abuso/costo de nacimiento** (rate-limit por IP/email, cost ceiling, captcha, modo `light`). Es la única escritura pública del dominio; el LLM nunca escribe, sólo se ejecuta un run gobernado.

## Why This Task Exists

El motor ya ejecuta runs (TASK-1234) pero solo desde endpoints `/api/admin/**`. Para que un prospecto genere su propio reporte, falta el intake público: capturar input + consent + email, crear el run, y encolarlo — **sin** exponer un vector de gasto LLM no acotado (un POST público que dispara llamadas a OpenAI/Gemini es plata real de cualquiera en internet). Sin rate-limit + cost ceiling + captcha + modo `light`, el lead magnet es un agujero de costo y un riesgo de abuso. También falta el contrato de consent/PII: el email es PII (Ley 21.719/GDPR) y NUNCA debe viajar a los providers.

## Goal

- Command `createPublicGraderRun(input, idempotencyKey)`: valida + crea perfil/run público + persiste consent + email (lead) + encola al worker (TASK-1234). NUNCA PII a providers.
- Controles de abuso/costo: rate-limit (IP + email), cost ceiling por ventana, captcha verification, modo `light` forzado para público.
- Endpoint público `POST` (sin sesión; captcha + rate-limit) que devuelve el `run.public_id` para poll; flag default OFF hasta rollout.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9.1 (public flow), §9.2 (input fields), §9.3 (states), §9.4 (trust/privacy), §11.2 (`createAiVisibilityRun`).
- `docs/tasks/complete/TASK-1234-growth-ai-visibility-async-run-execution-worker.md` — `enqueueGraderRun` + worker drain (encolar, NO ejecutar inline).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — loop de acción gobernada (el LLM no escribe).
- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md` — rol (B).

Reglas obligatorias (invariantes duros):

- **NUNCA** PII (email/teléfono/datos del submitter) viaja a los providers — la marca/categoría se interpolan como dato delimitado; el email vive sólo en el lead (anti prompt-injection + privacidad).
- **NUNCA** ejecutar el run inline en el endpoint público: se ENCOLA (`enqueueGraderRun`) y lo corre el worker async (TASK-1234).
- **NUNCA** exponer el POST público sin rate-limit + cost ceiling + captcha — el público dispara gasto LLM real.
- Consent **requerido** y persistido con timestamp (postura Ley 21.719/GDPR); modo `light` forzado (providers baratos).

## Normative Docs

- `docs/tasks/complete/TASK-1234-growth-ai-visibility-async-run-execution-worker.md` — enqueue/worker (dependencia directa).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — `grader_profiles`/`grader_runs`, `mode=light`, `kind=public_diagnostic`, cost estimator.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — postgres pooling Vercel + rate-limit/abuse posture.

## Dependencies & Impact

### Depends on

- `TASK-1234` (complete) — `enqueueGraderRun` + worker drain.
- `TASK-1226` (complete) — `grader_profiles`/`grader_runs`, `mode=light`, cost estimator, `public_id` no enumerable.
- `TASK-1239` (A) — el snapshot/token que la página mostrará tras completarse el run (coordinación, no bloqueo duro).

### Blocks / Impacts

- Bloquea la página pública (EPIC-020 C) — de dónde salen los runs públicos.
- Alimenta el lead → HubSpot handoff (EPIC-020 D) con el email + consent capturados.

### Files owned

- `src/lib/growth/ai-visibility/public-intake/**` — `createPublicGraderRun` + validación + rate-limit/cost guard + lead persistence (server-only).
- `src/app/api/public/growth/ai-visibility/run/route.ts` — endpoint público POST (captcha + rate-limit).
- `migrations/` — campos de consent/lead (`grader_profiles` o tabla `grader_leads`, decidir en Discovery) — additive.
- `src/lib/growth/ai-visibility/flags.ts` — flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (default OFF) + FEATURE_FLAG_STATE_LEDGER.
- `src/lib/reliability/queries/growth-ai-visibility-*.ts` — signals de intake/cost/abuse.
- `src/lib/copy/growth.ts` — copy es-CL del intake/errores.
- `src/lib/growth/ai-visibility/__tests__/**` — tests.

## Current Repo State

### Already exists

- `enqueueGraderRun` + worker drain async (TASK-1234) — encola y ejecuta sin timeout.
- `grader_profiles`/`grader_runs` con `mode` (`light`), `run_kind` (`public_diagnostic`), `idempotency_key`, `cost_ceiling_usd`, `public_id` no enumerable.
- Cost estimator + policy resolver (puede excluir providers caros del tier `light`).
- Prompt input interpola marca/categoría como dato delimitado (NUNCA PII).

### Gap

- No existe intake público: ningún command crea un run desde input público + consent + email.
- No hay rate-limit / cost ceiling / captcha en ningún endpoint (todo es admin interno con capability).
- No hay persistencia de consent/lead ni contrato de privacidad del email.
- No hay flag de habilitación del público.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command` (write público) + `migration` (consent/lead additive).
- Source of truth afectado: `greenhouse_growth.grader_profiles`/`grader_runs` + consent/lead (nuevo).
- Consumidores afectados: página pública (EPIC-020 C), worker async, HubSpot handoff (D).
- Runtime target: `local` + `staging` + (rollout) `production` gated.

### Contract surface

- Contrato existente a respetar: `enqueueGraderRun`, `grader_profiles`/`grader_runs`, prompt input (sin PII).
- Contrato nuevo: `createPublicGraderRun(input, idempotencyKey)` + endpoint público POST + persistencia consent/lead.
- Backward compatibility: `additive` + `gated` (flag default OFF).
- Full API parity: el intake reusa `enqueueGraderRun` (no reimplementa ejecución); el LLM no escribe (run gobernado).

### Data model and invariants

- Entidades/tablas afectadas: `grader_profiles`/`grader_runs` (write) + consent/lead (additive: campos en profile o tabla `grader_leads` — Discovery).
- Invariantes que no se pueden romper:
  - **PII NUNCA a providers** (email/teléfono): viven sólo en el lead; la interpolación de prompt usa marca/categoría delimitadas.
  - **Encolar, no ejecutar inline** (`enqueueGraderRun` → worker).
  - Consent requerido + timestamp persistido; modo `light` forzado para público.
  - Idempotencia por `idempotency_key` (doble submit no duplica run).
- Tenant/space boundary: público/pre-tenant (sin sesión); el binding a org cliente es EPIC-020 (E).
- Idempotency/concurrency: idempotency key + rate-limit; el claim del run lo hace el worker (`FOR UPDATE SKIP LOCKED`, TASK-1234).
- Audit/outbox/history: el run/observations ya son el ledger; el consent queda con timestamp.

### Migration, backfill and rollout

- Migration posture: `additive` (consent/lead). Marker `-- Up Migration` + DO block + GRANTs + `db.d.ts`.
- Default state: **flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` default OFF** (público apagado hasta rollout completo + revisión legal del copy/consent). Fila en FEATURE_FLAG_STATE_LEDGER.
- Backfill plan: N/A.
- Rollback path: flag OFF + revert PR; tabla/campos additive sin uso.
- External coordination: revisión legal del consent/privacidad antes de prod; captcha provider (key) en Secret Manager.

### Security and access

- Auth/access gate: endpoint público **sin sesión** pero con **captcha + rate-limit (IP + email) + cost ceiling**. El mint/lectura del reporte es TASK-1239.
- Sensitive data posture: email = PII (Ley 21.719/GDPR) → sólo en el lead, nunca a providers, no logueado en claro; consent con timestamp.
- Error contract: canónico es-CL sanitizado; rate-limit → 429 con copy; sin raw provider/LLM errors.
- Abuse/rate-limit posture: **load-bearing** — rate-limit por IP + por email + cost ceiling global por ventana + captcha + modo `light`. Circuit breaker si el cost ceiling diario se excede.

### Runtime evidence

- Local checks: tests de validación de input, consent requerido, PII-no-a-providers, encolado (no inline), idempotencia, rate-limit (excede → 429), cost ceiling (excede → bloqueo).
- DB/runtime checks: migration verify (DO block) + dry-run del intake (crea profile/run pending + lead, NO ejecuta inline).
- Integration checks: captcha verification (mock + real con key staging); worker recoge el run encolado.
- Reliability signals/logs: `growth.ai_visibility.public_intake_rate` + `public_intake_cost_window` + `public_intake_blocked` (rate/captcha/cost), steady esperado.
- Production verification sequence: flag OFF en prod hasta smoke staging completo + sign-off legal; luego flip gated.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] PII-no-a-providers, consent requerido+timestamp, idempotencia y encolado (no inline) explícitos.
- [ ] Rate-limit + cost ceiling + captcha + modo `light` implementados y testeados (abuse posture).
- [ ] Migration additive con DO block + `db.d.ts`; flag default OFF en el ledger.
- [ ] Errores canónicos es-CL sanitizados; email nunca logueado en claro; reliability signals en steady.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Consent/lead model + input contract

- Migration additive (consent/lead: campos en profile o `grader_leads` — decisión Plan Mode) + DO block + `db.d.ts`.
- Contrato `PublicGraderRunInput` (§9.2) + validación estricta (sin Zod, patrón del dominio); consent requerido.
- Tests del contrato + de la persistencia del consent (timestamp).

### Slice 2 — createPublicGraderRun + abuse/cost guard

- Command: crea/reusa perfil + run (`public_diagnostic`, `light`) + persiste lead + `enqueueGraderRun`. PII nunca a providers.
- Guard de abuso/costo: rate-limit (IP + email), cost ceiling por ventana, modo `light` forzado, idempotencia.
- Tests: encolado (no inline), PII-no-a-providers, rate-limit, cost ceiling, idempotencia.

### Slice 3 — Endpoint público + captcha + flag + signals

- Endpoint `POST /api/public/.../run` (sin sesión; captcha + rate-limit; 429 sanitizado) detrás del flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (default OFF) + ledger.
- Reliability signals (intake/cost/blocked) + wire-up + dry-run staging.

## Out of Scope

- Página pública / form UI (EPIC-020 C).
- Snapshot/token reader del reporte (EPIC-020 A / TASK-1239).
- HubSpot handoff del lead (EPIC-020 D).
- Binding a org cliente / portal cliente (EPIC-020 E).
- Pricing/checkout del audit pagado.

## Detailed Spec

El intake público reusa el motor existente: valida input (§9.2) + consent, crea perfil/run `public_diagnostic`+`light`, persiste el lead (email + consent + firmographics — NUNCA a providers), y encola con `enqueueGraderRun` (el worker async TASK-1234 lo ejecuta). El endpoint público es la única escritura sin sesión: por eso lleva captcha + rate-limit (IP + email) + cost ceiling por ventana + circuit breaker, y el modo `light` (providers baratos) acota el costo por run. Default OFF detrás de flag hasta rollout + sign-off legal del consent. El reporte resultante se sirve por el snapshot/token de TASK-1239; el lead se sincroniza a HubSpot en EPIC-020 D.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (consent/lead + input) → Slice 2 (command + abuse/cost guard) → Slice 3 (endpoint + captcha + flag). El endpoint público (3) NO puede existir sin el guard de abuso/costo (2) — exponer el POST sin rate-limit/cost ceiling es el riesgo principal de la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| POST público dispara gasto LLM no acotado | cost/abuse | high | rate-limit (IP+email) + cost ceiling por ventana + circuit breaker + modo `light` | `public_intake_cost_window` / `public_intake_blocked` |
| Email (PII) viaja a un provider | privacy/legal (Ley 21.719) | medium | PII sólo en lead; interpolación delimitada marca/categoría; test PII-no-a-providers | test + code review |
| Bot spam crea runs masivos | abuse | high | captcha obligatorio + rate-limit + idempotency key | `public_intake_rate` |
| Run ejecutado inline → timeout Vercel | reliability | low | `enqueueGraderRun` (encolar, worker async TASK-1234), nunca inline | test encolado |
| Consent ausente/no persistido | legal | medium | consent requerido en validación + timestamp persistido | test consent |

### Feature flags / cutover

- Flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (default OFF). Fila en FEATURE_FLAG_STATE_LEDGER. Flip a ON sólo post smoke staging + sign-off legal del consent/copy. Revert: flag OFF + redeploy (<5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (campos/tabla additive sin uso) | <10 min | si |
| Slice 2 | revert PR (command + guard) | <5 min | si |
| Slice 3 | flag OFF + revert PR (endpoint) | <5 min | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verify (DO block).
2. Flag ON staging + smoke real: POST público con captcha → 202 + `run.public_id` → worker ejecuta → reporte.
3. Verificar rate-limit (exceder → 429), cost ceiling (exceder → bloqueo), PII no en payload a providers (revisar observations).
4. Verificar consent persistido con timestamp.
5. Prod: flag OFF hasta sign-off legal; flip gated via release control plane.

### Out-of-band coordination required

- **Sign-off legal** del consent/aviso de privacidad (Ley 21.719/GDPR) antes de prod.
- Captcha provider key en Secret Manager (`*_SECRET_REF`).
- Coordinar con EPIC-020 A (token del reporte) y C (página) para el ciclo completo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `createPublicGraderRun(input, idempotencyKey)` crea perfil/run `public_diagnostic`+`light` + persiste lead (consent+email+timestamp) + encola (`enqueueGraderRun`), NUNCA inline.
- [ ] PII (email/teléfono) NUNCA viaja a providers (test que lo prueba); consent requerido + persistido.
- [ ] Rate-limit (IP+email) + cost ceiling por ventana + captcha + modo `light` activos y testeados; exceso → 429/bloqueo sanitizado.
- [ ] Endpoint público POST detrás del flag `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (default OFF) + fila en el ledger.
- [ ] Migration additive (consent/lead) con DO block + `db.d.ts`; reliability signals (intake/cost/blocked) en steady.
- [ ] Dry-run staging: POST → 202 + run encolado + worker lo ejecuta; rate-limit/cost ceiling verificados.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + verify
- Dry-run del intake (encolado, no inline) + rate-limit/cost
- `pnpm docs:closure-check` + `pnpm flags:audit` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` + FEATURE_FLAG_STATE_LEDGER actualizados
- [ ] arch `## Delta` (public intake + abuse/cost) + `EPIC-020` Child Tasks actualizado
- [ ] chequeo de impacto cruzado (TASK-1234/1239 + EPIC-020 C/D)

## Follow-ups

- HubSpot handoff del lead capturado (EPIC-020 D).
- Doble opt-in del email si el sign-off legal lo exige.

## Open Questions

1. ¿Consent/lead como campos en `grader_profiles` o tabla `grader_leads` dedicada? **Propuesta:** tabla `grader_leads` (el lead es un objeto con su ciclo de vida → HubSpot, distinto del perfil de marca). Confirmar en Plan Mode.
2. ¿Qué captcha (Turnstile/hCaptcha/reCAPTCHA)? Decidir en Discovery (preferir uno sin costo + privacy-friendly).
3. ¿Cost ceiling público: por IP/email/global por ventana? **Propuesta:** los tres combinados (per-IP + per-email + global diario con circuit breaker). Afinar umbrales con el cost estimator real del modo `light`.
