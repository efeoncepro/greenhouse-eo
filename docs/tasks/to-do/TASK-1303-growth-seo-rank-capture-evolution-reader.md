# TASK-1303 — Growth SEO: Rank Capture + Evolution Reader

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `cron`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data|integrations`
- Blocked by: `TASK-1299, TASK-1300, TASK-1301`
- Branch: `task/TASK-1303-growth-seo-rank-capture-evolution-reader`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Es el **backend de la pantalla estrella de EPIC-022**: la evolución de las posiciones de URLs/keywords en el tiempo (la película, no la foto). Introduce (1) el **command de captura** `captureRankSnapshot(targetId, actor)` que, por cada keyword del set trackeado × engine × device, llama DataForSEO (Labs/SERP vía el **family registry** de TASK-1300) y hace **UPSERT idempotente** en `seo_rank_snapshots` por `capture_date`; (2) el **Cloud Scheduler `seo-rank-capture`** (~05:00 CLT) → `POST /seo/rank/capture-batch` en ops-worker que itera targets activos; (3) el **outbox → reactive BQ mirror** que espeja cada snapshot a `greenhouse_growth_analytics.seo_rank_history` (historia larga); (4) el **reader `readRankEvolution(targetId, {keywords?, range, engine, device})`** que devuelve `{ series: [{ keyword, points: [{date, position, url}] }] }` desde PG (ventana caliente ~180d) con **fallback a BQ** para rangos largos; y (5) el **reliability signal `seo.rank.capture_lag`** (steady=0). Todo respeta el **chokepoint de costo** `enforceSeoRunEntitlement` (quota cap por-org) — DataForSEO es el riesgo #1 del programa.

## Why This Task Exists

Per `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 y §10.3, la feature ancla y el diferenciador comercial #1 (§11 top-3 de pull) es **"Rank & URL performance over time"**: el gráfico de una URL que sube de posición 8 a 3 mientras el cliente estuvo con Efeonce es *la conversación de renovación* (caso Berel, §11). Esa película necesita una serie temporal capturada consistentemente cada día. Hoy no existe: GSC da la posición promediada de tu propio dominio (TASK-1302) pero **no** la posición exacta en una SERP concreta ni la de competidores ni las SERP features (AI Overview presente) — eso sólo lo da DataForSEO SERP/Labs (scraped, cuesta). Esta task construye el motor de captura de esa verdad de mercado + el reader que la sirve a la pantalla ancla, con el contrato de honestidad de las dos fuentes (§5) y bajo control de costo estricto (§6, §13 riesgo #1). Es el eslabón `1303` del camino de valor `1302 → 1306 → 1307`.

## Goal

- Command gobernado `captureRankSnapshot(targetId, actor)`: por keyword×engine×device, call DataForSEO vía family registry (TASK-1300), UPSERT `seo_rank_snapshots` idempotente por `capture_date`, persistiendo `provider_cost` + incrementando `seo_provider_spend_daily`.
- Cloud Scheduler `seo-rank-capture` (~05:00 CLT) → `POST /seo/rank/capture-batch` en ops-worker, iterando targets activos con per-row resilience.
- Outbox → reactive consumer que espeja cada snapshot a BQ `greenhouse_growth_analytics.seo_rank_history`.
- Reader `readRankEvolution(targetId, {keywords?, range, engine, device})` → `{ series: [...] }`, PG hot window ~180d + BQ fallback para rango largo; contrato `{ ok:true, ... } | { ok:false, errorCode, status }`.
- Reliability signal `seo.rank.capture_lag` (steady=0) en `/admin/operations` (subsistema Growth Health).
- Gate de costo: cada captura pasa por `enforceSeoRunEntitlement` (quota cap por-org).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §5 (rank tracking + evolución, dos fuentes/un contrato de honestidad), §6 (DataForSEO governance: family registry, cost tracking, circuit breaker por familia, honest degradation), §7 (`readRankEvolution` shape), §8 (`seo-rank-capture` ~05:00 CLT → `POST /seo/rank/capture-batch` → UPSERT idempotente → outbox → reactive BQ mirror; signal `seo.rank.capture_lag`), §13 (riesgo #1: costo DataForSEO). **Fuente de verdad de esta task.**
- `CLAUDE.md` §"Outbox publisher canónico — Cloud Scheduler, no Vercel" — el path async-critical (capture batch + outbox → reactive BQ mirror) vive en Cloud Scheduler + ops-worker; state machine outbox `pending→publishing→published|failed→dead_letter`; NUNCA Vercel cron ni consumers filtrando `pending`.
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PG hot window (~180d) + BQ historia larga; patrón Postgres-first, BigQuery fallback.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — `growth.seo.*` per-org vía `module_assignments`, `enforceSeoRunEntitlement` (TASK-1301).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — command gobernado (`propose → confirm → execute` para el trigger manual) + reader canónico; un primitive, muchos consumers.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registro de signal `seo.rank.capture_lag`.

Reglas obligatorias:

- **Costo DataForSEO = riesgo #1.** Cada captura pasa por `enforceSeoRunEntitlement` (quota cap por-org, TASK-1301) ANTES de pegar el provider; persistir `provider_cost` por snapshot + incrementar `seo_provider_spend_daily`; batchear Labs; circuit breaker por familia (un Backlinks/OnPage roto NO hunde el rank capture; SERP-AI del AEO aislado de Labs/SERP del SEO aunque compartan credenciales).
- **Idempotencia por `capture_date`.** El UPSERT (`ON CONFLICT (target,keyword,engine,device,capture_date) DO UPDATE`) hace que re-ejecutar el cron el mismo día no duplique. El command escribe; el constraint (TASK-1299) lo garantiza.
- **Snapshots append-only.** `seo_rank_snapshots` NUNCA se DELETE; el anti-mutation trigger (TASK-1299) bloquea UPDATE fuera del path de captura del mismo día [verificar que el trigger permite el UPSERT idempotente del mismo `capture_date` — decisión de diseño en Discovery].
- **Honest degradation.** Un batch que ve keywords elegibles pero materializa 0 snapshots NUNCA es `succeeded`: degrada/falla con evidencia (espejo de la regla BigQuery DML de CLAUDE.md). Fuente rota → snapshot con estado degradado, nunca fabricado.
- **Reactive BQ mirror vía outbox.** El mirror a `greenhouse_growth_analytics.seo_rank_history` es un consumer reactivo del outbox (`WHERE status='published'`), NUNCA un MERGE/INSERT inline en el route handler ni en el command.
- **Cloud Scheduler, no Vercel cron.** `seo-rank-capture` en `deploy.sh` (corre igual en staging y prod).
- **Dos fuentes, un contrato.** DataForSEO SERP/Labs = posición exacta + competidores + SERP features (scraped, cuesta). GSC (TASK-1302) = posición promediada del propio dominio. NUNCA promediarlas; `readRankEvolution` sirve la serie DataForSEO; el cruce con GSC vive en el report layer.
- **Boundary duro.** Cero FK/merge a `grader_*`, payroll, finance. El circuit breaker aísla la familia SERP-AI (AEO) de las familias SEO aunque compartan secreto.

## Normative Docs

- `src/lib/ai/dataforseo.ts` — cliente DataForSEO; ampliado por TASK-1300 a family registry (`postDataForSeoTask({family, endpoint, tasks})`, breaker + cost por familia). El command consume las familias `labs`/`serp` [verificar API real tras TASK-1300].
- `src/lib/sync/outbox-consumer.ts` — `publishPendingOutboxEvents`, state machine outbox atómica, patrón reactive consumer [referencia del mirror BQ].
- `services/ops-worker/server.ts` — `handleOutboxPublishBatch` + patrón de ruteo (`if (method === 'POST' && path === '...')`) [plantilla del handler `POST /seo/rank/capture-batch` + del reactive consumer].
- `services/ops-worker/deploy.sh` — declaración de Cloud Scheduler jobs [donde se registra `seo-rank-capture`].
- `src/lib/reliability/registry.ts` — registro de signals + subsistema [donde nace `seo.rank.capture_lag`].
- `src/lib/growth/seo/*` — schema (TASK-1299), `enforceSeoRunEntitlement` (TASK-1301), contratos SEO (TASK-1302).
- `src/lib/postgres/client.ts` — conexión canónica; `pnpm db:generate-types`.

## Dependencies & Impact

### Depends on

- **`TASK-1299`** — schema `seo_rank_snapshots` (UNIQUE de captura, anti-mutation trigger) + `seo_targets` + `seo_keyword_set_members` (el scope de keywords a capturar). **Blocker duro.**
- **`TASK-1300`** — DataForSEO family registry (allowlist `serp`/`labs`, circuit breaker + cost por familia). **Blocker duro** — el command captura vía las familias.
- **`TASK-1301`** — capabilities `growth.seo.*` + `module_assignments` per-org + `enforceSeoRunEntitlement` (quota cap por-org). **Blocker duro** — el gate de costo es obligatorio antes de pegar DataForSEO.
- `greenhouse_growth_analytics` dataset BQ (mirror de snapshots) [verificar existencia; crear si falta].
- Reliability control plane (registro de signals).

### Blocks / Impacts

- Desbloquea `TASK-1307` (★ Rank & URL performance over time UI — consume `readRankEvolution`) y `TASK-1305` (`readSeoAeoGap` — cruza `seo_rank_snapshots` × `grader_scores`).
- Define el patrón de captura+mirror que TASK-1304 (site audit/backlinks) replica.
- Alimenta `is_at_risk`/ICO (visibilidad cayendo = señal churn — §11).

### Files owned

- `src/lib/growth/seo/rank-capture.ts` [nuevo — command `captureRankSnapshot`]
- `src/lib/growth/seo/rank-evolution-reader.ts` [nuevo — `readRankEvolution` PG + BQ fallback]
- `src/lib/growth/seo/contracts.ts` [extendido — tipos `RankSnapshotInput`, `RankEvolutionResult`, `RankSeries`]
- `src/lib/growth/seo/rank-history-bq-mirror.ts` [nuevo — reactive consumer del snapshot → BQ]
- `services/ops-worker/server.ts` [modificado — handler `POST /seo/rank/capture-batch` + reactive mirror + ruteo]
- `services/ops-worker/deploy.sh` [modificado — Cloud Scheduler `seo-rank-capture`]
- `src/lib/reliability/registry.ts` [modificado — signal `seo.rank.capture_lag`]
- `src/lib/reliability/queries/seo-rank-capture-lag.ts` [nuevo — reader del signal]
- `migrations/<ts>_task-1303-seo-rank-history-bq-outbox.sql` [posible — event type outbox / `seo_provider_spend_daily` si no lo crea TASK-1300/1299; verificar]
- `src/types/db.d.ts` [regenerado — additive]

## Current Repo State

### Already exists

- `seo_rank_snapshots` (append-only, UNIQUE de captura, anti-mutation trigger) — TASK-1299.
- DataForSEO family registry con breaker + cost por familia — TASK-1300.
- `enforceSeoRunEntitlement` + capabilities `growth.seo.*` per-org — TASK-1301.
- `seo_gsc_daily` + contratos SEO — TASK-1302.
- Patrón canónico outbox → reactive consumer + Cloud Scheduler + ops-worker (outbox publisher TASK-773; reactive consumers en `server.ts`).
- Reliability control plane con registro de signals.

### Gap

- No hay command de captura de rank: `seo_rank_snapshots` no se escribe.
- No hay Cloud Scheduler `seo-rank-capture` ni endpoint ops-worker.
- No hay reactive BQ mirror a `greenhouse_growth_analytics.seo_rank_history` — sin historia larga.
- No hay `readRankEvolution` — la pantalla ancla no tiene backend.
- No hay signal `seo.rank.capture_lag`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (external write DataForSEO con costo por-call, cron prod, reactive BQ mirror, gate de costo, source of truth de la feature ancla).
- Impacto principal: `cron` (command de captura + Cloud Scheduler + reactive mirror + reader + signal).
- Source of truth afectado: `greenhouse_growth.seo_rank_snapshots` (SoT append-only, ventana caliente PG) + `greenhouse_growth_analytics.seo_rank_history` (SoT historia larga BQ) + `seo_provider_spend_daily` (contador de costo event-sourced).
- Consumidores afectados: `TASK-1307` (★ pantalla ancla), `TASK-1305` (`readSeoAeoGap`), Nexa/MCP, ICO/`is_at_risk`.
- Runtime target: `staging|production|cron|worker|external`

### Contract surface

- Contrato existente a respetar: schema `seo_rank_snapshots` + anti-mutation trigger + UNIQUE de captura (TASK-1299); family registry `postDataForSeoTask` + breaker (TASK-1300); `enforceSeoRunEntitlement` (TASK-1301); state machine outbox + reactive consumer canónico (CLAUDE.md §Outbox); `SearchConsoleAnalyticsResult`-style discriminated union para el reader.
- Contrato nuevo o modificado: command `captureRankSnapshot(targetId, actor)`; endpoint `POST /seo/rank/capture-batch`; reactive consumer snapshot→BQ; reader `readRankEvolution(targetId, {keywords?, range, engine, device})`; Cloud Scheduler `seo-rank-capture`; signal `seo.rank.capture_lag`.
- Backward compatibility: `gated` (todo aditivo detrás de `GROWTH_SEO_ENABLED` + assignment per-org; cero cambio a TASK-1299/1300/1301/1302).
- Full API parity: la captura es un **command gobernado** (`src/lib/growth/seo/rank-capture.ts`) — el trigger manual pasa por `propose → confirm → execute` (el LLM/Nexa NUNCA dispara la captura directo; muta sólo en el endpoint de confirmación humana); el cron es un caller de sistema del mismo command. `readRankEvolution` es reader canónico reusable por UI + Nexa + MCP.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_rank_snapshots` [write], `seo_provider_spend_daily` [write, contador], `greenhouse_growth_analytics.seo_rank_history` [BQ mirror], `seo_targets`/`seo_keyword_set_members` [read del scope], `greenhouse_sync.outbox_events` [event de mirror].
- Invariantes que no se pueden romper:
  - **Idempotencia por `capture_date`**: UPSERT `ON CONFLICT (seo_target_id, keyword, engine, device, capture_date)`; re-run del cron el mismo día NO duplica.
  - **Append-only**: `seo_rank_snapshots` NUNCA DELETE; el UPSERT del mismo `capture_date` es la única mutación permitida por el diseño (validar contra el anti-mutation trigger de TASK-1299 en Discovery).
  - **Gate de costo obligatorio**: `enforceSeoRunEntitlement(orgId)` ANTES de cualquier call DataForSEO; si la cuota está agotada, la captura degrada/skip (no pega el provider), no falla silenciosa.
  - **Cost tracking**: cada call persiste `provider_cost` en el snapshot + incrementa `seo_provider_spend_daily` (event-sourced).
  - **Circuit breaker por familia**: un fallo de una familia NO hunde el cron; SERP-AI (AEO) aislado de SERP/Labs (SEO).
  - **Honest degradation**: batch con keywords elegibles y 0 snapshots materializados ≠ `succeeded` (degrada con evidencia).
  - **Reactive mirror vía outbox**: BQ mirror NUNCA inline en route handler/command (outbox event → reactive consumer `WHERE status='published'`).
  - **Reader no promedia fuentes**: `readRankEvolution` sirve la serie DataForSEO; NUNCA la mezcla con GSC (el cruce vive en el report layer).
  - Cero FK/merge a `grader_*`, payroll, finance.
- Tenant/space boundary: `targetId → seo_targets → organization_id`; `orgId` derivado server-side; el batch itera sólo targets con assignment per-org activo (`module_assignments`).
- Idempotency/concurrency: UPSERT por UNIQUE de captura; el batch procesa target-por-target con per-row resilience (SELECT FOR UPDATE SKIP LOCKED / lock por target si se corre concurrente [verificar necesidad]); el reactive mirror usa la state machine outbox atómica (exactly/at-least-once del consumer).
- Audit/outbox/history: el command emite outbox event por snapshot batch (→ reactive BQ mirror); la serie append-only ES el historial; el trigger manual queda en el audit trail del command gobernado.

### Migration, backfill and rollout

- Migration posture: `additive` — posible migración menor (event type outbox del mirror + `seo_provider_spend_daily` si no lo crearon TASK-1299/1300; verificar). Sin DDL destructivo. Marker + DO-block si se agrega tabla/columna.
- Default state: `flag OFF` — `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`). Cloud Scheduler `seo-rank-capture` desplegado **paused**; captura habilitada sólo para orgs con assignment activo (Berel primero, Fase 0 §11).
- Backfill plan: N/A para prod inicial (la serie arranca desde el día 1). DataForSEO Labs `historical_rank_overview` puede hidratar historia de dominios ajenos como enriquecimiento posterior (fuera de scope; deuda declarada).
- Rollback path: pausar Cloud Scheduler + `GROWTH_SEO_ENABLED=OFF` + revocar el assignment per-org (arch §13.5: rollback = revocar assignment). Reverse de la migración menor si aplica. La serie acumulada es append-only (dura de revertir por diseño).
- External coordination: registrar Cloud Scheduler job (proyecto GCP). DataForSEO credencial ya configurada (reusada, no nueva). Dataset BQ `greenhouse_growth_analytics` [verificar/crear]. Redeploy ops-worker. Sign-off de operador para prender captura por-org (gate de costo).

### Security and access

- Auth/access gate: endpoint ops-worker con auth de worker (`services/ops-worker/auth.ts`); el command exige `growth.seo.audit.run`/capability de captura + `enforceSeoRunEntitlement`; el reader exige `growth.seo.observation.read`. El trigger manual (UI/Nexa) pasa por el loop gobernado.
- Sensitive data posture: sin PII, sin payroll/finance. `provider_cost` es dato de costo interno (no se expone crudo al cliente). Secreto DataForSEO resuelto server-side vía `resolveSecret` (nunca en contratos ni logs).
- Error contract: reader retorna `{ ok:false, errorCode, status }`; errores capturados con `captureWithDomain(err, 'growth', {tags:{source:'seo_rank_capture', family}})`, nunca raw. Circuit breaker emite estado observable, no swallow.
- Abuse/rate-limit posture: **quota cap por-org** en `enforceSeoRunEntitlement` (gate de costo, el control principal); circuit breaker por familia; batched Labs; el cron corre 1×/día por target. `provider_cost` + `seo_provider_spend_daily` alimentan `seo.provider.cost_over_budget` (TASK-1301/1300).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests del command (idempotencia UPSERT, gate de costo bloquea call, honest degradation batch 0-snapshots), del reader (PG hot window + BQ fallback por rango), del signal (`capture_lag` steady=0), del reactive mirror (outbox → BQ).
- DB/runtime checks: SQL contra `seo_rank_snapshots` (idempotencia re-run mismo `capture_date`), `seo_provider_spend_daily` (contador incrementa), anti-mutation trigger. Verificación de tipos temporales (`capture_date` DATE, `captured_at` TIMESTAMPTZ) — evitar bug class EXTRACT.
- Integration checks: **smoke real DataForSEO en staging** (una keyword × una SERP → snapshot con `position`/`url`/`serp_features`/`provider_cost`); breaker: forzar fallo de una familia → el batch continúa; gate: forzar cuota agotada → captura skip sin pegar el provider.
- Reliability signals/logs: `seo.rank.capture_lag` visible en `/admin/operations` (Growth Health); log estructurado del batch (`[ops-worker] POST /seo/rank/capture-batch — targets=N snapshots=M cost=$X skipped=K`).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task define el **write gobernado** de captura de rank + reusa (touch-it) `growth.seo.observation.read` para el reader. Ambas capabilities `growth.seo.*` nacen en `TASK-1301`; esta task las **consume** y las cablea a su primer command/reader real.

- [x] **Lógica en el primitive, no en la UI.** Captura en `src/lib/growth/seo/rank-capture.ts`; evolución en `rank-evolution-reader.ts`. La UI (`TASK-1307`) sólo renderiza la serie.
- [x] **Modelada como command/aggregate + reader**, no como click-handler. `captureRankSnapshot(targetId, actor)` es un command con command semantics; `readRankEvolution` es reader canónico.
- [x] **Read** expuesto como reader canónico (`readRankEvolution`, contrato `{ ok, ... }`). **Write** (`captureRankSnapshot`) con: command semantics, authorization fina (capability de captura + `enforceSeoRunEntitlement`, NO admin-coarse), **idempotencia** (UPSERT por `capture_date`), **outbox** (reactive BQ mirror), errores canónicos sanitizados, observabilidad (signal + cost tracking).
- [ ] **Capability + grant en el MISMO PR:** las capabilities `growth.seo.*` (`audit.run`/`observation.read`) + su grant + coverage test viven en `TASK-1301`. Esta task es el **primer consumer real** — si se toma antes que TASK-1301 aterrice, es blocker duro (declarado en Blocked by). NO shippear la captura sin el gate de costo cableado.
- [x] **Camino programático declarado:** command server-side reusable por UI/Nexa/MCP; el cron es un caller de sistema del mismo command; sin lógica duplicada por consumer.
- [x] **Write apto para `propose → confirm → execute`:** el trigger manual (UI/Nexa) propone, el humano confirma, el endpoint de confirmación ejecuta `captureRankSnapshot`. El LLM NUNCA dispara la captura directo.
- [x] **Un primitive, muchos consumers:** cron + UI + Nexa + MCP consumen el mismo command/reader; cero lógica de captura/evolución duplicada.
- [x] **Parity check = SÍ:** captura y lectura tienen contrato gobernado a nivel capability (`audit.run`/`observation.read`); Nexa/MCP los operan por construcción.

> Deuda declarada: el enforcement fino depende de que `TASK-1301` haya sembrado las capabilities + `enforceSeoRunEntitlement`. Es blocker duro, no opcional — el gate de costo es el control #1 del riesgo #1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rank capture command (idempotente + gate de costo)

- `captureRankSnapshot(targetId, actor)` en `src/lib/growth/seo/rank-capture.ts`: resuelve el scope (keywords activas del set × engine × device del target); llama `enforceSeoRunEntitlement(orgId)` ANTES de pegar DataForSEO; por keyword×engine×device call DataForSEO vía family registry (`labs`/`serp`, TASK-1300); UPSERT `seo_rank_snapshots` `ON CONFLICT (...capture_date) DO UPDATE`; persiste `provider_cost` + incrementa `seo_provider_spend_daily`; honest degradation (0 snapshots con keywords elegibles → degradado, no `succeeded`).
- Contratos en `contracts.ts`. Unit tests: idempotencia, gate bloquea call, breaker aísla familia, degradación.

### Slice 2 — Cloud Scheduler batch + outbox + reactive BQ mirror

- Handler `POST /seo/rank/capture-batch` en `services/ops-worker/server.ts`: itera targets activos (assignment per-org), corre `captureRankSnapshot` por target con per-row resilience, emite outbox event por snapshot batch, retorna `{ targets, snapshots, cost, skipped }`.
- Reactive consumer snapshot → BQ `greenhouse_growth_analytics.seo_rank_history` (`WHERE status='published'`, patrón `outbox-consumer.ts`), NUNCA MERGE/INSERT inline. Migración menor si falta event type / dataset [verificar].
- Cloud Scheduler `seo-rank-capture` (~05:00 CLT) en `deploy.sh`, desplegado paused. Tests del handler + del mirror.

### Slice 3 — `readRankEvolution` (PG hot window + BQ fallback)

- `readRankEvolution(targetId, {keywords?, range, engine, device})` en `rank-evolution-reader.ts`: para rango dentro de la ventana caliente (~180d) lee PG (`seo_rank_snapshots`, `ORDER BY capture_date DESC`, índice `(seo_target_id, keyword, capture_date DESC)`); para rango largo cae a BQ `seo_rank_history`; devuelve `{ ok:true, series: [{ keyword, points: [{date, position, url}] }] } | { ok:false, errorCode, status }`.
- Filtro opcional por `keywords[]`, `engine`, `device`. Honest degradation si el target no tiene assignment o no hay datos. Exige `growth.seo.observation.read`. Unit tests: hot window, BQ fallback, filtros.

### Slice 4 — Reliability signal `seo.rank.capture_lag`

- `src/lib/reliability/queries/seo-rank-capture-lag.ts`: computa el lag = días desde el último `capture_date` por target activo (`(CURRENT_DATE - MAX(capture_date))::int` — patrón canónico, NO `EXTRACT(EPOCH FROM ...)`). Steady=0; warning/error si > umbral.
- Registrar en `src/lib/reliability/registry.ts` (subsistema Growth Health, `/admin/operations`). Unit test del reader del signal.

## Out of Scope

- GSC daily materializer + `readKeywordOpportunities` (TASK-1302).
- Site audit (OnPage queue+poll) + backlink snapshot + `readSiteAuditReport`/`readBacklinkProfile` + `seo.audit.stuck_tasks` (TASK-1304).
- `readSeoAeoGap` cross-módulo (TASK-1305) — esta task provee `seo_rank_snapshots`, no el cruce.
- Definición de capabilities `growth.seo.*` + `enforceSeoRunEntitlement` + `seo.provider.cost_over_budget` (TASK-1301) — esta task los consume.
- DataForSEO family registry en sí (TASK-1300) — consumido, no construido.
- Cualquier UI, incluida la pantalla ancla (TASK-1307).
- `historical_rank_overview` de dominios ajenos como backfill de historia (enriquecimiento posterior; deuda declarada).
- Visibility score / SoV orgánico / movers (cálculo derivado posterior sobre esta serie).

## Detailed Spec

Ver `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 (rank tracking: DataForSEO SERP/Labs = posición exacta + competidores + SERP feature + `historical_rank_overview`, scraped/cuesta; contrato de honestidad de dos fuentes — NUNCA promediar con GSC), §6 (family registry + cost tracking `provider_cost`/`seo_provider_spend_daily` + circuit breaker por familia + honest degradation; costos verificados: Labs ~$0.0001/item + ~$0.01/task), §7 (`readRankEvolution(targetId, {keywords?, range, engine, device}) → { series: [{ keyword, points: [{date, position, url}] }] }`, PG hot window + BQ fallback), §8 (`seo-rank-capture` ~05:00 CLT → `POST /seo/rank/capture-batch` → UPSERT idempotente por `capture_date` → outbox → reactive BQ mirror; signal `seo.rank.capture_lag` steady=0), §13 (riesgo #1 costo: O(orgs × keywords × devices × días); mitigación quota cap + batched + GSC-first + signal). El command es gobernado (`propose→confirm→execute` para el trigger manual; el cron es caller de sistema). Idempotencia por `capture_date`; `capture_date` DATE + `captured_at` TIMESTAMPTZ. Reactive BQ mirror vía outbox (`status='published'`), NUNCA inline. Circuit breaker aísla SERP-AI (AEO) de las familias SEO aunque compartan credencial.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (command con gate de costo) es prerequisito absoluto de Slice 2 (el batch lo llama). Slice 3 (reader) puede desarrollarse en paralelo pero se verifica con datos de Slice 1/2. Slice 4 (signal) requiere que existan capturas (Slice 1/2) para computar lag. Orden: 1 → 2 → (3 ∥ 4).
- **NUNCA** habilitar el Cloud Scheduler `seo-rank-capture` sin `enforceSeoRunEntitlement` cableado (TASK-1301) y verificado en staging — el gate de costo es el control del riesgo #1. **NUNCA** pegar DataForSEO en un batch sin quota cap activo.
- **NUNCA** activar la captura para todas las orgs de golpe: Fase 0 = sólo Berel (assignment per-org), luego expandir (§11 GTM interno-first).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| **Costo DataForSEO desbocado** (riesgo #1: O(orgs×keywords×devices×días)) | integrations/$ | high | `enforceSeoRunEntitlement` quota cap por-org ANTES del call; `provider_cost` + `seo_provider_spend_daily`; batched Labs; GSC-first; captura sólo orgs con assignment (Berel primero) | `seo.provider.cost_over_budget` |
| Cron re-ejecutado duplica snapshots | data | medium | UPSERT idempotente por UNIQUE de captura (`capture_date`); test de idempotencia | conteo de filas por `capture_date` |
| Batch reporta `succeeded` con 0 snapshots (falso verde) | growth | medium | honest degradation: keywords elegibles + 0 materializados → degradado con evidencia (regla BQ DML) | log `snapshots=0` + estado degradado |
| Fallo de una familia DataForSEO hunde todo el capture | resiliencia | medium | circuit breaker por familia (TASK-1300); SERP-AI (AEO) aislado de SERP/Labs (SEO) aunque compartan secreto | estado del breaker por familia |
| BQ mirror hecho inline en el route handler (viola outbox) | data | low | reactive consumer `WHERE status='published'` (CLAUDE.md §Outbox); NUNCA MERGE inline; code review | `sync.outbox.unpublished_lag` / mirror ausente |
| `capture_date` TIMESTAMP → bug class EXTRACT en `capture_lag`/reads | data | medium | `capture_date` DATE; `(CURRENT_DATE - MAX(capture_date))::int` no `EXTRACT(EPOCH ...)`; lint `no-extract-epoch-from-date-subtraction` | smoke query / lint |
| Cloud Scheduler en Vercel (no corre en staging) | ops | low | job en Cloud Scheduler + ops-worker; NUNCA `vercel.json` | ausencia de runs en staging |
| `readRankEvolution` promedia DataForSEO con GSC (viola contrato) | growth | low | reader sirve sólo la serie DataForSEO; el cruce GSC vive en report layer; test | code review |

### Feature flags / cutover

- `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) gatea el módulo. Cloud Scheduler `seo-rank-capture` desplegado paused. Cutover: (1) verificar gate de costo en staging con Berel, (2) despausar en staging + observar 1–2 runs + costo real, (3) promover a prod, (4) expandir assignment per-org gradualmente. El control de blast radius es el **assignment per-org**, no sólo el flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del command (ningún caller aún si Slice 2 no shippeó) | <5 min | si |
| Slice 2 | pausar Cloud Scheduler + revert del handler/mirror; drenar outbox pendiente | <10 min | si |
| Slice 3 | revert del reader (ninguna UI aún) | <5 min | si |
| Slice 4 | desregistrar el signal | <5 min | si |
| Operativo (post-acumulación) | pausar cron + `GROWTH_SEO_ENABLED=OFF` + revocar assignment per-org | <5 min | serie append-only no se borra |

### Production verification sequence

1. Confirmar en staging: `enforceSeoRunEntitlement` cableado (TASK-1301) + family registry `labs`/`serp` (TASK-1300) + `seo_rank_snapshots` (TASK-1299).
2. Smoke del command para Berel (1 keyword × 1 SERP) → snapshot con `position`/`url`/`serp_features`/`provider_cost`; `seo_provider_spend_daily` incrementa. Re-run mismo día → idempotente. Forzar cuota agotada → skip sin pegar el provider. Forzar fallo de familia → batch continúa (breaker).
3. Redeploy ops-worker; smoke `POST /seo/rank/capture-batch`; verificar outbox event → reactive consumer espeja a BQ `greenhouse_growth_analytics.seo_rank_history`.
4. `readRankEvolution(targetId, {range})` devuelve la serie desde PG (hot window) y desde BQ (rango largo) con el shape `{ series: [{ keyword, points }] }`.
5. `seo.rank.capture_lag` visible en `/admin/operations` (steady=0 tras el primer run).
6. Despausar Cloud Scheduler en staging (Berel), observar 1–2 runs + costo real, luego promover a prod vía release control plane. Expandir assignment per-org gradualmente.

### Out-of-band coordination required

- Registrar/desplegar Cloud Scheduler `seo-rank-capture` (proyecto GCP). Verificar/crear dataset BQ `greenhouse_growth_analytics`. Redeploy ops-worker. Sign-off de operador para prender captura por-org (gate de costo). Sin secrets nuevos (DataForSEO reusado).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Source of truth nombrado: `seo_rank_snapshots` (PG hot window) + `greenhouse_growth_analytics.seo_rank_history` (BQ historia larga) + `seo_provider_spend_daily` (cost counter).
- [ ] `captureRankSnapshot(targetId, actor)` es command gobernado: llama `enforceSeoRunEntitlement` ANTES de pegar DataForSEO; UPSERT idempotente por `capture_date`; persiste `provider_cost` + incrementa `seo_provider_spend_daily`.
- [ ] Idempotencia verificada: re-run del cron el mismo `capture_date` NO duplica snapshots.
- [ ] Honest degradation: batch con keywords elegibles y 0 snapshots materializados NUNCA es `succeeded` (degrada con evidencia).
- [ ] Circuit breaker por familia: un fallo de una familia DataForSEO no hunde el capture; SERP-AI (AEO) aislado de SERP/Labs (SEO).
- [ ] Cloud Scheduler `seo-rank-capture` (~05:00 CLT) registrado en `deploy.sh` (Cloud Scheduler + ops-worker, NO `vercel.json`), desplegado paused.
- [ ] Reactive BQ mirror vía outbox (`WHERE status='published'`), NUNCA MERGE/INSERT inline en route handler/command.
- [ ] `readRankEvolution(targetId, {keywords?, range, engine, device})` retorna `{ series: [{ keyword, points: [{date, position, url}] }] }`; PG hot window (~180d) + BQ fallback para rango largo; NO promedia con GSC.
- [ ] Signal `seo.rank.capture_lag` (steady=0) registrado y visible en `/admin/operations`; usa `(CURRENT_DATE - MAX(capture_date))::int` (NO `EXTRACT(EPOCH FROM ...)`).
- [ ] Gate de costo = control del riesgo #1: quota cap por-org obligatorio; captura sólo orgs con assignment activo (Berel primero).
- [ ] Boundary: cero FK/merge a `grader_*`, payroll, finance; circuit breaker aísla SERP-AI del AEO.
- [ ] `capture_date`=DATE, `captured_at`=TIMESTAMPTZ; `db.d.ts` regenerado; `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (unit: idempotencia, gate bloquea call, breaker, honest degradation, reader hot-window/BQ-fallback, signal capture_lag)
- `pnpm migrate:up` en staging (si aplica migración menor) + verificación SQL de `seo_provider_spend_daily`/event type outbox + tipos temporales.
- Smoke real DataForSEO en staging (Berel): captura → snapshot; re-run idempotente; cuota agotada → skip; fallo de familia → breaker; outbox → reactive BQ mirror; `readRankEvolution` shape; `seo.rank.capture_lag` en `/admin/operations`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` — fila de `GROWTH_SEO_ENABLED` (o §Pendientes de acción si queda code-complete sin prender)
- [ ] verificar `conclusion=success` de los workflows Cloud Run worker afectados (ops-worker) post-deploy
- [ ] chequeo de impacto cruzado (TASK-1307 pantalla ancla + TASK-1305 gap read consumen esto)
- [ ] documentación técnica (motor de captura + reader de evolución) + funcional + manual/runbook del cron (triple doc, arquitectura del dominio SEO)

## Follow-ups

- `TASK-1307` — ★ Rank & URL performance over time UI (consume `readRankEvolution`).
- `TASK-1305` — `readSeoAeoGap` cross-módulo (cruza `seo_rank_snapshots` × `grader_scores`).
- `TASK-1304` — Site audit + backlinks (replica el patrón captura+mirror de esta task).
- Visibility score / SoV orgánico / movers como cálculo derivado sobre esta serie.
- `historical_rank_overview` de dominios ajenos como backfill de historia (enriquecimiento).
- Definir el tamaño exacto de la ventana caliente PG + política de prune-to-BQ según patrón de queries de TASK-1307.

## Open Questions

1. ¿El anti-mutation trigger de TASK-1299 permite el UPSERT idempotente del mismo `capture_date`, o hay que ajustarlo para distinguir "re-captura del mismo día" de "mutación histórica"? Resolver en Discovery contra el trigger real.
2. ¿Existe el dataset BQ `greenhouse_growth_analytics`? Si no, crearlo en esta task. Verificar.
3. ¿`seo_provider_spend_daily` lo crea TASK-1299/1300 o esta task? Verificar; si falta, migración menor aquí.
4. ¿Tamaño de la ventana caliente PG (propuesta 180d) y umbral de `seo.rank.capture_lag`? Confirmar contra el patrón de queries de la pantalla ancla (TASK-1307).
5. ¿Concurrencia del batch (lock por target vs SELECT FOR UPDATE SKIP LOCKED)? Propuesta: procesar secuencial por target con per-row resilience; evaluar lock si se paraleliza.
