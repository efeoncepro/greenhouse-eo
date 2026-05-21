# TASK-912 — ICO Status Transition Webhook Ingestion + BQ Formula Update + Backfill (V1.1 follow-up TASK-908 Foundation)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-ICO-METRICS-PROGRESSIVE-MIGRATION`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `TASK-908 V1.0 Foundation ✅ SHIPPED 2026-05-18 (table task_status_transitions + helpers canonical countCorrectionTransitions/calculateCycleTime + reliability signal source_availability). PLUS operador-side requirement: registro de Notion webhook subscription (events 'page.properties_updated' filtrado a property 'Estado' canonical + 'Estado 1' legacy Sky cleanup window) en Notion Developer Console contra endpoint /api/webhooks/notion-status-transitions. PLUS HMAC signing secret persistido en GCP Secret Manager (greenhouse-notion-webhook-signing-secret-efeonce + -sky). PLUS schema cleanup operador-side Notion (Sky property rename Estado 1 → Estado + status options rename Tomado→En curso, En feedback→Cambios solicitados, Detenido→En pausa).`
- Branch: `task/TASK-912-ico-status-transition-webhook-ingestion`
- Legacy ID: `TASK-908 Slices 2/3/4/5/9 deferred → renamed canonical TASK-912 (2026-05-18)`
- GitHub Issue: `none`

## Delta 2026-05-21 — DESBLOQUEADA (parte) + parent TASK-915 + lecciones TASK-914

- **Suscripción webhook Notion: ✅ YA EXISTE** (confirmado operador 2026-05-21) y es **amplia — cubre TODOS los teamspaces** (incluso fuera de Efeonce/Sky). Implicación de diseño DURA: el handler productivo **DEBE filtrar por data source ID canónico** (Efeonce `5126d7d8-…` [verificar], Sky `23039c2f-…` [verificar]) y **NO procesar** el demo (`36339c2f-…`, tiene su propio endpoint `/notion-tasks-demo`) ni otros teamspaces. Sin el filtro, captura transiciones de teamspaces no deseados.
- **Aplicar el re-fetch pattern de TASK-914**: el webhook Notion entrega un **evento single** (no `{events:[]}`) + **sin valores** (solo IDs de propiedad). El handler debe usar `normalizeWebhookEvents` + el consumer re-fetchea la página (source of truth) + deriva `from` de la última transición en PG. Reusar los patrones canonizados en `complete/TASK-914-...` (NO repetir los 5 bugs de la cascada demo).
- **Prerequisito operador-side RESTANTE**: cleanup schema Sky (`Estado 1`→`Estado` + status legacy → canónicos). HMAC signing secret + IAM: aplicar el patrón de TASK-914 (crear secret + grant `secretAccessor` a `greenhouse-portal@` en el mismo paso).
- **Parent**: TASK-915 (umbrella RpA V2 productive cutover). Esta task es el Frente 1 (captura) del programa de dos flips (Flip A display 01/06, Flip B bono 01/07).

## Summary

Cerrar el loop end-to-end del ICO Status Transition Capture pipeline shippeado V1.0 Foundation en TASK-908. Hoy la tabla `greenhouse_delivery.task_status_transitions` existe vacía + helpers canonical (`countCorrectionTransitions`, `calculateCycleTime`) retornan `sourceMode='unavailable'` graceful. Esta task agrega: (a) webhook handler `/api/webhooks/notion-status-transitions` con HMAC validation + dedup + outbox emit (Slice 2), (b) reactive consumer `notion-status-transition-capture` que persiste transitions en PG (Slice 3), (c) BQ formula update `cycle_time_days` en `v_tasks_enriched` consumiendo PG transitions sync materializada (Slice 4), (d) nueva métrica `cycle_time_slo_pct` con threshold 14.2 días default + per-task-type calibration forward-compat (Slice 5), (e) backfill histórico opcional desde Notion page history API (Slice 9). Cuando shipea: el helper `countCorrectionTransitions` empieza a retornar `sourceMode='canonical'` + count real → desbloquea TASK-901 Slice 4 (shadow mode RpA prod) + reliability signal `notion.correction_transitions.source_availability` baja monotónicamente de 100% error → < 5% steady state.

## Why This Task Exists

TASK-908 V1.0 shippeó Foundation canonical (table + helpers + reliability signal + 11 estados CHECK enum + triggers anti-UPDATE/anti-DELETE) en una sola sesión sin requerir coordinación operador-side. Pero el pipeline end-to-end requiere 2 prerequisitos operador-side que NO son agent-side:

1. **Registrar Notion webhook subscription en Notion Developer Console** apuntando a `https://greenhouse.efeoncepro.com/api/webhooks/notion-status-transitions` con events `page.properties_updated` filtered. Requiere humano logueado en Notion workspace owner.
2. **Schema cleanup operador-side en Notion** (Sky rename property `Estado 1` → `Estado` + rename status options legacy `Tomado` → `En curso`, `En feedback` → `Cambios solicitados`, `Detenido` → `En pausa`). Requiere humano operando UI Notion.

Shipear Slices 2-5 sin esos prerequisitos resulta en webhook handler nunca invocado + tabla vacía + métricas degraded silente (peor failure mode que el estado actual donde `sourceMode='unavailable'` es honesto). Cuando los prerequisitos están listos, esta task spawnea + shipea pipeline completo end-to-end.

## Goal

- Webhook handler canonical `/api/webhooks/notion-status-transitions` validando HMAC + dedup vía `notion_webhook_inbox` + echo-loop filter + outbox emit `notion.task.status_transitioned v1` (Slice 2)
- Reactive consumer canonical `notion-status-transition-capture` en ops-worker que persiste cada transition en `task_status_transitions` con idempotency UNIQUE `(task_source_id, source_event_id)` (Slice 3)
- BQ view `v_tasks_enriched.cycle_time_days` actualizada para consumir PG transitions materializadas: INICIO = MIN(transitioned_at WHERE to_status IN canonical 'En curso' + legacy 'Tomado'), FIN = completed_at, descuento Bloqueado (Slice 4)
- Tabla BQ `greenhouse_conformed.task_status_transitions` materializada desde PG via materializer canonical (reuse pattern TASK-900 MERGE incremental)
- Nueva métrica `cycle_time_slo_pct` en `metric-registry.ts` con threshold default 14.2 + helper `getSLOThreshold(taskType?)` forward-compat calibración V2 (Slice 5)
- Script `scripts/notion-metrics/backfill-status-transitions-from-notion-history.ts` para backfill histórico opcional Sky + Efeonce vía Notion API paginada throttled (Slice 9)
- 4 reliability signals nuevos: `notion-status-transitions-ingestion-lag` (Slice 2), `cycle-time-canonical-paridad` shadow mode pre-cutover (Slice 9), `ct-slo-pct-coverage` (Slice 5), `notion-status-transitions-source-availability` baja monotónicamente (signal canonical ya existe TASK-908, esta task lo hace decrecer real)
- Feature flag canonical `CT_DAYS_CANONICAL_FORMULA_ENABLED` (default OFF, controla Slice 4 cutover) + `CT_SLO_PCT_METRIC_ENABLED` (default OFF, controla Slice 5)
- Hard rules canonical agregados a CLAUDE.md sección "ICO Status Transition Foundation invariants" cubriendo webhook handler + materializer BQ + CT SLO%
- Update docs canonical: `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-992 (CT + CT Variance + CT SLO% + OTD%), `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta closing reference

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — ADR canonical Notion = OS / Greenhouse = motor (TASK-908/901/910)
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — 8 stop-gates canonical migration, demo teamspace gate
- `docs/architecture/GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md` — 11 estados canonical universales
- `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 (RpA + Cycle Time + CT SLO% + FTR canonical)
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — conceptual spec, secciones 887-992 (drift por resolver post-shipping)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — webhook handler canonical pattern (HMAC + inbox + outbox emit)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — reactive consumer canonical pattern
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — reliability signal canonical pattern (kind=lag/drift/data_quality + severity matrix)

Reglas obligatorias (canonical hard rules ya en CLAUDE.md):

- **Boundary check Notion vs Greenhouse**: Notion es Task Operating System (capture); Greenhouse es motor de métricas (compute + writeback). Esta task cierra el writeback indirecto via PG materialization.
- **NUNCA** modificar `cycle_time_days` BQ view directamente sin migration + backfill verified + shadow mode 7d paridad signal verde
- **NUNCA** recomputar Cycle Time inline en consumers — toda lógica via `calculateCycleTime` helper canonical TASK-908
- **NUNCA** procesar webhooks Notion sin HMAC validation timing-safe + echo-loop filter (event author == integration user → ACK + drop)
- **NUNCA** persistir transition row sin idempotency UNIQUE `(task_source_id, source_event_id)` — webhook retries son normales
- **NUNCA** shipear Slice 4 (BQ formula cutover) sin Slice 9 (backfill) o shadow mode signal `cycle-time-canonical-paridad` verde 7d con count=0 drift sostenido
- **NUNCA** invocar `Sentry.captureException()` directo en code path notion webhook. Usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'status_transition_webhook' } })`

## Skill: greenhouse-ico, hubspot-greenhouse-bridge (webhook pattern), greenhouse-postgres (materializer PG→BQ)

## Subagent: arch-architect (validar 4-pillar antes de Slice 4 cutover BQ formula)

## Mode: implementation

## Dependencies & Impact

**Depende de**:

- **TASK-908 V1.0 Foundation ✅ SHIPPED 2026-05-18** — tabla `task_status_transitions` + helpers + reliability signal. Sin Foundation, esta task no aplica.
- **Operador-side: Notion webhook subscription registrada** — humano logueado en Notion Developer Console workspace owner debe registrar subscription apuntando a `/api/webhooks/notion-status-transitions` con events `page.properties_updated` filtered a property `Estado` canonical. Requiere también HMAC signing secret persistido en GCP Secret Manager (`greenhouse-notion-webhook-signing-secret-efeonce` + `-sky`).
- **Operador-side: schema cleanup Notion** — Sky workspace owner debe rename property `Estado 1` → `Estado` + rename status options legacy (`Tomado` → `En curso`, `En feedback` → `Cambios solicitados`, `Detenido` → `En pausa`). Sin este cleanup el webhook handler tolera legacy variants ~1-2 días pero después reliability signal alerta drift sostenido.
- **TASK-910 Notion Demo Teamspace** — gate canonical de testing backfill paginación Notion API antes de tocar Efeonce/Sky productivo. Sin demo teamspace shipped + 4 semanas runtime verde, NO ejecutar Slice 9 backfill prod.

**Impacta a**:

- **TASK-901 Slice 4 (shadow mode RpA prod)** — bloqueada hasta que `countCorrectionTransitions` retorne `sourceMode='canonical'` con count real (post Slice 3 deployment + webhook activo capturando eventos reales).
- **TASK-909 (FTR canonical)** — calculateFtr delega a calculateRpa que delega a countCorrectionTransitions. Mismo desbloqueo que TASK-901.
- **Dashboards Pulse + ICO + Person 360** — cuando Slice 4 + Slice 5 shipen, el chart "Cycle Time" baja ligeramente (fórmula canonical más precisa) + emerge nueva métrica CT SLO% disponible.

**Archivos owned por esta task**:

- `src/lib/webhooks/handlers/notion-status-transitions.ts` (CREAR)
- `src/app/api/webhooks/notion-status-transitions/route.ts` (CREAR)
- `src/lib/sync/projections/notion-status-transition-capture.ts` (CREAR)
- `src/lib/ico-engine/materialize-task-status-transitions.ts` (CREAR — materializer PG→BQ)
- `src/lib/ico-engine/schema.ts` (MODIFICAR — líneas 108-113 actualizar `cycle_time_days` fórmula)
- `src/lib/ico-engine/metric-registry.ts` (MODIFICAR — agregar `cycle_time_slo_pct`)
- `src/lib/notion-metrics/cycle-time-slo-config.ts` (MODIFICAR — extender threshold per-task-type opcional V2 forward-compat)
- `scripts/notion-metrics/backfill-status-transitions-from-notion-history.ts` (CREAR)
- `src/lib/reliability/queries/notion-status-transitions-ingestion-lag.ts` (CREAR)
- `src/lib/reliability/queries/cycle-time-canonical-paridad.ts` (CREAR — shadow mode signal)
- `src/lib/reliability/queries/ct-slo-pct-coverage.ts` (CREAR)
- `src/lib/reliability/get-reliability-overview.ts` (MODIFICAR — wire-up 3 nuevos signals)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

### Slice 0 — Coordinación operador-side prerequisitos (NON-CODE)

**Este slice NO es code — es coordinación operador-side. Documentar status pre-shipping.**

Verificar antes de iniciar Slice 1:

1. **Notion webhook subscription registrada**:
   - Workspace Efeonce → Notion Developer Console → Integrations → Greenhouse Bridge → Webhooks → Add subscription
     - Event types: `page.properties_updated` (filter property=`Estado`)
     - Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/notion-status-transitions`
   - Workspace Sky → mismo proceso, mismo target URL
   - HMAC signing secret generado per workspace (Efeonce + Sky) → persistido en GCP Secret Manager:
     - `gcloud secrets create greenhouse-notion-webhook-signing-secret-efeonce --replication-policy=automatic`
     - `gcloud secrets versions add greenhouse-notion-webhook-signing-secret-efeonce --data-file=<(printf %s '<secret>')`
     - Idem para `-sky`
   - Vercel env vars (Production + Preview): `NOTION_WEBHOOK_SIGNING_SECRET_REF_EFEONCE=greenhouse-notion-webhook-signing-secret-efeonce` + idem Sky

2. **Schema cleanup operador-side Notion** (~1-2 días humano operando UI Notion):
   - Sky property `Estado 1` (typo legacy) → rename a `Estado` canonical
   - Sky status options legacy → rename:
     - `Tomado` → `En curso`
     - `En feedback` → `Cambios solicitados`
     - `Detenido` → `En pausa`
   - Efeonce: verificar 11 estados canonical V1 ya presentes (probablemente OK pre-cleanup)
   - Demo teamspace (TASK-910): mismo schema cleanup verbatim

Sin estos 2 prerequisitos, Slices 1-5 quedan pending + esta task se mantiene `to-do`.

### Slice 1 — Webhook ingestion handler

- Crear `src/lib/webhooks/handlers/notion-status-transitions.ts`:
  - Signature: `handleNotionStatusTransitionWebhook(payload: NotionWebhookPayload, signature: string, workspaceId: string) → Promise<HandlerResult>`
  - HMAC validation: `crypto.timingSafeEqual(computedHmac(signingSecret, body), receivedSignature)` — secret resolved via `resolveSecretByRef` per workspaceId (Efeonce vs Sky)
  - Filter: solo procesar events donde `updated_properties` incluye una property en `STATUS_PROPERTY_NAMES = ['Estado', 'Estado 1']`. `Estado 1` tolerated cleanup window ~1-2 días post-2026-05-17
  - Echo-loop filter: si `event.author.id == GREENHOUSE_NOTION_INTEGRATION_USER_ID` (resolved from env var per workspace), ACK + drop
  - Inbox dedup vía `greenhouse_sync.notion_webhook_inbox` (compartido con TASK-901 si shippea primero): UPSERT row con `event_id`, conflict → drop silent
  - Para cada transition detectada (diff de `previous.status` vs `current.status`):
    - Normalize status via `normalizeTaskStatus` (canonical helper TASK-742 `src/lib/delivery/task-status-canonical.ts`) — la tabla NUNCA almacena strings legacy
    - Emit outbox event `notion.task.status_transitioned v1` con payload:
      ```typescript
      {
        taskSourceId: string,
        fromStatus: string,   // canonical post-normalize
        toStatus: string,     // canonical post-normalize
        transitionedAt: string,  // ISO 8601 UTC
        transitionedBy: string | null,  // notion user id
        sourceEventId: string,  // notion webhook event id (idempotency key)
        workspaceId: 'efeonce' | 'sky'
      }
      ```
- Route handler `src/app/api/webhooks/notion-status-transitions/route.ts`:
  - POST handler invoca handler canonical via `processInboundWebhook` (reuse pattern TASK-706/813)
  - Webhook endpoint declarado en `greenhouse_sync.webhook_endpoints` con `endpoint_key='notion-status-transitions'` + `auth_mode='provider_native'`
- Reliability signal `src/lib/reliability/queries/notion-status-transitions-ingestion-lag.ts`:
  - kind=`lag`, severity=warning si lag > 5s p95 últimas 24h, error si > 30s sostenido
  - subsystem rollup: `delivery` (moduleKey)
  - steady state: < 2s
- Tests:
  - `handler.test.ts`: signature valid/invalid, echo-loop drop, filter por property name, dedup conflict, outbox emit, normalize legacy via `normalizeTaskStatus`
  - Anti-regression: query SQL del handler NO contiene strings legacy hardcoded (`'En feedback'`, `'Tomado'`) — normalize upstream
- Capability granular nueva: `notion.webhook.ingest_status_transitions` (route_group=internal, scope=tenant, EFEONCE_ADMIN + DEVOPS_OPERATOR)

### Slice 2 — Reactive consumer + persist transitions

- Crear `src/lib/sync/projections/notion-status-transition-capture.ts`:
  - `triggerEvents: ['notion.task.status_transitioned']`
  - `extractScope: (event) => ({ taskSourceId: event.payload.taskSourceId })`
  - `refresh: persistStatusTransition` invokes helper
- Helper `persistStatusTransition({taskSourceId, fromStatus, toStatus, transitionedAt, transitionedBy, sourceEventId, workspaceId})`:
  - INSERT row en `greenhouse_delivery.task_status_transitions` con:
    ```sql
    INSERT INTO greenhouse_delivery.task_status_transitions
      (task_source_id, from_status, to_status, transitioned_at, transitioned_by,
       source_event_id, source_workspace, source_quality, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'canonical', NOW())
    ON CONFLICT (source_event_id) WHERE source_event_id IS NOT NULL DO NOTHING
    ```
  - Idempotent — webhook retries → no-op silencioso
  - `source_quality='canonical'` discriminator vs backfill (Slice 5 = `'backfilled'`)
- Wire-up en ops-worker reactive processor (`registerProjection(...)` mismo pattern TASK-771)
- Tests:
  - Insert success path
  - Idempotency on duplicate `source_event_id`
  - Schema CHECK enforcement (from_status/to_status fuera del enum → throw + capture domain)
  - Reactive consumer dispatch via outbox event published

### Slice 3 — BQ materializer PG → conformed (consume canonical PG source)

**arch-architect 4-pillar mandatory pre-shipping**. Patrón canonical reusing TASK-900 MERGE incremental + freshness gate.

- Crear `src/lib/ico-engine/materialize-task-status-transitions.ts`:
  - Source: `greenhouse_delivery.task_status_transitions` PG (canonical)
  - Target: `greenhouse_conformed.task_status_transitions` BQ
  - Pattern: MERGE incremental por `source_event_id` UNIQUE
  - Incremental delta: `WHERE created_at > @sinceTs` (last materialization checkpoint from `ico_materialization_runs`)
  - Freshness gate: `runUpstreamFreshnessGate({requireSignals: ['notion.task_status_transitions.ingestion_freshness']})` antes de materializar
  - Append-only en BQ — NUNCA DELETE rows materializadas (audit trail compliance)
- Cron Cloud Scheduler `ops-ico-materialize-task-status-transitions` (`*/15 min` América/Santiago) → ops-worker endpoint
- Tests:
  - MERGE pattern preserves historical rows
  - Incremental delta filters correctly
  - Freshness gate blocks when upstream signal degraded
- Reliability signal `notion.task_status_transitions.bq_sync_lag` (kind=lag, warning > 30 min, error > 4h, steady < 15 min)

### Slice 4 — BQ formula update `cycle_time_days` canonical

**CRITICAL CUTOVER — requires shadow mode 7d verde + arch-architect 4-pillar + HR/Finance written approval si afecta bonus.**

- Modificar `src/lib/ico-engine/schema.ts:108-113` `cycle_time_days`:
  - Feature flag `CT_DAYS_CANONICAL_FORMULA_ENABLED` (default OFF). Cuando OFF: fórmula legacy. Cuando ON: fórmula canonical V1:
    ```sql
    -- INICIO canonical: MIN transitioned_at to 'En curso' (canonical) + 'Tomado' (legacy tolerated cleanup window)
    -- FIN canonical: DATE(completed_at) o CURRENT_DATE() para tasks open
    -- DESCUENTO Bloqueado: subtract SUM(exit - enter) for intervals where to_status IN ('Bloqueado', 'En pausa', 'Detenido')

    DATE_DIFF(
      COALESCE(DATE(dt.completed_at), CURRENT_DATE()),
      COALESCE(
        (SELECT DATE(MIN(transitioned_at))
         FROM greenhouse_conformed.task_status_transitions
         WHERE task_source_id = dt.task_source_id
           AND LOWER(TRIM(to_status)) IN ('en curso', 'tomado')),
        DATE(dt.created_at)
      ),
      DAY
    ) - COALESCE((
      -- Blocked intervals discount
      SELECT SUM(DATE_DIFF(DATE(exit_at), DATE(enter_at), DAY))
      FROM (
        SELECT
          transitioned_at AS enter_at,
          LEAD(transitioned_at) OVER (PARTITION BY task_source_id ORDER BY transitioned_at) AS exit_at,
          to_status
        FROM greenhouse_conformed.task_status_transitions
        WHERE task_source_id = dt.task_source_id
      )
      WHERE LOWER(TRIM(to_status)) IN ('bloqueado', 'en pausa', 'detenido')
        AND exit_at IS NOT NULL
    ), 0) AS cycle_time_days
    ```
- Tests E2E paridad pre/post-cutover:
  - Dataset 1: tareas SIN transition rows → mismo `cycle_time_days` que legacy fallback `created_at`
  - Dataset 2: tareas CON transitions → `cycle_time_days` ajustado per fórmula canonical (debe ser ≤ legacy en presencia de descuento Bloqueado)
  - Dataset 3: tareas open con transitions → cycle in-progress canonical
- Reliability signal `cycle-time-canonical-paridad.ts` (shadow mode signal):
  - Computa AMBAS fórmulas (legacy + canonical) en paralelo y compara
  - kind=drift, warning > 5% drift rows, error > 20% drift, steady = drift expected solo en presencia de Bloqueado intervals
  - Pre-flip: signal informativo (shadow mode comparando)
  - Post-flip: signal monotónicamente ok (legacy formula deprecated)

### Slice 5 — Nueva métrica `cycle_time_slo_pct`

- Agregar a `metric-registry.ts`:
  ```typescript
  {
    id: 'cycle_time_slo_pct',
    code: 'cycle_time_slo_pct',
    label: '% dentro de SLO de ciclo',
    shortName: 'CT SLO%',
    description: '% de tareas completadas con cycle_time_days ≤ threshold (default 14.2 días, calibrable per tipo de pieza V2)',
    unit: '%',
    granularities: ['monthly', 'weekly'],
    formula: {
      kind: 'percentage',
      numeratorCondition: `(cycle_time_days <= ${getSLOThreshold()})`,
      denominatorCondition: CANONICAL_COMPLETED_TASK_SQL
    },
    thresholds: {
      optimal: { min: 89, max: 100 },
      attention: { min: 75, max: 89 },
      critical: { min: 0, max: 75 }
    },
    higherIsBetter: true,
    icon: 'tabler-gauge',
    color: 'success',
    benchmark: {
      type: 'external',
      label: 'Benchmark industria LATAM',
      source: 'Greenhouse_ICO_Engine_v1.md §A.5.5'
    },
    trust: { sampleBasis: 'completed_tasks', healthyMinSampleSize: 10 }
  }
  ```
- Feature flag `CT_SLO_PCT_METRIC_ENABLED` (default OFF) — cuando ON, métrica se computa + persiste en `metrics_by_*` tables
- Extender `cycle-time-slo-config.ts` con forward-compat V2 per-task-type calibration:
  ```typescript
  // V1: uniform default 14.2 (Engine §A.5.5)
  // V2: per-task-type via lookup table greenhouse_delivery.cycle_time_slo_thresholds_by_type
  export const getSLOThreshold = (taskType?: string | null): number => {
    if (!taskType) return CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS
    // V2: lookup per type (TBD V2 task derivada)
    return CYCLE_TIME_SLO_THRESHOLD_DEFAULT_DAYS
  }
  ```
- Reliability signal `ct-slo-pct-coverage.ts`:
  - kind=data_quality, warning si > 20% sample size < healthyMinSampleSize, steady < 5%
- Tests anti-regresión:
  - Dataset variado de cycle_times (1, 5, 14, 14.2, 15, 30) → % correctos contra threshold 14.2
  - Empty dataset → 0% (no division by zero)
  - All within SLO → 100%

### Slice 6 — Backfill histórico opcional Sky + Efeonce

**Gate canonical pre-shipping**: TASK-910 Notion Demo Teamspace ship + 4 semanas runtime verde — backfill paginación Notion API se prueba en demo primero, NUNCA directo en Efeonce/Sky productivo. Pattern ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1` §3.2.

- Crear `scripts/notion-metrics/backfill-status-transitions-from-notion-history.ts`:
  - Para cada tarea en `greenhouse_delivery.tasks` (filter por workspaceId: 'efeonce' | 'sky' | 'demo'):
    - Fetch page history vía Notion API `GET /v1/pages/{page_id}` con paginación
    - Notion API rate limit: 3 req/sec — throttled vía `p-throttle` o equivalent
    - Reconstruir transition events para `Estado` (canonical) + `Estado 1` (legacy Sky tolerated)
    - Para cada change detected: INSERT en `task_status_transitions` con `source_quality='backfilled'` discriminator
    - Idempotent: UNIQUE `(task_source_id, transitioned_at)` partial constraint para backfilled rows (no `source_event_id` disponible histórico)
  - Tareas sin page history disponible → log + skip (helper `calculateCycleTime` cae a fallback `createdAt`)
  - Batch progress logging cada 100 tasks
  - Dry-run mode `--dry-run` que reporta count esperado sin INSERT
  - Output reporting al final: `{tasksProcessed, transitionsInserted, transitionsSkipped, errors[]}`
- Run en orden canonical:
  1. **Demo teamspace primero** (TASK-910 shipped + verde)
  2. Verify integrity: `SELECT COUNT(*) FROM task_status_transitions WHERE source_workspace='demo'` matches expected
  3. **Efeonce productivo** después de demo verde 7d
  4. **Sky productivo** después de Efeonce verde 7d
- Reliability signal `notion-status-transitions-backfill-coverage.ts`:
  - kind=data_quality, % tasks con al menos 1 transition / total tasks
  - steady > 90% post-backfill completo
  - warning < 70%, error < 50%

### Slice 7 — Update docs canonical Engine spec + Contrato + CLAUDE.md hard rules

- Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-992:
  - Sección `cycle_time`: reflejar fórmula canonical V1 (status `En curso` start + descuento Bloqueado), referenciar TASK-912 shipping
  - Sección `cycle_time_variance`: sin cambios conceptuales, referenciar nueva fórmula CT
  - Sección `otd_pct`: actualizar para reflejar canonical (promise compliance only) — remover línea legacy `cycle_time_days <= 14.2`
  - Sección NUEVA `cycle_time_slo_pct`: documentar métrica, referenciar Delta 2026-05-17 sección D
- Update `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta closing reference TASK-912 shipping
- Agregar a CLAUDE.md sección "ICO Status Transition Foundation invariants (TASK-908, desde 2026-05-18)":
  - Hard rules webhook handler canonical (HMAC + echo-loop + dedup + normalize upstream)
  - Hard rules materializer PG→BQ canonical (MERGE pattern + freshness gate + append-only)
  - Hard rules CT SLO% canonical (single source of truth metric-registry, NUNCA recomputar inline)
  - Pointers a helpers canonical actualizados
- Update `docs/tasks/README.md` (mover TASK-912 to-do → complete) + `Handoff.md` + `changelog.md`

## Verification (Mode: implementation)

- Slice 1: webhook handler test green — signature valid/invalid + echo-loop + filter + dedup + outbox emit
- Slice 2: reactive consumer test green — insert success + idempotency + CHECK enforcement + dispatch via outbox
- Slice 3: materializer test green — MERGE preserves historical + incremental delta + freshness gate
- Slice 4: paridad shadow signal `cycle-time-canonical-paridad` verde 7d con drift expected solo en presencia Bloqueado → flip `CT_DAYS_CANONICAL_FORMULA_ENABLED=true`
- Slice 5: tests anti-regresión variados (1/5/14/14.2/15/30) → % correctos vs threshold 14.2 → flip `CT_SLO_PCT_METRIC_ENABLED=true`
- Slice 6: backfill demo verde → Efeonce verde 7d → Sky verde 7d → signal `notion-status-transitions-backfill-coverage` > 90% steady
- Slice 7: docs canonical updated + CLAUDE.md hard rules + README/Handoff/changelog sync
- E2E smoke: tarea real en Notion Sky cambia estado `Listo para revisión → Cambios solicitados` → webhook recibido < 5s → outbox event published < 1s → reactive consumer persiste row < 5s → `countCorrectionTransitions(taskSourceId)` retorna `sourceMode='canonical', count=1` < 30s total latencia end-to-end
- Reliability signal `notion.correction_transitions.source_availability` (canonical TASK-908) baja monotónicamente de 100% error → < 5% steady state en 30 días post-shipping

## Out of Scope

- **RpA / OTD / FTR / Cumplimiento writebacks** — son TASK-901/902/903/904 separadas. Esta task NO toca writeback Notion bulk PATCH. Solo cierra el loop **capture** (webhook → PG → BQ) para que helpers canonical retornen `sourceMode='canonical'`.
- **Per-task-type calibration de CT SLO threshold** — V1 uniform default 14.2. V2 (task derivada futura) implementa lookup table `cycle_time_slo_thresholds_by_type`.
- **Métrica nueva `time_to_client_approval`** — mencionada en Delta 2026-05-17 sección C.2 como complementaria. Out of scope V1, queda como follow-up.
- **UI dashboards refactor** — UI consume nuevos valores `cycle_time_days` canonical + `cycle_time_slo_pct` automáticamente via metric-registry. Si emerge necesidad UX-specific cambia, task separada.
- **Consolidación webhook endpoints** — Slice 1 crea `/api/webhooks/notion-status-transitions` separado. Si emerge decisión canonical "1 webhook endpoint para todos los events Notion" (con TASK-901 webhook `/api/webhooks/notion-tasks`), consolidación es task derivada — NO bloquea TASK-912 shipping V1.

## Risks

| Risk | Impact | Likelihood | Mitigation | Reliability signal |
|---|---|---|---|---|
| Webhook delivery loss Notion (0.1% reported industry) | Audit completeness | low | Cron nightly backfill from Notion page history (Slice 6 puede convertirse en recurring V1.1) | `notion-status-transitions-ingestion-lag` |
| HMAC signing secret corruption (Vercel env drift) | Security (signed webhooks rejected) | medium | `resolveSecretByRef` canonical + reliability signal `secrets.env_ref_format_drift` ya cubre detection | TASK-870 canonical |
| BQ materializer lag > 15 min | Cycle Time stale en dashboards | medium | Cron `*/15 min` + freshness gate + signal alerta sostenido > 30 min | `notion.task_status_transitions.bq_sync_lag` |
| Slice 4 cutover rompe paridad legacy | Dashboards muestran CT distinto sin warning | high | Shadow mode 7d verde + feature flag default OFF + canonical paridad signal + revert <5min sin redeploy | `cycle-time-canonical-paridad` |
| Backfill paginación Notion API timeout / rate limit | Backfill incompleto | high | Throttled p-throttle 3 req/sec + idempotent + dry-run mode + demo teamspace primero | `notion-status-transitions-backfill-coverage` |
| Sky operador NO completa cleanup operador-side (`Estado 1` rename) | Webhook ingiere legacy variants sostenido | medium | Tolerance window ~7d + signal `notion.correction_transitions.source_availability` alerta drift | TASK-908 canonical signal |

## Feature Flags

- **`CT_DAYS_CANONICAL_FORMULA_ENABLED`** (default `false`, Slice 4) — controla si `v_tasks_enriched.cycle_time_days` usa fórmula canonical V1 vs legacy. **CRITICAL CUTOVER** — flip requiere shadow mode 7d verde + arch-architect 4-pillar approval.
- **`CT_SLO_PCT_METRIC_ENABLED`** (default `false`, Slice 5) — controla si métrica CT SLO% se computa + persiste en `metrics_by_*` tables.
- **`NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED`** (default `false`, Slice 1) — kill switch para desactivar webhook handler ingestion en caso de bug crítico. Cuando OFF: handler retorna ACK + drop silent + signal alerta drop rate sostenido.

## Capabilities Granular (least-privilege canonical)

- `notion.webhook.ingest_status_transitions` (route_group=internal, scope=tenant, EFEONCE_ADMIN + DEVOPS_OPERATOR)
- `notion.status_transitions.backfill_execute` (route_group=internal, scope=all, EFEONCE_ADMIN solo — backfill histórico es destructive-capable)

## Reliability Signals (4 nuevos)

| Signal | Kind | Severity matrix | Steady state | Subsystem rollup |
|---|---|---|---|---|
| `notion.task_status_transitions.ingestion_lag` | lag | warning > 5s p95 / error > 30s sostenido | < 2s | delivery |
| `notion.task_status_transitions.bq_sync_lag` | lag | warning > 30 min / error > 4h | < 15 min | delivery |
| `cycle_time.canonical_paridad` | drift | warning > 5% drift / error > 20% | drift expected solo Bloqueado | delivery |
| `ct_slo_pct.coverage` | data_quality | warning > 20% sample < healthyMin | < 5% | delivery |

## Cross-refs

- **ADR canonical**: `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Notion = OS, Greenhouse = motor)
- **ADR migración**: `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (8 stop-gates + demo gate canonical)
- **Foundation**: `docs/tasks/complete/TASK-908-ico-status-transition-tracking-canonical-cycle-time.md` (V1.0 shipped 2026-05-18)
- **Consumer downstream RpA**: `docs/tasks/to-do/TASK-901-canonical-notion-metric-compute-v1-rpa.md` (Slice 4 shadow mode prod bloqueado por TASK-912)
- **Consumer downstream FTR**: `docs/tasks/to-do/TASK-909-ico-ftr-throughput-pipeline-velocity-definitions-drift.md` (FTR delega a RpA → desbloqueo cascading)
- **Demo teamspace gate**: `docs/tasks/to-do/TASK-910-notion-demo-teamspace-migration-sandbox.md` (gate canonical pre-shipping Slice 6 backfill prod)
- **Status canonical**: `src/lib/delivery/task-status-canonical.ts` (commit `1525e51c` TASK-742 prep — 11 estados + alias map legacy)
- **Patrón webhook**: `src/lib/webhooks/handlers/hubspot-companies.ts` (TASK-706/836 dual-format invariant) + `src/lib/webhooks/handlers/hubspot-services.ts` (TASK-813 inbound)
- **Patrón materializer**: TASK-900 (MERGE incremental + freshness gate + tracking table `ico_materialization_runs`)

## Open Questions (resueltas pre-execution — NO bandaids)

1. **¿Webhook endpoint consolidado con TASK-901 `/api/webhooks/notion-tasks`?** — DEFER decisión a post-Slice 1 shipping. TASK-912 ship con endpoint separado `/api/webhooks/notion-status-transitions`. Si emerge decisión canonical "1 endpoint Notion", task derivada de consolidación. Premature consolidation con TASK-901 no-shipped sería bandaid.
2. **¿Backfill scope V1 incluye demo + Efeonce + Sky o staged?** — Staged canonical (demo primero → Efeonce 7d después → Sky 7d después). ADR `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1` §3.2 — NUNCA big-bang.
3. **¿CT SLO threshold V1 uniform 14.2 o per-task-type calibrated?** — V1 uniform default 14.2 (Engine §A.5.5). V2 task derivada implementa per-task-type lookup table cuando emerja calibration data observed.
4. **¿Materializer PG→BQ task_status_transitions corre cada cuanto?** — Cron `*/15 min` América/Santiago canonical (mismo cadence TASK-900 ICO materializer). Reliability signal `bq_sync_lag` alerta > 30 min.
5. **¿`Estado 1` legacy Sky tolerance window cuanto dura?** — ~1-2 días post-shipping. Después signal `notion.correction_transitions.source_availability` alerta drift sostenido si Sky no completa cleanup. Helper `normalizeTaskStatus` (TASK-742) ya tolera ambas variants.

## Next review trigger

- Cuando los 2 prerequisitos operador-side estén listos (Notion webhook subscription registrada + schema cleanup Sky completo)
- Cuando TASK-910 Notion Demo Teamspace shipea + 4 semanas runtime verde
- Cuando emerja decisión operador-side de shipping shadow mode RpA prod (TASK-901 Slice 4) — TASK-912 desbloquea ese path
