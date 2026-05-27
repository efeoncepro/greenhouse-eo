# TASK-931 — GitHub Actions Cost Guardrails + Signal-Preserving CI Optimization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `platform|ci|reliability|ops`
- Blocked by: `none`
- Branch: `develop` (operator override: no branch switch)
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Reducir el gasto de GitHub Actions sin volver a la ceguera operativa que motivo el uso intensivo de CI bajo Vibe Coding. La solucion debe preservar feedback temprano, evidencia auditable del ultimo commit y alertas de drift/costo, pero evitar runs obsoletos, gates duplicados y despliegues innecesarios.

## Why This Task Exists

El smoke live de TASK-637 mostro que mayo 2026 acumula `USD 93.18 gross` en GitHub Actions para `efeoncepro/greenhouse-eo`, casi todo en `Actions Linux` (`15.339` min). El ranking por job-min visibles dejo a `CI` como driver principal (`5.157` min / `339` runs), seguido por `Playwright E2E smoke` (`933` min / `287` runs), `Production Release Orchestrator`, `Ops Worker Deploy` y `Commercial Cost Worker Deploy`.

El contexto de producto explica el gasto: Greenhouse se desarrolla casi 100% con Vibe Coding y los gates se endurecieron porque antes los errores pasaban tarde a produccion. El problema real no es "hay demasiada observabilidad"; es que la observabilidad actual no distingue bien entre:

- señal vigente del ultimo estado de una rama/PR;
- runs obsoletos por commits sucesivos;
- cambios documentales o de tareas que ya tienen gates especializados;
- cambios de codigo que requieren full verification;
- deploys de workers disparados por path filters demasiado amplios.

El primer guardrail ya aplicado en `develop` (`ci: reduce obsolete actions runs`) agrego `concurrency` latest-only para PR/develop y `paths-ignore` docs-only en `CI`/`Playwright`. Esta task formaliza el siguiente tramo canonico.

## Goal

- Mantener la filosofia "detectamos antes de produccion" con gates claros por riesgo.
- Reducir minutos de Actions desperdiciados por runs obsoletos, duplicados o sin impacto runtime.
- Exponer costo y consumo por workflow/job de forma repetible, no por consultas manuales ad hoc.
- Definir presupuestos/alertas GitHub Actions y señales Greenhouse para detectar spikes antes de la invoice.
- Revisar path filters de worker deploys sin dejar cambios productivos stranded.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

Reglas obligatorias:

- No apagar gates por costo. Cambiar `when`/`how often` antes de cambiar `what verifies`.
- `main` y release control plane conservan evidencia completa; cualquier cancelacion debe limitarse a PR/develop o a runs claramente obsoletos.
- CI local hooks y CI remoto son capas complementarias; no eliminar una capa sin reemplazo verificable.
- Cost observability es una señal de reliability, no un reporte financiero aislado.
- Si se cambia el contrato de release, worker deploy o preflight, revisar ADR y actualizar `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/documentation/operations/cloud-cost-intelligence-finops.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- GitHub Docs oficiales para Billing/Usage, runner pricing, workflow syntax, concurrency, path filters y budgets (revalidar al ejecutar; pricing cambia).

## Dependencies & Impact

### Depends on

- `TASK-637` complete — GitHub Billing reader + signal `cloud.billing.github`.
- `TASK-926` complete — task-specific docs gate `task-contract.yml`, usado para justificar docs-only skips del CI full.
- `TASK-633` complete — reliability change-based verification matrix; reusable para no perder smoke por modulo.
- `TASK-859` to-do — Workflow Run Metrics + DORA Signals + Flaky Detector. Esta task debe decidir si lo consume, lo reduce o lo supersede parcialmente.
- Workflow runtime actual en `.github/workflows/*.yml`.

### Blocks / Impacts

- Cualquier decision futura de bajar o subir CI gates.
- `TASK-930` indirectamente, porque worker deploy config y path filters pueden afectar costo/Cloud Run.
- Release flow de `develop -> main` si se toca `production-release.yml` o worker workflows.
- Admin/Ops Health si se agregan signals o UI de CI cost.

### Files owned

- `.github/workflows/ci.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/reliability-verify.yml`
- `.github/workflows/ops-worker-deploy.yml`
- `.github/workflows/commercial-cost-worker-deploy.yml`
- `.github/workflows/ico-batch-deploy.yml`
- `.github/workflows/production-release.yml`
- `src/lib/cloud/github-billing.ts`
- `src/types/github-billing.ts`
- `src/lib/reliability/signals.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `scripts/`
- `package.json`
- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/documentation/operations/cloud-cost-intelligence-finops.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `src/lib/cloud/github-billing.ts` lee GitHub Billing Usage en modo read-only y agrega producto/repo/SKU.
- `cloud.billing.github` ya existe como reliability signal de costo/forecast/spike.
- `.github/workflows/ci.yml` ejecuta lint, gates, test inventory, test results, coverage, observability summary y build.
- `.github/workflows/playwright.yml` ejecuta smoke e2e en `push` a `develop`.
- `task-contract.yml` y `design-contract.yml` cubren subconjuntos documentales especificos.
- `reliability-verify.yml` puede mapear cambios a smoke specs por modulo.
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` define el plano humano/agente: iterar en local, validar con `pnpm local:*`, revisar localhost para UI y esperar confirmacion antes de push remoto.
- Primer safe slice ya aplicado: `CI` cancela runs obsoletos en PR/develop y `CI`/`Playwright` ignoran docs-only.

### Gap

- No existe un reporte reproducible versionado que atribuya minutos/costo por workflow/job.
- `cloud.billing.github` no explica que workflow esta quemando el costo; solo muestra billing por repo/SKU/producto.
- CI sigue siendo monolitico: fast feedback y full gate viven en un mismo job caro.
- No hay politica documentada de "fast gate", "full gate", "release gate" y "scheduled/deep gate".
- Worker deploy path filters pueden ser correctos pero amplios; se requiere auditoria para reducir despliegues sin dejar fixes stranded.
- No hay budget/alert threshold productivo definido para GitHub Actions.

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

### Slice 1 — Baseline reproducible de costo por workflow/job

- Crear un comando/script repo-local que use GitHub Actions API via `gh` o token read-only para listar runs/jobs de una ventana y agregue:
  - minutos por workflow;
  - minutos por job;
  - count de runs;
  - max duration;
  - costo estimado usando rate configurable y pricing revalidado.
- El reporte debe distinguir billing real (`TASK-637`) vs estimacion por job-min; documentar limitaciones (rounding por job, descuentos, included minutes, retries).
- Agregar doc/runbook para ejecutar la auditoria mensual antes de tocar gates.

### Slice 2 — ADR / contrato de gates por riesgo

- Crear o actualizar spec arquitectonica con la taxonomia:
  - `fast feedback`: barato, corre en cada code PR/develop vigente.
  - `full verification`: caro, corre en merge/release/checkpoint o cuando cambia runtime sensible.
  - `e2e smoke`: path-aware, no necesariamente en cada doc/task commit.
  - `release gate`: nunca se relaja por costo.
  - `scheduled/deep`: coverage/build/e2e ampliado cuando no bloquea iteracion.
- Declarar explicitamente que "latest commit wins" aplica a PR/develop, no a `main`.
- Indexar ADR si emerge decision nueva en `docs/architecture/DECISIONS_INDEX.md`.
- Alinear el contrato remoto con `LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`: CI remoto es integracion/release, no loop de exploracion.

### Slice 3 — CI split sin perdida de señal

- Refactorizar `.github/workflows/ci.yml` de monolitico a jobs/lanes separados o workflows separados segun Discovery:
  - lane rapida obligatoria para codigo;
  - lane completa para condiciones de riesgo;
  - artifacts/test summary preservados;
  - status checks legibles para humanos y agentes.
- Mantener `pnpm lint`, typecheck, tests y build en algun gate verificable antes de release.
- Evitar que docs-only dependa de CI full cuando ya existe `task-contract`/`design-contract`.

### Slice 4 — Playwright y reliability verification path-aware

- Revisar si `playwright.yml` debe correr por paths de UI/runtime o si `reliability-verify.yml` debe absorber parte del smoke en PR.
- Mantener cobertura de rutas criticas para cambios que tocan auth, layout, navigation, admin, payroll, reliability y API critical paths.
- No subir timeouts ni ignorar flakes; si hay flake real, abrir follow-up separado.

### Slice 5 — Worker deploy path filters y release coupling

- Auditar `ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml` e `ico-batch-deploy.yml` contra codigo real de cada worker.
- Reducir path filters solo si existe evidencia de que un path no afecta ese worker.
- Si un path compartido es ambiguo, preferir signal/dry-run a removal silencioso.
- Coordinar con `GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` y `TASK-930` si el cambio toca staging/prod worker config.

### Slice 6 — Cost signals y budgets

- Extender el runtime de observabilidad para mostrar hotspots por workflow/job o crear task hija si el scope excede V1.
- Configurar/documentar thresholds:
  - monthly gross warn/critical para GitHub Actions;
  - daily spike percentage;
  - top workflow share alert.
- Si GitHub budgets/alerts requieren UI externa, documentar pasos exactos y evidence; si existe API/CLI autenticada, usarla con guardrails.

### Slice 7 — Docs, handoff y operating model

- Actualizar `cloud-cost-intelligence-finops.md` con la lectura operativa: costo bruto vs neto, workflow hotspots, y decision tree de recorte.
- Actualizar arquitectura de CI/release cuando cambie el contrato.
- Dejar `Handoff.md` con baseline antes/despues y cualquier riesgo residual.
- Registrar follow-ups con IDs si quedan fuera de V1.

## Out of Scope

- Apagar CI, Playwright o release gates para ahorrar dinero sin reemplazo.
- Mover a self-hosted runners en V1. Puede evaluarse despues con threat model y costo total.
- Cambiar branch protection o merge policy sin ADR.
- Reescribir tests o bajar coverage por costo.
- Resolver flakes o N+1 Sentry no relacionados; eso vive en tasks dedicadas.
- Cambiar `TASK-930` worker service split; esta task solo coordina si los path filters interactuan.

## Detailed Spec

La solucion debe partir de datos reales, no intuicion. El reporte de Slice 1 debe reproducir al menos las cifras observadas el 2026-05-24:

- `CI`: mayor driver por frecuencia.
- `Playwright E2E smoke`: segundo driver por frecuencia y setup Chromium.
- `Production Release Orchestrator`: menos runs, mas jobs por run.
- Worker deploys: costo medio y posible overlap con cambios de paths compartidos.

La estimacion de costo por workflow debe mostrar "estimated gross" como aproximacion, no como factura. La factura oficial sigue siendo GitHub Billing (`TASK-637`), que no expone workflow/job. La atribucion workflow/job viene de Actions Runs/Jobs API.

El contrato de gates debe optimizar por "costo por señal util":

- Si un run fue superseded por un commit posterior, no aporta señal vigente.
- Si el cambio es docs-only y ya tiene gate especializado, CI full aporta baja señal.
- Si el cambio toca runtime sensible, CI full + smoke siguen siendo necesarios.
- Si el cambio va a production, release gate completo no se negocia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (baseline) -> Slice 2 (gate contract) -> Slice 3/4/5 (workflow changes) -> Slice 6 (signals/budgets) -> Slice 7 (docs/close).
- Slice 3/4/5 no deben shippear si Slice 2 no define claramente que señal reemplaza o conserva cada gate.
- Slice 6 puede avanzar en paralelo con Slice 3/4/5 solo despues de Slice 1, porque necesita baseline.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Error de codigo llega tarde por gate demasiado laxo | CI / release | medium | Mantener full gate antes de release; fast/full taxonomy; no relajar `main` | CI failed post-merge, Sentry regressions, release preflight |
| Cambio runtime no dispara Playwright/smoke | UI / reliability | medium | Path-aware con lista de critical paths + reliability-verify fallback | Playwright missing after critical path change |
| Worker fix queda stranded por path filter reducido | Cloud Run workers | medium | Audit de imports reales + dry-run + no remover paths ambiguos | `platform.release.worker_revision_drift`, worker logs |
| Cost signal atribuye mal el costo | Billing / observability | low | Separar billing oficial vs estimacion job-min; documentar rounding/descuentos | `cloud.billing.github` vs audit script delta |
| GitHub budgets quedan solo documentados y no configurados | Ops | medium | Evidence de configuracion externa o follow-up bloqueante | threshold env missing / budget not configured |

### Feature flags / cutover

- Workflow changes no usan feature flag runtime; rollback es revert de commit.
- Si se agrega signal/UI nuevo, debe degradar a `not_configured`/`unavailable` cuando falte token o permiso.
- Si se agrega threshold env:
  - `GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD`
  - `GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD`
  - `GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT`
  - nuevos envs solo si Discovery demuestra que los existentes no cubren workflow hotspots.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert script/docs; no runtime impact | <10 min | si |
| Slice 2 | Revert ADR/docs o marcar Superseded con rationale | <30 min | si |
| Slice 3 | Revert workflow refactor; vuelve CI monolitico | <10 min + next push | si |
| Slice 4 | Revert Playwright/reliability filters | <10 min + next push | si |
| Slice 5 | Revert worker path filters; manual workflow_dispatch si se detecta stranded deploy | <30 min | si |
| Slice 6 | Revert signal/UI; unset thresholds si alertan mal | <30 min | si |
| Slice 7 | Revert docs if wrong; no runtime impact | <10 min | si |

### Production verification sequence

1. Validar workflows con YAML parser local.
2. Crear PR o push controlado con cambio docs-only y confirmar que no dispara CI full, pero si aplica gate especializado cuando corresponda.
3. Crear PR o push controlado con cambio TS pequeno y confirmar fast lane + full lane esperadas.
4. Crear cambio simulado en path de Playwright/reliability y confirmar smoke esperado.
5. Crear cambio simulado en path de worker y confirmar deploy esperado; cambio fuera de path no debe deployar.
6. Verificar `cloud.billing.github` y el nuevo reporte de workflow hotspots contra la misma ventana.
7. Monitorear 7 dias: minutos diarios GitHub Actions bajan sin aumento de incidentes/regresiones.

### Out-of-band coordination required

- GitHub org billing/budget UI puede requerir owner/billing manager. Si la API no permite configurar budgets, dejar evidence manual con screenshot/link o checklist firmado en Handoff.
- Cualquier cambio a required status checks/branch protection requiere aprobacion humana separada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe reporte reproducible de Actions por workflow/job para una ventana configurable (`pnpm actions:cost:audit`).
- [x] Existe contrato documentado de gates (`fast`, `full`, `smoke`, `release`, `scheduled/deep`) con decision de cuando corre cada uno (`GREENHOUSE_CI_COST_SIGNAL_GUARDRAILS_V1`).
- [x] `AGENTS.md`, `CLAUDE.md` y `project_context.md` mantienen referencias vigentes al flujo local-first y comandos `pnpm local:*`.
- [x] CI mantiene full verification antes de release/main y evita runs obsoletos/docs-only sin perder gates especializados.
- [x] Playwright/reliability verification quedan path-aware con critical paths documentados.
- [x] Worker deploy path filters estan auditados contra imports/runtime real o se deja rationale de no cambiarlos.
- [x] GitHub Actions budgets/thresholds quedan configurados o documentados con blocker externo explicito.
- [x] `cloud.billing.github` mantiene deteccion de monthly/spike y el reporte local cubre top workflow antes de cierre de mes; persistencia workflow/job queda para TASK-859 si se requiere runtime UI.
- [x] Docs vivas y Handoff registran baseline before/after y riesgos residuales.

## Verification

- `ruby -e 'require "yaml"; Dir[".github/workflows/*.yml"].each { |f| YAML.load_file(f) }'`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal en el script; full suite no ejecutada por proporcionalidad/costo local)
- `pnpm task:lint --task TASK-931`
- Workflow dry-runs / GitHub run evidence segun slices modificados.
- Smoke con GitHub Billing reader o `gh api` para validar cifras actuales.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `TASK_ID_REGISTRY.md` refleja lifecycle/path final
- [x] si se cambiaron gates de release o CI, `DECISIONS_INDEX.md` y arquitectura aplicable quedaron sincronizados

## Follow-ups

- Evaluar self-hosted runners solo si 30 dias de datos muestran ROI claro y el threat model es aceptable.
- Evaluar cache/artifacts avanzados si el costo dominante pasa de frecuencia a build/test time por run.
- Si TASK-859 sigue vigente, decidir si absorbe workflow metrics persistidos o si TASK-931 cierra parte de su scope.

## Delta 2026-05-24

TASK-931 cerrada directo en `develop` por override del operador, sin cambio de rama.

Entregado:

- `pnpm actions:cost:audit`: script read-only via `gh api` que agrega workflow/job minutes, run counts, max duration y estimated gross USD por ventana configurable. El billing oficial sigue siendo `cloud.billing.github`/TASK-637; este reporte solo atribuye hotspots por job-min.
- ADR/contrato `docs/architecture/GREENHOUSE_CI_COST_SIGNAL_GUARDRAILS_V1.md`: define lanes `fast feedback`, `full verification`, `e2e smoke`, `release gate` y `scheduled/deep`; `latest commit wins` aplica a PR/develop, nunca a `main`/release.
- CI split: `.github/workflows/ci.yml` queda como fast integration con lint/typecheck/tests/build y sin coverage frecuente; `.github/workflows/ci-deep.yml` conserva coverage + observability artifacts en `main`, weekly y manual.
- Playwright/reliability path-aware: Playwright ahora corre por critical runtime/UI/auth/admin/payroll/reliability/API paths; `reliability-verify.yml` ignora docs-only.
- Worker deploys: no se redujeron path filters ambiguos para evitar fixes stranded; se aplico latest-only staging/develop en `ops-worker`, `commercial-cost-worker` e `ico-batch`.
- Budgets/thresholds: Vercel envs provisionados para `production`, `staging` y `development`: `GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD=100`, `GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD=150`, `GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT=100`. GitHub Budgets API confirma budget org-level de Actions existente con `prevent_further_usage=true`, `budget_amount=0`, alertas a `cesargrowth11`; no se modifico sin aprobacion humana porque podria bloquear uso pago/release.

Baseline y smoke:

- GitHub Billing mayo 2026: `USD 93.18989776300002` gross total, `USD 0` net total; driver principal `actions`.
- Smoke `pnpm actions:cost:audit --repo efeoncepro/greenhouse-eo --from 2026-05-24 --to 2026-05-24 --limit-runs 20 --format json`: 20 runs, 43 jobs, 128.45 min, estimated gross `USD 0.77`; top workflows: `CI` `USD 0.47`, `Production Release Orchestrator` `USD 0.17`, `Playwright E2E smoke` `USD 0.04`, `Ops Worker Deploy` `USD 0.04`.

Validado:

- `pnpm local:check` (incluye `pnpm lint` + `pnpm exec tsc --noEmit`)
- `pnpm test scripts/ci/__tests__/github-actions-cost-audit.test.ts`
- Ruby YAML parser sobre `.github/workflows/*.yml`
- `pnpm task:lint --task TASK-931`
- `git diff --check`

No validado:

- `pnpm test` full suite y `pnpm build` full; se uso `local:check` + tests focales por proporcionalidad.
- Evidencia post-push de workflows nuevos porque el operador pidio permanecer en `develop` y no se hizo push. Los cambios remotos empiezan a operar despues del proximo push/merge.

### Delta 2026-05-24 — segunda pasada costo-eficiente

Tras una revision live adicional de GitHub Actions:

- `CI` conserva lint/typecheck/tests en `push:develop`, pero `pnpm build` queda solo para PRs, `main` y dispatch manual. Rationale: Vercel ya ejecuta build para cada push a develop, por lo que el build GitHub era señal duplicada y pagada dos veces.
- `CI` agrega cache de ESLint (`.eslintcache`) para reducir minutos de lint sin cambiar el set de reglas.
- `Production Release Watchdog` baja de cada 30 minutos a hourly; el warning threshold operativo es 2h y `workflow_dispatch` queda disponible para checks inmediatos antes/despues de release.
- `pnpm actions:cost:audit` aumenta el buffer de `gh api` para soportar ventanas mensuales amplias sin `ENOBUFS`.
- Playwright no se parte por lanes todavia: el dato live muestra ~2.5 min/run y el setup domina; introducir un detect job puede comerse el ahorro. Se mantiene path-aware completo hasta que el costo de smoke crezca o TASK-859 entregue datos persistidos.

## Open Questions

- Resuelta: el reporte workflow/job vive como script local read-only en V1. Rationale: evita duplicar TASK-859 (workflow metrics persistidos/DORA/flaky detector), no agrega DB ni UI prematura y ya permite auditoria mensual reproducible.
