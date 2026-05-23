# TASK-918 — Cycle Time canonical formula: shadow mode + flip + CT SLO% activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-ICO-METRICS-PROGRESSIVE-MIGRATION`
- Status real: `Diseno`
- Domain: `delivery|ico|reliability`
- Blocked by: `TASK-912 (captura productiva LIVE — shippeada + activada 2026-05-21) + acumulación de transiciones: la fórmula canónica necesita tareas que hayan recorrido su ciclo (En curso → … → completado) ENTERAMENTE dentro de la ventana de captura. Forward-accumulation arrancó 2026-05-21 → shadow real recién tiene sentido tras ~3-4 semanas de captura (≥1 ciclo de delivery completo con historial capturado).`
- Branch: `task/TASK-918-cycle-time-canonical-shadow-flip`
- GitHub Issue: `none`

## Summary

La fórmula canónica de `cycle_time_days` y la métrica `cycle_time_slo_pct` ya fueron **construidas y verificadas contra BigQuery real** en TASK-912 (Slices 4-5), pero quedaron detrás de flags default OFF (`CT_DAYS_CANONICAL_FORMULA_ENABLED` / `CT_SLO_PCT_METRIC_ENABLED`). Esta task cierra el ciclo: construye los 2 reliability signals que se difirieron (paridad shadow + coverage), corre el **shadow mode ≥7 días** comparando la fórmula canónica vs la legacy con datos reales acumulados, valida con arch-architect 4-pillar, y recién entonces **flipea** los flags para que `v_tasks_enriched.cycle_time_days` use la fórmula canónica y la métrica CT SLO% se compute en producción.

## Why This Task Exists

`cycle_time_days` alimenta dashboards (Pulse, ICO scorecards). Hoy usa la fórmula **legacy** (`completado − creado`), que mezcla tiempo de backlog con tiempo de trabajo real. TASK-912 construyó la fórmula **canónica V1** (inicio = primera transición a `En curso`, descuento de `Bloqueado`/`En pausa`) que mide el ciclo de trabajo real — pero flipearla de golpe podría romper la métrica si hay un caso borde no visto. El contrato canónico (`GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md`) exige shadow mode + arch-architect 4-pillar antes de cualquier flip que toque una métrica viva. Esta task ejecuta ese gate de forma controlada.

## Goal

- 2 reliability signals nuevos: `cycle_time.canonical_paridad` (shadow compare legacy vs canónica) + `ct_slo_pct.coverage` (sample size health).
- Shadow run ≥7 días con datos reales acumulados: la fórmula canónica difiere de la legacy SOLO donde se espera (tareas con tiempo bloqueado o backlog largo); cualquier divergencia anómala = bug a investigar pre-flip.
- arch-architect 4-pillar sobre el flip.
- Flip `CT_DAYS_CANONICAL_FORMULA_ENABLED=true` (display) — la vista pasa a la fórmula canónica.
- Flip `CT_SLO_PCT_METRIC_ENABLED=true` — métrica CT SLO% live + persistida en `metrics_by_*`.
- Legacy formula preservada (rollback <5min vía flag OFF + redeploy).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — 8 stop-gates + shadow mode canónico.
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion captura, Greenhouse computa.
- `docs/architecture/metrics/CYCLE_TIME_V1.md` + `CT_SLO_PCT_V1.md` — definiciones canónicas.
- `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 (cycle time + CT SLO%).

Reglas obligatorias (ya en CLAUDE.md):

- **NUNCA** flipear `CT_DAYS_CANONICAL_FORMULA_ENABLED` sin shadow mode 7d verde + arch-architect 4-pillar.
- **NUNCA** modificar la rama OFF de `buildCycleTimeDaysExpression` (debe quedar byte-idéntica al legacy — es el contrato de no-romper).
- **NUNCA** invocar `Sentry.captureException` directo; usar `captureWithDomain(err, 'delivery'|'integrations.notion', …)`.
- Validar SQL de signals contra BQ/PG real ANTES de mergear (regla "SQL Signal Reader Schema Validation Gate").

## Skill: greenhouse-ico, gcp-bigquery (queries shadow compare), greenhouse-backend (signals + wire-up)

## Subagent: arch-architect (4-pillar OBLIGATORIO antes del flip de Slice 3)

## Mode: implementation

## Dependencies & Impact

**Depende de**:

- **TASK-912** — captura productiva LIVE (shippeada + activada 2026-05-21). `task_status_transitions` (PG) + `greenhouse_conformed.task_status_transitions` (BQ) acumulando. La fórmula canónica + métrica ya existen flag-OFF.
- **Acumulación de datos** — la fórmula canónica lee transiciones; necesita ≥1 ciclo de delivery completo capturado (~3-4 semanas desde 2026-05-21) para que el shadow compare sea significativo. Antes de eso, la canónica degrada a legacy (sin transiciones → fallback a `created_at`) y el shadow no muestra diferencias reales.

**Impacta a**:

- Dashboards que muestran `cycle_time_days` (Pulse, ICO scorecards) — al flip, los valores bajan (más precisos: descuentan backlog + bloqueos).
- `metrics_by_*` — emerge `cycle_time_slo_pct` materializado al flip de CT SLO%.

**Archivos owned por esta task**:

- `src/lib/reliability/queries/cycle-time-canonical-paridad.ts` (CREAR — shadow compare signal)
- `src/lib/reliability/queries/ct-slo-pct-coverage.ts` (CREAR — coverage signal)
- `src/lib/reliability/get-reliability-overview.ts` (MODIFICAR — wire 2 signals)
- Flags flip operativo (no-code): `CT_DAYS_CANONICAL_FORMULA_ENABLED` + `CT_SLO_PCT_METRIC_ENABLED` en Vercel/ops-worker + redeploy.

**NO owned (ya existen, TASK-912)**: `src/lib/ico-engine/cycle-time-formula.ts`, `cycle-time-flags.ts`, `schema.ts` (cycle_time_days gateado), `metric-registry.ts` (`cycle_time_slo_pct` gateado).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE
     ═══════════════════════════════════════════════════════════ -->

## Scope (slices)

1. **Signal `cycle_time.canonical_paridad`** (shadow compare): query BQ que computa AMBAS fórmulas (legacy + canónica de-correlada) sobre `v_tasks_enriched` / `delivery_tasks` + transitions, y compara. kind=`drift`, severity=warning si > X% de tareas divergen *fuera* de lo esperado (la divergencia legítima viene de tareas con `Bloqueado`/`En pausa` o backlog largo — esas NO cuentan como anomalía). steady esperado: drift solo donde aplica el descuento. Reader + wire en `get-reliability-overview`.
2. **Signal `ct_slo_pct.coverage`**: kind=`data_quality`, % de tareas completadas con `cycle_time_days IS NOT NULL` sobre total completadas (sample size health). warning si cobertura < umbral. Reader + wire.
3. **Shadow run ≥7d + arch-architect 4-pillar**: con datos acumulados, observar `cycle_time.canonical_paridad` 7 días. Confirmar que la divergencia es explicable (bloqueos/backlog). arch-architect valida el flip (Safety/Robustness/Resilience/Scalability). NO-CODE salvo ajustes de threshold del signal.
4. **Flip display**: `CT_DAYS_CANONICAL_FORMULA_ENABLED=true` (Vercel + ops-worker) + redeploy → `v_tasks_enriched.cycle_time_days` usa la canónica. Verificar dashboards. Rollback = flag OFF + redeploy.
5. **Flip métrica**: `CT_SLO_PCT_METRIC_ENABLED=true` → `cycle_time_slo_pct` entra al `ICO_METRIC_REGISTRY` + se materializa en `metrics_by_*`. Verificar.

## Out of Scope

- **RpA cutover / bono** — TASK-915/916/917.
- **La captura** (webhook → PG → BQ) — TASK-912 (done).
- **Fórmula / métrica en sí** — ya construidas + verificadas en TASK-912; esta task NO las reescribe, solo valida + flipea.
- **Calibración CT SLO threshold per tipo de pieza** — V2 (forward-compat ya dejado en `getSLOThreshold`).

## Detailed Spec

Ver TASK-912 spec (Delta 2026-05-21) para el detalle de la fórmula canónica de-correlada (LEFT JOIN pre-agregado, descubrimiento de que BQ rechaza subqueries correlacionadas) y el flag pattern. Esta task agrega únicamente los 2 signals + ejecuta el gate de shadow/flip.

Shadow compare canónico (Slice 1): el signal debe correr AMBAS fórmulas en BQ y clasificar la divergencia:

- Divergencia esperada (NO anomalía): tareas con intervalos `Bloqueado`/`En pausa` (descuento) o con backlog largo antes del primer `En curso` (la canónica es menor que la legacy).
- Divergencia anómala (alerta): canónica > legacy (imposible salvo bug), o NULL inesperado, o diferencia sin transiciones que la expliquen.

## Rollout Plan & Risk Matrix

- **Slice ordering hard rule**: signals (1-2) antes del shadow (3); shadow verde 7d + arch-architect ANTES de cualquier flip (4-5); display (4) antes que métrica (5).
- **Risk matrix**:

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Flip rompe `cycle_time_days` en dashboards | delivery/ui | Media | Shadow 7d + arch-architect + flag OFF default + rama OFF byte-idéntica | `cycle_time.canonical_paridad` |
| Fórmula canónica con datos incompletos da valores raros | delivery | Media | Gate de acumulación (≥3-4 semanas captura) antes del shadow | `cycle_time.canonical_paridad` |
| CT SLO% materializa con sample chico | data | Baja | `ct_slo_pct.coverage` signal + healthyMinSampleSize en metric-registry | `ct_slo_pct.coverage` |
| Signal SQL con bug de tipos BQ | reliability | Media | Validar contra BQ real pre-merge (dry-run) | — |

- **Feature flags / cutover**: `CT_DAYS_CANONICAL_FORMULA_ENABLED` (display) + `CT_SLO_PCT_METRIC_ENABLED` (métrica). Ambos default OFF. Flip = env + redeploy (Vercel para la vista vía `ensureIcoEngineInfrastructure`; ops-worker si materializa allí).
- **Rollback plan**: flag OFF + redeploy (<5min). La vista vuelve a la fórmula legacy (preservada byte-idéntica). `metrics_by_*` deja de materializar CT SLO%.
- **Production verification**: post-flip display, confirmar que dashboards muestran cycle_time canónico + que `cycle_time.canonical_paridad` queda en su steady esperado. Post-flip métrica, confirmar `cycle_time_slo_pct` en `metrics_by_*`.
- **Out-of-band coordination**: ninguno externo (no afecta nómina/bono). Solo arch-architect 4-pillar interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `cycle_time.canonical_paridad` + `ct_slo_pct.coverage` creados, wired, validados contra BQ/PG real, steady esperado.
- [ ] Shadow run ≥7d documentado: divergencia legacy vs canónica explicable (bloqueos/backlog), sin anomalías.
- [ ] arch-architect 4-pillar aprobado para el flip.
- [ ] `CT_DAYS_CANONICAL_FORMULA_ENABLED=true` flipeado; dashboards muestran cycle_time canónico; rollback verificado <5min.
- [ ] `CT_SLO_PCT_METRIC_ENABLED=true` flipeado; `cycle_time_slo_pct` materializado en `metrics_by_*`.

## Verification

`pnpm test` (signals focal) + `pnpm build` + dry-run BQ de las queries shadow. Shadow compare report (7d). Smoke dashboards post-flip.

## Follow-ups

- Calibración CT SLO threshold per tipo de pieza (V2, cuando emerja data observada).
- Replicar el patrón shadow/flip para las otras métricas ICO (OTD, FTR, etc.) — cada una su task.
