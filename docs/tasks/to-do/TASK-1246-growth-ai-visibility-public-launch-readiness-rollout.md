# TASK-1246 — Growth AI Visibility: Public Launch Readiness + Rollout

## Delta 2026-06-29 — palanca de costo de prosa lista (TASK-1271, evidencia-first)

TASK-1271 desacopló la extracción de prosa (sentiment/category/drift) de Anthropic en un router provider-agnóstico con candidatos low-cost (Gemini Flash-Lite / OpenAI nano) + harness de eval/cost (`scripts/growth/ai-visibility-prose-eval.ts`). **Default sigue `anthropic` (behavior-preserving) y la extracción sigue OFF** — nada cambia hoy. Pero al planificar el launch público, si se decide activar `sentimentSummary` real, existe ahora una palanca de costo evidencia-first: correr el CLI en staging shadow (presupuesto acotado), comparar exactitud + costo por proveedor, documentar el veredicto y flip de `_PROSE_EXTRACTION_PROVIDER` ANTES de prender `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` en volumen. Incluir esto en el readiness/cutover de costo del launch.

## Delta 2026-06-28 — gate de correo corporativo del grader (TASK-1263) listo para el cutover

TASK-1263 cableó el gate de correo corporativo (TASK-1254 `emailPolicy.block_field`) en **ambas fachadas** del intake del grader (`createPublicGraderRun` + `createPublicGraderRunViaFormsEngine`) vía el helper canónico `evaluateFormEmailGate` — gmail/temporal se rechaza ANTES de gastar AI (outcome `email_not_corporate`, 422). **Code complete, rollout pendiente.** Al planificar el launch público, incluir en el readiness/cutover:

- **Secuencia obligatoria:** deploy del código (push develop → staging) **ANTES** de correr `scripts/growth/activate-grader-email-gate.ts --apply` (correrlo con el código viejo desplegado ancla submissions a una v2 deprecada y no gatea).
- **Activación staging** del gate (`--apply` + smoke gmail→422 / corporativo→202) como parte del readiness.
- **Prod:** flag `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` ON + `--apply` contra PG prod + **ratificación legal de la `retention_policy`** del grader-form (PII consent-based 730d). Sin flag nuevo (reusa el de TASK-1254).

## Delta 2026-06-27 — email delivery (TASK-1250) code-complete, sumar al readiness

TASK-1250 quedó **code complete** (sin push, sin prod): el lead recibe el informe por email transaccional + PDF adjunto, disparado write-side desde la publicación del snapshot, con idempotencia DB-level + consent-gate. **Sumar al checklist de launch readiness de esta task** el rollout del email (gated, default OFF): (1) `bash services/ops-worker/deploy.sh` (el bundle del worker incluye el reactive consumer del email + el report PDF renderer); (2) flip `GROWTH_AI_VISIBILITY_REPORT_EMAIL_ENABLED=true` **dual-location** (ops-worker via gcloud + declararlo en `deploy.sh` staging ON/prod OFF, mismo patrón que el handoff); (3) smoke staging E2E: run con lead consentido → snapshot publicado → email recibido con link + adjunto + `grader_report_email_dispatches.status='sent'` + no doble-envío en retry + signal `growth.ai_visibility.report_email_failed` steady=0; (4) **out-of-band:** from-address/branding del lead magnet (marca **Efeonce** agencia) + sign-off legal/consent del email. El smoke E2E del lead magnet ahora incluye `form → report → email con adjunto`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ops|public-site|reliability`
- Blocked by: `TASK-1241, TASK-1242, TASK-1244, TASK-1245, TASK-1250, TASK-1253, TASK-1255`
- Branch: `task/TASK-1246-growth-ai-visibility-public-launch-readiness-rollout`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el programa de "code complete dev" a lanzamiento operable: consent legal, Turnstile, flags/envs, staging smoke end-to-end, email delivery, release control plane y monitoreo de abuso/costo. Evita declarar live el lead magnet solo porque el codigo existe en el repo.

## Why This Task Exists

`TASK-1240` quedo complete pero con rollout pendiente: sign-off legal, `TURNSTILE_SECRET`, flag publico OFF y smoke real. El lead magnet ademas depende de status/delivery, UI, email con adjunto, review humano y HubSpot handoff. Falta una task que gobierne el cutover completo y verifique runtime real antes de produccion.

## Goal

- Activar staging de punta a punta con captcha, worker, status/delivery, UI publica, email con adjunto y HubSpot handoff dry-run/live segun aprobacion.
- Definir y ejecutar el checklist legal/privacidad/copy para el consent publico.
- Preparar produccion mediante release control plane, rollback rapido y signals de abuso/costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §9 public experience, §13 privacy/security, §17 observability, §18 rollout.
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/tasks/complete/TASK-1240-growth-ai-visibility-public-run-intake-abuse-cost-controls.md`
- `docs/tasks/to-do/TASK-1241-growth-ai-visibility-public-lead-magnet-page.md`
- `docs/tasks/to-do/TASK-1250-growth-ai-visibility-email-report-delivery.md`

Reglas obligatorias:

- **Skill MANDATORIA `greenhouse-production-release` antes de CUALQUIER promoción/preflight/approval/rollback** (Slice 3). El cutover productivo va por el **release control plane** (preflight CLI 12 checks → release manifest + state machine append-only → orchestrator workflow → watchdog), NO por flips ad-hoc. Distinguir dos cosas: (a) **promoción de código `develop → main`** vía control plane; (b) **flip del flag** vía Vercel env (el código debe estar ya en `main` antes del flag ON en prod). NUNCA disparar el orquestador <8 min post-push a `main` (Vercel BUILDING race).
- **Runtime Rollout Completion Gate:** `code complete ≠ operationally complete`. Verificar flags en TODOS los targets (prod/staging/preview/worker/Cloud Run), redeploy/restart aplicado (Vercel y Cloud Run NO toman env vars en caliente), integración externa probada con evidencia real.
- **Path async en staging (footgun Figma 2026-05-03):** el outbox publisher + el reactive consumer del HubSpot handoff corren por **Cloud Scheduler + ops-worker** (NO Vercel cron, que solo corre en Production). El smoke de staging debe confirmar que esos jobs están activos en staging, si no el handoff "pasa" pero nunca entrega.
- **Higiene de secretos para `TURNSTILE_SECRET`:** publicar como scalar crudo (sin comillas/`\n`), vía Secret Manager; si se consume por `*_SECRET_REF`, **confirmar el grant `secretAccessor` al SA runtime** (`greenhouse-portal@`) — sin él, `resolveSecretByRef`→null y el error es engañoso ("not configured"). Verificar el consumer real (`/api/...` que valida captcha) post-rotación. Skill `greenhouse-secret-hygiene`.
- **Vercel CLI scope (ISSUE-076):** antes de cualquier `vercel env`/mutation, `cat .vercel/project.json` debe retornar `prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`; si no, pasar `--scope efeonce-7670142f`. NUNCA crear `VERCEL_AUTOMATION_BYPASS_SECRET` manual.
- No prender produccion sin staging smoke end-to-end y rollback documentado.
- No activar intake publico sin consent legal aprobado y Turnstile server-side.
- No gastar providers de forma no acotada: flags, budget y signals deben estar visibles.
- No declarar launch completo si el email transaccional con adjunto no fue verificado en staging.
- No llamar HubSpot/browser-side; handoff usa `TASK-1242`.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1245` — status + delivery token.
- `TASK-1250` — email delivery con resumen + informe completo adjunto.
- `TASK-1241` — pagina publica.
- `TASK-1242` — handoff HubSpot.
- `TASK-1244` — backend de review humano.
- `TASK-1234` — worker async ya desplegable.

### Blocks / Impacts

- Bloquea el lanzamiento publico real de EPIC-020.
- Alimenta Handoff/release notes para operador, marketing y ventas.

### Files owned

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` [verificar path vigente]
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `Handoff.md`
- `changelog.md`
- `.github/workflows/**` [solo si discovery detecta gate faltante]

## Current Repo State

### Already exists

- Flags de provider/grader y async execution en staging.
- `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` existe pero default OFF.
- `TASK-1240` documenta que falta legal consent, Turnstile secret y flag ON staging.

### Gap

- No hay checklist de rollout unico que ate legal, secrets, flags, staging smoke, prod release y rollback.
- No se verifico runtime publico end-to-end con captcha + worker + status + reporte + email con adjunto + HubSpot.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: Vercel envs, GCP Secret Manager, Cloud Run/Scheduler, HubSpot handoff, public route runtime
- Consumidores afectados: prospectos publicos, marketing ops, sales ops, reliability
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: endpoints publicos/admin de EPIC-020, worker async, HubSpot handoff.
- Contrato nuevo o modificado: checklist operativo de lanzamiento + smoke gates; codigo solo si falta guardrail.
- Backward compatibility: `gated`
- Full API parity: lanzamiento verifica que la UI publica consume los APIs gobernados y que HubSpot usa command/outbox.

### Data model and invariants

- Entidades/tablas/views afectadas: no se espera migration; se verifican `greenhouse_growth.*` existentes.
- Invariantes que no se pueden romper:
  - Public intake OFF hasta consent + captcha + staging smoke.
  - Provider costs acotados por budget/circuit breaker.
  - `review_required` no se publica automaticamente.
  - HubSpot recibe solo campos aprobados, no raw provider text.
- Tenant/space boundary: publico sin sesion + admin/internal gated + HubSpot CRM.
- Idempotency/concurrency: smoke debe ser re-ejecutable sin duplicar gasto/CRM fuera de lo esperado.
- Audit/outbox/history: verificar events/outbox/handoff attempts cuando aplique.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: flags prod OFF hasta aprobacion explicita.
- Backfill plan: N/A.
- Rollback path: flag OFF (`GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED=false`) + disable public CTA/route + worker/provider flags OFF si hay costo.
- External coordination: legal/privacy, Turnstile secret/site key, Vercel envs, GCP Secret Manager, HubSpot property approval, marketing/public-site owner.

### Security and access

- Auth/access gate: public captcha/rate-limit; admin capabilities; service accounts for worker.
- Sensitive data posture: PII consented only in lead/HubSpot; no PII to providers.
- Error contract: public errors sanitized; no raw provider/secret errors.
- Abuse/rate-limit posture: captcha, IP/email limits, budget circuit breaker, read hardening.

### Runtime evidence

- Local checks: `pnpm task:lint --task TASK-1246`, docs gates.
- DB/runtime checks: staging run with PG verification and signals.
- Integration checks: Turnstile validation, Vercel env audit, Cloud Run/Scheduler, HubSpot dry-run/live as approved.
- Reliability signals/logs: public intake blocked/rate/cost, run lag/stuck, delivery pending/failed, HubSpot handoff status.
- Production verification sequence: release control plane -> prod smoke low-volume -> verify signals -> rollback drill path documented.

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
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Launch checklist and gates

- Confirmar legal/privacy consent copy, Turnstile site key/secret, flags/envs y provider flags por environment.
- Documentar go/no-go gates y rollback exacto.

### Slice 2 — Staging activation

- Activar staging con `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED=true` y Turnstile real (verificar grant `secretAccessor` del `TURNSTILE_SECRET`).
- **Confirmar que los jobs Cloud Scheduler + ops-worker están activos en staging** (outbox publisher + reactive consumer del HubSpot handoff): sin esto el handoff async "pasa" pero no entrega.
- Ejecutar smoke end-to-end: form -> run -> status -> report token -> public report -> email con adjunto -> HubSpot handoff. Incluir el path `review_required` (no auto-publica → aprobación 1244 → publica).

### Slice 3 — Production release plan (vía release control plane)

- Invocar la skill `greenhouse-production-release`. **Promoción de código `develop → main`** vía preflight (12 checks) + release manifest + orchestrator (no flips ad-hoc; no disparar orquestador <8 min post-push).
- Solo con el código ya en `main` + deploy Ready: flip de `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` ON en prod (Vercel env) con aprobación humana, budget bajo, smoke prod low-volume y signals steady.
- Actualizar `FEATURE_FLAG_STATE_LEDGER.md`: fila por flag con estado **por environment** (prod/staging/preview); los que queden code-complete sin prender van a §Pendientes de acción. Dejar evidencia en Handoff/changelog.

## Out of Scope

- Construir UI publica (`TASK-1241`).
- Construir comandos/reader/delivery faltantes (`TASK-1242`, `TASK-1244`, `TASK-1245`, `TASK-1250`).
- Cambiar scoring/prompt packs/providers.

## Detailed Spec

Esta task es el gate operativo de lanzamiento. Debe tratar el lead magnet como runtime publico con gasto AI y PII consentida: no basta con tests verdes. El agente debe usar CLIs autenticados (Vercel, gcloud, gh, HubSpot si aplica) con guardrails, verificar que los flags correctos existen por environment, activar staging primero y dejar produccion como cutover explicito con rollback.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (checklist) -> Slice 2 (staging) -> Slice 3 (production). Produccion no puede iniciar sin staging smoke verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gasto LLM por abuso publico | cost/reliability | medium | Turnstile + rate-limit + daily budget + flag OFF rollback | cost_budget_used |
| Consent legal insuficiente | legal/privacy | medium | sign-off antes de flag ON | launch checklist |
| HubSpot pollution/duplicados | CRM | medium | idempotencia + dry-run + property approval | handoff failures |
| Review gate no operable | safety | medium | `TASK-1244` complete + smoke review_required | publish 409 / pending queue |
| Handoff async "verde" pero no entrega en staging | reliability | medium | confirmar Cloud Scheduler + ops-worker activos en staging (no Vercel cron) | outbox unpublished_lag / handoff pending |
| `TURNSTILE_SECRET` resuelve null silencioso | security/launch | medium | grant `secretAccessor` a SA runtime + verificar consumer real post-rotación | captcha "not configured" / 500 |
| Promoción dispara BUILDING race | release | low | no orquestar <8 min post-push a `main`; usar preflight + manifest | watchdog stale / Wait Vercel READY fail |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED`
- `GROWTH_AI_VISIBILITY_GRADER_ENABLED`
- Provider flags `GROWTH_AI_VISIBILITY_*_ENABLED`
- `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED`
- HubSpot handoff flag [verificar nombre en TASK-1242]

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A docs/checklist | inmediato | si |
| Slice 2 | flag staging OFF + revert env if needed | <5 min | si |
| Slice 3 | flag prod OFF + disable CTA + provider flags OFF | <5 min | si |

### Production verification sequence

1. Confirmar deploy production Ready.
2. Activar intake con budget bajo/controlado.
3. Ejecutar un run publico low-volume.
4. Ver reporte tokenizado, handoff HubSpot y signals steady.
5. Registrar evidence y rollback path.

### Out-of-band coordination required

- Legal/privacy owner para consent.
- Turnstile secret/site key.
- Marketing/public-site owner para CTA/URL.
- HubSpot owner para properties/lifecycle.
- Operador para aprobar prod cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Checklist legal/privacy/captcha/envs/flags completo y aprobado para staging.
- [ ] Staging smoke end-to-end pasa: intake -> worker -> status -> token -> public report -> email con adjunto.
- [ ] HubSpot handoff validado segun modo aprobado (dry-run o live controlado).
- [ ] Signals de costo/abuso/run/delivery/handoff revisadas y documentadas.
- [ ] Production cutover preparado con rollback flag OFF <5 min.
- [ ] Promoción productiva ejecutada vía release control plane (preflight + manifest + orchestrator), NO flip ad-hoc; skill `greenhouse-production-release` invocada.
- [ ] Jobs Cloud Scheduler + ops-worker confirmados activos en staging (outbox publisher + handoff reactive consumer); el handoff entrega de verdad, no solo responde 200.
- [ ] `TURNSTILE_SECRET` con grant `secretAccessor` verificado contra el consumer real (captcha valida en staging).
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con fila por flag y estado por environment; `pnpm docs:closure-check` verde.
- [ ] Handoff/changelog/architecture delta actualizados con evidencia runtime.

## Verification

- `pnpm task:lint --task TASK-1246`
- `pnpm ops:lint --changed`
- Vercel env audit
- Cloud Run/Scheduler smoke
- Public staging smoke real
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] flag ledger actualizado
- [ ] EPIC-020 exit criteria actualizados

## Follow-ups

- Production analytics/conversion dashboard si no existe en Growth Forms.
- A/B testing de copy/CTA posterior al primer launch.

## Delta 2026-06-25

- **Bloqueo de blindaje del motor de formularios añadido** — `Blocked by` ahora incluye `TASK-1253` (validación server-side / autoridad real del submit) y `TASK-1255` (PII hardening Ley 21.719). Razón: el lead magnet captura PII pública a escala (incluido RUT) **a través del motor de formularios** (vía convergencia TASK-1251). Lanzar públicamente sin validación de servidor (1253) ni postura de protección de datos (1255) es exposición legal + leads basura desde el día uno. Estas dos son prerrequisito de cutover, no opcionales.
- **TASK-1254** (gate de correo corporativo) NO es hard-block pero sí fuertemente recomendado al lanzamiento; si su rollout apura, el primer launch puede salir con el form en política `warn` (etiqueta el lead como sospechoso sin rechazar) y subir a `block_field` post-launch. Documentar la decisión en el checklist de cutover.
- Cruce registrado por trabajo en TASK-1253/1255 (creación del bloque Growth Forms Data Integrity, 2026-06-25).

## Delta 2026-06-26

- **Bloqueo confirmado en runtime — NO arrancar rollout.** Verificación de los `Blocked by` al 2026-06-26:
  - ✅ complete: TASK-1242 (HubSpot handoff), TASK-1244 (review humano), TASK-1245 (status + token), TASK-1234 (worker async).
  - ❌ **to-do**: TASK-1241 (página pública), TASK-1250 (email + adjunto), TASK-1255 (PII hardening Ley 21.719).
  - 🔶 **in-progress**: TASK-1253 (validación server-side / autoridad del submit).
- **Evidencia de código, no solo lifecycle:**
  - No existe page route pública (`find src/app … *ai-visibility*page*` → vacío). El API de intake existe (`src/app/api/public/growth/ai-visibility/run/route.ts`) pero sin formulario público → el smoke e2e de Slice 2 (`form → run → status → report → email`) es inejecutable.
  - TASK-1253 documenta que `submitForm` server **no re-valida por tipo** hoy → encender intake público es el riesgo "leads basura desde día uno" del Delta 2026-06-25.
- **Conclusión:** Slice 2 (staging smoke) imposible sin 1241 + 1250; Slice 3 (cutover) legalmente bloqueado por 1253 + 1255 (prerrequisitos no opcionales). Task permanece `to-do` hasta destrabar. Sin push.

## Open Questions

1. ¿El primer launch sera Next.js Greenhouse route o sitio publico WordPress/Astro? Propuesta: seguir la decision de `TASK-1241`/EPIC-019 y no duplicar.
