# TASK-1163 - ICO member metrics freshness guard + RpA parity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `delivery|ico|payroll|data|reliability`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corregir la clase de bug donde `/my/performance` y payroll aceptan una fila stale de `ico_engine.metrics_by_member` aunque la capa base `delivery_task_monthly_snapshots` ya este fresca. El incidente visible es Daniela Ferreira: OTD cacheado `4.8%` desde 2026-06-01 vs calculo live `99.1%` para 2026-06.

La task agrega guardrails y tests para que el reader per-member descarte caches stale en periodo corriente, haga fallback live de forma honesta, y deje evidencia de paridad RpA V1/V2 sin cortar a V2.

## Why This Task Exists

Las metricas OTD y RpA son inputs de bonus. El reader actual usa estrategia `materialized_first_with_live_fallback`: si existe fila materializada, la acepta aunque sea vieja. En junio 2026, `delivery_task_monthly_snapshots` y `metric_snapshots_monthly` siguieron avanzando, pero `metrics_by_member` quedo congelada al 2026-06-01 para los miembros con fila. Eso produjo un valor operacionalmente falso para Daniela y podria contaminar payroll si se cierra el periodo con ese cache.

RpA V2 tambien requiere vigilancia: el motor V2 cuenta transiciones canonicas `Listo para revisión -> Cambios solicitados`, mientras V1 puede traer rondas positivas desde el dato legacy aunque esa transicion no exista. V2 no debe entrar a bonus hasta tener paridad y decision explicita.

## Goal

- Evitar que readers y payroll usen `metrics_by_member` stale para el periodo corriente.
- Agregar tests focales que reproduzcan cache stale vs compute live y fallen si vuelve el bug.
- Agregar una forma mecanica de detectar drift de frescura entre `metrics_by_member` y los snapshots base.
- Mantener RpA bonus en V1, pero dejar test/evidencia de divergencia V1/V2 para impedir cutover accidental.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md`
- `docs/architecture/metrics/OTD_V1.md`
- `docs/architecture/metrics/RPA_V1.md`
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Payroll no recomputa OTD/RpA con SQL paralelo; consume el reader ICO canonical o fallback live del mismo motor.
- La UI no debe llamar tablas BigQuery directo; debe consumir readers server-side.
- Para el periodo corriente, una fila materializada stale no puede tener prioridad sobre una fuente base mas fresca.
- RpA V2 permanece shadow/no-bonus hasta cumplir paridad documentada y sign-off HR/Finance.
- Los cambios deben ser compatibles y reversibles; no se debe mutar historico de bonus sin una etapa explicita de repair/backfill.

## Normative Docs

- `docs/context/00_INDEX.md`
- `docs/context/06_glosario-metricas.md`
- `docs/context/07_ico.md`
- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`

## Dependencies & Impact

### Depends on

- BigQuery `efeonce-group.ico_engine.metrics_by_member`
- BigQuery `efeonce-group.ico_engine.delivery_task_monthly_snapshots`
- BigQuery `efeonce-group.ico_engine.metric_snapshots_monthly`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/my-performance/dto.ts`
- `src/lib/notion-metrics/calculate-rpa-v2.ts`
- `src/lib/notion-metrics/count-correction-transitions.ts`

### Blocks / Impacts

- Payroll bonus correctness for OTD/RpA.
- `/my/performance` self-service KPI trust.
- Person/People performance consumers that read per-member ICO aggregates.
- Future RpA V2 cutover gates.

### Files owned

- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/materialized-freshness.ts` `[crear si aplica]`
- `src/lib/ico-engine/materialized-freshness.test.ts` `[crear si aplica]`
- `src/lib/payroll/fetch-kpis-for-period.ts`
- `src/lib/my-performance/dto.ts`
- `src/lib/notion-metrics/calculate-rpa-v2.test.ts`
- `src/lib/notion-metrics/count-correction-transitions.test.ts`
- `scripts/check-ico-member-metrics-freshness.ts` `[crear si aplica]`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `docs/CHANGELOG.md`

## Current Repo State

### Already exists

- `computeMetricsByContext('member', memberId, year, month)` calcula live desde el registry ICO y devolvio Daniela `otd_pct=99.1` para junio 2026.
- `readMemberMetrics` / `readMemberMetricsBatch` leen `metrics_by_member` y retornan `sourceMode='materialized'`.
- `fetchKpisForPeriod` hace materialized-first con fallback live solo para members ausentes.
- `resolveIcoSnapshot` en `src/lib/my-performance/dto.ts` tambien acepta cache si existe.
- RpA V2 productive compute existe, pero el ADR strangler mantiene bonus sobre V1.

### Gap

- No hay freshness guard que compare `metrics_by_member.materialized_at` contra los snapshots base o contra un umbral de periodo corriente.
- Un cache viejo pero existente bloquea el fallback live.
- No hay test que simule el incidente Daniela: cached OTD bajo/stale vs live OTD alto/current.
- No hay gate focal que haga visible la divergencia RpA V1>0/V2=0 antes de un cutover.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: ICO Engine readers over BigQuery `metrics_by_member`, `delivery_task_monthly_snapshots`, `metric_snapshots_monthly`.
- Consumidores afectados: `/my/performance`, payroll bonus fetch, People/Person ICO consumers.
- Runtime target: `local|staging|production|cron` (reader fix repo-side, runtime verification via BigQuery read-only).

### Contract surface

- Contrato existente a respetar: `readMemberMetrics`, `readMemberMetricsBatch`, `computeMetricsByContext`, `fetchKpisForPeriod`.
- Contrato nuevo o modificado: freshness decision helper for materialized member metrics; optional health script/signal for drift detection.
- Backward compatibility: `compatible`; stale current-period rows degrade to live compute rather than changing response shape.
- Full API parity: UI/payroll continue consuming server-side ICO readers; no direct table reads in UI.

### Data model and invariants

- Entidades/tablas/views afectadas: BigQuery read-only `ico_engine.metrics_by_member`, `ico_engine.delivery_task_monthly_snapshots`, `ico_engine.metric_snapshots_monthly`.
- Invariantes que no se pueden romper:
  - Closed/locked historical periods should prefer materialized snapshots unless explicitly stale by source evidence.
  - Current period must not trust a member aggregate older than fresher source snapshots.
  - Fallback live must use the canonical ICO registry, not payroll-specific SQL.
  - `rpa_avg_v2` / bonus cutover remains out of scope.
- Tenant/space boundary: member IDs are scoped by existing callers; no widening of cross-member access.
- Idempotency/concurrency: read-only; no writes in the reader path.
- Audit/outbox/history: no outbox for read fallback. Log/degraded metadata must be sufficient to diagnose stale materialized rows.

### Migration, backfill and rollout

- Migration posture: `none` for code guard; optional data repair/rematerialization is runtime operation, not schema migration.
- Default state: enabled by code; safer than current path because stale cache falls back to canonical live compute.
- Backfill plan: after tests pass, run or schedule member metric rematerialization for 2026-06 and verify Daniela cache matches live. If runtime credentials block this, leave `code complete, rollout pendiente`.
- Rollback path: revert PR; stale behavior returns but no data mutation is introduced by code.
- External coordination: payroll/HR should not close June bonus until freshness check passes.

### Security and access

- Auth/access gate: unchanged existing caller guards.
- Sensitive data posture: payroll-sensitive KPI data; no raw errors or broad member dumps in logs.
- Error contract: preserve existing reader error behavior; fallback failures should surface degraded/source metadata rather than raw provider messages.
- Abuse/rate-limit posture: live fallback is bounded to stale/missing current-period cases; batch path should avoid N+1 explosion where possible.

### Runtime evidence

- Local checks: focal unit tests for freshness decision, `readMemberMetrics`/payroll fallback, RpA V1/V2 parity guard.
- DB/runtime checks: BigQuery read-only freshness query for Daniela and June 2026.
- Integration checks: repo reader invocation comparing materialized vs live for Daniela after fix.
- Reliability signals/logs: optional script or signal that alerts when `metrics_by_member.max(materialized_at)` lags base snapshots.
- Production verification sequence: read-only smoke in staging/prod, then rematerialize/sync if approved, then confirm Daniela OTD/RpA values.

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

### Slice 1 - Freshness decision foundation

- Add a small, tested helper that decides whether a materialized member metric row is fresh enough for the requested period.
- Treat current-period rows as stale when their `materialized_at` is older than the fresher source snapshot or an explicit staleness threshold.
- Preserve historical/locked-period behavior unless source evidence shows the row is stale.

### Slice 2 - Reader and payroll fallback

- Wire the helper into `readMemberMetrics` / `readMemberMetricsBatch` or their immediate consumers so stale rows trigger canonical live compute.
- Ensure `fetchKpisForPeriod` does not feed stale OTD/RpA into bonus calculations.
- Ensure `/my/performance` shows fresh live current-period values when materialized data is stale.

### Slice 3 - Detection tests and health check

- Add regression tests for Daniela-like data: stale cache `4.8%` vs live `99.1%` must choose live.
- Add batch/payroll test coverage so a stale existing row does not block fallback.
- Add a lightweight script/test/helper that can detect `metrics_by_member` lagging source snapshots.

### Slice 4 - RpA V1/V2 parity guard

- Add or strengthen tests that document V2 counting only canonical correction transitions.
- Add a guard/test that prevents accidental bonus cutover to V2 without an explicit flag/parity condition.
- Document the observed divergence class V1>0/V2=0 as follow-up evidence, not as a silent fallback.

## Out of Scope

- Migrating bonus to RpA V2.
- Rewriting the ICO materializer architecture.
- Mutating historical payroll entries.
- Changing task status semantics or Notion operational workflows.
- UI redesign or copy changes.

## Detailed Spec

- Freshness should be a pure decision where possible: given requested `year/month`, materialized timestamp, source freshness timestamp and current date, return `fresh|stale|unknown` with reason.
- Current-period safety: when source freshness is known and newer than materialized member row by more than a small tolerance, stale wins and fallback live is required.
- Unknown freshness should not break historical reads; current period may degrade conservatively to live if the cache is old enough to be unsafe.
- Batch fallback must be bounded and observable. It can compute live only for stale/missing members.
- RpA V2 parity tests must assert the canonical transition pair rather than reading `notion_ops.tareas.gh_rpa_v2` as input.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Slice 2 must not ship without Slice 3 tests because this path affects payroll bonus.
- Runtime rematerialization is separate from code merge and must happen after tests/reader smoke.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Live fallback increases BigQuery cost/latency for current period | payroll / my-performance | medium | fallback only for stale/missing rows; batch bounded to affected members | elevated BigQuery latency / request duration |
| Historical closed period changes unexpectedly | payroll | low | freshness guard scoped to current/open period unless source evidence proves stale | payroll diff in closed period smoke |
| RpA V2 accidentally treated as bonus source | payroll | low | explicit tests and no cutover code in this task | test failure / config grep |
| Materializer remains broken after code guard | cron / data | medium | add health check and leave runtime rematerialization step in handoff | freshness drift query |

### Feature flags / cutover

Sin flag inicial: the code path is safer because it only rejects stale current-period cache and falls back to existing canonical live compute. If testing shows cost risk, add a server-only env escape hatch before rollout.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert helper/test changes | <10 min | si |
| Slice 2 | revert reader/payroll wiring | <10 min | si |
| Slice 3 | revert script/tests only | <10 min | si |
| Slice 4 | revert parity guard/test additions | <10 min | si |

### Production verification sequence

1. Run focal tests and typecheck locally.
2. Run read-only BigQuery freshness check for June 2026.
3. Smoke `readMemberMetrics` and `computeMetricsByContext` for `daniela-ferreira` in local runtime credentials.
4. Confirm reader returns live/fresh OTD near `99.1` while stale materialized row is rejected.
5. Run/coordinate member rematerialization for June 2026 only after code guard is in place.
6. Verify Daniela cache and live values match after rematerialization; if not, leave rollout pending.

### Out-of-band coordination required

Payroll/HR should not close June 2026 variable bonus until this guard and freshness verification are green.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] A stale `metrics_by_member` row for the current period no longer blocks live fallback.
- [x] Daniela-like regression test fails on old behavior and passes with the new guard.
- [x] Payroll KPI fetch uses fresh/live OTD and RpA when the materialized row is stale.
- [x] `/my/performance` source selection cannot show stale current-period OTD if live compute is fresher.
- [x] A mechanical health check exists for `metrics_by_member` lag vs source snapshots.
- [x] RpA V2 remains shadow/no-bonus and has a parity/divergence guard in tests or docs.
- [x] Runtime evidence for Daniela June 2026 is recorded in Handoff.

## Verification

- `pnpm task:lint --task TASK-1163` ✅
- `pnpm ops:lint --changed` ✅
- `pnpm test -- --run src/lib/ico-engine/materialized-freshness.test.ts src/lib/ico-engine/read-metrics.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/notion-metrics/calculate-rpa-v2.test.ts` ✅ (`7170 passed`, suite completa por invocation)
- `pnpm exec eslint src/lib/ico-engine/materialized-freshness.ts src/lib/ico-engine/materialized-freshness.test.ts src/lib/ico-engine/read-metrics.ts src/lib/ico-engine/read-metrics.test.ts src/lib/payroll/fetch-kpis-for-period.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/notion-metrics/calculate-rpa-v2.test.ts scripts/check-ico-member-metrics-freshness.ts` ✅
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit` ✅
- BigQuery read-only smoke for `daniela-ferreira`, June 2026 ✅

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] se invoco `greenhouse-payroll-auditor` antes del cierre final
- [x] se invoco `greenhouse-qa-release-auditor` para clasificar riesgo de release
- [x] se invoco `greenhouse-documentation-governor` antes de cierre documental

## Follow-ups

- Refresh/fix del materializador `metrics_by_member` si el cron sigue dejando la tabla atrasada despues del guard.
- Task separada para estrategia de paridad y eventual cutover RpA V2 cuando V1/V2 cumplan el umbral del ADR.

## Delta 2026-06-17

- Creada directamente como `in-progress` por instruccion del operador: "haz una task para esto y pasa de inmediato a ejecutarla".
- Implementada y cerrada en la misma sesion: freshness guard current-period, payroll sourceMode fix, health script, tests focales, BQ materialization repair para junio 2026 y smoke Daniela.

## Open Questions

- Resuelta: se aplico reparacion acotada de BigQuery para `metrics_by_member` junio 2026 usando el materializador canónico member-only con MERGE full-period. Post-smoke: `metrics_by_member` status `ok`, 7 filas, Daniela OTD `99.1`.
