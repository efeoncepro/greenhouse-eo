# TASK-923 — Greenhouse pasa a ser el clasificador autoritativo del bucket OTD (paridad, shadow) — M1

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `in-progress 2026-05-24 — implementación DIRECTO en develop (override operador: sin branch). M1 del ADR GREENHOUSE_ATTRIBUTABLE_LATENESS_V1 — clasificador ownership move, parity-first, shadow, flag OFF.`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `Nada. M1 solo necesita completed_at/due_date/status que ya existen en v_tasks_enriched. Independiente de TASK-921/922 — puede ir primero (máximo de-risk, cero impacto en nómina).`
- Branch: `task/TASK-923-greenhouse-owns-otd-bucket-classifier-parity-shadow`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Mover el **clasificador del bucket OTD** (`on_time` / `late_drop` / `overdue` / `carry_over`) de Notion a Greenhouse, en modo **paridad**: Greenhouse recomputa el bucket replicando la **semántica cruda actual** (sin freeze) y lo escribe en una **columna nueva** `gh_otd_bucket` en `v_tasks_enriched`. La columna legacy `performance_indicator_code` (synced de Notion) queda **intacta** y el bono la sigue leyendo. Shadow + reliability signal de paridad. **Cero cambios de número, cero impacto en el bono / la nómina.**

Es el movimiento **M1** del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16: prueba el boundary move Notion→Greenhouse de-riskeado, antes de introducir la semántica freeze (M2/TASK-922) y mucho antes del cutover del bono (M3, gated).

## Why This Task Exists

El review de surfaces (2026-05-23, ISSUE-081) reveló que **el clasificador del bucket OTD vive en Notion** (`Indicador de Performance` formula → synced como `performance_indicator_code`; `normalizePerformanceIndicatorCode` en [sync-notion-conformed.ts:210](../../src/lib/sync/sync-notion-conformed.ts#L210) **solo mapea el string, no recomputa**). Greenhouse cuenta lo que Notion clasificó → `otd_pct` → bono. Es un boundary violation (clasificador crítico de bono en fórmula Notion). **No se puede aplicar freeze sin que Greenhouse recompute el bucket** → mover el clasificador es prerequisito del fix. M1 hace ese movimiento **sin cambiar semántica** (paridad), para aislar el riesgo de plumbing del riesgo de cambio de número.

## Goal

- Helper TS canónico `classifyOtdBucket(inputs)` (pure, server-only) con modo **freeze-aware togglable** — M1 lo usa con freeze **off** (paridad). M2/TASK-922 reusa el mismo helper con freeze **on**.
- Expresión BQ `gh_otd_bucket` en `v_tasks_enriched` (computada GH-side, NO synced) que espeja el helper + **test de paridad TS↔SQL** (patrón `cycle_time_days`/`calculateCycleTime`).
- Materialización de `gh_otd_bucket` en los snapshots (`delivery_task_monthly_snapshots` / `metric_snapshots_monthly`) **junto a** `performance_indicator_code` legacy (dual-column coexistence).
- Reliability signal `notion.metrics.shadow_paridad_otd_classifier` — compara `gh_otd_bucket` vs `performance_indicator_code` synced; target M1 ~100% paridad. Steady = paridad alta; divergencias = findings a revisar (no falla).
- **Flag** `OTD_CLASSIFIER_GH_SHADOW_ENABLED` default OFF (la columna se computa pero ningún consumer la lee; el bono NUNCA la lee en M1).

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 — **descomposición canónica de 4 movimientos** (M1 es esta task) + §16.1 garantía de nómina + §16.3 dual-column + §16.4 helper + §16.5 paridad
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion = OS / Greenhouse = motor (este move completa el boundary para OTD)
- `docs/architecture/metrics/OTD_V1.md` — buckets canónicos
- `docs/architecture/metrics/CYCLE_TIME_V1.md` §4.1 + `calculate-cycle-time.ts` — patrón helper TS + mirror BQ + test paridad

Reglas obligatorias (del ADR §16.6):

- **NUNCA** M1 cambia un número que el bono ve — columna `gh_otd_bucket` exclusivamente. El bono sigue leyendo `performance_indicator_code` legacy.
- **NUNCA** ningún cambio de M1 toca `otd_pct`.
- El helper TS es source of truth; la expresión BQ lo espeja con test de paridad.
- **NUNCA** sobreescribir `performance_indicator_code` synced — es la columna legacy que el bono lee hasta M3.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.

## Dependencies & Impact

### Depends on
- Nada nuevo. `completed_at`, `due_date`, `task_status` ya existen en `v_tasks_enriched`.

### Blocks / Impacts
- **TASK-922 (M2)** consume `classifyOtdBucket` (con freeze on) + escribe en la misma `gh_otd_bucket`.
- **Cutover del bono (M3, futura)** flipea `otd_pct` a leer `gh_otd_bucket`.
- Surfaces (Person/Account 360, Agency, SLA, Nexa): **no cambian en M1** (siguen leyendo legacy). Se benefician al cutover.

### Files owned (estimado)
- `src/lib/notion-metrics/classify-otd-bucket.ts` (+ tests) — NEW (helper canónico, freeze-aware togglable)
- `src/lib/ico-engine/schema.ts` — MODIFY (expresión `gh_otd_bucket` en `v_tasks_enriched` + columna en snapshots)
- `src/lib/ico-engine/materialize.ts` — MODIFY (materializar `gh_otd_bucket` junto a legacy)
- `src/lib/reliability/queries/otd-classifier-parity.ts` — NEW (signal)
- test paridad TS↔SQL — NEW

## Current Repo State

### Already exists
- `performance_indicator_code` synced de Notion ([sync-notion-conformed.ts:210,1289](../../src/lib/sync/sync-notion-conformed.ts))
- `delivery_signal` BQ (on_time/late/unknown, 3 valores — no distingue overdue/carry_over)
- Patrón helper+mirror BQ+paridad: `calculate-cycle-time.ts` + `cycle_time_days`

### Gap
- No existe clasificador GH de los 4 buckets (hoy lo hace Notion)
- No existe columna `gh_otd_bucket` ni signal de paridad

## Out of Scope
- **Freeze / reason-aware** (cambio de semántica) → M2 / TASK-922.
- **Cutover del bono** → M3, futura gated.
- Eliminar el gating `esMesActual` → M1 lo **replica** para paridad; M2 lo elimina.
- Tocar `performance_indicator_code` synced o `otd_pct` → prohibido en M1.

## Acceptance Criteria
- [x] `classify-otd-bucket.ts` (helper pure freeze-aware togglable, freeze off en M1) + tests (21 verde)
- [x] Expresión `gh_otd_bucket` en `v_tasks_enriched` + `buildOtdBucketSql` mirror + test paridad TS↔SQL
- [x] `gh_otd_bucket` materializado en snapshots (DDL + REQUIRED_COLUMN_MIGRATIONS + materialize INSERT/SELECT)
- [x] Signal `notion.metrics.shadow_paridad_otd_classifier` wired; **paridad 100% verificada contra PG real (198/198)**
- [x] Flag `OTD_CLASSIFIER_GH_SHADOW_ENABLED` default OFF
- [x] **Verificado: `otd_pct` y el bono NO cambian** (columna nueva shadow, nadie la lee; legacy intacto)
- [x] `pnpm test` (5239 passed) + `pnpm build` verde
- [x] Task movida a `complete/`

## Delta 2026-05-24 — M1 SHIPPED (directo en develop, sin branch per override operador)

4 slices commiteados: classifyOtdBucket helper + 21 tests (`6e54a17e`), flag (`5c4d87fa`), signal PG-based (`efa47faf`), BQ mirror gh_otd_bucket (`fed7381a`).

**Verificaciones live (post gcloud auth)**:
- Signal PG real: **100% paridad (198/198 tareas completadas on_time/late_drop coinciden con el synced Notion)** — el helper `classifyOtdBucket` reproduce exacto el `Indicador de Performance`. Boundary move Notion→Greenhouse probado con cero cambios de número.
- BQ dry-run del CASE: sintaxis OK + read-only SELECT distribución `on_time 192 / carry_over 149 / overdue 13 / late_drop 6 / not_applicable 4931` (resto por gate esMesActual). **No se mutó la view** (solo dry-run + SELECT).

**Aplicación de las DDL BQ**: `v_tasks_enriched` (CREATE OR REPLACE VIEW) + `delivery_task_monthly_snapshots` (ALTER ADD COLUMN IF NOT EXISTS) se aplican en el próximo `ensureIcoEngineInfrastructure` (deploy staging/cron). Additive + flag-independiente → cero impacto.

**Bono/nómina intactos**: M1 escribe solo la columna shadow `gh_otd_bucket`; `performance_indicator_code` synced + `otd_pct` + `calculateOtdBonus` no se tocan.

## Follow-ups
- TASK-922 (M2) reusa `classifyOtdBucket` con freeze ON (frozenDays). **Desbloqueada por M1.**
- Cutover del bono (M3) — futura gated (8 stop-gates + sign-off HR).
- Post-deploy: confirmar en staging que `gh_otd_bucket` se materializa + signal en /admin/operations.
