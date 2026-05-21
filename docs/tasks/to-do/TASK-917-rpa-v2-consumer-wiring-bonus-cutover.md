# TASK-917 — RpA V2 consumer wiring + bonus flag + two-flip cutover

## Delta 2026-05-21 — TASK-916 SHIPPED (compute/writeback siblings prod): blocker resuelto + 2 precondiciones de Flip A heredadas

TASK-916 está COMPLETE V1.0 en `develop` (writeback flag OFF). El compute prod (`notionRpaComputeProjection`) persiste snapshots en `task_rpa_snapshots`; el writeback prod (`notionRpaWritebackProjection`) hace PATCH a `[GH] RpA v2` **gated por `NOTION_RPA_WRITEBACK_ENABLED` (default OFF)**. Por lo tanto el blocker "compute/writeback prod" queda resuelto — TASK-917 ya puede wirear consumers + ejecutar el cutover.

**Dos precondiciones de Flip A que TASK-916 dejó explícitas (NO las hizo, son de este task)**:

1. **Crear la propiedad `[GH] RpA v2` en Efeonce + Sky** (read-only para operadores). Verificado 2026-05-21 vía Notion `data_sources` API: NO existe en ninguno de los dos (solo `RpA` legacy + `Semáforo RpA`). El writeback fallaría con error Notion si se activa sin crearla. Crearla justo antes del Flip A (no antes — evita propiedad vacía visible en el workspace del cliente Sky por semanas).
2. **Activar `NOTION_RPA_WRITEBACK_ENABLED=true`** en el ops-worker (Vercel/Cloud Run env) bajo los 8 stop-gates ADR Strangler + ~3-4 semanas de captura acumulada vía TASK-912.

El signal `shadow_paridad_rpa` (V2 vs legacy) se materializa en este task (TASK-917) — `task_rpa_snapshots` ya tiene el índice `paridad` listo. Spec TASK-916: `complete/TASK-916-rpa-v2-productive-compute-writeback.md`.

<!-- ZONE 0 -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Domain: `delivery|ico|payroll|ui`
- Blocked by: `TASK-916 (compute/writeback prod escribiendo [GH] RpA v2)`
- Branch: `task/TASK-917-rpa-v2-consumer-wiring-bonus-cutover`
- Parent: `TASK-915 (umbrella cutover)`

## Summary

Enchufar los consumers de RpA (que ya existen, hoy leen el legacy `rpa_avg`) al motor V2, y ejecutar los **dos flips**: Flip A (01/06) poblar `metrics_by_member.rpa_avg_v2` desde V2 + repoint las 6 UI + trends a V2 + activar writeback; Flip B (01/07, Efeonce primero) flag `BONUS_USE_RPA_V2` en `calculateRpaBonus`. Legacy `rpa_avg` intacto (rollback <5min).

## Why This Task Exists

Los consumers (bonus `calculateRpaBonus`, 6 UI views, materialización, trends API) están construidos pero leen el legacy `rpa_avg`. El cutover es **repointing**, no reconstrucción. Este task hace el wiring + ejecuta el cronograma de cutover del umbrella TASK-915 con sus gates — separando el flip de display (sin riesgo) del flip de bono (afecta nómina, gated por validación).

## Goal

- `metrics_by_member.rpa_avg_v2` poblado desde el cómputo V2.
- 6 UI views + trends API leyendo V2 (Flip A 01/06).
- Flag `BONUS_USE_RPA_V2` en el path de bono (Flip B 01/07, Efeonce primero, Sky después).
- Cada flip reversible <5min vía flag.

## Architecture Alignment

- `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (Fases C display, D bonus; coexistencia §3.1).
- `metrics/RPA_V1.md` §13.1 (bonus banded proration, null-not-zero contract).
- Consumers actuales: `src/lib/payroll/bonus-proration.ts` (`calculateRpaBonus`), `src/lib/ico-engine/metric-registry.ts` (`rpa_avg`), 6 views en `src/views/greenhouse/*`, `src/app/api/ico-engine/trends/rpa/route.ts`.

## Dependencies & Current Repo State

- **Depende de**: TASK-916 (V2 escribiendo snapshots + `[GH] RpA v2`) + paridad validada (signal `shadow_paridad_rpa` ≥95%) + **período enteramente cubierto por captura activa (forward-accumulation)**. El bono RpA = AVG sobre TODAS las tareas del período → V2 necesita el historial completo de transiciones per-tarea. **El backfill histórico NO es viable** (sin API Notion de property-history + snapshots BQ stale, hallazgo TASK-912 2026-05-21). Por eso el Flip B solo aplica a períodos enteramente posteriores a la activación de la captura (TASK-912 flag ON). **Gate DURO del Flip B (Slice 3).**
- **Ya existe**: todos los consumers + campo `rpa_avg_v2` declarado en `metrics_by_member`.
- **Gap**: poblar `rpa_avg_v2` desde V2; switch de fuente en consumers (gated); flag `BONUS_USE_RPA_V2`.

## Scope (slices)

1. Materialización: poblar `metrics_by_member.rpa_avg_v2` desde el cómputo V2 (agregación AVG por member-mes).
2. Flip A — repoint display: UI views + trends API leen `rpa_avg_v2` (gated por flag de display) + activar `NOTION_RPA_WRITEBACK_ENABLED`. **NO toca bono.**
3. Flip B — flag bono: `BONUS_USE_RPA_V2` en `calculateRpaBonus` (lee `rpa_avg_v2` en vez de `rpa_avg`). Efeonce primero.
4. Sky bonus tras Efeonce verde.

## Out of Scope

- Borrar `rpa_avg` legacy (90+ días post-cutover).
- Captura / compute / writeback (TASK-912 / TASK-916).

## Rollout Plan & Risk Matrix

- **Slice ordering hard rule**: Slice 1 (materializar V2) antes que cualquier repoint. Slice 2 (display) ANTES que Slice 3 (bono) — nunca cortar bono sin junio en shadow. Slice 3 SOLO con paridad ≥95% + sign-off HR/Finance escrito.
- **Risk matrix**:

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Bono pagado con V2 no validado | payroll | Media | Flip B gated por paridad ≥95% + HR sign-off; Efeonce primero | `shadow_paridad_rpa` |
| `rpa_avg_v2` mal materializado | data | Media | shadow compare vs `rpa_avg` antes de repoint; paridad signal | `shadow_paridad_rpa` |
| Repoint UI muestra null donde V1 tenía valor | ui | Baja | null-not-zero contract honesto (muestra "Pendiente", no $0/0) | — |
| Ambos clientes a bono simultáneo | payroll | Alta si simultáneo | Efeonce primero, Sky ~05/07 tras verde | reclamos HR |

- **Feature flags / cutover**: `<display flag>` (Flip A) + `BONUS_USE_RPA_V2` (Flip B). Ambos default false. Cutover = flip + redeploy.
- **Rollback plan per slice**:

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 materializar | revert PR | <10min | Sí (campo aditivo) |
| 2 display | flag display=false + redeploy | <5min | Sí |
| 3 bono Efeonce | `BONUS_USE_RPA_V2=false` + redeploy | <5min | Sí (`rpa_avg` intacto) |
| 4 bono Sky | idem por-cliente | <5min | Sí |

- **Production verification sequence**: Flip A → confirmar `[GH] RpA v2` + UI muestran V2 + bono sigue V1 (verificar `payroll_entries.kpi_rpa_avg` aún de V1). Flip B → HR reconcilia bono mes 1 antes de declarar pass.
- **Out-of-band coordination required**: **sign-off escrito HR/Finance antes de Slice 3**. Reconciliación HR del bono junio→julio.

## Acceptance Criteria

- [ ] `rpa_avg_v2` poblado y paridad ≥95% vs `rpa_avg` sobre junio.
- [ ] Flip A: UI + trends muestran V2; bono sigue V1 (verificable en `payroll_entries`).
- [ ] Flip B Efeonce: bono lee V2 con `BONUS_USE_RPA_V2=true` + sign-off HR registrado.
- [ ] Cada flip reversible <5min verificado en staging.
- [ ] HR reconciliación bono mes 1 documentada.

## Verification

`pnpm test` (bonus-proration + materializer) + `pnpm build`. Shadow compare report junio. Smoke staging con flag flips.
