# Invariantes operativos para agentes — ICO / Delivery Metrics (TASK-900…923)

---

## Invariantes operativos para agentes — ICO / Delivery Metrics (TASK-900…923)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) del dominio ICO / delivery-metrics que un agente carga al tocarlo. El contrato técnico de cada sub-área vive en su spec canónica (citada al pie de cada bloque). Dedup / re-homing por sub-spec = TASK-1160 Slice 4. Invocar la skill `greenhouse-ico` para el craft.

### ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)

Patrón canonical para los 5 materializers ICO (`metrics_by_{member,project,sprint,organization,business_unit}`) y futuros downstream (Frame.io, HubSpot snapshots, Nubox financial materialization). Reemplaza el patrón legacy DELETE+INSERT por **MERGE incremental + freshness gate + tracking persistente + delta filter** — defense in depth contra el bug class TASK-877 follow-up donde upstream degraded destruyó 2 noches de data buena vía DELETE+INSERT sin warning.

**Pipeline canonical**:

```text
Cloud Scheduler ico-materialize-daily (3:15 AM Santiago, monthsBack=3)
  → POST /ico/materialize en ico-batch-worker Cloud Run
  → materializeMonthlySnapshots()
  → para cada materializer (member/project/sprint/organization/business_unit):
     runIcoMaterializerCycle({tableName, periodYear, periodMonth, runLegacy, runMerge, ...}):
       Capa 1: runUpstreamFreshnessGate()
         ├─ safe=false → skipIcoMaterializationRun + captureWithDomain('delivery', warning) + return 0
         └─ safe=true → procede
       Capa 2: beginIcoMaterializationRun (status='running') si useMerge
       Capa 2b: getLastSuccessfulMaterializationAt (delta cutoff lookup) si useMerge && useIncrementalDelta
       Capa 3: ejecutar runMerge(deltaCutoffIso) o runLegacyDeleteInsert
         ├─ throw → failIcoMaterializationRun + captureWithDomain('delivery', error) + re-throw
         └─ rowCount → continúa
       Capa 4: completeIcoMaterializationRun (status='succeeded' + rows_merged + notes)
```

**3 flags graduados default OFF** (cutover progresivo post staging shadow >= 7d):

- `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` — invoca `runUpstreamFreshnessGate` antes de ejecutar
- `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED` — usa MERGE BQ atomic vs legacy DELETE+INSERT
- `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED` — filter `entity_last_edited >= deltaCutoff` (REQUIRES MERGE)

Defaults OFF garantiza zero behavioral change post-merge — el cron sigue con DELETE+INSERT bit-for-bit hasta que operador active explícitamente los flags.

**Helpers canonical**:

- `runUpstreamFreshnessGate({requireSignals?, blockingSeverity?}) → Promise<{safe, reason, blockingSignals}>` — `src/lib/ico-engine/materialize-guards.ts`. Default consume `identity.notion_bridge.coverage_drift`; `requireSignals` array es injectable. Degradación honest: signal que rechaza promise se filtra a null y NO bloquea.
- `runIcoMaterializerCycle(input)` — `src/lib/ico-engine/materialize-orchestrator.ts`. Orchestrator canonical de las 4 capas. Recibe callbacks `runLegacyDeleteInsert` + `runMerge(deltaCutoffIso)` per-entity + flag readers como inputs (test-friendly).
- `buildLegacyDeleteInsertSql` / `buildMergeSql` / `buildPostCountSql` — `src/lib/ico-engine/materialize-sql-builders.ts`. Builders desde `MaterializerSqlConfig` declarativa. Generan SQL canonical sin copy-paste cross-entity.
- `beginIcoMaterializationRun` / `completeIcoMaterializationRun` / `skipIcoMaterializationRun` / `failIcoMaterializationRun` / `getLastSuccessfulMaterializationAt` / `countRecentSkippedSafetyRuns` — `src/lib/ico-engine/materialize-tracking.ts`. CRUD canonical sobre `greenhouse_sync.ico_materialization_runs` (append-only, anti-UPDATE/DELETE triggers).

**MERGE pattern canonical** (per `buildMergeSql`):

```sql
MERGE INTO `<project>.ico_engine.<table>` AS t
USING (
  SELECT <key_cols>, period_year, period_month, <metric_cols>, materialized_at
  FROM (
    SELECT
      <key_select_sql>,
      @periodYear AS period_year,
      @periodMonth AS period_month,
      ${buildMetricSelectSQL()},
      MAX(te.last_edited_time) AS entity_last_edited,
      CURRENT_TIMESTAMP() AS materialized_at
    FROM ${buildDeliveryPeriodSourceSql(projectId)} te
    WHERE <where_clause_sql>
    GROUP BY <group_by_sql>
  )
  WHERE entity_last_edited >= TIMESTAMP(@deltaCutoff)  -- opcional, si delta enabled
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY <partition_by_sql>
    ORDER BY materialized_at DESC
  ) = 1
) AS s
ON t.<key> = s.<key> AND t.period_year = s.period_year AND t.period_month = s.period_month
WHEN MATCHED THEN UPDATE SET <metric_cols> = s.<metric_cols>, materialized_at = s.materialized_at
WHEN NOT MATCHED THEN INSERT (...) VALUES (...)
-- CRÍTICO: NO `WHEN NOT MATCHED BY SOURCE THEN DELETE` — preserva historicos cuando upstream parcial
```

**Tracking table canonical** `greenhouse_sync.ico_materialization_runs` (migration `20260518141020881`):

- `(table_name, period_year, period_month, started_at, completed_at, status, rows_merged, blocking_signals JSONB, notes)`
- CHECK status IN ('running','succeeded','skipped_safety','failed')
- CHECK skipped_safety REQUIERE blocking_signals NOT NULL
- INDEX `(table_name, period_year, period_month, started_at DESC)` para lookup O(log n) `getLastSuccessfulMaterializationAt`
- INDEX parcial `WHERE status='skipped_safety' ORDER BY started_at DESC` para reliability signal
- Anti-UPDATE trigger: solo permite transición `running → succeeded|failed|skipped_safety`; identity cols (id/table_name/period/started_at/created_at) immutables
- Anti-DELETE trigger: unconditionally rejected
- Ownership `greenhouse_ops`, GRANT SELECT/INSERT a `greenhouse_runtime`

**Reliability signal canonical** `delivery.ico_materializer.skipped_safety` (`src/lib/reliability/queries/ico-materializer-skipped-safety.ts`):

- kind=`drift`, moduleKey='delivery', subsystem rollup automatic via registry
- Severity: count=0 → ok | 1-5 → warning | >5 en 24h → error | query throws → unknown
- Steady state esperado = 0 (gate confía en upstream)
- Complementario a `identity.notion_bridge.coverage_drift` — cuando alerta es porque protegió data buena downstream

**⚠️ Reglas duras**:

- **NUNCA** ejecutar un DELETE+INSERT sobre una tabla materializada de ICO sin pasar por el orchestrator canonical `runIcoMaterializerCycle`. Si emerge un materializer downstream nuevo (Frame.io, HubSpot, etc.), reusa el orchestrator con su `MaterializerSqlConfig` declarativa.
- **NUNCA** filtrar a nivel TASK con `WHERE te.last_edited_time >= cutoff` en el aggregate source. **DEBE** filtrar a nivel BUCKET vía `MAX(te.last_edited_time) AS entity_last_edited` + outer WHERE. Filtrar tasks corrompe metrics (e.g. member con 10 tasks, 1 editada → aggregate de 1 task en lugar de 10).
- **NUNCA** incluir `WHEN NOT MATCHED BY SOURCE THEN DELETE` en el MERGE. La omisión es load-bearing: preserva data buena cuando upstream parcial. La diferencia entre destruir y proteger.
- **NUNCA** activar `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true` sin `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true`. Code-side `assertMaterializerFlagCoherence` throw runtime — defense in depth.
- **NUNCA** abortar silenciosamente el materializer: si el gate skipea, emite `captureWithDomain(err, 'delivery', {source: 'ico_materializer_skipped_safety'})` + persiste `status='skipped_safety'` + `blocking_signals` JSONB en tracking table.
- **NUNCA** mutar/borrar `greenhouse_sync.ico_materialization_runs`. Anti-UPDATE / anti-DELETE triggers PG enforce. Para correcciones, INSERT nueva fila — append-only audit trail.
- **NUNCA** computar `last_materialization_at` derivado de `metrics_by_*.materialized_at` (BQ). Usar siempre PG tracking SSOT — BQ es eventually consistent, PG es source of truth governance.
- **NUNCA** invocar `Sentry.captureException` directo en code paths del materializer. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'ico_materializer_*', table: '<name>' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** reescribir un materializer sin tests anti-regresión que simulen upstream degraded + verifiquen preservación de data previa (pattern `materialize-member-merge.test.ts`).
- **SIEMPRE** que emerja un materializer nuevo (Frame.io, HubSpot, Nubox, etc.), reusar `runIcoMaterializerCycle` + builders + tracking. Cero código nuevo de orquestación.
- **SIEMPRE** que emerja un signal upstream nuevo cuya regression podría corromper el materializer ICO, agregar su fetcher al `requireSignals` array del gate (sin refactor del orchestrator).

**Bug class fuente** (canonizado live 2026-05-18): TASK-877 follow-up 2026-05-14 → 2026-05-16. Bridge Notion→member degradado destruyó 2 noches consecutivas de data buena en `ico_engine.metrics_by_member` vía DELETE+INSERT. Operador vio TODOS los colaboradores con OTD/RpA proyectado en $0 por ~2 días aunque la nómina actual de Abril persistida en `payroll_entries` era correcta. Mitigación temporal commit `4fc8c0c4` (reliability signal `identity.notion_bridge.coverage_drift`) detecta el síntoma en horas vs 2 días — **pero no previene el bug, solo lo expone**. TASK-900 cierra la causa raíz arquitectónica.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (ADR). Files canónicos:

- Helpers: `src/lib/ico-engine/materialize-{guards,orchestrator,tracking,flags,sql-builders}.ts`
- Migration: `migrations/20260518141020881_ico-materializer-tracking.sql`
- Signal reader: `src/lib/reliability/queries/ico-materializer-skipped-safety.ts`
- Wire-up: `src/lib/reliability/get-reliability-overview.ts` (`icoMaterializerSkippedSafety` source)

### Nexa AI Signals append-only event log invariants (TASK-943, desde 2026-05-28)

`ico_engine.ai_signals` y `ico_engine.ai_prediction_log` son **observaciones históricas event-sourced** (hermanas de `task_status_transitions` TASK-908, outbox events TASK-773, audit logs TASK-742) — NO estado mutable. Una anomalía detectada el 5 de mayo "Daniela OTD bajó 30%" sigue siendo verdad sobre el 5 de mayo aunque el 20 ya no se observe; full-replace destruye evidencia operativa irrecuperable. Para sprints de 15 días, la evolución intra-mes ES la señal de gestión.

**Dicotomía canonical** (supersede el framing erróneo "estable vs volátil" del Delta TASK-942 2026-05-27 en la ADR — ver Delta 2026-05-28):

| Tipo de dato | Patrón canonical |
|---|---|
| Estado mutable (`metrics_by_*.otd_pct`) | **MERGE upsert por key** (TASK-900) |
| Observación histórica (`ai_signals`, `ai_prediction_log`, `task_status_transitions`, outbox, audit) | **Append-only event log** (TASK-943) |

**⚠️ Reglas duras**:

- **NUNCA** ejecutar `DELETE FROM ai_signals` ni `DELETE FROM ai_prediction_log` (excepto cleanup operativo manual auditado con capability). Materializer canónico (`appendBigQuerySignalsForPeriod`, `appendPredictionLogs`) es INSERT-only.
- **SIEMPRE** leer "qué señales aplican AHORA al período X" via la VIEW canonical `ai_signals_current` (latest-per-`signal_id`) — NO la raw `ai_signals`. Idem `ai_prediction_log_current` para predictions. Raw tables se leen SOLO cuando se quiere historia evolutiva intra-período o cuando se usa `FOR SYSTEM_TIME AS OF` (BQ time travel no funciona sobre VIEWs).
- **SIEMPRE** el cron `/api/cron/ico-materialize` opera con `monthsBack=1` por default (solo período actual). Meses cerrados quedan inmutables. Operator override via `?monthsBack=N` (cap 1..6) para backfill manual auditado.
- **ÚNICA excepción mutable** del contract append-only: `ai_prediction_log.actual_value` + `actual_recorded_at` (+ `error_pct` derivado) vía `hydratePredictionActuals`. Esta función es la ÚNICA fuente legítima de UPDATE sobre `ai_prediction_log`, guarded por `WHERE actual_value IS NULL` (no double-overwrite) + `period < currentPeriod` (no toca in-progress). NUNCA agregar campos al UPDATE ni quitar los guards.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'ico_ai_*' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** consumers downstream (Person 360 narrative, Home Nexa Insights, Agency ICO `aiLlm.totals`, Finance Nexa Insights, reliability signals) leen raw `ai_signals` directo. Toda lectura pasa por:
  - VIEW canonical `ai_signals_current` (default), o
  - PG serving `greenhouse_serving.ico_ai_signals` (proyectado desde la VIEW por `icoAiSignalsProjection`), o
  - PG history `greenhouse_serving.ico_ai_signal_enrichment_history` (append-only, narrativas enriquecidas — TASK-914).
- **SIEMPRE** que emerja una entidad nueva en ICO cuyo dato responde a "qué se vio cuando" (no "cuál es el valor actual"), nacer como append-only event log + VIEW current. NO usar replace semantics. La pregunta correcta es semántica del dato, no si "el set parece volátil entre runs".

**Signal de heartbeat canonical**: `nexa.insights.no_new_signals_in_24h` (kind=`lag`, severity warning >24h, error >48h, unknown sin signals, steady=ok). Reader `src/lib/reliability/queries/nexa-insights-no-new-signals.ts`. Cierra la pérdida de observabilidad implícita del DELETE+INSERT (un cron caído ya no "borra" la última corrida, queda silente).

**Bug class fuente** (canonizado live 2026-05-28 ISSUE-082 RCA): el delta TASK-942 (2026-05-27) modeló `ai_signals` como "set volátil → full-replace canonical". El operador identificó el error de framing: las anomalías son observaciones temporales con valor histórico, no estado mutable. Rolling 3 meses con DELETE+INSERT era doble error (borra evidencia ya capturada + recomputa lo que ya no cambia). El delta TASK-942 queda supersedido por el delta TASK-943 (2026-05-28) en la ADR. Cross-ref: `BUG-CLASS-004` en `~/.claude/skills/greenhouse-ico/reference/bug-class-catalog.md`.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` Delta 2026-05-28. Files canónicos:

- Writer: `src/lib/ico-engine/ai/materialize-ai-signals.ts` (`appendBigQuerySignalsForPeriod` + `appendPredictionLogs` + `hydratePredictionActuals` única excepción mutable).
- VIEW canonical: `src/lib/ico-engine/schema.ts` (`buildAiSignalsCurrentView`, `buildAiPredictionLogCurrentView`) — auto-provisioned por `ensureIcoEngineInfrastructure`.
- Cron: `src/app/api/cron/ico-materialize/route.ts` (default `monthsBack=1`).
- Consumers migrados (lectura via VIEW): `src/lib/reliability/queries/nexa-insights-freshness.ts`, `src/lib/sync/projections/ico-ai-signals.ts`, `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (branch SYSTEM_TIME → raw, default → VIEW).
- Heartbeat signal: `src/lib/reliability/queries/nexa-insights-no-new-signals.ts` + wire-up en `get-reliability-overview.ts`.

Patrones fuente reusados: TASK-571/699/766/774 (VIEW + helper + reliability + lint), TASK-742 (defense in depth 7-layer), TASK-848 (state machine + tracking append-only), TASK-873 (capability granularity), TASK-720/768/777 (declarative config + lint rule pattern para futuros materializers).

### ICO Status Transition Foundation invariants (TASK-908, desde 2026-05-18)

Foundation canonical de Status Transition Tracking que sostiene el motor ICO completo de métricas basadas en eventos observables (RpA, FTR, Cycle Time canonical). Reemplaza el anti-patrón legacy de leer Notion property formulas (frágil — bug class TASK-877 follow-up).

**Cadena canonical de dependencias** (orden de ship):

```text
TASK-908 (foundation, esta task)                TASK-901 (RpA)                      TASK-909 (FTR)
─────────────────────────────                   ──────────────────                  ─────────────────
• Tabla task_status_transitions             →   • calculateRpa(taskId)          →   • calculateFtr(taskId)
• countCorrectionTransitions helper             ↳ delega a count... (zero lógica)   ↳ delega a calculateRpa===0
• calculateCycleTime helper
• CT SLO config helper
```

**Read API canonical (V1.0 shipped)**:

- `countCorrectionTransitions(input)` — `src/lib/notion-metrics/count-correction-transitions.ts`. Cuenta transiciones canonical `'Listo para revisión' → 'Cambios solicitados'` en `greenhouse_delivery.task_status_transitions`. Source mode discrimination canonical: `'canonical'` (tarea con rows en table) vs `'unavailable'` (tarea sin rows, pre-deployment). Consumido por `calculateRpa` (TASK-901) + transitively por `calculateFtr` (TASK-909).
- `calculateCycleTime(inputs)` — `src/lib/notion-metrics/calculate-cycle-time.ts`. Pure function canonical V1 con 4 decisiones (Delta 2026-05-17): inicio `'En curso'`, fin `completedAt`, feedback time SÍ cuenta, Bloqueado SE EXCLUYE (clamp intervals).
- `getSLOThreshold(taskType?)` + `isWithinSLO(cycleTimeDays, taskType?)` — `src/lib/notion-metrics/cycle-time-slo-config.ts`. V1 default uniforme 14.2 días (Engine doc §A.5.5). V2 calibración per tipo de pieza queda forward-compat.

**Tabla canonical** `greenhouse_delivery.task_status_transitions`:

- Append-only enforced por triggers PG anti-UPDATE/anti-DELETE (mirror pattern TASK-848 release_state_transitions + TASK-900 ico_materialization_runs)
- CHECK constraint enum cerrado canonical en `from_status` Y `to_status` — solo permite los 11 canonical V1 (`Sin empezar`, `Brief listo`, `Pendiente aprobación interna`, `En pausa`, `Bloqueado`, `En curso`, `Listo para revisión`, `Cambios solicitados`, `Aprobado`, `Cancelado`, `Archivado`)
- Webhook handler (TASK-912 futuro) normaliza legacy variants via `normalizeTaskStatus` (de `task-status-canonical.ts`, ya existente desde TASK-742 prep commit `1525e51c`) ANTES de insertar. La tabla NUNCA almacena strings legacy.
- Indexes: source_event_id UNIQUE partial (dedup canonical), task_lookup (hot path history per task DESC), to_status recent (queries "tareas en X estado"), correction_event_partial (TASK-901 calculateRpa + TASK-909 calculateFtr hot path)
- `source_quality TEXT` discrimina origen: `'canonical'` (event.timestamp webhook), `'proxy'` (polling lossy), `'backfilled'` (reconstruido históricamente)

**Reliability signal canonical**: `notion.correction_transitions.source_availability` (kind=`data_quality`, moduleKey=`delivery`). Detecta % tareas completadas 90d sin rows en table. Steady state post-deployment + backfill: < 10%. Pre-deployment esperado 100% (foundation aún sin webhook capturando).

**Capabilities canonical V1.0** (granular least-privilege):

- `cycle_time.compute.execute` (delivery / execute / all) — EFEONCE_ADMIN <!-- spec original menciona DEVOPS_OPERATOR — colapsado a EFEONCE_ADMIN solo por TASK-935 (rol DEVOPS_OPERATOR no existe en ROLE_CODES) -->
- `correction_transitions.compute.read` (delivery / read / all) — EFEONCE_ADMIN + HR_MANAGER <!-- spec original menciona DEVOPS_OPERATOR + HR_ADMIN — colapsado a EFEONCE_ADMIN + HR_MANAGER por TASK-935 (DEVOPS_OPERATOR no existe; HR_ADMIN no existe, el real es HR_MANAGER) -->

**Fix B.1 canonical (Slice 6)**: `EXCLUDED_FROM_METRICS_STATUSES = EXCLUDED_STATUSES ∪ BLOCKED_STATUSES`. Tareas en `Bloqueado` / `En pausa` / legacy `Detenido` ahora excluidas del denominador OTD/RpA/FTR via `CANONICAL_OPEN_TASK_SQL`. Pre-fix: contaminaban métricas. Post-fix: métricas suben ligeramente (ESPERADO).

**Fix B.2 canonical (Slice 7 — verify ya done)**: `buildTaskStatusToCsc()` consume `allVariantsForCanonical` + `allVariantsForGroup` que incluyen TODOS los aliases legacy Sky (`Tomado`, `En feedback`, `Pendiente`) + Efeonce (`Listo para diseñar`, `Pendiente Dir. Arte`, `Cambios Solicitados` capital S) → CSC mapping canonical universal funciona post-rename operador-side.

**⚠️ Reglas duras canonical**:

- **NUNCA** persistir row en `task_status_transitions` con string legacy. Webhook handler upstream DEBE normalizar via `normalizeTaskStatus` antes del INSERT. La table CHECK constraint enforce el canonical enum cerrado (11 V1).
- **NUNCA** persistir row sin `transitioned_at` populated. Es el timestamp canonical de la métrica downstream (Cycle Time, Lead Time, Time-in-Status). Webhook handler usa `event.timestamp` source-of-truth; polling fallback usa `last_edited_time` con `source_quality='proxy'`.
- **NUNCA** consumer downstream recomputa "número de correcciones" inline. Toda lógica de contar correciones vive en `countCorrectionTransitions` — single source of truth canonical. RpA (TASK-901) + FTR (TASK-909) delegan.
- **NUNCA** consumer downstream recomputa Cycle Time inline. Toda lógica vive en `calculateCycleTime` helper o `cycle_time_days` column materializada (post Slice 4 futuro de TASK-912).
- **NUNCA** modificar fórmula `cycle_time_days` SQL en `schema.ts:108-113` sin migration + backfill verified contra snapshot pre-cambio. Cambio afecta `metrics_by_*` downstream materializados.
- **NUNCA** ejecutar DELETE / UPDATE sobre `task_status_transitions` (anti-UPDATE/anti-DELETE triggers enforce). Para correcciones, INSERT row nueva con `source_quality='backfilled'`.
- **NUNCA** invocar `Sentry.captureException` directo. Use `captureWithDomain(err, 'delivery', { tags: { source: 'cycle_time_*' | 'correction_transitions_*' } })`.
- **SIEMPRE** que un consumer downstream necesite "una corrección observada", consumir `countCorrectionTransitions({taskSourceId, windowStart?, windowEnd?})`. NO leer Notion property `Correcciones` (anti-patrón legacy bug class TASK-877).
- **SIEMPRE** que el helper devuelva `sourceMode='unavailable'`, downstream consumer mapea a `dataStatus='unavailable'` + `value=null` (NO `value=0`). Distingue "no datos" vs "0 correcciones reales".
- **SIEMPRE** que emerja un nuevo cliente Notion con custom status names, **enforce canonical template L1** en Notion antes del onboarding. Single source of truth (`task-status-canonical.ts`) — NO agregar aliases custom-per-cliente.

**Deferred a TASK-912 follow-up** (requiere coordinación operador-side de Notion webhook subscription):

- Slice 2: webhook handler `notion-status-transitions` + HMAC validation + outbox event
- Slice 3: reactive consumer ops-worker que persiste transitions
- Slice 4: cycle_time_days BQ formula update (status → En curso start + descontar Bloqueado)
- Slice 5: métrica `cycle_time_slo_pct` materialization en metric-registry + dashboards
- Slice 9: backfill histórico opcional via Notion API page history

**Spec canonical**: `docs/architecture/metrics/{RPA,CYCLE_TIME,CT_SLO_PCT,FTR}_V1.md`. Migration: `migrations/20260518193001910_task-status-transitions-foundation.sql`. Helpers: `src/lib/notion-metrics/`. Signal reader: `src/lib/reliability/queries/notion-correction-transitions-source-availability.ts`. ADRs: `GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` + `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones B+C+D.

### Delivery Metrics Ownership Boundary invariants (TASK-901 + TASK-908 + TASK-909, desde 2026-05-17)

**Notion = Task Operating System. Greenhouse ICO Engine = motor exclusivo de cómputo de métricas.** Notion captura datos operativos primitivos (asignación, fechas, estado, tipo de entregable, archivos) y sirve como UI de gestión. Greenhouse computa TODAS las métricas (RpA, OTD, FTR, Cumplimiento, Cycle Time, Throughput, Pipeline Velocity, BCS, TTM, Iteration Velocity, futuras) desde eventos canonical y escribe los valores de vuelta a Notion vía bulk PATCH a propiedades `[GH] <métrica>` read-only.

**Bug class disparador** (TASK-877 follow-up 2026-05-16): 3,168 tareas Sky en 10 meses con `rpa=null` 100% — la fórmula `RpA` vivía como propiedad formula Notion editable por cualquier operador, sin git history, tests, code review ni observabilidad. El sync `notion-bq-sync` perdía el valor silenciosamente y nadie se enteraba hasta que un usuario reportó UI rota.

**Pipeline canonical**:

```text
Notion edit (operador) → webhook canonical (HMAC + echo-loop filter)
  → outbox event → ops-outbox-publish (TASK-773)
  → reactive consumer en ops-worker
  → ICO Engine canonical compute (calculate<Metric>(taskId) en Greenhouse code)
  → Cloud Tasks throttled (vs Notion rate limit 3 req/sec)
  → PATCH /v1/pages/bulk (Notion-Version 2026-02-01, up to 100 pages)
  → propiedades [GH] <métrica> updated en Notion
  → operador ve métrica live en UI Notion
```

Plus safety net nocturno: Cloud Run Job escanea tareas con `last_edited_time > checkpoint`, recomputa via mismo helper canonical, detecta drift Greenhouse vs Notion-stored, re-writeback.

**Semántica canonical de "corrección"** (TASK-909):

> **1 corrección = 1 transición `Listo para revisión → En Feedback`** en el status history canonical de la tarea.

No es ronda interna, no es comentario sin resolver, no es review del workflow team. Es específicamente "el cliente vio el entregable y pidió cambios", observado como evento de transición de estado capturado por TASK-908.

- `calculateRpaV2(inputs)` (TASK-901 Slice 1, SHIPPED) **delega a** `countCorrectionTransitions(taskId)` (TASK-908). NO lee propiedad Notion `Correcciones`.
- `calculateFtr(inputs)` (TASK-909 Slice 1, SHIPPED 2026-05-24) **delega a** `calculateRpaV2(inputs).value === 0 ? 'pass' : 'fail'`. NO duplica lógica.

Forward-compat Frame.io: cuando exista la integración, `calculateRpa` extiende inputs sin breaking change (combinar `correctionTransitionsCount` + `clientReviewOpen` + `workflowReviewOpen` + `openFrameComments` bajo policy a definir).

**Migración progresiva canonical** (strangler pattern, NO migramos todas las métricas de una vez):

| Fase | Métrica | Task | Status |
|---|---|---|---|
| Foundation | Status transition tracking + `countCorrectionTransitions` helper | TASK-908 | En diseño 2026-05-17 |
| V1 | RpA (writeback completo del pattern) | TASK-901 | En diseño 2026-05-17 |
| V2 | OTD writeback | TASK-902 (futuro) | Backlog |
| V3 | FTR writeback (delega a calculateRpa) | TASK-903 (futuro) | Backlog post TASK-909 |
| V4 | Cumplimiento writeback | TASK-904 (futuro) | Backlog |
| V5+ | Throughput, Cycle Time SLO%, Pipeline Velocity writebacks | TBD | Backlog |
| V6+ | BCS, TTM (AI-derived) | TASK-910 + futura TTM | Backlog |

Cada Vn ship con shadow mode mínimo 7 días verde antes de activar writeback. Después del writeback, las fórmulas Notion originales se mantienen en paralelo 7-14 días más para paridad cross.

**⚠️ Reglas duras canonical**:

- **NUNCA** introducir una propiedad formula nueva en Notion para calcular una métrica ICO. Toda métrica nueva nace en Greenhouse code (con tests + reliability signal + writeback).
- **NUNCA** modificar/editar/reemplazar una fórmula Notion existente de métrica ICO sin coordinar paralelamente con el helper canonical en Greenhouse — la métrica vive en código, Notion es solo display vía writeback.
- **NUNCA** computar una métrica ICO leyendo otra propiedad Notion como input cuando esa propiedad sea derivable de eventos canonical (transitions, fechas). Ejemplo prohibido: leer Notion `Correcciones` rollup para computar RpA — el RpA canonical viene de `countCorrectionTransitions(taskId)`.
- **NUNCA** consumer downstream (UI, dashboard, scorecard, report PDF, agente IA) recomputa una métrica ICO inline. Toda lectura pasa por la columna materializada (`v_tasks_enriched.<metric>`, `metrics_by_*.<metric>`) o por el helper canonical (`calculate<Metric>(taskId)`).
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de compute o writeback de métricas ICO. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'metric_compute' | 'metric_writeback', metric: '<name>' } })`.
- **NUNCA** activar writeback de una métrica nueva sin: (a) feature flag `NOTION_<METRIC>_WRITEBACK_ENABLED` default false, (b) shadow mode 7 días verde, (c) reliability signal `notion.metrics.shadow_paridad_<metric>` steady=0, (d) approval explícito en `Handoff.md` con allowlist de propiedades target Notion.
- **NUNCA** crear template Notion DB nuevo con formulas de métricas ICO embedded. Templates nuevos declaran solo propiedades primitivas + las propiedades `[GH] <métrica>` (read-only target del writeback). Templates legacy con formulas se mantienen como fallback histórico inactivo.
- **SIEMPRE** que un input nuevo emerja para una métrica (e.g. Frame.io integration aporta `client_change_round` real para RpA), extender el helper canonical en Greenhouse + agregar tests anti-regresión + NO crear fórmula Notion paralela.
- **SIEMPRE** que se cree una propiedad Notion `[GH] <métrica>`, documentar en el ADR `GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` + DECISIONS_INDEX + spec arquitectónica de la métrica que la propiedad es **read-only para operadores** (solo Greenhouse integration token escribe).
- **SIEMPRE** TASK-908 (status transition tracking) es prerequisito arquitectónico de cualquier migración Vn que dependa de eventos canonical observados (RpA, FTR, Cycle Time canonical, futuras). NO shipear Vn write-back path antes que TASK-908 Slices 0-3 estén verde.

**Helpers canonical**:

- `countCorrectionTransitions(taskId) → number` — en TASK-908 foundation, lee `greenhouse_delivery.task_status_transitions`
- `calculateCycleTime(taskId) → CycleTimeResult` — en TASK-908, lee transitions + descuenta Bloqueado
- `calculateRpaV2(inputs) → RpaV2Result` — `src/lib/notion-metrics/calculate-rpa-v2.ts` (TASK-901 Slice 1 SHIPPED, estrangulador RpA V2), delega a `countCorrectionTransitions`
- `calculateFtr(inputs) → FtrResult` — `src/lib/notion-metrics/calculate-ftr.ts` (TASK-909 Slice 1 SHIPPED 2026-05-24), delegación pura a `calculateRpaV2` (`FTR = RpA.value === 0 ? 'pass' : 'fail'`, `ftr_v1.0`). Lint rule `greenhouse/no-inline-ftr-calculation` (warn) bloquea recompute inline del veredicto. NO duplica lógica; cuando Frame.io shippee se extiende `calculateRpaV2` y FTR se beneficia automático

**Spec canónica**: `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (ADR canonical). Cross-refs: `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones F + G; `docs/architecture/Greenhouse_ICO_Engine_v1.md` (conceptual spec, drift por resolver post-TASK-908/909/901). Patrones fuente: TASK-742 (defense-in-depth 7-layer), TASK-773 (outbox publisher canonical), TASK-771 (decoupling write paths via outbox), TASK-706 (HMAC webhook ingestion), TASK-720 (TS-only declarative reader pattern).

### ICO Metrics Progressive Migration invariants (TASK-901 + TASK-908 + TASK-910, desde 2026-05-17)

La migración del compute canonical de las 14 métricas ICO (RpA, FTR, OTD, Cumplimiento, Cycle Time, CT Variance, CT SLO%, Throughput, Pipeline Velocity, CSC Distribution, Stuck Assets, Stuck %, OCF + 3 narrative-level deferred V2: BCS/TTM/Iteration Velocity) **NO es big-bang**. Es strangler pattern obligatorio con stop-gates canonical, demo teamspace pre-prod, recovery primitives explícitas, backward compatibility 90+ días.

**Bug class motivador**: TASK-877 follow-up (3,168 tareas Sky con `rpa=null` 10 meses, nómina Sky proyectada perdía bonus RpA silenciosamente). Big-bang × 14 métricas × N meses = riesgo inaceptable.

**Timeline canonical**: 12-14 meses end-to-end para 13 métricas operacionales. **NO acelerar**.

**Demo teamspace canonical** (TASK-910) ya creado live 2026-05-17:

| Asset | Name | Page ID | Data Source ID |
|---|---|---|---|
| Teamspace | `Demo Greenhouse` | `36339c2f-efe7-814c-a0f5-0042863dbb5a` | N/A |
| Tareas | `Tareas` | `36339c2f-efe7-80e2-9109-e7e9e41b36e4` | `36339c2f-efe7-81a6-980c-000b0056bba8` |
| Proyectos | `Proyectos` | `36339c2f-efe7-800e-9bba-c5c1661dd242` | `36339c2f-efe7-8116-8c15-000be81c5538` |
| Sprints | `Sprints ` (con space trailing) | `36339c2f-efe7-803c-a94a-e52bc41c8e77` | `36339c2f-efe7-81cc-8f2f-000b112ee87c` |

IDs distintos vs productivos (Efeonce DS `5126d7d8-...`, Sky DS `23039c2f-...`) — cero overlap, cero risk cross-contamination.

**⚠️ Reglas duras canonical (8 stop-gates obligatorios per flip de writeback)**:

- **NUNCA** flip writeback de métrica ICO sin pasar por los 8 stop-gates del ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3. Falta cualquiera → NO flip. No "casi listo":
  1. Foundation completa (TASK-908 Slices 0-3.5 + backfill histórico verde)
  2. Demo teamspace pre-prod (TASK-910 verde 4 semanas runtime end-to-end)
  3. Shadow mode prod verde 30d bonus / 7d operational
  4. Pilot scope ≤ 1 cliente (Efeonce primero, Sky después de Efeonce verde 30d)
  5. HR/Finance written sign-off (bonus metrics solamente: RpA + OTD)
  6. Snapshot pre-flip BQ restorable <1h
  7. Kill switch verificado staging <5min revert
  8. Runbook operativo + cliente sign-off (cliente externo Sky vía QBR)
- **NUNCA** flip global directo cross-cliente. SIEMPRE pilot Efeonce primero, después Sky.
- **NUNCA** borrar formula Notion legacy durante la migración. Mínimo 90 días coexistencia post-flip stable.
- **NUNCA** computar bonus para demo members. `fetchKpisForPeriod` filtra `tenant_type='demo'` + helpers bonus tienen pre-check `if (member?.tenantType === 'demo') return {amount: 0, qualifies: false}`. Defense in depth dual. Demo NUNCA toca payroll real.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Tabla separada `task_status_transitions_demo` enforced por reactive consumer demo (filtra `metadata.demo_mode=true`).
- **NUNCA** compartir webhook secret HMAC entre prod y demo. Secrets separados en GCP Secret Manager (`notion-webhook-signing-secret-efeonce` vs `notion-webhook-signing-secret-demo`).
- **NUNCA** permitir acceso de cliente externo (Sky) al teamspace demo. Solo equipo interno Greenhouse + HR + Delivery interno.
- **NUNCA** desincronizar schema del demo con el template productivo. Cuando Efeonce template agrega status option o property nueva, el demo se actualiza en el mismo PR.
- **NUNCA** archivar el demo durante la migración (12-14 meses). Demo es load-bearing — sin él, los siguientes flips de Fase 2-5 pierden el gate canonical de testing pre-prod.
- **NUNCA** acelerar timeline canonical "porque va bien". 12-14 meses es el contrato canonical. Acelerar reintroduce risk class TASK-877 follow-up.
- **NUNCA** ignorar reliability signal `notion.metrics.shadow_paridad_<metric>` con count > 0. Drift sostenido pre-flip = NO flip; post-flip = rollback.
- **NUNCA** flip nuevo si hay rollback de cualquier métrica últimos 30 días. Estabilizar antes de avanzar.
- **NUNCA** flip OTD% antes de RpA stable V1.0 (90 días post-Sky verde). Diversificar risk.
- **NUNCA** flip métrica narrative-level Revenue Enabled (BCS, TTM, Iteration Velocity) sin Frame.io + ad platforms integration. V1 mostly proxy honesto es OK.
- **NUNCA** ejecutar rollback parcial (e.g. solo para member X). Rollback es per-cliente vía feature flag — granularidad menor no soportada V1.
- **NUNCA** confundir IDs del demo con IDs de Efeonce/Sky productivos. Demo teamspace ID = `36339c2f-...4c-a0f5-0042863dbb5a`, prefix consistente `36339c2f-...` en todos los assets demo. Productivos tienen prefixes distintos (Efeonce `5126d7d8-...` Tasks DS; Sky `23039c2f-...` Tasks DS).
- **SIEMPRE** que emerja bug class durante pilot Efeonce, halt migration completa + RCA documentada antes de retry.
- **SIEMPRE** snapshot BQ pre-flip persistido + restorable <1h antes de cualquier flip.
- **SIEMPRE** HR reconciliation bonus mes 1 post-flip antes de declarar pilot pass.
- **SIEMPRE** runbook canonical publicado per métrica antes del flip.

**Spec canónica**: `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (ADR — 8 stop-gates + demo gate + 6 fases ramp + recovery primitives). Demo teamspace governance: `docs/tasks/to-do/TASK-910-notion-demo-teamspace-migration-sandbox.md` §Detailed Spec.

### Notion Demo Teamspace Sandbox invariants (TASK-910, desde 2026-05-19)

Setup canonical Greenhouse-side del demo teamspace `Demo Greenhouse` (Notion `36339c2f-efe7-814c-a0f5-0042863dbb5a`) creado live 2026-05-17 por operador. Gate canonical pre-Fase 1 del ADR Progressive Migration. Demo NUNCA afecta colaboradores reales en KPIs, bonus, payroll, ni dashboards productivos.

**Defense in depth canonical de 9 capas**:

1. **Tabla físicamente separada** `greenhouse_delivery.task_status_transitions_demo` (CHECK `workspace_id='demo'` + triggers anti-UPDATE/anti-DELETE — shipped migration `20260519120713456`)
2. **Discriminator canonical** `members.is_demo BOOLEAN NOT NULL DEFAULT FALSE` con index parcial
3. **Webhook dedicated** `/api/webhooks/notion-tasks-demo` + HMAC secret separado `NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF` (GCP `notion-webhook-signing-secret-demo`)
4. **Sync legacy NO procesa demo** — `space_notion_sources.sync_enabled = FALSE` para demo space (notion-bq-sync legacy excluye)
5. **Helper `isDemoMember` strict** `=== true` canonical (anti-coersion contra truthy values)
6. **Filter SQL canonical** en `fetchKpisForPeriod`: `filterOutDemoMembers()` excluye demo del payroll input ANTES de BQ query
7. **Pre-check helpers** `calculateRpaBonusForMember` + `calculateOtdBonusForMember` (defense in depth dual con wrappers canonical)
8. **Reactive consumer filter** `payload.metadata.demo_mode === true` (strict, anti-coersion) — demo events solo entran a tabla demo
9. **Reliability signal `payroll.bonus.demo_member_contamination`** (steady=0, ERROR canonical si > 0 — NUNCA debe pasar)

**Capabilities canonical V1.0**:

- `notion.metrics.demo.execute` (module=admin, scope=tenant) — EFEONCE_ADMIN
- `notion.metrics.demo.read` (module=admin, scope=tenant) — EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS

**6 reliability signals canonical** bajo subsystem rollup `delivery` (5) + `payroll` (1 critical):

- `notion.metrics.shadow_paridad_rpa_demo` (drift)
- `notion.metrics.echo_loop_detected_demo` (drift, steady=0)
- `notion.metrics.webhook_signature_failures_demo` (drift, steady=0)
- `notion.metrics.writeback_dead_letter_demo` (drift, deferred TASK-913 V1.1)
- `notion.metrics.demo_teamspace_drift` (drift, schema vs canonical V1)
- `payroll.bonus.demo_member_contamination` (drift, **ERROR canonical si > 0**)

**⚠️ Reglas duras canonical**:

- **NUNCA** computar bonus para demo members. Filter SQL en `fetchKpisForPeriod` + pre-check en `guardDemoMemberBonus` wrappers garantizan defense in depth dual.
- **NUNCA** mezclar demo events con productivos en tabla `task_status_transitions`. Físicamente separadas — CHECK constraint `workspace_id='demo'` rechaza INSERT cross-tenant.
- **NUNCA** compartir webhook HMAC secret entre prod y demo. GCP secrets separados (`notion-webhook-signing-secret-{efeonce|sky|demo}`). Leak en uno NO compromete los otros.
- **NUNCA** permitir cliente externo (Sky, etc.) access al demo teamspace. Solo interno Greenhouse + HR + Delivery (`notion.metrics.demo.read` capability matrix canonical).
- **NUNCA** desincronizar schema demo del template Efeonce sin update governance doc + reliability signal `demo_teamspace_drift` review.
- **NUNCA** archivar demo durante la migración (12-14 meses canonical per ADR Strangler). Demo es load-bearing.
- **NUNCA** activar `sync_enabled=TRUE` en demo `space_notion_sources` row. Sync legacy NO procesa demo — defense in depth contra contaminate `greenhouse_conformed.delivery_*` + `metrics_by_*` productivos.
- **NUNCA** marcar real member con `is_demo=TRUE` manualmente. Helper `registerDemoMember` rechaza convertir real (is_demo=FALSE existente) a demo. Invariant anti-corruption.
- **NUNCA** invocar `Sentry.captureException()` directo en demo code paths. Usar `captureWithDomain('integrations.notion', { tags: { source: 'demo_<stage>' } })` o `'payroll'` para signal contamination.
- **NUNCA** desactivar el filter SQL en `fetchKpisForPeriod` ni los wrappers `calculateRpaBonusForMember/calculateOtdBonusForMember`. Defense in depth dual es load-bearing.
- **SIEMPRE** que un nuevo bug class demo emerja, agregar test anti-regresión en `bonus-proration.test.ts` (demo member → $0 bonus + qualifies=false canonical).
- **SIEMPRE** que un consumer payroll nuevo emerja que llame `fetchKpisForPeriod`, verificar que el filter `filterOutDemoMembers` corre antes de cualquier read BQ.

**Helpers canonical**:

- `src/lib/identity/demo-members.ts`: `registerDemoMember`, `isDemoMember`, `listDemoMembers`, `countDemoMembers`
- `src/lib/webhooks/handlers/notion-tasks-demo.ts`: webhook handler con HMAC + echo-loop + property allowlist + status normalization
- `src/lib/sync/projections/notion-status-transition-capture-demo.ts`: reactive consumer + filter strict + persist en tabla demo
- `src/lib/payroll/bonus-proration.ts`: `guardDemoMemberBonus`, `calculateRpaBonusForMember`, `calculateOtdBonusForMember`
- `src/lib/reliability/queries/notion-metrics-demo-signals.ts`: 6 signal readers canonical

**Spec canónica**: `docs/tasks/in-progress/TASK-910-notion-demo-teamspace-migration-sandbox.md`. Governance doc: `docs/operations/notion-demo-teamspace-governance.md`.

### RpA V2 Demo Pipeline End-to-End invariants (TASK-913, desde 2026-05-19)

Pipeline canonical RpA V2 demo end-to-end: captura status transition Notion → persiste en tabla demo → computa RpA V2 via helper canonical → persiste snapshot → PATCH Notion property `[GH] RpA v2`. Carril paralelo invisible al productive durante toda la migración Strangler (per ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`). El pipeline corre **sólo sobre el teamspace Demo Greenhouse**; NUNCA toca Efeonce/Sky productivos.

**Cadena canonical event-driven** (4 capas decoupled vía outbox, mirror del pattern TASK-771):

```text
Notion edit status (operador demo) → webhook /api/webhooks/notion-tasks-demo (HMAC + echo-loop filter)
  → outbox event notion.task.status_transitioned (metadata.demo_mode=true)
    → capture-demo (TASK-910 Slice 3) persiste task_status_transitions_demo
      → emite chain event notion.task.transition_captured.demo (TASK-913 Slice 1)
        → compute-demo invoca calculateRpaV2Demo (foundation helper sibling demo)
          → persiste row en task_rpa_demo_snapshots (CHECK workspace_id='demo')
          → emite chain event notion.task.metrics_writeback_requested.demo (Slice 1)
            → writeback-demo (Slice 2) re-reads PG defensive + PATCH Notion [GH] RpA v2
              → marca snapshot.written_to_notion_at = NOW()
```

**Diseño simétrico canonical sibling-pattern** (forward-compat productive cutover por repointing, NO rediseño):

| Demo (V1 shipped 2026-05-19) | Productive sibling (TASK-901 Slice 4+ futuro) |
|---|---|
| `count-correction-transitions-demo.ts` | `count-correction-transitions.ts` (TASK-908 shipped) |
| `calculate-rpa-v2-demo.ts` | `calculate-rpa-v2.ts` (TASK-901 shipped) |
| `notion-status-transition-capture-demo.ts` | `notion-status-transition-capture.ts` (TASK-912 futuro) |
| `notion-rpa-compute-demo.ts` | `notion-rpa-compute.ts` (futuro) |
| `notion-rpa-writeback-demo.ts` | `notion-rpa-writeback.ts` (futuro) |
| `notion-demo-client.ts` (token `NOTION_METRICS_DEMO_TOKEN_SECRET_REF`) | `notion-client.ts` (token `NOTION_TOKEN`) |
| `task_rpa_demo_snapshots` (PG demo) | `task_rpa_snapshots` (PG productive, futuro) |
| `task_status_transitions_demo` | `task_status_transitions` (TASK-908 shipped) |
| Events `notion.task.*.demo` | Events `notion.task.*` o `*.prod` (futuro) |
| Property Notion `[GH] RpA v2` (demo teamspace) | Property `[GH] RpA v2` (Efeonce/Sky DBs) |

**Eventos canonical V1** (3 nuevos outbox events bumpeados al catálogo):

- `notion.task.status_transitioned` (heredado TASK-908/910) — webhook source, discriminado por `metadata.demo_mode`
- `notion.task.transition_captured.demo` (TASK-913 Slice 1) — chain event canonical post-persist, garantiza happens-before vs race condition del dispatcher reactivo paralelo
- `notion.task.metrics_writeback_requested.demo` (TASK-913 Slice 1) — chain event post-compute, dispara writeback

**Tabla canonical** `greenhouse_delivery.task_rpa_demo_snapshots` (migration `20260519130951001`):

- PK `snapshot_id UUID`
- CHECK `workspace_id = 'demo'` PG-side
- CHECK `rpa_data_status IN (valid|unavailable|low_confidence|suppressed)`
- CHECK `source_mode IN (canonical|unavailable)`
- UNIQUE partial INDEX sobre `source_event_id WHERE NOT NULL` (idempotency canonical)
- 3 indexes hot path: `task_latest_desc`, `writeback_pending`, `paridad`
- Append-only triggers anti-UPDATE/anti-DELETE (EXCEPCIÓN canonical: writeback columns `written_to_notion_at`, `notion_writeback_event_id`, `notion_writeback_attempt_count`, `notion_writeback_last_error` SÍ pueden mutar para idempotency canonical writeback)
- Ownership `greenhouse_ops` + GRANT SELECT/INSERT/UPDATE a `greenhouse_runtime`

**2 reliability signals nuevos** (TASK-913 Slice 3) bajo subsystem rollup `delivery`:

- `notion.metrics.writeback_dead_letter_demo` (drift): real signal post-Slice 2 que detecta `notion_writeback_attempt_count >= 4 AND notion_writeback_last_error IS NOT NULL AND written_to_notion_at IS NULL`. Steady=0. ERROR si > 0.
- `notion.metrics.writeback_lag_demo` (lag): snapshots `valid + NOT written + < dead-letter threshold + computed_at > 30 min ago`. Steady=0. Warning 1-3, error > 3.

**Nightly safety net canonical**: script `scripts/rpa-demo/retrigger-pending-writebacks.ts` re-emite `notion.task.metrics_writeback_requested.demo` para snapshots lag overdue. Idempotent (PATCH idempotent + snapshot guard downstream). Pattern fuente TASK-878.

**Defense in depth canonical 9 capas** (heredadas TASK-910 + extendidas por TASK-913):

1-9: ver TASK-910 sección Notion Demo Teamspace Sandbox
10. **Token Notion físicamente separado** `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` (GCP `notion-integration-token-greenhouse-metrics-demo`) con permisos SOLO en teamspace Demo Greenhouse — NUNCA accesible a Efeonce/Sky databases
11. **Re-read snapshot from PG defensive** en writeback projection — NUNCA confía el `rpaValue` del payload del event (source of truth = PG)
12. **Skip honest cuando token NO configurado** — degraded mode honest, reliability signal alerta vs degradar silenciosamente al productive
13. **Idempotency triple**: ON CONFLICT DO NOTHING (compute snapshot) + `written_to_notion_at` guard (writeback skip si already_written) + PATCH Notion idempotent (mismo body NOOP)
14. **maxRetries=4** en writeback projection antes de dead-letter (3 retries + initial)

**⚠️ Reglas duras canonical**:

- **NUNCA** hacer drift entre las firmas/types de los helpers demo (`count-correction-transitions-demo`, `calculate-rpa-v2-demo`) y sus siblings productive. Re-export types canonical desde productive (mismo shape `RpaV2Result`, `CountCorrectionTransitionsResult`). Cualquier cambio en uno debe reflejarse en el otro.
- **NUNCA** mezclar la lógica de demo y productive en el mismo módulo. Siblings físicamente separados es el patrón canonical — `if (isDemo) { ... } else { ... }` está prohibido. Lint manual durante code review.
- **NUNCA** introducir parametrize `tableName: string` en los foundation helpers (`countCorrectionTransitions[Demo]`). Bug futuro podría pointear productive al table demo o vice-versa. Siblings físicos enforce el boundary a nivel código.
- **NUNCA** invocar `calculateRpaV2` (productive) desde un code path que opera sobre demo. Y vice-versa. Lint manual code review.
- **NUNCA** compartir el integration token de Notion entre demo y productive. Secret físicamente separado en GCP (`notion-integration-token-greenhouse-metrics-demo` vs `NOTION_TOKEN`). Permisos del demo token DEBEN estar restringidos al teamspace Demo Greenhouse — NUNCA tener acceso a databases Efeonce/Sky.
- **NUNCA** escribir a la propiedad `[GH] RpA v2` en databases productivas usando el demo writeback projection. Defense in depth dual: filter `workspaceId === 'demo'` strict + integration token con permisos restringidos.
- **NUNCA** crear consumer downstream que confíe el `rpaValue` del payload del event sin re-read PG. El payload es trigger; la fuente de verdad es `task_rpa_demo_snapshots` (defense in depth pattern TASK-771 sample-sprint).
- **NUNCA** ON UPDATE las columnas append-only de `task_rpa_demo_snapshots` (todas excepto writeback columns). Trigger PG enforce. Para correcciones, INSERT nueva fila con `source_event_id` distinto.
- **NUNCA** persistir un snapshot con `rpa_data_status='valid'` Y `rpa_value=NULL`. CHECK constraint PG-side rechaza. Para tasks pre-deployment (sin transitions), persiste `rpa_data_status='unavailable'` + `rpa_value=NULL`.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del pipeline demo. Usar `captureWithDomain('integrations.notion', { tags: { source: 'demo_<stage>' } })` para rollup canonical en `/admin/operations`.
- **NUNCA** introducir nuevo chain event (e.g. para BCS, TTM, OTD) sin agregar (a) entry en `EVENT_TYPES`, (b) outbox aggregateType canonical, (c) projection registrada con `triggerEvents`, (d) tests anti-regresión, (e) reliability signal observable downstream.
- **NUNCA** correr el pipeline demo en paralelo con el legacy sync (`space_notion_sources.sync_enabled=TRUE` para demo). El sync legacy NO procesa demo — pero garantizar que sigue OFF es load-bearing canonical anti-contamination.
- **NUNCA** auto-promover pipeline demo a productive (Efeonce/Sky) sin pasar por los 8 stop-gates canonical del ADR Strangler `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (foundation + demo verde 4 semanas + shadow 30d bonus / 7d operational + pilot scope ≤ 1 cliente + HR sign-off + snapshot pre-flip + kill switch + runbook + cliente sign-off).
- **NUNCA** escalar volumen de writeback demo > Notion rate limit ~3 req/s sin migrar a Cloud Tasks queue throttled. V1 demo low volume <10/day es seguro con reactive consumer cada 5min; productive cutover REQUIERE Cloud Tasks rate=3/s explícito.
- **NUNCA** modificar el `formula_version='rpa_v2.0'` retroactivamente. Bump a `rpa_v3.0` cuando Frame.io integration shippee + extender helpers en paralelo a productive — NUNCA modificar V2 in-place.
- **NUNCA** crear consumer/dashboard que lea `task_rpa_demo_snapshots` para cualquier propósito payroll/bonus/KPI productivo. La tabla es demo-only; el bonus payroll productivo lee `metrics_by_member.rpa_avg` (V1 legacy) hasta cutover Fase D del Strangler ADR.
- **SIEMPRE** que un consumer demo nuevo emerja, validar (a) filter strict `metadata.demo_mode === true`, (b) workspace check, (c) defense in depth dual mínimo (filter + tabla/secret físicamente separada).
- **SIEMPRE** que se modifique el writeback projection (`notion-rpa-writeback-demo`), verificar que el counter `notion_writeback_attempt_count` se incrementa en AMBOS paths (success + fail). Sin counter, dead-letter signal pierde observabilidad.
- **SIEMPRE** que se modifique cualquier column del schema `task_rpa_demo_snapshots`, regenerar tipos via `pnpm migrate:up` (auto) y actualizar consumers TypeScript. Drift entre PG schema + TS types rompe build.
- **SIEMPRE** que un cliente productivo nuevo (Sky, futuro) emerja con custom property names en Notion, NO agregar property aliases — enforcer canonical template L1 ANTES del onboarding (mismo principio que TASK-742 canonical status vocabulary).

**Capabilities canonical V1.0** (heredadas TASK-910 + reusadas):

- `notion.metrics.demo.execute` (module=admin, scope=tenant) — EFEONCE_ADMIN
- `notion.metrics.demo.read` (module=admin, scope=tenant) — EFEONCE_ADMIN + HR_MANAGER + EFEONCE_OPERATIONS

**Helpers canonical** (todos `import 'server-only'`):

- `src/lib/notion-metrics/count-correction-transitions-demo.ts`: foundation helper sibling demo
- `src/lib/notion-metrics/calculate-rpa-v2-demo.ts`: mapper canonical demo (delegates a foundation helper)
- `src/lib/notion-metrics/notion-demo-client.ts`: Notion API client demo-only con token físicamente separado
- `src/lib/sync/projections/notion-rpa-compute-demo.ts`: reactive consumer compute (invoca calculateRpaV2Demo + persiste snapshot + emite chain event)
- `src/lib/sync/projections/notion-rpa-writeback-demo.ts`: reactive consumer writeback (PATCH Notion + idempotent + retryable)
- `src/lib/sync/projections/notion-status-transition-capture-demo.ts` (TASK-910 extended Slice 1): emite chain event post-persist en correction transitions
- `src/lib/reliability/queries/notion-metrics-demo-signals.ts`: 7 signal readers canonical (5 + 2 nuevos Slice 3)
- `scripts/rpa-demo/retrigger-pending-writebacks.ts`: nightly safety net script

**Spec canónica**: `docs/tasks/in-progress/TASK-913-rpa-v2-demo-pipeline-end-to-end.md`. ADR: `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`. Cross-refs TASK-910 (demo teamspace foundation), TASK-908 (status transition tracking foundation), TASK-901 (calculateRpaV2 productive helper).

### Notion Status Transition Capture — productive pipeline invariants (TASK-912, desde 2026-05-21)

Sibling PRODUCTIVO (Efeonce + Sky) del pipeline de captura demo (TASK-910/914). Cierra el loop de captura de TASK-908 Foundation: cuando el operador active el flag + secret, `countCorrectionTransitions` empieza a retornar `sourceMode='canonical'` y desbloquea TASK-901 Slice 4 / TASK-916 (RpA prod). **Aditivo + flag OFF por default → cero impacto en métricas existentes al merge.**

**Pipeline canónico** (sibling físicamente separado del demo):

```text
Notion webhook (suscripción ÚNICA y AMPLIA, todos los teamspaces)
  → /api/webhooks/notion-status-transitions  (handler notion-status-transitions)
     ├─ verification handshake → ACK siempre
     ├─ kill-switch NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED OFF → ACK + drop
     ├─ HMAC (secret productivo separado del demo) + echo + demo-drop best-effort
     └─ emite notion.task.page_change_signal (trigger liviano, sin from/to)
  → consumer notion-status-transition-capture (reactivo, ops-worker)
     ├─ re-fetch página (NOTION_TOKEN, read 2026-03-11)
     ├─ resuelve workspace por parent.data_source_id → Efeonce/Sky o SKIP (autoritativo)
     ├─ derive from de última transición en task_status_transitions (PG)
     ├─ persist-if-changed en task_status_transitions (workspace_id resuelto)
     └─ emite notion.task.status_transitioned (canonical, con from/to) para downstream
```

**Helpers canónicos**:
- `resolveProductiveWorkspace(notionId)` / `isDemoTareasDataSource(notionId)` — `src/lib/notion-metrics/notion-productive-workspaces.ts` (data source IDs Efeonce `5126d7d8-…` / Sky `23039c2f-…` / demo `36339c2f-…`, normalización dashless).
- `fetchPageStatus(pageId)` — `src/lib/space-notion/notion-client.ts` (lee `Estado` + `parent.data_source_id`, read version 2026-03-11).
- `isNotionStatusTransitionsWebhookEnabled()` — `src/lib/notion-metrics/status-transitions-flags.ts`.

**⚠️ Reglas duras (no-interferencia con flujos de métricas existentes)**:

- **NUNCA** quitar el kill-switch flag `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` ni cambiar su default OFF. Es lo que garantiza cero actividad al merge.
- **NUNCA** confiar el `parent.id` del webhook para decidir workspace. El shape (DS vs DB id) no está garantizado. La resolución autoritativa es `parent.data_source_id` del GET de la página (consumer). El handler solo hace demo-drop best-effort.
- **NUNCA** persistir en `task_status_transitions` una tarea cuyo workspace NO resuelva a Efeonce/Sky. `resolveProductiveWorkspace` null → SKIP. Garantía anti-contaminación (la suscripción amplia trae demo + otros teamspaces).
- **NUNCA** escribir a Notion desde este pipeline (captura = solo GET re-fetch read-only). El writeback es TASK-916.
- **NUNCA** reusar el secret HMAC del demo ni el integration user id genérico. Secret productivo dedicado + `NOTION_PRODUCTIVE_INTEGRATION_USER_ID` separado.
- **NUNCA** consumir el evento `notion.task.page_change_signal` desde el consumer demo (filtra `metadata.demo_mode === true`) ni viceversa. Eventos + tablas físicamente separados.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'status_transition_capture' | 'notion-status-transitions-webhook' } })`.
- **NUNCA** modificar `notion-bq-sync` (flujo legacy de métricas) desde este pipeline — no comparte código; sigue intacto.
- **SIEMPRE** que emerja un teamspace productivo nuevo, agregarlo a `PRODUCTIVE_TAREAS_DATA_SOURCE_IDS` (el consumer lo resuelve automáticamente).

**Reliability signals** (subsystem `delivery`): `notion.task_status_transitions.ingestion_lag` (lag) + `notion.task_status_transitions.refetch_failed` (dead_letter). Steady=0.

**Estado**: Slices 1-5 shipped + verificados en `develop` (flags OFF). Captura (1-2) + BQ materializer reactivo (3) + `cycle_time_days` canónica de-correlada (4, verificada contra BQ real ambas ramas) + `cycle_time_slo_pct` (5). El flip de `cycle_time_days`/`cycle_time_slo_pct` (flags ON) está gated por shadow mode 7d + arch-architect 4-pillar — NO flipeado. **Slice 6 (backfill histórico) BLOQUEADO por falta de fuente**: la API Notion no expone property-history y los snapshots BQ son stale (4 días mar–abr). Path canónico = forward-accumulation (activar captura → esperar 1 período completo → flip). Ver TASK-912 spec Delta 2026-05-21.

**Spec canónica**: `docs/tasks/in-progress/TASK-912-ico-status-transition-webhook-ingestion-and-bq-formula.md`. Pattern fuente: demo siblings TASK-910/913/914.

### RpA V2 productive compute + writeback invariants (TASK-916, desde 2026-05-21)

Siblings PRODUCTIVOS (Efeonce + Sky) del pipeline RpA V2 demo (TASK-913/914). Clonado mecánico + repointeo, NO rediseño. Carril paralelo invisible al productive durante la migración Strangler (ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`). **Aditivo + writeback flag OFF por default → cero impacto en métricas/Notion productivo al merge.**

**Pipeline canónico** (sibling físicamente separado del demo):

```text
Notion edit status (Efeonce/Sky) → captura prod TASK-912 (notion-status-transition-capture)
  → emite notion.task.status_transitioned (con from/to, workspaceId resuelto autoritativo)
    → notionRpaComputeProjection (reactivo): calculateRpaV2 sobre task_status_transitions
      → persiste snapshot en task_rpa_snapshots (CHECK workspace_id IN ('efeonce','sky'))
      → emite chain event notion.task.metrics_writeback_requested cuando rpaDataStatus='valid'
        → notionRpaWritebackProjection (reactivo, GATED NOTION_RPA_WRITEBACK_ENABLED default OFF):
          re-read PG defensive → PATCH [GH] RpA v2 vía patchNotionPage/NOTION_TOKEN → mark written
```

**Diseño simétrico sibling-pattern** (mismo invariante que TASK-913): cada pieza prod es 1:1 mappable a su sibling demo — la lógica difícil ya está peleada. Diferencias: tabla `task_rpa_snapshots` (no `_demo`), evento sin `.demo`, property `[GH] RpA v2` (coexiste con legacy `RpA`), token `NOTION_TOKEN` (no el demo separado), gate `NOTION_RPA_WRITEBACK_ENABLED`.

**Helpers/archivos canónicos**:

- `src/lib/notion-metrics/calculate-rpa-v2.ts` (reusado tal cual — ya lee `task_status_transitions`, NO variante prod).
- `src/lib/space-notion/notion-client.ts` → `patchNotionPage(pageId, properties)` (mirror de `patchNotionDemoPage`, vía `notionRequest`/`NOTION_TOKEN`/`2022-06-28`).
- `src/lib/sync/projections/notion-rpa-compute.ts` + `notion-rpa-writeback.ts`.
- `src/lib/reliability/queries/notion-metrics-rpa-signals.ts` (`notion.metrics.writeback_dead_letter` + `notion.metrics.writeback_lag`, subsystem `delivery`, steady=0).
- Migration `20260521182825984_task-916-rpa-v2-snapshots.sql`.

**⚠️ Reglas duras**:

- **NUNCA** hacer drift entre las firmas de los siblings prod (`notion-rpa-compute`, `notion-rpa-writeback`) y los demo. Si cambia uno, reflejar en el otro. NO mezclar la lógica prod/demo en el mismo módulo (`if (isDemo) {...}` prohibido — siblings físicamente separados es el patrón canónico).
- **NUNCA** invocar `calculateRpaV2Demo` desde el compute prod ni `calculateRpaV2` desde el demo. Mismo para tablas: prod escribe `task_rpa_snapshots`, demo `task_rpa_demo_snapshots`. CHECK constraints PG-side enforce.
- **NUNCA** quitar el gate `NOTION_RPA_WRITEBACK_ENABLED` ni cambiar su default OFF. Es lo que garantiza cero escrituras a Notion productivo hasta TASK-917 Flip A.
- **NUNCA** confiar el `rpaValue` del payload del chain event en el writeback. SIEMPRE re-read del snapshot por `snapshotId` desde `task_rpa_snapshots` (defensive re-read, pattern TASK-771).
- **NUNCA** filtrar el compute prod solo por workspace sin chequear `demo_mode !== true` (anti-coersion strict), ni viceversa. Defense in depth dual.
- **NUNCA** crear formula property nueva en Notion para RpA — boundary canónico (Notion = OS, Greenhouse = motor). El productivo escribe `[GH] RpA v2` read-only para operadores; coexiste con `RpA` legacy (NO se toca durante la migración Strangler).
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'rpa_compute' | 'rpa_writeback' } })`.
- **NUNCA** activar `NOTION_RPA_WRITEBACK_ENABLED=true` sin: (a) crear la propiedad `[GH] RpA v2` en Efeonce/Sky (NO existe aún — verificado 2026-05-21), (b) los 8 stop-gates del ADR Strangler, (c) ~3-4 semanas de captura acumulada vía TASK-912. Eso es TASK-917 Flip A.
- **SIEMPRE** que el compute persista snapshot pero el chain event emit falle, NON-blocking: el snapshot persistido es source of truth; el signal `writeback_lag` detecta el pending overdue.
- **SIEMPRE** que emerja una métrica V2 nueva (OTD, FTR, etc.) con writeback productivo, replicar este patrón sibling (compute + writeback + snapshot table + 2 signals + chain event), NO improvisar.

**Echo-loop**: el writeback escribe un number (`[GH] RpA v2`), NO el status. El webhook que dispara → captura prod re-fetchea STATUS → unchanged → noop → no `status_transitioned` → no recompute. Sin loop.

**⚠️ Característica de MUESTREO canónica (no es bug — BUG-CLASS-003, canonizada 2026-05-21)**: la captura de transiciones es un **sistema de muestreo**, no un registro continuo. Dos hechos: (1) el webhook de Notion NO trae valores (solo IDs de propiedad — payload real verificado `updated_properties:["PyIi","notion://tasks/status_property"]`) → el consumer re-fetchea y obtiene solo el estado ACTUAL; (2) el dispatcher reactivo (`reactive-consumer.ts` Phase B) coalescia todos los eventos de la misma página en UN `refresh()` por batch (~5 min). Consecuencia: **transiciones más rápidas que la cadencia (o ida-y-vuelta al mismo estado dentro de un batch) se COLAPSAN** — solo se registran las que persisten a través de ≥1 read reactivo. Estados intermedios nunca observados son irreconstruibles (Notion no expone property-history).

- **NUNCA** tratar esto como bug a "arreglar" dentro de webhook+re-fetch — es inherente (no se puede reconstruir un estado no muestreado). Quitar el coalescing NO lo arregla (dos eventos post-cambios re-fetchean el mismo estado). La única mejora sería re-fetch al llegar el webhook (gap ~segundos), pero rompe el decoupling outbox (TASK-771) y sigue siendo muestreo. **YAGNI hasta que la paridad lo justifique.**
- **Aceptable para RpA**: las correcciones reales son client-driven sobre horas/días → siempre persisten a través de batches → se capturan bien. El subconteo solo ocurre con toqueteo sub-minuto (no es uso real). El demo de TASK-914 (RpA=2) funcionó porque las transiciones estaban espaciadas en batches distintos.
- **Protección del bono (Flip B)**: gate `shadow_paridad_rpa ≥95%` 30 días + sign-off HR. Si el subconteo fuera material, la paridad lo detecta antes de mover plata (RpA bajo = mejor → subcontar infla calidad → el gate lo frena). Flip A (display) no toca el bono.
- **Para DEMOS/tests**: para verificar que una corrección se captura, **espaciar las transiciones entre batches reactivos** (o verificar la captura del paso N antes del N+1). Toqueteo sub-minuto colapsa y NO es representativo. Verificado live 2026-05-21: demo espaciado → `[GH] RpA v2=1`; toqueteo en segundos → 0 (colapso esperado).
- **SIEMPRE** que se canonice un fix de captura vía webhook+re-fetch, documentar JUNTO al fix esta característica de muestreo. Lección dura de TASK-916: BUG-CLASS-002 documentó el fix re-fetch pero NO su límite residual → se re-descubrió costosamente en TASK-916. El fix y su límite de muestreo se documentan **juntos** o el aprendizaje se pierde.

**Estado**: V1.0 SHIPPED en `develop` 2026-05-21 (writeback flag OFF). Migration aplicada + tipos regenerados. 44 tests focales + full suite 5197 passed + tsc 0 + lint 0 + build ✓. Smoke PG real: tabla queryable 0 rows, signals dead_letter/lag = 0, CHECK rechaza `workspace='demo'`. Activación → TASK-917 Flip A.

**Spec canónica**: `docs/tasks/complete/TASK-916-rpa-v2-productive-compute-writeback.md`. Pattern fuente: demo siblings TASK-913/914.

### FTR writeback invariants (TASK-903, sibling de TASK-916, desde 2026-05-24)

Pipeline FTR writeback PRODUCTIVO (Efeonce + Sky) — **clone mecánico de TASK-916 RpA repointeado a FTR**, NO rediseño. FTR es **derivada pura de RpA** (`FTR pass ⇔ RpA.value === 0`); el compute delega a `calculateFtr` (TASK-909, que delega a `calculateRpaV2`). Default flag OFF → cero escrituras a Notion al merge.

**Pipeline canónico** (siblings físicamente separados del RpA):

```text
notion.task.status_transitioned (captura TASK-912)
  → notionFtrComputeProjection: calculateFtr → persist task_ftr_snapshots → emit notion.task.ftr_writeback_requested (solo si ftr_data_status='valid' + pass/fail)
    → notionFtrWritebackProjection (gated NOTION_FTR_WRITEBACK_ENABLED default OFF):
      re-read PG defensive → PATCH select [GH] FTR (Pass/Fail) → mark written
```

**Archivos canónicos**:
- `src/lib/sync/projections/notion-ftr-compute.ts` + `.test.ts`
- `src/lib/sync/projections/notion-ftr-writeback.ts` + `.test.ts`
- `migrations/20260524200315533_task-903-ftr-snapshots.sql` (`task_ftr_snapshots`, CHECK workspace_id IN efeonce/sky, append-only triggers, writeback cols mutables)
- `src/lib/reliability/queries/notion-metrics-ftr-signals.ts` (2 signals)
- `EVENT_TYPES.notionTaskFtrWritebackRequested` ('notion.task.ftr_writeback_requested') v1
- `NotionPropertyValue.select` (forward-compat, extendido por esta task)

**⚠️ Reglas duras** (mirror TASK-916):

- **NUNCA** recomputar el veredicto FTR inline — toda lectura vía `calculateFtr`. Lint rule `greenhouse/no-inline-ftr-calculation` (warn) lo bloquea.
- **NUNCA** crear formula property en Notion para FTR — compute en Greenhouse + writeback select `[GH] FTR`.
- **NUNCA** confiar el `ftrValue` del payload del chain event en el writeback — re-read del snapshot desde `task_ftr_snapshots` por `snapshot_id` (defensive re-read, pattern TASK-771).
- **NUNCA** escribir a `[GH] FTR` con el flag OFF. Default OFF + override per-cliente `NOTION_FTR_WRITEBACK_ENABLED_<EFEONCE|SKY>`.
- **NUNCA** emitir el chain event cuando `ftr_data_status != 'valid'` (low_confidence/unavailable no se escriben — degraded honest, mirror RpA `valid`-only).
- **NUNCA** drift entre los siblings FTR y RpA (compute/writeback) — clone + repoint, NO `if (isFtr)`. Físicamente separados.
- **NUNCA** invocar `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'ftr_compute' | 'ftr_writeback' } })`.

**Paridad**: NO existe `notion.metrics.shadow_paridad_ftr` standalone — FTR es derivada pura de RpA y no tiene fórmula Notion legacy que diffear; su paridad queda cubierta por `notion.metrics.shadow_paridad_rpa` (TASK-916) por construcción (RpA paridad ≥95% ⇒ FTR paridad ≥95%).

**Activación (flip `NOTION_FTR_WRITEBACK_ENABLED=true`)** — gated por FTR_V1 §9.1: TASK-916 RpA writeback `enabled` 30d + TASK-912 captura activa + `[GH] FTR` creada en Efeonce/Sky + decisión explícita "FTR explícito vale vs derivar de RpA" (ver TASK-903 "Why This Task Exists").

**Estado**: SHIPPED `develop` 2026-05-24 (flag OFF). Migration aplicada + tipos regenerados. 42 tests focales + tsc 0 + lint 0. Smoke PG real: tabla queryable, CHECK rechaza demo, signals = 0.

**Spec canónica**: `docs/tasks/complete/TASK-903-ftr-writeback-notion-gh-property.md`. Pattern fuente: TASK-916 (RpA productive writeback). Consumer real de `calculateFtr` (TASK-909).

### OTD Bucket Classifier Ownership invariants (TASK-923, M1, desde 2026-05-24)

Greenhouse es el **clasificador autoritativo del bucket OTD** (`on_time` / `late_drop` / `overdue` / `carry_over` / `na`). El cómputo del bucket vive en un helper canónico TS + su espejo BQ — NUNCA en una fórmula Notion. M1 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16: movió el clasificador desde la fórmula Notion `Indicador de Performance` (→ synced `performance_indicator_code`) a Greenhouse en **modo paridad** (freeze-off, replica la semántica cruda actual), escrito a la columna shadow `gh_otd_bucket`. Es aditivo: el bono sigue leyendo `otd_pct` legacy intacto.

**Helpers canónicos** (`src/lib/notion-metrics/`):

- `classifyOtdBucket(inputs: TaskInputsForOtdBucket) → OtdBucketResult` — pure helper canonical, **freeze-aware togglable** (M1 = freeze off / paridad; M2 = freeze on). Un solo helper, no dos. server-only. Importa `task-status-canonical.ts` (Aprobado/Cancelado/Archivado + `normalizeTaskStatus`).
- `buildOtdBucketSql(cols, frozenDaysSql='0') → string` — espejo BQ CASE del helper. TS es source of truth; la expresión BQ se valida con test de paridad TS↔SQL.
- `OTD_BUCKET_FORMULA_VERSION='otd_bucket_v1.0'` en `otd-bucket-types.ts`.
- `isOtdClassifierGhShadowEnabled()` (`OTD_CLASSIFIER_GH_SHADOW_ENABLED`, default OFF) en `otd-classifier-flags.ts`.

**Columna shadow** `gh_otd_bucket` (STRING): en `v_tasks_enriched` (VIEW additive) + `delivery_task_monthly_snapshots` (DDL + `REQUIRED_COLUMN_MIGRATIONS`). La materialize la inserta vía `buildOtdBucketSql`.

**Reliability signal** `notion.metrics.shadow_paridad_otd_classifier` (PG-based, moduleKey `delivery`, kind `drift`): compara `performance_indicator_code IN ('on_time','late_drop')` legacy vs el recompute del helper, **solo sobre tareas COMPLETADAS** (buckets estables now()-independientes), últimos 90d. Severity: mismatch ≤2% ok / ≤10% warning / >10% error.

**⚠️ Reglas duras**:

- **NUNCA** computar el bucket OTD leyendo la fórmula Notion `Indicador de Performance` ni `performance_indicator_code` para cómputo nuevo. El bucket canónico se computa con `classifyOtdBucket`. `performance_indicator_code` queda como display/paridad legacy hasta ≥90d post-cutover M3.
- **NUNCA** crear un helper de clasificación OTD paralelo. Si M2 (TASK-922 freeze) o futuros movimientos necesitan más semántica, **extender `classifyOtdBucket`** (es freeze-aware togglable by design) + extender `buildOtdBucketSql`. Un solo helper.
- **NUNCA** modificar `classifyOtdBucket` sin actualizar paralelamente `buildOtdBucketSql` + el test de paridad TS↔SQL. La expresión BQ debe espejar el helper byte-semánticamente.
- **NUNCA** el bono lee `gh_otd_bucket` antes de M3 (cutover gateado: ≥30d shadow + sign-off HR). M1/M2 escriben solo la columna shadow que el bono NO lee → matemáticamente no alteran `otd_pct`.
- **NUNCA** medir paridad M1 sobre tareas abiertas (`overdue`/`carry_over`). Esos buckets dependen de `now()` + del gate `esMesActual` → la divergencia es esperada, no falla. La signal mide solo completadas (`on_time`/`late_drop`).
- **NUNCA** subir `OTD_CLASSIFIER_GH_SHADOW_ENABLED` a un comportamiento que cambie un número que el bono ve. El flag es de observabilidad/shadow; el cutover real del bono es M3 (futura task gateada).
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'otd_classifier_*' } })`.
- **SIEMPRE** que emerja un movimiento downstream (M2 freeze, M3 cutover), reusar el helper canónico + columna shadow + signal de paridad. Cero plumbing nuevo.

**Spec canónica**: `docs/tasks/complete/TASK-923-greenhouse-owns-otd-bucket-classifier-parity-shadow.md`. ADR: `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 (Delta 2026-05-24 — M1 shipped). Desbloquea M2 (TASK-922). Patrón fuente: TASK-908 (calculate-cycle-time + cycle-time-formula TS↔SQL mirror), TASK-901 (RpA helper canonical), Delivery Metrics Ownership Boundary (Notion = OS / Greenhouse = motor).

### Due-Date Change Capture invariants (TASK-921, M0, desde 2026-05-24)

`greenhouse_delivery.task_due_date_changes` es el log **append-only** canónico de cambios de fecha límite + motivo de reprogramación. M0 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16 — foundation que TASK-922 (M2 freeze/atraso imputable) consume. Reemplaza el casillero único Notion `Fecha límite original` + fórmula `Días reprogramados` por un historial real (cuántas veces, de→a, por qué). NO computa atraso — eso es TASK-922.

**Captura canónica** (reusa infra TASK-912, NO segundo webhook):

- El webhook `notion-status-transitions` (TASK-912) ya emite `notion.task.page_change_signal` para CUALQUIER cambio de propiedad. La captura de fecha es un **2do consumer** de ese evento (`notionDueDateChangeCaptureProjection`), NO un endpoint/HMAC/suscripción nueva.
- Re-fetch canónico (`fetchPageDueDate` en `notion-client.ts`, sibling de `fetchPageStatus`): lee `Fecha límite` + `Fecha límite original` (baseline seed) + select `Motivo de reprogramación` (confirmación operador) + estado + `parent.data_source_id` (workspace autoritativo). NUNCA confía el payload del webhook.
- **Flag propio** `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF) en `status-transitions-flags.ts`. Load-bearing: el webhook de TASK-912 YA está ON en prod → sin flag propio el merge capturaría inmediato. OFF → consumer no-op.

**Motivo (ADR §5/§6)**: `inferRescheduleReason()` (`reschedule-reason-inference.ts`, pure) infiere `reason_code` desde `status_at_change` + transiciones recientes. Partición disjunta: `client_requested`/`scope_change` extienden la fecha justa; `external_blocker` lo maneja el freeze; `internal_not_prioritized`/`unspecified` no extienden. El operador confirma/corrige en Notion → `reason_source='operator_confirmed'`.

**⚠️ Reglas duras**:

- **NUNCA** crear un segundo webhook endpoint/HMAC/suscripción para capturar cambios de fecha. Reusar `notion.task.page_change_signal` con un consumer. Lo mismo para futuras propiedades capturables (otra dimensión Notion) — fan-out del mismo evento.
- **NUNCA** confiar el payload del webhook para el valor de la fecha. Siempre re-fetch (`fetchPageDueDate`). Notion no manda valores (notion-platform Pillar 1).
- **NUNCA** persistir en `task_due_date_changes` una tarea cuyo workspace no resuelva a Efeonce/Sky (`resolveProductiveWorkspace` null → skip). Garantía anti-contaminación de la suscripción amplia.
- **NUNCA** usar el motivo inferido como confirmado — `reason_source` distingue; el bono (TASK-922+) SOLO usa `operator_confirmed`.
- **NUNCA** inferir `scope_change` (indistinguible de `client_requested` desde señales de estado). Solo el operador lo confirma. La inferencia client-driven default es `client_requested`.
- **NUNCA** computar `days_delta` ni edad de filas con `EXTRACT(EPOCH FROM (date - date))` (PG lo rechaza — gate TASK-893). Usar `date - date = integer` o computar en TS (`computeDaysDelta`).
- **NUNCA** DELETE/UPDATE las columnas de observación (fechas, status, changed_at, source_event_id) — append-only (trigger PG). SOLO `reason_code`/`reason_source`/`reason_confidence` son mutables (confirmación operador).
- **NUNCA** computar atraso/fecha justa/bucket en esta capa — eso es TASK-922 (M2). M0 solo captura.
- **NUNCA** invocar `Sentry.captureException` directo — `captureWithDomain(err, 'integrations.notion', { tags: { source: 'due_date_change_capture' } })`.
- **SIEMPRE** que el bono o un consumer downstream necesite "la fecha justa / el motivo de una reprogramación", leer `task_due_date_changes` (el motivo confirmado), NO el casillero `Fecha límite original` legacy.

**Deferido a follow-up**: writeback de la sugerencia inferida a Notion (mostrar el `[Motivo sugerido]` en la propiedad) — mirror del patrón TASK-927. El path de confirmación-read del operador SÍ está incluido en M0.

**Spec canónica**: `docs/tasks/complete/TASK-921-due-date-change-capture-reschedule-reason.md`. Migration: `20260524100613341_task-921-task-due-date-changes.sql`. ADR §16.8 (Delta 2026-05-24 — M0 shipped). Patrón fuente: TASK-908/912 (task_status_transitions + captura sibling), TASK-742 (defense-in-depth).

### Attributable Lateness invariants (TASK-922, M2, desde 2026-05-24)

El **atraso imputable** mide SOLO el slip atribuible a la agencia: días posteriores a la **fecha justa** menos el tiempo en estados de **freeze**. M2 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16 — corrige el bucket OTD que hoy refleja atraso bruto (causa raíz ISSUE-081). Construido en **shadow** (flag OFF); el bono NO cambia hasta el cutover gated (M3).

**Fórmula canónica** (ADR §4): `fecha_justa = COALESCE(original, vigente) + Σ extensiones FORWARD confirmadas ∈ {client_requested, scope_change}`; `atraso = max(0, días(fin, fecha_justa) − freeze posterior)`. Mirror de `calculateCycleTime` con 3 diferencias: reloj en fecha justa, set de exclusión = 3 estados de freeze ({Listo para revisión, Bloqueado, En pausa}), solo intervalos posteriores. **El set de exclusión del atraso DIFIERE del de Cycle Time** (que solo excluye `Bloqueado`).

**Helpers canónicos**:

- `calculateAttributableLateness(inputs)` (`src/lib/notion-metrics/calculate-attributable-lateness.ts`, pure, server-only) — source of truth del atraso. Delega el bucket a `classifyOtdBucket`.
- `classifyOtdBucket(... applyMonthGate: false)` — M2 reusa el clasificador M1 (single source of truth) con el gate de mes apagado (ADR §16.5). NO crear bucket classifier nuevo.
- Consumer `notionAttributableLatenessComputeProjection` (trigger `notion.task.status_transitioned`) → UPSERT `greenhouse_delivery.task_attributable_lateness_shadow`. Flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (default OFF).

**⚠️ Reglas duras**:

- **NUNCA** extender la fecha justa por motivos que ya maneja el freeze (`external_blocker`/revisión/pausa) — doble descuento (ADR §5). Solo `client_requested`/`scope_change` extienden.
- **NUNCA** usar motivo inferido (sin confirmar) para el bucket que afectará el bono. Solo `reason_source='operator_confirmed'`. Sin confirmar → `legacy_unknown` (conservador, mide vs vigente).
- **NUNCA** computar el output M2 en BQ ni crear un mirror BQ del freeze. El freeze multi-ciclo (3-estado, clamp post-fairDeadline) no es un CASE BQ mantenible en paridad — el helper TS es source of truth (patrón RpA V2: helper + snapshot PG + consumer reactivo). NO clobbear `gh_otd_bucket` de M1.
- **NUNCA** flipear `ATTRIBUTABLE_LATENESS_OTD_ENABLED=true` ni cutover del bono sin 8 stop-gates + sign-off HR + ≥30d shadow verde (ADR §16.2 M3).
- **NUNCA** recompute en consumers — leer el helper / shadow table canónicos.
- **NUNCA** computar días con `EXTRACT(EPOCH FROM (date - date))` (gate TASK-893); el helper computa en TS (`MS_PER_DAY`).
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery', ...)`.
- **SIEMPRE** documentar que el set de exclusión del atraso (3 estados) difiere del de Cycle Time (1 estado).
- **SIEMPRE** degradación honesta: sin transitions → `unavailable` (no 0 falso); reschedule extending sin confirmar → `legacy_unknown`.

**Reliability signals** (subsystem `delivery`): `delivery.attributable_lateness.shadow_paridad` (% buckets que el freeze cambia; ok ≤30%, warning >30% sanity) + `delivery.attributable_lateness.freeze_reschedule_overlap` (invariante anti-doble-descuento, steady=0). `delivery.reschedule.pending_reason_confirmation` se reusa de TASK-921.

**Spec canónica**: `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` + ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §4-7, §16.9. Task: `docs/tasks/complete/TASK-922-attributable-lateness-helper-otd-bucket-shadow.md`. Migration: `20260524104127717`. Patrón fuente: TASK-908 (calculate-cycle-time interval pattern), TASK-913/916 (RpA V2 helper + snapshot + consumer), TASK-923 (classifyOtdBucket).

### ICO Client Inclusion — data-driven + onboarding gobernado invariants (TASK-1171, desde 2026-06-19)

La inclusión de un cliente en ICO (cálculo + reportes + activación + verificación) es **100% data-driven + gobernada + escalable: CERO código por cliente nuevo**. Causa raíz (2026-06-19): Grupo Berel no aparecía en ICO (rollup ni agency report) y cada cliente nuevo requería un fix por código — viola Full API Parity (`GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`). Aplica los patrones canónicos existentes (data-driven SSOT, outbox→reactive, capability⇒grant+coverage), NO inventa primitives nuevas → no requiere ADR nuevo.

**1. Cálculo data-driven (Slices 1, 1b, 2):**

- **Coverage-gap en el materializer** (`buildMergeSql`, `materialize-sql-builders.ts`): el MERGE incremental-delta materializa una entidad aunque sus ediciones no crucen el `deltaCutoff`, si NO existe fila de cobertura para ese `(keyColumns, período)`. Correlación qualified `cov.<key> = grp.<key>` (el subquery agrupado se aliasa `grp`) — sin el alias, BQ resuelve el RHS al propio `cov` y el coverage-gap se vuelve no-op (un cliente nuevo nunca entra). Cualquier cliente never-materialized entra solo.
- **Período vigente siempre FULL** (`materialize-orchestrator.ts`): el incremental-delta deja STALE al mes en curso (sus ediciones no cruzan el cutoff que avanza cada noche → OTD congelado al inicio del mes). El período actual (`new Date()` year/month) se materializa con `deltaCutoff=null` (full); el delta solo aplica a períodos CERRADOS. Aplica a los 5 rollups simétricamente.
- **Agency report data-driven** (`shared.ts` `buildAgencyReportScopeSql` + `isAgencyReportIncludedSpace`; `materialize.ts` `scoped_report_snapshots`): incluye TODO cliente/espacio real, solo excluye demo. El hardcode previo a `{efeonce, sky}` era deuda de cuando había 2 clientes. Columnas legacy `efeonce_tasks_count`/`sky_tasks_count` preservadas (CASE-filtered, aditivo).

**2. Activación gobernada (Slice 3):** `enableClientIcoSync` (`src/lib/ico-engine/enable-client-ico-sync.ts`) — command transport-agnóstico (endpoint/Nexa/MCP/CLI) que activa el sync Notion→ICO de un cliente YA conectado: `can('delivery.ico.sync.enable')` + resolución client/space + tx `FOR UPDATE` + flip `sync_enabled=TRUE` en `greenhouse_core.space_notion_sources` + outbox `space_notion_source.ico_sync_enabled` (on-transition). Idempotente (`alreadyEnabled`). Endpoint `POST /api/delivery/ico/enable-sync`. Reemplaza el path admin-coarse `/api/integrations/notion/register` (que NO tiene capability/audit/outbox; se mantiene por backward-compat).

**3. Propagación reactiva a BigQuery (Slice 4):** el command corre en Vercel (**BQ read-only**); la propagación del flip a BQ `greenhouse.space_notion_sources` (que el pipeline Notion→BQ lee para tomar al cliente) la hace el reactive consumer `space_notion_source_ico_sync_bq` (`src/lib/sync/projections/`, domain `delivery`, scheduler `ops-reactive-delivery`) desde **ops-worker (BQ write)**: re-read PG por `source_id` + MERGE idempotente por `space_id`, retry/dead-letter.

**4. verify-ICO preflight (Slice 5):** `getClientIcoSyncStatus` (`src/lib/ico-engine/get-client-ico-sync-status.ts`) — read gobernado `can('delivery.ico.sync.read')` con escalera `not_connected → connected_not_enabled → enabled_not_calculating → calculating` (PG `space_notion_sources` + BQ `metric_snapshots_monthly` per-cliente). Detecta "configurado ≠ fluyendo". Endpoint `GET /api/delivery/ico/sync-status?clientId=|spaceId=`. Honest degradation (`calculating=null` si BQ falla).

**⚠️ Reglas duras**:

- **NUNCA** hardcodear una lista de clientes (`{efeonce, sky}` o IDs) en el rollup, agency report o cualquier consumer ICO. Inclusión = data-driven (cualquier cliente/espacio real, demo excluido). El único `sync_enabled=FALSE` legítimo permanente es **Greenhouse Demo** (NUNCA activarlo).
- **NUNCA** materializar el período vigente con incremental-delta (`deltaCutoff != null`) — congela el mes en curso. Solo períodos cerrados usan delta.
- **NUNCA** escribir `sync_enabled=TRUE` por SQL inline / endpoint sin capability para activar ICO de un cliente — usar `enableClientIcoSync` (capability + audit + outbox). El `register` legacy queda solo para backward-compat.
- **NUNCA** escribir BigQuery desde un route handler Vercel (es BQ read-only) — la propagación del flip va por el outbox `space_notion_source.ico_sync_enabled` → reactive consumer en ops-worker. BQ **read** desde Vercel sí es válido.
- **NUNCA** quitar el alias `grp` ni dejar la correlación del coverage-gap sin qualificar (`cov.<key> = <key>` se vuelve no-op silencioso).
- **NUNCA** dar a una projection reactiva un `extractScope` SIN el período cuando refresca data per-período. La projection `agency_performance_reports` (serving del agency report) coalescía por `entityId='agency'` → eventos de meses distintos colapsaban en un scope y el refresh usaba el payload de OTRO período → el mes vigente nunca refrescaba (serving stale 610/2-seg aunque BQ tenía 694/3-seg con Berel; el portal lee serving → no mostraba Berel). Scope canónico = `${reportScope}:${periodYear}:${periodMonth}`. El reader (`performance-report.ts`) además enriquece labels de clientes space-only (sin fila en `greenhouse.clients`, p.ej. Berel) desde `greenhouse_core.spaces.space_name` (PG, en Vercel).
- **SIEMPRE** seedear `delivery.ico.sync.enable`/`delivery.ico.sync.read` con su grant en `runtime.ts` + seed `capabilities_registry` en el mismo PR (guard `capability-grant-coverage.test.ts`).

**Reliability signal** (subsystem `delivery`): `delivery.ico.client_absent_from_org_rollup` (`src/lib/reliability/queries/ico-organization-rollup-coverage.ts`) — clientes en `greenhouse_delivery.tasks` (mes vigente) ausentes de `greenhouse_serving.ico_organization_metrics`. steady=0 (warning 1-3 / error >3; unknown si source vacío).

**Capabilities**: `delivery.ico.sync.enable` (update, grant EFEONCE_ADMIN ∪ EFEONCE_OPERATIONS ∪ EFEONCE_ACCOUNT) · `delivery.ico.sync.read` (read, grant route_group internal ∪ EFEONCE_ADMIN). **Outbox event**: `space_notion_source.ico_sync_enabled` (aggregate `space_notion_source`).

**Spec canónica**: `docs/tasks/in-progress/TASK-1171-ico-client-inclusion-systemic-full-api-parity.md` + `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`. Migrations: `20260619122238123` (enable cap), `20260619133753393` (read cap). Patrón fuente: outbox→reactive (TASK-773), data-driven SSOT, capability⇒grant+coverage (TASK-873/935).
