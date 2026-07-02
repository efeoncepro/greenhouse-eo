# TASK-1302 — Growth SEO: GSC Daily Snapshot Materializer + Keyword Opportunities

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `TASK-1299`
- Branch: `task/TASK-1302-growth-seo-gsc-daily-snapshot-materializer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte Google Search Console de un **read-through en vivo** (16 meses, sin historia propia) en una **serie temporal materializada de primera parte**. Introduce la tabla `seo_gsc_daily` (append-only por `capture_date`) y un Cloud Scheduler diario `seo-gsc-snapshot` que, por cada org con conexión GSC activa, llama `readSearchConsoleAnalytics(orgId, { range: ayer, dimensions: ['query','page'] })` (el reader per-org de TASK-1282) y persiste el resultado. Sobre esa serie + los datos de mercado de DataForSEO, agrega el reader `readKeywordOpportunities(targetId)` que hace el **join striking-distance** (keywords en GSC posición 8–20 con alta impresión × volumen/dificultad de DataForSEO Labs). Es el **quick-win del camino min-costo/max-valor** de EPIC-022 (`1302 → 1306 → 1307`): GSC es gratis y medido, así que arranca a acumular la película de search performance sin quemar cuota DataForSEO por dato que Google ya da. Honest degradation: sin conexión GSC no fabrica ceros — degrada explícito.

## Why This Task Exists

Per `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.1: GSC es la **verdad de primera parte** (clicks/impresiones/posición reales del propio dominio, gratis). Pero el reader de TASK-1282 es read-through: cada consulta pega en vivo a la Search Analytics API y Google sólo retiene 16 meses. Sin materialización propia (a) la historia se pierde al pasar la ventana de 16 meses, (b) cada render de dashboard vuelve a consultar la API (latencia + cuota GSC), y (c) no hay serie diaria estable sobre la que calcular decay/canibalización (§5). Esta task arregla las tres cosas materializando GSC diario a `seo_gsc_daily` (arch §4.2, §8). Y desbloquea el primer insight accionable de bajo costo — **oportunidades de keywords striking-distance** (§7 `readKeywordOpportunities`, §10.4 scatter quick-win): las keywords donde ya rankeas cerca (pos 8–20) y un empujón de contenido las mete a top-5. Es la palanca comercial #2 (keyword research → gap accionable, §11) al menor costo posible.

## Goal

- Tabla `seo_gsc_daily` (append-only por `capture_date`, idempotente) que materializa GSC query×page por org.
- Command/job de materialización `materializeGscDailySnapshot(orgId, captureDate)` idempotente (UPSERT por `capture_date`), reutilizando `readSearchConsoleAnalytics` (TASK-1282) — cero cliente GSC nuevo.
- Cloud Scheduler `seo-gsc-snapshot` (diario) → endpoint ops-worker `POST /seo/gsc/snapshot-batch` que itera las orgs con conexión GSC activa.
- Reader `readKeywordOpportunities(targetId)` = join striking-distance (GSC pos 8–20 alta impresión × volumen/dificultad DataForSEO Labs), con contrato `{ ok: true, ... } | { ok: false, errorCode, status }`.
- Honest degradation extremo-a-extremo: sin conexión GSC → `not_connected`, nunca ceros fantasma.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §4.2 (`seo_gsc_daily`), §5 (rank tracking + fuentes GSC vs DataForSEO), §7 (`readKeywordOpportunities`), §8 (materialización + `seo-gsc-snapshot`, no live-per-view), §10.5 (estados/honestidad). **Fuente de verdad de esta task.**
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — TASK-1282 GSC connection + reader per-org.
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PG primero (ventana caliente), materialización vs read-through.
- `CLAUDE.md` §"Outbox publisher canónico — Cloud Scheduler, no Vercel" — el path async-critical (schedulers) vive en Cloud Scheduler + ops-worker, NUNCA Vercel cron (staging no corre crons Vercel).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — `readKeywordOpportunities` es un primitive gobernado reusable (UI/Nexa/MCP).

Reglas obligatorias:

- **GSC = verdad de primera parte, gratis.** Materializar GSC (no gastar DataForSEO en medir el propio clicks/CTR — §3 regla). DataForSEO sólo aporta volumen/dificultad de mercado en el join de oportunidades.
- **Reusar el reader de TASK-1282, no forkear.** `materializeGscDailySnapshot` consume `readSearchConsoleAnalytics`; cero cliente/OAuth GSC nuevo.
- **Append-only por `capture_date`.** `seo_gsc_daily` es medición inmutable; re-ejecutar el cron para el mismo día es idempotente (UPSERT por la UNIQUE de captura), no duplica ni corrompe.
- **Cloud Scheduler, no Vercel cron.** El batch corre en ops-worker (funciona igual en staging y prod).
- **Honest degradation.** Sin conexión GSC → degrada explícito (`not_connected`); un día sin filas elegibles (`succeeded` con 0 rows) ≠ un fallo de query (`query_failed`). Nunca fabricar snapshot ni mostrar $0.
- **Boundary duro.** Cero FK/merge a `grader_*`, payroll, finance. `seo_gsc_daily` FK a `seo_targets` (o a la org canónica) — anclado a `Cliente`.

## Normative Docs

- `src/lib/growth/search-console/reader.ts` — `readSearchConsoleAnalytics(orgId, params)`, contrato `SearchConsoleAnalyticsResult` [reusar tal cual].
- `src/lib/growth/search-console/contracts.ts` — `SearchConsoleAnalyticsRow` (`keys[]`, `clicks`, `impressions`, `ctr`, `position`), `SearchConsoleAnalyticsParams` [reusar].
- `src/lib/ai/dataforseo.ts` — cliente DataForSEO (Labs: search_volume/keyword_difficulty) para el join de oportunidades. Ampliado por TASK-1300 (family registry) — coordinar familia `labs` [verificar contra el estado real de TASK-1300 al tomar].
- `services/ops-worker/server.ts` — patrón de endpoint batch (`handleOutboxPublishBatch`, ruteo `if (method === 'POST' && path === '...')`) [referencia del handler].
- `services/ops-worker/deploy.sh` — declaración del Cloud Scheduler job [donde se registra `seo-gsc-snapshot`].
- `migrations/20260628203847129_task-1282-search-console-connections.sql` — patrón additive del dominio growth (marker + DO-block + GRANTs) [referencia].
- `src/lib/postgres/client.ts` — conexión canónica; `pnpm db:generate-types`.

## Dependencies & Impact

### Depends on

- **`TASK-1299`** — schema `greenhouse_growth.seo_*` (`seo_targets` para la FK/anclaje, y el patrón append-only de snapshots). **Blocker duro.**
- `TASK-1282` — GSC connection + `readSearchConsoleAnalytics` per-org (ya en `src/lib/growth/search-console/`).
- `TASK-1300` — DataForSEO family registry (`labs` para volumen/dificultad en el join de oportunidades). Blanda: `readKeywordOpportunities` puede degradar la columna de mercado si `labs` aún no está disponible [verificar orden real al tomar].
- `greenhouse_growth` schema + convención growth (append-only, FK a `greenhouse_core.organizations`).

### Blocks / Impacts

- Desbloquea `TASK-1306` (Overview cockpit — KPIs GSC) y `TASK-1308` (Keyword opportunities UI — consume `readKeywordOpportunities`).
- Alimenta cálculos de decay/canibalización (§5) que tasks posteriores construyen sobre la serie GSC.
- Es el primer eslabón del camino min-costo `1302 → 1306 → 1307`.

### Files owned

- `migrations/<ts>_task-1302-growth-seo-gsc-daily.sql` [nuevo — tabla `seo_gsc_daily`]
- `src/lib/growth/seo/gsc-daily-materializer.ts` [nuevo — `materializeGscDailySnapshot`]
- `src/lib/growth/seo/keyword-opportunities-reader.ts` [nuevo — `readKeywordOpportunities`]
- `src/lib/growth/seo/contracts.ts` [nuevo o extendido — tipos `KeywordOpportunity`, `GscDailySnapshotResult`]
- `services/ops-worker/server.ts` [modificado — handler `POST /seo/gsc/snapshot-batch` + ruteo]
- `services/ops-worker/deploy.sh` [modificado — Cloud Scheduler `seo-gsc-snapshot`]
- `src/types/db.d.ts` [regenerado — additive]

## Current Repo State

### Already exists

- `readSearchConsoleAnalytics(orgId, params)` per-org con honest degradation (TASK-1282) — el materializer es su consumer principal.
- Cliente DataForSEO `src/lib/ai/dataforseo.ts` (Labs disponible; ampliado por TASK-1300).
- Schema `greenhouse_growth.seo_*` (config + snapshots) — creado por TASK-1299 (blocker).
- Patrón ops-worker batch + Cloud Scheduler (outbox publisher, reactive consumers) como plantilla.

### Gap

- No existe `seo_gsc_daily`: GSC es sólo read-through, sin serie propia. La historia se pierde al pasar los 16 meses de retención de Google.
- No hay materializer GSC ni Cloud Scheduler `seo-gsc-snapshot`.
- No hay `readKeywordOpportunities`: no se puede ver striking-distance ni priorizar keywords quick-win.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (incluye tabla `seo_gsc_daily` additive + Cloud Scheduler diario)
- Source of truth afectado: nueva tabla `greenhouse_growth.seo_gsc_daily` (SoT append-only de la serie GSC materializada) + `readKeywordOpportunities` (reader derivado, sin SoT propio — cruza `seo_gsc_daily` × DataForSEO Labs).
- Consumidores afectados: UI (`TASK-1306` Overview KPIs GSC, `TASK-1308` Keyword opportunities), Nexa/MCP, cálculos decay/canibalización posteriores.
- Runtime target: `staging|production|cron`

### Contract surface

- Contrato existente a respetar: `SearchConsoleAnalyticsResult`/`SearchConsoleAnalyticsRow` (TASK-1282, reusado por el materializer); convenciones schema growth (append-only, FK org, ownership `greenhouse_ops`); patrón Cloud Scheduler + ops-worker (CLAUDE.md §Outbox canónico).
- Contrato nuevo o modificado: tabla `seo_gsc_daily`; command `materializeGscDailySnapshot(orgId, captureDate)`; reader `readKeywordOpportunities(targetId)`; endpoint ops-worker `POST /seo/gsc/snapshot-batch`; job Cloud Scheduler `seo-gsc-snapshot`.
- Backward compatibility: `gated` (tabla + reader nuevos, aditivos; cero cambio a TASK-1282; el módulo se gatea con `GROWTH_SEO_ENABLED`).
- Full API parity: `readKeywordOpportunities` es un **primitive gobernado** en `src/lib/growth/seo/**` (read canónico), consumible por UI + Nexa + MCP sin lógica duplicada por consumer. El job de materialización es infra (cron), no una capability de negocio.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_gsc_daily` [nuevo]; lee `greenhouse_growth.seo_targets`, `seo_keyword_set_members` (para el scope del join), y DataForSEO Labs (externo) en el reader.
- Invariantes que no se pueden romper:
  - `seo_gsc_daily` es **append-only**: 1 fila por (org/target, capture_date, query, page); UPDATE/DELETE bloqueado por anti-mutation trigger (espejo `block_observation_mutation`).
  - **Idempotencia**: UNIQUE(`seo_target_id`|`organization_id`, `capture_date`, `query`, `page`) — re-ejecutar el cron para el mismo `capture_date` hace UPSERT (no duplica).
  - `capture_date` = DATE; `materialized_at` = TIMESTAMPTZ (evitar el bug class `EXTRACT(EPOCH FROM date)` — CLAUDE.md §SQL Signal Reader).
  - **GSC-first**: el materializer NUNCA gasta DataForSEO; sólo `readKeywordOpportunities` cruza volumen/dificultad de mercado.
  - Honest degradation: `readSearchConsoleAnalytics` devuelve `ok:false` → NO se escribe fila (no fabricar ceros). `readKeywordOpportunities` con GSC no conectado → `errorCode: 'not_connected'`.
  - Cero FK/merge a `grader_*`, payroll, finance.
- Tenant/space boundary: `orgId` se deriva server-side; `seo_gsc_daily` FK a `seo_targets` → `greenhouse_core.organizations`. El batch itera sólo orgs con conexión GSC `active`.
- Idempotency/concurrency: UPSERT `ON CONFLICT (unique de captura) DO UPDATE`/`DO NOTHING` por `capture_date`; el batch procesa por-org resiliente (una org que falla no aborta las demás — patrón per-row resilience).
- Audit/outbox/history: la serie `seo_gsc_daily` **es** el historial de primera parte. Sin outbox/BQ mirror en esta task (el mirror de snapshots es del rank capture, TASK-1303) — la historia GSC vive en PG (hot window) por ahora; declarar como deuda el prune-to-BQ si crece.

### Migration, backfill and rollout

- Migration posture: `additive` (1 tabla + índices + anti-mutation trigger + GRANTs; marker `-- Up Migration` + DO-block de verificación).
- Default state: `flag OFF` — el módulo SEO se gatea con `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`). Cloud Scheduler `seo-gsc-snapshot` se despliega **disabled/paused** hasta el flip.
- Backfill plan: opcional — GSC retiene 16 meses; un backfill inicial puede materializar los últimos ~90 días por-org (batch idempotente por `capture_date`, dry-run → apply). N/A si se decide arrancar la serie desde el día 1.
- Rollback path: pausar el Cloud Scheduler job + `GROWTH_SEO_ENABLED=OFF`; reverse migration (DROP `seo_gsc_daily`) + revert PR si no hay filas de valor. La serie acumulada es append-only (dura de revertir por diseño — arch §13.5).
- External coordination: registrar el Cloud Scheduler job vía `deploy.sh` (Cloud Scheduler corre por proyecto GCP). Sin secrets nuevos (GSC OAuth ya resuelto por TASK-1282; DataForSEO ya configurado). Redeploy ops-worker para tomar el handler nuevo.

### Security and access

- Auth/access gate: el endpoint ops-worker usa el auth de worker existente (`services/ops-worker/auth.ts`); el reader `readKeywordOpportunities` deriva `organization_id` server-side y (al integrarse con TASK-1301) pasa por `growth.seo.observation.read`. En esta task el reader queda listo para el gate; el enforcement per-org lo cablea el consumer UI.
- Sensitive data posture: sin PII, sin secretos en el contrato (el refresh token GSC vive en Secret Manager vía TASK-1282, nunca toca esta task). Sólo métricas SEO (query/page/clicks/impresiones/posición).
- Error contract: reader retorna discriminated union `{ ok:false, errorCode, status }` (espejo `SearchConsoleAnalyticsResult`); errores capturados con `captureWithDomain(err, 'growth', ...)`, nunca raw al cliente.
- Abuse/rate-limit posture: el materializer NO pega DataForSEO (GSC-first). `readKeywordOpportunities` respeta el quota cap DataForSEO (`enforceSeoRunEntitlement`, TASK-1301) para el join de mercado; degrada la columna de volumen/dificultad si la cuota está agotada, preservando el striking-distance de GSC.

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes tras regenerar `db.d.ts`; unit test del join striking-distance (fixtures GSC pos 8–20) y del honest degradation (`not_connected` → sin filas).
- DB/runtime checks: `pnpm migrate:up` en staging + verificación SQL contra `information_schema`/`pg_constraint`/`pg_trigger` (tabla, UNIQUE de captura, anti-mutation trigger, `capture_date`=DATE). Smoke: correr `materializeGscDailySnapshot` para una org con GSC conectado → filas escritas; re-correr el mismo día → idempotente (sin duplicados); intentar UPDATE → rechazado por trigger.
- Integration checks: llamada real a `readSearchConsoleAnalytics` contra una org con conexión activa (staging) devolviendo rows; DataForSEO Labs devolviendo volumen/dificultad para el join.
- Reliability signals/logs: log estructurado del batch (`[ops-worker] POST /seo/gsc/snapshot-batch — orgs=N materialized=M skipped=K`). Signal dedicado de lag GSC se puede diferir (el signal ancla de captura es `seo.rank.capture_lag`, TASK-1303); declarar si aplica un `seo.gsc.snapshot_lag`.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **reusa** (touch-it) la capability `growth.seo.observation.read` (definida en `TASK-1301`), no crea una nueva. `readKeywordOpportunities` es uno de los reads gobernados por esa capability (arch §9: `observation.read` cubre rank/backlink/audit/opportunities reads del contratado/operador).

- [x] **Lógica en el primitive, no en la UI.** El join striking-distance vive en `src/lib/growth/seo/keyword-opportunities-reader.ts`, no en un componente. La UI (`TASK-1308`) sólo renderiza.
- [x] **Modelada como reader canónico**, no como click-handler; retorna `{ ok, ... }` reusable por UI/Nexa/MCP.
- [x] **Read** expuesto como reader canónico. Esta task no introduce write de negocio (la materialización GSC es un job de infra, idempotente por `capture_date`).
- [ ] **Capability + grant:** `growth.seo.observation.read` se define y grantea en `TASK-1301` (mismo PR de la capability). Esta task **consume** esa capability; si se toma antes que TASK-1301 aterrice, el reader queda listo y el gate se cablea al integrar (deuda declarada + secuenciada).
- [x] **Camino programático declarado:** reader server-side reusable por UI + Nexa + MCP; sin lógica duplicada por consumer.
- [x] **Write apto para propose→confirm→execute:** N/A — esta task no tiene write de negocio (sólo materialización idempotente de infra).
- [x] **Parity check:** `readKeywordOpportunities` cumple parity a nivel capability (`observation.read`); Nexa/MCP lo operan por construcción.

> Deuda declarada: el enforcement per-org de `growth.seo.observation.read` sobre `readKeywordOpportunities` se activa cuando `TASK-1301` define la capability + `enforceSeoRunEntitlement`. Hasta entonces el reader es funcional pero sin gate — no debe exponerse por ruta client-facing antes de cablear el gate.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `seo_gsc_daily` table + materializer

- Migración additive: `seo_gsc_daily` (target/org FK, `capture_date` DATE, `query`, `page`, `clicks`, `impressions`, `ctr`, `position`, `materialized_at` TIMESTAMPTZ, UNIQUE de captura) + anti-mutation trigger (espejo `block_observation_mutation`) + índice `(seo_target_id, capture_date DESC)` + GRANTs runtime. Marker + DO-block de verificación.
- `materializeGscDailySnapshot(orgId, captureDate)` en `src/lib/growth/seo/gsc-daily-materializer.ts`: llama `readSearchConsoleAnalytics(orgId, { range: {startDate: captureDate, endDate: captureDate}, dimensions: ['query','page'], rowLimit })`; si `ok:true`, UPSERT filas por `capture_date` (idempotente); si `ok:false`, NO escribe (honest degradation) y retorna el `errorCode`.
- Regenerar `db.d.ts`. Unit test del honest degradation + idempotencia.

### Slice 2 — Cloud Scheduler batch (ops-worker)

- Handler `POST /seo/gsc/snapshot-batch` en `services/ops-worker/server.ts`: resuelve `captureDate = ayer` (America/Santiago), itera orgs con conexión GSC `active`, corre `materializeGscDailySnapshot` por org (per-row resilience: una org que falla se loguea, no aborta el batch), retorna `{ orgs, materialized, skipped }`.
- Registrar Cloud Scheduler `seo-gsc-snapshot` (diario) en `services/ops-worker/deploy.sh`, desplegado **paused/disabled** hasta el flip de `GROWTH_SEO_ENABLED`.
- Log estructurado. Test del handler (server.test.ts pattern).

### Slice 3 — `readKeywordOpportunities` (join striking-distance)

- `readKeywordOpportunities(targetId)` en `src/lib/growth/seo/keyword-opportunities-reader.ts`: lee de `seo_gsc_daily` (última ventana) las keywords en **posición 8–20 con alta impresión**; cruza contra DataForSEO Labs (search_volume + keyword_difficulty) vía el family registry (`labs`, TASK-1300); computa un score de oportunidad (impresión × volumen / dificultad) + zona quick-win; retorna `{ ok:true, opportunities: [{ keyword, page, position, impressions, ctr, searchVolume, difficulty, opportunityScore, quickWin }] } | { ok:false, errorCode, status }`.
- Honest degradation: sin conexión GSC → `not_connected`; si DataForSEO Labs no disponible/cuota agotada → degrada las columnas de mercado, preserva el striking-distance de GSC (marca `market: 'unavailable'`).
- Contratos en `src/lib/growth/seo/contracts.ts`. Unit test del join + degradación.

## Out of Scope

- Rank capture DataForSEO + `readRankEvolution` + BQ mirror + `seo.rank.capture_lag` (TASK-1303).
- Site audit + backlinks (TASK-1304).
- `readSeoAeoGap` cross-módulo (TASK-1305).
- Definición de las capabilities `growth.seo.*` + `enforceSeoRunEntitlement` (TASK-1301) — esta task consume `observation.read`, no la define.
- DataForSEO family registry en sí (TASK-1300) — esta task lo consume (familia `labs`).
- Cualquier UI (TASK-1306/1308).
- BQ mirror / prune-to-BQ de `seo_gsc_daily` (deuda declarada; se decide según crecimiento).
- Cálculo de decay/canibalización (posterior; esta task fija la serie base).

## Detailed Spec

Ver `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §4.2 (`seo_gsc_daily`: materialización diaria de GSC query×page append-only por `capture_date`, convierte el read-through en serie propia > 16 meses), §7 (`readKeywordOpportunities` = join SEO↔GSC striking-distance pos 8–20 alta impresión × volumen/dificultad DataForSEO), §8 (`seo-gsc-snapshot` diario → `readSearchConsoleAnalytics(orgId, {ayer, ['query','page']})` → `seo_gsc_daily`; Cloud Scheduler + ops-worker, no Vercel cron), §3 (regla GSC-first: no gastar DataForSEO en medir el propio clicks/CTR), §10.5 (estados honestos: sin conexión GSC → EmptyState accionable, nunca ceros). El materializer es un **consumer** del reader per-org de TASK-1282 — cero cliente GSC nuevo. `capture_date` DATE + `materialized_at` TIMESTAMPTZ (evitar bug class EXTRACT). Anti-mutation trigger espejo del AEO. GRANTs read/write a `greenhouse_runtime`, ownership `greenhouse_ops`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tabla + materializer) es prerequisito de Slice 2 (el batch llama el materializer) y de Slice 3 (el reader lee `seo_gsc_daily`). Orden: 1 → 2 → 3. Slice 3 (`readKeywordOpportunities`) puede shippear sin Slice 2 (con materialización manual), pero el valor recurrente lo da el Cloud Scheduler de Slice 2.
- El Cloud Scheduler `seo-gsc-snapshot` se despliega **paused** hasta que `GROWTH_SEO_ENABLED` se prenda. NUNCA prenderlo sin la tabla creada + redeploy ops-worker verificado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cron escribe ceros fantasma cuando GSC no está conectado | growth | medium | honest degradation: `readSearchConsoleAnalytics` `ok:false` → NO escribe fila; el batch skip + loguea la org | log `skipped=K` + ausencia de filas para esa org |
| Doble escritura por re-ejecución del cron el mismo día | data | medium | UPSERT idempotente por UNIQUE de captura (`capture_date`); test de idempotencia | conteo de filas por `capture_date` |
| `capture_date` como TIMESTAMP → bug class EXTRACT en reads temporales | data | medium | `capture_date` DATE explícito, `materialized_at` TIMESTAMPTZ; verificar `information_schema` | smoke query / lint `no-extract-epoch-from-date-subtraction` |
| Join de oportunidades quema cuota DataForSEO por org | integrations/$ | medium | `readKeywordOpportunities` batchea Labs + respeta `enforceSeoRunEntitlement` (quota cap); degrada a striking-distance GSC-only si cuota agotada | `seo.provider.cost_over_budget` (TASK-1301/1300) |
| Cloud Scheduler en Vercel (no corre en staging) | ops | low | job en Cloud Scheduler + ops-worker (CLAUDE.md §Outbox canónico), NUNCA `vercel.json` | ausencia de runs en staging |
| Una org que falla aborta el batch entero | ops | medium | per-row resilience: try/catch por-org, continúa; loguea la org fallida | log de error por-org |

### Feature flags / cutover

- `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) gatea el módulo. `isSearchConsoleEnabled()` (TASK-1282) sigue gateando GSC. Cloud Scheduler `seo-gsc-snapshot` desplegado paused; se despausa manualmente al prender el flag en staging primero, luego prod.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (DROP `seo_gsc_daily`) + revert PR (sin filas de valor aún) | <5 min | si |
| Slice 2 | pausar Cloud Scheduler `seo-gsc-snapshot` + revert del handler | <5 min | si |
| Slice 3 | revert del reader + su consumer (ninguna UI aún) | <5 min | si |

> Una vez acumulada la serie, `seo_gsc_daily` es append-only (dura de revertir por diseño); el rollback operativo real es pausar el cron + flag OFF, no borrar la historia.

### Production verification sequence

1. `pnpm migrate:up` en staging → DO-block confirma `seo_gsc_daily` + UNIQUE + anti-mutation trigger + `capture_date`=DATE.
2. Redeploy ops-worker con el handler `POST /seo/gsc/snapshot-batch`; smoke manual del endpoint (auth de worker) para una org con GSC `active` → filas escritas.
3. Re-correr el batch el mismo `capture_date` → verificar idempotencia (sin duplicados). Intentar UPDATE a una fila → rechazado por trigger.
4. `readKeywordOpportunities(targetId)` devuelve striking-distance real (pos 8–20) + columnas de mercado DataForSEO; con GSC desconectado devuelve `not_connected` (sin ceros).
5. Prender `GROWTH_SEO_ENABLED` en staging + despausar Cloud Scheduler; observar el run diario. Luego promover a prod vía release control plane.

### Out-of-band coordination required

- Registrar/desplegar el Cloud Scheduler job (`deploy.sh` → Cloud Scheduler, proyecto GCP). Redeploy ops-worker. Sin secrets nuevos. Prender el flag es acción de operador coordinada con staging-first.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Source of truth nombrado: tabla `greenhouse_growth.seo_gsc_daily` (append-only, materialización GSC) + reader derivado `readKeywordOpportunities`.
- [ ] `seo_gsc_daily` append-only: anti-mutation trigger rechaza UPDATE/DELETE (verificado con smoke); UNIQUE de captura por `capture_date` garantiza idempotencia.
- [ ] `capture_date` = DATE, `materialized_at` = TIMESTAMPTZ (verificado en `information_schema`).
- [ ] `materializeGscDailySnapshot` reusa `readSearchConsoleAnalytics` (cero cliente GSC nuevo) y NO escribe filas cuando el reader degrada (honest degradation, sin ceros fantasma).
- [ ] Cloud Scheduler `seo-gsc-snapshot` registrado en `deploy.sh` (Cloud Scheduler + ops-worker, NO `vercel.json`), desplegado paused; batch per-row resiliente.
- [ ] `readKeywordOpportunities(targetId)` retorna striking-distance (pos 8–20 alta impresión) × volumen/dificultad DataForSEO Labs, con contrato `{ ok, ... }`; degrada las columnas de mercado si Labs no disponible/cuota agotada, preservando el striking-distance GSC.
- [ ] Boundary: cero FK/merge a `grader_*`, payroll, finance; anclaje a `greenhouse_core.organizations` vía `seo_targets`.
- [ ] Consume la capability `growth.seo.observation.read` (TASK-1301); deuda del gate per-org declarada si esa task no aterrizó aún.
- [ ] GSC-first: el materializer NO pega DataForSEO; sólo el reader de oportunidades cruza mercado, respetando el quota cap.
- [ ] `db.d.ts` regenerado; `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes.
- [ ] Down migration solo DROP (cero CREATE bajo `-- Down Migration`).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (unit: honest degradation, idempotencia, join striking-distance)
- `pnpm migrate:up` en staging + verificación SQL (`information_schema`/`pg_constraint`/`pg_trigger`) + smoke anti-mutation (UPDATE rechazado) + smoke idempotencia (re-run mismo `capture_date`).
- Smoke del endpoint ops-worker `POST /seo/gsc/snapshot-batch` contra una org con GSC `active` en staging.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` — fila de `GROWTH_SEO_ENABLED` (o §Pendientes de acción si queda code-complete sin prender)
- [ ] chequeo de impacto cruzado (TASK-1306/1308 consumen esta serie + reader)
- [ ] documentación técnica del materializer GSC + reader de oportunidades (arquitectura del dominio SEO)

## Follow-ups

- `TASK-1303` — Rank capture command + `readRankEvolution` + BQ mirror + `seo.rank.capture_lag`.
- `TASK-1306` — Overview cockpit UI que consume los KPIs GSC de `seo_gsc_daily`.
- `TASK-1308` — Keyword opportunities UI que consume `readKeywordOpportunities`.
- Definir BQ mirror / prune-to-BQ de `seo_gsc_daily` si la ventana caliente crece (deuda declarada).
- Evaluar signal `seo.gsc.snapshot_lag` (steady=0) si el Overview lo requiere.

## Open Questions

1. ¿`seo_gsc_daily` FK a `seo_target_id` o directo a `organization_id`? Propuesta: FK a `seo_targets` (consistente con el resto de snapshots); resolver contra el schema real de TASK-1299 en Discovery.
2. ¿Umbral exacto de "striking-distance" y de "alta impresión"? Propuesta: posición 8–20 + impresiones ≥ percentil configurable; confirmar con SEO/AEO skill.
3. ¿Orden real de aterrizaje de TASK-1300 (family registry `labs`)? Si aún no está, `readKeywordOpportunities` degrada la columna de mercado hasta que Labs exista. Resolver en Discovery.
4. ¿`rowLimit` de GSC por día (query×page puede ser voluminoso)? Propuesta: cap configurable + paginar si hace falta; confirmar contra el volumen real de Berel.
