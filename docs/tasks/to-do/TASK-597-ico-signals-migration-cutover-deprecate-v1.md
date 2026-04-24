# TASK-597 — Migración strangler fig + backfill + deprecate v1 (EPIC-006 child 8/8)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-006`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-590, TASK-591, TASK-592, TASK-593`
- Branch: `task/TASK-597-ico-signals-cutover-v1-deprecation`

## Summary

Ejecutar la migración del sistema v1 al v2 sin downtime: dual-write durante ~14 días, validación de paridad diaria, cutover de read primero, cutover de write después, grace period de 30 días, DROP de tablas legacy. Incluye backfill opcional de historia (regenerar `detected_at` sintético sobre periodos pasados con `algorithm_version='legacy-backfill'`) y limpieza de huérfanos existentes en PG serving.

## Why This Task Exists

Refactorizar la capa de signals sin downtime exige un strangler fig disciplinado: no se puede apagar v1 hasta que v2 haya sido validada con tráfico real por ≥ 14 días, comparando números lado a lado. Este task es el plan de migración operacional — el que decide cuándo y cómo dejar de usar lo viejo.

## Goal

- Dual-write estable durante 14 días con flag `ICO_SIGNALS_DUAL_WRITE=true`.
- Script diario de paridad v1↔v2 con report por tenant.
- Cutover de read: UI y readers internos pasan a v2.
- Cutover de write: v1 deja de escribirse.
- 30 días sin reads v1 → `DROP` tablas legacy.
- Backfill de history opcional para regenerar cronología sintética.
- Limpieza de huérfanos en PG serving (los 7 de Mar 2026 y los que se encuentren al momento).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ICO_ENGINE_V2.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## Dependencies & Impact

### Depends on
- `TASK-590` — schema v2 existe.
- `TASK-591` — reconcile escribe v2 + dual-write v1.
- `TASK-592` — transitions API funciona sobre v2.
- `TASK-593` — enrichment v2 funciona.

### Blocks / Impacts
- Termina de cerrar EPIC-006.
- UI debe estar ya migrada (TASK-595) antes del cutover de read.

### Files owned
- `scripts/ico-signals-parity-check.ts` (nuevo — compara v1↔v2 por tenant)
- `scripts/ico-signals-legacy-backfill.ts` (opcional)
- `scripts/ico-signals-cleanup-orphans.ts`
- `migrations/*_ico-signals-v1-drop.sql` (al final del ciclo)
- Config `ICO_SIGNALS_DUAL_WRITE`, `ICO_SIGNALS_READ_SOURCE=v1|v2`.

## Current Repo State

### Already exists
- `ai_signals` (BQ v1), `greenhouse_serving.ico_ai_signals` (PG v1), `ico_ai_signal_enrichments` (PG v1).
- Huérfanos presentes en PG: 7 signals de Mar 2026 sin pareja en BQ.
- Schema v2 + reconcile writer + transitions API + enrichment v2 (tras TASK-590/591/592/593).

### Gap
- No hay dual-write todavía hasta TASK-591 slice 4.
- No hay parity check.
- No hay cutover flag para readers.

## Scope

### Slice 1 — Parity check daily

- Script que por cada tenant y período abarcando últimos 90d:
  - Cuenta signals v1 vs v2.
  - Compara `current_value`, `expected_value` por `signal_key` equivalente.
  - Emite report a Slack + tabla `ico_signals_parity_diffs`.
- Cron `/api/cron/ico-signals-parity-check` daily.

### Slice 2 — Read cutover flag

- Env var `ICO_SIGNALS_READ_SOURCE` con `v1` (default) | `v2` | `shadow`.
- Readers en `src/lib/ico-engine/ai/read-signals.ts` y similar leen de la fuente configurada.
- Modo `shadow`: lee v1 para respuesta, pero pinta v2 en logs para validación.

### Slice 3 — Cutover sequence (Runbook)

1. Habilitar dual-write (`ICO_SIGNALS_DUAL_WRITE=true`).
2. Correr parity check diariamente. Si diff >1% → diagnosticar.
3. Al día 14 con diffs estables: `ICO_SIGNALS_READ_SOURCE=shadow` por 3-5 días más.
4. Al día 17-19: `ICO_SIGNALS_READ_SOURCE=v2` (cutover read).
5. Monitor Ops Health por 7 días post-cutover-read.
6. Al día 26: desactivar dual-write (`ICO_SIGNALS_DUAL_WRITE=false`). v1 queda frozen.
7. 30 días sin read v1: migración DROP.

### Slice 4 — Backfill history (opcional)

- Script que corre `reconcile` sobre períodos pasados a partir de `ai_signals` v1:
  - Para cada signal v1, calcula `signal_key` determinista y INSERT en `signals_v2` con `algorithm_version='legacy-backfill'`, `detected_at=generated_at`, `status='resolved'` (ya resueltos).
  - Genera `signal_events` sintético con `event_type='backfilled'`.
- Trade-off: preservar historia (pro) vs complicar analytics de MTTR con datos sintéticos (con).

### Slice 5 — Cleanup huérfanos

- Script barre PG serving y marca como `resolved_by='system_cleanup'` con `reason='orphan_from_legacy_delete'` los signals que no tienen pareja en BQ v1 (los 7 de Mar 2026 u otros).

### Slice 6 — DROP v1

- Migración final `*_ico-signals-v1-drop.sql`:
  - `DROP TABLE greenhouse_serving.ico_ai_signals` (v1)
  - `DROP TABLE greenhouse_serving.ico_ai_signal_enrichments` (v1)
  - BQ equivalentes.
- Actualiza toda ref en código que aún apuntara a v1 (debería ser 0).

## Out of Scope

- Changes en la semántica de signals (scope es solo migración, no cambios de producto).
- Integraciones externas (en TASK-596).

## Acceptance Criteria

- [ ] Dual-write funcionando con diff <1% estable por 14 días.
- [ ] UI y readers migrados a v2.
- [ ] Huérfanos saneados en PG.
- [ ] Backfill ejecutado (si se decide) + documentado en changelog.
- [ ] v1 DROPped tras grace period.
- [ ] Zero reportes de usuarios de "signals perdidos" durante la migración.
- [ ] `pnpm lint`, `pnpm test`, `npx tsc --noEmit`, `pnpm build` clean en cada fase.

## Verification

- Parity report verde por 14 días consecutivos antes de cutover read.
- Dashboard Ops Health verde por 7 días post-cutover antes de cortar dual-write.
- Auditoría manual de 10 signals random por tenant comparando v1 vs v2.

## Closing Protocol

- [ ] Lifecycle sincronizado.
- [ ] EPIC-006 child 8/8 marcado complete.
- [ ] EPIC-006 entero marcado como `complete`.
- [ ] `GREENHOUSE_ICO_ENGINE_V2.md` promovido a canónico; `Greenhouse_ICO_Engine_v1.md` marcado superseded con link.
- [ ] Changelog con timeline completo del cutover.

## Follow-ups

- Analítica retrospectiva: tasa de auto_resolve histórica, volumen de signals por severity/tenant.
- Publicar métricas de efectividad de alertas a stakeholders.
