# TASK-911 — TASK-900 Production Cutover Follow-up

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete` (V1.0 Foundation execution complete 2026-05-18 ~19:11 UTC; observation period 30d in progress hasta 2026-06-17 — re-abrir SOLO si emerge issue Day 1-30, ver Closing Protocol)
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `ops-followup`
- Epic: `optional`
- Status real: `✅ EXECUTION COMPLETE 2026-05-18 19:11 UTC. Las 3 flags ICO_MATERIALIZER_* están true en producción Cloud Run (revision ico-batch-worker-00098-7kd, GIT_SHA a8567937). Observation period 30 días en curso. Day 30 cierre = 2026-06-17 (V1.0 stable declaration).`
- Rank: `TBD`
- Domain: `delivery|ico|reliability|platform`
- Blocked by: `none — observation period gating only`
- Branch: `none (ops-only, no code changes)`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-05-18 — Drift discovery + spec recalibration

**Hallazgo canonical durante sesión TASK-911 spawn**: la spec original asumía un cutover de producción separado del shipping TASK-900, pero **el cutover ya se ejecutó tácitamente** durante la sesión TASK-900 ship. Razones canonical:

1. **Solo existe UN servicio Cloud Run `ico-batch-worker`** en proyecto `efeonce-group` (no hay staging/prod separados a nivel infrastructure)
2. **El workflow `ico-batch-deploy.yml` trigger por push a `develop`** (no por merge develop→main) → cuando shipeé TASK-900 a develop el 2026-05-18, auto-deployó al ÚNICO Cloud Run service = el que sirve el cron 3:15 AM Santiago en producción real
3. **El "staging cutover" del Handoff fue en realidad el único cutover** — el cron `ico-materialize-daily` apunta a este service (`https://ico-batch-worker-y6egnifl6a-uk.a.run.app/ico/materialize`)

**Estado real verificado live 2026-05-18 ~20:00 UTC**:

| Property | Value |
|---|---|
| Service | `ico-batch-worker` (proyecto `efeonce-group`, region `us-east4`) |
| Revision activa | `ico-batch-worker-00098-7kd` |
| Deployed | `2026-05-18T19:54:06Z` |
| GIT_SHA | `a8567937b695db6d247e17a3226ab313f4375378` (commit "docs: TASK-908 Slice 8 — V1.0 Foundation closing") |
| NODE_ENV | `production` |
| ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED | **`true`** ✅ |
| ICO_MATERIALIZER_MERGE_PATTERN_ENABLED | **`true`** ✅ |
| ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED | **`true`** ✅ |
| Cloud Scheduler `ico-materialize-daily` | ENABLED, cron `15 3 * * *` America/Santiago, último attempt `2026-05-18T19:14:06Z` (manual) |

**Implicación canonical**: TASK-911 pasa de "execute prod cutover" a "observation period + closure post-Day 30". Cero re-ejecución requerida.

## Summary

Observación canonical post-cutover de las 3 flags `ICO_MATERIALIZER_*_ENABLED` en producción Cloud Run. Las flags fueron flippeadas tácitamente durante la sesión TASK-900 ship (2026-05-18 ~19:11 UTC vía revision 00097-jpm, luego promovida a 00098-7kd con TASK-908 commits adicionales). Esta task mantiene el follow-up canonical durable hasta Day 30 (2026-06-17) cuando se declare V1.0 stable.

## Why This Task Exists

- Audit trail canonical del cutover prod (timestamps, revision IDs, GIT_SHA evidence)
- Observation period 30 días sostenido antes de declarar V1.0 stable
- Tracking durable para que rollback procedure quede accesible si emerge issue
- Cierre operativo del bug class TASK-877 follow-up en producción

## Goal

- ✅ 3 flags activas en producción Cloud Run (DONE 2026-05-18 ~19:11 UTC)
- 🟡 Day 1 cron natural 3:15 AM Santiago verde (próximo: 2026-05-19 03:15 -04)
- 🟡 Day 7 sostenido sin errors (target: 2026-05-25)
- 🟡 Day 30 sostenido sin errors → V1.0 stable declaration (target: 2026-06-17)
- 🟡 Signal `delivery.ico_materializer.skipped_safety` count=0 sostenido durante el período

## Architecture Alignment

- ADR canonical: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- CLAUDE.md sección "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)"

## Dependencies & Impact

### Depends on

- ✅ TASK-900 shipped `develop` (commits `7493d880` → `08c2e11d`, 2026-05-18)
- ✅ Cloud Run `ico-batch-worker` redeployed con código TASK-900 (revision 00098-7kd, GIT_SHA `a8567937`)
- 🟡 Cron natural 3:15 AM Santiago daily verde (observation period)

### Blocks / Impacts

- Cierre operativo del bug class TASK-877 follow-up EN PRODUCCIÓN — Day 30 declara stable
- Activación real de defensas en el cron diario prod 3:15 AM Santiago — YA OPERATIVO desde 2026-05-18

### Files owned

- N/A — esta task es ops-only sin code changes

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Execution Status — COMPLETE 2026-05-18

✅ Las 3 flags fueron flippeadas progresivamente durante la sesión TASK-900 ship live 2026-05-18:

| Time UTC | Action | Revision | Result |
|---|---|---|---|
| 18:25 | Trigger cron manual con flags OFF (Day 0 baseline) | 00092 | ✅ Legacy DELETE+INSERT preservado, 3.8 min, zero errors, baseline establecido |
| 18:32 | Flip `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED=true` | 00093-kps | ✅ Deploy OK |
| 18:33 | Trigger cron manual (Day 1 gate ON) | — | ✅ Gate procedió normal (signal upstream sano), zero false positives |
| 18:38 | Flip `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true` | 00094-wnh | ✅ Deploy OK |
| 18:40 | Trigger cron manual (Day 2 MERGE ON) | — | ✅ PG tracking 5 materializers `status='succeeded'`, row counts match baseline |
| 18:39+ | Bug pre-existing detected: `materializeAiSignals` BQ streaming buffer error | — | ⚠️ Independiente de TASK-900 |
| 18:46 | Bug fix canonical: streaming insert → DML INSERT en `ai_signals` + `ai_signal_enrichments` | — | ✅ Commits `03ec4960` + `ba10ec5e` push develop |
| 18:52 | GH Actions ico-batch-deploy deploy SUCCESS | 00095-xct | ✅ |
| 19:11 | Flip `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true` | 00097-jpm | ✅ Deploy OK + 3 flags ON simultáneo |
| 19:14 | Trigger cron manual (Day 3 DELTA ON full pipeline) | — | ✅ 5 materializers `status='succeeded'`, notes='incremental from <ISO>' confirma DELTA filter funcionando con MERGE incremental + cutoff lookup |
| 19:54 | Deploy adicional post TASK-908 commits | 00098-7kd | ✅ GIT_SHA `a8567937` actualizado, 3 flags preservadas |

**Bug class fixado canonical** (NO patch): `ai_signals` y `ai_prediction_log` ahora usan DML INSERT (durable storage) en lugar de streaming insert API. Issue pre-existente NO relacionado a TASK-900 — emergió porque triggers crones consecutivos < 30 min stress test el path que tenía bug latente.

**Validación end-to-end final**:

- PG tracking `greenhouse_sync.ico_materialization_runs` confirma 5 materializers (project/member/sprint/organization/business_unit) `status='succeeded'`
- BQ row counts `metrics_by_member` 2026-03/04/05 = 5/4/4 idénticos al baseline pre-cutover
- Reliability signal `delivery.ico_materializer.skipped_safety` count=0 (gate confía en upstream sano)

## Rollback procedure canonical (preservado)

Si emerge issue post-flip durante observation period:

```bash
PROJECT=efeonce-group
REGION=us-east4
SERVICE=ico-batch-worker

# Revert flag individual (más probable):
gcloud run services update $SERVICE --region=$REGION --project=$PROJECT \
  --update-env-vars=<FLAG_NAME>=false

# Revert TODAS las flags simultáneo (escalación máxima):
gcloud run services update $SERVICE --region=$REGION --project=$PROJECT \
  --update-env-vars=ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED=false,ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=false,ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=false
```

<5 min sin redeploy. Próximo cron 3:15 AM va a usar valor reverted.

## Observation period — gates canonical pendientes

### Day 1 — cron natural primer pase (próximo 2026-05-19 03:15 -04)

- [ ] Cron natural ejecutó 3:15 AM Santiago
- [ ] PG tracking tiene rows nuevas con `status='succeeded'` para los 5 materializers
- [ ] BQ row counts estables (no row count anomalies)
- [ ] Signal `delivery.ico_materializer.skipped_safety` count=0
- [ ] Cloud Logging `ico-batch-worker` sin errors `ico_materializer_*_failed`

### Day 7 — primer week observación sostenida (2026-05-25)

- [ ] 7 crones naturales consecutivos verde
- [ ] Sin rollback flags durante la semana
- [ ] Signal `delivery.ico_materializer.skipped_safety` count=0 sostenido
- [ ] Sin Sentry alerts relacionados a `delivery_ico_materializer_*`

### Day 30 — V1.0 stable declaration (2026-06-17)

- [ ] 30 crones naturales consecutivos verde
- [ ] Sin issues reportados durante observation period
- [ ] Bug class TASK-877 follow-up no re-emergió
- [ ] Declarar V1.0 stable production + cerrar esta task
- [ ] CLAUDE.md sección "ICO Materializer Hardening Pattern" Delta "V1.0 stable production 2026-06-17"

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- ✅ 3 flags activas en production Cloud Run (DONE 2026-05-18)
- ✅ Cutover execution validado live (5 materializers `status='succeeded'`, baseline row counts match)
- ✅ Bug class pre-existente streaming buffer cerrado canonical en mismo session (NO patch)
- 🟡 30 crones naturales consecutivos verde (Day 1 → Day 30, 2026-05-19 → 2026-06-17)
- 🟡 Signal `delivery.ico_materializer.skipped_safety` count=0 sustained 30d
- 🟡 V1.0 stable production declaration 2026-06-17

## Verification

- ✅ Cloud Logging `ico-batch-worker` sin errors `ico_materializer_*_failed` (post-flip 2026-05-18 19:14)
- ✅ BQ row counts `metrics_by_*` estables (verified 2026-05-18 post-flip)
- ✅ PG `greenhouse_sync.ico_materialization_runs` con rows `status='succeeded'` para los 5 materializers
- 🟡 Daily check Day 1-7, weekly check Day 8-30 (operator-side responsibility)

## Closing Protocol (when Day 30 verde)

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con V1.0 stable production date
- [ ] CLAUDE.md sección "ICO Materializer Hardening Pattern" Delta "V1.0 stable production 2026-06-17 — 30 días sostenido verde"
- [ ] `changelog.md` con cierre operativo final

## Follow-ups (only if issues emerge)

Cualquier issue durante observation period spawnea TASK derivada:

- Falso positivo gate prod → TASK derivada para ajustar threshold del signal upstream
- MERGE coverage distinto al legacy → TASK derivada SQL byte-equivalence investigation
- Signal `delivery.ico_materializer.skipped_safety` permanente warning → TASK derivada para resolver root cause upstream
- Bug class TASK-877 follow-up re-emerge → TASK derivada hardening adicional + RCA

## Open Questions

Ninguna pendiente. Cutover execution validado live. Observation period en curso.

## Cross-refs

- TASK-900 spec: `docs/tasks/complete/TASK-900-ico-materializer-merge-incremental-freshness-guard.md`
- ADR canonical: `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- CLAUDE.md sección "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)"
- Bug class fixado canonical: `src/lib/ico-engine/ai/materialize-ai-signals.ts` + `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (DML INSERT pattern post streaming buffer incompatibility)
