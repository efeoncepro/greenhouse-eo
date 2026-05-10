# TASK-850 — Production Preflight CLI Complete (TASK-848 V1.1 follow-up)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform / cloud / reliability`
- Blocked by: `none` (TASK-848 V1.0 ya aporta foundation: migration + capabilities + outbox events + spec)
- Branch: `task/TASK-850-production-preflight-cli-complete`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar `scripts/release/production-preflight.ts` completo segun TASK-848 Slice 2. CLI fail-fast que valida branch/SHA, develop verde, main merge target, release batch size policy, Vercel staging/production readiness, Postgres health, GitHub Actions blockers (stale approvals + pending sin jobs), GCP WIF subjects, Azure WIF subjects, secrets y Sentry critical issues. Salida JSON machine-readable + resumen humano. Retry bounded N=3.

## Why

TASK-848 V1.0 entrega 2 reliability signals que detectan stale approvals + pending sin jobs en runtime, pero NO hay CLI fail-fast pre-deploy que un operador o el orquestador V1.1 pueda invocar como gate non-bypassable. Sin esta task, el operador depende de inspeccion manual del dashboard y/o de leer logs.

Delta 2026-05-10: el preflight tambien debe automatizar la policy de batch size definida en el runbook de production release. Greenhouse no debe promover batches grandes por accidente: la unidad de release es un bloque funcional coherente, medido por blast radius, reversibilidad y evidencia de validacion, no por numero de commits.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (V1, 2026-05-10)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (Platform Health V1 referencia)

## Scope

- `scripts/release/production-preflight.ts` con:
  - Validacion target_sha existe en git history
  - CI verde en commit (gh API)
  - Playwright smoke verde (gh API)
  - Release batch size policy:
    - diff `origin/main...target_sha` clasificado por dominio (`payroll`, `finance`, `auth/access`, `cloud/release`, `db/migrations`, `ui`, `docs`)
    - deteccion de archivos sensibles (`migrations/`, `src/lib/db`, `src/lib/payroll`, `src/lib/finance`, `src/lib/auth`, `src/lib/entitlements`, `.github/workflows`, `services/*/deploy.sh`, `vercel.json`, env/secrets docs)
    - heuristica de irreversibilidad: migraciones, schema/runtime shared, access model, cloud deploy infra, payment/payroll/accounting semantics
    - resultado `ok|warning|error` con razones y recomendacion `ship|split_batch|requires_break_glass`
    - error si mezcla dominios sensibles independientes sin dependencia documentada
  - Detector stale approvals (reusar logica de `release-stale-approval.ts`)
  - Detector pending sin jobs (reusar logica de `release-pending-without-jobs.ts`)
  - Vercel staging/production readiness (Vercel API)
  - `pnpm pg:doctor` invocacion + parseo
  - `pnpm pg:connect:status` migrations al dia
  - GCP WIF subject verification (`gcloud iam workload-identity-pools providers describe`)
  - Azure WIF subject verification (`az ad app federated-credential list`)
  - Sentry critical issues 24h (Sentry API)
  - Output: JSON machine-readable + humano
  - Retry bounded N=3 con backoff exponencial
  - `redactErrorForResponse` aplicado a todo error en summary
- Tests:
  - Unit tests del detector logic (mock GH API)
  - Integration test contra dev environment
- Documentacion: actualizar runbook `production-release.md` con reemplazo del checklist manual por CLI.

## Acceptance Criteria

- [ ] `production-preflight.ts` ejecuta los 12 checks fail-fast, incluyendo `release_batch_policy`.
- [ ] Output JSON machine-readable consumible por workflow CI step.
- [ ] Output JSON incluye `releaseBatchPolicy` con dominios tocados, archivos sensibles, nivel de riesgo, decision y razones.
- [ ] `release_batch_policy` bloquea mezcla de dominios sensibles independientes sin dependencia documentada.
- [ ] `release_batch_policy` permite docs-only agrupable y UI bajo riesgo relacionado sin bloquear.
- [ ] WIF subjects verification GCP + Azure detecta drift y emite comando exacto de remediacion.
- [ ] Retry bounded N=3 con backoff exponencial.
- [ ] Tests unitarios cubren happy path + cada failure mode.

## Out of Scope

- No implementar el orquestador `production-release.yml` (TASK-851).
- No implementar dashboard UI (TASK-855).
