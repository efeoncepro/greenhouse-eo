# TASK-920 — Production Release Orchestrator resilience (decouple manifest finalization from non-critical gated-job transient flakes + gh-API Azure diff + watchdog honesty)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-920-release-orchestrator-resilience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El orquestador de release marca un release como `aborted` cuando un flake transitorio de `actions/checkout` golpea un job Azure **gated que iba a saltarse** (no-diff `infra/azure/**`), aunque TODOS los deploys reales (4 Cloud Run workers + Vercel) hayan sido exitosos. Esta task desacopla la finalización del manifest del path no-crítico, elimina el modo de falla del checkout en la diff-detection de Azure (Compare API en vez de `git diff` local), y vuelve honesto al watchdog ante su propio flake de infra. No es urgente — producción está sana y el re-dispatch ya es recuperación válida.

## Why This Task Exists

Incidente observado live 2026-05-23 (release `ee0f3aa8`, develop→main, TASK-916 RpA V2 + ISSUE-079/080): los 4 workers Cloud Run (ops-worker / commercial-cost-worker / ico-batch-worker / hubspot-greenhouse-integration) + Vercel quedaron READY en el SHA, pero el manifest se marcó `aborted`. Causa raíz: un fallo transitorio de `actions/checkout@v5` (`fatal: could not read Username for 'https://github.com': terminal prompts disabled`, exit 128, retries internos agotados en una ventana ~30-60s) golpeó el step "Detect Bicep diff vs origin/main" del job gated `deploy-azure-teams-notifications`, que **iba a saltarse** (no había diff `infra/azure/**`). Como `post-release-health` depende *hard* de los 2 jobs Azure gated y `transition-released` cascada de él, el flake de un job no-op abortó un release completamente exitoso. Un re-dispatch limpio produjo `state=released` (confirmando transitorio). El **mismo** flake de checkout falló por separado al `production-release-watchdog` (su step `actions/checkout`), haciéndolo reportar `failure` en lugar de correr sus detectores. Sin submódulos en el repo (descartado).

La debilidad arquitectónica real no es "el checkout falló" — es que **la finalización del manifest está acoplada a jobs no-críticos**, y que un step de diff-detection clona el repo para algo que la GitHub Compare API responde sin clone.

## Goal

- La finalización del manifest depende *hard* solo del critical path (4 workers + Vercel); un flake transitorio en un job Azure no-op nunca aborta un release exitoso.
- El state machine sigue **honesto**: si un deploy real (worker/Vercel) falla → `aborted`; health soft-fail → `degraded`; Azure que realmente desplegó y falló → `degraded`; Azure skip/no-op con flake → `released` (warning logueado).
- La diff-detection de Azure usa GitHub Compare API (sin checkout/clone) → elimina el surface del flake, no lo reintenta.
- El watchdog distingue "no pude correr" (infra/checkout → severity `unknown`, no paginea) de "drift real detectado".

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` — state machine del manifest (`preflight→ready→deploying→verifying→released|degraded|aborted`), append-only `release_manifests` / `release_state_transitions`.
- `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (no aplica directo, pero contexto de tooling CI).

Reglas obligatorias:

- NUNCA marcar `released` si un deploy real (worker o Vercel) falló — debe ser `aborted`.
- NUNCA introducir un nuevo bypass del state machine ni mutar `release_manifests` por SQL crudo.
- Mantener append-only en `release_manifests` / `release_state_transitions`.
- Break-glass (`bypass_preflight_reason`) sin cambios.
- Cumplir el **skill-maintenance contract** de `greenhouse-production-release` (ver Files owned) — cualquier cambio al workflow de deploy de producción actualiza skill + docs + tests + allowlist en el mismo change set.

## Normative Docs

- `.claude/skills/greenhouse-production-release/SKILL.md` (+ `.codex/` mirror) — skill-maintenance contract.
- `docs/operations/runbooks/production-release.md`
- `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`

## Dependencies & Impact

### Depends on

- TASK-848 / TASK-851 / TASK-853 (release control plane foundation — orquestador, manifest store, Azure gating). Ya `complete`/live.
- `scripts/release/production-rollback.ts` y CLIs `release:orchestrator-*` existentes.

### Blocks / Impacts

- Todo release futuro `develop→main` (mejora la resiliencia, no cambia el contrato de uso).
- TASK-915 / TASK-917 (RpA V2 cutover) se benefician indirectamente (releases más robustos), pero NO dependen de esta task.

### Files owned

- `.github/workflows/production-release.yml` (job graph + transition wiring)
- `.github/workflows/azure-teams-deploy.yml` (diff-detection step)
- `.github/workflows/azure-teams-bot-deploy.yml` (diff-detection step)
- `.github/workflows/production-release-watchdog.yml` (checkout resilience)
- `scripts/release/*` — el CLI que ejecuta `orchestrator-transition-state` (criticality logic) `[verificar nombre exacto del archivo]`
- `src/lib/release/workflow-allowlist.ts` (solo si cambia mapping)
- `.claude/skills/greenhouse-production-release/SKILL.md` + `.codex/skills/greenhouse-production-release/SKILL.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/runbooks/production-release.md` + `docs/operations/runbooks/production-release-watchdog.md`
- `docs/manual-de-uso/plataforma/release-orchestrator.md`
- tests: `concurrency-fix-verification.test.ts` + nuevos para criticality logic + gh-API diff `[verificar paths]`

## Current Repo State

### Already exists

- `production-release.yml` con jobs: `preflight`, `record-started`, `approval-gate`, 4 `deploy-<worker>`, `deploy-azure-teams-notifications`, `deploy-azure-teams-bot`, `wait-vercel` (Wait Vercel production deploy READY), `post-release-health`, `transition-released`, `summary`.
- `post-release-health` (`needs:` los 4 workers + 2 Azure jobs; sin `if: always()` → se SKIPea si un needed falla).
- `transition-released` (`needs: [record-started, post-release-health]`, `if: always() && needs.record-started.result == 'success'`).
- Azure jobs con step "Detect Bicep diff vs origin/main": `git diff --name-only origin/main~1...${TARGET_SHA} -- 'infra/azure/<sub>/**' || true` tras `actions/checkout@v5` con `fetch-depth: 0`. Emiten output `should_deploy` (`true`/`false`).
- `production-release-watchdog.yml` con `actions/checkout@v5` + detectores (stale_approval, pending_without_jobs, worker_revision_drift).
- Manifest state machine + CLIs `release:orchestrator-record-started` / `release:orchestrator-transition-state`.

### Gap

- `post-release-health` + `transition-released` no distinguen jobs **críticos** (workers + Vercel) de **gated/no-op** (Azure sin diff). Un flake transitorio en un job Azure no-op aborta el release.
- La diff-detection de Azure depende de un checkout/clone + posible fetch remoto sin credenciales → surface de flake `could not read Username`.
- El watchdog trata su propio fallo de checkout como `failure` (paginea / parece drift) en vez de `unknown`.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — gh-API Azure diff-detection (elimina el modo de falla del checkout)

- Reemplazar en `azure-teams-deploy.yml` y `azure-teams-bot-deploy.yml` el step "Detect Bicep diff" para que, en vez de `actions/checkout` + `git diff origin/main~1...SHA`, consulte la **GitHub Compare API**: `gh api repos/${{ github.repository }}/compare/<base>...<head>` y filtre `files[].filename` por el prefijo `infra/azure/<sub>/**` para setear `should_deploy`.
- `<base>` = el commit previamente desplegado en main (`origin/main~1` equivalente vía API: el primer parent del target, o el manifest anterior); `<head>` = `target_sha`. Resolver el base de forma robusta vía API (sin asumir refs locales).
- El job de diff-detection ya no necesita `actions/checkout` (o lo mantiene minimal sin depender de fetch remoto).
- Tests: unit/dry-run que valide el parseo del Compare API + el filtro de path (mock de respuesta API con/sin archivos `infra/azure/**`).

### Slice 2 — Criticality classification en la finalización del manifest (fix central)

- `post-release-health.needs` pasa a depender *hard* solo del critical path: los 4 `deploy-<worker>` + `wait-vercel`. Quitar los 2 Azure jobs de sus `needs` hard.
- `transition-released.needs` incluye los Azure jobs con `if: always()`, y el CLI `orchestrator-transition-state` (o un step previo) lee `needs.<azure>.result` + el output `should_deploy` de cada Azure job.
- Matriz de estado final canónica (implementar en el CLI/step):
  - worker o Vercel `result != success` → `aborted`.
  - health soft-fail → `degraded`.
  - Azure `should_deploy == true` AND `result != success` → `degraded`.
  - Azure (`should_deploy == false` OR skipped) con `result == failure` (flake transitorio) → **no bloquea**: `released` + warning logueado en `metadata_json`.
  - todo crítico ok + health ok + Azure ok/skip → `released`.
- Tests: tabla de la matriz (cada combinación → estado esperado) en el test del CLI; + `concurrency-fix-verification.test.ts` extendido para verificar el nuevo `needs` graph.

### Slice 3 — Watchdog honesto ante su propio flake de infra

- En `production-release-watchdog.yml`: hacer el checkout resiliente (retry acotado) y, si el checkout/infra falla tras retries, emitir severity `unknown` ("no pude correr") en vez de `failure` que parezca drift. Distinguir explícito "could not run" de "drift detected".
- Tests/verify: simular fallo de checkout → watchdog reporta `unknown`, no `error`.

### Slice 4 — Skill + docs + closing (maintenance contract)

- Actualizar `.claude/skills/greenhouse-production-release/SKILL.md` + `.codex/` mirror con el nuevo job graph + criticality matrix + gh-API diff.
- Actualizar `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` (Delta), `runbooks/production-release.md` + `production-release-watchdog.md`, `manual-de-uso/plataforma/release-orchestrator.md`.
- Hard-rule deltas en `CLAUDE.md` + `AGENTS.md` (criticality classification + gh-API diff invariants).
- `Handoff.md` + `changelog.md` + cross-impact + README/registry close.

## Out of Scope

- Cambiar el enum del state machine del manifest (`released|degraded|aborted|...`) — se reusa tal cual.
- Cambiar el comportamiento de rollback (`production-rollback.ts`).
- Azure WIF / federated credentials.
- El cutover RpA V2 (TASK-915 / TASK-917).
- Reemplazar `actions/checkout` globalmente (solo se elimina de la diff-detection de Azure; el watchdog lo mantiene con resiliencia).

## Detailed Spec

Ver el diseño 4-pillar de `arch-architect` reproducido en Why/Scope. Puntos finos:

- **Resolución del base SHA para el Compare API**: preferir el `target_sha` del manifest `released` anterior (consultable) sobre `origin/main~1`, para que el diff sea "qué cambió desde el último release real" — más correcto que "el primer parent del merge commit". Si no se quiere tocar PG desde el workflow, `origin/main~1` vía Compare API (`compare/<sha>~1...<sha>` no aplica a la API; usar el parent SHA resuelto vía `gh api repos/.../commits/<target_sha>` → `parents[0].sha`).
- **`should_deploy` semántica**: `true` si el Compare API devuelve ≥1 archivo bajo `infra/azure/<sub>/**`; `false` si 0. Mantener el contrato de output existente para no romper los steps downstream del job.
- **Matriz de criticidad**: implementar como función pura testeable en el CLI de transición (entrada: resultados de jobs + flags `should_deploy`; salida: `released|degraded|aborted` + razón), NO inline en YAML, para poder unit-testear.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (gh-API diff) → Slice 2 (criticality) → Slice 3 (watchdog) → Slice 4 (docs/skill).
- Slice 1 y Slice 3 son independientes entre sí; Slice 2 NO depende de Slice 1 pero se beneficia (con Slice 1 los Azure jobs casi nunca fallan). Recomendado el orden listado.
- Slice 4 (skill/docs) DEBE cerrar junto con el último slice de código — el maintenance contract prohíbe mergear cambios al workflow de producción sin actualizar skill + docs + tests en el mismo change set.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Criticality logic marca `released` cuando un deploy real falló (falso verde) | release | low | Función pura testeada con matriz exhaustiva; worker/Vercel siguen siendo hard `needs` de health | `platform.release.last_status` + watchdog `worker_revision_drift` |
| gh-API diff resuelve mal el base SHA → `should_deploy` incorrecto (deploy Azure que no tocaba, o skip de uno que sí) | release / Azure | medium | Resolver base vía `parents[0].sha` del Compare API; test con fixtures; Azure deploy es idempotente | revisar `should_deploy` en el job log + diff vs `git` en staging |
| Cambio del `needs` graph rompe el orquestador (job no corre / corre fuera de orden) | release | medium | `concurrency-fix-verification.test.ts` extendido; validar solo en release real post-merge | orquestador `failure` visible en `gh run` |
| Watchdog `unknown` enmascara un drift real (sub-reporta) | release | low | `unknown` solo cuando el checkout/infra falla, no cuando los detectores corren; logs explícitos | ausencia de runs `success` sostenida del watchdog |
| El cambio solo se valida del todo en un release real | release | high (certeza) | Unit tests de la matriz + dry-run del gh-API diff; aceptar que el primer release post-merge es la validación E2E | orquestador run + manifest state |

### Feature flags / cutover

- Sin feature flag — es un cambio de tooling CI (workflow YAML + CLI de transición). No hay runtime de producto. Cutover inmediato al mergear a `develop` y luego promover a `main` (los workflows de release corren desde `main`).
- **Nota de auto-aplicación**: como los workflows de release corren `@refs/heads/main`, el fix solo aplica a releases DESPUÉS de que el cambio esté en `main`. El release que lleva este fix a `main` todavía usa el orquestador viejo — aceptable (idempotente; si falla por el flake viejo, re-dispatch).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (gh-API diff) | revert PR (vuelve a `git diff` local) + redeploy workflow | <10 min | sí |
| Slice 2 (criticality) | revert PR (vuelve al `needs` graph anterior) | <10 min | sí |
| Slice 3 (watchdog) | revert PR | <10 min | sí |
| Slice 4 (docs/skill) | revert PR (doc-only) | <5 min | sí |

Todos los slices son revert-PR puros — sin migrations, sin state mutation, sin backfill. Reversibilidad alta a nivel de archivos; el único componente "one-way-ish" es que solo se valida E2E en un release real (pero el revert restaura el comportamiento previo conocido).

### Production verification sequence

1. Mergear los 4 slices a `develop`; `pnpm lint` + `tsc` + `pnpm test` verdes (incluye nuevos tests de matriz + gh-API diff).
2. Promover a `main` vía orquestador canónico (este release todavía corre el orquestador viejo — si falla por flake, re-dispatch).
3. En el **siguiente** release real (ya con el fix en `main`): verificar que un Azure job no-op (sin diff `infra/azure/**`) reporta `should_deploy=false` vía gh-API y NO bloquea la transición; manifest → `released`.
4. (Opcional, si emerge) inducir un fallo Azure real (con diff) en staging-equivalente para verificar que → `degraded`, no `released`.
5. Verificar que el watchdog ante un checkout fail reporta `unknown` (revisar un run histórico fallido o inducir).
6. Monitor `platform.release.last_status` + watchdog 2-3 releases.

### Out-of-band coordination required

- N/A — repo-only change. No toca Azure AD, secrets GCP, HubSpot, ni requiere comunicación a operadores HR/Finance. (El skill-maintenance contract es interno al repo.)

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Un release donde los 4 workers + Vercel son `success` y un Azure job no-op falla por flake transitorio termina en manifest `released` (no `aborted`).
- [ ] Un release donde un worker o Vercel falla termina en `aborted` (state machine honesto preservado).
- [ ] Un release donde un Azure job con `should_deploy=true` falla termina en `degraded` (no `released`, no `aborted`).
- [ ] La diff-detection de Azure no ejecuta `git diff` local ni depende de un fetch remoto autenticado — usa GitHub Compare API.
- [ ] El watchdog, ante un fallo de su propio checkout, reporta severity `unknown` (no `failure`/drift).
- [ ] La criticality matrix está implementada como función pura con tests por combinación.
- [ ] Skill (`.claude` + `.codex`) + docs (control plane, runbooks, manual) + CLAUDE.md/AGENTS.md actualizados en el mismo change set (maintenance contract).
- [ ] `concurrency-fix-verification.test.ts` extendido y verde con el nuevo `needs` graph.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (incluye tests nuevos de criticality matrix + gh-API diff parsing)
- Validación E2E: el primer release real post-merge (ver Production verification sequence).

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-848/851/853/915/917)
- [ ] skill `greenhouse-production-release` (`.claude` + `.codex`) actualizada por maintenance contract

## Follow-ups

- Si el flake `actions/checkout` aparece en OTROS workflows (CI, ops-worker-deploy), evaluar una action compartida de checkout-con-retry como hardening transversal (no en scope de esta task).

## Open Questions

- ¿El base del Compare API debe ser el `target_sha` del último manifest `released` (más correcto semánticamente) o `parents[0].sha` del target (más simple, sin tocar PG desde el workflow)? Decidir en Discovery — preferencia por `parents[0].sha` salvo que el equipo quiera el diff "desde el último release real".
- Path exacto del CLI `orchestrator-transition-state` en `scripts/release/` `[verificar]`.
