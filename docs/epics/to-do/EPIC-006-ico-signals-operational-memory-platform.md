# EPIC-006 — ICO Signals as Operational Memory Platform

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform` (ICO engine, serving, agent)
- Owner: `unassigned`
- Branch: `epic/EPIC-006-ico-signals-operational-memory-platform`
- GitHub Issue: `—`

## Summary

Transformar la capa de ICO signals de un **snapshot diario** (overwrite total por período) a una **plataforma de memoria operativa** con identidad estable, lifecycle explícito, audit trail, observabilidad propia, governance multi-tenant, y contrato API/webhook para integraciones. El diseño actual trata los signals como si fueran una vista materializada (equivalente a `metrics_by_member`) — los borra y reescribe cada materialize — lo que rompe el contrato más básico de un sistema de alertas: **memoria histórica de eventos operativos**. Ningún sistema enterprise-grade (Sentry, PagerDuty, Datadog Incidents) funciona así. El epic instala el modelo correcto (eventos append-only + signals consolidados por `signal_key` determinista + reconcile idempotente + state machine auditada) en paralelo al actual via strangler fig, valida con dual-read, y retira el legacy. Cubre schema v2, materialize refactor, LLM enrichment governance, API de transiciones, webhooks outbound, observability del pipeline, UI inbox operativo, y migración sin downtime.

## Why This Epic Exists

### El diseño actual borra historia

`src/lib/ico-engine/ai/materialize-ai-signals.ts:295-307` hace `DELETE FROM ico_engine.ai_signals WHERE period_year = X AND period_month = Y` seguido de `INSERT` con los signals detectados esa corrida. Eso significa:

- El signal del 23 de Abril que avisó "Daniela FTR crítico a 69.2%" **fue borrado** la mañana del 24 de Abril cuando el algoritmo ya no la detectó como outlier (porque se completaron sus tasks sin retrabajo).
- No existe evidencia operativa de que ese deterioro pasó. No hay MTTR posible, no hay auditoría de alertas, no hay forma de medir falsos positivos.
- Si un humano accionó el signal (cerró tareas de retrabajo) no queda registro de que la acción funcionó.
- La UI muestra narrativas cacheadas de signals que ya no existen en el canonical (enrichments huérfanos).
- La proyección a PG `greenhouse_serving.ico_ai_signals` hace `UPSERT` por `signal_id` random pero no limpia signals borrados en BQ — PG queda con 7 huérfanos de Mar 2026 cuando BQ los machacó.

El caso Daniela (documentado en sesión 2026-04-24) expuso el bug en producción: el screenshot mostraba "FTR% 69.2% de Daniela, contribución 95.9925%" al mismo tiempo que el tile de su ficha mostraba "FTR% 93%". Los dos números son correctos en sus respectivos momentos; el problema es que el sistema trata al primero como dato vivo en lugar de un evento histórico.

### Los signals son eventos, no estado

Conceptualmente:

| Capa | Semántica | Refresh | Retención |
|---|---|---|---|
| `ico_engine.metrics_by_*` | Snapshot de estado | Overwrite diario OK | Indefinida |
| `ico_engine.signal_events` (NUEVA) | Evento inmutable con timestamp | Append-only | Indefinida |
| `ico_engine.signals` (REFACTORIZADA) | Estado consolidado derivado de eventos | UPSERT por `signal_key` determinista | Indefinida con lifecycle |

El código actual colapsó las 3 capas en `ai_signals` y la trata como la primera — ese es el bug estructural. Enterprise-grade exige las 3 separadas.

### Identidad actual es random, debería ser determinista

Hoy `signal_id = EO-AIS-{hash aleatorio}`. Cada corrida genera un `signal_id` distinto aunque la condición subyacente sea la misma. Eso impide reconciliar con corridas previas. La fórmula correcta:

```
signal_key = sha256(space_id :: dimension :: dimension_id :: metric_name :: period_year :: period_month :: severity_band)
```

Misma condición → mismo `signal_key` → `UPSERT` natural → reconcile idempotente.

### El enrichment LLM también es deficiente

- Regenera narrativa en cada corrida aunque nada cambió material mente (gasta tokens).
- No versiona por `prompt_hash` ni `algorithm_version` (no reproducible).
- No tiene budget cap por tenant (no hay control de costo enterprise).
- No tiene quality gate (puede propagar narrativas low-confidence a UI).
- Genera huérfanos cuando el signal parent fue borrado por el materialize.

### Falta de observabilidad del propio pipeline

- No hay `materialize_runs` table con counts (detected, created, refreshed, auto_resolved).
- No hay SLIs definidos (freshness, MTTA, MTTR, auto-resolve rate, false positive rate).
- No hay meta-alertas para el operador del sistema (ej. "volumen de signals cayó 80% — algo se rompió en el detector").
- No hay dashboard de Ops Health que muestre la salud de la capa de alertas.

### Falta de superficie API y governance

- No hay endpoints para `acknowledge / resolve / suppress / reenrich`.
- No hay state machine — cualquier código puede mutar campos arbitrariamente.
- No hay webhook outbound para integraciones externas (Slack, PagerDuty, tickets).
- No hay RBAC explícito sobre transiciones (quién puede cerrar un signal crítico).
- No hay tenant isolation vía RLS — solo filtro en código.

### La UI tampoco habla el idioma correcto

- Cards en dashboard sin state, sin assign, sin snooze, sin timeline.
- No se puede filtrar por "alertas abiertas este mes" vs "alertas resueltas".
- No se puede ver historial de un signal (cuándo apareció, quién lo acknowledgió, cómo se resolvió).
- No hay MTTR dashboard, no hay governance de cumplimiento de SLA.

### Qué cambia la topología con este epic

```
ANTES (hoy):

  materialize-ai-signals ── DELETE+INSERT ──► ico_engine.ai_signals (BQ)
                                                      │
                                                      └─► projection UPSERT ──► greenhouse_serving.ico_ai_signals (PG)
                                                                                      │
                                                                                      └─► UI lee tags estáticos

  llm-enrichment-worker ── regen completo ──► ai_signal_enrichments (BQ) ─► PG serving
  (orphans everywhere)


DESPUÉS (post-EPIC-006):

  materialize-ai-signals ── reconcile ──┬─► signal_events (BQ+PG) append-only
                                        │
                                        └─► signals (BQ+PG) UPSERT por signal_key determinista
                                                            │
                                                            ├─► materialize_runs table (observability)
                                                            │
                                                            └─► transitions via state machine
                                                                          │
                                                                          ├─► UI inbox operativo
                                                                          │
                                                                          ├─► webhook outbound (Slack, tickets, Nexa)
                                                                          │
                                                                          └─► signal_enrichments versionados (solo regen cuando material)
```

## Outcome

- **Signals preservan historia**: cada evento queda registrado con `detected_at` / `last_seen_at` / `resolved_at` / `resolved_reason`. Ya nadie borra signals "porque el algoritmo ya no los detecta"; se marcan `auto_resolved`.
- **Identidad determinista**: `signal_key = sha256(dims + severity_band)` garantiza idempotencia y reconciliación correcta en re-runs y reprocesamientos retroactivos.
- **State machine explícita**: `open → acknowledged → acting → resolved | suppressed | auto_resolved`, con audit trail vía `signal_events` append-only.
- **LLM enrichment versionado**: solo se regenera cuando `prompt_hash` o `severity_band` cambia. Budget cap por tenant. Quality gate ≥ 0.6. Cache por `prompt_hash`. Reducción estimada de ~80% en costo LLM.
- **Observability con SLIs**: freshness < 24h, materialize latency < 5 min, enrichment latency < 15 min, MTTA < 4h para critical, MTTR < 48h critical. Meta-alertas cuando violan umbrales.
- **Multi-tenant hardening**: RLS en PG por `space_id`, cross-tenant consistency checks nightly, quotas por tenant (signals/día, LLM budget/mes).
- **API pública**: `GET /api/signals`, `POST /api/signals/:key/acknowledge|resolve|suppress|reenrich`, `GET /api/signals/stats`. Todas con RBAC.
- **Webhook outbound**: cada transición state publica HMAC-signed webhook al endpoint configurado por tenant (Slack, PagerDuty, custom integrations). Dead-letter queue, retries exponenciales.
- **UI inbox operativo**: reemplaza las cards stateless por inbox con status, assign, snooze, timeline, filtros por status/severity/dimension/time.
- **Nexa integration nativa**: el agente AI lee signals vía API con el RBAC del user activo. Puede ejecutar transiciones (acknowledge, suppress) en nombre del user con audit trail.
- **Migración sin downtime**: strangler fig con dual-write (~14 días), validación de paridad, cutover de read, cutover de write, deprecate v1. Backfill de historia opcional con `algorithm_version='legacy-backfill'`.
- **Docs actualizadas**: `GREENHOUSE_ICO_ENGINE_V2.md` canónico, `docs/documentation/ico-signals-operational-memory.md` lenguaje simple, changelog completo.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` (refactor a V2 como parte del epic)
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (eventos de signal lifecycle)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (pattern para outbound webhooks)

## Existing Related Work

- **TASK-588** (complete 2026-04-24) — Project Title Resolution Hardening en Conformed Sync. El resolver del ICO quedó defendido contra sentinels y IDs técnicos; ese trabajo es prerequisito natural y ya está cerrado.
- **TASK-586** (to-do) — Notion Sync & Billing Export Observability in Admin Center. Comparte superficie de Ops Health; este epic agrega SLIs del pipeline ICO que pueden convivir.
- **Contrato ICO V1** (`docs/architecture/Contrato_Metricas_ICO_v1.md`) — fórmulas canónicas de métricas. Este epic NO toca las fórmulas; refactoriza solo la capa de signals.
- **Proyecto ICO Engine core** (`src/lib/ico-engine/`) — detector de anomalías, root-cause analyzer, predictor. Estos módulos NO se tocan; el epic refactoriza solo el materialize + persistencia + API.
- **LLM enrichment worker** (`src/lib/ico-engine/ai/llm-enrichment-worker.ts`) — se refactoriza dentro del epic (TASK-593).
- **`services/ico-batch/`** Cloud Run — adapta `POST /ico/materialize` al nuevo reconcile pattern (TASK-591) y `POST /ico/llm-enrich` al enrichment versionado (TASK-593).

## Child Tasks (8 tareas propuestas)

### TASK-590 — Schema v2 + identidad determinista + event store

Foundation. Migraciones PG + BQ para las tablas nuevas conviviendo con las actuales (no breaking):

- `ico_engine.signal_events` (append-only, bi-temporal)
- `ico_engine.signals_v2` (consolidado con `signal_key` determinista + lifecycle)
- `ico_engine.signal_enrichments_v2` (versionado por `signal_key` + `enrichment_version`)
- `ico_engine.materialize_runs` (observability del pipeline)
- Helpers de `signal_key` hash + tests de determinismo + tests de colision-safety.

Effort: **Alto**. Dependencias: ninguna. Bloquea: todo el resto.

### TASK-591 — Reconcile-based materialize refactor + idempotencia matemática

Reemplaza `replaceBigQuerySignalsForPeriod` por `reconcileSignalsForPeriod`:

- Detecta signals actuales → compara contra `open` en `signals_v2` → UPSERT + mark auto_resolved los ausentes.
- Cada transición emite `signal_events` con `run_id + actor_type='system'`.
- Dual-write a v1 (compatibilidad) + v2 (nuevo contrato).
- Property test: `reconcile(reconcile(s)) === reconcile(s)` (idempotencia).
- Chaos test: crash a mitad, re-run completa sin duplicar.

Effort: **Alto**. Depende de: TASK-590. Bloquea: TASK-597 (migración).

### TASK-592 — State machine + transitions API

CRUD de transiciones con state machine enforcement:

- `POST /api/signals/:key/acknowledge` — transitions `open → acknowledged`
- `POST /api/signals/:key/resolve` — valid desde `acknowledged|acting` con `resolved_reason`
- `POST /api/signals/:key/suppress?until=…&reason=…` — snooze
- `POST /api/signals/:key/reopen` — rechazado si `resolved` (crea nuevo ciclo)
- RBAC: `signals.acknowledge`, `signals.resolve`, `signals.suppress` capabilities.
- Todo cambio escribe `signal_events` con `actor_type + actor_id + reason`.

Effort: **Medio**. Depende de: TASK-590. Bloquea: TASK-595 (UI) y TASK-596 (webhooks).

### TASK-593 — LLM enrichment con versioning + budget controls + quality gate

Refactor de `llm-enrichment-worker.ts`:

- Tabla `signal_enrichments_v2` con `enrichment_version + prompt_hash + algorithm_version`.
- Política de regeneración: solo si `severity_band` cambió O `prompt_hash` cambió O manual override.
- `is_current BOOLEAN` único por `signal_key`; historial preservado.
- Budget cap por tenant en `ico_engine.enrichment_budgets` (tokens/día, USD/mes).
- Quality gate: enrichments con `quality_score < 0.6` se descartan, fallback templated.
- Circuit breaker: latencia p95 > 10s por 5min → suspender + flag `enrichment_degraded`.

Effort: **Medio**. Depende de: TASK-590. Independiente de TASK-591 (puede ir en paralelo).

### TASK-594 — Materialize runs observability + SLIs + meta-alertas

Instrumentación del pipeline como sistema alertable:

- Cada `reconcileSignalsForPeriod` escribe fila a `materialize_runs` con counts + durations + status.
- SLIs: freshness, materialize latency, enrichment latency, detection stability (±3σ), MTTA, MTTR, auto-resolve rate, false positive rate.
- Dashboard en Admin Ops Health con todos los SLIs + panel de runs recientes.
- Meta-alertas a Slack/Ops cuando un SLI viola umbral (reusar infra de TASK-586 si aplica).

Effort: **Medio**. Depende de: TASK-591. Coordina con: TASK-586.

### TASK-595 — UI inbox operativo + timeline + filtros

Frontend reemplaza cards stateless por inbox real:

- Vista lista con filtros: `status | severity | dimension | period | space | assigned_to | tag`.
- Card de signal muestra: status badge, severity, current vs expected, contribution, `detected_at`/`last_seen_at`, acciones rápidas.
- Timeline view: todos los `signal_events` de un `signal_key` ordenados.
- Panel de métricas agregadas: MTTA, MTTR, volumen por severity, auto-resolve rate.
- Reemplaza la sección "Nexa insights" home card con ingest de los mismos signals pero en formato inbox.
- Invocación skill: `greenhouse-dev` + `greenhouse-ux` + `greenhouse-ux-writing`.

Effort: **Alto**. Depende de: TASK-592 (transitions API).

### TASK-596 — Webhooks outbound + Nexa integration via API

Superficie de integración enterprise:

- Tabla `ico_engine.signal_webhook_subscriptions` con `space_id + endpoint_url + signing_secret + event_types[]`.
- Cada transición de state publica webhook con payload HMAC-signed. Retries exponenciales, dead-letter.
- Nexa lee signals vía `GET /api/signals` con el RBAC del user en sesión.
- Nexa puede ejecutar `acknowledge/suppress` en nombre del user con audit trail (`actor_type='agent'`, `agent_id`).
- Integraciones primera ola: Slack, email, custom HTTP.

Effort: **Medio**. Depende de: TASK-592. Independiente de TASK-594/595.

### TASK-597 — Migración strangler fig + backfill + deprecate v1

Cutover sin downtime:

- Fase 1 (dual-write, ~14 días): el materialize nuevo escribe a ambas v1 y v2. Validar counts y values diarios.
- Fase 2 (dual-read shadow): UI sigue en v1, pinta v2 invisible, diff loggeado a `signal_diff_log`.
- Fase 3 (cutover read): UI lee v2, v1 sigue escribiéndose.
- Fase 4 (cutover write): deja de escribir v1. Tabla legacy congelada.
- Fase 5 (30 días sin reads): `DROP` v1.
- Backfill opcional: correr `reconcile` sobre todos los períodos históricos con `algorithm_version='legacy-backfill'` para regenerar `detected_at` sintético.
- Limpieza de huérfanos existentes en PG serving.

Effort: **Alto**. Depende de: TASK-590, TASK-591, TASK-593.

## Dependencies & Sequence

```
TASK-590 (schema) ──┬──► TASK-591 (reconcile) ──► TASK-594 (observability)
                    ├──► TASK-592 (state API)  ──► TASK-595 (UI)
                    │                           └─► TASK-596 (webhooks)
                    └──► TASK-593 (LLM enrichment)
                                         
TASK-591 + TASK-592 + TASK-593 ──► TASK-597 (migración/cutover)
```

**Ruta crítica**: TASK-590 → TASK-591 → TASK-597. Sin estas tres, v1 sigue corrompiendo memoria operativa.

**Paralelizables**: TASK-592 y TASK-593 pueden correr en paralelo con TASK-591. TASK-594, TASK-595, TASK-596 pueden correr en paralelo una vez que 591/592 están.

## Exit Criteria

- [ ] TASK-590 a TASK-597 todas `complete`.
- [ ] PG `greenhouse_serving.ico_ai_signals` tiene 0 huérfanos (signals sin pareja en BQ).
- [ ] `signal_events` append-only con ≥ 1 evento por cada signal_key activo.
- [ ] `reconcile` es idempotente (property test pasa, chaos test pasa).
- [ ] Every state transition produces a `signal_event` with `actor_type` + `actor_id` + `reason`.
- [ ] LLM enrichment budget cap configurable por tenant y enforceado runtime.
- [ ] Enrichment no regenera cuando `prompt_hash` + `severity_band` no cambiaron (test ejercita el case).
- [ ] SLIs dashboard visible en Admin Ops Health; meta-alertas notifican a Slack/Ops.
- [ ] UI inbox permite acknowledge/resolve/suppress con feedback visual + audit trail visible.
- [ ] Nexa agent puede leer signals + ejecutar transiciones con su propio RBAC.
- [ ] Webhook outbound entregó al menos 1 evento HMAC-signed en staging con endpoint test.
- [ ] Migración strangler fig completa, v1 droppeada.
- [ ] Zero downtime: ningún usuario reportó "alertas desaparecidas" durante el cutover.
- [ ] `GREENHOUSE_ICO_ENGINE_V2.md` creado; `Greenhouse_ICO_Engine_v1.md` marcado superseded.
- [ ] Doc funcional en `docs/documentation/` actualizada.

## Non-goals

- **No cambiar las fórmulas canónicas de métricas** (`Contrato_Metricas_ICO_v1.md` queda intacto; solo refactorizamos la capa de signals, no el cálculo).
- **No rediseñar el detector de anomalías** (`anomaly-detector.ts`, `predictor.ts`, `root-cause-analyzer.ts` se mantienen). El epic toca orchestration + persistencia + API + enrichment + UI, no los algoritmos.
- **No cambiar la capa de métricas** (`metrics_by_member`, `metrics_by_space`) — esas sí son snapshots legítimos y se mantienen con overwrite diario.
- **No incluir análisis predictivo nuevo** (el predictor existente se conserva).
- **No incluir integraciones terceros específicas** más allá del webhook outbound genérico. PagerDuty/Slack adapters específicos se hacen en tasks follow-up fuera del epic.
- **No cambiar el enrichment model** (Gemini sigue siendo el backend LLM; solo se gobierna su invocación).
- **No retirar el ico-batch Cloud Run** — solo se adapta para invocar reconcile en vez de replace.
- **No modificar los crons existentes** (Cloud Scheduler jobs permanecen; solo cambia el handler backend).
- **No romper la UI de Nexa existente** durante el cutover; la migración es transparente.

## Delta 2026-04-24 — Creación del epic

Epic creado tras análisis detallado de la discrepancia del caso Daniela (signal FTR 69.2% vs tile 93%) que expuso el error de diseño del materialize actual (`DELETE+INSERT` por período cada corrida). Se descartaron alternativas más pequeñas (solo fix de idempotencia, solo UI refactor) porque el problema es estructural y requiere refactorizar 4 capas simultáneamente: schema, materialize, enrichment, UI + API. Las 8 child tasks están en `to-do/`; rank relativo y ownership se definirán durante planning operacional.
