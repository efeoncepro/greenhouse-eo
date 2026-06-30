# TASK-1294 — Growth Forms renderer Turnstile captchaToken parity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Epic: `optional`
- Status real: `Complete local; migración AEO live queda como follow-up separado`
- Rank: `TBD`
- Domain: `growth|public-site`
- Blocked by: `none`
- Branch: `develop` (excepción documentada: el operador pidió crear la task y arrancar de inmediato; hook ejecutado con `--develop`)

## Summary

Completar la paridad de captcha del renderer portable `<greenhouse-form>`: el render contract debe declarar Turnstile de forma browser-safe, el renderer debe ejecutar el widget invisible antes del submit y `submitPublicForm` debe enviar `captchaToken` al endpoint público gobernado. Esto elimina la razón técnica por la que AEO `/aeo-2/` mantiene un bridge HTML temporal.

## Why This Task Exists

El backend de Growth Forms ya acepta `captchaToken` y falla cerrado sin token en producción, pero el renderer portable no genera ni envía ese token. Por eso la landing AEO funciona hoy con un bridge HTML específico en WordPress: útil como excepción controlada, pero no escalable para próximas landings públicas. Si no se corrige en el renderer, cada landing nueva volverá a copiar lógica de Turnstile, validación y submit en el host, justo lo que el motor Growth Forms nació para evitar.

## Goal

- Declarar captcha Turnstile invisible en el `render_contract` sin exponer secretos ni destination mapping.
- Hacer que `<greenhouse-form>` cargue Turnstile idempotentemente, ejecute el challenge en submit y envíe `captchaToken` al API público.
- Cubrir happy path, failure path y no-double-widget/script con tests focales del renderer.
- Mantener el bridge AEO live sin migrarlo en esta task; la migración WordPress queda como follow-up UI/landing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

Reglas obligatorias:

- El browser recibe sólo un contrato browser-safe: site key pública y modo de captcha; nunca `TURNSTILE_SECRET`, destination mapping, HubSpot GUIDs, property names ni secretos.
- El server sigue siendo autoridad: el renderer sólo obtiene el token; `submitForm` verifica Turnstile server-side y fail-closed en prod.
- El renderer sigue framework-light: vanilla TypeScript, sin React/Lit/deps, con light DOM y tests jsdom.
- No migrar AEO live dentro de esta task. El cambio visual/WordPress requiere task `ui-ux` o follow-up con Playwright/GVC, backup Elementor y protección `heroans`.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- Backend submit público existente: `src/app/api/public/growth/forms/[formSlug]/submit/route.ts`
- Command submit existente: `src/lib/growth/forms/commands.ts`
- Port compartido Turnstile: `src/lib/growth/public-submission/captcha.ts`
- Renderer portable existente: `src/growth-forms-renderer/**`

### Blocks / Impacts

- Follow-up de migración AEO `/aeo-2/` del bridge HTML a `<greenhouse-form>`.
- Próximas landings públicas que usen Growth Forms sin copiar un bridge específico.
- Docs operativas que antes advertían "no usar renderer genérico hasta que emita `captchaToken`".

### Files owned

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/growth-forms-renderer/contract.ts`
- `src/growth-forms-renderer/api-client.ts`
- `src/growth-forms-renderer/renderer.ts`
- `src/growth-forms-renderer/__tests__/**`
- `src/lib/growth/forms/__tests__/**`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

## Current Repo State

Estado observado antes de implementar TASK-1294:

### Already existed

- `POST /api/public/growth/forms/{slug}/submit` reads `body.captchaToken` and passes it into `submitForm`.
- `submitForm` verifies captcha through `turnstileCaptchaVerifier()` before loading/persisting the submission.
- AEO `/aeo-2/` live uses Turnstile invisible successfully through a scoped WordPress HTML bridge.
- The production render contract had no `security`, `captcha` or `turnstile` field, and the production renderer bundle did not contain `captchaToken` or Turnstile code.

### Initial gap

- `SubmitPayload` and `submitPublicForm()` did not include `captchaToken`.
- `FormRenderer.submit()` could not obtain a Turnstile token before POST.
- `RenderContract` could not declare a public Turnstile site key or mode.
- Docs correctly blocked generic renderer rollout because of this gap.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `RenderContract` / Growth Forms public submit API
- Consumidores afectados: public renderer, WordPress widget, Astro wrapper, future public landings
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts`, `src/growth-forms-renderer/contract.ts`, `src/app/api/public/growth/forms/[formSlug]/submit/route.ts`
- Contrato nuevo o modificado: `RenderContract.security.captcha` browser-safe + `SubmitPayload.captchaToken`
- Backward compatibility: `compatible` — forms without `security.captcha.required=true` submit exactly as before.
- Full API parity: all hosts keep using the same public render/submit API; WordPress/Astro wrappers remain adapters that emit `<greenhouse-form>`.

### Data model and invariants

- Entidades/tablas/views afectadas: none.
- Invariantes que no se pueden romper:
  - The Turnstile secret remains server-only in `TURNSTILE_SECRET`.
  - The render contract may expose only public `siteKey`, provider and mode.
  - No destination/vendor mapping enters the browser.
  - Server-side captcha verification remains mandatory for accepted submissions.
- Tenant/space boundary: public surface authorization remains origin + `surfaceId` through existing host surface checks.
- Idempotency/concurrency: renderer must prevent double-submit while executing Turnstile; Turnstile loader/render must be idempotent per page.
- Audit/outbox/history: existing submission/outbox/audit path unchanged.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: compatible/additive; existing contracts without captcha metadata remain accepted by the renderer.
- Backfill plan: none.
- Rollback path: revert renderer/contract changes; AEO bridge remains live as fallback because this task does not migrate it.
- External coordination: Cloudflare Turnstile site key must be provided via contract policy; no new secret unless environment lacks existing `TURNSTILE_SECRET`.

### Security and access

- Auth/access gate: public endpoint without session; protected by surface auth, CORS, honeypot, Turnstile, rate-limit/dedupe.
- Sensitive data posture: no new PII; captcha token is transient and not analytics payload.
- Error contract: no raw Turnstile errors in UI; renderer degrades to submit error while server remains fail-closed.
- Abuse/rate-limit posture: maintains existing Turnstile + public submission abuse posture; no bypass.

### Runtime evidence

- Local checks: renderer unit tests, contract parity tests, `pnpm renderer:build`.
- DB/runtime checks: none required (no migration).
- Integration checks: post-implementation staging smoke should verify a real `<greenhouse-form>` submit with Turnstile token before migrating AEO.
- Reliability signals/logs: existing `captcha_failed` submit outcome and Growth Forms submission signals.
- Production verification sequence: no production WordPress migration in this task; production remains protected by the bridge until follow-up.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Browser-safe captcha contract

- Add a `security.captcha` contract shape with provider `turnstile`, mode `invisible`, public `siteKey`, required flag and execution `submit`.
- Compile optional captcha metadata from `ui_policy_json.security` or `ui_policy_json.captcha` into the render contract.
- Extend the renderer mirror type and contract parity tests.

### Slice 2 — Renderer Turnstile execution

- Add a small portable Turnstile client module or internal renderer helper that loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` idempotently.
- Render an invisible widget into an internal container, execute it on submit, resolve a token, and reset after success/error.
- Prevent duplicate widget/script creation and preserve reduced-motion/no-layout-shift behavior.

### Slice 3 — Submit token plumbing + tests

- Extend `SubmitPayload` with `captchaToken?: string`.
- Include `captchaToken` in the POST body only when available.
- Add focal tests for API client body, renderer happy path, failure path and no-submit-without-token when captcha is required.

### Slice 4 — Docs + rollout guidance

- Update Growth Forms architecture/runtime/manual docs to say the renderer now supports `captchaToken`, but AEO bridge migration remains a separate governed WordPress task.
- Record the `/goal` preflight exception: operator explicitly requested immediate task creation + implementation in the same turn.

## Out of Scope

- Migrating AEO `/aeo-2/` live from the bridge HTML to `<greenhouse-form>`.
- Editing WordPress, Elementor, Home, `/aeo` old/trash, or `heroans`.
- Changing Turnstile server verification semantics or `TURNSTILE_SECRET`.
- Adding a visual CAPTCHA fallback UX beyond the invisible provider path.
- Refactoring Growth Forms validation/server authority beyond the captcha path.

## Detailed Spec

Recommended contract shape:

```ts
security?: {
  captcha?: {
    provider: 'turnstile'
    required: boolean
    mode: 'invisible'
    siteKey: string
    execution: 'submit'
  }
}
```

Renderer behavior:

- If no `security.captcha` or `required=false`, submit stays unchanged.
- If required Turnstile metadata exists, `submit()` must obtain a token before `submitPublicForm()`.
- If token acquisition fails, do not POST; render the standard submit error and emit a rejected telemetry event without PII.
- The script loader must tolerate multiple forms on the same page.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 contract types/compiler before Slice 2 renderer runtime.
- Slice 2 Turnstile runtime before Slice 3 tests are complete.
- Slice 4 docs after tests prove the contract.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Public renderer cannot obtain token and blocks conversion | public-site/growth | medium | leave AEO bridge live; additive contract; staging smoke before migration | submit outcomes `captcha_failed`, browser console |
| Site key leaks as "secret" confusion | security/docs | low | document site key as public; never expose `TURNSTILE_SECRET` | docs review |
| Multiple forms create duplicate scripts/widgets | renderer | medium | idempotent loader + per-instance container tests | renderer tests |
| Contract shape breaks older forms | API contract | low | optional `security`; parity tests; fixtures without security stay green | contract tests |

### Feature flags / cutover

No new flag. Existing `GROWTH_FORMS_PUBLIC_API_ENABLED` remains the public API gate. The AEO bridge is the rollback/fallback until a separate WordPress migration task switches hosts.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert contract/compiler change | <10 min | si |
| Slice 2 | revert renderer Turnstile module/helper | <10 min | si |
| Slice 3 | revert token plumbing/tests | <10 min | si |
| Slice 4 | revert docs wording | <10 min | si |

### Production verification sequence

1. Local unit/contract tests.
2. `pnpm renderer:build`.
3. Staging smoke with a test `<greenhouse-form>` and real Turnstile token before any live AEO migration.
4. Separate AEO migration task: Elementor backup, `Document::save()`, Kinsta purge, Playwright desktop/mobile 390, overflow, validation, dataLayer and `heroans` hash.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `RenderContract` can declare browser-safe Turnstile metadata and remains backward-compatible for forms without captcha metadata.
- [x] `submitPublicForm()` sends `captchaToken` when provided and never sends Turnstile secrets.
- [x] `FormRenderer` obtains a Turnstile token before POST when captcha is required.
- [x] If token acquisition fails, the renderer does not POST and shows a submit error.
- [x] Tests cover API body, required captcha happy path, failure path and no duplicate loader/widget behavior.
- [x] Docs/manuals explain that renderer parity is complete and AEO bridge migration is a separate governed follow-up.
- [x] `/goal` preflight exception is documented in Handoff/Audit because the operator requested immediate execution.

## Verification

- `pnpm task:lint --task TASK-1294`
- `pnpm ops:lint --changed`
- `pnpm exec vitest run src/growth-forms-renderer/__tests__/api-client.test.ts src/growth-forms-renderer/__tests__/renderer.test.ts src/lib/growth/forms/__tests__/policy-compiler.test.ts src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts`
- `pnpm renderer:build`
- `pnpm docs:closure-check`

Evidence captured on 2026-06-30:

- `pnpm exec vitest run src/growth-forms-renderer/__tests__/api-client.test.ts src/growth-forms-renderer/__tests__/renderer.test.ts src/lib/growth/forms/__tests__/policy-compiler.test.ts src/lib/growth/forms/__tests__/renderer-contract-parity.test.ts` → 4 files / 41 tests passed.
- `pnpm renderer:build` → OK, `public/growth-forms/renderer-preview.js`.
- `pnpm task:lint --task TASK-1294` → errors 0, warnings 0.
- `pnpm ops:lint --changed` → errors 0; warnings only from unrelated TASK-1247 registry parity.
- `pnpm docs:closure-check` → pass; advisory warning only for the existing Growth Forms architecture monolith.
- `pnpm docs:context-check` → errors 0; warnings only for expected `Handoff.md` size/history.
- `python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/efeonce-public-site-wordpress` and `.claude/skills/efeonce-public-site-wordpress` → valid.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit` reached an unrelated pre-existing dirty-file error in `src/views/greenhouse/admin/growth/ai-visibility/mockup/AdminReviewMockupView.tsx`; TASK-1294 files are covered by focal tests/build.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real.
- [x] el archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` sincronizado.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [x] `Handoff.md` actualizado.
- [x] `changelog.md` actualizado si cambia comportamiento runtime.
- [x] docs Growth Forms runtime/manual actualizados.

## Follow-ups

- Crear/ejecutar una task `ui-ux` para migrar AEO `/aeo-2/` desde el bridge HTML a `<greenhouse-form>` con backup Elementor, `heroans` md5 guard, Kinsta purge, Playwright desktop/mobile 390 y smoke Growth Forms/dataLayer.
- Evaluar si host surfaces nuevos deben declarar Turnstile site key por surface o por form version en Admin Cockpit.

## Open Questions

- ¿El site key público de Turnstile debe vivir inicialmente en `ui_policy_json.security.captcha.siteKey` de cada form version o en el host surface? Esta task implementa lectura tolerante desde `ui_policy_json.security`/`captcha`; una normalización admin puede venir después.
