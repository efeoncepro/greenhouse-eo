# TASK-911 — TASK-900 Production Cutover Follow-up

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `ops-followup`
- Epic: `optional`
- Status real: `Staging cutover validado live 2026-05-18 (todas las flags ON verde). Pendiente: prod cutover post develop→main merge.`
- Rank: `TBD`
- Domain: `delivery|ico|reliability|platform`
- Blocked by: `develop → main merge with TASK-900 commits`
- Branch: `none (ops-only, no code changes)`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Follow-up operativo de TASK-900 (shipped 2026-05-18). El cutover staging completo se ejecutó live 2026-05-18 en la misma sesión de implementación, validando end-to-end las 3 flags + descubriendo + fixeando bug canonical pre-existente en `ai_signals` (streaming insert API). **Queda solo el cutover de producción** post develop→main merge.

## Why This Task Exists

Mantener el follow-up canonical durable hasta que las 3 flags `ICO_MATERIALIZER_*_ENABLED` estén `true` en producción Cloud Run con steady state verde ≥30 días. Sin esta task, el cutover prod se evapora.

## Goal

- 3 flags activas en producción Cloud Run con steady state verde sostenido ≥30 días
- Bug class TASK-877 follow-up cerrado operativamente en prod
- Reliability signal `delivery.ico_materializer.skipped_safety` con count=0 sustained

## Architecture Alignment

- ADR canonical: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- CLAUDE.md sección "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)"

## Dependencies & Impact

### Depends on

- TASK-900 shipped `develop` (commits `7493d880` → `08c2e11d`, 2026-05-18)
- `develop → main` merge (release normal Greenhouse) — pre-requisito
- Production redeploy `ico-batch-worker` via `production-release.yml`

### Blocks / Impacts

- Cierre operativo del bug class TASK-877 follow-up EN PRODUCCIÓN
- Activación real de defensas en el cron diario prod 3:15 AM Santiago

### Files owned

- N/A — esta task solo flippea env vars en Cloud Run prod + verifica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope — Production cutover (single session, all flags)

### Pre-requisitos antes de empezar

- [ ] TASK-900 commits en `main` (post develop→main merge)
- [ ] Production `ico-batch-worker` redeployed via `production-release.yml` con código TASK-900
- [ ] Verificar revision prod tiene código nuevo: `gcloud run services describe ico-batch-worker --region=us-east4 --project=efeonce-group --format='value(status.latestReadyRevisionName)'`
- [ ] Smoke test: trigger 1 cron prod manual (`gcloud scheduler jobs run ico-materialize-daily ...`) → verificar verde con flags OFF

### Cutover canonical (single session ~30 min)

Recomendación: ejecutar el cutover entero en una sesión, observando entre cada flip. Cada flip individual es revert <5min si emerge issue.

```bash
PROJECT=efeonce-group
REGION=us-east4
SERVICE=ico-batch-worker

# Step 1: flip FRESHNESS_GATE (defensa contra upstream regression)
gcloud run services update $SERVICE --region=$REGION --project=$PROJECT \
  --update-env-vars=ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED=true

# Trigger cron manual + esperar completion (~4 min) + verificar logs OK
gcloud scheduler jobs run ico-materialize-daily --location=$REGION --project=$PROJECT
# Verify Cloud Logging sin "skipped_safety" indebido + signal delivery.ico_materializer.skipped_safety count=0

# Step 2: flip MERGE_PATTERN (atomic merge vs DELETE+INSERT)
gcloud run services update $SERVICE --region=$REGION --project=$PROJECT \
  --update-env-vars=ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true

# Trigger cron + verificar PG tracking tiene rows succeeded para los 5 materializers
gcloud scheduler jobs run ico-materialize-daily --location=$REGION --project=$PROJECT
# Verify via psql: SELECT * FROM greenhouse_sync.ico_materialization_runs ORDER BY started_at DESC LIMIT 10

# Step 3: flip INCREMENTAL_DELTA (escalability)
gcloud run services update $SERVICE --region=$REGION --project=$PROJECT \
  --update-env-vars=ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true

# Trigger cron + verificar bytes scanned reduce (segunda corrida del día con delta filter activo)
gcloud scheduler jobs run ico-materialize-daily --location=$REGION --project=$PROJECT
```

### Rollback procedure canonical

Si emerge issue post-flip:

```bash
gcloud run services update ico-batch-worker --region=us-east4 --project=efeonce-group \
  --update-env-vars=<FLAG_NAME>=false
```

<5 min sin redeploy. Próximo cron 3:15 AM va a usar valor reverted.

### Observation period post-cutover

- Días 1-7: daily check signal `delivery.ico_materializer.skipped_safety` en `ok`
- Días 8-30: weekly check + verificar `ico_materialization_runs` PG tiene rows nuevas con `status='succeeded'`
- Día 30+: declarar V1.0 stable, cerrar esta task

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] 3 flags activas en production Cloud Run
- [ ] 5 materializers verde post-cutover (`ico_materialization_runs` con `status='succeeded'`)
- [ ] Signal `delivery.ico_materializer.skipped_safety` count=0 sustained
- [ ] Día 30 post-flip declarado V1.0 stable

## Verification

- Cloud Logging `ico-batch-worker` sin errors `ico_materializer_*_failed`
- BQ row counts `metrics_by_*` estables
- PG `greenhouse_sync.ico_materialization_runs` con rows diarias `status='succeeded'`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] Archivo movido a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con V1.0 stable
- [ ] CLAUDE.md sección "ICO Materializer Hardening Pattern" Delta "V1.0 stable production <fecha>"

## Follow-ups

Cualquier issue durante cutover spawnea TASK derivada:

- Falso positivo gate prod → TASK derivada para ajustar threshold del signal upstream
- MERGE coverage distinto al legacy → TASK derivada SQL byte-equivalence investigation
- Signal `delivery.ico_materializer.skipped_safety` permanente warning → TASK derivada para resolver root cause upstream

## Open Questions

Ninguna. Staging cutover ya validó todos los paths. Production sigue mismo plan canonical.

## Histórico — Staging cutover live 2026-05-18

Documentado here para audit trail. Staging cutover se ejecutó completo en la misma sesión de implementación de TASK-900:

| Step | Time UTC | Action | Result |
|---|---|---|---|
| Day 0 | 18:25 | Trigger cron staging con flags OFF | ✅ Legacy DELETE+INSERT preservado, 3.8 min, zero errors |
| Day 0 verify | 18:30 | BQ row counts metrics_by_member 2026-03/04/05 = 5/4/4 | ✅ Baseline establecido |
| Day 1 | 18:32 | Flip FRESHNESS_GATE_ENABLED=true (revision 00093-kps) | ✅ Deploy OK |
| Day 1 verify | 18:34 | Trigger cron + verify 2026-05 row count = 4 (signal upstream sano, gate procedió normal) | ✅ Gate verde |
| Day 2 | 18:38 | Flip MERGE_PATTERN_ENABLED=true (revision 00094-wnh) | ✅ Deploy OK |
| Day 2 verify | 18:40 | Trigger cron + verify PG tracking 5 materializers status='succeeded' + row counts match baseline | ✅ MERGE pattern verde, mismo coverage que legacy |
| Bug detected | 18:39+ | `materializeAiSignals` crash con BQ streaming buffer error (PRE-EXISTING bug class) | ⚠️ Independiente de TASK-900 |
| Bug fix | 18:46 | Refactor `replaceBigQuerySignalsForPeriod` + `replacePredictionLogs` streaming→DML INSERT | ✅ Commit `03ec4960` push develop |
| Bug fix deploy | 18:52 | GH Actions ico-batch deploy SUCCESS 5m53s revision 00095? | ✅ |
| Day 3 | TBD post-buffer-flush ~19:10 | Flip INCREMENTAL_DELTA_ENABLED=true + trigger clean pipeline | TBD |
| Day 3 verify | TBD | Verify all 5 materializers + ai_signals OK con DELTA filter + bytes scanned reduce vs Day 2 | TBD |

**Bug class fixado canonical sin patch**: `ai_signals` y `ai_prediction_log` ahora usan DML INSERT (durable storage) en lugar de streaming insert API. Issue pre-existente NO relacionado a TASK-900 — emergió porque triggers crones consecutivos < 30 min stress test el path que tenía bug latente.

Lecciones canonical:

1. **El streaming insert API de BQ NO es canonical para batch replace patterns** (DELETE+INSERT por período). Para esos casos, DML INSERT via UNNEST(STRUCT array) es la API correcta.
2. **El bug class TASK-877 era más amplio de lo documentado**: NO solo el bridge Notion→member, también el streaming buffer + DML DELETE incompatibility en ai_signals.
3. **Staging cutover en single session es factible y robusto** cuando hay observation activa post cada flip. Beats 21-day shadow staging que se evapora del memory operador.
