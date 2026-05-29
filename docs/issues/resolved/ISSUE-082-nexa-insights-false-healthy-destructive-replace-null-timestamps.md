# ISSUE-082 — Nexa Insights pipeline en falso-sano: timestamp NULL en BQ DML + DELETE+INSERT destructivo + runs succeeded con 0 señales

> **Tipo:** Incidente operativo (runtime)
> **Ambiente:** production (Efeonce) + staging
> **Detectado:** 2026-05-27 (diagnóstico Codex + verificación profunda Claude con skills ICO + arquitectura)
> **Severidad:** Alta — falso positivo operacional (no es crash visible; los runs quedan verdes)
> **Estado:** resolved
> **Task de remediación:** `TASK-941`
> **Resuelto:** 2026-05-28

## Síntoma

Los Nexa Insights (ICO AI signals → LLM enrichment → predictions) **no generan insights frescos** desde ~2026-05-19, pero los jobs quedan `succeeded`:

- Home: `nexaInsights.totalAnalyzed=0`, `lastAnalysis=null`, `insights=[]`.
- Agency ICO: `aiLlm.totals.total=0`, `recentEnrichments=[]`.
- Finance Nexa Insights: `totalAnalyzed=0`, `lastAnalysis=null`.
- Person 360 muestra Nexa Insights con fallback histórico (último análisis 18-may-2026).
- UI y endpoints responden; no hay error visible.

## Resolución 2026-05-28

Resuelto por `TASK-941` con ruta estricta:

- Serialización BQ DML corregida con patrón canónico STRING + `TIMESTAMP(s.col)` y helper `toBigQueryStructTimestamp()` para writers `ARRAY<STRUCT>`.
- Invariante anti-falso-sano: raw elegible > 0 y 0 mapeadas ya no puede terminar como `succeeded`.
- Guard no-destructivo del serving: si las señales son inválidas/unmappable, no se borra el último estado bueno.
- Signal `nexa.insights.stale_with_eligible_signals` agregado al Reliability Control Plane.
- Finance AI scopeado al último período con economics; mayo abierto queda como skip honesto, no como éxito engañoso.
- Lint rule `greenhouse/no-bq-struct-string-timestamp` activa en modo error para prevenir recurrencia.

Verificación live:

| Check | Resultado |
|---|---|
| `ico_engine.ai_signals.generated_at` | 0 NULL en períodos activos (`2026-05`: 20 señales, max `2026-05-28 07:16:17`) |
| `ico_engine.ai_prediction_log.predicted_at` | 40 filas históricas remediadas desde `ai_signals.generated_at`; 0 NULL final |
| `ico_engine.ai_enrichment_runs` | Mayo `succeeded`, `signals_seen=20`, `signals_enriched=20`, `signals_failed=0` |
| Serving/API | Home totalAnalyzed=20; Agency `aiLlm.total=20`; Person 360 source activo |
| Reliability | `nexa.insights.stale_with_eligible_signals=ok` |
| Gates | focal 54 tests OK; `pnpm build` OK; `pnpm pg:doctor` OK; `pnpm test` 5427 OK |

## Evidencia verificada (no solo reportada)

**BigQuery `ico_engine.ai_signals` — `generated_at` por período al detectar:**

| Período | Señales | `generated_at` NULL | OK |
|---|---|---|---|
| Feb 2026 (streaming insert legacy) | 6 | 0 | 6 ✅ |
| Mar 2026 (DML UNNEST nuevo) | 7 | 7 | 0 ❌ |
| Abr 2026 | 1 | 1 | 0 ❌ |
| May 2026 | 13 | 13 | 0 ❌ |

**BigQuery `ico_engine.ai_enrichment_runs`** — runs del **2026-05-19** (Mar/Abr/May): `signals_seen=0, signals_enriched=0, signals_failed=0, status=succeeded`. Falso-sano confirmado.

**BigQuery `ico_engine.ai_prediction_log`** May: 40/123 `predicted_at` NULL (mismo bug). Remediado 2026-05-28 con DML acotado a `predicted_at IS NULL` usando `ai_signals.generated_at` como fuente canónica; filas afectadas: 40; NULL final: 0.

**Postgres serving:**
- `greenhouse_serving.ico_ai_signal_enrichments`: solo Feb 2026 (6 filas), `last_processed=2026-04-30`. Es lo que leen Home/Agency/Person 360.
- `greenhouse_serving.finance_ai_signals = 0`, `finance_ai_signal_enrichments = 0`.
- `greenhouse_finance.client_economics`: cobertura hasta **Abril 2026** (no hay Mayo).

## Causa raíz

**Tres causas, no una.** La primera es el trigger; la segunda es el amplificador estructural; la tercera es por qué nadie se enteró.

### Causa 1 — Serialización de timestamp en BQ DML struct (trigger)

`materialize-ai-signals.ts` cambió (TASK-900 follow-up) de streaming insert (`.insert()`) a DML `INSERT … SELECT FROM UNNEST(@rows)` con `types: { rows: [STRUCT] }`. Pero los timestamps se siguen pasando como **ISO string** (`new Date().toISOString()`, línea 471 → `generated_at: signal.generatedAt`, línea 60) dentro de un campo `ARRAY<STRUCT<generated_at TIMESTAMP>>`. El cliente Node de BigQuery **no coacciona** el string ISO al tipo TIMESTAMP dentro de un struct → escribe **NULL**. (Un `Date` o `BigQuery.timestamp()` sí funcionan; un scalar TIMESTAMP param también — el bug es específico de string-en-struct.)

Afecta: `ai_signals.generated_at`, `ai_prediction_log.predicted_at` / `actual_recorded_at`, y los `processed_at/started_at/completed_at/_synced_at` del writer BQ de enrichments/runs.

### Causa 2 — DELETE+INSERT destructivo de período completo (amplificador estructural)

`replaceBigQuerySignalsForPeriod` hace `DELETE` de todo el período y luego `INSERT`. `persistServingState` hace `DELETE` del período en PG y reinserta (sin transacción). Cuando el escritor produce basura (timestamps NULL) o vacío, **el DELETE ya borró lo bueno** y el INSERT mete basura/nada. Es la misma clase de bug que TASK-900 cerró para los materializadores de métricas — pero ese hardening **no se aplicó a este path de AI signals**. La re-materialización diaria reescribió Mar-May con NULL y borró la data buena previa.

### Causa 3 — Runs `succeeded` con 0 señales (falso-sano)

`llm-enrichment-worker.ts`:
- `mapSignalRow()` descarta toda señal con `generated_at` NULL (`if (… || !generatedAt) return null`).
- El run status (`failed>0 && succeeded===0 ? 'failed' : failed>0 ? 'partial' : 'succeeded'`) trata **0 records, 0 fallos** como `succeeded`. No hay invariante que detecte "había raw rows en BQ pero 0 mapeables → contrato inválido".

Mismo patrón de status en el worker de Finance.

### Finance — root cause SEPARADO

Finance no usa BQ (escribe a `greenhouse_serving.finance_ai_signals` en PG, lee `greenhouse_finance.client_economics` en PG) → **no** tiene el bug de timestamp.

**Verificado 2026-05-27 (corrige el framing inicial "client_economics atrasada"):** el vacío de Finance Mayo es **benigno**. `client_economics` es una projection reactiva que materializa cuando cierra el payroll del mes; funciona por diseño. Estado real: último `client_economics` = **Abril** (computado 2026-05-08, post-export de payroll Abril); **NO existe payroll period de Mayo** (último cierre = Abril `exported` 2026-05-01); 0 `cost_allocations` Mayo. Mayo está **abierto** → legítimamente sin economics. **`client_economics` NO está roto y no hay nada que backfillear.**

El defecto real de Finance es **scoping + falso-sano**: el cron Finance AI corre sobre el **mes corriente** (`getRollingPeriods` desde `now`) → consulta un período abierto sin materializar → 0 signals → `succeeded` engañoso. Fix: scopear al último período cerrado (Abril) + degradación honesta que distinga "período abierto sin data" (skip benigno) de "data elegible no procesada" (degraded). NO requiere ISSUE separado — `client_economics` opera correctamente.

## Blast radius (verificado)

- **Vulnerable al bug de timestamp BQ struct:** `materialize-ai-signals.ts` (`ai_signals` + `ai_prediction_log`) y el writer BQ de enrichments/runs en `llm-enrichment-worker.ts`.
- **NO afectados:** `reliability/synthetic/persist.ts` (PG `::timestamptz[]`, no struct BQ), `tenant/access.ts`, `team-admin/mutate-team.ts`, `hr-core/service.ts` (UNNEST solo sobre arrays STRING + `CURRENT_TIMESTAMP()` SQL).
- **Falso-sano (clase):** ICO worker + Finance worker.

## Impacto

- Stakeholders/clientes ven Nexa Insights vacíos o congelados (último 18-may) sin señal de alarma.
- Predicciones con `predicted_at` NULL → cualquier consumidor temporal de predicciones queda inconsistente.
- Riesgo de confianza: "salud operativa falsa" — el sistema reporta verde mientras no produce nada.

## Solución aplicada

Ver `TASK-941`. Resumen: (1) fix de serialización (transportar timestamp como STRING + `TIMESTAMP(col)` en el SELECT) + helper canónico + test/lint de regresión; (2) invariante anti-falso-sano (raw>0 && mapeadas==0 → degraded/failed, ICO + Finance); (3) guard no-destructivo para no borrar serving bueno ante señales inválidas; (4) reliability signal de freshness (`nexa.insights.stale_with_eligible_signals`); (5) self-heal live Mar/Abr/May y remediación acotada de `ai_prediction_log.predicted_at`; (6) Finance: scope al último período cerrado/materializado y skip honesto de períodos abiertos.

Follow-ups fuera de este issue:

- `TASK-942` cerró el freshness gate defensivo del write-path.
- `TASK-943` lleva el modelo estructural append-only/event-log para preservar evolución intra-período.
- `TASK-944`/`TASK-945`/`TASK-946` cubren mejoras visuales de timeline/lifecycle/degradación honesta.

## Verificación al resolver

- [x] `ico_engine.ai_signals.generated_at IS NOT NULL` para todo período post-fix.
- [x] `ico_engine.ai_prediction_log.predicted_at IS NOT NULL` tras remediación acotada.
- [x] Run con raw signals presentes y 0 mapeables → status NO `succeeded`.
- [x] Serving `ico_ai_signal_enrichments` fresco para el período corriente.
- [x] Finance distingue período abierto sin data elegible de falla real; no requiere `client_economics` Mayo porque mayo sigue abierto.
- [x] Signal `nexa.insights.stale_with_eligible_signals` en steady=0.
- [x] Test/lint de regresión para timestamp struct.
