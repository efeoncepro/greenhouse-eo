# TASK-915 — RpA V2 productive cutover (Efeonce + Sky, two-flip)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|payroll|reliability`
- Blocked by: `TASK-912 (captura productiva) → TASK-916 (compute/writeback) → TASK-917 (wiring + cutover)`
- Branch: `task/TASK-915-rpa-v2-productive-cutover-efeonce-sky`

## Summary

Programa de cutover para llevar el motor RpA V2 (Greenhouse-computed, ya probado E2E en demo por TASK-914) a producción para **Efeonce y Sky**, vía **dos flips**: Flip A display/writeback el **01/06/2026** (sin tocar nómina), Flip B bonus el **01/07/2026** (gated por paridad + sign-off HR/Finance). El motor legacy (fórmula Notion) coexiste durante toda la migración (90+ días post-cutover, rollback safety).

## Why This Task Exists

Hoy RpA en producción corre por la **fórmula legacy de Notion** (`Correcciones` → notion-bq-sync → `rpa_avg` → bonus + 6 UI). Es frágil: editable por operadores, sin tests, sin git history — la causa del incidente TASK-877 follow-up (3.168 tareas Sky con `rpa=null` 10 meses). El motor V2 (`countCorrectionTransitions` + `calculateRpaV2`) ya está construido y probado E2E en demo (TASK-914), pero **no enchufado en producción**: falta captura productiva, compute/writeback productivos, y wiring de los consumers (que ya existen). Este umbrella coordina ese enchufe sin afectar el mes en curso ni arriesgar nómina sin validar.

## Goal

- Flip A (01/06): V2 corre LIVE en Efeonce/Sky escribiendo `[GH] RpA v2`, visible, **bonus sigue en V1**.
- Junio entero como shadow real → validar paridad V2 vs V1 ≥95%.
- Flip B (01/07, Efeonce primero): bonus lee V2, gated por paridad + sign-off HR/Finance.
- Legacy `rpa_avg` intacto durante toda la migración (rollback <5min vía flag).

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — ADR Strangler (5 fases, coexistencia, 8 stop-gates). Delta 2026-05-20 (TASK-914 capture pattern).
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion captura, Greenhouse computa.
- `docs/architecture/metrics/RPA_V1.md` — definición canónica + §9.1 pre-conditions writeback.

## Dependencies & Impact

- **Depende de**: `task_status_transitions` (productiva, existe vacía — TASK-908) + `calculateRpaV2` (existe, TASK-901) + suscripción webhook Notion (✅ existe, amplia a todos los teamspaces).
- **Hijos (orden)**: TASK-912 (captura productiva) → TASK-916 (compute/writeback productivos) → TASK-917 (wiring consumers + flag bonus + ejecución cutover).
- **Impacta a**: payroll bonus (Flip B), 6 UI views, `metrics_by_member`, trends API.

## Current Repo State

- **Ya existe**: motor de cómputo V2 + foundation (`countCorrectionTransitions`, `calculateRpaV2`); pipeline demo completo (TASK-913/914); todos los consumers productivos (bonus `calculateRpaBonus`, 6 UI, materialización `rpa_avg`, trends API) — consumen el legacy `rpa_avg`; campo `metrics_by_member.rpa_avg_v2` declarado.
- **Gap**: captura productiva (handler webhook → `task_status_transitions`, con **filtro por data source** porque la suscripción es amplia); compute/writeback productivos (siblings de los demo); poblar `rpa_avg_v2` desde V2; repoint consumers; flag `BONUS_USE_RPA_V2`.

<!-- ZONE 3 — SCOPE -->

## Scope (frentes → tasks hijas)

1. **TASK-912 — Captura productiva** (desbloqueada): webhook handler productivo → `task_status_transitions`. **Filtro canónico por data source ID** (Efeonce `5126d7d8-bf3f-454c-80f4-be31d1ca38d4`, Sky `23039c2f-efe7-81f8-af2d-000b67594d18` — confirmados vía Notion fetch 2026-05-21) porque la suscripción Notion cubre TODOS los teamspaces — NO doble-procesar el demo (`36339c2f-…`, tiene su propio endpoint) ni otros teamspaces. Re-fetch pattern (igual que demo TASK-914). El status property se llama `Estado` en ambos y las 11 opciones ya son canónicas → el cleanup operador-side Sky está mayormente hecho (solo la descripción del campo Sky quedó con texto legacy stale, cosmético). Ver inventario completo en TASK-912 §"Inventario de schemas Notion".
2. **TASK-916 — Compute + writeback productivos**: siblings de `notion-rpa-compute-demo` + `notion-rpa-writeback-demo`. Tabla `task_rpa_snapshots` productiva. Writeback a propiedad `[GH] RpA v2` (read-only operadores, coexiste con fórmula legacy `RpA`). Flag `NOTION_RPA_WRITEBACK_ENABLED`.
3. **TASK-917 — Wiring consumers + flag bonus + ejecución cutover**: poblar `metrics_by_member.rpa_avg_v2` desde V2; repoint las 6 UI + trends a V2 (Flip A); flag `BONUS_USE_RPA_V2` en `calculateRpaBonus` (Flip B); ejecución de los dos flips con sus gates.

## Out of Scope

- Las otras 13 métricas ICO (OTD, FTR, etc.) — cada una es su propio programa.
- Borrar la fórmula legacy `RpA` de Notion — se mantiene 90+ días post-cutover (rollback).
- Frame.io / inputs adicionales de RpA (V3 forward-compat).

## Rollout Plan & Risk Matrix

### Schedule canónico (two-flip)

| Hito | Fecha | Qué cambia | Gate |
|---|---|---|---|
| Build captura + compute/writeback prod | ~22-31/05 | Pipeline V2 prod corriendo en paralelo (invisible), escribe `[GH] RpA v2` | TASK-912 + TASK-916 verde |
| **Flip A — display/writeback** | **01/06** | V2 visible en Efeonce/Sky + dashboards; **bonus sigue V1** | Pipeline verde + signals steady=0 |
| Shadow real | jun (todo el mes) | V2 ∥ V1, comparar paridad | signal `notion.metrics.shadow_paridad_rpa` ≥95% |
| **Flip B — bonus (Efeonce primero)** | **01/07** | Bonus lee V2 (`BONUS_USE_RPA_V2`) | **paridad ≥95% + período enteramente cubierto por captura activa (forward-accumulation, NO backfill) + sign-off HR/Finance escrito** |
| Flip B — bonus Sky | ~05/07 | Sky bonus a V2 tras Efeonce verde | Efeonce bonus verde + sin reclamos |
| Cleanup legacy | ≥01/10 (90d) | Opcional: deprecar fórmula Notion | ≥90d sin rollback |

### 8 stop-gates (per ADR Strangler — ninguno opcional para Flip B)

1. Foundation prod (TASK-912 captura) verde · 2. Demo soak (TASK-914 ✅) · 3. Shadow paridad ≥95% (junio) · 4. Pilot ≤1 cliente (Efeonce primero) · 5. **Sign-off HR/Finance escrito** · 6. Snapshot pre-flip restorable <1h · 7. Kill switch verificado (flag flip <5min) · 8. Runbook + cliente sign-off (Sky vía QBR).

**Gate adicional DURO para Flip B (bono)** — completeness de datos vía FORWARD-ACCUMULATION (corregido 2026-05-21): el bono RpA = `calculateRpaBonus(rpa_avg)` donde `rpa_avg = AVG(rpa por-tarea)` sobre TODAS las tareas completadas del período. V2 solo es válido para el bono cuando tiene el **historial COMPLETO de transiciones de cada tarea del período**.

**El backfill histórico NO es viable** (hallazgo TASK-912 2026-05-21): la API pública de Notion NO expone historial de cambios de propiedades, y los snapshots BQ (`greenhouse_raw.notion_tasks_snapshots`) solo tienen 4 días stale (mar–abr 2026). NO hay fuente para reconstruir transiciones pre-captura.

**Path canónico = forward-accumulation**: activar la captura (TASK-912 flag ON) → esperar **un período completo** con la captura activa → recién ese período tiene historia V2 completa per-tarea → flip del bono SOLO para períodos enteramente cubiertos por la captura. Las tareas iniciadas antes de la activación nunca tendrán su `from`-history completo, así que el primer período elegible para Flip B es el primer mes calendario que arranque DESPUÉS de la activación de la captura. Display (Flip A) NO requiere esto (mostrar incompleto es honesto vía `dataStatus`); el bono SÍ.

### Risk matrix (impact-level — el runtime lo introducen las hijas)

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| V2 difiere de V1 y se paga bono malo | payroll | Media | Flip B gated por paridad + HR sign-off; Flip A no toca bono | `shadow_paridad_rpa` |
| **V2 con datos INCOMPLETOS infla el bono** (tareas con correcciones pre-captura → V2 subcuenta → rpa_avg bajo → bono alto) | payroll | **Alta si se flipea un período no cubierto** | Backfill NO viable (sin API Notion history + snapshots BQ stale, hallazgo TASK-912). **Forward-accumulation**: Flip B SOLO para períodos enteramente posteriores a la activación de la captura | `shadow_paridad_rpa` (diff sistemático = período no cubierto) |
| Captura procesa teamspaces no deseados (suscripción amplia) | delivery | Media | Filtro por data source ID canónico en handler prod (TASK-912) | `transition_capture_*` |
| Schema Sky sin limpiar → status no normaliza | delivery | Baja | Status Sky ya canónico (`Estado` + 11 opciones V1, verificado 2026-05-21) + `normalizeTaskStatus` aliases como red de seguridad | `demo_teamspace_drift` análogo prod |
| Cutover ambos clientes a la vez en bono | payroll | Alta si simultáneo | Efeonce primero, Sky después | reclamos HR |

### Rollback plan

- Flip A: flag `NOTION_RPA_WRITEBACK_ENABLED=false` + redeploy (<5min). El display vuelve a V1.
- Flip B: flag `BONUS_USE_RPA_V2=false` + redeploy (<5min). El bono vuelve a `rpa_avg` legacy. `rpa_avg` nunca se tocó.

### Out-of-band coordination required

- **Operador**: status Sky ya canónico (`Estado` + 11 opciones V1, verificado 2026-05-21) — solo queda actualizar la descripción stale del campo (cosmético, no bloquea Flip A).
- **HR/Finance**: sign-off escrito antes de Flip B (bono).
- **Operador**: crear propiedad `[GH] RpA v2` (read-only para operadores) en las Tareas DB de Efeonce y Sky antes del writeback de Flip A.

<!-- ZONE 4 — ACCEPTANCE -->

## Acceptance Criteria

- [ ] Pipeline V2 prod (captura→compute→writeback) corriendo para Efeonce + Sky, filtrando correctamente por data source.
- [ ] Flip A 01/06: `[GH] RpA v2` poblado en tareas reales; bonus aún en V1 (verificable).
- [ ] Signal `shadow_paridad_rpa` reportando ≥95% sobre junio.
- [ ] Flip B 01/07: bonus Efeonce lee V2 con sign-off HR/Finance registrado.
- [ ] Rollback de cada flip verificado <5min en staging.

## Verification

Revisión manual (umbrella): cada hija cierra con su propia verificación; este umbrella se cierra cuando Flip B Sky está verde + 30d sin rollback.

## Follow-ups

- Cleanup legacy (≥90d) como task derivada.
- Replicar el patrón para las otras 13 métricas ICO.
