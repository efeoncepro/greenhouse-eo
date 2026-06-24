# TASK-1234 — Growth AI Visibility: Async Run Execution Worker

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations.ai|ops|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1234-growth-ai-visibility-async-run-execution-worker`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Mover la ejecución de un grader run de inline-en-el-endpoint a un **worker async** (Cloud Run, patrón outbox/ops-worker). Hoy `executeGraderRun` corre síncrono dentro de la route Vercel y **excede el timeout de la función** cuando hay providers lentos o muchos prompts (Gemini 3 ≈ 56s/call × N prompts × M providers ≫ límite). Sin esto, ningún run real/público de varios providers puede completar. Es el prerequisito de ejecución para el objetivo público del ADR.

## Why This Task Exists

TASK-1226/1227/1233 dejaron el motor completo (providers + normalización + score), pero la ejecución vive en `POST /api/admin/growth/ai-visibility/runs(/[runId]/score)` que corre **inline** en una serverless function. Hallazgo runtime 2026-06-24 (TASK-1233): un run Gemini-only (6 prompts × ~56s) **falló por timeout de la función Vercel** en staging. La superficie pública del ADR (usuarios reales, modo `full`/`internal_audit`, 3-4 providers) es imposible inline. El patrón canónico del repo para trabajo largo es Cloud Run worker + estado persistido (TASK-773 outbox publisher). El run-engine además persiste observations al final del loop → un timeout mid-run deja un run huérfano en `running` sin evidencia.

## Goal

- Ejecutar un grader run en un worker async fuera del request Vercel, sin límite de duración de función.
- Persistir progreso incremental (por observación) para que un fallo mid-run no pierda evidencia ni deje runs huérfanos en `running`.
- Que el endpoint admin pase a `enqueue + poll` (crea run `pending`, dispara el worker, el GET reporta progreso/estado) sin romper el contrato existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §Delta 2026-06-24 (invariantes provider adapters + scoring), §15-17 (observabilidad/cost), runtime contract.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — signals del módulo `growth`.
- `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md` — patrón canónico Cloud Run worker + Cloud Scheduler para path async crítico (NO Vercel cron).
- `services/ops-worker/**` — worker Cloud Run existente (endpoints + deploy) `[verificar]`.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Cloud Run/Scheduler del proyecto `[verificar]`.

Reglas obligatorias:

- NO ejecutar runs lentos/grandes inline en una route Vercel (el bug que esta task cierra).
- Worker server-only; reusa el primitive `executeGraderRun` (no reimplementar la orquestación). Si hace falta, refactor para persistencia incremental por observación.
- Sin import `@core/*` en código worker-bundled (boundary worker); correr `pnpm worker:runtime-deps-gate` si se toca `src/lib/**` worker-bundled.
- Flags default OFF; el grader sigue gated. El secreto/credencial de providers se resuelve server-side (igual que hoy).
- State machine de `grader_runs` ya existe (`pending/running/succeeded/partial/failed/skipped`); respetar las transiciones canónicas (`lifecycle.ts`).

## Normative Docs

- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — run-engine + store + endpoint actuales.
- `docs/tasks/complete/TASK-1233-growth-ai-visibility-enable-gemini-provider.md` — hallazgo del timeout inline (Delta de cierre).
- `CLAUDE.md` §"Outbox publisher canónico — Cloud Scheduler, no Vercel" + §"Ops/Reliability/Platform invariantes".

## Dependencies & Impact

### Depends on

- `TASK-1226` (complete) — `executeGraderRun`, `grader_runs`, store, endpoint.
- `services/ops-worker/**` (Cloud Run) como host del worker `[verificar]` — o un nuevo worker dedicado si el ops-worker no es apropiado (decidir en Discovery).

### Blocks / Impacts

- Bloquea la superficie pública del grader (ADR): sin ejecución async, runs reales multi-provider no completan.
- Habilita modo `full`/`internal_audit` real (hoy solo `light`/OpenAI cabe inline).
- Impacta el endpoint admin existente (pasa a enqueue+poll) y el smoke harness.

### Files owned

- `src/lib/growth/ai-visibility/run-engine.ts` — refactor para persistencia incremental + entrypoint enqueue/execute.
- `src/lib/growth/ai-visibility/store.ts` — helpers de claim/lock de run + persistencia por observación `[verificar]`.
- `services/ops-worker/**` — endpoint del worker + registro Cloud Scheduler/trigger `[verificar]`.
- `src/app/api/admin/growth/ai-visibility/runs/**` — enqueue + poll.
- migrations/ — solo si hace falta columna de progreso/lock en `grader_runs` (additive).

## Current Repo State

### Already exists

- `executeGraderRun` (síncrono, persiste observations al final) + `grader_runs` state machine + `provider_observations` (append-only).
- Endpoint admin `POST /runs` (inline) + `POST /runs/[runId]/score` + GET detail.
- Patrón Cloud Run worker + Cloud Scheduler (ops-worker, TASK-773) reutilizable.
- 4 reliability signals de provider + 5 de scoring.

### Gap

- La ejecución corre inline en Vercel → timeout en runs lentos/grandes (Gemini 3, modo full).
- `executeGraderRun` persiste observations en bloque al final → no hay progreso incremental; timeout mid-run = run huérfano `running` sin evidencia.
- No hay enqueue/claim/lock de run ni trigger del worker.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (orquestación async).
- Source of truth afectado: `greenhouse_growth.grader_runs` (estado/progreso) + `provider_observations` (incremental).
- Consumidores afectados: endpoint admin (enqueue+poll), smoke harness, futura superficie pública/report.
- Runtime target: `local` + `staging`; prod fuera de scope (release control plane posterior).

### Contract surface

- Contrato existente: `executeGraderRun`, `grader_runs` state machine (`lifecycle.ts`), endpoint admin.
- Contrato nuevo: trigger/claim de run + persistencia incremental + (posible) columna de progreso. Endpoint admin pasa a 202-enqueue + GET poll.
- Backward compatibility: `gated` — preservar el shape de GET; el POST puede cambiar a async (202 + runId) detrás de la misma capability.
- Full API parity: el worker reusa el primitive; ningún consumer ejecuta providers directo.

### Data model and invariants

- `grader_runs`: respetar la state machine; agregar claim/lock (ej. `SELECT … FOR UPDATE SKIP LOCKED` o columna `claimed_at`) para evitar doble ejecución `[verificar]`.
- `provider_observations` sigue append-only; persistir por observación (no en bloque) para progreso resiliente.
- Idempotencia: el `idempotencyKey` ya existe; el claim debe ser idempotente (no re-ejecutar un run terminal).
- Audit/observability: signals de worker (lag/dead-letter/duración) + `captureWithDomain('growth')`.

### Migration, backfill and rollout

- Migration posture: `additive` si se agrega columna de progreso/claim; `none` si el claim se hace con `FOR UPDATE SKIP LOCKED` sin columna.
- Default state: gated por los flags del grader (OFF).
- Backfill plan: N/A; recovery de runs huérfanos `running` (script idempotente que los marca `failed` o re-encola) `[verificar]`.
- Rollback path: revert PR + el endpoint vuelve a inline para `light`/OpenAI (que sí cabe) detrás de flag, o feature flag de async.
- External coordination: deploy del ops-worker (GitHub Actions WIF) + posible Cloud Scheduler job.

### Security and access

- Auth/access gate: endpoint admin con capability `growth.ai_visibility.run.execute` (existente); worker autenticado por el lane de workers (igual que ops-worker).
- Sensitive data posture: sin secret/raw provider text en logs; el worker resuelve secrets server-side.
- Error contract: canónico; runs fallidos quedan en `failed` con evidencia, no crash silencioso.
- Abuse/rate-limit: cost ceiling por modo (policy) + caps de concurrencia del worker.

### Runtime evidence

- Local checks: unit tests del claim/lock + persistencia incremental + recovery de huérfanos.
- DB/runtime checks: run `full` multi-provider completa async sin timeout; observations persisten incrementalmente.
- Integration checks: smoke contra el worker (no contra la route inline) con Gemini 3.
- Reliability signals: `growth.ai_visibility.run_execution_lag` / `…run_stuck_running` (nuevos) + reusar los de provider.

### Acceptance criteria additions

- [ ] Un run `full` multi-provider (incl. Gemini 3) completa async sin timeout.
- [ ] Timeout/fallo mid-run NO deja evidencia perdida ni run huérfano permanente.
- [ ] Endpoint admin enqueue+poll sin romper el GET existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Persistencia incremental + claim de run

- Refactor de `executeGraderRun` (o un wrapper) para persistir cada `provider_observation` apenas se produce (no en bloque al final) y actualizar progreso.
- Claim/lock de run (`FOR UPDATE SKIP LOCKED` o `claimed_at`) para evitar doble ejecución.
- Tests de progreso incremental + idempotencia del claim.

### Slice 2 — Worker async + trigger

- Endpoint del worker (ops-worker o dedicado) que toma un run `pending`/encolado y lo ejecuta vía el primitive.
- Trigger desde el endpoint admin (enqueue) — on-demand (HTTP al worker) y/o Cloud Scheduler para drenar pendientes.
- Recovery de runs huérfanos `running` (idempotente).

### Slice 3 — Endpoint enqueue+poll + signals + smoke

- `POST /runs` pasa a crear run `pending` + enqueue + responder 202 con runId; GET detail reporta progreso/estado.
- Reliability signals de ejecución async (lag / stuck-running) wired.
- Smoke contra el worker con un run `full` multi-provider (Gemini 3 incluido) que complete sin timeout.

## Out of Scope

- Report builder / artefacto `grader_report` (TASK-1235).
- Superficie pública / formulario / HubSpot handoff.
- Producción (release control plane).
- Recalibración de pesos del score.

## Detailed Spec

Decisión central de Discovery: **¿ops-worker existente o worker dedicado?** y **¿trigger on-demand (HTTP) vs Cloud Scheduler drain vs ambos?** Preferir reuse del ops-worker + el patrón TASK-773 (helper canónico → endpoint worker → Cloud Scheduler job → reliability signal). La persistencia incremental es el cambio de mayor valor: convierte el run en resumible/observable y elimina la pérdida de evidencia por timeout. Mantener `executeGraderRun` como el primitive; el worker es su host de ejecución, no una reimplementación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (persistencia incremental + claim) → Slice 2 (worker + trigger) → Slice 3 (enqueue/poll + signals + smoke). El claim (Slice 1) DEBE existir antes del worker (Slice 2) para evitar doble ejecución concurrente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble ejecución concurrente del mismo run | growth / ops | medium | claim/lock (FOR UPDATE SKIP LOCKED o claimed_at) antes del worker | `growth.ai_visibility.run_stuck_running` |
| Run huérfano en `running` tras crash/timeout | growth / reliability | medium | persistencia incremental + recovery idempotente + signal | `growth.ai_visibility.run_stuck_running` |
| Worker boundary `@core` rompe bundle | ops | low | `pnpm worker:runtime-deps-gate` + sin import @core | build/worker gate |
| Costo descontrolado en runs grandes async | cost | medium | cost ceiling por modo + caps de concurrencia | `growth.ai_visibility.cost_budget_used` |
| Vercel cron en path async (anti-patrón) | ops | low | usar Cloud Scheduler (TASK-773), nunca vercel.json para esto | revisión de vercel.json |

### Feature flags / cutover

- Reusa los flags del grader (`GROWTH_AI_VISIBILITY_*_ENABLED`, default OFF). Posible flag adicional `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` para cutover gradual inline→async (default OFF hasta smoke verde). Revert: flag a false + endpoint vuelve a inline para `light`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (persistencia incremental/claim son additive) | <10 min | si |
| Slice 2 | no desplegar el worker / revert deploy ops-worker | <15 min | si |
| Slice 3 | flag async OFF → endpoint inline para light | <5 min | si |

### Production verification sequence

1. Slice 1: tests locales de progreso incremental + claim contra PG real.
2. Slice 2: deploy worker a staging + ejecutar un run `full` async + verificar observations incrementales + estado final.
3. Slice 3: endpoint enqueue+poll en staging + smoke Gemini 3 full sin timeout + signals en steady.
4. Prod: fuera de scope (release control plane posterior).

### Out-of-band coordination required

- Deploy del ops-worker (GitHub Actions WIF) + posible Cloud Scheduler job nuevo. Confirmar que el worker tiene acceso a los secrets/Vertex de providers (mismo grant que Vercel runtime).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un run `full` multi-provider (OpenAI+Anthropic+Gemini 3) completa async sin timeout de función.
- [ ] Las observations se persisten incrementalmente (un fallo mid-run conserva las ya producidas).
- [ ] Existe claim/lock que impide doble ejecución concurrente del mismo run.
- [ ] Recovery idempotente de runs huérfanos en `running`.
- [ ] Endpoint admin enqueue+poll; el GET detail existente sigue funcionando.
- [ ] Signals de ejecución async (lag/stuck) implementados + en steady con DB vacía.
- [ ] Sin import `@core` worker-bundled; `pnpm worker:runtime-deps-gate` verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm worker:runtime-deps-gate`
- Smoke worker async con run `full` Gemini 3 (sin timeout) en staging
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` + `RELIABILITY_CONTROL_PLANE` Delta (signals nuevos)
- [ ] chequeo de impacto cruzado (TASK-1226/1233/1235)

## Follow-ups

- TASK-1235 report builder (consume runs completados).
- Superficie pública + HubSpot handoff (consumen ejecución async).
- Producción vía release control plane.

## Open Questions

1. ¿Reusar `services/ops-worker` o crear un worker dedicado para el grader?
2. ¿Trigger on-demand (HTTP al worker desde el endpoint) vs Cloud Scheduler drain de `pending` vs ambos?
3. ¿Claim por `FOR UPDATE SKIP LOCKED` (sin columna) o columna `claimed_at` explícita?
