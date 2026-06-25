# TASK-1246 — Growth AI Visibility: Public Launch Readiness + Rollout

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
- Blocked by: `TASK-1241, TASK-1242, TASK-1244, TASK-1245, TASK-1250`
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

- Activar staging con `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED=true` y Turnstile real.
- Ejecutar smoke end-to-end: form -> run -> status -> report token -> public report -> email con adjunto -> HubSpot handoff.

### Slice 3 — Production release plan

- Preparar release control plane, prod envs OFF->ON con aprobacion humana, smoke prod low-volume y signals.
- Dejar evidencia en Handoff/changelog y ledger de flags.

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

## Open Questions

1. ¿El primer launch sera Next.js Greenhouse route o sitio publico WordPress/Astro? Propuesta: seguir la decision de `TASK-1241`/EPIC-019 y no duplicar.
