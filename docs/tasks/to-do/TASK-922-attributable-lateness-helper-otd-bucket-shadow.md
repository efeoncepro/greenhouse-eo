# TASK-922 — `calculateAttributableLateness` helper + VIEW canónica + OTD bucket reason-aware (shadow mode)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (compute del ADR Attributable Lateness V1)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|payroll|reliability`
- Blocked by: `~~TASK-923 (M1)~~ ✅ SHIPPED 2026-05-24 + ~~TASK-921 (M0 log task_due_date_changes + motivo)~~ ✅ SHIPPED 2026-05-24 + TASK-908/912 (task_status_transitions con captura activa, live en prod). M2 del ADR §16: agrega la semántica freeze sobre el clasificador ya GH-owned por M1 + lee el motivo confirmado de M0. Dependencias resueltas — listo para tomar.`
- Branch: `task/TASK-922-attributable-lateness-helper-otd-bucket-shadow`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Delta 2026-05-24

- **M1 (TASK-923) SHIPPED** — el clasificador OTD ya es GH-owned. Esta task **reusa** el helper canónico `classifyOtdBucket(inputs)` en `src/lib/notion-metrics/classify-otd-bucket.ts` (que nació freeze-aware togglable): M2 = **flipea freeze ON** + agrega reason-awareness sobre el MISMO helper + escribe al MISMO `gh_otd_bucket` shadow column (ya existe en `v_tasks_enriched` + `delivery_task_monthly_snapshots`). NO crear helper nuevo ni columna nueva. La reliability signal `notion.metrics.shadow_paridad_otd_classifier` (M1) medirá divergencia esperada cuando M2 flipee freeze (M2 NO target 100% paridad — la divergencia es el valor del freeze, debe medirse + revisarse, no fallar).
- **M0 (TASK-921) SHIPPED** — el log `greenhouse_delivery.task_due_date_changes` existe (append-only) con `reason_code` + `reason_source`. Esta task lee la **fecha justa** = `original + extensiones cliente/scope` desde ese log, usando SOLO `reason_source='operator_confirmed'` (los inferidos no alimentan el bono — ADR §6). El helper de inferencia `inferRescheduleReason` (M0) y el vocabulario reason (`RESCHEDULE_REASON_CODES`) son reutilizables. La captura está gated por `NOTION_DUE_DATE_CAPTURE_ENABLED` (default OFF) — para que M2 tenga datos, el operador debe activar ese flag primero (cuando se priorice). **Todas las dependencias de M2 están resueltas.**

## Summary

Implementar el helper canónico `calculateAttributableLateness` + VIEW canónica + recompute del **OTD bucket reason-aware**, en **shadow mode** (calcula + log + paridad vs `otd_pct` actual, **sin tocar el bono**). El atraso se computa desde `task_status_transitions` (freeze de `Listo para revisión` + `Bloqueado` + `En pausa`, multi-ciclo) + `task_due_date_changes` (fecha justa = original + extensiones cliente/scope). Reliability signals de paridad + overlap. El cutover real del bono es una task futura gated (8 stop-gates + sign-off HR).

## Why This Task Exists

Cierra la causa raíz de ISSUE-081: hoy el OTD/bono refleja atraso bruto (incluye demoras de cliente/bloqueos/pausas) porque ni el path Notion (`frozenDays` roto) ni el path BQ (`delivery_signal` sin freeze) descuentan tiempo no imputable. Este compute produce el atraso **justo** y el bucket OTD corregido. Por seguridad, nace en shadow — toca el bono y debe pasar el estrangulador. Fuente: `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §4-7, §11-12.

## Goal

- Helper puro `calculateAttributableLateness(inputs)` (server-only): consume intervalos de transiciones + fecha justa derivada del log de reprogramación + motivo confirmado; devuelve `{ attributableDaysLate, fairDeadline, frozenDaysExcluded, bucket, dataStatus, formulaVersion }`. Algoritmo de resta de intervalos espejo de `calculateCycleTime`, con set de exclusión propio (3 estados) + clamp a post-deadline.
- VIEW canónica `v_*_attributable_lateness` (o columnas en `v_tasks_enriched`) — fuente única, sin recompute en consumers.
- Bucket OTD reason-aware (`on_time`/`late_drop`/`overdue`/`carry_over`) computado con fecha justa + freeze.
- **Shadow mode**: log + comparación vs `otd_pct` legacy; flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED` default OFF (bono intacto).
- Reliability signals: `shadow_paridad_otd_attributable`, `attributable_lateness.freeze_reschedule_overlap`, `reschedules_pending_reason` (compartido con TASK-921).
- Anti-doble-descuento: invariante de partición disjunta (ADR §5) + tests.
- Degradación honesta: motivo unknown → conservador (vs vigente, `legacy_unknown`); sin transitions → `unavailable` (no 0).

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` — ADR canónico (§4 fórmula, §5 anti-doble-descuento, §7 bucket, §11 pillars, §12 migración)
- `docs/architecture/metrics/OTD_V1.md` — bucket actual; esta task agrega Delta reason-aware
- `docs/architecture/metrics/CYCLE_TIME_V1.md` §4.1 — patrón de resta de intervalos a espejar (set de exclusión DISTINTO)
- `GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — downstream `calculateOtdBonus` (NO se toca hasta cutover)
- `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` — estrangulador + 8 stop-gates

Reglas obligatorias:

- **NUNCA** extender la fecha justa por motivos que ya maneja el freeze (Bloqueado/revisión/pausa) — doble descuento (ADR §5).
- **NUNCA** usar motivo inferido (sin confirmar) para el bucket que afectará el bono.
- **NUNCA** flipear `ATTRIBUTABLE_LATENESS_OTD_ENABLED=true` sin 8 stop-gates + sign-off HR + ≥30d shadow verde.
- **NUNCA** recompute en consumers — leer VIEW/helper canónico.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.
- **SIEMPRE** documentar que el set de exclusión del atraso difiere del de Cycle Time.

## Dependencies & Impact

### Depends on
- **TASK-921** (`task_due_date_changes` + motivo)
- **TASK-908/912** (`task_status_transitions` con captura activa)

### Blocks / Impacts
- **Cutover del OTD-bono** (futura, gated) consume este compute.
- `otd_pct` / `Indicador de Performance` — corregidos al cutover (shadow ahora).
- Cierra ISSUE-081 (junto con TASK-921 + cutover).

### Files owned (estimado)
- `src/lib/notion-metrics/calculate-attributable-lateness.ts` (+ tests) — NEW
- VIEW/columnas en `src/lib/ico-engine/schema.ts` — MODIFY (shadow)
- `src/lib/reliability/queries/attributable-lateness-*.ts` — NEW
- `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` — NEW (spec de métrica) + Delta a `OTD_V1.md`

## Current Repo State

### Already exists
- `calculate-cycle-time.ts` (patrón de intervalos a espejar)
- `metric-registry.ts` OTD bucket actual (`performance_indicator_code`, `delivery_signal`) — sin freeze
- `bonus-proration.ts` `calculateOtdBonus` (consumer, NO se toca)

### Gap
- No existe helper de atraso imputable ni fecha justa
- No existe bucket OTD reason-aware
- No existe paridad shadow para el atraso corregido

## Out of Scope
- **Cutover del bono** (flip productivo) → task futura gated (8 stop-gates + HR sign-off).
- Severidad/tiers retro → task futura.
- Convención de naming `[GH]` → ADR chico aparte.

## Acceptance Criteria
- [ ] `calculate-attributable-lateness.ts` + tests (multi-ciclo, partición disjunta anti-doble-descuento, degradación honesta, fecha justa por motivo)
- [ ] VIEW canónica / columnas shadow + bucket reason-aware
- [ ] Shadow mode con paridad vs `otd_pct` legacy; flag default OFF → bono intacto
- [ ] Reliability signals (paridad, overlap, pending-reason) wired, steady=0
- [ ] Spec `ATTRIBUTABLE_LATENESS_V1.md` + Delta a `OTD_V1.md` (bucket reason-aware)
- [ ] `pnpm test` (full) + `pnpm build` verde
- [ ] Task movida a `complete/`

## Follow-ups
- Cutover del OTD-bono (gated, sign-off HR) — cuando shadow ≥30d verde.
- Superficies de severidad/retro.
- ADR convención naming `[GH]`.
