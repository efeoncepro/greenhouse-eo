# TASK-590 — ICO Signals Schema v2: identidad determinista + event store (EPIC-006 child 1/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-590-ico-signals-schema-v2`
- Legacy ID: `none`
- GitHub Issue: `—`

## Summary

Crear el schema fundacional de la nueva capa de signals sin breaking changes al v1 actual: tabla de eventos append-only (`signal_events`), tabla consolidada con identidad determinista (`signals_v2`), enrichments versionados (`signal_enrichments_v2`), observabilidad del pipeline (`materialize_runs`), y helper canónico de `signal_key` hash con tests de determinismo + colision-safety. Conviven con `ai_signals` actual hasta que TASK-597 complete el cutover.

## Delta 2026-04-24 — TASK-598 shipped: no romper la capa de presentación

`TASK-598` (complete, commit `b5e2431f` en develop, deploy live en Cloud Run `ops-worker` revisión `00070-bj4`) instaló `src/lib/ico-engine/ai/narrative-presentation.ts` con tres utilities que el weekly digest ya consume en prod: `resolveMentions`, `loadMentionContext`, `selectPresentableEnrichments`. También está activo el handler `POST /nexa/weekly-digest` con params `dryRun` + `recipients_override` + `limit`, y el log estructurado `narrative_presentation` en Cloud Logging.

**Qué significa para esta task (Schema v2):**

El schema `ico_engine.signal_enrichments_v2` que crea esta task DEBE mantener compatibilidad con los campos que lee `selectPresentableEnrichments`, para que el switch de read path en TASK-597 no rompa el digest ni downstream consumers. Campos mínimos esperados:

| Campo | Fuente actual (v1) | Obligatorio en v2 |
|---|---|---|
| `enrichment_id` | `ico_ai_signal_enrichment_history.enrichment_id` | sí |
| `signal_id` | `ico_ai_signal_enrichment_history.signal_id` | sí (o equivalente stable para el JOIN) |
| `space_id` | `ico_ai_signal_enrichment_history.space_id` | sí |
| `signal_type` | idem | sí |
| `metric_name` | idem | sí |
| `severity` | idem | sí |
| `quality_score` | idem | sí |
| `confidence` | idem | sí |
| `explanation_summary` | idem | sí |
| `root_cause_narrative` | idem | sí |
| `recommended_action` | idem | sí |
| `processed_at` | idem | sí |
| `member_id` | idem | sí |
| `project_id` | idem | sí |

**Contrato que NO se debe romper:**

- Firma pública de `resolveMentions(narrative, context): ResolvedNarrative`, `loadMentionContext({enrichments, fallbacks}): Promise<MentionResolutionContext>`, `selectPresentableEnrichments(windowStart, windowEnd, filters): Promise<PresentableEnrichment[]>`.
- Shape de `WeeklyDigestBuildResult` (consumido por `WeeklyExecutiveDigestEmail.tsx` y por el handler `/nexa/weekly-digest`).
- Comportamiento del handler ops-worker `POST /nexa/weekly-digest` (params `dryRun`, `recipients_override`, `limit`).
- Shape del log estructurado `narrative_presentation` (Cloud Logging consumer futuro: TASK-594).

**Sinergia con TASK-598:**

- Cuando signals_v2 aterrice, el `signal_key` determinista permite que `selectPresentableEnrichments` elimine el INNER JOIN de filtro de huérfanos (ya no existirán) — pero **no elimines el JOIN todavía**; espera al cutover completo en TASK-597.
- Si el enrichments_v2 guarda mentions por ID puro (sin label frozen), `resolveMentions` sigue funcionando sin cambios — pero el lookup se vuelve redundante, útil como fallback.

**Referencias:**

- Spec TASK-598: `docs/tasks/complete/TASK-598-ico-narrative-presentation-layer.md`
- Runbook: `docs/runbooks/ico-weekly-digest-rollback.md`
- Arquitectura: `docs/architecture/Greenhouse_ICO_Engine_v1.md` (delta 2026-04-24)
- Código: `src/lib/ico-engine/ai/narrative-presentation.ts` + tests

## Why This Task Exists

La identidad actual de los signals (`signal_id = EO-AIS-{random}`) rompe idempotencia: cada `reconcileSignalsForPeriod` tendría que generar el mismo ID para la misma condición, lo que es imposible con hash aleatorio. Sin identidad determinista no hay UPSERT correcto ni reconcile matemáticamente idempotente. Este task instala el contrato de datos que el resto del epic asume como foundation.

## Goal

- Schema PG + BQ con 4 tablas nuevas co-existentes con v1.
- Función `buildSignalKey(dims)` determinista con fórmula canónica documentada y tests.
- Migración reversible sin tocar data existente.
- Tipos Kysely regenerados.

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:
- Usar `pnpm migrate:create`; jamás crear migraciones a mano.
- Tablas nuevas con `greenhouse_ops` como owner y grants a runtime/migrator por convención.
- Tipos generados por `pnpm db:generate-types` commiteados junto a la migración.

## Dependencies & Impact

### Depends on
- Ninguna. Es foundation.

### Blocks / Impacts
- TASK-591 (reconcile) — lee/escribe signals_v2.
- TASK-592 (state API) — transitions sobre signals_v2 + events.
- TASK-593 (enrichment) — versiona en signal_enrichments_v2.
- TASK-594 (observability) — lee materialize_runs.
- TASK-597 (migración) — base del strangler fig.

### Files owned
- `migrations/*_ico-signals-schema-v2-foundation.sql`
- `src/types/db.d.ts` (regenerado)
- `src/lib/ico-engine/ai/signal-key.ts` (nuevo helper)
- `src/lib/ico-engine/ai/signal-key.test.ts` (nuevo)
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md` (stub inicial de la nueva spec)

## Current Repo State

### Already exists
- `ico_engine.ai_signals` en BQ (v1) — se conserva intacto.
- `greenhouse_serving.ico_ai_signals` en PG (v1) — se conserva intacto.
- `greenhouse_serving.ico_ai_signal_enrichments` (v1) — se conserva.
- `ico_engine.metrics_by_member` / `metrics_by_space` — no cambian, son métricas, no signals.

### Gap
- No hay store append-only de eventos de signal.
- No hay mecanismo determinista de identidad (`signal_key`).
- No hay tabla de runs (`materialize_runs`) con counts + status + SLIs.
- No hay versioning del enrichment LLM.

## Scope

### Slice 1 — Migration PG: 4 tablas nuevas

- `greenhouse_serving.ico_signal_events` (append-only): columnas detalladas en EPIC-006.
- `greenhouse_serving.ico_signals_v2`: consolidado con `signal_key` PK, lifecycle.
- `greenhouse_serving.ico_signal_enrichments_v2`: versionado por `signal_key + enrichment_version`.
- `greenhouse_sync.ico_materialize_runs`: un row por corrida del reconcile.
- Indexes por `(space_id, status, detected_at DESC)`, `(space_id, dimension, dimension_id, period)`, `(parent_signal_key)`.
- RLS opcional (slice 1.5) — decidible en Discovery.

### Slice 2 — BQ tables equivalentes

- `ico_engine.signal_events` — append-only.
- `ico_engine.signals_v2` — consolidated.
- `ico_engine.signal_enrichments_v2` — versioned.
- `ico_engine.materialize_runs` — observability.
- Partition por `detected_at` en tablas grandes, cluster por `space_id`.

### Slice 3 — Helper canónico `buildSignalKey`

- Fórmula: `sha256([space_id, dimension, dimension_id, metric_name, period_year, period_month, severity_band].join('::'))`.
- Test de determinismo (misma entrada → mismo hash 1000 veces).
- Test de colision-safety (diferenciar entre signals de distintas dimensiones).
- Test de stability bajo valores null (space-level anomaly).

### Slice 4 — Docs

- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md` stub con definición de las 4 tablas + contrato de `signal_key`.
- Changelog entry.

## Out of Scope

- No se escribe a las tablas nuevas todavía (eso es TASK-591).
- No se leen las tablas desde UI (eso es TASK-595).
- No se retira v1 (eso es TASK-597).
- No se migra data histórica (decisión dentro de TASK-597).

## Acceptance Criteria

- [ ] `pnpm migrate:up` aplica la migración sin errores.
- [ ] `src/types/db.d.ts` incluye las 4 tablas nuevas con tipos exactos.
- [ ] `buildSignalKey` tiene test de determinismo + colision + null handling, todos verdes.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` todos clean.
- [ ] Doc `GREENHOUSE_ICO_ENGINE_V2.md` existe con stub de contrato.
- [ ] Migración tiene DOWN reversible documentado.

## Verification

- `pnpm migrate:up` + `pnpm pg:connect:shell` para verificar tablas creadas.
- `pnpm test src/lib/ico-engine/ai/signal-key.test.ts`.
- `pnpm lint`, `npx tsc --noEmit`, `pnpm build`, `pnpm test`.

## Closing Protocol

- [ ] Lifecycle sincronizado (to-do → in-progress → complete).
- [ ] Archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [ ] Handoff.md + changelog.md actualizados.
- [ ] EPIC-006 `Child Tasks` marca 1/8 como complete.

## Follow-ups

- Si aparecen requisitos de retención distintos por tenant, mover la partitioning a BQ TTL config.
- RLS en PG puede diferirse a una task separada si agrega complejidad al cutover.
